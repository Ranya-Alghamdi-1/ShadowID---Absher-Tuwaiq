let selectedService = null;
let selectedPortal = null;
let html5QrcodeScanner = null;

// Load services on page load
document.addEventListener("DOMContentLoaded", async () => {
  await loadServices();
});

async function loadServices() {
  try {
    const response = await fetch("/api/mobile/services");
    const data = await response.json();

    if (data.success && data.services) {
      renderServices(data.services);
    } else {
      document.getElementById("servicesList").innerHTML =
        '<div class="loading">فشل تحميل الخدمات</div>';
    }
  } catch (error) {
    console.error("Error loading services:", error);
    document.getElementById("servicesList").innerHTML =
      '<div class="loading">حدث خطأ أثناء تحميل الخدمات</div>';
  }
}

function renderServices(services) {
  const servicesList = document.getElementById("servicesList");
  servicesList.innerHTML = "";

  if (services.length === 0) {
    servicesList.innerHTML = '<div class="loading">لا توجد خدمات متاحة</div>';
    return;
  }

  services.forEach((service) => {
    const serviceCard = document.createElement("div");
    serviceCard.className = "service-card";
    serviceCard.dataset.serviceId = service.serviceId;

    serviceCard.innerHTML = `
      <div class="service-name">${service.name}</div>
      ${
        service.description
          ? `<div class="service-description">${service.description}</div>`
          : ""
      }
      <div class="portals-list" id="portals-${service.serviceId}">
        ${service.portals
          .map(
            (portal) => `
          <div class="portal-item" data-portal-id="${portal.portalId}" onclick="selectPortal('${service.serviceId}', '${portal.portalId}', '${service.name}', '${portal.name}', '${portal.location}', '${service.apiKey}')">
            <div class="portal-name">${portal.name}</div>
            <div class="portal-location">📍 ${portal.location}</div>
          </div>
        `
          )
          .join("")}
      </div>
    `;

    servicesList.appendChild(serviceCard);
  });
}

function selectPortal(
  serviceId,
  portalId,
  serviceName,
  portalName,
  portalLocation,
  apiKey
) {
  // Remove previous selections
  document.querySelectorAll(".service-card").forEach((card) => {
    card.classList.remove("selected");
  });
  document.querySelectorAll(".portal-item").forEach((item) => {
    item.classList.remove("selected");
  });

  // Mark selected
  const serviceCard = document.querySelector(
    `[data-service-id="${serviceId}"]`
  );
  const portalItem = document.querySelector(`[data-portal-id="${portalId}"]`);
  if (serviceCard) serviceCard.classList.add("selected");
  if (portalItem) portalItem.classList.add("selected");

  // Store selection
  selectedService = {
    serviceId,
    name: serviceName,
    apiKey,
  };
  selectedPortal = {
    portalId,
    name: portalName,
    location: portalLocation,
  };

  // Update selected service info
  document.getElementById("selectedServiceInfo").innerHTML = `
    <strong>${serviceName}</strong><br>
    <small>${portalName} - ${portalLocation}</small>
  `;

  // Automatically start scanner when portal is selected
  startScanner();
}

function startScanner() {
  if (!selectedService || !selectedPortal) {
    alert("يرجى اختيار خدمة وفرع أولاً");
    return;
  }

  // Hide service selection, show scanner
  document.getElementById("serviceSelectionView").style.display = "none";
  document.getElementById("scannerView").classList.add("active");
  document.getElementById("resultView").style.display = "none";

  // Initialize QR scanner
  html5QrcodeScanner = new Html5Qrcode("qr-reader");

  html5QrcodeScanner
    .start(
      { facingMode: "environment" }, // Use back camera
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      onScanSuccess,
      onScanError
    )
    .catch((err) => {
      console.error("Error starting scanner:", err);
      alert("فشل تشغيل الكاميرا. يرجى التأكد من السماح بالوصول إلى الكاميرا.");
      stopScanner();
    });
}

function onScanSuccess(decodedText, decodedResult) {
  // Stop scanner
  stopScanner();

  // Process scanned token
  scanToken(decodedText);
}

