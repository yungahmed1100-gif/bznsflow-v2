import React, { useMemo, useState } from 'react';
import { priceLabel } from '../../../config/brain-extract.js';
import { Icon } from '../ui/Icon.jsx';

const PRICE_TYPES = ['fixed', 'from', 'range', 'quote', 'free', 'recurring', 'none'];
const CURRENCIES = ['OMR', 'AED', 'SAR', 'USD'];
const BLANK = { entryKey: '', kind: 'service', nameEn: '', nameAr: '', description: '', priceType: 'fixed', amount: '', minimum: '', maximum: '', currency: 'OMR' };
const num = v => (String(v).trim() === '' ? undefined : Number(v));

/** The form's values for an existing entry (its staged edit if there is one). */
function toForm(entry) {
  const e = entry.pending ? { ...entry, ...entry.pending } : entry, p = e.prices?.[0];
  return { entryKey: e.entryKey, kind: e.kind || 'service', nameEn: e.nameEn || '', nameAr: e.nameAr || '', description: e.descriptionEn || e.descriptionAr || '',
    priceType: p ? (p.type === 'unavailable' ? 'none' : p.type) : 'none', amount: p?.amount ?? '', minimum: p?.minimum ?? '', maximum: p?.maximum ?? '', currency: p?.currency || 'OMR', sortOrder: e.sortOrder };
}
/** The catalog's own entry shape; the price label is built from the numbers, never typed. */
function toEntry(form, sortOrder) {
  const price = form.priceType === 'none' ? null : { type: form.priceType, currency: form.currency, unit: '', ...(num(form.amount) !== undefined ? { amount: num(form.amount) } : {}),
    ...(num(form.minimum) !== undefined ? { minimum: num(form.minimum) } : {}), ...(num(form.maximum) !== undefined ? { maximum: num(form.maximum) } : {}) };
  const label = price ? priceLabel(price) : '';
  const arabic = /[؀-ۿ]/.test(form.description);
  return { entryKey: form.entryKey || crypto.randomUUID(), kind: form.kind, nameEn: form.nameEn.trim(), nameAr: form.nameAr.trim(), category: '', benefitEn: '', benefitAr: '',
    descriptionEn: arabic ? '' : form.description.trim(), descriptionAr: arabic ? form.description.trim() : '', availability: '', prices: price && label ? [{ ...price, label }] : [],
    source: 'manual', confidence: 1, laylaUseEn: 'Answer customer questions about this service and its approved price.', laylaUseAr: 'الإجابة عن أسئلة العملاء حول هذه الخدمة وسعرها المعتمد.', sortOrder: form.sortOrder ?? sortOrder };
}
const priceReady = f => ({ fixed: num(f.amount) >= 0, from: num(f.amount) >= 0, recurring: num(f.amount) >= 0, range: num(f.minimum) >= 0 && num(f.maximum) >= num(f.minimum) }[f.priceType] ?? true);

