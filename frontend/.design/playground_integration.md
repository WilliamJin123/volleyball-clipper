# Playground Component Integration Guide

This document maps every section of `playground.html` to its current usage in the VolleyClip React app and details how unused components could be integrated.

---

## Components Already Used

These playground sections are faithfully implemented in the React frontend:

| Playground Section | Used In | React Component |
|---|---|---|
| **Color System** | `globals.css` `@theme` block | Tailwind custom colors (`bg-bg-void`, `text-accent-primary`, etc.) |
| **Typography** | Every page | `font-display`, `font-body`, `font-mono` via Google Fonts + Tailwind |
| **Buttons** (Primary, Secondary, Ghost, Danger) | Auth, Dashboard, Jobs, Settings, Videos | Inline Tailwind classes matching playground specs |
| **Status Badges** | Videos, Jobs, Clips pages | `components/ui/status-badge.tsx` |
| **Clip Cards** | Dashboard (recent clips), Clips gallery | `components/clips/clip-card.tsx` |
| **Inputs / Form Elements** | Auth, Jobs (create form), Settings | Tailwind-styled `<input>`, `<select>`, `<textarea>` with focus glow |
| **Job Dashboard** (Fused Bar) | Dashboard (active jobs), Jobs list, Job detail | `components/ui/fused-bar.tsx` |
| **Full Layout - Clip Gallery** | `/clips` page | `components/clips/clip-gallery.tsx` with filter pills, search, pagination |
| **Net Divider** (animated ripple) | Every page | `components/ui/net-divider.tsx` |
| **Antenna Loading Skeleton** | Videos (uploading stripe), Jobs (processing state) | CSS `uploading-stripe` class + `pulse-text` animation |

---

## Components NOT Yet Used

The following playground sections showcase components that don't appear in the current app. Each has clear integration paths.

---

### 1. Data Readouts

**What it is:** Monospace number displays with units and accent colors. Cards showing metrics like `FRAME 1,847 / 12,402`, `DUR: 04.32s`, `RES: 1080p`.

**Integration Options:**

**Option A: Job Detail Metrics Panel**
Add a row of data readout cards to `/jobs/[id]` when a job is complete. Show:
- `CLIPS: 12` (accent-success)
- `TOTAL DUR: 01:47.32` (accent-primary)
- `AVG CONF: 0.87` (accent-secondary)
- `OUTPUT: 47.2 MB` (text-secondary)

This replaces the current simple metadata grid with the more visually distinctive monospace readout style.

**Option B: Dashboard Hero Stats**
Replace or augment the current stats strip cards with the readout style for a more "data terminal" feel. The readout format (`1,847 / 12,402` with dim units) is more information-dense than the current single-number cards.

**Option C: Video Detail View**
When clicking a video in the list, show a detail panel with readouts: total duration, file size, index status, number of jobs run, total clips extracted.

---

### 2. Processing Log (Terminal)

**What it is:** A terminal-style output panel with syntax-highlighted log lines. Operations in blue, values in secondary, success in green, errors in red.

**Integration Options:**

**Option A: Job Detail Processing Log (Recommended)**
Add a collapsible "Processing Log" section to `/jobs/[id]` that shows real-time backend output:
```
[INDEX] Analyzing video frames...           OK
[DETECT] Found 14 candidate moments
[SLICE] Cutting clip 7/14 at 02:14.3
[UPLOAD] clip_007.mp4 → R2                  4.2 MB
[DONE] Job complete                         12 clips · 2m 34s
```
This could consume a Supabase Realtime channel that streams log entries from the backend, or poll a `/jobs/{id}/logs` endpoint.

**Option B: Global Activity Log Page**
Add a `/logs` or `/activity` page showing a streaming terminal of all system events across jobs. Power-user feature for monitoring multiple concurrent jobs.

**Option C: Video Indexing Progress**
Show terminal-style progress during the TwelveLabs indexing phase on the Videos page, replacing the simple progress bar with richer feedback.

---

### 3. Notifications / Toasts

**What it is:** Glassmorphic toast notifications with colored top borders, type tags (`[CLIP]`, `[ERROR]`, `[INFO]`), micro net dividers, and slide-in animation. Four variants: success, error, info, warning.

**Integration Options:**

