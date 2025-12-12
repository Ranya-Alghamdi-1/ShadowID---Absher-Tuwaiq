import { AppDataSource } from "../database";
import { User } from "../entities/User";

/**
 * Seed realistic users into the database
 * Run this after database initialization
 */
async function seedUsers() {
  let shouldDestroy = false;
  try {
    // Only initialize if not already initialized (for API calls)
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      shouldDestroy = true;
    }

    const userRepo = AppDataSource.getRepository(User);

    // Realistic Saudi users data
    const usersData = [
      // Citizens
      {
        nationalId: "1012345678",
        name: "محمد أحمد العلي",
        phone: "+966501234567",
        personType: "Citizen",
        nationality: "Saudi",
      },
      {
        nationalId: "1023456789",
        name: "فاطمة سعد الدوسري",
        phone: "+966502345678",
        personType: "Citizen",
        nationality: "Saudi",
      },
      {
        nationalId: "1034567890",
        name: "خالد عبدالله القحطاني",
        phone: "+966503456789",
        personType: "Citizen",
        nationality: "Saudi",
      },
      {
        nationalId: "1045678901",
        name: "نورا محمد الشمري",
        phone: "+966504567890",
        personType: "Citizen",
        nationality: "Saudi",
      },
      {
        nationalId: "1056789012",
        name: "عبدالرحمن فيصل الحربي",
        phone: "+966505678901",
        personType: "Citizen",
        nationality: "Saudi",
      },
      {
        nationalId: "1067890123",
        name: "سارة علي الزهراني",
        phone: "+966506789012",
        personType: "Citizen",
        nationality: "Saudi",
      },
      {
        nationalId: "1078901234",
        name: "يوسف حمد المطيري",
        phone: "+966507890123",
        personType: "Citizen",
        nationality: "Saudi",
      },
      {
        nationalId: "1089012345",
        name: "لينا أحمد الغامدي",
        phone: "+966508901234",
        personType: "Citizen",
        nationality: "Saudi",
      },
      {
        nationalId: "1090123456",
        name: "عمر خالد العتيبي",
        phone: "+966509012345",
        personType: "Citizen",
        nationality: "Saudi",
      },
      {
        nationalId: "1101234567",
        name: "ريم سعد البقمي",
        phone: "+966510123456",
        personType: "Citizen",
        nationality: "Saudi",
      },
      // Residents
      {
        nationalId: "2012345678",
        name: "Ahmed Mohamed Hassan",
        phone: "+966501234568",
        personType: "Resident",
        nationality: "Egyptian",
      },
      {
        nationalId: "2023456789",
        name: "Fatima Ali Ibrahim",
        phone: "+966502345679",
        personType: "Resident",
        nationality: "Egyptian",
      },
      {
        nationalId: "2034567890",
        name: "Mohammed Abdullah Khan",
        phone: "+966503456790",
        personType: "Resident",
        nationality: "Pakistani",
      },
      {
        nationalId: "2045678901",
        name: "Maria Santos Garcia",
        phone: "+966504567891",
        personType: "Resident",
        nationality: "Filipino",
      },
      {
        nationalId: "2056789012",
        name: "John Michael Smith",
        phone: "+966505678902",
        personType: "Resident",
        nationality: "American",
      },
      {
        nationalId: "2067890123",
        name: "Priya Sharma",
        phone: "+966506789013",
        personType: "Resident",
        nationality: "Indian",
      },
      {
        nationalId: "2078901234",
        name: "Hassan Ali Al-Mahmoud",
        phone: "+966507890124",
        personType: "Resident",
        nationality: "Syrian",
      },
      {
        nationalId: "2089012345",
        name: "Amina Hassan Mohamed",
        phone: "+966508901235",
        personType: "Resident",
        nationality: "Sudanese",
      },
      {
        nationalId: "2090123456",
        name: "Yusuf Ahmed Ali",
        phone: "+966509012346",
        personType: "Resident",
        nationality: "Yemeni",
      },
      {
        nationalId: "2101234567",
        name: "Fatima Zahra Al-Hashimi",
        phone: "+966510123457",
        personType: "Resident",
        nationality: "Iraqi",
      },
    ];

    console.log("🌱 Seeding users...");

    let created = 0;
    let updated = 0;

    for (const userData of usersData) {
      try {
        let user = await userRepo.findOne({
          where: { nationalId: userData.nationalId },
        });

        if (!user) {
          user = userRepo.create({
            nationalId: userData.nationalId,
            name: userData.name,
            phone: userData.phone,
            personType: userData.personType,
            nationality: userData.nationality,
            totalIdsGenerated: Math.floor(Math.random() * 50) + 5, // 5-55
            totalVerified: Math.floor(Math.random() * 45) + 3, // 3-48
            activeDays: Math.floor(Math.random() * 30) + 1, // 1-30
            lastLoginAt: new Date(
              Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
            ), // Within last 7 days
          });
          await userRepo.save(user);
          created++;
          console.log(`✅ Created user: ${user.name} (${user.nationalId})`);
        } else {
          // Update existing user with realistic stats if they're too low
          if (user.totalIdsGenerated < 5) {
            user.totalIdsGenerated = Math.floor(Math.random() * 50) + 5;
          }
          if (user.totalVerified < 3) {
            user.totalVerified = Math.floor(Math.random() * 45) + 3;
          }
          if (user.activeDays < 1) {
            user.activeDays = Math.floor(Math.random() * 30) + 1;
          }
          if (!user.lastLoginAt) {
            user.lastLoginAt = new Date(
              Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
            );
          }
          await userRepo.save(user);
          updated++;
          console.log(
            `⏭️  User ${userData.nationalId} already exists, updated stats`
          );
        }
      } catch (error: any) {
        console.error(
          `❌ Error creating/updating user ${userData.nationalId}:`,
          error.message
        );
      }
    }

    console.log(
      `✅ User seeding completed: ${created} created, ${updated} updated`
    );

    // Only destroy if we initialized it (not when called from API)
    if (shouldDestroy) {
      await AppDataSource.destroy();
    }
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    process.exit(1);
  }
}

// Note: This script is now called via API endpoint /api/admin/seed/run
// To run directly: ts-node src/scripts/seed-users.ts

export { seedUsers };
