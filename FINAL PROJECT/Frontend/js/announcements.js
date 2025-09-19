// announcements.js
// จัดการประกาศ (เพิ่ม, ลบ, แก้ไข, แสดงรายการ)

// โหลดประกาศทั้งหมด
async function loadAnnouncements() {
  try {
    const listEl = document.getElementById("announcement-list");
    if (!listEl) return;

    const announcements = await apiGet("/announcements");
    listEl.innerHTML = "";

    if (!announcements || announcements.length === 0) {
      listEl.innerHTML = `<p>ยังไม่มีประกาศ</p>`;
      return;
    }

    announcements.forEach((a) => {
      const item = document.createElement("div");
      item.className = "data-list-item";
      item.innerHTML = `
        <div>
          <h4>${a.title}</h4>
          <p>${a.content}</p>
          <small>${new Date(a.date).toLocaleString("th-TH")}</small>
        </div>
        <div class="button-group">
          <button class="btn btn-sm btn-info" onclick="openEditAnnouncement('${a.id}')"><i class="fa fa-edit"></i></button>
          <button class="btn btn-sm btn-danger" onclick="deleteAnnouncement('${a.id}')"><i class="fa fa-trash"></i></button>
        </div>
      `;
      listEl.appendChild(item);
    });
  } catch (err) {
    console.error("โหลดประกาศล้มเหลว:", err);
    showNotification("โหลดประกาศไม่สำเร็จ", "error");
  }
}

// เพิ่มประกาศใหม่
async function handleAddAnnouncement(e) {
  e.preventDefault();

  const title = document.getElementById("announcement-title").value.trim();
  const content = document.getElementById("announcement-content").value.trim();

  if (!title || !content) {
    showNotification("กรุณากรอกข้อมูลให้ครบ", "error");
    return;
  }

  const result = await apiPost("/announcements", { title, content });
  if (result && result.success) {
    showNotification("เพิ่มประกาศสำเร็จ", "success");
    closeModal("modal-announcement");
    loadAnnouncements();
  } else {
    showNotification(result?.message || "ไม่สามารถเพิ่มประกาศได้", "error");
  }
}

// เปิดแก้ไขประกาศ
async function openEditAnnouncement(id) {
  const data = await apiGet(`/announcements/${id}`);
  if (!data) return;

  document.getElementById("announcement-title").value = data.title;
  document.getElementById("announcement-content").value = data.content;

  const form = document.getElementById("announcement-form");
  form.onsubmit = (e) => handleUpdateAnnouncement(e, id);

  openModal("modal-announcement");
}

// อัปเดตประกาศ
async function handleUpdateAnnouncement(e, id) {
  e.preventDefault();

  const title = document.getElementById("announcement-title").value.trim();
  const content = document.getElementById("announcement-content").value.trim();

  const result = await apiPut(`/announcements/${id}`, { title, content });
  if (result && result.success) {
    showNotification("อัปเดตประกาศสำเร็จ", "success");
    closeModal("modal-announcement");
    loadAnnouncements();
  } else {
    showNotification(result?.message || "ไม่สามารถอัปเดตประกาศได้", "error");
  }
}

// ลบประกาศ
async function deleteAnnouncement(id) {
  if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบประกาศนี้?")) return;

  const result = await apiDelete(`/announcements/${id}`);
  if (result && result.success) {
    showNotification("ลบประกาศสำเร็จ", "success");
    loadAnnouncements();
  } else {
    showNotification(result?.message || "ไม่สามารถลบประกาศได้", "error");
  }
}

// bind events เมื่อโหลด DOM
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("announcement-form");
  if (form) form.addEventListener("submit", handleAddAnnouncement);

  const announcementsPage = document.querySelector('[data-include="pages/announcements.html"]');
  if (announcementsPage) {
    const observer = new MutationObserver(() => {
      if (announcementsPage.style.display !== "none") {
        loadAnnouncements();
      }
    });
    observer.observe(announcementsPage, { attributes: true, attributeFilter: ["style"] });
  }
});
