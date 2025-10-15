
// script.js - OOP Version with File Upload Integration

// ============================================
// Class: APIService - จัดการการเรียก API ทั้งหมด
// ============================================
class APIService {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    async fetch(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}/${endpoint}`, options);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `API call to ${endpoint} failed`);
            }
            return data;
        } catch (error) {
            console.error(`Error in API call to ${endpoint}:`, error);
            throw error;
        }
    }

    async get(endpoint) {
        return this.fetch(endpoint, { method: 'GET' });
    }

    async post(endpoint, body) {
        return this.fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    }

    async put(endpoint, body) {
        return this.fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    }

    async delete(endpoint) {
        return this.fetch(endpoint, { method: 'DELETE' });
    }

    async uploadFile(file, type, userId) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        formData.append('user_id', userId);

        const response = await fetch(`${this.baseURL}/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Upload failed');
        }
        return data;
    }

    async uploadMultipleFiles(files, type, userId) {
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files[]', files[i]);
        }
        formData.append('type', type);
        formData.append('user_id', userId);

        const response = await fetch(`${this.baseURL}/upload-multiple`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Upload failed');
        }
        return data;
    }
}

// ============================================
// Class: UIManager - จัดการ UI ทั้งหมด
// ============================================
class UIManager {
    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${message}</span>
                <button onclick="this.closest('.notification').remove()" style="background: none; border: none; color: inherit; font-size: 18px; cursor: pointer; padding: 0; margin-left: 10px;">&times;</button>
            </div>
        `;
        container.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            const form = modal.querySelector('form');
            if (form) form.reset();
            modal.querySelectorAll('[id$="Preview"]').forEach(p => p.innerHTML = '');
        }
    }

    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const icon = input.nextElementSibling;
        input.type = input.type === 'password' ? 'text' : 'password';
        if (icon) {
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        }
    }

    handleFilePreview(inputId, previewId) {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        if (!input || !preview || !input.files || !input.files[0]) {
            if (preview) preview.innerHTML = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<img src="${e.target.result}" style="max-width: 200px; max-height: 200px; margin-top: 10px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">`;
        };
        reader.readAsDataURL(input.files[0]);
    }

    showPage(pageId) {
        document.querySelectorAll('.page-content').forEach(pageDiv => {
            pageDiv.classList.add('hidden');
        });

        const targetContentDiv = document.getElementById(pageId);
        if (targetContentDiv) {
            targetContentDiv.classList.remove('hidden');
        }

        document.querySelectorAll('.sidebar-menu a').forEach(item => {
            item.classList.remove('active');
        });
        const activeLink = document.querySelector(`.sidebar-menu a[onclick*="'${pageId}'"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        if (window.innerWidth <= 768) {
            this.toggleSidebar();
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    }

    renderTable(data, tbodyId, columns, getActionsHtml, noDataMessage = 'ไม่มีข้อมูล') {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            const colSpan = columns.length + (getActionsHtml ? 1 : 0);
            tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; color: #666; padding: 20px;">${noDataMessage}</td></tr>`;
            return;
        }

        data.forEach(item => {
            const row = document.createElement('tr');
            let rowHtml = '';
            
            columns.forEach(col => {
                let value = item[col.key];
                if (col.format && typeof col.format === 'function') {
                    value = col.format(value, item);
                }
                rowHtml += `<td>${value || ''}</td>`;
            });

            if (getActionsHtml) {
                rowHtml += `<td>${getActionsHtml(item)}</td>`;
            }

            row.innerHTML = rowHtml;
            tbody.appendChild(row);
        });
    }

    getStatusHtml(status) {
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
        const info = STATUS_MAP[status] || { text: status, class: 'status-info' };
        return `<span class="status-badge ${info.class}">${info.text}</span>`;
    }
}

// ============================================
// Class: AuthManager - จัดการ Authentication
// ============================================
class AuthManager {
    constructor(apiService, uiManager) {
        this.api = apiService;
        this.ui = uiManager;
        this.currentUser = {
            user_id: null,
            name: 'ผู้ใช้งาน',
            role: 'resident',
            avatar: 'A',
            phone: '',
            email: '',
            address: ''
        };
    }

    async login(username, password) {
        try {
            const data = await this.api.post('login', { username, password });
            this.currentUser = {
                user_id: data.user_id,
                name: data.name,
                role: data.role,
                avatar: data.name[0].toUpperCase(),
                phone: data.phone || '',
                email: data.email || '',
                address: data.address || ''
            };
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userData', JSON.stringify(this.currentUser));
            this.ui.showNotification('เข้าสู่ระบบสำเร็จ', 'success');
            return true;
        } catch (error) {
            this.ui.showNotification(error.message || 'เข้าสู่ระบบไม่สำเร็จ', 'error');
            return false;
        }
    }

    async register(userData) {
        try {
            await this.api.post('users', { ...userData, role: 'resident' });
            this.ui.showNotification('ส่งคำขอลงทะเบียนสำเร็จ รอการอนุมัติจากผู้ดูแล', 'success');
            return true;
        } catch (error) {
            this.ui.showNotification(error.message || 'ลงทะเบียนไม่สำเร็จ', 'error');
            return false;
        }
    }

    logout() {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('userData');
        this.currentUser = {
            user_id: null,
            name: 'ผู้ใช้งาน',
            role: 'resident',
            avatar: 'A',
            phone: '',
            email: '',
            address: ''
        };
        this.ui.showNotification('ออกจากระบบแล้ว', 'success');
    }

    restoreSession() {
        const storedUserData = sessionStorage.getItem('userData');
        if (storedUserData) {
            try {
                this.currentUser = JSON.parse(storedUserData);
                return true;
            } catch (e) {
                console.error('Error parsing stored user data:', e);
                sessionStorage.removeItem('userData');
                sessionStorage.removeItem('isLoggedIn');
                return false;
            }
        }
        return false;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    updateUserInfo() {
        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');
        const userAvatarEl = document.getElementById('userAvatar');

        if (userNameEl) userNameEl.textContent = this.currentUser.name;
        if (userRoleEl) userRoleEl.textContent = this.currentUser.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้อยู่อาศัย';
        if (userAvatarEl) userAvatarEl.textContent = this.currentUser.avatar;

        document.querySelectorAll('.admin-menu').forEach(menu => {
            if (this.currentUser.role === 'admin') {
                menu.classList.remove('hidden');
            } else {
                menu.classList.add('hidden');
            }
        });

        document.querySelectorAll('.resident-menu').forEach(menu => {
            menu.classList.remove('hidden');
        });
    }
}

// ============================================
// Class: RepairRequestManager - จัดการคำขอแจ้งซ่อม
// ============================================
class RepairRequestManager {
    constructor(apiService, uiManager, authManager) {
        this.api = apiService;
        this.ui = uiManager;
        this.auth = authManager;
        this.cache = [];
    }



    async fetchAll() {
        try {
            this.cache = await this.api.get('repair-requests-broken-endpoint');

           
            this.doSomethingThatDoesNotExist();

            
            console.log(undefinedVariable.test);

            this.render();
        } catch (error) {
            console.error('💥 Error intentionally triggered in fetchAll():', error);
            this.ui.showNotification('💥 เกิดข้อผิดพลาดรุนแรงในระบบแจ้งซ่อม', 'error');
        }
    }

    
    async create(formData) {
        try {
            const repairImages = document.getElementById('repairImages');
            let imagePaths = [];

            
            if (repairImages && repairImages.files.length > 0) {
                await this.api.uploadMultipleFiles(repairImages.files, 'wrong_type', 99999);
            }

           
            const data = await this.api.post('repair-requests', {
                wrong_field_name: 'test_error',
                status: 'broken'
            });

            this.ui.showNotification('✅ แจ้งซ่อมถูกส่งเรียบร้อย (แต่จริงๆ ล้มเหลว)', 'success');
            return data;
        } catch (error) {
            console.error('💥 Error intentionally triggered in create():', error);
            this.ui.showNotification('💥 การแจ้งซ่อมล้มเหลวตามแผนทดสอบ', 'error');
            throw error;
        }
    }

   
    async updateStatus(requestId, newStatus) {
        try {
        
            await this.api.put(`repair-requests-wrong/${requestId}`, { status: newStatus });

           
            this.cache.forEach(r => { r.state = 'broken_state'; });

            
            this.ui.renderTable(this.cache, 'nonExistentTableId', [], null);

            this.ui.showNotification('⚙️ อัปเดตสถานะ (แต่จริงๆ error)', 'info');
        } catch (error) {
            console.error('💥 Error intentionally triggered in updateStatus():', error);
            this.ui.showNotification('💥 อัปเดตสถานะไม่สำเร็จตามแผนทดสอบ', 'error');
        }
    }


