import { DataSource } from "typeorm";
import { ShadowId } from "../entities/ShadowId";
import { Activity } from "../entities/Activity";
import { Session } from "../entities/Session";
import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";

const execAsync = promisify(exec);

interface RiskAssessmentResult {
  riskScore: number; // 0-100, lower is better
  riskLevel: "Low" | "Medium" | "High";
  anomalies: string[];
  alerts: string[];
}

interface LocationPoint {
  location: string;
  timestamp: Date;
}

export class RiskAssessmentService {
  constructor(private dataSource: DataSource) {}

  /**
   * Assess risk for a Shadow ID scan
   * Combines rule-based anomaly detection with ML-based risk assessment
   */
  async assessRisk(
    shadowId: ShadowId,
    scanDeviceFingerprint: string | undefined,
    scanLocation: string,
    scanTimestamp: Date
  ): Promise<RiskAssessmentResult> {
    const anomalies: string[] = [];
    const alerts: string[] = [];

    // Rule-based anomaly detection
    const deviceHopping = !!(
      shadowId.deviceFingerprint &&
      (!scanDeviceFingerprint ||
        scanDeviceFingerprint !== shadowId.deviceFingerprint)
    );

    const travelAnomaly = await this.checkImpossibleTravel(
      shadowId.user.id,
      shadowId.generationLocation || "",
      scanLocation,
      shadowId.createdAt,
      scanTimestamp
    );
    const impossibleTravel = !!travelAnomaly;

    const frequentGen = await this.checkFrequentGeneration(
      shadowId.user.id,
      shadowId.createdAt
    );
    const frequentGeneration = !!frequentGen;

    const tokenReuse = shadowId.isUsed;

    // Collect anomalies
    if (deviceHopping) {
      anomalies.push("Device hopping detected");
      alerts.push("Device mismatch: Token generated on different device");
    }
    if (impossibleTravel) {
      anomalies.push("Impossible travel detected");
      alerts.push(travelAnomaly!);
    }
    if (frequentGeneration) {
      anomalies.push("Frequent generation detected");
      alerts.push(frequentGen!);
    }
    if (tokenReuse) {
      anomalies.push("Token reuse attempt");
      alerts.push("Token already used - one-time use only");
    }

    // ML-based risk assessment
    let mlRiskScore = 0;
    let mlRiskLevel: "Low" | "Medium" | "High" = "Low";

    try {
      const mlResult = await this.assessRiskWithML({
        user: {
          nationalId: shadowId.user.nationalId,
          personType: shadowId.user.personType || "Citizen",
          nationality: shadowId.user.nationality || "Saudi",
        },
        shadowId: {
          createdAt: shadowId.createdAt.toISOString(),
          expiresAt: shadowId.expiresAt.toISOString(),
          deviceFingerprint: shadowId.deviceFingerprint || "",
          generationLocation: shadowId.generationLocation || "",
        },
        scan: {
          location: scanLocation,
          timestamp: scanTimestamp.toISOString(),
          deviceFingerprint: scanDeviceFingerprint || "",
        },
        anomalies: {
          deviceHopping: !!deviceHopping,
          impossibleTravel: !!impossibleTravel,
          frequentGeneration: !!frequentGeneration,
          tokenReuse: !!tokenReuse,
        },
      });

      mlRiskScore = mlResult.riskScore;
      mlRiskLevel = mlResult.riskLevel;
    } catch (error) {
      console.error(
        "ML risk assessment failed, falling back to rule-based:",
        error
      );
      // Fall back to rule-based scoring
      mlRiskScore = this.calculateRuleBasedScore(
        deviceHopping,
        impossibleTravel,
        frequentGeneration,
        tokenReuse
      );
      mlRiskLevel = this.calculateRuleBasedLevel(mlRiskScore);
    }

    // Combine rule-based anomalies with ML risk score
    // ML provides the base score, anomalies add context
    const finalRiskScore = Math.min(100, mlRiskScore);
    const finalRiskLevel = mlRiskLevel;

    return {
      riskScore: finalRiskScore,
      riskLevel: finalRiskLevel,
      anomalies,
      alerts,
    };
  }

  /**
   * Call Python ML script for risk assessment
   */
  private async assessRiskWithML(data: any): Promise<{
    riskScore: number;
    riskLevel: "Low" | "Medium" | "High";
  }> {
    const scriptPath = path.join(__dirname, "../../ml/assess_risk.py");

    // Use Python from venv
    const venvPythonPath = path.join(__dirname, "../../ml/.venv/bin/python");
    const fs = require("fs");
    // Use venv Python if available, otherwise fallback to python3
    const pythonExecutable = fs.existsSync(venvPythonPath)
      ? venvPythonPath
      : "python3";

    const dataJson = JSON.stringify(data);

    try {
      const { stdout, stderr } = await execAsync(
        `"${pythonExecutable}" "${scriptPath}" '${dataJson.replace(
          /'/g,
          "'\"'\"'"
        )}'`
      );

      if (stderr && !stderr.includes("✅")) {
        console.warn("ML script warnings:", stderr);
      }

      const result = JSON.parse(stdout.trim());
      return {
        riskScore: result.riskScore || 0,
        riskLevel: result.riskLevel || "Low",
      };
    } catch (error: any) {
      // If Python script fails, log and throw
      console.error("Python ML script error:", error);
      throw new Error(`ML assessment failed: ${error.message}`);
    }
  }

  /**
   * Fallback rule-based scoring (used if ML fails)
   */
  private calculateRuleBasedScore(
    deviceHopping: boolean,
    impossibleTravel: boolean,
    frequentGeneration: boolean,
    tokenReuse: boolean
  ): number {
    let score = 0;
    if (deviceHopping) score += 50;
    if (impossibleTravel) score += 30;
    if (frequentGeneration) score += 20;
    if (tokenReuse) score += 40;
    return Math.min(100, score);
  }

