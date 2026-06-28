import React, { useRef } from 'react';
import { m, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react';
import { useDirSign } from '../../lib/useDir';

// Subtle 3D pointer tilt on hover. Pointer position → rotateX/rotateY with a
// spring. RTL flips the horizontal axis. Disabled under reduced motion (renders
// a plain element so hover/box styling still works).
export function TiltCard({ as = 'div', children, className, max = 7, ...rest }) {
  const reduce = useReducedMotion();
  const dir = useDirSign();
  const ref = useRef(null);

  const px = useMotionValue(0); // -0.5..0.5
  const py = useMotionValue(0);
  const rx = useSpring(useTransform(py, [-0.5, 0.5], [max, -max]), { stiffness: 200, damping: 18 });
  const ryRaw = useTransform(px, [-0.5, 0.5], [-max, max]);
  const ry = useSpring(ryRaw, { stiffness: 200, damping: 18 });

  if (reduce) {
    const Plain = as;
    return <Plain className={className} {...rest}>{children}</Plain>;
  }

  const Tag = m[as] || m.div;
  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set(((e.clientX - r.left) / r.width - 0.5) * dir);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { px.set(0); py.set(0); };

  return (
    <Tag
      ref={ref}
      className={className}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900, transformStyle: 'preserve-3d' }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
