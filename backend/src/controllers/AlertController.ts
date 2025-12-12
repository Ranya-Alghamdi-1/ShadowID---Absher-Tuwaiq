import { Request, Response } from "express";
import { DataSource } from "typeorm";
import {
  SecurityAlert,
  AlertType,
  AlertSeverity,
} from "../entities/SecurityAlert";
import { Activity } from "../entities/Activity";
import { ShadowId } from "../entities/ShadowId";
import { User } from "../entities/User";
import { Session } from "../entities/Session";

export class AlertController {
  constructor(private dataSource: DataSource) {}

  /**
   * Get all security alerts
   */
  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { type, severity, resolved } = req.query;
      const alertRepo = this.dataSource.getRepository(SecurityAlert);

      const queryBuilder = alertRepo.createQueryBuilder("alert");

      if (type) {
        queryBuilder.andWhere("alert.type = :type", { type });
      }

      if (severity) {
        queryBuilder.andWhere("alert.severity = :severity", { severity });
      }

      if (resolved === "true") {
        queryBuilder.andWhere("alert.isResolved = :resolved", {
          resolved: true,
        });
      } else if (resolved === "false") {
        queryBuilder.andWhere("alert.isResolved = :resolved", {
          resolved: false,
        });
      }

      queryBuilder
        .orderBy("alert.createdAt", "DESC")
        .leftJoinAndSelect("alert.user", "user")
        .leftJoinAndSelect("alert.shadowId", "shadowId")
        .take(100);

      const alerts = await queryBuilder.getMany();

