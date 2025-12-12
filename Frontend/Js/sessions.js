let sessions = [];

async function loadSessions() {
  try {
    const response = await fetch("/api/mobile/auth/sessions", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (data.success && data.sessions) {
      // Flatten the grouped sessions structure
      // Backend returns: [{ device: {...}, sessions: [...] }]
      // We need to flatten to: [{ ...session, device: {...} }]
      sessions = [];
      data.sessions.forEach((deviceGroup) => {
        deviceGroup.sessions.forEach((session) => {
          sessions.push({
            id: session.id,
            sessionId: session.sessionId,
            isActive: session.isActive,
            expiresAt: formatDate(session.expiresAt),
            userAgent: session.userAgent,
            ipAddress: session.ipAddress,
            device: deviceGroup.device, // Include device info
            isCurrent: session.isCurrent,
            createdAt: formatDate(session.createdAt),
          });
        });
      });
      renderSessions();
    } else {
      console.error("Failed to load sessions:", data.error);
      renderSessions(); // Render empty list
    }
  } catch (error) {
    console.error("Error loading sessions:", error);
    renderSessions(); // Render empty list
  }
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

function getDeviceName(userAgent) {
  if (!userAgent) return "غير معروف";

  if (userAgent.includes("iPhone")) return "iPhone";
  if (userAgent.includes("iPad")) return "iPad";
  if (userAgent.includes("Android")) return "Android";
  if (userAgent.includes("Windows")) return "Windows";
  if (userAgent.includes("Mac")) return "Mac";
  if (userAgent.includes("Linux")) return "Linux";

  return "متصفح الويب";
}

async function revokeSession(sessionId) {
  if (!confirm("هل أنت متأكد من إلغاء هذه الجلسة؟")) {
    return;
  }

  try {
    const response = await fetch("/api/mobile/auth/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ sessionId: sessionId }),
    });

    const data = await response.json();

    if (data.success) {
      alert("تم إلغاء الجلسة بنجاح");
      await loadSessions();

      // If current session was revoked, redirect to login
      if (sessions.find((s) => s.sessionId === sessionId)?.isCurrent) {
        window.location.href = "/mobile/auth.html";
      }
    } else {
      alert("حدث خطأ أثناء إلغاء الجلسة: " + (data.error || "خطأ غير معروف"));
    }
  } catch (error) {
    console.error("Error revoking session:", error);
    alert("حدث خطأ أثناء إلغاء الجلسة");
  }
}

async function revokeDevice(fingerprint) {
  if (!confirm("هل أنت متأكد من إلغاء جميع جلسات هذا الجهاز؟")) {
    return;
  }

  try {
    const response = await fetch("/api/mobile/auth/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ fingerprint: fingerprint }),
    });

    const data = await response.json();

    if (data.success) {
      alert("تم إلغاء جميع جلسات الجهاز بنجاح");
      await loadSessions();

      // If current device was revoked, redirect to login
      const currentDevice = sessions.find(
        (s) => s.device?.fingerprint === fingerprint && s.isCurrent
      );
      if (currentDevice) {
        window.location.href = "/mobile/auth.html";
      }
    } else {
      alert(
        "حدث خطأ أثناء إلغاء جلسات الجهاز: " + (data.error || "خطأ غير معروف")
      );
    }
  } catch (error) {
    console.error("Error revoking device:", error);
    alert("حدث خطأ أثناء إلغاء جلسات الجهاز");
  }
}

async function revokeAllSessions() {
  if (
    !confirm(
      "هل أنت متأكد من إلغاء جميع الجلسات؟ سيتم تسجيل خروجك من جميع الأجهزة."
    )
  ) {
    return;
  }

  try {
    const response = await fetch("/api/mobile/auth/revoke", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ allSessions: true }),
    });

    const data = await response.json();

    if (data.success) {
      alert("تم إلغاء جميع الجلسات بنجاح");
      window.location.href = "/mobile/auth.html";
    } else {
      alert("حدث خطأ أثناء إلغاء الجلسات: " + (data.error || "خطأ غير معروف"));
    }
  } catch (error) {
    console.error("Error revoking all sessions:", error);
    alert("حدث خطأ أثناء إلغاء الجلسات");
  }
}

function renderSessions() {
  const list = document.getElementById("sessionsList");

  if (!list) {
    return;
  }

  // Only show active sessions (backend now filters inactive ones)
  const activeSessions = sessions.filter((s) => s.isActive);

  if (activeSessions.length === 0) {
    list.innerHTML = `
      <div class="card" style="text-align: center; padding: 2rem;">
        <p class="text-secondary">لا توجد جلسات نشطة</p>
      </div>
    `;
    return;
  }

  // Group sessions by device fingerprint for better organization
  const sessionsByDevice = new Map();
  activeSessions.forEach((session) => {
    const fingerprint = session.device?.fingerprint || "unknown";
    if (!sessionsByDevice.has(fingerprint)) {
      sessionsByDevice.set(fingerprint, []);
    }
    sessionsByDevice.get(fingerprint).push(session);
  });

  let html = "";

  // Render sessions grouped by device
  sessionsByDevice.forEach((deviceSessions, fingerprint) => {
    const device = deviceSessions[0].device;
    const deviceName =
      device?.name || getDeviceName(deviceSessions[0].userAgent);
    const deviceLocation = device?.location || "غير محدد";
    const isCurrentDevice = deviceSessions.some((s) => s.isCurrent);

    html += `
      <div class="card mb-3">
        <div class="flex justify-between items-center mb-2">
          <div class="flex items-center gap-2">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(6, 182, 212, 0.1); display: flex; align-items: center; justify-content: center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-cyan)" stroke-width="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
            </div>
            <div>
              <h4 style="font-size: 1rem;">${deviceName}</h4>
              ${
                isCurrentDevice
                  ? '<span class="security-badge badge-green" style="font-size: 0.75rem;">الجهاز الحالي</span>'
                  : ""
              }
            </div>
          </div>
          ${
            !isCurrentDevice && fingerprint !== "unknown"
              ? `<button onclick="revokeDevice('${fingerprint}')" style="background: none; border: none; color: var(--color-accent-red); cursor: pointer;" title="إزالة جميع جلسات هذا الجهاز">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>`
              : ""
          }
        </div>
        <div class="flex gap-2 mb-2" style="font-size: 0.875rem;">
          <span class="text-secondary">📍 ${deviceLocation}</span>
          ${
            deviceSessions[0].ipAddress
              ? `<span class="text-secondary">• ${deviceSessions[0].ipAddress}</span>`
              : ""
          }
        </div>
        <div style="font-size: 0.75rem; color: var(--color-text-muted);">
          <span>أنشئت: ${deviceSessions[0].createdAt}</span>
          ${
            deviceSessions[0].expiresAt
              ? ` • <span>تنتهي: ${deviceSessions[0].expiresAt}</span>`
              : ""
          }
        </div>
      </div>
    `;
  });

  // Revoke all button (only show if more than 1 session)
  if (activeSessions.length > 1) {
    html += `
      <div class="mt-4">
        <button onclick="revokeAllSessions()" style="width: 100%; padding: 0.75rem; background: var(--color-accent-red); color: white; border: none; border-radius: var(--radius); cursor: pointer; font-size: 0.875rem;">
          إلغاء جميع الجلسات
        </button>
      </div>
    `;
  }

  list.innerHTML = html;
}

// Make functions global for inline handlers
window.revokeSession = revokeSession;
window.revokeDevice = revokeDevice;
window.revokeAllSessions = revokeAllSessions;

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  if (!(await requireAuth())) return;

  await loadSessions();
});
