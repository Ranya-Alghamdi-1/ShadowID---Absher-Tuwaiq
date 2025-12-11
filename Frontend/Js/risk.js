// Risk Engine logic

function drawRadarChart() {
  const svg = document.getElementById("radarChart")
  const width = 280
  const height = 280
  const centerX = width / 2
  const centerY = height / 2
  const radius = 100

  // Clear existing content
  svg.innerHTML = ""

  // Data categories
  const categories = [
    { name: "التشفير", value: 0.95 },
    { name: "الاتصال", value: 0.9 },
    { name: "الخصوصية", value: 0.88 },
    { name: "المصادقة", value: 0.92 },
    { name: "الوصول", value: 0.85 },
  ]

  const angleStep = (Math.PI * 2) / categories.length

  // Draw background circles
  for (let i = 1; i <= 5; i++) {
    const r = (radius / 5) * i
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle")
    circle.setAttribute("cx", centerX)
    circle.setAttribute("cy", centerY)
    circle.setAttribute("r", r)
    circle.setAttribute("fill", "none")
    circle.setAttribute("stroke", "var(--color-border)")
    circle.setAttribute("stroke-width", "1")
    svg.appendChild(circle)
  }

  // Draw axes
  categories.forEach((_, index) => {
    const angle = angleStep * index - Math.PI / 2
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
    line.setAttribute("x1", centerX)
    line.setAttribute("y1", centerY)
    line.setAttribute("x2", x)
    line.setAttribute("y2", y)
    line.setAttribute("stroke", "var(--color-border)")
    line.setAttribute("stroke-width", "1")
    svg.appendChild(line)
  })

  // Draw data polygon
  let pathData = ""
  categories.forEach((cat, index) => {
    const angle = angleStep * index - Math.PI / 2
    const r = radius * cat.value
    const x = centerX + Math.cos(angle) * r
    const y = centerY + Math.sin(angle) * r

    if (index === 0) {
      pathData += `M ${x} ${y}`
    } else {
      pathData += ` L ${x} ${y}`
    }
  })
  pathData += " Z"

  const polygon = document.createElementNS("http://www.w3.org/2000/svg", "path")
  polygon.setAttribute("d", pathData)
  polygon.setAttribute("fill", "rgba(0, 210, 106, 0.2)")
  polygon.setAttribute("stroke", "var(--color-primary)")
  polygon.setAttribute("stroke-width", "2")
  svg.appendChild(polygon)

  // Draw points
  categories.forEach((cat, index) => {
    const angle = angleStep * index - Math.PI / 2
    const r = radius * cat.value
    const x = centerX + Math.cos(angle) * r
    const y = centerY + Math.sin(angle) * r

    const point = document.createElementNS("http://www.w3.org/2000/svg", "circle")
    point.setAttribute("cx", x)
    point.setAttribute("cy", y)
    point.setAttribute("r", "4")
    point.setAttribute("fill", "var(--color-primary)")
    svg.appendChild(point)
  })

  // Draw labels
  categories.forEach((cat, index) => {
    const angle = angleStep * index - Math.PI / 2
    const labelR = radius + 30
    const x = centerX + Math.cos(angle) * labelR
    const y = centerY + Math.sin(angle) * labelR

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
    text.setAttribute("x", x)
    text.setAttribute("y", y)
    text.setAttribute("text-anchor", "middle")
    text.setAttribute("fill", "var(--color-text-secondary)")
    text.setAttribute("font-size", "12")
    text.textContent = cat.name
    svg.appendChild(text)
  })
}

function renderAlerts() {
  const alerts = [
    {
      id: 1,
      severity: "info",
      title: "محاولة وصول غير معتادة",
      description: "تم اكتشاف محاولة وصول من موقع جديد",
      time: "2 ساعة",
    },
    {
      id: 2,
      severity: "success",
      title: "تم تحديث الأمان",
      description: "تم تطبيق آخر تحديثات الأمان بنجاح",
      time: "5 ساعات",
    },
    {
      id: 3,
      severity: "warning",
      title: "محاولات تحديث متعددة",
      description: "تم اكتشاف 3 محاولات لتحديث الهوية في وقت قصير",
      time: "أمس",
    },
  ]

  const colors = {
    info: "var(--color-accent-cyan)",
    success: "var(--color-primary)",
    warning: "var(--color-accent-gold)",
    error: "var(--color-accent-red)",
  }

  const listElement = document.getElementById("alertsList")
  listElement.innerHTML = alerts
    .map(
      (alert) => `
    <div class="mb-3" style="padding: 1rem; background: var(--color-bg); border-radius: var(--radius); border-right: 3px solid ${colors[alert.severity]};">
      <div class="flex justify-between items-center mb-1">
        <h4 style="font-size: 1rem;">${alert.title}</h4>
        <span class="text-secondary" style="font-size: 0.75rem;">منذ ${alert.time}</span>
      </div>
      <p class="text-secondary" style="font-size: 0.875rem;">${alert.description}</p>
    </div>
  `,
    )
    .join("")
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  drawRadarChart()
  renderAlerts()

  // Animate risk score
  let score = 0
  const targetScore = 18
  const interval = setInterval(() => {
    if (score >= targetScore) {
      clearInterval(interval)
      return
    }
    score++
    document.getElementById("riskScore").textContent = score
  }, 30)
})