    render() {
        try {
           
            this.ui.renderTable(this.cache, 'repairStatusTable_DOES_NOT_EXIST', [], null);

            
            this.cache = 'this should be an array, but it is now a string!';

            
            this.ui.renderTable(this.cache, 'manageRepairsTable', [], null);

            throw new Error('💥 จงใจโยน Error จาก render()');
        } catch (error) {
            console.error('💥 Error intentionally triggered in render():', error);
            this.ui.showNotification('💥 render ล้มเหลว (ทดสอบ UI error)', 'error');
        }
    }

   
    viewDetails(requestId) {
        try {
            const repair = this.cache.find(r => r.request_id === requestId);
            console.log(repair.nonexistentProperty.property); // พังแน่
        } catch (error) {
            console.error('💥 Error intentionally triggered in viewDetails():', error);
            this.ui.showNotification('💥 เปิดดูรายละเอียดล้มเหลว', 'error');
        }
    }
}

// ============================================
// Class: PaymentManager - จัดการการชำระเงิน
// ============================================
class PaymentManager {
    constructor(apiService, uiManager, authManager) {
        this.api = apiService;
        this.ui = uiManager;
        this.auth = authManager;
        this.billsCache = [];
        this.paymentsCache = [];
    }

    async fetchAll() {
        try {
            const allBills = await this.api.get('bills');
            this.paymentsCache = await this.api.get(`payments?user_id=${this.auth.getCurrentUser().user_id}`);

            const currentUser = this.auth.getCurrentUser();
            const billsWithStatus = allBills.map(bill => {
                if (bill.recipient_id === 'all' || bill.recipient_id == currentUser.user_id) {
                    const userPaymentForBill = this.paymentsCache.find(p => p.bill_id === bill.bill_id);
                    let status = 'unpaid';
                    let payment_id = null;
                    if (userPaymentForBill) {
                        status = userPaymentForBill.status === 'paid' ? 'paid' : 'pending_verification';
                        payment_id = userPaymentForBill.payment_id;
                    }
                    return { ...bill, status: status, payment_id: payment_id };
                }
                return null;
            }).filter(Boolean);

            this.billsCache = billsWithStatus;
            this.render();
            return this.billsCache;
        } catch (error) {
            this.ui.showNotification('ไม่สามารถโหลดข้อมูลการชำระเงินได้', 'error');
            return [];
        }
    }

    async create(formData) {
        try {
            const slipFile = document.getElementById('paymentSlipFile')?.files[0];
            if (!slipFile) {
                this.ui.showNotification('กรุณาอัปโหลดหลักฐานการโอนเงิน', 'error');
                return;
            }

            this.ui.showNotification('กำลังอัปโหลดหลักฐานการชำระเงิน...', 'info');
            const uploadResult = await this.api.uploadFile(
                slipFile,
                'payment',
                this.auth.getCurrentUser().user_id
            );

            const data = await this.api.post('payments', {
                bill_id: formData.bill_id,
                user_id: this.auth.getCurrentUser().user_id,
                amount: formData.amount,
                payment_method: formData.payment_method,
                status: 'pending',
                slip_path: uploadResult.path
            });

            this.ui.showNotification('ส่งหลักฐานการชำระเงินเรียบร้อยแล้ว รอการตรวจสอบ', 'success');
            this.ui.closeModal('paymentModal');
            await this.fetchAll();
            return data;
        } catch (error) {
            this.ui.showNotification(error.message || 'ส่งหลักฐานการชำระเงินไม่สำเร็จ', 'error');
            throw error;
        }
    }

    render() {
        const unpaidBills = this.billsCache.filter(b => b.status === 'unpaid' || b.status === 'pending_verification');
        const paidBills = this.billsCache.filter(b => b.status === 'paid');

        this.ui.renderTable(unpaidBills, 'paymentTable',
            [
                { key: 'item_name', header: 'รายการ' },
                { key: 'amount', header: 'ยอดเงิน', format: (amount) => `${parseFloat(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท` },
                { key: 'due_date', header: 'กำหนดชำระ', format: (date) => new Date(date).toLocaleDateString('th-TH') },
                { key: 'status', header: 'สถานะ', format: (status) => this.ui.getStatusHtml(status) }
            ],
            (bill) => {
                if (bill.status === 'unpaid') {
                    return `<button class="btn btn-primary btn-sm" onclick="app.paymentManager.openPaymentModal('${bill.bill_id}', ${bill.amount})">ชำระเงิน</button>`;
                } else if (bill.status === 'pending_verification') {
                    return `<button class="btn btn-secondary btn-sm" disabled>รอตรวจสอบ</button>`;
                }
                return '';
            },
            'ไม่มีบิลค้างชำระ'
        );

        this.ui.renderTable(paidBills, 'paymentHistoryTable',
            [
                { key: 'payment_date', header: 'วันที่ชำระ', format: (val, bill) => {
                    const payment = this.paymentsCache.find(p => p.bill_id === bill.bill_id && p.status === 'paid');
                    return payment ? new Date(payment.payment_date).toLocaleDateString('th-TH') : 'N/A';
                }},
                { key: 'item_name', header: 'รายการ' },
                { key: 'amount', header: 'ยอดเงิน', format: (amount) => `${parseFloat(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท` },
                { key: 'payment_method', header: 'วิธีชำระ', format: (val, bill) => {
                    const payment = this.paymentsCache.find(p => p.bill_id === bill.bill_id && p.status === 'paid');
                    const methods = {
                        'bank_transfer': 'โอนเงินผ่านธนาคาร',
                        'credit_card': 'บัตรเครดิต',
                        'promptpay': 'พร้อมเพย์'
                    };
                    return payment ? (methods[payment.payment_method] || payment.payment_method) : 'N/A';
                }}
            ],
            (bill) => `<button class="btn btn-secondary btn-sm" onclick="app.paymentManager.viewReceipt('${bill.payment_id}')">ดูใบเสร็จ</button>`,
            'ไม่มีประวัติการชำระเงิน'
        );

        const unpaidCount = unpaidBills.length;
        const unpaidEl = document.getElementById('unpaidBills');
        if (unpaidEl) unpaidEl.textContent = unpaidCount;
    }