**Option A: Replace Sonner with Custom Toasts (Recommended)**
The app already has `sonner` installed but uses no custom styling. Create a custom toast component matching the playground design and use it for:
- Job completion: `[DONE] "Match Highlights" complete · 12 clips`
- Clip extraction: `[CLIP] Cross-Court Kill extracted · 00:04.32`
- Upload success: `[UPLOAD] Beach_Finals.mp4 indexed successfully`
- Errors: `[ERROR] Job failed: timeout · Retry?` (with clickable retry action)

Wire these to Supabase Realtime events so toasts fire even when the user isn't on the relevant page.

**Option B: Notification Center**
Add a bell icon in the header that opens a dropdown showing recent notifications in the toast format. Unread count badge using `accent-hot` color.

**Option C: Dashboard Activity Feed**
Replace or supplement the "Active Jobs" section on the dashboard with a reverse-chronological feed of recent events in toast format.

---

### 4. Commentary Ticker

**What it is:** An ESPN-style horizontally scrolling text bar showing real-time activity across all jobs. Colored tags (`CLIP`, `DETECT`, `INDEX`, `DONE`, `SKIP`) with `///` separators.

**Integration Options:**

**Option A: Header Sub-Bar (Recommended)**
Add a thin ticker bar directly below the sticky header (or as part of it) that scrolls real-time events:
```
[CLIP] Cross-Court Kill · 00:04.32 · 1080p /// [INDEX] Practice_Reel.mp4 · ↑ 4.2 MB/s · 62% /// [DONE] 12 clips · 2m 34s
```
Only visible when there are active jobs. Provides "ambient awareness" without page switching. This is the most natural placement since the header is always visible.

**Option B: Dashboard Footer Ticker**
Place the ticker at the bottom of the dashboard page, above the footer area. Acts as a live activity monitor for users who keep the dashboard open.

**Option C: Job Detail Live Feed**
Show a ticker scoped to a single job at the top of the job detail page, displaying extraction events as they happen during processing.

---

### 5. Score Bug

**What it is:** A persistent mini-overlay (like a sports broadcast score display) showing job counts at a glance. Shows DONE/ACTIVE counts with colored dots and a bottom row with context (set number, time).

**Integration Options:**

**Option A: Floating Corner Widget (Recommended)**
Fixed-position widget in the bottom-left corner of every page (except auth). Shows:
- `DONE: 12` (green dot)
- `ACTIVE: 3` (orange dot)
- `PROCESSING · 00:47:12`

Clicking it navigates to the jobs page. Auto-hides when no jobs are active. This gives users a persistent "how are my jobs doing?" indicator without leaving their current page.

**Option B: Header Inline Widget**
Embed a compact version in the header bar, next to the avatar. Just show `●3 active` in orange when processing.

**Option C: Dashboard Card**
Add it as a dedicated card in the stats strip, replacing or augmenting the "Active Jobs" count with richer status information.

---

### 6. Confirm Delete Dialog

**What it is:** A split-view confirmation for destructive actions with a countdown timer. Shows "CURRENT STATE" vs "AFTER DELETE" side-by-side with an arrow between them. The confirm button is disabled until a 5-second countdown completes.

**Integration Options:**

**Option A: Job Deletion (Recommended)**
When deleting a job from the jobs list or job detail page, show this dialog:
- Left: `12 clips generated · 3 uploaded to R2 · 47.2 MB total`
- Right (red): `12 clips removed · R2 files deleted · Irreversible`
- 5s countdown before "Confirm Delete" activates

This is far superior to a simple "Are you sure?" modal and perfectly fits the design system's "terminal confidence" aesthetic.

**Option B: Account Deletion**
Use in the Settings danger zone for the "Delete Account" action, showing user data that will be lost.

**Option C: Video Deletion**
When deleting a video, show associated jobs and clips that will cascade-delete.

---

### 7. ASCII Spinners

