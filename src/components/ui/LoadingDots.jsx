import { useEffect, useState } from 'react';
import '../../styles/loading-dots.css';

const SHOW_AFTER_MS = 160;

/**
 * A loading state that says what is loading: three dots and the label. The dots appear only if
 * the wait lasts longer than a blink, so a fast answer never flashes them. The label is announced
 * once to screen readers; the dots are decoration and stand still for people who turn motion off.
 * @param {{ label: string, compact?: boolean }} props
 */
export function LoadingDots({ label, compact = false }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShown(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className={`loading-status${compact ? ' is-compact' : ''}`} role="status">
      <span className="loading-announcement">{label}</span>
      <span className={`loading-visual${shown ? ' is-visible' : ''}`} aria-hidden="true">
        <span className="loading-dots">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
        </span>
        <span>{label}</span>
      </span>
    </div>
  );
}
