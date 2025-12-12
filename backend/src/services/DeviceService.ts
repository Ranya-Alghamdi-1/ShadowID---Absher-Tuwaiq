import { DataSource } from "typeorm";
import { Device } from "../entities/Device";
import { User } from "../entities/User";
import * as crypto from "crypto";

export class DeviceService {
  constructor(private dataSource: DataSource) {}

  /**
   * Get all devices for a user
   */
  async getUserDevices(userId: number): Promise<Device[]> {
    const deviceRepo = this.dataSource.getRepository(Device);
    return await deviceRepo.find({
      where: { user: { id: userId } },
      order: { lastActive: "DESC" },
    });
  }

  /**
   * Register a new device
   */
  async registerDevice(
    userId: number,
    deviceData: {
      name: string;
      fingerprint: string;
      userAgent?: string;
      location?: string;
    }
  ): Promise<Device> {
    const deviceRepo = this.dataSource.getRepository(Device);
    const userRepo = this.dataSource.getRepository(User);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }

    // Check if device already exists by fingerprint
    const existing = await deviceRepo.findOne({
      where: {
        user: { id: userId },
        fingerprint: deviceData.fingerprint,
      },
    });

    if (existing) {
      // Update existing device
      existing.name = deviceData.name;
      existing.lastActive = new Date();
      existing.isCurrent = true;
      if (deviceData.userAgent) {
        existing.userAgent = deviceData.userAgent;
      }
      if (deviceData.location) {
        existing.location = deviceData.location;
      }
      await deviceRepo.save(existing);

      // Mark other devices as not current (using query builder for NOT condition)
      await deviceRepo
        .createQueryBuilder()
        .update(Device)
        .set({ isCurrent: false })
        .where("user.id = :userId", { userId })
        .andWhere("id != :deviceId", { deviceId: existing.id })
        .execute();

      return existing;
    }

    // Mark all other devices as not current
    await deviceRepo
      .createQueryBuilder()
      .update(Device)
      .set({ isCurrent: false })
      .where("user.id = :userId", { userId })
      .execute();

    // Create new device
    const device = deviceRepo.create({
      name: deviceData.name,
      fingerprint: deviceData.fingerprint,
      userAgent: deviceData.userAgent || "",
      location: deviceData.location || "غير محدد",
      lastActive: new Date(),
      isCurrent: true,
      user: user,
    });

    await deviceRepo.save(device);
    return device;
  }

  /**
   * Update device location (for periodic updates)
   */
  async updateDeviceLocation(
    userId: number,
    fingerprint: string,
    location: string
  ): Promise<Device | null> {
    const deviceRepo = this.dataSource.getRepository(Device);

    const device = await deviceRepo.findOne({
      where: {
        user: { id: userId },
        fingerprint: fingerprint,
      },
    });

    if (device) {
      device.location = location;
      device.lastActive = new Date();
      await deviceRepo.save(device);
      return device;
    }

    return null;
  }

  /**
   * Remove a device
   */
  async removeDevice(userId: number, deviceId: number): Promise<boolean> {
    const deviceRepo = this.dataSource.getRepository(Device);
    const device = await deviceRepo.findOne({
      where: {
        id: deviceId,
        user: { id: userId },
      },
    });

    if (!device) {
      return false;
    }

    await deviceRepo.remove(device);
    return true;
  }

  /**
   * Generate device fingerprint from browser attributes
   *
   * Priority:
   * 1. Use ThumbmarkJS thumbmark if provided (from client)
   * 2. Fallback to hash-based fingerprint from headers
   *
   * Note: ThumbmarkJS provides stable, unique fingerprints using canvas, WebGL, fonts, etc.
   * It's loaded client-side and sent to the backend.
   */
  generateFingerprint(
    userAgent: string,
    headers?: { [key: string]: string | string[] | undefined },
    clientFingerprintData?: { thumbmark?: string; [key: string]: any }
  ): string {
    // If ThumbmarkJS thumbmark is provided, use it directly (most accurate)
    if (clientFingerprintData?.thumbmark) {
      return clientFingerprintData.thumbmark;
    }

    // Fallback: Generate hash-based fingerprint from headers

    // Collect fingerprint components
    const components: string[] = [userAgent];

    if (headers) {
      // Add language
      const acceptLanguage = headers["accept-language"];
      if (acceptLanguage) {
        components.push(
          typeof acceptLanguage === "string"
            ? acceptLanguage
            : acceptLanguage[0]
        );
      }

      // Add encoding
      const acceptEncoding = headers["accept-encoding"];
      if (acceptEncoding) {
        components.push(
          typeof acceptEncoding === "string"
            ? acceptEncoding
            : acceptEncoding[0]
        );
      }

      // Add screen info if available (from client)
      const screenInfo = headers["x-screen-info"];
      if (screenInfo) {
        components.push(
          typeof screenInfo === "string" ? screenInfo : screenInfo[0]
        );
      }

      // Add timezone if available (from client)
      const timezone = headers["x-timezone"];
      if (timezone) {
        components.push(typeof timezone === "string" ? timezone : timezone[0]);
      }
    }

    // If client sent screen info directly, use it
    if (clientFingerprintData?.screenInfo) {
      components.push(clientFingerprintData.screenInfo);
    }
    if (clientFingerprintData?.timezone) {
      components.push(clientFingerprintData.timezone);
    }

    // Generate hash from all components
    const fingerprintString = components.join("|");
    const hash = crypto
      .createHash("sha256")
      .update(fingerprintString)
      .digest("hex");

    return hash.substring(0, 32); // Return 32-char fingerprint
  }

  /**
   * Get device name from user agent
   */
  getDeviceName(userAgent: string): string {
    if (userAgent.includes("iPhone")) {
      return "iPhone";
    } else if (userAgent.includes("iPad")) {
      return "iPad";
    } else if (userAgent.includes("Android")) {
      return "Android Device";
    } else if (userAgent.includes("Windows")) {
      return "Windows PC";
    } else if (userAgent.includes("Mac")) {
      return "Mac";
    } else if (userAgent.includes("Linux")) {
      return "Linux PC";
    }
    return "Unknown Device";
  }
}
