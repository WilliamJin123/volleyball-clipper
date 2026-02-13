# backend/services/slicer.py
import os
import json
import time
import ffmpeg
from twelvelabs import ResponseFormat
from .common import tl_client, s3_client, R2_BUCKET_NAME, get_presigned_url, supabase, setup_logger

logger = setup_logger("Slicer")

def analyze_video(video_id: str, prompt: str):
    """Queries Twelve Labs for timestamps."""
    logger.info(f"Analyzing Video {video_id} for '{prompt}'...")
    
    response = tl_client.analyze(
        video_id=video_id,
        prompt=prompt,
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

def cut_and_upload(video_filename: str, segments: list, padding: float, job_id: str, user_id: str | None = None):
    """
    Streams from R2 -> FFmpeg Cut -> R2.
    """
    source_url = get_presigned_url(video_filename)
    clips_metadata = []
    total_segments = len(segments)

    for i, match in enumerate(segments):
        start_time = max(0, match["start"] - padding)
        end_time = match["end"] + padding
        duration = end_time - start_time

        output_filename = f"clip_{os.path.basename(video_filename)}_{i}_{int(start_time)}.mp4"
        local_output = f"/tmp/{output_filename}"

        r2_dest_key = f"clips/{job_id}/{output_filename}"

        logger.info(f"Cutting segment {i + 1}/{total_segments}: {start_time:.2f}s - {end_time:.2f}s (duration: {duration:.2f}s)")

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

            # Thumbnail extraction
            thumb_filename = f"thumb_{output_filename.replace('.mp4', '.jpg')}"
            local_thumb = f"/tmp/{thumb_filename}"
            thumb_r2_key = f"clips/{job_id}/{thumb_filename}"
            thumbnail_url = None
            thumb_r2_path = None

            try:
                midpoint = duration / 2
                (
                    ffmpeg
                    .input(local_output, ss=midpoint)
                    .output(local_thumb, vframes=1, **{'q:v': '2'}, loglevel="error")
                    .overwrite_output()
                    .run()
                )
                s3_client.upload_file(
                    local_thumb, R2_BUCKET_NAME, thumb_r2_key,
                    ExtraArgs={'ContentType': 'image/jpeg'}
                )
                thumbnail_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': R2_BUCKET_NAME, 'Key': thumb_r2_key},
                    ExpiresIn=604800
                )
                thumb_r2_path = thumb_r2_key
                logger.info(f"Thumbnail generated for segment {i + 1}")
            except Exception as thumb_err:
                logger.warning(f"Thumbnail generation failed for segment {i + 1}: {thumb_err}")
            finally:
                if os.path.exists(local_thumb):
                    os.remove(local_thumb)

            clip_record = {
                "job_id": job_id,
                "r2_path": r2_dest_key,
                "public_url": public_url,
                "start_time": start_time,
                "end_time": end_time,
                "thumbnail_r2_path": thumb_r2_path,
                "thumbnail_url": thumbnail_url,
            }
            if user_id:
                clip_record["user_id"] = user_id
            clips_metadata.append(clip_record)

            # Cleanup local
            os.remove(local_output)

        except Exception as e:
            logger.exception(f"Error processing segment {i + 1}/{total_segments}: {e}")
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
    job_start_time = time.time()
    logger.info(f"Starting Job {job_id}...")

    try:
        # A. Fetch Data (Join Jobs with Videos)
        response = supabase.table("jobs").select("*, videos(*)").eq("id", job_id).single().execute()
        job = response.data
        video = job["videos"]

        if not video or not video.get("twelvelabs_video_id"):
            raise ValueError("Video not indexed or missing TL ID")

        # B. Update Status -> Processing
        supabase.table("jobs").update({"status": "processing"}).eq("id", job_id).execute()
        logger.info(f"Job {job_id} status -> processing")

        # C. Run Analysis
        segments = analyze_video(video["twelvelabs_video_id"], job["query"])
        logger.info(f"Analysis complete. Found {len(segments)} segments.")

        if not segments:
            logger.info("No segments found. Marking job as completed.")
            supabase.table("jobs").update({"status": "completed"}).eq("id", job_id).execute()
            return

        # D. Cut & Upload
        # Note: We pass the 'r2_path' from the video table
        clips_to_insert = cut_and_upload(
            video_filename=video["r2_path"],
            segments=segments,
            padding=job["padding"],
            job_id=job_id,
            user_id=job.get("user_id"),
        )

        # E. Insert Clips to DB
        if clips_to_insert:
            supabase.table("clips").insert(clips_to_insert).execute()

        # F. Update Status -> Completed
        supabase.table("jobs").update({"status": "completed"}).eq("id", job_id).execute()
        job_duration = time.time() - job_start_time
        logger.info(f"Job {job_id} COMPLETED. {len(clips_to_insert)} clips created in {job_duration:.1f}s")

    except Exception as e:
        job_duration = time.time() - job_start_time
        logger.exception(f"Job {job_id} FAILED after {job_duration:.1f}s: {e}")
        supabase.table("jobs").update({"status": "failed"}).eq("id", job_id).execute()