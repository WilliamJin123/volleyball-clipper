# Volleyball AI Clipper - SaaS Architecture Master Plan

## 1. Executive Summary
This project is a video intelligence SaaS that allows volleyball players to upload raw game footage and receive auto-generated highlight clips based on semantic queries (e.g., "Player in blue shirt spiking"). 

**Core Constraint:** Zero local processing. All heavy lifting (indexing, searching, slicing) occurs in the cloud using free-tier capable services.

## 2. The Technology Stack ("The Free-Tier Hero")

| Component | Technology | Role | Free Tier Limits |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Next.js 14** (App Router) | User Interface, Video Player, Upload Manager. Hosted on Vercel. | Hobby Tier (Generous) |
| **Auth & DB** | **Supabase** | User Management (Google OAuth), Relational Database (PostgreSQL), Real-time subscriptions. | 500MB DB space, 50k MAU |
| **Raw Storage** | **Cloudflare R2** | Stores raw massive video files and final clips. S3-compatible but with NO egress fees. | 10GB Storage / 10M reads |
| **AI Vision** | **Twelve Labs** | The "Brain." Indexes video content and returns timestamps for natural language queries. | 10 Hours of Video Indexing |
| **The Worker** | **Google Cloud Run** | The "Knife." A Dockerized Python service that runs FFmpeg to slice videos. | 2 Million requests/month |

---

## 3. Data Flow & Architecture

### Phase A: Ingestion
1. **User** logs in (Supabase Auth).
2. **Frontend** requests a pre-signed upload URL from Supabase Functions (or Next.js API route) connecting to Cloudflare R2.
3. **User** uploads `raw_game.mp4` directly to R2 (bypassing your server to save RAM).
4. **Supabase** database row created: `Videos` table -> `status: 'uploaded'`.

### Phase B: Processing (The Async Pipeline)
1. **Frontend** triggers the **Cloud Run Worker** via HTTP POST with the `video_id`.
2. **Worker** sends `video_url` (R2 link) to **Twelve Labs API** for indexing.
3. **Worker** polls for index completion.
4. **Worker** executes search query (e.g., "Person in blue shirt setting").
5. **Twelve Labs** returns JSON timestamps: `[{start: 10, end: 15}, ...]`.

### Phase C: Slicing (The FFmpeg Logic)
1. **Worker** streams specific byte-ranges of the video from R2 (using FFmpeg).
2. **Worker** cuts clips with user-defined padding (e.g., +/- 2 seconds).
3. **Worker** uploads resulting clips back to R2 in a `/clips` folder.
4. **Worker** inserts rows into Supabase `Clips` table.

### Phase D: Consumption
1. **User** dashboard polls Supabase for changes in `Clips` table.
2. **Frontend** displays a grid of video players sourcing `src` from Cloudflare R2.

---

## 4. Database Schema (Supabase / PostgreSQL)

**Table: `profiles`**
- `id` (uuid, references auth.users)
- `email`
- `credits` (int) - For future monetization

**Table: `videos`**
- `id` (uuid)
- `user_id` (uuid, fk)
- `r2_key` (text) - Path in storage
- `status` (enum: 'uploading', 'indexing', 'ready')
- `twelvelabs_index_id` (text)
- `created_at`

**Table: `jobs`**
- `id` (uuid)
- `video_id` (uuid, fk)
- `query_text` (text) - e.g., "Me hitting"
- `visual_description` (text) - e.g., "Blue shirt, black hair"
- `padding` (int) - seconds
- `status` (enum: 'processing', 'completed', 'failed')

**Table: `clips`**
- `id` (uuid)
- `job_id` (uuid, fk)
- `r2_key` (text)
- `start_time` (float)
- `end_time` (float)
- `public_url` (text)

---

## 5. Security & Privacy
*   **RLS (Row Level Security):** 
    *   `CREATE POLICY "Users can only see their own videos" ON videos FOR SELECT USING (auth.uid() = user_id);`
*   **Storage Access:**
    *   R2 Bucket should be private.
    *   Cloud Run Worker uses an Access Key ID / Secret Key Env Variable to read/write.
    *   Frontend uses Signed URLs to view clips (prevents scraping).