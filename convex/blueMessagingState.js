import { rolloutAllows } from './greenRollout.js';
import { instagramConnection, instagramRow, rowForIntegration } from './blueInstagramState.js';
// Atomic tenant messaging transitions. Network requests happen only after a
// durable outbound intent has been claimed; uncertain sends are never retried.
import { applyInbound, applyOptout, linkConversation, recordQuestions, sectorFor, textRetention, MESSAGE_RETENTION_MS } from './blueContacts.js';
import { recordDemand } from './hasib/demandState.js';
import { commerceTurn } from './hasib/laylaOrders.js';
import { realEstateTurn } from './hasib/realEstateTurn.js';
import { phrase, langOf } from '../config/layla-tones.js';
import { byteLength } from '../api/_lib/layla/reply-guard.js';
import { INSTAGRAM_MAX_BYTES, conversationHistory, runawayChat } from './laylaReply.js';
import { REPLY_DEBOUNCE_MS, TOPIC_FOR_INTENT, turnContext, turnMode } from './laylaTurn.js';
import { effectiveBehaviour } from '../config/layla-behaviour.js';
import { recordGap } from './brainState.js';
import { NAME_FIELD, mergeFields, qualificationStatus, validateFieldValue } from '../config/layla-qualification.js';
// Abuse and cost guards, far below Meta's own limits (WhatsApp ~80 msg/s per number, Instagram
// ~100 calls/s per account). The minute pace only delays a burst; the daily caps hand chats to the team.
export const RATE_LIMITS=Object.freeze({perMinute:30,perDay:1000,globalPerDay:10000});
// Send failures that concern one recipient, not the connection.
const RECIPIENT_FAILURES=new Set(['outside_window','recipient_unavailable','invalid_recipient','window_expired','rate_limited']);
// What an inbound message asked about, kept on the message (never its text) so Today can count it.
// `disabled` is Layla's answer to a booking request: the patient asked for an appointment.
export const MESSAGE_TOPICS=new Set(['services','prices','hours','location','disabled','human']);
const DAY = 86400000;
const terminal = new Set(['sent','delivered','read','failed','ambiguous','blocked']);
const receiptRank = {attempting:0,ambiguous:0,submitted:1,failed:2,sent:3,delivered:4,read:5};
/**
 * A saved and connected account whose owner confirmed the business facts when
 * saving them. That confirmation is the one review: later edits go live as soon
 * as they are saved, with no separate preview approval.
 */
