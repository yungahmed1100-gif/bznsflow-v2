import { matchPublishedKnowledge } from '../../../src/lib/knowledge-match.js';
import { randomUUID } from 'node:crypto';
import { SUBSCRIPTION_PROOF_MS, checkInstagramToken, instagramConfig, instagramSendResult, instagramUsername, postInstagramMessage, refreshInstagram, subscribeInstagram } from './instagram.js';
import { convexConfigured, instagramStore, messagingStore, reviewStore } from '../convex.js';
import { blueAccount, blueAuthStore } from '../blue-auth.js';
import { ensureCsrfToken, verifyCsrf, safeEqual } from '../cookies.js';
import { send, readBody } from '../http.js';
import { PilotError } from './config.js';
import { classify, answer } from './domain.js';
import { route } from './route.js';
import { previewAnswer } from './review-profile.js';
import { credentialContext, openToken } from './customer-meta.js';
import { inspectReviewConnection } from './review-api.js';
import { parseEvents } from './webhook.js';
import { providerResult } from './gateway.js';
import { campaignStore } from './dashboard-store.js';
import { runCampaignSend, runCampaignStart } from './campaign-worker.js';
import { clinicIngressDecision, clinicSafetyMessage } from '../../../config/clinic-safety.js';
import { adviceDecision } from '../../../config/sector-safety.js';
import { phrase, langOf } from '../../../config/layla-tones.js';
import { safeReply } from './reply-guard.js';
import { answerFromDocument, matchFaq } from './document-answer.js';
import { isGreenRuntime, publicOrigin, whatsappMessagingEnabled, instagramMessagingEnabled, broadcastMessagingEnabled, messagingWorkerSecret } from '../green-config.js';

// messagingStore is built in ../convex.js with the other five route clients, and
// instagramSendResult lives with the rest of the Instagram Graph code; both are
// re-exported here because this module is where their callers look.
export { messagingStore, instagramSendResult };

// A claimed job becomes one provider message: a product photo (with its name as
// the caption on WhatsApp) or plain text. Instagram image attachments take no caption.
export function whatsappPayload(job) {
  const body=job.imageUrl ? {type:'image',image:{link:job.imageUrl,caption:job.text}} : {type:'text',text:{preview_url:false,body:job.text}};
  return {messaging_product:'whatsapp',recipient_type:'individual',to:job.number,...body,biz_opaque_callback_data:job.intent};
}
export const instagramMessage=job=>job.imageUrl ? {attachment:{type:'image',payload:{url:job.imageUrl}}} : {text:job.text};

