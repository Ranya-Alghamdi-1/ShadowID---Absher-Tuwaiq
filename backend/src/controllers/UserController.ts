import { Response } from "express";
import { DataSource } from "typeorm";
import { AppDataSource } from "../database";
import { Activity } from "../entities/Activity";
import { Session } from "../entities/Session";
import { ShadowId } from "../entities/ShadowId";
import { User } from "../entities/User";
import { UserSetting } from "../entities/UserSetting";
import { ActivityService } from "../services/ActivityService";
import { UserService } from "../services/UserService";

export class UserController {
  constructor(private dataSource: DataSource) {}

  /**
   * Get user profile
   */
  async getProfile(req: any, res: Response): Promise<void> {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      const userService = new UserService(this.dataSource);
      const profile = await userService.getUserProfile(userId);

      res.json({
        success: true,
        profile,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch user profile",
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: any, res: Response): Promise<void> {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      const { name, phone, avatar } = req.body;
      const updates: any = {};
      if (name) updates.name = name;
      if (phone) updates.phone = phone;
      if (avatar !== undefined) updates.avatar = avatar;

      const userService = new UserService(this.dataSource);
      const user = await userService.updateUserProfile(userId, updates);

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          nationalId: user.nationalId,
          phone: user.phone,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update user profile",
      });
    }
  }

  /**
   * Get user settings
   */
  async getSettings(req: any, res: Response): Promise<void> {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      const settingsRepo = AppDataSource.getRepository(UserSetting);
      const settings = await settingsRepo.find({
        where: { user: { id: userId } },
      });

      const settingsObj: { [key: string]: string } = {};
      settings.forEach((setting) => {
        settingsObj[setting.key] = setting.value;
      });

      res.json({
        success: true,
        settings: settingsObj,
      });
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch user settings",
      });
    }
  }

  /**
   * Update user setting
   */
  async updateSetting(req: any, res: Response): Promise<void> {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      const { key } = req.params;
      const { value } = req.body;

      if (value === undefined) {
        res.status(400).json({
          success: false,
          error: "Value is required",
        });
        return;
      }

      const settingsRepo = AppDataSource.getRepository(UserSetting);
      const userRepo = AppDataSource.getRepository(User);

      const user = await userRepo.findOne({ where: { id: userId } });
      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
        });
        return;
      }

      let setting = await settingsRepo.findOne({
        where: {
          user: { id: userId },
          key: key,
        },
      });

      if (setting) {
        setting.value = String(value);
        await settingsRepo.save(setting);
      } else {
        setting = settingsRepo.create({
          key: key,
          value: String(value),
          user: user,
        });
        await settingsRepo.save(setting);
      }

      res.json({
        success: true,
        setting: {
          key: setting.key,
          value: setting.value,
        },
      });
    } catch (error) {
      console.error("Error updating user setting:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update user setting",
      });
    }
  }

  /**
   * Handle data request (GDPR: delete, correction, export)
   */
  async dataRequest(req: any, res: Response): Promise<void> {
    try {
      const userId = req.session.userId;
      const { type } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      const validTypes = ["delete", "correction", "export"];
      if (!validTypes.includes(type)) {
        res.status(400).json({
          success: false,
          error: `Invalid request type. Must be one of: ${validTypes.join(
            ", "
          )}`,
        });
        return;
      }

      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { id: userId },
        relations: ["shadowIds", "settings"],
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
        });
        return;
      }

      const activityService = new ActivityService(this.dataSource);

      switch (type) {
        case "delete":
          await activityService.logActivity(
            null,
            "used",
            "Data Deletion Request",
            "System",
            "verified"
          );
          res.json({
            success: true,
            message:
              "Data deletion request submitted. Your data will be deleted within 30 days.",
            requestId: `DEL-${Date.now()}`,
          });
          return;

        case "correction":
          res.json({
            success: true,
            message: "Data correction request submitted",
            data: {
              name: user.name,
              nationalId: user.nationalId,
              phone: user.phone,
              personType: user.personType,
              nationality: user.nationality,
            },
            requestId: `CORR-${Date.now()}`,
          });
          return;

        case "export":
          const shadowIdRepo = AppDataSource.getRepository(ShadowId);
          const activityRepo = AppDataSource.getRepository(Activity);
          const sessionRepo = AppDataSource.getRepository(Session);

          const shadowIds = await shadowIdRepo.find({
            where: { user: { id: userId } },
            order: { createdAt: "DESC" },
          });

          const activities = await activityRepo.find({
            where: { shadowId: { user: { id: userId } } },
            order: { timestamp: "DESC" },
            relations: ["shadowId"],
          });

          const sessions = await sessionRepo.find({
            where: { userId: userId },
            order: { createdAt: "DESC" },
          });

          res.json({
            success: true,
            message: "Data export generated",
            data: {
              user: {
                id: user.id,
                name: user.name,
                nationalId: user.nationalId,
                phone: user.phone,
                personType: user.personType,
                nationality: user.nationality,
                createdAt: user.createdAt.toISOString(),
                lastLoginAt: user.lastLoginAt?.toISOString(),
                totalIdsGenerated: user.totalIdsGenerated,
                totalVerified: user.totalVerified,
                activeDays: user.activeDays,
              },
              settings: user.settings.map((s) => ({
                key: s.key,
                value: s.value,
              })),
              shadowIds: shadowIds.map((sid) => ({
                token: sid.token,
                createdAt: sid.createdAt.toISOString(),
                expiresAt: sid.expiresAt.toISOString(),
                isActive: sid.isActive,
                isUsed: sid.isUsed,
                riskScore: sid.riskScore,
                riskLevel: sid.riskLevel,
              })),
              activities: activities.map((act) => ({
                type: act.type,
                service: act.service,
                location: act.location,
                timestamp: act.timestamp.toISOString(),
                status: act.status,
                blockchainHash: act.blockchainHash,
              })),
              sessions: sessions.map((sess) => ({
                deviceName: sess.deviceName,
                location: sess.location,
                ipAddress: sess.ipAddress,
                createdAt: sess.createdAt.toISOString(),
                expiresAt: sess.expiresAt.toISOString(),
                isActive: sess.isActive,
              })),
            },
            requestId: `EXPORT-${Date.now()}`,
            exportedAt: new Date().toISOString(),
          });
          return;

        default:
          res.status(400).json({
            success: false,
            error: "Invalid request type",
          });
          return;
      }
    } catch (error) {
      console.error("Error processing data request:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process data request",
      });
    }
  }
}
