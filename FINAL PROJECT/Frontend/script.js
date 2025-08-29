// script.js

// --- Global Data Variables ---
let currentUser = {
    user_id: null,
    name: 'ผู้ใช้งาน',
    role: 'resident',
    avatar: 'A'
};

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

// Data caches (will be loaded from backend via API calls)
let announcementsCache = [];
let repairRequestsCache = [];
let bookingRequestsCache = [];
let documentsCache = [];
let chatMessagesCache = [];
let calendarEventsCache = {};
let allUsersCache = [];
let billsCache = [];

// --- Socket.IO Client ---
let socket = null;

// --- Utility Functions ---

/**
 * Displays a notification message.
 * @param {string} message - The message to display.
 * @param {string} type - The type of notification (success, error, warning, info).
 * @param {number} duration - How long the notification should be displayed in milliseconds.
 */
function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.closest('.notification').remove()">&times;</button>
    `;
    container.appendChild(notification);
    setTimeout(() => notification.remove(), duration);
}

/**
 * Opens a modal by its ID.
 * @param {string} modalId - The ID of the modal to open.
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

/**
 * Closes a modal by its ID and resets its form.
 * @param {string} modalId - The ID of the modal to close.
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        const form = modal.querySelector('form');
        if (form) form.reset();
        modal.querySelectorAll('[id$="Preview"]').forEach(p => p.innerHTML = '');
    }
}

/**
 * Toggles password visibility for an input field.
 * @param {string} inputId - The ID of the password input field.
 */
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = input.nextElementSibling;
    input.type = input.type === 'password' ? 'text' : 'password';
    if (icon) {
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    }
}

/**
 * Handles file input change to display a preview.
 * @param {string} inputId - The ID of the file input element.
 * @param {string} previewId - The ID of the element where the preview should be displayed.
 */
function handleFileUpload(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview || !input.files || !input.files[0]) {
        preview.innerHTML = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.innerHTML = `<img src="${e.target.result}" style="max-width: 200px; max-height: 200px; margin-top: 10px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">`;
    };
    reader.readAsDataURL(input.files[0]);
}

/**
 * Generic function to fetch data from the API.
 * @param {string} endpoint - The API endpoint.
 * @returns {Promise<Array|Object>} - The fetched data.
 */
async function fetchData(endpoint) {
    try {
        const response = await fetch(`http://localhost:5000/${endpoint}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to fetch ${endpoint}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        showNotification(`ไม่สามารถโหลดข้อมูล ${endpoint} ได้`, 'error');
        return [];
    }
}

/**
 * Generic function to send data to the API (POST, PUT, DELETE).
 * @param {string} endpoint - The API endpoint.
 * @param {string} method - HTTP method (POST, PUT, DELETE).
 * @param {Object} [body=null] - Request body for POST/PUT.
 * @returns {Promise<Object>} - The API response data.
 */
async function sendData(endpoint, method, body = null) {
    try {
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        };
        const response = await fetch(`http://localhost:5000/${endpoint}`, options);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || `API call to ${endpoint} failed with status ${response.status}`);
        }
        return data;
    } catch (error) {
        console.error(`Error sending data to ${endpoint}:`, error);
        showNotification(error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        throw error;
    }
}

// --- Authentication Functions ---
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
        const data = await sendData('login', 'POST', { username, password });
        currentUser = { user_id: data.user_id, name: data.name, role: data.role, avatar: data.name[0].toUpperCase() };
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userData', JSON.stringify(currentUser));
        showNotification('เข้าสู่ระบบสำเร็จ', 'success');
        showDashboard();
        initializeSocketIO();
    } catch (error) { /* Handled by sendData */ }
}

async function handleRegister(e) {
    e.preventDefault();
    const [name, username, password, confirmPassword, phone, address] = ['regName', 'regUsername', 'regPassword', 'regConfirmPassword', 'regPhone', 'regAddress'].map(id => document.getElementById(id).value);
    if (password !== confirmPassword) { showNotification('รหัสผ่านไม่ตรงกัน', 'error'); return; }
    try {
        await sendData('users', 'POST', { name, username, password, phone, address, role: 'resident' });
        showNotification('ส่งคำขอลงทะเบียนสำเร็จ รอการอนุมัติจากผู้ดูแล', 'success');
        document.getElementById('registerForm').reset();
        setTimeout(showLogin, 2000);
    } catch (error) { /* Handled by sendData */ }
}

function logout() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userData');
    currentUser = { user_id: null, name: 'ผู้ใช้งาน', role: 'resident', avatar: 'A' };
    if (socket && socket.connected) socket.disconnect();
    showNotification('ออกจากระบบแล้ว', 'success');
    showLogin();
}

function showForgotPassword() { showNotification('ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว', 'info'); }

// --- Page Navigation Functions ---
const pageMap = {
    'dashboard-home': { id: 'dashboard-home', loadFunc: loadDashboardStats },
    'profile': { id: 'profile', loadFunc: loadProfileData },
    'repair-request': { id: 'repair-request', loadFunc: fetchRepairRequests },
    'announcements': { id: 'announcements', loadFunc: fetchAnnouncements },
    'payments': { id: 'payments', loadFunc: fetchPayments },
    'booking': { id: 'booking', loadFunc: fetchBookingRequests },
    'calendar': { id: 'calendar', loadFunc: fetchCalendarEvents },
    'chat': { id: 'chat', loadFunc: fetchChatMessages },
    'documents': { id: 'documents', loadFunc: fetchDocuments },
    'security': { id: 'security', loadFunc: () => { fetchSecurityVisitors(); fetchSecurityIncidents(); } },
    'voting': { id: 'voting', loadFunc: fetchVotingPolls },
    'manage-users': { id: 'manage-users', loadFunc: fetchAllUsers },
    'manage-repairs': { id: 'manage-repairs', loadFunc: fetchRepairRequests },
    'manage-bills': { id: 'manage-bills', loadFunc: fetchBills },
    'reports': { id: 'reports', loadFunc: renderMonthlyChart }
};

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
}

function showPage(pageId) {
    const pageInfo = pageMap[pageId];
    if (!pageInfo) { console.error(`Page ID "${pageId}" not found.`); return; }

    document.querySelectorAll('.page-content').forEach(pageDiv => pageDiv.classList.add('hidden'));
    const targetContentDiv = document.getElementById(pageInfo.id);
    if (targetContentDiv) targetContentDiv.classList.remove('hidden'); else { console.error(`Content div "${pageInfo.id}" not found.`); return; }

    document.querySelectorAll('.sidebar-menu a').forEach(item => item.classList.remove('active'));
    const activeLink = document.querySelector(`.sidebar-menu a[onclick*="showPage('${pageId}')"]`);
    if (activeLink) activeLink.classList.add('active');

    if (pageInfo.loadFunc) pageInfo.loadFunc();
    setupDynamicFormListeners();
    if (window.innerWidth <= 768) toggleSidebar();
}

function updateUserInfo() {
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = currentUser.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้อยู่อาศัย';
    document.getElementById('userAvatar').textContent = currentUser.avatar;

    document.querySelectorAll('.admin-menu').forEach(menu => menu.classList.toggle('hidden', currentUser.role !== 'admin'));
    document.querySelectorAll('.resident-menu').forEach(menu => menu.classList.remove('hidden')); // Admins can see resident menus too
}

