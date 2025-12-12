import { DataSource } from "typeorm";
import { Service } from "../entities/Service";
import { ServicePortal } from "../entities/ServicePortal";
import * as crypto from "crypto";

export class ServiceService {
  constructor(private dataSource: DataSource) {}

  /**
   * Find service by API key
   */
  async findByApiKey(apiKey: string): Promise<Service | null> {
    const serviceRepo = this.dataSource.getRepository(Service);
    return await serviceRepo.findOne({
      where: { apiKey, isActive: true },
      relations: ["portals"],
    });
  }

  /**
   * Find service by serviceId
   */
  async findByServiceId(serviceId: string): Promise<Service | null> {
    const serviceRepo = this.dataSource.getRepository(Service);
    return await serviceRepo.findOne({
      where: { serviceId, isActive: true },
      relations: ["portals"],
    });
  }

  /**
   * Find portal by portalId
   */
  async findPortalByPortalId(portalId: string): Promise<ServicePortal | null> {
    const portalRepo = this.dataSource.getRepository(ServicePortal);
    return await portalRepo.findOne({
      where: { portalId, isActive: true },
      relations: ["service"],
    });
  }

  /**
   * Find portal by portalId and validate it belongs to a service
   */
  async findPortalForService(
    service: Service,
    portalId: string
  ): Promise<ServicePortal | null> {
    const portalRepo = this.dataSource.getRepository(ServicePortal);
    return await portalRepo.findOne({
      where: {
        portalId,
        service: { id: service.id },
        isActive: true,
      },
      relations: ["service"],
    });
  }

  /**
   * Create a new service (for admin/initialization)
   */
  async createService(
    serviceId: string,
    name: string,
    nameEn: string,
    requiresUserData: boolean = false,
    description?: string
  ): Promise<Service> {
    const serviceRepo = this.dataSource.getRepository(Service);

    // Check if serviceId already exists
    const existing = await serviceRepo.findOne({
      where: { serviceId },
    });

    if (existing) {
      throw new Error(`Service with ID ${serviceId} already exists`);
    }

    // Generate API key
    const apiKey = this.generateApiKey();

    const service = serviceRepo.create({
      serviceId,
      name,
      nameEn,
      description,
      apiKey,
      isActive: true,
      requiresUserData,
    });

    await serviceRepo.save(service);
    return service;
  }

  /**
   * Create a portal for a service
   */
  async createPortal(
    service: Service,
    portalId: string,
    name: string,
    location: string,
    address?: string,
    region?: string
  ): Promise<ServicePortal> {
    const portalRepo = this.dataSource.getRepository(ServicePortal);

    // Check if portalId already exists
    const existing = await portalRepo.findOne({
      where: { portalId },
    });

    if (existing) {
      throw new Error(`Portal with ID ${portalId} already exists`);
    }

    const portal = portalRepo.create({
      portalId,
      name,
      location,
      address,
      region: region || this.getRegionFromLocation(location),
      service,
      isActive: true,
    });

    await portalRepo.save(portal);
    return portal;
  }

  /**
   * Generate a secure API key
   */
  private generateApiKey(): string {
    return `sk_${crypto.randomBytes(32).toString("hex")}`;
  }

  /**
   * Get all active services
   */
  async getAllActiveServices(): Promise<Service[]> {
    const serviceRepo = this.dataSource.getRepository(Service);
    return await serviceRepo.find({
      where: { isActive: true },
      order: { name: "ASC" },
    });
  }

  /**
   * Update service
   */
  async updateService(
    serviceId: string,
    updates: Partial<{
      name: string;
      nameEn: string;
      description: string;
      isActive: boolean;
      requiresUserData: boolean;
    }>
  ): Promise<Service | null> {
    const serviceRepo = this.dataSource.getRepository(Service);
    const service = await serviceRepo.findOne({ where: { serviceId } });

    if (!service) {
      return null;
    }

    Object.assign(service, updates);
    await serviceRepo.save(service);
    return service;
  }

  /**
   * Get all portals for a service
   */
  async getServicePortals(serviceId: string): Promise<ServicePortal[]> {
    const portalRepo = this.dataSource.getRepository(ServicePortal);
    return await portalRepo.find({
      where: {
        service: { serviceId },
        isActive: true,
      },
      order: { location: "ASC" },
    });
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
      المدينة: "المدينة المنورة",
      "المدينة المنورة": "المدينة المنورة",
      مكة: "مكة المكرمة",
      "مكة المكرمة": "مكة المكرمة",
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