    openPaymentModal(billId, amount) {
        document.getElementById('paymentBillId').value = billId;
        document.getElementById('paymentAmount').value = `${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
        document.getElementById('paymentMethod').value = '';
        document.getElementById('qrCodeContainer').style.display = 'none';
        document.getElementById('bankDetails').classList.add('hidden');
        const preview = document.getElementById('paymentSlipPreview');
        if (preview) preview.innerHTML = '';
        this.ui.openModal('paymentModal');
        this.showQRCode();
    }

    showQRCode() {
        const paymentMethod = document.getElementById('paymentMethod');
        const qrCodeContainer = document.getElementById('qrCodeContainer');
        const bankDetails = document.getElementById('bankDetails');
        const promptPayQrCodeImg = document.getElementById('promptPayQrCode');

        if (!paymentMethod || !qrCodeContainer || !bankDetails) return;

        if (paymentMethod.value === "promptpay") {
            qrCodeContainer.style.display = "block";
            bankDetails.classList.add("hidden");
            if (promptPayQrCodeImg) {
                promptPayQrCodeImg.src = 'static/uploads/QR-PAYMENT.jpg';
            }
        } else if (paymentMethod.value === "bank_transfer") {
            qrCodeContainer.style.display = "none";
            bankDetails.classList.remove("hidden");
        } else {
            qrCodeContainer.style.display = "none";
            bankDetails.classList.add("hidden");
        }
    }

    viewReceipt(paymentId) {
        this.ui.showNotification(`กำลังจะดูใบเสร็จสำหรับ Payment ID: ${paymentId}`, 'info');
    }
}

// ============================================
// Class: BookingManager - จัดการการจองพื้นที่
// ============================================
class BookingManager {
    constructor(apiService, uiManager, authManager) {
        this.api = apiService;
        this.ui = uiManager;
        this.auth = authManager;
        this.cache = [];
    }

    async fetchAll() {
        try {
            this.cache = await this.api.get('booking-requests');
            this.render();
            return this.cache;
        } catch (error) {
            this.ui.showNotification('ไม่สามารถโหลดข้อมูลการจองได้', 'error');
            return [];
        }
    }

    async create(formData) {
        try {
            const data = await this.api.post('booking-requests', {
                user_id: this.auth.getCurrentUser().user_id,
                location: formData.location,
                date: formData.date,
                start_time: formData.start_time,
                end_time: formData.end_time,
                purpose: formData.purpose,
                attendee_count: parseInt(formData.attendee_count)
            });
            this.ui.showNotification('ส่งคำขอจองเรียบร้อยแล้ว', 'success');
            return data;
        } catch (error) {
            this.ui.showNotification(error.message || 'ส่งคำขอจองไม่สำเร็จ', 'error');
            throw error;
        }
    }

    async updateStatus(bookingId, newStatus) {
        try {
            await this.api.put(`booking-requests/${bookingId}`, { status: newStatus });
            this.ui.showNotification(`อัปเดตสถานะการจองสำเร็จ`, 'success');
            await this.fetchAll();
        } catch (error) {
            this.ui.showNotification(error.message || 'อัปเดตสถานะไม่สำเร็จ', 'error');
        }
    }

    async delete(bookingId) {
        const confirmation = window.prompt('คุณแน่ใจหรือไม่ที่จะยกเลิกการจองนี้? (พิมพ์ "yes" เพื่อยืนยัน)');
        if (confirmation && confirmation.toLowerCase() === 'yes') {
            try {
                await this.api.delete(`booking-requests/${bookingId}`);
                this.ui.showNotification('ยกเลิกการจองสำเร็จ', 'success');
                await this.fetchAll();
            } catch (error) {
                this.ui.showNotification(error.message || 'ยกเลิกการจองไม่สำเร็จ', 'error');
            }
        } else {
            this.ui.showNotification('การยกเลิกถูกยกเลิก', 'info');
        }
    }

    render() {
        const bookingColumns = [
            { key: 'location', header: 'สถานที่' },
            { key: 'date', header: 'วันที่', format: (date) => new Date(date).toLocaleDateString('th-TH') },
            { 
                key: 'start_time', 
                header: 'เวลา', 
                format: (start, item) => `${start}-${item.end_time}`
            },
            { key: 'status', header: 'สถานะ', format: (status) => this.ui.getStatusHtml(status) }
        ];

        const currentUser = this.auth.getCurrentUser();
        let bookingsToRender;
        if (currentUser.role === 'admin') {
            bookingsToRender = this.cache;
        } else {
            bookingsToRender = this.cache.filter(b => b.user_id === currentUser.user_id);
        }

        this.ui.renderTable(bookingsToRender, 'bookingTable', bookingColumns, (booking) => {
            let buttons = '';
            if (currentUser.role === 'admin') {
                if (booking.status === 'pending') {
                    buttons += `<button class="btn btn-primary btn-sm" onclick="app.bookingManager.updateStatus('${booking.booking_id}', 'approved')">อนุมัติ</button> `;
                    buttons += `<button class="btn btn-secondary btn-sm" onclick="app.bookingManager.updateStatus('${booking.booking_id}', 'rejected')">ปฏิเสธ</button> `;
                } else if (booking.status === 'approved') {
                    buttons += `<button class="btn btn-secondary btn-sm" disabled>อนุมัติแล้ว</button> `;
                } else if (booking.status === 'rejected') {
                    buttons += `<button class="btn btn-secondary btn-sm" disabled>ถูกปฏิเสธ</button> `;
                }
                buttons += `<button class="btn btn-secondary btn-sm" onclick="app.bookingManager.delete('${booking.booking_id}')">ลบ</button>`;
            } else {
                if (booking.status === 'pending' || booking.status === 'approved') {
                    buttons += `<button class="btn btn-secondary btn-sm" onclick="app.bookingManager.delete('${booking.booking_id}')">ยกเลิก</button>`;
                }
            }
            return buttons;
        }, 'ไม่มีการจอง');
    }
}

// ============================================
// Class: UserManager - จัดการผู้ใช้งาน (Admin)
// ============================================
class UserManager {
    constructor(apiService, uiManager, authManager) {
        this.api = apiService;
        this.ui = uiManager;
        this.auth = authManager;
        this.cache = [];
    }

    async fetchAll() {
        try {
            this.cache = await this.api.get('users');
            this.render();
            return this.cache;
        } catch (error) {
            this.ui.showNotification('ไม่สามารถโหลดข้อมูลผู้ใช้ได้', 'error');
            return [];
        }
    }

    async create(userData) {
        try {
            const data = await this.api.post('users', userData);
            this.ui.showNotification('เพิ่มผู้ใช้ใหม่สำเร็จ', 'success');
            this.ui.closeModal('userModal');
            await this.fetchAll();
            return data;
        } catch (error) {
            this.ui.showNotification(error.message || 'เพิ่มผู้ใช้ไม่สำเร็จ', 'error');
            throw error;
        }
    }

    async update(userId, userData) {
        try {
            const data = await this.api.put(`users/${userId}`, userData);
            this.ui.showNotification('อัปเดตข้อมูลผู้ใช้สำเร็จ', 'success');
            this.ui.closeModal('userModal');
            await this.fetchAll();
            return data;
        } catch (error) {
            this.ui.showNotification(error.message || 'อัปเดตข้อมูลผู้ใช้ไม่สำเร็จ', 'error');
            throw error;
        }
    }

    async delete(userId) {
        const confirmation = window.prompt('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้? (พิมพ์ "yes" เพื่อยืนยัน)');
        if (confirmation && confirmation.toLowerCase() === 'yes') {
            try {
                await this.api.delete(`users/${userId}`);
                this.ui.showNotification('ลบผู้ใช้สำเร็จ', 'success');
                await this.fetchAll();
            } catch (error) {
                this.ui.showNotification(error.message || 'ลบผู้ใช้ไม่สำเร็จ', 'error');
            }
        } else {
            this.ui.showNotification('การลบถูกยกเลิก', 'info');
        }
    }

    async updateStatus(userId, newStatus) {
        try {
            await this.api.put(`users/${userId}`, { status: newStatus });
            this.ui.showNotification(`อัปเดตสถานะผู้ใช้สำเร็จ`, 'success');
            await this.fetchAll();
        } catch (error) {
            this.ui.showNotification(error.message || 'อัปเดตสถานะไม่สำเร็จ', 'error');
        }
    }

    render() {
        const userColumns = [
            { key: 'name', header: 'ชื่อ-นามสกุล' },
            { key: 'address', header: 'ที่อยู่', format: (addr) => addr || '-' },
            { key: 'phone', header: 'เบอร์ติดต่อ', format: (phone) => phone || '-' },
            { key: 'status', header: 'สถานะ', format: (status) => this.ui.getStatusHtml(status) },
            { key: 'role', header: 'บทบาท', format: (role) => role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้อยู่อาศัย' }
        ];

        this.ui.renderTable(this.cache, 'manageUsersTable', userColumns, (user) => {
            let buttons = '';
            if (user.status === 'pending') {
                buttons += `<button class="btn btn-primary btn-sm" onclick="app.userManager.updateStatus('${user.user_id}', 'approved')">อนุมัติ</button> `;
                buttons += `<button class="btn btn-secondary btn-sm" onclick="app.userManager.updateStatus('${user.user_id}', 'rejected')">ปฏิเสธ</button> `;
            }
            buttons += `<button class="btn btn-secondary btn-sm" onclick="app.userManager.editUser('${user.user_id}')">แก้ไข</button> `;
            if (user.status === 'approved') {
                buttons += `<button class="btn btn-secondary btn-sm" onclick="app.userManager.updateStatus('${user.user_id}', 'suspended')">ระงับ</button> `;
            }
            buttons += `<button class="btn btn-secondary btn-sm" onclick="app.userManager.delete('${user.user_id}')">ลบ</button>`;
            return buttons;
        }, 'ไม่มีข้อมูลผู้ใช้');
    }

    showAddModal() {
        document.getElementById('userModalTitle').innerText = 'เพิ่มผู้ใช้ใหม่';
        document.getElementById('userId').value = '';
        document.getElementById('userForm').reset();
        document.getElementById('userPassword').required = true;
        document.getElementById('userRoleSelect').value = 'resident';
        document.getElementById('userStatusSelect').value = 'pending';
        this.ui.openModal('userModal');
    }

    editUser(userId) {
        const user = this.cache.find(u => u.user_id == userId);
        if (!user) {
            this.ui.showNotification('ไม่พบข้อมูลผู้ใช้', 'error');
            return;
        }

        document.getElementById('userModalTitle').innerText = 'แก้ไขข้อมูลผู้ใช้';
        document.getElementById('userId').value = user.user_id;
        document.getElementById('userName').value = user.name;
        document.getElementById('userUsername').value = user.username;
        document.getElementById('userPassword').value = '';
        document.getElementById('userPassword').required = false;
        document.getElementById('userPhone').value = user.phone || '';
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userAddress').value = user.address || '';
        document.getElementById('userRoleSelect').value = user.role;
        document.getElementById('userStatusSelect').value = user.status;

        this.ui.openModal('userModal');
    }
}

// ============================================
// Class: BillManager - จัดการบิลค่าใช้จ่าย (Admin)
// ============================================
class BillManager {
    constructor(apiService, uiManager, authManager, userManager) {
        this.api = apiService;
        this.ui = uiManager;
        this.auth = authManager;
        this.userManager = userManager;
        this.cache = [];
        this.paymentsCache = [];
    }

    async fetchAll() {
        try {
            this.cache = await this.api.get('bills');
            this.paymentsCache = await this.api.get('payments');
            this.render();
            return this.cache;
        } catch (error) {
            this.ui.showNotification('ไม่สามารถโหลดข้อมูลบิลได้', 'error');
            return [];
        }
    }

    async create(formData) {
        try {
            const data = await this.api.post('bills', {
                item_name: formData.item_name,
                amount: parseFloat(formData.amount),
                due_date: formData.due_date,
                recipient_id: formData.recipient_id,
                issued_by_user_id: this.auth.getCurrentUser().user_id,
                status: 'unpaid'
            });
            this.ui.showNotification('บันทึกบิลสำเร็จ', 'success');
            this.ui.closeModal('manageBillModal');
            await this.fetchAll();
            return data;
        } catch (error) {
            this.ui.showNotification(error.message || 'บันทึกบิลไม่สำเร็จ', 'error');
            throw error;
        }
    }

    async update(billId, formData) {
        try {
            const data = await this.api.put(`bills/${billId}`, {
                item_name: formData.item_name,
                amount: parseFloat(formData.amount),
                due_date: formData.due_date,
                recipient_id: formData.recipient_id,
                issued_by_user_id: this.auth.getCurrentUser().user_id,
                status: 'unpaid'
            });
            this.ui.showNotification('อัปเดตบิลสำเร็จ', 'success');
            this.ui.closeModal('manageBillModal');
            await this.fetchAll();
            return data;
        } catch (error) {
            this.ui.showNotification(error.message || 'อัปเดตบิลไม่สำเร็จ', 'error');
            throw error;
        }
    }

    async delete(billId) {
        const confirmation = window.prompt('คุณแน่ใจหรือไม่ที่จะลบบิลนี้? (พิมพ์ "yes" เพื่อยืนยัน)');
        if (confirmation && confirmation.toLowerCase() === 'yes') {
            try {
                await this.api.delete(`bills/${billId}`);
                this.ui.showNotification('ลบบิลสำเร็จ', 'success');
                await this.fetchAll();
            } catch (error) {
                this.ui.showNotification(error.message || 'ลบบิลไม่สำเร็จ', 'error');
            }
        } else {
            this.ui.showNotification('การลบถูกยกเลิก', 'info');
        }
    }

    async approvePayment(billId) {
        const paymentToApprove = this.paymentsCache.find(p => p.bill_id == billId && p.status === 'pending');
        if (!paymentToApprove) {
            this.ui.showNotification('ไม่พบการชำระเงินที่รออนุมัติสำหรับบิลนี้', 'warning');
            return;
        }

        const confirmation = window.prompt(`คุณแน่ใจหรือไม่ที่จะอนุมัติการชำระเงินสำหรับบิล "${paymentToApprove.item_name}"? (พิมพ์ "yes" เพื่อยืนยัน)`);
        if (confirmation && confirmation.toLowerCase() === 'yes') {
            try {
                await this.api.put(`payments/approve/${paymentToApprove.payment_id}`, {});
                this.ui.showNotification(`อนุมัติการชำระเงินสำเร็จ`, 'success');
                await this.fetchAll();
            } catch (error) {
                this.ui.showNotification(error.message || 'อนุมัติการชำระเงินไม่สำเร็จ', 'error');
            }
        } else {
            this.ui.showNotification('การอนุมัติถูกยกเลิก', 'info');
        }
    }

    async rejectPayment(billId) {
        const paymentToReject = this.paymentsCache.find(p => p.bill_id == billId && p.status === 'pending');
        if (!paymentToReject) {
            this.ui.showNotification('ไม่พบการชำระเงินที่รอตรวจสอบสำหรับบิลนี้', 'warning');
            return;
        }

        const confirmation = window.prompt(`คุณแน่ใจหรือไม่ที่จะปฏิเสธการชำระเงินสำหรับบิล "${paymentToReject.item_name}"? (พิมพ์ "yes" เพื่อยืนยัน)`);
        if (confirmation && confirmation.toLowerCase() === 'yes') {
            try {
                await this.api.put(`payments/reject/${paymentToReject.payment_id}`, {});
                this.ui.showNotification(`ปฏิเสธการชำระเงินสำเร็จ`, 'success');
                await this.fetchAll();
            } catch (error) {
                this.ui.showNotification(error.message || 'ปฏิเสธการชำระเงินไม่สำเร็จ', 'error');
            }
        } else {
            this.ui.showNotification('การปฏิเสธถูกยกเลิก', 'info');
        }
    }

    render() {
        const billColumns = [
            { key: 'item_name', header: 'รายการ' },
            { 
                key: 'recipient_id', 
                header: 'สำหรับผู้ใช้', 
                format: (id) => {
                    if (id === 'all') return 'ทุกคนในหมู่บ้าน';
                    const user = this.userManager.cache.find(u => u.user_id == id);
                    return user ? user.name : 'ผู้ใช้ไม่ระบุ';
                }
            },
            { 
                key: 'amount', 
                header: 'ยอดเงิน (บาท)', 
                format: (amount) => parseFloat(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            },
            { key: 'due_date', header: 'กำหนดชำระ', format: (date) => new Date(date).toLocaleDateString('th-TH') },
            { key: 'status', header: 'สถานะ', format: (status) => this.ui.getStatusHtml(status) }
        ];

        this.ui.renderTable(this.cache, 'manageBillsTable', billColumns, (bill) => {
            let buttons = `<button class="btn btn-secondary btn-sm" onclick="app.billManager.editBill('${bill.bill_id}')">แก้ไข</button> `;
            buttons += `<button class="btn btn-secondary btn-sm" onclick="app.billManager.delete('${bill.bill_id}')">ลบ</button>`;
            if (bill.status === 'pending_verification') {
                buttons += ` <button class="btn btn-primary btn-sm" onclick="app.billManager.approvePayment('${bill.bill_id}')">อนุมัติการชำระ</button>`;
                buttons += ` <button class="btn btn-secondary btn-sm" onclick="app.billManager.rejectPayment('${bill.bill_id}')">ปฏิเสธการชำระ</button>`;
            }
            return buttons;
        }, 'ไม่มีบิลค่าใช้จ่าย');
    }

    async showAddModal() {
        document.getElementById('billModalTitle').innerText = 'เพิ่มบิลค่าใช้จ่ายใหม่';
        document.getElementById('billId').value = '';
        document.getElementById('billForm').reset();
        await this.populateRecipients();
        document.getElementById('billRecipient').value = 'all';
        this.ui.openModal('manageBillModal');
    }

    async editBill(billId) {
        const bill = this.cache.find(b => b.bill_id == billId);
        if (!bill) return;

        document.getElementById('billModalTitle').innerText = 'แก้ไขบิลค่าใช้จ่าย';
        document.getElementById('billId').value = bill.bill_id;
        document.getElementById('billItemName').value = bill.item_name;
        document.getElementById('billAmount').value = bill.amount;
        document.getElementById('billDueDate').value = new Date(bill.due_date).toISOString().slice(0, 10);
        await this.populateRecipients();
        document.getElementById('billRecipient').value = bill.recipient_id;
        this.ui.openModal('manageBillModal');
    }

    async populateRecipients() {
        const billRecipientSelect = document.getElementById('billRecipient');
        if (!billRecipientSelect) return;

        billRecipientSelect.innerHTML = '<option value="all">ทุกคนในหมู่บ้าน</option>';

        if (this.userManager.cache.length === 0) {
            await this.userManager.fetchAll();
        }

        this.userManager.cache
            .filter(u => u.role === 'resident' && u.status === 'approved')
            .forEach(user => {
                billRecipientSelect.innerHTML += `<option value="${user.user_id}">${user.name} (${user.address || 'ไม่ระบุที่อยู่'})</option>`;
            });
    }
}

// ============================================
// Class: AnnouncementManager - จัดการประกาศ
// ============================================
class AnnouncementManager {
    constructor(apiService, uiManager, authManager) {
        this.api = apiService;
        this.ui = uiManager;
        this.auth = authManager;
        this.cache = [];
    }

    async fetchAll() {
        try {
            this.cache = await this.api.get('announcements');
            this.render();
            return this.cache;
        } catch (error) {
            this.ui.showNotification('ไม่สามารถโหลดข้อมูลประกาศได้', 'error');
            return [];
        }
    }

    async create(formData) {
        try {
            const data = await this.api.post('announcements', {
                title: formData.title,
                content: formData.content,
                published_date: formData.published_date,
                author_id: this.auth.getCurrentUser().user_id,
                tag: formData.tag
            });
            this.ui.showNotification('บันทึกประกาศสำเร็จ', 'success');
            this.ui.closeModal('announcementModal');
            await this.fetchAll();
            return data;
        } catch (error) {
            this.ui.showNotification(error.message || 'บันทึกประกาศไม่สำเร็จ', 'error');
            throw error;
        }
    }

    async update(announcementId, formData) {
        try {
            const data = await this.api.put(`announcements/${announcementId}`, {
                title: formData.title,
                content: formData.content,
                published_date: formData.published_date,
                author_id: this.auth.getCurrentUser().user_id,
                tag: formData.tag
            });
            this.ui.showNotification('อัปเดตประกาศสำเร็จ', 'success');
            this.ui.closeModal('announcementModal');
            await this.fetchAll();
            return data;
        } catch (error) {
            this.ui.showNotification(error.message || 'อัปเดตประกาศไม่สำเร็จ', 'error');
            throw error;
        }
    }

    async delete(announcementId) {
        const confirmation = window.prompt('คุณแน่ใจหรือไม่ที่จะลบประกาศนี้? (พิมพ์ "yes" เพื่อยืนยัน)');
        if (confirmation && confirmation.toLowerCase() === 'yes') {
            try {
                await this.api.delete(`announcements/${announcementId}`);
                this.ui.showNotification('ลบประกาศสำเร็จ', 'success');
                await this.fetchAll();
            } catch (error) {
                this.ui.showNotification(error.message || 'ลบประกาศไม่สำเร็จ', 'error');
            }
        } else {
            this.ui.showNotification('การลบถูกยกเลิก', 'info');
        }
    }

    render() {
        const currentUser = this.auth.getCurrentUser();
        
        if (currentUser.role === 'admin') {
            const commonColumns = [
                { key: 'title', header: 'หัวข้อ' },
                { key: 'published_date', header: 'วันที่', format: (date) => new Date(date).toLocaleDateString('th-TH') },
                { key: 'author_name', header: 'โดย', format: (name) => name || 'ผู้ดูแลระบบ' }
            ];

            this.ui.renderTable(this.cache, 'adminAnnouncementsTable', commonColumns, (announcement) => `
                <button class="btn btn-secondary btn-sm" onclick="app.announcementManager.editAnnouncement('${announcement.announcement_id}')">แก้ไข</button>
                <button class="btn btn-secondary btn-sm" onclick="app.announcementManager.delete('${announcement.announcement_id}')">ลบ</button>
            `, 'ไม่มีประกาศ');
        }

        const announcementsList = document.getElementById('announcementsList');
        if (!announcementsList) return;

        if (!this.cache || this.cache.length === 0) {
            announcementsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;"><i class="fas fa-bullhorn" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i><p>ยังไม่มีประกาศ</p></div>';
            return;
        }

        announcementsList.innerHTML = this.cache.map(announcement => {
            const tagColors = {
                'สำคัญ': { bg: '#e3f2fd', color: '#1976d2' },
                'กิจกรรม': { bg: '#e8f5e8', color: '#2e7d32' },
                'แจ้งเตือน': { bg: '#fff3cd', color: '#856404' },
                'ทั่วไป': { bg: '#f0f0f0', color: '#555' }
            };
            const tagInfo = tagColors[announcement.tag] || tagColors['ทั่วไป'];

            return `
                <div class="announcement-item" style="border-left: 4px solid ${tagInfo.color}; padding-left: 20px; margin-bottom: 25px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                        <h4 style="color: #333; margin: 0;">${announcement.title}</h4>
                        <span style="color: #666; font-size: 14px;">${new Date(announcement.published_date).toLocaleDateString('th-TH')}</span>
                    </div>
                    <p style="color: #666; line-height: 1.6; margin-bottom: 10px;">${announcement.content}</p>
                    <div style="display: flex; gap: 10px;">
                        <span class="status-badge" style="background: ${tagInfo.bg}; color: ${tagInfo.color};">${announcement.tag || 'ทั่วไป'}</span>
                        <span style="color: #666; font-size: 14px;"><i class="fas fa-user"></i> โดย: ${announcement.author_name || 'ผู้ดูแลระบบ'}</span>
                    </div>
                    <div class="admin-actions ${currentUser.role === 'admin' ? '' : 'hidden'}" style="margin-top: 15px;">
                        <button class="btn btn-secondary btn-sm" onclick="app.announcementManager.editAnnouncement('${announcement.announcement_id}')">แก้ไข</button>
                        <button class="btn btn-secondary btn-sm" onclick="app.announcementManager.delete('${announcement.announcement_id}')">ลบ</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    showAddModal() {
        document.getElementById('announcementModalTitle').innerText = 'เพิ่มประกาศใหม่';
        document.getElementById('announcementId').value = '';
        document.getElementById('announcementForm').reset();
        document.getElementById('announcementDate').value = new Date().toISOString().slice(0, 10);
        document.getElementById('announcementAuthor').value = this.auth.getCurrentUser().name;
        this.ui.openModal('announcementModal');
    }

    editAnnouncement(announcementId) {
        const ann = this.cache.find(a => a.announcement_id == announcementId);
        if (!ann) return;

        document.getElementById('announcementModalTitle').innerText = 'แก้ไขประกาศ';
        document.getElementById('announcementId').value = ann.announcement_id;
        document.getElementById('announcementTitle').value = ann.title;
        document.getElementById('announcementContent').value = ann.content;
        document.getElementById('announcementDate').value = new Date(ann.published_date).toISOString().slice(0, 10);
        document.getElementById('announcementAuthor').value = ann.author_name || this.auth.getCurrentUser().name;
        document.getElementById('announcementTag').value = ann.tag || '';
        this.ui.openModal('announcementModal');
    }
}

// ============================================
// Class: ProfileManager - จัดการโปรไฟล์ผู้ใช้
// ============================================
class ProfileManager {
    constructor(apiService, uiManager, authManager) {
        this.api = apiService;
        this.ui = uiManager;
        this.auth = authManager;
    }

