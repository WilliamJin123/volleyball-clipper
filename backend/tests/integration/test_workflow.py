# backend/tests/integration/test_workflow.py
import argparse
import requests
import os
import sys
import time
from supabase import create_client
from dotenv import load_dotenv

# 1. Load Environment Variables
# We look for the .env file in the backend root (two directories up)
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_root = os.path.dirname(os.path.dirname(current_dir))
load_dotenv(os.path.join(backend_root, "video_clipping", ".env"))

# 2. Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
API_URL = "http://localhost:8000"

# CHECK: Ensure these are set in your .env
if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing SUPABASE_URL or SERVICE_KEY in .env")
    sys.exit(1)

# 3. Setup Client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- TEST DATA ---
# bootlegman user
TEST_USER_ID = "ac9fb6c6-1013-4e12-a54e-45d21d5810f1"
R2_FILENAME = "test_volleyball_reel.mp4"  # Ensure this file is actually in your R2 bucket

# --- RETRY MODE CONFIGURATION ---
EXISTING_VIDEO_ID = "c76501f5-4ffa-416c-a197-c1cfeccb72bf"
EXISTING_TWELVELABS_INDEX_ID = "69687d1a368daa912c8823b4"
DEFAULT_QUERY = "what is the timestamps for when the male volleyball player is hitting?"
DEFAULT_PADDING = 2.0
POLL_INTERVAL_SECONDS = 5
MAX_POLL_WAIT_SECONDS = 300


def run_simulation():
    """Original full workflow: index video + process job."""
    print(f"Starting Full Simulation for User: {TEST_USER_ID}")

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
        print(f"    Video Row Created: {video_id}")
    except Exception as e:
        print(f"    Failed to insert video: {e}")
        return

    # --- STEP 2: Trigger Indexing ---
    print("\n[2] Triggering Backend Indexing...")
    # Matches your IndexRequest model: { video_filename: str, video_db_id: str }
    payload = {"video_filename": R2_FILENAME, "video_db_id": video_id}

    try:
        resp = requests.post(f"{API_URL}/webhook/index", json=payload)
        print(f"    API Response: {resp.status_code} - {resp.json()}")
    except Exception as e:
        print(f"    Failed to call API: {e}")
        return

    print("\n    PAUSING: Indexing takes time.")
    print("    Check your terminal running FastAPI.")
    print("    Wait until you see '[Indexer] Video ... is READY'")
    input("    Press ENTER once the backend says 'READY' to continue...")

    # --- STEP 3: Create Job ---
    print("\n[3] Simulating 'Job Creation'...")
    job_data = {
        "video_id": video_id,
        "query": DEFAULT_QUERY,
        "padding": DEFAULT_PADDING,
        "status": "pending"
    }

    try:
        job_res = supabase.table("jobs").insert(job_data).execute()
        job_id = job_res.data[0]['id']
        print(f"    Job Row Created: {job_id}")
    except Exception as e:
        print(f"    Failed to create job: {e}")
        return

    # --- STEP 4: Trigger Processing ---
    print("\n[4] Triggering Backend Slicing...")
    # Matches your JobRequest model: { job_id: str }
    try:
        resp = requests.post(f"{API_URL}/webhook/process-job", json={"job_id": job_id})
        print(f"    API Response: {resp.status_code} - {resp.json()}")
    except Exception as e:
        print(f"    Failed to call API: {e}")
        return

    print("\nSimulation Requests Sent. Check your 'clips' table in Supabase shortly!")


