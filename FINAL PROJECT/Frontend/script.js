// script.js
// User data
let currentUser = {
    name: 'ผู้ใช้งาน',
    role: 'resident', // resident, admin
    avatar: 'A'
};

// Calendar data
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

// Calendar events
const calendarEvents = {
    '2023-11-15': 'ประชุมคณะกรรมการ',
    '2023-11-18': 'ทำความสะอาดหมู่บ้าน',
    '2023-12-31': 'งานเลี้ยงสังสรรค์ปีใหม่'
};

// Initialization function
document.addEventListener('DOMContentLoaded', function() {
    // Check login status
    if (localStorage.getItem('isLoggedIn') === 'true') {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        currentUser = { ...currentUser, ...userData };
        showDashboard();
    } else {
        showLogin();
    }

    // Event Listeners setup
    setupEventListeners();
});

function setupEventListeners() {
    // Form submissions
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('repairForm').addEventListener('submit', handleRepairSubmit);
    document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
    document.getElementById('paymentForm').addEventListener('submit', handlePaymentSubmit);
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
    document.getElementById('changePasswordForm').addEventListener('submit', handlePasswordChange);
    document.getElementById('visitorForm').addEventListener('submit', handleVisitorSubmit);
    document.getElementById('incidentForm').addEventListener('submit', handleIncidentSubmit);
    document.getElementById('documentUploadForm').addEventListener('submit', handleDocumentUpload);

    // Payment method change
    document.getElementById('paymentMethod').addEventListener('change', function() {
        const bankDetails = document.getElementById('bankDetails');
        if (this.value === 'bank_transfer') {
            bankDetails.classList.remove('hidden');
        } else {
            bankDetails.classList.add('hidden');
        }
    });

    // Chat input
    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

// Authentication Functions
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username && password) {
        currentUser = {
            name: username === 'admin' ? 'ผู้ดูแลระบบ' : 'คุณ' + username,
            role: username === 'admin' ? 'admin' : 'resident',
            avatar: username.charAt(0).toUpperCase()
        };

        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userData', JSON.stringify(currentUser));
        
        showNotification('เข้าสู่ระบบสำเร็จ', 'success');
        showDashboard();
    } else {
        showNotification('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
    }
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    if (password !== confirmPassword) {
        showNotification('รหัสผ่านไม่ตรงกัน', 'error');
        return;
    }
    
    // Simulate registration
    showNotification('ส่งคำขอลงทะเบียนสำเร็จ รอการอนุมัติจากผู้ดูแล', 'success');
    setTimeout(() => {
        showLogin();
    }, 2000);
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userData');
    currentUser = { name: 'ผู้ใช้งาน', role: 'resident', avatar: 'A' };
    showNotification('ออกจากระบบแล้ว', 'success');
    showLogin();
}

// Page Navigation Functions
function showLogin() {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('registerPage').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

function showRegister() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('registerPage').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('registerPage').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    updateUserInfo();
    showPage('dashboard-home');
    generateCalendar();
}

