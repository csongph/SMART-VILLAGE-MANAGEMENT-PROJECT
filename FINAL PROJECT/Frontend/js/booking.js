// booking.js
// จัดการการจองพื้นที่ส่วนกลาง

// โหลดการจองทั้งหมด
async function loadBookings() {
  try {
    const listEl = document.getElementById("booking-list");
    if (!listEl) return;

    const bookings = await apiGet("/bookings");
    listEl.innerHTML = "";

    if (!bookings || bookings.length === 0) {
      listEl.innerHTML = `<p>ยังไม่มีการจอง</p>`;
      return;
    }

    bookings.forEach((b) => {
      const item = document.createElement("div");
      item.className = "data-list-item";
      item.innerHTML = `
        <div>
          <h4>${b.title}</h4>
          <p>วันที่: ${new Date(b.date).toLocaleDateString("th-TH")}</p>
          <span class="status-badge ${b.status}">${b.status}</span>
        </div>
        <div class="button-group">
          <button class="btn btn-sm btn-info" onclick="viewBooking('${b.id}')"><i class="fa fa-eye"></i></button>
          <button class="btn btn-sm btn-danger" onclick="deleteBooking('${b.id}')"><i class="fa fa-trash"></i></button>
        </div>
      `;
      listEl.appendChild(item);
    });
  } catch (err) {
    console.error("โหลดการจองล้มเหลว:", err);
    showNotification("โหลดการจองไม่สำเร็จ", "error");
  }
}

// เพิ่มการจอง
async function handleAddBooking(e) {
  e.preventDefault();

  const title = document.getElementById("booking-title").value.trim();
  const date = document.getElementById("booking-date").value;

  if (!title || !date) {
    showNotification("กรุณากรอกข้อมูลให้ครบ", "error");
    return;
  }

  const result = await apiPost("/bookings", { title, date });
  if (result && result.success) {
    showNotification("เพิ่มการจองสำเร็จ", "success");
    closeModal("modal-booking");
    loadBookings();
  } else {
    showNotification(result?.message || "ไม่สามารถเพิ่มการจองได้", "error");
  }
}

// ดูรายละเอียดการจอง
async function viewBooking(id) {
  const data = await apiGet(`/bookings/${id}`);
  if (!data) return;

  document.getElementById("view-booking-title").textContent = data.title;
  document.getElementById("view-booking-date").textContent = new Date(data.date).toLocaleString("th-TH");
  document.getElementById("view-booking-status").textContent = data.status;

  openModal("modal-view-booking");
}

// ลบการจอง
async function deleteBooking(id) {
  if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบการจองนี้?")) return;

  const result = await apiDelete(`/bookings/${id}`);
  if (result && result.success) {
    showNotification("ลบการจองสำเร็จ", "success");
    loadBookings();
  } else {
    showNotification(result?.message || "ไม่สามารถลบการจองได้", "error");
  }
}

// bind events
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("booking-form");
  if (form) form.addEventListener("submit", handleAddBooking);

  const bookingPage = document.querySelector('[data-include="pages/booking.html"]');
  if (bookingPage) {
    const observer = new MutationObserver(() => {
      if (bookingPage.style.display !== "none") {
        loadBookings();
      }
    });
    observer.observe(bookingPage, { attributes: true, attributeFilter: ["style"] });
  }
});
