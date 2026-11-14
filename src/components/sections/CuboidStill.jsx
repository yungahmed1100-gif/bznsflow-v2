import { fallbackCuboid } from '../../lib/hero-cuboids';

const COUNT = 48;

/**
 * The sculpture as a still drawing in the step's colour. It is in the prerendered page, so the
 * space is never empty; it is what people see with motion turned off or without WebGL, and the
 * moving canvas covers it when it is ready.
 * @param {{ stage: number }} props
 */
export function CuboidStill({ stage }) {
  const blocks = Array.from({ length: COUNT }, (_, index) => fallbackCuboid(index, COUNT, stage)).sort(
    (a, b) => a.depth - b.depth,
  );
  return (
    <svg className="cuboid-still" viewBox="0 0 500 500" focusable="false" aria-hidden="true">
      <defs>
        <g id="cuboid-block">
          <path d="M0 -12 9 -7 0 -2 -9 -7Z" />
          <path d="M-9 -7 0 -2 0 14 -9 9Z" opacity="0.82" />
          <path d="M0 -2 9 -7 9 9 0 14Z" opacity="0.64" />
        </g>
      </defs>
      {blocks.map((block, index) => (
        <use key={index} href="#cuboid-block" x={block.x.toFixed(1)} y={block.y.toFixed(1)} />
      ))}
    </svg>
  );
}
