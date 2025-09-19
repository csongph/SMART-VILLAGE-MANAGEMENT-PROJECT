// -------------------------------
// ฟังก์ชันควบคุมการแสดงหน้า
// -------------------------------
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const page = document.getElementById(pageId);
  if (page) page.classList.add("active");
}

function showLogin() { showPage("login-page"); }
function showRegister() { showPage("register-page"); }
function showDashboard() { showPage("dashboard-page"); }

// -------------------------------
// Authentication
// -------------------------------

// ตัวอย่าง API base (แก้ตาม backend ของคุณ)
const API_BASE = "http://localhost:5000/api";

// จัดการ login
async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const resp = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await resp.json();
    if (resp.ok) {
      sessionStorage.setItem("user", JSON.stringify(data.user));
      showDashboard();
      showNotification("เข้าสู่ระบบสำเร็จ", "success");
    } else {
      showNotification(data.message || "เข้าสู่ระบบล้มเหลว", "error");
    }
  } catch (err) {
    console.error("Login error:", err);
    showNotification("เกิดข้อผิดพลาด", "error");
  }
}

// จัดการ register
async function handleRegister(event) {
  event.preventDefault();
  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;

  try {
    const resp = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    const data = await resp.json();
    if (resp.ok) {
      showNotification("สมัครสมาชิกสำเร็จ โปรดเข้าสู่ระบบ", "success");
      showLogin();
    } else {
      showNotification(data.message || "สมัครสมาชิกไม่สำเร็จ", "error");
    }
  } catch (err) {
    console.error("Register error:", err);
    showNotification("เกิดข้อผิดพลาด", "error");
  }
}

// ออกจากระบบ
function logout() {
  sessionStorage.removeItem("user");
  showLogin();
  showNotification("ออกจากระบบเรียบร้อย", "info");
}

// -------------------------------
// Event Binding
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // ตรวจสอบสถานะผู้ใช้ตอนโหลดเว็บ
  const user = sessionStorage.getItem("user");
  if (user) {
    showDashboard();
  } else {
    showLogin();
  }

  // bind form events (ถ้ามี form)
  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  const registerForm = document.getElementById("register-form");
  if (registerForm) registerForm.addEventListener("submit", handleRegister);

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);
});