function showPage(pageId) {
    // Hide all pages
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => page.classList.add('hidden'));
    
    // Show selected page
    document.getElementById(pageId).classList.remove('hidden');
    
    // Update active menu
    const menuItems = document.querySelectorAll('.sidebar-menu a');
    menuItems.forEach(item => item.classList.remove('active'));
    // Note: event.target might not be available if called directly,
    // but it's typically used in event handlers.
    // For direct calls, you might need to pass the element or find it.
    const activeLink = document.querySelector(`.sidebar-menu a[onclick*="showPage('${pageId}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Load page-specific data
    loadPageData(pageId);
}

function updateUserInfo() {
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = currentUser.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้อยู่อาศัย';
    document.getElementById('userAvatar').textContent = currentUser.avatar;
    
    // Show/hide admin menu items
    const adminMenus = document.querySelectorAll('.admin-menu');
    const residentMenus = document.querySelectorAll('.resident-menu');
    
    if (currentUser.role === 'admin') {
        adminMenus.forEach(menu => menu.classList.remove('hidden'));
        residentMenus.forEach(menu => menu.classList.add('hidden'));
    } else {
        adminMenus.forEach(menu => menu.classList.add('hidden'));
        residentMenus.forEach(menu => menu.classList.remove('hidden'));
    }
}

function loadPageData(pageId) {
    switch(pageId) {
        case 'dashboard-home':
            loadDashboardStats();
            break;
        case 'profile':
            loadProfileData();
            break;
        case 'calendar':
            generateCalendar();
            break;
    }
}

// Form Handlers
function handleRepairSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('repairTitle').value;
    const category = document.getElementById('repairCategory').value;
    const description = document.getElementById('repairDescription').value;
    
    // Simulate adding to repair list
    addRepairToTable({
        id: '#' + String(Math.floor(Math.random() * 1000)).padStart(3, '0'),
        title: title,
        category: category,
        date: new Date().toISOString().split('T')[0],
        status: 'รอรับเรื่อง'
    });
    
    showNotification('ส่งคำขอแจ้งซ่อมเรียบร้อยแล้ว', 'success');
    document.getElementById('repairForm').reset();
}

function handleBookingSubmit(e) {
    e.preventDefault();
    const location = document.getElementById('bookingLocation').value;
    const date = document.getElementById('bookingDate').value;
    const timeStart = document.getElementById('bookingTimeStart').value;
    const timeEnd = document.getElementById('bookingTimeEnd').value;
    
    // Add to booking table
    addBookingToTable({
        location: location,
        date: date,
        time: timeStart + '-' + timeEnd,
        status: 'รอการอนุมัติ'
    });
    
    showNotification('ส่งคำขอจองเรียบร้อยแล้ว', 'success');
    document.getElementById('bookingForm').reset();
}

function handlePaymentSubmit(e) {
    e.preventDefault();
    showNotification('ส่งหลักฐานการชำระเงินเรียบร้อยแล้ว รอการตรวจสอบ', 'success');
    closeModal('paymentModal');
    document.getElementById('paymentForm').reset();
}

function handleProfileUpdate(e) {
    e.preventDefault();
    showNotification('อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว', 'success');
}

function handlePasswordChange(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword !== confirmNewPassword) {
        showNotification('รหัสผ่านใหม่ไม่ตรงกัน', 'error');
        return;
    }
    
    showNotification('เปลี่ยนรหัสผ่านสำเร็จ', 'success');
    document.getElementById('changePasswordForm').reset();
}

function handleVisitorSubmit(e) {
    e.preventDefault();
    showNotification('แจ้งผู้มาเยือนเรียบร้อยแล้ว', 'success');
    document.getElementById('visitorForm').reset();
}

function handleIncidentSubmit(e) {
    e.preventDefault();
    showNotification('ส่งรายงานเหตุการณ์ผิดปกติเรียบร้อยแล้ว', 'success');
    document.getElementById('incidentForm').reset();
}

function handleDocumentUpload(e) {
    e.preventDefault();
    const title = document.getElementById('docTitle').value;
    const category = document.getElementById('docCategory').value;
    
    // Add to documents table
    addDocumentToTable({
        title: title,
        category: category,
        date: new Date().toISOString().split('T')[0],
        size: '2.5 MB'
    });
    
    showNotification('อัปโหลดเอกสารเรียบร้อยแล้ว', 'success');
    document.getElementById('documentUploadForm').reset();
}

// Calendar Functions
function generateCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const monthYearDisplay = document.getElementById('currentMonth');
    
    if (!calendarGrid || !monthYearDisplay) return;
    
    calendarGrid.innerHTML = '';
    
    // Update month display
    monthYearDisplay.textContent = monthNames[currentMonth] + ' ' + (currentYear + 543);
    
    // Days of week header
    const daysOfWeek = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    daysOfWeek.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day header';
        dayElement.textContent = day;
        calendarGrid.appendChild(dayElement);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day';
        calendarGrid.appendChild(emptyDay);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        // Check if today
        if (currentYear === today.getFullYear() && 
            currentMonth === today.getMonth() && 
            day === today.getDate()) {
            dayElement.classList.add('today');
        }
        
        // Check if has event
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (calendarEvents[dateStr]) {
            dayElement.classList.add('has-event');
            dayElement.title = calendarEvents[dateStr];
        }
        
        calendarGrid.appendChild(dayElement);
    }
}

function previousMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    generateCalendar();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    generateCalendar();
}

// Chat Functions
function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageTime = new Date().toLocaleTimeString('th-TH', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Add user message
        const userMessage = document.createElement('div');
        userMessage.className = 'chat-message own';
        userMessage.innerHTML = `
            <div class="user-avatar" style="min-width: 35px; height: 35px; font-size: 14px;">${currentUser.avatar}</div>
            <div class="message-content">
                <p>${message}</p>
                <small>${messageTime}</small>
            </div>
        `;
        chatMessages.appendChild(userMessage);
        
        // Auto-reply (simulate)
        setTimeout(() => {
            const adminReply = document.createElement('div');
            adminReply.className = 'chat-message';
            adminReply.innerHTML = `
                <div class="user-avatar" style="min-width: 35px; height: 35px; font-size: 14px;">A</div>
                <div class="message-content">
                    <strong>เจ้าหน้าที่</strong>
                    <p>ขอบคุณสำหรับข้อความค่ะ เราจะติดตามเรื่องนี้ให้</p>
                    <small>${messageTime}</small>
                </div>
            `;
            chatMessages.appendChild(adminReply);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1000);
        
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function openGroupChat(groupId) {
    showNotification(`เปิดแชทกลุ่ม: ${groupId}`, 'info');
}

// Payment Functions
function payBill(billId) {
    const modal = document.getElementById('paymentModal');
    modal.classList.remove('hidden');
    modal.style.display = 'block';
    
    // Set payment amount based on bill
    const amounts = {
        'common_fee_nov': '1,500',
        'parking_fee': '300'
    };
    
    document.getElementById('paymentAmount').value = amounts[billId] + ' บาท';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('hidden');
    modal.style.display = 'none';
}

// Voting Functions
function submitVote(voteType) {
    const selectedOption = document.querySelector(`input[name="${voteType}"]:checked`);
    if (selectedOption) {
        showNotification('บันทึกการโหวตเรียบร้อยแล้ว', 'success');
    } else {
        showNotification('กรุณาเลือกตัวเลือกก่อนโหวต', 'warning');
    }
}

// Utility Functions
function addRepairToTable(repair) {
    const tbody = document.getElementById('repairStatusTable');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${repair.id}</td>
        <td>${repair.title}</td>
        <td>${repair.category}</td>
        <td>${repair.date}</td>
        <td><span class="status-badge status-pending">${repair.status}</span></td>
        <td><button class="btn btn-secondary btn-sm">ดูรายละเอียด</button></td>
    `;
    tbody.appendChild(row);
}

