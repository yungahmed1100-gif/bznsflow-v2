import React, { useCallback, useEffect, useState } from 'react';
import { hasib } from '../../../lib/dashboard/api';

// Why Adiba sent this to the owner, in the owner's words.
const REASON = {
  unpriced_line: ['A line has no price yet', 'بند بلا سعر بعد'], price_from: ['The catalog price is a minimum ("from")', 'سعر الكتالوج حد أدنى («من»)'],
  price_range: ['The catalog price is a range', 'سعر الكتالوج نطاق'], price_quote: ['The catalog says "price on request"', 'الكتالوج يقول «السعر عند الطلب»'],
  custom_deliverable: ['Something not in your catalog', 'شيء ليس في الكتالوج'], rush: ['A rush date', 'موعد مستعجل'], above_limit: ['Above your automatic-quote limit', 'فوق حد التسعير التلقائي'],
  auto_quote_off: ['Automatic quotes are off', 'التسعير التلقائي متوقف'], extra_scope: ['Extra scope', 'عمل إضافي'], discount_requested: ['The customer asked for a discount', 'طلب العميل خصماً'],
};
const STATUS = { needs_price: ['Needs your price', 'يحتاج سعرك', 'yellow'], awaiting_approval: ['Ready to approve', 'جاهز للاعتماد', 'blue'], sent: ['Sent · waiting for the customer', 'أُرسل · بانتظار العميل', 'orange'],
  blocked: ['Not sent', 'لم يُرسل', 'coral'], accepted: ['Accepted', 'مقبول', 'green'] };
const SKIP = { window_closed: ['The customer has not written in 24 hours: WhatsApp allows a reply only after they do.', 'لم يراسل العميل منذ ٢٤ ساعة: يسمح واتساب بالرد بعد أن يراسل.'],
  opted_out: ['The customer opted out of messages.', 'ألغى العميل استلام الرسائل.'], layla_paused: ['Layla is paused on this number.', 'ليلى متوقفة على هذا الرقم.'],
  no_conversation: ['There is no chat with this customer.', 'لا توجد محادثة مع هذا العميل.'], other_number: ['The chat is on another number.', 'المحادثة على رقم آخر.'] };
const omr = minor => (Number.isInteger(minor) ? (minor / 1000).toFixed(3) : '');
const toMinor = text => { const n = Number(String(text).replace(/[^\d.]/g, '')); return String(text).trim() && Number.isFinite(n) ? Math.round(n * 1000) : null; };

/**
 * Adiba's offers waiting for the owner (and the ones sent), for the whole business or one chat.
 * The owner fills any unpriced line, checks the exact text the customer will read, and approves.
 * @param {{ s: object, conversationId?: string, compact?: boolean, onChanged?: () => void }} p
 */
