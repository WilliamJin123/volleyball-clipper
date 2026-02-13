-- Migration: Add user_id to clips table for Realtime subscription filtering
-- Run this in the Supabase SQL editor

-- 1. Add nullable user_id column
ALTER TABLE clips
ADD COLUMN user_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. Backfill from parent jobs
UPDATE clips
SET user_id = jobs.user_id
FROM jobs
WHERE clips.job_id = jobs.id;

-- 3. Make NOT NULL after backfill (optional — keep nullable if old clips may lack jobs)
-- ALTER TABLE clips ALTER COLUMN user_id SET NOT NULL;

-- 4. Add RLS policy so users can only see their own clips
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate with user_id filter
DROP POLICY IF EXISTS "Users can view own clips" ON clips;
DROP POLICY IF EXISTS "Users can delete own clips" ON clips;
DROP POLICY IF EXISTS "Service can insert clips" ON clips;

CREATE POLICY "Users can view own clips"
  ON clips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clips"
  ON clips FOR DELETE
  USING (auth.uid() = user_id);

-- Allow service role inserts (backend uses service key)
CREATE POLICY "Service can insert clips"
  ON clips FOR INSERT
  WITH CHECK (true);
