import { Request, Response } from "express";
import { DataSource } from "typeorm";
import { ShadowIdService } from "../services/ShadowIdService";
import { DeviceService } from "../services/DeviceService";
import { Session } from "../entities/Session";
import { User } from "../entities/User";
import { AppDataSource } from "../database";

export class AuthController {
  constructor(private dataSource: DataSource) {}

  /**
   * Initiate OAuth flow - redirect to fake OAuth provider
   */
  initiateOAuth(req: Request, res: Response): void {
    const redirectUri =
      (req.query.redirect_uri as string) || "/mobile/dashboard";
    res.redirect(`/oauth?redirect_uri=${encodeURIComponent(redirectUri)}`);
  }

  /**
   * Get available accounts for OAuth selection (public endpoint)
   */
  async getOAuthAccounts(req: Request, res: Response): Promise<void> {
    try {
      const userRepo = this.dataSource.getRepository(User);

      // Get all users (limit to 50 for OAuth selection)
      const users = await userRepo
        .createQueryBuilder("user")
        .orderBy("user.name", "ASC")
        .take(50)
        .getMany();

      // Format for OAuth page with masked sensitive data for display
      // Note: We send real nationalId for login, but mask it for display only
      const accounts = users.map((user) => ({
        nationalId: user.nationalId, // Real ID for login
        nationalIdDisplay: this.maskNationalId(user.nationalId), // Masked for display
        name: user.name,
        phone: user.phone, // Real phone for login
        phoneDisplay: this.maskPhone(user.phone), // Masked for display
        personType: user.personType || "Citizen",
        nationality: user.nationality || "Saudi",
      }));

      res.json({
        success: true,
        accounts,
      });
    } catch (error) {
      console.error("Error fetching OAuth accounts:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch accounts",
        accounts: [], // Return empty array on error
      });
    }
  }

  /**
   * Mask national ID (show first 1-2 digits and last 2-3 digits)
   * Example: "1012345678" -> "1XXXXXXXX8"
   */
  private maskNationalId(nationalId: string): string {
    if (!nationalId || nationalId.length < 4) {
      return "XXXXXXXXXX";
    }
    if (nationalId.length === 10) {
      // 10-digit ID: show first 1 and last 1
      return `${nationalId[0]}${"X".repeat(8)}${nationalId[9]}`;
    }
    // For other lengths, show first 2 and last 2
    const visibleStart = nationalId.substring(0, 1);
    const visibleEnd = nationalId.substring(nationalId.length - 1);
    const masked = "X".repeat(nationalId.length - 2);
    return `${visibleStart}${masked}${visibleEnd}`;
  }

  /**
   * Mask phone number (show country code and last 2-3 digits)
   * Example: "+966501234567" -> "+9665XXXXX67"
   */
  private maskPhone(phone: string): string {
    if (!phone) {
      return "+966XXXXXXXXX";
    }
    // Keep country code (+966) and first digit after country code, mask the rest
    if (phone.startsWith("+966") && phone.length > 7) {
      const countryCode = phone.substring(0, 4); // "+966"
      const firstDigit = phone[4]; // First digit after country code
      const lastTwo = phone.substring(phone.length - 2); // Last 2 digits
      const masked = "X".repeat(phone.length - 7); // Mask middle digits
      return `${countryCode}${firstDigit}${masked}${lastTwo}`;
    }
    // For other formats, show first 3 and last 2
    if (phone.length > 5) {
      const visibleStart = phone.substring(0, 3);
      const visibleEnd = phone.substring(phone.length - 2);
      const masked = "X".repeat(phone.length - 5);
      return `${visibleStart}${masked}${visibleEnd}`;
    }
    return "X".repeat(phone.length);
  }

  /**
   * Handle OAuth callback - create session
   */
  async handleOAuthCallback(req: any, res: Response): Promise<void> {
    const {
      nationalId,
      redirectUri,
      fingerprintData,
      personType,
      nationality,
      name,
      phone,
    } = req.body;

    if (!nationalId) {
      res.status(400).json({
        success: false,
        error: "National ID is required",
      });
      return;
    }

    try {
      const shadowIdService = new ShadowIdService(this.dataSource);
      const deviceService = new DeviceService(this.dataSource);
      const userRepo = this.dataSource.getRepository(User);

      // Get or create user from database (using User entity)
      // If user exists, use their data; if not, create with provided data
      const user = await shadowIdService.getOrCreateUser(
        nationalId,
        name || `User ${nationalId}`, // Fallback name if not provided
        phone || "+966500000000", // Fallback phone if not provided
        personType || "Citizen",
        nationality || "Saudi"
      );

      // Update user info if provided (for existing users)
      if (name && name !== user.name) {
        user.name = name;
      }
      if (phone && phone !== user.phone) {
        user.phone = phone;
      }
      if (personType && personType !== user.personType) {
        user.personType = personType;
      }
      if (nationality && nationality !== user.nationality) {
        user.nationality = nationality;
      }
      await userRepo.save(user);

      // Get device info
      const userAgent = req.headers["user-agent"] || "";
      const deviceFingerprint = deviceService.generateFingerprint(
        userAgent,
        req.headers,
        fingerprintData
      );
      const deviceName = deviceService.getDeviceName(userAgent);

      // Get location
      let location = "غير محدد";
      if (fingerprintData?.location) {
        if (fingerprintData.location.includes(",")) {
          const [lat, lon] = fingerprintData.location.split(",");
          location = `${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(
            4
          )}`;
        } else {
          location = fingerprintData.location;
        }
      } else {
        const clientIp =
          (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
          (req.headers["x-real-ip"] as string) ||
          req.ip ||
          req.socket.remoteAddress;
        if (clientIp && clientIp !== "::1" && clientIp !== "127.0.0.1") {
          location = `IP: ${clientIp}`;
        }
      }

      // Store in session
      req.session.userId = user.id;
      req.session.nationalId = nationalId;
      req.session.name = user.name;
      req.session.phone = user.phone;
      req.session.deviceFingerprint = deviceFingerprint;
      req.session.userAgent = userAgent;

      // Save to database
      await this.saveSessionToDatabase(
        req.sessionID,
        user.id,
        userAgent,
        deviceFingerprint,
        deviceName,
        location,
        req.headers
      );

      res.json({
        success: true,
        user: {
          id: user.id,
          nationalId: user.nationalId,
          name: user.name,
          phone: user.phone,
        },
        redirectUri: redirectUri || "/mobile/dashboard",
      });
    } catch (error) {
      console.error("Error in OAuth callback:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create session",
      });
    }
  }

  /**
   * Logout - destroy session
   */
  async logout(req: any, res: Response): Promise<void> {
    const sessionId = req.sessionID;

    try {
      if (AppDataSource.isInitialized) {
        const sessionRepo = AppDataSource.getRepository(Session);
        const dbSession = await sessionRepo.findOne({
          where: { sessionId: sessionId },
        });

        if (dbSession) {
          dbSession.isActive = false;
          await sessionRepo.save(dbSession);
        }
      }
    } catch (error) {
      console.error("Error deactivating session:", error);
    }

    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ success: false });
      }
      res.json({ success: true });
    });
  }

  /**
   * Verify session
   */
  verify(req: any, res: Response): void {
    if (req.session.userId) {
      res.json({
        authenticated: true,
        user: {
          id: req.session.userId,
          nationalId: req.session.nationalId,
          name: req.session.name,
          phone: req.session.phone,
        },
      });
    } else {
      res.json({
        authenticated: false,
        user: null,
      });
    }
  }

  /**
   * Save session to database
   */
  private async saveSessionToDatabase(
    sessionId: string,
    userId: number,
    userAgent: string,
    deviceFingerprint: string,
    deviceName: string,
    location: string,
    headers: any
  ): Promise<void> {
    try {
      const sessionRepo = AppDataSource.getRepository(Session);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const clientIp =
        (headers["x-forwarded-for"] as string)?.split(",")[0] ||
        (headers["x-real-ip"] as string) ||
        headers.ip ||
        "";

      let dbSession = await sessionRepo.findOne({
        where: { sessionId: sessionId },
      });

      if (dbSession) {
        dbSession.userId = userId;
        dbSession.isActive = true;
        dbSession.expiresAt = expiresAt;
        dbSession.userAgent = userAgent;
        dbSession.ipAddress = clientIp;
        dbSession.deviceFingerprint = deviceFingerprint;
        dbSession.deviceName = deviceName;
        dbSession.location = location;
      } else {
        dbSession = sessionRepo.create({
          sessionId: sessionId,
          userId: userId,
          isActive: true,
          expiresAt: expiresAt,
          userAgent: userAgent,
          ipAddress: clientIp,
          deviceFingerprint: deviceFingerprint,
          deviceName: deviceName,
          location: location,
        });
      }

      await sessionRepo.save(dbSession);

      // Deactivate old sessions for the same device
      await sessionRepo
        .createQueryBuilder()
        .update(Session)
        .set({ isActive: false })
        .where("userId = :userId", { userId })
        .andWhere("deviceFingerprint = :fingerprint", {
          fingerprint: deviceFingerprint,
        })
        .andWhere("sessionId != :currentSessionId", {
          currentSessionId: sessionId,
        })
        .andWhere("isActive = :isActive", { isActive: true })
        .execute();
    } catch (error) {
      console.error("Error saving session to database:", error);
      // Don't fail login if session save fails
    }
  }
}
