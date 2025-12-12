// API Base URL
const API_BASE = "/api/admin";

// Global State
let currentTab = "devices";
let currentFilter = "all";
let map = null;
let regions = [];
let alerts = [];
let dashboardStats = null;

// API Helper Functions
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Don't redirect - just throw error (prevents infinite loop)
        // The checkAuth function will handle showing login
        throw new Error("Unauthorized");
      }
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API call failed:", error);
    throw error;
  }
}

// Check admin authentication
async function checkAuth() {
  try {
    const response = await apiCall("/auth/verify");
    if (!response.isAdmin) {
      // Don't redirect if already on admin page (prevents infinite loop)
      // Instead, show login prompt or handle gracefully
      console.warn("Not authenticated as admin");
      return false;
    }
    return true;
  } catch (error) {
    console.error("Auth check failed:", error);
    // Don't redirect on error - just return false
    return false;
  }
}

// Fetch Dashboard Stats
async function fetchDashboardStats() {
  try {
    const data = await apiCall("/dashboard/stats");
    dashboardStats = data;
    updateDashboardStats(data);
    return data;
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return null;
  }
}

// Update Dashboard Stats Display
function updateDashboardStats(stats) {
  if (!stats) return;

  // Update total users (use API value, not calculated from regions)
  const totalUsersEl = document.getElementById("totalUsers");
  if (totalUsersEl && stats.totalUsers !== undefined) {
    totalUsersEl.textContent = stats.totalUsers.toLocaleString();
  }

  // Update other main stats if they exist in the UI
  // Note: The current HTML only shows totalUsers, but we can add more cards
  // For now, we ensure totalUsers is updated from API, not from regions
}

// Fetch Region Stats
async function fetchRegionStats() {
  try {
    const data = await apiCall("/regions/stats");
    if (data.success && data.regions) {
      regions = data.regions.map((region) => ({
        ...region,
        id: region.name,
        congestion: getCongestionLevel(region.usage),
        size: getSizeFromUsage(region.usage),
      }));
      return regions;
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch region stats:", error);
    return [];
  }
}

// Fetch Alerts
async function fetchAlerts(type = null) {
  try {
    const endpoint = type ? `/alerts/${type}` : "/alerts";
    const data = await apiCall(endpoint);
    if (data.success && data.alerts) {
      alerts = data.alerts;
      return alerts;
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch alerts:", error);
    return [];
  }
}

// Generate Report
async function generateReportAPI(dateFrom, dateTo, useRAG = false) {
  try {
    const params = new URLSearchParams({
      type: "comprehensive",
      dateFrom: dateFrom,
      dateTo: dateTo,
    });

    if (useRAG) {
      params.append("useRAG", "true");
    }

    const data = await apiCall(`/reports/generate?${params.toString()}`, {
      method: "POST",
    });
    return data;
  } catch (error) {
    console.error("Failed to generate report:", error);
    throw error;
  }
}

// Helper Functions
function getColor(usage) {
  if (usage > 80) return "#EF4444";
  if (usage > 60) return "#F97316";
  if (usage > 40) return "#FBBF24";
  return "#1C8354";
}

function getCongestionLevel(usage) {
  if (usage > 80) return "عالي";
  if (usage > 60) return "متوسط";
  return "منخفض";
}

function getSizeFromUsage(usage) {
  if (usage > 70) return "large";
  if (usage > 40) return "medium";
  return "small";
}

function getSize(size) {
  if (size === "large") return 35;
  if (size === "medium") return 25;
  return 18;
}

// Initialize Map
async function initMap() {
  // Create map
  map = L.map("map", {
    center: [23.8859, 45.0792],
    zoom: 6,
    zoomControl: true,
    scrollWheelZoom: true,
  });

  // Add tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "",
  }).addTo(map);

  // Fetch and render regions
  await loadRegions();
}

