import React, { useEffect, useRef, useState } from 'react';
import { animate, useMotionValue } from 'motion/react';
import { useMotionPreference } from '../../hooks/useMotionPreference';
import { CUBOID_COLORS, fallbackCuboid } from '../../lib/hero-cuboids';
import { createCuboidRenderer } from '../../lib/cuboid-renderer';

export function CuboidSculpture({ stage }) {
  const canvas = useRef(null);
  const pointer = useRef({ x: 0, y: 0, squeeze: 0 });
  const [ready, setReady] = useState(false);
  const phase = useMotionValue(stage);
  const reduced = useMotionPreference();

  useEffect(() => {
    if (reduced !== false) { phase.set(stage); return; }
    const animation = animate(phase, stage, { duration: 1.05, ease: [0.22, 1, 0.36, 1] });
    return () => animation.stop();
  }, [stage, reduced, phase]);

  useEffect(() => {
    const element = canvas.current;
    let renderer;
    try { renderer = createCuboidRenderer(element, window.innerWidth < 640 ? 64 : 96); }
    catch { return; }
    if (!renderer) return;
    setReady(true);
    let visible = false, request = 0, disposed = false, lost = false;
    const smoothed = { x: 0, y: 0 };
    let squeeze = 0;
    const draw = time => {
      request = 0;
      if (disposed || lost || !visible || document.hidden) return;
      smoothed.x += (pointer.current.x - smoothed.x) * .065;
      smoothed.y += (pointer.current.y - smoothed.y) * .065;
      squeeze += (pointer.current.squeeze - squeeze) * .09;
      renderer.draw(phase.get(), time / 1000, smoothed, squeeze, reduced !== false);
      if (reduced === false) request = requestAnimationFrame(draw);
    };
    const wake = () => { if (!lost && !request && visible && !document.hidden) request = requestAnimationFrame(draw); };
    const resize = new ResizeObserver(() => { renderer.resize(); wake(); });
    resize.observe(element);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else { cancelAnimationFrame(request); request = 0; }
    });
    observer.observe(element);
    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(request); request = 0; }
      else wake();
    };
    const onLost = event => { event.preventDefault(); lost = true; setReady(false); cancelAnimationFrame(request); request = 0; };
    const stopPhase = phase.on('change', wake);
    document.addEventListener('visibilitychange', onVisibility);
    element.addEventListener('webglcontextlost', onLost);
    renderer.resize();
    return () => {
      disposed = true;
      cancelAnimationFrame(request);
      resize.disconnect(); observer.disconnect(); stopPhase();
      document.removeEventListener('visibilitychange', onVisibility);
      element.removeEventListener('webglcontextlost', onLost);
      renderer.destroy();
    };
  }, [phase, reduced]);

  const fallback = Array.from({ length: 48 }, (_, i) => ({ ...fallbackCuboid(i, 48, stage), index: i })).sort((a, b) => a.depth - b.depth);
  return <div className="cuboid-sculpture" aria-hidden="true" data-renderer={ready ? 'webgl' : 'svg'}
    onPointerMove={event => {
      if (event.pointerType !== 'mouse' || reduced !== false) return;
      const box = event.currentTarget.getBoundingClientRect();
      pointer.current.x = (event.clientX - box.left) / box.width - .5;
      pointer.current.y = (event.clientY - box.top) / box.height - .5;
    }}
    onPointerDown={event => { if (event.pointerType === 'mouse' && reduced === false) pointer.current.squeeze = 1; }}
    onPointerUp={() => { pointer.current.squeeze = 0; }}
    onPointerCancel={() => { pointer.current.squeeze = 0; }}
    onPointerLeave={() => { pointer.current = { x: 0, y: 0, squeeze: 0 }; }}>
    <svg className="cuboid-fallback" viewBox="0 0 500 500" focusable="false">
      {fallback.map(({ x, y, index }) => <g key={index} transform={`translate(${x.toFixed(3)} ${y.toFixed(3)})`} fill={CUBOID_COLORS[index % 5]}>
        <path d="M0 -12 9 -7 0 -2 -9 -7Z" />
        <path d="M-9 -7 0 -2 0 14 -9 9Z" />
        <path d="M0 -2 9 -7 9 9 0 14Z" />
        <path d="M0 -2 9 -7 9 9 0 14Z" fill="#1a1a1a" opacity=".22" />
      </g>)}
    </svg>
    <canvas ref={canvas} className="cuboid-canvas" />
    <img className="cuboid-mark" src="/icon-192x192.png" alt="" width="72" height="72" />
  </div>;
}
