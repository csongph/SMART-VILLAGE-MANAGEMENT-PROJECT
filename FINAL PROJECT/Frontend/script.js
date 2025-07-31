// Dummy user data (replace with actual backend integration)
let currentUser = null; // { username: 'admin', role: 'admin', name: 'ผู้ดูแลระบบ' } or { username: 'resident01', role: 'resident', name: 'คุณสมชาย ใจดี' }

// Function to show/hide pages
function showPage(pageId) {
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.add('hidden');
    });
    document.getElementById(pageId).classList.remove('hidden');

    // Update active sidebar link
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });

    // --- แก้ไขข้อผิดพลาด Uncaught Error ที่นี่ ---
    // ตรวจสอบให้แน่ใจว่า activeLink ถูกพบก่อนที่จะพยายามเพิ่มคลาส 'active'
    const activeLink = document.querySelector(`.sidebar-menu a[onclick*="showPage('${pageId}')"]`);
    if (activeLink) { // เพิ่มการตรวจสอบ null/undefined ที่นี่
        activeLink.classList.add('active');
    }
    // --- สิ้นสุดการแก้ไข ---


    // Close sidebar on mobile if it's open (for better UX)
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('show');
    }
}

// Login/Logout functions
function showLogin() {
    document.getElementById('registerPage').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
}

function showRegister() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('registerPage').classList.remove('hidden');
}

function showForgotPassword() {
    alert('คุณสามารถติดต่อผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่านของคุณ (ฟังก์ชันนี้ต้องการ Backend)');
    // In a real application, this would redirect to a "forgot password" page or open a modal.
}

document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    // Basic validation
    if (!username || !password) {
        alert('โปรดระบุชื่อผู้ใช้และรหัสผ่าน');
        return;
    }

    // Dummy login logic (replace with actual backend API call)
    if (username === 'admin' && password === 'admin') {
        currentUser = { username: 'admin', role: 'admin', name: 'ผู้ดูแลระบบ' };
        alert('เข้าสู่ระบบสำเร็จในฐานะผู้ดูแลระบบ!');
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        updateDashboardUI();
        showPage('dashboard-home'); // Redirect to dashboard home after login
    } else if (username === 'resident' && password === 'resident') {
        currentUser = { username: 'resident', role: 'resident', name: 'คุณสมชาย ใจดี' };
        alert('เข้าสู่ระบบสำเร็จในฐานะผู้อยู่อาศัย!');
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        updateDashboardUI();
        showPage('dashboard-home'); // Redirect to dashboard home after login
    } else {
        alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!');
    }

    // Remember Me functionality
    if (rememberMe) {
        localStorage.setItem('rememberedUser', JSON.stringify({ username, password }));
    } else {
        localStorage.removeItem('rememberedUser');
    }
});

document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const regUsername = document.getElementById('regUsername').value;
    const regEmail = document.getElementById('regEmail').value;
    const regPassword = document.getElementById('regPassword').value;
    const regConfirmPassword = document.getElementById('regConfirmPassword').value;

    // Basic validation
    if (!regUsername || !regEmail || !regPassword || !regConfirmPassword) {
        alert('โปรดกรอกข้อมูลการลงทะเบียนให้ครบถ้วน');
        return;
    }

    if (regPassword !== regConfirmPassword) {
        alert('รหัสผ่านไม่ตรงกัน!');
        return;
    }
    alert('ส่งคำขอลงทะเบียนเรียบร้อยแล้ว! โปรดรอการอนุมัติจากผู้ดูแลระบบ (จำลอง)');
    showLogin(); // Go back to login page after registration request
    document.getElementById('registerForm').reset();
});

function logout() {
    currentUser = null;
    alert('ออกจากระบบแล้ว');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('loginForm').reset();
    document.getElementById('profileForm').reset(); // Clear profile form on logout
    document.getElementById('changePasswordForm').reset(); // Clear change password form on logout
    document.getElementById('repairForm').reset(); // Clear repair form on logout
    document.getElementById('bookingForm').reset(); // Clear booking form on logout
    // Ensure all admin menus are hidden and resident menus are shown (default state)
    document.querySelectorAll('.admin-menu').forEach(menu => menu.classList.add('hidden'));
    document.querySelectorAll('.resident-menu').forEach(menu => menu.classList.remove('hidden'));
    localStorage.removeItem('rememberedUser'); // Clear remembered user on logout
}

function updateDashboardUI() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userRole').textContent = currentUser.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้อยู่อาศัย';
        document.getElementById('userAvatar').textContent = currentUser.name.charAt(0);

        if (currentUser.role === 'admin') {
            document.querySelectorAll('.admin-menu').forEach(menu => menu.classList.remove('hidden'));
            document.querySelectorAll('.resident-menu').forEach(menu => menu.classList.add('hidden'));
        } else {
            document.querySelectorAll('.admin-menu').forEach(menu => menu.classList.add('hidden'));
            document.querySelectorAll('.resident-menu').forEach(menu => menu.classList.remove('hidden'));
        }
    }
}

