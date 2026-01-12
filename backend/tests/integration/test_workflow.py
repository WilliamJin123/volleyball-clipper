# backend/tests/integration/test_workflow.py
import requests
import os
import sys
from supabase import create_client
from dotenv import load_dotenv

# 1. Load Environment Variables
# We look for the .env file in the backend root (two directories up)
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_root = os.path.dirname(os.path.dirname(current_dir))
load_dotenv(os.path.join(backend_root, ".env"))

# 2. Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
API_URL = "http://localhost:8000"

# CHECK: Ensure these are set in your .env
if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Missing SUPABASE_URL or SERVICE_KEY in .env")
    sys.exit(1)

# 3. Setup Client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- TEST DATA ---
# IMPORTANT: You must create a user in Supabase Auth first and paste the UUID here.
TEST_USER_ID = "PASTE_YOUR_SUPABASE_USER_ID_HERE" 
R2_FILENAME = "test_game.mp4" # Ensure this file is actually in your R2 bucket

def run_simulation():
    print(f"🚀 Starting Simulation for User: {TEST_USER_ID}")
    
    # --- STEP 1: Simulate Frontend Upload ---
    print("\n[1] Simulating 'Video Uploaded' (Insert into DB)...")
    video_data = {
        "user_id": TEST_USER_ID,
        "filename": "Integration Test Video",
        "r2_path": R2_FILENAME,
        "status": "uploaded"
    }
    
    try:
        video_res = supabase.table("videos").insert(video_data).execute()
        video_id = video_res.data[0]['id']
        print(f"    ✅ Video Row Created: {video_id}")
    except Exception as e:
        print(f"    ❌ Failed to insert video: {e}")
        return

    # --- STEP 2: Trigger Indexing ---
    print("\n[2] Triggering Backend Indexing...")
    # Matches your IndexRequest model: { video_id: str, r2_path: str }
    payload = {"video_id": video_id, "r2_path": R2_FILENAME}
    
    try:
        resp = requests.post(f"{API_URL}/webhook/index", json=payload)
        print(f"    ✅ API Response: {resp.status_code} - {resp.json()}")
    except Exception as e:
        print(f"    ❌ Failed to call API: {e}")
        return

    print("\n    ⏳ PAUSING: Indexing takes time.")
    print("    Check your terminal running FastAPI.") 
    print("    Wait until you see '[Indexer] Video ... is READY'")
    input("    👉 Press ENTER once the backend says 'READY' to continue...")

    # --- STEP 3: Create Job ---
    print("\n[3] Simulating 'Job Creation'...")
    job_data = {
        "video_id": video_id,
        "query": "volleyball rally", # Change this to match your video content
        "padding": 2.0,
        "status": "pending"
    }
    
    try:
        job_res = supabase.table("jobs").insert(job_data).execute()
        job_id = job_res.data[0]['id']
        print(f"    ✅ Job Row Created: {job_id}")
    except Exception as e:
        print(f"    ❌ Failed to create job: {e}")
        return

    # --- STEP 4: Trigger Processing ---
    print("\n[4] Triggering Backend Slicing...")
    # Matches your JobRequest model: { job_id: str }
    try:
        resp = requests.post(f"{API_URL}/webhook/process-job", json={"job_id": job_id})
        print(f"    ✅ API Response: {resp.status_code} - {resp.json()}")
    except Exception as e:
        print(f"    ❌ Failed to call API: {e}")
        return

    print("\n✅ Simulation Requests Sent. Check your 'clips' table in Supabase shortly!")

if __name__ == "__main__":
    run_simulation()