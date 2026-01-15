# Volleyball Clipper - Session Context

## Current Task: Job Retry Mode with Polling and Improved Logging

### Background
The first half of `test_workflow.py` (video indexing) succeeded, but the job processing (second half) failed. The goal is to add a retry mode that skips indexing and uses existing IDs.

### Preset IDs from Successful Indexing
- **DB video_id** (Supabase): `c76501f5-4ffa-416c-a197-c1cfeccb72bf`
- **twelvelabs_index_id**: `69687d1a368daa912c8823b4`

---

## Architecture Overview

### Flow: Indexing (First Half)
1. Insert video record in `videos` table (status: "uploaded")
2. POST `/webhook/index` with `{video_filename, video_db_id}`
3. Backend polls TwelveLabs until status is "ready"
4. Stores `twelvelabs_index_id` and `twelvelabs_video_id` in DB

### Flow: Job Processing (Second Half)
1. Insert job record in `jobs` table (status: "pending")
2. POST `/webhook/process-job` with `{job_id}`
3. Backend analyzes video via TwelveLabs, cuts clips with FFmpeg
4. Uploads clips to R2, inserts metadata in `clips` table

---

## Files to Modify

### 1. `backend/tests/integration/test_workflow.py`
**Add:**
- `run_job_retry(video_id, query, padding, poll_interval, max_wait)` function
- CLI argument parsing (`--mode full|retry`, `--video-id`, `--query`)
- Polling loop that queries jobs table until status is "completed" or "failed"
- Results display showing clips created

**Configuration constants:**
```python
EXISTING_VIDEO_ID = "c76501f5-4ffa-416c-a197-c1cfeccb72bf"
EXISTING_TWELVELABS_INDEX_ID = "69687d1a368daa912c8823b4"
DEFAULT_QUERY = "what is the timestamps for when the male volleyball player is hitting?"
DEFAULT_PADDING = 2.0
POLL_INTERVAL_SECONDS = 5
MAX_POLL_WAIT_SECONDS = 300
```

### 2. `backend/video_clipping/services/common.py`
**Add centralized logging:**
```python
import logging

def setup_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(level)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s | %(levelname)-8s | [%(name)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger
```

### 3. `backend/video_clipping/services/indexer.py`
**Replace print statements with structured logging:**
- Import logger from common.py
- Replace `print(f"[Indexer] ...")` with `logger.info(...)`
- Replace `print(f"[Background] ...")` with `logger.info(...)`
- Add elapsed time tracking for polling
- Use `logger.exception()` for error cases

### 4. `backend/video_clipping/services/slicer.py`
**Replace print statements with structured logging:**
- Import logger from common.py
- Replace `print(f"[Slicer] ...")` with `logger.info(...)`
- Add segment count to cutting logs (e.g., "Cutting segment 1/5")
- Add job duration logging at completion
- Use `logger.exception()` for error cases

---

## run_job_retry() Function Outline

```python
def run_job_retry(video_id, query, padding=2.0, poll_interval=5, max_wait=300):
    # Step 1: Validate video exists and is ready
    video = supabase.table("videos").select("*").eq("id", video_id).single().execute()
    assert video.data["status"] == "ready"
    assert video.data.get("twelvelabs_video_id")

    # Step 2: Create job
    job = supabase.table("jobs").insert({
        "video_id": video_id,
        "query": query,
        "padding": padding,
        "status": "pending"
    }).execute()
    job_id = job.data[0]["id"]

    # Step 3: Trigger processing
    requests.post(f"{API_URL}/webhook/process-job", json={"job_id": job_id})

    # Step 4: Poll for completion
    start = time.time()
    while True:
        status = supabase.table("jobs").select("status").eq("id", job_id).single().execute()
        if status.data["status"] in ("completed", "failed"):
            break
        if time.time() - start > max_wait:
            break
        time.sleep(poll_interval)

    # Step 5: Display results
    clips = supabase.table("clips").select("*").eq("job_id", job_id).execute()
    # Log clip details
```

---

## Verification Steps

1. Start FastAPI: `uvicorn main:app --reload` (from `backend/video_clipping/`)
2. Run retry: `python test_workflow.py --mode retry`
3. Check:
   - Video validation passes
   - Job created in DB
   - Polling shows status transitions
   - Clips appear in `clips` table (if successful)
   - Logs have timestamps and structure

---

## Database Schema Reference

**videos table:**
- `id` (UUID, PK)
- `user_id` (UUID)
- `filename` (string)
- `r2_path` (string)
- `status` ("uploaded" | "processing" | "ready" | "failed")
- `twelvelabs_index_id` (string, nullable)
- `twelvelabs_video_id` (string, nullable)

**jobs table:**
- `id` (UUID, PK)
- `video_id` (UUID, FK -> videos)
- `query` (string)
- `padding` (float)
- `status` ("pending" | "processing" | "completed" | "failed")

**clips table:**
- `job_id` (UUID, FK -> jobs)
- `r2_path` (string)
- `public_url` (string)
- `start_time` (float)
- `end_time` (float)
