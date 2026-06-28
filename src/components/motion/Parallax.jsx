import React, { useRef } from 'react';
import { m, useScroll, useTransform, useReducedMotion } from 'motion/react';

// Vertical parallax — element drifts as it scrolls through the viewport.
// Vertical only, so it's RTL-neutral. `speed` > 0 moves slower than scroll
// (depth); negative moves faster. Disabled under reduced motion.
export function Parallax({ children, speed = 0.18, className, ...rest }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const shift = Math.round(speed * 120);
  const y = useTransform(scrollYProgress, [0, 1], [shift, -shift]);

  return (
    <m.div ref={ref} className={className} style={reduce ? undefined : { y }} {...rest}>
      {children}
    </m.div>
  );
}
