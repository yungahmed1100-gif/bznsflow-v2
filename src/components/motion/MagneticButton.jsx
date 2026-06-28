import React, { useRef } from 'react';
import { m, useMotionValue, useSpring, useReducedMotion } from 'motion/react';
import { useDirSign } from '../../lib/useDir';

// Magnetic button: the element eases toward the pointer while hovered, then
// springs back. Renders an <a> by default (CTAs are links here). RTL flips x.
// Disabled under reduced motion (renders a plain <a>/element).
export function MagneticButton({ as = 'a', children, className, strength = 0.35, ...rest }) {
  const reduce = useReducedMotion();
  const dir = useDirSign();
  const ref = useRef(null);
  const x = useSpring(useMotionValue(0), { stiffness: 250, damping: 15, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 250, damping: 15, mass: 0.4 });

  if (reduce) {
    const Plain = as;
    return <Plain className={className} {...rest}>{children}</Plain>;
  }

  const Tag = m[as] || m.a;
  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - (r.left + r.width / 2)) * strength * dir);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  return (
    <Tag ref={ref} className={className} onPointerMove={onMove} onPointerLeave={onLeave} style={{ x, y }} {...rest}>
      {children}
    </Tag>
  );
}
