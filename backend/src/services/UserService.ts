import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { ShadowId } from "../entities/ShadowId";
import { Activity } from "../entities/Activity";

export class UserService {
  constructor(private dataSource: DataSource) {}

  /**
   * Get user profile with statistics
   */
  async getUserProfile(userId: number): Promise<{
    id: number;
    name: string;
    nationalId: string;
    phone: string;
    avatar?: string;
    lastLoginAt?: Date;
    createdAt: Date;
    stats: {
      totalIdsGenerated: number;
      totalVerified: number;
      activeDays: number;
    };
  }> {
    const userRepo = this.dataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Calculate totalVerified from activities
    const activityRepo = this.dataSource.getRepository(Activity);
    const shadowIdRepo = this.dataSource.getRepository(ShadowId);

    const userShadowIds = await shadowIdRepo.find({
      where: { user: { id: userId } },
      select: ["id"],
    });

    let verifiedCount = 0;
    if (userShadowIds.length > 0) {
      const shadowIdIds = userShadowIds.map((sid) => sid.id);
      verifiedCount = await activityRepo
        .createQueryBuilder("activity")
        .where("activity.shadowId IN (:...ids)", { ids: shadowIdIds })
        .andWhere("activity.status = :status", { status: "verified" })
        .andWhere("activity.type = :type", { type: "used" })
        .getCount();
    }

    // Calculate activeDays (days since first Shadow ID creation)
    let activeDays = 0;
    if (userShadowIds.length > 0) {
      const firstShadowId = await shadowIdRepo.findOne({
        where: { user: { id: userId } },
        order: { createdAt: "ASC" },
      });
      if (firstShadowId) {
        const daysSinceFirst =
          Math.floor(
            (Date.now() - firstShadowId.createdAt.getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1;
        activeDays = Math.max(user.activeDays, daysSinceFirst);
      }
    }

    return {
      id: user.id,
      name: user.name,
      nationalId: user.nationalId,
      phone: user.phone,
      avatar: user.avatar,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      stats: {
        totalIdsGenerated: user.totalIdsGenerated,
        totalVerified: verifiedCount,
        activeDays: activeDays,
      },
    };
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: number,
    updates: Partial<{
      name: string;
      phone: string;
      avatar: string;
    }>
  ): Promise<User> {
    const userRepo = this.dataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    Object.assign(user, updates);
    await userRepo.save(user);
    return user;
  }
}
