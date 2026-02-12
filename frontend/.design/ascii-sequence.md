# Background Sequence — Full Specification

## Overview

A single WebGL dithered layer behind the entire app. Source volleyball footage (a spliced montage MP4) is fed to a fragment shader that applies Bayer 8x8 ordered dithering in real-time. The montage loops indefinitely as pure ambient animation — no app state reactivity.

## Technical Parameters

| Parameter | Value |
|-----------|-------|
| Rendering | WebGL fragment shader |
| Dither method | Bayer 8x8 ordered |
| Output resolution | ~120x68 (16:9) |
| Dot shape | Square pixels |
| Color | Monochrome (`--dither-base`) |
| Opacity | 4-6% |
| Framerate | 10-12fps |
| Source input | Hidden `<video>` element, sampled as texture |
| Total loop | ~30.5s |

---

## Boot Sequence (First Load Only)

Plays once when the app opens. On subsequent navigations the background is already running.

| Time | What happens |
|------|-------------|
| 0.0s | Void. Pure `--bg-void`. Nothing visible. |
| 0.3s | Sparse random dither dots scatter across the screen, flickering. Signal searching. |
| 0.8s | Dots begin clustering — no figure yet, just density shifting into patterns. |
| 1.5s | Density fade-in begins. Scene 1 (Jersey) materializes highlights-first. |
| 3.0s | Full ambient brightness reached. Montage loop begins. |

---

## Scenes

Five scenes, ordered to tell the arc of a rally. Each scene is a short looping clip dithered in real-time.

---

### Scene 1: The Jersey (5.0s hold)

**The shot:** A player from behind. Walking slowly or standing still. Jersey number and name visible across the back. Shoulders, shoulder blades, the fabric.

**Framing:** Medium shot, waist up, centered or slightly offset. Camera at shoulder height.

**Motion:** Minimal. A slight sway or slow step. Maybe a head turn near the end. Almost a still photograph that breathes.

**Impact:** None. This is the quiet beat. Let it be still.

**Why it's first:** Humanizes the sequence. Every other scene is explosive — this is the person.

**Source clip notes:** 3-5s. Nearly any clean back shot works. Slow-mo not needed. Player should be clearly brighter or darker than background for clean dither separation.

---

### Scene 2: The Serve (4.0s hold)

**The shot:** Jump serve. Full sequence: ball toss up → player elevates → arm cocks back → contact → follow-through.

**Framing:** Wide shot, full body visible. Profile angle (side-on) for maximum silhouette readability.

**Motion:** Vertical rise then explosive forward swing. Highest vertical energy in the sequence.

**Impact at 2.0s into hold — RADIAL BURST:**
- Origin: hand/ball contact point
- Characters spawn at origin and expand outward in a rough circle
- Character sequence (inner→outer): `#` → `×` → `+` → `·` → gone
- Expansion speed: ~200px/s
- Max radius: ~150px before fully faded
- Duration: 0.4s
- Peak opacity: 12%, decays to 0%
- Color: same as `--dither-base` (not accented)

**Source clip notes:** 3-4s. Slow-mo recommended — real-time serve is too fast. Contact moment should fall roughly at the 50% mark of the clip.

---

### Scene 3: The Receive (4.0s hold)

**The shot:** Platform receive. Ball incoming hard → player drops low → forearms make contact → ball redirects upward.

**Framing:** Wide shot, low camera angle (knee height, looking slightly up). Shows full body extension and the low athletic stance.

**Motion:** Low and lateral. Body braces, absorbs, redirects. Compact energy.

**Impact at 1.5s into hold — DOWNWARD SPLASH:**
- Origin: forearm/ball contact point
- Characters fall downward in a V-shaped spread
- Character sequence: `|` → `:` → `·` → `.` → gone
- Parabolic arcs (gravity simulation — accelerating downward)
- Max spread: ~100px below and 60px to each side of origin
- Duration: 0.5s
- Subtler than radial burst — fewer particles, smaller scale

**Source clip notes:** 3-4s. Low-angle footage preferred. Slow-mo helpful. Contact at ~40% mark.

---

### Scene 4: The Set (4.0s hold)

**The shot:** Overhead set. Hands rise to meet the ball → fingertips cradle briefly → clean release upward. Ball floats off the hands.

**Framing:** Medium shot, waist up, slight upward camera angle. Hands and upper body are the focus. The hands must read clearly as a silhouette.

**Motion:** Gentle. The most controlled scene. Hands rise smoothly, ball lifts. No violence here.

**Impact at 1.5s into hold — HALO:**
- Origin: ball position as it leaves the hands
- A single ring of faint dots expands outward slowly
- Expansion speed: ~50px/s
- Max radius: ~80px
- Dissolves over 0.5s
- Barely visible. A whisper, not a shout.

**Source clip notes:** 3-4s. Hands must be clearly readable in silhouette — spread fingers, ball visible above. Contact at ~40% mark.

---

### Scene 5: The Spike (5.0s hold)

**The shot:** Full spike approach. Run-up (2-3 steps) → plant → explode upward → arm cocks back → torso coils → hand meets ball at apex → follow-through downward.

**Framing:** Wide shot, full body with space above and below. Slight 3/4 angle to show arm extension and body rotation.

**Motion:** The most dynamic scene. Full-body diagonal energy. Approach is horizontal, jump is vertical, swing is diagonal.

**Impact at 2.5s into hold — DOUBLE RADIAL BURST:**
- **Burst 1 (immediate):** tight, fast ring
  - Characters: `#` `×` `*`
  - Radius: ~100px
  - Duration: 0.3s
  - Peak opacity: 14%
