-- Consolidated schema for fresh Supabase project.
-- Reconciles create_table.sql + handle_new_user.sql + rls.sql + add_clips_user_id.sql
-- into one idempotent script (avoids "column already exists" from re-applying the migration).

-- =====================================================================
-- 1. TABLES
-- =====================================================================

create table if not exists profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  credits int default 10,
  default_clip_padding float default 2.0,
  default_min_confidence float default 0.60,
  output_resolution text default '720p',
  auto_retry boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists videos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  filename text not null,
  r2_path text not null,
  twelvelabs_index_id text,
  twelvelabs_video_id text,
  status text default 'uploaded',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists jobs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  video_id uuid references videos(id) on delete cascade not null,
  query text not null,
  padding float default 2.0,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists clips (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references jobs(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade,
  r2_path text not null,
  public_url text not null,
  start_time float,
  end_time float,
  thumbnail_r2_path text,
  thumbnail_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================================================================
-- 2. AUTH TRIGGER — auto-create profile row on signup
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================================

alter table profiles enable row level security;
alter table videos   enable row level security;
alter table jobs     enable row level security;
alter table clips    enable row level security;

-- PROFILES
drop policy if exists "Users can view own profile"   on profiles;
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can view own profile"   on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- VIDEOS
drop policy if exists "Users can view own videos"   on videos;
drop policy if exists "Users can insert own videos" on videos;
drop policy if exists "Users can delete own videos" on videos;
create policy "Users can view own videos"   on videos for select using (auth.uid() = user_id);
create policy "Users can insert own videos" on videos for insert with check (auth.uid() = user_id);
create policy "Users can delete own videos" on videos for delete using (auth.uid() = user_id);

-- JOBS
drop policy if exists "Users can view own jobs"   on jobs;
drop policy if exists "Users can insert own jobs" on jobs;
create policy "Users can view own jobs"   on jobs for select using (auth.uid() = user_id);
create policy "Users can insert own jobs" on jobs for insert with check (auth.uid() = user_id);

-- CLIPS — uses user_id directly (the post-migration approach)
drop policy if exists "Users can view own clips"   on clips;
drop policy if exists "Users can delete own clips" on clips;
drop policy if exists "Service can insert clips"   on clips;
create policy "Users can view own clips"   on clips for select using (auth.uid() = user_id);
create policy "Users can delete own clips" on clips for delete using (auth.uid() = user_id);
create policy "Service can insert clips"   on clips for insert with check (true);