    async load() {
        try {
            const currentUser = this.auth.getCurrentUser();
            const data = await this.api.get(`users/${currentUser.user_id}`);
            
            const nameEl = document.getElementById('profileName');
            const phoneEl = document.getElementById('profilePhone');
            const emailEl = document.getElementById('profileEmail');
            const addressEl = document.getElementById('profileAddress');

            if (nameEl) nameEl.value = data.name || '';
            if (phoneEl) phoneEl.value = data.phone || '';
            if (emailEl) emailEl.value = data.email || '';
            if (addressEl) addressEl.value = data.address || '';
        } catch (error) {
            this.ui.showNotification('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้', 'error');
        }
    }

    async update(formData) {
        try {
            const currentUser = this.auth.getCurrentUser();
            
            // อัปโหลดเอกสารถ้ามี
            const profileDocuments = document.getElementById('profileDocuments');
            if (profileDocuments && profileDocuments.files.length > 0) {
                this.ui.showNotification('กำลังอัปโหลดเอกสาร...', 'info');
                await this.api.uploadMultipleFiles(
                    profileDocuments.files,
                    'profile',
                    currentUser.user_id
                );
            }

            await this.api.put(`users/${currentUser.user_id}`, {
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                address: formData.address
            });

            // อัปเดตข้อมูลใน authManager
            this.auth.currentUser.name = formData.name;
            this.auth.currentUser.phone = formData.phone;
            this.auth.currentUser.email = formData.email;
            this.auth.currentUser.address = formData.address;
            this.auth.currentUser.avatar = formData.name[0].toUpperCase();

            sessionStorage.setItem('userData', JSON.stringify(this.auth.currentUser));
            this.auth.updateUserInfo();
            
            this.ui.showNotification('อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว', 'success');
            
            const preview = document.getElementById('profileDocumentsPreview');
            if (preview) preview.innerHTML = '';
        } catch (error) {
            this.ui.showNotification(error.message || 'อัปเดตข้อมูลไม่สำเร็จ', 'error');
            throw error;
        }
    }