// --- Form Handlers ---
async function handleRepairSubmit(e) {
    e.preventDefault();
    const [title, category, description] = ['repairTitle', 'repairCategory', 'repairDescription'].map(id => document.getElementById(id).value);
    const imagePaths = JSON.stringify(Array.from(document.getElementById('repairImages')?.files || []).map(f => f.name));
    try {
        await sendData('repair-requests', 'POST', { user_id: currentUser.user_id, title, category, description, image_paths: imagePaths });
        showNotification('ส่งคำขอแจ้งซ่อมเรียบร้อยแล้ว', 'success');
        document.getElementById('repairForm').reset();
        document.getElementById('repairImagesPreview').innerHTML = '';
        fetchRepairRequests();
    } catch (error) { /* Handled by sendData */ }
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    const [location, date, timeStart, timeEnd, purpose, attendeeCount] = ['bookingLocation', 'bookingDate', 'bookingTimeStart', 'bookingTimeEnd', 'bookingPurpose', 'attendeeCount'].map(id => document.getElementById(id).value);
    try {
        await sendData('booking-requests', 'POST', { user_id: currentUser.user_id, location, date, start_time: timeStart, end_time: timeEnd, purpose, attendee_count: parseInt(attendeeCount) });
        showNotification('ส่งคำขอจองเรียบร้อยแล้ว', 'success');
        document.getElementById('bookingForm').reset();
        fetchBookingRequests();
    } catch (error) { /* Handled by sendData */ }
}

async function handlePaymentSubmit(e) {
    e.preventDefault();
    const [paymentBillId, paymentAmount, paymentMethod] = ['paymentBillId', 'paymentAmount', 'paymentMethod'].map(id => document.getElementById(id).value);
    const slipPath = document.getElementById('paymentSlipFile')?.files[0]?.name || null;
    if (!slipPath) { showNotification('กรุณาอัปโหลดหลักฐานการโอนเงิน', 'error'); return; }
    try {
        await sendData('payments', 'POST', { bill_id: paymentBillId, user_id: currentUser.user_id, amount: parseFloat(paymentAmount.replace(' บาท', '').replace(/,/g, '')), payment_method: paymentMethod, status: 'pending', slip_path: slipPath });
        showNotification('ส่งหลักฐานการชำระเงินเรียบร้อยแล้ว รอการตรวจสอบ', 'success');
        closeModal('paymentModal');
        fetchPayments();
    } catch (error) { /* Handled by sendData */ }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const [profileName, profilePhone, profileEmail, profileAddress] = ['profileName', 'profilePhone', 'profileEmail', 'profileAddress'].map(id => document.getElementById(id).value);
    try {
        await sendData(`users/${currentUser.user_id}`, 'PUT', { name: profileName, phone: profilePhone, email: profileEmail, address: profileAddress });
        Object.assign(currentUser, { name: profileName, phone: profilePhone, email: profileEmail, address: profileAddress });
        sessionStorage.setItem('userData', JSON.stringify(currentUser));
        updateUserInfo();
        showNotification('อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว', 'success');
        document.getElementById('profileDocumentsPreview').innerHTML = '';
    } catch (error) { /* Handled by sendData */ }
}

async function handlePasswordChange(e) {
    e.preventDefault();
    const [currentPassword, newPassword, confirmNewPassword] = ['currentPassword', 'newPassword', 'confirmNewPassword'].map(id => document.getElementById(id).value);
    if (newPassword !== confirmNewPassword) { showNotification('รหัสผ่านใหม่ไม่ตรงกัน', 'error'); return; }
    try {
        await sendData(`users/${currentUser.user_id}`, 'PUT', { password: newPassword, current_password: currentPassword });
        showNotification('เปลี่ยนรหัสผ่านสำเร็จ', 'success');
        document.getElementById('changePasswordForm').reset();
    } catch (error) { /* Handled by sendData */ }
}

async function handleVisitorSubmit(e) {
    e.preventDefault();
    const [visitorName, visitorPhone, visitDate, visitTime, visitPurpose] = ['visitorName', 'visitorPhone', 'visitDate', 'visitTime', 'visitPurpose'].map(id => document.getElementById(id).value);
    try {
        await sendData('security-visitors', 'POST', { user_id: currentUser.user_id, name: visitorName, phone: visitorPhone, visit_date: visitDate, visit_time: visitTime, purpose: visitPurpose });
        showNotification('แจ้งผู้มาเยือนเรียบร้อยแล้ว', 'success');
        document.getElementById('visitorForm').reset();
        fetchSecurityVisitors();
    } catch (error) { /* Handled by sendData */ }
}

async function handleIncidentSubmit(e) {
    e.preventDefault();
    const [incidentType, incidentLocation, incidentDescription] = ['incidentType', 'incidentLocation', 'incidentDescription'].map(id => document.getElementById(id).value);
    const evidencePaths = JSON.stringify(Array.from(document.getElementById('incidentEvidence')?.files || []).map(f => f.name));
    try {
        await sendData('security-incidents', 'POST', { user_id: currentUser.user_id, description: `ประเภท: ${incidentType}, สถานที่: ${incidentLocation}, รายละเอียด: ${incidentDescription}`, evidence_paths: evidencePaths });
        showNotification('ส่งรายงานเหตุการณ์ผิดปกติเรียบร้อยแล้ว', 'success');
        document.getElementById('incidentForm').reset();
        document.getElementById('incidentEvidencePreview').innerHTML = '';
        fetchSecurityIncidents();
    } catch (error) { /* Handled by sendData */ }
}

async function handleDocumentUpload(e) {
    e.preventDefault();
    const [title, category] = ['docTitle', 'docCategory'].map(id => document.getElementById(id).value);
    const documentFile = document.getElementById('documentFile')?.files[0];
    if (!documentFile) { showNotification('กรุณาเลือกไฟล์เอกสาร', 'error'); return; }
    try {
        await sendData('documents', 'POST', { document_name: title, file_path: documentFile.name, uploaded_by_user_id: currentUser.user_id, category: category });
        showNotification('อัปโหลดเอกสารเรียบร้อยแล้ว', 'success');
        document.getElementById('documentUploadForm').reset();
        document.getElementById('documentFilePreview').innerHTML = '';
        fetchDocuments();
    } catch (error) { /* Handled by sendData */ }
}

// NEW: Handle Add/Edit User Form Submission
async function handleUserSubmit(e) {
    e.preventDefault();
    const userId = document.getElementById('userId').value;
    const name = document.getElementById('userName').value;
    const username = document.getElementById('userUsername').value;
    const password = document.getElementById('userPassword').value;
    const phone = document.getElementById('userPhone').value;
    const address = document.getElementById('userAddress').value;
    const role = document.getElementById('userRoleSelect').value;
    const status = document.getElementById('userStatusSelect').value;

    const userData = { name, username, phone, address, role, status };
    if (password) { // Only include password if it's provided (for new user or password change)
        userData.password = password;
    }

    try {
        if (userId) {
            // Editing existing user
            await sendData(`users/${userId}`, 'PUT', userData);
            showNotification('อัปเดตข้อมูลผู้ใช้สำเร็จ', 'success');
        } else {
            // Adding new user
            if (!password) {
                showNotification('กรุณาระบุรหัสผ่านสำหรับผู้ใช้ใหม่', 'error');
                return;
            }
            await sendData('users', 'POST', userData);
            showNotification('เพิ่มผู้ใช้ใหม่สำเร็จ', 'success');
        }
        closeModal('userModal');
        fetchAllUsers(); // Refresh user list
    } catch (error) {
        // Error handled by sendData function
    }
}


