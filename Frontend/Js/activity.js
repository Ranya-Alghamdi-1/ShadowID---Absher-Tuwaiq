// Activity Log logic

let allActivity = []

function generateSampleActivity() {
  const services = [
    "وزارة الداخلية",
    "البنك الأهلي",
    "مستشفى الملك فيصل",
    "جامعة الملك سعود",
    "هيئة الزكاة والضريبة",
    "شركة الكهرباء",
  ]

  const statuses = ["verified", "verified", "verified", "rejected", "pending"]
  const locations = ["الرياض", "جدة", "الدمام"]

  const activity = []

  // Generate 20 sample activities
  for (let i = 0; i < 20; i++) {
    const date = new Date()
    date.setDate(date.getDate() - Math.floor(Math.random() * 30))

    const status = statuses[Math.floor(Math.random() * statuses.length)]

    activity.push({
      id: Date.now() + i,
      service: services[Math.floor(Math.random() * services.length)],
      timestamp: date.toISOString(),
      status: status,
      location: locations[Math.floor(Math.random() * locations.length)],
      blockchainHash: generateHash(),
    })
  }

  return activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

function generateHash() {
  const chars = "0123456789abcdef"
  let hash = "0x"
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)]
  }
  return hash
}

function getStatusBadge(status) {
  const badges = {
    verified: '<span class="status-badge status-verified">تم التحقق</span>',
    rejected: '<span class="status-badge status-rejected">مرفوض</span>',
    pending: '<span class="status-badge status-pending">قيد الانتظار</span>',
  }
  return badges[status] || badges.pending
}

function formatDate(isoString) {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) {
    return `منذ ${diffMins} دقيقة`
  } else if (diffHours < 24) {
    return `منذ ${diffHours} ساعة`
  } else if (diffDays < 7) {
    return `منذ ${diffDays} يوم`
  } else {
    return date.toLocaleDateString("ar-SA")
  }
}

function renderActivity(activities) {
  const listElement = document.getElementById("activityList")
  const emptyState = document.getElementById("emptyState")

  if (activities.length === 0) {
    listElement.innerHTML = ""
    emptyState.style.display = "block"
    return
  }

  emptyState.style.display = "none"

  listElement.innerHTML = activities
    .map(
      (item) => `
    <div class="card mb-2 fade-in">
      <div class="flex justify-between items-center mb-2">
        <h4>${item.service}</h4>
        ${getStatusBadge(item.status)}
      </div>
      
      <div class="flex gap-2 mb-2" style="font-size: 0.875rem;">
        <div class="flex items-center gap-1 text-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          ${formatDate(item.timestamp)}
        </div>
        
        <div class="flex items-center gap-1 text-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          ${item.location}
        </div>
      </div>
      
      <div style="padding: 0.75rem; background: var(--color-bg); border-radius: var(--radius); border: 1px solid var(--color-border);">
        <p class="text-secondary" style="font-size: 0.75rem; margin-bottom: 0.25rem;">Blockchain Hash</p>
        <p style="font-size: 0.75rem; font-family: monospace; word-break: break-all; color: var(--color-accent-cyan);">${item.blockchainHash}</p>
      </div>
    </div>
  `,
    )
    .join("")
}

function filterActivity() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase()
  const statusFilter = document.getElementById("statusFilter").value
  const dateFilter = document.getElementById("dateFilter").value

  let filtered = allActivity

  // Apply search filter
  if (searchTerm) {
    filtered = filtered.filter(
      (item) => item.service.toLowerCase().includes(searchTerm) || item.location.toLowerCase().includes(searchTerm),
    )
  }

  // Apply status filter
  if (statusFilter !== "all") {
    filtered = filtered.filter((item) => item.status === statusFilter)
  }

  // Apply date filter
  if (dateFilter !== "all") {
    const now = new Date()
    filtered = filtered.filter((item) => {
      const itemDate = new Date(item.timestamp)
      const diffDays = Math.floor((now - itemDate) / 86400000)

      switch (dateFilter) {
        case "today":
          return diffDays === 0
        case "week":
          return diffDays <= 7
        case "month":
          return diffDays <= 30
        default:
          return true
      }
    })
  }

  renderActivity(filtered)
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Load activity from localStorage or generate sample data
  const stored = localStorage.getItem("shadowid_activity")
  if (stored) {
    allActivity = JSON.parse(stored)
  }

  // Add sample data if empty
  if (allActivity.length === 0) {
    allActivity = generateSampleActivity()
    localStorage.setItem("shadowid_activity", JSON.stringify(allActivity))
  }

  renderActivity(allActivity)
})
