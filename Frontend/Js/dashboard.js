// Dashboard logic

let currentToken = "";
let expiryTime = 0;
let timerInterval = null;

async function loadUserInfo() {
  const user = await getCurrentUser();
  // Note: userName element doesn't exist in dashboard.html
  // If you need to display user name, add an element with id="userName" to the HTML
  if (user && user.name) {
    console.log("User logged in:", user.name);
    // You can add user name display here if needed
  }
}

async function pollTokenStatus() {
  try {
    const response = await fetch("/api/mobile/shadowid/validate", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (!data.success) {
      console.error("Failed to validate token");
      return null;
    }

    if (!data.valid || data.expired) {
      // Token expired or invalid
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      document.getElementById("timerDisplay").textContent = "00:00";
      document.getElementById("timerDisplay").style.color =
        "var(--color-accent-red)";

      // Update token if it changed (new token generated)
      if (data.token && data.token !== currentToken) {
        currentToken = data.token;
        document.getElementById("tokenDisplay").textContent = data.token;
        const canvas = document.getElementById("qrCanvas");
        if (canvas && typeof window.generateQRCode === "function") {
          window.generateQRCode(data.token, canvas);
        }
      }

      if (data.expired) {
        alert("انتهت صلاحية الهوية المؤقتة. يرجى إنشاء هوية جديدة.");
      }
      return null;
    }

    // Update token if it changed
    if (data.token && data.token !== currentToken) {
      currentToken = data.token;
      document.getElementById("tokenDisplay").textContent = data.token;
      const canvas = document.getElementById("qrCanvas");
      if (canvas && typeof window.generateQRCode === "function") {
        window.generateQRCode(data.token, canvas);
      }
    }

    // Update timer display
    const remaining = data.remaining; // in seconds
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    const display = `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
    document.getElementById("timerDisplay").textContent = display;

    // Change color based on remaining time
    if (remaining < 60) {
      document.getElementById("timerDisplay").style.color =
        "var(--color-accent-red)";
    } else if (remaining < 120) {
      document.getElementById("timerDisplay").style.color =
        "var(--color-accent-gold)";
    } else {
      document.getElementById("timerDisplay").style.color =
        "var(--color-primary)";
    }

    return data;
  } catch (error) {
    console.error("Error polling token status:", error);
    return null;
  }
}

function startTimer() {
  // Clear existing timer
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  // Poll immediately
  pollTokenStatus();

  // Poll every second to get accurate remaining time from backend
  timerInterval = setInterval(pollTokenStatus, 1000);
}

async function generateNewID(forceNew = false) {
  console.log("Generating new Shadow ID from backend...", { forceNew });

  const btn = document.getElementById("generateBtn");
  const originalHTML = btn.innerHTML;

  // Show loading state
  btn.innerHTML =
    '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div> جاري الإنشاء...';
  btn.disabled = true;

  try {
    // Call backend API to generate Shadow ID (force new if button clicked)
    const response = await fetch("/api/mobile/shadowid/generate", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ force: forceNew }),
    });

    const data = await response.json();

    if (data.success && data.shadowId) {
      const { token, expiresAt, riskScore, riskLevel } = data.shadowId;

      // Store token
      currentToken = token;
      document.getElementById("tokenDisplay").textContent = token;

      // Generate QR code
      const canvas = document.getElementById("qrCanvas");
      if (canvas && typeof window.generateQRCode === "function") {
        window.generateQRCode(token, canvas);
      } else {
        console.error("QR code generation function not available");
      }

      // Start polling timer from backend
      startTimer();

      console.log("Shadow ID generated:", {
        token,
        expiresAt,
        riskScore,
        riskLevel,
      });
    } else {
      throw new Error(data.error || "Failed to generate Shadow ID");
    }
  } catch (error) {
    console.error("Error generating Shadow ID:", error);
    alert("فشل في إنشاء الهوية المؤقتة. يرجى المحاولة مرة أخرى.");
  } finally {
    // Reset button
    btn.innerHTML = originalHTML;
    btn.disabled = false;
  }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication and redirect if needed
  if (!(await requireAuth())) return;

  await loadUserInfo();

  generateNewID(false);

  const generateBtn = document.getElementById("generateBtn");
  if (generateBtn) {
    generateBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      generateNewID(true);
    });
  }

  // Add click handler to QR code for details
  const qrCanvas = document.getElementById("qrCanvas");
  if (qrCanvas) {
    qrCanvas.addEventListener("click", () => {
      if (currentToken) {
        // Pass token via URL parameter instead of localStorage
        window.location.href = `id-details.html?token=${currentToken}`;
      }
    });
  }
});
