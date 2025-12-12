// Authentication logic for auth.html page

function loginWithTawakkalna() {
  const agreeCheckbox = document.getElementById("agree");

  if (!agreeCheckbox.checked) {
    alert("يرجى الموافقة على سياسة الخصوصية");
    return;
  }

  // Get redirect URL from query parameter or default to dashboard
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUrl = urlParams.get("redirect") || "/mobile/dashboard.html";

  // Redirect to OAuth provider (fake Tawakkalna)
  window.location.href = `/api/mobile/auth/tawakkalna?redirect_uri=${encodeURIComponent(
    redirectUrl
  )}`;
}

// Check authentication on page load and redirect if already authenticated
document.addEventListener("DOMContentLoaded", () => {
  redirectIfAuthenticated();
});
