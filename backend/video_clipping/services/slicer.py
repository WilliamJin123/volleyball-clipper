# backend/services/slicer.py
import os
import json
import ffmpeg
from twelvelabs import ResponseFormat
from .common import tl_client, s3_client, R2_BUCKET_NAME, get_presigned_url, supabase

def analyze_video(video_id: str, prompt: str):
    """Queries Twelve Labs for timestamps."""
    print(f"[Slicer] Analyzing Video {video_id} for '{prompt}'...")
    
    response = tl_client.analyze(
        video_id=video_id,
        query=prompt,
        temperature=0.0,
        response_format=ResponseFormat(
            type="json_schema",
            json_schema={
                "type": "object",
                "properties": {
                    "segments": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "start": {"type": "number"},
                                "end": {"type": "number"}
                            },
                            "required": ["start", "end"]
                        }
                    }
                },
                "required": ["segments"]
            }
        )
    )
    # Return parsed list of segments
    return json.loads(response.data)["segments"]

def cut_and_upload(video_filename: str, segments: list, padding: float, job_id: str):
    """
    Streams from R2 -> FFmpeg Cut -> R2.
    """
    source_url = get_presigned_url(video_filename)
    clips_metadata = []

    for i, match in enumerate(segments):
        start_time = max(0, match["start"] - padding)
        end_time = match["end"] + padding
        duration = end_time - start_time
        
        output_filename = f"clip_{video_filename}_{i}_{int(start_time)}.mp4"
        local_output = f"/tmp/{output_filename}"

        r2_dest_key = f"clips/{job_id}/{output_filename}"

        print(f"[Slicer] Cutting {start_time:.2f}-{end_time:.2f}...")

        try:
            # FFmpeg: Input Seeking (ss before i) is faster for remote files
            (
                ffmpeg
                .input(source_url, ss=start_time, t=duration)
                .output(local_output, c='copy', loglevel="error") # codec copy is near instant
                .overwrite_output()
                .run()
            )

            # Upload back to R2
            s3_client.upload_file(local_output, R2_BUCKET_NAME, r2_dest_key)
            
            # Generate View Link (7 days expiry)
            public_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': R2_BUCKET_NAME, 'Key': r2_dest_key},
                ExpiresIn=604800 
            )

            clips_metadata.append({
                "job_id": job_id,
                "r2_path": r2_dest_key,
                "public_url": public_url,
                "start_time": start_time,
                "end_time": end_time
            })

            # Cleanup local
            os.remove(local_output)

        except Exception as e:
            print(f"[Slicer] Error processing segment {i}: {e}")
            if os.path.exists(local_output):
                os.remove(local_output)
            continue

    return clips_metadata

def process_job(job_id: str):
    """
    Background Task: 
    1. Fetch Job from DB
    2. Run Analyze
    3. Run Cut & Upload
    4. Save Results to DB
    """
    print(f"[Slicer] Starting Job {job_id}...")
    
    try:
        # A. Fetch Data (Join Jobs with Videos)
        response = supabase.table("jobs").select("*, videos(*)").eq("id", job_id).single().execute()
        job = response.data
        video = job["videos"]

        if not video or not video.get("twelvelabs_video_id"):
            raise ValueError("Video not indexed or missing TL ID")

        # B. Update Status -> Processing
        supabase.table("jobs").update({"status": "processing"}).eq("id", job_id).execute()

        # C. Run Analysis
        segments = analyze_video(video["twelvelabs_video_id"], job["query"])
        
        if not segments:
            print("[Slicer] No segments found.")
            supabase.table("jobs").update({"status": "completed"}).eq("id", job_id).execute()
            return

        # D. Cut & Upload
        # Note: We pass the 'r2_path' from the video table
        clips_to_insert = cut_and_upload(
            source_r2_path=video["r2_path"], 
            segments=segments, 
            padding=job["padding"], 
            job_id=job_id
        )

        # E. Insert Clips to DB
        if clips_to_insert:
            supabase.table("clips").insert(clips_to_insert).execute()

        # F. Update Status -> Completed
        supabase.table("jobs").update({"status": "completed"}).eq("id", job_id).execute()
        print(f"[Slicer] Job {job_id} finished. {len(clips_to_insert)} clips created.")

    except Exception as e:
        print(f"[Slicer] Job Failed: {e}")
        supabase.table("jobs").update({"status": "failed"}).eq("id", job_id).execute()