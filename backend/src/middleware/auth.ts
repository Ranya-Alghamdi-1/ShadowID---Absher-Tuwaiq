import express from "express";
import { AppDataSource } from "../database";
import { Session } from "../entities/Session";
import { Device } from "../entities/Device";

// Mobile authentication middleware - verifies session and checks if revoked
export const mobileAuth = async (
  req: any,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  if (!req.session || !req.session.userId) {
    res.status(401).json({
      success: false,
      error: "Authentication required",
    });
    return;
  }

  // Check if session is revoked in database
  try {
    if (AppDataSource.isInitialized) {
      const sessionRepo = AppDataSource.getRepository(Session);
      const deviceRepo = AppDataSource.getRepository(Device);
      const sessionId = req.sessionID;

      const dbSession = await sessionRepo.findOne({
        where: {
          sessionId: sessionId,
          isActive: true,
        },
      });

      // If session not found in DB or marked as inactive, revoke access
      if (!dbSession || !dbSession.isActive) {
        // Destroy the session
        req.session.destroy(() => {});
        res.status(401).json({
          success: false,
          error: "Session revoked",
        });
        return;
      }

      // Check if session expired
      if (new Date(dbSession.expiresAt) < new Date()) {
        dbSession.isActive = false;
        await sessionRepo.save(dbSession);
        req.session.destroy(() => {});
        res.status(401).json({
          success: false,
          error: "Session expired",
        });
        return;
      }

      // Device info is stored in session itself, no need to check separate Device entity
      // If deviceFingerprint exists in session, device is valid
    }
  } catch (error) {
    console.error("Error checking session:", error);
    // Continue if DB check fails (graceful degradation)
  }

  next();
};
