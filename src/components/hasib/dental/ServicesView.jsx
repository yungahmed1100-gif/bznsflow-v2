import React from 'react';
import { EmptyState, SectionHeader } from '../DashboardVisuals';
import { Money } from '../Badges';
import { label } from './labels.js';

/**
 * Services: the treatments Layla quotes (from her catalog), the providers and chairs visits are
 * booked on, and the clinic's own supplies (never offered to patients). Prices are the manager's.
 */
export function ServicesView({ ar, h, data, manager, busy, act, openForm, onBrain }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const items = data.items?.items || [];
  const treatments = items.filter(i => i.kind === 'service'), supplies = items.filter(i => i.kind === 'product');
  const resources = data.resources?.items || [];
  const name = i => (ar ? i.nameAr || i.nameEn : i.nameEn || i.nameAr);
  return <>
    <section aria-label={tr('Providers and chairs', 'الأطباء والكراسي')} className="hb-services-block">
      <SectionHeader title={tr('Providers and chairs', 'الأطباء والكراسي')} description={tr('Each visit is booked with a provider and, if you use them, a chair. Clashes are refused.', 'تُحجز كل زيارة مع مقدم خدمة، ومع كرسي إن استخدمتها. يُرفض التعارض.')}
        primary={manager ? { label: tr('Add provider or chair', 'إضافة طبيب أو كرسي'), onClick: () => openForm('resource', { kind: 'provider' }) } : undefined} />
      {resources.length ? <ul className="hb-re-list hb-resources">{resources.map(r => <li key={r.id} data-active={r.active ? '' : undefined}>
        <b><bdi>{r.name}</bdi></b> · {label('kind', r.kind, ar)}{!r.active && <> · <span className="ld-chip">{tr('Not taking bookings', 'لا يقبل الحجوزات')}</span></>}
        {manager && <button type="button" className="ld-button ld-quiet" onClick={() => openForm('resource', { resourceId: r.id, version: r.version, name: r.name, active: r.active, subject: label('kind', r.kind, ar) })}>{tr('Edit', 'تعديل')}</button>}
      </li>)}</ul> : <EmptyState icon="users" title={tr('No providers yet', 'لا أطباء بعد')} description={tr('Add your dentists and hygienists, then your chairs.', 'أضف أطباءك وأخصائيي الصحة الفموية، ثم الكراسي.')}
        action={manager ? { label: tr('Add provider', 'إضافة طبيب'), onClick: () => openForm('resource', { kind: 'provider' }) } : undefined} />}
    </section>
    <section aria-labelledby="dn-treatments" className="hb-services-block">
      <div className="hb-status-line"><h2 id="dn-treatments">{tr('Treatments', 'الخدمات')}</h2>
        {manager && <div className="ld-actions"><button type="button" className="ld-button" disabled={busy} onClick={() => act('services_sync', {})}>{tr('Sync from Layla’s catalog', 'مزامنة من كتالوج ليلى')}</button>
          <button type="button" className="ld-button ld-quiet" onClick={onBrain}>{tr('Edit in BznsBrain', 'تعديل في BznsBrain')}</button></div>}</div>
      {treatments.length ? <ul className="hb-re-list">{treatments.map(t => <li key={t.id}><bdi>{name(t)}</bdi>{t.category ? <small> · <bdi>{t.category}</bdi></small> : null}
        {manager && t.variants?.[0] ? <> · {t.variants[0].priceMinor ? <Money h={h} minor={t.variants[0].priceMinor} /> : tr('price set on the visit', 'يُحدد السعر في الزيارة')}</> : null}</li>)}</ul>
        : <p className="ld-help">{tr('Treatments come from Layla’s catalog in BznsBrain. Approve them there, then sync.', 'تأتي الخدمات من كتالوج ليلى في BznsBrain. اعتمدها هناك ثم زامن.')}</p>}
    </section>
    <section aria-labelledby="dn-supplies" className="hb-services-block">
      <h2 id="dn-supplies">{tr('Supplies', 'المستلزمات')}</h2>
      <p className="ld-help">{tr('The clinic’s own stock. Layla never offers it to patients.', 'مخزون العيادة الخاص. لا تعرضه ليلى على المرضى أبداً.')}</p>
      {supplies.length ? <ul className="hb-re-list hb-supplies">{supplies.flatMap(i => (i.variants || []).map(vr => <li key={vr.id} data-tone={vr.low ? 'coral' : undefined}>
        <bdi>{name(i)}</bdi> · <span className="ld-num">{vr.onHand}</span> {i.unit ? <bdi>{i.unit}</bdi> : null}
        {vr.low && <> · <span className="ld-chip" data-tone="coral">{tr('Running low', 'قارب على النفاد')}</span></>}
        <button type="button" className="ld-button ld-quiet" onClick={() => openForm('supply', { variantId: vr.id, direction: 'in', subject: name(i) })}>{tr('Update count', 'تحديث العدد')}</button>
      </li>))}</ul> : <p className="ld-help">{tr('No supplies tracked yet.', 'لا مستلزمات متتبعة بعد.')}</p>}
    </section>
  </>;
}
