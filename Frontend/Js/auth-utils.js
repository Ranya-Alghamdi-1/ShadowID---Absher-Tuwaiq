/**
 * Check if user is authenticated via backend session
 * @returns {Promise<{authenticated: boolean, user: object|null}>}
 */
async function checkAuthStatus() {
  try {
    const response = await fetch("/api/mobile/auth/verify", {
      credentials: "include",
    });
    const data = await response.json();
    return {
      authenticated: data.authenticated || false,
      user: data.user || null,
    };
  } catch (error) {
    console.error("Auth check failed:", error);
    return {
      authenticated: false,
      user: null,
    };
  }
}

/**
 * Require authentication - redirects to auth page if not authenticated
 * Call this on pages that require authentication
 * @param {boolean} redirectIfNotAuth - Whether to redirect if not authenticated (default: true)
 * @returns {Promise<boolean>} - Returns true if authenticated, false otherwise
 */
async function requireAuth(redirectIfNotAuth = true) {
  const authStatus = await checkAuthStatus();

  if (!authStatus.authenticated) {
    if (redirectIfNotAuth) {
      // Get current page URL for redirect after login
      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;
      const redirectUrl = currentPath + currentSearch;

      // Redirect to auth page with return URL
      window.location.href = `/mobile/auth.html?redirect=${encodeURIComponent(
        redirectUrl
      )}`;
    }
    return false;
  }

  return true;
}

/**
 * Redirect authenticated users away from auth page
 * Call this on auth.html to redirect if already logged in
 */
async function redirectIfAuthenticated() {
  const authStatus = await checkAuthStatus();

  if (authStatus.authenticated) {
    // Check if there's a redirect parameter
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get("redirect");

    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      window.location.href = "/mobile/dashboard.html";
    }
  }
}

/**
 * Get current authenticated user
 * @returns {Promise<object|null>} - User object or null
 */
async function getCurrentUser() {
  const authStatus = await checkAuthStatus();
  return authStatus.user;
}

/**
 * Logout user and redirect to auth page
 */
async function logout() {
  if (!confirm("هل أنت متأكد من تسجيل الخروج؟")) {
    return;
  }

  try {
    const response = await fetch("/api/mobile/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    const data = await response.json();

    if (data.success) {
      window.location.href = "/mobile/auth.html";
    } else {
      alert("حدث خطأ أثناء تسجيل الخروج. يرجى المحاولة مرة أخرى.");
    }
  } catch (error) {
    console.error("Logout error:", error);
    // Even if backend call fails, redirect to auth page
    window.location.href = "/mobile/auth.html";
  }
}

/**
 * Get device location using browser geolocation API
 * @returns {Promise<string|null>} - Location as "lat,lon" or null
 */
async function getDeviceLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    // Timeout after 3 seconds
    const timeout = setTimeout(() => {
      resolve(null);
    }, 3000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout);
        const { latitude, longitude } = position.coords;
        // Format as "lat,lon" for backend
        resolve(`${latitude},${longitude}`);
      },
      (error) => {
        clearTimeout(timeout);
        console.warn("Geolocation error:", error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 3000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Update device location on backend
 * @param {string} location - Location as "lat,lon"
 * @param {string} fingerprint - Optional device fingerprint
 * @returns {Promise<boolean>} - Success status
 */
async function updateDeviceLocation(location, fingerprint = null) {
  try {
    const body = { location };
    if (fingerprint) {
      body.fingerprint = fingerprint;
    }

    const response = await fetch("/api/mobile/devices/location", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error("Error updating device location:", error);
    return false;
  }
}

/**
 * Start periodic location updates
 * Updates location every 5 minutes while user is authenticated
 */
let locationUpdateInterval = null;

function startLocationUpdates() {
  // Clear any existing interval
  if (locationUpdateInterval) {
    clearInterval(locationUpdateInterval);
  }

  // Update immediately on start
  updateLocationPeriodically();

  // Then update every 5 minutes (300000 ms)
  locationUpdateInterval = setInterval(
    updateLocationPeriodically,
    5 * 60 * 1000
  );
}

function stopLocationUpdates() {
  if (locationUpdateInterval) {
    clearInterval(locationUpdateInterval);
    locationUpdateInterval = null;
  }
}

async function updateLocationPeriodically() {
  // Check if user is still authenticated
  const authStatus = await checkAuthStatus();
  if (!authStatus.authenticated) {
    stopLocationUpdates();
    return;
  }

  // Get current location
  const location = await getDeviceLocation();
  if (location) {
    // Try to get fingerprint from ThumbmarkJS if available
    let fingerprint = null;
    try {
      if (typeof ThumbmarkJS !== "undefined" && ThumbmarkJS.Thumbmark) {
        const tm = new ThumbmarkJS.Thumbmark({
          timeout: 2000,
          logging: false,
        });
        const result = await tm.get();
        if (result && result.thumbmark) {
          fingerprint = result.thumbmark;
        }
      }
    } catch (error) {
      // Ignore fingerprint errors, location update will still work
    }

    await updateDeviceLocation(location, fingerprint);
  }
}

// Auto-start location updates when auth-utils.js loads (if authenticated)
// This will run on all pages that include auth-utils.js
(async () => {
  const authStatus = await checkAuthStatus();
  if (authStatus.authenticated) {
    startLocationUpdates();
  }
})();
