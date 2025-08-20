// script.js

// --- Global Data Variables (Will be loaded from Backend via API or SocketIO) ---
let currentUser = {
    user_id: null, // เพิ่ม user_id
    name: 'ผู้ใช้งาน',
    role: 'resident', // resident, admin
    avatar: 'A'
};

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

// Data arrays (will be loaded from backend via API calls)
let announcements = []; // Array of announcement objects
let repairRequests = []; // Array of repair request objects
let bookingRequests = []; // Array of booking request objects
let documents = []; // Array of document objects
let chatMessages = []; // Array of chat messages for the main chat (managed by SocketIO)
let calendarEvents = {}; // Events for the calendar
let allUsers = []; // สำหรับเก็บข้อมูลผู้ใช้ทั้งหมด (เช่น สำหรับหน้าจัดการผู้ใช้)

// --- Socket.IO Client (for real-time communication) ---
let socket = null; // จะถูกกำหนดค่าเมื่อ DOMContentLoaded

function initializeSocketIO() {
    // กำหนด URL ของ Flask Backend
    socket = io('http://localhost:5000'); 

    socket.on('connect', () => {
        console.log('Connected to WebSocket server');
        // เมื่อเชื่อมต่อสำเร็จ สามารถ join room ที่ต้องการได้
        // เช่น join_room('general_chat') หรือ join_room('user_{user_id}')
        if (currentUser.user_id) {
            socket.emit('join_chat_room', { room_name: 'general_chat' });
            // ถ้าเป็น admin อาจ join ห้อง admin เพื่อรับการแจ้งเตือนพิเศษ
            if (currentUser.role === 'admin') {
                socket.emit('join_chat_room', { room_name: 'admins' });
            }
        }
        // โหลดข้อความแชทเก่าเมื่อเชื่อมต่อ
        fetchChatMessages();
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
    });

    // Event Listener สำหรับรับข้อความแชทใหม่
    socket.on('receive_message', (data) => {
        console.log('New message received:', data);
        // เพิ่มข้อความใหม่เข้าใน Array และแสดงผลทันที
        chatMessages.push({
            sender_id: data.sender_id,
            sender_name: data.sender_name,
            sender_avatar: data.sender_avatar,
            content: data.content,
            time: new Date(data.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            type: data.sender_id === currentUser.user_id ? 'own' : 'other'
        });
        displayChatMessages(); // แสดงข้อความทั้งหมด
    });

    // Event Listener สำหรับประกาศใหม่ (Real-time Announcements)
    socket.on('new_announcement', (data) => {
        console.log('New announcement received:', data);
        announcements.unshift(data); // เพิ่มประกาศใหม่
        showNotification(`ประกาศใหม่: ${data.title}`, 'info');
        if (document.getElementById('announcements').classList.contains('page-content')) {
            loadAnnouncements(); // ถ้าอยู่ในหน้าประกาศ ให้โหลดใหม่
        }
    });

    socket.on('announcement_updated', (data) => {
        console.log('Announcement updated:', data);
        const index = announcements.findIndex(ann => ann.announcement_id === data.announcement_id);
        if (index !== -1) {
            announcements[index] = data;
        }
        showNotification(`ประกาศ "${data.title}" ได้รับการแก้ไข`, 'info');
        if (document.getElementById('announcements').classList.contains('page-content')) {
            loadAnnouncements();
        }
    });

    socket.on('announcement_deleted', (data) => {
        console.log('Announcement deleted:', data);
        announcements = announcements.filter(ann => ann.announcement_id !== data.announcement_id);
        showNotification(`ประกาศถูกลบแล้ว`, 'info');
        if (document.getElementById('announcements').classList.contains('page-content')) {
            loadAnnouncements();
        }
    });

    // Event Listener สำหรับแจ้งเตือนงานซ่อมใหม่ (สำหรับ Admin)
    socket.on('new_repair_request', (data) => {
        if (currentUser.role === 'admin') {
            showNotification(`มีคำขอแจ้งซ่อมใหม่: ${data.title} โดย ${data.user_name || 'ผู้ใช้งาน'}`, 'warning');
            fetchRepairRequests(); // โหลดข้อมูลงานซ่อมใหม่สำหรับ admin
        }
    });

    // Event Listener สำหรับการอัปเดตสถานะงานซ่อม (สำหรับผู้แจ้ง)
    socket.on('repair_status_updated', (data) => {
        if (currentUser.user_id === data.user_id) {
            showNotification(`สถานะงานซ่อม "${data.title}" เปลี่ยนเป็น "${data.status}"`, 'success');
            fetchRepairRequests(); // โหลดข้อมูลงานซ่อมใหม่สำหรับผู้แจ้ง
        }
    });

    // Event Listener สำหรับการแจ้งเตือนอื่นๆ (Booking, Payments, Security)
    socket.on('new_booking_request', (data) => {
        if (currentUser.role === 'admin') {
            showNotification(`มีการจองพื้นที่ใหม่: ${data.location} โดย ${data.user_name || 'ผู้ใช้งาน'}`, 'warning');
            fetchBookingRequests();
        }
    });

    socket.on('new_payment_receipt', (data) => {
        if (currentUser.role === 'admin') {
            showNotification(`มีหลักฐานการชำระเงินใหม่: ${data.amount} บาท โดย ${data.user_name || 'ผู้ใช้งาน'}`, 'warning');
            fetchPayments();
        }
    });

    socket.on('new_visitor_registered', (data) => {
        if (currentUser.role === 'admin') {
            showNotification(`ผู้มาเยือนใหม่: ${data.name} ที่บ้าน ${data.user_name || 'ผู้ใช้งาน'}`, 'info');
            fetchSecurityVisitors();
        }
    });

    socket.on('new_incident_reported', (data) => {
        if (currentUser.role === 'admin') {
            showNotification(`มีรายงานเหตุการณ์ผิดปกติ: ${data.description}`, 'error');
            fetchSecurityIncidents();
        }
    });

    socket.on('new_calendar_event', (data) => {
        showNotification(`มีกิจกรรมใหม่: ${data.event_name} ในวันที่ ${new Date(data.event_date).toLocaleDateString('th-TH')}`, 'info');
        fetchCalendarEvents();
        if (document.getElementById('calendar').classList.contains('page-content')) {
             generateCalendar(); // โหลดปฏิทินใหม่
        }
    });
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Form submissions
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    setupDynamicFormListeners(); // Setup dynamic form listeners for the currently active page

    // Click outside modal to close
    window.onclick = function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal && modal.style.display !== 'none') { // Check if modal is actually visible
                closeModal(modal.id);
            }
        });
    };

    // Responsive sidebar toggle for mobile
    const headerH1 = document.querySelector('.header-content h1');
    if (headerH1) {
        if (window.innerWidth <= 768) {
            headerH1.style.cursor = 'pointer';
            headerH1.addEventListener('click', toggleSidebar);
        }
    }

    // Handle window resize for sidebar
    window.addEventListener('resize', function() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && window.innerWidth > 768) {
            sidebar.classList.remove('open');
        }
    });
}