    async changePassword(formData) {
        try {
            const currentUser = this.auth.getCurrentUser();
            
            if (formData.newPassword !== formData.confirmNewPassword) {
                this.ui.showNotification('รหัสผ่านใหม่ไม่ตรงกัน', 'error');
                return;
            }

            await this.api.put(`users/${currentUser.user_id}`, {
                password: formData.newPassword,
                current_password: formData.currentPassword
            });
            
            this.ui.showNotification('เปลี่ยนรหัสผ่านสำเร็จ', 'success');
            document.getElementById('changePasswordForm').reset();
        } catch (error) {
            this.ui.showNotification(error.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ', 'error');
            throw error;
        }
    }
}

// ============================================
// Class: DashboardManager - จัดการแดชบอร์ด
// ============================================
class DashboardManager {
    constructor(repairManager, userManager, billManager) {
        this.repairManager = repairManager;
        this.userManager = userManager;
        this.billManager = billManager;
        this.chartInstance = null;
    }

    loadStats() {
        const totalEl = document.getElementById('totalResidents');
        const pendingEl = document.getElementById('pendingRepairs');
        const completedEl = document.getElementById('completedRepairs');
        const unpaidEl = document.getElementById('unpaidBills');

        if (totalEl && this.userManager.cache) {
            totalEl.textContent = this.userManager.cache.filter(u => u.role === 'resident' && u.status === 'approved').length;
        }
        if (pendingEl && this.repairManager.cache) {
            pendingEl.textContent = this.repairManager.cache.filter(r => r.status === 'pending').length;
        }
        if (completedEl && this.repairManager.cache) {
            completedEl.textContent = this.repairManager.cache.filter(r => r.status === 'completed').length;
        }

        const activitiesEl = document.getElementById('recentActivities');
        if (activitiesEl && this.repairManager.cache) {
            const recentRepairs = this.repairManager.cache.slice(0, 3);
            if (recentRepairs.length === 0) {
                activitiesEl.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666; padding: 20px;">ยังไม่มีกิจกรรม</td></tr>';
            } else {
                activitiesEl.innerHTML = recentRepairs.map(repair => {
                    const time = new Date(repair.submitted_date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                    return `<tr>
                        <td>${time}</td>
                        <td>${repair.title}</td>
                        <td>${repair.user_name || 'ผู้ใช้งาน'}</td>
                        <td>${app.ui.getStatusHtml(repair.status)}</td>
                    </tr>`;
                }).join('');
            }
        }
    }

    renderMonthlyChart() {
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) {
            console.warn("Canvas element 'monthlyChart' not found.");
            return;
        }

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const data = {
            labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
            datasets: [
                {
                    label: 'รายรับ (บาท)',
                    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1,
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'รายจ่าย (บาท)',
                    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                    fill: true,
                    tension: 0.3
                }
            ]
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
                        text: 'สรุปรายรับ-รายจ่ายรายเดือน (ยังไม่มีข้อมูล)'
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

        this.chartInstance = new Chart(ctx, config);
    }
}

// ============================================
// Class: SocketManager - จัดการ WebSocket
// ============================================
class SocketManager {
    constructor(authManager, uiManager) {
        this.auth = authManager;
        this.ui = uiManager;
        this.socket = null;
    }

