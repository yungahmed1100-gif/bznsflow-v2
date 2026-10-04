import { createHash, createHmac, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { blueAuthStore, convexConfigured } from './convex.js';
import { convexServiceSecret } from './green-config.js';

import { parseCookies, ensureCsrfToken, verifyCsrf, appendCookie, serializeCookie } from './cookies.js';
import { isValidEmail, normalizeEmail } from './auth.js';
import { readBody, send } from './http.js';
import { PilotError } from './layla/config.js';
import { sendOtpEmail, pushLead } from './mailer.js';
import { isAllowedOrigin } from './guard.js';
import { configuredProviders } from './oidc.js';

// blueAuthStore is built in convex.js alongside the other five Convex route
// clients; re-exported here because this module is where its callers look.
export { blueAuthStore };

export const BLUE_ACCOUNT_COOKIE = 'bf_session';
export const hashAccountToken = value => createHash('sha256').update(value).digest('hex');
export function blueAccountsAvailable(env = process.env) {
  if (!convexConfigured(env) || typeof env.OTP_SHARED_SECRET !== 'string' || env.OTP_SHARED_SECRET.length < 16) return false;
  try {
    const endpoint = new URL(env.LEAD_ENDPOINT || '');
    return endpoint.protocol === 'https:' || (endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname));
  } catch { return false; }
}
export async function blueAccount(req, store) {
  const token = parseCookies(req)[BLUE_ACCOUNT_COOKIE];
  return /^[a-f0-9]{64}$/.test(token || '') ? store('session',{tokenHash:hashAccountToken(token)}) : null;
}
export const sendBlueCode = ({email,code,lang,env,fetcher}) => sendOtpEmail({email,code,lang,env,fetcher});
export function createBlueAuthHandler({env = process.env,fetcher = fetch,store = blueAuthStore({env,fetcher}),sendCode = sendBlueCode} = {}) {
  return async (req,res,action) => {
    try {
      if (action === 'code' && req.method !== 'POST') { res.setHeader('Allow','POST'); throw new PilotError('method',405); }
      if (action === 'session' && !['GET','POST','PATCH','DELETE'].includes(req.method)) { res.setHeader('Allow','GET, POST, PATCH, DELETE'); throw new PilotError('method',405); }
      if (!isAllowedOrigin(req)) throw new PilotError('origin',403);
      if (req.method !== 'GET' && !verifyCsrf(req)) throw new PilotError('csrf',403);
      if (req.method === 'GET' && action === 'session') {
        const token = parseCookies(req)[BLUE_ACCOUNT_COOKIE];
        if (!token && !blueAccountsAvailable(env)) return send(res,200,{ok:true,csrfToken:ensureCsrfToken(req,res),account:null,needsProfile:false,providers:[]},{vary:'Cookie'});
        if (!blueAccountsAvailable(env)) return send(res,503,{ok:false,reason:'account_unavailable'},{vary:'Cookie'});
        const account = await blueAccount(req,store);
        return send(res,200,{ok:true,csrfToken:ensureCsrfToken(req,res),account:account ? {...account,profileComplete:!!account.profileComplete} : null,needsProfile:!!account && !account.profileComplete,providers:configuredProviders()},{vary:'Cookie'});
      }
      if (req.method === 'DELETE' && action === 'session') {
        const token = parseCookies(req)[BLUE_ACCOUNT_COOKIE];
        if (token && blueAccountsAvailable(env)) await store('signout',{tokenHash:hashAccountToken(token)});
        appendCookie(res,serializeCookie(BLUE_ACCOUNT_COOKIE,'',{maxAge:0,httpOnly:true}));
        appendCookie(res,serializeCookie('__Host-blue_review','',{maxAge:0,httpOnly:true}));
        return send(res,200,{ok:true},{vary:'Cookie'});
      }
      if (req.method === 'PATCH' && action === 'session') {
        const token = parseCookies(req)[BLUE_ACCOUNT_COOKIE];
        if (!token) throw new PilotError('no_session',401);
        if (!blueAccountsAvailable(env)) return send(res,503,{ok:false,reason:'account_unavailable'},{vary:'Cookie'});
        const body = readBody(req);
        const profile = {
          name: String(body.name || '').trim().slice(0, 100),
          phone: String(body.phone || '').trim().slice(0, 40),
          country: String(body.country || '').trim().slice(0, 80),
          industry: String(body.industry || '').trim().slice(0, 80),
          lang: body.lang === 'ar' ? 'ar' : 'en',
        };
        if (profile.name.length < 2 || profile.phone.length < 6 || !profile.country || !profile.industry) throw new PilotError('invalid_profile',400);
        const account = await store('complete_profile', { tokenHash: hashAccountToken(token), profile });
        try { await pushLead({ name: profile.name, email: account.email, phone: profile.phone, country: profile.country, industry: profile.industry, lang: profile.lang }); } catch { /* CRM delivery can be retried without blocking verified sign-in. */ }
        return send(res,200,{ok:true,account:{...account,profileComplete:true},needsProfile:false},{vary:'Cookie'});
      }
      if (req.method !== 'POST') throw new PilotError('method',405);
      if (!blueAccountsAvailable(env)) return send(res,503,{ok:false,reason:'account_unavailable'},{vary:'Cookie'});
      const body = readBody(req);
      if(action==='session' && typeof body?.reviewAccess==='string') {
        if(!/^[a-f0-9]{64}$/.test(body.reviewAccess)) throw new PilotError('session_expired',401);
        const raw=randomBytes(32).toString('hex');
        const account=await store('review_access',{accessHash:hashAccountToken(body.reviewAccess),tokenHash:hashAccountToken(raw)});
        delete body.reviewAccess;
        appendCookie(res,serializeCookie(BLUE_ACCOUNT_COOKIE,raw,{maxAge:86400,httpOnly:true}));
        appendCookie(res,serializeCookie('__Host-blue_review','',{maxAge:0,httpOnly:true}));
        return send(res,200,{ok:true,account:{id:account.id,email:account.email,profileComplete:true}},{vary:'Cookie'});
      }
      if (!body || JSON.stringify(body).length > 2000 || !isValidEmail(body.email)) throw new PilotError('email');
      const email = normalizeEmail(body.email);
      const hash = value => createHmac('sha256',convexServiceSecret(env)).update(`blue-auth:${value}`).digest('hex');
      const ipHash = hash(String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0]);
      if (action === 'code') {
        let code = String(randomInt(1000000)).padStart(6,'0');
        const id = randomUUID();
        await store('request_code',{email,codeHash:hash(`${email}:${code}`),ipHash,challengeId:id});
        try {
          await sendCode({email,code,lang:body.lang,id,env,fetcher});
          await store('code_sent',{email,challengeId:id});
        } finally { code = undefined; }
        return send(res,200,{ok:true},{vary:'Cookie'});
      }
      if (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code.replace(/\s/g,''))) throw new PilotError('code_invalid',409);
      const raw = randomBytes(32).toString('hex');
      const account = await store('verify_code',{email,codeHash:hash(`${email}:${body.code.replace(/\s/g,'')}`),ipHash,tokenHash:hashAccountToken(raw)});
      delete body.code;
      appendCookie(res,serializeCookie(BLUE_ACCOUNT_COOKIE,raw,{maxAge:2592000,httpOnly:true}));
      return send(res,200,{ok:true,account:{...account,profileComplete:!!account.profileComplete},needsProfile:!account.profileComplete},{vary:'Cookie'});
    } catch (error) {
      const status = error instanceof PilotError ? error.status : 503;
      const reason = error instanceof PilotError ? error.code : 'account_unavailable';
      return send(res, status, { ok: false, reason }, { vary: 'Cookie' });
    }
  };
}
