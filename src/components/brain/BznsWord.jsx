import React from 'react';

// "bzns" in the BznsFlow logo colours (green, blue, orange, coral), ".md" in ink. A brand wordmark,
// so it is read as one word: screen readers hear "bzns.md", and it stays left-to-right in Arabic.
const LETTERS = [['b', 'green'], ['z', 'blue'], ['n', 'orange'], ['s', 'coral']];

export function BznsWord({ className = '' }) {
  return (
    <bdi dir="ltr" className={`bzns-word ${className}`}>
      <span className="ld-visually-hidden">bzns.md</span>
      <span aria-hidden="true">{LETTERS.map(([letter, colour]) => <span key={letter} className={`bzns-word-${colour}`}>{letter}</span>)}<span className="bzns-word-md">.md</span></span>
    </bdi>
  );
}
