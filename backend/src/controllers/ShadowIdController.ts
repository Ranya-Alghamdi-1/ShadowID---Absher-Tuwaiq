import { Request, Response } from "express";
import { DataSource } from "typeorm";
import { AppDataSource } from "../database";
import { Activity } from "../entities/Activity";
import { ShadowId } from "../entities/ShadowId";
import { ActivityService } from "../services/ActivityService";
import { DeviceService } from "../services/DeviceService";
import { RiskAssessmentService } from "../services/RiskAssessmentService";
import { ServiceService } from "../services/ServiceService";
import { ShadowIdService } from "../services/ShadowIdService";
import { Session } from "../entities/Session";

export class ShadowIdController {
  constructor(private dataSource: DataSource) {}

  /**
   * Generate new Shadow ID
   */
  async generate(req: any, res: Response): Promise<void> {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      const shadowIdService = new ShadowIdService(this.dataSource);
      const riskService = new RiskAssessmentService(this.dataSource);
      const deviceService = new DeviceService(this.dataSource);

      const userAgent = req.headers["user-agent"] || "";
      const fingerprintData = req.body.fingerprintData;
      const deviceFingerprint = deviceService.generateFingerprint(
        userAgent,
        req.headers,
        fingerprintData
      );

      // Get location from session
      const sessionRepo = AppDataSource.getRepository(Session);
      const dbSession = await sessionRepo.findOne({
        where: { sessionId: req.sessionID },
      });
      const generationLocation = dbSession?.location || "غير محدد";

      // Check active device limit
      if (deviceFingerprint) {
        const deviceCheck = await riskService.checkActiveDeviceLimit(
          userId,
          deviceFingerprint
        );
        if (!deviceCheck.allowed) {
          res.status(403).json({
            success: false,
            error: deviceCheck.message || "Device limit exceeded",
            blocked: true,
          });
          return;
        }
      }

      // Rate limiting
      const shadowIdRepo = this.dataSource.getRepository(ShadowId);
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const recentGenerations = await shadowIdRepo
        .createQueryBuilder("shadowId")
        .where("shadowId.userId = :userId", { userId })
        .andWhere("shadowId.createdAt >= :twoMinutesAgo", { twoMinutesAgo })
        .getCount();

      if (recentGenerations >= 3) {
        res.status(429).json({
          success: false,
          error: "Too many generation requests. Please wait 2 minutes.",
          blocked: true,
          retryAfter: 120,
        });
        return;
      }

      const forceNew = req.query.force === "true" || req.body.force === true;

      const shadowId = await shadowIdService.generateShadowId(
        userId,
        forceNew,
        deviceFingerprint,
        generationLocation
      );

      res.json({
        success: true,
        shadowId: {
          token: shadowId.token,
          expiresAt: shadowId.expiresAt.toISOString(),
          riskScore: shadowId.riskScore,
          riskLevel: shadowId.riskLevel,
        },
      });
    } catch (error) {
      console.error("Error generating Shadow ID:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate Shadow ID",
      });
    }
  }

  /**
   * Validate/Get current Shadow ID status
   */
  async validate(req: any, res: Response): Promise<void> {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      const shadowIdService = new ShadowIdService(this.dataSource);
      const status = await shadowIdService.getShadowIdStatus(userId);

      if (status.shadowId) {
        res.json({
          success: true,
          valid: status.valid,
          expired: status.expired,
          expiresAt: status.shadowId.expiresAt.toISOString(),
          remaining: status.remaining,
          token: status.shadowId.token,
        });
      } else {
        res.json({
          success: true,
          valid: false,
          expired: false,
          remaining: 0,
        });
      }
    } catch (error) {
      console.error("Error validating Shadow ID:", error);
      res.status(500).json({
        success: false,
        error: "Failed to validate Shadow ID",
      });
    }
  }

  /**
   * Revoke Shadow ID
   */
  async revoke(req: any, res: Response): Promise<void> {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      const { token } = req.body;
      if (!token) {
        res.status(400).json({
          success: false,
          error: "Token is required",
        });
        return;
      }

      const shadowIdRepo = this.dataSource.getRepository(ShadowId);
      const shadowId = await shadowIdRepo.findOne({
        where: {
          token,
          user: { id: userId },
        },
      });

      if (!shadowId) {
        res.status(404).json({
          success: false,
          error: "Shadow ID not found",
        });
        return;
      }

      shadowId.isActive = false;
      await shadowIdRepo.save(shadowId);

      // Log revocation
      try {
        const activityService = new ActivityService(this.dataSource);
        await activityService.logActivity(
          shadowId.id,
          "expired",
          "نظام Shadow ID",
          shadowId.generationLocation || "غير محدد",
          "verified"
        );
      } catch (error) {
        console.error("Failed to log revocation activity:", error);
      }

      res.json({
        success: true,
        message: "Shadow ID revoked successfully",
        token: shadowId.token,
      });
    } catch (error) {
      console.error("Error revoking Shadow ID:", error);
      res.status(500).json({
        success: false,
        error: "Failed to revoke Shadow ID",
      });
    }
  }

  /**
   * Get Shadow ID details
   */
  async getDetails(req: any, res: Response): Promise<void> {
    try {
      const userId = req.session.userId;
      const { token } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      const shadowIdRepo = this.dataSource.getRepository(ShadowId);
      const shadowId = await shadowIdRepo.findOne({
        where: {
          token,
          user: { id: userId },
        },
        relations: ["user"],
      });

      if (!shadowId) {
        res.status(404).json({
          success: false,
          error: "Shadow ID not found",
        });
        return;
      }

      const activityRepo = this.dataSource.getRepository(Activity);
      const activities = await activityRepo.find({
        where: { shadowId: { id: shadowId.id } },
        order: { timestamp: "DESC" },
        take: 10,
      });

      const now = new Date();
      const expiresAt = new Date(shadowId.expiresAt);
      const isExpired = expiresAt <= now;
      const remaining = isExpired
        ? 0
        : Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

      res.json({
        success: true,
        shadowId: {
          token: shadowId.token,
          createdAt: shadowId.createdAt.toISOString(),
          expiresAt: shadowId.expiresAt.toISOString(),
          isActive: shadowId.isActive,
          isUsed: shadowId.isUsed,
          isExpired,
          remaining,
          riskScore: shadowId.riskScore,
          riskLevel: shadowId.riskLevel,
          deviceFingerprint: shadowId.deviceFingerprint,
          generationLocation: shadowId.generationLocation,
          activities: activities.map((activity) => ({
            id: activity.id,
            type: activity.type,
            service: activity.service,
            location: activity.location,
            timestamp: activity.timestamp.toISOString(),
            status: activity.status,
            blockchainHash: activity.blockchainHash,
          })),
        },
      });
    } catch (error) {
      console.error("Error fetching Shadow ID details:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch Shadow ID details",
      });
    }
  }

  /**
   * Scan Shadow ID (external service endpoint)
   */
  async scan(req: Request, res: Response): Promise<void> {
    try {
      const { token, apiKey, portalId } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: "Token is required",
        });
        return;
      }

      if (!apiKey) {
        res.status(401).json({
          success: false,
          error: "API key is required",
        });
        return;
      }

      if (!portalId) {
        res.status(400).json({
          success: false,
          error: "Portal ID is required",
        });
        return;
      }

      const serviceService = new ServiceService(this.dataSource);
      const service = await serviceService.findByApiKey(apiKey);

      if (!service) {
        res.status(401).json({
          success: false,
          error: "Invalid API key",
        });
        return;
      }

      const portal = await serviceService.findPortalForService(
        service,
        portalId
      );
      if (!portal) {
        res.status(400).json({
          success: false,
          error: `Portal '${portalId}' not found or not authorized for this service`,
        });
        return;
      }

      const location = portal.location;
      const shadowIdRepo = this.dataSource.getRepository(ShadowId);
      const shadowId = await shadowIdRepo.findOne({
        where: { token },
        relations: ["user"],
      });

      const now = new Date();
      let scanStatus: "verified" | "rejected" = "verified";
      let errorMessage: string | null = null;

      if (!shadowId) {
        scanStatus = "rejected";
        errorMessage = "Token not found";

        try {
          const activityService = new ActivityService(this.dataSource);
          await activityService.logActivity(
            null,
            "used",
            service.name,
            location,
            "rejected",
            portal.region
          );
        } catch (error) {
          console.error("Failed to log failed scan activity:", error);
        }

        res.json({
          success: false,
          valid: false,
          error: errorMessage,
        });
        return;
      }

      const expiresAt = new Date(shadowId.expiresAt);
      const expired = expiresAt <= now;

      if (expired || !shadowId.isActive) {
        scanStatus = "rejected";
        errorMessage = expired ? "Token expired" : "Token revoked";

        try {
          const activityService = new ActivityService(this.dataSource);
          await activityService.logActivity(
            shadowId.id,
            "used",
            service.name,
            location,
            "rejected",
            portal.region
          );
        } catch (error) {
          console.error("Failed to log failed scan activity:", error);
        }

        res.json({
          success: false,
          valid: false,
          expired: expired,
          error: errorMessage,
        });
        return;
      }

      if (shadowId.isUsed) {
        scanStatus = "rejected";
        errorMessage = "Token already used - one-time use only";

        try {
          const activityService = new ActivityService(this.dataSource);
          await activityService.logActivity(
            shadowId.id,
            "used",
            service.name,
            location,
            "rejected",
            portal.region
          );
        } catch (error) {
          console.error("Failed to log failed scan activity:", error);
        }

        res.json({
          success: false,
          valid: false,
          error: errorMessage,
        });
        return;
      }

      // Risk assessment
      const riskService = new RiskAssessmentService(this.dataSource);
      const scanDeviceFingerprint = req.body.deviceFingerprint as
        | string
        | undefined;

      const riskAssessment = await riskService.assessRisk(
        shadowId,
        scanDeviceFingerprint,
        location,
        now
      );

      shadowId.riskScore = riskAssessment.riskScore;
      shadowId.riskLevel = riskAssessment.riskLevel;
      await shadowIdRepo.save(shadowId);

      if (riskAssessment.riskLevel === "High") {
        scanStatus = "rejected";
        errorMessage = `High risk detected: ${riskAssessment.anomalies.join(
          ", "
        )}`;

        try {
          const activityService = new ActivityService(this.dataSource);
          await activityService.logActivity(
            shadowId.id,
            "used",
            service.name,
            location,
            "rejected",
            portal.region
          );
        } catch (error) {
          console.error("Failed to log high-risk scan activity:", error);
        }

        console.warn("HIGH RISK ALERT:", {
          token: shadowId.token,
          userId: shadowId.user.id,
          anomalies: riskAssessment.anomalies,
          alerts: riskAssessment.alerts,
        });

        res.json({
          success: false,
          valid: false,
          error: errorMessage,
          riskLevel: riskAssessment.riskLevel,
          riskScore: riskAssessment.riskScore,
          anomalies: riskAssessment.anomalies,
        });
        return;
      }

      shadowId.isUsed = true;
      await shadowIdRepo.save(shadowId);

      // Log successful scan
      try {
        const activityService = new ActivityService(this.dataSource);
        await activityService.logActivity(
          shadowId.id,
          "used",
          service.name,
          location,
          "verified",
          portal.region
        );
      } catch (error) {
        console.error("Failed to log scan activity:", error);
      }

      const response: any = {
        success: true,
        valid: true,
        expired: false,
        token: shadowId.token,
        expiresAt: shadowId.expiresAt.toISOString(),
        riskLevel: riskAssessment.riskLevel,
        riskScore: riskAssessment.riskScore,
        anomalies:
          riskAssessment.anomalies.length > 0
            ? riskAssessment.anomalies
            : undefined,
      };

      if (service.requiresUserData) {
        response.user = {
          nationalId: shadowId.user.nationalId,
          name: shadowId.user.name,
        };

        try {
          const activityService = new ActivityService(this.dataSource);
          await activityService.logActivity(
            shadowId.id,
            "used",
            `${service.name} - Data Access`,
            location,
            "verified",
            portal.region
          );
        } catch (error) {
          console.error("Failed to log data access activity:", error);
        }
      }

      res.json(response);
    } catch (error) {
      console.error("Error scanning Shadow ID:", error);
      res.status(500).json({
        success: false,
        error: "Failed to validate token",
      });
    }
  }
}
