// ID Details page logic

function loadTokenDetails() {
  const token = localStorage.getItem("shadowid_current_token")

  if (!token) {
    window.location.href = "dashboard.html"
    return
  }

  // Display token
  document.getElementById("tokenDisplay").textContent = token

  // Generate QR code
  const canvas = document.getElementById("qrCanvas")
  window.generateQRCode(token, canvas) // Assuming generateQRCode is a global function

  // Display times
  const now = new Date()
  const expiry = new Date(now.getTime() + 3 * 60 * 1000)

  document.getElementById("createdTime").textContent = now.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  })
  document.getElementById("expiryTime").textContent = expiry.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  })

  // Display device info
  const device = navigator.userAgent.includes("iPhone")
    ? "iPhone"
    : navigator.userAgent.includes("Android")
      ? "Android"
      : "متصفح الويب"
  document.getElementById("deviceDisplay").textContent = device
}

function copyToken() {
  const token = document.getElementById("tokenDisplay").textContent

  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(token)
      .then(() => {
        alert("تم نسخ الرمز بنجاح")
      })
      .catch(() => {
        alert("فشل نسخ الرمز")
      })
  } else {
    // Fallback for older browsers
    const textarea = document.createElement("textarea")
    textarea.value = token
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand("copy")
    document.body.removeChild(textarea)
    alert("تم نسخ الرمز بنجاح")
  }
}

function shareToken() {
  const token = document.getElementById("tokenDisplay").textContent

  if (navigator.share) {
    navigator
      .share({
        title: "Shadow ID Token",
        text: `رمز الهوية المؤقت: ${token}`,
      })
      .catch(() => {})
  } else {
    alert("المشاركة غير متاحة على هذا الجهاز")
  }
}

function revokeID() {
  if (confirm("هل أنت متأكد من إلغاء هذه الهوية؟ سيتم إبطالها فوراً ولن تتمكن من استخدامها مرة أخرى.")) {
    const token = document.getElementById("tokenDisplay").textContent

    console.log("[v0] Revoking Shadow ID:", token)

    // Log revocation
    const activity = JSON.parse(localStorage.getItem("shadowid_activity") || "[]")
    activity.unshift({
      id: Date.now(),
      type: "revoked",
      token: token,
      timestamp: new Date().toISOString(),
      location: "الرياض، المملكة العربية السعودية",
    })
    localStorage.setItem("shadowid_activity", JSON.stringify(activity))

    alert("تم إلغاء الهوية بنجاح")
    window.location.href = "dashboard.html"
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", loadTokenDetails)

// Declare generateQRCode function or import it from a library
function generateQRCode(token, canvas) {
  // QR code generation logic here
  // Example: use a QR code library to generate the QR code
}
