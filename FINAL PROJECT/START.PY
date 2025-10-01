#!/usr/bin/env python3
"""
start.py - Run Backend and Frontend for SMART VILLAGE project
Author: SMART VILLAGE MANAGEMENT SYSTEM
Description: Automated launcher for Flask backend and HTML frontend
"""

import subprocess
import webbrowser
import os
import time
import socket
import requests
from pathlib import Path
import sys
import signal

# ==================== Configuration ====================
# Path หลักของโปรเจค (FINAL PROJECT folder)
PROJECT_ROOT = Path(__file__).parent.absolute()
FRONTEND_FILE = PROJECT_ROOT / "Frontend" / "index.html"
BACKEND_FILE = PROJECT_ROOT / "backend" / "app.py"

# Backend configuration
BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = 5000
MAX_STARTUP_WAIT = 30  # วินาทีสูงสุดที่รอให้ backend เริ่มทำงาน
CHECK_INTERVAL = 0.5   # วินาทีระหว่างการตรวจสอบ backend

# ==================== Functions ====================

def print_banner():
    """แสดง banner เมื่อเริ่มโปรแกรม"""
    banner = """
    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║       🏘️  SMART VILLAGE MANAGEMENT SYSTEM 🏘️         ║
    ║                                                       ║
    ║              Starting Application...                 ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
    """
    print(banner)

def check_python_version():
    """ตรวจสอบเวอร์ชัน Python"""
    if sys.version_info < (3, 7):
        print("❌ Error: Python 3.7 or higher is required!")
        print(f"   Current version: {sys.version}")
        sys.exit(1)
    print(f"✅ Python version: {sys.version.split()[0]}")

