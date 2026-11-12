// Loads the real convex/http.ts in Node with the Convex runtime replaced by
// recorders, so every HTTP route can be exercised without a deployment.
//
// - `httpRouter()` keeps the registered routes; `httpAction` is the identity.
// - `internal.*` references are their dotted names ('review.execute').
// - `ctx.runMutation/runQuery/runAction` record each call and answer with the
//   scenario's `outcome`; `ctx.storage` answers like an empty store.
import { registerHooks } from 'node:module';

const stub = source => `data:text/javascript,${encodeURIComponent(source)}`;
const STUBS = {
  'convex/server': stub(
    'export function httpRouter(){const routes=[];return {routes,route(r){routes.push(r)},lookup(){}}}',
  ),
  './_generated/server': stub('export const httpAction = handler => handler;'),
  './_generated/api': stub(`
    const ref = path => new Proxy({ __name: path.join('.') }, {
      get: (target, key) => (key in target || typeof key === 'symbol' ? target[key] : ref([...path, key])),
    });
    export const internal = ref([]);
    export const api = ref([]);`),
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    const fromConvex = context.parentURL?.includes('/convex/');
    if (specifier === 'convex/server' && fromConvex) return { url: STUBS[specifier], shortCircuit: true };
    if (fromConvex && STUBS[specifier]) return { url: STUBS[specifier], shortCircuit: true };
    return nextResolve(specifier, context);
  },
});

export const SECRET = 'f'.repeat(64);

/** Long strings are recorded by length, so the golden file stays readable. */
const brief = value =>
  typeof value === 'string' && value.length > 80
    ? `<${value.length} chars>`
    : Array.isArray(value)
      ? value.map(brief)
      : value && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, brief(v)]))
        : value;

/** The routes convex/http.ts registers: [{ path, method, handler }]. */
export async function loadRoutes() {
  process.env.CONVEX_SERVICE_SECRET = SECRET;
  const { default: http } = await import('../../convex/http.ts');
  return http.routes;
}

/**
 * Sends one request to a route handler and records everything observable.
 * outcome: 'ok' (functions answer { ok: true, value: 'v' }) or 'throw'
 * (functions throw an error whose message carries the reason `probe_reason`).
 */
export async function call(route, { body = '', auth = `Bearer ${SECRET}`, outcome = 'ok', env = {} } = {}) {
  const calls = [];
  const logs = [];
  const answer = (kind, ref, args) => {
    calls.push({ kind, fn: ref?.__name ?? String(ref), args: brief(args) });
    if (outcome === 'throw') throw new Error('Uncaught Error: probe_reason\n    at handler (convex:1:1)');
    return { ok: true, value: 'v' };
  };
  const ctx = {
    runMutation: async (ref, args) => answer('mutation', ref, args),
    runQuery: async (ref, args) => answer('query', ref, args),
    runAction: async (ref, args) => answer('action', ref, args),
    storage: {
      get: async () => null,
      getMetadata: async () => null,
      getUrl: async () => null,
      delete: async () => {},
    },
  };
  const saved = { ...process.env };
  Object.assign(process.env, env);
  const error = console.error;
  console.error = (...line) => logs.push(line.join(' '));
  try {
    const headers = auth ? { Authorization: auth } : {};
    const request = new Request(`https://convex.invalid${route.path}`, { method: route.method, headers, body });
    const response = await route.handler(ctx, request);
    return {
      status: response.status,
      contentType: response.headers.get('content-type'),
      cacheControl: response.headers.get('cache-control'),
      body: brief(await response.text()),
      calls,
      logs,
    };
  } finally {
    console.error = error;
    for (const key of Object.keys(env)) {
      if (key in saved) process.env[key] = saved[key];
      else delete process.env[key];
    }
  }
}