function addBookingToTable(booking) {
    const tbody = document.getElementById('bookingTable');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${booking.location}</td>
        <td>${booking.date}</td>
        <td>${booking.time}</td>
        <td><span class="status-badge status-pending">${booking.status}</span></td>
        <td><button class="btn btn-secondary btn-sm">แก้ไข</button></td>
    `;
    tbody.appendChild(row);
}

function addDocumentToTable(doc) {
    const tbody = document.getElementById('documentsTable');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${doc.title}</td>
        <td>${doc.category}</td>
        <td>${doc.date}</td>
        <td>${doc.size}</td>
        <td>
            <button class="btn btn-secondary btn-sm">ดู</button>
            <button class="btn btn-primary btn-sm">ดาวน์โหลด</button>
            <button class="btn btn-secondary btn-sm">ลบ</button>
        </td>
    `;
    tbody.appendChild(row);
}

function loadDashboardStats() {
    // Simulate loading dashboard statistics
    const stats = {
        totalResidents: Math.floor(Math.random() * 50) + 200,
        pendingRepairs: Math.floor(Math.random() * 20) + 5,
        completedRepairs: Math.floor(Math.random() * 100) + 100,
        unpaidBills: Math.floor(Math.random() * 15) + 3
    };
    
    document.getElementById('totalResidents').textContent = stats.totalResidents;
    document.getElementById('pendingRepairs').textContent = stats.pendingRepairs;
    document.getElementById('completedRepairs').textContent = stats.completedRepairs;
    document.getElementById('unpaidBills').textContent = stats.unpaidBills;
}

function loadProfileData() {
    // Load user profile data
    document.getElementById('profileName').value = currentUser.name || '';
    document.getElementById('profilePhone').value = '081-234-5678';
    document.getElementById('profileEmail').value = 'user@example.com';
    document.getElementById('profileAddress').value = 'A-101';
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; cursor: pointer; margin-left: 15px;">&times;</button>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function showForgotPassword() {
    showNotification('ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว', 'info');
}

function toggleNotifications() {
    showNotification('ไม่มีการแจ้งเตือนใหม่', 'info');
}

// Click outside modal to close
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }
    });
};

// File upload preview
function handleFileUpload(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (preview) {
                preview.innerHTML = `<img src="${e.target.result}" style="max-width: 200px; max-height: 200px;">`;
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Responsive sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

// Add click event for mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    if (window.innerWidth <= 768) {
        const header = document.querySelector('.header-content h1');
        if (header) {
            header.style.cursor = 'pointer';
            header.addEventListener('click', toggleSidebar);
        }
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('open');
    }
});
