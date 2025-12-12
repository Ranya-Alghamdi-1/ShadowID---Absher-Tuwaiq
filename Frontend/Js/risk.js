function drawRadarChart(metrics) {
  const svg = document.getElementById("radarChart");
  const width = 280;
  const height = 280;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 100;

  svg.innerHTML = "";

  if (!metrics) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", centerX);
    text.setAttribute("y", centerY);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", "var(--color-text-secondary)");
    text.setAttribute("font-size", "14");
    text.textContent = "جاري تحميل البيانات...";
    svg.appendChild(text);
    return;
  }

  const categories = [
    { name: "التشفير", value: (metrics.encryption || 0) / 100 },
    { name: "الاتصال", value: (metrics.connectionSafety || 0) / 100 },
    { name: "الخصوصية", value: (metrics.privacyProtection || 0) / 100 },
    { name: "المصادقة", value: (metrics.authentication || 0) / 100 },
    { name: "الوصول", value: (metrics.responseRate || 0) / 100 },
  ];

  const angleStep = (Math.PI * 2) / categories.length;

  for (let i = 1; i <= 5; i++) {
    const r = (radius / 5) * i;
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    circle.setAttribute("cx", centerX);
    circle.setAttribute("cy", centerY);
    circle.setAttribute("r", r);
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "var(--color-border)");
    circle.setAttribute("stroke-width", "1");
    svg.appendChild(circle);
  }

  categories.forEach((_, index) => {
    const angle = angleStep * index - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", centerX);
    line.setAttribute("y1", centerY);
    line.setAttribute("x2", x);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "var(--color-border)");
    line.setAttribute("stroke-width", "1");
    svg.appendChild(line);
  });

  let pathData = "";
  categories.forEach((cat, index) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = radius * cat.value;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;

    if (index === 0) {
      pathData += `M ${x} ${y}`;
    } else {
      pathData += ` L ${x} ${y}`;
    }
  });
  pathData += " Z";

  const polygon = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  polygon.setAttribute("d", pathData);
  polygon.setAttribute("fill", "rgba(0, 210, 106, 0.2)");
  polygon.setAttribute("stroke", "var(--color-primary)");
  polygon.setAttribute("stroke-width", "2");
  svg.appendChild(polygon);

  categories.forEach((cat, index) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = radius * cat.value;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;

    const point = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    point.setAttribute("cx", x);
    point.setAttribute("cy", y);
    point.setAttribute("r", "4");
    point.setAttribute("fill", "var(--color-primary)");
    svg.appendChild(point);
  });

  categories.forEach((cat, index) => {
    const angle = angleStep * index - Math.PI / 2;
    const labelR = radius + 30;
    const x = centerX + Math.cos(angle) * labelR;
    const y = centerY + Math.sin(angle) * labelR;

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x);
    text.setAttribute("y", y);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", "var(--color-text-secondary)");
    text.setAttribute("font-size", "12");
    text.textContent = cat.name;
    svg.appendChild(text);
  });
}

function renderAlerts(alerts) {
  const colors = {
    info: "var(--color-accent-cyan)",
    success: "var(--color-primary)",
    warning: "var(--color-accent-gold)",
    error: "var(--color-accent-red)",
  };

  const listElement = document.getElementById("alertsList");

  if (!alerts || alerts.length === 0) {
    listElement.innerHTML = `
      <div class="text-center text-secondary" style="padding: 2rem;">
        <p style="font-size: 0.875rem;">لا توجد تنبيهات أمنية</p>
        <p style="font-size: 0.75rem; margin-top: 0.5rem;">حسابك آمن</p>
      </div>
    `;
    return;
  }

  listElement.innerHTML = alerts
    .map(
      (alert) => `
    <div class="mb-3" style="padding: 1rem; background: var(--color-bg); border-radius: var(--radius); border-right: 3px solid ${
      colors[alert.severity] || colors.info
    };">
      <div class="flex justify-between items-center mb-1">
        <h4 style="font-size: 1rem;">${alert.title}</h4>
        <span class="text-secondary" style="font-size: 0.75rem;">${
          alert.time
        }</span>
      </div>
      <p class="text-secondary" style="font-size: 0.875rem;">${
        alert.description
      }</p>
    </div>
  `
    )
    .join("");
}

