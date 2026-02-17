import {
  BAYER_8X8,
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
} from './constants';

const SCENE_W = 1920;
const SCENE_H = 1080;
const PAD = 50; // matches CSS inset: -50px

// --- Shaders ---

const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}`;

const FRAG = `precision highp float;
uniform sampler2D tCur,tNxt,tBay,tNoi;
uniform vec2 res;
uniform int phase;
uniform float prog,breath,time,scanY,scanH,scanA;
uniform vec2 mouse;
uniform float mouseOn,mouseR,mouseA,baseA,nDens;
uniform vec2 nOff;
uniform vec4 gY,gX;
uniform float gA,inv;

const float SAR=1920.0/1080.0;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}

void main(){
  vec2 fc=vec2(gl_FragCoord.x,res.y-gl_FragCoord.y);
  float xs=0.0,gb=0.0;
  if(gY.x>=0.0&&abs(fc.y-gY.x)<1.0){xs+=gX.x;gb=gA;}
  if(gY.y>=0.0&&abs(fc.y-gY.y)<1.0){xs+=gX.y;gb=gA;}
  if(gY.z>=0.0&&abs(fc.y-gY.z)<1.0){xs+=gX.z;gb=gA;}
  if(gY.w>=0.0&&abs(fc.y-gY.w)<1.0){xs+=gX.w;gb=gA;}
  vec2 c=vec2(fc.x+xs,fc.y);
  vec2 uv=c/res;
  // Cover-fit: maintain scene 16:9 aspect ratio, crop excess
  float car=res.x/res.y;
  float r=car/SAR;
  vec2 sUv;
  float drift=sin(time*0.06)*0.03;
  if(r>1.0){sUv=vec2(uv.x+drift,(uv.y-0.5)/r+0.5);}
  else{
    float panAmp=max((1.0-r)*0.5,0.03);
    float cx=0.5+sin(time*0.06)*panAmp;
    sUv=vec2((uv.x-0.5)*r+cx,uv.y);
  }
  float bay=texture2D(tBay,fract(c/8.0)).r;
  float noi=texture2D(tNoi,(c+nOff)/512.0).r;
  float lC=texture2D(tCur,sUv).r;
  float lN=texture2D(tNxt,sUv).r;
  if(inv>0.5){lC=1.0-lC;lN=1.0-lN;}
  bool on=false;
  float am=1.0;
  if(phase==0){gl_FragColor=vec4(0);return;}
  else if(phase==1){float h=hash(c+time);on=h<prog*nDens;am=0.3+h*0.7;}
  else if(phase==2){
    bool tgt=lC>bay;
    float th=(1.0-lC)*0.8+0.1+(noi-0.5)*0.15;
    th=clamp(th,0.0,1.0);
    on=tgt&&prog>th;
    float na=(1.0-prog)*nDens*0.5;
    if(!on&&hash(c+time)<na){on=true;am=0.5;}
  }
  else if(phase==3){on=(lC+breath)>bay;}
  else if(phase==4){
    float t=prog*prog*(3.0-2.0*prog);
    float dStr=sin(prog*3.14159)*0.06;
    vec2 nUv=uv*2.5;
    float nx=texture2D(tNoi,nUv+nOff/512.0+vec2(prog*0.5,0.0)).r-0.5;
    float ny=texture2D(tNoi,nUv+nOff/512.0+vec2(0.0,prog*0.5+0.3)).r-0.5;
    float swirl=texture2D(tNoi,uv*1.2+nOff/512.0).r*6.28+prog*1.5;
    vec2 disp=vec2(nx*cos(swirl)-ny*sin(swirl),nx*sin(swirl)+ny*cos(swirl))*dStr;
    float lA=texture2D(tCur,clamp(sUv+disp,0.0,1.0)).r;
    float lB=texture2D(tNxt,clamp(sUv-disp,0.0,1.0)).r;
    if(inv>0.5){lA=1.0-lA;lB=1.0-lB;}
    float lum=mix(lA,lB,t);
    float bFade=1.0-sin(prog*3.14159)*0.6;
    on=(lum+breath*bFade)>bay;
    float sparkle=sin(prog*3.14159)*0.015;
    if(!on&&hash(c+time)<sparkle){on=true;am=0.6;}
  }
  if(!on){gl_FragColor=vec4(0);return;}
  float a=baseA;
  float sd=abs(fc.y-scanY*res.y);
  if(sd<scanH)a+=scanA*(1.0-sd/scanH);
  if(mouseOn>0.5){float md=length(fc-mouse);if(md<mouseR){float f=1.0-md/mouseR;a+=mouseA*f*f;}}
  a=a*am+gb;
  float col=inv>0.5?0.0:1.0;
  gl_FragColor=vec4(col,col,col,clamp(a,0.0,1.0));
}`;

// --- Types ---

type Phase = 'boot' | 'hold' | 'morph';
interface Glitch { row: number; offset: number }

// --- Engine ---

// Detect mobile once at module level
const IS_MOBILE = typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const MOBILE_DPR_CAP = 1.5;
const MOBILE_FRAME_INTERVAL = 1000 / 30; // 30fps on mobile

export class DitherEngine {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private canvas: HTMLCanvasElement;
  private loc: Record<string, WebGLUniformLocation | null> = {};

  private sceneTex: WebGLTexture[] = [];
  private bayTex!: WebGLTexture;
  private noiTex!: WebGLTexture;
  private sceneLum: Float32Array[] = [];
  private curScene = 0;
  private nxtScene = 1;
  private loaded = false;

  private phase: Phase = 'boot';
  private phaseStart = 0;
  private mx = 0; private my = 0; private mOn = false;
  private nextGlitchTime = 0;
  private glitchEnd = 0;
  private gRows: Glitch[] = [];
  private noiseOff: [number, number] = [0, 0];

  private rafId = 0;
  private t0 = 0;
  private lastT = 0;
  private lastDrawT = 0;
  private vpW = 1; private vpH = 1;
  private dpr = 1;
  private isMobile: boolean;
  private invertVal = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.isMobile = IS_MOBILE;
    this.dpr = this.isMobile
      ? Math.min(devicePixelRatio || 1, MOBILE_DPR_CAP)
      : Math.min(devicePixelRatio || 1, 3);
    this.vpW = innerWidth || 1;
    this.vpH = innerHeight || 1;

    const gl = canvas.getContext('webgl', {
      alpha: true, premultipliedAlpha: false, antialias: false,
    })!;
    this.gl = gl;

    const vs = this.mkShader(gl.VERTEX_SHADER, VERT);
    const fs = this.mkShader(gl.FRAGMENT_SHADER, FRAG);
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);
    gl.useProgram(this.program);

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(this.program, 'a');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);

    const uNames = [
      'tCur','tNxt','tBay','tNoi','res','phase','prog','breath','time',
      'scanY','scanH','scanA','mouse','mouseOn','mouseR','mouseA',
      'baseA','nDens','nOff','gY','gX','gA','inv',
    ];
    for (const n of uNames) this.loc[n] = gl.getUniformLocation(this.program, n);

    this.bayTex = this.mkTex(8, 8,
      new Uint8Array(BAYER_8X8.flat().map(v => Math.round(v * 255))),
      gl.NEAREST);

    const nd = new Uint8Array(512 * 512);
    for (let off = 0; off < nd.length; off += 65536)
      crypto.getRandomValues(nd.subarray(off, Math.min(off + 65536, nd.length)));
    this.noiTex = this.mkTex(512, 512, nd, gl.LINEAR);

    this.resize();
  }

  // --- Public API ---

  async start() {
    await this.loadScenes();
    this.t0 = performance.now();
    this.phaseStart = this.t0;
    this.lastT = this.t0;
    this.schedGlitch(this.t0);
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop() { cancelAnimationFrame(this.rafId); }

  setMouse(x: number, y: number) {
    if (this.isMobile) return; // skip mouse tracking on touch devices
    this.mx = x; this.my = y; this.mOn = true;
  }
  clearMouse() { this.mOn = false; }
  setInvert(v: number) { this.invertVal = v; }
  setScroll(_y: number) { /* parallax handled by CSS transform */ }

  setViewport(w: number, h: number) {
    this.vpW = w || 1; this.vpH = h || 1;
    this.dpr = this.isMobile
      ? Math.min(devicePixelRatio || 1, MOBILE_DPR_CAP)
      : Math.min(devicePixelRatio || 1, 3);
    this.resize();
  }

  // --- GL Helpers ---

  private mkShader(type: number, src: string) {
    const gl = this.gl, s = gl.createShader(type)!;
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      console.error('Shader:', gl.getShaderInfoLog(s));
    return s;
  }

  private mkTex(w: number, h: number, data: Uint8Array, filt: number, wrap?: number) {
    const gl = this.gl, t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, w, h, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
    const wrapMode = wrap ?? gl.REPEAT;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMode);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMode);
    return t;
  }

  private resize() {
    const w = Math.round((this.vpW + PAD * 2) * this.dpr);
    const h = Math.round((this.vpH + PAD * 2) * this.dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
  }

  // --- Scene Loading ---

  private async loadScenes() {
    const load = (s: string) => new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = s;
    });
    const imgs = await Promise.all(SCENES.map(load));
    for (const img of imgs) {
      const lum = this.preprocess(img);
      this.sceneLum.push(lum);
      const d = new Uint8Array(lum.length);
      for (let i = 0; i < lum.length; i++) d[i] = Math.round(lum[i] * 255);
      this.sceneTex.push(this.mkTex(SCENE_W, SCENE_H, d, this.gl.LINEAR, this.gl.CLAMP_TO_EDGE));
    }
    this.loaded = true;
  }

  private preprocess(img: HTMLImageElement): Float32Array {
    const c = document.createElement('canvas');
    c.width = SCENE_W; c.height = SCENE_H;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, SCENE_W, SCENE_H);
    const { data } = ctx.getImageData(0, 0, SCENE_W, SCENE_H);
    const n = SCENE_W * SCENE_H, lum = new Float32Array(n);
    const cx = SCENE_W / 2, cy = SCENE_H / 2;
    for (let y = 0; y < SCENE_H; y++) {
      for (let x = 0; x < SCENE_W; x++) {
        const i = y * SCENE_W + x, pi = i * 4;
        let g = (data[pi] * 0.299 + data[pi+1] * 0.587 + data[pi+2] * 0.114) / 255;
        g = (g - 0.5) * PREPROCESS_CONTRAST + 0.5 + PREPROCESS_BRIGHTNESS;
        const dx = (x - cx) / cx, dy = (y - cy) / cy;
        g *= 1 - PREPROCESS_VIGNETTE * (dx * dx + dy * dy) / 2;
        lum[i] = Math.max(0, Math.min(1, g));
      }
    }
    return lum;
  }

  // --- Glitch ---

  private schedGlitch(t: number) {
    this.nextGlitchTime = t + GLITCH_MIN_INTERVAL + Math.random() * (GLITCH_MAX_INTERVAL - GLITCH_MIN_INTERVAL);
    this.glitchEnd = 0;
    this.gRows = [];
  }

  private updGlitch(t: number) {
    if (this.glitchEnd > 0 && t > this.glitchEnd) { this.schedGlitch(t); return; }
    if (this.glitchEnd === 0 && t >= this.nextGlitchTime) {
      this.glitchEnd = t + GLITCH_DURATION;
      const n = GLITCH_ROWS_MIN + Math.floor(Math.random() * (GLITCH_ROWS_MAX - GLITCH_ROWS_MIN + 1));
      this.gRows = [];
      for (let i = 0; i < n; i++) {
        const s = GLITCH_SHIFT_MIN + Math.floor(Math.random() * (GLITCH_SHIFT_MAX - GLITCH_SHIFT_MIN + 1));
        this.gRows.push({
          row: Math.floor(Math.random() * this.canvas.height),
          offset: (Math.random() > 0.5 ? 1 : -1) * s * this.dpr,
        });
      }
    }
  }

  // --- Phase Transitions ---

  private startMorph(t: number) {
    this.phase = 'morph'; this.phaseStart = t;
    this.nxtScene = (this.curScene + 1) % this.sceneTex.length;
    this.noiseOff = [Math.random() * 512, Math.random() * 512];
  }

  private startHold(t: number) {
    this.curScene = this.nxtScene;
    this.phase = 'hold'; this.phaseStart = t;
  }

  // --- Main Loop ---

  private tick = (ts: number) => {
    const gap = ts - this.lastT;
    if (gap > 1000) {
      const adj = gap - 16;
      this.t0 += adj; this.phaseStart += adj;
      if (this.nextGlitchTime > 0) this.nextGlitchTime += adj;
      if (this.glitchEnd > 0) this.glitchEnd += adj;
    }
    this.lastT = ts;

    // Throttle to 30fps on mobile
    if (this.isMobile && (ts - this.lastDrawT) < MOBILE_FRAME_INTERVAL) {
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }
    this.lastDrawT = ts;

    this.resize();
    this.updGlitch(ts);

    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex[this.curScene] || this.bayTex);
    gl.uniform1i(this.loc.tCur!, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTex[this.nxtScene] || this.bayTex);
    gl.uniform1i(this.loc.tNxt!, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.bayTex);
    gl.uniform1i(this.loc.tBay!, 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.noiTex);
    gl.uniform1i(this.loc.tNoi!, 3);

    gl.uniform2f(this.loc.res!, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.loc.time!, ts * 0.001);

    // Phase logic
    let phaseInt = 3;
    let progress = 0;
    let breathVal = Math.sin(((ts % BREATHING_PERIOD) / BREATHING_PERIOD) * Math.PI * 2) * BREATHING_AMPLITUDE;

    switch (this.phase) {
      case 'boot': {
        const elapsed = ts - this.t0;
        if (elapsed < BOOT_VOID_DURATION) {
          phaseInt = 0;
        } else if (elapsed < BOOT_VOID_DURATION + BOOT_NOISE_DURATION) {
          phaseInt = 1;
          progress = (elapsed - BOOT_VOID_DURATION) / BOOT_NOISE_DURATION;
        } else if (!this.loaded) {
          phaseInt = 1; progress = 1.0; // full density noise while loading
        } else {
          phaseInt = 2;
          progress = Math.min(1, (elapsed - BOOT_VOID_DURATION - BOOT_NOISE_DURATION) / BOOT_RESOLVE_DURATION);
        }
        if (this.loaded && elapsed >= BOOT_TOTAL) {
          this.phase = 'hold'; this.phaseStart = ts;
          phaseInt = 3;
        }
        break;
      }
      case 'hold': {
        phaseInt = 3;
        if (ts - this.phaseStart >= SCENE_HOLD_DURATION) this.startMorph(ts);
        break;
      }
      case 'morph': {
        const morphDuration = TRANSITION_DISSOLVE + TRANSITION_NOISE + TRANSITION_RESOLVE;
        progress = (ts - this.phaseStart) / morphDuration;
        if (progress >= 1) { this.startHold(ts); phaseInt = 3; }
        else phaseInt = 4;
        break;
      }
    }

    gl.uniform1i(this.loc.phase!, phaseInt);
    gl.uniform1f(this.loc.prog!, Math.max(0, Math.min(1, progress)));
    gl.uniform1f(this.loc.breath!, breathVal);

    // Scan line
    const scanFrac = (ts % SCAN_PERIOD) / SCAN_PERIOD;
    const scanHPx = SCAN_HALF_HEIGHT * (this.canvas.height / 270);
    gl.uniform1f(this.loc.scanY!, scanFrac);
    gl.uniform1f(this.loc.scanH!, scanHPx);
    gl.uniform1f(this.loc.scanA!, SCAN_ALPHA_BOOST);

    // Mouse (convert viewport coords to canvas-pixel coords, Y-down)
    gl.uniform2f(this.loc.mouse!,
      (this.mx + PAD) * this.dpr,
      (this.my + PAD) * this.dpr);
    gl.uniform1f(this.loc.mouseOn!, this.mOn ? 1 : 0);
    gl.uniform1f(this.loc.mouseR!, MOUSE_REVEAL_RADIUS * this.dpr);
    gl.uniform1f(this.loc.mouseA!, MOUSE_REVEAL_BOOST);

    gl.uniform1f(this.loc.baseA!, BASE_ALPHA);
    gl.uniform1f(this.loc.nDens!, NOISE_DENSITY);

    gl.uniform2f(this.loc.nOff!, this.noiseOff[0], this.noiseOff[1]);

    // Glitch rows (up to 4)
    const gy = [-1, -1, -1, -1], gx = [0, 0, 0, 0];
    for (let i = 0; i < Math.min(4, this.gRows.length); i++) {
      gy[i] = this.gRows[i].row;
      gx[i] = this.gRows[i].offset;
    }
    gl.uniform4f(this.loc.gY!, gy[0], gy[1], gy[2], gy[3]);
    gl.uniform4f(this.loc.gX!, gx[0], gx[1], gx[2], gx[3]);
    gl.uniform1f(this.loc.gA!, GLITCH_ALPHA_BOOST / 255);
    gl.uniform1f(this.loc.inv!, this.invertVal);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.rafId = requestAnimationFrame(this.tick);
  };
}