def check_port_available(host, port):
    """ตรวจสอบว่า port ว่างหรือไม่"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1)
    try:
        sock.connect((host, port))
        sock.close()
        return False  # Port is in use
    except (socket.timeout, ConnectionRefusedError, OSError):
        return True  # Port is available
    finally:
        sock.close()

def check_dependencies():
    """ตรวจสอบ Python packages ที่จำเป็น"""
    print("\n📦 Checking dependencies...")
    
    required_packages = {
        'flask': 'Flask',
        'requests': 'requests'
    }
    
    missing_packages = []
    
    for module_name, package_name in required_packages.items():
        try:
            __import__(module_name)
            print(f"✅ {package_name} installed")
        except ImportError:
            print(f"❌ {package_name} NOT installed")
            missing_packages.append(package_name)
    
    if missing_packages:
        print(f"\n⚠️  Missing packages: {', '.join(missing_packages)}")
        print("   Install them using:")
        print(f"   pip install {' '.join(missing_packages)}")
        
        response = input("\n   Do you want to continue anyway? (y/n): ")
        if response.lower() != 'y':
            sys.exit(1)
    else:
        print("✅ All dependencies installed!\n")

def check_files():
    """ตรวจสอบว่าไฟล์ที่จำเป็นมีอยู่หรือไม่"""
    print("📋 Checking required files...")
    
    files_ok = True
    
    # ตรวจสอบ Backend
    if BACKEND_FILE.exists():
        print(f"✅ Backend found: {BACKEND_FILE}")
    else:
        print(f"❌ Backend NOT found: {BACKEND_FILE}")
        files_ok = False
    
    # ตรวจสอบ Frontend
    if FRONTEND_FILE.exists():
        print(f"✅ Frontend found: {FRONTEND_FILE}")
    else:
        print(f"❌ Frontend NOT found: {FRONTEND_FILE}")
        files_ok = False
    
    if not files_ok:
        print("\n❌ Error: Required files are missing!")
        print("   Please check your project structure:")
        print(f"   - Backend: {BACKEND_FILE}")
        print(f"   - Frontend: {FRONTEND_FILE}")
        sys.exit(1)
    
    print("✅ All required files found!\n")

def is_backend_ready(host, port, timeout=1):
    """ตรวจสอบว่า backend พร้อมใช้งานหรือไม่"""
    try:
        response = requests.get(
            f"http://{host}:{port}/",
            timeout=timeout
        )
        return response.status_code in [200, 404]  # ถ้าตอบกลับมาแสดงว่า server ทำงาน
    except requests.exceptions.RequestException:
        return False

def run_backend():
    """เริ่มต้น Flask backend server"""
    print("🚀 Starting Backend Server...")
    
    # ตรวจสอบว่า port ว่างหรือไม่
    if not check_port_available(BACKEND_HOST, BACKEND_PORT):
        print(f"⚠️  Warning: Port {BACKEND_PORT} is already in use!")
        print(f"   Backend might already be running on http://{BACKEND_HOST}:{BACKEND_PORT}")
        response = input("   Do you want to continue? (y/n): ")
        if response.lower() != 'y':
            sys.exit(1)
    
    # ใช้ absolute path
    backend_file = BACKEND_FILE.resolve()
    backend_dir = backend_file.parent
    
    # ตรวจสอบความถูกต้องของ path
    if not backend_file.exists():
        print(f"❌ Backend file not found: {backend_file}")
        sys.exit(1)
    
    if not backend_dir.is_dir():
        print(f"❌ Backend directory invalid: {backend_dir}")
        sys.exit(1)
    
    # แสดงข้อมูล debug
    print(f"   📂 Working directory: {backend_dir}")
    print(f"   📄 Backend file: {backend_file.name}")
    print(f"   🌐 Server will run on: http://{BACKEND_HOST}:{BACKEND_PORT}")
    
    try:
        # เริ่มต้น subprocess โดยไม่แสดง console window (Windows)
        startupinfo = None
        if sys.platform == 'win32':
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        
        # ตั้งค่า environment variables สำหรับ UTF-8
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'
        env['PYTHONLEGACYWINDOWSSTDIO'] = 'utf-8'
        
        process = subprocess.Popen(
            [sys.executable, '-u', str(backend_file)],
            cwd=str(backend_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            startupinfo=startupinfo,
            env=env,
            encoding='utf-8',
            errors='replace'
        )
        
        print("✅ Backend process started!")
        return process
        
    except Exception as e:
        print(f"❌ Error starting backend: {e}")
        sys.exit(1)

def wait_for_backend():
    """รอให้ backend พร้อมใช้งาน"""
    print(f"\n⏳ Waiting for backend to be ready (max {MAX_STARTUP_WAIT}s)...")
    
    start_time = time.time()
    dots = 0
    
    while time.time() - start_time < MAX_STARTUP_WAIT:
        if is_backend_ready(BACKEND_HOST, BACKEND_PORT):
            print("\n✅ Backend is ready!")
            return True
        
        # แสดง progress
        dots = (dots + 1) % 4
        print(f"\r   Checking{'.' * dots}{' ' * (3 - dots)}", end='', flush=True)
        time.sleep(CHECK_INTERVAL)
    
    print("\n⚠️  Backend is taking longer than expected to start")
    print("   Continuing anyway... Check backend logs if there are issues")
    return False

def open_frontend():
    """เปิด Frontend ในเบราว์เซอร์"""
    print("\n🌐 Opening Frontend...")
    
    if not FRONTEND_FILE.exists():
        print(f"❌ Frontend file not found: {FRONTEND_FILE}")
        return False
    
    try:
        # สร้าง URL สำหรับเปิดในเบราว์เซอร์
        url = FRONTEND_FILE.as_uri()
        print(f"   📄 Opening: {url}")
        
        # เปิดในเบราว์เซอร์เริ่มต้น
        webbrowser.open(url)
        print("✅ Frontend opened in browser!")
        return True
        
    except Exception as e:
        print(f"❌ Error opening frontend: {e}")
        print(f"   Please open manually: {FRONTEND_FILE}")
        return False

def print_instructions():
    """แสดงคำแนะนำการใช้งาน"""
    instructions = f"""
    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║                  ✅ SYSTEM RUNNING                    ║
    ║                                                       ║
    ║  Backend:  http://{BACKEND_HOST}:{BACKEND_PORT}                     ║
    ║  Frontend: Opened in your default browser            ║
    ║                                                       ║
    ║  📝 Press Ctrl+C to stop the application             ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
    """
    print(instructions)

def print_backend_output(process):
    """แสดง output จาก backend (ถ้ามี)"""
    try:
        if process and process.poll() is not None:
            # Process has terminated
            stdout, stderr = process.communicate(timeout=1)
            if stderr:
                print(f"\n⚠️  Backend Error Output:\n{stderr}")
    except:
        pass

def cleanup(backend_process):
    """ปิดโปรแกรมอย่างถูกต้อง"""
    print("\n\n🛑 Shutting down...")
    
    if backend_process:
        print("   Stopping backend server...")
        
        # ส่ง SIGTERM ก่อน (graceful shutdown)
        backend_process.terminate()
        
        try:
            # รอ 5 วินาที
            backend_process.wait(timeout=5)
            print("   ✅ Backend stopped successfully")
        except subprocess.TimeoutExpired:
            # ถ้ายังไม่ปิด ใช้ SIGKILL
            print("   ⚠️  Force killing backend...")
            backend_process.kill()
            try:
                backend_process.wait(timeout=2)
                print("   ✅ Backend killed")
            except:
                print("   ⚠️  Backend process may still be running")
        
        # แสดง error output ถ้ามี
        print_backend_output(backend_process)
    
    print("\n👋 Thank you for using SMART VILLAGE MANAGEMENT SYSTEM!")
    print("=" * 60)

# ==================== Main Function ====================

def main():
    """ฟังก์ชันหลักของโปรแกรม"""
    backend_process = None
    
    try:
        # 1. แสดง banner
        print_banner()
        
        # 2. ตรวจสอบ Python version
        check_python_version()
        
        # 3. ตรวจสอบ dependencies
        check_dependencies()
        
        # 4. ตรวจสอบไฟล์ที่จำเป็น
        check_files()
        
        # 5. เริ่มต้น Backend
        backend_process = run_backend()
        
        # 6. รอให้ Backend พร้อม
        wait_for_backend()
        
        # 7. เปิด Frontend
        open_frontend()
        
        # 8. แสดงคำแนะนำ
        print_instructions()
        
        # 9. ตรวจสอบว่า backend ยังทำงานอยู่หรือไม่
        print("🔄 Monitoring backend process...")
        print("   (Application will continue running until you press Ctrl+C)\n")
        
        # รอให้ผู้ใช้กด Ctrl+C หรือ backend ปิดเอง
        while True:
            time.sleep(1)
            
            # ตรวจสอบว่า backend ยังทำงานอยู่หรือไม่
            if backend_process.poll() is not None:
                print("\n⚠️  Backend process has stopped unexpectedly!")
                print_backend_output(backend_process)
                break
        
    except KeyboardInterrupt:
        # ผู้ใช้กด Ctrl+C
        print("\n\n⚠️  Interrupt received...")
        
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        # ปิดโปรแกรมอย่างถูกต้อง
        cleanup(backend_process)

# ==================== Entry Point ====================

if __name__ == "__main__":
    # จัดการ Ctrl+C บน Windows
    if sys.platform == 'win32':
        signal.signal(signal.SIGINT, lambda x, y: sys.exit(0))
    
    main()
