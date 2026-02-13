-- 1. PROFILES (Extends default auth.users)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  credits int default 10, -- For future monetization
  -- User preferences (settings page)
  default_clip_padding float default 2.0,
  default_min_confidence float default 0.60,
  output_resolution text default '720p',
  auto_retry boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. VIDEOS (The raw footage uploaded to R2)
create table videos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  filename text not null,          -- e.g., "game_footage.mp4"
  r2_path text not null,           -- e.g., "raw/user_123/game.mp4"
  twelvelabs_index_id text,        -- Populated after indexing
  twelvelabs_video_id text,        -- Populated after indexing
  status text default 'uploaded',  -- 'uploaded', 'indexing', 'ready'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. JOBS (A request to slice a video)
create table jobs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  video_id uuid references videos(id) on delete cascade not null,
  query text not null,             -- e.g. "me setting the ball"
  padding float default 2.0,       -- seconds
  status text default 'pending',   -- 'pending', 'processing', 'completed', 'failed'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. CLIPS (The final sliced results)
create table clips (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references jobs(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade, -- For Realtime subscription filtering
  r2_path text not null,           -- e.g. "clips/clip_abc.mp4"
  public_url text not null,        -- The watchable link
  start_time float,
  end_time float,
  thumbnail_r2_path text,          -- e.g. "clips/job_id/thumb_clip_xxx.jpg"
  thumbnail_url text,              -- Presigned URL for thumbnail image
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);