// --- Generic Table Rendering ---
const STATUS_MAP = {
    'pending': { text: 'รอรับเรื่อง', class: 'status-pending' },
    'in_progress': { text: 'กำลังดำเนินการ', class: 'status-progress' },
    'completed': { text: 'เสร็จสิ้น', class: 'status-completed' },
    'rejected': { text: 'ถูกปฏิเสธ', class: 'status-unpaid' },
    'approved': { text: 'อนุมัติ', class: 'status-approved' },
    'unpaid': { text: 'ยังไม่ชำระ', class: 'status-unpaid' },
    'paid': { text: 'ชำระแล้ว', class: 'status-paid' },
    'pending_verification': { text: 'รอตรวจสอบ', class: 'status-pending' },
    'suspended': { text: 'ระงับ', class: 'status-unpaid' }
};

function getStatusHtml(status) {
    const info = STATUS_MAP[status] || { text: status, class: 'status-info' };
    return `<span class="status-badge ${info.class}">${info.text}</span>`;
}

/**
 * Renders a generic table.
 * @param {Array} data - The array of data objects to render.
 * @param {string} tbodyId - The ID of the tbody element.
 * @param {Array<Object>} columns - Array of column definitions: { key: 'propName', header: 'Header Text', format: (value, item) => string }
 * @param {Function} getActionsHtml - Function that returns action buttons HTML for an item.
 * @param {string} [noDataMessage='ไม่มีข้อมูล'] - Message to display if data is empty.
 */
function renderTable(data, tbodyId, columns, getActionsHtml, noDataMessage = 'ไม่มีข้อมูล') {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${columns.length + (getActionsHtml ? 1 : 0)}" style="text-align: center; color: #666;">${noDataMessage}</td></tr>`;
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        let rowHtml = columns.map(col => `<td>${col.format ? col.format(item[col.key], item) : item[col.key]}</td>`).join('');
        if (getActionsHtml) {
            rowHtml += `<td>${getActionsHtml(item)}</td>`;
        }
        row.innerHTML = rowHtml;
        tbody.appendChild(row);
    });
}

// --- Data Fetching and Rendering Functions ---
async function fetchAnnouncements() {
    announcementsCache = await fetchData('announcements');
    renderAnnouncements();
}

function renderAnnouncements() {
    const commonColumns = [
        { key: 'title', header: 'หัวข้อ' },
        { key: 'published_date', header: 'วันที่', format: (date) => new Date(date).toLocaleDateString('th-TH') },
        { key: 'author_name', header: 'โดย', format: (name) => name || 'ผู้ดูแลระบบ' }
    ];

    renderTable(announcementsCache, 'adminAnnouncementsTable', commonColumns, (announcement) => `
        <button class="btn btn-secondary btn-sm" onclick="editAnnouncement('${announcement.announcement_id}')">แก้ไข</button>
        <button class="btn btn-secondary btn-sm" onclick="deleteAnnouncement('${announcement.announcement_id}')">ลบ</button>
    `, 'ไม่มีประกาศ');

    const announcementsList = document.getElementById('announcementsList');
    if (!announcementsList) return;
    announcementsList.innerHTML = announcementsCache.map(announcement => {
        const tagColor = announcement.tag_color || '#667eea';
        const tagBg = announcement.tag_bg || '#e3f2fd';
        return `
            <div class="announcement-item" style="border-left: 4px solid ${tagColor}; padding-left: 20px; margin-bottom: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <h4 style="color: #333; margin: 0;">${announcement.title}</h4>
                    <span style="color: #666; font-size: 14px;">${new Date(announcement.published_date).toLocaleDateString('th-TH')}</span>
                </div>
                <p style="color: #666; line-height: 1.6; margin-bottom: 10px;">${announcement.content}</p>
                <div style="display: flex; gap: 10px;">
                    <span class="status-badge" style="background: ${tagBg}; color: ${tagColor};">${announcement.tag}</span>
                    <span style="color: #666; font-size: 14px;"><i class="fas fa-user"></i> โดย: ${announcement.author_name || 'ผู้ดูแลระบบ'}</span>
                </div>
                <div class="admin-actions ${currentUser.role === 'admin' ? '' : 'hidden'}" style="margin-top: 15px;">
                    <button class="btn btn-secondary btn-sm" onclick="editAnnouncement('${announcement.announcement_id}')">แก้ไข</button>
                    <button class="btn btn-secondary btn-sm" onclick="deleteAnnouncement('${announcement.announcement_id}')">ลบ</button>
                </div>
            </div>
        `;
    }).join('');
}

async function showAddAnnouncementModal() {
    document.getElementById('announcementModalTitle').innerText = 'เพิ่มประกาศใหม่';
    document.getElementById('announcementId').value = '';
    document.getElementById('announcementForm').reset();
    document.getElementById('announcementDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('announcementAuthor').value = currentUser.name;
    openModal('announcementModal');
}

async function handleAnnouncementSubmit(e) {
    e.preventDefault();
    const [id, title, content, date, tag] = ['announcementId', 'announcementTitle', 'announcementContent', 'announcementDate', 'announcementTag'].map(id => document.getElementById(id).value);
    const announcementData = { title, content, published_date: date, author_id: currentUser.user_id, tag };
    try {
        id ? await sendData(`announcements/${id}`, 'PUT', announcementData) : await sendData('announcements', 'POST', announcementData);
        showNotification('บันทึกประกาศสำเร็จ', 'success');
        closeModal('announcementModal');
    } catch (error) { /* Handled by sendData */ }
}

async function editAnnouncement(announcementId) {
    const ann = announcementsCache.find(a => a.announcement_id == announcementId);
    if (!ann) return;
    document.getElementById('announcementModalTitle').innerText = 'แก้ไขประกาศ';
    document.getElementById('announcementId').value = ann.announcement_id;
    document.getElementById('announcementTitle').value = ann.title;
    document.getElementById('announcementContent').value = ann.content;
    document.getElementById('announcementDate').value = new Date(ann.published_date).toISOString().slice(0, 10);
    document.getElementById('announcementAuthor').value = ann.author_name || currentUser.name;
    document.getElementById('announcementTag').value = ann.tag;
    openModal('announcementModal');
}

async function deleteAnnouncement(announcementId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบประกาศนี้?')) return;
    try {
        await sendData(`announcements/${announcementId}`, 'DELETE');
        showNotification('ลบประกาศสำเร็จ', 'success');
    } catch (error) { /* Handled by sendData */ }
}

async function fetchCalendarEvents() {
    calendarEventsCache = {};
    const events = await fetchData('calendar-events');
    events.forEach(event => {
        const dateStr = new Date(event.event_date).toISOString().slice(0, 10);
        calendarEventsCache[dateStr] = calendarEventsCache[dateStr] || [];
        calendarEventsCache[dateStr].push(event);
    });
    generateCalendar();
}

function generateCalendar() {
    const [calendarGrid, monthYearDisplay] = ['calendarGrid', 'currentMonth'].map(id => document.getElementById(id));
    if (!calendarGrid || !monthYearDisplay) return;
    calendarGrid.innerHTML = '';
    monthYearDisplay.textContent = `${monthNames[currentMonth]} ${currentYear + 543}`;

    ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].forEach(day => calendarGrid.innerHTML += `<div class="calendar-day header">${day}</div>`);

    const [firstDay, daysInMonth, today] = [new Date(currentYear, currentMonth, 1).getDay(), new Date(currentYear, currentMonth + 1, 0).getDate(), new Date()];
    for (let i = 0; i < firstDay; i++) calendarGrid.innerHTML += `<div class="calendar-day"></div>`;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasEvent = calendarEventsCache[dateStr] && calendarEventsCache[dateStr].length > 0;
        const isToday = currentYear === today.getFullYear() && currentMonth === today.getMonth() && day === today.getDate();
        const title = hasEvent ? calendarEventsCache[dateStr].map(e => e.event_name).join(', ') : '';
        calendarGrid.innerHTML += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}" title="${title}">${day}</div>`;
    }
    renderUpcomingEvents();
}

