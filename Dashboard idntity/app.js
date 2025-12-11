// Region Data
const regions = [
    { id: 1, name: 'الرياض', usage: 95, congestion: 'عالي', users: 12450, lat: 24.7136, lng: 46.6753, size: 'large' },
    { id: 2, name: 'جدة', usage: 88, congestion: 'عالي', users: 10200, lat: 21.5433, lng: 39.1728, size: 'large' },
    { id: 3, name: 'الدمام', usage: 72, congestion: 'متوسط', users: 8300, lat: 26.4207, lng: 50.0888, size: 'medium' },
    { id: 4, name: 'مكة المكرمة', usage: 85, congestion: 'عالي', users: 9800, lat: 21.3891, lng: 39.8579, size: 'large' },
    { id: 5, name: 'المدينة المنورة', usage: 68, congestion: 'متوسط', users: 7500, lat: 24.5247, lng: 39.5692, size: 'medium' },
    { id: 6, name: 'الطائف', usage: 45, congestion: 'منخفض', users: 5200, lat: 21.2703, lng: 40.4158, size: 'small' },
    { id: 7, name: 'تبوك', usage: 35, congestion: 'منخفض', users: 3800, lat: 28.3838, lng: 36.5550, size: 'small' },
    { id: 8, name: 'أبها', usage: 42, congestion: 'منخفض', users: 4600, lat: 18.2164, lng: 42.5053, size: 'small' },
    { id: 9, name: 'حائل', usage: 38, congestion: 'منخفض', users: 4100, lat: 27.5236, lng: 41.6903, size: 'small' },
    { id: 10, name: 'جازان', usage: 52, congestion: 'متوسط', users: 5800, lat: 16.8892, lng: 42.5511, size: 'medium' },
    { id: 11, name: 'نجران', usage: 32, congestion: 'منخفض', users: 3200, lat: 17.4933, lng: 44.1277, size: 'small' },
    { id: 12, name: 'القصيم', usage: 58, congestion: 'متوسط', users: 6400, lat: 26.3266, lng: 43.9750, size: 'medium' },
];

// Alert Data
const multipleIdentityAlerts = [
    {
        id: 1,
        deviceId: 'DEV-8821',
        identities: ['1034567892', '1045678234', '1056789345', '1067890456', '1078901567'],
        timeframe: '15 دقيقة',
        location: 'الرياض',
        severity: 'حرج',
    },
    {
        id: 2,
        deviceId: 'DEV-1129',
        identities: ['1087654321', '1098765432', '1009876543'],
        timeframe: '45 دقيقة',
        location: 'الدمام',
        severity: 'عالي',
    },
    {
        id: 3,
        deviceId: 'DEV-7734',
        identities: ['1045678901', '1056789012', '1067890123', '1078901234'],
        timeframe: '1 ساعة',
        location: 'جدة',
        severity: 'عالي',
    },
    {
        id: 4,
        deviceId: 'DEV-4455',
        identities: ['1012345678', '1023456789'],
        timeframe: '2 ساعة',
        location: 'مكة',
        severity: 'متوسط',
    },
];

const multipleLocationAlerts = [
    {
        id: 1,
        identityId: '1098765432',
        locations: [
            { city: 'جدة', time: '14:30' },
            { city: 'مكة المكرمة', time: '15:10' },
        ],
        duration: '40 دقيقة',
        distance: '73 كم',
        severity: 'حرج',
    },
    {
        id: 2,
        identityId: '1056781234',
        locations: [
            { city: 'الطائف', time: '13:00' },
            { city: 'أبها', time: '13:45' },
        ],
        duration: '45 دقيقة',
        distance: '350 كم',
        severity: 'حرج',
    },
    {
        id: 3,
        identityId: '1023456780',
        locations: [
            { city: 'الرياض', time: '12:15' },
            { city: 'القصيم', time: '12:50' },
        ],
        duration: '35 دقيقة',
        distance: '330 كم',
        severity: 'عالي',
    },
    {
        id: 4,
        identityId: '1034567891',
        locations: [
            { city: 'الدمام', time: '11:00' },
            { city: 'الرياض', time: '12:30' },
        ],
        duration: '1 ساعة و 30 دقيقة',
        distance: '400 كم',
        severity: 'متوسط',
    },
];

