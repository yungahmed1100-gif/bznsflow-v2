import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BUSINESS_INDUSTRIES } from '../../lib/industries';
import { Dialog } from '../dashboard/Dialog';
import { InsightsPreview, ReportRecords } from './InsightsPreview';
import { WorkList } from './WorkViews';
import { PRESENTATION } from './presentation';
import { CompactChats, CompactBroadcasts, CompactBrain, CompactChannels } from './CompactViews';
import logo from '../../assets/logo_bznsflow.png';
import { customers, DRAFT_PACKS, draftMessage, MODES, pair, seedDraft, STATUS } from './data';
import '../../styles/layla-dashboard.css';
import '../../styles/product.css';
import './draft.css';

const tabs = ['chats','work','customers','broadcasts','insights','settings'];
const sectionViews = { work:['board','list','followups'], settings:['brain','channels'] };
const legacy = { today:['work','board'], followups:['work','followups'], money:['insights'], rules:['settings','brain'] };
function routeFor(tab,view) {
  const alias=tab==='customers'&&['work','followups'].includes(view)?['work',view==='work'?'board':'followups']:legacy[tab];
  const section=alias?.[0] || (tabs.includes(tab)?tab:'chats');
  const available=sectionViews[section] || [];
  return {tab:section,view:alias?.[1] || (tab==='work'&&view==='report'?'report':available.includes(view)?view:available[0])};
}
const paths = {insights:'M4 3v18h17M8 16v-4M13 16V8M18 16V5',chats:'M3 4h18v13H8l-5 4V4M7 8h10M7 12h7',broadcasts:'M4 9h4l10-5v16L8 15H4zM8 15l2 6M21 9v6',settings:'M4 7h16M4 17h16M8 4v6M16 14v6',today:'M3 10 12 3l9 7M5 9v12h14V9M9 21v-8h6v8',work:'M4 6h16v15H4zM8 6V3h8v3M4 11h16',followups:'M20 12a8 8 0 1 1-3-6M20 3v6h-6M12 7v5l3 2',customers:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',money:'M3 5h18v14H3zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6 8h1M17 16h1',rules:'M4 7h16M4 17h16M8 4v6M16 14v6'};
function Icon({name}) { return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.work} /></svg>; }
const validState = value => value?.version===1 && Array.isArray(value.jobs) && value.jobs.length===6 && value.jobs.every(j=>typeof j.id==='string'&&typeof j.title?.en==='string'&&typeof j.title?.ar==='string'&&Number.isInteger(j.customer)&&j.customer>=0&&j.customer<4&&Number.isInteger(j.stage)&&j.stage>=0&&j.stage<4&&Number.isFinite(j.amount)&&Number.isFinite(j.dueAt)) && Array.isArray(value.followups) && value.followups.every(f=>typeof f.id==='string'&&value.jobs.some(j=>j.id===f.jobId)&&Object.hasOwn(STATUS,f.status)&&Object.hasOwn(MODES,f.mode)&&typeof f.reason?.en==='string'&&typeof f.reason?.ar==='string'&&Number.isFinite(f.dueAt)) && Array.isArray(value.events) && value.events.every(e=>typeof e.en==='string'&&typeof e.ar==='string') && typeof value.paused==='boolean';

export default function AscendDraft({lang='en'}) {
  const [params,setParams] = useSearchParams();
  const industry = Object.hasOwn(DRAFT_PACKS,params.get('industry')) ? params.get('industry') : 'media';
  const {tab,view} = routeFor(params.get('tab'),params.get('view'));
  const navigate=patch=>{
    const next=new URLSearchParams(params);
    Object.entries(patch).forEach(([key,value])=>next.set(key,value));
    if(patch.tab){const destination=routeFor(patch.tab,patch.view);next.set('tab',destination.tab);if(destination.view)next.set('view',destination.view);else next.delete('view');}
    setParams(next);
  };
  return <Workspace key={industry} lang={lang} industry={industry} tab={tab} view={view} params={params} navigate={navigate} />;
}

