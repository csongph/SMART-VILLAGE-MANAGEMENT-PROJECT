import subprocess
import webbrowser
import time
import sys
import os

def main():
    # กำหนด path backend และ frontend
    backend_dir = os.path.join("FINAL PROJECT", "backend")
    backend_script = "app.py"
    frontend_file = os.path.join("FINAL PROJECT", "Frontend", "index.html")
    
    # สร้าง path เต็ม
    backend_path = os.path.join(backend_dir, backend_script)
    frontend_path = os.path.abspath(frontend_file)

    # ตรวจสอบว่าไฟล์และโฟลเดอร์มีอยู่จริง
    if not os.path.isdir(backend_dir):
        print(f"Error: Backend directory not found at '{backend_dir}'")
        sys.exit(1)
    if not os.path.isfile(backend_path):
        print(f"Error: Backend script not found at '{backend_path}'")
        sys.exit(1)
    if not os.path.isfile(frontend_path):
        print(f"Error: Frontend file not found at '{frontend_path}'")
        sys.exit(1)
    
    backend_process = None
    try:
        # รัน backend ใน subprocess
        print("Starting backend...")
        backend_process = subprocess.Popen(
            [sys.executable, backend_script],
            cwd=backend_dir,
            creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0
        )
        print(f"Backend started with PID: {backend_process.pid}")

        # รอ backend เริ่มทำงาน (เพิ่มเวลาเล็กน้อยเพื่อความแน่นอน)
        time.sleep(3)

        # ตรวจสอบว่า backend ยังรันอยู่
        if backend_process.poll() is not None:
            print("Error: Backend failed to start. Please check 'app.py' and its dependencies.")
            return

        # เปิด frontend ในเว็บเบราว์เซอร์
        print("Opening frontend in your web browser...")
        webbrowser.open(f"file://{frontend_path}")
        
        # รอ backend ทำงานต่อไปจนกว่าจะกด Ctrl+C
        print("Backend and frontend are running. Press Ctrl+C to stop.")
        backend_process.wait()

    except KeyboardInterrupt:
        print("\nStopping backend...")
        if backend_process:
            backend_process.terminate()
            print("Backend process terminated.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        if backend_process:
            backend_process.terminate()

if __name__ == "__main__":
    main()