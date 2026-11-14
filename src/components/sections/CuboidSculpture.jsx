import { useEffect, useRef, useState } from 'react';
import { animate, useMotionValue } from 'motion/react';
import { useMotionPreference } from '../../hooks/useMotionPreference';
import { createCuboidRenderer } from '../../lib/cuboid-renderer';

const PHONE_WIDTH = 640;
const BLOCKS = { phone: 64, desktop: 96 };
const MORPH = { duration: 1.05, ease: [0.22, 1, 0.36, 1] };
const INK = [0.1, 0.1, 0.1];

/** "rgb(92, 149, 198)" → [0.36, 0.58, 0.78]; anything else → ink. */
function rgbOf(value) {
  const parts = String(value || '').match(/[\d.]+/g);
  return parts && parts.length >= 3 ? parts.slice(0, 3).map(n => Number(n) / 255) : INK;
}

/**
 * The moving sculpture: the hero's blocks drawn with WebGL, flowing from one step's shape to the
 * next in that step's colour (the host element's CSS `color`). It draws only while on screen and
 * in a visible tab, follows the mouse a little, and stands still for reduced motion. Without
 * WebGL2, or if the browser drops the context, it renders nothing and the still drawing stays.
 * Loaded lazily, so the page's first paint never waits for it.
 * @param {{ stage: number, onReady?: (ready: boolean) => void }} props
 */
export default function CuboidSculpture({ stage, onReady }) {
  const canvas = useRef(null);
  const pointer = useRef({ x: 0, y: 0, squeeze: 0 });
  const target = useRef(INK);
  const [failed, setFailed] = useState(false);
  const phase = useMotionValue(stage);
  const reduced = useMotionPreference();

  useEffect(() => {
    target.current = rgbOf(getComputedStyle(canvas.current.parentElement).color);
    if (reduced) {
      phase.set(stage);
      return undefined;
    }
    const morph = animate(phase, stage, MORPH);
    return () => morph.stop();
  }, [stage, reduced, phase]);

  useEffect(() => {
    const element = canvas.current;
    const host = element.parentElement;
    let renderer = null;
    try {
      renderer = createCuboidRenderer(element, window.innerWidth < PHONE_WIDTH ? BLOCKS.phone : BLOCKS.desktop);
    } catch {
      renderer = null;
    }
    if (!renderer) {
      setFailed(true);
      return undefined;
    }
    onReady?.(true);
    let visible = false,
      request = 0,
      disposed = false,
      lost = false,
      squeeze = 0;
    const smoothed = { x: 0, y: 0 };
    const color = [...target.current];
    const draw = time => {
      request = 0;
      if (disposed || lost || !visible || document.hidden) return;
      const ease = reduced ? 1 : 0.08;
      smoothed.x += (pointer.current.x - smoothed.x) * 0.065;
      smoothed.y += (pointer.current.y - smoothed.y) * 0.065;
      squeeze += (pointer.current.squeeze - squeeze) * 0.09;
      for (let i = 0; i < 3; i++) color[i] += (target.current[i] - color[i]) * ease;
      renderer.draw(phase.get(), time / 1000, smoothed, squeeze, reduced, color);
      if (!reduced) request = requestAnimationFrame(draw);
    };
    const wake = () => {
      if (!lost && !request && visible && !document.hidden) request = requestAnimationFrame(draw);
    };
    const sleep = () => {
      cancelAnimationFrame(request);
      request = 0;
    };
    const resize = new ResizeObserver(() => {
      renderer.resize();
      wake();
    });
    resize.observe(element);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else sleep();
    });
    observer.observe(element);
    const onVisibility = () => (document.hidden ? sleep() : wake());
    // A dropped context is not recovered: the still drawing takes over for the rest of the visit.
    const onLost = event => {
      event.preventDefault();
      lost = true;
      sleep();
      setFailed(true);
      onReady?.(false);
    };
    const onMove = event => {
      if (event.pointerType !== 'mouse' || reduced) return;
      const box = host.getBoundingClientRect();
      pointer.current.x = (event.clientX - box.left) / box.width - 0.5;
      pointer.current.y = (event.clientY - box.top) / box.height - 0.5;
    };
    const onDown = event => {
      if (event.pointerType === 'mouse' && !reduced) pointer.current.squeeze = 1;
    };
    const onUp = () => {
      pointer.current.squeeze = 0;
    };
    const onLeave = () => {
      pointer.current = { x: 0, y: 0, squeeze: 0 };
    };
    const stopPhase = phase.on('change', wake);
    document.addEventListener('visibilitychange', onVisibility);
    element.addEventListener('webglcontextlost', onLost);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerdown', onDown);
    host.addEventListener('pointerup', onUp);
    host.addEventListener('pointercancel', onUp);
    host.addEventListener('pointerleave', onLeave);
    renderer.resize();
    return () => {
      disposed = true;
      sleep();
      resize.disconnect();
      observer.disconnect();
      stopPhase();
      document.removeEventListener('visibilitychange', onVisibility);
      element.removeEventListener('webglcontextlost', onLost);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointerup', onUp);
      host.removeEventListener('pointercancel', onUp);
      host.removeEventListener('pointerleave', onLeave);
      renderer.destroy();
      onReady?.(false);
    };
  }, [phase, reduced, onReady]);

  return <canvas ref={canvas} className="cuboid-canvas" hidden={failed} />;
}
