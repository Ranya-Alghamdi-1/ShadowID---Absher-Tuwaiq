import { AppDataSource } from "../database";
import { ServiceService } from "../services/ServiceService";

/**
 * Seed initial services and portals into the database
 * Run this after database initialization
 */
async function seedServices() {
  let shouldDestroy = false;
  try {
    // Only initialize if not already initialized (for API calls)
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      shouldDestroy = true;
    }

    const serviceService = new ServiceService(AppDataSource);

    // Comprehensive list of services with portals across all Saudi regions
    const servicesData = [
      {
        serviceId: "MOI-001",
        name: "وزارة الداخلية",
        nameEn: "Ministry of Interior",
        requiresUserData: true,
        description: "Ministry of Interior - Government Services",
        portals: [
          {
            portalId: "MOI-001-RIYADH-01",
            name: "وزارة الداخلية - فرع الرياض الرئيسي",
            location: "الرياض",
            address: "الرياض، حي العليا",
          },
          {
            portalId: "MOI-001-JEDDAH-01",
            name: "وزارة الداخلية - فرع جدة",
            location: "جدة",
            address: "جدة، حي الزهراء",
          },
          {
            portalId: "MOI-001-DAMMAM-01",
            name: "وزارة الداخلية - فرع الدمام",
            location: "الدمام",
            address: "الدمام، حي الفيصلية",
          },
        ],
      },
      {
        serviceId: "AHLI-BANK-001",
        name: "البنك الأهلي",
        nameEn: "Al Ahli Bank",
        requiresUserData: false,
        description: "Al Ahli Bank - Banking Services",
        portals: [
          {
            portalId: "AHLI-BANK-001-RIYADH-01",
            name: "البنك الأهلي - فرع الرياض - العليا",
            location: "الرياض",
            address: "الرياض، حي العليا",
          },
          {
            portalId: "AHLI-BANK-001-RIYADH-02",
            name: "البنك الأهلي - فرع الرياض - المطار",
            location: "الرياض",
            address: "الرياض، مطار الملك خالد",
          },
          {
            portalId: "AHLI-BANK-001-JEDDAH-01",
            name: "البنك الأهلي - فرع جدة",
            location: "جدة",
            address: "جدة، حي الزهراء",
          },
          {
            portalId: "AHLI-BANK-001-DAMMAM-01",
            name: "البنك الأهلي - فرع الدمام",
            location: "الدمام",
            address: "الدمام، حي الفيصلية",
          },
        ],
      },
      {
        serviceId: "KFSH-001",
        name: "مستشفى الملك فيصل",
        nameEn: "King Faisal Specialist Hospital",
        requiresUserData: true,
        description: "King Faisal Specialist Hospital - Healthcare Services",
        portals: [
          {
            portalId: "KFSH-001-RIYADH-01",
            name: "مستشفى الملك فيصل - الرياض",
            location: "الرياض",
            address: "الرياض، حي العليا",
          },
          {
            portalId: "KFSH-001-JEDDAH-01",
            name: "مستشفى الملك فيصل - جدة",
            location: "جدة",
            address: "جدة، حي الزهراء",
          },
        ],
      },
      {
        serviceId: "KSU-001",
        name: "جامعة الملك سعود",
        nameEn: "King Saud University",
        requiresUserData: false,
        description: "King Saud University - Educational Services",
        portals: [
          {
            portalId: "KSU-001-RIYADH-01",
            name: "جامعة الملك سعود - الحرم الرئيسي",
            location: "الرياض",
            address: "الرياض، حي النرجس",
          },
        ],
      },
      {
        serviceId: "ZAKAT-001",
        name: "هيئة الزكاة والضريبة",
        nameEn: "Zakat and Tax Authority",
        requiresUserData: true,
        description: "Zakat and Tax Authority - Government Services",
        portals: [
          {
            portalId: "ZAKAT-001-RIYADH-01",
            name: "هيئة الزكاة والضريبة - الرياض",
            location: "الرياض",
            address: "الرياض، حي العليا",
          },
          {
            portalId: "ZAKAT-001-JEDDAH-01",
            name: "هيئة الزكاة والضريبة - جدة",
            location: "جدة",
            address: "جدة، حي الزهراء",
          },
          {
            portalId: "ZAKAT-001-DAMMAM-01",
            name: "هيئة الزكاة والضريبة - الدمام",
            location: "الدمام",
            address: "الدمام، حي الفيصلية",
          },
        ],
      },
      {
        serviceId: "SEC-001",
        name: "شركة الكهرباء",
        nameEn: "Saudi Electricity Company",
        requiresUserData: false,
        description: "Saudi Electricity Company - Utility Services",
        portals: [
          {
            portalId: "SEC-001-RIYADH-01",
            name: "شركة الكهرباء - الرياض - العليا",
            location: "الرياض",
            address: "الرياض، حي العليا",
          },
          {
            portalId: "SEC-001-RIYADH-02",
            name: "شركة الكهرباء - الرياض - المطار",
            location: "الرياض",
            address: "الرياض، مطار الملك خالد",
          },
          {
            portalId: "SEC-001-JEDDAH-01",
            name: "شركة الكهرباء - جدة",
            location: "جدة",
            address: "جدة، حي الزهراء",
          },
          {
            portalId: "SEC-001-MAKKAH-01",
            name: "شركة الكهرباء - مكة المكرمة",
            location: "مكة المكرمة",
            address: "مكة المكرمة، حي العزيزية",
          },
          {
            portalId: "SEC-001-MADINAH-01",
            name: "شركة الكهرباء - المدينة المنورة",
            location: "المدينة المنورة",
            address: "المدينة المنورة، حي قباء",
          },
          {
            portalId: "SEC-001-TAIF-01",
            name: "شركة الكهرباء - الطائف",
            location: "الطائف",
            address: "الطائف، حي الشهداء",
          },
        ],
      },
      {
        serviceId: "RIYADH-BANK-001",
        name: "بنك الرياض",
        nameEn: "Riyad Bank",
        requiresUserData: false,
        description: "Riyad Bank - Banking Services",
        portals: [
          {
            portalId: "RIYADH-BANK-001-RIYADH-01",
            name: "بنك الرياض - الرياض - العليا",
            location: "الرياض",
            address: "الرياض، حي العليا",
          },
          {
            portalId: "RIYADH-BANK-001-RIYADH-02",
            name: "بنك الرياض - الرياض - المطار",
            location: "الرياض",
            address: "الرياض، مطار الملك خالد",
          },
          {
            portalId: "RIYADH-BANK-001-JEDDAH-01",
            name: "بنك الرياض - جدة - الكورنيش",
            location: "جدة",
            address: "جدة، الكورنيش الشمالي",
          },
          {
            portalId: "RIYADH-BANK-001-DAMMAM-01",
            name: "بنك الرياض - الدمام",
            location: "الدمام",
            address: "الدمام، حي الفيصلية",
          },
          {
            portalId: "RIYADH-BANK-001-MAKKAH-01",
            name: "بنك الرياض - مكة المكرمة",
            location: "مكة المكرمة",
            address: "مكة المكرمة، حي العزيزية",
          },
        ],
      },
      {
        serviceId: "STC-001",
        name: "الاتصالات السعودية",
        nameEn: "Saudi Telecom Company",
        requiresUserData: false,
        description: "STC - Telecommunications Services",
        portals: [
          {
            portalId: "STC-001-RIYADH-01",
            name: "الاتصالات السعودية - الرياض - العليا",
            location: "الرياض",
            address: "الرياض، حي العليا",
          },
          {
            portalId: "STC-001-RIYADH-02",
            name: "الاتصالات السعودية - الرياض - المطار",
            location: "الرياض",
            address: "الرياض، مطار الملك خالد",
          },
          {
            portalId: "STC-001-JEDDAH-01",
            name: "الاتصالات السعودية - جدة",
            location: "جدة",
            address: "جدة، حي الزهراء",
          },
          {
            portalId: "STC-001-DAMMAM-01",
            name: "الاتصالات السعودية - الدمام",
            location: "الدمام",
            address: "الدمام، حي الفيصلية",
          },
          {
            portalId: "STC-001-MAKKAH-01",
            name: "الاتصالات السعودية - مكة المكرمة",
            location: "مكة المكرمة",
            address: "مكة المكرمة، حي العزيزية",
          },
          {
            portalId: "STC-001-MADINAH-01",
            name: "الاتصالات السعودية - المدينة المنورة",
            location: "المدينة المنورة",
            address: "المدينة المنورة، حي قباء",
          },
          {
            portalId: "STC-001-TAIF-01",
            name: "الاتصالات السعودية - الطائف",
            location: "الطائف",
            address: "الطائف، حي الشهداء",
          },
          {
            portalId: "STC-001-ABHA-01",
            name: "الاتصالات السعودية - أبها",
            location: "أبها",
            address: "أبها، حي المنتزه",
          },
        ],
      },
      {
        serviceId: "MOH-001",
        name: "وزارة الصحة",
        nameEn: "Ministry of Health",
        requiresUserData: true,
        description: "Ministry of Health - Healthcare Services",
        portals: [
          {
            portalId: "MOH-001-RIYADH-01",
            name: "وزارة الصحة - الرياض - المستشفى المركزي",
            location: "الرياض",
            address: "الرياض، حي العليا",
          },
          {
            portalId: "MOH-001-JEDDAH-01",
            name: "وزارة الصحة - جدة - المستشفى العام",
            location: "جدة",
            address: "جدة، حي الزهراء",
          },
          {
            portalId: "MOH-001-DAMMAM-01",
            name: "وزارة الصحة - الدمام - المستشفى المركزي",
            location: "الدمام",
            address: "الدمام، حي الفيصلية",
          },
        ],
      },
    ];

    console.log("🌱 Seeding services and portals...");

    for (const serviceData of servicesData) {
      try {
        // Create service
        let service = await serviceService.findByServiceId(
          serviceData.serviceId
        );
        if (!service) {
          service = await serviceService.createService(
            serviceData.serviceId,
            serviceData.name,
            serviceData.nameEn,
            serviceData.requiresUserData,
            serviceData.description
          );
          console.log(
            `✅ Created service: ${service.name} (${service.serviceId})`
          );
          console.log(`   API Key: ${service.apiKey}`);
        } else {
          console.log(
            `⏭️  Service ${serviceData.serviceId} already exists, skipping service creation...`
          );
        }

        // Create portals for this service
        for (const portalData of serviceData.portals) {
          try {
            const existingPortal = await serviceService.findPortalByPortalId(
              portalData.portalId
            );
            if (!existingPortal) {
              const portal = await serviceService.createPortal(
                service,
                portalData.portalId,
                portalData.name,
                portalData.location,
                portalData.address
              );
              console.log(
                `   ✅ Created portal: ${portal.name} (${portal.portalId}) - ${portal.location}`
              );
            } else {
              console.log(
                `   ⏭️  Portal ${portalData.portalId} already exists, skipping...`
              );
            }
          } catch (error: any) {
            console.error(
              `   ❌ Error creating portal ${portalData.portalId}:`,
              error.message
            );
          }
        }
      } catch (error: any) {
        if (error.message.includes("already exists")) {
          console.log(
            `⏭️  Service ${serviceData.serviceId} already exists, skipping...`
          );
        } else {
          console.error(
            `❌ Error creating service ${serviceData.serviceId}:`,
            error
          );
        }
      }
    }

    console.log("✅ Service and portal seeding completed");

    // Only destroy if we initialized it (not when called from API)
    if (shouldDestroy) {
      await AppDataSource.destroy();
    }
  } catch (error) {
    console.error("❌ Error seeding services:", error);
    process.exit(1);
  }
}

// Note: This script is now called via API endpoint /api/admin/seed/run
// To run directly: ts-node src/scripts/seed-services.ts

export { seedServices };
