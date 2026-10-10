import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePolling } from '../../hooks/usePolling';
import { hasib, dashboard } from '../../lib/dashboard/api';
import { photoProblem, uploadProductPhoto } from '../../lib/hasib/photo.js';
import { buildRealEstateSubmission } from '../../lib/hasib/realEstateForms.js';
import { QUICK_FILTERS, nextViewings, quickFilter, metricSearch, insightsReturn } from '../../lib/hasib/realEstateWork.js';
import { PageHeader } from './DashboardVisuals';
import { PropertiesView } from './realestate/PropertiesView.jsx';
import { BoardView, DealPreview } from './realestate/BoardView.jsx';
import { ViewingsView } from './realestate/ViewingsView.jsx';
import { FollowupsView, FOLLOWUP_FILTERS } from './realestate/FollowupsView.jsx';
import { InsightsView } from './realestate/InsightsView.jsx';
import { MetricRecords } from './realestate/MetricRecords.jsx';
import { RulesView } from './realestate/RulesView.jsx';
import { DealRecord } from './realestate/DealRecord.jsx';
import { TeamView } from './realestate/TeamView.jsx';
import { RecordForm } from './realestate/RecordForm.jsx';
import { label } from './realestate/labels.js';

const empty = { items: [] };
const WIDE = '(min-width: 1100px)';
// Quick actions that deep-link to a form (older Today links and the Deals header use these).
const ACTIONS = { property: 'property', opportunity: 'opportunity', viewing: 'viewing', offer: 'offer', 'follow-up': 'draft' };

/** Every open deal, a page at a time up to 1,000, so the board is never silently cut at 25. */
async function allDeals() {
  const items = [];
  let cursor = null, pages = 0;
  do {
    const page = await hasib('opportunities', { limit: 200, ...(cursor ? { cursor } : {}) });
    items.push(...page.items); cursor = page.cursor; pages++;
  } while (cursor && pages < 5);
  return { items, truncated: !!cursor };
}

async function load(section, view, manager, params) {
  if (section === 'insights') {
    const [insights, commissions, team] = await Promise.all([hasib('real_estate_insights', { period: params.get('period') || '30d', ...(params.get('segment') ? { segment: params.get('segment') } : {}) }), hasib('commissions'), hasib('team_list')]);
    return { insights, commissions, team };
  }
  if (section === 'settings') return { team: await hasib('team_list') };
  const summary = await hasib('real_estate_overview');
  const team = manager ? hasib('team_list') : Promise.resolve(empty);
  if (params.get('metric') && params.get('from') === 'insights' && manager)
    return { summary, team: await team, records: await hasib('real_estate_metric_records', { metric: params.get('metric'), period: params.get('period') || '30d', ...(params.get('segment') ? { segment: params.get('segment') } : {}) }) };
  if (view === 'viewings') return { summary, viewings: await hasib('viewings', { limit: 200 }), team: await team };
  if (view === 'properties') return { summary, properties: await hasib('properties', { limit: 200 }), team: await team };
  if (view === 'followups') return { summary, team: await team, followups: await hasib('real_estate_followups', { filter: params.get('filter') || 'today', ...(params.get('deal') ? { opportunityId: params.get('deal') } : {}) }) };
  const [opportunities, viewings] = await Promise.all([allDeals(), hasib('viewings', { limit: 200 })]);
  return { summary, opportunities, viewings, team: await team };
}

/** The forms pick customers, deals and listings; they load once, when a form first opens. */
const formLists = () => Promise.all([dashboard('contacts', { limit: 50 }), hasib('properties', { limit: 200 }), allDeals()])
  .then(([contacts, properties, opportunities]) => ({ contacts, properties, opportunities }));