/** Services and products with their prices: the single home for what Layla may quote. */
export function CatalogTab({ b, catalog, request, take, act, busy, loadCatalog }) {
  const [form, setForm] = useState(null), [query, setQuery] = useState('');
  const entries = catalog?.entries || [];
  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return q ? entries.filter(e => [e.nameEn, e.nameAr].some(n => String(n || '').toLocaleLowerCase().includes(q))) : entries;
  }, [entries, query]);
  const set = patch => setForm(f => ({ ...f, ...patch }));
  const save = () => act('catalog', async () => { take(await request({ action: 'catalog_save', entry: toEntry(form, entries.length) })); setForm(null); await loadCatalog(); });
  const run = (action, entryKey) => act(`catalog:${entryKey}`, async () => { take(await request({ action, entryKey })); await loadCatalog(); });
  return (
    <div className="brain-catalog">
      {(entries.length > 0 || form) && <div className="brain-catalog-tools">
        {entries.length > 12 && <label className="brain-grow"><span className="ld-visually-hidden">{b.t('search')}</span><input type="search" placeholder={b.t('search')} value={query} onChange={e => setQuery(e.target.value)} /></label>}
        {!form && <button type="button" className="ld-button ld-primary brain-add-item" disabled={!!busy} onClick={() => setForm({ ...BLANK })}><Icon name="plus" size={16} />{b.t('addItem')}</button>}
      </div>}
      {form && <form className="brain-item-form" onSubmit={e => { e.preventDefault(); save(); }} aria-label={form.entryKey ? b.t('editItem') : b.t('addItem')}>
        <fieldset className="brain-kind"><legend>{b.t('kind')}</legend>
          {['service', 'product'].map(k => <label key={k}><input type="radio" name="brain-kind" checked={form.kind === k} onChange={() => set({ kind: k })} />{b.t(`kind_${k}`)}</label>)}
        </fieldset>
        <div className="brain-two">
          <label>{b.t('nameEn')}<input dir="ltr" maxLength={160} value={form.nameEn} onChange={e => set({ nameEn: e.target.value })} /></label>
          <label>{b.t('nameAr')}<input dir="rtl" maxLength={160} value={form.nameAr} onChange={e => set({ nameAr: e.target.value })} /></label>
        </div>
        <label>{b.t('description')}<textarea dir="auto" rows={2} maxLength={700} value={form.description} onChange={e => set({ description: e.target.value })} /></label>
        <div className="brain-price">
          <label>{b.t('priceType')}<select value={form.priceType} onChange={e => set({ priceType: e.target.value })}>{PRICE_TYPES.map(p => <option key={p} value={p}>{b.t(`price_${p}`)}</option>)}</select></label>
          {['fixed', 'from', 'recurring'].includes(form.priceType) && <label>{b.t('amount')}<input type="number" min="0" step="0.001" inputMode="decimal" value={form.amount} onChange={e => set({ amount: e.target.value })} /></label>}
          {form.priceType === 'range' && <><label>{b.t('minimum')}<input type="number" min="0" step="0.001" inputMode="decimal" value={form.minimum} onChange={e => set({ minimum: e.target.value })} /></label>
            <label>{b.t('maximum')}<input type="number" min="0" step="0.001" inputMode="decimal" value={form.maximum} onChange={e => set({ maximum: e.target.value })} /></label></>}
          {['fixed', 'from', 'range', 'recurring'].includes(form.priceType) && <label>{b.t('currency')}<select value={form.currency} onChange={e => set({ currency: e.target.value })}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></label>}
        </div>
        {form.priceType !== 'none' && priceReady(form) && <p className="brain-price-preview" dir="auto"><span className="ld-chip is-ink">{priceLabel(toEntry(form, 0).prices[0] || { type: form.priceType }) || '—'}</span></p>}
        <div className="brain-actions">
          <button type="submit" className="ld-button ld-primary" disabled={!!busy || !(form.nameEn.trim() || form.nameAr.trim()) || !priceReady(form)}>{busy === 'catalog' ? b.t('saving') : b.t('saveItem')}</button>
          <button type="button" className="ld-button ld-quiet" onClick={() => setForm(null)}>{b.t('cancel')}</button>
        </div>
      </form>}
      {!entries.length && !form && <div className="brain-empty">
        <Icon name="inbox" size={22} />
        <p>{b.t('catalogEmpty')}</p>
        <button type="button" className="ld-button ld-primary" disabled={!!busy} onClick={() => setForm({ ...BLANK })}><Icon name="plus" size={16} />{b.t('addItem')}</button>
      </div>}
      {!!shown.length && <ul className="brain-items">
        {shown.map(e => {
          const view = e.pending ? { ...e, ...e.pending } : e, stock = e.source === 'hasib_stock';
          const name = (b.ar ? view.nameAr : view.nameEn) || view.nameEn || view.nameAr;
          const state = stock ? 'stock' : e.state || 'draft';
          return <li key={e.entryKey} className="brain-item" data-state={state}>
            <div className="brain-item-main">
              <strong className="brain-item-name" dir="auto">{name}</strong>
              <span className="brain-item-meta">{b.t(`kind_${view.kind === 'product' ? 'product' : 'service'}`)}<span aria-hidden="true"> · </span><span className="brain-item-state">{stock ? b.t('fromStock') : b.t(`state_${state}`)}</span></span>
            </div>
            <p className="brain-item-price" dir="auto">{(view.prices || []).map(p => p.label).join(' · ') || '—'}</p>
            {!stock && <div className="brain-item-actions">
              <button type="button" className="ld-icon-button brain-icon" disabled={!!busy} onClick={() => setForm(toForm(e))} aria-label={`${b.t('editItem')}: ${name}`} title={b.t('editItem')}><Icon name="pencil" size={16} /></button>
              {e.state === 'changed' && <button type="button" className="ld-icon-button brain-icon" disabled={!!busy} onClick={() => run('catalog_discard', e.entryKey)} aria-label={`${b.t('discard')}: ${name}`} title={b.t('discard')}><Icon name="undo" size={16} /></button>}
              <button type="button" className="ld-icon-button brain-icon is-danger" disabled={!!busy} onClick={() => run('catalog_archive', e.entryKey)} aria-label={`${b.t('archive')}: ${name}`} title={b.t('archive')}><Icon name="trash" size={16} /></button>
            </div>}
          </li>;
        })}
      </ul>}
    </div>
  );
}
