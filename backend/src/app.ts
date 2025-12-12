import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import { initializeDatabase } from "./database";

// Import routes
import adminRoutes from "./routes/admin";
import mobileRoutes from "./routes/mobile";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API routes
app.use("/api/mobile", mobileRoutes);
app.use("/api/admin", adminRoutes);

// Paths for static file directories
const frontendPath = path.resolve(process.cwd(), "../Frontend");
const adminPath = path.resolve(process.cwd(), "../Dashboard-idntity");
const oauthPath = path.resolve(process.cwd(), "src/public");

// Helper function to serve HTML file or 404
const serveHtml = (dir: string, filename: string, res: express.Response) => {
  const filePath = path.join(dir, `${filename}.html`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("Not found");
  }
};

// Root redirect
app.get("/", (req, res) => {
  res.redirect("/mobile");
});

// Mobile frontend routes
app.get("/mobile", (req, res) => {
  serveHtml(frontendPath, "index", res);
});

app.get("/mobile/:page", (req, res, next) => {
  const page = req.params.page;
  // If it has an extension, let static middleware handle it
  if (page.includes(".")) {
    return next();
  }
  serveHtml(frontendPath, page, res);
});

// Admin dashboard routes
app.get("/admin", (req, res) => {
  serveHtml(adminPath, "index", res);
});

app.get("/admin/:page", (req, res, next) => {
  const page = req.params.page;
  // If it has an extension, let static middleware handle it
  if (page.includes(".")) {
    return next();
  }
  serveHtml(adminPath, page, res);
});

// Serve static files (CSS, JS, images, etc.)
app.use("/mobile", express.static(frontendPath));
app.use("/admin", express.static(adminPath));
app.use("/oauth", express.static(oauthPath));

// Start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 ShadowID Backend running on http://0.0.0.0:${PORT}`);
      console.log(`📱 Mobile App: http://0.0.0.0:${PORT}/mobile`);
      console.log(`🔧 Admin Dashboard: http://0.0.0.0:${PORT}/admin`);
    });
  })
  .catch((error) => {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  });

export default app;