/** One acknowledgement in the business's style for what Layla can't read (a photo, a voice note, a very long message). Same on both channels. */
export function nonTextAcknowledgement(profile,kind,sample='') {
  const tooLong=kind==='too_long', lang=langOf(`${profile?.services||''} ${String(sample).slice(0,200)}`);
  return {handoffReason:tooLong?'too_long':'unsupported_media',reply:phrase(profile?.tone,tooLong?'tooLong':'media',lang)};
}
// Guards run first and each hand-off names its reason, so the attention queue shows why.
const GUARDED_REASONS={negotiation:'negotiation',abuse:'abuse'};
export function liveAnswer(text,profile,catalog=[],knowledge=[],sections=[]) {
  const safety=clinicIngressDecision(text,profile);
  if(safety.withheld) return {intent:'medical_content_withheld',reply:clinicSafetyMessage(safety.language),handoff:true,medicalContentWithheld:true,handoffReason:'clinical_boundary'};
  const lang=langOf(text);
  if(adviceDecision(text,profile).boundary) return {intent:'advice_boundary',reply:phrase(profile.tone,'adviceBoundary',lang),handoff:true,handoffReason:'advice_boundary'};
  const intent=classify(text);
  if(intent==='optout') return {intent,reply:null,handoff:false};
  // "thanks" gets a short reply; "ok" or 👍 needs none. Neither is a question for the team.
  if(intent==='ack') return {intent,reply:null,handoff:false};
  if(intent==='thanks') return {intent,reply:phrase(profile.tone,'youreWelcome',lang),handoff:false};
  if(intent==='human') return {intent,reply:answer(text,profile,true).text,handoff:true,handoffReason:'customer_requested'};
  if(GUARDED_REASONS[intent]) return {intent,reply:phrase(profile.tone,intent,lang,{business:profile.businessName||''}),handoff:true,handoffReason:GUARDED_REASONS[intent]};
  const result=previewAnswer(text,profile,catalog);
  // A reworded owner FAQ beats a generic intent answer: it is the owner's own approved reply.
  const faq=result.intent!=='faq' ? matchFaq(text,profile.faqs || []) : null;
  if(faq) return {intent:'faq',reply:safeReply(faq.answer,700),handoff:false};
  const published=result.needsHuman ? matchPublishedKnowledge(text,knowledge) : null;
  if(published) return {intent:result.intent,reply:safeReply(published.text),handoff:false};
  // A bzns.md section, quoted verbatim, answers what the profile can't. It also beats a generic
  // address or services list ("do you deliver to Seeb?" is about delivery, not where the shop is)
  // and a weak profile-similarity guess ("what documents do I need?" is not about opening hours).
  const soft=['unknown','location','services'].includes(result.intent) || route(text,profile).via==='profile';
  const section=soft && result.intent!=='faq' ? answerFromDocument(text,{sections}) : null;
  if(section) return {intent:'faq',reply:section.text,handoff:false};
  return {intent:result.intent,reply:result.text,handoff:result.needsHuman,...(result.needsHuman?{handoffReason:'needs_review'}:{})};
}
const STOP_BUTTON=/^(stop promotions?|stop|unsubscribe|opt out|إيقاف العروض|ايقاف العروض|إيقاف|ايقاف|إلغاء الاشتراك|الغاء الاشتراك)$/i;
// WhatsApp profile names keyed by wa_id. Only ever used as a display fallback.
export function profileNames(value) {
  const names=new Map();
  for(const c of Array.isArray(value?.contacts)?value.contacts.slice(0,100):[]) {
    const name=typeof c?.profile?.name==='string'?c.profile.name.replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,80):'';
    if(/^\d{7,15}$/.test(c?.wa_id || '') && name) names.set(c.wa_id,name);
  }
  return names;
}
// Template quick-reply and interactive button taps carry the button title, not text.
export function buttonTitle(m) {
  const title=m?.type==='button'?m.button?.text:m?.type==='interactive'?(m.interactive?.button_reply?.title || m.interactive?.list_reply?.title):null;
  return typeof title==='string'?title.trim().slice(0,100):null;
}
// Instagram callback has already verified the signature using its configured app secret.
// The webhook carries only the sender's numeric ID, so the @username comes from
// Instagram's User Profile API; a failed lookup never blocks the message.
async function instagramUsernames(binding,senders,{env,fetcher}) {
  if(!binding.integration?.credential || !binding.sessionHash || !senders.length) return new Map();
  let c,token;
  try {
    c=instagramConfig(env,false);
    token=openToken(binding.integration.credential,credentialContext(binding.sessionHash,binding.integration),env);
  } catch {return new Map();}
  const found=await Promise.all(senders.slice(0,10).map(async id=>[id,await instagramUsername(c,id,token,fetcher)]));
  return new Map(found.filter(([,name])=>name));
}
export async function ingestInstagramEnvelope(envelope,{store=messagingStore(),now=Date.now,app,env=process.env,fetcher=fetch,suppressAutomation=false}={}) {
  if(envelope.object!=='instagram' || !Array.isArray(envelope.entry) || envelope.entry.length>100) throw new PilotError('invalid_envelope');
  let total=0;
  for(const entry of envelope.entry) {
    if(!/^\d{1,30}$/.test(entry?.id || '')) throw new PilotError('invalid_envelope');
    const binding=await store('binding',{channel:'instagram',igAccount:entry.id});
    if(!binding || binding.app!==app) {console.warn('webhook_unbound',JSON.stringify({channel:'instagram',igAccount:entry.id}));continue;}
    const parsed=parseEvents(Buffer.from(JSON.stringify({object:'instagram',entry:[entry]})),binding,now());
    const names=await instagramUsernames(binding,[...new Set(parsed.filter(e=>e.kind==='message').map(e=>e.from))],{env,fetcher});
    const events=parsed.map(({nonText,sample,...e})=>{
      const named=e.kind==='message' && names.get(e.from)?{...e,profileName:names.get(e.from)}:e;
      if(nonText) return {...named,...nonTextAcknowledgement(binding.profile,nonText,sample)};
      return named.kind==='message' && !named.handoff ? {...named,...liveAnswer(named.text,binding.profile,binding.catalog || [],binding.knowledge || [],binding.sections || [])}:named;
    });
    total+=events.length;if(total>100) throw new PilotError('too_many_events',413);
    if(events.length) await store('ingest',{integrationId:binding.integrationId,profileVersion:binding.profileVersion,events,suppressAutomation});
  }
}
// This function receives only an envelope whose raw signature was verified.
export async function ingestBlueEnvelope(envelope,{store=messagingStore(),now=Date.now,sendingEnabled=true}={}) {
  if(!Array.isArray(envelope.entry) || envelope.entry.length>100) throw new PilotError('invalid_envelope');
  const groups=new Map();
  for(const entry of envelope.entry) {
    if(!/^\d{1,30}$/.test(entry?.id || '') || !Array.isArray(entry.changes) || entry.changes.length>100) throw new PilotError('invalid_envelope');
    for(const change of entry.changes) {
      if(!['messages','smb_message_echoes','user_preferences'].includes(change?.field)) continue;
      const phone=change.value?.metadata?.phone_number_id;
      if(!/^\d{1,30}$/.test(phone || '')) throw new PilotError('invalid_envelope');
      const key=`${entry.id}:${phone}`;
      if(!groups.has(key)) groups.set(key,{waba:entry.id,phone,changes:[]});
      groups.get(key).changes.push(change);
    }
  }
  if(groups.size>10) throw new PilotError('too_many_bindings',413);
  let total=0;
  for(const group of groups.values()) {
    const binding=await store('binding',{waba:group.waba,phone:group.phone});
    if(!binding || binding.app!=='1388038082832745') {console.warn('webhook_unbound',JSON.stringify({channel:'whatsapp',waba:group.waba,phone:group.phone}));continue;}
    const raw=Buffer.from(JSON.stringify({object:'whatsapp_business_account',entry:[{id:group.waba,changes:group.changes}]}));
    const names=new Map(group.changes.flatMap(change=>[...profileNames(change.value)]));
    const errors=new Map(group.changes.flatMap(change=>(change.value?.statuses || []).map(s=>[`${s?.id}:${s?.status}`,Number(s?.errors?.[0]?.code)]).filter(([,code])=>Number.isSafeInteger(code))));
    const events=parseEvents(raw,binding,now()).map(e=>{
      if(e.kind==='message') return {...e,...liveAnswer(e.text,binding.profile,binding.catalog || [],binding.knowledge || [],binding.sections || []),...(names.get(e.from)?{profileName:names.get(e.from)}:{})};
      if(e.kind==='receipt' && errors.has(`${e.id}:${e.status}`)) return {...e,errorCode:errors.get(`${e.id}:${e.status}`)};
      return e;
    });
    for(const change of group.changes) {
      for(const echo of change.value.message_echoes || []) {
        if(typeof echo.text?.body==='string') events.push({kind:'echo',id:echo.id,from:echo.to,at:now(),text:echo.text.body.slice(0,1000)});
      }
      for(const m of change.value.messages || []) {
        if(m.type==='text' && typeof m.text?.body==='string' && m.text.body.length<=1000) continue;
        if(!/^[A-Za-z0-9_.:=/-]{1,220}$/.test(m.id || '') || !/^\d{7,15}$/.test(m.from || '') || m.from===binding.sender || m.from_business===true) continue;
        const title=buttonTitle(m);
        const profile=names.get(m.from)?{profileName:names.get(m.from)}:{};
        if(title && STOP_BUTTON.test(title)) {
          // A marketing "Stop promotions" tap is an opt-out, recorded as the tapped title.
          events.push({kind:'message',id:m.id,from:m.from,at:Number(m.timestamp)*1000,text:title,intent:'optout',reply:null,handoff:false,...profile});
          continue;
        }
        // Media, voice notes and over-long text get one acknowledgement in the business's style, then the team.
        const tooLong=m.type==='text' && typeof m.text?.body==='string';
        events.push({kind:'message',id:m.id,from:m.from,at:Number(m.timestamp)*1000,text:title || '[Message needs human attention]',intent:'human',handoff:true,
          ...(title ? {handoffReason:'customer_requested'} : nonTextAcknowledgement(binding.profile,tooLong?'too_long':'media',tooLong?m.text.body:'')),...profile});
      }
    }
    total+=events.length;if(total>100) throw new PilotError('too_many_events',413);
    if(events.length) await store('ingest',{integrationId:binding.integrationId,profileVersion:binding.profileVersion,events,suppressAutomation:!sendingEnabled});
  }
}