  /**
   * Fallback rule-based level (used if ML fails)
   */
  private calculateRuleBasedLevel(score: number): "Low" | "Medium" | "High" {
    if (score < 20) return "Low";
    if (score < 50) return "Medium";
    return "High";
  }

  /**
   * Check for impossible travel patterns
   * Returns error message if travel is impossible, null otherwise
   */
  private async checkImpossibleTravel(
    userId: number,
    generationLocation: string,
    scanLocation: string,
    generationTime: Date,
    scanTime: Date
  ): Promise<string | null> {
    if (!generationLocation || !scanLocation) {
      return null; // Can't check without locations
    }

    // Get recent activities for this user
    const activityRepo = this.dataSource.getRepository(Activity);
    const recentActivities = await activityRepo.find({
      where: { shadowId: { user: { id: userId } } },
      order: { timestamp: "DESC" },
      take: 10,
      relations: ["shadowId", "shadowId.user"],
    });

    // Calculate time difference in minutes
    const timeDiffMinutes =
      (scanTime.getTime() - generationTime.getTime()) / (1000 * 60);

    // Check if locations are different
    if (generationLocation !== scanLocation) {
      // Calculate actual distance if coordinates are available
      const distance = this.calculateDistance(generationLocation, scanLocation);

      // Calculate maximum possible speed (km/h) based on time difference
      const maxSpeedKmh = (distance / timeDiffMinutes) * 60; // km/h

      // If distance > 0 and time is very short, check if travel is physically possible
      // Assume maximum realistic speed of 300 km/h (high-speed train/plane)
      if (distance > 0 && timeDiffMinutes > 0) {
        if (maxSpeedKmh > 300 && timeDiffMinutes < 60) {
          // Impossible travel: would require > 300 km/h
          return `Impossible travel: ${generationLocation} → ${scanLocation} (${Math.round(
            distance
          )}km in ${Math.round(timeDiffMinutes)} min = ${Math.round(
            maxSpeedKmh
          )} km/h)`;
        }
      } else if (timeDiffMinutes < 10 && distance === 999999) {
        // Can't calculate distance but locations are different and time is very short
        return `Suspicious travel: ${generationLocation} → ${scanLocation} in ${Math.round(
          timeDiffMinutes
        )} minutes`;
      }
    }

    return null;
  }

  /**
   * Check for frequent generation pattern
   * Returns error message if too frequent, null otherwise
   */
  private async checkFrequentGeneration(
    userId: number,
    currentGenerationTime: Date
  ): Promise<string | null> {
    const shadowIdRepo = this.dataSource.getRepository(ShadowId);

    // Get recent generations (last 2 minutes) using query builder for proper date comparison
    const twoMinutesAgo = new Date(
      currentGenerationTime.getTime() - 2 * 60 * 1000
    );
    const recentGenerations = await shadowIdRepo
      .createQueryBuilder("shadowId")
      .where("shadowId.userId = :userId", { userId })
      .andWhere("shadowId.createdAt >= :twoMinutesAgo", { twoMinutesAgo })
      .orderBy("shadowId.createdAt", "DESC")
      .getMany();

    if (recentGenerations.length >= 3) {
      return `Frequent generation: ${recentGenerations.length} tokens generated in last 2 minutes`;
    }

    return null;
  }

  /**
   * Check if user has too many active devices
   * Returns true if limit exceeded (max 2 devices)
   */
  async checkActiveDeviceLimit(
    userId: number,
    newDeviceFingerprint: string
  ): Promise<{
    allowed: boolean;
    activeDevices: number;
    message?: string;
  }> {
    const sessionRepo = this.dataSource.getRepository(Session);

    // Get all active sessions for this user
    const activeSessions = await sessionRepo.find({
      where: {
        userId: userId,
        isActive: true,
      },
    });

    // Get unique device fingerprints
    const uniqueDevices = new Set(
      activeSessions
        .map((s) => s.deviceFingerprint)
        .filter((fp): fp is string => !!fp)
    );

    // Check if new device is already in the list
    if (uniqueDevices.has(newDeviceFingerprint)) {
      return {
        allowed: true,
        activeDevices: uniqueDevices.size,
      };
    }

    // Check if adding new device would exceed limit
    if (uniqueDevices.size >= 2) {
      return {
        allowed: false,
        activeDevices: uniqueDevices.size,
        message: `Device limit exceeded: Maximum 2 active devices allowed. Please revoke a device first.`,
      };
    }

    return {
      allowed: true,
      activeDevices: uniqueDevices.size + 1,
    };
  }

  /**
   * Calculate distance between two locations (simplified)
   * In production, use Haversine formula with actual coordinates
   */
  private calculateDistance(loc1: string, loc2: string): number {
    // This is a placeholder - in production, parse coordinates and calculate actual distance
    // For now, assume different location strings mean different places
    if (loc1 === loc2) return 0;

    // Extract coordinates if available (format: "lat,lon" or "21.4555,39.2497")
    const coords1 = this.parseCoordinates(loc1);
    const coords2 = this.parseCoordinates(loc2);

    if (coords1 && coords2) {
      return this.haversineDistance(
        coords1[0],
        coords1[1],
        coords2[0],
        coords2[1]
      );
    }

    // If can't parse, assume different location strings = different places
    return 999999; // Large distance
  }

  private parseCoordinates(location: string): [number, number] | null {
    // Try to parse "lat,lon" format
    const match = location.match(/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (match) {
      return [parseFloat(match[1]), parseFloat(match[2])];
    }
    return null;
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
