import React, { useState } from 'react';

// Dental's 24-hour chat-text rule would trim the founder's real pilot chats, so it stays a preview (Ahmed, 2026-10-24).
export const FOUNDER_PREVIEW_ONLY = new Set(['dental']);
const statusText = (status, ar) => status === 'live' ? (ar ? 'مباشر' : 'Live') : status === 'preview' ? (ar ? 'للمعاينة فقط' : 'Preview only') : (ar ? 'قيد الانتظار' : 'Pending');
const name = (industry, ar) => (ar ? industry.ar : industry.en);

/**
 * The founder's test bench: switch the account's real sector (records are kept per sector), or open any
 * built industry as a read-only sample. Values are `live:<pack>` and `preview:<pack>`.
 */
export function FounderIndustryPreview({ s, h, industries = [], livePack = '', current = '', onLive, onPreview }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const live = industries.filter(industry => industry.status === 'live' && !FOUNDER_PREVIEW_ONLY.has(industry.id));
  const value = current ? `preview:${current}` : livePack ? `live:${livePack}` : '';
  const liveName = industries.find(industry => industry.id === livePack);
  const change = async next => {
    const [kind, id] = next.split(':');
    setError('');
    if (kind === 'preview') return onPreview(id);
    setBusy(true);
    try { await onLive(id); }
    catch (e) { setError(h?.reason(e?.reason) || (s.ar ? 'تعذّر تغيير القطاع.' : 'Could not change the sector.')); }
    finally { setBusy(false); }
  };
  return (
    <section className="hb-founder-preview" aria-label={s.ar ? 'منصة اختبار المؤسس' : 'Founder test bench'}>
      <label>{s.ar ? 'القطاع المعروض' : 'Sector shown'}
        <select value={value} disabled={busy} onChange={event => change(event.target.value)}>
          {!livePack && <option value="">{s.ar ? 'اختر قطاعًا' : 'Choose a sector'}</option>}
          <optgroup label={s.ar ? 'مباشر — بياناتك الحقيقية' : 'Live — your real data'}>
            {live.map(industry => <option key={industry.id} value={`live:${industry.id}`}>{name(industry, s.ar)}</option>)}
          </optgroup>
          <optgroup label={s.ar ? 'معاينة — بيانات تجريبية، لا شيء يُحفظ' : 'Preview — sample data, nothing saves'}>
            {industries.map(industry => <option key={industry.id} value={`preview:${industry.id}`} disabled={!industry.built}>
              {name(industry, s.ar)} — {statusText(industry.status, s.ar)}
            </option>)}
          </optgroup>
        </select>
      </label>
      <p role="status">{busy ? (s.ar ? 'جارٍ تغيير القطاع…' : 'Changing the sector…')
        : current ? (s.ar ? 'معاينة للقراءة فقط. لن تتغير إعدادات نشاطك أو سجلاتك.' : 'Read-only preview. Your business setup and records stay unchanged.')
        : liveName ? (s.ar ? `قطاعك المباشر: ${liveName.ar}. سجلات كل قطاع تبقى عند التبديل.` : `Your live sector: ${liveName.en}. Each sector keeps its records when you switch.`) : ''}</p>
      {error && <p className="ld-inline-error" role="alert">{error}</p>}
    </section>
  );
}
