import os
import uuid
from datetime import datetime, date, timedelta
import json

from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

# --- Configuration ---
DATABASE_FILE = 'smart_village.db'
UPLOAD_FOLDER = 'static/uploads'

app = Flask(__name__, static_folder='static')
CORS(app) # Enable CORS for all routes

app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DATABASE_FILE}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the upload folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading') # Use threading for simplicity

# --- Models ---
class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20))
    address = db.Column(db.String(255))
    role = db.Column(db.String(20), default='resident') # 'resident', 'admin'
    status = db.Column(db.String(20), default='pending') # 'pending', 'approved', 'suspended'
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships (defined here for backref, actual relationships are in other models)
    # announcements = db.relationship('Announcement', backref='author', lazy=True)
    # repair_requests = db.relationship('RepairRequest', backref='requester', lazy=True)
    # booking_requests = db.relationship('BookingRequest', backref='booker', lazy=True)
    # payments = db.relationship('Payment', backref='payer', lazy=True)
    # documents = db.relationship('Document', backref='uploader', lazy=True)
    # security_visitors = db.relationship('SecurityVisitor', backref='host_user', lazy=True)
    # security_incidents = db.relationship('SecurityIncident', backref='reporter', lazy=True)
    # voting_polls = db.relationship('VotingPoll', backref='creator', lazy=True)
    # bills_issued = db.relationship('Bill', backref='issuer', lazy=True)

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'name': self.name,
            'username': self.username,
            'phone': self.phone,
            'address': self.address,
            'role': self.role,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Announcement(db.Model):
    __tablename__ = 'announcements'
    announcement_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    published_date = db.Column(db.DateTime, default=datetime.now)
    author_id = db.Column(db.String(36), db.ForeignKey('users.user_id'))
    tag = db.Column(db.String(50)) # e.g., 'สำคัญ', 'กิจกรรม', 'แจ้งเตือน'
    tag_color = db.Column(db.String(20)) # e.g., '#667eea'
    tag_bg = db.Column(db.String(20)) # e.g., '#e3f2fd'

    author = db.relationship('User', backref='announcements_authored') # Define relationship here

    def to_dict(self):
        return {
            'announcement_id': self.announcement_id,
            'title': self.title,
            'content': self.content,
            'published_date': self.published_date.isoformat(),
            'author_id': self.author_id,
            'author_name': self.author.name if self.author else None,
            'tag': self.tag,
            'tag_color': self.tag_color,
            'tag_bg': self.tag_bg
        }

class RepairRequest(db.Model):
    __tablename__ = 'repair_requests'
    request_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100)) # e.g., 'ไฟฟ้า', 'น้ำประปา', 'แอร์'
    description = db.Column(db.Text)
    submitted_date = db.Column(db.DateTime, default=datetime.now)
    status = db.Column(db.String(50), default='pending') # 'pending', 'in_progress', 'completed', 'rejected'
    image_paths = db.Column(db.Text) # JSON string of image file paths

    requester = db.relationship('User', backref='repair_requests_made') # Define relationship here

    def to_dict(self):
        return {
            'request_id': self.request_id,
            'user_id': self.user_id,
            'user_name': self.requester.name if self.requester else None,
            'title': self.title,
            'category': self.category,
            'description': self.description,
            'submitted_date': self.submitted_date.isoformat(),
            'status': self.status,
            'image_paths': self.image_paths
        }

class BookingRequest(db.Model):
    __tablename__ = 'booking_requests'
    booking_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id'), nullable=False)
    location = db.Column(db.String(100), nullable=False) # e.g., 'สนามกีฬา', 'คลับเฮ้าส์'
    date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.String(10), nullable=False) # HH:MM
    end_time = db.Column(db.String(10), nullable=False) # HH:MM
    purpose = db.Column(db.Text)
    attendee_count = db.Column(db.Integer)
    status = db.Column(db.String(50), default='pending') # 'pending', 'approved', 'rejected'
    requested_at = db.Column(db.DateTime, default=datetime.now)

    booker = db.relationship('User', backref='booking_requests_made') # Define relationship here

    def to_dict(self):
        return {
            'booking_id': self.booking_id,
            'user_id': self.user_id,
            'user_name': self.booker.name if self.booker else None,
            'location': self.location,
            'date': self.date.isoformat(),
            'start_time': self.start_time,
            'end_time': self.end_time,
            'purpose': self.purpose,
            'attendee_count': self.attendee_count,
            'status': self.status,
            'requested_at': self.requested_at.isoformat()
        }

class Bill(db.Model):
    __tablename__ = 'bills'
    bill_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    item_name = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    recipient_id = db.Column(db.String(36), nullable=False) # 'all' or user_id
    issued_by_user_id = db.Column(db.String(36), db.ForeignKey('users.user_id'))
    issued_date = db.Column(db.DateTime, default=datetime.now)
    status = db.Column(db.String(50), default='unpaid') # 'unpaid', 'paid', 'pending_verification'

    issuer = db.relationship('User', backref='bills_issued_by_me') # Define relationship here
    # Relationship to Payment is defined in Payment model

    def to_dict(self):
        return {
            'bill_id': self.bill_id,
            'item_name': self.item_name,
            'amount': self.amount,
            'due_date': self.due_date.isoformat(),
            'recipient_id': self.recipient_id,
            'issued_by_user_id': self.issued_by_user_id,
            'issued_by_user_name': self.issuer.name if self.issuer else None,
            'issued_date': self.issued_date.isoformat(),
            'status': self.status
        }