export function messagingReady(row, now) {
  return !!(row?.accountId && row.expiresAt>now && ['connected','paused'].includes(row.status) && row.profile?.reviewed && (row.profile.humanContact || row.profile.handoffMode === 'inbox'));
}
// Stops from the owner's own dashboard actions are about Layla, not the owner's replies. A reply
// typed on the owner's phone ('native_reply'), an opt-out, an unsend or a disconnect still stops everything queued.
const OWNER_SAFE_STOPS=new Set(['human_takeover','owner_paused']);
export async function stopQueuedJobs(ctx,integrationId,personId,reason) {
  const jobs=await ctx.db.query('blueMessages').withIndex('by_integration_status',q=>q.eq('integrationId',integrationId).eq('status','queued')).take(100);
  for(const job of jobs) if((!personId || job.conversationId===personId) && !(job.manual && OWNER_SAFE_STOPS.has(reason))) await ctx.db.patch(job._id,{status:'blocked',reason});
}
// A reply typed in the WhatsApp app is a human handling the chat, so it shows in the handoff queue.
const nativeHandling=(person,e,now)=>({handoffState:'handling',handoffReason:person.handoffReason || e.handoffReason || 'native_reply',handoffOpenedAt:person.handoffOpenedAt || now});
export async function executeMessaging(ctx, a, now = Date.now()) {
  const ok = value => ({ok:true,value}), fail = reason => ({ok:false,reason});
  const find = (table,index,field,value) => ctx.db.query(table).withIndex(index,q=>q.eq(field,value)).unique();
  const global = await find('blueMessagingSettings','by_key','key','global');
  const enabled = global?.enabled === true;
  const controls = id => find('blueMessagingControls','by_integration','integrationId',id);
  const conversation = key => find('blueConversations','by_key','key',key);
  const message = key => find('blueMessages','by_key','key',key);
  const schedule = job => ctx.scheduler.runAfter(0, a.workerFunction, {jobId:job});
  // Stops from the owner's own dashboard actions: they are about Layla, not about the owner's
  // replies. A reply typed on the owner's phone ('native_reply'), an opt-out, an unsend or a
  // disconnect still stops everything queued.
  const stopQueued=(integrationId,personId,reason)=>stopQueuedJobs(ctx,integrationId,personId,reason);
  // The owner's own dashboard actions bump the conversation version to fence Layla's replies;
  // they re-stamp the owner's waiting replies so those still pass the version check. A reply
  // from the owner's phone bumps the version without this, so it still fences them.
  // Scoped to this conversation's last 24 hours: older replies are outside the window and cannot send.
  async function restampOwnerReplies(integrationId,personId,version) {
    const jobs=await ctx.db.query('blueMessages').withIndex('by_conversation_at',q=>q.eq('conversationId',personId).gte('at',now-DAY)).take(500);
    for(const job of jobs) if(job.manual && job.integrationId===integrationId && ['queued','attempting'].includes(job.status)) await ctx.db.patch(job._id,{conversationVersion:version});
  }
  async function approvedCatalog(accountId, limit = 1000) {
    const rows = await ctx.db.query('blueCatalogEntries').withIndex('by_owner_status_order',q=>q.eq('ownerKey',String(accountId)).eq('status','approved')).take(limit);
    return rows.map(({entryKey,nameEn,nameAr,prices,benefitEn,benefitAr,descriptionEn,descriptionAr})=>({entryKey,nameEn,nameAr,prices,benefitEn,benefitAr,descriptionEn,descriptionAr}));
  }
  async function reconcileCampaignReceipt(e) {
    let target=e.intent?await find('blueCampaignRecipients','by_intent','intent',e.intent):null;
    if(!target) target=await ctx.db.query('blueCampaignRecipients').withIndex('by_provider',q=>q.eq('providerId',e.id)).unique();
    if(!target || target.integrationId!==a.integrationId || (target.waId && target.waId!==e.recipient) || (target.providerId && target.providerId!==e.id)) return;
    if((receiptRank[e.status] || 0)<=(receiptRank[target.status] || 0)) return;
    await ctx.db.patch(target._id,{status:e.status,providerId:e.id,updatedAt:now,...(e.status==='failed'&&Number.isSafeInteger(e.errorCode)?{errorCode:e.errorCode,reason:'provider_delivery_failed'}:{})});
    if(target.realEstateDraftId && ['delivered','read'].includes(e.status)) await ctx.db.patch(target.realEstateDraftId,{status:e.status,deliveredAt:now,updatedAt:now});
  }
  async function rowForInstagram(integrationId) {
    const connection=await find('blueInstagramConnections','by_integration','integrationId',integrationId);
    return connection ? instagramRow(await find('blueReviewSessions','by_hash','sessionHash',connection.sessionHash),connection,now) : null;
  }
  async function rowForControl(control) {
    if (!control) return null;
    const row=await find('blueReviewSessions','by_hash','sessionHash',control.sessionHash);
    return rowForIntegration(ctx,row,control.integrationId,now);
  }
  /** A job's connection: through Layla's control when there is one, else through the owning account (owner replies never need Layla). */
  async function rowForJob(job, control) {
    if (control) return rowForControl(control);
    if (!job?.manual) return null;
    const account=await ctx.db.get(job.accountId);
    const row=account?.draftHash && await find('blueReviewSessions','by_hash','sessionHash',account.draftHash);
    return row ? rowForIntegration(ctx,row,job.integrationId,now) : null;
  }
  const ready = row => messagingReady(row, now);
  /** The chat's pending reply, if this action still owns it and the chat and business are unchanged. */
  async function pendingTurn(conversationId,key) {
    const person=conversationId && await ctx.db.get(conversationId);
    const pending=person?.pendingReply;
    if(!pending || pending.key!==key) return {ok:false,reason:'superseded'};
    if((person.version || 0)!==pending.version || person.takeover || person.optout) return {ok:false,reason:'conversation_changed'};
    const control=await controls(person.integrationId);
    const row=await rowForControl(control) || await find('blueReviewSessions','by_integration','integration.id',person.integrationId) || await rowForInstagram(person.integrationId);
    if(!row?.accountId || String(row.accountId)!==String(person.accountId) || row.integration?.id!==person.integrationId) return {ok:false,reason:'integration_not_ready'};
    if((row.profileVersion || 1)!==pending.profileVersion) return {ok:false,reason:'profile_changed'};
    const contact=person.contactId ? await ctx.db.get(person.contactId) : null;
    return {ok:true,person,row,control,contact,pending};
  }
  async function queue(row, person, text, key, manual = false, handoff = false, media = undefined, tracking = undefined) {
    const pending = await ctx.db.query('blueMessages').withIndex('by_integration_status',q=>q.eq('integrationId',row.integration.id).eq('status','queued')).take(100);
    const textKeep=await textRetention(ctx,row.accountId,row);
    const record = {key,integrationId:row.integration.id,accountId:row.accountId,conversationId:person._id,conversationVersion:person.version || 0,profileVersion:row.profileVersion || 1,direction:'out',text,at:now,expiresAt:now+MESSAGE_RETENTION_MS,textExpiresAt:now+textKeep,status:pending.length>=100?'blocked':'queued',manual,handoff,...(media?{media}:{}),...(tracking?.opportunityId?{realEstateOpportunityId:tracking.opportunityId}:{}),...(pending.length>=100?{reason:'queue_limit'}:{})};
    const id=await ctx.db.insert('blueMessages',record);
    if(record.status==='queued') await schedule(id);
    return id;
  }
  if(a.operation==='binding' && a.channel==='instagram') {
    const connection=await find('blueInstagramConnections','by_ig_account','igAccount',a.igAccount);
    const row=connection && await find('blueReviewSessions','by_hash','sessionHash',connection.sessionHash);
    const bound=instagramRow(row,connection,now);
    // Server-only answer: the sealed credential lets the webhook look up the sender's @username.
    return ok(bound && row.expiresAt>now ? {integrationId:connection.integrationId,channel:'instagram',app:connection.integration.app,igAccount:connection.igAccount,sessionHash:connection.sessionHash,integration:connection.integration,profile:row.profile,profileVersion:row.profileVersion || 1}:null);
  }
  if(a.operation==='binding') {
    const row=await ctx.db.query('blueReviewSessions').withIndex('by_phone',q=>q.eq('phone',a.phone)).unique();
    return ok(row?.accountId && row.expiresAt>now && row.integration?.waba===a.waba ? {integrationId:row.integration.id,app:row.integration.app,waba:row.integration.waba,phone:row.integration.phone,sender:row.integration.sender,profile:row.profile,profileVersion:row.profileVersion || 1}:null);
  }
  if(a.operation==='health_context') {
    const control=await controls(a.integrationId),row=await rowForControl(control);
    return ok(enabled && control?.active && ready(row)?{integration:row.integration,sessionHash:row.sessionHash}:null);
  }
  if(a.operation==='health_result') {
    const control=await controls(a.integrationId);
    if(control && !a.connected) await ctx.db.patch(control._id,{active:false,reason:'connection_not_ready'});
    return ok(null);
  }
  if(['context','disconnect','state','activate','pause','resume_conversation','takeover','manual_reply'].includes(a.operation)) {
    let row=await find('blueReviewSessions','by_hash','sessionHash',a.sessionHash);
    if (row?.accountId && a.conversationId) {
      const person=await ctx.db.get(a.conversationId);
      if (!person || person.accountId!==row.accountId) return fail('conversation_not_found');
      row=await rowForIntegration(ctx,row,person.integrationId,now);
    } else if (row?.accountId && a.channel==='instagram') {
      // A signed-in owner whose Instagram is missing, stopped or expired needs a
      // reconnect; "sign in again" would send them the wrong way.
      const bound=instagramRow(row,await instagramConnection(ctx,row.accountId),now);
      if (!bound && row.expiresAt>now) return fail('instagram_reconnect_required');
      row=bound;
    }
    if(!row?.accountId || row.expiresAt<=now || !row.integration) return fail('sign_in_required');
    if(a.operation==='context') return ok({channel:row.integration.channel || 'whatsapp'});
    let control=await controls(row.integration.id);
    if(a.operation==='disconnect') {
      if(a.confirm!==true || row.integration.channel==='instagram') return fail('confirmation_required');
      await stopQueued(row.integration.id,null,'disconnected');
      if(control) await ctx.db.delete(control._id);
      const claim=await find('blueAssetClaims','by_phone','phone',row.integration.phone);
      if(claim?.sessionHash===row.sessionHash) await ctx.db.delete(claim._id);
      const templates=await ctx.db.query('blueTemplates').withIndex('by_account_template',q=>q.eq('accountId',row.accountId)).take(500);
      for(const template of templates) if(template.integrationId===row.integration.id) await ctx.db.delete(template._id);
      // Clear every connection field, as review:detach does, so the next connect starts clean.
      await ctx.db.patch(row._id,{integration:undefined,phone:undefined,waba:undefined,connectionChecks:undefined,checkedAt:undefined,status:'draft',attempt:undefined,operation:undefined,operationAt:undefined,operationEffect:undefined,pendingSelection:undefined,diagnostic:undefined,subscriptionAttempted:undefined,registrationAttempted:undefined});
      return ok({disconnected:true});
    }
    // An automatic switch-on (right after connecting) never overrides a choice the owner already made.
    if(a.operation==='activate' && a.auto===true && control && (control.active || control.reason!=='not_activated')) {}
    else if(a.operation==='activate') {
      if(!enabled) return fail('messaging_unavailable');
      const uncertain=await ctx.db.query('blueMessages').withIndex('by_integration_status',q=>q.eq('integrationId',row.integration.id).eq('status','ambiguous')).take(1);
      if(uncertain.length) return fail('send_outcome_unknown');
      if(!ready(row) || now-(row.checkedAt || 0)>60000 || !row.connectionChecks?.routing || !row.connectionChecks?.registered || !row.connectionChecks?.path) return fail('activation_not_ready');
      const value={integrationId:row.integration.id,sessionHash:row.sessionHash,accountId:row.accountId,active:true,reason:'',activatedAt:now,healthAt:now,profileVersion:row.profileVersion || 1};
      if(control) await ctx.db.patch(control._id,value); else await ctx.db.insert('blueMessagingControls',value);
    } else if(a.operation==='pause' && control) {
      await ctx.db.patch(control._id,{active:false,reason:'owner_paused'});
      await stopQueued(row.integration.id,null,'owner_paused');
    }
    else if(['resume_conversation','takeover','manual_reply'].includes(a.operation)) {
      const person=await ctx.db.get(a.conversationId);
      if(!person || person.accountId!==row.accountId || person.integrationId!==row.integration.id) return fail('conversation_not_found');
      if(a.operation==='resume_conversation') {
        if(person.optout) return fail('contact_opted_out');
        await stopQueued(row.integration.id,person._id,'human_takeover');
        await ctx.db.patch(person._id,{takeover:false,handoffState:'returned',updatedAt:now,version:(person.version || 0)+1});
        await restampOwnerReplies(row.integration.id,person._id,(person.version || 0)+1);
      } else if(a.operation==='takeover') {await stopQueued(row.integration.id,person._id,'human_takeover');await ctx.db.patch(person._id,{takeover:true,handoffState:'handling',handoffReason:person.handoffReason || 'team_takeover',handoffOpenedAt:person.handoffOpenedAt || now,updatedAt:now,version:(person.version || 0)+1});await restampOwnerReplies(row.integration.id,person._id,(person.version || 0)+1);}
      else {
        // The owner's own reply never depends on Layla (paused, taken over or never activated);
        // it needs a ready connection, a customer who has not opted out and the 24h window.
        if(!enabled) return fail('messaging_paused_by_operator');
        if(!rolloutAllows(global,row.accountId,person.number,now)) return fail('rollout_restricted');
        if(!ready(row)) return fail('connection_not_ready');
        if(person.optout) return fail('contact_opted_out');
        if(now-person.lastInbound>=DAY) return fail('window_closed');
        // Instagram counts bytes, so a long Arabic reply is refused here rather than by Meta after sending starts.
        if(typeof a.text!=='string' || !a.text.trim() || a.text.length>1000 || (row.integration.channel==='instagram' && byteLength(a.text)>INSTAGRAM_MAX_BYTES) || !/^[a-f0-9-]{36}$/.test(a.requestId || '')) return fail('invalid_text');
        const key=`manual:${row.integration.id}:${a.requestId}`;
        if(!await message(key)) {
          await stopQueued(row.integration.id,person._id,'human_takeover');
          const version=(person.version || 0)+1;
          await ctx.db.patch(person._id,{takeover:true,handoffState:'handling',handoffReason:person.handoffReason || 'team_takeover',handoffOpenedAt:person.handoffOpenedAt || now,updatedAt:now,version});
          await restampOwnerReplies(row.integration.id,person._id,version);
          await queue(row,{...person,version},a.text.trim(),key,true);
        }
      }
    }
    control=await controls(row.integration.id);
    const people=await ctx.db.query('blueConversations').withIndex('by_account_updated',q=>q.eq('accountId',row.accountId)).order('desc').take(50);
    const msgs=await ctx.db.query('blueMessages').withIndex('by_account_at',q=>q.eq('accountId',row.accountId)).order('desc').take(100);
    const rate=await find('blueMessageRates','by_key','key',`day:${row.integration.id}:${Math.floor(now/DAY)}`);
    const active=enabled && control?.active===true && ready(row);
    return ok({available:enabled,active,reason:!enabled?'messaging_unavailable':active?'':control?.reason || (control?.active?'activation_not_ready':'not_activated'),limits:{perMinute:RATE_LIMITS.perMinute,perDay:RATE_LIMITS.perDay,usedToday:rate?.count || 0},conversations:people.map(p=>({id:p._id,number:p.number,takeover:p.takeover,optout:p.optout,lastInbound:p.lastInbound})),messages:msgs.reverse().map(m=>({id:m._id,conversationId:m.conversationId,direction:m.direction,text:m.textExpiresAt>now?m.text:undefined,status:m.status,reason:m.reason,at:m.at}))});
  }
  if(a.operation==='ingest') {
    const control=await controls(a.integrationId);
    // Before activation there is no control: WhatsApp resolves through the setup row, Instagram
    // through its connection. Either way the messages are kept; nothing is answered until activation.
    const row=await rowForControl(control) || await find('blueReviewSessions','by_integration','integration.id',a.integrationId) || await rowForInstagram(a.integrationId);
    if(!row?.accountId || row.expiresAt<=now || row.integration?.id!==a.integrationId) return fail('integration_not_ready');
    if(a.profileVersion!==undefined && a.profileVersion!==(row.profileVersion || 1)) return fail('profile_changed');
    // Takeover and opt-out events are applied before any message in this batch.
    let incoming=a.events;
    if(row.integration.channel==='instagram') {
      const kept=[];
      for(const e of incoming) {
        if(e.kind==='echo') {
          const known=await ctx.db.query('blueMessages').withIndex('by_provider',q=>q.eq('providerId',e.id)).unique();
          if(known?.integrationId===a.integrationId && known.direction==='out') continue;
          const pending=await ctx.db.query('blueMessages').withIndex('by_integration_status',q=>q.eq('integrationId',a.integrationId).eq('status','attempting')).take(1);
          if(pending.length) return fail('echo_pending');
        }
        kept.push(e);
      }
      incoming=kept;
    }
    const deleted=new Set(incoming.filter(e=>e.kind==='deleted').map(e=>e.id));
    const events=[...incoming].sort((x,y)=>Number(['optout','takeover'].includes(y.kind))-Number(['optout','takeover'].includes(x.kind)));
    const sectorId=sectorFor(row);
    const textKeep=await textRetention(ctx,row.accountId,row);
    let catalog=null, brain=null;
    for(let e of events) {
      if(e.kind==='deleted') {
        const original=await message(`incoming:${a.integrationId}:${e.id}`);
        if(!original && e.from) {
          const key=`${a.integrationId}:${e.from}`;
          let person=await conversation(key);
          if(!person) person=await ctx.db.get(await ctx.db.insert('blueConversations',{key,integrationId:a.integrationId,accountId:row.accountId,channel:'instagram',igAccount:row.integration.igAccount,number:e.from,lastInbound:0,takeover:false,optout:false,updatedAt:now}));
          await ctx.db.insert('blueMessages',{key:`incoming:${a.integrationId}:${e.id}`,integrationId:a.integrationId,accountId:row.accountId,conversationId:person._id,direction:'in',at:now,expiresAt:now+MESSAGE_RETENTION_MS,textExpiresAt:Number.MAX_SAFE_INTEGER,status:'deleted'});
        }
        if(original) {
          await ctx.db.patch(original._id,{text:undefined,textExpiresAt:Number.MAX_SAFE_INTEGER});
          const person=await ctx.db.get(original.conversationId);
          if(person) {await stopQueued(a.integrationId,person._id,'message_deleted');await ctx.db.patch(person._id,{version:(person.version || 0)+1});}
        }
        continue;
      }
      if(e.kind==='message' && deleted.has(e.id)) continue;
      if(e.kind==='receipt') {
        let target=e.intent?await find('blueMessages','by_intent','intent',e.intent):null;
        if(!target) target=await ctx.db.query('blueMessages').withIndex('by_provider',q=>q.eq('providerId',e.id)).unique();
        if(!target) {await reconcileCampaignReceipt(e);continue;}
        if(target.integrationId!==a.integrationId || target.direction!=='out') continue;
        const person=await ctx.db.get(target.conversationId);
        if(person?.number!==e.recipient || (target.providerId && target.providerId!==e.id)) continue;
        if((receiptRank[e.status] || 0)>(receiptRank[target.status] || 0)) {
          await ctx.db.patch(target._id,{status:e.status,providerId:e.id,...(e.status==='failed'&&Number.isSafeInteger(e.errorCode)?{errorCode:e.errorCode}:{})});
          if(target.realEstateOpportunityId && ['delivered','read'].includes(e.status)) await ctx.db.patch(target.realEstateOpportunityId,{deliveredAt:now,updatedAt:now});
          if(target.realEstateDraftId && ['delivered','read'].includes(e.status)) await ctx.db.patch(target.realEstateDraftId,{status:e.status,deliveredAt:now,updatedAt:now});
        }
        continue;
      }
      const key=`${a.integrationId}:${e.from}`;
      let person=await conversation(key);
      if(!person) person=await ctx.db.get(await ctx.db.insert('blueConversations',{key,integrationId:a.integrationId,accountId:row.accountId,...(row.integration.channel==='instagram'?{channel:'instagram',igAccount:row.integration.igAccount}:{}),number:e.from,lastInbound:0,takeover:false,optout:false,updatedAt:now}));
      let contact=await linkConversation(ctx,person,{sectorId,now,secret:a.hashSecret,igAccount:row.integration.igAccount});
      if(typeof e.profileName==='string' && e.profileName.trim() && contact.profileName!==e.profileName.trim().slice(0,80)) {
        contact={...contact,profileName:e.profileName.trim().slice(0,80)};
        await ctx.db.patch(contact._id,{profileName:contact.profileName,updatedAt:now});
      }
      if(['optout','takeover'].includes(e.kind)) {
        await ctx.db.patch(person._id,{[e.kind==='optout'?'optout':'takeover']:true,updatedAt:now,version:(person.version || 0)+1,...(e.kind==='takeover'?nativeHandling(person,e,now):{})});
        await stopQueued(a.integrationId,person._id,e.kind==='optout'?'contact_opted_out':'native_reply');
        if(e.kind==='optout') await applyOptout(ctx,contact,now);
        continue;
      }
      if(e.kind!=='message' && e.kind!=='echo') continue;
      const msgKey=`incoming:${a.integrationId}:${e.id}`;
      if(await message(msgKey)) continue;
      await ctx.db.insert('blueMessages',{key:msgKey,integrationId:a.integrationId,accountId:row.accountId,conversationId:person._id,direction:e.kind==='echo'?'human':'in',text:e.text,...(e.kind==='message'&&MESSAGE_TOPICS.has(e.intent)?{topic:e.intent}:{}),at:e.at,expiresAt:now+MESSAGE_RETENTION_MS,textExpiresAt:e.medicalContentWithheld?Number.MAX_SAFE_INTEGER:now+textKeep,status:'received'});
      if(e.kind==='echo') {
        await ctx.db.patch(person._id,{takeover:true,...nativeHandling(person,e,now),updatedAt:now,version:(person.version || 0)+1});
        await stopQueued(a.integrationId,person._id,'native_reply');
        await ctx.db.patch(contact._id,{lastActivityAt:Math.max(contact.lastActivityAt || 0,e.at || now),updatedAt:now});
        continue;
      }
      const tone=row.profile?.tone, lang=langOf(e.text);
      // Layla's own recent replies in this chat: the first reply welcomes, and a runaway chat stops.
      const history=await conversationHistory(ctx,person._id,now);
      let applied=null;
      if(e.intent!=='optout') {
        catalog ??= await approvedCatalog(row.accountId);
        // Fields are captured even while a person has taken over the chat. The words come from the model;
        // which detail to ask for next is decided here, one at a time.
        // Catalyst's BznsBrain mode reads the owner's behaviour settings; Ascend keeps its own flow.
        if(!brain) { const mode=await turnMode(ctx,row); brain={mode,behaviour:mode==='brain'?effectiveBehaviour(row,sectorId):null}; }
        applied=await applyInbound(ctx,contact,{text:e.text,intent:e.intent || 'ai',handoff:false,at:e.at,now,sectorId,catalog,tone,mode:brain.mode,behaviour:brain.behaviour});
      }
      // Paused ingress keeps messages, contacts and opt-outs without creating work to replay.
      const automate=!a.suppressAutomation && rolloutAllows(global,row.accountId,person.number,now) && !!control?.active;
      let commerce=null, realEstate=null;
      if(automate && applied) {
        // Hasib's lost-demand report: a product question becomes a PII-free signal (no-op while Hasib is off).
        // Hasib must never stop Layla replying: a failed signal is logged and the message carries on.
        try { await recordDemand(ctx,{accountId:row.accountId,contact:applied.contact,conversationId:person._id,updates:applied.updates,intent:e.intent,at:e.at}); }
        catch(err) { console.error('hasib_demand_failed',err?.message); }
        // Stock, orders and listings stay deterministic: their lines reach the customer word for word.
        try { commerce=await commerceTurn(ctx,{row,person,contact:applied.contact,text:e.text,intent:e.intent,now,secret:a.hashSecret}); }
        catch(err) { console.error('hasib_order_failed',err?.message); }
        try { realEstate=await realEstateTurn(ctx,{row,person,contact:applied.contact,text:e.text,now,secret:a.hashSecret}); }
        catch(err) { console.error('real_estate_turn_failed',err?.message); }
      }
      if(e.intent==='optout') await stopQueued(a.integrationId,person._id,'contact_opted_out');
      const version=(person.version || 0)+(e.intent==='optout'?1:0);
      await ctx.db.patch(person._id,{version,lastInbound:Math.max(person.lastInbound,e.at),updatedAt:now,...(e.intent==='optout'?{optout:true,pendingReply:undefined}:{})});
      if(e.intent==='optout') {await applyOptout(ctx,contact,now);continue;}
      if(!automate) continue;
      if(!enabled || !control.active || !ready(row) || person.optout || person.takeover || contact.optout || now-e.at>=DAY) continue;
      // Safety net, not a conversation limit: a bot loop or flood stops Layla in this chat after one notice.
      if(runawayChat(history,e.text)) {
        // Stop older queued replies first, then send the one notice under the new version so its fence holds.
        await stopQueued(a.integrationId,person._id,'human_takeover');
        await ctx.db.patch(person._id,{takeover:true,handoffState:'open',handoffReason:'reply_limit',handoffOpenedAt:now,updatedAt:now,version:version+1,pendingReply:undefined});
        await queue(row,{...person,version:version+1},phrase(tone,'replyLimit',lang),`reply:${a.integrationId}:${e.id}`,false,true);
        continue;
      }
      // Cost guard: once this number or the platform has used its daily sends, no model call is made.
      const capped=await Promise.all([[`day:${a.integrationId}:${Math.floor(now/DAY)}`,RATE_LIMITS.perDay],[`global:${Math.floor(now/DAY)}`,RATE_LIMITS.globalPerDay]].map(async([key,max])=>((await find('blueMessageRates','by_key','key',key))?.count || 0)>=max));
      if(capped.some(Boolean)) continue;
      // One pending reply per chat: a quick run of messages is answered once, with every fact it produced.
      const prev=person.pendingReply?.version===version ? person.pendingReply : null;
      const liveFacts=realEstate?.facts || commerce?.facts;
      const pending={key:`reply:${a.integrationId}:${e.id}`,inboundKey:msgKey,version,profileVersion:row.profileVersion || 1,inboundAt:e.at,
        firstReply:prev ? prev.firstReply : history.firstReply,
        facts:[...(prev?.facts || []),...(liveFacts?[liveFacts]:[])].slice(-4),
        acks:[...(prev?.acks || []),...(commerce?.ack?[commerce.ack]:[])].slice(-3),
        photos:[...(prev?.photos || []),...(commerce?.photo?[commerce.photo]:[])].slice(-2),
        realEstate:realEstate?.opportunityId || realEstate?.handoff ? {opportunityId:realEstate.opportunityId,handoff:!!realEstate.handoff} : prev?.realEstate,
        askKey:applied?.plan?.keys?.[0] || null,
        ...(applied?.override?{override:applied.override}:{}),...(applied?.reception || prev?.reception?{reception:true}:{}),
        notes:{media:!!(e.media || prev?.notes?.media),tooLong:!!(e.tooLong || prev?.notes?.tooLong)}};
      await ctx.db.patch(person._id,{pendingReply:pending});
      if(a.replyFunction) await ctx.scheduler.runAfter(REPLY_DEBOUNCE_MS,a.replyFunction,{conversationId:person._id,key:pending.key});
    }
    return ok(null);
  }
  // Layla's AI turn, part 1: everything the model may use for this chat's pending reply.
  if(a.operation==='reply_context') {
    const turn=await pendingTurn(a.conversationId,a.key);
    if(!turn.ok) return ok({skip:turn.reason});
    const {person,row,contact,pending}=turn;
    return ok({context:await turnContext(ctx,{row,person,contact,pending,sectorId:sectorFor(row),now}),version:pending.version,profileVersion:pending.profileVersion});
  }
  // Part 2: the checked reply goes out only if nothing changed while the model was writing it.
  if(a.operation==='reply_commit') {
    const turn=await pendingTurn(a.conversationId,a.key);
    if(!turn.ok) return ok({skip:turn.reason});
    const {person,row,control,contact,pending}=turn;
    await ctx.db.patch(person._id,{pendingReply:undefined});
    if(!enabled || !control?.active || !ready(row) || contact?.optout || now-pending.inboundAt>=DAY || !rolloutAllows(global,row.accountId,person.number,now)) return ok({skip:'not_allowed'});
    const sectorId=sectorFor(row);
    const brain=(await turnMode(ctx,row))==='brain';
    // Details the model heard are proposals: kept only when they pass the sector's own validation.
    if(contact && a.fields) {
      const catalog=await approvedCatalog(row.accountId);
      const updates=Object.entries(a.fields).map(([key,value])=>({key,value:validateFieldValue(sectorId,key,value,catalog)})).filter(u=>u.value).map(u=>{const row=u.key==='service'?catalog.find(r=>[r.nameEn,r.nameAr].includes(u.value)):null;return {...u,confidence:0.8,source:'customer',...(row?.entryKey?{ref:row.entryKey}:{})};});
      const merged=mergeFields(contact.fields,updates,now);
      const inboundText=(await message(pending.inboundKey))?.text || '';
      const proposed=typeof a.fields[NAME_FIELD.key]==='string' && /^[\p{L}][\p{L}' -]{1,39}$/u.test(a.fields[NAME_FIELD.key].trim()) ? a.fields[NAME_FIELD.key].trim() : '';
      // BznsBrain: a name the customer corrects in their latest message replaces the one they gave before.
      const correction=brain && proposed && contact.customerName && proposed!==contact.customerName && inboundText.toLocaleLowerCase().includes(proposed.toLocaleLowerCase());
      const name=proposed && (!contact.customerName || correction) ? proposed : '';
      const declined=brain && (a.declined || []).includes(NAME_FIELD.key) && !contact.customerName && !name;
      // Reception (dental first): the request is recorded for the team to confirm; Layla stays on the chat.
      const service=merged.fields.find(f=>f.key==='service' && f.value), when=merged.fields.find(f=>f.key==='preferred_time' && f.value);
      const appointment=brain && pending.reception && service ? {status:'requested',service:service.value,...(service.ref?{serviceRef:service.ref}:{}),...(when?{preferences:when.value}:{}),requestedAt:contact.appointment?.requestedAt || now,updatedAt:now} : null;
      if(merged.changed || name || declined || appointment) await ctx.db.patch(contact._id,{...(merged.changed?{fields:merged.fields,qualificationStatus:qualificationStatus(sectorId,merged.fields)}:{}),...(name?{customerName:name}:{}),...(declined?{nameDeclined:true}:{}),...(appointment?{appointment}:{}),updatedAt:now});
    }
    const inbound=await message(pending.inboundKey);
    // BznsBrain: a question the business data did not cover becomes a review suggestion. It never edits published knowledge.
    if(brain && a.needsTeam && !a.ai?.fallback && ['unknown','answer','services','prices','hours','location'].includes(a.intent) && inbound?.text) {
      try { await recordGap(ctx,row,{question:inbound.text,sectorId,now}); } catch(err) { console.error('brain_gap_failed',err?.message); }
    }
    if(inbound && TOPIC_FOR_INTENT[a.intent] && !inbound.topic) await ctx.db.patch(inbound._id,{topic:TOPIC_FOR_INTENT[a.intent]});
    const owner={...person,version:pending.version};
    let jobId=null;
    if(!a.noReply && a.text) {
      jobId=await queue(row,owner,a.text,pending.key,false,false,undefined,pending.realEstate);
      if(a.ai) await ctx.db.patch(jobId,{ai:a.ai});
    }
    if(pending.realEstate?.opportunityId) await ctx.db.patch(pending.realEstate.opportunityId,{replyQueuedAt:now,updatedAt:now});
    if(pending.realEstate?.handoff) await ctx.db.patch(person._id,{takeover:true,handoffState:'open',handoffReason:'opportunity_review',handoffOpenedAt:now,updatedAt:now});
    // A product photo follows the answer, once per product per chat each day.
    if(pending.photos?.length) {
      const recent=await ctx.db.query('blueMessages').withIndex('by_conversation_at',q=>q.eq('conversationId',person._id).gte('at',now-DAY)).take(200);
      for(const [i,photo] of pending.photos.entries()) if(!recent.some(m=>m.media?.storageId===photo.storageId)) await queue(row,owner,photo.caption,`photo:${pending.key}:${i}`,false,false,{kind:'image',storageId:photo.storageId});
    }
    if(contact && a.askedField) await recordQuestions(ctx,await ctx.db.get(contact._id),[a.askedField],now);
    return ok({queued:jobId});
  }
  if(a.operation==='claim') {
    const job=await ctx.db.get(a.jobId);
    if(!job || job.status!=='queued') return ok(null);
    const inflight=await ctx.db.query('blueMessages').withIndex('by_integration_status',q=>q.eq('integrationId',job.integrationId).eq('status','attempting')).take(1);
    if(inflight.length) return ok(null);
    const control=await controls(job.integrationId), row=await rowForJob(job,control), person=await ctx.db.get(job.conversationId);
    // Layla's reply depends on the business profile; the owner's own text does not. Both stay fenced
    // by the conversation version (re-stamped by the owner's own dashboard actions).
    if((!job.manual && job.profileVersion!==(row?.profileVersion || 1)) || job.conversationVersion!==(person?.version || 0)) {await ctx.db.patch(job._id,{status:'blocked',reason:'conversation_or_profile_changed'});return ok(null);}
    const reason=!enabled?'global_paused':!rolloutAllows(global,job.accountId,person?.number,now)?'rollout_restricted':!ready(row)?'activation_not_ready':!control?.active && !job.manual?'owner_paused':person?.optout?'contact_opted_out':person?.takeover && !job.manual && !job.handoff?'human_takeover':!person || now-person.lastInbound>=DAY || now-job.at>=DAY?'window_expired':null;
    if(reason) {await ctx.db.patch(job._id,{status:'blocked',reason});return ok(null);}
    for(const [key,max,expiresAt] of [[`minute:${job.integrationId}:${Math.floor(now/60000)}`,RATE_LIMITS.perMinute,now+120000],[`day:${job.integrationId}:${Math.floor(now/DAY)}`,RATE_LIMITS.perDay,now+2*DAY],[`global:${Math.floor(now/DAY)}`,RATE_LIMITS.globalPerDay,now+2*DAY]]) {
      const r=await find('blueMessageRates','by_key','key',key);
      if(r?.count>=max) {
        // A burst over the per-minute pace waits in the queue; the minute recovery cron sends it next.
        if(key.startsWith('minute:')) return ok(null);
        await ctx.db.patch(job._id,{status:'blocked',reason:'rate_limit'});
        // A held reply is never dropped silently: the chat joins the team's attention queue.
        if(!job.manual && person && person.handoffState!=='open') await ctx.db.patch(person._id,{handoffState:'open',handoffReason:'rate_limit',handoffOpenedAt:now,updatedAt:now});
        return ok(null);
      }
      if(r) await ctx.db.patch(r._id,{count:r.count+1});else await ctx.db.insert('blueMessageRates',{key,count:1,expiresAt});
    }
    await ctx.db.patch(job._id,{status:'attempting',intent:a.intent,attemptAt:now});
    const imageUrl=job.media ? await ctx.storage.getUrl(job.media.storageId) : null;
    if(job.media && !imageUrl) {await ctx.db.patch(job._id,{status:'blocked',reason:'photo_missing'});return ok(null);}
    return ok({jobId:job._id,intent:a.intent,number:person.number,text:job.text,integration:row.integration,sessionHash:row.sessionHash,profileVersion:row.profileVersion || 1,...(imageUrl?{imageUrl}:{})});
  }
  if(a.operation==='send_gate') {
    const job=await ctx.db.get(a.jobId), control=job && await controls(job.integrationId), row=await rowForJob(job,control), person=job && await ctx.db.get(job.conversationId);
    return ok(!!(job?.status==='attempting' && job.intent===a.intent && (job.manual || job.profileVersion===(row?.profileVersion || 1)) && job.conversationVersion===(person?.version || 0) && rolloutAllows(global,job.accountId,person?.number,now) && ready(row) && (control?.active || job.manual) && !person?.optout && (!person?.takeover || job.manual || job.handoff) && now-person.lastInbound<DAY));
  }
  if(a.operation==='result') {
    const job=await ctx.db.get(a.jobId);
    if(!job || job.intent!==a.intent || !['submitted','ambiguous','failed','blocked'].includes(a.status)) return fail('invalid_state');
    if(!terminal.has(job.status)) await ctx.db.patch(job._id,{status:a.status,...(a.reason?{reason:a.reason}:{}),...(a.providerId?{providerId:a.providerId}:{}),...(a.status==='failed'&&Number.isSafeInteger(a.errorCode)?{errorCode:a.errorCode}:{})});
    if(job.realEstateOpportunityId) {
      if(a.status==='submitted') await ctx.db.patch(job.realEstateOpportunityId,{providerSubmittedAt:now,lastAttemptAt:now,updatedAt:now});
      if(['failed','ambiguous','blocked'].includes(a.status)) {
        await ctx.db.patch(job.realEstateOpportunityId,{lastAttemptAt:now,updatedAt:now});
        const existing=await ctx.db.query('realEstateTasks').withIndex('by_entity',q=>q.eq('entityType','opportunity').eq('entityId',String(job.realEstateOpportunityId))).take(20);
        if(!existing.some(task=>task.status==='open'&&task.kind==='send_failed')) await ctx.db.insert('realEstateTasks',{accountId:job.accountId,kind:'send_failed',entityType:'opportunity',entityId:String(job.realEstateOpportunityId),status:'open',reason:a.reason || a.status,createdAt:now,updatedAt:now});
      }
    }
    if(job.realEstateDraftId) await ctx.db.patch(job.realEstateDraftId,{status:a.status==='submitted'?'provider_submitted':a.status,updatedAt:now,...(a.status==='submitted'?{providerSubmittedAt:now}:{})});
    // One customer's problem (window closed, account gone, Meta throttling) is that chat's, never
    // the whole business's: the team sees the chat, and Layla keeps answering everyone else.
    if(a.status==='failed' && RECIPIENT_FAILURES.has(a.reason)) {
      const person=await ctx.db.get(job.conversationId);
      if(!job.manual && person && person.handoffState!=='open') await ctx.db.patch(person._id,{handoffState:'open',handoffReason:'send_failed',handoffOpenedAt:now,updatedAt:now});
    } else if(a.status==='ambiguous' || a.status==='failed' || ['connection_not_ready','connection_check_failed'].includes(a.reason)) {
      const control=await controls(job.integrationId);
      if(control) await ctx.db.patch(control._id,{active:false,reason:a.status==='ambiguous'?'send_outcome_unknown':'provider_failed'});
    }
    const next=await ctx.db.query('blueMessages').withIndex('by_integration_status',q=>q.eq('integrationId',job.integrationId).eq('status','queued')).take(1);
    if(next.length) await schedule(next[0]._id);
    return ok(null);
  }
  return fail('invalid_state');
}