const MANAGER_ACTIONS=['disconnect','activate','pause','check_connection'];
export function createMessagingApi({env=process.env,fetcher=fetch,store=messagingStore({env,fetcher}),accounts=blueAuthStore({env,fetcher}),reviews=reviewStore({env,fetcher}),inspect=inspectReviewConnection,instagram=instagramStore({env,fetcher})}={}) {
  return async(req,res)=>{
    try {
      if(!convexConfigured(env)) throw new PilotError('messaging_unavailable',503);
      const origin=publicOrigin(env);
      if(req.headers?.host!==new URL(origin).host || (req.method!=='GET' && req.headers?.origin!==origin)) throw new PilotError('origin',403);
      if(!['GET','POST'].includes(req.method)) throw new PilotError('method',405);
      const account=await blueAccount(req,accounts);
      // An invited employee works in the manager's business; the whole-business switches stay with the manager.
      const sessionHash=account?.workspaceDraftHash || account?.draftHash;
      if(!sessionHash) throw new PilotError('sign_in_required',401);
      const employee=account.workspaceRole==='employee';
      let channel=new URL(req.url || '/', 'https://local.invalid').searchParams.get('channel')==='instagram'?'instagram':'whatsapp';
      let operation='state',args={sessionHash,...(channel==='instagram'?{channel}:{})};
      if(req.method==='POST') {
        if(!verifyCsrf(req)) throw new PilotError('csrf',403);
        const body=readBody(req);
        if(!body || JSON.stringify(body).length>2500 || !['disconnect','activate','pause','manual_reply','takeover','resume_conversation','check_connection'].includes(body.action)) throw new PilotError('invalid_action');
        if(employee && MANAGER_ACTIONS.includes(body.action)) throw new PilotError('manager_required',403);
        operation=body.action==='check_connection'?'state':body.action;
        channel=body.channel==='instagram'?'instagram':'whatsapp';
        if(body.conversationId) channel=(await store('context',{sessionHash,conversationId:body.conversationId})).channel || 'whatsapp';
        args={sessionHash,...(body.confirm===true?{confirm:true}:{}),...(channel==='instagram'?{channel}:{}),...(body.conversationId?{conversationId:body.conversationId}:{}),...(body.text?{text:body.text}:{}),...(body.requestId?{requestId:body.requestId}:{})};
        if(['activate','manual_reply'].includes(operation) && !(channel==='instagram'?instagramMessagingEnabled(env):whatsappMessagingEnabled(env))) throw new PilotError('messaging_unavailable',503);
        // Layla switches on by herself once, right after a channel connects. Any earlier choice
        // (on, or paused by the owner) is answered from state without asking Meta again.
        if(operation==='activate' && body.auto===true) {
          const current=await store('state',{sessionHash,...(channel==='instagram'?{channel}:{})});
          if(current.reason!=='not_activated') return send(res,200,{ok:true,...current,skipped:true,csrfToken:ensureCsrfToken(req,res)},{vary:'Cookie'});
          args.auto=true;
        }
        if(channel==='instagram' && (operation==='activate' || body.action==='check_connection')) await verifyInstagram({sessionHash,env,fetcher,instagram});
        if(channel!=='instagram' && (operation==='activate' || body.action==='check_connection')) {
          const row=await reviews('get',{sessionHash});
          if(!row.integration || row.accountId!==account.id) throw new PilotError('activation_not_ready',409);
          // Signup may have verified this connection moments ago. Reuse that
          // fresh proof rather than hitting the read-only refresh throttle.
          // An explicit health check always asks Meta again.
          if(body.action==='check_connection' || Date.now()-(row.checkedAt || 0)>=5000 || !row.connectionChecks?.routing || !row.connectionChecks?.registered || !row.connectionChecks?.path) {
          const operationId=randomUUID();
          await reviews('claim_operation',{sessionHash,operationId,effect:'refresh'});
          try {
            const token=openToken(row.integration.credential,credentialContext(sessionHash,row.integration),env);
            const c={app:row.integration.app,version:'v25.0',secret:env.LAYLA_META_APP_SECRET};
            const proof=await inspect({c,integration:row.integration,token,fetcher});
            await reviews('result',{sessionHash,operationId,status:proof.connected?'connected':'reconciliation_required',connectionChecks:{routing:!!proof.isolated,registered:!!proof.registered,path:!!proof.pathVerified,nameStatus:proof.nameStatus || 'UNKNOWN'}});
            if(!proof.connected) throw new PilotError(body.action==='check_connection'?'connection_not_ready':'activation_not_ready',409);
          } catch(e) {
            await reviews('result',{sessionHash,operationId,status:'reconciliation_required'}).catch(()=>{});
            throw e;
          }
          }
        }
      }
      const state=await store(operation,args);
      if(!(channel==='instagram'?instagramMessagingEnabled(env):whatsappMessagingEnabled(env))) {state.available=false;state.active=false;state.reason='messaging_unavailable';}
      return send(res,200,{ok:true,...state,csrfToken:ensureCsrfToken(req,res)},{vary:'Cookie'});
    } catch(e) {return send(res,e instanceof PilotError?e.status:503,{ok:false,reason:e instanceof PilotError?e.code:'messaging_unavailable'},{vary:'Cookie'});}
  };
}

