// Bayer 8x8 ordered dithering matrix (normalized 0-1)
// Classic pattern that produces the characteristic crosshatch look
const BAYER_RAW = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];
export const BAYER_8X8 = BAYER_RAW.map(row => row.map(v => v / 64));

// Scene textures preprocessed at this resolution (WebGL renders at native viewport res)
export const SCENE_TEX_WIDTH = 1920;
export const SCENE_TEX_HEIGHT = 1080;

// Scene image paths — ordered to tell a rally narrative
export const SCENES = [
  '/vb-2.png', // serve — jump serve, clean silhouette
  '/vb-5.png', // receive — platform dig, low stance
  '/vb-3.png', // set — overhead set
  '/vb-4.png', // spike — approach, airborne
  '/vb-1.png', // rally — team spike, multiple players
  '/vb-6.png', // kill — spike over blockers
] as const;

// --- Timing (ms) ---
export const SCENE_HOLD_DURATION = 8000;
export const TRANSITION_DISSOLVE = 1200;
export const TRANSITION_NOISE = 150;
export const TRANSITION_RESOLVE = 1800;
export const TRANSITION_TOTAL = TRANSITION_DISSOLVE + TRANSITION_NOISE + TRANSITION_RESOLVE;

// Boot sequence phases
export const BOOT_VOID_DURATION = 200;
export const BOOT_NOISE_DURATION = 400;
export const BOOT_RESOLVE_DURATION = 1400;
export const BOOT_TOTAL = BOOT_VOID_DURATION + BOOT_NOISE_DURATION + BOOT_RESOLVE_DURATION;

// --- Effects ---

// Breathing: dither threshold oscillates on a sine wave
export const BREATHING_PERIOD = 10000;
export const BREATHING_AMPLITUDE = 0.04;

// Scan drift: a faint bright band sweeps top-to-bottom
export const SCAN_PERIOD = 8000;
export const SCAN_HALF_HEIGHT = 6; // pixels in canvas space (scaled with resolution)
export const SCAN_ALPHA_BOOST = 0.02;

// Mouse reveal: radial glow follows cursor
export const MOUSE_REVEAL_RADIUS = 250; // screen pixels
export const MOUSE_REVEAL_BOOST = 0.07;

// Signal glitch: occasional horizontal row shifts
export const GLITCH_MIN_INTERVAL = 20000;
export const GLITCH_MAX_INTERVAL = 30000;
export const GLITCH_DURATION = 80;
export const GLITCH_ROWS_MIN = 2;
export const GLITCH_ROWS_MAX = 4;
export const GLITCH_SHIFT_MIN = 3;
export const GLITCH_SHIFT_MAX = 8;
export const GLITCH_ALPHA_BOOST = 30; // added to pixel alpha (0-255)

// Scroll parallax
export const SCROLL_PARALLAX_FACTOR = 0.05;

// --- Visual ---
export const BASE_ALPHA = 0.08;

// Image preprocessing — crush backgrounds, isolate players
export const PREPROCESS_CONTRAST = 2.5;
export const PREPROCESS_BRIGHTNESS = -0.1;
export const PREPROCESS_VIGNETTE = 0.7;

// Noise density during transitions/boot (fraction of pixels lit)
export const NOISE_DENSITY = 0.08;

// Dissolve/resolve jitter for organic feel
export const TRANSITION_JITTER = 0.15;
