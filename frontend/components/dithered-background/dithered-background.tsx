'use client';

import { useEffect, useRef } from 'react';
import { DitherEngine } from './dither-engine';
import { SCROLL_PARALLAX_FACTOR } from './constants';

export function DitheredBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DitherEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new DitherEngine(canvas);
    engineRef.current = engine;
    engine.start();

    const onMouseMove = (e: MouseEvent) => engine.setMouse(e.clientX, e.clientY);
    const onMouseLeave = () => engine.clearMouse();
    const onScroll = () => {
      engine.setScroll(window.scrollY);
      // Apply parallax transform directly — no React re-render
      if (canvas) {
        canvas.style.transform = `translateY(${-window.scrollY * SCROLL_PARALLAX_FACTOR}px)`;
      }
    };
    const onResize = () => engine.setViewport(window.innerWidth, window.innerHeight);

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      engine.stop();
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: '-50px',
          width: 'calc(100% + 100px)',
          height: 'calc(100% + 100px)',
          imageRendering: 'pixelated',
          willChange: 'transform',
        }}
      />
    </div>
  );
}