- **Burst 2 (0.2s delay):** wider, slower ring (the echo)
  - Characters: `·` `-` `~`
  - Radius: ~200px
  - Duration: 0.5s
  - Peak opacity: 8%
- Two concentric rings expanding at different speeds. Shockwave + echo.
- This is the biggest impact in the sequence. The climax.

**Source clip notes:** 4-5s. Slow-mo strongly recommended. Full body must be airborne and readable. Contact at ~50% mark. This scene gets the most hold time — it should feel worth it.

---

## Transitions

Every scene-to-scene boundary follows the same three-phase structure:

```
[Scene hold ends] → COLLAPSE 0.6s → NOISE 0.3s → REFORM 0.8s → [Next scene begins]
```

Total transition time: 1.7s per transition. Five transitions per loop = 8.5s of transitions.

---

### Phase 1: Collapse (0.6s)

The current dithered frame disintegrates.

**Behavior:** Each dither dot independently drifts from its scene position toward a random screen location. Dots don't all move at once — it cascades:
- Edges/extremities of the figure scatter first (fingers, feet, ball)
- Core of the figure (torso, head) dissolves last
- Creates the impression of sand blown off a surface, starting from the edges

**Dot motion:** Each dot takes an independent random curved path (not straight lines). Slight ease-out — fast departure, slow drift. No two dots go the same direction.

**End state:** Dots randomly distributed across canvas. No trace of the figure.

---

### Phase 2: Noise Hold (0.3s)

Pure static. Random dots distributed and flickering.

**Detail:** Not perfectly uniform — dots have a subtle directional drift (left-to-right across the screen). This gives the noise a feeling of current/flow rather than dead randomness.

**Density:** Same total dot count as a scene frame. The screen shouldn't feel emptier or fuller — just rearranged.

---

### Phase 3: Reform (0.8s)

The inverse of collapse. Dots migrate from random positions to the next scene's first frame.

**Cascade order (opposite of collapse):**
- Brightest/most prominent features lock in first (the ball, the peak of the silhouette, the highlight points)
- Midtones fill in around the anchored highlights
- Shadows arrive last, completing the figure

**Timing is intentionally asymmetric:** Reform (0.8s) is longer than Collapse (0.6s). The collapse is quick and violent — things fall apart fast. The reform is deliberate — the image is *found*, searched for, resolved. This asymmetry gives the transitions a natural rhythm.

---

## Full Timeline (One Loop = 30.5s)

| Timestamp | Duration | Event |
|-----------|----------|-------|
| `00.0` | 0.8s | **REFORM** — Jersey materializes from noise |
| `00.8` | 5.0s | **JERSEY** holds — player from behind, quiet |
| `05.8` | 0.6s | **COLLAPSE** — Jersey disintegrates |
| `06.4` | 0.3s | **NOISE** — static, signal searching |
| `06.7` | 0.8s | **REFORM** — Serve materializes |
| `07.5` | 4.0s | **SERVE** holds |
| `09.5` | — | ↳ IMPACT: radial burst (ball contact) |
| `11.5` | 0.6s | **COLLAPSE** — Serve disintegrates |
| `12.1` | 0.3s | **NOISE** |
| `12.4` | 0.8s | **REFORM** — Receive materializes |
| `13.2` | 4.0s | **RECEIVE** holds |
| `14.7` | — | ↳ IMPACT: downward splash (forearm contact) |
| `17.2` | 0.6s | **COLLAPSE** — Receive disintegrates |
| `17.8` | 0.3s | **NOISE** |
| `18.1` | 0.8s | **REFORM** — Set materializes |
| `18.9` | 4.0s | **SET** holds |
| `20.4` | — | ↳ IMPACT: halo (ball release) |
| `22.9` | 0.6s | **COLLAPSE** — Set disintegrates |
| `23.5` | 0.3s | **NOISE** |
| `23.8` | 0.8s | **REFORM** — Spike materializes |
| `24.6` | 5.0s | **SPIKE** holds |
| `27.1` | — | ↳ IMPACT: double radial burst (ball contact) |
| `29.6` | 0.6s | **COLLAPSE** — Spike disintegrates |
| `30.2` | 0.3s | **NOISE** |
| `30.5` | — | **LOOP** — Reform back to Jersey |

Time breakdown: 22.0s scene holds + 8.5s transitions = 30.5s total.

---

## Source Footage

### Delivery Format

A single MP4 file with all five scenes hard-cut together in order:

```
[Jersey 3-5s][Serve 3-4s][Receive 3-4s][Set 3-4s][Spike 4-5s]
```

Total source video: ~16-22s. The shader handles all transitions — the source video needs no transition effects, just clean cuts between scenes.

### Footage Rules

1. **Isolate the player.** The dither shader can't distinguish foreground from background. Use footage where the player is significantly brighter or darker than the background. Background removal before encoding is ideal — a player on solid black or solid white will dither cleanly. A player in a crowded gym will produce visual mud.

2. **Profile and 3/4 angles** produce the most readable silhouettes. Front-on shots lose depth and body line readability.

3. **Slow-motion source** is strongly recommended for action scenes (Serve, Receive, Spike). A spike happens in 0.3s at full speed — slowed to 3-4s it becomes readable and dramatic.

4. **High contrast.** Bright subject on dark background, or dark silhouette on bright background. Avoid even/flat lighting.

5. **Clean backgrounds.** Solid wall, open sky, or digitally removed. Less noise = cleaner dither = more readable figure.

6. **Generic silhouettes.** No recognizable athletes (legal risk). The figures should be iconic, not identifiable — the *sport*, not a specific person.
