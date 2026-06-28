import React from 'react';
import { Outlet } from 'react-router-dom';
import { LazyMotion, domAnimation, MotionConfig } from 'motion/react';
import { spring } from '../lib/motion';

// Shared shell for every route. vite-react-ssg already wraps the tree in
// HelmetProvider. We add the motion provider here so it mounts once for both
// '/' and '/ar':
//   - LazyMotion + domAnimation: ship the small `m.*` feature bundle (not full motion.*)
//   - MotionConfig reducedMotion="user": every m.* honors the OS reduced-motion setting
export function RootLayout() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={spring.smooth}>
        <Outlet />
      </MotionConfig>
    </LazyMotion>
  );
}
