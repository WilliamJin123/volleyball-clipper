import {
  BAYER_8X8,
  RENDER_WIDTH,
  RENDER_HEIGHT,
  SCENES,
  SCENE_HOLD_DURATION,
  TRANSITION_DISSOLVE,
  TRANSITION_NOISE,
  TRANSITION_RESOLVE,
  BOOT_VOID_DURATION,
  BOOT_NOISE_DURATION,
  BOOT_RESOLVE_DURATION,
  BOOT_TOTAL,
  BREATHING_PERIOD,
  BREATHING_AMPLITUDE,
  SCAN_PERIOD,
  SCAN_HALF_HEIGHT,
  SCAN_ALPHA_BOOST,
  MOUSE_REVEAL_RADIUS,
  MOUSE_REVEAL_BOOST,
  GLITCH_MIN_INTERVAL,
  GLITCH_MAX_INTERVAL,
  GLITCH_DURATION,
  GLITCH_ROWS_MIN,
  GLITCH_ROWS_MAX,
  GLITCH_SHIFT_MIN,
  GLITCH_SHIFT_MAX,
  GLITCH_ALPHA_BOOST,
  BASE_ALPHA,
  PREPROCESS_CONTRAST,
  PREPROCESS_BRIGHTNESS,
  PREPROCESS_VIGNETTE,
  NOISE_DENSITY,
  TRANSITION_JITTER,
} from './constants';

type Phase = 'boot' | 'hold' | 'dissolve' | 'noise' | 'resolve';

interface GlitchRow {
  row: number;
  offset: number;
}

