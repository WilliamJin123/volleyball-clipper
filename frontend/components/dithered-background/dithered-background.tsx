'use client';

import { useEffect, useRef, useCallback } from 'react';
import { DitherEngine } from './dither-engine';
import { SCROLL_PARALLAX_FACTOR } from './constants';

function readInvertVar(): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--dither-invert').trim();
  return v === '1' ? 1 : 0;
}

export function DitheredBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DitherEngine | null>(null);

  const syncInvert = useCallback(() => {
    engineRef.current?.setInvert(readInvertVar());
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new DitherEngine(canvas);
    engineRef.current = engine;
    engine.setInvert(readInvertVar());
    engine.start();

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const onMouseMove = (e: MouseEvent) => engine.setMouse(e.clientX, e.clientY);
    const onMouseLeave = () => engine.clearMouse();
    const onScroll = () => {
      engine.setScroll(window.scrollY);
      if (canvas) {
        canvas.style.transform = `translateY(${-window.scrollY * SCROLL_PARALLAX_FACTOR}px)`;
      }
    };
    const onResize = () => engine.setViewport(window.innerWidth, window.innerHeight);

    // Watch for theme changes (--dither-invert is set on documentElement.style)
    const observer = new MutationObserver(syncInvert);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

    if (!isMobile) {
      window.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseleave', onMouseLeave);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      engine.stop();
      observer.disconnect();
      if (!isMobile) {
        window.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseleave', onMouseLeave);
      }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [syncInvert]);

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
          imageRendering: 'crisp-edges',
          willChange: 'transform',
        }}
      />
    </div>
  );
}
