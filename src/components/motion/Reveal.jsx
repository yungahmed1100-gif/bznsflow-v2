import React from 'react';
import { m } from 'motion/react';
import { fadeUp, viewportOnce } from '../../lib/motion';

// Scroll-triggered reveal. Renders real children into the DOM (SEO-safe) and
// animates opacity/transform on enter. `as` lets it be a section/div/etc.
// Use BELOW the fold only — above-the-fold content must render visible (LCP).
export function Reveal({
  as = 'div',
  children,
  variants = fadeUp,
  delay = 0,
  className,
  ...rest
}) {
  const Tag = m[as] || m.div;
  return (
    <Tag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      transition={delay ? { delay } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}
