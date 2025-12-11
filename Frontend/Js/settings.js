// Settings logic

function loadSettings() {
  // Load saved settings
  const settings = JSON.parse(localStorage.getItem("shadowid_settings") || "{}")

  document.getElementById("autoLock").checked = settings.autoLock || false
  document.getElementById("hidePreview").checked = settings.hidePreview || false
  document.getElementById("ghostMode").checked = settings.ghostMode || false
}

function saveSetting(key, value) {
  const settings = JSON.parse(localStorage.getItem("shadowid_settings") || "{}")
  settings[key] = value
  localStorage.setItem("shadowid_settings", JSON.stringify(settings))

  console.log(`[v0] Setting ${key} updated to ${value}`)
}

function requestData(type) {
  const messages = {
    delete: "سيتم معالجة طلب حذف البيانات خلال 30 يوماً وفقاً لنظام حماية البيانات الشخصية (PDPL)",
    correction: "سيتم مراجعة طلب تصحيح البيانات خلال 7 أيام",
    export: "سيتم إرسال نسخة من بياناتك إلى بريدك الإلكتروني خلال 48 ساعة",
  }

  if (confirm(`${messages[type]}\n\nهل تريد المتابعة؟`)) {
    console.log(`[v0] Data request: ${type}`)
    alert("تم إرسال الطلب بنجاح")
  }
}

function logout() {
  if (confirm("هل أنت متأكد من تسجيل الخروج؟")) {
    localStorage.removeItem("shadowid_authenticated")
    localStorage.removeItem("shadowid_user")
    window.location.href = "auth.html"
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", loadSettings)