export function OffersPanel({ s, conversationId, compact = false, onChanged }) {
  const ar = s.ar, tr = (en, arabic) => (ar ? arabic : en), pick = pair => pair?.[ar ? 1 : 0];
  const [items, setItems] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(''), [prices, setPrices] = useState({});
  const load = useCallback(async () => {
    try { const value = await hasib('adiba_offers', conversationId ? { conversationId } : {}); setItems(value.items || []); setError(''); }
    catch (e) { setError(e.reason || 'unavailable'); }
  }, [conversationId]);
  useEffect(() => { load(); }, [load]);
  const run = async (o, action, body = {}) => {
    setBusy(o.id); setError('');
    try { await hasib(action, { offerId: o.id, version: o.version, ...body }); await load(); onChanged?.(); }
    catch (e) { setError(e.reason || 'unavailable'); await load(); }
    finally { setBusy(''); }
  };
  const savePrices = o => run(o, 'adiba_offer_price', { adiba: { lines: o.lines.map(l => ({ key: l.key, ...(toMinor(prices[`${o.id}:${l.key}`] ?? omr(l.unitPriceMinor)) !== null ? { unitPriceMinor: toMinor(prices[`${o.id}:${l.key}`] ?? omr(l.unitPriceMinor)) } : {}) })),
    ...(toMinor(prices[`${o.id}:deposit`] ?? '') !== null ? { depositMinor: toMinor(prices[`${o.id}:deposit`]) } : {}) } });
  if (['manager_required', 'plan_required', 'preview_read_only', 'module_unavailable'].includes(error)) return null;
  if (!items) return compact ? null : <p className="ld-help" role="status">{tr('Loading offers…', 'جارٍ تحميل العروض…')}</p>;
  const shown = items.filter(o => o.status !== 'accepted' || conversationId);
  if (!shown.length) return null;
  return <section className="hb-offers" aria-labelledby={`hb-offers-${conversationId || 'all'}`}>
    <h3 id={`hb-offers-${conversationId || 'all'}`}>{tr('Offers from Adiba', 'عروض من أديبة')}</h3>
    <p className="ld-help">{tr('Adiba drafts what needs your decision and never invents a price. Nothing reaches the customer until you approve it.', 'تُعدّ أديبة ما يحتاج قرارك ولا تخترع سعراً أبداً. لا يصل شيء إلى العميل قبل اعتمادك.')}</p>
    {error && <p className="ld-error" role="alert">{s.reason ? s.reason(error) : error}</p>}
    <ul className="hb-offers-list">{shown.map(o => {
      const [label, labelAr, tone] = STATUS[o.status] || [o.status, o.status, undefined];
      const editable = ['needs_price', 'awaiting_approval', 'blocked'].includes(o.status);
      return <li key={o.id} className="hb-panel hb-offer" data-status={o.status}>
        <div className="hb-status-line"><b>{o.ref}</b><span className="ld-chip" data-tone={tone}>{ar ? labelAr : label}</span></div>
        {o.reasons.length > 0 && <p className="ld-help">{tr('Why it needs you', 'لماذا يحتاجك')}: {o.reasons.map(r => pick(REASON[r]) || r).join(' · ')}</p>}
        <table className="ld-table hb-offer-lines"><tbody>{o.lines.map(l => <tr key={l.key}>
          <td><bdi>{l.name}</bdi>{l.qty > 1 ? ` × ${l.qty}` : ''}</td>
          <td>{editable ? <label><span className="ld-visually-hidden">{tr(`Price for ${l.name} (OMR)`, `سعر ${l.name} (ر.ع)`)}</span>
            <input inputMode="decimal" dir="ltr" placeholder={tr('Price (OMR)', 'السعر (ر.ع)')} value={prices[`${o.id}:${l.key}`] ?? omr(l.unitPriceMinor)} disabled={!!busy}
              onChange={e => setPrices(p => ({ ...p, [`${o.id}:${l.key}`]: e.target.value }))} /></label>
            : <span className="ld-num">{omr(l.unitPriceMinor)} {o.currency}</span>}</td>
        </tr>)}</tbody></table>
        {editable && <label className="hb-offer-deposit">{tr('Deposit (OMR, optional)', 'العربون (ر.ع، اختياري)')}
          <input inputMode="decimal" dir="ltr" value={prices[`${o.id}:deposit`] ?? omr(o.depositMinor)} disabled={!!busy} onChange={e => setPrices(p => ({ ...p, [`${o.id}:deposit`]: e.target.value }))} /></label>}
        {o.text && <details className="hb-offer-text" open={o.status === 'awaiting_approval'}><summary>{tr('What the customer will read', 'ما سيقرؤه العميل')}</summary><pre dir="auto">{o.text}</pre></details>}
        {o.status === 'blocked' && o.sendSkip && <p className="ld-help" role="status">{pick(SKIP[o.sendSkip]) || o.sendSkip}</p>}
        {o.acceptance && <p className="ld-help">{tr('Accepted by', 'قبِله')} <bdi>{o.acceptance.by}</bdi> · {o.acceptance.evidence}</p>}
        {editable && <div className="ld-actions">
          <button type="button" className="ld-button" disabled={!!busy} onClick={() => savePrices(o)}>{tr('Save prices', 'حفظ الأسعار')}</button>
          {o.status !== 'needs_price' && <button type="button" className="ld-button ld-primary" disabled={!!busy} onClick={() => run(o, 'adiba_offer_approve')}>{o.status === 'blocked' ? tr('Try sending again', 'أعد المحاولة') : tr('Approve and send', 'اعتماد وإرسال')}</button>}
          <button type="button" className="ld-button ld-quiet" disabled={!!busy} onClick={() => run(o, 'adiba_offer_withdraw')}>{tr('Withdraw', 'سحب')}</button>
        </div>}
      </li>;
    })}</ul>
  </section>;
}
