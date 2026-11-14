import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { useMotionPreference } from '../../hooks/useMotionPreference';

export function LoadingDots({ label, delay = 160, compact = false }) {
  const root = useRef(null);
  const visible = useInView(root);
  const reduced = useMotionPreference();
  const [shown, setShown] = useState(false);
  const [foreground, setForeground] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  useEffect(() => {
    const sync = () => setForeground(!document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  const moving = shown && visible && foreground && reduced === false;
  return <div ref={root} className={`loading-status${compact ? ' is-compact' : ''}`} role="status">
    <span className="loading-announcement">{label}</span>
    <span className={`loading-visual${shown ? ' is-visible' : ''}`} aria-hidden="true">
      <span className="loading-dots">{[0,1,2].map(index => <motion.span key={index} className="loading-dot" animate={{ y: moving ? [0, -7, 0] : 0 }} transition={moving ? { duration: .8, repeat: Infinity, ease: 'easeInOut', delay: index * .15 } : { duration: 0 }} />)}</span>
      <span>{label}</span>
    </span>
  </div>;
}
