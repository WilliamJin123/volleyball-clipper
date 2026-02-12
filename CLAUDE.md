# VolleyClip - Project Context

## Completed Tasks
- [x] Video indexing workflow (TwelveLabs integration)
- [x] Job processing workflow (clip generation)
- [x] Job retry mode with polling in test_workflow.py
- [x] Centralized structured logging in services

---

## Architecture Overview

### Backend Flow
1. **Indexing**: Upload video → TwelveLabs indexing → Store IDs in Supabase
2. **Processing**: Create job → TwelveLabs analysis → FFmpeg clip cutting → R2 upload

### Key Files
- `backend/video_clipping/main.py` - FastAPI endpoints
- `backend/video_clipping/services/indexer.py` - TwelveLabs indexing
- `backend/video_clipping/services/slicer.py` - Clip generation
- `backend/video_clipping/services/common.py` - Shared config & logging

### Database (Supabase)
- `profiles` - User accounts (linked to auth.users)
- `videos` - Video records with TwelveLabs IDs
- `jobs` - Clip generation jobs
- `clips` - Generated clip metadata

---

## Next Steps

### 1. Full Next.js Frontend Implementation
**Location:** `frontend/`
**Current state:** Scaffolded with Next.js 16, TypeScript, Tailwind, @supabase/supabase-js - no business logic yet

**Required components:**
- [ ] Auth UI (login/signup with Supabase Auth)
- [ ] Video upload page with progress indicator
- [ ] Job creation form (query input, padding settings)
- [ ] Job status dashboard with polling
- [ ] Clip gallery with video playback
- [ ] User profile/settings page

**Supabase integration tasks:**
- [ ] Create `lib/supabase.ts` client setup
- [ ] Implement auth context/provider
- [ ] Add protected route middleware
- [ ] Connect to Supabase Realtime for job status updates (alternative to polling)

### 2. Investigate User-Separated Storage (Multi-Tenant)

**Current state assessment:**
| Layer | Status | Notes |
|-------|--------|-------|
| Database | ✅ Good | All tables have user_id, RLS policies enabled |
| R2 raw videos | ⚠️ Gap | Path: `raw/{filename}` - collision risk |
| R2 clips | ⚠️ Partial | Path: `clips/{job_id}/` - not user-keyed |

**Recommended R2 path structure:**
```
raw/{user_id}/{timestamp}_{filename}.mp4
clips/{user_id}/{job_id}/clip_{index}.mp4
```

**Files to modify:**
- `backend/video_clipping/services/common.py` - Add user-aware path helpers
- `backend/video_clipping/services/indexer.py` - Pass user_id for upload paths
- `backend/video_clipping/services/slicer.py` - Include user_id in clip paths
- `backend/video_clipping/main.py` - Extract user_id from auth context

**Considerations:**
- Existing data migration (or leave legacy paths as-is?)
- Auth header validation in FastAPI endpoints
- Signed URLs for private R2 access vs public URLs

---

## Quick Reference

**Start backend:**
```bash
cd backend/video_clipping && uv run uvicorn main:app --reload
```

**Run tests:**
```bash
cd backend/tests/integration && uv run python test_workflow.py --mode retry
```

**Start frontend:**
```bash
cd frontend && bun dev
```
