async function loadSettings() {
  try {
    const response = await fetch("/api/mobile/user/settings", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (data.success && data.settings) {
      const settings = data.settings;

      const autoLockEl = document.getElementById("autoLock");
      const hidePreviewEl = document.getElementById("hidePreview");
      const ghostModeEl = document.getElementById("ghostMode");

      if (autoLockEl) {
        autoLockEl.checked = settings.autoLock === "true" || false;
      }
      if (hidePreviewEl) {
        hidePreviewEl.checked = settings.hidePreview === "true" || false;
      }
      if (ghostModeEl) {
        ghostModeEl.checked = settings.ghostMode === "true" || false;
      }
    }
  } catch (error) {
    console.error("Error loading settings:", error);

    const settings = JSON.parse(
      localStorage.getItem("shadowid_settings") || "{}"
    );
    document.getElementById("autoLock").checked = settings.autoLock || false;
    document.getElementById("hidePreview").checked =
      settings.hidePreview || false;
    document.getElementById("ghostMode").checked = settings.ghostMode || false;
  }
}

window.saveSetting = async function (key, value) {
  try {
    const response = await fetch(`/api/mobile/user/settings/${key}`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: String(value) }),
    });

    const data = await response.json();

    if (data.success) {
      console.log(`Setting ${key} updated to ${value}`);
    } else {
      console.error("Failed to save setting:", data.error);

      const settings = JSON.parse(
        localStorage.getItem("shadowid_settings") || "{}"
      );
      settings[key] = value;
      localStorage.setItem("shadowid_settings", JSON.stringify(settings));
    }
  } catch (error) {
    console.error("Error saving setting:", error);

    const settings = JSON.parse(
      localStorage.getItem("shadowid_settings") || "{}"
    );
    settings[key] = value;
    localStorage.setItem("shadowid_settings", JSON.stringify(settings));
  }
};

window.requestData = async function (type) {
  const messages = {
    delete:
      "سيتم معالجة طلب حذف البيانات خلال 30 يوماً وفقاً لنظام حماية البيانات الشخصية (PDPL)",
    correction: "سيتم مراجعة طلب تصحيح البيانات خلال 7 أيام",
    export: "سيتم إرسال نسخة من بياناتك إلى بريدك الإلكتروني خلال 48 ساعة",
  };

  if (confirm(`${messages[type]}\n\nهل تريد المتابعة؟`)) {
    try {
      const response = await fetch(`/api/mobile/user/data-request/${type}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        if (type === "export") {
          const dataStr = JSON.stringify(data.data, null, 2);
          const dataBlob = new Blob([dataStr], { type: "application/json" });
          const url = URL.createObjectURL(dataBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `shadowid-export-${data.requestId}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          alert(`تم تصدير البيانات بنجاح\nرقم الطلب: ${data.requestId}`);
        } else {
          alert(
            `${data.message || "تم إرسال الطلب بنجاح"}\nرقم الطلب: ${
              data.requestId
            }`
          );
        }
      } else {
        alert(`فشل إرسال الطلب: ${data.error || "خطأ غير معروف"}`);
      }
    } catch (error) {
      console.error("Error processing data request:", error);
      alert("حدث خطأ أثناء معالجة الطلب");
    }
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await requireAuth())) return;
  await loadSettings();
});
