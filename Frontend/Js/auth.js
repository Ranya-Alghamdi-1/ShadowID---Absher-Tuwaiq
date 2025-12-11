// Authentication logic

function loginWithTawakkalna() {
  const agreeCheckbox = document.getElementById("agree")

  if (!agreeCheckbox.checked) {
    alert("يرجى الموافقة على سياسة الخصوصية")
    return
  }

  // Simulate Tawakkalna authentication
  console.log("[v0] Initiating Tawakkalna login...")

  // Show loading state
  const btn = event.target
  const originalText = btn.innerHTML
  btn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>'
  btn.disabled = true

  // Simulate API call
  setTimeout(() => {
    // Store authentication state
    localStorage.setItem("shadowid_authenticated", "true")
    localStorage.setItem(
      "shadowid_user",
      JSON.stringify({
        name: "محمد أحمد",
        nationalId: "1XXXXXXXXX",
        phone: "+966XXXXXXXX",
      }),
    )

    // Redirect to dashboard
    window.location.href = "dashboard.html"
  }, 1500)
}

function loginWithBiometric() {
  const agreeCheckbox = document.getElementById("agree")

  if (!agreeCheckbox.checked) {
    alert("يرجى الموافقة على سياسة الخصوصية")
    return
  }

  console.log("[v0] Initiating biometric authentication...")

  // Check if biometric is available (simplified check)
  if (!window.PublicKeyCredential) {
    alert("المصادقة البيومترية غير متاحة على هذا الجهاز")
    return
  }

  // Simulate biometric authentication
  const btn = event.target
  const originalText = btn.innerHTML
  btn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>'
  btn.disabled = true

  setTimeout(() => {
    localStorage.setItem("shadowid_authenticated", "true")
    localStorage.setItem(
      "shadowid_user",
      JSON.stringify({
        name: "محمد أحمد",
        nationalId: "1XXXXXXXXX",
        phone: "+966XXXXXXXX",
      }),
    )

    window.location.href = "dashboard.html"
  }, 1000)
}

// Check if already authenticated
if (localStorage.getItem("shadowid_authenticated") === "true") {
  window.location.href = "dashboard.html"
}
