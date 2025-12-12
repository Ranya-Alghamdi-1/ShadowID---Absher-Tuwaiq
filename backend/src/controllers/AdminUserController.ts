import { Request, Response } from "express";
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { ShadowId } from "../entities/ShadowId";
import { Activity } from "../entities/Activity";
import { Session } from "../entities/Session";

export class AdminUserController {
  constructor(private dataSource: DataSource) {}

  /**
   * Get all users (with pagination)
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt((req.query.page as string) || "1");
      const limit = parseInt((req.query.limit as string) || "50");
      const search = req.query.search as string | undefined;

      const userRepo = this.dataSource.getRepository(User);
      const queryBuilder = userRepo.createQueryBuilder("user");

      if (search) {
        queryBuilder.where(
          "(user.name LIKE :search OR user.nationalId LIKE :search OR user.phone LIKE :search)",
          { search: `%${search}%` }
        );
      }

      const [users, total] = await queryBuilder
        .orderBy("user.createdAt", "DESC")
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      res.json({
        success: true,
        users: users.map((user) => ({
          id: user.id,
          nationalId: user.nationalId,
          name: user.name,
          phone: user.phone,
          personType: user.personType,
          nationality: user.nationality,
          totalIdsGenerated: user.totalIdsGenerated,
          totalVerified: user.totalVerified,
          activeDays: user.activeDays,
          createdAt: user.createdAt.toISOString(),
          lastLoginAt: user.lastLoginAt?.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch users",
      });
    }
  }

  /**
   * Get user activity
   */
  async getUserActivity(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = "50", offset = "0" } = req.query;

      const activityRepo = this.dataSource.getRepository(Activity);
      const activities = await activityRepo
        .createQueryBuilder("activity")
        .leftJoinAndSelect("activity.shadowId", "shadowId")
        .leftJoin("shadowId.user", "user")
        .where("user.id = :userId", { userId: parseInt(id) })
        .orderBy("activity.timestamp", "DESC")
        .take(parseInt(limit as string))
        .skip(parseInt(offset as string))
        .getMany();

      res.json({
        success: true,
        activities: activities.map((activity) => ({
          id: activity.id,
          type: activity.type,
          service: activity.service,
          location: activity.location,
          timestamp: activity.timestamp.toISOString(),
          status: activity.status,
          blockchainHash: activity.blockchainHash,
          region: activity.region,
          shadowId: activity.shadowId
            ? {
                token: activity.shadowId.token,
                createdAt: activity.shadowId.createdAt.toISOString(),
              }
            : null,
        })),
      });
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch user activity",
      });
    }
  }

  /**
   * Get user's Shadow ID history
   */
  async getUserShadowIds(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit = "50", offset = "0" } = req.query;

      const shadowIdRepo = this.dataSource.getRepository(ShadowId);
      const shadowIds = await shadowIdRepo
        .createQueryBuilder("shadowId")
        .where("shadowId.user = :userId", { userId: parseInt(id) })
        .orderBy("shadowId.createdAt", "DESC")
        .take(parseInt(limit as string))
        .skip(parseInt(offset as string))
        .getMany();

      res.json({
        success: true,
        shadowIds: shadowIds.map((shadowId) => ({
          id: shadowId.id,
          token: shadowId.token,
          createdAt: shadowId.createdAt.toISOString(),
          expiresAt: shadowId.expiresAt.toISOString(),
          isActive: shadowId.isActive,
          isUsed: shadowId.isUsed,
          riskScore: shadowId.riskScore,
          riskLevel: shadowId.riskLevel,
          deviceFingerprint: shadowId.deviceFingerprint,
          generationLocation: shadowId.generationLocation,
        })),
      });
    } catch (error) {
      console.error("Error fetching user Shadow IDs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch user Shadow IDs",
      });
    }
  }
}

