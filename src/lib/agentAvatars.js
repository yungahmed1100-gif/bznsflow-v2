// Pixel-art character portraits (chest-up crops of the full sprites kept in
// the "bznsflow posts" workspace), keyed by the agent `key` in data/agents.js.
//
// Globbed rather than imported one by one so a missing portrait degrades to the
// line icon instead of breaking the build. Shared by the team roster and the
// tier cards, which name the same agents.
const AVATAR_FILES = import.meta.glob('../assets/agents/*.png', { eager: true, import: 'default' });

export const AGENT_AVATARS = Object.fromEntries(
  Object.entries(AVATAR_FILES).map(([path, url]) => [path.split('/').pop().replace('.png', ''), url]),
);