export class DitherEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageData: ImageData;
  private pixelCount: number;

  // Preprocessed grayscale luminance (0-1) for each scene
  private scenes: Float32Array[] = [];
  private currentScene = 0;
  private nextScene = 1;
  private scenesLoaded = false;

  // Phase state
  private phase: Phase = 'boot';
  private phaseStart = 0;

  // Transition buffers
  private dissolveThresholds: Float32Array;
  private resolveThresholds: Float32Array;
  private dissolveSnapshot: Uint8Array; // which pixels were on at dissolve start
  private resolveTarget: Uint8Array;    // which pixels should be on after resolve

  // Effects
  private mouseX = 0;
  private mouseY = 0;
  private mouseActive = false;
  private scrollY = 0;
  private nextGlitchTime = 0;
  private glitchEndTime = 0;
  private glitchRows: GlitchRow[] = [];

  // Animation
  private rafId = 0;
  private startTime = 0;
  private lastFrameTime = 0;

  // Viewport
  private vpWidth = 1;
  private vpHeight = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = RENDER_WIDTH;
    canvas.height = RENDER_HEIGHT;
    this.ctx = canvas.getContext('2d', { willReadFrequently: false })!;
    this.imageData = this.ctx.createImageData(RENDER_WIDTH, RENDER_HEIGHT);
    this.pixelCount = RENDER_WIDTH * RENDER_HEIGHT;

    this.dissolveThresholds = new Float32Array(this.pixelCount);
    this.resolveThresholds = new Float32Array(this.pixelCount);
    this.dissolveSnapshot = new Uint8Array(this.pixelCount);
    this.resolveTarget = new Uint8Array(this.pixelCount);

    this.vpWidth = window.innerWidth || 1;
    this.vpHeight = window.innerHeight || 1;
  }

  // --- Public API ---

  async start() {
    await this.loadScenes();
    this.startTime = performance.now();
    this.phaseStart = this.startTime;
    this.lastFrameTime = this.startTime;
    this.scheduleGlitch(this.startTime);

    // Precompute resolve data for boot sequence (resolves into scene 0)
    this.computeResolveTarget(0);
    this.computeResolveThresholds(this.scenes[0]);

    this.rafId = requestAnimationFrame(this.tick);
  }

  stop() {
    cancelAnimationFrame(this.rafId);
  }

  setMouse(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
    this.mouseActive = true;
  }

  clearMouse() {
    this.mouseActive = false;
  }

  setScroll(y: number) {
    this.scrollY = y;
  }

  setViewport(w: number, h: number) {
    this.vpWidth = w || 1;
    this.vpHeight = h || 1;
  }

  // --- Image Loading & Preprocessing ---

  private async loadScenes(): Promise<void> {
    const loadImg = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    const images = await Promise.all(SCENES.map(loadImg));
    this.scenes = images.map(img => this.preprocessImage(img));
    this.scenesLoaded = true;
  }

  private preprocessImage(img: HTMLImageElement): Float32Array {
    const off = document.createElement('canvas');
    off.width = RENDER_WIDTH;
    off.height = RENDER_HEIGHT;
    const offCtx = off.getContext('2d', { willReadFrequently: true })!;
    offCtx.drawImage(img, 0, 0, RENDER_WIDTH, RENDER_HEIGHT);

    const { data } = offCtx.getImageData(0, 0, RENDER_WIDTH, RENDER_HEIGHT);
    const luminance = new Float32Array(this.pixelCount);
    const cx = RENDER_WIDTH / 2;
    const cy = RENDER_HEIGHT / 2;

    for (let y = 0; y < RENDER_HEIGHT; y++) {
      for (let x = 0; x < RENDER_WIDTH; x++) {
        const i = y * RENDER_WIDTH + x;
        const pi = i * 4;

        // Grayscale
        let gray = (data[pi] * 0.299 + data[pi + 1] * 0.587 + data[pi + 2] * 0.114) / 255;

        // Contrast around midpoint
        gray = (gray - 0.5) * PREPROCESS_CONTRAST + 0.5 + PREPROCESS_BRIGHTNESS;

        // Vignette — quadratic falloff from center
        const dx = (x - cx) / cx;
        const dy = (y - cy) / cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / Math.SQRT2;
        gray *= 1 - PREPROCESS_VIGNETTE * dist * dist;

        luminance[i] = Math.max(0, Math.min(1, gray));
      }
    }
    return luminance;
  }

  // --- Transition Helpers ---

  private computeDissolveThresholds(): void {
    // Find centroid of "on" pixels — edges dissolve first, core last
    let cx = 0, cy = 0, count = 0;
    for (let y = 0; y < RENDER_HEIGHT; y++) {
      for (let x = 0; x < RENDER_WIDTH; x++) {
        if (this.dissolveSnapshot[y * RENDER_WIDTH + x]) {
          cx += x;
          cy += y;
          count++;
        }
      }
    }
    if (count === 0) return;
    cx /= count;
    cy /= count;

    // Max distance for normalization
    let maxDist = 0;
    for (let y = 0; y < RENDER_HEIGHT; y++) {
      for (let x = 0; x < RENDER_WIDTH; x++) {
        if (this.dissolveSnapshot[y * RENDER_WIDTH + x]) {
          const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
          if (d > maxDist) maxDist = d;
        }
      }
    }

    for (let y = 0; y < RENDER_HEIGHT; y++) {
      for (let x = 0; x < RENDER_WIDTH; x++) {
        const i = y * RENDER_WIDTH + x;
        if (this.dissolveSnapshot[i]) {
          const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
          const norm = maxDist > 0 ? d / maxDist : 0;
          // Far from center → low threshold → dissolves early
          const jitter = (Math.random() - 0.5) * TRANSITION_JITTER;
          this.dissolveThresholds[i] = clamp((1 - norm) * 0.8 + 0.1 + jitter);
        } else {
          this.dissolveThresholds[i] = 0;
        }
      }
    }
  }

  private computeResolveThresholds(luminance: Float32Array): void {
    for (let i = 0; i < this.pixelCount; i++) {
      // Bright pixels resolve first (low threshold)
      const jitter = (Math.random() - 0.5) * TRANSITION_JITTER;
      this.resolveThresholds[i] = clamp((1 - luminance[i]) * 0.8 + 0.1 + jitter);
    }
  }

  private computeResolveTarget(sceneIndex: number): void {
    const lum = this.scenes[sceneIndex];
    if (!lum) return;
    for (let y = 0; y < RENDER_HEIGHT; y++) {
      for (let x = 0; x < RENDER_WIDTH; x++) {
        const i = y * RENDER_WIDTH + x;
        this.resolveTarget[i] = lum[i] > BAYER_8X8[y & 7][x & 7] ? 1 : 0;
      }
    }
  }

  private snapshotCurrentDither(time: number): void {
    const lum = this.scenes[this.currentScene];
    if (!lum) return;
    const breathOffset = Math.sin(((time % BREATHING_PERIOD) / BREATHING_PERIOD) * Math.PI * 2) * BREATHING_AMPLITUDE;
    for (let y = 0; y < RENDER_HEIGHT; y++) {
      for (let x = 0; x < RENDER_WIDTH; x++) {
        const i = y * RENDER_WIDTH + x;
        this.dissolveSnapshot[i] = (lum[i] + breathOffset) > BAYER_8X8[y & 7][x & 7] ? 1 : 0;
      }
    }
  }

  // --- Glitch ---

  private scheduleGlitch(time: number): void {
    this.nextGlitchTime = time + GLITCH_MIN_INTERVAL + Math.random() * (GLITCH_MAX_INTERVAL - GLITCH_MIN_INTERVAL);
    this.glitchEndTime = 0;
    this.glitchRows = [];
  }

  private updateGlitch(time: number): void {
    // Glitch active and ended
    if (this.glitchEndTime > 0 && time > this.glitchEndTime) {
      this.scheduleGlitch(time);
      return;
    }
    // Time to trigger a new glitch
    if (this.glitchEndTime === 0 && time >= this.nextGlitchTime) {
      this.glitchEndTime = time + GLITCH_DURATION;
      const numRows = GLITCH_ROWS_MIN + Math.floor(Math.random() * (GLITCH_ROWS_MAX - GLITCH_ROWS_MIN + 1));
      this.glitchRows = [];
      for (let r = 0; r < numRows; r++) {
        const shift = GLITCH_SHIFT_MIN + Math.floor(Math.random() * (GLITCH_SHIFT_MAX - GLITCH_SHIFT_MIN + 1));
        this.glitchRows.push({
          row: Math.floor(Math.random() * RENDER_HEIGHT),
          offset: (Math.random() > 0.5 ? 1 : -1) * shift,
        });
      }
    }
  }

  private applyGlitch(): void {
    if (this.glitchRows.length === 0) return;
    const data = this.imageData.data;
    const rowBytes = RENDER_WIDTH * 4;

    for (const { row, offset } of this.glitchRows) {
      if (row < 0 || row >= RENDER_HEIGHT) continue;
      const rowStart = row * rowBytes;
      const buf = new Uint8ClampedArray(rowBytes);

      for (let x = 0; x < RENDER_WIDTH; x++) {
        const srcX = x - offset;
        if (srcX >= 0 && srcX < RENDER_WIDTH) {
          const si = rowStart + srcX * 4;
          const di = x * 4;
          buf[di] = data[si];
          buf[di + 1] = data[si + 1];
          buf[di + 2] = data[si + 2];
          buf[di + 3] = Math.min(255, data[si + 3] + GLITCH_ALPHA_BOOST);
        }
      }
      // Write row back
      for (let b = 0; b < rowBytes; b++) {
        data[rowStart + b] = buf[b];
      }
    }
  }

  // --- Per-pixel Alpha ---

  private getAlpha(x: number, y: number, time: number): number {
    let alpha = BASE_ALPHA;

    // Scan drift: faint bright band sweeping top to bottom
    const scanY = ((time % SCAN_PERIOD) / SCAN_PERIOD) * RENDER_HEIGHT;
    const scanDist = Math.abs(y - scanY);
    if (scanDist < SCAN_HALF_HEIGHT) {
      alpha += SCAN_ALPHA_BOOST * (1 - scanDist / SCAN_HALF_HEIGHT);
    }

    // Mouse reveal: radial glow at cursor
    if (this.mouseActive) {
      const mx = (this.mouseX / this.vpWidth) * RENDER_WIDTH;
      const my = (this.mouseY / this.vpHeight) * RENDER_HEIGHT;
      const r = (MOUSE_REVEAL_RADIUS / this.vpWidth) * RENDER_WIDTH;
      const dx = x - mx;
      const dy = y - my;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < r) {
        const f = 1 - d / r;
        alpha += MOUSE_REVEAL_BOOST * f * f; // quadratic falloff
      }
    }

    return alpha;
  }

  private setPixel(x: number, y: number, alpha: number): void {
    const i = (y * RENDER_WIDTH + x) * 4;
    const d = this.imageData.data;
    d[i] = 255;
    d[i + 1] = 255;
    d[i + 2] = 255;
    d[i + 3] = Math.round(Math.min(1, alpha) * 255);
  }

  // --- Render Phases ---

  private renderHoldFrame(time: number): void {
    const lum = this.scenes[this.currentScene];
    if (!lum) return;
    const breathPhase = ((time % BREATHING_PERIOD) / BREATHING_PERIOD) * Math.PI * 2;
    const breathOffset = Math.sin(breathPhase) * BREATHING_AMPLITUDE;

    for (let y = 0; y < RENDER_HEIGHT; y++) {
      for (let x = 0; x < RENDER_WIDTH; x++) {
        const i = y * RENDER_WIDTH + x;
        if ((lum[i] + breathOffset) > BAYER_8X8[y & 7][x & 7]) {
          this.setPixel(x, y, this.getAlpha(x, y, time));
        }
      }
    }
  }

  private renderDissolveFrame(progress: number, time: number): void {
    for (let y = 0; y < RENDER_HEIGHT; y++) {
      for (let x = 0; x < RENDER_WIDTH; x++) {
        const i = y * RENDER_WIDTH + x;
        if (this.dissolveSnapshot[i] && progress < this.dissolveThresholds[i]) {
          this.setPixel(x, y, this.getAlpha(x, y, time));
        }
      }
    }
  }

  private renderNoiseFrame(time: number): void {
    for (let y = 0; y < RENDER_HEIGHT; y++) {
      for (let x = 0; x < RENDER_WIDTH; x++) {
        if (Math.random() < NOISE_DENSITY) {
          this.setPixel(x, y, this.getAlpha(x, y, time));
        }
      }
    }
  }

  private renderResolveFrame(progress: number, time: number): void {
    // Resolved pixels appear
    for (let y = 0; y < RENDER_HEIGHT; y++) {
      for (let x = 0; x < RENDER_WIDTH; x++) {
        const i = y * RENDER_WIDTH + x;
        if (this.resolveTarget[i] && progress > this.resolveThresholds[i]) {
          this.setPixel(x, y, this.getAlpha(x, y, time));
        }
      }
    }
    // Residual noise for pixels not yet resolved — fades as resolve completes
    const noiseAmount = (1 - progress) * NOISE_DENSITY * 0.5;
    if (noiseAmount > 0.005) {
      for (let y = 0; y < RENDER_HEIGHT; y++) {
        for (let x = 0; x < RENDER_WIDTH; x++) {
          const i = y * RENDER_WIDTH + x;
          const pi = (y * RENDER_WIDTH + x) * 4;
          // Only add noise where pixel isn't already set
          if (this.imageData.data[pi + 3] === 0 && Math.random() < noiseAmount) {
            this.setPixel(x, y, this.getAlpha(x, y, time) * 0.5);
          }
        }
      }
    }
  }

  private renderBootFrame(time: number): void {
    const elapsed = time - this.startTime;

    if (elapsed < BOOT_VOID_DURATION) {
      // Pure void — nothing
      return;
    }

    if (elapsed < BOOT_VOID_DURATION + BOOT_NOISE_DURATION) {
      // Scattered dots, density increasing
      const t = (elapsed - BOOT_VOID_DURATION) / BOOT_NOISE_DURATION;
      const density = t * NOISE_DENSITY;
      for (let y = 0; y < RENDER_HEIGHT; y++) {
        for (let x = 0; x < RENDER_WIDTH; x++) {
          if (Math.random() < density) {
            const flicker = 0.3 + Math.random() * 0.7;
            this.setPixel(x, y, BASE_ALPHA * flicker);
          }
        }
      }
      return;
    }

    if (!this.scenesLoaded) {
      // Still loading images — show noise placeholder
      for (let y = 0; y < RENDER_HEIGHT; y++) {
        for (let x = 0; x < RENDER_WIDTH; x++) {
          if (Math.random() < NOISE_DENSITY) {
            this.setPixel(x, y, BASE_ALPHA);
          }
        }
      }
      return;
    }

    // Resolve into first scene
    const resolveElapsed = elapsed - BOOT_VOID_DURATION - BOOT_NOISE_DURATION;
    const progress = Math.min(1, resolveElapsed / BOOT_RESOLVE_DURATION);
    this.renderResolveFrame(progress, time);
  }

  // --- Phase Transitions ---

  private startDissolve(time: number): void {
    this.phase = 'dissolve';
    this.phaseStart = time;
    this.nextScene = (this.currentScene + 1) % this.scenes.length;
    this.snapshotCurrentDither(time);
    this.computeDissolveThresholds();
  }

  private startNoise(time: number): void {
    this.phase = 'noise';
    this.phaseStart = time;
  }

  private startResolve(time: number): void {
    this.phase = 'resolve';
    this.phaseStart = time;
    this.computeResolveTarget(this.nextScene);
    this.computeResolveThresholds(this.scenes[this.nextScene]);
  }

  private startHold(time: number): void {
    this.currentScene = this.nextScene;
    this.phase = 'hold';
    this.phaseStart = time;
  }

  // --- Main Loop ---

  private tick = (timestamp: number): void => {
    // Handle tab-away: if more than 1s gap, reset timing to avoid fast-forward
    const gap = timestamp - this.lastFrameTime;
    if (gap > 1000) {
      const adjust = gap - 16;
      this.startTime += adjust;
      this.phaseStart += adjust;
      if (this.nextGlitchTime > 0) this.nextGlitchTime += adjust;
      if (this.glitchEndTime > 0) this.glitchEndTime += adjust;
    }
    this.lastFrameTime = timestamp;

    // Clear canvas
    this.imageData.data.fill(0);

    // Render current phase
    switch (this.phase) {
      case 'boot': {
        this.renderBootFrame(timestamp);
        const bootElapsed = timestamp - this.startTime;
        if (this.scenesLoaded && bootElapsed >= BOOT_TOTAL) {
          this.phase = 'hold';
          this.phaseStart = timestamp;
        }
        break;
      }

      case 'hold': {
        this.renderHoldFrame(timestamp);
        if (timestamp - this.phaseStart >= SCENE_HOLD_DURATION) {
          this.startDissolve(timestamp);
        }
        break;
      }

      case 'dissolve': {
        const progress = (timestamp - this.phaseStart) / TRANSITION_DISSOLVE;
        if (progress >= 1) {
          this.startNoise(timestamp);
          this.renderNoiseFrame(timestamp);
        } else {
          this.renderDissolveFrame(progress, timestamp);
        }
        break;
      }

      case 'noise': {
        this.renderNoiseFrame(timestamp);
        if (timestamp - this.phaseStart >= TRANSITION_NOISE) {
          this.startResolve(timestamp);
        }
        break;
      }

      case 'resolve': {
        const progress = (timestamp - this.phaseStart) / TRANSITION_RESOLVE;
        if (progress >= 1) {
          this.startHold(timestamp);
          this.renderHoldFrame(timestamp);
        } else {
          this.renderResolveFrame(progress, timestamp);
        }
        break;
      }
    }

    // Post-processing effects
    this.updateGlitch(timestamp);
    this.applyGlitch();

    // Commit to canvas
    this.ctx.putImageData(this.imageData, 0, 0);

    this.rafId = requestAnimationFrame(this.tick);
  };
}

function clamp(v: number, min = 0, max = 1): number {
  return v < min ? min : v > max ? max : v;
}
