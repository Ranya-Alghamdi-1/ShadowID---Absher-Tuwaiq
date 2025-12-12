import { DataSource } from "typeorm";
import { Activity } from "../entities/Activity";
import { ShadowId } from "../entities/ShadowId";
import { User } from "../entities/User";

export class ActivityService {
  constructor(private dataSource: DataSource) {}

  /**
   * Log a new activity
   */
  async logActivity(
    shadowIdId: number | null, // Nullable for security events (invalid tokens)
    type: "generated" | "used" | "expired",
    service: string,
    location: string,
    status: "verified" | "rejected" | "pending" = "verified",
    region?: string
  ): Promise<Activity> {
    const activityRepo = this.dataSource.getRepository(Activity);

    let shadowId = null;
    if (shadowIdId !== null) {
      const shadowIdRepo = this.dataSource.getRepository(ShadowId);
      shadowId = await shadowIdRepo.findOne({
        where: { id: shadowIdId },
        relations: ["user"],
      });

      if (!shadowId) {
        throw new Error(`ShadowId with id ${shadowIdId} not found`);
      }
    }

    // Generate blockchain hash (mock for now)
    const blockchainHash = this.generateBlockchainHash();

    // Create activity (shadowId can be null for security events)
    const activity = activityRepo.create({
      type,
      service,
      location,
      timestamp: new Date(),
      blockchainHash,
      status,
      region: region || this.getRegionFromLocation(location),
      shadowId: shadowId || undefined, // Can be null for invalid token attempts
    });

    await activityRepo.save(activity);

    return activity;
  }

  /**
   * Get activities for a specific user
   */
  async getUserActivities(
    userId: number,
    filters?: {
      type?: string;
      status?: string;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ activities: Activity[]; total: number }> {
    const activityRepo = this.dataSource.getRepository(Activity);

    const queryBuilder = activityRepo
      .createQueryBuilder("activity")
      .leftJoinAndSelect("activity.shadowId", "shadowId")
      .leftJoin("shadowId.user", "user")
      .where("user.id = :userId", { userId })
      .orderBy("activity.timestamp", "DESC");

    // Apply filters
    if (filters?.type) {
      queryBuilder.andWhere("activity.type = :type", { type: filters.type });
    }

    if (filters?.status) {
      queryBuilder.andWhere("activity.status = :status", {
        status: filters.status,
      });
    }

    if (filters?.dateFrom) {
      queryBuilder.andWhere("activity.timestamp >= :dateFrom", {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters?.dateTo) {
      queryBuilder.andWhere("activity.timestamp <= :dateTo", {
        dateTo: filters.dateTo,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    if (filters?.limit) {
      queryBuilder.limit(filters.limit);
    }
    if (filters?.offset) {
      queryBuilder.offset(filters.offset);
    }

    const activities = await queryBuilder.getMany();

    return { activities, total };
  }

  /**
   * Get activities for a specific Shadow ID
   */
  async getShadowIdActivities(shadowIdId: number): Promise<Activity[]> {
    const activityRepo = this.dataSource.getRepository(Activity);

    return await activityRepo.find({
      where: { shadowId: { id: shadowIdId } },
      order: { timestamp: "DESC" },
    });
  }

  /**
   * Generate a mock blockchain hash
   */
  private generateBlockchainHash(): string {
    const chars = "0123456789abcdef";
    let hash = "0x";
    for (let i = 0; i < 64; i++) {
      hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
  }

  /**
   * Extract region from location (simple mapping)
   */
  private getRegionFromLocation(location: string): string {
    const regionMap: { [key: string]: string } = {
      الرياض: "الرياض",
      جدة: "مكة المكرمة",
      الدمام: "الشرقية",
      الخبر: "الشرقية",
      الطائف: "مكة المكرمة",
      أبها: "عسير",
      تبوك: "تبوك",
      حائل: "حائل",
      القصيم: "القصيم",
    };

    // Try exact match first
    if (regionMap[location]) {
      return regionMap[location];
    }

    // Try partial match
    for (const [city, region] of Object.entries(regionMap)) {
      if (location.includes(city) || city.includes(location)) {
        return region;
      }
    }

    // Default
    return "غير محدد";
  }
}