// Load Regions
async function loadRegions() {
  regions = await fetchRegionStats();

  if (regions.length === 0) {
    console.warn("No regions data available");
    return;
  }

  // Clear existing markers
  map.eachLayer((layer) => {
    if (layer instanceof L.CircleMarker) {
      map.removeLayer(layer);
    }
  });

  // Add regions as circles
  regions.forEach((region) => {
    const color = getColor(region.usage);
    const size = getSize(region.size);

    const circle = L.circleMarker([region.lat, region.lng], {
      radius: size,
      fillColor: color,
      color: "#FFFFFF",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.7,
    }).addTo(map);

    // Add popup
    circle.bindPopup(`
            <div style="font-family: Arial; text-align: right; direction: rtl;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px; color: #1F2A37;">${
                  region.name
                }</div>
                <div style="font-size: 12px; color: #92989E; margin-bottom: 3px;">المستخدمين: <span style="color: #1C8354; font-weight: bold;">${region.users.toLocaleString()}</span></div>
                <div style="font-size: 12px; color: #92989E; margin-bottom: 3px;">نسبة الاستخدام: <span style="color: ${color}; font-weight: bold;">${
      region.usage
    }%</span></div>
                <div style="font-size: 12px; color: #92989E;">التكدس: <span style="font-weight: bold;">${
                  region.congestion
                }</span></div>
            </div>
        `);

    // Highlight on hover
    circle.on("mouseover", function () {
      this.setStyle({
        fillOpacity: 1,
        weight: 3,
      });
    });

    circle.on("mouseout", function () {
      this.setStyle({
        fillOpacity: 0.7,
        weight: 2,
      });
    });
  });

  updateRegionStats();
}

// Update Region Stats
function updateRegionStats() {
  const activeRegions = regions.filter(
    (r) => r.users > 0 || r.usage > 0
  ).length;
  const highCongestionRegions = regions.filter((r) => r.usage > 80).length;
  const mediumCongestionRegions = regions.filter(
    (r) => r.usage > 40 && r.usage <= 80
  ).length;

  // Update stat cards by ID (not by position)
  const activeRegionsEl = document.getElementById("activeRegions");
  if (activeRegionsEl) {
    activeRegionsEl.textContent = activeRegions;
  }

  const highCongestionEl = document.getElementById("highCongestionRegions");
  if (highCongestionEl) {
    highCongestionEl.textContent = highCongestionRegions;
  }

  const mediumCongestionEl = document.getElementById("mediumCongestionRegions");
  if (mediumCongestionEl) {
    mediumCongestionEl.textContent = mediumCongestionRegions;
  }
}

// Tab Switching
function switchTab(tab) {
  currentTab = tab;

  // Update tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    if (btn.dataset.tab === tab) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Render alerts
  renderAlerts();
}

// Filter Alerts
function filterAlerts(filter) {
  currentFilter = filter;

  // Update filter buttons
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    if (btn.dataset.filter === filter) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Render alerts
  renderAlerts();
}

