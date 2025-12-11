// Profile page logic

function loadProfile() {
  const user = JSON.parse(localStorage.getItem("shadowid_user") || "{}")

  if (user.name) {
    document.getElementById("userName").textContent = user.name.split(" ")[0]
    document.getElementById("fullName").textContent = user.name
  }

  if (user.nationalId) {
    document.getElementById("nationalId").textContent = user.nationalId
  }

  if (user.phone) {
    document.getElementById("phone").textContent = user.phone
  }

  // Display device info
  const device = navigator.userAgent.includes("iPhone")
    ? "iPhone"
    : navigator.userAgent.includes("Android")
      ? "Android"
      : "متصفح الويب"
  document.getElementById("device").textContent = device

  // Display last login time
  const now = new Date()
  document.getElementById("lastLogin").textContent = now.toLocaleString("ar-SA", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Initialize
document.addEventListener("DOMContentLoaded", loadProfile)
