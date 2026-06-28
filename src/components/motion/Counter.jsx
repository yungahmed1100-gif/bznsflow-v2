import React, { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion, animate } from 'motion/react';

// Counts up to `value` once when scrolled into view. Reduced motion / no-JS
// shows the final value immediately. `prefix`/`suffix` wrap the number.
export function Counter({ value, prefix = '', suffix = '', duration = 1.4, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView || reduce) { setDisplay(value); return; }
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduce, value, duration]);

  return (
    <span ref={ref} className={className}>{prefix}{display}{suffix}</span>
  );
}
