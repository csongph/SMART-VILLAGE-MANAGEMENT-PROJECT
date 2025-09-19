from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
from datetime import datetime

# -------------------------
# Config
# -------------------------
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "smart_village.db")

app = Flask(__name__)
app.config["SECRET_KEY"] = "yoursecretkey"
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
CORS(app)


# -------------------------
# Models
# -------------------------
class BaseModel(db.Model):
    __abstract__ = True
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


class User(BaseModel):
    __tablename__ = "users"
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default="resident")


class Announcement(BaseModel):
    __tablename__ = "announcements"
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)


class Repair(BaseModel):
    __tablename__ = "repairs"
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default="pending")


class Booking(BaseModel):
    __tablename__ = "bookings"
    title = db.Column(db.String(200), nullable=False)
    date = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default="pending")


class Bill(BaseModel):
    __tablename__ = "bills"
    description = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default="unpaid")


# -------------------------
# Routes
# -------------------------

# Auth
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json
    if not data.get("username") or not data.get("password"):
        return jsonify({"error": "Missing username or password"}), 400

    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"error": "User already exists"}), 400

    user = User(username=data["username"], password=data["password"])
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    user = User.query.filter_by(
        username=data.get("username"), password=data.get("password")
    ).first()
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    return jsonify(user.to_dict()), 200


# Announcements
@app.route("/api/announcements", methods=["GET", "POST"])
def announcements():
    if request.method == "POST":
        data = request.json
        ann = Announcement(title=data["title"], content=data["content"])
        db.session.add(ann)
        db.session.commit()
        return jsonify(ann.to_dict()), 201
    else:
        anns = Announcement.query.all()
        return jsonify([a.to_dict() for a in anns])


@app.route("/api/announcements/<int:ann_id>", methods=["DELETE"])
def delete_announcement(ann_id):
    ann = Announcement.query.get_or_404(ann_id)
    db.session.delete(ann)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200


# Repairs
@app.route("/api/repairs", methods=["GET", "POST"])
def repairs():
    if request.method == "POST":
        data = request.json
        repair = Repair(title=data["title"], description=data["description"])
        db.session.add(repair)
        db.session.commit()
        return jsonify(repair.to_dict()), 201
    else:
        repairs = Repair.query.all()
        return jsonify([r.to_dict() for r in repairs])


@app.route("/api/repairs/<int:repair_id>/status", methods=["PUT"])
def update_repair(repair_id):
    repair = Repair.query.get_or_404(repair_id)
    data = request.json
    repair.status = data.get("status", repair.status)
    db.session.commit()
    return jsonify(repair.to_dict()), 200


# Bookings
@app.route("/api/bookings", methods=["GET", "POST"])
def bookings():
    if request.method == "POST":
        data = request.json
        booking = Booking(title=data["title"], date=data["date"])
        db.session.add(booking)
        db.session.commit()
        return jsonify(booking.to_dict()), 201
    else:
        bookings = Booking.query.all()
        return jsonify([b.to_dict() for b in bookings])


@app.route("/api/bookings/<int:booking_id>/status", methods=["PUT"])
def update_booking(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    data = request.json
    booking.status = data.get("status", booking.status)
    db.session.commit()
    return jsonify(booking.to_dict()), 200


# Bills
@app.route("/api/bills", methods=["GET", "POST"])
def bills():
    if request.method == "POST":
        data = request.json
        bill = Bill(description=data["description"], amount=data["amount"])
        db.session.add(bill)
        db.session.commit()
        return jsonify(bill.to_dict()), 201
    else:
        bills = Bill.query.all()
        return jsonify([b.to_dict() for b in bills])


@app.route("/api/bills/<int:bill_id>/status", methods=["PUT"])
def update_bill(bill_id):
    bill = Bill.query.get_or_404(bill_id)
    data = request.json
    bill.status = data.get("status", bill.status)
    db.session.commit()
    return jsonify(bill.to_dict()), 200


# -------------------------
# Init DB
# -------------------------
def init_db():
    with app.app_context():
        db.create_all()
        # Add admin if not exist
        if not User.query.filter_by(username="admin").first():
            admin = User(username="admin", password="admin", role="admin")
            db.session.add(admin)
            db.session.commit()


# -------------------------
# Run
# -------------------------
if __name__ == "__main__":
    init_db()  
    app.run(host="0.0.0.0", port=5000, debug=True)

