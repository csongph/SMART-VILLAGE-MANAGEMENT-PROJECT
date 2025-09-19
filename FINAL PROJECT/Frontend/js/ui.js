// ui.js
// ฟังก์ชันที่เกี่ยวกับ UI เช่น modal, notification

// เปิด modal
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "flex";
}

// ปิด modal
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = "none";
}

// ปิด modal เมื่อคลิกนอกเนื้อหา
window.addEventListener("click", function (event) {
  document.querySelectorAll(".modal").forEach((modal) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });
});

// แสดง Notification
function showNotification(message, type = "info") {
  const containerId = "notification-container";
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.className = "notification-container";
    document.body.appendChild(container);
  }

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button class="close-btn">&times;</button>
  `;

  // ปิดเมื่อกดปุ่ม
  notification.querySelector(".close-btn").addEventListener("click", () => {
    notification.remove();
  });

  container.appendChild(notification);

  // auto remove
  setTimeout(() => {
    notification.remove();
  }, 4000);
}

// toggle sidebar (มือถือ)
function toggleSidebar() {
  document.body.classList.toggle("sidebar-expanded");
}