function Workspace({lang,industry,tab,view,params,navigate}) {
  const ar=lang==='ar', tr=(en,arabic)=>ar?arabic:en, label=value=>value[lang];
  const pack={...DRAFT_PACKS[industry],work:PRESENTATION[industry].work}, sector=BUSINESS_INDUSTRIES.find(i=>i.id===industry);
  const [state,setState]=useState(null),[modal,setModal]=useState(null),[filter,setFilter]=useState('all'),[notice,setNotice]=useState(''),[storageReady,setStorageReady]=useState(false),[menuOpen,setMenuOpen]=useState(false);
  const storageKey=`bznsflow:ascend-local-draft:v1:${industry}`;
  useEffect(()=>{document.title=tr('Ascend · local draft | BznsFlow','أسيند · مسودة محلية | BznsFlow');},[ar]);
  useEffect(()=>{
    let initial=seedDraft(industry);
    try { const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(validState(saved)) initial=saved; } catch { /* An invalid/local-unavailable snapshot is replaced by fresh fictional data. */ }
    setState(initial);setStorageReady(true);
  },[industry,storageKey]);
  useEffect(()=>{if(!storageReady||!state)return;try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{setNotice(tr('Browser storage is unavailable. Changes last until reload.','تخزين المتصفح غير متاح. تستمر التغييرات حتى إعادة التحميل.'));}},[state,storageReady,storageKey,ar]);
  useEffect(()=>{setMenuOpen(false);},[tab,view]);
  const titles={work:label(pack.work),insights:tr('Insights','المؤشرات'),chats:tr('Chats','المحادثات'),broadcasts:tr('Broadcasts','الرسائل الجماعية'),customers:tr('Customers','العملاء'),settings:tr('Settings','الإعدادات')};
  const descriptions={work:tr('Your daily work. Every owner, deadline and next step.','أعمالك اليومية. المسؤول والموعد والخطوة التالية.'),insights:tr('Understand performance. Find the next improvement.','افهم الأداء وحدد التحسين التالي.'),chats:tr('Conversations, linked work and the next follow-up.','المحادثات والأعمال المرتبطة والمتابعة التالية.'),broadcasts:tr('Your approved messages and customer campaigns.','رسائلك المعتمدة وحملات العملاء.'),customers:tr('Customer relationships, preferences and linked work.','علاقات العملاء وتفضيلاتهم وأعمالهم المرتبطة.'),settings:tr('BznsBrain and channels. Everything Layla knows and does.','عقل الأعمال والقنوات. كل ما تعرفه ليلى وتفعله.')};
  const viewNames={board:tr('Board','لوحة العمل'),list:tr('Schedule & list','الجدول والقائمة'),contacts:tr('Customer list','قائمة العملاء'),work:label(pack.work),followups:tr('Follow-ups','المتابعات'),brain:'BznsBrain',channels:tr('Channels','القنوات')};
  const money=amount=>new Intl.NumberFormat(ar?'ar-OM':'en-OM',{style:'currency',currency:'OMR',maximumFractionDigits:3}).format(amount/1000);
  const date=value=>new Intl.DateTimeFormat(ar?'ar-OM':'en-GB',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Muscat'}).format(value);
  const active=state?.followups.filter(f=>!['completed','cancelled'].includes(f.status))||[];
  const event=(en,arabic)=>pair(en,arabic);
  function updateFollowup(id,patch,activity) {setState(s=>({...s,followups:s.followups.map(f=>f.id===id?{...f,...patch}:f),events:[activity,...s.events].slice(0,20)}));setNotice(label(activity));}
  function simulateReply(jobId) {
    const activity=event('Sample customer replied. Linked follow-ups stopped.','رد العميل التجريبي. توقفت المتابعات المرتبطة.');
    setState(s=>({...s,followups:s.followups.map(f=>f.jobId===jobId&&!['completed','cancelled'].includes(f.status)?{...f,status:'cancelled'}:f),events:[activity,...s.events].slice(0,20)}));setNotice(label(activity));setModal(null);
  }
  const openWork=job=>setModal({type:'work',id:job.id});
  function FollowupRow({item}) {
    const job=state.jobs.find(j=>j.id===item.jobId),overdue=item.dueAt<Date.now()&&!['completed','cancelled'].includes(item.status);
    return <button className="ad-follow-row" onClick={()=>setModal({type:'followup',id:item.id})}>
      <span className={`ad-row-icon is-${item.status}`}><Icon name="followups" /></span>
      <span className="ad-row-copy"><strong>{label(item.reason)}</strong><span>{label(customers[job.customer])} · {label(job.title)}</span></span>
      <span className="ad-row-meta"><span className={`ad-status is-${item.status}`}>{label(STATUS[item.status])}</span><small>{overdue?tr('Overdue · ','متأخرة · '):''}{date(item.dueAt)}</small></span><span aria-hidden="true">{ar?'←':'→'}</span>
    </button>;
  }
  function WorkCard({job}) {return <button className="ad-work-card" onClick={()=>openWork(job)}><span className="ad-card-ref">{industry==='media'?'PRJ':'WRK'} / {String(Number(job.id.split('-')[1])+101)}</span><strong>{label(job.title)}</strong><span>{label(customers[job.customer])}</span><div className="ad-card-footer"><span>{money(job.amount)}</span><span className="ad-avatar">{label(customers[job.customer])[0]}</span></div><small>{date(job.dueAt)}</small></button>;}
  const modalFollowup=modal?.type==='followup'?state?.followups.find(f=>f.id===modal.id):null;
  const modalJob=modal?.type==='work'?state?.jobs.find(j=>j.id===modal.id):modalFollowup?state.jobs.find(j=>j.id===modalFollowup.jobId):null;
  return <div className="ld ad-app" lang={lang} dir={ar?'rtl':'ltr'}>
    <a className="ld-skip" href="#draft-main">{tr('Skip to content','انتقل إلى المحتوى')}</a>
    <header className="ld-top"><a className="ld-brand" aria-label="BznsFlow Ascend" href={`?${params}`}><img src={logo} alt=""/><span>BznsFlow<span className="ad-brand-plan">Ascend</span></span></a><span className="ad-preview-tag"><span/> {tr('Local draft · sample data','مسودة محلية · بيانات تجريبية')}</span><a className="ld-lang" href={`${ar?'/en':''}/owner/ascend-draft?${params}`} lang={ar?'en':'ar'}>{ar?'English':'العربية'}</a><span className="ad-avatar ad-owner-avatar">A</span></header>
    <div className="ad-mobile-menu"><button className="ld-button" aria-expanded={menuOpen} aria-controls="ascend-navigation" onClick={()=>setMenuOpen(v=>!v)}>{menuOpen?tr('Close menu','إغلاق القائمة'):tr('Menu','القائمة')} <span aria-hidden="true">☰</span></button><strong>{titles[tab]}</strong></div>
    <nav id="ascend-navigation" className={`ld-nav ad-nav${menuOpen?' is-open':''}`} onKeyDown={e=>{if(e.key==='Escape'){setMenuOpen(false);document.querySelector('.ad-mobile-menu button')?.focus();}}} aria-label={tr('Main navigation','التنقل الرئيسي')}>
      <div className="ld-workspace"><small>{tr('YOUR WORKSPACE','مساحة عملك')}</small><strong>{industry==='media'?tr('Studio / 01','استوديو / ٠١'):sector[lang]}</strong><span>{tr('Sample business · Muscat','نشاط تجريبي · مسقط')}</span></div>
      <ul>{tabs.map(id=><li key={id}><a href={`?${new URLSearchParams({industry,tab:id,...(sectionViews[id]?{view:sectionViews[id][0]}:{})})}`} aria-current={tab===id?'page':undefined} onClick={e=>{if(e.metaKey||e.ctrlKey)return;e.preventDefault();navigate({tab:id});setNotice('');if(menuOpen)document.getElementById('draft-main')?.focus();}}><Icon name={id}/><span>{titles[id]}</span>{id==='work'&&active.length>0&&<b className="ad-nav-count">{active.length}</b>}</a></li>)}</ul>
      <div className="ad-rail-note"><span className="ad-online-dot"/><strong>{tr('Your business, in motion.','أعمالك تتقدم.')}</strong><p>{tr('One workspace. Every next step.','مساحة واحدة. لكل خطوة تالية.')}</p></div>
    </nav>
    <main id="draft-main" className="ld-main ad-main" data-tab={tab} data-view={view} tabIndex={-1}>
      <div className="ad-topline"><span>ASCEND <span aria-hidden="true">/</span> {tr('WORKSPACE DRAFT','مسودة مساحة العمل')}</span><label className="ad-industry">{tr('Industry','القطاع')}<select value={industry} onChange={e=>navigate({industry:e.target.value})}>{BUSINESS_INDUSTRIES.map(i=><option key={i.id} value={i.id}>{i[lang]}</option>)}</select></label></div>
      <div className="ad-heading"><div><h1>{titles[tab]}<span className="ad-title-dot">.</span></h1><p>{descriptions[tab]}</p></div>{['chats','work'].includes(tab)&&<button className="ld-button ld-primary" onClick={()=>setModal({type:'create'})} disabled={!state}>+ {tr('New follow-up','متابعة جديدة')}</button>}</div>
      <div className="ad-local-note">{tr('Interactive local preview. No messages are sent. Changes stay in this browser.','معاينة محلية تفاعلية. لا يتم إرسال رسائل. تبقى التغييرات في هذا المتصفح.')}<button onClick={()=>{setState(seedDraft(industry));setFilter('all');setModal(null);setNotice(tr('Sample data reset.','أُعيدت البيانات التجريبية.'));}}>{tr('Reset demo','إعادة التجربة')}</button></div>
      <div role="status" aria-live="polite" className={notice?'ad-notice':'ld-visually-hidden'}>{notice}</div>
      {!state?<p role="status">{tr('Loading the workspace…','جارٍ تحميل مساحة العمل…')}</p>:<>
        {sectionViews[tab]&&view!=='report'&&<nav className="ld-section-tabs" aria-label={tr('Views in this section','طرق العرض في القسم')}>{sectionViews[tab].map(v=><a key={v} href={`?${new URLSearchParams({industry,tab,view:v})}`} aria-current={view===v?'page':undefined} onClick={e=>{if(e.metaKey||e.ctrlKey)return;e.preventDefault();navigate({tab,view:v});}}>{viewNames[v]}</a>)}</nav>}
        {tab==='chats'&&<CompactChats lang={lang} pack={pack} state={state} onOpenWork={openWork} onOpenFollowup={item=>setModal({type:'followup',id:item.id})} onReply={simulateReply} onSaveDraft={(jobId,text)=>{setState(s=>({...s,replyDrafts:{...s.replyDrafts,[jobId]:text}}));setNotice(tr('Reply draft saved locally.','حُفظت مسودة الرد محلياً.'));}}/>}
        {tab==='broadcasts'&&<CompactBroadcasts lang={lang} saved={state.campaign} onSave={campaign=>{setState(s=>({...s,campaign}));setNotice(tr('Sample campaign saved as a draft. No messages sent.','حُفظت الحملة التجريبية كمسودة. لم تُرسل رسائل.'));}}/>}
        {tab==='work'&&view!=='report'&&<div className="ad-customer-summary"><span><strong>{customers.length}</strong> {tr('customers','عملاء')}</span><button onClick={()=>navigate({tab:'work',view:'board'})}><strong>{state.jobs.length}</strong> {label(pack.work)}</button><button onClick={()=>navigate({tab:'work',view:'followups'})}><strong>{active.length}</strong> {tr('open follow-ups','متابعات مفتوحة')}</button><span>{tr('Sample work value','قيمة الأعمال التجريبية')} <strong>{money(state.jobs.reduce((n,j)=>n+j.amount,0))}</strong></span></div>}
        {tab==='work'&&view==='board'&&<><div className="ad-work-intro"><span className="ad-status">{label(pack.detail)}</span><span>{tr('Select a card to see its next action.','اختر بطاقة للاطلاع على الخطوة التالية.')}</span></div><div className="ad-board">{pack.stages.map((stage,index)=><section className="ad-stage" key={stage.en}><h2><span className={`ad-stage-dot stage-${index}`}/>{label(stage)}<span>{state.jobs.filter(j=>j.stage===index).length}</span></h2>{state.jobs.filter(j=>j.stage===index).map(job=><WorkCard key={job.id} job={job}/>)}{!state.jobs.some(j=>j.stage===index)&&<p className="ad-empty">{tr('Nothing here yet.','لا توجد أعمال هنا بعد.')}</p>}</section>)}</div></>}
        {tab==='work'&&view==='followups'&&<><div className="ad-filters" aria-label={tr('Follow-up filters','تصفية المتابعات')}>{['all','approval','scheduled','blocked','completed','cancelled'].map(id=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{id==='all'?tr('All follow-ups','جميع المتابعات'):label(STATUS[id])}<span>{state.followups.filter(f=>id==='all'||f.status===id).length}</span></button>)}</div>{state.paused&&<p className="ad-notice">{tr('Automatic follow-ups are paused. You can still review drafts.','المتابعات الآلية متوقفة مؤقتاً. يمكنك مراجعة المسودات.')}</p>}<section className="ad-panel">{state.followups.filter(f=>filter==='all'||f.status===filter).map(item=><FollowupRow key={item.id} item={item}/>)}{!state.followups.some(f=>filter==='all'||f.status===filter)&&<div className="ad-empty"><Icon name="followups"/><h2>{tr('Nothing waiting here','لا توجد متابعات هنا')}</h2><p>{tr('Try another filter or create a follow-up.','جرّب تصفية أخرى أو أنشئ متابعة.')}</p></div>}</section></>}
        {tab==='customers'&&<div className="ad-customer-grid">{customers.map((customer,index)=><section key={customer.en} className="ad-panel ad-customer"><span className="ad-avatar">{label(customer)[0]}</span><h2>{label(customer)}</h2><p>{state.jobs.filter(j=>j.customer===index).length} {tr('linked work records','أعمال مرتبطة')}</p>{state.jobs.filter(j=>j.customer===index).map(job=><button className="ad-customer-work" key={job.id} onClick={()=>openWork(job)}>{label(job.title)}<span aria-hidden="true">{ar?'←':'→'}</span></button>)}</section>)}</div>}
        {tab==='work'&&view==='list'&&<WorkList jobs={state.jobs} pack={pack} lang={lang} date={date} money={money} onOpen={openWork}/>}
        {tab==='insights'&&<InsightsPreview industry={industry} lang={lang} state={state} metric={params.get('metric')} onMetric={metric=>navigate({metric})} onRecords={metric=>navigate({tab:'work',view:'report',metric})} onWork={()=>navigate({tab:'work',view:'board'})}/>}
        {tab==='work'&&view==='report'&&<ReportRecords industry={industry} lang={lang} metric={params.get('metric')} onBack={()=>navigate({tab:'insights'})}/>}
        {tab==='settings'&&view==='channels'&&<CompactChannels lang={lang}/>}
        {tab==='settings'&&view==='brain'&&<><CompactBrain lang={lang} pack={pack} notes={state.brainNotes} onSave={notes=>{setState(s=>({...s,brainNotes:notes}));setNotice(tr('Sample BznsBrain notes saved locally.','حُفظت ملاحظات عقل الأعمال محلياً.'));}}/><details className="ad-settings-fold"><summary><span>{tr('Layla’s behavior · follow-ups','سلوك ليلى · المتابعات')}</span><small>{tr('Timing, approval and stop conditions','التوقيت والموافقة وشروط التوقف')}</small></summary><section className="ad-rule-control"><div><h2>{tr('Follow-ups, on your terms','المتابعات وفق شروطك')}</h2><p>{tr('Working hours: 09:00–17:00 · Asia/Muscat · Reply stops the linked sequence','ساعات العمل: ٠٩:٠٠–١٧:٠٠ · مسقط · الرد يوقف التسلسل المرتبط')}</p></div><button className="ld-button" aria-pressed={state.paused} onClick={()=>{setState(s=>({...s,paused:!s.paused}));setNotice(state.paused?tr('Sample automation resumed.','استؤنفت الأتمتة التجريبية.'):tr('Sample automation paused.','أوقفت الأتمتة التجريبية.'));}}>{state.paused?tr('Resume automation','استئناف الأتمتة'):tr('Pause automation','إيقاف الأتمتة')}</button></section><div className="ad-rules">{state.followups.filter(f=>f.id.startsWith('followup-')).map((item,index)=><section className="ad-panel ad-rule" key={item.id}><span className="ad-eyebrow">0{index+1} / {tr('WORKFLOW','سير العمل')}</span><h2>{label(item.reason)}</h2><p>{label(MODES[item.mode])}</p><div><span>{tr('When','عندما')}</span><strong>{label(pack.stages[state.jobs.find(j=>j.id===item.jobId).stage])}</strong></div><div><span>{tr('Stop if','تتوقف عند')}</span><strong>{tr('Customer replies or work is cancelled','رد العميل أو إلغاء العمل')}</strong></div><button className="ad-text-link" onClick={()=>setModal({type:'followup',id:item.id})}>{tr('Review example','مراجعة المثال')} {ar?'←':'→'}</button></section>)}</div><p className="ad-footnote">{tr('Rules and scheduling are illustrated in this draft. No background worker runs or sends messages.','القواعد والجدولة معروضة للتجربة. لا توجد مهام خلفية تعمل أو ترسل رسائل.')}</p></details></>}
        {state.events.length>0&&<section className="ad-activity"><h2>{tr('Recent activity','النشاط الأخير')}</h2>{state.events.slice(0,3).map((item,index)=><p key={index}><span aria-hidden="true">✓</span> {label(item)}</p>)}</section>}
      </>}
    </main>
    {modal&&state&&<Dialog s={{t:()=>tr('Close','إغلاق')}} title={modal.type==='create'?tr('New follow-up','متابعة جديدة'):modalFollowup?tr('Review follow-up','مراجعة المتابعة'):label(modalJob.title)} onClose={()=>setModal(null)}>
      <div className="ad-modal" dir={ar?'rtl':'ltr'}>
      {modal.type==='create'?<CreateForm jobs={state.jobs} lang={lang} onCreate={item=>{setState(s=>({...s,followups:[...s.followups,item],events:[event('A new sample follow-up was created.','أُنشئت متابعة تجريبية جديدة.'),...s.events]}));setModal(null);setFilter('all');navigate({tab:'followups'});setNotice(tr('Follow-up created in this browser.','أُنشئت المتابعة في هذا المتصفح.'));}}/>:modalFollowup?<FollowupDetail key={modalFollowup.id} item={modalFollowup} job={modalJob} pack={pack} lang={lang} paused={state.paused} onUpdate={(patch,activity)=>updateFollowup(modalFollowup.id,patch,activity)} onReply={()=>simulateReply(modalJob.id)} date={date}/>:<>
        <div className="ad-detail-meta"><span>{label(customers[modalJob.customer])}</span><span className="ad-status">{label(pack.stages[modalJob.stage])}</span></div>
        <dl className="ad-detail-grid"><div><dt>{tr('Work value','قيمة العمل')}</dt><dd>{money(modalJob.amount)}</dd></div><div><dt>{tr('Next milestone','المرحلة القادمة')}</dt><dd>{date(modalJob.dueAt)}</dd></div><div><dt>{tr('Industry detail','تفاصيل القطاع')}</dt><dd>{label(pack.detail)}</dd></div><div><dt>{tr('Owner','المسؤول')}</dt><dd>{tr('You · sample manager','أنت · مدير تجريبي')}</dd></div></dl>
        <h3>{tr('Linked follow-ups','المتابعات المرتبطة')}</h3>{state.followups.filter(f=>f.jobId===modalJob.id).map(f=><button key={f.id} className="ad-linked" onClick={()=>setModal({type:'followup',id:f.id})}><span>{label(f.reason)}</span><small>{label(STATUS[f.status])} {ar?'←':'→'}</small></button>)}{!state.followups.some(f=>f.jobId===modalJob.id)&&<p>{tr('No follow-ups yet.','لا توجد متابعات بعد.')}</p>}
        <div className="ad-modal-actions"><button className="ld-button" onClick={()=>{setState(s=>({...s,jobs:s.jobs.map(j=>j.id===modalJob.id?{...j,stage:Math.min(j.stage+1,3)}:j)}));setNotice(tr('Sample work moved to the next stage.','نُقل العمل التجريبي إلى المرحلة التالية.'));}} disabled={modalJob.stage===3}>{tr('Move to next stage','الانتقال للمرحلة التالية')}</button><button className="ld-button ld-quiet" onClick={()=>simulateReply(modalJob.id)}>{tr('Simulate customer reply','محاكاة رد العميل')}</button></div><p className="ad-footnote">{tr('This sample action stops open follow-ups linked to this work.','هذا الإجراء التجريبي يوقف المتابعات المفتوحة المرتبطة بهذا العمل.')}</p>
      </>}
      </div>
    </Dialog>}
  </div>;
}

function FollowupDetail({item,job,pack,lang,paused,onUpdate,onReply,date}) {
  const ar=lang==='ar',tr=(en,arabic)=>ar?arabic:en,label=v=>v[lang];
  const [message,setMessage]=useState(item.message||draftMessage(pack,job,lang));
  const [mode,setMode]=useState(item.mode),[saved,setSaved]=useState(false);
  const done=['completed','cancelled'].includes(item.status);
  return <><div className="ad-detail-meta"><span>{label(customers[job.customer])}</span><span className={`ad-status is-${item.status}`}>{label(STATUS[item.status])}</span></div><h3>{label(item.reason)}</h3><p className="ad-footnote">{label(job.title)} · {date(item.dueAt)} · {item.channel}</p>
    <label className="ld-field">{tr('Follow-up mode','نمط المتابعة')}<select value={mode} disabled={done} onChange={e=>{setMode(e.target.value);setSaved(false);}}>{Object.entries(MODES).map(([id,name])=><option key={id} value={id}>{label(name)}</option>)}</select></label>
    <label className="ld-field">{tr('Message draft','مسودة الرسالة')}<textarea rows={4} value={message} maxLength={1500} disabled={done} onChange={e=>{setMessage(e.target.value);setSaved(false);}}/></label>
    {item.status==='blocked'?<div className="ad-guard"><strong>{tr('Instagram window closed','نافذة إنستغرام مغلقة')}</strong><p>{tr('Keep this as an internal task. No automatic message can be sent.','احتفظ بها كمهمة داخلية. لا يمكن إرسال رسالة آلية.')}</p></div>:<div className="ad-guard"><strong>{tr('Before sending','قبل الإرسال')}</strong><p>{tr('Recheck consent, reply status and the messaging window. Outside the WhatsApp window, an approved template is required.','تحقق من الموافقة والردود ونافذة المراسلة. خارج نافذة واتساب يلزم قالب معتمد.')}</p></div>}
    {!done&&<><div className="ad-modal-actions"><button className="ld-button" disabled={!message.trim()} onClick={()=>{onUpdate({message:message.trim(),mode},pair('Sample draft saved.','حُفظت المسودة التجريبية.'));setSaved(true);}}>{saved?tr('Saved','تم الحفظ'):tr('Save draft','حفظ المسودة')}</button><button className="ld-button ld-quiet" onClick={()=>onUpdate({dueAt:Date.now()+86400000},pair('Follow-up snoozed for one day.','أُجلت المتابعة ليوم واحد.'))}>{tr('Snooze 1 day','تأجيل يوم')}</button></div><div className="ad-modal-actions"><button className="ld-button ld-primary" disabled={paused||item.status==='blocked'||!message.trim()} onClick={()=>onUpdate({status:'completed',message:message.trim(),mode},pair('Simulated completion only. No message was sent.','إكمال تجريبي فقط. لم تُرسل أي رسالة.'))}>{tr('Simulate approval & completion','محاكاة الموافقة والإكمال')}</button><button className="ad-text-link" onClick={onReply}>{tr('Simulate customer reply','محاكاة رد العميل')}</button></div></>}
    <p className="ad-footnote">{done?tr('This follow-up is closed. Reset the demo to try it again.','هذه المتابعة مغلقة. أعد التجربة للمحاولة مجدداً.'):paused?tr('Automation is paused in this sample workspace.','الأتمتة متوقفة في مساحة العمل التجريبية.'):tr('Local simulation only. No provider or scheduler is connected.','محاكاة محلية فقط. لا يوجد اتصال بمزود رسائل أو مجدول.')}</p></>;
}

function CreateForm({jobs,lang,onCreate}) {
  const tr=(en,ar)=>lang==='ar'?ar:en,[error,setError]=useState('');
  return <form className="ad-create" onSubmit={e=>{e.preventDefault();const fields=new FormData(e.currentTarget),reason=String(fields.get('reason')).trim(),dueAt=new Date(String(fields.get('due'))).getTime();if(!reason||!Number.isFinite(dueAt)||dueAt<=Date.now()){setError(tr('Choose a future time and enter a reason.','اختر وقتاً مستقبلياً وأدخل السبب.'));return;}onCreate({id:crypto.randomUUID(),jobId:String(fields.get('job')),reason:pair(reason,reason),dueAt,status:'approval',channel:'WhatsApp',mode:'approval',kind:'custom'});}}>
    <label className="ld-field">{tr('Linked work','العمل المرتبط')}<select name="job">{jobs.map(j=><option key={j.id} value={j.id}>{j.title[lang]}</option>)}</select></label><label className="ld-field">{tr('Reason','السبب')}<input name="reason" required maxLength={160} placeholder={tr('What should happen next?','ما الخطوة التالية؟')}/></label><label className="ld-field">{tr('Due time · your device timezone','الوقت · المنطقة الزمنية لجهازك')}<input type="datetime-local" name="due" required/></label>{error&&<p role="alert" className="ld-inline-error">{error}</p>}<p className="ad-footnote">{tr('Starts in approval mode. This creates a sample record in your browser.','تبدأ في وضع الموافقة. يُنشئ هذا سجلاً تجريبياً في متصفحك.')}</p><button className="ld-button ld-primary" type="submit">{tr('Create follow-up','إنشاء متابعة')}</button>
  </form>;
}