function previousMonth() { currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } generateCalendar(); }
function nextMonth() { currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } generateCalendar(); }

function renderUpcomingEvents() {
    const upcomingEventsContainer = document.getElementById('upcomingEvents');
    if (!upcomingEventsContainer) return;
    const now = new Date();
    const sortedEvents = Object.values(calendarEventsCache).flat().sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    let eventsHtml = '<div style="padding: 20px;">';
    let displayedEventCount = 0;
    sortedEvents.forEach(event => {
        const eventDate = new Date(event.event_date);
        if (eventDate >= now && displayedEventCount < 7) {
            const time = new Date(`2000-01-01T${event.start_time || '00:00'}`).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            eventsHtml += `
                <div class="event-item" style="border-left: 4px solid #667eea; padding-left: 15px; margin-bottom: 15px;">
                    <h4 style="margin: 0; color: #333;">${event.event_name}</h4>
                    <p style="margin: 5px 0; color: #666;">${eventDate.toLocaleDateString('th-TH')} - ${time} น.</p>
                    <p style="margin: 0; color: #888;">${event.location || ''}</p>
                </div>
            `;
            displayedEventCount++;
        }
    });
    eventsHtml += displayedEventCount === 0 ? '<p style="padding: 15px; text-align: center; color: #666;">ไม่มีกิจกรรมที่กำลังจะมาถึง</p>' : '';
    eventsHtml += '</div>';
    upcomingEventsContainer.innerHTML = eventsHtml;
}

async function fetchChatMessages() {
    chatMessagesCache = await fetchData('chat-messages');
    displayChatMessages();
}

function displayChatMessages() {
    const chatMessagesContainer = document.getElementById('chatMessages');
    if (!chatMessagesContainer) return;
    chatMessagesContainer.innerHTML = chatMessagesCache.map(msg => `
        <div class="chat-message ${msg.sender_id === currentUser.user_id ? 'own' : 'other'}">
            <div class="user-avatar">${msg.sender_avatar || (msg.sender_name ? msg.sender_name[0].toUpperCase() : 'U')}</div>
            <div class="message-content">
                ${msg.sender_id !== currentUser.user_id ? `<strong>${msg.sender_name}</strong>` : ''}
                <p>${msg.content}</p>
                <small>${new Date(msg.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</small>
            </div>
        </div>
    `).join('');
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput?.value.trim();
    if (message && currentUser.user_id && socket) {
        socket.emit('send_message', { sender_id: currentUser.user_id, content: message, sender_name: currentUser.name, sender_avatar: currentUser.avatar, room_name: 'general_chat' });
        chatInput.value = '';
    } else if (!currentUser.user_id) { showNotification('กรุณาเข้าสู่ระบบเพื่อส่งข้อความ', 'warning'); }
}

function openGroupChat(groupId) { showNotification(`กำลังจะเปิดแชทกลุ่ม: ${groupId} (ฟังก์ชันนี้ยังไม่ได้เชื่อมต่อจริง)`, 'info'); }

async function fetchPayments() {
    const allBills = await fetchData('bills');
    const userPayments = await fetchData(`payments?user_id=${currentUser.user_id}`);

    const billsWithStatus = allBills.filter(bill => bill.recipient_id === 'all' || bill.recipient_id === currentUser.user_id).map(bill => {
        const payment = userPayments.find(p => p.bill_id === bill.bill_id && p.status === 'paid');
        const pendingPayment = userPayments.find(p => p.bill_id === bill.bill_id && p.status === 'pending');
        return { ...bill, status: payment ? 'paid' : (pendingPayment ? 'pending_verification' : 'unpaid'), payment_id: payment?.payment_id };
    });

    renderPaymentTable(billsWithStatus.filter(b => b.status !== 'paid'));
    renderPaymentHistoryTable(billsWithStatus.filter(b => b.status === 'paid'), userPayments);

    document.getElementById('unpaidBills').textContent = billsWithStatus.filter(b => b.status === 'unpaid' || b.status === 'pending_verification').length;
}

function renderPaymentTable(unpaidBills) {
    renderTable(unpaidBills, 'paymentTable',
        [
            { key: 'item_name', header: 'รายการ' },
            { key: 'amount', header: 'ยอดเงิน', format: (amount) => `${parseFloat(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท` },
            { key: 'due_date', header: 'กำหนดชำระ', format: (date) => new Date(date).toLocaleDateString('th-TH') },
            { key: 'status', header: 'สถานะ', format: (status) => getStatusHtml(status) }
        ],
        (bill) => bill.status === 'unpaid' ? `<button class="btn btn-primary btn-sm" onclick="payBill('${bill.bill_id}', ${bill.amount})">ชำระเงิน</button>` : `<button class="btn btn-secondary btn-sm" disabled>รอตรวจสอบ</button>`,
        'ไม่มีบิลค้างชำระ'
    );
}

function renderPaymentHistoryTable(paidBills, allUserPayments) {
    renderTable(paidBills, 'paymentHistoryTable',
        [
            { key: 'payment_date', header: 'วันที่ชำระ', format: (val, bill) => {
                const payment = allUserPayments.find(p => p.bill_id === bill.bill_id && p.status === 'paid');
                return payment ? new Date(payment.payment_date).toLocaleDateString('th-TH') : 'N/A';
            }},
            { key: 'item_name', header: 'รายการ' },
            { key: 'amount', header: 'ยอดเงิน', format: (amount) => `${parseFloat(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท` },
            { key: 'payment_method', header: 'วิธีชำระ', format: (val, bill) => {
                const payment = allUserPayments.find(p => p.bill_id === bill.bill_id && p.status === 'paid');
                return payment ? payment.payment_method : 'N/A';
            }}
        ],
        (bill) => `<button class="btn btn-secondary btn-sm" onclick="viewReceipt('${bill.payment_id}')">ดูใบเสร็จ</button>`,
        'ไม่มีประวัติการชำระเงิน'
    );
}

function viewReceipt(paymentId) { showNotification(`กำลังจะดูใบเสร็จสำหรับ Payment ID: ${paymentId}`, 'info'); }