    connect() {
        if (this.socket && this.socket.connected) {
            this.socket.disconnect();
        }

        this.socket = io('http://localhost:5000');

        this.socket.on('connect', () => {
            console.log('Connected to WebSocket server');
            const currentUser = this.auth.getCurrentUser();
            if (currentUser.user_id) {
                this.socket.emit('join_room', { room_name: currentUser.user_id });
            }
            if (currentUser.role === 'admin') {
                this.socket.emit('join_room', { room_name: 'admins' });
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
        });

        this.setupEventHandlers();
    }

    disconnect() {
        if (this.socket && this.socket.connected) {
            this.socket.disconnect();
        }
    }

    setupEventHandlers() {
        // Announcement events
        this.socket.on('new_announcement', (data) => {
            this.ui.showNotification(`ประกาศใหม่: ${data.title}`, 'info');
            if (app.announcementManager) app.announcementManager.fetchAll();
        });

        this.socket.on('announcement_updated', (data) => {
            this.ui.showNotification(`ประกาศ "${data.title}" ได้รับการแก้ไข`, 'info');
            if (app.announcementManager) app.announcementManager.fetchAll();
        });

        this.socket.on('announcement_deleted', () => {
            this.ui.showNotification('ประกาศถูกลบแล้ว', 'info');
            if (app.announcementManager) app.announcementManager.fetchAll();
        });

        // Repair request events
        this.socket.on('new_repair_request', (data) => {
            const currentUser = this.auth.getCurrentUser();
            if (currentUser.role === 'admin') {
                this.ui.showNotification(`มีคำขอแจ้งซ่อมใหม่: ${data.title}`, 'warning');
                if (app.repairManager) app.repairManager.fetchAll();
            }
        });

        this.socket.on('repair_status_updated', (data) => {
            const currentUser = this.auth.getCurrentUser();
            if (currentUser.user_id === data.user_id || currentUser.role === 'admin') {
                this.ui.showNotification(`สถานะงานซ่อมได้รับการอัปเดต`, 'success');
                if (app.repairManager) app.repairManager.fetchAll();
            }
        });

        // Booking events
        this.socket.on('new_booking_request', (data) => {
            const currentUser = this.auth.getCurrentUser();
            if (currentUser.role === 'admin') {
                this.ui.showNotification(`มีการจองพื้นที่ใหม่: ${data.location}`, 'warning');
                if (app.bookingManager) app.bookingManager.fetchAll();
            }
        });

        this.socket.on('booking_status_updated', (data) => {
            const currentUser = this.auth.getCurrentUser();
            if (currentUser.user_id === data.user_id) {
                this.ui.showNotification(`สถานะการจองพื้นที่ของคุณได้รับการอัปเดต`, 'success');
                if (app.bookingManager) app.bookingManager.fetchAll();
            }
        });

        // Payment events
        this.socket.on('new_payment_receipt', (data) => {
            const currentUser = this.auth.getCurrentUser();
            if (currentUser.role === 'admin') {
                this.ui.showNotification(`มีหลักฐานการชำระเงินใหม่`, 'warning');
                if (app.paymentManager) app.paymentManager.fetchAll();
            }
        });

        this.socket.on('payment_approved', (data) => {
            const currentUser = this.auth.getCurrentUser();
            if (currentUser.user_id === data.user_id || currentUser.role === 'admin') {
                this.ui.showNotification(`การชำระเงินได้รับการอนุมัติ`, 'success');
                if (app.paymentManager) app.paymentManager.fetchAll();
                if (app.billManager) app.billManager.fetchAll();
            }
        });

        this.socket.on('payment_rejected', (data) => {
            const currentUser = this.auth.getCurrentUser();
            if (currentUser.user_id === data.user_id || currentUser.role === 'admin') {
                this.ui.showNotification(`การชำระเงินถูกปฏิเสธ`, 'error');
                if (app.paymentManager) app.paymentManager.fetchAll();
                if (app.billManager) app.billManager.fetchAll();
            }
        });

        // Bill events
        this.socket.on('new_bill_created', (data) => {
            this.ui.showNotification(`มีบิลใหม่: ${data.item_name}`, 'info');
            if (app.billManager) app.billManager.fetchAll();
            if (app.paymentManager) app.paymentManager.fetchAll();
        });

        this.socket.on('bill_updated', (data) => {
            this.ui.showNotification(`บิล "${data.item_name}" ได้รับการแก้ไข`, 'info');
            if (app.billManager) app.billManager.fetchAll();
            if (app.paymentManager) app.paymentManager.fetchAll();
        });

        this.socket.on('bill_deleted', (data) => {
            this.ui.showNotification(`บิล "${data.item_name}" ถูกลบแล้ว`, 'info');
            if (app.billManager) app.billManager.fetchAll();
            if (app.paymentManager) app.paymentManager.fetchAll();
        });
    }
}

// ============================================
// Class: Application - Main Application Class
// ============================================
class Application {
    constructor() {
        this.api = new APIService('http://localhost:5000');
        this.ui = new UIManager();
        this.auth = new AuthManager(this.api, this.ui);
        this.repairManager = new RepairRequestManager(this.api, this.ui, this.auth);
        this.paymentManager = new PaymentManager(this.api, this.ui, this.auth);
        this.bookingManager = new BookingManager(this.api, this.ui, this.auth);
        this.userManager = new UserManager(this.api, this.ui, this.auth);
        this.billManager = new BillManager(this.api, this.ui, this.auth, this.userManager);
        this.announcementManager = new AnnouncementManager(this.api, this.ui, this.auth);
        this.profileManager = new ProfileManager(this.api, this.ui, this.auth);
        this.dashboardManager = new DashboardManager(this.repairManager, this.userManager, this.billManager);
        this.socketManager = new SocketManager(this.auth, this.ui);
        
        this.pageMap = {
            'dashboard-home': () => this.loadDashboard(),
            'profile': () => this.profileManager.load(),
            'repair-request': () => this.repairManager.fetchAll(),
            'announcements': () => this.announcementManager.fetchAll(),
            'payments': () => this.paymentManager.fetchAll(),
            'booking': () => this.bookingManager.fetchAll(),
            'manage-users': () => this.userManager.fetchAll(),
            'manage-repairs': () => this.repairManager.fetchAll(),
            'manage-bills': () => this.billManager.fetchAll(),
            'reports': () => this.dashboardManager.renderMonthlyChart(),
            'calendar': () => this.ui.showNotification('ฟังก์ชันปฏิทินกิจกรรมยังไม่พร้อมใช้งาน', 'info'),
            'chat': () => this.ui.showNotification('ฟังก์ชันแชทยังไม่พร้อมใช้งาน', 'info'),
            'documents': () => this.ui.showNotification('ฟังก์ชันเอกสารยังไม่พร้อมใช้งาน', 'info'),
            'security': () => this.ui.showNotification('ฟังก์ชันความปลอดภัยยังไม่พร้อมใช้งาน', 'info'),
            'voting': () => this.ui.showNotification('ฟังก์ชันโหวตยังไม่พร้อมใช้งาน', 'info')
        };
    }