**What it is:** Eight animated loading indicators using monospace characters only. Volleyball (◐◓◑◒), Braille dots, Impact (#×+·), Signal (▁▂▃▄▅), Orbit, Spike, Blocks, Bounce.

**Integration Options:**

**Option A: Inline Loading States (Recommended)**
Replace generic "Loading..." text throughout the app with themed ASCII spinners:
- **Volleyball spinner** (◐◓◑◒): Default loading indicator for data fetches
- **Signal spinner** (▁▂▃▄▅▆▇█): Upload progress indicator
- **Braille spinner** (⠋⠙⠹⠸): Subtle inline loading next to status badges
- **Impact spinner** (#×+·): Processing/slicing state in fused bars

Create a `<Spinner variant="volleyball" />` component with all 8 variants.

**Option B: Button Loading States**
Show spinners inside buttons during async operations (e.g., "Start Job" button shows volleyball spinner while creating).

**Option C: Empty State Decoration**
Use spinners as decorative elements in empty states to indicate the system is "ready and waiting."

---

### 8. Tertiary Icons

**What it is:** A grid of monospace character icons (▶ Play, ║ Pause, ↑ Upload, ✓ Complete, ✕ Error, ◈ Clip, ⊞ Grid, ≡ Menu, ⟳ Retry, ◉ Record, ◐ Half, ⌗ Tag) with hover glow effects.

**Integration Options:**

**Option A: Replace Lucide Icons (Recommended)**
The app currently uses `lucide-react` for icons. For smaller, inline icon usages, switch to monospace character icons to maintain the "terminal confidence" aesthetic:
- ▶ for play buttons on clip cards
- ↑ for upload indicators
- ✓/✕ for success/error states
- ⟳ for retry buttons
- ⌗ for clip tags/categories

Keep Lucide for complex UI elements (dropdown arrows, etc.) but use these for inline text situations.

**Option B: Action Buttons in Lists**
Replace the current `···` actions menu button in video/job rows with a row of icon-character buttons: ▶ (play), ⟳ (retry), ✕ (delete).

**Option C: Clip Category Tags**
Use ⌗ as a prefix for clip category labels in the filter pills (e.g., `⌗ Kills`, `⌗ Blocks`).

---

### 9. Animated Counters

**What it is:** Number displays that "slam into place" with count-up animations. Cards with large numbers, labels, and progress bars that fill to show proportion (e.g., `1,847 / 12,402 frames`).

**Integration Options:**

**Option A: Dashboard Stats on Load (Recommended)**
Apply the counter animation to the dashboard stats strip. When the page loads, numbers count up from 0 to their values with the "slam" easing curve. This adds satisfying weight to the numbers and matches the design principle "Motion Has Weight."

**Option B: Job Completion Summary**
When a job transitions to `COMPLETE`, show an animated summary with counters for clips generated, frames analyzed, and processing time.

**Option C: Monthly/Weekly Summary**
Add a summary section to the dashboard showing weekly stats with animated counters: clips this week, videos indexed, processing hours.

---

### 10. Streaming Terminal Log

**What it is:** Log entries that type themselves out character-by-character with syntax highlighting. Lines appear one at a time with a typing animation, colored by type (operations in blue, results in green, errors in red).

**Integration Options:**

**Option A: Job Processing Live View (Recommended)**
The most natural fit. When viewing an active job (`/jobs/[id]` with status=processing), show a streaming terminal that types out events as the backend processes:
```
> INIT  job_id=abc123
> QUERY "kills and blocks near the net"
> FETCH  downloading from R2...              OK
> ANALYZE sending to TwelveLabs...
> DETECT  segment 1/14 at 00:12.4           conf=0.92
> SLICE   cutting clip 1 with 2.0s padding
> UPLOAD  clip_001.mp4 → R2                  2.1 MB
```

This would require the backend to emit structured log events (via Supabase Realtime or SSE).

**Option B: System Status Page**
A `/status` page showing real-time system health with streaming logs from all services.

**Option C: Debug Mode**
A toggleable debug panel (activated via Settings or keyboard shortcut) that overlays streaming logs on any page, useful for troubleshooting.

---

## Priority Ranking

If implementing these in order, here's the recommended priority based on user impact and implementation effort:

| Priority | Component | Effort | Impact |
|---|---|---|---|
| 1 | Custom Toasts (Notifications) | Medium | High - Real-time feedback everywhere |
| 2 | Confirm Delete Dialog | Low | High - Safety for destructive actions |
| 3 | ASCII Spinners | Low | Medium - Polish, replaces generic loading |
| 4 | Animated Counters (Dashboard) | Low | Medium - Satisfying load animation |
| 5 | Processing Log (Job Detail) | High | High - Requires backend changes |
| 6 | Commentary Ticker (Header) | Medium | Medium - Ambient awareness |
| 7 | Data Readouts (Job Detail) | Low | Low - Visual upgrade |
| 8 | Score Bug (Floating Widget) | Medium | Medium - Persistent status |
| 9 | Tertiary Icons | Low | Low - Aesthetic consistency |
| 10 | Streaming Terminal Log | High | Medium - Requires backend streaming |