function payBill(billId, amount) {
    document.getElementById('paymentBillId').value = billId;
    document.getElementById('paymentAmount').value = `${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
    document.getElementById('paymentMethod').value = '';
    document.getElementById('qrCodeContainer').style.display = 'none';
    document.getElementById('bankDetails').classList.add('hidden');
    document.getElementById('paymentSlipPreview').innerHTML = '';
    openModal('paymentModal');
}

function showQRCode() {
    const [paymentMethod, qrCodeContainer, bankDetails] = ['paymentMethod', 'qrCodeContainer', 'bankDetails'].map(id => document.getElementById(id));
    if (!paymentMethod || !qrCodeContainer || !bankDetails) return;
    qrCodeContainer.style.display = paymentMethod.value === "promptpay" ? "block" : "none";
    bankDetails.classList.toggle("hidden", paymentMethod.value !== "bank_transfer");
}

async function fetchVotingPolls() {
    const pollsData = await fetchData('voting-polls');
    renderVotingPolls(pollsData);
}

function renderVotingPolls(polls) {
    const votingContainer = document.querySelector('#voting .card > div');
    if (!votingContainer) return;
    votingContainer.innerHTML = polls.map(poll => `
        <div class="voting-item" style="border: 1px solid #eee; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
            <h4 style="color: #333; margin-bottom: 10px;">${poll.title}</h4>
            <p style="color: #666; margin-bottom: 15px;">กำหนดปิดโหวต: ${new Date(poll.end_date).toLocaleDateString('th-TH')}</p>
            <div style="margin-bottom: 15px;">
                ${(poll.options || []).map(option => `
                    <label style="display: block; margin-bottom: 8px; cursor: pointer;">
                        <input type="radio" name="poll_${poll.poll_id}" value="${option.option_id}" style="margin-right: 8px;">
                        ${option.option_text} (${option.vote_count || 0} โหวต)
                    </label>
                `).join('') || '<p style="color: #999;">ไม่มีตัวเลือกสำหรับการโหวตนี้</p>'}
            </div>
            <button type="button" class="btn btn-primary btn-sm" onclick="submitVote('${poll.poll_id}')">โหวต</button>
            <span style="margin-left: 15px; color: #666;">รวม ${poll.total_votes || 0} โหวต</span>
        </div>
    `).join('');
}

async function submitVote(pollId) {
    const selectedOption = document.querySelector(`input[name="poll_${pollId}"]:checked`);
    if (!selectedOption) { showNotification('กรุณาเลือกตัวเลือกก่อนโหวต', 'warning'); return; }
    try {
        await sendData('voting-results', 'POST', { poll_id: pollId, option_id: selectedOption.value, user_id: currentUser.user_id });
        showNotification('บันทึกการโหวตเรียบร้อยแล้ว', 'success');
        fetchVotingPolls();
    } catch (error) { /* Handled by sendData */ }
}

async function fetchRepairRequests() {
    repairRequestsCache = await fetchData('repair-requests');
    renderRepairRequestsTable();
    loadDashboardStats();
}

function renderRepairRequestsTable() {
    const userRepairColumns = [
        { key: 'request_id', header: 'รหัส', format: (id) => `#${id}` },
        { key: 'title', header: 'หัวข้อ' },
        { key: 'category', header: 'หมวดหมู่' },
        { key: 'submitted_date', header: 'วันที่แจ้ง', format: (date) => new Date(date).toLocaleDateString('th-TH') },
        { key: 'status', header: 'สถานะ', format: (status) => getStatusHtml(status) }
    ];
    renderTable(repairRequestsCache.filter(r => r.user_id === currentUser.user_id), 'repairStatusTable', userRepairColumns, (repair) => `
        <button class="btn btn-secondary btn-sm" onclick="viewRepairDetails(${repair.request_id})">ดูรายละเอียด</button>
    `, 'ไม่มีคำขอแจ้งซ่อม');

    if (currentUser.role === 'admin') {
        const adminRepairColumns = [
            { key: 'request_id', header: 'รหัส', format: (id) => `#${id}` },
            { key: 'user_name', header: 'ผู้แจ้ง', format: (name) => name || 'N/A' },
            { key: 'title', header: 'หัวข้อ' },
            { key: 'category', header: 'หมวดหมู่' },
            { key: 'submitted_date', header: 'วันที่แจ้ง', format: (date) => new Date(date).toLocaleDateString('th-TH') },
            { key: 'status', header: 'สถานะ', format: (status) => getStatusHtml(status) }
        ];
        renderTable(repairRequestsCache, 'manageRepairsTable', adminRepairColumns, (repair) => `
            ${repair.status === 'pending' ? `<button class="btn btn-primary btn-sm" onclick="updateRepairStatus(${repair.request_id}, 'in_progress')">รับเรื่อง</button>` : ''}
            ${repair.status === 'in_progress' ? `<button class="btn btn-primary btn-sm" onclick="updateRepairStatus(${repair.request_id}, 'completed')">เสร็จสิ้น</button>` : ''}
            <button class="btn btn-secondary btn-sm" onclick="viewRepairDetails(${repair.request_id})">ดูรายละเอียด</button>
            ${repair.status !== 'completed' && repair.status !== 'rejected' ? `<button class="btn btn-secondary btn-sm" onclick="updateRepairStatus(${repair.request_id}, 'rejected')">ปฏิเสธ</button>` : ''}
        `, 'ไม่มีคำขอแจ้งซ่อม');
    }
}

async function viewRepairDetails(requestId) {
    const repair = repairRequestsCache.find(r => r.request_id === requestId);
    if (!repair) { showNotification('ไม่พบรายละเอียดงานซ่อมนี้', 'error'); return; }

    document.getElementById('modalRepairId').textContent = repair.request_id;
    document.getElementById('modalRepairReporter').textContent = repair.user_name || 'N/A';
    document.getElementById('modalRepairTitle').textContent = repair.title;
    document.getElementById('modalRepairCategory').textContent = repair.category;
    document.getElementById('modalRepairDate').textContent = new Date(repair.submitted_date).toLocaleDateString('th-TH');
    document.getElementById('modalRepairDescription').textContent = repair.description;

    const modalRepairStatus = document.getElementById('modalRepairStatus');
    modalRepairStatus.textContent = STATUS_MAP[repair.status]?.text || repair.status;
    modalRepairStatus.className = `status-badge ${STATUS_MAP[repair.status]?.class || 'status-info'}`;

    const imageContainer = document.getElementById('modalRepairImageContainer');
    imageContainer.innerHTML = (repair.image_paths && JSON.parse(repair.image_paths).length > 0) ?
        JSON.parse(repair.image_paths).map(path => `<img src="http://localhost:5000/uploads/${path}" alt="${repair.title}" style="max-width: 150px; max-height: 150px; border-radius: 8px; object-fit: cover;">`).join('') :
        '<p style="color: #666;">ไม่มีรูปภาพประกอบ</p>';
    openModal('viewRepairModal');
}

async function updateRepairStatus(requestId, newStatus) {
    try {
        await sendData(`repair-requests/${requestId}`, 'PUT', { status: newStatus });
        showNotification(`อัปเดตสถานะงานซ่อม #${requestId} เป็น ${newStatus} สำเร็จ`, 'success');
        fetchRepairRequests();
    } catch (error) { /* Handled by sendData */ }
}

async function fetchBookingRequests() {
    bookingRequestsCache = await fetchData('booking-requests');
    renderBookingRequestsTable();
}

function renderBookingRequestsTable() {
    const bookingColumns = [
        { key: 'location', header: 'สถานที่' },
        { key: 'date', header: 'วันที่', format: (date) => new Date(date).toLocaleDateString('th-TH') },
        { key: 'start_time', header: 'เวลา', format: (start, item) => `${new Date(`2000-01-01T${start}`).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}-${new Date(`2000-01-01T${item.end_time}`).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}` },
        { key: 'status', header: 'สถานะ', format: (status) => getStatusHtml(status) }
    ];
    renderTable(bookingRequestsCache.filter(b => b.user_id === currentUser.user_id || currentUser.role === 'admin'), 'bookingTable', bookingColumns, (booking) => `
        ${booking.status === 'pending' && currentUser.role === 'admin' ? `<button class="btn btn-primary btn-sm" onclick="updateBookingStatus(${booking.booking_id}, 'approved')">อนุมัติ</button>` : ''}
        ${booking.status === 'pending' && currentUser.role === 'admin' ? `<button class="btn btn-secondary btn-sm" onclick="updateBookingStatus(${booking.booking_id}, 'rejected')">ปฏิเสธ</button>` : ''}
        ${(booking.status === 'approved' || booking.status === 'pending') && booking.user_id === currentUser.user_id ? `<button class="btn btn-secondary btn-sm" onclick="deleteBooking(${booking.booking_id})">ยกเลิก</button>` : ''}
    `, 'ไม่มีการจอง');
}

async function deleteBooking(bookingId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกการจองนี้?')) return;
    try {
        await sendData(`booking-requests/${bookingId}`, 'DELETE');
        showNotification('ยกเลิกการจองสำเร็จ', 'success');
        fetchBookingRequests();
    } catch (error) { /* Handled by sendData */ }
}

