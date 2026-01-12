import os
import boto3
import ffmpeg
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from twelvelabs import TwelveLabs
import time

app = FastAPI()

# --- CONFIG ---
R2_ENDPOINT = os.getenv("R2_ENDPOINT") # https://<accountid>.r2.cloudflarestorage.com
R2_ACCESS_KEY = os.getenv("R2_ACCESS_KEY")
R2_SECRET_KEY = os.getenv("R2_SECRET_KEY")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME")
TL_API_KEY = os.getenv("TWELVELABS_API_KEY")

# Initialize Clients
tl_client = TwelveLabs(api_key=TL_API_KEY)
s3_client = boto3.client(
    's3',
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY,
    aws_secret_access_key=R2_SECRET_KEY
)

class ClipRequest(BaseModel):
    video_filename: str  # The name of file already in R2
    search_query: str    # e.g., "A man in blue shirt spiking"
    padding: float = 2.0

@app.post("/generate-clips")
def generate_clips(request: ClipRequest):
    print(f"Processing {request.video_filename} for query: {request.search_query}")

    # 1. GENERATE SIGNED URL FOR TWELVE LABS TO READ
    # Twelve Labs needs a public URL to download the video for indexing
    presigned_url = s3_client.generate_presigned_url(
        'get_object',
        Params={'Bucket': R2_BUCKET_NAME, 'Key': request.video_filename},
        ExpiresIn=3600
    )

    # 2. INDEXING (In production, do this async/background)
    print("Starting Indexing...")
    task = tl_client.task.create_video_indexing_task(
        video_url=presigned_url,
        index_name="poc-index"
    )
    
    # Poll for completion
    task.wait_for_completion()
    print(f"Indexing Complete. Video ID: {task.video_id}")

    # 3. SEARCH
    print("Searching...")
    search_results = tl_client.search.query(
        index_id=task.video_id,
        query_text=request.search_query,
        options=["visual", "conversation"]
    )
    
    # 4. DOWNLOAD RAW FILE LOCALLY (To Cloud Run Container)
    local_input = f"/tmp/{request.video_filename}"
    s3_client.download_file(R2_BUCKET_NAME, request.video_filename, local_input)

    clips_metadata = []

    # 5. SLICE AND UPLOAD
    for i, match in enumerate(search_results.data):
        start_time = max(0, match.start - request.padding)
        end_time = match.end + request.padding
        duration = end_time - start_time
        
        output_filename = f"clip_{task.video_id}_{i}.mp4"
        local_output = f"/tmp/{output_filename}"

        print(f"Slicing {start_time}-{end_time}...")
        
        try:
            (
                ffmpeg
                .input(local_input, ss=start_time, t=duration)
                .output(local_output, c='copy', loglevel="quiet") # codec copy is instant
                .overwrite_output()
                .run()
            )

            # Upload back to R2
            s3_client.upload_file(local_output, R2_BUCKET_NAME, f"clips/{output_filename}")
            
            # Generate a viewable link
            clip_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': R2_BUCKET_NAME, 'Key': f"clips/{output_filename}"},
                ExpiresIn=86400
            )
            
            clips_metadata.append({
                "start": start_time,
                "end": end_time,
                "url": clip_url
            })
            
            # Cleanup output clip
            os.remove(local_output)
            
        except Exception as e:
            print(f"Error slicing clip {i}: {e}")

    # Cleanup input file
    os.remove(local_input)

    return {"status": "success", "clips": clips_metadata}