export function createBlueWorker({env=process.env,fetcher=fetch,store=messagingStore({env,fetcher}),campaigns=campaignStore({env,fetcher}),inspect=inspectReviewConnection,instagram=instagramStore({env,fetcher})}={}) {
  return async(req,res)=>{
    if(req.method!=='POST') return send(res,405,{ok:false,reason:'method'});
    const workerSecret=messagingWorkerSecret(env);
    if(!workerSecret || !safeEqual(req.headers?.authorization || '',`Bearer ${workerSecret}`)) return send(res,401,{ok:false,reason:'worker_auth'});
    let job,sendStarted=false;
    try {
      if(!convexConfigured(env)) throw new PilotError('messaging_unavailable',503);
      const body=readBody(req);
      if(typeof body?.instagramRefreshId==='string') {
        if(!instagramMessagingEnabled(env)) throw new PilotError('messaging_unavailable',503);
        await refreshInstagram({integrationId:body.instagramRefreshId,env,store:instagram,fetcher});
        return send(res,200,{ok:true});
      }
      if(!whatsappMessagingEnabled(env) && !instagramMessagingEnabled(env)) throw new PilotError('messaging_unavailable',503);
      // Broadcast jobs use their own store, limits and failure state.
      if(typeof body?.campaignStartId==='string' && body.campaignStartId.length<=100) {
        if(!broadcastMessagingEnabled(env)) throw new PilotError('broadcast_unavailable',503);
        return send(res,200,{ok:true,...await runCampaignStart({campaignId:body.campaignStartId,env,store:campaigns,fetcher,inspect})});
      }
      if(typeof body?.campaignJobId==='string' && body.campaignJobId.length<=100) {
        if(!broadcastMessagingEnabled(env)) throw new PilotError('broadcast_unavailable',503);
        return send(res,200,{ok:true,...await runCampaignSend({jobId:body.campaignJobId,env,store:campaigns,fetcher,inspect})});
      }
      if(body?.integrationId && !body.jobId) {
        const context=await store('health_context',{integrationId:body.integrationId});
        if(context?.integration.channel==='instagram') {
          if(!instagramMessagingEnabled(env)) throw new PilotError('messaging_unavailable',503);
          await instagramHealth({context,integrationId:body.integrationId,env,fetcher,store});
        }
        else if(context) {
          let connected=false;
          try {
            const token=openToken(context.integration.credential,credentialContext(context.sessionHash,context.integration),env);
            connected=!!(await inspect({c:{app:context.integration.app,version:'v25.0',secret:env.LAYLA_META_APP_SECRET},integration:context.integration,token,fetcher})).connected;
          } finally {await store('health_result',{integrationId:body.integrationId,connected});}
        }
        return send(res,200,{ok:true});
      }
      if(!body || typeof body.jobId!=='string' || body.jobId.length>100) throw new PilotError('invalid_job');
      job=await store('claim',{jobId:body.jobId,intent:randomUUID()});
      if(!job) return send(res,200,{ok:true,processed:false});
      let outcome={status:'blocked',reason:'connection_not_ready'};
      const token=openToken(job.integration.credential,credentialContext(job.sessionHash,job.integration),env);
      const isInstagram=job.integration.channel==='instagram';
      if (!(isInstagram?instagramMessagingEnabled(env):whatsappMessagingEnabled(env))) throw new PilotError('messaging_unavailable',503);
      // Blue's synthetic testing replies only to listed testers; Green customers are all real.
      const allowed=String(env.BLUE_INSTAGRAM_TEST_SENDERS || '').split(',').map(s=>s.trim());
      if (isInstagram && !isGreenRuntime(env) && !allowed.includes('*') && !allowed.includes(job.number)) {
        await store('result',{jobId:job.jobId,intent:job.intent,status:'blocked',reason:'test_recipient_not_allowed'});
        return send(res,200,{ok:true,processed:false});
      }
      const igConfig=isInstagram?instagramConfig(env):null;
      // Instagram: the durable claim/send_gate checks are the pre-send proof and the
      // Send API's own answer is the rest (190 stops the connection); an extra Graph
      // read per reply only spends Meta's rate limit.
      const proof=isInstagram?{connected:true}:await inspect({c:{app:job.integration.app,version:'v25.0',secret:env.LAYLA_META_APP_SECRET},integration:job.integration,token,fetcher});
      if(proof.connected && await store('send_gate',{jobId:job.jobId,intent:job.intent})) {
        sendStarted=true;
        try {
          let result;
          if(isInstagram) {
            const {status,payload}=await postInstagramMessage({c:igConfig,integration:job.integration,recipient:job.number,message:instagramMessage(job),token,fetcher});
            result=instagramSendResult(status,payload,job.number);
          } else {
            const response=await fetcher(`https://graph.facebook.com/v25.0/${job.integration.phone}/messages`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(whatsappPayload(job))});
            result=providerResult(response.status,await response.json().catch(()=>null));
          }
          outcome={status:result.status,...(result.providerId?{providerId:result.providerId}:{}),...(result.error?{reason:result.error}:{}),...(result.errorCode?{errorCode:result.errorCode}:{})};
        } catch {outcome={status:'ambiguous',reason:'provider_outcome_unknown'};}
      }
      await store('result',{jobId:job.jobId,intent:job.intent,...outcome});
      // An expired token stops further sends until the owner reconnects.
      if(isInstagram && outcome.reason==='reconnect_required') await instagram('checked',{sessionHash:job.sessionHash,integrationId:job.integration.id,connected:false}).catch(()=>{});
      return send(res,200,{ok:true,processed:true,status:outcome.status});
    } catch(e) {
      if(job) await store('result',{jobId:job.jobId,intent:job.intent,status:sendStarted?'ambiguous':'blocked',reason:sendStarted?'provider_outcome_unknown':'connection_check_failed'}).catch(()=>{});
      return send(res,e instanceof PilotError?e.status:503,{ok:false,reason:e instanceof PilotError?e.code:'worker_unavailable'});
    }
  };
}

