import { Request, Response } from "express";
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { ShadowId } from "../entities/ShadowId";
import { Activity } from "../entities/Activity";
import { SecurityAlert } from "../entities/SecurityAlert";
import { Session } from "../entities/Session";

// Saudi regions with coordinates for heatmap
const SAUDI_REGIONS = [
  { name: "الرياض", lat: 24.7136, lng: 46.6753 },
  { name: "جدة", lat: 21.5433, lng: 39.1728 },
  { name: "الدمام", lat: 26.4207, lng: 50.0888 },
  { name: "مكة المكرمة", lat: 21.3891, lng: 39.8579 },
  { name: "المدينة المنورة", lat: 24.5247, lng: 39.5692 },
  { name: "الطائف", lat: 21.2703, lng: 40.4158 },
  { name: "تبوك", lat: 28.3838, lng: 36.555 },
  { name: "أبها", lat: 18.2164, lng: 42.5053 },
  { name: "حائل", lat: 27.5236, lng: 41.6903 },
  { name: "جازان", lat: 16.8892, lng: 42.5511 },
  { name: "نجران", lat: 17.4933, lng: 44.1277 },
  { name: "القصيم", lat: 26.3266, lng: 43.975 },
  { name: "الشرقية", lat: 26.4207, lng: 50.0888 },
  { name: "عسير", lat: 18.2164, lng: 42.5053 },
];

export class DashboardController {
  constructor(private dataSource: DataSource) {}

  /**
   * Get dashboard statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const userRepo = this.dataSource.getRepository(User);
      const shadowIdRepo = this.dataSource.getRepository(ShadowId);
      const activityRepo = this.dataSource.getRepository(Activity);
      const alertRepo = this.dataSource.getRepository(SecurityAlert);
      const sessionRepo = this.dataSource.getRepository(Session);

      // Total users
      const totalUsers = await userRepo.count();

      // Active users (users with active sessions in last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeUsers = await sessionRepo
        .createQueryBuilder("session")
        .select("COUNT(DISTINCT session.userId)", "count")
        .where("session.isActive = :isActive", { isActive: true })
        .andWhere("session.createdAt >= :oneDayAgo", { oneDayAgo })
        .getRawOne();

      // Total Shadow IDs
      const totalShadowIds = await shadowIdRepo.count();

      // Security alerts (unresolved)
      const securityAlerts = await alertRepo.count({
        where: { isResolved: false },
      });

      // Get region stats
      const regions = await this.getRegionStats();

      res.json({
        totalUsers,
        activeUsers: parseInt(activeUsers?.count || "0"),
        totalShadowIds,
        securityAlerts,
        regions,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch dashboard statistics",
      });
    }
  }

  /**
   * Get region statistics
   */
  async getRegionStats(): Promise<any[]> {
    const activityRepo = this.dataSource.getRepository(Activity);
    const sessionRepo = this.dataSource.getRepository(Session);

    // Get activity counts by region
    const activityStats = await activityRepo
      .createQueryBuilder("activity")
      .select("activity.region", "region")
      .addSelect("COUNT(*)", "count")
      .where("activity.region IS NOT NULL")
      .groupBy("activity.region")
      .getRawMany();

    // Get user counts by region (from sessions)
    const userStats = await sessionRepo
      .createQueryBuilder("session")
      .select("session.location", "location")
      .addSelect("COUNT(DISTINCT session.userId)", "count")
      .where("session.isActive = :isActive", { isActive: true })
      .groupBy("session.location")
      .getRawMany();

    // Map regions with stats
    const regionMap = new Map<string, { users: number; usage: number }>();

    // Initialize all regions
    SAUDI_REGIONS.forEach((region) => {
      regionMap.set(region.name, { users: 0, usage: 0 });
    });

    // Add activity stats (usage percentage based on activity count)
    const maxActivityCount = Math.max(
      ...activityStats.map((s) => parseInt(s.count || "0")),
      1
    );

    activityStats.forEach((stat) => {
      const region = stat.region || "غير محدد";
      const count = parseInt(stat.count || "0");
      const usage = Math.round((count / maxActivityCount) * 100);

      if (regionMap.has(region)) {
        const existing = regionMap.get(region)!;
        existing.usage = usage;
        regionMap.set(region, existing);
      }
    });

    // Add user counts
    userStats.forEach((stat) => {
      const location = stat.location || "";
      // Try to match location to region
      const region = this.matchLocationToRegion(location);
      if (region && regionMap.has(region)) {
        const existing = regionMap.get(region)!;
        existing.users += parseInt(stat.count || "0");
        regionMap.set(region, existing);
      }
    });

    // Format response
    return SAUDI_REGIONS.map((region) => {
      const stats = regionMap.get(region.name) || { users: 0, usage: 0 };
      return {
        name: region.name,
        users: stats.users,
        usage: stats.usage,
        lat: region.lat,
        lng: region.lng,
      };
    });
  }

  /**
   * Get heatmap data points
   */
  async getHeatmap(req: Request, res: Response): Promise<void> {
    try {
      const activityRepo = this.dataSource.getRepository(Activity);

      // Get recent activities (last 7 days) with location
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const activities = await activityRepo
        .createQueryBuilder("activity")
        .where("activity.timestamp >= :sevenDaysAgo", { sevenDaysAgo })
        .take(1000)
        .getMany();

      // Parse coordinates from location strings
      const heatmapPoints = activities
        .map((activity) => {
          const coords = this.parseCoordinates(activity.location);
          if (coords) {
            return {
              lat: coords.lat,
              lng: coords.lng,
              intensity: 1,
              timestamp: activity.timestamp.toISOString(),
            };
          }
          return null;
        })
        .filter((point): point is NonNullable<typeof point> => point !== null);

      res.json({
        success: true,
        points: heatmapPoints,
      });
    } catch (error) {
      console.error("Error fetching heatmap data:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch heatmap data",
      });
    }
  }

  /**
   * Parse coordinates from location string
   */
  private parseCoordinates(
    location: string
  ): { lat: number; lng: number } | null {
    if (!location) return null;

    // Try to parse "lat, lng" format
    const match = location.match(/([\d.]+),\s*([\d.]+)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }

    // Try to match city name to region coordinates
    const region = this.matchLocationToRegion(location);
    if (region) {
      const regionData = SAUDI_REGIONS.find((r) => r.name === region);
      if (regionData) {
        return { lat: regionData.lat, lng: regionData.lng };
      }
    }

    return null;
  }

  /**
   * Match location string to region name
   */
  private matchLocationToRegion(location: string): string | null {
    const regionMap: { [key: string]: string } = {
      الرياض: "الرياض",
      جدة: "جدة",
      الدمام: "الشرقية",
      الخبر: "الشرقية",
      الطائف: "الطائف",
      أبها: "أبها",
      تبوك: "تبوك",
      حائل: "حائل",
      القصيم: "القصيم",
      المدينة: "المدينة المنورة",
      "المدينة المنورة": "المدينة المنورة",
      مكة: "مكة المكرمة",
      "مكة المكرمة": "مكة المكرمة",
      جازان: "جازان",
      نجران: "نجران",
    };

    // Try exact match
    if (regionMap[location]) {
      return regionMap[location];
    }

    // Try partial match
    for (const [city, region] of Object.entries(regionMap)) {
      if (location.includes(city) || city.includes(location)) {
        return region;
      }
    }

    return null;
  }
}
