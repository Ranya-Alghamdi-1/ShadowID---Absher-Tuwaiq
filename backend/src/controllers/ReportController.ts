import { Request, Response } from "express";
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { ShadowId } from "../entities/ShadowId";
import { Activity } from "../entities/Activity";
import { SecurityAlert } from "../entities/SecurityAlert";
import { exec } from "child_process";
import { spawn } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export class ReportController {
  constructor(private dataSource: DataSource) {}

  /**
   * Generate comprehensive AI-powered report
   */
  async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const { type = "comprehensive", dateFrom, dateTo } = req.query;

      // Parse dates properly - handle both ISO strings and date strings
      let parsedDateFrom: Date | undefined;
      let parsedDateTo: Date | undefined;

      if (dateFrom) {
        parsedDateFrom = new Date(dateFrom as string);
        if (isNaN(parsedDateFrom.getTime())) {
          throw new Error("Invalid dateFrom format");
        }
      }

      if (dateTo) {
        parsedDateTo = new Date(dateTo as string);
        if (isNaN(parsedDateTo.getTime())) {
          throw new Error("Invalid dateTo format");
        }
      }

      // Collect data for report
      const reportData = await this.collectReportData(
        parsedDateFrom,
        parsedDateTo
      );

      // Generate report - use RAG if requested, otherwise structured
      const useRAG = req.query.useRAG === "true";
      let report;

      if (useRAG) {
        // Try RAG-based report generation
        try {
          report = await this.generateRAGReport(reportData, type as string);
        } catch (ragError) {
          console.warn(
            "RAG generation failed, falling back to structured:",
            ragError
          );
          // Fallback to structured report if RAG fails
          report = await this.generateStructuredReport(
            reportData,
            type as string
          );
        }
      } else {
        // Generate structured report
        report = await this.generateStructuredReport(
          reportData,
          type as string
        );
      }

      res.json({
        success: true,
        report: {
          type,
          generatedAt: new Date().toISOString(),
          period: {
            from: dateFrom || "all",
            to: dateTo || "now",
          },
          summary: report.summary,
          statistics: report.statistics,
          alerts: report.alerts,
          recommendations: report.recommendations,
        },
      });
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate report",
      });
    }
  }

  /**
   * Collect data for report
   */
  private async collectReportData(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<any> {
    const userRepo = this.dataSource.getRepository(User);
    const shadowIdRepo = this.dataSource.getRepository(ShadowId);
    const activityRepo = this.dataSource.getRepository(Activity);
    const alertRepo = this.dataSource.getRepository(SecurityAlert);

    // Helper function to create date range
    const getDateRange = (date?: Date) => {
      if (!date) return undefined;
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const getEndDate = (date?: Date) => {
      if (!date) return undefined;
      const d = new Date(date);
      d.setHours(23, 59, 59, 999);
      return d;
    };

    const startDate = getDateRange(dateFrom);
    const endDate = getEndDate(dateTo || dateFrom);

    // Get total users (always count all, regardless of date filter)
    const totalUsers = await userRepo.count();

    // Shadow IDs queries - create fresh query builders for each query
    const shadowIdBaseQuery = shadowIdRepo.createQueryBuilder("shadowId");
    if (startDate) {
      shadowIdBaseQuery.andWhere("shadowId.createdAt >= :startDate", {
        startDate,
      });
    }
    if (endDate) {
      shadowIdBaseQuery.andWhere("shadowId.createdAt <= :endDate", {
        endDate,
      });
    }

    const totalShadowIds = await shadowIdBaseQuery.getCount();

    // High risk Shadow IDs - create new query builder
    const highRiskQuery = shadowIdRepo.createQueryBuilder("shadowId");
    if (startDate) {
      highRiskQuery.andWhere("shadowId.createdAt >= :startDate", {
        startDate,
      });
    }
    if (endDate) {
      highRiskQuery.andWhere("shadowId.createdAt <= :endDate", { endDate });
    }
    highRiskQuery.andWhere("shadowId.riskLevel = :level", { level: "High" });
    const highRiskShadowIds = await highRiskQuery.getCount();

    // Risk distribution - create new query builder
    const riskDistQuery = shadowIdRepo.createQueryBuilder("shadowId");
    if (startDate) {
      riskDistQuery.andWhere("shadowId.createdAt >= :startDate", {
        startDate,
      });
    }
    if (endDate) {
      riskDistQuery.andWhere("shadowId.createdAt <= :endDate", { endDate });
    }
    const riskDistribution = await riskDistQuery
      .select("shadowId.riskLevel", "level")
      .addSelect("COUNT(*)", "count")
      .groupBy("shadowId.riskLevel")
      .getRawMany();

    // Activities queries
    const activityBaseQuery = activityRepo.createQueryBuilder("activity");
    if (startDate) {
      activityBaseQuery.andWhere("activity.timestamp >= :startDate", {
        startDate,
      });
    }
    if (endDate) {
      activityBaseQuery.andWhere("activity.timestamp <= :endDate", {
        endDate,
      });
    }

    const totalActivities = await activityBaseQuery.getCount();

    // Rejected activities - create new query builder
    const rejectedQuery = activityRepo.createQueryBuilder("activity");
    if (startDate) {
      rejectedQuery.andWhere("activity.timestamp >= :startDate", {
        startDate,
      });
    }
    if (endDate) {
      rejectedQuery.andWhere("activity.timestamp <= :endDate", { endDate });
    }
    rejectedQuery.andWhere("activity.status = :status", { status: "rejected" });
    const rejectedActivities = await rejectedQuery.getCount();

    // Alerts queries
    const alertBaseQuery = alertRepo.createQueryBuilder("alert");
    if (startDate) {
      alertBaseQuery.andWhere("alert.createdAt >= :startDate", {
        startDate,
      });
    }
    if (endDate) {
      alertBaseQuery.andWhere("alert.createdAt <= :endDate", { endDate });
    }

    const totalAlerts = await alertBaseQuery.getCount();

    // Unresolved alerts - create new query builder
    const unresolvedQuery = alertRepo.createQueryBuilder("alert");
    if (startDate) {
      unresolvedQuery.andWhere("alert.createdAt >= :startDate", {
        startDate,
      });
    }
    if (endDate) {
      unresolvedQuery.andWhere("alert.createdAt <= :endDate", { endDate });
    }
    unresolvedQuery.andWhere("alert.isResolved = :resolved", {
      resolved: false,
    });
    const unresolvedAlerts = await unresolvedQuery.getCount();

    // Get alerts by type - create new query builder
    const alertsByTypeQuery = alertRepo.createQueryBuilder("alert");
    if (startDate) {
      alertsByTypeQuery.andWhere("alert.createdAt >= :startDate", {
        startDate,
      });
    }
    if (endDate) {
      alertsByTypeQuery.andWhere("alert.createdAt <= :endDate", { endDate });
    }
    const alertsByType = await alertsByTypeQuery
      .select("alert.type", "type")
      .addSelect("COUNT(*)", "count")
      .groupBy("alert.type")
      .getRawMany();

    return {
      totalUsers,
      totalShadowIds,
      highRiskShadowIds,
      totalActivities,
      rejectedActivities,
      totalAlerts,
      unresolvedAlerts,
      alertsByType,
      riskDistribution,
    };
  }

  /**
   * Generate structured report
   */
  private async generateStructuredReport(
    data: any,
    type: string
  ): Promise<any> {
    const successRate =
      data.totalActivities > 0
        ? ((data.totalActivities - data.rejectedActivities) /
            data.totalActivities) *
          100
        : 100;

    const highRiskPercentage =
      data.totalShadowIds > 0
        ? (data.highRiskShadowIds / data.totalShadowIds) * 100
        : 0;

    const summary = {
      totalUsers: data.totalUsers,
      totalShadowIds: data.totalShadowIds,
      totalActivities: data.totalActivities,
      successRate: Math.round(successRate),
      highRiskPercentage: Math.round(highRiskPercentage),
      totalAlerts: data.totalAlerts,
      unresolvedAlerts: data.unresolvedAlerts,
    };

    const statistics = {
      shadowIds: {
        total: data.totalShadowIds,
        highRisk: data.highRiskShadowIds,
        riskDistribution: data.riskDistribution.map((r: any) => ({
          level: r.level,
          count: parseInt(r.count || "0"),
        })),
      },
      activities: {
        total: data.totalActivities,
        rejected: data.rejectedActivities,
        successRate: Math.round(successRate),
      },
      alerts: {
        total: data.totalAlerts,
        unresolved: data.unresolvedAlerts,
        byType: data.alertsByType.map((a: any) => ({
          type: a.type,
          count: parseInt(a.count || "0"),
        })),
      },
    };

    const alerts = {
      critical:
        data.unresolvedAlerts > 10
          ? "عدد كبير من التنبيهات غير المحلولة"
          : null,
      highRisk:
        highRiskPercentage > 5
          ? "نسبة عالية من Shadow IDs عالية المخاطر"
          : null,
      rejectionRate: successRate < 95 ? "معدل رفض مرتفع في الأنشطة" : null,
    };

    // Generate LLM-based recommendations
    let recommendations: string[] = [];

    // Check if LLM is enabled (default: true, can be disabled via env var)
    const llmEnabled = process.env.ENABLE_LLM_RECOMMENDATIONS !== "false";

    if (llmEnabled) {
      try {
        console.log("🤖 Attempting to generate LLM recommendations...");
        recommendations = await this.generateLLMRecommendations(summary);
        console.log(
          "✅ LLM recommendations generated:",
          recommendations.length
        );
        console.log("📝 Recommendations:", recommendations);
      } catch (error: any) {
        console.error(
          "❌ Failed to generate LLM recommendations, using fallback:",
          error.message || error
        );
        // Fallback to rule-based recommendations
        if (data.unresolvedAlerts > 10) {
          recommendations.push("يُنصح بمراجعة التنبيهات غير المحلولة فوراً");
        }
        if (highRiskPercentage > 5) {
          recommendations.push("يُنصح بمراجعة Shadow IDs عالية المخاطر");
        }
        if (successRate < 95) {
          recommendations.push("يُنصح بتحسين معدل النجاح في الأنشطة");
        }
        if (recommendations.length === 0) {
          recommendations.push("النظام يعمل بشكل طبيعي");
        }
      }
    } else {
      console.log(
        "⚠️ LLM recommendations disabled via ENABLE_LLM_RECOMMENDATIONS=false"
      );
      // Use rule-based recommendations
      if (data.unresolvedAlerts > 10) {
        recommendations.push("يُنصح بمراجعة التنبيهات غير المحلولة فوراً");
      }
      if (highRiskPercentage > 5) {
        recommendations.push("يُنصح بمراجعة Shadow IDs عالية المخاطر");
      }
      if (successRate < 95) {
        recommendations.push("يُنصح بتحسين معدل النجاح في الأنشطة");
      }
      if (recommendations.length === 0) {
        recommendations.push("النظام يعمل بشكل طبيعي");
      }
    }

    return {
      summary,
      statistics,
      alerts,
      recommendations,
    };
  }

  /**
   * Generate RAG-based intelligent report using Python script
   */
  private async generateRAGReport(data: any, type: string): Promise<any> {
    const activityRepo = this.dataSource.getRepository(Activity);

    // Get recent activities for RAG (last 7 days, medium/high risk)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activities = await activityRepo
      .createQueryBuilder("activity")
      .where("activity.timestamp >= :sevenDaysAgo", { sevenDaysAgo })
      .andWhere("activity.status IN (:...statuses)", {
        statuses: ["rejected", "verified"],
      })
      .orderBy("activity.timestamp", "DESC")
      .take(100) // Limit to 100 most recent for RAG
      .getMany();

    // Convert activities to JSON format for Python script
    const activitiesData = activities.map((activity) => ({
      type: activity.type,
      service: activity.service || "غير محدد",
      location: activity.location || "غير محدد",
      region: activity.region || "غير محدد",
      status: activity.status,
      timestamp: activity.timestamp.toISOString(),
      riskLevel: activity.shadowId?.riskLevel || "Low",
      blockchainHash: activity.blockchainHash || "",
    }));

    // Prepare query based on report type
    let query = "حلل لي الأنشطة الأمنية وأعطني تقرير شامل";
    if (type === "security") {
      query = "حلل لي الأنشطة الأمنية المشبوهة وأعطني توصيات عاجلة";
    } else if (type === "risk") {
      query = "حلل لي الهويات ذات مستوى High Risk وأعطني توصيات عاجلة";
    }

    // Call Python RAG script
    const scriptPath = path.join(__dirname, "../../ml/generate_rag_report.py");

    // Use Python from venv
    const venvPythonPath = path.join(__dirname, "../../ml/.venv/bin/python");

    const fs = require("fs");
    // Use venv Python if available, otherwise fallback to python3
    const pythonExecutable = fs.existsSync(venvPythonPath)
      ? venvPythonPath
      : "python3";

    const inputData = JSON.stringify({
      query,
      activities: activitiesData,
      k: 4, // Number of relevant logs to retrieve
    });

    try {
      // Use spawn for input streaming
      const result = await new Promise<{ stdout: string; stderr: string }>(
        (resolve, reject) => {
          const python = spawn(pythonExecutable, [scriptPath], {
            stdio: ["pipe", "pipe", "pipe"],
          });

          let stdout = "";
          let stderr = "";

          python.stdout.on("data", (data) => {
            stdout += data.toString();
          });

          python.stderr.on("data", (data) => {
            stderr += data.toString();
          });

          python.on("close", (code) => {
            if (code !== 0) {
              reject(
                new Error(`Python script exited with code ${code}: ${stderr}`)
              );
            } else {
              resolve({ stdout, stderr });
            }
          });

          python.on("error", (error) => {
            reject(error);
          });

          // Send input data
          python.stdin.write(inputData);
          python.stdin.end();
        }
      );

      if (result.stderr) {
        console.warn("RAG script stderr:", result.stderr);
      }

      const ragResult = JSON.parse(result.stdout);

      if (!ragResult.success) {
        throw new Error(ragResult.error || "RAG generation failed");
      }

      // Combine RAG report with structured data
      return {
        summary: {
          totalUsers: data.totalUsers,
          totalShadowIds: data.totalShadowIds,
          totalActivities: data.totalActivities,
          successRate:
            data.totalActivities > 0
              ? Math.round(
                  ((data.totalActivities - data.rejectedActivities) /
                    data.totalActivities) *
                    100
                )
              : 100,
          highRiskPercentage:
            data.totalShadowIds > 0
              ? Math.round((data.highRiskShadowIds / data.totalShadowIds) * 100)
              : 0,
          totalAlerts: data.totalAlerts,
          unresolvedAlerts: data.unresolvedAlerts,
        },
        statistics: {
          shadowIds: {
            total: data.totalShadowIds,
            highRisk: data.highRiskShadowIds,
            riskDistribution: data.riskDistribution.map((r: any) => ({
              level: r.level,
              count: parseInt(r.count || "0"),
            })),
          },
          activities: {
            total: data.totalActivities,
            rejected: data.rejectedActivities,
            successRate:
              data.totalActivities > 0
                ? Math.round(
                    ((data.totalActivities - data.rejectedActivities) /
                      data.totalActivities) *
                      100
                  )
                : 100,
          },
          alerts: {
            total: data.totalAlerts,
            unresolved: data.unresolvedAlerts,
            byType: data.alertsByType.map((a: any) => ({
              type: a.type,
              count: parseInt(a.count || "0"),
            })),
          },
        },
        ragReport: ragResult.report, // AI-generated Arabic report
        ragMetadata: {
          retrievedCount: ragResult.retrieved_count,
          totalActivitiesAnalyzed: ragResult.total_activities,
        },
        recommendations: this.extractRecommendationsFromRAG(ragResult.report),
      };
    } catch (error: any) {
      console.error("RAG script error:", error);
      throw new Error(`RAG generation failed: ${error.message}`);
    }
  }

  /**
   * Generate LLM-based recommendations from summary data
   */
  private async generateLLMRecommendations(summary: any): Promise<string[]> {
    const scriptPath = path.join(
      __dirname,
      "../../ml/generate_recommendations.py"
    );

    // Use Python from venv
    const venvPythonPath = path.join(__dirname, "../../ml/.venv/bin/python");

    // Check if script exists
    const fs = require("fs");
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Python script not found at: ${scriptPath}`);
    }

    // Use venv Python if available, otherwise fallback to python3
    const pythonExecutable = fs.existsSync(venvPythonPath)
      ? venvPythonPath
      : "python3";

    console.log("📝 Script path:", scriptPath);
    console.log("🐍 Python executable:", pythonExecutable);
    console.log("📊 Summary data:", JSON.stringify(summary, null, 2));

    const inputData = JSON.stringify({ summary });

    try {
      // Add timeout (60 seconds for first run, 30 for subsequent)
      const timeout = 60000;
      const result = await Promise.race([
        new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
          const python = spawn(pythonExecutable, [scriptPath], {
            stdio: ["pipe", "pipe", "pipe"],
          });

          let stdout = "";
          let stderr = "";

          python.stdout.on("data", (data) => {
            stdout += data.toString();
          });

          python.stderr.on("data", (data) => {
            stderr += data.toString();
          });

          python.on("close", (code) => {
            if (code !== 0) {
              reject(
                new Error(`Python script exited with code ${code}: ${stderr}`)
              );
            } else {
              resolve({ stdout, stderr });
            }
          });

          python.on("error", (error) => {
            reject(error);
          });

          // Send input data
          python.stdin.write(inputData);
          python.stdin.end();
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("LLM recommendations timeout")),
            timeout
          )
        ),
      ]);

      // Log stderr (model loading messages are expected)
      if (result.stderr) {
        console.log(
          "📋 Python script stderr:",
          result.stderr.substring(0, 500)
        );
      }

      console.log("📥 Python script stdout length:", result.stdout.length);
      console.log(
        "📥 Python script stdout preview:",
        result.stdout.substring(0, 200)
      );

      const llmResult = JSON.parse(result.stdout);

      if (!llmResult.success) {
        throw new Error(llmResult.error || "LLM generation failed");
      }

      const recommendations = llmResult.recommendations || [];

      // Validate recommendations
      if (recommendations.length === 0) {
        console.warn("⚠️ LLM returned empty recommendations");
        throw new Error("Empty recommendations from LLM");
      }

      // Filter out generic/fallback messages
      const filtered = recommendations.filter(
        (rec: string) =>
          rec &&
          rec.length > 20 &&
          !rec.includes("فشل") &&
          !rec.includes("يرجى المحاولة") &&
          rec !== "النظام يعمل بشكل طبيعي"
      );

      if (filtered.length > 0) {
        console.log("✅ Valid LLM recommendations:", filtered);
        return filtered;
      } else {
        console.warn("⚠️ All recommendations were filtered out");
        throw new Error("No valid recommendations generated");
      }
    } catch (error: any) {
      console.error("LLM recommendations error:", error);
      throw new Error(`LLM recommendations failed: ${error.message}`);
    }
  }

  /**
   * Extract recommendations from RAG report text
   */
  private extractRecommendationsFromRAG(ragReport: string): string[] {
    // Simple extraction - look for recommendation patterns
    const lines = ragReport.split("\n");
    const recommendations: string[] = [];
    let inRecommendations = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes("التوصيات") || trimmed.includes("توصيات")) {
        inRecommendations = true;
        continue;
      }
      if (inRecommendations && trimmed.length > 10) {
        // Remove bullet points and numbering
        const clean = trimmed.replace(/^[•\-\d\.\)]\s*/, "").trim();
        if (clean.length > 0) {
          recommendations.push(clean);
        }
      }
    }

    return recommendations.length > 0
      ? recommendations
      : ["تم تحليل البيانات بنجاح"];
  }
}