// Render Alerts
function renderAlerts() {
  const alertsContent = document.getElementById("alertsContent");
  if (!alertsContent) return;

  // Filter alerts by type and severity
  let filteredAlerts = alerts.filter((alert) => {
    // Filter by tab (type)
    if (currentTab === "devices") {
      if (alert.type !== "multiple_identities") return false;
    } else if (currentTab === "locations") {
      if (alert.type !== "impossible_travel") return false;
    }

    // Filter by severity
    if (currentFilter !== "all") {
      const severityMap = {
        حرج: "CRITICAL",
        عالي: "HIGH",
        متوسط: "MEDIUM",
        منخفض: "LOW",
      };
      const alertSeverity = alert.severity;
      const filterSeverity = severityMap[currentFilter];
      if (
        filterSeverity &&
        alertSeverity !== currentFilter &&
        alertSeverity !== filterSeverity
      ) {
        return false;
      }
    }

    return !alert.isResolved;
  });

  // Update counts
  const devicesCount = alerts.filter(
    (a) => a.type === "multiple_identities" && !a.isResolved
  ).length;
  const locationsCount = alerts.filter(
    (a) => a.type === "impossible_travel" && !a.isResolved
  ).length;

  const devicesCountEl = document.getElementById("devicesCount");
  const locationsCountEl = document.getElementById("locationsCount");
  if (devicesCountEl) devicesCountEl.textContent = devicesCount;
  if (locationsCountEl) locationsCountEl.textContent = locationsCount;

  // Render alerts
  if (currentTab === "devices") {
    alertsContent.innerHTML =
      filteredAlerts
        .map((alert) => {
          const metadata = alert.metadata ? JSON.parse(alert.metadata) : {};
          const identities = metadata.identities || [];
          const timeframe = metadata.timeframe || "غير محدد";

          return `
                <div class="alert-item alert-item-device">
                    <div class="alert-header">
                        <div class="alert-id-section">
                            <div class="alert-label">معرف الجهاز</div>
                            <div class="alert-id">${
                              metadata.fingerprint || "غير محدد"
                            }</div>
                        </div>
                        <span class="severity-badge severity-${
                          alert.severity === "CRITICAL" ||
                          alert.severity === "حرج"
                            ? "critical"
                            : alert.severity === "HIGH" ||
                              alert.severity === "عالي"
                            ? "high"
                            : "medium"
                        }">
                            ${
                              alert.severity === "CRITICAL"
                                ? "حرج"
                                : alert.severity === "HIGH"
                                ? "عالي"
                                : alert.severity === "MEDIUM"
                                ? "متوسط"
                                : "منخفض"
                            }
                        </span>
                    </div>
                    
                    <div class="alert-details">
                        <div class="alert-details-title">الهويات المستخدمة (${
                          identities.length
                        }):</div>
                        <div class="identities-list">
                            ${identities
                              .map(
                                (identity) => `
                                <div class="identity-item">${identity}</div>
                            `
                              )
                              .join("")}
                        </div>
                    </div>
                    
                    <div class="alert-footer">
                        <div class="alert-footer-item">
                            <span class="alert-footer-label">الإطار الزمني:</span>
                            <span class="alert-footer-value">${timeframe}</span>
                        </div>
                        <div class="alert-footer-location">${
                          alert.location || "غير محدد"
                        }</div>
                    </div>
                </div>
            `;
        })
        .join("") || '<div class="no-alerts">لا توجد تنبيهات</div>';
  } else {
    alertsContent.innerHTML =
      filteredAlerts
        .map((alert) => {
          const metadata = alert.metadata ? JSON.parse(alert.metadata) : {};
          const locations = metadata.locations || [];
          const duration = metadata.duration || "غير محدد";
          const distance = metadata.distance || "غير محدد";
          const user = alert.user;

          return `
                <div class="alert-item alert-item-location">
                    <div class="alert-header">
                        <div class="alert-id-section">
                            <div class="alert-label">رقم الهوية</div>
                            <div class="alert-id">${
                              user ? user.nationalId : "غير محدد"
                            }</div>
                        </div>
                        <span class="severity-badge severity-${
                          alert.severity === "CRITICAL" ||
                          alert.severity === "حرج"
                            ? "critical"
                            : alert.severity === "HIGH" ||
                              alert.severity === "عالي"
                            ? "high"
                            : "medium"
                        }">
                            ${
                              alert.severity === "CRITICAL"
                                ? "حرج"
                                : alert.severity === "HIGH"
                                ? "عالي"
                                : alert.severity === "MEDIUM"
                                ? "متوسط"
                                : "منخفض"
                            }
                        </span>
                    </div>
                    
                    <div class="alert-details">
                        <div class="alert-details-title">المواقع المسجلة:</div>
                        <div class="locations-list">
                            ${locations
                              .map(
                                (loc, idx) => `
                                <div class="location-item">
                                    <div class="location-info">
                                        <div class="location-number">${
                                          idx + 1
                                        }</div>
                                        <span class="location-city">${
                                          loc.city || loc.location || "غير محدد"
                                        }</span>
                                    </div>
                                    <span class="location-time">${
                                      loc.time ||
                                      new Date(
                                        loc.timestamp || ""
                                      ).toLocaleTimeString("ar-SA")
                                    }</span>
                                </div>
                            `
                              )
                              .join("")}
                        </div>
                    </div>
                    
                    <div class="alert-footer-grid">
                        <div class="alert-footer-card">
                            <span class="alert-footer-card-label">المدة الزمنية:</span>
                            <div class="alert-footer-card-value">${duration}</div>
                        </div>
                        <div class="alert-footer-card">
                            <span class="alert-footer-card-label">المسافة:</span>
                            <div class="alert-footer-card-value">${distance}</div>
                        </div>
                    </div>
                </div>
            `;
        })
        .join("") || '<div class="no-alerts">لا توجد تنبيهات</div>';
  }
}