/** The strip above Deals: what needs someone now, each opening the filtered view that holds it. */
function NeedsAttention({ ar, summary, onGo }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const f = summary?.followups?.counts || {};
  const items = [
    ['overdue', f.overdue, tr('Overdue follow-ups', 'متابعات متأخرة'), 'coral', { view: 'followups', filter: 'overdue' }],
    ['late', summary?.counts?.slaBreaches, tr('Late first replies', 'ردود أولى متأخرة'), 'coral', { view: 'board', quick: 'awaiting' }],
    ['approval', f.approval, tr('Waiting for approval', 'بانتظار الموافقة'), 'yellow', { view: 'followups', filter: 'approval' }],
    ['outcome', summary?.viewings?.outcomeMissing, tr('Viewings without an outcome', 'معاينات بلا نتيجة'), 'orange', { view: 'viewings' }],
    ['today', f.today, tr('Due today', 'مستحقة اليوم'), 'orange', { view: 'followups', filter: 'today' }],
    ['stale', summary?.counts?.staleListings, tr('Listings to verify', 'إعلانات تحتاج تحققاً'), 'yellow', { view: 'properties' }],
  ].filter(([, n]) => n > 0);
  return <section className="hb-attention" aria-label={tr('Needs attention', 'يحتاج انتباهك')}>
    {items.length ? items.map(([id, n, text, tone, go]) => <button key={id} type="button" className="hb-attention-item" data-tone={tone} onClick={() => onGo('work', go)}>
      <b className="ld-num">{n}</b><span>{text}</span></button>)
      : <p className="hb-attention-clear">{tr('Nothing needs attention right now.', 'لا شيء يحتاج انتباهك الآن.')}</p>}
  </section>;
}

/**
 * Real Estate on Ascend (ascend/real-estate.md): Deals (board, viewings, properties, follow-ups),
 * Insights and the rules and team in Settings. Every record is the same deal id everywhere.
 */