    async initialize() {
        this.setupEventListeners();
        
        if (this.auth.restoreSession()) {
            await this.showDashboard();
            this.socketManager.connect();
        } else {
            this.showLogin();
        }
    }

    showLogin() {
        document.getElementById('loginPage').classList.remove('hidden');
        document.getElementById('registerPage').classList.add('hidden');
        document.getElementById('dashboard').classList.add('hidden');
    }

    showRegister() {
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('registerPage').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
    }

    async showDashboard() {
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('registerPage').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        this.auth.updateUserInfo();
        this.showPage('dashboard-home');
    }

    showPage(pageId) {
        this.ui.showPage(pageId);
        
        if (this.pageMap[pageId]) {
            this.pageMap[pageId]();
        }
        
        this.setupDynamicFormListeners();
    }

    async loadDashboard() {
        await this.userManager.fetchAll();
        await this.repairManager.fetchAll();
        await this.billManager.fetchAll();
        this.dashboardManager.loadStats();
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const success = await this.auth.login(username, password);
                if (success) {
                    await this.showDashboard();
                    this.socketManager.connect();
                }
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('regName').value;
                const username = document.getElementById('regUsername').value;
                const password = document.getElementById('regPassword').value;
                const confirmPassword = document.getElementById('regConfirmPassword').value;
                const phone = document.getElementById('regPhone').value;
                const email = document.getElementById('regEmail').value;
                const address = document.getElementById('regAddress').value;

                if (password !== confirmPassword) {
                    this.ui.showNotification('รหัสผ่านไม่ตรงกัน', 'error');
                    return;
                }

                const success = await this.auth.register({
                    name, username, password, phone, email, address
                });
                
                if (success) {
                    registerForm.reset();
                    setTimeout(() => this.showLogin(), 2000);
                }
            });
        }

        window.onclick = (event) => {
            document.querySelectorAll('.modal').forEach(modal => {
                if (event.target === modal && modal.style.display !== 'none') {
                    this.ui.closeModal(modal.id);
                }
            });
        };

        const headerH1 = document.querySelector('.header-content h1');
        if (headerH1 && window.innerWidth <= 768) {
            headerH1.style.cursor = 'pointer';
            headerH1.addEventListener('click', () => this.ui.toggleSidebar());
        }

        window.addEventListener('resize', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar && window.innerWidth > 768) {
                sidebar.classList.remove('open');
            }
        });
    }