class Payment(db.Model):
    __tablename__ = 'payments'
    payment_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    bill_id = db.Column(db.String(36), db.ForeignKey('bills.bill_id'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.DateTime, default=datetime.now)
    payment_method = db.Column(db.String(50)) # 'bank_transfer', 'credit_card', 'promptpay'
    status = db.Column(db.String(50), default='pending') # 'pending', 'paid', 'failed'
    slip_path = db.Column(db.String(255)) # Path to uploaded slip image

    bill = db.relationship('Bill', backref='payments_for_bill') # Define relationship here
    payer = db.relationship('User', backref='payments_made') # Define relationship here

    def to_dict(self):
        return {
            'payment_id': self.payment_id,
            'bill_id': self.bill_id,
            'item_name': self.bill.item_name if self.bill else None,
            'user_id': self.user_id,
            'user_name': self.payer.name if self.payer else None,
            'amount': self.amount,
            'payment_date': self.payment_date.isoformat(),
            'payment_method': self.payment_method,
            'status': self.status,
            'slip_path': self.slip_path
        }

class Document(db.Model):
    __tablename__ = 'documents'
    document_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    uploaded_by_user_id = db.Column(db.String(36), db.ForeignKey('users.user_id'))
    upload_date = db.Column(db.DateTime, default=datetime.now)
    category = db.Column(db.String(100)) # 'personal', 'contract', 'receipt', 'public'
    file_size = db.Column(db.String(50)) # e.g., '2.5 MB'

    uploader = db.relationship('User', backref='documents_uploaded') # Define relationship here

    def to_dict(self):
        return {
            'document_id': self.document_id,
            'document_name': self.document_name,
            'file_path': self.file_path,
            'uploaded_by_user_id': self.uploaded_by_user_id,
            'uploaded_by_user_name': self.uploader.name if self.uploader else None,
            'upload_date': self.upload_date.isoformat(),
            'category': self.category,
            'file_size': self.file_size
        }

class SecurityVisitor(db.Model):
    __tablename__ = 'security_visitors'
    visitor_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id'), nullable=False) # The resident who registered the visitor
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    visit_date = db.Column(db.Date, nullable=False)
    visit_time = db.Column(db.String(10)) # HH:MM
    purpose = db.Column(db.Text)
    registered_at = db.Column(db.DateTime, default=datetime.now)

    host_user = db.relationship('User', backref='visitors_registered') # Define relationship here

    def to_dict(self):
        return {
            'visitor_id': self.visitor_id,
            'user_id': self.user_id,
            'user_name': self.host_user.name if self.host_user else None,
            'name': self.name,
            'phone': self.phone,
            'visit_date': self.visit_date.isoformat(),
            'visit_time': self.visit_time,
            'purpose': self.purpose,
            'registered_at': self.registered_at.isoformat()
        }

class SecurityIncident(db.Model):
    __tablename__ = 'security_incidents'
    incident_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id'), nullable=False) # The resident who reported the incident
    description = db.Column(db.Text, nullable=False)
    reported_date = db.Column(db.DateTime, default=datetime.now)
    evidence_paths = db.Column(db.Text) # JSON string of file paths (images/videos)
    status = db.Column(db.String(50), default='reported') # 'reported', 'investigating', 'resolved'

    reporter = db.relationship('User', backref='incidents_reported') # Define relationship here

    def to_dict(self):
        return {
            'incident_id': self.incident_id,
            'user_id': self.user_id,
            'user_name': self.reporter.name if self.reporter else None,
            'description': self.description,
            'reported_date': self.reported_date.isoformat(),
            'evidence_paths': self.evidence_paths,
            'status': self.status
        }

class VotingPoll(db.Model):
    __tablename__ = 'voting_polls'
    poll_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    start_date = db.Column(db.DateTime, default=datetime.now)
    end_date = db.Column(db.DateTime, nullable=False)
    created_by_user_id = db.Column(db.String(36), db.ForeignKey('users.user_id'))
    created_at = db.Column(db.DateTime, default=datetime.now)

    creator = db.relationship('User', backref='polls_created') # Define relationship here
    options = db.relationship('VotingOption', backref='poll', lazy=True, cascade="all, delete-orphan")
    results = db.relationship('VotingResult', backref='poll', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        total_votes = sum(option.vote_count for option in self.options)
        return {
            'poll_id': self.poll_id,
            'title': self.title,
            'description': self.description,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'created_by_user_id': self.created_by_user_id,
            'created_by_user_name': self.creator.name if self.creator else None,
            'created_at': self.created_at.isoformat(),
            'options': [option.to_dict() for option in self.options],
            'total_votes': total_votes
        }

class VotingOption(db.Model):
    __tablename__ = 'voting_options'
    option_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    poll_id = db.Column(db.String(36), db.ForeignKey('voting_polls.poll_id'), nullable=False)
    option_text = db.Column(db.String(255), nullable=False)
    vote_count = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            'option_id': self.option_id,
            'poll_id': self.poll_id,
            'option_text': self.option_text,
            'vote_count': self.vote_count
        }

class VotingResult(db.Model):
    __tablename__ = 'voting_results'
    result_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    poll_id = db.Column(db.String(36), db.ForeignKey('voting_polls.poll_id'), nullable=False)
    option_id = db.Column(db.String(36), db.ForeignKey('voting_options.option_id'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id'), nullable=False)
    voted_at = db.Column(db.DateTime, default=datetime.now)

    # Ensure a user can only vote once per poll
    __table_args__ = (db.UniqueConstraint('poll_id', 'user_id', name='_user_poll_uc'),)

    def to_dict(self):
        return {
            'result_id': self.result_id,
            'poll_id': self.poll_id,
            'option_id': self.option_id,
            'user_id': self.user_id,
            'voted_at': self.voted_at.isoformat()
        }

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    message_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id = db.Column(db.String(36), db.ForeignKey('users.user_id'), nullable=False)
    room_name = db.Column(db.String(100), nullable=False) # e.g., 'general_chat', 'admins', 'user_id_to_user_id'
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.now)

    sender = db.relationship('User', backref='sent_messages') # Define relationship here

    def to_dict(self):
        return {
            'message_id': self.message_id,
            'sender_id': self.sender_id,
            'sender_name': self.sender.name if self.sender else None,
            'sender_avatar': self.sender.name[0].upper() if self.sender and self.sender.name else 'U',
            'room_name': self.room_name,
            'content': self.content,
            'timestamp': self.timestamp.isoformat()
        }

class CalendarEvent(db.Model):
    __tablename__ = 'calendar_events'
    event_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_name = db.Column(db.String(255), nullable=False)
    event_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.String(10)) # HH:MM
    end_time = db.Column(db.String(10)) # HH:MM
    location = db.Column(db.String(255))
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            'event_id': self.event_id,
            'event_name': self.event_name,
            'event_date': self.event_date.isoformat(),
            'start_time': self.start_time,
            'end_time': self.end_time,
            'location': self.location,
            'description': self.description,
            'created_at': self.created_at.isoformat()
        }