// Function to set up listeners for forms that are loaded dynamically
function setupDynamicFormListeners() {
    // Remove existing listeners to prevent duplicates if called multiple times
    document.querySelectorAll('form').forEach(form => {
        form.removeEventListener('submit', handleRepairSubmit);
        form.removeEventListener('submit', handleBookingSubmit);
        form.removeEventListener('submit', handlePaymentSubmit);
        form.removeEventListener('submit', handleProfileUpdate);
        form.removeEventListener('submit', handlePasswordChange);
        form.removeEventListener('submit', handleVisitorSubmit);
        form.removeEventListener('submit', handleIncidentSubmit);
        form.removeEventListener('submit', handleDocumentUpload);
        form.removeEventListener('submit', handleAnnouncementSubmit);
    });

    const repairForm = document.getElementById('repairForm');
    if (repairForm) repairForm.addEventListener('submit', handleRepairSubmit);

    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) bookingForm.addEventListener('submit', handleBookingSubmit);

    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) paymentForm.addEventListener('submit', handlePaymentSubmit);

    const profileForm = document.getElementById('profileForm');
    if (profileForm) profileForm.addEventListener('submit', handleProfileUpdate);

    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) changePasswordForm.addEventListener('submit', handlePasswordChange);

    const visitorForm = document.getElementById('visitorForm');
    if (visitorForm) visitorForm.addEventListener('submit', handleVisitorSubmit);

    const incidentForm = document.getElementById('incidentForm');
    if (incidentForm) incidentForm.addEventListener('submit', handleIncidentSubmit);

    const documentUploadForm = document.getElementById('documentUploadForm');
    if (documentUploadForm) documentUploadForm.addEventListener('submit', handleDocumentUpload);

    const announcementForm = document.getElementById('announcementForm');
    if (announcementForm) announcementForm.addEventListener('submit', handleAnnouncementSubmit);

    // File upload preview listeners
    const paymentSlipFile = document.getElementById('paymentSlipFile');
    if (paymentSlipFile) paymentSlipFile.addEventListener('change', () => handleFileUpload('paymentSlipFile', 'paymentSlipPreview'));
    
    const documentFile = document.getElementById('documentFile');
    if (documentFile) documentFile.addEventListener('change', () => handleFileUpload('documentFile', 'documentFilePreview'));
    
    const repairImages = document.getElementById('repairImages');
    if (repairImages) repairImages.addEventListener('change', () => handleFileUpload('repairImages', 'repairImagesPreview'));
    
    const incidentEvidence = document.getElementById('incidentEvidence');
    if (incidentEvidence) incidentEvidence.addEventListener('change', () => handleFileUpload('incidentEvidence', 'incidentEvidencePreview'));
    
    const profileDocuments = document.getElementById('profileDocuments');
    if (profileDocuments) profileDocuments.addEventListener('change', () => handleFileUpload('profileDocuments', 'profileDocumentsPreview'));

    // Payment method change listener (for the modal)
    const paymentMethodSelect = document.getElementById('paymentMethod');
    if (paymentMethodSelect) {
        paymentMethodSelect.removeEventListener('change', showQRCode); // Prevent duplicates
        paymentMethodSelect.addEventListener('change', showQRCode);
    }

    // Chat input (Enter key)
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.removeEventListener('keypress', handleChatInputKeypress); // Prevent duplicates
        chatInput.addEventListener('keypress', handleChatInputKeypress);
    }
}

function handleChatInputKeypress(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
}

// --- Authentication Functions (Updated to use Backend API) ---
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://localhost:5000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (response.ok) {
            currentUser = {
                user_id: data.user_id,
                name: data.name,
                role: data.role,
                avatar: data.avatar
            };
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userData', JSON.stringify(currentUser));
            
            showNotification('เข้าสู่ระบบสำเร็จ', 'success');
            showDashboard();
            initializeSocketIO(); // Re-initialize Socket.IO after login to join user-specific rooms
        } else {
            showNotification(data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const phone = document.getElementById('regPhone').value;
    const address = document.getElementById('regAddress').value;

    if (password !== confirmPassword) {
        showNotification('รหัสผ่านไม่ตรงกัน', 'error');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:5000/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, password, phone, address, role: 'resident' })
        });
        const data = await response.json();

        if (response.ok) {
            showNotification(data.message || 'ส่งคำขอลงทะเบียนสำเร็จ รอการอนุมัติจากผู้ดูแล', 'success');
            document.getElementById('registerForm').reset();
            setTimeout(() => {
                showLogin();
            }, 2000);
        } else {
            showNotification(data.message || 'เกิดข้อผิดพลาดในการลงทะเบียน', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}

function logout() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userData');
    currentUser = { user_id: null, name: 'ผู้ใช้งาน', role: 'resident', avatar: 'A' }; // Reset current user
    if (socket && socket.connected) {
        socket.disconnect(); // ตัดการเชื่อมต่อ WebSocket
    }
    showNotification('ออกจากระบบแล้ว', 'success');
    showLogin();
}

// --- Page Navigation Functions ---
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
    showPage('dashboard-home'); // Default page to show after login
}

const pageMap = {
    'dashboard-home': { id: 'dashboard-home', loadFunc: loadDashboardStats },
    'profile': { id: 'profile', loadFunc: loadProfileData },
    'repair-request': { id: 'repair-request', loadFunc: fetchRepairRequests }, // ใช้ fetch แทน load...Table
    'announcements': { id: 'announcements', loadFunc: fetchAnnouncements },
    'payments': { id: 'payments', loadFunc: fetchPayments },
    'booking': { id: 'booking', loadFunc: fetchBookingRequests },
    'calendar': { id: 'calendar', loadFunc: fetchCalendarEvents },
    'chat': { id: 'chat', loadFunc: fetchChatMessages },
    'documents': { id: 'documents', loadFunc: fetchDocuments },
    'security': { id: 'security', loadFunc: () => { fetchSecurityVisitors(); fetchSecurityIncidents(); } }, // โหลดทั้งสองส่วน
    'voting': { id: 'voting', loadFunc: fetchVotingPolls },
    'manage-users': { id: 'manage-users', loadFunc: fetchAllUsers },
    'manage-repairs': { id: 'manage-repairs', loadFunc: fetchRepairRequests }, // ใช้ร่วมกัน
    'reports': { id: 'reports', loadFunc: renderMonthlyChart }
};

let currentPageContentElement = null; // Keep track of the currently displayed page content element

