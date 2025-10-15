import os
import uuid
from datetime import datetime, date, timedelta
import json
from abc import ABC, abstractmethod

from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import or_, and_
from sqlalchemy.dialects.postgresql import UUID

# ============================================
# Configuration Class
# ============================================
class Config:
    # แก้ไขตรงนี้ให้ตรงกับ PostgreSQL ของคุณ
    POSTGRES_USER = 'postgres'  # เปลี่ยนเป็น username ของคุณ
    POSTGRES_PASSWORD = '160366'  # เปลี่ยนเป็น password จริง
    POSTGRES_HOST = 'localhost'
    POSTGRES_PORT = '5433'
    POSTGRES_DB = 'smart_village'
    
    # สำหรับ Production (เช่น Railway, Render)
    DATABASE_URL = os.environ.get('DATABASE_URL')
    
    UPLOAD_FOLDER = 'static/uploads'
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx'}
    STATIC_FOLDER = os.environ.get('STATIC_FOLDER', 'Frontend')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    
    @classmethod
    def init_app(cls, app):
        # ใช้ DATABASE_URL ถ้ามี (สำหรับ Production)
        if cls.DATABASE_URL:
            # แก้ไข postgres:// เป็น postgresql:// สำหรับ SQLAlchemy
            database_url = cls.DATABASE_URL.replace('postgres://', 'postgresql://')
            app.config['SQLALCHEMY_DATABASE_URI'] = database_url
        else:
            # ใช้ค่าที่ตั้งไว้สำหรับ Development
            app.config['SQLALCHEMY_DATABASE_URI'] = (
                f'postgresql://{cls.POSTGRES_USER}:{cls.POSTGRES_PASSWORD}@'
                f'{cls.POSTGRES_HOST}:{cls.POSTGRES_PORT}/{cls.POSTGRES_DB}'
            )
        
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'pool_size': 10,
            'pool_recycle': 3600,
            'pool_pre_ping': True,  # ป้องกัน connection timeout
        }
        app.config['UPLOAD_FOLDER'] = cls.UPLOAD_FOLDER
        app.config['MAX_CONTENT_LENGTH'] = cls.MAX_CONTENT_LENGTH
        
        if not os.path.exists(cls.UPLOAD_FOLDER):
            os.makedirs(cls.UPLOAD_FOLDER)

