// ==========================
// GLOBAL STATE
// ==========================
let currentUser = null; // { username, role, name }

// ==========================
// UTILITIES
// ==========================
function getEl(id) {
    return document.getElementById(id);
}

function showElement(id) {
    const el = getEl(id);
    if (el) el.classList.remove('hidden');
}

function hideElement(id) {
    const el = getEl(id);
    if (el) el.classList.add('hidden');
}

function resetForm(id) {
    const form = getEl(id);
    if (form) form.reset();
}

function alertMissingFields(fields) {
    alert(`โปรดกรอกข้อมูล ${fields} ให้ครบถ้วน`);
}

// ==========================
// PAGE HANDLING
// ==========================
function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(page => page.classList.add('hidden'));
    showElement(pageId);

    // Highlight active menu
    document.querySelectorAll('.sidebar-menu a').forEach(link => link.classList.remove('active'));
    const activeLink = document.querySelector(`.sidebar-menu a[onclick*="showPage('${pageId}')"]`);
    if (activeLink) activeLink.classList.add('active');

    // Auto-close sidebar on mobile
    if (window.innerWidth <= 768) {
        getEl('sidebar')?.classList.remove('show');
    }
}

// ==========================
// LOGIN / REGISTER
// ==========================
function handleLogin(event) {
    event.preventDefault();
    const username = getEl('username').value;
    const password = getEl('password').value;
    const rememberMe = getEl('rememberMe').checked;

    if (!username || !password) return alertMissingFields('ชื่อผู้ใช้และรหัสผ่าน');

    if (username === 'admin' && password === 'admin') {
        currentUser = { username, role: 'admin', name: 'ผู้ดูแลระบบ' };
    } else if (username === 'resident' && password === 'resident') {
        currentUser = { username, role: 'resident', name: 'คุณสมชาย ใจดี' };
    } else {
        return alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!');
    }

    alert(`เข้าสู่ระบบสำเร็จในฐานะ ${currentUser.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้อยู่อาศัย'}`);
    hideElement('loginPage');
    showElement('dashboard');
    updateDashboardUI();
    showPage('dashboard-home');

    if (rememberMe) {
        localStorage.setItem('rememberedUser', JSON.stringify({ username, password }));
    } else {
        localStorage.removeItem('rememberedUser');
    }
}

function handleRegister(event) {
    event.preventDefault();
    const username = getEl('regUsername').value;
    const email = getEl('regEmail').value;
    const password = getEl('regPassword').value;
    const confirm = getEl('regConfirmPassword').value;

    if (!username || !email || !password || !confirm) return alertMissingFields('การลงทะเบียน');
    if (password !== confirm) return alert('รหัสผ่านไม่ตรงกัน!');

    alert('ส่งคำขอลงทะเบียนเรียบร้อยแล้ว (จำลอง)');
    showLogin();
    resetForm('registerForm');
}

function showLogin() {
    hideElement('registerPage');
    showElement('loginPage');
}

function showRegister() {
    hideElement('loginPage');
    showElement('registerPage');
}

function logout() {
    currentUser = null;
    alert('ออกจากระบบแล้ว');
    showLogin();
    hideElement('dashboard');
    ['loginForm', 'profileForm', 'changePasswordForm', 'repairForm', 'bookingForm'].forEach(resetForm);

    document.querySelectorAll('.admin-menu').forEach(menu => menu.classList.add('hidden'));
    document.querySelectorAll('.resident-menu').forEach(menu => menu.classList.remove('hidden'));
    localStorage.removeItem('rememberedUser');
}

function updateDashboardUI() {
    if (!currentUser) return;

    getEl('userName').textContent = currentUser.name;
    getEl('userRole').textContent = currentUser.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้อยู่อาศัย';
    getEl('userAvatar').textContent = currentUser.name.charAt(0);

    const isAdmin = currentUser.role === 'admin';
    document.querySelectorAll('.admin-menu').forEach(menu => menu.classList.toggle('hidden', !isAdmin));
    document.querySelectorAll('.resident-menu').forEach(menu => menu.classList.toggle('hidden', isAdmin));
}

// ==========================
// INIT (DOM LOADED)
// ==========================
function init() {
    showLogin();

    const remembered = localStorage.getItem('rememberedUser');
    if (remembered) {
        const { username, password } = JSON.parse(remembered);
        getEl('username').value = username;
        getEl('password').value = password;
        getEl('rememberMe').checked = true;
    }

    getEl('loginForm')?.addEventListener('submit', handleLogin);
    getEl('registerForm')?.addEventListener('submit', handleRegister);
    getEl('sidebarToggle')?.addEventListener('click', () => getEl('sidebar')?.classList.toggle('show'));

    // Forms
    setupFormEvents();
    setupAdminButtonEvents();
    setupPaymentModalEvents();
}
document.addEventListener('DOMContentLoaded', init);

// ==========================
// FORM HANDLERS
// ==========================
function setupFormEvents() {
    getEl('profileForm')?.addEventListener('submit', e => {
        e.preventDefault();
        alert('ข้อมูลส่วนตัวถูกบันทึกแล้ว! (จำลอง)');
    });

    getEl('changePasswordForm')?.addEventListener('submit', e => {
        e.preventDefault();
        const curr = getEl('currentPassword').value;
        const newP = getEl('newPassword').value;
        const confirm = getEl('confirmNewPassword').value;
        if (!curr || !newP || !confirm) return alertMissingFields('รหัสผ่าน');
        if (newP !== confirm) return alert('รหัสผ่านใหม่ไม่ตรงกัน!');
        alert('เปลี่ยนรหัสผ่านสำเร็จ! (จำลอง)');
        resetForm('changePasswordForm');
    });

    getEl('repairForm')?.addEventListener('submit', e => {
        e.preventDefault();
        const item = getEl('repairItem').value;
        const desc = getEl('repairDesc').value;
        const date = getEl('repairDate').value;
        const time = getEl('repairTime').value;
        if (!item || !desc || !date || !time) return alertMissingFields('แจ้งซ่อม');
        alert('ส่งคำขอแจ้งซ่อมแล้ว! (จำลอง)');
        resetForm('repairForm');
    });

    getEl('bookingForm')?.addEventListener('submit', e => {
        e.preventDefault();
        const area = getEl('bookingArea').value;
        const date = getEl('bookingDate').value;
        const time = getEl('bookingTime').value;
        const purpose = getEl('bookingPurpose').value;
        if (!area || !date || !time || !purpose) return alertMissingFields('การจองพื้นที่');
        alert('ส่งคำขอจองพื้นที่สำเร็จ! (จำลอง)');
        resetForm('bookingForm');
    });

    getEl('paymentForm')?.addEventListener('submit', e => {
        e.preventDefault();
        const billId = getEl('paymentBillId').value;
        const item = getEl('paymentItem').value;
        const amount = getEl('paymentAmount').value;
        const method = getEl('paymentMethod').value;
        const ref = getEl('paymentRef').value;
        if (!billId || !item || !amount || !method || !ref) return alertMissingFields('การชำระเงิน');
        alert(`ยืนยันการชำระเงินสำหรับบิล ${billId} (${item}) จำนวน ${amount} ผ่าน ${method