function updateSecurityMetrics(metrics) {
  const encryptionBar = document.getElementById("encryptionBar");
  const encryptionValue = document.getElementById("encryptionValue");
  if (encryptionBar) {
    encryptionBar.style.width = `${metrics.encryption}%`;
  }
  if (encryptionValue) {
    encryptionValue.textContent = `${metrics.encryption}%`;
  }

  const connectionBar = document.getElementById("connectionBar");
  const connectionValue = document.getElementById("connectionValue");
  if (connectionBar) {
    connectionBar.style.width = `${metrics.connectionSafety}%`;
  }
  if (connectionValue) {
    connectionValue.textContent = `${metrics.connectionSafety}%`;
  }

  const responseBar = document.getElementById("responseBar");
  const responseValue = document.getElementById("responseValue");
  if (responseBar) {
    responseBar.style.width = `${metrics.responseRate}%`;
  }
  if (responseValue) {
    responseValue.textContent = `${metrics.responseRate}%`;
  }

  const privacyBar = document.getElementById("privacyBar");
  const privacyValue = document.getElementById("privacyValue");
  if (privacyBar) {
    privacyBar.style.width = `${metrics.privacyProtection}%`;
  }
  if (privacyValue) {
    privacyValue.textContent = `${metrics.privacyProtection}%`;
  }

  const authenticationBar = document.getElementById("authenticationBar");
  const authenticationValue = document.getElementById("authenticationValue");
  if (authenticationBar && metrics.authentication !== undefined) {
    authenticationBar.style.width = `${metrics.authentication}%`;
  }
  if (authenticationValue && metrics.authentication !== undefined) {
    authenticationValue.textContent = `${metrics.authentication}%`;
  }
}

async function loadRiskAssessment() {
  try {
    const response = await fetch("/api/mobile/risk/assessment", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (data.success) {
      const riskScoreEl = document.getElementById("riskScore");
      const riskLevelEl = document.getElementById("riskLevel");

      if (riskScoreEl && riskLevelEl) {
        const targetScore = data.risk.riskScore || 0;

        // If score is 0, set it immediately, otherwise animate
        if (targetScore === 0) {
          riskScoreEl.textContent = "0";
        } else {
          let currentScore = 0;
          const interval = setInterval(() => {
            if (currentScore >= targetScore) {
              clearInterval(interval);
              return;
            }
            currentScore++;
            riskScoreEl.textContent = currentScore;
          }, 20);
        }

        const levelText = {
          Low: "مخاطر منخفضة",
          Medium: "مخاطر متوسطة",
          High: "مخاطر عالية",
        };
        riskLevelEl.textContent =
          levelText[data.risk.riskLevel] || levelText.Low;

        riskLevelEl.className = "security-badge";
        if (data.risk.riskLevel === "High") {
          riskLevelEl.classList.add("badge-red");
        } else if (data.risk.riskLevel === "Medium") {
          riskLevelEl.classList.add("badge-yellow");
        } else {
          riskLevelEl.classList.add("badge-green");
        }
      }

      // Update security metrics (only if provided - no defaults)
      if (data.metrics) {
        updateSecurityMetrics(data.metrics);
        drawRadarChart(data.metrics);
      } else {
        // No metrics available - show empty state
        drawRadarChart(null);
      }

      // Render alerts (only if provided)
      if (data.alerts) {
        renderAlerts(data.alerts);
      } else {
        renderAlerts([]);
      }
    } else {
      console.error("Failed to load risk assessment:", data.error);
      // Show empty state - no fake data
      const riskScoreEl = document.getElementById("riskScore");
      if (riskScoreEl) {
        riskScoreEl.textContent = "--";
      }
      renderAlerts([]);
      drawRadarChart(null);
    }
  } catch (error) {
    console.error("Error loading risk assessment:", error);
    // Show empty state - no fake data
    const riskScoreEl = document.getElementById("riskScore");
    if (riskScoreEl) {
      riskScoreEl.textContent = "--";
    }
    renderAlerts([]);
    drawRadarChart(null);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await requireAuth())) return;

  drawRadarChart(null);
  await loadRiskAssessment();
});