# --- Database Initialization and Population ---
def populate_initial_data():
    """Populates the database with some initial data."""
    print("Database is empty. Populating with initial data...")
    try:
        # Create a default admin user
        admin_user = User(
            user_id=str(uuid.uuid4()),
            name='Admin User',
            username='admin',
            password_hash=generate_password_hash('admin123'),
            phone='0987654321',
            address='Admin House 1',
            role='admin',
            status='approved'
        )
        db.session.add(admin_user)

        # Create a default resident user
        resident_user = User(
            user_id=str(uuid.uuid4()),
            name='Resident User',
            username='resident',
            password_hash=generate_password_hash('resident123'),
            phone='0812345678',
            address='House A-101',
            role='resident',
            status='approved'
        )
        db.session.add(resident_user)

        # Create a pending resident user
        pending_user = User(
            user_id=str(uuid.uuid4()),
            name='Pending User',
            username='pending',
            password_hash=generate_password_hash('pending123'),
            phone='0801112222',
            address='House B-202',
            role='resident',
            status='pending'
        )
        db.session.add(pending_user)

        db.session.flush() # Ensure user IDs are available for foreign keys

        # Announcements
        announcement1 = Announcement(
            announcement_id=str(uuid.uuid4()),
            title='ประชุมคณะกรรมการประจำเดือน',
            content='เรียนเชิญสมาชิกทุกท่านเข้าร่วมประชุมคณะกรรมการประจำเดือน พฤศจิกายน 2567 ในวันที่ 15 พฤศจิกายน 2567 เวลา 19:00 น. ณ ห้องประชุมอาคาร A',
            published_date=datetime.now() - timedelta(days=5),
            author_id=admin_user.user_id,
            tag='สำคัญ',
            tag_color='#1976d2',
            tag_bg='#e3f2fd'
        )
        announcement2 = Announcement(
            announcement_id=str(uuid.uuid4()),
            title='กิจกรรมทำความสะอาดหมู่บ้าน',
            content='ขอเชิญชวนสมาชิกทุกครอบครัวร่วมกิจกรรมทำความสะอาดหมู่บ้าน ในวันเสาร์ที่ 18 พฤศจิกายน 2567 เวลา 08:00-12:00 น. จุดนัดพบ: ลานจอดรถกลาง',
            published_date=datetime.now() - timedelta(days=7),
            author_id=admin_user.user_id,
            tag='กิจกรรม',
            tag_color='#2e7d32',
            tag_bg='#e8f5e8'
        )
        db.session.add_all([announcement1, announcement2])

        # Repair Requests
        repair1 = RepairRequest(
            request_id=str(uuid.uuid4()),
            user_id=resident_user.user_id,
            title='ไฟทางเดินเสีย',
            category='ไฟฟ้า',
            description='ไฟทางเดินหน้าบ้านเลขที่ A-101 เสีย ไม่ติดมา 2 วันแล้ว',
            submitted_date=datetime.now() - timedelta(days=3),
            status='pending'
        )
        repair2 = RepairRequest(
            request_id=str(uuid.uuid4()),
            user_id=resident_user.user_id,
            title='น้ำรั่วซึม',
            category='น้ำประปา',
            description='ท่อน้ำประปาหน้าบ้านเลขที่ A-101 มีน้ำรั่วซึมเล็กน้อย',
            submitted_date=datetime.now() - timedelta(days=7),
            status='in_progress'
        )
        db.session.add_all([repair1, repair2])

        # Booking Requests
        booking1 = BookingRequest(
            booking_id=str(uuid.uuid4()),
            user_id=resident_user.user_id,
            location='สนามกีฬา',
            date=datetime.now().date() + timedelta(days=5),
            start_time='14:00',
            end_time='16:00',
            purpose='เล่นฟุตบอล',
            attendee_count=10,
            status='approved'
        )
        booking2 = BookingRequest(
            booking_id=str(uuid.uuid4()),
            user_id=resident_user.user_id,
            location='คลับเฮ้าส์',
            date=datetime.now().date() + timedelta(days=12),
            start_time='18:00',
            end_time='22:00',
            purpose='จัดงานวันเกิด',
            attendee_count=25,
            status='pending'
        )
        db.session.add_all([booking1, booking2])

        # Bills
        bill1 = Bill(
            bill_id=str(uuid.uuid4()),
            item_name='ค่าส่วนกลาง เดือน พ.ย. 67',
            amount=1500.00,
            due_date=datetime.now().date() + timedelta(days=30),
            recipient_id='all',
            issued_by_user_id=admin_user.user_id,
            status='unpaid'
        )
        bill2 = Bill(
            bill_id=str(uuid.uuid4()),
            item_name='ค่าจอดรถเพิ่มเติม',
            amount=300.00,
            due_date=datetime.now().date() + timedelta(days=15),
            recipient_id=resident_user.user_id,
            issued_by_user_id=admin_user.user_id,
            status='unpaid'
        )
        bill3 = Bill(
            bill_id=str(uuid.uuid4()),
            item_name='ค่าส่วนกลาง เดือน ต.ค. 67',
            amount=1500.00,
            due_date=datetime.now().date() - timedelta(days=10),
            recipient_id='all',
            issued_by_user_id=admin_user.user_id,
            status='paid'
        )
        db.session.add_all([bill1, bill2, bill3])
        db.session.flush() # Ensure bill IDs are available

        # Payments (for bill3)
        payment1 = Payment(
            payment_id=str(uuid.uuid4()),
            bill_id=bill3.bill_id,
            user_id=resident_user.user_id,
            amount=1500.00,
            payment_date=datetime.now() - timedelta(days=15),
            payment_method='bank_transfer',
            status='paid',
            slip_path='slip_oct_resident.jpg'
        )
        db.session.add(payment1)

        # Documents
        doc1 = Document(
            document_id=str(uuid.uuid4()),
            document_name='สำเนาบัตรประชาชน',
            file_path='id_card_resident.pdf',
            uploaded_by_user_id=resident_user.user_id,
            upload_date=datetime.now() - timedelta(days=20),
            category='personal',
            file_size='2.5 MB'
        )
        doc2 = Document(
            document_id=str(uuid.uuid4()),
            document_name='ใบเสร็จค่าส่วนกลาง ต.ค. 67',
            file_path='receipt_oct_resident.pdf',
            uploaded_by_user_id=resident_user.user_id,
            upload_date=datetime.now() - timedelta(days=15),
            category='receipt',
            file_size='1.2 MB'
        )
        db.session.add_all([doc1, doc2])

        # Security Visitors
        visitor1 = SecurityVisitor(
            visitor_id=str(uuid.uuid4()),
            user_id=resident_user.user_id,
            name='สมศักดิ์ มาดี',
            phone='0901234567',
            visit_date=datetime.now().date() + timedelta(days=1),
            visit_time='10:00',
            purpose='มาเยี่ยมญาติ'
        )
        db.session.add(visitor1)

        # Security Incidents
        incident1 = SecurityIncident(
            incident_id=str(uuid.uuid4()),
            user_id=resident_user.user_id,
            description='ประเภท: เสียงรบกวน, สถานที่: บ้านเลขที่ A-102, รายละเอียด: มีเสียงดังจากการก่อสร้างนอกเวลาที่กำหนด',
            reported_date=datetime.now() - timedelta(days=2),
            evidence_paths=json.dumps(["noise_incident.mp4"])
        )
        db.session.add(incident1)

        # Voting Polls
        poll1 = VotingPoll(
            poll_id=str(uuid.uuid4()),
            title='เลือกสีทาสนามเด็กเล่นใหม่',
            description='โปรดเลือกสีที่คุณต้องการสำหรับสนามเด็กเล่นใหม่',
            start_date=datetime.now() - timedelta(days=10),
            end_date=datetime.now() + timedelta(days=10),
            created_by_user_id=admin_user.user_id
        )
        db.session.add(poll1)
        db.session.flush() # Ensure poll1.poll_id is available

        option1_1 = VotingOption(option_id=str(uuid.uuid4()), poll_id=poll1.poll_id, option_text='สีน้ำเงิน', vote_count=12)
        option1_2 = VotingOption(option_id=str(uuid.uuid4()), poll_id=poll1.poll_id, option_text='สีเขียว', vote_count=18)
        option1_3 = VotingOption(option_id=str(uuid.uuid4()), poll_id=poll1.poll_id, option_text='สีเหลือง', vote_count=8)
        db.session.add_all([option1_1, option1_2, option1_3])

        poll2 = VotingPoll(
            poll_id=str(uuid.uuid4()),
            title='งบประมาณปรับปรุงสระว่ายน้ำ',
            description='เห็นด้วยกับการใช้งบประมาณ 500,000 บาทในการปรับปรุงสระว่ายน้ำหรือไม่',
            start_date=datetime.now() - timedelta(days=5),
            end_date=datetime.now() + timedelta(days=20),
            created_by_user_id=admin_user.user_id
        )
        db.session.add(poll2)
        db.session.flush()

        option2_1 = VotingOption(option_id=str(uuid.uuid4()), poll_id=poll2.poll_id, option_text='เห็นด้วย (งบประมาณ 500,000 บาท)', vote_count=25)
        option2_2 = VotingOption(option_id=str(uuid.uuid4()), poll_id=poll2.poll_id, option_text='ไม่เห็นด้วย', vote_count=8)
        db.session.add_all([option2_1, option2_2])

        # Calendar Events
        event1 = CalendarEvent(
            event_id=str(uuid.uuid4()),
            event_name='ประชุมคณะกรรมการ',
            event_date=datetime.now().date() + timedelta(days=10),
            start_time='19:00',
            end_time='21:00',
            location='ห้องประชุมอาคาร A',
            description='ประชุมประจำเดือนของคณะกรรมการหมู่บ้าน'
        )
        event2 = CalendarEvent(
            event_id=str(uuid.uuid4()),
            event_name='ทำความสะอาดหมู่บ้าน',
            event_date=datetime.now().date() + timedelta(days=13),
            start_time='08:00',
            end_time='12:00',
            location='ลานจอดรถกลาง',
            description='กิจกรรมทำความสะอาดหมู่บ้านประจำปี'
        )
        event3 = CalendarEvent(
            event_id=str(uuid.uuid4()),
            event_name='งานเลี้ยงสังสรรค์ปีใหม่',
            event_date=date(datetime.now().year + 1, 1, 1), # Next New Year
            start_time='18:00',
            end_time='23:59',
            location='คลับเฮ้าส์',
            description='งานเลี้ยงฉลองปีใหม่ของหมู่บ้าน'
        )
        db.session.add_all([event1, event2, event3])

        db.session.commit()
        print("Initial data populated successfully.")
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Error populating initial data: {e}")
    except Exception as e:
        db.session.rollback()
        print(f"An unexpected error occurred during data population: {e}")

