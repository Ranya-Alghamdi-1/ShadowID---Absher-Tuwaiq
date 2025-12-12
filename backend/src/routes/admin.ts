import express from "express";
import session from "express-session";
import fs from "fs";
import {
  getAdminUserController,
  getAlertController,
  getDashboardController,
  getReportController,
  getSeedController,
} from "../controllers";
import { AppDataSource } from "../database";

const router = express.Router();

// Admin session middleware
router.use(
  session({
    secret: process.env.SESSION_SECRET || "admin-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // For demo
      httpOnly: true,
      maxAge: 30 * 60 * 1000, // 30 minutes
      sameSite: "lax",
    },
  })
);

// Admin middleware for protected routes
const adminAuth = (
  req: any,
  res: express.Response,
  next: express.NextFunction
) => {
  if (!req.session.isAdmin) {
    return res.status(401).json({ error: "Admin access required" });
  }
  next();
};

// ==================== AUTH ROUTES ====================
router.post("/auth/login", (req: any, res: express.Response) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin123") {
    req.session.isAdmin = true;
    req.session.username = "admin";

    res.json({
      success: true,
      message: "Login successful",
    });
  } else {
    res.status(401).json({
      success: false,
      error: "Invalid credentials",
    });
  }
});

router.post("/auth/logout", (req: any, res: express.Response) => {
  req.session.destroy((err: any) => {
    if (err) {
      return res.status(500).json({ success: false });
    }
    res.json({ success: true });
  });
});

router.get("/auth/verify", (req: any, res: express.Response) => {
  res.json({
    isAdmin: req.session.isAdmin || false,
    username: req.session.username || null,
  });
});

// ==================== DASHBOARD ROUTES ====================
router.get("/dashboard/stats", adminAuth, async (req, res) => {
  await getDashboardController().getStats(req, res);
});

router.get("/regions/stats", adminAuth, async (req, res) => {
  const controller = getDashboardController();
  const regions = await controller.getRegionStats();
  res.json({
    success: true,
    regions,
  });
});

router.get("/regions/heatmap", adminAuth, async (req, res) => {
  await getDashboardController().getHeatmap(req, res);
});

// ==================== ALERT ROUTES ====================
router.get("/alerts", adminAuth, async (req, res) => {
  await getAlertController().getAlerts(req, res);
});

router.get("/alerts/:type", adminAuth, async (req, res) => {
  await getAlertController().getAlertsByType(req, res);
});

router.post("/alerts/:id/resolve", adminAuth, async (req, res) => {
  await getAlertController().resolveAlert(req, res);
});

// ==================== USER ROUTES ====================
router.get("/users", adminAuth, async (req, res) => {
  await getAdminUserController().getUsers(req, res);
});

router.get("/users/:id/activity", adminAuth, async (req, res) => {
  await getAdminUserController().getUserActivity(req, res);
});

router.get("/users/:id/shadowids", adminAuth, async (req, res) => {
  await getAdminUserController().getUserShadowIds(req, res);
});

// ==================== REPORT ROUTES ====================
router.post("/reports/generate", adminAuth, async (req, res) => {
  await getReportController().generateReport(req, res);
});

// ==================== SEED ROUTES ====================
router.get("/seed/run", adminAuth, async (req, res) => {
  await getSeedController().runSeeds(req, res);
});

// ==================== DATABASE ROUTES ====================
router.get("/database/download", adminAuth, (req, res) => {
  // Get database path from DataSource configuration
  const dbPath = (AppDataSource.options as any).database;

  if (!dbPath || !fs.existsSync(dbPath)) {
    return res.status(404).json({ error: "Database file not found" });
  }

  const filename = `shadowid-${new Date().toISOString().split("T")[0]}.db`;
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const fileStream = fs.createReadStream(dbPath);
  fileStream.pipe(res);

  fileStream.on("error", (err) => {
    console.error("Error reading database file:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to read database file" });
    }
  });
});

export default router;
