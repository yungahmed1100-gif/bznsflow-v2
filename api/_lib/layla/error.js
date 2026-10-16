// Shared by Node HTTP adapters and Convex argument validation; keep runtime-independent.
export class PilotError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