// Event listener to run when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initially show the login page
    showLogin();

    // Check for remembered user and pre-fill login form
    if (localStorage.getItem('rememberedUser')) {
        const remembered = JSON.parse(localStorage.getItem('rememberedUser'));
        document.getElementById('username').value = remembered.username;
        document.getElementById('password').value = remembered.password;
        document.getElementById('rememberMe').checked = true;
        // For a demo, you could optionally auto-login here by submitting the form:
        // document.getElementById('loginForm').submit();
    }

    // Add event listener for sidebar toggle button on mobile
    const sidebarToggleBtn = document.getElementById('sidebarToggle');
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('show');
        });
    }
});


// Payment Modal functions
function openPaymentModal(billId, item, amount) {
    document.getElementById('paymentBillId').value = billId;
    document.getElementById('paymentItem').value = item;
    document.getElementById('paymentAmount').value = `$${amount.toFixed(2)}`;
    document.getElementById('paymentModal').classList.add('show');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('show');
    document.getElementById('paymentForm').reset(); // Clear form on close
}

// Add event listener for the close button inside the modal header
const paymentModalCloseBtn = document.querySelector('#paymentModal .modal-close');
if (paymentModalCloseBtn) {
    paymentModalCloseBtn.addEventListener('click', closePaymentModal);
}

document.getElementById('paymentForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const billId = document.getElementById('paymentBillId').value;
    const item = document.getElementById('paymentItem').value;
    const amount = document.getElementById('paymentAmount').value;
    const method = document.getElementById('paymentMethod').value;
    const ref = document.getElementById('paymentRef').value;

    if (!billId || !item || !amount || !method || !ref) {
        alert('โปรดกรอกข้อมูลการชำระเงินให้ครบถ้วน');
        return;
    }

    alert(`ยืนยันการชำระเงินสำหรับบิล ${billId} (${item}) จำนวน ${amount} ผ่าน ${method} ด้วยหลักฐาน ${ref} (จำลอง)`);
    closePaymentModal();
});

// Function to toggle password visibility
function togglePasswordVisibility(id) {
    const input = document.getElementById(id);
    // Assuming the eye icon is the next sibling element to the input
    const icon = input.nextElementSibling;
    if (input.type === "password") {
        input.type = "text";
        if (icon) { // Check if icon exists before manipulating classes
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
    } else {
        input.type = "password";
        if (icon) { // Check if icon exists before manipulating classes
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
}

// Other form submissions
document.getElementById('profileForm').addEventListener('submit', function(event) {
    event.preventDefault();
    alert('ข้อมูลส่วนตัวถูกบันทึกแล้ว! (จำลอง)');
    // In a real application, you'd send this data to a server
});

document.getElementById('changePasswordForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        alert('โปรดกรอกข้อมูลรหัสผ่านให้ครบถ้วน');
        return;
    }

    if (newPassword !== confirmNewPassword) {
        alert('รหัสผ่านใหม่ไม่ตรงกัน!');
        return;
    }
    // Add logic to verify current password against currentUser.password (if stored/available)
    // For this dummy, we just alert success
    alert('เปลี่ยนรหัสผ่านสำเร็จ! (จำลอง)');
    document.getElementById('changePasswordForm').reset();
});

document.getElementById('repairForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const repairItem = document.getElementById('repairItem').value;
    const repairDesc = document.getElementById('repairDesc').value;
    const repairDate = document.getElementById('repairDate').value;
    const repairTime = document.getElementById('repairTime').value;

    if (!repairItem || !repairDesc || !repairDate || !repairTime) {
        alert('โปรดกรอกข้อมูลการแจ้งซ่อมให้ครบถ้วน');
        return;
    }

    alert('ส่งคำขอแจ้งซ่อมแล้ว! รอการตอบกลับจากผู้ดูแล (จำลอง)');
    document.getElementById('repairForm').reset();
});

document.getElementById('bookingForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const bookingArea = document.getElementById('bookingArea').value;
    const bookingDate = document.getElementById('bookingDate').value;
    const bookingTime = document.getElementById('bookingTime').value;
    const bookingPurpose = document.getElementById('bookingPurpose').value;

    if (!bookingArea || !bookingDate || !bookingTime || !bookingPurpose) {
        alert('โปรดกรอกข้อมูลการจองพื้นที่ให้ครบถ้วน');
        return;
    }

    alert('ส่งคำขอจองพื้นที่สำเร็จ! โปรดรอการอนุมัติ (จำลอง)');
    document.getElementById('bookingForm').reset();
});

