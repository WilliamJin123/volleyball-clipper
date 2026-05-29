-- Re-link the orphaned R2 files by inserting old video/job/clip rows
-- under the new user_id. Clip URLs are rewritten from expired presigned
-- cloudflarestorage.com URLs to permanent r2.dev public URLs.

-- New user id (look it up: select id from auth.users where email='bootlegman101oof@gmail.com')
-- Replace if you re-run for a different user.
\set new_user_id '8b9bfaa8-d973-4ad5-9d10-b1958982379d'

begin;

-- ===== VIDEOS (2 ready, skip the 2 failed) =====
insert into videos (id, user_id, filename, r2_path, twelvelabs_index_id, twelvelabs_video_id, status, created_at) values
  ('c76501f5-4ffa-416c-a197-c1cfeccb72bf', :'new_user_id', 'Integration Test Video',   'test_volleyball_reel.mp4', '69687d1a368daa912c8823b4', '69687d1ca2518c39db4cb373', 'ready', '2026-01-15 05:37:28.463764+00'),
  ('b3eb4064-88c4-4bd4-85f5-de889e4469a1', :'new_user_id', 'Full Workflow Test Video 2','test_volleyball_reel.mp4', '696a73bd058486b3c4184c0a', '696a73cb5a754a2657bb8dc9', 'ready', '2026-01-16 17:22:03.921029+00')
on conflict (id) do nothing;

-- ===== JOBS (all 15 — keep history; only the ones tied to the 2 restored videos) =====
insert into jobs (id, user_id, video_id, query, padding, status, created_at) values
  ('95ac9f82-fc23-463a-937a-7ba75b844b35', :'new_user_id', 'c76501f5-4ffa-416c-a197-c1cfeccb72bf', 'volleyball rally', 2, 'failed', '2026-01-15 05:38:14.563183+00'),
  ('42c754eb-c625-4651-a23d-01fa964e3c7b', :'new_user_id', 'c76501f5-4ffa-416c-a197-c1cfeccb72bf', 'what is the timestamps for when the male volleyball player is hitting?', 2, 'completed', '2026-01-15 06:17:25.329634+00'),
  ('d50fee56-f6be-42ee-b1b1-23c7be996079', :'new_user_id', 'c76501f5-4ffa-416c-a197-c1cfeccb72bf', 'find all the volleyball action moments', 2, 'completed', '2026-01-15 06:17:49.059429+00'),
  ('e33eb95d-fcc7-4285-81e2-a158108b4d2f', :'new_user_id', 'c76501f5-4ffa-416c-a197-c1cfeccb72bf', 'what are the timestamps of each scene in the video', 2, 'completed', '2026-01-15 06:18:03.199556+00'),
  ('bacc45bf-ac79-4590-aad9-6133d843c2f1', :'new_user_id', 'c76501f5-4ffa-416c-a197-c1cfeccb72bf', 'find the timestamps for volleyball hits and spikes', 2, 'completed', '2026-01-15 06:18:37.626188+00'),
  ('11cbf813-8057-425f-ae47-2aca2bbcf3b0', :'new_user_id', 'c76501f5-4ffa-416c-a197-c1cfeccb72bf', 'find the timestamps for volleyball hits and spikes', 2, 'completed', '2026-01-15 06:19:26.99766+00'),
  ('9fc1f881-96f6-4805-b566-403374ddd074', :'new_user_id', 'c76501f5-4ffa-416c-a197-c1cfeccb72bf', 'find all the serves in the video', 2, 'completed', '2026-01-15 06:21:13.765198+00'),
  ('bcc359b9-87f9-4558-a9f4-a5332d4bc4d9', :'new_user_id', 'c76501f5-4ffa-416c-a197-c1cfeccb72bf', 'timestamps when players are jumping', 1.5, 'completed', '2026-01-15 06:21:32.649206+00'),
  ('ebdef292-97c7-4889-a732-58d53db4d1e7', :'new_user_id', 'c76501f5-4ffa-416c-a197-c1cfeccb72bf', 'find all basketball dunks', 2, 'completed', '2026-01-15 06:21:51.984907+00'),
  ('d239152b-739b-4a97-ba55-7d32a2376f6b', :'new_user_id', 'c76501f5-4ffa-416c-a197-c1cfeccb72bf', 'what is the timestamps for when the male volleyball player is hitting?', 2, 'completed', '2026-01-15 06:22:15.274877+00'),
  ('2277c091-ddb9-4f46-b63c-01b9e875085e', :'new_user_id', 'c76501f5-4ffa-416c-a197-c1cfeccb72bf', 'what is the timestamps for when the male volleyball player is hitting?', 2, 'completed', '2026-01-16 17:06:50.251125+00'),
  ('cc18cb10-71a2-4bd6-9a1c-32ad01b43af5', :'new_user_id', 'c76501f5-4ffa-416c-a197-c1cfeccb72bf', 'find all the segments in this video', 2, 'completed', '2026-01-16 17:07:53.271397+00'),
  ('b33512a7-d457-4921-8f74-94163e67e9f0', :'new_user_id', 'b3eb4064-88c4-4bd4-85f5-de889e4469a1', 'find all the volleyball plays in this video', 2, 'completed', '2026-01-16 17:23:04.022366+00'),
  ('02628987-48ac-4bb1-a015-8a5b726dd7b2', :'new_user_id', 'b3eb4064-88c4-4bd4-85f5-de889e4469a1', 'extract timestamps for every scene or shot in the video', 2, 'completed', '2026-01-16 17:23:17.62642+00'),
  ('5443bd48-f712-4e14-aaa2-834b501b219c', :'new_user_id', 'b3eb4064-88c4-4bd4-85f5-de889e4469a1', 'find all moments when a person is serving, spiking, or passing the ball', 2, 'completed', '2026-01-16 17:23:36.826491+00')
