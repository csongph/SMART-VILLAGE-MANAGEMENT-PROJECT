import tkinter as tk
from tkinter import messagebox
import hashlib # For a very basic password hashing simulation

# --- Dummy Data (เหมือนกับใน script.js แต่เป็น Python dictionary) ---
# ข้อมูลผู้ใช้จำลอง (แทนที่ด้วยการเชื่อมต่อฐานข้อมูลจริง)
USERS = {
    "admin": {
        "password_hash": hashlib.sha256("admin".encode()).hexdigest(), # จำลองการแฮชรหัสผ่าน
        "role": "admin",
        "name": "ผู้ดูแลระบบ",
        "address": "-",
        "phone": "-",
        "email": "-"
    },
    "resident": {
        "password_hash": hashlib.sha256("resident".encode()).hexdigest(), # จำลองการแฮชรหัสผ่าน
        "role": "resident",
        "name": "คุณสมชาย ใจดี",
        "address": "123/45",
        "phone": "0812345678",
        "email": "somchai@example.com"
    }
}

# ข้อมูลการแจ้งซ่อมจำลอง
REPAIRS = [
    {"id": "#001", "title": "ไฟทางเดินเสีย", "category": "ไฟฟ้า", "reporter": "คุณสมชาย ใจดี", "address": "123/45", "date": "2023-10-26", "status": "รอรับเรื่อง"},
    {"id": "#002", "title": "น้ำรั่วซึม", "category": "น้ำประปา", "reporter": "คุณมาลี สวยใส", "address": "123/46", "date": "2023-10-20", "status": "กำลังดำเนินการ"},
    {"id": "#003", "title": "แอร์ไม่เย็น", "category": "แอร์", "reporter": "คุณสมชาย ใจดี", "address": "123/45", "date": "2023-10-15", "status": "เสร็จสิ้น"},
]

# ข้อมูลการจองพื้นที่จำลอง
BOOKINGS = [
    {"id": "#B001", "area": "ห้องประชุม", "date": "2023-11-10", "time": "09:00-12:00", "purpose": "ประชุมคณะกรรมการ", "status": "รออนุมัติ"},
    {"id": "#B002", "area": "สระว่ายน้ำ", "date": "2023-11-05", "time": "13:00-16:00", "purpose": "ออกกำลังกาย", "status": "อนุมัติแล้ว"},
]

# ข้อมูลบิลจำลอง
BILLS = [
    {"id": "#INV001", "item": "ค่าส่วนกลาง ต.ค. 66", "amount": 1500.00, "due_date": "2023-11-05", "status": "ยังไม่ชำระ"},
    {"id": "#INV002", "item": "ค่าน้ำประปา ก.ย. 66", "amount": 350.00, "due_date": "2023-10-31", "status": "ยังไม่ชำระ"},
    {"id": "#INV000", "item": "ค่าขยะ ก.ย. 66", "amount": 100.00, "due_date": "2023-10-10", "status": "ชำระแล้ว"},
]

# ข้อมูลประกาศจำลอง
ANNOUNCEMENTS = [
    {"title": "ประกาศเรื่อง: การชำระค่าส่วนกลางประจำปี", "date": "2023-10-25", "content": "เรียน ท่านเจ้าของบ้านทุกท่าน, ขอแจ้งเรื่องการชำระค่าส่วนกลางประจำปี 2567 โดยสามารถชำระได้ตั้งแต่วันที่ 1 พฤศจิกายน 2566 ถึง 31 ธันวาคม 2566 หากมีข้อสงสัยสามารถติดต่อสำนักงานนิติบุคคลได้"},
    {"title": "ประกาศเรื่อง: กิจกรรมทำความสะอาดหมู่บ้าน", "date": "2023-10-20", "content": "ขอเชิญชวนลูกบ้านทุกท่านร่วมกิจกรรมทำความสะอาดหมู่บ้านในวันเสาร์ที่ 4 พฤศจิกายน 2566 เวลา 09:00 น. เป็นต้นไป ณ สวนสาธารณะกลางหมู่บ้าน"},
]


