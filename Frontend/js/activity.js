// Activity Log logic

let allActivity = [];

function getStatusBadge(status) {
  const badges = {
    verified: '<span class="status-badge status-verified">تم التحقق</span>',
    rejected: '<span class="status-badge status-rejected">مرفوض</span>',
    pending: '<span class="status-badge status-pending">قيد الانتظار</span>',
  };
  return badges[status] || badges.pending;
}

function getActivityTypeLabel(type) {
  const labels = {
    generated: "إنشاء هوية",
    used: "استخدام",
    expired: "انتهت الصلاحية",
  };
  return labels[type] || type;
}

function getActivityTypeIcon(type) {
  const icons = {
    generated: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>`,
    used: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>`,
    expired: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>`,
  };
  return icons[type] || "";
}

function getActivityTypeBadge(type) {
  const badges = {
    generated:
      '<span class="status-badge badge-cyan" style="font-size: 0.75rem;">إنشاء</span>',
    used: '<span class="status-badge status-verified" style="font-size: 0.75rem;">استخدام</span>',
    expired:
      '<span class="status-badge badge-yellow" style="font-size: 0.75rem;">انتهت</span>',
  };
  return badges[type] || "";
}

function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Use Intl.RelativeTimeFormat for proper Arabic localization
  const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "always" });

  let formatted;
  if (Math.abs(diffDays) >= 7) {
    // For dates older than 7 days, use full date format
    return date.toLocaleDateString("ar-SA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } else if (Math.abs(diffDays) > 0) {
    formatted = rtf.format(diffDays, "day");
  } else if (Math.abs(diffHours) > 0) {
    formatted = rtf.format(diffHours, "hour");
  } else if (Math.abs(diffMinutes) > 0) {
    formatted = rtf.format(diffMinutes, "minute");
  } else {
    return "الآن";
  }

  // Replace "قبل" with "منذ" for past times
  return formatted.replace(/^قبل\s+/, "منذ ");
}

function renderActivity(activities) {
  const listElement = document.getElementById("activityList");
  const emptyState = document.getElementById("emptyState");

  if (activities.length === 0) {
    listElement.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  listElement.innerHTML = activities
    .map(
      (item) => `
    <div class="card mb-2 fade-in">
      <div class="flex justify-between items-center mb-2">
        <div style="flex: 1;">
          <div class="flex items-center gap-2 mb-1">
            <h4 style="margin: 0;">${item.service}</h4>
            ${getActivityTypeBadge(item.type || "used")}
          </div>
          <p class="text-secondary" style="font-size: 0.75rem; margin: 0;">
            ${getActivityTypeLabel(item.type || "used")}
          </p>
        </div>
        ${getStatusBadge(item.status)}
      </div>
      
      <div class="flex gap-2 mb-2" style="font-size: 0.875rem;">
        <div class="flex items-center gap-1 text-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          ${formatDate(item.timestamp)}
        </div>
        
        <div class="flex items-center gap-1 text-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          ${item.location}
        </div>
      </div>
      
      <div style="padding: 0.75rem; background: var(--color-bg); border-radius: var(--radius); border: 1px solid var(--color-border);">
        <p class="text-secondary" style="font-size: 0.75rem; margin-bottom: 0.25rem;">Blockchain Hash</p>
        <p style="font-size: 0.75rem; font-family: monospace; word-break: break-all; color: var(--color-accent-cyan);">${
          item.blockchainHash
        }</p>
      </div>
    </div>
  `
    )
    .join("");
}

function filterActivity() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const statusFilter = document.getElementById("statusFilter").value;
  const dateFilter = document.getElementById("dateFilter").value;

  let filtered = allActivity;

  // Apply search filter
  if (searchTerm) {
    filtered = filtered.filter(
      (item) =>
        item.service.toLowerCase().includes(searchTerm) ||
        item.location.toLowerCase().includes(searchTerm)
    );
  }

  // Apply status filter (backend already differentiates: verified = success, rejected = failed)
  if (statusFilter !== "all") {
    filtered = filtered.filter((item) => item.status === statusFilter);
  }

  // Apply date filter
  if (dateFilter !== "all") {
    const now = new Date();
    filtered = filtered.filter((item) => {
      const itemDate = new Date(item.timestamp);
      const diffDays = Math.floor((now - itemDate) / 86400000);

      switch (dateFilter) {
        case "today":
          return diffDays === 0;
        case "week":
          return diffDays <= 7;
        case "month":
          return diffDays <= 30;
        default:
          return true;
      }
    });
  }

  renderActivity(filtered);
}

// Load activities from backend
async function loadActivities() {
  try {
    const response = await fetch("/api/mobile/activity", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (data.success) {
      // Transform backend data to match frontend format
      allActivity = (data.activities || []).map((activity) => ({
        id: activity.id,
        service: activity.service,
        timestamp: activity.timestamp,
        status: activity.status,
        location: activity.location,
        blockchainHash: activity.blockchainHash,
        type: activity.type,
      }));

      renderActivity(allActivity);
    } else {
      console.error("Failed to load activities:", data.error);
      // Show empty state instead of fake data
      allActivity = [];
      renderActivity([]);
    }
  } catch (error) {
    console.error("Error loading activities:", error);
    // Show empty state instead of fake data
    allActivity = [];
    renderActivity([]);
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication and redirect if needed
  if (!(await requireAuth())) return;

  // Load activities from backend
  await loadActivities();
});