export function RealEstateDashboard({ section, view, s, h, overview, timezone = 'Asia/Muscat', onChanged, onGo, initialAction = '', tabs = null }) {
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en);
  const manager = overview.workspaceRole === 'manager';
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(null), [values, setValues] = useState({}), [photos, setPhotos] = useState([]), [lists, setLists] = useState(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirm, setConfirm] = useState(null);
  const [preview, setPreview] = useState(null), [changes, setChanges] = useState(0);
  const busyRef = useRef(false), scroll = useRef(0);
  const dealId = params.get('deal');
  const key = [section, view, params.get('metric'), params.get('period'), params.get('segment'), params.get('filter'), view === 'followups' ? dealId : ''].join('|');
  const state = usePolling(() => load(section, view, manager, params), [key, manager], { interval: 30000 });
  const data = { ...(lists || {}), ...(state.data || {}) };
  const termsDays = overview.settings?.realEstate?.commissionTermsDays ?? 30;
  const agentNames = useMemo(() => new Map((data.team?.members || []).filter(m => m.accountId).map(m => [String(m.accountId), m.email])), [data.team]);
  const setParam = patch => { const next = new URLSearchParams(params); for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); } setParams(next); };

  const clearPhotos = () => { for (const p of photos) if (p.preview?.startsWith('blob:')) URL.revokeObjectURL(p.preview); setPhotos([]); };
  const openForm = (type, preset = {}) => {
    setError(''); setValues(preset); if (type !== 'property') clearPhotos(); setForm(type);
    if (!lists) formLists().then(setLists).catch(e => setError(h.reason(e.reason) || s.reason(e.reason)));
    window.requestAnimationFrame?.(() => document.querySelector('.hb-action-fields')?.scrollIntoView({ block: 'start' }));
  };
  const closeForm = () => { clearPhotos(); setForm(null); setValues({}); };
  useEffect(() => { setConfirm(null); setError(''); if (ACTIONS[initialAction]) openForm(ACTIONS[initialAction]); else closeForm(); }, [section, view, initialAction]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Runs one change; refuses double-clicks, reloads, and explains any refusal in the owner's language. */
  const perform = async (operation, body, after) => {
    if (busyRef.current) return false;
    busyRef.current = true; setBusy(true); setError(''); setConfirm(null);
    try {
      const result = await hasib(operation, body);
      if (result?.invitationDelivery === 'failed') setError(tr('Invitation saved, but the email could not be sent. Use “Resend invitation”.', 'تم حفظ الدعوة، لكن تعذّر إرسال البريد. استخدم «إعادة إرسال الدعوة».'));
      await state.refresh({ quiet: true }); setChanges(n => n + 1); after?.(); onChanged?.();
      return true;
    } catch (e) { setError(h.reason(e.reason) || s.reason(e.reason)); return false; }
    finally { busyRef.current = false; setBusy(false); }
  };
  const act = (operation, body, after, question) => question ? setConfirm({ question, run: () => perform(operation, body, after) }) : perform(operation, body, after);
  const submit = async e => {
    e.preventDefault();
    const submission = buildRealEstateSubmission(form, values, { requestId: crypto.randomUUID(), propertyPhotos: photos, opportunities: data.opportunities?.items });
    if (submission && await perform(submission.operation, submission.body)) { closeForm(); setLists(null); }
  };
  const pickPhotos = async e => {
    const files = [...(e.target.files || [])].slice(0, 10 - photos.length); e.target.value = '';
    for (const file of files) {
      const problem = photoProblem(file); if (problem) { setError(h.reason(problem)); continue; }
      try { const up = await uploadProductPhoto(hasib, file); setPhotos(rows => [...rows, { id: up.photoId, preview: URL.createObjectURL(up.preview) }].slice(0, 10)); }
      catch (err) { setError(h.reason(err.reason) || h.reason('photo_upload_failed')); }
    }
  };
  const editProperty = row => {
    openForm('property', { propertyId: row.id, version: row.version, label: row.label, reference: row.reference || '', transactionType: row.transactionType || 'sale', propertyType: row.propertyType || '', area: row.area || '',
      location: row.location || '', price: (row.askingPriceMinor || 0) / 1000, pricePeriod: row.pricePeriod === 'total' ? '' : row.pricePeriod || '', bedrooms: row.bedrooms || '', bathrooms: row.bathrooms || '', sizeSqm: row.sizeSqm || '',
      description: row.description || '', assignedAccountId: row.assignedAccountId || '', availability: row.availability || 'available', authorityStatus: row.authorityStatus || 'pending', features: (row.features || []).join(', ') });
    setPhotos((row.photoIds || []).map((id, index) => ({ id, preview: row.photoUrls?.[index] || '' })));
  };

  // Opening a record remembers where the list was; Back returns there with its filters.
  const openDeal = id => { scroll.current = window.scrollY; setPreview(null); setParam({ deal: id }); };
  const openCard = id => (window.matchMedia?.(WIDE).matches ? setPreview(id) : openDeal(id));
  const back = () => {
    const from = params.get('from');
    if (from === 'chat' && params.get('chat')) return onGo('chats', { chat: params.get('chat') });
    if (from === 'customers') return onGo('customers');
    setParam({ deal: null });
  };
  useLayoutEffect(() => { if (!dealId && scroll.current) { window.scrollTo(0, scroll.current); scroll.current = 0; } }, [dealId]);
  const backLabel = params.get('from') === 'chat' ? tr('Back to chat', 'العودة إلى المحادثة') : params.get('from') === 'customers' ? tr('Back to customers', 'العودة إلى العملاء')
    : params.get('metric') ? tr('Back to source records', 'العودة إلى السجلات المصدرية') : view === 'followups' ? tr('Back to follow-ups', 'العودة إلى المتابعات') : view === 'viewings' ? tr('Back to viewings', 'العودة إلى المعاينات') : tr('Back to the board', 'العودة إلى اللوحة');

  const formPanel = form && <RecordForm form={form} values={values} setValues={setValues} ar={ar} h={h} s={s} busy={busy} data={data} manager={manager} actorAccountId={overview.teamSummary?.actorAccountId}
    photos={photos} onPickPhotos={pickPhotos} onRemovePhoto={photo => { if (photo.preview?.startsWith('blob:')) URL.revokeObjectURL(photo.preview); setPhotos(rows => rows.filter(r => r.id !== photo.id)); }}
    onSubmit={submit} onCancel={closeForm} />;
  const notices = <>
    {error && <p className="ld-inline-error" role="alert">{error}</p>}
    {confirm && <div className="hb-confirm" role="alertdialog" aria-label={confirm.question}><p>{confirm.question}</p>
      <button type="button" className="ld-button ld-primary" disabled={busy} onClick={confirm.run}>{tr('Yes, continue', 'نعم، متابعة')}</button>
      <button type="button" className="ld-button ld-quiet" disabled={busy} onClick={() => setConfirm(null)}>{s.t('cancel')}</button></div>}
  </>;

  if (section === 'work' && dealId && view !== 'followups') return <div className="hb-real-estate">{notices}{formPanel}
    <DealRecord dealId={dealId} ar={ar} h={h} s={s} timezone={timezone} manager={manager} busy={busy} termsDays={termsDays} version={changes} backLabel={backLabel}
      act={act} openForm={openForm} onGo={onGo} onClose={back} onFollowups={() => onGo('work', { view: 'followups', filter: 'today', deal: dealId })} /></div>;
  if (state.loading && !state.data) return <p className="ld-state" role="status">{s.t('loading')}</p>;
  if (state.error && !state.data) return <div className="ld-state" role="alert"><p>{h.reason(state.error.reason) || s.reason(state.error.reason)}</p><button type="button" className="ld-button" onClick={() => state.refresh()}>{h.t('retry')}</button></div>;
  const shared = { ar, h, s, data, busy, timezone };

  if (section === 'insights') return <div className="hb-real-estate">{notices}
    <InsightsView {...shared} act={act} params={params} agentNames={agentNames} onParams={patch => setParam(patch)}
      onRecords={(metric, segment) => onGo('work', metricSearch({ metric, period: params.get('period') || '30d', segment }))} /></div>;
  if (section === 'settings') return <div className="hb-real-estate">{notices}{formPanel}
    {view === 'team' ? <TeamView {...shared} act={act} openForm={openForm} />
      : <RulesView ar={ar} h={h} settings={overview.settings} busy={busy} onSave={body => perform('settings_update', body)} />}</div>;

  // Deals
  const header = <PageHeader icon="target" title={overview.pack?.ownerUi?.work?.[ar ? 'ar' : 'en'] || tr('Deals', 'الصفقات')} description={tr('Every inquiry from first message to close, with what needs someone now at the top.', 'كل استفسار من أول رسالة حتى الإغلاق، وفي الأعلى ما يحتاج أحداً الآن.')}
    primary={{ label: tr('New inquiry', 'استفسار جديد'), onClick: () => openForm('opportunity', {}) }}>
    {manager && <div className="hb-header-actions"><button type="button" className="ld-button ld-quiet" onClick={() => openForm('property', { transactionType: 'sale', availability: 'available', authorityStatus: 'pending' })}>{tr('Add a listing', 'إضافة إعلان')}</button></div>}
  </PageHeader>;
  const strip = <NeedsAttention ar={ar} summary={data.summary} onGo={onGo} />;
  let body;
  if (data.records) body = <MetricRecords ar={ar} h={h} s={s} timezone={timezone} data={data.records} agentNames={agentNames} onOpenDeal={openDeal}
    onBack={() => onGo('insights', insightsReturn(params))} />;
  else if (view === 'viewings') body = <ViewingsView {...shared} act={act} openForm={openForm} onOpenDeal={openDeal} onGo={onGo} />;
  else if (view === 'properties') body = <PropertiesView {...shared} freshnessDays={overview.settings?.listingFreshnessDays ?? 30} onAdd={() => openForm('property', { transactionType: 'sale', availability: 'available', authorityStatus: 'pending' })} onEdit={editProperty}
    onVerify={row => act('property_verify', { propertyId: row.id, version: row.version }, null, tr(`Confirm you checked “${row.label}” today: still available, price and authority correct?`, `تأكيد أنك تحققت اليوم من «${row.label}»: ما زال متاحاً والسعر والصلاحية صحيحة؟`))} />;
  else if (view === 'followups') body = <FollowupsView {...shared} manager={manager} filter={FOLLOWUP_FILTERS.includes(params.get('filter')) ? params.get('filter') : 'today'} onFilter={f => setParam({ filter: f })}
    act={act} onOpenDeal={id => onGo('work', { view: 'board', deal: id })} onGo={onGo} dealFilter={dealId} onClearDeal={() => setParam({ deal: null })} />;
  else {
    const quick = QUICK_FILTERS.includes(params.get('quick')) ? params.get('quick') : params.get('stage') === 'unassigned' ? 'unassigned' : 'all';
    const closed = ['won', 'lost'].includes(params.get('stage')) ? params.get('stage') : null;
    const viewing = nextViewings(data.viewings?.items);
    const all = data.opportunities?.items || [];
    const deals = closed ? all.filter(d => d.stage === closed) : quickFilter(all.filter(d => !['won', 'lost'].includes(d.stage)), quick, { actorAccountId: overview.teamSummary?.actorAccountId, tasks: data.summary?.tasks, viewing });
    const selected = preview && all.find(d => d.id === preview);
    body = <>
      <div className="hb-board-filters">
        <div className="ld-segmented" role="radiogroup" aria-label={tr('Show deals', 'عرض الصفقات')}>
          {QUICK_FILTERS.filter(q => q !== 'mine' || !manager || agentNames.size).map(q => <label key={q}><input type="radio" name="re-quick" checked={!closed && quick === q} onChange={() => setParam({ quick: q === 'all' ? null : q, stage: null })} /><span>{label('quick', q, ar)}</span></label>)}
        </div>
        <div className="ld-segmented" role="radiogroup" aria-label={tr('Closed deals', 'الصفقات المغلقة')}>
          {['won', 'lost'].map(st => <label key={st}><input type="radio" name="re-quick" checked={closed === st} onChange={() => setParam({ stage: st, quick: null })} /><span>{label('stage', st, ar)} <b className="ld-num">{data.summary?.pipeline?.[st] ?? 0}</b></span></label>)}
        </div>
      </div>
      {data.opportunities?.truncated && <p className="hb-warn" role="status">{tr('Showing the newest 1,000 deals.', 'تُعرض أحدث ١٠٠٠ صفقة.')}</p>}
      <div className={`hb-board-layout ${selected ? 'has-preview' : ''}`}>
        {closed ? <ul className="hb-re-deals">{deals.map(d => <li key={d.id} className="hb-panel"><div className="hb-status-line"><b><bdi>{d.contactName || tr('Customer', 'عميل')}</bdi></b><span className="ld-chip" data-stage={d.stage}>{label('stage', d.stage, ar)}</span></div>
          <p>{label('need', d.need, ar)} · {d.areas.join('، ') || '—'}</p><button type="button" className="ld-button" onClick={() => openDeal(d.id)}>{tr('Open deal', 'فتح الصفقة')}</button></li>)}</ul>
          : <BoardView ar={ar} h={h} s={s} timezone={timezone} deals={deals} viewing={viewing} agentNames={agentNames} busy={busy} selectedId={preview} emptyFilter={quick !== 'all'}
            onOpen={openCard} onAdd={() => openForm('opportunity', {})}
            onMove={(deal, stage) => act('opportunity_stage', { opportunityId: deal.id, version: deal.version, status: stage }, null, tr(`Move ${deal.contactName || 'this deal'} to ${label('stage', stage, false)}?`, `نقل ${deal.contactName || 'الصفقة'} إلى «${label('stage', stage, true)}»؟`))} />}
        {selected && <DealPreview deal={selected} ar={ar} h={h} s={s} timezone={timezone} viewing={viewing.get(selected.id)} agentName={agentNames.get(String(selected.assignedAccountId))}
          onOpenFull={openDeal} onClose={() => setPreview(null)} onGo={onGo} />}
      </div>
    </>;
  }
  return <div className="hb-real-estate">{header}{strip}{tabs}{notices}{formPanel}{body}</div>;
}