async function updateBookingStatus(bookingId, newStatus) {
    try {
        await sendData(`booking-requests/${bookingId}`, 'PUT', { status: newStatus });
        showNotification(`อัปเดตสถานะการจอง #${bookingId} เป็น ${newStatus} สำเร็จ`, 'success');
        fetchBookingRequests();
    } catch (error) { /* Handled by sendData */ }
}

async function fetchDocuments() {
    documentsCache = await fetchData('documents');
    renderDocumentsTable();
}

function renderDocumentsTable() {
    const documentColumns = [
        { key: 'document_name', header: 'ชื่อเอกสาร' },
        { key: 'category', header: 'หมวดหมู่', format: (cat) => cat || 'ทั่วไป' },
        { key: 'upload_date', header: 'วันที่อัปโหลด', format: (date) => new Date(date).toLocaleDateString('th-TH') },
        { key: 'file_size', header: 'ขนาดไฟล์', format: (size) => size || 'N/A' }
    ];
    renderTable(documentsCache.filter(d => d.uploaded_by_user_id === currentUser.user_id || currentUser.role === 'admin'), 'documentsTable', documentColumns, (doc) => `
        <button class="btn btn-secondary btn-sm" onclick="viewDocument('${doc.file_path}')">ดู</button>
        <button class="btn btn-primary btn-sm" onclick="downloadDocument('${doc.file_path}')">ดาวน์โหลด</button>
        <button class="btn btn-secondary btn-sm" onclick="deleteDocument('${doc.document_id}')">ลบ</button>
    `, 'ไม่มีเอกสาร');
}

function viewDocument(filePath) { showNotification(`กำลังจะเปิดเอกสาร: ${filePath}`, 'info'); }
function downloadDocument(filePath) { showNotification(`กำลังดาวน์โหลดเอกสาร: ${filePath}`, 'info'); }

async function deleteDocument(documentId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบเอกสารนี้?')) return;
    try {
        await sendData(`documents/${documentId}`, 'DELETE');
        showNotification('ลบเอกสารสำเร็จ', 'success');
        fetchDocuments();
    } catch (error) { /* Handled by sendData */ }
}

async function fetchSecurityVisitors() {
    const visitors = await fetchData('security-visitors');
    renderSecurityVisitorsTable(visitors);
}

function renderSecurityVisitorsTable(visitors) {
    const visitorColumns = [
        { key: 'name', header: 'ชื่อผู้มาเยือน' },
        { key: 'phone', header: 'เบอร์ติดต่อ', format: (phone) => phone || '-' },
        { key: 'visit_date', header: 'วันที่มาเยือน', format: (date) => new Date(date).toLocaleDateString('th-TH') },
        { key: 'visit_time', header: 'เวลา' },
        { key: 'purpose', header: 'วัตถุประสงค์', format: (purpose) => purpose || '-' }
    ];
    renderTable(visitors.filter(v => currentUser.role === 'admin' || v.user_id === currentUser.user_id), 'visitorLogTable', visitorColumns, () => `<button class="btn btn-secondary btn-sm">รายละเอียด</button>`, 'ไม่มีข้อมูลผู้มาเยือน');
}

async function fetchSecurityIncidents() {
    const incidents = await fetchData('security-incidents');
    renderSecurityIncidentsTable(incidents);
}

function renderSecurityIncidentsTable(incidents) {
    const incidentColumns = [
        { key: 'description', header: 'รายละเอียดเหตุการณ์' },
        { key: 'reported_date', header: 'วันที่รายงาน', format: (date) => new Date(date).toLocaleDateString('th-TH') },
        { key: 'user_name', header: 'ผู้แจ้ง', format: (name) => name || 'N/A' }
    ];
    renderTable(incidents.filter(i => currentUser.role === 'admin' || i.user_id === currentUser.user_id), 'incidentReportTable', incidentColumns, () => `<button class="btn btn-secondary btn-sm">ดูหลักฐาน</button>`, 'ไม่มีรายงานเหตุการณ์ผิดปกติ');
}

async function fetchAllUsers() {
    allUsersCache = await fetchData('users');
    renderManageUsersTable();
    populateBillRecipients();
}

// NEW: Show Add User Modal
async function showAddUserModal() {
    document.getElementById('userModalTitle').innerText = 'เพิ่มผู้ใช้ใหม่';
    document.getElementById('userId').value = '';
    document.getElementById('userForm').reset();
    document.getElementById('userPassword').required = true; // Password is required for new user
    // Set default values for new user
    document.getElementById('userRoleSelect').value = 'resident';
    document.getElementById('userStatusSelect').value = 'pending';
    openModal('userModal');
}

// Modify existing editUser function
async function editUser(userId) {
    const user = allUsersCache.find(u => u.user_id == userId);
    if (!user) {
        showNotification('ไม่พบข้อมูลผู้ใช้', 'error');
        return;
    }

    document.getElementById('userModalTitle').innerText = 'แก้ไขข้อมูลผู้ใช้';
    document.getElementById('userId').value = user.user_id;
    document.getElementById('userName').value = user.name;
    document.getElementById('userUsername').value = user.username;
    document.getElementById('userPassword').value = ''; // Clear password field for security
    document.getElementById('userPassword').required = false; // Password is not required for edit unless changed
    document.getElementById('userPhone').value = user.phone || '';
    document.getElementById('userAddress').value = user.address || '';
    document.getElementById('userRoleSelect').value = user.role;
    document.getElementById('userStatusSelect').value = user.status;

    openModal('userModal');
}

