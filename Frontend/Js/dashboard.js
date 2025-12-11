// Dashboard logic

let currentToken = ""
let expiryTime = 0
let timerInterval = null

function checkAuth() {
  if (localStorage.getItem("shadowid_authenticated") !== "true") {
    window.location.href = "auth.html"
    return false
  }
  return true
}

function loadUserInfo() {
  const user = JSON.parse(localStorage.getItem("shadowid_user") || "{}")
  if (user.name) {
    document.getElementById("userName").textContent = user.name.split(" ")[0]
  }
}

function generateToken() {
  // Generate a random 8-character alphanumeric token
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let token = ""
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

function startTimer(minutes) {
  // Clear existing timer
  if (timerInterval) {
    clearInterval(timerInterval)
  }

  expiryTime = Date.now() + minutes * 60 * 1000

  function updateTimer() {
    const remaining = expiryTime - Date.now()

    if (remaining <= 0) {
      clearInterval(timerInterval)
      document.getElementById("timerDisplay").textContent = "00:00"
      document.getElementById("timerDisplay").style.color = "var(--color-accent-red)"
      alert("انتهت صلاحية الهوية المؤقتة. يرجى إنشاء هوية جديدة.")
      return
    }

    const minutes = Math.floor(remaining / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)

    const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    document.getElementById("timerDisplay").textContent = display

    // Change color based on remaining time
    if (remaining < 60000) {
      document.getElementById("timerDisplay").style.color = "var(--color-accent-red)"
    } else if (remaining < 120000) {
      document.getElementById("timerDisplay").style.color = "var(--color-accent-gold)"
    } else {
      document.getElementById("timerDisplay").style.color = "var(--color-primary)"
    }
  }

  updateTimer()
  timerInterval = setInterval(updateTimer, 1000)
}

function generateNewID() {
  console.log("[v0] Generating new Shadow ID...")

  const btn = document.getElementById("generateBtn")
  const originalHTML = btn.innerHTML

  // Show loading state
  btn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div> جاري الإنشاء...'
  btn.disabled = true

  setTimeout(() => {
    // Generate new token
    currentToken = generateToken()
    document.getElementById("tokenDisplay").textContent = currentToken

    // Generate QR code
    const canvas = document.getElementById("qrCanvas")
    window.generateQRCode(currentToken, canvas) // Declare or import generateQRCode before using it

    // Start 3-minute timer
    startTimer(3)

    // Log activity
    const activity = JSON.parse(localStorage.getItem("shadowid_activity") || "[]")
    activity.unshift({
      id: Date.now(),
      type: "generated",
      token: currentToken,
      timestamp: new Date().toISOString(),
      location: "الرياض، المملكة العربية السعودية",
    })
    localStorage.setItem("shadowid_activity", JSON.stringify(activity.slice(0, 50))) // Keep last 50

    // Reset button
    btn.innerHTML = originalHTML
    btn.disabled = false

    console.log("[v0] Shadow ID generated:", currentToken)
  }, 1000)
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  if (!checkAuth()) return

  loadUserInfo()

  // Generate initial ID
  generateNewID()

  // Add click handler to QR code for details
  document.getElementById("qrCanvas").addEventListener("click", () => {
    if (currentToken) {
      localStorage.setItem("shadowid_current_token", currentToken)
      window.location.href = "id-details.html"
    }
  })
})