current_user = None # เก็บข้อมูลผู้ใช้ที่ล็อกอินอยู่

# --- ฟังก์ชันหลักของ GUI ---
class SmartVillageApp:
    def __init__(self, master):
        self.master = master
        master.title("SMART VILLAGE - ระบบจัดการหมู่บ้านออนไลน์")
        master.geometry("1000x700") # กำหนดขนาดเริ่มต้นของหน้าต่าง
        master.resizable(True, True) # อนุญาตให้ปรับขนาดหน้าต่างได้

        # สร้างเฟรมหลักสำหรับแต่ละหน้า
        self.login_frame = tk.Frame(master, bg="#f0f2f5")
        self.dashboard_frame = tk.Frame(master, bg="#f0f2f5")

        self.show_login_page() # เริ่มต้นด้วยหน้าล็อกอิน

    def show_frame(self, frame):
        """ซ่อนทุกเฟรมแล้วแสดงเฟรมที่ต้องการ"""
        self.login_frame.pack_forget()
        self.dashboard_frame.pack_forget()
        frame.pack(fill="both", expand=True)

    def show_login_page(self):
        """สร้างและแสดงหน้าล็อกอิน"""
        self.show_frame(self.login_frame)
        for widget in self.login_frame.winfo_children():
            widget.destroy() # ล้างวิดเจ็ตเก่าออก

        # Login UI
        login_card = tk.Frame(self.login_frame, bg="white", padx=40, pady=40, bd=2, relief="groove")
        login_card.place(relx=0.5, rely=0.5, anchor="center") # จัดให้อยู่ตรงกลาง

        tk.Label(login_card, text="SMART VILLAGE", font=("Segoe UI", 24, "bold"), fg="#667eea", bg="white").pack(pady=10)
        tk.Label(login_card, text="ระบบจัดการหมู่บ้านออนไลน์", font=("Segoe UI", 12), fg="#666", bg="white").pack(pady=5)

        tk.Label(login_card, text="ชื่อผู้ใช้:", font=("Segoe UI", 12), bg="white").pack(anchor="w", pady=(20, 5))
        self.username_entry = tk.Entry(login_card, width=40, font=("Segoe UI", 12), bd=2, relief="solid")
        self.username_entry.pack(pady=5)

        tk.Label(login_card, text="รหัสผ่าน:", font=("Segoe UI", 12), bg="white").pack(anchor="w", pady=(10, 5))
        self.password_entry = tk.Entry(login_card, show="*", width=40, font=("Segoe UI", 12), bd=2, relief="solid")
        self.password_entry.pack(pady=5)

        tk.Button(login_card, text="เข้าสู่ระบบ", command=self.login, font=("Segoe UI", 12, "bold"), bg="#667eea", fg="white", width=30, height=2).pack(pady=20)
        tk.Button(login_card, text="ลงทะเบียน (จำลอง)", command=lambda: messagebox.showinfo("ลงทะเบียน", "ฟังก์ชันลงทะเบียนยังไม่ถูกพัฒนาใน GUI นี้"), font=("Segoe UI", 10), bg="#f8f9fa", fg="#667eea", width=30, height=1).pack(pady=5)
        tk.Label(login_card, text="ลืมรหัสผ่าน? (จำลอง)", font=("Segoe UI", 10), fg="#667eea", bg="white").pack(pady=5)

    def login(self):
        """ตรวจสอบการล็อกอิน"""
        global current_user
        username = self.username_entry.get()
        password = self.password_entry.get()
        hashed_password = hashlib.sha256(password.encode()).hexdigest()

        if username in USERS and USERS[username]["password_hash"] == hashed_password:
            current_user = USERS[username]
            messagebox.showinfo("เข้าสู่ระบบสำเร็จ", f"ยินดีต้อนรับ, {current_user['name']}!")
            self.show_dashboard()
        else:
            messagebox.showerror("เข้าสู่ระบบล้มเหลว", "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")

    def logout(self):
        """ออกจากระบบ"""
        global current_user
        current_user = None
        messagebox.showinfo("ออกจากระบบ", "คุณได้ออกจากระบบแล้ว")
        self.show_login_page()

    def show_dashboard(self):
        """สร้างและแสดงหน้าแดชบอร์ด"""
        self.show_frame(self.dashboard_frame)
        for widget in self.dashboard_frame.winfo_children():
            widget.destroy() # ล้างวิดเจ็ตเก่าออก

        # Dashboard Layout
        # Sidebar
        self.sidebar = tk.Frame(self.dashboard_frame, bg="#333", width=200)
        self.sidebar.pack(side="left", fill="y")
        self.sidebar.pack_propagate(False) # ป้องกันไม่ให้ sidebar ย่อ/ขยายตามเนื้อหา

        # Header
        self.header = tk.Frame(self.dashboard_frame, bg="white", height=60, bd=1, relief="solid")
        self.header.pack(side="top", fill="x")
        self.header.pack_propagate(False)

        tk.Label(self.header, text="ระบบจัดการหมู่บ้านจัดสรร", font=("Segoe UI", 16, "bold"), fg="#667eea", bg="white").pack(side="left", padx=20)
        
        user_info_frame = tk.Frame(self.header, bg="white")
        user_info_frame.pack(side="right", padx=20)
        
        self.user_name_label = tk.Label(user_info_frame, text=current_user['name'], font=("Segoe UI", 12, "bold"), bg="white")
        self.user_name_label.pack(side="left", padx=5)
        self.user_role_label = tk.Label(user_info_frame, text=f"({current_user['role'].capitalize()})", font=("Segoe UI", 10), bg="white")
        self.user_role_label.pack(side="left", padx=5)
        
        tk.Button(user_info_frame, text="ออกจากระบบ", command=self.logout, font=("Segoe UI", 10), bg="#dc3545", fg="white").pack(side="right", padx=10)


        # Main Content Area
        self.content_area = tk.Frame(self.dashboard_frame, bg="#f8f9fa")
        self.content_area.pack(side="right", fill="both", expand=True)

        self.create_sidebar_menu()
        self.show_dashboard_home() # แสดงหน้าแรกของแดชบอร์ดเมื่อล็อกอินสำเร็จ

    def create_sidebar_menu(self):
        """สร้างเมนูด้านข้าง (Sidebar)"""
        menu_items = [
            ("แดชบอร์ด", self.show_dashboard_home),
            ("ข้อมูลส่วนตัว", self.show_profile_page),
            ("แจ้งซ่อม", self.show_repair_request_page, "resident"),
            ("ประกาศ", self.show_announcements_page),
            ("ชำระเงิน", self.show_payments_page, "resident"),
            ("จองพื้นที่", self.show_booking_page, "resident"),
            ("จัดการผู้ใช้", self.show_manage_users_page, "admin"),
            ("จัดการแจ้งซ่อม", self.show_manage_repairs_page, "admin"),
            ("รายงาน", self.show_reports_page, "admin"),
        ]

        for text, command, *role_required in menu_items:
            # ตรวจสอบบทบาทของผู้ใช้
            if role_required and current_user['role'] not in role_required:
                continue # ข้ามเมนูนี้ถ้าผู้ใช้ไม่มีสิทธิ์

            btn = tk.Button(self.sidebar, text=text, command=command,
                            font=("Segoe UI", 12), fg="white", bg="#333",
                            activebackground="#667eea", activeforeground="white",
                            bd=0, relief="flat", anchor="w", padx=20, pady=10)
            btn.pack(fill="x", pady=2)
            btn.bind("<Enter>", lambda e, b=btn: b.config(bg="#555"))
            btn.bind("<Leave>", lambda e, b=btn: b.config(bg="#333"))

    def clear_content_area(self):
        """ล้างเนื้อหาในพื้นที่แสดงผลหลัก"""
        for widget in self.content_area.winfo_children():
            widget.destroy()

    # --- หน้าต่างๆ ในแดชบอร์ด ---
    def show_dashboard_home(self):
        self.clear_content_area()
        tk.Label(self.content_area, text="แดชบอร์ด", font=("Segoe UI", 20, "bold"), bg="#f8f9fa").pack(pady=20)
        tk.Label(self.content_area, text="ภาพรวมระบบจัดการหมู่บ้านจัดสรร", font=("Segoe UI", 12), bg="#f8f9fa").pack(pady=5)

        # จำลอง Stat Cards
        stats_frame = tk.Frame(self.content_area, bg="#f8f9fa")
        stats_frame.pack(pady=20)

        # ตัวอย่าง Stat Card
        def create_stat_card(parent, title, value, color):
            card = tk.Frame(parent, bg="white", padx=20, pady=20, bd=1, relief="solid")
            card.pack(side="left", padx=10, pady=10)
            tk.Label(card, text=value, font=("Segoe UI", 28, "bold"), fg=color, bg="white").pack()
            tk.Label(card, text=title, font=("Segoe UI", 12), fg="#666", bg="white").pack()
            return card

        create_stat_card(stats_frame, "ผู้อยู่อาศัย", len(USERS), "#667eea")
        create_stat_card(stats_frame, "งานซ่อมรอดำเนินการ", len([r for r in REPAIRS if r['status'] == 'รอรับเรื่อง']), "#f5576c")
        create_stat_card(stats_frame, "งานซ่อมเสร็จสิ้น", len([r for r in REPAIRS if r['status'] == 'เสร็จสิ้น']), "#56ab2f")
        create_stat_card(stats_frame, "บิลค้างชำระ", len([b for b in BILLS if b['status'] == 'ยังไม่ชำระ']), "#fc466b")

        tk.Label(self.content_area, text="กิจกรรมล่าสุด (จำลอง)", font=("Segoe UI", 16, "bold"), bg="#f8f9fa").pack(pady=20)
        # สามารถเพิ่มตารางกิจกรรมล่าสุดได้ที่นี่ แต่จะซับซ้อนกว่า
        tk.Label(self.content_area, text="ข้อมูลกิจกรรมล่าสุดจะแสดงที่นี่...", bg="#f8f9fa").pack()


    def show_profile_page(self):
        self.clear_content_area()
        tk.Label(self.content_area, text="ข้อมูลส่วนตัว", font=("Segoe UI", 20, "bold"), bg="#f8f9fa").pack(pady=20)

        profile_card = tk.Frame(self.content_area, bg="white", padx=30, pady=30, bd=1, relief="solid")
        profile_card.pack(fill="x", padx=20, pady=10)

        tk.Label(profile_card, text="แก้ไขข้อมูลส่วนตัว", font=("Segoe UI", 16, "bold"), bg="white").pack(anchor="w", pady=(0, 15))

        # แสดงข้อมูลผู้ใช้ปัจจุบัน
        tk.Label(profile_card, text=f"ชื่อ-นามสกุล: {current_user.get('name', '')}", bg="white").pack(anchor="w")
        tk.Label(profile_card, text=f"เบอร์ติดต่อ: {current_user.get('phone', '')}", bg="white").pack(anchor="w")
        tk.Label(profile_card, text=f"อีเมล: {current_user.get('email', '')}", bg="white").pack(anchor="w")
        tk.Label(profile_card, text=f"ที่อยู่: {current_user.get('address', '')}", bg="white").pack(anchor="w")

        tk.Button(profile_card, text="บันทึกข้อมูล (จำลอง)", command=lambda: messagebox.showinfo("บันทึก", "ข้อมูลส่วนตัวถูกบันทึกแล้ว! (จำลอง)"), font=("Segoe UI", 10), bg="#667eea", fg="white").pack(pady=15)

        # Change Password Section
        change_pass_card = tk.Frame(self.content_area, bg="white", padx=30, pady=30, bd=1, relief="solid")
        change_pass_card.pack(fill="x", padx=20, pady=10, mt=20) # mt-20 in CSS

        tk.Label(change_pass_card, text="เปลี่ยนรหัสผ่าน", font=("Segoe UI", 16, "bold"), bg="white").pack(anchor="w", pady=(0, 15))
        tk.Label(change_pass_card, text="รหัสผ่านปัจจุบัน:", bg="white").pack(anchor="w")
        tk.Entry(change_pass_card, show="*", width=40).pack(pady=5)
        tk.Label(change_pass_card, text="รหัสผ่านใหม่:", bg="white").pack(anchor="w")
        tk.Entry(change_pass_card, show="*", width=40).pack(pady=5)
        tk.Label(change_pass_card, text="ยืนยันรหัสผ่านใหม่:", bg="white").pack(anchor="w")
        tk.Entry(change_pass_card, show="*", width=40).pack(pady=5)
        tk.Button(change_pass_card, text="เปลี่ยนรหัสผ่าน (จำลอง)", command=lambda: messagebox.showinfo("เปลี่ยนรหัสผ่าน", "เปลี่ยนรหัสผ่านสำเร็จ! (จำลอง)"), font=("Segoe UI", 10), bg="#667eea", fg="white").pack(pady=15)


    def show_repair_request_page(self):
        self.clear_content_area()
        tk.Label(self.content_area, text="แจ้งซ่อม", font=("Segoe UI", 20, "bold"), bg="#f8f9fa").pack(pady=20)

        repair_form_card = tk.Frame(self.content_area, bg="white", padx=30, pady=30, bd=1, relief="solid")
        repair_form_card.pack(fill="x", padx=20, pady=10)

        tk.Label(repair_form_card, text="แจ้งปัญหาใหม่", font=("Segoe UI", 16, "bold"), bg="white").pack(anchor="w", pady=(0, 15))

        tk.Label(repair_form_card, text="หัวข้อปัญหา:", bg="white").pack(anchor="w")
        repair_title_entry = tk.Entry(repair_form_card, width=50)
        repair_title_entry.pack(pady=5)

        tk.Label(repair_form_card, text="หมวดหมู่:", bg="white").pack(anchor="w")
        repair_category_var = tk.StringVar(repair_form_card)
        repair_category_var.set("เลือกหมวดหมู่")
        repair_category_option = tk.OptionMenu(repair_form_card, repair_category_var, "ไฟฟ้า", "น้ำประปา", "แอร์", "อื่นๆ")
        repair_category_option.pack(pady=5)

        tk.Label(repair_form_card, text="รายละเอียดปัญหา:", bg="white").pack(anchor="w")
        repair_desc_text = tk.Text(repair_form_card, height=4, width=50)
        repair_desc_text.pack(pady=5)

        tk.Button(repair_form_card, text="ส่งคำขอแจ้งซ่อม (จำลอง)", command=lambda: messagebox.showinfo("แจ้งซ่อม", "ส่งคำขอแจ้งซ่อมแล้ว! รอการตอบกลับจากผู้ดูแล (จำลอง)"), font=("Segoe UI", 10), bg="#667eea", fg="white").pack(pady=15)

        # Status Table (simplified)
        tk.Label(self.content_area, text="สถานะงานซ่อมของคุณ", font=("Segoe UI", 16, "bold"), bg="#f8f9fa").pack(pady=20)
        
        # Display repairs for current user (if resident)
        if current_user['role'] == 'resident':
            user_repairs = [r for r in REPAIRS if r['reporter'] == current_user['name']]
            if user_repairs:
                for repair in user_repairs:
                    repair_info = tk.Label(self.content_area, text=f"รหัส: {repair['id']} | หัวข้อ: {repair['title']} | สถานะ: {repair['status']}", bg="#f8f9fa")
                    repair_info.pack(anchor="w", padx=20)
            else:
                tk.Label(self.content_area, text="ไม่มีรายการแจ้งซ่อม", bg="#f8f9fa").pack(padx=20)
        else: # Admin sees all (but this page is for resident)
             tk.Label(self.content_area, text="หน้านี้สำหรับผู้อยู่อาศัย", bg="#f8f9fa").pack(padx=20)


    def show_announcements_page(self):
        self.clear_content_area()
        tk.Label(self.content_area, text="ประกาศ", font=("Segoe UI", 20, "bold"), bg="#f8f9fa").pack(pady=20)

        for ann in ANNOUNCEMENTS:
            ann_card = tk.Frame(self.content_area, bg="white", padx=20, pady=20, bd=1, relief="solid")
            ann_card.pack(fill="x", padx=20, pady=10)
            tk.Label(ann_card, text=ann['title'], font=("Segoe UI", 14, "bold"), bg="white").pack(anchor="w")
            tk.Label(ann_card, text=f"วันที่: {ann['date']}", font=("Segoe UI", 10), fg="#666", bg="white").pack(anchor="w", pady=(0, 10))
            tk.Label(ann_card, text=ann['content'], font=("Segoe UI", 12), bg="white", wraplength=self.content_area.winfo_width() - 80, justify="left").pack(anchor="w")
            # Update wraplength dynamically
            self.content_area.bind("<Configure>", lambda e, l=tk.Label(ann_card): l.config(wraplength=e.width - 80))


    def show_payments_page(self):
        self.clear_content_area()
        tk.Label(self.content_area, text="ชำระเงิน", font=("Segoe UI", 20, "bold"), bg="#f8f9fa").pack(pady=20)

        tk.Label(self.content_area, text="บิลค้างชำระ", font=("Segoe UI", 16, "bold"), bg="#f8f9fa").pack(pady=10)
        unpaid_bills = [b for b in BILLS if b['status'] == 'ยังไม่ชำระ']
        if unpaid_bills:
            for bill in unpaid_bills:
                bill_info = tk.Label(self.content_area, text=f"รหัส: {bill['id']} | รายการ: {bill['item']} | จำนวนเงิน: ${bill['amount']:.2f} | กำหนดชำระ: {bill['due_date']}", bg="#f8f9fa")
                bill_info.pack(anchor="w", padx=20)
                tk.Button(self.content_area, text="ชำระเงิน (จำลอง)", command=lambda b=bill: messagebox.showinfo("ชำระเงิน", f"ยืนยันการชำระเงินสำหรับบิล {b['id']} (จำลอง)"), font=("Segoe UI", 8), bg="#28a745", fg="white").pack(anchor="w", padx=20, pady=2)
        else:
            tk.Label(self.content_area, text="ไม่มีบิลค้างชำระ", bg="#f8f9fa").pack(padx=20)

        tk.Label(self.content_area, text="ประวัติการชำระเงิน", font=("Segoe UI", 16, "bold"), bg="#f8f9fa").pack(pady=20)
        paid_bills = [b for b in BILLS if b['status'] == 'ชำระแล้ว']
        if paid_bills:
            for bill in paid_bills:
                bill_info = tk.Label(self.content_area, text=f"รหัส: {bill['id']} | รายการ: {bill['item']} | จำนวนเงิน: ${bill['amount']:.2f} | วันที่ชำระ: {bill['due_date']}", bg="#f8f9fa")
                bill_info.pack(anchor="w", padx=20)
        else:
            tk.Label(self.content_area, text="ไม่มีประวัติการชำระเงิน", bg="#f8f9fa").pack(padx=20)


    def show_booking_page(self):
        self.clear_content_area()
        tk.Label(self.content_area, text="จองพื้นที่", font=("Segoe UI", 20, "bold"), bg="#f8f9fa").pack(pady=20)

        booking_form_card = tk.Frame(self.content_area, bg="white", padx=30, pady=30, bd=1, relief="solid")
        booking_form_card.pack(fill="x", padx=20, pady=10)

        tk.Label(booking_form_card, text="จองพื้นที่ใหม่", font=("Segoe UI", 16, "bold"), bg="white").pack(anchor="w", pady=(0, 15))

        tk.Label(booking_form_card, text="พื้นที่ที่ต้องการจอง:", bg="white").pack(anchor="w")
        booking_area_var = tk.StringVar(booking_form_card)
        booking_area_var.set("เลือกพื้นที่")
        booking_area_option = tk.OptionMenu(booking_form_card, booking_area_var, "สระว่ายน้ำ", "ห้องฟิตเนส", "ห้องประชุม", "สนามเด็กเล่น")
        booking_area_option.pack(pady=5)

        tk.Label(booking_form_card, text="วันที่ต้องการจอง (YYYY-MM-DD):", bg="white").pack(anchor="w")
        booking_date_entry = tk.Entry(booking_form_card, width=30)
        booking_date_entry.pack(pady=5)

        tk.Label(booking_form_card, text="ช่วงเวลา:", bg="white").pack(anchor="w")
        booking_time_var = tk.StringVar(booking_form_card)
        booking_time_var.set("เลือกช่วงเวลา")
        booking_time_option = tk.OptionMenu(booking_form_card, booking_time_var, "09:00-12:00", "13:00-16:00", "17:00-20:00")
        booking_time_option.pack(pady=5)

        tk.Label(booking_form_card, text="วัตถุประสงค์การใช้งาน:", bg="white").pack(anchor="w")
        booking_purpose_text = tk.Text(booking_form_card, height=3, width=50)
        booking_purpose_text.pack(pady=5)

        tk.Button(booking_form_card, text="ส่งคำขอจอง (จำลอง)", command=lambda: messagebox.showinfo("จองพื้นที่", "ส่งคำขอจองพื้นที่สำเร็จ! โปรดรอการอนุมัติ (จำลอง)"), font=("Segoe UI", 10), bg="#667eea", fg="white").pack(pady=15)

        # Status Table (simplified)
        tk.Label(self.content_area, text="สถานะการจองของคุณ", font=("Segoe UI", 16, "bold"), bg="#f8f9fa").pack(pady=20)
        if BOOKINGS:
            for booking in BOOKINGS:
                booking_info = tk.Label(self.content_area, text=f"รหัส: {booking['id']} | พื้นที่: {booking['area']} | วันที่: {booking['date']} | สถานะ: {booking['status']}", bg="#f8f9fa")
                booking_info.pack(anchor="w", padx=20)
        else:
            tk.Label(self.content_area, text="ไม่มีรายการจอง", bg="#f8f9fa").pack(padx=20)


    def show_manage_users_page(self):
        self.clear_content_area()
        tk.Label(self.content_area, text="จัดการผู้ใช้", font=("Segoe UI", 20, "bold"), bg="#f8f9fa").pack(pady=20)

        user_list_card = tk.Frame(self.content_area, bg="white", padx=30, pady=30, bd=1, relief="solid")
        user_list_card.pack(fill="x", padx=20, pady=10)

        tk.Label(user_list_card, text="รายชื่อผู้ใช้งาน", font=("Segoe UI", 16, "bold"), bg="white").pack(anchor="w", pady=(0, 15))

        # Display users
        if USERS:
            for username, user_data in USERS.items():
                user_info = tk.Label(user_list_card, text=f"ชื่อผู้ใช้: {username} | ชื่อ: {user_data['name']} | บทบาท: {user_data['role'].capitalize()}", bg="white")
                user_info.pack(anchor="w", padx=10)
                # Add dummy action buttons
                tk.Button(user_list_card, text="แก้ไข (จำลอง)", command=lambda u=username: messagebox.showinfo("จัดการผู้ใช้", f"แก้ไขผู้ใช้ {u} (จำลอง)"), font=("Segoe UI", 8), bg="#ffc107", fg="black").pack(anchor="w", padx=10, pady=2)
                tk.Button(user_list_card, text="ลบ (จำลอง)", command=lambda u=username: messagebox.showinfo("จัดการผู้ใช้", f"ลบผู้ใช้ {u} (จำลอง)"), font=("Segoe UI", 8), bg="#dc3545", fg="white").pack(anchor="w", padx=10, pady=2)
                tk.Frame(user_list_card, height=1, bg="#eee").pack(fill="x", pady=5) # Separator
        else:
            tk.Label(user_list_card, text="ไม่มีผู้ใช้งานในระบบ", bg="white").pack(padx=10)


    def show_manage_repairs_page(self):
        self.clear_content_area()
        tk.Label(self.content_area, text="จัดการแจ้งซ่อม", font=("Segoe UI", 20, "bold"), bg="#f8f9fa").pack(pady=20)

        repair_list_card = tk.Frame(self.content_area, bg="white", padx=30, pady=30, bd=1, relief="solid")
        repair_list_card.pack(fill="x", padx=20, pady=10)

        tk.Label(repair_list_card, text="รายการแจ้งซ่อมทั้งหมด", font=("Segoe UI", 16, "bold"), bg="white").pack(anchor="w", pady=(0, 15))

        if REPAIRS:
            for repair in REPAIRS:
                repair_info = tk.Label(repair_list_card, text=f"รหัส: {repair['id']} | หัวข้อ: {repair['title']} | ผู้แจ้ง: {repair['reporter']} | สถานะ: {repair['status']}", bg="white")
                repair_info.pack(anchor="w", padx=10)
                # Add dummy action buttons
                tk.Button(repair_list_card, text="รับเรื่อง (จำลอง)", command=lambda r=repair['id']: messagebox.showinfo("จัดการแจ้งซ่อม", f"รับเรื่องซ่อม {r} (จำลอง)"), font=("Segoe UI", 8), bg="#007bff", fg="white").pack(anchor="w", padx=10, pady=2)
                tk.Button(repair_list_card, text="เสร็จสิ้น (จำลอง)", command=lambda r=repair['id']: messagebox.showinfo("จัดการแจ้งซ่อม", f"ทำเครื่องหมายว่าเสร็จสิ้น {r} (จำลอง)"), font=("Segoe UI", 8), bg="#28a745", fg="white").pack(anchor="w", padx=10, pady=2)
                tk.Frame(repair_list_card, height=1, bg="#eee").pack(fill="x", pady=5) # Separator
        else:
            tk.Label(repair_list_card, text="ไม่มีรายการแจ้งซ่อม", bg="white").pack(padx=10)


    def show_reports_page(self):
        self.clear_content_area()
        tk.Label(self.content_area, text="รายงาน", font=("Segoe UI", 20, "bold"), bg="#f8f9fa").pack(pady=20)

        report_card = tk.Frame(self.content_area, bg="white", padx=30, pady=30, bd=1, relief="solid")
        report_card.pack(fill="x", padx=20, pady=10)

        tk.Label(report_card, text="รายงานภาพรวม", font=("Segoe UI", 16, "bold"), bg="white").pack(anchor="w", pady=(0, 15))

        tk.Label(report_card, text="ประเภทรายงาน:", bg="white").pack(anchor="w")
        report_type_var = tk.StringVar(report_card)
        report_type_var.set("repair")
        report_type_option = tk.OptionMenu(report_card, report_type_var, "repair", "payment", "user")
        report_type_option.pack(pady=5)

        tk.Label(report_card, text="ช่วงเวลา:", bg="white").pack(anchor="w")
        report_period_var = tk.StringVar(report_card)
        report_period_var.set("monthly")
        report_period_option = tk.OptionMenu(report_card, report_period_var, "monthly", "quarterly", "yearly")
        report_period_option.pack(pady=5)

        tk.Button(report_card, text="สร้างรายงาน (จำลอง)", command=lambda: messagebox.showinfo("สร้างรายงาน", f"รายงานประเภท {report_type_var.get()} สำหรับช่วงเวลา {report_period_var.get()} ถูกสร้างขึ้นแล้ว (จำลอง)"), font=("Segoe UI", 10), bg="#667eea", fg="white").pack(pady=15)

# --- รันแอปพลิเคชัน ---
if __name__ == "__main__":
    root = tk.Tk()
    app = SmartVillageApp(root)
    root.mainloop()
