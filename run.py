"""
KisanQueue — Launcher Script
Starts the FastAPI backend server and serves the full platform on http://localhost:8000.
"""

import sys
import os
import webbrowser
import time
from pathlib import Path

# Ensure UTF-8 stdout on Windows console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))

def main():
    import uvicorn
    
    port = 8000
    host = "127.0.0.1"
    url = f"http://{host}:{port}"
    
    print("=" * 70)
    print("KISANQUEUE (किसान कतार) - SMART FARMER PROCUREMENT & QUEUE PLATFORM")
    print("=" * 70)
    print(f"Starting server on {url}")
    print("Opening browser automatically...")
    print("=" * 70)

    # Open browser slightly after server startup
    if "--no-browser" not in sys.argv:
        try:
            import threading
            def open_browser():
                time.sleep(1.2)
                webbrowser.open(url)
            threading.Thread(target=open_browser, daemon=True).start()
        except Exception:
            pass

    uvicorn.run("main:app", host=host, port=port, app_dir=str(backend_dir), reload=False)

if __name__ == "__main__":
    main()
