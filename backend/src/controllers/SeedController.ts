import { Request, Response } from "express";
import { DataSource } from "typeorm";
import { seedServices } from "../scripts/seed-services";
import { seedUsers } from "../scripts/seed-users";

export class SeedController {
  constructor(private dataSource: DataSource) {}

  /**
   * Run all seed scripts
   */
  async runSeeds(req: Request, res: Response): Promise<void> {
    try {
      console.log("🌱 Admin triggered seed operation...");

      // Run services seed
      console.log("📦 Seeding services and portals...");
      await seedServices();

      // Run users seed
      console.log("👥 Seeding users...");
      await seedUsers();

      res.json({
        success: true,
        message: "Database seeding completed successfully",
        seeded: {
          services: "Services and portals seeded",
          users: "Users seeded",
        },
      });
    } catch (error: any) {
      console.error("❌ Error during seeding:", error);
      res.status(500).json({
        success: false,
        error: "Failed to seed database",
        message: error.message,
      });
    }
  }
}

