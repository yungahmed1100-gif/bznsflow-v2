// Historical injected-store regression harness; never deployed.
import { createBlueWorker } from '../../../api/_lib/layla/blue-messaging.js';
import { settings, PilotError } from '../../../api/_lib/layla/config.js';
import { safeEqual } from '../../../api/_lib/cookies.js';
import { send } from '../../../api/_lib/http.js';
import { createStore, transact } from '../../../api/_lib/layla/store.js';
import { runOne } from '../../../api/_lib/layla/gateway.js';
import { runOpen, maintainOpen } from '../../../api/_lib/layla/open-test.js';
import { customerStore } from '../../../api/_lib/layla/customer-store.js';
import { convexConfigured } from '../../../api/_lib/convex.js';
import { isGreenConvexConfigured } from '../../../api/_lib/green-config.js';

// Green's durable messaging worker reads and writes Convex only. Apps Script is
// still used for OTP delivery and CRM transport; the old Supabase worker is not
// attached to this production route.
function createLegacyHandler({store=createStore(), configuration=settings, env=process.env, now=Date.now, fetcher=fetch}={}) {
  return async (req,res) => {
    if (req.method !== 'POST') { res.setHeader('Allow','POST'); return send(res,405,{ok:false,reason:'method'}); }
    const expected=env.LAYLA_META_WORKER_SECRET;
    if (!expected || !safeEqual(req.headers?.authorization || '',`Bearer ${expected}`)) return send(res,401,{ok:false,reason:'worker_auth'});
    try {
      const c = configuration();
      if (env.LAYLA_CUSTOMER_ONBOARDING_ENABLED === 'true') await customerStore({ env }).cleanup();
      await transact(store, c, s => { s.openWorkerAt = now(); maintainOpen(s, now()); });
      if ((await store.read(c)).state.openTest) return send(res,200,{ok:true,...await runOpen({store,configuration,env,now,fetcher})});
      return send(res,200,{ok:true,...await runOne({store,config:configuration,now,fetcher})});
    } catch(e) { return send(res,e instanceof PilotError ? e.status : 503,{ok:false,reason:e instanceof PilotError ? e.code : 'unavailable'}); }
  };
}

export function createHandler({env=process.env,...options}={}) {
  const legacy=createLegacyHandler({env,...options});
  const convex=createBlueWorker({env,...options});
  return (req,res) => {
    const greenProduction = env.VERCEL_ENV === 'production' && !!env.GREEN_CONVEX_CLOUD_URL;
    if (env.GREEN_CONVEX_CUTOVER !== 'true') {
      if (greenProduction) return send(res,503,{ok:false,reason:'green_cutover_not_ready'});
      return legacy(req,res);
    }
    if (env.GREEN_DATA_MIGRATION_VERIFIED !== 'true' || env.GREEN_STATE_PATHS_CONVEX !== 'true'
      || !isGreenConvexConfigured(env) || !convexConfigured(env)) {
      return send(res,503,{ok:false,reason:'green_cutover_not_ready'});
    }
    return convex(req,res);
  };
}
export default createHandler();
