import { Request, Response } from "express";
import { DataSource } from "typeorm";
import { ActivityService } from "../services/ActivityService";

export class ActivityController {
  constructor(private dataSource: DataSource) {}

  /**
   * Get user activities
   */
  async getActivities(req: any, res: Response): Promise<void> {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      const type = req.query.type as string | undefined;
      const status = req.query.status as string | undefined;
      const dateFrom = req.query.dateFrom
        ? new Date(req.query.dateFrom as string)
        : undefined;
      const dateTo = req.query.dateTo
        ? new Date(req.query.dateTo as string)
        : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const activityService = new ActivityService(this.dataSource);
      const result = await activityService.getUserActivities(userId, {
        type,
        status,
        dateFrom,
        dateTo,
        limit,
        offset,
      });

      res.json({
        success: true,
        activities: result.activities.map((activity) => ({
          id: activity.id,
          type: activity.type,
          service: activity.service,
          location: activity.location,
          timestamp: activity.timestamp.toISOString(),
          blockchainHash: activity.blockchainHash,
          status: activity.status,
          region: activity.region,
        })),
        total: result.total,
        limit,
        offset,
      });
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch activities",
      });
    }
  }

  /**
   * Log activity
   */
  async logActivity(req: any, res: Response): Promise<void> {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      const { shadowIdId, type, service, location, status, region } = req.body;

      if (!type || !service || !location) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: type, service, location",
        });
        return;
      }

      const activityService = new ActivityService(this.dataSource);
      await activityService.logActivity(
        shadowIdId || null,
        type,
        service,
        location,
        status || "verified",
        region
      );

      res.json({
        success: true,
        message: "Activity logged successfully",
      });
    } catch (error) {
      console.error("Error logging activity:", error);
      res.status(500).json({
        success: false,
        error: "Failed to log activity",
      });
    }
  }
}