// Global State
let currentTab = 'devices';
let currentFilter = 'all';
let map = null;

// Helper Functions
function getColor(usage) {
    if (usage > 80) return '#EF4444';
    if (usage > 60) return '#F97316';
    if (usage > 40) return '#FBBF24';
    return '#1C8354';
}

function getSize(size) {
    if (size === 'large') return 35;
    if (size === 'medium') return 25;
    return 18;
}

// Initialize Map
function initMap() {
    // Create map
    map = L.map('map', {
        center: [23.8859, 45.0792],
        zoom: 6,
        zoomControl: true,
        scrollWheelZoom: true,
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '',
    }).addTo(map);

    // Add regions as circles
    regions.forEach((region) => {
        const color = getColor(region.usage);
        const size = getSize(region.size);

        const circle = L.circleMarker([region.lat, region.lng], {
            radius: size,
            fillColor: color,
            color: '#FFFFFF',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.7,
        }).addTo(map);

        // Add popup
        circle.bindPopup(`
            <div style="font-family: Arial; text-align: right; direction: rtl;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px; color: #1F2A37;">${region.name}</div>
                <div style="font-size: 12px; color: #92989E; margin-bottom: 3px;">المستخدمين: <span style="color: #1C8354; font-weight: bold;">${region.users.toLocaleString()}</span></div>
                <div style="font-size: 12px; color: #92989E; margin-bottom: 3px;">نسبة الاستخدام: <span style="color: ${color}; font-weight: bold;">${region.usage}%</span></div>
                <div style="font-size: 12px; color: #92989E;">التكدس: <span style="font-weight: bold;">${region.congestion}</span></div>
            </div>
        `);

        // Highlight on hover
        circle.on('mouseover', function () {
            this.setStyle({
                fillOpacity: 1,
                weight: 3,
            });
        });

        circle.on('mouseout', function () {
            this.setStyle({
                fillOpacity: 0.7,
                weight: 2,
            });
        });
    });

    // Update total users
    const totalUsers = regions.reduce((sum, region) => sum + region.users, 0);
    document.getElementById('totalUsers').textContent = totalUsers.toLocaleString();
}

// Tab Switching
function switchTab(tab) {
    currentTab = tab;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Render alerts
    renderAlerts();
}

// Filter Alerts
function filterAlerts(filter) {
    currentFilter = filter;

    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Render alerts
    renderAlerts();
}