function renderManageUsersTable() {
    const userColumns = [
        { key: 'name', header: 'ชื่อ-นามสกุล' },
        { key: 'address', header: 'ที่อยู่', format: (addr) => addr || '-' },
        { key: 'phone', header: 'เบอร์ติดต่อ', format: (phone) => phone || '-' },
        { key: 'status', header: 'สถานะ', format: (status) => getStatusHtml(status) },
        { key: 'role', header: 'บทบาท', format: (role) => role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้อยู่อาศัย' }
    ];
    renderTable(allUsersCache, 'manageUsersTable', userColumns, (user) => `
        ${user.status === 'pending' ? `<button class="btn btn-primary btn-sm" onclick="updateUserStatus('${user.user_id}', 'approved')">อนุมัติ</button>` : ''}
        ${user.status === 'pending' ? `<button class="btn btn-secondary btn-sm" onclick="updateUserStatus('${user.user_id}', 'rejected')">ปฏิเสธ</button>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="editUser('${user.user_id}')">แก้ไข</button> <!-- Always show edit -->
        ${user.status === 'approved' ? `<button class="btn btn-secondary btn-sm" onclick="updateUserStatus('${user.user_id}', 'suspended')">ระงับ</button>` : ''}
        <button class="btn btn-secondary btn-sm" onclick="deleteUser('${user.user_id}')">ลบ</button> <!-- Add delete button -->
    `, 'ไม่มีข้อมูลผู้ใช้');
}

async function deleteUser(userId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?')) return;
    try {
        await sendData(`users/${userId}`, 'DELETE');
        showNotification('ลบผู้ใช้สำเร็จ', 'success');
        fetchAllUsers();
    } catch (error) { /* Handled by sendData */ }
}

async function updateUserStatus(userId, newStatus) {
    try {
        await sendData(`users/${userId}`, 'PUT', { status: newStatus });
        showNotification(`อัปเดตสถานะผู้ใช้ ID: ${userId} เป็น ${newStatus} สำเร็จ`, 'success');
        fetchAllUsers();
    } catch (error) { /* Handled by sendData */ }
}

function loadDashboardStats() {
    document.getElementById('totalResidents').textContent = allUsersCache.filter(u => u.role === 'resident' && u.status === 'approved').length;
    document.getElementById('pendingRepairs').textContent = repairRequestsCache.filter(r => r.status === 'pending').length;
    document.getElementById('completedRepairs').textContent = repairRequestsCache.filter(r => r.status === 'completed').length;
    document.getElementById('unpaidBills').textContent = billsCache.filter(b => b.status === 'unpaid' || b.status === 'pending_verification').length;

    // Mocked recent activities
    document.getElementById('recentActivities').innerHTML = `
        <tr><td>10:30</td><td>แจ้งซ่อมไฟฟ้า</td><td>คุณสมชาย ใจดี</td><td>${getStatusHtml('pending')}</td></tr>
        <tr><td>09:15</td><td>ชำระค่าส่วนกลาง</td><td>คุณมาลี สวยใส</td><td>${getStatusHtml('completed')}</td></tr>
        <tr><td>08:45</td><td>จองสนามกีฬา</td><td>คุณวิชัย กล้าหาญ</td><td>${getStatusHtml('approved')}</td></tr>
    `;
}

async function loadProfileData() {
    try {
        const data = await fetchData(`users/${currentUser.user_id}`);
        Object.assign(currentUser, data);
        sessionStorage.setItem('userData', JSON.stringify(currentUser));
        ['profileName', 'profilePhone', 'profileEmail', 'profileAddress'].forEach(id => document.getElementById(id).value = currentUser[id.replace('profile', '').toLowerCase()] || '');
    } catch (error) { /* Handled by fetchData */ }
}

async function fetchBills() {
    billsCache = await fetchData('bills');
    renderManageBillsTable();
    loadDashboardStats();
}

function renderManageBillsTable() {
    const billColumns = [
        { key: 'item_name', header: 'รายการ' },
        { key: 'recipient_id', header: 'สำหรับผู้ใช้', format: (id) => id === 'all' ? 'ทุกคนในหมู่บ้าน' : allUsersCache.find(u => u.user_id === id)?.name || 'ผู้ใช้ไม่ระบุ' },
        { key: 'amount', header: 'ยอดเงิน (บาท)', format: (amount) => parseFloat(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
        { key: 'due_date', header: 'กำหนดชำระ', format: (date) => new Date(date).toLocaleDateString('th-TH') },
        { key: 'status', header: 'สถานะ', format: (status) => getStatusHtml(status) }
    ];
    renderTable(billsCache, 'manageBillsTable', billColumns, (bill) => `
        <button class="btn btn-secondary btn-sm" onclick="editBill('${bill.bill_id}')">แก้ไข</button>
        <button class="btn btn-secondary btn-sm" onclick="deleteBill('${bill.bill_id}')">ลบ</button>
        ${bill.status === 'pending_verification' ? `<button class="btn btn-primary btn-sm" onclick="approvePaymentForBill('${bill.bill_id}')">อนุมัติการชำระ</button>` : ''}
    `, 'ไม่มีบิลค่าใช้จ่าย');
}

async function showAddBillModal() {
    document.getElementById('billModalTitle').innerText = 'เพิ่มบิลค่าใช้จ่ายใหม่';
    document.getElementById('billId').value = '';
    document.getElementById('billForm').reset();
    await populateBillRecipients();
    document.getElementById('billRecipient').value = 'all';
    openModal('manageBillModal');
}

async function populateBillRecipients() {
    const billRecipientSelect = document.getElementById('billRecipient');
    if (!billRecipientSelect) return;
    billRecipientSelect.innerHTML = '<option value="all">ทุกคนในหมู่บ้าน</option>';
    if (allUsersCache.length === 0) await fetchAllUsers();
    allUsersCache.filter(u => u.role === 'resident' && u.status === 'approved').forEach(user => {
        billRecipientSelect.innerHTML += `<option value="${user.user_id}">${user.name} (${user.address})</option>`;
    });
}

async function handleBillSubmit(e) {
    e.preventDefault();
    const [id, itemName, amount, dueDate, recipientId] = ['billId', 'billItemName', 'billAmount', 'billDueDate', 'billRecipient'].map(id => document.getElementById(id).value);
    const billData = { item_name: itemName, amount: parseFloat(amount), due_date: dueDate, recipient_id: recipientId, issued_by_user_id: currentUser.user_id, status: 'unpaid' };
    try {
        id ? await sendData(`bills/${id}`, 'PUT', billData) : await sendData('bills', 'POST', billData);
        showNotification('บันทึกบิลสำเร็จ', 'success');
        closeModal('manageBillModal');
    } catch (error) { /* Handled by sendData */ }
}

async function editBill(billId) {
    const bill = billsCache.find(b => b.bill_id == billId);
    if (!bill) return;
    document.getElementById('billModalTitle').innerText = 'แก้ไขบิลค่าใช้จ่าย';
    document.getElementById('billId').value = bill.bill_id;
    document.getElementById('billItemName').value = bill.item_name;
    document.getElementById('billAmount').value = bill.amount;
    document.getElementById('billDueDate').value = new Date(bill.due_date).toISOString().slice(0, 10);
    await populateBillRecipients();
    document.getElementById('billRecipient').value = bill.recipient_id;
    openModal('manageBillModal');
}

async function deleteBill(billId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบบิลนี้?')) return;
    try {
        await sendData(`bills/${billId}`, 'DELETE');
        showNotification('ลบบิลสำเร็จ', 'success');
    } catch (error) { /* Handled by sendData */ }
}

async function approvePaymentForBill(billId) {
    const bill = billsCache.find(b => b.bill_id === billId && b.status === 'pending_verification');
    if (!bill) { showNotification('ไม่พบการชำระเงินที่รออนุมัติสำหรับบิลนี้', 'warning'); return; }
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะอนุมัติการชำระเงินสำหรับบิล "${bill.item_name}"?`)) return;
    try {
        await sendData(`payments/approve/${bill.payment_id}`, 'PUT', { status: 'paid' });
        showNotification(`อนุมัติการชำระเงินสำหรับบิล "${bill.item_name}" สำเร็จ`, 'success');
        fetchBills();
        fetchPayments();
    } catch (error) { /* Handled by sendData */ }
}

// --- Chart.js for Reports Page ---
let monthlyChartInstance = null;
function renderMonthlyChart() {
    const ctx = document.getElementById('monthlyChart');
    if (!ctx) { console.warn("Canvas element 'monthlyChart' not found."); return; }
    if (monthlyChartInstance) monthlyChartInstance.destroy();
    const data = {
        labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
        datasets: [{ label: 'รายรับ (บาท)', data: [120000, 130000, 110000, 140000, 150000, 135000, 145000, 160000, 155000, 170000, 165000, 180000], backgroundColor: 'rgba(102, 126, 234, 0.6)', borderColor: 'rgba(102, 126, 234, 1)', borderWidth: 1, fill: true, tension: 0.3 },
                   { label: 'รายจ่าย (บาท)', data: [80000, 90000, 85000, 95000, 100000, 90000, 98000, 105000, 100000, 110000, 108000, 115000], backgroundColor: 'rgba(255, 99, 132, 0.6)', borderColor: 'rgba(255, 99, 132, 1)', borderWidth: 1, fill: true, tension: 0.3 }]
    };
    const config = { type: 'line', data: data, options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'สรุปรายรับ-รายจ่ายรายเดือน' } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'จำนวนเงิน (บาท)' } }, x: { title: { display: true, text: 'เดือน' } } } } };
    monthlyChartInstance = new Chart(ctx, config);
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
    window.onclick = (event) => document.querySelectorAll('.modal').forEach(modal => { if (event.target === modal && modal.style.display !== 'none') closeModal(modal.id); });
    const headerH1 = document.querySelector('.header-content h1');
    if (headerH1) {
        if (window.innerWidth <= 768) { headerH1.style.cursor = 'pointer'; headerH1.addEventListener('click', toggleSidebar); }
        window.addEventListener('resize', () => {
            document.getElementById('sidebar')?.classList.toggle('open', window.innerWidth <= 768 && document.getElementById('sidebar').classList.contains('open'));
            headerH1.style.cursor = window.innerWidth <= 768 ? 'pointer' : 'default';
            headerH1.removeEventListener('click', toggleSidebar);
            if (window.innerWidth <= 768) headerH1.addEventListener('click', toggleSidebar);
        });
    }
    setupDynamicFormListeners();
}