# --- Routes ---

# Home Route
@app.route('/')
def home():
    return "Smart Village Backend is running!"

# File Uploads Route
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# --- Auth Routes ---
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Username and password are required'}), 400

    user = User.query.filter_by(username=username).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'message': 'Invalid credentials'}), 401

    if user.status != 'approved':
        return jsonify({'message': f'Your account is {user.status}. Please contact admin.'}), 403

    return jsonify({
        'message': 'Login successful',
        'user_id': user.user_id,
        'name': user.name,
        'username': user.username,
        'role': user.role
    }), 200

# --- User Routes ---
@app.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    name = data.get('name')
    username = data.get('username')
    password = data.get('password')
    phone = data.get('phone')
    address = data.get('address')
    role = data.get('role', 'resident') # Default to resident
    status = data.get('status', 'pending') # Default to pending for new registrations

    if not name or not username or not password:
        return jsonify({'message': 'Name, username, and password are required'}), 400

    hashed_password = generate_password_hash(password)

    new_user = User(
        name=name,
        username=username,
        password_hash=hashed_password,
        phone=phone,
        address=address,
        role=role,
        status=status
    )
    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'message': 'User created successfully', 'user': new_user.to_dict()}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({'message': 'Username already exists'}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error creating user: {str(e)}'}), 500

@app.route('/users', methods=['GET'])
def get_all_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users]), 200

@app.route('/users/<user_id>', methods=['GET'])
def get_user():
    user_id = request.view_args['user_id']
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    return jsonify(user.to_dict()), 200