    setupDynamicFormListeners() {
        const formHandlers = [
            { 
                id: 'repairForm', 
                handler: async (e) => {
                    e.preventDefault();
                    try {
                        await this.repairManager.create({
                            title: document.getElementById('repairTitle').value,
                            category: document.getElementById('repairCategory').value,
                            description: document.getElementById('repairDescription').value
                        });
                        document.getElementById('repairForm').reset();
                        document.getElementById('repairImagesPreview').innerHTML = '';
                    } catch (error) {}
                }
            },
            {
                id: 'bookingForm',
                handler: async (e) => {
                    e.preventDefault();
                    try {
                        await this.bookingManager.create({
                            location: document.getElementById('bookingLocation').value,
                            date: document.getElementById('bookingDate').value,
                            start_time: document.getElementById('bookingTimeStart').value,
                            end_time: document.getElementById('bookingTimeEnd').value,
                            purpose: document.getElementById('bookingPurpose').value,
                            attendee_count: document.getElementById('attendeeCount').value
                        });
                        document.getElementById('bookingForm').reset();
                    } catch (error) {}
                }
            },
            {
                id: 'paymentForm',
                handler: async (e) => {
                    e.preventDefault();
                    try {
                        const amountStr = document.getElementById('paymentAmount').value;
                        const amount = parseFloat(amountStr.replace(' บาท', '').replace(/,/g, ''));
                        await this.paymentManager.create({
                            bill_id: document.getElementById('paymentBillId').value,
                            amount: amount,
                            payment_method: document.getElementById('paymentMethod').value
                        });
                    } catch (error) {}
                }
            },
            {
                id: 'profileForm',
                handler: async (e) => {
                    e.preventDefault();
                    try {
                        await this.profileManager.update({
                            name: document.getElementById('profileName').value,
                            phone: document.getElementById('profilePhone').value,
                            email: document.getElementById('profileEmail').value,
                            address: document.getElementById('profileAddress').value
                        });
                    } catch (error) {}
                }
            },
            {
                id: 'changePasswordForm',
                handler: async (e) => {
                    e.preventDefault();
                    try {
                        await this.profileManager.changePassword({
                            currentPassword: document.getElementById('currentPassword').value,
                            newPassword: document.getElementById('newPassword').value,
                            confirmNewPassword: document.getElementById('confirmNewPassword').value
                        });
                    } catch (error) {}
                }
            },
            {
                id: 'announcementForm',
                handler: async (e) => {
                    e.preventDefault();
                    const id = document.getElementById('announcementId').value;
                    try {
                        const formData = {
                            title: document.getElementById('announcementTitle').value,
                            content: document.getElementById('announcementContent').value,
                            published_date: document.getElementById('announcementDate').value,
                            tag: document.getElementById('announcementTag').value
                        };
                        if (id) {
                            await this.announcementManager.update(id, formData);
                        } else {
                            await this.announcementManager.create(formData);
                        }
                    } catch (error) {}
                }
            },
            {
                id: 'billForm',
                handler: async (e) => {
                    e.preventDefault();
                    const id = document.getElementById('billId').value;
                    try {
                        const formData = {
                            item_name: document.getElementById('billItemName').value,
                            amount: document.getElementById('billAmount').value,
                            due_date: document.getElementById('billDueDate').value,
                            recipient_id: document.getElementById('billRecipient').value
                        };
                        if (id) {
                            await this.billManager.update(id, formData);
                        } else {
                            await this.billManager.create(formData);
                        }
                    } catch (error) {}
                }
            },
            {
                id: 'userForm',
                handler: async (e) => {
                    e.preventDefault();
                    const userId = document.getElementById('userId').value;
                    try {
                        const userData = {
                            name: document.getElementById('userName').value,
                            username: document.getElementById('userUsername').value,
                            phone: document.getElementById('userPhone').value,
                            email: document.getElementById('userEmail').value,
                            address: document.getElementById('userAddress').value,
                            role: document.getElementById('userRoleSelect').value,
                            status: document.getElementById('userStatusSelect').value
                        };
                        const password = document.getElementById('userPassword').value;
                        if (password) userData.password = password;

                        if (userId) {
                            await this.userManager.update(userId, userData);
                        } else {
                            if (!password) {
                                this.ui.showNotification('กรุณาระบุรหัสผ่านสำหรับผู้ใช้ใหม่', 'error');
                                return;
                            }
                            await this.userManager.create(userData);
                        }
                    } catch (error) {}
                }
            }
        ];

        formHandlers.forEach(({ id, handler }) => {
            const form = document.getElementById(id);
            if (form) {
                const newForm = form.cloneNode(true);
                form.parentNode.replaceChild(newForm, form);
                newForm.addEventListener('submit', handler);
            }
        });

        const fileInputPreviews = [
            { inputId: 'paymentSlipFile', previewId: 'paymentSlipPreview' },
            { inputId: 'repairImages', previewId: 'repairImagesPreview' },
            { inputId: 'profileDocuments', previewId: 'profileDocumentsPreview' }
        ];

        fileInputPreviews.forEach(({ inputId, previewId }) => {
            const input = document.getElementById(inputId);
            if (input) {
                const newInput = input.cloneNode(true);
                input.parentNode.replaceChild(newInput, input);
                newInput.addEventListener('change', () => this.ui.handleFilePreview(inputId, previewId));
            }
        });

        const paymentMethodEl = document.getElementById('paymentMethod');
        if (paymentMethodEl) {
            const newPaymentMethod = paymentMethodEl.cloneNode(true);
            paymentMethodEl.parentNode.replaceChild(newPaymentMethod, paymentMethodEl);
            newPaymentMethod.addEventListener('change', () => this.paymentManager.showQRCode());
        }
    }

    logout() {
        this.auth.logout();
        this.socketManager.disconnect();
        this.showLogin();
    }
}

// ============================================
// Initialize Application
// ============================================
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new Application();
    app.initialize();
});

// ============================================
// Global Functions (for HTML onclick attributes)
// ============================================
window.showPage = (pageId) => app.showPage(pageId);
window.showLogin = () => app.showLogin();
window.showRegister = () => app.showRegister();
window.logout = () => app.logout();
window.showForgotPassword = () => app.ui.showNotification('ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว', 'info');
window.togglePasswordVisibility = (inputId) => app.ui.togglePasswordVisibility(inputId);
window.openModal = (modalId) => app.ui.openModal(modalId);
window.closeModal = (modalId) => app.ui.closeModal(modalId);
window.toggleSidebar = () => app.ui.toggleSidebar();

// Announcement functions
window.showAddAnnouncementModal = () => app.announcementManager.showAddModal();
window.editAnnouncement = (id) => app.announcementManager.editAnnouncement(id);
window.deleteAnnouncement = (id) => app.announcementManager.delete(id);

// Payment functions
window.payBill = (billId, amount) => app.paymentManager.openPaymentModal(billId, amount);
window.viewReceipt = (paymentId) => app.paymentManager.viewReceipt(paymentId);

// Repair functions
window.viewRepairDetails = (requestId) => app.repairManager.viewDetails(requestId);
window.updateRepairStatus = (requestId, status) => app.repairManager.updateStatus(requestId, status);

// Booking functions
window.deleteBooking = (bookingId) => app.bookingManager.delete(bookingId);
window.updateBookingStatus = (bookingId, status) => app.bookingManager.updateStatus(bookingId, status);

// User management functions
window.showAddUserModal = () => app.userManager.showAddModal();
window.editUser = (userId) => app.userManager.editUser(userId);
window.deleteUser = (userId) => app.userManager.delete(userId);
window.updateUserStatus = (userId, status) => app.userManager.updateStatus(userId, status);

// Bill management functions
window.showAddBillModal = () => app.billManager.showAddModal();
window.editBill = (billId) => app.billManager.editBill(billId);
window.deleteBill = (billId) => app.billManager.delete(billId);
window.approvePaymentForBill = (billId) => app.billManager.approvePayment(billId);
window.rejectPaymentForBill = (billId) => app.billManager.rejectPayment(billId);

// Placeholder functions
window.sendMessage = () => app.ui.showNotification('ฟังก์ชันส่งข้อความยังไม่พร้อมใช้งาน', 'info');
window.openGroupChat = (groupName) => app.ui.showNotification(`กำลังเปิดแชทกลุ่ม: ${groupName}`, 'info');
window.submitVote = (pollName) => app.ui.showNotification(`กำลังส่งโหวตสำหรับ: ${pollName}`, 'info');
window.toggleNotifications = () => app.ui.showNotification('ฟังก์ชันการแจ้งเตือนยังไม่พร้อมใช้งาน', 'info');
window.previousMonth = () => app.ui.showNotification('ฟังก์ชันปฏิทินยังไม่พร้อมใช้งาน', 'info');
window.nextMonth = () => app.ui.showNotification('ฟังก์ชันปฏิทินยังไม่พร้อมใช้งาน', 'info');