// Only a definite answer changes an Instagram connection. A dead token or a token
// for another account needs a reconnect; everything else (throttling, outages)
// changes nothing and the owner simply retries.
//
// Call budget: Meta throttles /subscribed_apps after a handful of calls (code 613),
// so the subscription proven at connect (checkedAt) is trusted for a day. Only a
// stale proof costs one idempotent subscribe; the token check is a plain GET /me.
const INSTAGRAM_TRANSIENT=['instagram_provider_unavailable','instagram_provider_failed','instagram_rate_limited'];
async function verifyInstagram({sessionHash,env,fetcher,instagram,now=Date.now()}) {
  const connection=await instagram('context',{sessionHash});
  // A missing or stopped Instagram connection needs a reconnect; answers are a separate check.
  if(!connection || connection.status!=='connected') throw new PilotError('instagram_reconnect_required',409);
  const reconnect=async()=>{
    await instagram('checked',{sessionHash,integrationId:connection.integrationId,connected:false});
    throw new PilotError('instagram_reconnect_required',409);
  };
  const c=instagramConfig(env);
  const token=openToken(connection.integration.credential,credentialContext(sessionHash,connection.integration),env);
  let identity;
  try {identity=await checkInstagramToken({c,integration:connection.integration,token,fetcher});}
  catch(e) {if(e?.code==='instagram_reconnect_required') return reconnect();throw e;}
  if(!identity.connected) return reconnect();
  const proven=Number.isFinite(connection.checkedAt);
  // The subscription was proven today: the token check just made is the fresh proof activation needs.
  if(proven && now-connection.checkedAt<SUBSCRIPTION_PROOF_MS) {await instagram('checked',{sessionHash,integrationId:connection.integrationId,connected:true,tokenOnly:true});return;}
  try {
    const subscribed=await subscribeInstagram(c,connection.integration.igAccount,token,fetcher);
    if(subscribed?.success!==true) throw new PilotError('instagram_subscription_failed',502);
    await instagram('checked',{sessionHash,integrationId:connection.integrationId,connected:true});
  } catch(e) {
    if(e?.code==='instagram_reconnect_required') return reconnect();
    // An older proof stands while Meta throttles or wobbles; try again tomorrow.
    if(proven && INSTAGRAM_TRANSIENT.includes(e?.code)) {console.warn('instagram_resubscribe_deferred',JSON.stringify({reason:e.code}));return;}
    // Never subscribed: throttling or silence means try again; a refusal means the
    // owner must allow message access in Instagram.
    if(['instagram_rate_limited','instagram_provider_unavailable'].includes(e?.code)) throw e;
    throw new PilotError('connection_not_ready',409);
  }
}
// The scheduled health check (every five minutes while replies are on) reads only
// GET /me and pauses replies only on a definite answer about the token.
async function instagramHealth({context,integrationId,env,fetcher,store}) {
  let connected;
  try {
    const token=openToken(context.integration.credential,credentialContext(context.sessionHash,context.integration),env);
    connected=!!(await checkInstagramToken({c:instagramConfig(env),integration:context.integration,token,fetcher})).connected;
  } catch(e) {
    if(INSTAGRAM_TRANSIENT.includes(e?.code)) {console.warn('instagram_health_unavailable',JSON.stringify({reason:e.code}));return;}
    connected=false;
  }
  await store('health_result',{integrationId,connected});
}