function showPage(pageId) {
    const pageInfo = pageMap[pageId];
    if (!pageInfo) {
        console.error(`Page ID "${pageId}" not found in pageMap.`);
        return;
    }

    // Hide all page content divs
    document.querySelectorAll('.page-content').forEach(pageDiv => {
        pageDiv.classList.add('hidden');
    });

    // Show the target page content div
    const targetContentDiv = document.getElementById(pageInfo.id);
    if (targetContentDiv) {
        targetContentDiv.classList.remove('hidden');
        currentPageContentElement = targetContentDiv; // Update current page tracker
    } else {
        console.error(`Content div with ID "${pageInfo.id}" not found.`);
        return;
    }

    // Update active menu
    const menuItems = document.querySelectorAll('.sidebar-menu a');
    menuItems.forEach(item => item.classList.remove('active'));
    
    const activeLink = document.querySelector(`.sidebar-menu a[onclick*="showPage('${pageId}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Load page-specific data and setup dynamic listeners
    if (pageInfo.loadFunc) {
        pageInfo.loadFunc();
    }
    setupDynamicFormListeners(); // Re-attach listeners for forms on the newly visible page

    // Close sidebar on mobile after selecting a page
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}

function updateUserInfo() {
    const userNameElem = document.getElementById('userName');
    const userRoleElem = document.getElementById('userRole');
    const userAvatarElem = document.getElementById('userAvatar');

    if (userNameElem) userNameElem.textContent = currentUser.name;
    if (userRoleElem) userRoleElem.textContent = currentUser.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้อยู่อาศัย';
    if (userAvatarElem) userAvatarElem.textContent = currentUser.avatar;
    
    // Show/hide admin menu items based on role
    const adminMenus = document.querySelectorAll('.admin-menu');
    const residentMenus = document.querySelectorAll('.resident-menu');
    
    if (currentUser.role === 'admin') {
        adminMenus.forEach(menu => menu.classList.remove('hidden'));
        residentMenus.forEach(menu => menu.classList.remove('hidden')); // Admins can also see resident menus
    } else {
        adminMenus.forEach(menu => menu.classList.add('hidden'));
        residentMenus.forEach(menu => menu.classList.remove('hidden'));
    }
}

// --- Form Handlers (Updated to use Backend API) ---
async function handleRepairSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('repairTitle').value;
    const category = document.getElementById('repairCategory').value;
    const description = document.getElementById('repairDescription').value;
    // In a real app, handle file uploads to a storage service (e.g., S3, Google Cloud Storage)
    // For now, we'll just log the file names.
    const repairImagesInput = document.getElementById('repairImages');
    const imageFiles = repairImagesInput ? Array.from(repairImagesInput.files) : [];
    const imagePaths = JSON.stringify(imageFiles.map(f => f.name)); // Mocking file paths

    try {
        const response = await fetch('http://localhost:5000/repair-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.user_id, // ใช้ user_id จาก currentUser
                title,
                category,
                description,
                image_paths: imagePaths
            })
        });
        const data = await response.json();

        if (response.ok) {
            showNotification('ส่งคำขอแจ้งซ่อมเรียบร้อยแล้ว', 'success');
            document.getElementById('repairForm').reset();
            document.getElementById('repairImagesPreview').innerHTML = ''; // Clear preview
            fetchRepairRequests(); // Reload data
        } else {
            showNotification(data.message || 'เกิดข้อผิดพลาดในการส่งคำขอแจ้งซ่อม', 'error');
        }
    } catch (error) {
        console.error('Repair submission error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    const location = document.getElementById('bookingLocation').value;
    const date = document.getElementById('bookingDate').value;
    const timeStart = document.getElementById('bookingTimeStart').value;
    const timeEnd = document.getElementById('bookingTimeEnd').value;
    const purpose = document.getElementById('bookingPurpose').value;
    const attendeeCount = document.getElementById('attendeeCount').value;

    try {
        const response = await fetch('http://localhost:5000/booking-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.user_id,
                location,
                date,
                start_time: timeStart,
                end_time: timeEnd,
                purpose,
                attendee_count: parseInt(attendeeCount)
            })
        });
        const data = await response.json();

        if (response.ok) {
            showNotification('ส่งคำขอจองเรียบร้อยแล้ว', 'success');
            document.getElementById('bookingForm').reset();
            fetchBookingRequests(); // Reload data
        } else {
            showNotification(data.message || 'เกิดข้อผิดพลาดในการส่งคำขอจอง', 'error');
        }
    } catch (error) {
        console.error('Booking submission error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}

async function handlePaymentSubmit(e) {
    e.preventDefault();
    const paymentAmount = document.getElementById('paymentAmount').value.replace(' บาท', '').replace(/,/g, ''); // Clean amount
    const paymentMethod = document.getElementById('paymentMethod').value;
    // Mocking file upload: in a real app, you'd upload this to a storage service
    const paymentSlipFile = document.getElementById('paymentSlipFile') ? document.getElementById('paymentSlipFile').files[0] : null;
    const slipPath = paymentSlipFile ? paymentSlipFile.name : null; // Mocking file path

    if (!paymentSlipFile) {
        showNotification('กรุณาอัปโหลดหลักฐานการโอนเงิน', 'error');
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.user_id,
                amount: parseFloat(paymentAmount),
                payment_method: paymentMethod,
                status: 'pending', // สถานะเริ่มต้น
                slip_path: slipPath
            })
        });
        const data = await response.json();

        if (response.ok) {
            showNotification('ส่งหลักฐานการชำระเงินเรียบร้อยแล้ว รอการตรวจสอบ', 'success');
            closeModal('paymentModal');
            document.getElementById('paymentForm').reset();
            document.getElementById('paymentSlipPreview').innerHTML = ''; // Clear preview
            fetchPayments(); // Reload data
        } else {
            showNotification(data.message || 'เกิดข้อผิดพลาดในการส่งหลักฐานการชำระเงิน', 'error');
        }
    } catch (error) {
        console.error('Payment submission error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    const profileName = document.getElementById('profileName').value;
    const profilePhone = document.getElementById('profilePhone').value;
    const profileEmail = document.getElementById('profileEmail').value;
    const profileAddress = document.getElementById('profileAddress').value;
    // Mocking document upload
    const profileDocumentsInput = document.getElementById('profileDocuments');
    const documentFiles = profileDocumentsInput ? Array.from(profileDocumentsInput.files) : [];
    // You would upload these files and store their paths in the backend

    try {
        const response = await fetch(`http://localhost:5000/users/${currentUser.user_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: profileName,
                phone: profilePhone,
                email: profileEmail,
                address: profileAddress
                // No password here, separate update for that
            })
        });
        const data = await response.json();

        if (response.ok) {
            // Update current user data in frontend
            currentUser.name = profileName;
            currentUser.phone = profilePhone;
            currentUser.email = profileEmail;
            currentUser.address = profileAddress;
            sessionStorage.setItem('userData', JSON.stringify(currentUser));
            updateUserInfo();
            showNotification('อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว', 'success');
            document.getElementById('profileDocumentsPreview').innerHTML = ''; // Clear preview
        } else {
            showNotification(data.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล', 'error');
        }
    } catch (error) {
        console.error('Profile update error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword !== confirmNewPassword) {
        showNotification('รหัสผ่านใหม่ไม่ตรงกัน', 'error');
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:5000/users/${currentUser.user_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: newPassword, // Backend will hash this
                current_password: currentPassword // For verification on backend
            })
        });
        const data = await response.json();

        if (response.ok) {
            showNotification('เปลี่ยนรหัสผ่านสำเร็จ', 'success');
            document.getElementById('changePasswordForm').reset();
        } else {
            showNotification(data.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน', 'error');
        }
    } catch (error) {
        console.error('Password change error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}

async function handleVisitorSubmit(e) {
    e.preventDefault();
    const visitorName = document.getElementById('visitorName').value;
    const visitorPhone = document.getElementById('visitorPhone').value;
    const visitDate = document.getElementById('visitDate').value;
    const visitTime = document.getElementById('visitTime').value;
    const visitPurpose = document.getElementById('visitPurpose').value;

    try {
        const response = await fetch('http://localhost:5000/security-visitors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.user_id,
                name: visitorName,
                phone: visitorPhone,
                visit_date: visitDate,
                visit_time: visitTime,
                purpose: visitPurpose
            })
        });
        const data = await response.json();

        if (response.ok) {
            showNotification('แจ้งผู้มาเยือนเรียบร้อยแล้ว', 'success');
            document.getElementById('visitorForm').reset();
            fetchSecurityVisitors();
        } else {
            showNotification(data.message || 'เกิดข้อผิดพลาดในการแจ้งผู้มาเยือน', 'error');
        }
    } catch (error) {
        console.error('Visitor submission error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}

async function handleIncidentSubmit(e) {
    e.preventDefault();
    const incidentType = document.getElementById('incidentType').value;
    const incidentLocation = document.getElementById('incidentLocation').value;
    const incidentDescription = document.getElementById('incidentDescription').value;
    // Mocking file upload
    const incidentEvidenceInput = document.getElementById('incidentEvidence');
    const evidenceFiles = incidentEvidenceInput ? Array.from(incidentEvidenceInput.files) : [];
    const evidencePaths = JSON.stringify(evidenceFiles.map(f => f.name));

    try {
        const response = await fetch('http://localhost:5000/security-incidents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.user_id,
                description: `ประเภท: ${incidentType}, สถานที่: ${incidentLocation}, รายละเอียด: ${incidentDescription}`,
                evidence_paths: evidencePaths
            })
        });
        const data = await response.json();

        if (response.ok) {
            showNotification('ส่งรายงานเหตุการณ์ผิดปกติเรียบร้อยแล้ว', 'success');
            document.getElementById('incidentForm').reset();
            document.getElementById('incidentEvidencePreview').innerHTML = '';
            fetchSecurityIncidents();
        } else {
            showNotification(data.message || 'เกิดข้อผิดพลาดในการส่งรายงาน', 'error');
        }
    } catch (error) {
        console.error('Incident submission error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}

async function handleDocumentUpload(e) {
    e.preventDefault();
    const title = document.getElementById('docTitle').value;
    const category = document.getElementById('docCategory').value;
    // Mocking file upload: in a real app, upload to storage and get URL
    const documentFile = document.getElementById('documentFile') ? document.getElementById('documentFile').files[0] : null;

    if (!documentFile) {
        showNotification('กรุณาเลือกไฟล์เอกสาร', 'error');
        return;
    }

    const filePath = documentFile.name; // Mocking file path
    // const fileSize = `${(documentFile.size / (1024 * 1024)).toFixed(2)} MB`; // Convert bytes to MB

    try {
        const response = await fetch('http://localhost:5000/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                document_name: title,
                file_path: filePath,
                uploaded_by_user_id: currentUser.user_id // Associate with current user
            })
        });
        const data = await response.json();

        if (response.ok) {
            showNotification('อัปโหลดเอกสารเรียบร้อยแล้ว', 'success');
            document.getElementById('documentUploadForm').reset();
            document.getElementById('documentFilePreview').innerHTML = ''; // Clear preview
            fetchDocuments(); // Reload data
        } else {
            showNotification(data.message || 'เกิดข้อผิดพลาดในการอัปโหลดเอกสาร', 'error');
        }
    } catch (error) {
        console.error('Document upload error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}

// --- Announcement Management Functions (Updated to use Backend API) ---
function showAddAnnouncementModal() {
    const announcementModalTitle = document.getElementById('announcementModalTitle');
    const announcementIdInput = document.getElementById('announcementId');
    const announcementForm = document.getElementById('announcementForm');
    const announcementDateInput = document.getElementById('announcementDate');
    const announcementAuthorInput = document.getElementById('announcementAuthor');
    const announcementModal = document.getElementById('announcementModal');

    if (announcementModalTitle) announcementModalTitle.innerText = 'เพิ่มประกาศใหม่';
    if (announcementIdInput) announcementIdInput.value = ''; // Clear ID for new announcement
    if (announcementForm) announcementForm.reset(); // Reset form fields
    if (announcementDateInput) announcementDateInput.value = new Date().toISOString().slice(0, 10); // Set current date
    if (announcementAuthorInput) announcementAuthorInput.value = currentUser.name; // Set current user as author (readonly)

    if (announcementModal) {
        announcementModal.classList.remove('hidden');
        modal.style.display = 'flex'; // Use flex for centering
    }
}

async function handleAnnouncementSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('announcementId').value;
    const title = document.getElementById('announcementTitle').value;
    const content = document.getElementById('announcementContent').value;
    const date = document.getElementById('announcementDate').value;
    const tag = document.getElementById('announcementTag').value;

    const announcementData = {
        title: title,
        content: content,
        published_date: date, // YYYY-MM-DD format
        author_id: currentUser.user_id, // ใช้ user_id จริง
        tag: tag
    };

    try {
        let response;
        if (id) {
            // Editing existing announcement
            response = await fetch(`http://localhost:5000/announcements/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(announcementData)
            });
        } else {
            // Adding new announcement
            response = await fetch('http://localhost:5000/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(announcementData)
            });
        }
        const data = await response.json();

        if (response.ok) {
            showNotification(data.message, 'success');
            closeModal('announcementModal');
            // Data will be reloaded via SocketIO 'new_announcement'/'announcement_updated' event
        } else {
            showNotification(data.message || 'เกิดข้อผิดพลาดในการบันทึกประกาศ', 'error');
        }
    } catch (error) {
        console.error('Announcement submission error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}

async function editAnnouncement(announcementId) {
    const announcementToEdit = announcements.find(ann => ann.announcement_id == announcementId); // Use == for comparison
    if (announcementToEdit) {
        const announcementModalTitle = document.getElementById('announcementModalTitle');
        const announcementIdInput = document.getElementById('announcementId');
        const announcementTitleInput = document.getElementById('announcementTitle');
        const announcementContentInput = document.getElementById('announcementContent');
        const announcementDateInput = document.getElementById('announcementDate');
        const announcementAuthorInput = document.getElementById('announcementAuthor');
        const announcementTagInput = document.getElementById('announcementTag');
        const announcementModal = document.getElementById('announcementModal');

        if (announcementModalTitle) announcementModalTitle.innerText = 'แก้ไขประกาศ';
        if (announcementIdInput) announcementIdInput.value = announcementToEdit.announcement_id;
        if (announcementTitleInput) announcementTitleInput.value = announcementToEdit.title;
        if (announcementContentInput) announcementContentInput.value = announcementToEdit.content;
        // Format date correctly for input type="date"
        if (announcementDateInput) announcementDateInput.value = new Date(announcementToEdit.published_date).toISOString().slice(0, 10);
        if (announcementAuthorInput) announcementAuthorInput.value = announcementToEdit.author_name || currentUser.name; // Use author_name from backend if available
        if (announcementTagInput) announcementTagInput.value = announcementToEdit.tag;

        if (announcementModal) {
            announcementModal.classList.remove('hidden');
            announcementModal.style.display = 'flex';
        }
    }
}

async function deleteAnnouncement(announcementId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบประกาศนี้?')) { // ใช้ confirm ชั่วคราว
        return;
    }
    try {
        const response = await fetch(`http://localhost:5000/announcements/${announcementId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            showNotification('ลบประกาศสำเร็จ', 'success');
            // Data will be reloaded via SocketIO 'announcement_deleted' event
        } else {
            const data = await response.json();
            showNotification(data.message || 'เกิดข้อผิดพลาดในการลบประกาศ', 'error');
        }
    } catch (error) {
        console.error('Delete announcement error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}

async function fetchAnnouncements() {
    try {
        const response = await fetch('http://localhost:5000/announcements');
        if (!response.ok) throw new Error('Failed to fetch announcements');
        const data = await response.json();
        announcements = data; // Update global array
        renderAnnouncements(); // Render to UI
    } catch (error) {
        console.error('Error fetching announcements:', error);
        showNotification('ไม่สามารถโหลดประกาศได้', 'error');
    }
}

function renderAnnouncements() {
    const announcementsList = document.getElementById('announcementsList');
    const adminAnnouncementsTable = document.getElementById('adminAnnouncementsTable');

    if (!announcementsList || !adminAnnouncementsTable) return;

    announcementsList.innerHTML = '';
    adminAnnouncementsTable.innerHTML = '';

    announcements.forEach(announcement => {
        // For general announcements display
        const announcementItem = document.createElement('div');
        announcementItem.classList.add('announcement-item');
        announcementItem.style.cssText = `border-left: 4px solid ${announcement.tag_color || '#667eea'}; padding-left: 20px; margin-bottom: 25px;`;
        announcementItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <h4 style="color: #333; margin: 0;">${announcement.title}</h4>
                <span style="color: #666; font-size: 14px;">${new Date(announcement.published_date).toLocaleDateString('th-TH')}</span>
            </div>
            <p style="color: #666; line-height: 1.6; margin-bottom: 10px;">
                ${announcement.content}
            </p>
            <div style="display: flex; gap: 10px;">
                <span class="status-badge" style="background: ${announcement.tag_bg || '#eee'}; color: ${announcement.tag_color || '#666'};">${announcement.tag}</span>
                <span style="color: #666; font-size: 14px;"><i class="fas fa-user"></i> โดย: ${announcement.author_name || 'ผู้ดูแลระบบ'}</span>
            </div>
            <div class="admin-actions ${currentUser.role === 'admin' ? '' : 'hidden'}" style="margin-top: 15px;">
                <button class="btn btn-secondary btn-sm" onclick="editAnnouncement(${announcement.announcement_id})">แก้ไข</button>
                <button class="btn btn-secondary btn-sm" onclick="deleteAnnouncement(${announcement.announcement_id})">ลบ</button>
            </div>
        `;
        announcementsList.appendChild(announcementItem);

        // For admin announcements table
        const adminTableRow = document.createElement('tr');
        adminTableRow.innerHTML = `
            <td>${announcement.title}</td>
            <td>${new Date(announcement.published_date).toLocaleDateString('th-TH')}</td>
            <td>${announcement.author_name || 'ผู้ดูแลระบบ'}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editAnnouncement(${announcement.announcement_id})">แก้ไข</button>
                <button class="btn btn-secondary btn-sm" onclick="deleteAnnouncement(${announcement.announcement_id})">ลบ</button>
            </td>
        `;
        adminAnnouncementsTable.appendChild(adminTableRow);
    });
}


// --- Calendar Functions (Updated to use Backend API) ---
async function fetchCalendarEvents() {
    try {
        const response = await fetch('http://localhost:5000/calendar-events');
        if (!response.ok) throw new Error('Failed to fetch calendar events');
        const data = await response.json();
        calendarEvents = {}; // Clear existing events
        data.forEach(event => {
            const eventDate = new Date(event.event_date);
            const dateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
            if (!calendarEvents[dateStr]) {
                calendarEvents[dateStr] = [];
            }
            calendarEvents[dateStr].push(event);
        });
        generateCalendar(); // Render calendar after fetching
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        showNotification('ไม่สามารถโหลดกิจกรรมในปฏิทินได้', 'error');
    }
}

function generateCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const monthYearDisplay = document.getElementById('currentMonth');
    
    if (!calendarGrid || !monthYearDisplay) return;
    
    calendarGrid.innerHTML = '';
    
    // Update month display (Thai Buddhist calendar year)
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
        if (calendarEvents[dateStr] && calendarEvents[dateStr].length > 0) {
            dayElement.classList.add('has-event');
            dayElement.title = calendarEvents[dateStr].map(e => e.event_name).join(', '); // Show event on hover
        }
        
        calendarGrid.appendChild(dayElement);
    }
    renderUpcomingEvents(); // Update upcoming events
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

function renderUpcomingEvents() {
    const upcomingEventsContainer = document.getElementById('upcomingEvents');
    if (!upcomingEventsContainer) return;

    let eventsHtml = '<div style="padding: 20px;">';
    const now = new Date();
    const sortedEvents = Object.values(calendarEvents).flat().sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

    sortedEvents.forEach(event => {
        const eventDate = new Date(event.event_date);
        if (eventDate >= now) { // Only show future events
            const time = new Date(event.event_date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            eventsHtml += `
                <div class="event-item" style="border-left: 4px solid #667eea; padding-left: 15px; margin-bottom: 15px;">
                    <h4 style="margin: 0; color: #333;">${event.event_name}</h4>
                    <p style="margin: 5px 0; color: #666;">${eventDate.toLocaleDateString('th-TH')} - ${time} น.</p>
                    <p style="margin: 0; color: #888;">${event.location || ''}</p>
                </div>
            `;
        }
    });
    eventsHtml += '</div>';
    upcomingEventsContainer.innerHTML = eventsHtml;
}


// --- Chat Functions (Updated for SocketIO) ---
function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput ? chatInput.value.trim() : '';
    
    if (message && currentUser.user_id) {
        // ส่งข้อความผ่าน SocketIO แทนการใช้ fetch()
        socket.emit('send_message', {
            sender_id: currentUser.user_id,
            content: message,
            room_name: 'general_chat' // กำหนดห้องแชท
        });
        if (chatInput) chatInput.value = '';
    } else if (!currentUser.user_id) {
        showNotification('กรุณาเข้าสู่ระบบเพื่อส่งข้อความ', 'warning');
    }
}

async function fetchChatMessages() {
    // โหลดข้อความแชทเก่าจาก Backend (REST API)
    try {
        const response = await fetch('http://localhost:5000/chat-messages');
        if (!response.ok) throw new Error('Failed to fetch chat messages');
        const data = await response.json();
        chatMessages = data.map(msg => ({
            sender_id: msg.sender_id,
            sender_name: msg.sender_name,
            sender_avatar: msg.sender_avatar,
            content: msg.content,
            time: new Date(msg.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            type: msg.sender_id === currentUser.user_id ? 'own' : 'other'
        }));
        displayChatMessages(); // แสดงข้อความที่โหลดมา
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        showNotification('ไม่สามารถโหลดข้อความแชทได้', 'error');
    }
}

function displayChatMessages() {
    const chatMessagesContainer = document.getElementById('chatMessages');
    if (!chatMessagesContainer) return;

    chatMessagesContainer.innerHTML = ''; // Clear existing messages

    chatMessages.forEach(msg => {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${msg.type}`;
        messageElement.innerHTML = `
            <div class="user-avatar" style="min-width: 35px; height: 35px; font-size: 14px;">${msg.sender_avatar || msg.sender_name[0].toUpperCase()}</div>
            <div class="message-content">
                ${msg.type === 'other' ? `<strong>${msg.sender_name}</strong>` : ''}
                <p>${msg.content}</p>
                <small>${msg.time}</small>
            </div>
        `;
        chatMessagesContainer.appendChild(messageElement);
    });
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight; // Scroll to bottom
}

function openGroupChat(groupId) {
    if (socket && socket.connected) {
        socket.emit('leave_chat_room', { room_name: 'general_chat' }); // ออกจากห้องเดิม
        socket.emit('join_chat_room', { room_name: groupId }); // เข้าร่วมห้องใหม่
        showNotification(`เข้าร่วมแชทกลุ่ม: ${groupId}`, 'info');
        // ในแอปจริง คุณจะต้องโหลดข้อความของกลุ่มนั้นๆ จากฐานข้อมูลและแสดงผล
        chatMessages = []; // เคลียร์ข้อความเก่า
        displayChatMessages(); // แสดงข้อความว่างเปล่า หรือโหลดข้อความกลุ่มจริง
        // fetchChatMessagesByGroup(groupId); // <-- เรียกฟังก์ชันนี้ในแอปจริง
    } else {
        showNotification('ไม่สามารถเชื่อมต่อ WebSocket ได้', 'error');
    }
}

// --- Payment Functions (Updated to use Backend API) ---
async function fetchPayments() {
    try {
        const response = await fetch('http://localhost:5000/payments');
        if (!response.ok) throw new Error('Failed to fetch payments');
        const data = await response.json();
        // Update paymentTable and history based on 'data'
        renderPaymentTable(data);
    } catch (error) {
        console.error('Error fetching payments:', error);
        showNotification('ไม่สามารถโหลดข้อมูลการชำระเงินได้', 'error');
    }
}

function renderPaymentTable(paymentsData) {
    const paymentTable = document.getElementById('paymentTable');
    if (!paymentTable) return;

    paymentTable.innerHTML = ''; // Clear existing rows

    const unpaidBills = paymentsData.filter(p => p.status === 'unpaid' && p.user_id === currentUser.user_id);
    const paidBills = paymentsData.filter(p => p.status === 'paid' && p.user_id === currentUser.user_id);

    // Render unpaid bills
    unpaidBills.forEach(bill => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${bill.item_name || 'ค่าบริการ'}</td>
            <td>${parseFloat(bill.amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</td>
            <td>${new Date(bill.due_date || bill.payment_date).toLocaleDateString('th-TH')}</td>
            <td><span class="status-badge status-unpaid">ยังไม่ชำระ</span></td>
            <td><button class="btn btn-primary btn-sm" onclick="payBill('${bill.payment_id}', ${bill.amount})">ชำระเงิน</button></td>
        `;
        paymentTable.appendChild(row);
    });

    // Render payment history (mocked data in HTML, replace with fetched data if available)
    // For now, assume the history part is separate or integrated in a different way.
}

function payBill(billId, amount) {
    const modal = document.getElementById('paymentModal');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.style.display = 'flex'; // Use flex for centering
    
    const paymentAmountInput = document.getElementById('paymentAmount');
    if (paymentAmountInput) paymentAmountInput.value = amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท';
    
    // Reset payment method selection and QR/bank details visibility
    const paymentMethodSelect = document.getElementById('paymentMethod');
    if (paymentMethodSelect) paymentMethodSelect.value = '';
    
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    if (qrCodeContainer) qrCodeContainer.style.display = 'none';
    
    const bankDetails = document.getElementById('bankDetails');
    if (bankDetails) bankDetails.classList.add('hidden');
}

function showQRCode() {
    var paymentMethod = document.getElementById("paymentMethod") ? document.getElementById("paymentMethod").value : '';
    var qrCodeContainer = document.getElementById("qrCodeContainer");
    var bankDetails = document.getElementById("bankDetails");

    if (qrCodeContainer && bankDetails) {
        if (paymentMethod === "promptpay") {
            qrCodeContainer.style.display = "block";
            bankDetails.style.display = "none";
        } else if (paymentMethod === "bank_transfer") {
            qrCodeContainer.style.display = "none";
            bankDetails.classList.remove("hidden"); // Use remove hidden for bankDetails
        } else {
            qrCodeContainer.style.display = "none";
            bankDetails.classList.add("hidden");
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

// --- Voting Functions (Updated to use Backend API) ---
async function fetchVotingPolls() {
    try {
        const response = await fetch('http://localhost:5000/voting-polls');
        if (!response.ok) throw new Error('Failed to fetch voting polls');
        const pollsData = await response.json();
        // You would then dynamically render these polls to the 'voting' page
        renderVotingPolls(pollsData);
    } catch (error) {
        console.error('Error fetching voting polls:', error);
        showNotification('ไม่สามารถโหลดการโหวตได้', 'error');
    }
}

function renderVotingPolls(polls) {
    const votingContainer = document.querySelector('#voting .card > div'); // Adjust selector as needed
    if (!votingContainer) return;
    votingContainer.innerHTML = ''; // Clear existing mock content

    polls.forEach(poll => {
        const pollItem = document.createElement('div');
        pollItem.classList.add('voting-item');
        pollItem.style.cssText = "border: 1px solid #eee; border-radius: 10px; padding: 20px; margin-bottom: 20px;";
        
        let optionsHtml = '';
        // Fetch options for each poll (this would be another API call or included in poll data)
        // For demonstration, let's assume options are mock data for now
        const mockOptions = [
            { option_id: 1, option_text: "เห็นด้วย" },
            { option_id: 2, option_text: "ไม่เห็นด้วย" }
        ];

        mockOptions.forEach(option => { // Replace with real fetched options
            optionsHtml += `
                <label style="display: block; margin-bottom: 8px; cursor: pointer;">
                    <input type="radio" name="poll_${poll.poll_id}" value="${option.option_id}" style="margin-right: 8px;">
                    ${option.option_text} (${Math.floor(Math.random() * 50)} โหวต)
                </label>
            `;
        });

        pollItem.innerHTML = `
            <h4 style="color: #333; margin-bottom: 10px;">${poll.title}</h4>
            <p style="color: #666; margin-bottom: 15px;">กำหนดปิดโหวต: ${new Date(poll.end_date).toLocaleDateString('th-TH')}</p>
            <div style="margin-bottom: 15px;">
                ${optionsHtml}
            </div>
            <button class="btn btn-primary btn-sm" onclick="submitVote(${poll.poll_id})">โหวต</button>
            <span style="margin-left: 15px; color: #666;">รวม ${Math.floor(Math.random() * 100)} โหวต</span>
        `;
        votingContainer.appendChild(pollItem);
    });
}


async function submitVote(pollId) {
    const selectedOption = document.querySelector(`input[name="poll_${pollId}"]:checked`);
    if (!selectedOption) {
        showNotification('กรุณาเลือกตัวเลือกก่อนโหวต', 'warning');
        return;
    }
    const optionId = selectedOption.value;

    try {
        const response = await fetch('http://localhost:5000/voting-results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                poll_id: pollId,
                option_id: optionId,
                user_id: currentUser.user_id
            })
        });
        const data = await response.json();

        if (response.ok) {
            showNotification('บันทึกการโหวตเรียบร้อยแล้ว', 'success');
            // Re-fetch polls to update results
            fetchVotingPolls(); 
        } else {
            showNotification(data.message || 'เกิดข้อผิดพลาดในการโหวต', 'error');
        }
    } catch (error) {
        console.error('Voting error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}

// --- Utility Functions for Dynamic Table Loading (Updated to use Backend Data) ---
async function fetchRepairRequests() {
    try {
        const response = await fetch('http://localhost:5000/repair-requests');
        if (!response.ok) throw new Error('Failed to fetch repair requests');
        const data = await response.json();
        repairRequests = data; // Update global array
        renderRepairRequestsTable();
        loadDashboardStats(); // Update dashboard stats
    } catch (error) {
        console.error('Error fetching repair requests:', error);
        showNotification('ไม่สามารถโหลดข้อมูลงานซ่อมได้', 'error');
    }
}

function renderRepairRequestsTable() {
    const userRepairTbody = document.getElementById('repairStatusTable');
    const adminRepairTbody = document.getElementById('manageRepairsTable');

    if (!userRepairTbody && !adminRepairTbody) return;

    if (userRepairTbody) userRepairTbody.innerHTML = '';
    if (adminRepairTbody) adminRepairTbody.innerHTML = '';

    repairRequests.forEach(repair => {
        const statusClass = repair.status === 'pending' ? 'status-pending' :
                             repair.status === 'in_progress' ? 'status-progress' :
                             'status-completed';

        // For user's own repair requests
        if (userRepairTbody && repair.user_id === currentUser.user_id) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${repair.request_id}</td>
                <td>${repair.title}</td>
                <td>${repair.category}</td>
                <td>${new Date(repair.submitted_date).toLocaleDateString('th-TH')}</td>
                <td><span class="status-badge ${statusClass}">${repair.status}</span></td>
                <td><button class="btn btn-secondary btn-sm" onclick="viewRepairDetails(${repair.request_id})">ดูรายละเอียด</button></td>
            `;
            userRepairTbody.appendChild(row);
        }

        // For admin's manage repairs table (all requests)
        if (adminRepairTbody && currentUser.role === 'admin') {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${repair.request_id}</td>
                <td>${repair.user_name}</td>
                <td>${repair.title}</td>
                <td>${repair.category}</td>
                <td>${new Date(repair.submitted_date).toLocaleDateString('th-TH')}</td>
                <td><span class="status-badge ${statusClass}">${repair.status}</span></td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="updateRepairStatus(${repair.request_id}, 'in_progress')">รับเรื่อง</button>
                    <button class="btn btn-primary btn-sm" onclick="updateRepairStatus(${repair.request_id}, 'completed')">เสร็จสิ้น</button>
                    <button class="btn btn-secondary btn-sm" onclick="viewRepairDetails(${repair.request_id})">ดูรายละเอียด</button>
                </td>
            `;
            adminRepairTbody.appendChild(row);
        }
    });
}

async function viewRepairDetails(requestId) {
    // In a real app, open a modal with more details.
    const repair = repairRequests.find(r => r.request_id === requestId);
    if (repair) {
        showNotification(`รายละเอียดงานซ่อม #${repair.request_id}: ${repair.description}`, 'info', 10000);
        console.log("Image paths:", repair.image_paths);
        // You would display images here if paths were real URLs.
    }
}

async function updateRepairStatus(requestId, newStatus) {
    try {
        const response = await fetch(`http://localhost:5000/repair-requests/${requestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await response.json();
        if (response.ok) {
            showNotification(`อัปเดตสถานะงานซ่อม #${requestId} เป็น ${newStatus} สำเร็จ`, 'success');
            fetchRepairRequests(); // Reload to reflect changes
        } else {
            showNotification(data.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ', 'error');
        }
    } catch (error) {
        console.error('Update repair status error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}


async function fetchBookingRequests() {
    try {
        const response = await fetch('http://localhost:5000/booking-requests');
        if (!response.ok) throw new Error('Failed to fetch booking requests');
        const data = await response.json();
        bookingRequests = data; // Update global array
        renderBookingRequestsTable();
    } catch (error) {
        console.error('Error fetching booking requests:', error);
        showNotification('ไม่สามารถโหลดข้อมูลการจองได้', 'error');
    }
}

function renderBookingRequestsTable() {
    const tbody = document.getElementById('bookingTable');
    if (!tbody) return;
    tbody.innerHTML = ''; // Clear existing rows

    bookingRequests.forEach(booking => {
        // Filter for current user or all if admin
        if (booking.user_id === currentUser.user_id || currentUser.role === 'admin') {
            const row = document.createElement('tr');
            const statusClass = booking.status === 'approved' ? 'status-approved' : 'status-pending';
            const timeRange = `${new Date(`2000-01-01T${booking.start_time}`).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}-${new Date(`2000-01-01T${booking.end_time}`).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;

            row.innerHTML = `
                <td>${booking.location}</td>
                <td>${new Date(booking.date).toLocaleDateString('th-TH')}</td>
                <td>${timeRange}</td>
                <td><span class="status-badge ${statusClass}">${booking.status}</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="editBooking(${booking.booking_id})">แก้ไข</button>
                    <button class="btn btn-secondary btn-sm" onclick="deleteBooking(${booking.booking_id})">ยกเลิก</button>
                </td>
            `;
            tbody.appendChild(row);
        }
    });
}

// Function to edit a booking (implement modal/form for this)
function editBooking(bookingId) {
    showNotification(`แก้ไขการจอง ID: ${bookingId} (ฟังก์ชันนี้ต้องสร้าง Modal/Form ขึ้นมา)`, 'info');
    // Implement a modal or form to pre-fill and edit booking details
}

// Function to delete a booking
async function deleteBooking(bookingId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะยกเลิกการจองนี้?')) return;

    try {
        const response = await fetch(`http://localhost:5000/booking-requests/${bookingId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            showNotification('ยกเลิกการจองสำเร็จ', 'success');
            fetchBookingRequests(); // Reload data
        } else {
            const data = await response.json();
            showNotification(data.message || 'เกิดข้อผิดพลาดในการยกเลิกการจอง', 'error');
        }
    } catch (error) {
        console.error('Delete booking error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}


async function fetchDocuments() {
    try {
        const response = await fetch('http://localhost:5000/documents');
        if (!response.ok) throw new Error('Failed to fetch documents');
        const data = await response.json();
        documents = data; // Update global array
        renderDocumentsTable();
    } catch (error) {
        console.error('Error fetching documents:', error);
        showNotification('ไม่สามารถโหลดเอกสารได้', 'error');
    }
}

function renderDocumentsTable() {
    const tbody = document.getElementById('documentsTable');
    if (!tbody) return;
    tbody.innerHTML = ''; // Clear existing rows

    documents.forEach(doc => {
        // Filter for current user or all if admin
        if (doc.uploaded_by_user_id === currentUser.user_id || currentUser.role === 'admin') {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${doc.document_name}</td>
                <td>${doc.category || 'ทั่วไป'}</td>
                <td>${new Date(doc.upload_date).toLocaleDateString('th-TH')}</td>
                <td>${doc.size || 'N/A'}</td> <!-- size is mocked, should come from backend if available -->
                <td>
                    <button class="btn btn-secondary btn-sm">ดู</button>
                    <button class="btn btn-primary btn-sm">ดาวน์โหลด</button>
                    <button class="btn btn-secondary btn-sm" onclick="deleteDocument('${doc.document_id}')">ลบ</button>
                </td>
            `;
            tbody.appendChild(row);
        }
    });
}

async function deleteDocument(documentId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบเอกสารนี้?')) {
        return;
    }
    try {
        const response = await fetch(`http://localhost:5000/documents/${documentId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            showNotification('ลบเอกสารสำเร็จ', 'success');
            fetchDocuments(); // Reload data
        } else {
            const data = await response.json();
            showNotification(data.message || 'เกิดข้อผิดพลาดในการลบเอกสาร', 'error');
        }
    } catch (error) {
        console.error('Delete document error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}

async function fetchSecurityVisitors() {
    try {
        const response = await fetch('http://localhost:5000/security-visitors');
        if (!response.ok) throw new Error('Failed to fetch visitors');
        const data = await response.json();
        // Render visitor data (assuming there's a table for it)
        renderSecurityVisitorsTable(data);
    } catch (error) {
        console.error('Error fetching security visitors:', error);
        showNotification('ไม่สามารถโหลดข้อมูลผู้มาเยือนได้', 'error');
    }
}

function renderSecurityVisitorsTable(visitors) {
    // You would implement the rendering logic for a table here
    // based on whether it's a user's own visitors or for admin
    console.log("Visitors data to render:", visitors);
    // Example: Populate a tbody with ID 'visitorLogTable'
    const visitorLogTable = document.getElementById('visitorLogTable'); // Assuming this exists
    if(visitorLogTable) {
        visitorLogTable.innerHTML = '';
        visitors.forEach(visitor => {
            // Filter if not admin
            if (currentUser.role === 'admin' || visitor.user_id === currentUser.user_id) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${visitor.name}</td>
                    <td>${visitor.phone || '-'}</td>
                    <td>${new Date(visitor.visit_date).toLocaleDateString('th-TH')}</td>
                    <td>${visitor.visit_time}</td>
                    <td>${visitor.purpose || '-'}</td>
                    <td><button class="btn btn-secondary btn-sm">รายละเอียด</button></td>
                `;
                visitorLogTable.appendChild(row);
            }
        });
    }
}

async function fetchSecurityIncidents() {
    try {
        const response = await fetch('http://localhost:5000/security-incidents');
        if (!response.ok) throw new Error('Failed to fetch incidents');
        const data = await response.json();
        // Render incident data (assuming there's a table for it)
        renderSecurityIncidentsTable(data);
    } catch (error) {
        console.error('Error fetching security incidents:', error);
        showNotification('ไม่สามารถโหลดข้อมูลเหตุการณ์ได้', 'error');
    }
}

function renderSecurityIncidentsTable(incidents) {
    // Implement rendering logic for incidents table
    console.log("Incidents data to render:", incidents);
    const incidentReportTable = document.getElementById('incidentReportTable'); // Assuming this exists
    if (incidentReportTable) {
        incidentReportTable.innerHTML = '';
        incidents.forEach(incident => {
            // Filter if not admin
            if (currentUser.role === 'admin' || incident.user_id === currentUser.user_id) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${incident.description}</td>
                    <td>${new Date(incident.reported_date).toLocaleDateString('th-TH')}</td>
                    <td>${incident.user_id}</td> <!-- Show user ID, could fetch name -->
                    <td><button class="btn btn-secondary btn-sm">ดูหลักฐาน</button></td>
                `;
                incidentReportTable.appendChild(row);
            }
        });
    }
}

async function fetchAllUsers() {
    try {
        const response = await fetch('http://localhost:5000/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        allUsers = data; // Update global array
        renderManageUsersTable();
    } catch (error) {
        console.error('Error fetching all users:', error);
        showNotification('ไม่สามารถโหลดข้อมูลผู้ใช้ได้', 'error');
    }
}

function renderManageUsersTable() {
    const tbody = document.getElementById('manageUsersTable');
    if (!tbody) return;
    tbody.innerHTML = ''; // Clear existing rows

    allUsers.forEach(user => {
        const row = document.createElement('tr');
        const statusClass = 'status-approved'; // Assuming approved for now, adjust based on actual user status
        row.innerHTML = `
            <td>${user.name}</td>
            <td>${user.address || '-'}</td>
            <td>${user.phone || '-'}</td>
            <td><span class="status-badge ${statusClass}">${user.status || 'อนุมัติ'}</span></td>
            <td>${user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้อยู่อาศัย'}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editUser(${user.user_id})">แก้ไข</button>
                <button class="btn btn-secondary btn-sm" onclick="deleteUser(${user.user_id})">ลบ</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function editUser(userId) {
    showNotification(`แก้ไขผู้ใช้ ID: ${userId} (ฟังก์ชันนี้ต้องสร้าง Modal/Form ขึ้นมา)`, 'info');
    // Implement a modal/form to fetch user data and allow editing
}

async function deleteUser(userId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?')) return;
    try {
        const response = await fetch(`http://localhost:5000/users/${userId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            showNotification('ลบผู้ใช้สำเร็จ', 'success');
            fetchAllUsers(); // Reload data
        } else {
            const data = await response.json();
            showNotification(data.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้', 'error');
        }
    } catch (error) {
        console.error('Delete user error:', error);
        showNotification('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
}


function loadDashboardStats() {
    // Update stats based on loaded data from various fetches
    const totalResidents = document.getElementById('totalResidents');
    if (totalResidents) totalResidents.textContent = allUsers.filter(u => u.role === 'resident').length;
    
    const pendingRepairs = document.getElementById('pendingRepairs');
    if (pendingRepairs) pendingRepairs.textContent = repairRequests.filter(r => r.status === 'pending').length;
    
    const completedRepairs = document.getElementById('completedRepairs');
    if (completedRepairs) completedRepairs.textContent = repairRequests.filter(r => r.status === 'completed').length;
    
    const unpaidBills = document.getElementById('unpaidBills');
    if (unpaidBills) unpaidBills.textContent = '8'; // Still static, ideally fetch from payments data

    // Update recent activities (mocked for now, ideally fetch from a combined activity log from backend)
    const recentActivitiesTable = document.getElementById('recentActivities');
    if (recentActivitiesTable) {
        recentActivitiesTable.innerHTML = `
            <tr>
                <td>10:30</td>
                <td>แจ้งซ่อมไฟฟ้า</td>
                <td>คุณสมชาย ใจดี</td>
                <td><span class="status-badge status-pending">รอรับเรื่อง</span></td>
            </tr>
            <tr>
                <td>09:15</td>
                <td>ชำระค่าส่วนกลาง</td>
                <td>คุณมาลี สวยใส</td>
                <td><span class="status-badge status-completed">สำเร็จ</span></td>
            </tr>
            <tr>
                <td>08:45</td>
                <td>จองสนามกีฬา</td>
                <td>คุณวิชัย กล้าหาญ</td>
                <td><span class="status-badge status-approved">อนุมัติ</span></td>
            </tr>
        `;
    }
}

async function loadProfileData() {
    // Load user profile data from currentUser (or from a backend in a real app)
    const profileName = document.getElementById('profileName');
    if (profileName) profileName.value = currentUser.name || '';
    
    const profilePhone = document.getElementById('profilePhone');
    if (profilePhone) profilePhone.value = currentUser.phone || '';
    
    const profileEmail = document.getElementById('profileEmail');
    if (profileEmail) profileEmail.value = currentUser.email || '';
    
    const profileAddress = document.getElementById('profileAddress');
    if (profileAddress) profileAddress.value = currentUser.address || '';
}

function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${message}</span>
            <button onclick="this.closest('.notification').remove()" style="background: none; border: none; cursor: pointer; margin-left: 15px; font-size: 1.2em; color: inherit;">&times;</button>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after specified duration
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, duration);
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = input.nextElementSibling; // Assuming icon is the next sibling
    
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
    } else {
        input.type = 'password';
        if (icon) {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
}

function showForgotPassword() {
    showNotification('ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว', 'info');
}

function toggleNotifications() {
    // In a real app, this would show a notification dropdown/modal
    showNotification('ไม่มีการแจ้งเตือนใหม่', 'info');
}

// File upload preview (for single file inputs)
function handleFileUpload(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (input && input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (preview) {
                // Clear previous preview and add new image
                preview.innerHTML = ''; 
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.maxWidth = '200px';
                img.style.maxHeight = '200px';
                img.style.marginTop = '10px';
                img.style.borderRadius = '8px'; // Add some style
                img.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
                preview.appendChild(img);
            }
        };
        reader.readAsDataURL(input.files[0]);
    } else {
        if (preview) {
            preview.innerHTML = ''; // Clear preview if no file selected
        }
    }
}

// Responsive sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

// --- Chart.js for Reports Page ---
let monthlyChartInstance = null; // To store the Chart.js instance

function renderMonthlyChart() {
    const ctx = document.getElementById('monthlyChart');
    if (!ctx) {
        console.warn("Canvas element with ID 'monthlyChart' not found. Chart will not render.");
        return;
    }

    // Destroy existing chart instance if it exists
    if (monthlyChartInstance) {
        monthlyChartInstance.destroy();
    }

    // Sample data for the chart
    const data = {
        labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
        datasets: [{
            label: 'รายรับ (บาท)',
            data: [120000, 130000, 110000, 140000, 150000, 135000, 145000, 160000, 155000, 170000, 165000, 180000],
            backgroundColor: 'rgba(102, 126, 234, 0.6)',
            borderColor: 'rgba(102, 126, 234, 1)',
            borderWidth: 1,
            fill: true,
            tension: 0.3
        },
        {
            label: 'รายจ่าย (บาท)',
            data: [80000, 90000, 85000, 95000, 100000, 90000, 98000, 105000, 100000, 110000, 108000, 115000],
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
            fill: true,
            tension: 0.3
        }]
    };

    const config = {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'สรุปรายรับ-รายจ่ายรายเดือน'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'จำนวนเงิน (บาท)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'เดือน'
                    }
                }
            }
        }
    };

    // Create new chart instance
    monthlyChartInstance = new Chart(ctx, config);
}

