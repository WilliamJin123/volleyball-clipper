# backend/main.py
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from services.indexer import background_index_processor
from services.slicer import process_job

app = FastAPI()

class IndexRequest(BaseModel):
    video_filename: str # Filename in R2
    video_db_id: str

class JobRequest(BaseModel):
    job_id: str

@app.get("/")
def health_check():
    return {"status": "Volleyball Clipper API is running"}

@app.post("/webhook/index")
def trigger_indexing(payload: IndexRequest, background_tasks: BackgroundTasks):
    """
    Called by Frontend after uploading file and inserting row in DB.
    """
    background_tasks.add_task(
        background_index_processor, 
        payload.video_filename, 
        payload.video_db_id
    )
    return {"status": "queued"}

@app.post("/webhook/process-job")
def trigger_processing(payload: JobRequest, background_tasks: BackgroundTasks):
    """
    Called by Frontend after inserting a 'pending' job in DB.
    """
    background_tasks.add_task(process_job, payload.job_id)
    return {"status": "queued"}