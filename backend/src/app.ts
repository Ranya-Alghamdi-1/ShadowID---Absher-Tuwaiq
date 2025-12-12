import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import path from "path";
import { initializeDatabase } from "./database";

// Import routes
import adminRoutes from "./routes/admin";
import mobileRoutes from "./routes/mobile";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: true, // Allow all origins for demo
    credentials: true, // Important for cookies
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from actual directories
app.use("/mobile", express.static(path.join(__dirname, "../../Frontend")));
app.use(
  "/admin",
  express.static(path.join(__dirname, "../../Dashboard-idntity"))
);

// Serve OAuth provider page
app.use("/oauth", express.static(path.join(__dirname, "public")));

// Default redirect to mobile
app.get("/", (req, res) => {
  res.redirect("/mobile");
});

// API routes
app.use("/api/mobile", mobileRoutes);
app.use("/api/admin", adminRoutes);

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 ShadowID Backend running on http://localhost:${PORT}`);
      console.log(`📱 Mobile App: http://localhost:${PORT}/mobile`);
      console.log(`🔧 Admin Dashboard: http://localhost:${PORT}/admin`);
    });
  })
  .catch((error) => {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  });

export default app;