def run_job_retry(video_id: str, query: str, padding: float = DEFAULT_PADDING,
                  poll_interval: int = POLL_INTERVAL_SECONDS,
                  max_wait: int = MAX_POLL_WAIT_SECONDS):
    """
    Retry mode: Skip indexing and use an existing video to test job processing.
    Includes polling to wait for job completion.
    """
    print(f"Starting Job Retry Mode")
    print(f"  Video ID: {video_id}")
    print(f"  Query: {query}")
    print(f"  Padding: {padding}s")
    print(f"  Poll Interval: {poll_interval}s")
    print(f"  Max Wait: {max_wait}s")

    # --- STEP 1: Validate video exists and is ready ---
    print("\n[1] Validating video exists and is ready...")
    try:
        video_res = supabase.table("videos").select("*").eq("id", video_id).single().execute()
        video = video_res.data

        if not video:
            print(f"    ERROR: Video {video_id} not found in database")
            return

        print(f"    Video found: {video['filename']}")
        print(f"    Status: {video['status']}")
        print(f"    TwelveLabs Video ID: {video.get('twelvelabs_video_id', 'N/A')}")
        print(f"    TwelveLabs Index ID: {video.get('twelvelabs_index_id', 'N/A')}")

        if video['status'] != 'ready':
            print(f"    ERROR: Video status is '{video['status']}', expected 'ready'")
            return

        if not video.get('twelvelabs_video_id'):
            print("    ERROR: Video missing twelvelabs_video_id")
            return

        print("    Video validation PASSED")

    except Exception as e:
        print(f"    ERROR: Failed to fetch video: {e}")
        return

    # --- STEP 2: Create job ---
    print("\n[2] Creating job...")
    job_data = {
        "video_id": video_id,
        "query": query,
        "padding": padding,
        "status": "pending"
    }

    try:
        job_res = supabase.table("jobs").insert(job_data).execute()
        job_id = job_res.data[0]['id']
        print(f"    Job created: {job_id}")
    except Exception as e:
        print(f"    ERROR: Failed to create job: {e}")
        return

    # --- STEP 3: Trigger processing ---
    print("\n[3] Triggering job processing...")
    try:
        resp = requests.post(f"{API_URL}/webhook/process-job", json={"job_id": job_id})
        print(f"    API Response: {resp.status_code} - {resp.json()}")
        if resp.status_code != 200:
            print(f"    WARNING: Non-200 status code")
    except Exception as e:
        print(f"    ERROR: Failed to call API: {e}")
        return

    # --- STEP 4: Poll for completion ---
    print(f"\n[4] Polling for job completion (max {max_wait}s)...")
    start_time = time.time()
    poll_count = 0
    last_status = None

    while True:
        poll_count += 1
        elapsed = time.time() - start_time

        try:
            status_res = supabase.table("jobs").select("status").eq("id", job_id).single().execute()
            current_status = status_res.data['status']

            if current_status != last_status:
                print(f"    [{elapsed:.1f}s] Poll #{poll_count}: Status = {current_status}")
                last_status = current_status

            if current_status in ("completed", "failed"):
                break

            if elapsed > max_wait:
                print(f"    TIMEOUT: Max wait of {max_wait}s exceeded")
                break

            time.sleep(poll_interval)

        except Exception as e:
            print(f"    ERROR polling job status: {e}")
            break

    total_time = time.time() - start_time

    # --- STEP 5: Display results ---
    print(f"\n[5] Results (after {total_time:.1f}s)...")

    # Re-fetch final job status
    try:
        final_job = supabase.table("jobs").select("*").eq("id", job_id).single().execute()
        print(f"    Final Job Status: {final_job.data['status']}")
    except Exception as e:
        print(f"    ERROR fetching final job status: {e}")

    # Fetch clips
    try:
        clips_res = supabase.table("clips").select("*").eq("job_id", job_id).execute()
        clips = clips_res.data

        if clips:
            print(f"\n    Clips Created: {len(clips)}")
            print("    " + "-" * 60)
            for i, clip in enumerate(clips):
                print(f"    Clip {i + 1}:")
                print(f"      Time: {clip['start_time']:.2f}s - {clip['end_time']:.2f}s")
                print(f"      R2 Path: {clip['r2_path']}")
                print(f"      Public URL: {clip['public_url'][:80]}...")
        else:
            print("\n    No clips created.")

    except Exception as e:
        print(f"    ERROR fetching clips: {e}")

    print("\nJob retry complete!")


def main():
    parser = argparse.ArgumentParser(
        description="Volleyball Clipper Integration Test",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python test_workflow.py --mode full
      Run the full workflow (indexing + job processing)

  python test_workflow.py --mode retry
      Run job processing only using preset video ID

  python test_workflow.py --mode retry --video-id <uuid>
      Run job processing with a custom video ID

  python test_workflow.py --mode retry --query "find all spikes"
      Run job processing with a custom query
"""
    )

    parser.add_argument(
        '--mode',
        choices=['full', 'retry'],
        default='full',
        help='full = complete workflow, retry = skip indexing and use existing video'
    )

    parser.add_argument(
        '--video-id',
        default=EXISTING_VIDEO_ID,
        help=f'Video ID to use in retry mode (default: {EXISTING_VIDEO_ID})'
    )

    parser.add_argument(
        '--query',
        default=DEFAULT_QUERY,
        help='Query for video analysis'
    )

    parser.add_argument(
        '--padding',
        type=float,
        default=DEFAULT_PADDING,
        help=f'Padding in seconds for clips (default: {DEFAULT_PADDING})'
    )

    parser.add_argument(
        '--poll-interval',
        type=int,
        default=POLL_INTERVAL_SECONDS,
        help=f'Polling interval in seconds (default: {POLL_INTERVAL_SECONDS})'
    )

    parser.add_argument(
        '--max-wait',
        type=int,
        default=MAX_POLL_WAIT_SECONDS,
        help=f'Maximum wait time in seconds (default: {MAX_POLL_WAIT_SECONDS})'
    )

    args = parser.parse_args()

    if args.mode == 'full':
        run_simulation()
    elif args.mode == 'retry':
        run_job_retry(
            video_id=args.video_id,
            query=args.query,
            padding=args.padding,
            poll_interval=args.poll_interval,
            max_wait=args.max_wait
        )


if __name__ == "__main__":
    main()
