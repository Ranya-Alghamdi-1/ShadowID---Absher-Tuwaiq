import { Request, Response } from "express";
import { DataSource } from "typeorm";
import { Session } from "../entities/Session";
import { AppDataSource } from "../database";

export class SessionController {
  constructor(private dataSource: DataSource) {}

  /**
   * Get all user sessions
   */
  async getSessions(req: any, res: Response): Promise<void> {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      const sessionRepo = AppDataSource.getRepository(Session);
      const now = new Date();

      // Get all active sessions
      let sessions = await sessionRepo.find({
        where: {
          userId: userId,
          isActive: true,
        },
        order: { createdAt: "DESC" },
      });

      // Filter out expired sessions and mark them inactive
      sessions = sessions.filter((session) => {
        if (new Date(session.expiresAt) <= now) {
          session.isActive = false;
          sessionRepo.save(session).catch(console.error);
          return false;
        }
        return true;
      });

      // Group by device fingerprint
      const sessionsByDevice = new Map<string, typeof sessions>();
      sessions.forEach((session) => {
        const fingerprint = session.deviceFingerprint || "unknown";
        if (!sessionsByDevice.has(fingerprint)) {
          sessionsByDevice.set(fingerprint, []);
        }
        sessionsByDevice.get(fingerprint)!.push(session);
      });

      // Format response
      const formattedSessions = Array.from(sessionsByDevice.entries()).map(
        ([fingerprint, deviceSessions]) => {
          const currentSession = deviceSessions.find(
            (s) => s.sessionId === req.sessionID
          );
          const isCurrent = !!currentSession;

          return {
            device: {
              fingerprint,
              name: deviceSessions[0].deviceName || "Unknown Device",
              location: deviceSessions[0].location || "غير محدد",
              isCurrent,
            },
            sessions: deviceSessions.map((session) => ({
              id: session.id,
              sessionId: session.sessionId,
              isActive: session.isActive,
              expiresAt: session.expiresAt.toISOString(),
              userAgent: session.userAgent,
              ipAddress: session.ipAddress,
              deviceName: session.deviceName,
              location: session.location,
              createdAt: session.createdAt.toISOString(),
              isCurrent: session.sessionId === req.sessionID,
            })),
          };
        }
      );

      res.json({
        success: true,
        sessions: formattedSessions,
      });
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch sessions",
      });
    }
  }

  /**
   * Revoke session(s)
   */
  async revoke(req: any, res: Response): Promise<void> {
    try {
      const userId = req.session.userId;
      const { sessionId, allSessions, fingerprint } = req.body;

      if (!AppDataSource.isInitialized) {
        res.status(500).json({
          success: false,
          error: "Database not initialized",
        });
        return;
      }

      const sessionRepo = AppDataSource.getRepository(Session);

      if (allSessions) {
        await sessionRepo
          .createQueryBuilder()
          .update(Session)
          .set({ isActive: false })
          .where("userId = :userId", { userId })
          .andWhere("isActive = :isActive", { isActive: true })
          .execute();

        req.session.destroy(() => {});

        res.json({
          success: true,
          message: "All sessions revoked",
        });
        return;
      }

      if (fingerprint) {
        const currentSession = await sessionRepo.findOne({
          where: {
            sessionId: req.sessionID,
            userId: userId,
          },
        });

        if (!currentSession) {
          res.status(404).json({
            success: false,
            error: "Current session not found",
          });
          return;
        }

        await sessionRepo
          .createQueryBuilder()
          .update(Session)
          .set({ isActive: false })
          .where("userId = :userId", { userId })
          .andWhere("deviceFingerprint = :fingerprint", { fingerprint })
          .execute();

        if (currentSession.deviceFingerprint === fingerprint) {
          req.session.destroy(() => {});
        }

        res.json({
          success: true,
          message: "All sessions for device revoked",
        });
        return;
      }

      if (sessionId) {
        const targetSession = await sessionRepo.findOne({
          where: {
            sessionId: sessionId,
            userId: userId,
          },
        });

        if (!targetSession) {
          res.status(404).json({
            success: false,
            error: "Session not found",
          });
          return;
        }

        targetSession.isActive = false;
        await sessionRepo.save(targetSession);

        if (sessionId === req.sessionID) {
          req.session.destroy(() => {});
        }

        res.json({
          success: true,
          message: "Session revoked",
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: "Must provide sessionId, fingerprint, or allSessions=true",
      });
    } catch (error) {
      console.error("Error revoking session:", error);
      res.status(500).json({
        success: false,
        error: "Failed to revoke session",
      });
    }
  }

  /**
   * Delete device (revoke all sessions for device fingerprint)
   */
  async deleteDevice(req: any, res: Response): Promise<void> {
    try {
      const userId = req.session.userId;
      const { fingerprint } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      if (!fingerprint) {
        res.status(400).json({
          success: false,
          error: "Device fingerprint is required",
        });
        return;
      }

      const sessionRepo = AppDataSource.getRepository(Session);

      // Check if this is the current device
      const currentSession = await sessionRepo.findOne({
        where: {
          sessionId: req.sessionID,
          userId: userId,
        },
      });

      const isCurrentDevice = currentSession?.deviceFingerprint === fingerprint;

      // Revoke all sessions associated with this device
      await sessionRepo
        .createQueryBuilder()
        .update(Session)
        .set({ isActive: false })
        .where("userId = :userId", { userId })
        .andWhere("deviceFingerprint = :fingerprint", { fingerprint })
        .andWhere("isActive = :isActive", { isActive: true })
        .execute();

      // If deleting current device, destroy current session
      if (isCurrentDevice) {
        req.session.destroy(() => {});
      }

      res.json({
        success: true,
        message: "Device removed successfully",
        sessionRevoked: isCurrentDevice,
      });
    } catch (error) {
      console.error("Error removing device:", error);
      res.status(500).json({
        success: false,
        error: "Failed to remove device",
      });
    }
  }

  /**
   * Update device location
   */
  async updateLocation(req: any, res: Response): Promise<void> {
    try {
      const userId = req.session.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
        });
        return;
      }

      const { location } = req.body;
      if (!location) {
        res.status(400).json({
          success: false,
          error: "Location is required",
        });
        return;
      }

      let formattedLocation = location;
      if (location.includes(",") && !location.startsWith("IP:")) {
        const [lat, lon] = location.split(",");
        formattedLocation = `${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`;
      }

      const sessionRepo = AppDataSource.getRepository(Session);
      const dbSession = await sessionRepo.findOne({
        where: { sessionId: req.sessionID },
      });

      if (dbSession) {
        dbSession.location = formattedLocation;
        await sessionRepo.save(dbSession);
      }

      res.json({
        success: true,
        message: "Location updated",
        location: formattedLocation,
      });
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update location",
      });
    }
  }
}