on conflict (id) do nothing;

-- ===== CLIPS (11 rows; public_url rewritten to r2.dev permanent domain) =====
insert into clips (id, job_id, user_id, r2_path, public_url, start_time, end_time, created_at) values
  ('1c3de4f6-5ae9-4775-a004-6fc25a6e3427', '11cbf813-8057-425f-ae47-2aca2bbcf3b0', :'new_user_id', 'clips/11cbf813-8057-425f-ae47-2aca2bbcf3b0/clip_test_volleyball_reel.mp4_0_0.mp4', 'https://pub-390eb20c6d1944a88f9e707ce1ccd51e.r2.dev/clips/11cbf813-8057-425f-ae47-2aca2bbcf3b0/clip_test_volleyball_reel.mp4_0_0.mp4', 0,   4,   '2026-01-15 06:19:36.767618+00'),
  ('26dcad0e-800f-48fc-9052-18e5cfdc0071', '11cbf813-8057-425f-ae47-2aca2bbcf3b0', :'new_user_id', 'clips/11cbf813-8057-425f-ae47-2aca2bbcf3b0/clip_test_volleyball_reel.mp4_1_2.mp4', 'https://pub-390eb20c6d1944a88f9e707ce1ccd51e.r2.dev/clips/11cbf813-8057-425f-ae47-2aca2bbcf3b0/clip_test_volleyball_reel.mp4_1_2.mp4', 2,   6,   '2026-01-15 06:19:36.767618+00'),
  ('22ef6708-1bbc-404a-8eb8-b390164fdd5a', '11cbf813-8057-425f-ae47-2aca2bbcf3b0', :'new_user_id', 'clips/11cbf813-8057-425f-ae47-2aca2bbcf3b0/clip_test_volleyball_reel.mp4_2_3.mp4', 'https://pub-390eb20c6d1944a88f9e707ce1ccd51e.r2.dev/clips/11cbf813-8057-425f-ae47-2aca2bbcf3b0/clip_test_volleyball_reel.mp4_2_3.mp4', 3,   7,   '2026-01-15 06:19:36.767618+00'),
  ('59bb71c0-5ac5-48c8-b045-cfb1d01320ed', '11cbf813-8057-425f-ae47-2aca2bbcf3b0', :'new_user_id', 'clips/11cbf813-8057-425f-ae47-2aca2bbcf3b0/clip_test_volleyball_reel.mp4_3_6.mp4', 'https://pub-390eb20c6d1944a88f9e707ce1ccd51e.r2.dev/clips/11cbf813-8057-425f-ae47-2aca2bbcf3b0/clip_test_volleyball_reel.mp4_3_6.mp4', 6,   10,  '2026-01-15 06:19:36.767618+00'),
  ('5a45063a-99b9-4da1-b04b-59e5f93878ea', '9fc1f881-96f6-4805-b566-403374ddd074', :'new_user_id', 'clips/9fc1f881-96f6-4805-b566-403374ddd074/clip_test_volleyball_reel.mp4_0_0.mp4', 'https://pub-390eb20c6d1944a88f9e707ce1ccd51e.r2.dev/clips/9fc1f881-96f6-4805-b566-403374ddd074/clip_test_volleyball_reel.mp4_0_0.mp4', 0,   3,   '2026-01-15 06:21:21.035472+00'),
  ('5306a13c-6a13-4137-aa4e-e114a7e31aee', '9fc1f881-96f6-4805-b566-403374ddd074', :'new_user_id', 'clips/9fc1f881-96f6-4805-b566-403374ddd074/clip_test_volleyball_reel.mp4_1_2.mp4', 'https://pub-390eb20c6d1944a88f9e707ce1ccd51e.r2.dev/clips/9fc1f881-96f6-4805-b566-403374ddd074/clip_test_volleyball_reel.mp4_1_2.mp4', 2,   6,   '2026-01-15 06:21:21.035472+00'),
  ('f571cdc4-323c-44c3-9a58-cf0acaca4c71', 'bcc359b9-87f9-4558-a9f4-a5332d4bc4d9', :'new_user_id', 'clips/bcc359b9-87f9-4558-a9f4-a5332d4bc4d9/clip_test_volleyball_reel.mp4_0_0.mp4', 'https://pub-390eb20c6d1944a88f9e707ce1ccd51e.r2.dev/clips/bcc359b9-87f9-4558-a9f4-a5332d4bc4d9/clip_test_volleyball_reel.mp4_0_0.mp4', 0.5, 3.5, '2026-01-15 06:21:41.127025+00'),
  ('b10ff0f9-8c88-4727-8745-785e7bbf9329', 'bcc359b9-87f9-4558-a9f4-a5332d4bc4d9', :'new_user_id', 'clips/bcc359b9-87f9-4558-a9f4-a5332d4bc4d9/clip_test_volleyball_reel.mp4_1_2.mp4', 'https://pub-390eb20c6d1944a88f9e707ce1ccd51e.r2.dev/clips/bcc359b9-87f9-4558-a9f4-a5332d4bc4d9/clip_test_volleyball_reel.mp4_1_2.mp4', 2.5, 5.5, '2026-01-15 06:21:41.127025+00'),
  ('822e850f-e567-4883-8db9-8504b11e7b1a', 'bcc359b9-87f9-4558-a9f4-a5332d4bc4d9', :'new_user_id', 'clips/bcc359b9-87f9-4558-a9f4-a5332d4bc4d9/clip_test_volleyball_reel.mp4_2_6.mp4', 'https://pub-390eb20c6d1944a88f9e707ce1ccd51e.r2.dev/clips/bcc359b9-87f9-4558-a9f4-a5332d4bc4d9/clip_test_volleyball_reel.mp4_2_6.mp4', 6.5, 9.5, '2026-01-15 06:21:41.127025+00'),
  ('584800dd-86a9-44d8-b66c-bf6bb2b0de4c', 'ebdef292-97c7-4889-a732-58d53db4d1e7', :'new_user_id', 'clips/ebdef292-97c7-4889-a732-58d53db4d1e7/clip_test_volleyball_reel.mp4_0_0.mp4', 'https://pub-390eb20c6d1944a88f9e707ce1ccd51e.r2.dev/clips/ebdef292-97c7-4889-a732-58d53db4d1e7/clip_test_volleyball_reel.mp4_0_0.mp4', 0,   12,  '2026-01-15 06:21:57.900671+00'),
  ('fb35eb63-b496-44f2-aa2c-e185a83a8934', 'd239152b-739b-4a97-ba55-7d32a2376f6b', :'new_user_id', 'clips/d239152b-739b-4a97-ba55-7d32a2376f6b/clip_test_volleyball_reel.mp4_0_3.mp4', 'https://pub-390eb20c6d1944a88f9e707ce1ccd51e.r2.dev/clips/d239152b-739b-4a97-ba55-7d32a2376f6b/clip_test_volleyball_reel.mp4_0_3.mp4', 3,   7,   '2026-01-15 06:22:21.479505+00')
on conflict (id) do nothing;

commit;

-- ===== Verify =====
select 'videos' as table_name, count(*) from videos
union all select 'jobs', count(*) from jobs
union all select 'clips', count(*) from clips;