@app.route('/users/<user_id>', methods=['PUT'])
def update_user():
    user_id = request.view_args['user_id']
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    data = request.get_json()
    
    if 'password' in data and data['password']:
        if 'current_password' in data:
            current_password = data.get('current_password')
            if not check_password_hash(user.password_hash, current_password):
                return jsonify({'message': 'Incorrect current password'}), 401
        
        user.password_hash = generate_password_hash(data['password'])
        
    user.name = data.get('name', user.name)
    user.username = data.get('username', user.username)
    user.phone = data.get('phone', user.phone)
    user.address = data.get('address', user.address)
    user.role = data.get('role', user.role)
    user.status = data.get('status', user.status)

    try:
        db.session.commit()
        return jsonify({'message': 'User updated successfully', 'user': user.to_dict()}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({'message': 'Username already exists'}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error updating user: {str(e)}'}), 500

@app.route('/users/<user_id>', methods=['DELETE'])
def delete_user():
    user_id = request.view_args['user_id']
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error deleting user: {str(e)}'}), 500

# --- Announcement Routes ---
@app.route('/announcements', methods=['POST'])
def create_announcement():
    data = request.get_json()
    title = data.get('title')
    content = data.get('content')
    published_date_str = data.get('published_date')
    author_id = data.get('author_id')
    tag = data.get('tag')

    if not title or not content or not author_id:
        return jsonify({'message': 'Title, content, and author_id are required'}), 400

    try:
        published_date = datetime.fromisoformat(published_date_str) if published_date_str else datetime.now()
    except ValueError:
        return jsonify({'message': 'Invalid date format for published_date. Use YYYY-MM-DD.'}), 400

    tag_color = None
    tag_bg = None
    if tag == 'สำคัญ':
        tag_color = '#1976d2'
        tag_bg = '#e3f2fd'
    elif tag == 'กิจกรรม':
        tag_color = '#2e7d32'
        tag_bg = '#e8f5e8'
    elif tag == 'แจ้งเตือน':
        tag_color = '#856404'
        tag_bg = '#fff3cd'

    new_announcement = Announcement(
        title=title,
        content=content,
        published_date=published_date,
        author_id=author_id,
        tag=tag,
        tag_color=tag_color,
        tag_bg=tag_bg
    )
    db.session.add(new_announcement)
    db.session.commit()
    socketio.emit('new_announcement', new_announcement.to_dict()) # Emit to all clients
    return jsonify({'message': 'Announcement created successfully', 'announcement': new_announcement.to_dict()}), 201

@app.route('/announcements', methods=['GET'])
def get_all_announcements():
    announcements = Announcement.query.order_by(Announcement.published_date.desc()).all()
    return jsonify([announcement.to_dict() for announcement in announcements]), 200

@app.route('/announcements/<announcement_id>', methods=['GET'])
def get_announcement():
    announcement_id = request.view_args['announcement_id']
    announcement = Announcement.query.get(announcement_id)
    if not announcement:
        return jsonify({'message': 'Announcement not found'}), 404
    return jsonify(announcement.to_dict()), 200

@app.route('/announcements/<announcement_id>', methods=['PUT'])
def update_announcement():
    announcement_id = request.view_args['announcement_id']
    announcement = Announcement.query.get(announcement_id)
    if not announcement:
        return jsonify({'message': 'Announcement not found'}), 404

    data = request.get_json()
    announcement.title = data.get('title', announcement.title)
    announcement.content = data.get('content', announcement.content)
    
    published_date_str = data.get('published_date')
    if published_date_str:
        try:
            announcement.published_date = datetime.fromisoformat(published_date_str)
        except ValueError:
            return jsonify({'message': 'Invalid date format for published_date. Use YYYY-MM-DD.'}), 400
            
    announcement.tag = data.get('tag', announcement.tag)

    if announcement.tag == 'สำคัญ':
        announcement.tag_color = '#1976d2'
        announcement.tag_bg = '#e3f2fd'
    elif announcement.tag == 'กิจกรรม':
        announcement.tag_color = '#2e7d32'
        announcement.tag_bg = '#e8f5e8'
    elif announcement.tag == 'แจ้งเตือน':
        announcement.tag_color = '#856404'
        announcement.tag_bg = '#fff3cd'
    else:
        announcement.tag_color = None
        announcement.tag_bg = None

    db.session.commit()
    socketio.emit('announcement_updated', announcement.to_dict()) # Emit to all clients
    return jsonify({'message': 'Announcement updated successfully', 'announcement': announcement.to_dict()}), 200

@app.route('/announcements/<announcement_id>', methods=['DELETE'])
def delete_announcement():
    announcement_id = request.view_args['announcement_id']
    announcement = Announcement.query.get(announcement_id)
    if not announcement:
        return jsonify({'message': 'Announcement not found'}), 404

    db.session.delete(announcement)
    db.session.commit()
    socketio.emit('announcement_deleted', {'announcement_id': announcement_id}) # Emit to all clients
    return jsonify({'message': 'Announcement deleted successfully'}), 200

# --- Repair Request Routes ---
@app.route('/repair-requests', methods=['POST'])
def create_repair_request():
    data = request.get_json()
    user_id = data.get('user_id')
    title = data.get('title')
    category = data.get('category')
    description = data.get('description')
    image_paths = data.get('image_paths')

    if not user_id or not title or not category:
        return jsonify({'message': 'User ID, title, and category are required'}), 400

    new_request = RepairRequest(
        user_id=user_id,
        title=title,
        category=category,
        description=description,
        image_paths=image_paths
    )
    db.session.add(new_request)
    db.session.commit()
    socketio.emit('new_repair_request', new_request.to_dict(), room='admins') # Notify admins
    return jsonify({'message': 'Repair request created successfully', 'request': new_request.to_dict()}), 201

@app.route('/repair-requests', methods=['GET'])
def get_all_repair_requests():
    user_id = request.args.get('user_id')
    if user_id:
        requests = RepairRequest.query.filter_by(user_id=user_id).order_by(RepairRequest.submitted_date.desc()).all()
    else:
        requests = RepairRequest.query.order_by(RepairRequest.submitted_date.desc()).all()
    return jsonify([req.to_dict() for req in requests]), 200

@app.route('/repair-requests/<request_id>', methods=['GET'])
def get_repair_request():
    request_id = request.view_args['request_id']
    req = RepairRequest.query.get(request_id)
    if not req:
        return jsonify({'message': 'Repair request not found'}), 404
    return jsonify(req.to_dict()), 200

@app.route('/repair-requests/<request_id>', methods=['PUT'])
def update_repair_request():
    request_id = request.view_args['request_id']
    req = RepairRequest.query.get(request_id)
    if not req:
        return jsonify({'message': 'Repair request not found'}), 404

    data = request.get_json()
    req.title = data.get('title', req.title)
    req.category = data.get('category', req.category)
    req.description = data.get('description', req.description)
    
    old_status = req.status
    req.status = data.get('status', req.status)
    req.image_paths = data.get('image_paths', req.image_paths)

    db.session.commit()
    if old_status != req.status:
        socketio.emit('repair_status_updated', req.to_dict(), room=req.user_id) # Notify user
    return jsonify({'message': 'Repair request updated successfully', 'request': req.to_dict()}), 200

@app.route('/repair-requests/<request_id>', methods=['DELETE'])
def delete_repair_request():
    request_id = request.view_args['request_id']
    req = RepairRequest.query.get(request_id)
    if not req:
        return jsonify({'message': 'Repair request not found'}), 404

    db.session.delete(req)
    db.session.commit()
    return jsonify({'message': 'Repair request deleted successfully'}), 200

# --- Booking Request Routes ---
@app.route('/booking-requests', methods=['POST'])
def create_booking_request():
    data = request.get_json()
    user_id = data.get('user_id')
    location = data.get('location')
    date_str = data.get('date')
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    purpose = data.get('purpose')
    attendee_count = data.get('attendee_count')

    if not user_id or not location or not date_str or not start_time or not end_time:
        return jsonify({'message': 'User ID, location, date, start time, and end time are required'}), 400

    try:
        booking_date = date.fromisoformat(date_str)
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD.'}), 400

    new_booking = BookingRequest(
        user_id=user_id,
        location=location,
        date=booking_date,
        start_time=start_time,
        end_time=end_time,
        purpose=purpose,
        attendee_count=attendee_count
    )
    db.session.add(new_booking)
    db.session.commit()
    socketio.emit('new_booking_request', new_booking.to_dict(), room='admins') # Notify admins
    return jsonify({'message': 'Booking request created successfully', 'booking': new_booking.to_dict()}), 201

@app.route('/booking-requests', methods=['GET'])
def get_all_booking_requests():
    user_id = request.args.get('user_id')
    if user_id:
        requests = BookingRequest.query.filter_by(user_id=user_id).order_by(BookingRequest.date.desc(), BookingRequest.start_time.desc()).all()
    else:
        requests = BookingRequest.query.order_by(BookingRequest.date.desc(), BookingRequest.start_time.desc()).all()
    return jsonify([req.to_dict() for req in requests]), 200

@app.route('/booking-requests/<booking_id>', methods=['GET'])
def get_booking_request():
    booking_id = request.view_args['booking_id']
    req = BookingRequest.query.get(booking_id)
    if not req:
        return jsonify({'message': 'Booking request not found'}), 404
    return jsonify(req.to_dict()), 200

@app.route('/booking-requests/<booking_id>', methods=['PUT'])
def update_booking_request():
    booking_id = request.view_args['booking_id']
    req = BookingRequest.query.get(booking_id)
    if not req:
        return jsonify({'message': 'Booking request not found'}), 404

    data = request.get_json()
    req.location = data.get('location', req.location)
    
    date_str = data.get('date')
    if date_str:
        try:
            req.date = date.fromisoformat(date_str)
        except ValueError:
            return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD.'}), 400

    req.start_time = data.get('start_time', req.start_time)
    req.end_time = data.get('end_time', req.end_time)
    req.purpose = data.get('purpose', req.purpose)
    req.attendee_count = data.get('attendee_count', req.attendee_count)
    req.status = data.get('status', req.status)

    db.session.commit()
    return jsonify({'message': 'Booking request updated successfully', 'booking': req.to_dict()}), 200

@app.route('/booking-requests/<booking_id>', methods=['DELETE'])
def delete_booking_request():
    booking_id = request.view_args['booking_id']
    req = BookingRequest.query.get(booking_id)
    if not req:
        return jsonify({'message': 'Booking request not found'}), 404

    db.session.delete(req)
    db.session.commit()
    return jsonify({'message': 'Booking request deleted successfully'}), 200

# --- Bill Routes ---
@app.route('/bills', methods=['POST'])
def create_bill():
    data = request.get_json()
    item_name = data.get('item_name')
    amount = data.get('amount')
    due_date_str = data.get('due_date')
    recipient_id = data.get('recipient_id')
    issued_by_user_id = data.get('issued_by_user_id')

    if not item_name or amount is None or not due_date_str or not recipient_id or not issued_by_user_id:
        return jsonify({'message': 'Missing required fields'}), 400

    try:
        due_date = date.fromisoformat(due_date_str)
        amount = float(amount)
    except ValueError:
        return jsonify({'message': 'Invalid date or amount format'}), 400

    new_bill = Bill(
        item_name=item_name,
        amount=amount,
        due_date=due_date,
        recipient_id=recipient_id,
        issued_by_user_id=issued_by_user_id,
        status='unpaid'
    )
    db.session.add(new_bill)
    db.session.commit()
    socketio.emit('new_bill_created', new_bill.to_dict()) # Notify relevant users
    return jsonify({'message': 'Bill created successfully', 'bill': new_bill.to_dict()}), 201

@app.route('/bills', methods=['GET'])
def get_all_bills():
    user_id = request.args.get('user_id')
    
    if user_id:
        bills = Bill.query.filter(
            (Bill.recipient_id == user_id) | (Bill.recipient_id == 'all')
        ).order_by(Bill.issued_date.desc()).all()
    else:
        bills = Bill.query.order_by(Bill.issued_date.desc()).all()
    
    return jsonify([bill.to_dict() for bill in bills]), 200

@app.route('/bills/<bill_id>', methods=['GET'])
def get_bill():
    bill_id = request.view_args['bill_id']
    bill = Bill.query.get(bill_id)
    if not bill:
        return jsonify({'message': 'Bill not found'}), 404
    return jsonify(bill.to_dict()), 200

@app.route('/bills/<bill_id>', methods=['PUT'])
def update_bill():
    bill_id = request.view_args['bill_id']
    bill = Bill.query.get(bill_id)
    if not bill:
        return jsonify({'message': 'Bill not found'}), 404

    data = request.get_json()
    bill.item_name = data.get('item_name', bill.item_name)
    bill.amount = data.get('amount', bill.amount)
    
    due_date_str = data.get('due_date')
    if due_date_str:
        try:
            bill.due_date = date.fromisoformat(due_date_str)
        except ValueError:
            return jsonify({'message': 'Invalid date format for due_date'}), 400
            
    bill.recipient_id = data.get('recipient_id', bill.recipient_id)
    bill.status = data.get('status', bill.status)

    db.session.commit()
    socketio.emit('bill_updated', bill.to_dict()) # Notify relevant users
    return jsonify({'message': 'Bill updated successfully', 'bill': bill.to_dict()}), 200

@app.route('/bills/<bill_id>', methods=['DELETE'])
def delete_bill():
    bill_id = request.view_args['bill_id']
    bill = Bill.query.get(bill_id)
    if not bill:
        return jsonify({'message': 'Bill not found'}), 404

    db.session.delete(bill)
    db.session.commit()
    socketio.emit('bill_deleted', {'bill_id': bill_id, 'item_name': bill.item_name}) # Notify relevant users
    return jsonify({'message': 'Bill deleted successfully'}), 200

# --- Payment Routes ---
@app.route('/payments', methods=['POST'])
def create_payment():
    data = request.get_json()
    bill_id = data.get('bill_id')
    user_id = data.get('user_id')
    amount = data.get('amount')
    payment_method = data.get('payment_method')
    slip_path = data.get('slip_path')

    if not bill_id or not user_id or amount is None or not payment_method:
        return jsonify({'message': 'Missing required fields'}), 400

    bill = Bill.query.get(bill_id)
    if not bill:
        return jsonify({'message': 'Bill not found'}), 404

    new_payment = Payment(
        bill_id=bill_id,
        user_id=user_id,
        amount=amount,
        payment_method=payment_method,
        slip_path=slip_path,
        status='pending'
    )
    db.session.add(new_payment)
    
    bill.status = 'pending_verification'
    
    db.session.commit()
    socketio.emit('new_payment_receipt', new_payment.to_dict(), room='admins') # Notify admins
    return jsonify({'message': 'Payment recorded successfully, awaiting verification', 'payment': new_payment.to_dict()}), 201

@app.route('/payments', methods=['GET'])
def get_all_payments():
    user_id = request.args.get('user_id')
    if user_id:
        payments = Payment.query.filter_by(user_id=user_id).order_by(Payment.payment_date.desc()).all()
    else:
        payments = Payment.query.order_by(Payment.payment_date.desc()).all()
    return jsonify([payment.to_dict() for payment in payments]), 200

@app.route('/payments/<payment_id>', methods=['GET'])
def get_payment():
    payment_id = request.view_args['payment_id']
    payment = Payment.query.get(payment_id)
    if not payment:
        return jsonify({'message': 'Payment not found'}), 404
    return jsonify(payment.to_dict()), 200

@app.route('/payments/approve/<payment_id>', methods=['PUT'])
def approve_payment():
    payment_id = request.view_args['payment_id']
    payment = Payment.query.get(payment_id)
    if not payment:
        return jsonify({'message': 'Payment not found'}), 404

    if payment.status == 'paid':
        return jsonify({'message': 'Payment already approved'}), 400

    payment.status = 'paid'
    
    bill = Bill.query.get(payment.bill_id)
    if bill:
        bill.status = 'paid'

    db.session.commit()
    return jsonify({'message': 'Payment approved successfully', 'payment': payment.to_dict()}), 200

@app.route('/payments/reject/<payment_id>', methods=['PUT'])
def reject_payment():
    payment_id = request.view_args['payment_id']
    payment = Payment.query.get(payment_id)
    if not payment:
        return jsonify({'message': 'Payment not found'}), 404

    if payment.status == 'paid':
        return jsonify({'message': 'Cannot reject an already paid payment'}), 400

    payment.status = 'rejected'
    
    bill = Bill.query.get(payment.bill_id)
    if bill and bill.status == 'pending_verification':
        bill.status = 'unpaid'

    db.session.commit()
    return jsonify({'message': 'Payment rejected', 'payment': payment.to_dict()}), 200

# --- Document Routes ---
@app.route('/documents', methods=['POST'])
def create_document():
    data = request.get_json()
    document_name = data.get('document_name')
    file_path = data.get('file_path')
    uploaded_by_user_id = data.get('uploaded_by_user_id')
    category = data.get('category')
    file_size = data.get('file_size')

    if not document_name or not file_path or not uploaded_by_user_id:
        return jsonify({'message': 'Document name, file path, and uploader ID are required'}), 400

    new_document = Document(
        document_name=document_name,
        file_path=file_path,
        uploaded_by_user_id=uploaded_by_user_id,
        category=category,
        file_size=file_size
    )
    db.session.add(new_document)
    db.session.commit()
    return jsonify({'message': 'Document uploaded successfully', 'document': new_document.to_dict()}), 201

@app.route('/documents', methods=['GET'])
def get_all_documents():
    user_id = request.args.get('user_id')
    if user_id:
        documents = Document.query.filter_by(uploaded_by_user_id=user_id).order_by(Document.upload_date.desc()).all()
    else:
        documents = Document.query.order_by(Document.upload_date.desc()).all()
    return jsonify([doc.to_dict() for doc in documents]), 200

@app.route('/documents/<document_id>', methods=['GET'])
def get_document():
    document_id = request.view_args['document_id']
    doc = Document.query.get(document_id)
    if not doc:
        return jsonify({'message': 'Document not found'}), 404
    return jsonify(doc.to_dict()), 200

@app.route('/documents/<document_id>', methods=['PUT'])
def update_document():
    document_id = request.view_args['document_id']
    doc = Document.query.get(document_id)
    if not doc:
        return jsonify({'message': 'Document not found'}), 404

    data = request.get_json()
    doc.document_name = data.get('document_name', doc.document_name)
    doc.category = data.get('category', doc.category)
    doc.file_size = data.get('file_size', doc.file_size)

    db.session.commit()
    return jsonify({'message': 'Document updated successfully', 'document': doc.to_dict()}), 200

@app.route('/documents/<document_id>', methods=['DELETE'])
def delete_document():
    document_id = request.view_args['document_id']
    doc = Document.query.get(document_id)
    if not doc:
        return jsonify({'message': 'Document not found'}), 404

    db.session.delete(doc)
    db.session.commit()
    return jsonify({'message': 'Document deleted successfully'}), 200

# --- Security Routes ---
@app.route('/security-visitors', methods=['POST'])
def register_visitor():
    data = request.get_json()
    user_id = data.get('user_id')
    name = data.get('name')
    phone = data.get('phone')
    visit_date_str = data.get('visit_date')
    visit_time = data.get('visit_time')
    purpose = data.get('purpose')

    if not user_id or not name or not visit_date_str:
        return jsonify({'message': 'User ID, visitor name, and visit date are required'}), 400

    try:
        visit_date = date.fromisoformat(visit_date_str)
    except ValueError:
        return jsonify({'message': 'Invalid date format for visit_date. Use YYYY-MM-DD.'}), 400

    new_visitor = SecurityVisitor(
        user_id=user_id,
        name=name,
        phone=phone,
        visit_date=visit_date,
        visit_time=visit_time,
        purpose=purpose
    )
    db.session.add(new_visitor)
    db.session.commit()
    socketio.emit('new_visitor_registered', new_visitor.to_dict(), room='admins') # Notify admins
    return jsonify({'message': 'Visitor registered successfully', 'visitor': new_visitor.to_dict()}), 201

@app.route('/security-visitors', methods=['GET'])
def get_all_visitors():
    user_id = request.args.get('user_id')
    if user_id:
        visitors = SecurityVisitor.query.filter_by(user_id=user_id).order_by(SecurityVisitor.visit_date.desc(), SecurityVisitor.visit_time.desc()).all()
    else:
        visitors = SecurityVisitor.query.order_by(SecurityVisitor.visit_date.desc(), SecurityVisitor.visit_time.desc()).all()
    return jsonify([visitor.to_dict() for visitor in visitors]), 200

@app.route('/security-incidents', methods=['POST'])
def report_incident():
    data = request.get_json()
    user_id = data.get('user_id')
    description = data.get('description')
    evidence_paths = data.get('evidence_paths')

    if not user_id or not description:
        return jsonify({'message': 'User ID and description are required'}), 400

    new_incident = SecurityIncident(
        user_id=user_id,
        description=description,
        evidence_paths=evidence_paths
    )
    db.session.add(new_incident)
    db.session.commit()
    socketio.emit('new_incident_reported', new_incident.to_dict(), room='admins') # Notify admins
    return jsonify({'message': 'Incident reported successfully', 'incident': new_incident.to_dict()}), 201

@app.route('/security-incidents', methods=['GET'])
def get_all_incidents():
    user_id = request.args.get('user_id')
    if user_id:
        incidents = SecurityIncident.query.filter_by(user_id=user_id).order_by(SecurityIncident.reported_date.desc()).all()
    else:
        incidents = SecurityIncident.query.order_by(SecurityIncident.reported_date.desc()).all()
    return jsonify([incident.to_dict() for incident in incidents]), 200

@app.route('/security-incidents/<incident_id>', methods=['PUT'])
def update_incident_status():
    incident_id = request.view_args['incident_id']
    incident = SecurityIncident.query.get(incident_id)
    if not incident:
        return jsonify({'message': 'Incident not found'}), 404

    data = request.get_json()
    incident.status = data.get('status', incident.status)

    db.session.commit()
    return jsonify({'message': 'Incident status updated successfully', 'incident': incident.to_dict()}), 200

# --- Voting Routes ---
@app.route('/voting-polls', methods=['POST'])
def create_voting_poll():
    data = request.get_json()
    title = data.get('title')
    description = data.get('description')
    end_date_str = data.get('end_date')
    created_by_user_id = data.get('created_by_user_id')
    options_data = data.get('options', [])

    if not title or not end_date_str or not created_by_user_id or not options_data:
        return jsonify({'message': 'Title, end date, creator, and options are required'}), 400

    try:
        end_date = datetime.fromisoformat(end_date_str)
    except ValueError:
        return jsonify({'message': 'Invalid date format for end_date. Use YYYY-MM-DD.'}), 400

    new_poll = VotingPoll(
        title=title,
        description=description,
        end_date=end_date,
        created_by_user_id=created_by_user_id
    )
    db.session.add(new_poll)
    db.session.flush()

    for opt_text in options_data:
        new_option = VotingOption(poll_id=new_poll.poll_id, option_text=opt_text)
        db.session.add(new_option)

    db.session.commit()
    return jsonify({'message': 'Voting poll created successfully', 'poll': new_poll.to_dict()}), 201

@app.route('/voting-polls', methods=['GET'])
def get_all_voting_polls():
    polls = VotingPoll.query.order_by(VotingPoll.end_date.desc()).all()
    return jsonify([poll.to_dict() for poll in polls]), 200

@app.route('/voting-polls/<poll_id>', methods=['GET'])
def get_voting_poll():
    poll_id = request.view_args['poll_id']
    poll = VotingPoll.query.get(poll_id)
    if not poll:
        return jsonify({'message': 'Voting poll not found'}), 404
    return jsonify(poll.to_dict()), 200

@app.route('/voting-results', methods=['POST'])
def submit_vote():
    data = request.get_json()
    poll_id = data.get('poll_id')
    option_id = data.get('option_id')
    user_id = data.get('user_id')

    if not poll_id or not option_id or not user_id:
        return jsonify({'message': 'Poll ID, option ID, and user ID are required'}), 400

    poll = VotingPoll.query.get(poll_id)
    option = VotingOption.query.get(option_id)

    if not poll or not option:
        return jsonify({'message': 'Poll or option not found'}), 404

    if poll.end_date < datetime.now():
        return jsonify({'message': 'Voting for this poll has ended'}), 400

    existing_vote = VotingResult.query.filter_by(poll_id=poll_id, user_id=user_id).first()
    if existing_vote:
        return jsonify({'message': 'You have already voted in this poll'}), 409

    new_vote = VotingResult(
        poll_id=poll_id,
        option_id=option_id,
        user_id=user_id
    )
    try:
        db.session.add(new_vote)
        option.vote_count += 1
        db.session.commit()
        return jsonify({'message': 'Vote submitted successfully', 'result': new_vote.to_dict()}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({'message': 'Database error: Could not submit vote'}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/voting-results/<poll_id>', methods=['GET'])
def get_poll_results():
    poll_id = request.view_args['poll_id']
    poll = VotingPoll.query.get(poll_id)
    if not poll:
        return jsonify({'message': 'Voting poll not found'}), 404
    
    return jsonify(poll.to_dict()), 200

# --- Calendar Routes ---
@app.route('/calendar-events', methods=['POST'])
def create_calendar_event():
    data = request.get_json()
    event_name = data.get('event_name')
    event_date_str = data.get('event_date')
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    location = data.get('location')
    description = data.get('description')

    if not event_name or not event_date_str:
        return jsonify({'message': 'Event name and date are required'}), 400

    try:
        event_date = date.fromisoformat(event_date_str)
    except ValueError:
        return jsonify({'message': 'Invalid date format for event_date. Use YYYY-MM-DD.'}), 400

    new_event = CalendarEvent(
        event_name=event_name,
        event_date=event_date,
        start_time=start_time,
        end_time=end_time,
        location=location,
        description=description
    )
    db.session.add(new_event)
    db.session.commit()
    socketio.emit('new_calendar_event', new_event.to_dict()) # Notify all clients
    return jsonify({'message': 'Calendar event created successfully', 'event': new_event.to_dict()}), 201

@app.route('/calendar-events', methods=['GET'])
def get_all_calendar_events():
    events = CalendarEvent.query.order_by(CalendarEvent.event_date.asc(), CalendarEvent.start_time.asc()).all()
    return jsonify([event.to_dict() for event in events]), 200

@app.route('/calendar-events/<event_id>', methods=['GET'])
def get_calendar_event():
    event_id = request.view_args['event_id']
    event = CalendarEvent.query.get(event_id)
    if not event:
        return jsonify({'message': 'Calendar event not found'}), 404
    return jsonify(event.to_dict()), 200

@app.route('/calendar-events/<event_id>', methods=['PUT'])
def update_calendar_event():
    event_id = request.view_args['event_id']
    event = CalendarEvent.query.get(event_id)
    if not event:
        return jsonify({'message': 'Calendar event not found'}), 404

    data = request.get_json()
    event.event_name = data.get('event_name', event.event_name)
    
    event_date_str = data.get('event_date')
    if event_date_str:
        try:
            event.event_date = date.fromisoformat(event_date_str)
        except ValueError:
            return jsonify({'message': 'Invalid date format for event_date'}), 400
            
    event.start_time = data.get('start_time', event.start_time)
    event.end_time = data.get('end_time', event.end_time)
    event.location = data.get('location', event.location)
    event.description = data.get('description', event.description)

    db.session.commit()
    return jsonify({'message': 'Calendar event updated successfully', 'event': event.to_dict()}), 200

@app.route('/calendar-events/<event_id>', methods=['DELETE'])
def delete_calendar_event():
    event_id = request.view_args['event_id']
    event = CalendarEvent.query.get(event_id)
    if not event:
        return jsonify({'message': 'Calendar event not found'}), 404

    db.session.delete(event)
    db.session.commit()
    return jsonify({'message': 'Calendar event deleted successfully'}), 200

# --- Chat SocketIO Events ---
@socketio.on('connect')
def handle_connect():
    print('Client connected:', request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected:', request.sid)

@socketio.on('join_chat_room')
def handle_join_room(data):
    room_name = data.get('room_name')
    if room_name:
        join_room(room_name)
        print(f"Client {request.sid} joined room: {room_name}")

@socketio.on('leave_chat_room')
def handle_leave_room(data):
    room_name = data.get('room_name')
    if room_name:
        leave_room(room_name)
        print(f"Client {request.sid} left room: {room_name}")

@socketio.on('send_message')
def handle_send_message(data):
    sender_id = data.get('sender_id')
    room_name = data.get('room_name')
    content = data.get('content')
    sender_name = data.get('sender_name', 'Unknown User')
    sender_avatar = data.get('sender_avatar', 'U')

    if not sender_id or not room_name or not content:
        emit('error', {'message': 'Missing message data'})
        return

    new_message = ChatMessage(
        sender_id=sender_id,
        room_name=room_name,
        content=content
    )
    db.session.add(new_message)
    db.session.commit()

    emit('receive_message', {
        'message_id': new_message.message_id,
        'sender_id': new_message.sender_id,
        'sender_name': sender_name,
        'sender_avatar': sender_avatar,
        'room_name': new_message.room_name,
        'content': new_message.content,
        'timestamp': new_message.timestamp.isoformat()
    }, room=room_name)
    print(f"Message sent to room {room_name} by {sender_name}: {content}")

@app.route('/chat-messages', methods=['GET'])
def get_chat_messages():
    room_name = request.args.get('room_name', 'general_chat')
    messages = ChatMessage.query.filter_by(room_name=room_name).order_by(ChatMessage.timestamp.asc()).all()
    return jsonify([msg.to_dict() for msg in messages]), 200


# --- Main Execution ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all() # Create tables if they don't exist

        # Check if the database file exists and is empty, then populate
        if not os.path.exists(DATABASE_FILE) or os.path.getsize(DATABASE_FILE) == 0:
            populate_initial_data()
        else:
            # Check if there are any users. If not, it's likely a fresh start or cleared db.
            if User.query.count() == 0:
                populate_initial_data()
            else:
                print("Database already contains data. Skipping initial population.")

    # Run the app with SocketIO
    socketio.run(app, debug=True, port=5000)

