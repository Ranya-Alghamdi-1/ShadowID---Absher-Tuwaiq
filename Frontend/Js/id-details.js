async function loadTokenDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  if (!token) {
    window.location.href = "dashboard.html";
    return;
  }

  try {
    const response = await fetch(`/api/mobile/shadowid/${token}/details`, {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (data.success && data.shadowId) {
      const shadowId = data.shadowId;

      document.getElementById("tokenDisplay").textContent = shadowId.token;

      const canvas = document.getElementById("qrCanvas");
      if (window.generateQRCode) {
        window.generateQRCode(shadowId.token, canvas);
      }

      const createdDate = new Date(shadowId.createdAt);
      const expiryDate = new Date(shadowId.expiresAt);

      document.getElementById("createdTime").textContent =
        createdDate.toLocaleTimeString("ar-SA", {
          hour: "2-digit",
          minute: "2-digit",
        });
      document.getElementById("expiryTime").textContent =
        expiryDate.toLocaleTimeString("ar-SA", {
          hour: "2-digit",
          minute: "2-digit",
        });

      const locationEl = document.getElementById("locationDisplay");
      if (locationEl && shadowId.generationLocation) {
        locationEl.textContent = shadowId.generationLocation;
      }

      const device = shadowId.deviceFingerprint
        ? "جهاز مسجل"
        : navigator.userAgent.includes("iPhone")
        ? "iPhone"
        : navigator.userAgent.includes("Android")
        ? "Android"
        : "متصفح الويب";
      document.getElementById("deviceDisplay").textContent = device;

      window.currentToken = shadowId.token;
    } else {
      console.error("Failed to load token details:", data.error);
      alert("فشل تحميل تفاصيل الهوية");
      window.location.href = "dashboard.html";
    }
  } catch (error) {
    console.error("Error loading token details:", error);
    alert("حدث خطأ أثناء تحميل التفاصيل");
    window.location.href = "dashboard.html";
  }
}

function copyToken() {
  const token = document.getElementById("tokenDisplay").textContent;

  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(token)
      .then(() => {
        alert("تم نسخ الرمز بنجاح");
      })
      .catch(() => {
        alert("فشل نسخ الرمز");
      });
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = token;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    alert("تم نسخ الرمز بنجاح");
  }
}

function shareToken() {
  const token = document.getElementById("tokenDisplay").textContent;

  if (navigator.share) {
    navigator
      .share({
        title: "Shadow ID Token",
        text: `رمز الهوية المؤقت: ${token}`,
      })
      .catch(() => {});
  } else {
    alert("المشاركة غير متاحة على هذا الجهاز");
  }
}

async function revokeID() {
  if (
    confirm(
      "هل أنت متأكد من إلغاء هذه الهوية؟ سيتم إبطالها فوراً ولن تتمكن من استخدامها مرة أخرى."
    )
  ) {
    const token =
      window.currentToken ||
      document.getElementById("tokenDisplay").textContent;

    try {
      const response = await fetch("/api/mobile/shadowid/revoke", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        alert("تم إلغاء الهوية بنجاح");
        window.location.href = "dashboard.html";
      } else {
        alert(`فشل إلغاء الهوية: ${data.error || "خطأ غير معروف"}`);
      }
    } catch (error) {
      console.error("Error revoking Shadow ID:", error);
      alert("حدث خطأ أثناء إلغاء الهوية");
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await requireAuth())) return;

  loadTokenDetails();
});

function generateQRCode(token, canvas) {}