// Render Alerts
function renderAlerts() {
    const alertsContent = document.getElementById('alertsContent');

    if (currentTab === 'devices') {
        // Filter device alerts
        const filteredAlerts = multipleIdentityAlerts.filter(
            alert => currentFilter === 'all' || alert.severity === currentFilter
        );

        // Update count
        document.getElementById('devicesCount').textContent = filteredAlerts.length;

        // Render
        alertsContent.innerHTML = filteredAlerts.map(alert => `
            <div class="alert-item alert-item-device">
                <div class="alert-header">
                    <div class="alert-id-section">
                        <div class="alert-label">معرف الجهاز</div>
                        <div class="alert-id">${alert.deviceId}</div>
                    </div>
                    <span class="severity-badge severity-${alert.severity === 'حرج' ? 'critical' :
                alert.severity === 'عالي' ? 'high' : 'medium'
            }">
                        ${alert.severity}
                    </span>
                </div>
                
                <div class="alert-details">
                    <div class="alert-details-title">الهويات المستخدمة (${alert.identities.length}):</div>
                    <div class="identities-list">
                        ${alert.identities.map(identity => `
                            <div class="identity-item">${identity}</div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="alert-footer">
                    <div class="alert-footer-item">
                        <span class="alert-footer-label">الإطار الزمني:</span>
                        <span class="alert-footer-value">${alert.timeframe}</span>
                    </div>
                    <div class="alert-footer-location">${alert.location}</div>
                </div>
            </div>
        `).join('');
    } else {
        // Filter location alerts
        const filteredAlerts = multipleLocationAlerts.filter(
            alert => currentFilter === 'all' || alert.severity === currentFilter
        );

        // Update count
        document.getElementById('locationsCount').textContent = filteredAlerts.length;

        // Render
        alertsContent.innerHTML = filteredAlerts.map(alert => `
            <div class="alert-item alert-item-location">
                <div class="alert-header">
                    <div class="alert-id-section">
                        <div class="alert-label">رقم الهوية</div>
                        <div class="alert-id">${alert.identityId}</div>
                    </div>
                    <span class="severity-badge severity-${alert.severity === 'حرج' ? 'critical' :
                alert.severity === 'عالي' ? 'high' : 'medium'
            }">
                        ${alert.severity}
                    </span>
                </div>
                
                <div class="alert-details">
                    <div class="alert-details-title">المواقع المسجلة:</div>
                    <div class="locations-list">
                        ${alert.locations.map((loc, idx) => `
                            <div class="location-item">
                                <div class="location-info">
                                    <div class="location-number">${idx + 1}</div>
                                    <span class="location-city">${loc.city}</span>
                                </div>
                                <span class="location-time">${loc.time}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="alert-footer-grid">
                    <div class="alert-footer-card">
                        <span class="alert-footer-card-label">المدة الزمنية:</span>
                        <div class="alert-footer-card-value">${alert.duration}</div>
                    </div>
                    <div class="alert-footer-card">
                        <span class="alert-footer-card-label">المسافة:</span>
                        <div class="alert-footer-card-value">${alert.distance}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Generate Report
function generateReport() {
    const selectedDate = document.getElementById('reportDate').value;

    if (!selectedDate) {
        alert('الرجاء اختيار التاريخ');
        return;
    }

    // Show loading
    document.getElementById('reportPlaceholder').style.display = 'none';
    document.getElementById('reportLoading').style.display = 'flex';
    document.getElementById('reportContent').style.display = 'none';

    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    generateBtn.innerHTML = `
        <div style="width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <span>جاري الإعداد...</span>
    `;

    // Simulate report generation
    setTimeout(() => {
        const date = new Date(selectedDate);
        const report = generateReportContent(date);

        // Hide loading
        document.getElementById('reportLoading').style.display = 'none';

        // Show report
        const reportContent = document.getElementById('reportContent');
        reportContent.style.display = 'block';
        reportContent.innerHTML = `
            <div class="report-header">
                <div class="report-header-left">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <h3 class="report-header-title">التقرير الشامل</h3>
                </div>
                <div class="report-header-date">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>${date.toLocaleString('ar-SA')}</span>
                </div>
            </div>
            
            <div class="report-body">
                <pre class="report-text">${report}</pre>
            </div>
        `;

        // Reset button
        generateBtn.disabled = false;
        generateBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span>إنشاء التقرير</span>
        `;
    }, 2500);
}

// Generate Report Content
function generateReportContent(date) {
    const timestamp = date.toLocaleString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return `تقرير أمني شامل - حالة المملكة العربية السعودية
${timestamp}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 الملخص التنفيذي:
بناءً على التحليل الشامل للبيانات الواردة من جميع مناطق المملكة، يسر فريق التحليل الأمني تقديم هذا التقرير الذي يوضح الوضع الحالي. النظام يعمل بكفاءة عالية، والبيانات تشير إلى نشاط طبيعي ومتوازن عبر جميع المناطق.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🗺️ التوزيع الجغرافي للمناطق:

المناطق عالية الكثافة (75% - 100%):
• الر��اض: 12,450 مستخدم نشط - نسبة استخدام 95%
  - عدد الأجهزة المسجلة: 18,230 جهاز
  - الحالة: طبيعي - يتسق مع الكثافة السكانية العالية
  
• جدة: 10,200 مستخدم نشط - نسبة استخدام 88%
  - عدد الأجهزة المسجلة: 15,890 جهاز
  - الحالة: طبيعي - معدل استخدام متوازن
  
• مكة المكرمة: 9,800 مستخدم نشط - نسبة استخدام 85%
  - عدد الأجهزة المسجلة: 14,560 جهاز
  - الملاحظات: ارتفاع متوقع بسبب الحركة الدينية والسياحية
  
• الدمام: 8,900 مستخدم نشط - نسبة استخدام 78%
  - عدد الأجهزة المسجلة: 13,120 جهاز
  - الحالة: طبيعي ومستقر

المناطق متوسطة الكثافة (40% - 74%):
• المدينة المنورة: 7,200 مستخدم نشط - نسبة استخدام 65%
• الطائف: 5,800 مستخدم نشط - نسبة استخدام 58%
• القصيم: 4,900 مستخدم نشط - نسبة استخدام 52%
• حائل: 4,100 مستخدم نشط - نسبة استخدام 48%

المناطق منخفضة الكثافة (أقل من 40%):
• تبوك: 3,200 مستخدم نشط - نسبة استخدام 35%
• الجوف: 2,800 مستخدم نشط - نسبة استخدام 28%
• نجران: 2,400 مستخدم نشط - نسبة استخدام 24%
• جازان: 1,900 مستخم نشط - نسبة استخدام 18%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 الإحصائيات الإجمالية:

• إجمالي المستخدمين النشطين: 81,380 مستخدم
• إجمالي الأجهزة المسجلة: 124,560 جهاز
• إجمالي عمليات الدخول: 245,890 عملية
• عدد المناطق المغطاة: 12 منطقة
• متوسط نسبة الاستخدام العام: 59%
• أعلى نسبة استخدام: 95% (الرياض)
• أقل نسبة استخدام: 18% (جازان)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 الحالة الأمنية:

الأنماط غير الاعتيادية المرصودة:

• الأجهزة متعددة الاستخدام:
  - عدد الحالات: 8 هويات
  - الوصف: تم رصد 8 هويات تستخدم أكثر من 5 أجهزة مختلفة خلال آخر ساعتين
  - المناطق المتأثرة: الرياض (4 حالات)، الدمام (3 حالات)، جدة (1 حالة)
  - التقييم: معدل طبيعي - ضمن الحدود المقبولة

• الانتقال الجغرافي السريع:
  - عدد الحالات: 5 هويات
  - الوصف: تم رصد 5 هويات سجلت دخول من مدينتين مختلفتين خلال أقل من 60 دقيقة
  - الأمثلة:
    * الهوية #10***45: الرياض → جدة (42 دقيقة)
    * الهوية #10***89: الدمام → الرياض (38 دقيقة)
    * الهوية #10***23: مكة → الطائف (35 دقيقة)
    * الهوية #10***67: جدة → مكة (28 دقيقة)
    * الهوية #10***91: الرياض → القصيم (51 دقيقة)
  - التقييم: يُنصح بالمراجعة اليدوية

• التنبيهات النشطة: لا توجد تنبيهات عاجلة في الوقت الحالي
• مستوى الأمان العام: مرتفع ✓
• نسبة الحالات غير الاعتيادية: 0.016% من إجمالي المستخدمين
• آخر تحديث للبيانات: مباشر (Real-time)
• دقة البيانات: 99.8%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 التحليل الزمني:

• معدل الاستخدام في آخر ساعة: 81,380 مستخدم
• مقارنة مع الساعة السابقة: زيادة 2.3%
• الذروة اليومية: الساعة 11:00 صباحاً - 14:00 مساءً
• أقل نشاط: الساعة 02:00 - 05:00 صباحاً
• متوسط مدة الجلسة: 18 دقيقة
• معدل العمليات في الدقيقة: 4,098 عملية

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 التحليل التفصيلي للمناطق الرئيسية:

منطقة الرياض (الأعلى نشاطاً):
• إجمالي المستخدمين: 12,450 مستخدم (15.3% من إجمالي المملكة)
• عدد الأجهزة: 18,230 جهاز (متوسط 1.46 جهاز/مستخدم)
• أوقات الذروة: 10:00 ص - 3:00 م
• معدل النمو: +2.1% مقارنة بالأمس
• الحالة الأمنية: مستقرة - لا توجد تنبيهات

منطقة جدة:
• إجمالي المستخدمين: 10,200 مستخدم (12.5% من إجمالي المملكة)
• عدد الأجهزة: 15,890 جهاز (متوسط 1.56 جهاز/مستخدم)
• أوقات الذروة: 11:00 ص - 2:00 م
• معدل النمو: +1.8% مقارنة بالأمس
• الحالة الأمنية: مستقرة - لا توجد تنبيهات

منطقة مكة المكرمة:
• إجمالي المستخدمين: 9,800 مستخدم (12.0% من إجمالي المملكة)
• عدد الأجهزة: 14,560 جهاز (متوسط 1.49 جهاز/مستخدم)
• أوقات الذروة: 9:00 ص - 1:00 م، 5:00 م - 8:00 م
• معدل النمو: +3.5% مقارنة بالأمس (بسبب الحركة الدينية)
• الحالة الأمنية: مستقرة - لا توجد تنبيهات

منطقة الدمام:
• إجمالي المستخدمين: 8,900 مستخدم (10.9% من إجمالي المملكة)
• عدد الأجهزة: 13,120 جهاز (متوسط 1.47 جهاز/مستخدم)
• أوقات الذروة: 10:00 ص - 2:00 م
• معدل النمو: +1.5% مقارنة بالأمس
• الحالة الأمنية: مستقرة - 3 حالات انتقال سريع تحت المراجعة

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ الخلاصة والتوصيات:

الوضع الأمني العام: مستقر وآمن
جميع المؤشرات تدل على أن النظام يعمل بكفاءة عالية والبيانات متسقة مع الأنماط التاريخية. التوزيع الجغرافي طبيعي ويعكس الكثافة السكانية في كل منطقة.

التوصيات:
1. مواصلة المراقبة المستمرة لجميع المناطق
2. مراجعة يدوية للحالات الـ 5 المتعلقة بالانتقال الجغرافي السريع
3. الحفاظ على تحديث البيانات بشكل لحظي
4. مراجعة دورية للمناطق ذات الكثافة المنخفضة لضمان التغطية
5. تقرير المتابعة القادم: بعد 6 ساعات

الإجراءات المقترحة:
• تفعيل التنبيهات الفورية عند تكرار أنماط الانتقال السريع
• رفع مستوى المراقبة على منطقة الدمام خلال الـ 24 ساعة القادمة
• التواصل مع أصحاب الهويات المشبوهة للتحقق من صحة الاستخدام

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

تم إعداد هذا التقرير آلياً بواسطة نظام التحليل الذكي
وزارة الداخلية - المملكة العربية السعودية
قسم الأمن السيبراني والمراقبة`;
}

// Show Notifications
function showNotifications() {
    alert('تم رصد 7 تنبيهات جديدة:\n\n• 4 حالات هويات متعددة\n• 3 حالات مناطق متعددة\n\nالرجاء مراجعة قسم التنبيهات الأمنية');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reportDate').value = today;

    // Initialize map
    initMap();

    // Initialize alerts
    renderAlerts();

    // Update alert counts initially
    document.getElementById('devicesCount').textContent = multipleIdentityAlerts.length;
    document.getElementById('locationsCount').textContent = multipleLocationAlerts.length;
});