function setupDynamicFormListeners() {
    const formHandlers = [
        { id: 'repairForm', handler: handleRepairSubmit }, { id: 'bookingForm', handler: handleBookingSubmit },
        { id: 'paymentForm', handler: handlePaymentSubmit }, { id: 'profileForm', handler: handleProfileUpdate },
        { id: 'changePasswordForm', handler: handlePasswordChange }, { id: 'visitorForm', handler: handleVisitorSubmit },
        { id: 'incidentForm', handler: handleIncidentSubmit }, { id: 'documentUploadForm', handler: handleDocumentUpload },
        { id: 'announcementForm', handler: handleAnnouncementSubmit }, { id: 'billForm', handler: handleBillSubmit },
        { id: 'userForm', handler: handleUserSubmit } // NEW: Add user form handler
    ];
    formHandlers.forEach(({ id, handler }) => {
        const form = document.getElementById(id);
        if (form) { form.removeEventListener('submit', handler); form.addEventListener('submit', handler); }
    });

    const fileInputPreviews = [
        { inputId: 'paymentSlipFile', previewId: 'paymentSlipPreview' }, { inputId: 'documentFile', previewId: 'documentFilePreview' },
        { inputId: 'repairImages', previewId: 'repairImagesPreview' }, { inputId: 'incidentEvidence', previewId: 'incidentEvidencePreview' },
        { inputId: 'profileDocuments', previewId: 'profileDocumentsPreview' }
    ];
    fileInputPreviews.forEach(({ inputId, previewId }) => {
        const input = document.getElementById(inputId);
        if (input) { input.removeEventListener('change', () => handleFileUpload(inputId, previewId)); input.addEventListener('change', () => handleFileUpload(inputId, previewId)); }
    });

    document.getElementById('paymentMethod')?.removeEventListener('change', showQRCode);
    document.getElementById('paymentMethod')?.addEventListener('change', showQRCode);

    document.getElementById('chatInput')?.removeEventListener('keypress', handleChatInputKeypress);
    document.getElementById('chatInput')?.addEventListener('keypress', handleChatInputKeypress);
}

function handleChatInputKeypress(e) { if (e.key === 'Enter') sendMessage(); }
function toggleSidebar() { document.getElementById('sidebar')?.classList.toggle('open'); }

function initializeSocketIO() {
    if (socket && socket.connected) socket.disconnect();
    socket = io('http://localhost:5000');
    socket.on('connect', () => {
        console.log('Connected to WebSocket server');
        if (currentUser.user_id) { socket.emit('join_chat_room', { room_name: 'general_chat' }); if (currentUser.role === 'admin') socket.emit('join_chat_room', { room_name: 'admins' }); }
        fetchChatMessages();
    });
    socket.on('disconnect', () => console.log('Disconnected from WebSocket server'));
    socket.on('receive_message', (data) => { chatMessagesCache.push(data); displayChatMessages(); });
    socket.on('new_announcement', (data) => { announcementsCache.unshift(data); showNotification(`ประกาศใหม่: ${data.title}`, 'info'); if (document.getElementById('announcements').classList.contains('page-content')) renderAnnouncements(); });
    socket.on('announcement_updated', (data) => { const idx = announcementsCache.findIndex(a => a.announcement_id === data.announcement_id); if (idx !== -1) announcementsCache[idx] = data; showNotification(`ประกาศ "${data.title}" ได้รับการแก้ไข`, 'info'); if (document.getElementById('announcements').classList.contains('page-content')) renderAnnouncements(); });
    socket.on('announcement_deleted', (data) => { announcementsCache = announcementsCache.filter(a => a.announcement_id !== data.announcement_id); showNotification(`ประกาศถูกลบแล้ว`, 'info'); if (document.getElementById('announcements').classList.contains('page-content')) renderAnnouncements(); });
    socket.on('new_repair_request', (data) => { if (currentUser.role === 'admin') { showNotification(`มีคำขอแจ้งซ่อมใหม่: ${data.title} โดย ${data.user_name || 'ผู้ใช้งาน'}`, 'warning'); fetchRepairRequests(); } });
    socket.on('repair_status_updated', (data) => { if (currentUser.user_id === data.user_id) { showNotification(`สถานะงานซ่อม "${data.title}" เปลี่ยนเป็น "${data.status}"`, 'success'); fetchRepairRequests(); } });
    socket.on('new_booking_request', (data) => { if (currentUser.role === 'admin') { showNotification(`มีการจองพื้นที่ใหม่: ${data.location} โดย ${data.user_name || 'ผู้ใช้งาน'}`, 'warning'); fetchBookingRequests(); } });
    socket.on('new_payment_receipt', (data) => { if (currentUser.role === 'admin') { showNotification(`มีหลักฐานการชำระเงินใหม่: ${data.amount} บาท โดย ${data.user_name || 'ผู้ใช้งาน'}`, 'warning'); fetchPayments(); } });
    socket.on('new_bill_created', (data) => { showNotification(`มีบิลใหม่: ${data.item_name} จำนวน ${data.amount} บาท`, 'info'); if (currentUser.role === 'admin') fetchBills(); else if (data.recipient_id === 'all' || data.recipient_id === currentUser.user_id) fetchPayments(); });
    socket.on('bill_updated', (data) => { showNotification(`บิล "${data.item_name}" ได้รับการแก้ไข`, 'info'); if (currentUser.role === 'admin') fetchBills(); else if (data.recipient_id === 'all' || data.recipient_id === currentUser.user_id) fetchPayments(); });
    socket.on('bill_deleted', (data) => { showNotification(`บิล "${data.item_name}" ถูกลบแล้ว`, 'info'); if (currentUser.role === 'admin') fetchBills(); else if (data.recipient_id === 'all' || data.recipient_id === currentUser.user_id) fetchPayments(); });
    socket.on('new_visitor_registered', (data) => { if (currentUser.role === 'admin') { showNotification(`ผู้มาเยือนใหม่: ${data.name} ที่บ้าน ${data.user_name || 'ผู้ใช้งาน'}`, 'info'); fetchSecurityVisitors(); } });
    socket.on('new_incident_reported', (data) => { if (currentUser.role === 'admin') { showNotification(`มีรายงานเหตุการณ์ผิดปกติ: ${data.description}`, 'error'); fetchSecurityIncidents(); } });
    socket.on('new_calendar_event', (data) => { showNotification(`มีกิจกรรมใหม่: ${data.event_name} ในวันที่ ${new Date(data.event_date).toLocaleDateString('th-TH')}`, 'info'); fetchCalendarEvents(); if (document.getElementById('calendar').classList.contains('page-content')) generateCalendar(); });
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    const storedUserData = sessionStorage.getItem('userData');
    if (storedUserData) { currentUser = JSON.parse(storedUserData); showDashboard(); initializeSocketIO(); } else { showLogin(); }
    setupEventListeners();
});

window.confirm = (message) => window.prompt(message + "\n(พิมพ์ 'yes' เพื่อยืนยัน)");