// Generate Report
async function generateReport() {
  const selectedDate = document.getElementById("reportDate").value;
  const useRAG = document.getElementById("useRAG")?.checked || false;

  if (!selectedDate) {
    alert("الرجاء اختيار التاريخ");
    return;
  }

  // Show loading
  document.getElementById("reportPlaceholder").style.display = "none";
  document.getElementById("reportLoading").style.display = "flex";
  document.getElementById("reportContent").style.display = "none";

  const generateBtn = document.getElementById("generateBtn");
  generateBtn.disabled = true;
  const loadingText = useRAG ? "جاري التحليل الذكي..." : "جاري الإعداد...";
  generateBtn.innerHTML = `
        <div style="width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <span>${loadingText}</span>
    `;

  try {
    const date = new Date(selectedDate);
    // Set to start of selected day
    date.setHours(0, 0, 0, 0);
    const dateFrom = date.toISOString();

    // Set to end of selected day (not today!)
    const dateTo = new Date(date);
    dateTo.setHours(23, 59, 59, 999);
    const dateToISO = dateTo.toISOString();

    const reportData = await generateReportAPI(dateFrom, dateToISO, useRAG);

    // Hide loading
    document.getElementById("reportLoading").style.display = "none";

    // Show report
    const reportContent = document.getElementById("reportContent");
    reportContent.style.display = "block";
    reportContent.innerHTML = `
            <div class="report-header">
                <div class="report-header-left">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <h3 class="report-header-title">التقرير الشامل</h3>
                </div>
                <div class="report-header-date">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>${date.toLocaleString("ar-SA")}</span>
                </div>
            </div>
            
            <div class="report-body">
                <pre class="report-text">${formatReport(
                  reportData.report
                )}</pre>
            </div>
        `;

    // Reset button
    generateBtn.disabled = false;
    generateBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span>إنشاء التقرير</span>
        `;
  } catch (error) {
    console.error("Failed to generate report:", error);
    alert("فشل في إنشاء التقرير. يرجى المحاولة مرة أخرى.");

    // Reset button
    generateBtn.disabled = false;
    generateBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span>إنشاء التقرير</span>
        `;

    // Show placeholder
    document.getElementById("reportLoading").style.display = "none";
    document.getElementById("reportPlaceholder").style.display = "flex";
  }
}

