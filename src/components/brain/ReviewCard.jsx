import React, { useState } from 'react';
import { BRAIN_SECTIONS } from '../../lib/bzns-doc.js';
import { BznsWord } from './BznsWord.jsx';
import { Icon } from '../ui/Icon.jsx';

const FIRST = 3;
const SECTIONS = Object.keys(BRAIN_SECTIONS).filter(k => k !== 'contact');
const proposedText = p => (p.kind === 'catalog_entry'
  ? [[p.proposedEntry?.nameEn, p.proposedEntry?.nameAr].filter(Boolean).join(' / '), (p.proposedEntry?.prices || []).map(x => x.label).join(' · ')].filter(Boolean).join(' — ')
  : p.proposedText || '');

/** One suggestion: what is there now, what is suggested, where it came from, and the owner's decision. */
function Proposal({ b, p, lang, busy, decide }) {
  const [editing, setEditing] = useState(p.kind === 'customer_gap' || p.status === 'quarantined');
  const [text, setText] = useState(p.kind === 'customer_gap' ? '' : p.proposedText || '');
  const [section, setSection] = useState(p.target?.section || 'policies');
  const catalog = p.kind === 'catalog_entry', gap = p.kind === 'customer_gap';
  const sectionName = key => BRAIN_SECTIONS[key]?.[lang === 'ar' ? 'ar' : 'en'] || key;
  return (
    <li className="brain-proposal" data-kind={p.kind}>
      <p className="brain-proposal-kind">
        {catalog ? b.t('kind_catalog_entry') : gap ? b.t('kind_customer_gap') : p.kind === 'qa_migration' ? b.t('kind_qa_migration') : <>{b.ar ? 'لملف ' : 'For '}<BznsWord /> · {sectionName(p.target?.section)}</>}
        {gap && (p.count || 1) > 1 && <span className="ld-chip is-muted">{b.t('askedTimes', { count: p.count })}</span>}
      </p>
      {gap ? <p className="brain-proposal-question" dir="auto">“{p.target?.question}”</p> : <div className="brain-compare">
        <div><span className="brain-compare-label">{b.t('current')}</span><p dir="auto">{p.existing || b.t('nothingYet')}</p></div>
        <div><span className="brain-compare-label">{b.t('proposed')}</span><p dir="auto">{proposedText(p)}</p></div>
      </div>}
      {!gap && <blockquote className="brain-evidence" dir="auto"><span className="brain-compare-label">{b.t('source')}: {p.evidence?.sourceLabel}</span>{p.evidence?.quote}</blockquote>}
      {p.status === 'quarantined' && <p className="brain-warning" role="note">{b.t('quarantined')}</p>}
      {editing && !catalog && <div className="brain-proposal-edit">
        <label>{gap ? b.t('answer') : b.t('edit')}<textarea dir="auto" rows={3} maxLength={1500} value={text} onChange={e => setText(e.target.value)} /></label>
        <label>{b.t('section')}<select value={section} onChange={e => setSection(e.target.value)}>{SECTIONS.map(k => <option key={k} value={k}>{sectionName(k)}</option>)}</select></label>
      </div>}
      <div className="brain-actions">
        <button type="button" className="ld-button ld-primary" disabled={!!busy || (editing && !catalog && !text.trim()) || (catalog && p.status === 'quarantined')}
          onClick={() => decide('brain_accept', p, editing && !catalog ? { text, section } : {})}>{gap ? b.t('addAnswer') : b.t('accept')}</button>
        {!catalog && !gap && !editing && <button type="button" className="ld-button ld-quiet" disabled={!!busy} onClick={() => setEditing(true)}>{b.t('edit')}</button>}
        <button type="button" className="ld-button ld-quiet" disabled={!!busy} onClick={() => decide('brain_dismiss', p)}>{b.t('dismiss')}</button>
      </div>
    </li>
  );
}

/** "Needs your review": suggestions from documents, old answers to move, and customers' uncovered questions. */
export function ReviewCard({ b, lang, brain, request, take, act, busy, onAccepted, open }) {
  const [all, setAll] = useState(false), [note, setNote] = useState('');
  const proposals = brain?.proposals || [];
  const decide = (action, p, extra = {}) => act(`review:${p.id}`, async () => {
    take(await request({ action, proposalId: p.id, ...extra }));
    setNote(action === 'brain_accept' ? b.t('acceptedNote') : '');
    if (action === 'brain_accept') await onAccepted?.(p);
  });
  const shown = all ? proposals : proposals.slice(0, FIRST);
  return (
    <details className="brain-card brain-review" open={open || undefined}>
      <summary><Icon name="inbox" size={18} className="brain-card-icon" /><span className="brain-card-title">{b.t('reviewTitle')}</span>{!!brain?.total && <span className="ld-chip is-yellow">{b.t('reviewCount', { count: brain.total })}</span>}</summary>
      {note && <p role="status" className="brain-note">{note}</p>}
      {!proposals.length ? <p className="ld-help">{b.t('reviewNone')}</p> : <ul className="brain-proposals">{shown.map(p => <Proposal key={p.id} b={b} p={p} lang={lang} busy={busy} decide={decide} />)}</ul>}
      {proposals.length > FIRST && <button type="button" className="ld-button ld-quiet" onClick={() => setAll(v => !v)}>{all ? b.t('showLess') : b.t('showAll')}</button>}
    </details>
  );
}
