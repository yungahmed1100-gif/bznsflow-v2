export const CUBOID_COLORS = ['#5c95c6', '#51a47b', '#eeb462', '#f28c54', '#e16b71'];

export function cuboidPosition(index, count, stage) {
  const fraction = (index + 0.5) / count;
  const angle = index * Math.PI * (3 - Math.sqrt(5));
  if (stage === 0) {
    const y = 1 - fraction * 2;
    const radius = Math.sqrt(1 - y * y);
    return [Math.cos(angle) * radius * 2.35, y * 2.35, Math.sin(angle) * radius * 2.35];
  }
  if (stage === 1) {
    const t = fraction * Math.PI * 4;
    return [Math.sin(t) * 1.65, (fraction - 0.5) * 4.6, Math.cos(t) * 1.65];
  }
  if (stage === 2) {
    const radius = 0.7 + fraction * 1.8;
    return [Math.cos(angle) * radius, (fraction - 0.5) * 3.7, Math.sin(angle) * radius];
  }
  const columns = count > 64 ? 6 : 4;
  const rows = 4;
  const layers = Math.ceil(count / (columns * rows));
  const x = index % columns - (columns - 1) / 2;
  const y = Math.floor(index / columns) % rows - (rows - 1) / 2;
  const z = Math.floor(index / (columns * rows)) - (layers - 1) / 2;
  if (stage === 3) return [x * (columns === 4 ? 1.1 : 0.66), -y * 0.92, z * 0.72];
  const t = fraction * Math.PI * 2;
  return [Math.cos(t) * 2.1, Math.sin(t) * 2.1, Math.sin(t * 3) * 0.45 + (index % 2 ? 0.24 : -0.24)];
}

export function fallbackCuboid(index, count, stage) {
  const [x, y, z] = cuboidPosition(index, count, stage);
  return { x: 250 + (x - z * 0.36) * 69, y: 250 - (y + z * 0.24) * 69, depth: z };
}
