import { AuthController } from "./AuthController";
import { ShadowIdController } from "./ShadowIdController";
import { ActivityController } from "./ActivityController";
import { UserController } from "./UserController";
import { RiskController } from "./RiskController";
import { SessionController } from "./SessionController";
import { DashboardController } from "./DashboardController";
import { AlertController } from "./AlertController";
import { AdminUserController } from "./AdminUserController";
import { ReportController } from "./ReportController";
import { SeedController } from "./SeedController";
import { ServiceController } from "./ServiceController";
import { AppDataSource } from "../database";

/**
 * Get controller instances
 * All controllers share the same DataSource from database module
 */
export function getAuthController(): AuthController {
  return new AuthController(AppDataSource);
}

export function getShadowIdController(): ShadowIdController {
  return new ShadowIdController(AppDataSource);
}

export function getActivityController(): ActivityController {
  return new ActivityController(AppDataSource);
}

export function getUserController(): UserController {
  return new UserController(AppDataSource);
}

export function getRiskController(): RiskController {
  return new RiskController(AppDataSource);
}

export function getSessionController(): SessionController {
  return new SessionController(AppDataSource);
}

export function getDashboardController(): DashboardController {
  return new DashboardController(AppDataSource);
}

export function getAlertController(): AlertController {
  return new AlertController(AppDataSource);
}

export function getAdminUserController(): AdminUserController {
  return new AdminUserController(AppDataSource);
}

export function getReportController(): ReportController {
  return new ReportController(AppDataSource);
}

export function getSeedController(): SeedController {
  return new SeedController(AppDataSource);
}

export function getServiceController(): ServiceController {
  return new ServiceController(AppDataSource);
}