      res.json({
        success: true,
        alerts: alerts.map((alert) => ({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          location: alert.location,
          region: alert.region,
          isResolved: alert.isResolved,
          resolvedAt: alert.resolvedAt?.toISOString(),
          createdAt: alert.createdAt.toISOString(),
          user: alert.user
            ? {
                id: alert.user.id,
                nationalId: alert.user.nationalId,
                name: alert.user.name,
              }
            : null,
          shadowId: alert.shadowId
            ? {
                token: alert.shadowId.token,
                createdAt: alert.shadowId.createdAt.toISOString(),
              }
            : null,
          metadata: alert.metadata ? JSON.parse(alert.metadata) : null,
        })),
      });
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch security alerts",
      });
    }
  }

  /**
   * Get alerts by type
   */
  async getAlertsByType(req: Request, res: Response): Promise<void> {
    const { type } = req.params;
    req.query.type = type;
    await this.getAlerts(req, res);
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const alertRepo = this.dataSource.getRepository(SecurityAlert);

      const alert = await alertRepo.findOne({ where: { id: parseInt(id) } });

      if (!alert) {
        res.status(404).json({
          success: false,
          error: "Alert not found",
        });
        return;
      }

      alert.isResolved = true;
      alert.resolvedAt = new Date();
      await alertRepo.save(alert);

      res.json({
        success: true,
        message: "Alert resolved successfully",
        alert: {
          id: alert.id,
          isResolved: alert.isResolved,
          resolvedAt: alert.resolvedAt.toISOString(),
        },
      });
    } catch (error) {
      console.error("Error resolving alert:", error);
      res.status(500).json({
        success: false,
        error: "Failed to resolve alert",
      });
    }
  }

  /**
   * Detect and create alerts from recent activities
   * This should be called periodically (e.g., via cron job)
   */
  async detectAlerts(): Promise<void> {
    try {
      await this.detectMultipleIdentities();
      await this.detectImpossibleTravel();
      await this.detectDeviceHopping();
      await this.detectHighRiskScans();
    } catch (error) {
      console.error("Error detecting alerts:", error);
    }
  }

  /**
   * Detect multiple identities from same device
   */
  private async detectMultipleIdentities(): Promise<void> {
    const activityRepo = this.dataSource.getRepository(Activity);
    const sessionRepo = this.dataSource.getRepository(Session);
    const alertRepo = this.dataSource.getRepository(SecurityAlert);

    // Find devices with multiple identities in short time (15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Get sessions grouped by device fingerprint
    const sessions = await sessionRepo
      .createQueryBuilder("session")
      .select("session.deviceFingerprint", "fingerprint")
      .addSelect("COUNT(DISTINCT session.userId)", "count")
      .addSelect("GROUP_CONCAT(DISTINCT session.userId)", "userIds")
      .where("session.isActive = :isActive", { isActive: true })
      .andWhere("session.updatedAt >= :fifteenMinutesAgo", {
        fifteenMinutesAgo,
      })
      .groupBy("session.deviceFingerprint")
      .having("COUNT(DISTINCT session.userId) > :threshold", { threshold: 1 })
      .getRawMany();

    for (const session of sessions) {
      const userIds = (session.userIds as string)
        .split(",")
        .map((id) => parseInt(id));
      const userRepo = this.dataSource.getRepository(User);
      const users = await userRepo.find({
        where: userIds.map((id) => ({ id })),
      });

      // Check if alert already exists
      const existing = await alertRepo.findOne({
        where: {
          type: AlertType.MULTIPLE_IDENTITIES,
          isResolved: false,
          metadata: JSON.stringify({ fingerprint: session.fingerprint }),
        },
      });

      if (!existing && users.length > 1) {
        const alert = alertRepo.create({
          type: AlertType.MULTIPLE_IDENTITIES,
          severity:
            users.length >= 5
              ? AlertSeverity.CRITICAL
              : users.length >= 3
              ? AlertSeverity.HIGH
              : AlertSeverity.MEDIUM,
          title: "هويات متعددة من نفس الجهاز",
          description: `تم اكتشاف ${users.length} هويات مختلفة من نفس الجهاز في فترة قصيرة`,
          location: users[0] ? "غير محدد" : null,
          metadata: JSON.stringify({
            fingerprint: session.fingerprint,
            identities: users.map((u) => u.nationalId),
            timeframe: "15 دقيقة",
          }),
        });

        await alertRepo.save(alert);
      }
    }
  }

  /**
   * Detect impossible travel
   */
  private async detectImpossibleTravel(): Promise<void> {
    const shadowIdRepo = this.dataSource.getRepository(ShadowId);
    const activityRepo = this.dataSource.getRepository(Activity);
    const alertRepo = this.dataSource.getRepository(SecurityAlert);

    // Find Shadow IDs with scans in different locations within short time
    const activities = await activityRepo
      .createQueryBuilder("activity")
      .where("activity.type = :type", { type: "used" })
      .andWhere("activity.timestamp >= :oneHourAgo", {
        oneHourAgo: new Date(Date.now() - 60 * 60 * 1000),
      })
      .orderBy("activity.timestamp", "ASC")
      .getMany();

    // Group by user and check for impossible travel
    const userActivities = new Map<number, Activity[]>();
    activities.forEach((activity) => {
      if (activity.shadowId?.user) {
        const userId = activity.shadowId.user.id;
        if (!userActivities.has(userId)) {
          userActivities.set(userId, []);
        }
        userActivities.get(userId)!.push(activity);
      }
    });

    for (const [userId, userActs] of userActivities.entries()) {
      if (userActs.length < 2) continue;

      for (let i = 1; i < userActs.length; i++) {
        const prev = userActs[i - 1];
        const curr = userActs[i];

        const timeDiff = curr.timestamp.getTime() - prev.timestamp.getTime();
        const distance = this.calculateDistance(prev.location, curr.location);

        // If distance > 500km in < 1 hour, it's impossible
        if (distance > 500 && timeDiff < 60 * 60 * 1000) {
          const existing = await alertRepo.findOne({
            where: {
              type: AlertType.IMPOSSIBLE_TRAVEL,
              user: { id: userId },
              isResolved: false,
            },
          });

          if (!existing) {
            const alert = alertRepo.create({
              type: AlertType.IMPOSSIBLE_TRAVEL,
              severity: AlertSeverity.CRITICAL,
              title: "سفر مستحيل",
              description: `تم اكتشاف استخدام Shadow ID في موقعين بعيدين جداً في وقت قصير`,
              user: { id: userId } as User,
              shadowId: curr.shadowId || undefined,
              location: curr.location,
              metadata: JSON.stringify({
                locations: [
                  { city: prev.location, time: prev.timestamp.toISOString() },
                  { city: curr.location, time: curr.timestamp.toISOString() },
                ],
                distance: `${Math.round(distance)} كم`,
                duration: `${Math.round(timeDiff / 60000)} دقيقة`,
              }),
            });

            await alertRepo.save(alert);
          }
        }
      }
    }
  }

  /**
   * Detect device hopping
   */
  private async detectDeviceHopping(): Promise<void> {
    // This is already handled in RiskAssessmentService
    // We can create alerts for high-risk device hopping cases
    const shadowIdRepo = this.dataSource.getRepository(ShadowId);
    const alertRepo = this.dataSource.getRepository(SecurityAlert);

    const highRiskShadowIds = await shadowIdRepo.find({
      where: {
        riskLevel: "High",
      },
      relations: ["user"],
    });

    for (const shadowId of highRiskShadowIds) {
      // Check if device hopping alert exists
      const existing = await alertRepo.findOne({
        where: {
          type: AlertType.DEVICE_HOPPING,
          shadowId: { id: shadowId.id },
          isResolved: false,
        },
      });

      if (!existing && shadowId.deviceFingerprint) {
        // Check if scan was from different device (would be in metadata or we check activities)
        const alert = alertRepo.create({
          type: AlertType.DEVICE_HOPPING,
          severity: AlertSeverity.HIGH,
          title: "قفز بين الأجهزة",
          description:
            "تم اكتشاف استخدام Shadow ID من جهاز مختلف عن الجهاز الذي أنشأه",
          user: shadowId.user,
          shadowId: shadowId,
          location: shadowId.generationLocation || null,
          metadata: JSON.stringify({
            generationDevice: shadowId.deviceFingerprint,
          }),
        });

        await alertRepo.save(alert);
      }
    }
  }

  /**
   * Detect high-risk scans
   */
  private async detectHighRiskScans(): Promise<void> {
    const shadowIdRepo = this.dataSource.getRepository(ShadowId);
    const alertRepo = this.dataSource.getRepository(SecurityAlert);

    const highRiskShadowIds = await shadowIdRepo
      .createQueryBuilder("shadowId")
      .where("shadowId.riskLevel = :level", { level: "High" })
      .andWhere("shadowId.riskScore >= :score", { score: 70 })
      .leftJoinAndSelect("shadowId.user", "user")
      .getMany();

    for (const shadowId of highRiskShadowIds) {
      const existing = await alertRepo.findOne({
        where: {
          type: AlertType.HIGH_RISK_SCAN,
          shadowId: { id: shadowId.id },
          isResolved: false,
        },
      });

      if (!existing) {
        const alert = alertRepo.create({
          type: AlertType.HIGH_RISK_SCAN,
          severity: AlertSeverity.HIGH,
          title: "فحص عالي المخاطر",
          description: `Shadow ID تم فحصه بمستوى خطر عالي (${shadowId.riskScore})`,
          user: shadowId.user,
          shadowId: shadowId,
          location: shadowId.generationLocation || null,
          metadata: JSON.stringify({
            riskScore: shadowId.riskScore,
            riskLevel: shadowId.riskLevel,
          }),
        });

        await alertRepo.save(alert);
      }
    }
  }

  /**
   * Calculate distance between two locations (Haversine formula)
   */
  private calculateDistance(loc1: string, loc2: string): number {
    const coords1 = this.parseCoordinates(loc1);
    const coords2 = this.parseCoordinates(loc2);

    if (!coords1 || !coords2) return 0;

    const R = 6371; // Earth radius in km
    const dLat = this.toRad(coords2.lat - coords1.lat);
    const dLon = this.toRad(coords2.lng - coords1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(coords1.lat)) *
        Math.cos(this.toRad(coords2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  private parseCoordinates(
    location: string
  ): { lat: number; lng: number } | null {
    if (!location) return null;
    const match = location.match(/([\d.]+),\s*([\d.]+)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    return null;
  }
}
