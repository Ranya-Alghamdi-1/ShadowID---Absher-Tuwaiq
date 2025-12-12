import { Request, Response } from "express";
import { DataSource } from "typeorm";
import { ShadowIdService } from "../services/ShadowIdService";
import { ActivityService } from "../services/ActivityService";
import { ShadowId } from "../entities/ShadowId";
import { Session } from "../entities/Session";
import { AppDataSource } from "../database";

export class RiskController {
  constructor(private dataSource: DataSource) {}

  /**
   * Get risk assessment
   */
  async getAssessment(req: any, res: Response): Promise<void> {
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
      const activityService = new ActivityService(this.dataSource);

      const activeShadowId = await shadowIdService.getActiveShadowId(userId);
      const { activities } = await activityService.getUserActivities(userId, {
        limit: 20,
        offset: 0,
      });
      const { activities: rejectedActivities } =
        await activityService.getUserActivities(userId, {
          status: "rejected",
          limit: 10,
          offset: 0,
        });

      const totalActivities = activities.length;
      const rejectedCount = rejectedActivities.length;
      const successRate =
        totalActivities > 0
          ? ((totalActivities - rejectedCount) / totalActivities) * 100
          : 100;

      // Calculate connection safety
      const connectionSafety = Math.max(0, Math.min(100, successRate));

      // Calculate privacy protection
      const dataAccessActivities = activities.filter((act) =>
        act.service.includes("Data Access")
      ).length;
      const privacyProtection =
        totalActivities > 0
          ? Math.max(
              0,
              Math.min(100, 100 - (dataAccessActivities / totalActivities) * 20)
            )
          : 95;

      // Calculate authentication security
      const sessionRepo = AppDataSource.getRepository(Session);
      const activeSessions = await sessionRepo.find({
        where: { userId: userId, isActive: true },
      });
      const uniqueDevices = new Set(
        activeSessions
          .map((s) => s.deviceFingerprint)
          .filter((fp): fp is string => !!fp)
      );
      const authentication =
        uniqueDevices.size === 1
          ? 100
          : uniqueDevices.size === 2
          ? 92
          : Math.max(80, 100 - (uniqueDevices.size - 2) * 10);

      // Calculate risk score
      let currentRisk = {
        riskScore: 0,
        riskLevel: "Low" as "Low" | "Medium" | "High",
        hasActiveToken: false,
      };

      const shadowIdRepo = this.dataSource.getRepository(ShadowId);
      const recentShadowIds = await shadowIdRepo.find({
        where: { user: { id: userId } },
        order: { createdAt: "DESC" },
        take: 10,
      });

      if (
        activeShadowId &&
        (activeShadowId.riskScore > 0 || activeShadowId.isUsed)
      ) {
        currentRisk = {
          riskScore: activeShadowId.riskScore || 0,
          riskLevel:
            (activeShadowId.riskLevel as "Low" | "Medium" | "High") || "Low",
          hasActiveToken: true,
        };
      } else if (recentShadowIds.length > 0) {
        const assessedShadowIds = recentShadowIds.filter(
          (sid) => sid.riskScore > 0 || sid.isUsed
        );

        if (assessedShadowIds.length > 0) {
          const totalRiskScore = assessedShadowIds.reduce(
            (sum, sid) => sum + (sid.riskScore || 0),
            0
          );
          const avgRiskScore = Math.round(
            totalRiskScore / assessedShadowIds.length
          );

          let riskLevel: "Low" | "Medium" | "High";
          if (avgRiskScore < 20) {
            riskLevel = "Low";
          } else if (avgRiskScore < 50) {
            riskLevel = "Medium";
          } else {
            riskLevel = "High";
          }

          currentRisk = {
            riskScore: avgRiskScore,
            riskLevel,
            hasActiveToken: !!activeShadowId,
          };
        } else {
          currentRisk = {
            riskScore: 0,
            riskLevel: "Low",
            hasActiveToken: !!activeShadowId,
          };
        }
      } else if (activeShadowId) {
        currentRisk = {
          riskScore: 0,
          riskLevel: "Low",
          hasActiveToken: true,
        };
      }

      // Format alerts
      const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "always" });
      const formatRelativeTime = (timestamp: Date): string => {
        const now = new Date();
        const diffMs = now.getTime() - timestamp.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        let formatted: string;
        if (diffDays > 0) {
          formatted = rtf.format(-diffDays, "day");
        } else if (diffHours > 0) {
          formatted = rtf.format(-diffHours, "hour");
        } else if (diffMinutes > 0) {
          formatted = rtf.format(-diffMinutes, "minute");
        } else {
          formatted = rtf.format(-diffSeconds, "second");
        }

        return formatted.replace(/^قبل\s+/, "منذ ");
      };

      const alerts: Array<{
        id: number;
        severity: "info" | "success" | "warning" | "error";
        title: string;
        description: string;
        time: string;
      }> = rejectedActivities.slice(0, 5).map((activity) => {
        return {
          id: activity.id,
          severity: "error",
          title: "محاولة وصول مرفوضة",
          description: `${activity.service}: ${
            activity.type === "used" ? "محاولة استخدام" : activity.type
          }`,
          time: formatRelativeTime(new Date(activity.timestamp)),
        };
      });

      if (activities.length > 0) {
        const recentActivity = activities[0];
        const timeAgo = Math.floor(
          (Date.now() - new Date(recentActivity.timestamp).getTime()) /
            (1000 * 60)
        );
        if (timeAgo < 60) {
          alerts.unshift({
            id: -1,
            severity: "info",
            title: "نشاط حديث",
            description: `آخر استخدام: ${recentActivity.service}`,
            time: formatRelativeTime(new Date(recentActivity.timestamp)),
          });
        }
      }

      res.json({
        success: true,
        risk: currentRisk,
        metrics: {
          encryption: 100,
          connectionSafety: Math.round(connectionSafety),
          responseRate: Math.round(successRate),
          privacyProtection: Math.round(privacyProtection),
          authentication: Math.round(authentication),
        },
        alerts: alerts.length > 0 ? alerts : [],
        activityPattern: {
          totalActivities,
          rejectedCount,
          successRate: Math.round(successRate),
        },
      });
    } catch (error) {
      console.error("Error fetching risk assessment:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch risk assessment",
      });
    }
  }

  /**
   * Get risk history
   */
  async getHistory(req: any, res: Response): Promise<void> {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const shadowIdRepo = this.dataSource.getRepository(ShadowId);
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const shadowIds = await shadowIdRepo
        .createQueryBuilder("shadowId")
        .where("shadowId.user = :userId", { userId })
        .andWhere("shadowId.createdAt >= :dateFrom", { dateFrom })
        .orderBy("shadowId.createdAt", "DESC")
        .take(limit)
        .getMany();

      const dailyRisk: {
        [date: string]: { count: number; avgScore: number; maxScore: number };
      } = {};

      shadowIds.forEach((sid) => {
        const date = sid.createdAt.toISOString().split("T")[0];
        if (!dailyRisk[date]) {
          dailyRisk[date] = { count: 0, avgScore: 0, maxScore: 0 };
        }
        dailyRisk[date].count++;
        dailyRisk[date].avgScore += sid.riskScore || 0;
        dailyRisk[date].maxScore = Math.max(
          dailyRisk[date].maxScore,
          sid.riskScore || 0
        );
      });

      const history = Object.entries(dailyRisk)
        .map(([date, data]) => ({
          date,
          count: data.count,
          avgRiskScore: Math.round(data.avgScore / data.count),
          maxRiskScore: data.maxScore,
          avgRiskLevel:
            data.avgScore / data.count < 20
              ? "Low"
              : data.avgScore / data.count < 50
              ? "Medium"
              : "High",
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const totalShadowIds = shadowIds.length;
      const avgRiskScore =
        totalShadowIds > 0
          ? Math.round(
              shadowIds.reduce((sum, sid) => sum + (sid.riskScore || 0), 0) /
                totalShadowIds
            )
          : 0;
      const highRiskCount = shadowIds.filter(
        (sid) => sid.riskLevel === "High"
      ).length;
      const mediumRiskCount = shadowIds.filter(
        (sid) => sid.riskLevel === "Medium"
      ).length;
      const lowRiskCount = shadowIds.filter(
        (sid) => sid.riskLevel === "Low"
      ).length;

      res.json({
        success: true,
        period: {
          days,
          from: dateFrom.toISOString(),
          to: new Date().toISOString(),
        },
        statistics: {
          totalShadowIds,
          avgRiskScore,
          riskDistribution: {
            low: lowRiskCount,
            medium: mediumRiskCount,
            high: highRiskCount,
          },
        },
        history,
      });
    } catch (error) {
      console.error("Error fetching risk history:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch risk history",
      });
    }
  }
}