// Reports generation (Admin page)
const reportButton = document.querySelector('#reports .btn-primary');
if (reportButton) { // Check if the button exists before adding event listener
    reportButton.addEventListener('click', () => {
        const type = document.getElementById('reportType').value;
        const period = document.getElementById('reportPeriod').value;

        if (!type || !period) {
            alert('โปรดเลือกประเภทรายงานและช่วงเวลา');
            return;
        }

        document.getElementById('reportOutput').innerHTML = `<p>รายงานประเภท <strong>${type}</strong> สำหรับช่วงเวลา <strong>${period}</strong> ถูกสร้างขึ้นแล้ว (จำลอง)</p>`;
    });
}


// --- เพิ่มเติม: การจัดการปุ่มสำหรับตาราง Admin โดยใช้ Event Delegation ---

// ฟังก์ชันสำหรับจัดการการอนุมัติ/ไม่อนุมัติการแจ้งซ่อม (สำหรับ Admin)
function handleRepairAction(action, repairId) {
    if (confirm(`คุณต้องการ ${action === 'approve' ? 'อนุมัติ' : 'ไม่อนุมัติ'} คำขอซ่อมหมายเลข ${repairId} ใช่หรือไม่?`)) {
        alert(`${action === 'approve' ? 'อนุมัติ' : 'ไม่อนุมัติ'} คำขอซ่อมหมายเลข ${repairId} แล้ว (จำลอง)`);
        // ในระบบจริง: ส่งข้อมูลไป Backend เพื่ออัปเดตสถานะการแจ้งซ่อม
    }
}

// ฟังก์ชันสำหรับจัดการการอนุมัติ/ไม่อนุมัติการจองพื้นที่ (สำหรับ Admin)
function handleBookingAction(action, bookingId) {
    if (confirm(`คุณต้องการ ${action === 'approve' ? 'อนุมัติ' : 'ไม่อนุมัติ'} คำขอจองหมายเลข ${bookingId} ใช่หรือไม่?`)) {
        alert(`${action === 'approve' ? 'อนุมัติ' : 'ไม่อนุมัติ'} คำขอจองหมายเลข ${bookingId} แล้ว (จำลอง)`);
        // ในระบบจริง: ส่งข้อมูลไป Backend เพื่ออัปเดตสถานะการจอง
    }
}

// ฟังก์ชันสำหรับจัดการการลบผู้ใช้ (สำหรับ Admin)
function handleDeleteUser(userId, userName) {
    if (confirm(`คุณต้องการลบผู้ใช้ ${userName} (ID: ${userId}) ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้!`)) {
        alert(`ลบผู้ใช้ ${userName} (ID: ${userId}) แล้ว (จำลอง)`);
        // ในระบบจริง: ส่งข้อมูลไป Backend เพื่อลบผู้ใช้
    }
}

// ใช้ Event Delegation สำหรับปุ่มในตารางต่างๆ ของ Admin
// เหตุผล: ปุ่มเหล่านี้อาจถูกสร้างขึ้นมาใหม่เมื่อมีการโหลดข้อมูลจาก Backend
// การใช้ Event Delegation บน document ทำให้สามารถจับ event ของปุ่มเหล่านี้ได้แม้ว่าปุ่มจะถูกเพิ่มเข้ามาทีหลัง
document.addEventListener('click', function(event) {
    // ปุ่มจัดการแจ้งซ่อม (อนุมัติ/ไม่อนุมัติ)
    if (event.target.classList.contains('repair-approve-btn')) {
        const repairId = event.target.dataset.repairId; // ดึงค่าจาก data-repair-id
        handleRepairAction('approve', repairId);
    } else if (event.target.classList.contains('repair-reject-btn')) {
        const repairId = event.target.dataset.repairId;
        handleRepairAction('reject', repairId);
    }

    // ปุ่มจัดการการจองพื้นที่ (อนุมัติ/ไม่อนุมัติ)
    else if (event.target.classList.contains('booking-approve-btn')) {
        const bookingId = event.target.dataset.bookingId; // ดึงค่าจาก data-booking-id
        handleBookingAction('approve', bookingId);
    } else if (event.target.classList.contains('booking-reject-btn')) {
        const bookingId = event.target.dataset.bookingId;
        handleBookingAction('reject', bookingId);
    }

    // ปุ่มลบผู้ใช้
    else if (event.target.classList.contains('user-delete-btn')) {
        const userId = event.target.dataset.userId; // ดึงค่าจาก data-user-id
        const userName = event.target.dataset.userName || 'ผู้ใช้รายนี้'; // ดึงค่าจาก data-user-name (มีค่า default เผื่อไว้)
        handleDeleteUser(userId, userName);
    }
});