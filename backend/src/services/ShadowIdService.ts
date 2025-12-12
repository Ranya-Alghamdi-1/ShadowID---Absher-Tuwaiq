import { DataSource } from "typeorm";
import { ShadowId } from "../entities/ShadowId";
import { User } from "../entities/User";
import { Activity } from "../entities/Activity";
import { ActivityService } from "./ActivityService";

export class ShadowIdService {
  private activityService: ActivityService;

  constructor(private dataSource: DataSource) {
    this.activityService = new ActivityService(dataSource);
  }

  /**
   * Get or create user from nationalId
   */
  async getOrCreateUser(
    nationalId: string,
    name: string,
    phone: string,
    personType?: string,
    nationality?: string
  ): Promise<User> {
    const userRepo = this.dataSource.getRepository(User);
    let user = await userRepo.findOne({ where: { nationalId } });

    if (!user) {
      user = userRepo.create({
        nationalId,
        name,
        phone,
        personType: personType || "Citizen",
        nationality: nationality || "Saudi",
        lastLoginAt: new Date(),
      });
      await userRepo.save(user);
    } else {
      // Update last login and user info if provided
      user.lastLoginAt = new Date();
      if (personType) user.personType = personType;
      if (nationality) user.nationality = nationality;
      await userRepo.save(user);
    }

    return user;
  }

  /**
   * Get active Shadow ID for user
   */
  async getActiveShadowId(userId: number): Promise<ShadowId | null> {
    const shadowIdRepo = this.dataSource.getRepository(ShadowId);
    const now = new Date();

    const activeShadowId = await shadowIdRepo.findOne({
      where: {
        user: { id: userId },
        isActive: true,
      },
      order: {
        createdAt: "DESC",
      },
    });

    // Check if it's still valid (not expired)
    if (activeShadowId && new Date(activeShadowId.expiresAt) > now) {
      return activeShadowId;
    }

    // If expired, mark as inactive and log activity
    if (activeShadowId && new Date(activeShadowId.expiresAt) <= now) {
      activeShadowId.isActive = false;
      await shadowIdRepo.save(activeShadowId);

      // Log expired activity
      try {
        // Get device location from the most recent activity or use default
        const activityRepo = this.dataSource.getRepository(Activity);
        const lastActivity = await activityRepo.findOne({
          where: { shadowId: { id: activeShadowId.id } },
          order: { timestamp: "DESC" },
        });

        const location = lastActivity?.location || "غير محدد";

        await this.activityService.logActivity(
          activeShadowId.id,
          "expired",
          "نظام Shadow ID", // Service name for expired tokens
          location,
          "verified"
        );
      } catch (error) {
        console.error("Failed to log expired token activity:", error);
        // Don't fail if logging fails
      }
    }

    return null;
  }

  /**
   * Mark all active Shadow IDs for user as inactive
   */
  async deactivateUserShadowIds(userId: number): Promise<void> {
    const shadowIdRepo = this.dataSource.getRepository(ShadowId);
    await shadowIdRepo.update(
      {
        user: { id: userId },
        isActive: true,
      },
      {
        isActive: false,
      }
    );
  }

  /**
   * Generate new Shadow ID
   */
  async generateShadowId(
    userId: number,
    forceNew: boolean = false,
    deviceFingerprint?: string,
    generationLocation?: string
  ): Promise<ShadowId> {
    const shadowIdRepo = this.dataSource.getRepository(ShadowId);

    // Check for active token first (unless forcing new)
    if (!forceNew) {
      const active = await this.getActiveShadowId(userId);
      if (active) {
        return active;
      }
    }

    // Deactivate old tokens
    await this.deactivateUserShadowIds(userId);

    // Generate unique token
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let token = "SID-";
    for (let i = 0; i < 8; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    token += "-";
    for (let i = 0; i < 8; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Ensure token is unique
    let existing = await shadowIdRepo.findOne({ where: { token } });
    let attempts = 0;
    while (existing && attempts < 10) {
      token = "SID-";
      for (let i = 0; i < 8; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      token += "-";
      for (let i = 0; i < 8; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      existing = await shadowIdRepo.findOne({ where: { token } });
      attempts++;
    }

    // Calculate expiry (3 minutes from now)
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000);

    // Risk assessment will be done at scan time, not generation
    // Set default values (will be recalculated during scan)
    const riskScore = 0; // Will be calculated during scan
    const riskLevel = "Low"; // Will be calculated during scan

    // Create new Shadow ID with device binding
    const shadowId = shadowIdRepo.create({
      token,
      expiresAt,
      riskScore,
      riskLevel,
      isActive: true,
      isUsed: false, // One-time use: starts as unused
      deviceFingerprint: deviceFingerprint || undefined,
      generationLocation: generationLocation || undefined,
      user: { id: userId } as User,
    });

    await shadowIdRepo.save(shadowId);

    // Update user stats
    const userRepo = this.dataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (user) {
      user.totalIdsGenerated += 1;
      await userRepo.save(user);
    }

    // Log generation activity
    try {
      await this.activityService.logActivity(
        shadowId.id,
        "generated",
        "ShadowID App",
        "Mobile Device", // Will be improved with actual device location
        "verified"
      );
    } catch (error) {
      console.error("Failed to log generation activity:", error);
      // Don't fail the generation if logging fails
    }

    return shadowId;
  }

  /**
   * Get Shadow ID status
   */
  async getShadowIdStatus(userId: number): Promise<{
    valid: boolean;
    expired: boolean;
    remaining: number;
    shadowId: ShadowId | null;
  }> {
    const active = await this.getActiveShadowId(userId);

    if (!active) {
      return {
        valid: false,
        expired: false,
        remaining: 0,
        shadowId: null,
      };
    }

    const now = new Date();
    const expiresAt = new Date(active.expiresAt);
    const remaining = Math.max(
      0,
      Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
    );

    return {
      valid: remaining > 0,
      expired: remaining <= 0,
      remaining,
      shadowId: active,
    };
  }
}
