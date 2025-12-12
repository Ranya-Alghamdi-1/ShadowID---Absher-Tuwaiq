import { seedServices } from "./seed-services";
import { seedUsers } from "./seed-users";

/**
 * Seed all data: services, portals, and users
 * This is the main seed script to run
 */
async function seedAll() {
  console.log("🌱 Starting comprehensive data seeding...\n");

  try {
    // Seed services and portals first
    console.log("📦 Step 1: Seeding services and portals...");
    await seedServices();
    console.log("");

    // Seed users
    console.log("👥 Step 2: Seeding users...");
    await seedUsers();
    console.log("");

    console.log("✅ All seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log("   - Services and portals seeded");
    console.log("   - Users seeded with realistic data");
    console.log("\n💡 You can now run the application with realistic data!");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  }
}

export { seedAll };
