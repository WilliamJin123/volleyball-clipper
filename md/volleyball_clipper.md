# Project Context: VolleyClip — AI Video Clipper

## 1. Project Overview
**Goal:** Build a SaaS that allows users to upload raw volleyball game footage, use AI to find specific actions (e.g., "me setting the ball"), and automatically generate downloadable video clips of those actions with user-defined padding.

**Constraint:** No local GPU processing. Must use a free-tier friendly, scalable cloud architecture.

## 2. The "Free-Tier Hero" Tech Stack
| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14** (App Router) | UI, Upload Manager. Uses **Bun** as package manager. Hosted on Vercel. |
| **Auth/DB** | **Supabase** | Google OAuth, PostgreSQL Database, Row Level Security (RLS). |
| **Storage** | **Cloudflare R2** | Stores raw massive video files and final clips (S3-compatible, no egress fees). |
| **AI Engine** | **Twelve Labs** | "The Brain." Indexes video vectors and performs semantic search. |
| **Backend** | **Python (FastAPI)** | "The Worker." Runs on **Google Cloud Run**. Handles API orchestration and FFmpeg processing. |

---

## 3. Architecture & Data Flow
1.  **Ingestion:** User uploads video directly to **Cloudflare R2** via signed URL (frontend logic).
2.  **Indexing (Async):** Backend sends R2 URL to **Twelve Labs**. Task runs in background until specific `index_id` is ready.
3.  **Analysis:** User queries (e.g., "spiking"). Backend uses Twelve Labs `analyze` (or `search`) endpoint to get start/end timestamps.
4.  **Slicing:** Backend uses **FFmpeg** to stream the specific byte-range from R2 (no full download), cuts the clip, and uploads the result back to R2.
5.  **Delivery:** Frontend displays the clips from R2.

---

## 4. Current Codebase State

### Directory Structure
```text
/volleyball-clipper
├── frontend/ (Next.js + Bun)
└── backend/ (Python 3.11 + FastAPI)
    ├── main.py            # API Entry point
    ├── requirements.txt   # includes: fastapi, uvicorn, ffmpeg-python, twelvelabs, boto3[s3]
    ├── Dockerfile         # Python 3.11-slim + System FFmpeg installed
    └── services/
        ├── indexer.py     # Logic to create/reuse Twelve Labs Index & Task
        └── slicer.py      # Logic to Analyze prompts & Stream/Cut via FFmpeg