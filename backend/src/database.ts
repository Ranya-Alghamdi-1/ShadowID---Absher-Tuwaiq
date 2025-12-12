import { DataSource } from "typeorm";
import path from "path";

/**
 * Database connection configuration
 * Centralized DataSource for the entire application
 */
export const AppDataSource = new DataSource({
  type: "sqlite",
  database: path.join(__dirname, "../data/shadowid.db"),
  entities: [
    __dirname + "/entities/*.ts",
    __dirname + "/entities/*.js", // Include compiled JS files
  ],
  synchronize: true, // For demo - auto create tables
  logging: false,
});

/**
 * Initialize database connection
 * Call this once at application startup
 */
export async function initializeDatabase(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log("✅ Database connected");
  }
}

/**
 * Close database connection
 * Call this when shutting down the application
 */
export async function closeDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log("✅ Database connection closed");
  }
}

