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
    
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0" if os.getenv("RENDER") or os.getenv("PORT") else "127.0.0.1")
    url = f"http://{host}:{port}"
    
    print("=" * 70)
    print("ANNASETU / KISANQUEUE - SMART FARMER PROCUREMENT & QUEUE PLATFORM")
    print("=" * 70)
    print(f"Starting server on {url} (host={host}, port={port})")
    
    # Open browser slightly after server startup only if running locally with a display
    is_headless = "--no-browser" in sys.argv or bool(os.getenv("RENDER"))
    if not is_headless:
        print("Opening browser automatically...")
        try:
            import threading
            def open_browser():
                time.sleep(1.2)
                webbrowser.open(url)
            threading.Thread(target=open_browser, daemon=True).start()
        except Exception:
            pass
    print("=" * 70)

    uvicorn.run("main:app", host=host, port=port, app_dir=str(backend_dir), reload=False)

if __name__ == "__main__":
    main()
