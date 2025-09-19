// repair.js
// จัดการงานแจ้งซ่อม (เพิ่ม, อัปเดตสถานะ, ลบ, แสดงรายการ)

// โหลดงานซ่อมทั้งหมด
async function loadRepairs() {
  try {
    const listEl = document.getElementById("repair-list");
    if (!listEl) return;

    const repairs = await apiGet("/repairs");
    listEl.innerHTML = "";

    if (!repairs || repairs.length === 0) {
      listEl.innerHTML = `<p>ยังไม่มีการแจ้งซ่อม</p>`;
      return;
    }

    repairs.forEach((r) => {
      const item = document.createElement("div");
      item.className = "data-list-item";
      item.innerHTML = `
        <div>
          <h4>${r.title}</h4>
          <p>${r.detail}</p>
          <small>วันที่: ${new Date(r.date).toLocaleString("th-TH")}</small><br>
          <span class="status-badge ${r.status}">${r.status}</span>
        </div>
        <div class="button-group">
          <button class="btn btn-sm btn-info" onclick="viewRepair('${r.id}')"><i class="fa fa-eye"></i></button>
          <button class="btn btn-sm btn-danger" onclick="deleteRepair('${r.id}')"><i class="fa fa-trash"></i></button>
        </div>
      `;
      listEl.appendChild(item);
    });
  } catch (err) {
    console.error("โหลดงานซ่อมล้มเหลว:", err);
    showNotification("โหลดงานซ่อมไม่สำเร็จ", "error");
  }
}

// เพิ่มการแจ้งซ่อมใหม่
async function handleAddRepair(e) {
  e.preventDefault();

  const title = document.getElementById("repair-title").value.trim();
  const detail = document.getElementById("repair-detail").value.trim();

  if (!title || !detail) {
    showNotification("กรุณากรอกข้อมูลให้ครบ", "error");
    return;
  }

  const result = await apiPost("/repairs", { title, detail });
  if (result && result.success) {
    showNotification("เพิ่มการแจ้งซ่อมสำเร็จ", "success");
    closeModal("modal-repair");
    loadRepairs();
  } else {
    showNotification(result?.message || "ไม่สามารถเพิ่มการแจ้งซ่อมได้", "error");
  }
}

// ดูรายละเอียดงานซ่อม
async function viewRepair(id) {
  const data = await apiGet(`/repairs/${id}`);
  if (!data) return;

  document.getElementById("view-repair-title").textContent = data.title;
  document.getElementById("view-repair-detail").textContent = data.detail;
  document.getElementById("view-repair-status").textContent = data.status;

  openModal("modal-view-repair");
}

// ลบงานซ่อม
async function deleteRepair(id) {
  if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบงานซ่อมนี้?")) return;

  const result = await apiDelete(`/repairs/${id}`);
  if (result && result.success) {
    showNotification("ลบงานซ่อมสำเร็จ", "success");
    loadRepairs();
  } else {
    showNotification(result?.message || "ไม่สามารถลบงานซ่อมได้", "error");
  }
}

// bind events เมื่อโหลด DOM
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("repair-form");
  if (form) form.addEventListener("submit", handleAddRepair);

  const repairsPage = document.querySelector('[data-include="pages/repair.html"]');
  if (repairsPage) {
    const observer = new MutationObserver(() => {
      if (repairsPage.style.display !== "none") {
        loadRepairs();
      }
    });
    observer.observe(repairsPage, { attributes: true, attributeFilter: ["style"] });
  }
});
