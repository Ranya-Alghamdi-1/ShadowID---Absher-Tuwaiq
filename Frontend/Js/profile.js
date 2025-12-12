async function loadProfile() {
  // Check authentication and redirect if needed
  if (!(await requireAuth())) return;

  try {
    // Fetch profile from API
    const response = await fetch("/api/mobile/user/profile", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (data.success && data.profile) {
      const profile = data.profile;

      // Display user info
      if (profile.name) {
        const userNameEl = document.getElementById("userName");
        const fullNameEl = document.getElementById("fullName");
        if (userNameEl) {
          userNameEl.textContent = profile.name.split(" ")[0];
        }
        if (fullNameEl) {
          fullNameEl.textContent = profile.name;
        }
      }

      if (profile.nationalId) {
        const nationalIdEl = document.getElementById("nationalId");
        if (nationalIdEl) {
          nationalIdEl.textContent = profile.nationalId;
        }
      }

      if (profile.phone) {
        const phoneEl = document.getElementById("phone");
        if (phoneEl) {
          phoneEl.textContent = profile.phone;
        }
      }

      // Display stats
      if (profile.stats) {
        const statsEl = document.getElementById("stats");
        if (statsEl) {
          const statValues = statsEl.querySelectorAll(".stat-value");
          if (statValues.length >= 3) {
            statValues[0].textContent = profile.stats.totalIdsGenerated;
            statValues[1].textContent = profile.stats.totalVerified;
            statValues[2].textContent = profile.stats.activeDays;
          }
        }
      }

      // Display last login time
      if (profile.lastLoginAt) {
        const lastLoginEl = document.getElementById("lastLogin");
        if (lastLoginEl) {
          const lastLogin = new Date(profile.lastLoginAt);
          lastLoginEl.textContent = lastLogin.toLocaleString("ar-SA", {
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          });
        }
      }

      // Display device info (from current device)
      const device = navigator.userAgent.includes("iPhone")
        ? "iPhone"
        : navigator.userAgent.includes("Android")
        ? "Android"
        : "متصفح الويب";
      const deviceEl = document.getElementById("device");
      if (deviceEl) {
        deviceEl.textContent = device;
      }
    } else {
      console.error("Failed to load profile:", data.error);
    }
  } catch (error) {
    console.error("Error loading profile:", error);
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  await loadProfile();
});