// Format Report
function formatReport(report) {
  if (!report) return "لا توجد بيانات";

  // Check if RAG report is available
  if (report.ragReport) {
    return formatRAGReport(report);
  }

  // Format structured report
  const { summary, statistics, alerts, recommendations } = report;

  let text = `تقرير أمني شامل - حالة المملكة العربية السعودية
${new Date().toLocaleString("ar-SA")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 الملخص التنفيذي:
إجمالي المستخدمين: ${summary.totalUsers}
إجمالي Shadow IDs: ${summary.totalShadowIds}
إجمالي الأنشطة: ${summary.totalActivities}
معدل النجاح: ${summary.successRate}%
نسبة المخاطر العالية: ${summary.highRiskPercentage}%
إجمالي التنبيهات: ${summary.totalAlerts}
التنبيهات غير المحلولة: ${summary.unresolvedAlerts}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 الإحصائيات التفصيلية:

Shadow IDs:
${statistics.shadowIds.riskDistribution
  .map((r) => `  • ${r.level}: ${r.count}`)
  .join("\n")}

الأنشطة:
  • إجمالي: ${statistics.activities.total}
  • مرفوضة: ${statistics.activities.rejected}
  • معدل النجاح: ${statistics.activities.successRate}%

التنبيهات:
  • إجمالي: ${statistics.alerts.total}
  • غير محلولة: ${statistics.alerts.unresolved}
  • حسب النوع:
${statistics.alerts.byType.map((a) => `    - ${a.type}: ${a.count}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ التوصيات:
${recommendations.map((rec, idx) => `${idx + 1}. ${rec}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

تم إعداد هذا التقرير آلياً بواسطة نظام التحليل الذكي
وزارة الداخلية - المملكة العربية السعودية
قسم الأمن السيبراني والمراقبة`;

  return text;
}

// Format RAG Report
function formatRAGReport(report) {
  const { summary, statistics, ragReport, ragMetadata, recommendations } =
    report;

  let text = `تقرير أمني شامل - حالة المملكة العربية السعودية
${new Date().toLocaleString("ar-SA")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 الملخص التنفيذي:
إجمالي المستخدمين: ${summary.totalUsers}
إجمالي Shadow IDs: ${summary.totalShadowIds}
إجمالي الأنشطة: ${summary.totalActivities}
معدل النجاح: ${summary.successRate}%
نسبة المخاطر العالية: ${summary.highRiskPercentage}%
إجمالي التنبيهات: ${summary.totalAlerts}
التنبيهات غير المحلولة: ${summary.unresolvedAlerts}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 التحليل الذكي (RAG):
${ragReport}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 الإحصائيات التفصيلية:

Shadow IDs:
${statistics.shadowIds.riskDistribution
  .map((r) => `  • ${r.level}: ${r.count}`)
  .join("\n")}

الأنشطة:
  • إجمالي: ${statistics.activities.total}
  • مرفوضة: ${statistics.activities.rejected}
  • معدل النجاح: ${statistics.activities.successRate}%

التنبيهات:
  • إجمالي: ${statistics.alerts.total}
  • غير محلولة: ${statistics.alerts.unresolved}
  • حسب النوع:
${statistics.alerts.byType.map((a) => `    - ${a.type}: ${a.count}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ التوصيات:
${recommendations.map((rec, idx) => `${idx + 1}. ${rec}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 معلومات التحليل:
  • السجلات المسترجعة: ${ragMetadata?.retrievedCount || 0}
  • إجمالي الأنشطة المحللة: ${ragMetadata?.totalActivitiesAnalyzed || 0}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

تم إعداد هذا التقرير آلياً بواسطة نظام التحليل الذكي (RAG)
وزارة الداخلية - المملكة العربية السعودية
قسم الأمن السيبراني والمراقبة`;

  return text;
}

// Show Notifications
function showNotifications() {
  const unresolvedCount = alerts.filter((a) => !a.isResolved).length;
  const devicesCount = alerts.filter(
    (a) => a.type === "multiple_identities" && !a.isResolved
  ).length;
  const locationsCount = alerts.filter(
    (a) => a.type === "impossible_travel" && !a.isResolved
  ).length;

  alert(
    `تم رصد ${unresolvedCount} تنبيهات جديدة:\n\n• ${devicesCount} حالات هويات متعددة\n• ${locationsCount} حالات مناطق متعددة\n\nالرجاء مراجعة قسم التنبيهات الأمنية`
  );
}

// Load Dashboard Data
async function loadDashboardData() {
  try {
    // Load stats
    await fetchDashboardStats();

    // Load regions
    await loadRegions();

    // Load alerts
    alerts = await fetchAlerts();
    renderAlerts();

    // Update notification badge
    const unresolvedCount = alerts.filter((a) => !a.isResolved).length;
    const badge = document.querySelector(".notification-badge");
    if (badge) {
      badge.textContent = unresolvedCount > 0 ? unresolvedCount : "";
      badge.style.display = unresolvedCount > 0 ? "flex" : "none";
    }
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
  }
}

// Show Login Prompt
function showLoginPrompt() {
  const username = prompt("اسم المستخدم:");
  if (!username) return false;

  const password = prompt("كلمة المرور:");
  if (!password) return false;

  return { username, password };
}

// Admin Login
async function adminLogin(username, password) {
  try {
    const response = await apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    if (response.success) {
      // Reload page to initialize with authenticated session
      window.location.reload();
      return true;
    }
    return false;
  } catch (error) {
    console.error("Login failed:", error);
    return false;
  }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", async function () {
  // Check authentication
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) {
    // Show login prompt instead of redirecting
    const credentials = showLoginPrompt();
    if (credentials) {
      const loginSuccess = await adminLogin(
        credentials.username,
        credentials.password
      );
      if (!loginSuccess) {
        alert("فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.");
        // Show login prompt again or redirect to a login page
        return;
      }
      // Page will reload after successful login
      return;
    } else {
      // User cancelled login - show message
      document.body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; gap: 20px;">
          <h2>تسجيل الدخول مطلوب</h2>
          <p>يرجى تحديث الصفحة وتسجيل الدخول للوصول إلى لوحة التحكم</p>
          <button onclick="window.location.reload()" style="padding: 10px 20px; background: #1C8354; color: white; border: none; border-radius: 8px; cursor: pointer;">
            تحديث الصفحة
          </button>
        </div>
      `;
      return;
    }
  }

  // Set today's date
  const today = new Date().toISOString().split("T")[0];
  const reportDateEl = document.getElementById("reportDate");
  if (reportDateEl) {
    reportDateEl.value = today;
  }

  // Initialize map
  await initMap();

  // Load dashboard data
  await loadDashboardData();

  // Refresh data every 30 seconds
  setInterval(loadDashboardData, 30000);
});
