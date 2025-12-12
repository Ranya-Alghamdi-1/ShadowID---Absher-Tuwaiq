import express from "express";
import session from "express-session";
import { mobileAuth } from "../middleware/auth";
import {
  getAuthController,
  getShadowIdController,
  getActivityController,
  getUserController,
  getRiskController,
  getSessionController,
} from "../controllers";

const router = express.Router();

// Session middleware for mobile routes (30 days expiration)
router.use(
  session({
    name: "mobile.sid",
    secret: process.env.SESSION_SECRET || "mobile-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: "lax",
    },
  })
);

// ==================== AUTH ROUTES ====================
router.get("/auth/tawakkalna", (req, res) => {
  getAuthController().initiateOAuth(req, res);
});

router.get("/auth/accounts", async (req, res) => {
  await getAuthController().getOAuthAccounts(req, res);
});

router.post("/auth/tawakkalna/callback", async (req, res) => {
  await getAuthController().handleOAuthCallback(req, res);
});

router.post("/auth/logout", async (req, res) => {
  await getAuthController().logout(req, res);
});

router.get("/auth/verify", (req, res) => {
  getAuthController().verify(req, res);
});

router.post("/auth/revoke", mobileAuth, async (req, res) => {
  await getSessionController().revoke(req, res);
});

router.get("/auth/sessions", mobileAuth, async (req, res) => {
  await getSessionController().getSessions(req, res);
});

// ==================== SHADOW ID ROUTES ====================
router.post("/shadowid/generate", mobileAuth, async (req, res) => {
  await getShadowIdController().generate(req, res);
});

router.get("/shadowid/validate", mobileAuth, async (req, res) => {
  await getShadowIdController().validate(req, res);
});

router.post("/shadowid/revoke", mobileAuth, async (req, res) => {
  await getShadowIdController().revoke(req, res);
});

router.get("/shadowid/:token/details", mobileAuth, async (req, res) => {
  await getShadowIdController().getDetails(req, res);
});

router.post("/shadowid/scan", async (req, res) => {
  await getShadowIdController().scan(req, res);
});

// ==================== ACTIVITY ROUTES ====================
router.get("/activity", mobileAuth, async (req, res) => {
  await getActivityController().getActivities(req, res);
});

router.post("/activity/log", mobileAuth, async (req, res) => {
  await getActivityController().logActivity(req, res);
});

// ==================== USER ROUTES ====================
router.get("/user/profile", mobileAuth, async (req, res) => {
  await getUserController().getProfile(req, res);
});

router.put("/user/profile", mobileAuth, async (req, res) => {
  await getUserController().updateProfile(req, res);
});

router.get("/user/settings", mobileAuth, async (req, res) => {
  await getUserController().getSettings(req, res);
});

router.put("/user/settings/:key", mobileAuth, async (req, res) => {
  await getUserController().updateSetting(req, res);
});

router.post("/user/data-request/:type", mobileAuth, async (req, res) => {
  await getUserController().dataRequest(req, res);
});

// ==================== RISK ROUTES ====================
router.get("/risk/assessment", mobileAuth, async (req, res) => {
  await getRiskController().getAssessment(req, res);
});

router.get("/risk/history", mobileAuth, async (req, res) => {
  await getRiskController().getHistory(req, res);
});

// ==================== SESSION/DEVICE ROUTES ====================
router.put("/devices/location", mobileAuth, async (req, res) => {
  await getSessionController().updateLocation(req, res);
});

router.delete("/devices/:fingerprint", mobileAuth, async (req, res) => {
  await getSessionController().deleteDevice(req, res);
});

export default router;