# ============================================
# File Manager Class
# ============================================
class FileManager:
    def __init__(self, upload_folder, allowed_extensions):
        self.upload_folder = upload_folder
        self.allowed_extensions = allowed_extensions
    
    def allowed_file(self, filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in self.allowed_extensions
    
    def create_upload_folder(self, upload_type, user_id=None):
        if user_id:
            folder_path = os.path.join(self.upload_folder, upload_type, user_id)
        else:
            folder_path = os.path.join(self.upload_folder, upload_type)
        
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
        
        return folder_path
    
    def save_file(self, file, upload_type, user_id=None):
        if not file or not self.allowed_file(file.filename):
            raise ValueError('File type not allowed')
        
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        
        folder_path = self.create_upload_folder(upload_type, user_id)
        file_path = os.path.join(folder_path, unique_filename)
        file.save(file_path)
        
        if user_id:
            relative_path = os.path.join(upload_type, user_id, unique_filename)
        else:
            relative_path = os.path.join(upload_type, unique_filename)
        
        return relative_path.replace('\\', '/')
    
    def save_multiple_files(self, files, upload_type, user_id=None):
        saved_paths = []
        for file in files:
            if file and self.allowed_file(file.filename):
                path = self.save_file(file, upload_type, user_id)
                saved_paths.append(path)
        return saved_paths

# ============================================
# Database Models (PostgreSQL Compatible)
# ============================================
db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100), index=True)
    address = db.Column(db.String(255))
    role = db.Column(db.String(20), default='resident', index=True)
    status = db.Column(db.String(20), default='pending', index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'name': self.name,
            'username': self.username,
            'phone': self.phone,
            'email': self.email,
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
    published_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    author_id = db.Column(db.String(36), db.ForeignKey('users.user_id', ondelete='SET NULL'))
    tag = db.Column(db.String(50))
    tag_color = db.Column(db.String(20))
    tag_bg = db.Column(db.String(20))

    author = db.relationship('User', backref='announcements_authored')

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
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100), index=True)
    description = db.Column(db.Text)
    submitted_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    status = db.Column(db.String(50), default='pending', index=True)
    image_paths = db.Column(db.Text)

    requester = db.relationship('User', backref='repair_requests_made')

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
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    location = db.Column(db.String(100), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    start_time = db.Column(db.String(10), nullable=False)
    end_time = db.Column(db.String(10), nullable=False)
    purpose = db.Column(db.Text)
    attendee_count = db.Column(db.Integer)
    status = db.Column(db.String(50), default='pending', index=True)
    requested_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    booker = db.relationship('User', backref='booking_requests_made')

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
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    due_date = db.Column(db.Date, nullable=False, index=True)
    recipient_id = db.Column(db.String(36), nullable=False, index=True)
    issued_by_user_id = db.Column(db.String(36), db.ForeignKey('users.user_id', ondelete='SET NULL'))
    issued_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    status = db.Column(db.String(50), default='unpaid', index=True)

    issuer = db.relationship('User', backref='bills_issued_by_me')

    def to_dict(self):
        return {
            'bill_id': self.bill_id,
            'item_name': self.item_name,
            'amount': float(self.amount),
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
    bill_id = db.Column(db.String(36), db.ForeignKey('bills.bill_id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    payment_method = db.Column(db.String(50))
    status = db.Column(db.String(50), default='pending', index=True)
    slip_path = db.Column(db.String(255))

    bill = db.relationship('Bill', backref='payments_for_bill')
    payer = db.relationship('User', backref='payments_made')

    def to_dict(self):
        return {
            'payment_id': self.payment_id,
            'bill_id': self.bill_id,
            'item_name': self.bill.item_name if self.bill else None,
            'user_id': self.user_id,
            'user_name': self.payer.name if self.payer else None,
            'amount': float(self.amount),
            'payment_date': self.payment_date.isoformat(),
            'payment_method': self.payment_method,
            'status': self.status,
            'slip_path': self.slip_path
        }

# ============================================
# Base Service Class (Abstract)
# ============================================
class BaseService(ABC):
    def __init__(self, db_session, socketio_instance):
        self.db = db_session
        self.socketio = socketio_instance
    
    @abstractmethod
    def get_all(self):
        pass
    
    @abstractmethod
    def get_by_id(self, item_id):
        pass
    
    @abstractmethod
    def create(self, data):
        pass
    
    @abstractmethod
    def update(self, item_id, data):
        pass
    
    @abstractmethod
    def delete(self, item_id):
        pass
    
    def handle_error(self, error, custom_message=None):
        self.db.session.rollback()
        message = custom_message or str(error)
        return {'message': message}, 500

# ============================================
# Auth Service
# ============================================
class AuthService:
    def __init__(self, db_session):
        self.db = db_session
    
    def login(self, username, password):
        if not username or not password:
            return None, {'message': 'Username and password are required'}, 400
        
        user = User.query.filter_by(username=username).first()
        
        if not user or not check_password_hash(user.password_hash, password):
            return None, {'message': 'Invalid credentials'}, 401
        
        if user.status != 'approved':
            return None, {'message': f'Your account is {user.status}. Please contact admin.'}, 403
        
        return user, {
            'message': 'Login successful',
            'user_id': user.user_id,
            'name': user.name,
            'username': user.username,
            'phone': user.phone,
            'email': user.email,
            'address': user.address,
            'role': user.role
        }, 200
    
    def register(self, data):
        try:
            hashed_password = generate_password_hash(data['password'])
            new_user = User(
                name=data['name'],
                username=data['username'],
                password_hash=hashed_password,
                phone=data.get('phone'),
                email=data.get('email'),
                address=data.get('address'),
                role=data.get('role', 'resident'),
                status=data.get('status', 'pending')
            )
            self.db.session.add(new_user)
            self.db.session.commit()
            return new_user, {'message': 'User created successfully', 'user': new_user.to_dict()}, 201
        except IntegrityError:
            self.db.session.rollback()
            return None, {'message': 'Username already exists'}, 409
        except Exception as e:
            self.db.session.rollback()
            return None, {'message': f'Error creating user: {str(e)}'}, 500

# ============================================
# User Service
# ============================================
class UserService(BaseService):
    def get_all(self):
        users = User.query.all()
        return [user.to_dict() for user in users]
    
    def get_by_id(self, user_id):
        user = User.query.get(user_id)
        if not user:
            return None, {'message': 'User not found'}, 404
        return user.to_dict(), None, 200
    
    def create(self, data):
        try:
            hashed_password = generate_password_hash(data['password'])
            new_user = User(
                name=data['name'],
                username=data['username'],
                password_hash=hashed_password,
                phone=data.get('phone'),
                email=data.get('email'),
                address=data.get('address'),
                role=data.get('role', 'resident'),
                status=data.get('status', 'pending')
            )
            self.db.session.add(new_user)
            self.db.session.commit()
            return {'message': 'User created successfully', 'user': new_user.to_dict()}, 201
        except IntegrityError:
            return self.handle_error(None, 'Username already exists')
        except Exception as e:
            return self.handle_error(e, f'Error creating user: {str(e)}')
    
    def update(self, user_id, data):
        user = User.query.get(user_id)
        if not user:
            return {'message': 'User not found'}, 404
        
        try:
            if 'password' in data and data['password']:
                if 'current_password' in data:
                    if not check_password_hash(user.password_hash, data['current_password']):
                        return {'message': 'Incorrect current password'}, 401
                user.password_hash = generate_password_hash(data['password'])
            
            user.name = data.get('name', user.name)
            user.username = data.get('username', user.username)
            user.phone = data.get('phone', user.phone)
            user.email = data.get('email', user.email)
            user.address = data.get('address', user.address)
            user.role = data.get('role', user.role)
            user.status = data.get('status', user.status)
            
            self.db.session.commit()
            return {'message': 'User updated successfully', 'user': user.to_dict()}, 200
        except IntegrityError:
            return self.handle_error(None, 'Username already exists')
        except Exception as e:
            return self.handle_error(e)
    
    def delete(self, user_id):
        user = User.query.get(user_id)
        if not user:
            return {'message': 'User not found'}, 404
        
        try:
            self.db.session.delete(user)
            self.db.session.commit()
            return {'message': 'User deleted successfully'}, 200
        except Exception as e:
            return self.handle_error(e)

# ============================================
# Announcement Service
# ============================================
class AnnouncementService(BaseService):
    def get_all(self):
        announcements = Announcement.query.order_by(Announcement.published_date.desc()).all()
        return [ann.to_dict() for ann in announcements]
    
    def get_by_id(self, announcement_id):
        announcement = Announcement.query.get(announcement_id)
        if not announcement:
            return None, {'message': 'Announcement not found'}, 404
        return announcement.to_dict(), None, 200
    
    def create(self, data):
        try:
            published_date = datetime.fromisoformat(data.get('published_date', datetime.utcnow().isoformat()).replace('Z', '+00:00'))
            
            tag = data.get('tag')
            tag_color, tag_bg = self._get_tag_colors(tag)
            
            new_announcement = Announcement(
                title=data['title'],
                content=data['content'],
                published_date=published_date,
                author_id=data['author_id'],
                tag=tag,
                tag_color=tag_color,
                tag_bg=tag_bg
            )
            
            self.db.session.add(new_announcement)
            self.db.session.commit()
            self.socketio.emit('new_announcement', new_announcement.to_dict())
            return {'message': 'Announcement created successfully', 'announcement': new_announcement.to_dict()}, 201
        except Exception as e:
            return self.handle_error(e)
    
    def update(self, announcement_id, data):
        announcement = Announcement.query.get(announcement_id)
        if not announcement:
            return {'message': 'Announcement not found'}, 404
        
        try:
            announcement.title = data.get('title', announcement.title)
            announcement.content = data.get('content', announcement.content)
            
            if 'published_date' in data:
                announcement.published_date = datetime.fromisoformat(data['published_date'].replace('Z', '+00:00'))
            
            announcement.tag = data.get('tag', announcement.tag)
            tag_color, tag_bg = self._get_tag_colors(announcement.tag)
            announcement.tag_color = tag_color
            announcement.tag_bg = tag_bg
            
            self.db.session.commit()
            self.socketio.emit('announcement_updated', announcement.to_dict())
            return {'message': 'Announcement updated successfully', 'announcement': announcement.to_dict()}, 200
        except Exception as e:
            return self.handle_error(e)
    
    def delete(self, announcement_id):
        announcement = Announcement.query.get(announcement_id)
        if not announcement:
            return {'message': 'Announcement not found'}, 404
        
        try:
            self.db.session.delete(announcement)
            self.db.session.commit()
            self.socketio.emit('announcement_deleted', {'announcement_id': announcement_id})
            return {'message': 'Announcement deleted successfully'}, 200
        except Exception as e:
            return self.handle_error(e)
    
    def _get_tag_colors(self, tag):
        tag_colors = {
            'สำคัญ': ('#1976d2', '#e3f2fd'),
            'กิจกรรม': ('#2e7d32', '#e8f5e8'),
            'แจ้งเตือน': ('#856404', '#fff3cd')
        }
        return tag_colors.get(tag, (None, None))

# ============================================
# Repair Request Service
# ============================================
class RepairRequestService(BaseService):
    def get_all(self, user_id=None):
        if user_id:
            requests = RepairRequest.query.filter_by(user_id=user_id).order_by(RepairRequest.submitted_date.desc()).all()
        else:
            requests = RepairRequest.query.order_by(RepairRequest.submitted_date.desc()).all()
        return [req.to_dict() for req in requests]
    
    def get_by_id(self, request_id):
        repair = RepairRequest.query.get(request_id)
        if not repair:
            return None, {'message': 'Repair request not found'}, 404
        return repair.to_dict(), None, 200
    
    def create(self, data):
        try:
            new_request = RepairRequest(
                user_id=data['user_id'],
                title=data['title'],
                category=data['category'],
                description=data.get('description'),
                image_paths=data.get('image_paths', '[]')
            )
            
            self.db.session.add(new_request)
            self.db.session.commit()
            self.socketio.emit('new_repair_request', new_request.to_dict(), room='admins')
            return {'message': 'Repair request created successfully', 'request': new_request.to_dict()}, 201
        except Exception as e:
            return self.handle_error(e)
    
    def update(self, request_id, data):
        req = RepairRequest.query.get(request_id)
        if not req:
            return {'message': 'Repair request not found'}, 404
        
        try:
            req.title = data.get('title', req.title)
            req.category = data.get('category', req.category)
            req.description = data.get('description', req.description)
            
            old_status = req.status
            req.status = data.get('status', req.status)
            req.image_paths = data.get('image_paths', req.image_paths)
            
            self.db.session.commit()
            if old_status != req.status:
                self.socketio.emit('repair_status_updated', req.to_dict(), room=req.user_id)
            return {'message': 'Repair request updated successfully', 'request': req.to_dict()}, 200
        except Exception as e:
            return self.handle_error(e)
    
    def delete(self, request_id):
        req = RepairRequest.query.get(request_id)
        if not req:
            return {'message': 'Repair request not found'}, 404
        
        try:
            self.db.session.delete(req)
            self.db.session.commit()
            return {'message': 'Repair request deleted successfully'}, 200
        except Exception as e:
            return self.handle_error(e)

# ============================================
# Booking Request Service
# ============================================
class BookingRequestService(BaseService):
    def get_all(self, user_id=None):
        if user_id:
            requests = BookingRequest.query.filter_by(user_id=user_id).order_by(BookingRequest.date.desc(), BookingRequest.start_time.asc()).all()
        else:
            requests = BookingRequest.query.order_by(BookingRequest.date.desc(), BookingRequest.start_time.asc()).all()
        return [req.to_dict() for req in requests]
    
    def get_by_id(self, booking_id):
        booking = BookingRequest.query.get(booking_id)
        if not booking:
            return None, {'message': 'Booking request not found'}, 404
        return booking.to_dict(), None, 200
    
    def create(self, data):
        try:
            booking_date = datetime.fromisoformat(data['date']).date()
            
            conflict = self._check_booking_conflict(
                data['location'],
                booking_date,
                data['start_time'],
                data['end_time']
            )
            
            if conflict:
                return {
                    'message': 'The requested time slot is already booked or overlaps with an existing booking for this location.',
                    'conflicting_booking': conflict.to_dict()
                }, 409
            
            new_booking = BookingRequest(
                user_id=data['user_id'],
                location=data['location'],
                date=booking_date,
                start_time=data['start_time'],
                end_time=data['end_time'],
                purpose=data.get('purpose'),
                attendee_count=data.get('attendee_count')
            )
            
            self.db.session.add(new_booking)
            self.db.session.commit()
            self.socketio.emit('new_booking_request', new_booking.to_dict(), room='admins')
            self.socketio.emit('booking_request_submitted', new_booking.to_dict(), room=data['user_id'])
            return {'message': 'Booking request created successfully', 'booking': new_booking.to_dict()}, 201
        except Exception as e:
            return self.handle_error(e)
    
    def update(self, booking_id, data):
        req = BookingRequest.query.get(booking_id)
        if not req:
            return {'message': 'Booking request not found'}, 404
        
        try:
            old_status = req.status
            
            req.location = data.get('location', req.location)
            if 'date' in data:
                req.date = datetime.fromisoformat(data['date']).date()
            req.start_time = data.get('start_time', req.start_time)
            req.end_time = data.get('end_time', req.end_time)
            req.purpose = data.get('purpose', req.purpose)
            req.attendee_count = data.get('attendee_count', req.attendee_count)
            req.status = data.get('status', req.status)
            
            if req.status in ['pending', 'approved']:
                conflict = self._check_booking_conflict(
                    req.location,
                    req.date,
                    req.start_time,
                    req.end_time,
                    exclude_booking_id=booking_id
                )
                
                if conflict:
                    return {
                        'message': 'The updated time slot is already booked or overlaps with an existing booking for this location.',
                        'conflicting_booking': conflict.to_dict()
                    }, 409
            
            self.db.session.commit()
            if old_status != req.status:
                self.socketio.emit('booking_status_updated', req.to_dict(), room=req.user_id)
                self.socketio.emit('booking_updated', req.to_dict(), room='admins')
            
            return {'message': 'Booking request updated successfully', 'booking': req.to_dict()}, 200
        except Exception as e:
            return self.handle_error(e)
    
    def delete(self, booking_id):
        req = BookingRequest.query.get(booking_id)
        if not req:
            return {'message': 'Booking request not found'}, 404
        
        try:
            user_id = req.user_id
            self.db.session.delete(req)
            self.db.session.commit()
            self.socketio.emit('booking_deleted', {'booking_id': booking_id, 'user_id': user_id}, room='admins')
            self.socketio.emit('booking_deleted', {'booking_id': booking_id, 'user_id': user_id}, room=user_id)
            return {'message': 'Booking request deleted successfully'}, 200
        except Exception as e:
            return self.handle_error(e)
    
    def _check_booking_conflict(self, location, date, start_time, end_time, exclude_booking_id=None):
        query = BookingRequest.query.filter(
            BookingRequest.location == location,
            BookingRequest.date == date,
            BookingRequest.status.in_(['pending', 'approved']),
            or_(
                and_(BookingRequest.start_time < end_time, BookingRequest.end_time > start_time),
                and_(BookingRequest.start_time >= start_time, BookingRequest.end_time <= end_time),
                and_(BookingRequest.start_time <= start_time, BookingRequest.end_time >= end_time)
            )
        )
        
        if exclude_booking_id:
            query = query.filter(BookingRequest.booking_id != exclude_booking_id)
        
        return query.first()

# ============================================
# Bill Service
# ============================================
class BillService(BaseService):
    def get_all(self, user_id=None):
        if user_id:
            bills = Bill.query.filter(
                (Bill.recipient_id == user_id) | (Bill.recipient_id == 'all')
            ).order_by(Bill.issued_date.desc()).all()
        else:
            bills = Bill.query.order_by(Bill.issued_date.desc()).all()
        return [bill.to_dict() for bill in bills]
    
    def get_by_id(self, bill_id):
        bill = Bill.query.get(bill_id)
        if not bill:
            return None, {'message': 'Bill not found'}, 404
        return bill.to_dict(), None, 200
    
    def create(self, data):
        try:
            due_date = datetime.fromisoformat(data['due_date']).date()
            
            new_bill = Bill(
                item_name=data['item_name'],
                amount=float(data['amount']),
                due_date=due_date,
                recipient_id=data['recipient_id'],
                issued_by_user_id=data['issued_by_user_id'],
                status='unpaid'
            )
            
            self.db.session.add(new_bill)
            self.db.session.commit()
            self.socketio.emit('new_bill_created', new_bill.to_dict())
            return {'message': 'Bill created successfully', 'bill': new_bill.to_dict()}, 201
        except Exception as e:
            return self.handle_error(e)
    
    def update(self, bill_id, data):
        bill = Bill.query.get(bill_id)
        if not bill:
            return {'message': 'Bill not found'}, 404
        
        try:
            bill.item_name = data.get('item_name', bill.item_name)
            bill.amount = data.get('amount', bill.amount)
            
            if 'due_date' in data:
                bill.due_date = datetime.fromisoformat(data['due_date']).date()
            
            bill.recipient_id = data.get('recipient_id', bill.recipient_id)
            bill.status = data.get('status', bill.status)
            
            self.db.session.commit()
            self.socketio.emit('bill_updated', bill.to_dict())
            return {'message': 'Bill updated successfully', 'bill': bill.to_dict()}, 200
        except Exception as e:
            return self.handle_error(e)
    
    def delete(self, bill_id):
        bill = Bill.query.get(bill_id)
        if not bill:
            return {'message': 'Bill not found'}, 404
        
        bill_data = bill.to_dict()
        
        try:
            self.db.session.delete(bill)
            self.db.session.commit()
            self.socketio.emit('bill_deleted', {'bill_id': bill_id, 'item_name': bill_data['item_name'], 'recipient_id': bill_data['recipient_id']})
            return {'message': 'Bill deleted successfully'}, 200
        except Exception as e:
            return self.handle_error(e)

# ============================================
# Payment Service
# ============================================
class PaymentService(BaseService):
    def get_all(self, user_id=None):
        if user_id:
            payments = Payment.query.filter_by(user_id=user_id).order_by(Payment.payment_date.desc()).all()
        else:
            payments = Payment.query.order_by(Payment.payment_date.desc()).all()
        return [payment.to_dict() for payment in payments]
    
    def get_by_id(self, payment_id):
        payment = Payment.query.get(payment_id)
        if not payment:
            return None, {'message': 'Payment not found'}, 404
        return payment.to_dict(), None, 200
    
    def create(self, data):
        bill = Bill.query.get(data['bill_id'])
        if not bill:
            return {'message': 'Bill not found'}, 404
        
        try:
            new_payment = Payment(
                bill_id=data['bill_id'],
                user_id=data['user_id'],
                amount=data['amount'],
                payment_method=data['payment_method'],
                slip_path=data.get('slip_path'),
                status='pending'
            )
            
            self.db.session.add(new_payment)
            bill.status = 'pending_verification'
            self.db.session.commit()
            
            self.socketio.emit('new_payment_receipt', new_payment.to_dict(), room='admins')
            
            return {'message': 'Payment recorded successfully, awaiting verification', 'payment': new_payment.to_dict()}, 201
        except Exception as e:
            return self.handle_error(e)
    
    def update(self, payment_id, data):
        payment = Payment.query.get(payment_id)
        if not payment:
            return {'message': 'Payment not found'}, 404
        
        try:
            payment.status = data.get('status', payment.status)
            payment.amount = data.get('amount', payment.amount)
            payment.payment_method = data.get('payment_method', payment.payment_method)
            
            self.db.session.commit()
            return {'message': 'Payment updated successfully', 'payment': payment.to_dict()}, 200
        except Exception as e:
            return self.handle_error(e)
    
    def delete(self, payment_id):
        payment = Payment.query.get(payment_id)
        if not payment:
            return {'message': 'Payment not found'}, 404
        
        try:
            self.db.session.delete(payment)
            self.db.session.commit()
            return {'message': 'Payment deleted successfully'}, 200
        except Exception as e:
            return self.handle_error(e)
    
    def approve(self, payment_id):
        payment = Payment.query.get(payment_id)
        if not payment:
            return {'message': 'Payment not found'}, 404
        
        if payment.status == 'paid':
            return {'message': 'Payment already approved'}, 400
        
        try:
            payment.status = 'paid'
            
            bill = Bill.query.get(payment.bill_id)
            if bill:
                bill.status = 'paid'
            
            self.db.session.commit()
            
            payment_data = payment.to_dict()
            self.socketio.emit('payment_approved', payment_data, room=payment.user_id)
            self.socketio.emit('payment_approved', payment_data, room='admins')
            
            return {'message': 'Payment approved successfully', 'payment': payment_data}, 200
        except Exception as e:
            return self.handle_error(e)
    
    def reject(self, payment_id):
        payment = Payment.query.get(payment_id)
        if not payment:
            return {'message': 'Payment not found'}, 404
        
        if payment.status == 'paid':
            return {'message': 'Cannot reject an already paid payment'}, 400
        
        try:
            payment.status = 'rejected'
            
            bill = Bill.query.get(payment.bill_id)
            if bill and bill.status == 'pending_verification':
                bill.status = 'unpaid'
            
            self.db.session.commit()
            
            self.socketio.emit('payment_rejected', payment.to_dict(), room=payment.user_id)
            self.socketio.emit('payment_rejected', payment.to_dict(), room='admins')
            
            return {'message': 'Payment rejected', 'payment': payment.to_dict()}, 200
        except Exception as e:
            return self.handle_error(e)

# ============================================
# Application Factory
# ============================================
def create_app():
    app = Flask(__name__, static_folder=Config.STATIC_FOLDER, static_url_path='')
    CORS(app)
    Config.init_app(app)
    
    db.init_app(app)
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
    
    # Initialize services
    file_manager = FileManager(Config.UPLOAD_FOLDER, Config.ALLOWED_EXTENSIONS)
    auth_service = AuthService(db)
    user_service = UserService(db, socketio)
    announcement_service = AnnouncementService(db, socketio)
    repair_service = RepairRequestService(db, socketio)
    booking_service = BookingRequestService(db, socketio)
    bill_service = BillService(db, socketio)
    payment_service = PaymentService(db, socketio)
    
    # ============================================
    # Routes
    # ============================================
    
    @app.route('/')
    def home():
        return "Smart Village Backend is running!"
    
    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    
    # --- File Upload Routes ---
    @app.route('/upload', methods=['POST'])
    def upload_file():
        if 'file' not in request.files:
            return jsonify({'message': 'No file part'}), 400
        
        file = request.files['file']
        upload_type = request.form.get('type', 'general')
        user_id = request.form.get('user_id')
        
        if file.filename == '':
            return jsonify({'message': 'No selected file'}), 400
        
        try:
            path = file_manager.save_file(file, upload_type, user_id)
            return jsonify({
                'message': 'File uploaded successfully',
                'filename': os.path.basename(path),
                'path': path
            }), 200
        except ValueError as e:
            return jsonify({'message': str(e)}), 400
        except Exception as e:
            return jsonify({'message': f'Error uploading file: {str(e)}'}), 500
    
    @app.route('/upload-multiple', methods=['POST'])
    def upload_multiple_files():
        if 'files[]' not in request.files:
            return jsonify({'message': 'No files part'}), 400
        
        files = request.files.getlist('files[]')
        upload_type = request.form.get('type', 'general')
        user_id = request.form.get('user_id')
        
        try:
            paths = file_manager.save_multiple_files(files, upload_type, user_id)
            return jsonify({
                'message': 'Files uploaded successfully',
                'paths': paths
            }), 200
        except Exception as e:
            return jsonify({'message': f'Error uploading files: {str(e)}'}), 500
    
    # --- Auth Routes ---
    @app.route('/login', methods=['POST'])
    def login():
        data = request.get_json()
        user, response, status_code = auth_service.login(data.get('username'), data.get('password'))
        return jsonify(response), status_code
    
    # --- User Routes ---
    @app.route('/users', methods=['POST'])
    def create_user():
        data = request.get_json()
        if not data.get('name') or not data.get('username') or not data.get('password'):
            return jsonify({'message': 'Name, username, and password are required'}), 400
        
        user, response, status_code = auth_service.register(data)
        return jsonify(response), status_code
    
    @app.route('/users', methods=['GET'])
    def get_all_users():
        users = user_service.get_all()
        return jsonify(users), 200
    
    @app.route('/users/<user_id>', methods=['GET'])
    def get_user(user_id):
        result, error, status_code = user_service.get_by_id(user_id)
        if error:
            return jsonify(error), status_code
        return jsonify(result), status_code
    
    @app.route('/users/<user_id>', methods=['PUT'])
    def update_user(user_id):
        data = request.get_json()
        response, status_code = user_service.update(user_id, data)
        return jsonify(response), status_code
    
    @app.route('/users/<user_id>', methods=['DELETE'])
    def delete_user(user_id):
        response, status_code = user_service.delete(user_id)
        return jsonify(response), status_code
    
    # --- Announcement Routes ---
    @app.route('/announcements', methods=['POST'])
    def create_announcement():
        data = request.get_json()
        if not data.get('title') or not data.get('content') or not data.get('author_id'):
            return jsonify({'message': 'Title, content, and author_id are required'}), 400
        
        response, status_code = announcement_service.create(data)
        return jsonify(response), status_code
    
    @app.route('/announcements', methods=['GET'])
    def get_all_announcements():
        announcements = announcement_service.get_all()
        return jsonify(announcements), 200
    
    @app.route('/announcements/<announcement_id>', methods=['PUT'])
    def update_announcement(announcement_id):
        data = request.get_json()
        response, status_code = announcement_service.update(announcement_id, data)
        return jsonify(response), status_code
    
    @app.route('/announcements/<announcement_id>', methods=['DELETE'])
    def delete_announcement(announcement_id):
        response, status_code = announcement_service.delete(announcement_id)
        return jsonify(response), status_code
    
    # --- Repair Request Routes ---
    @app.route('/repair-requests', methods=['POST'])
    def create_repair_request():
        data = request.get_json()
        if not data.get('user_id') or not data.get('title') or not data.get('category'):
            return jsonify({'message': 'User ID, title, and category are required'}), 400
        
        response, status_code = repair_service.create(data)
        return jsonify(response), status_code
    
    @app.route('/repair-requests', methods=['GET'])
    def get_all_repair_requests():
        user_id = request.args.get('user_id')
        requests = repair_service.get_all(user_id)
        return jsonify(requests), 200
    
    @app.route('/repair-requests/<request_id>', methods=['PUT'])
    def update_repair_request(request_id):
        data = request.get_json()
        response, status_code = repair_service.update(request_id, data)
        return jsonify(response), status_code
    
    # --- Booking Request Routes ---
    @app.route('/booking-requests', methods=['POST'])
    def create_booking_request():
        data = request.get_json()
        required_fields = ['user_id', 'location', 'date', 'start_time', 'end_time']
        if not all(data.get(field) for field in required_fields):
            return jsonify({'message': 'Missing required fields'}), 400
        
        response, status_code = booking_service.create(data)
        return jsonify(response), status_code
    
    @app.route('/booking-requests', methods=['GET'])
    def get_all_booking_requests():
        user_id = request.args.get('user_id')
        requests = booking_service.get_all(user_id)
        return jsonify(requests), 200
    
    @app.route('/booking-requests/<booking_id>', methods=['PUT'])
    def update_booking_request(booking_id):
        data = request.get_json()
        response, status_code = booking_service.update(booking_id, data)
        return jsonify(response), status_code
    
    @app.route('/booking-requests/<booking_id>', methods=['DELETE'])
    def delete_booking_request(booking_id):
        response, status_code = booking_service.delete(booking_id)
        return jsonify(response), status_code
    
    # --- Bill Routes ---
    @app.route('/bills', methods=['POST'])
    def create_bill():
        data = request.get_json()
        required_fields = ['item_name', 'amount', 'due_date', 'recipient_id', 'issued_by_user_id']
        if not all(data.get(field) is not None for field in required_fields):
            return jsonify({'message': 'Missing required fields'}), 400
        
        response, status_code = bill_service.create(data)
        return jsonify(response), status_code
    
    @app.route('/bills', methods=['GET'])
    def get_all_bills():
        user_id = request.args.get('user_id')
        bills = bill_service.get_all(user_id)
        return jsonify(bills), 200
    
    @app.route('/bills/<bill_id>', methods=['PUT'])
    def update_bill(bill_id):
        data = request.get_json()
        response, status_code = bill_service.update(bill_id, data)
        return jsonify(response), status_code
    
    @app.route('/bills/<bill_id>', methods=['DELETE'])
    def delete_bill(bill_id):
        response, status_code = bill_service.delete(bill_id)
        return jsonify(response), status_code
    
    # --- Payment Routes ---
    @app.route('/payments', methods=['POST'])
    def create_payment():
        data = request.get_json()
        required_fields = ['bill_id', 'user_id', 'amount', 'payment_method']
        if not all(data.get(field) is not None for field in required_fields):
            return jsonify({'message': 'Missing required fields'}), 400
        
        response, status_code = payment_service.create(data)
        return jsonify(response), status_code
    
    @app.route('/payments', methods=['GET'])
    def get_all_payments():
        user_id = request.args.get('user_id')
        payments = payment_service.get_all(user_id)
        return jsonify(payments), 200
    
    @app.route('/payments/approve/<payment_id>', methods=['PUT'])
    def approve_payment(payment_id):
        response, status_code = payment_service.approve(payment_id)
        return jsonify(response), status_code
    
    @app.route('/payments/reject/<payment_id>', methods=['PUT'])
    def reject_payment(payment_id):
        response, status_code = payment_service.reject(payment_id)
        return jsonify(response), status_code
    
    # --- SocketIO Events ---
    @socketio.on('connect')
    def handle_connect():
        print('Client connected:', request.sid)
    
    @socketio.on('disconnect')
    def handle_disconnect():
        print('Client disconnected:', request.sid)
    
    @socketio.on('join_room')
    def handle_join_room(data):
        room_name = data.get('room_name')
        if room_name:
            join_room(room_name)
            print(f"Client {request.sid} joined room: {room_name}")
    
    @socketio.on('leave_room')
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
        
        emit('receive_message', {
            'sender_id': sender_id,
            'sender_name': sender_name,
            'sender_avatar': sender_avatar,
            'room_name': room_name,
            'content': content,
            'timestamp': datetime.utcnow().isoformat()
        }, room=room_name)
    
    return app, socketio

# ============================================
# Database Initialization
# ============================================
def populate_initial_data():
    print("กำลังสร้างบัญชีผู้ใช้เริ่มต้น...")
    try:
        admin_user = User(
            name='ผู้ดูแลระบบ',
            username='admin',
            password_hash=generate_password_hash('admin123'),
            phone='',
            email='',
            address='',
            role='admin',
            status='approved'
        )
        db.session.add(admin_user)
        
        resident_user = User(
            name='ผู้อยู่อาศัย',
            username='resident',
            password_hash=generate_password_hash('resident123'),
            phone='',
            email='',
            address='',
            role='resident',
            status='approved'
        )
        db.session.add(resident_user)
        
        db.session.commit()
        print("สร้างบัญชีผู้ใช้เริ่มต้นสำเร็จ")
        print("Admin - Username: admin, Password: admin123")
        print("Resident - Username: resident, Password: resident123")
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"เกิดข้อผิดพลาดในการสร้างบัญชีผู้ใช้: {e}")

# ============================================
# Main Execution
# ============================================
if __name__ == '__main__':
    app, socketio = create_app()
    
    with app.app_context():
        db.create_all()
        
        if User.query.count() == 0:
            populate_initial_data()
        else:
            print("ฐานข้อมูลมีข้อมูลผู้ใช้อยู่แล้ว")
    
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, debug=True, port=port, host='0.0.0.0')
