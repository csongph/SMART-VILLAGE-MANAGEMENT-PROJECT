// users.js
// จัดการผู้ใช้ (แสดงรายชื่อ, เปลี่ยนสถานะ, ลบ)

// โหลดผู้ใช้ทั้งหมด
async function loadUsers() {
  try {
    const listEl = document.getElementById("user-list");
    if (!listEl) return;

    const users = await apiGet("/users");
    listEl.innerHTML = "";

    if (!users || users.length === 0) {
      listEl.innerHTML = `<p>ยังไม่มีผู้ใช้</p>`;
      return;
    }

    users.forEach((u) => {
      const item = document.createElement("div");
      item.className = "data-list-item";
      item.innerHTML = `
        <div>
          <h4>${u.username}</h4>
          <p>อีเมล: ${u.email}</p>
          <span class="status-badge ${u.status}">${u.status}</span>
        </div>
        <div class="button-group">
          <button class="btn btn-sm btn-secondary" onclick="toggleUserStatus('${u.id}', '${u.status}')"><i class="fa fa-toggle-on"></i></button>
          <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')"><i class="fa fa-trash"></i></button>
        </div>
      `;
      listEl.appendChild(item);
    });
  } catch (err) {
    console.error("โหลดผู้ใช้ล้มเหลว:", err);
    showNotification("โหลดผู้ใช้ไม่สำเร็จ", "error");
  }
}

// เปลี่ยนสถานะผู้ใช้
async function toggleUserStatus(id, currentStatus) {
  const newStatus = currentStatus === "active" ? "inactive" : "active";
  const result = await apiPut(`/users/${id}`, { status: newStatus });
  if (result && result.success) {
    showNotification("เปลี่ยนสถานะผู้ใช้สำเร็จ", "success");
    loadUsers();
  } else {
    showNotification(result?.message || "ไม่สามารถเปลี่ยนสถานะได้", "error");
  }
}

// ลบผู้ใช้
async function deleteUser(id) {
  if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้นี้?")) return;

  const result = await apiDelete(`/users/${id}`);
  if (result && result.success) {
    showNotification("ลบผู้ใช้สำเร็จ", "success");
    loadUsers();
  } else {
    showNotification(result?.message || "ไม่สามารถลบผู้ใช้ได้", "error");
  }
}

// bind events
document.addEventListener("DOMContentLoaded", () => {
  const usersPage = document.querySelector('[data-include="pages/users.html"]');
  if (usersPage) {
    const observer = new MutationObserver(() => {
      if (usersPage.style.display !== "none") {
        loadUsers();
      }
    });
    observer.observe(usersPage, { attributes: true, attributeFilter: ["style"] });
  }
});
