-- Enable RLS
alter table profiles enable row level security;
alter table videos enable row level security;
alter table jobs enable row level security;
alter table clips enable row level security;

-- PROFILES: Users can view/edit their own profile
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- VIDEOS: Users can only see videos they uploaded
create policy "Users can view own videos" on videos for select using (auth.uid() = user_id);
create policy "Users can insert own videos" on videos for insert with check (auth.uid() = user_id);
create policy "Users can delete own videos" on videos for delete using (auth.uid() = user_id);

-- JOBS: Users can see jobs linked to their videos
create policy "Users can view own jobs" on jobs for select using (
  exists (select 1 from videos where videos.id = jobs.video_id and videos.user_id = auth.uid())
);
create policy "Users can insert own jobs" on jobs for insert with check (
  exists (select 1 from videos where videos.id = jobs.video_id and videos.user_id = auth.uid())
);

-- CLIPS: Users can see clips linked to their jobs
create policy "Users can view own clips" on clips for select using (
  exists (
    select 1 from jobs 
    join videos on jobs.video_id = videos.id
    where clips.job_id = jobs.id and videos.user_id = auth.uid()
  )
);