function onScanError(errorMessage) {
  // Ignore scanning errors (they're frequent during scanning)
}

function stopScanner() {
  if (html5QrcodeScanner) {
    html5QrcodeScanner
      .stop()
      .then(() => {
        html5QrcodeScanner.clear();
        html5QrcodeScanner = null;
      })
      .catch((err) => {
        console.error("Error stopping scanner:", err);
      });
  }

  // Show service selection, hide scanner
  document.getElementById("scannerView").classList.remove("active");
  document.getElementById("serviceSelectionView").style.display = "block";
}

async function scanToken(token) {
  try {
    // Show loading
    document.getElementById("resultView").style.display = "block";
    document.getElementById("resultCard").innerHTML =
      '<div class="loading">جاري التحقق من الرمز...</div>';

    // Call scan API
    const response = await fetch("/api/mobile/shadowid/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: token,
        apiKey: selectedService.apiKey,
        portalId: selectedPortal.portalId,
      }),
    });

    const data = await response.json();

    // Display result
    displayResult(data);
  } catch (error) {
    console.error("Error scanning token:", error);
    displayResult({
      success: false,
      error: "حدث خطأ أثناء التحقق من الرمز",
    });
  }
}

function displayResult(data) {
  const resultCard = document.getElementById("resultCard");
  const resultTitle = document.getElementById("resultTitle");
  const resultDetails = document.getElementById("resultDetails");

  if (data.success && data.valid) {
    // Success
    resultCard.className = "result-card result-success";
    resultTitle.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      تم التحقق بنجاح
    `;

    resultDetails.innerHTML = `
      <div class="result-item">
        <span class="result-label">الخدمة:</span>
        <span class="result-value">${selectedService.name}</span>
      </div>
      <div class="result-item">
        <span class="result-label">الفرع:</span>
        <span class="result-value">${selectedPortal.name}</span>
      </div>
      ${
        data.userData
          ? `
        <div class="result-item">
          <span class="result-label">الاسم:</span>
          <span class="result-value">${data.userData.name || "غير متاح"}</span>
        </div>
        <div class="result-item">
          <span class="result-label">الهوية الوطنية:</span>
          <span class="result-value">${
            data.userData.nationalId || "غير متاح"
          }</span>
        </div>
        <div class="result-item">
          <span class="result-label">نوع الشخص:</span>
          <span class="result-value">${
            data.userData.personType || "غير متاح"
          }</span>
        </div>
      `
          : ""
      }
      ${
        data.riskScore !== undefined
          ? `
        <div class="result-item">
          <span class="result-label">مستوى المخاطر:</span>
          <span class="result-value">${data.riskLevel || "غير محدد"}</span>
        </div>
      `
          : ""
      }
    `;
  } else {
    // Error/Rejected
    resultCard.className = "result-card result-error";
    resultTitle.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-red)" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      تم رفض الرمز
    `;

    resultDetails.innerHTML = `
      <div class="result-item">
        <span class="result-label">السبب:</span>
        <span class="result-value">${data.error || "رمز غير صالح"}</span>
      </div>
      ${
        data.expired
          ? `
        <div class="result-item">
          <span class="result-label">الحالة:</span>
          <span class="result-value">انتهت صلاحية الرمز</span>
        </div>
      `
          : ""
      }
    `;
  }
}

function resetScanner() {
  // Reset state
  selectedService = null;
  selectedPortal = null;

  // Hide result, show service selection
  document.getElementById("resultView").style.display = "none";
  document.getElementById("serviceSelectionView").style.display = "block";
  document.getElementById("startScanBtn").style.display = "none";

  // Clear selections
  document.querySelectorAll(".service-card").forEach((card) => {
    card.classList.remove("selected");
  });
  document.querySelectorAll(".portal-item").forEach((item) => {
    item.classList.remove("selected");
  });

  document.getElementById("selectedServiceInfo").innerHTML = "";
}

function goBack() {
  if (html5QrcodeScanner) {
    stopScanner();
  }
  window.location.href = "/mobile";
}
