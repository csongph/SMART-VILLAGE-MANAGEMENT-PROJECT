// bills.js
// จัดการใบแจ้งหนี้

// โหลดบิลทั้งหมด
async function loadBills() {
  try {
    const listEl = document.getElementById("bill-list");
    if (!listEl) return;

    const bills = await apiGet("/bills");
    listEl.innerHTML = "";

    if (!bills || bills.length === 0) {
      listEl.innerHTML = `<p>ยังไม่มีใบแจ้งหนี้</p>`;
      return;
    }

    bills.forEach((b) => {
      const item = document.createElement("div");
      item.className = "data-list-item";
      item.innerHTML = `
        <div>
          <h4>${b.title}</h4>
          <p>จำนวนเงิน: ${b.amount} บาท</p>
          <small>ครบกำหนด: ${new Date(b.due_date).toLocaleDateString("th-TH")}</small><br>
          <span class="status-badge ${b.status}">${b.status}</span>
        </div>
        <div class="button-group">
          <button class="btn btn-sm btn-info" onclick="viewBill('${b.id}')"><i class="fa fa-eye"></i></button>
          <button class="btn btn-sm btn-danger" onclick="deleteBill('${b.id}')"><i class="fa fa-trash"></i></button>
        </div>
      `;
      listEl.appendChild(item);
    });
  } catch (err) {
    console.error("โหลดบิลล้มเหลว:", err);
    showNotification("โหลดใบแจ้งหนี้ไม่สำเร็จ", "error");
  }
}

// เพิ่มบิลใหม่
async function handleAddBill(e) {
  e.preventDefault();

  const title = document.getElementById("bill-title").value.trim();
  const amount = document.getElementById("bill-amount").value;
  const dueDate = document.getElementById("bill-due-date").value;

  if (!title || !amount || !dueDate) {
    showNotification("กรุณากรอกข้อมูลให้ครบ", "error");
    return;
  }

  const result = await apiPost("/bills", { title, amount, due_date: dueDate });
  if (result && result.success) {
    showNotification("เพิ่มใบแจ้งหนี้สำเร็จ", "success");
    closeModal("modal-bill");
    loadBills();
  } else {
    showNotification(result?.message || "ไม่สามารถเพิ่มใบแจ้งหนี้ได้", "error");
  }
}

// ดูรายละเอียดบิล
async function viewBill(id) {
  const data = await apiGet(`/bills/${id}`);
  if (!data) return;

  document.getElementById("view-bill-title").textContent = data.title;
  document.getElementById("view-bill-amount").textContent = `${data.amount} บาท`;
  document.getElementById("view-bill-status").textContent = data.status;

  openModal("modal-view-bill");
}

// ลบบิล
async function deleteBill(id) {
  if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบใบแจ้งหนี้นี้?")) return;

  const result = await apiDelete(`/bills/${id}`);
  if (result && result.success) {
    showNotification("ลบใบแจ้งหนี้สำเร็จ", "success");
    loadBills();
  } else {
    showNotification(result?.message || "ไม่สามารถลบใบแจ้งหนี้ได้", "error");
  }
}

// bind events
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("bill-form");
  if (form) form.addEventListener("submit", handleAddBill);

  const billsPage = document.querySelector('[data-include="pages/bills.html"]');
  if (billsPage) {
    const observer = new MutationObserver(() => {
      if (billsPage.style.display !== "none") {
        loadBills();
      }
    });
    observer.observe(billsPage, { attributes: true, attributeFilter: ["style"] });
  }
});
