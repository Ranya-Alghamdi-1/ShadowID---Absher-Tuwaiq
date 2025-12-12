import { Request, Response } from "express";
import { DataSource } from "typeorm";
import { ServiceService } from "../services/ServiceService";

export class ServiceController {
  constructor(private dataSource: DataSource) {}

  /**
   * Get all services with their portals (public endpoint for scanner)
   */
  async getServicesWithPortals(req: Request, res: Response): Promise<void> {
    try {
      const serviceService = new ServiceService(this.dataSource);
      const services = await serviceService.getAllActiveServices();

      // Get portals for each service
      const servicesWithPortals = await Promise.all(
        services.map(async (service) => {
          const portals = await serviceService.getServicePortals(
            service.serviceId
          );
          return {
            serviceId: service.serviceId,
            name: service.name,
            nameEn: service.nameEn,
            description: service.description,
            apiKey: service.apiKey, // Include API key for scanner
            requiresUserData: service.requiresUserData,
            portals: portals.map((portal) => ({
              portalId: portal.portalId,
              name: portal.name,
              location: portal.location,
              address: portal.address,
              region: portal.region,
            })),
          };
        })
      );

      res.json({
        success: true,
        services: servicesWithPortals,
      });
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch services",
      });
    }
  }
}
