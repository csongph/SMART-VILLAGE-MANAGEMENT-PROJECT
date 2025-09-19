// dashboard.js
// จัดการหน้า Dashboard (สถิติและข้อมูลสรุป)

// โหลดข้อมูล Dashboard
async function loadDashboard() {
  try {
    const data = await apiGet("/dashboard");
    if (!data) return;

    // อัปเดตตัวเลขการ์ด
    updateCard("card-announcements", data.announcements || 0);
    updateCard("card-repairs", data.repairs || 0);
    updateCard("card-bookings", data.bookings || 0);
    updateCard("card-bills", data.bills || 0);

    // วาดกราฟ
    renderDashboardChart(data.stats || {});
  } catch (err) {
    console.error("โหลดข้อมูล Dashboard ไม่สำเร็จ:", err);
  }
}

// อัปเดตตัวเลขบนการ์ด
function updateCard(id, value) {
  const el = document.getElementById(id);
  if (el) {
    const numberEl = el.querySelector(".card-number");
    if (numberEl) numberEl.textContent = value;
  }
}

// วาดกราฟด้วย Chart.js
function renderDashboardChart(stats) {
  const ctx = document.getElementById("dashboardChart");
  if (!ctx) return;

  // ทำลาย chart เดิมถ้ามี
  if (window.dashboardChart) {
    window.dashboardChart.destroy();
  }

  window.dashboardChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["ประกาศ", "แจ้งซ่อม", "จองพื้นที่", "บิล"],
      datasets: [
        {
          label: "จำนวน",
          data: [
            stats.announcements || 0,
            stats.repairs || 0,
            stats.bookings || 0,
            stats.bills || 0
          ],
          backgroundColor: [
            "#007bff",
            "#28a745",
            "#ffc107",
            "#dc3545"
          ]
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}

// โหลด Dashboard เมื่อเปลี่ยนไปที่หน้า dashboard
document.addEventListener("DOMContentLoaded", () => {
  const dashboardPage = document.querySelector('[data-include="pages/dashboard.html"]');
  if (dashboardPage) {
    // ใช้ observer ตรวจว่า dashboard ถูกแสดงหรือยัง
    const observer = new MutationObserver(() => {
      if (dashboardPage.style.display !== "none") {
        loadDashboard();
      }
    });
    observer.observe(dashboardPage, { attributes: true, attributeFilter: ["style"] });
  }
});
