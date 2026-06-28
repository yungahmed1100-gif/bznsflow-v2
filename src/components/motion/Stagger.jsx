import React from 'react';
import { m } from 'motion/react';
import { staggerContainer, staggerItem, viewportOnce } from '../../lib/motion';

// Orchestrated stagger: the group reveals its items one after another on scroll.
// Wrap a grid in <StaggerGroup> and each card in <StaggerItem>.
export function StaggerGroup({ as = 'div', children, stagger = 0.1, delayChildren = 0.05, className, ...rest }) {
  const Tag = m[as] || m.div;
  return (
    <Tag
      className={className}
      variants={staggerContainer(stagger, delayChildren)}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({ as = 'div', children, variants = staggerItem, className, ...rest }) {
  const Tag = m[as] || m.div;
  return (
    <Tag className={className} variants={variants} {...rest}>
      {children}
    </Tag>
  );
}
