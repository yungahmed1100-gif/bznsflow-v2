import React from 'react';
import { usePolling } from '../../../hooks/usePolling';
import { hasib } from '../../../lib/dashboard/api';
import { formatDate, formatDateTime } from '../../../lib/dashboard/format';
import { formatLocal } from '../../../lib/timezone.js';
import { EmptyState, SectionHeader } from '../DashboardVisuals';
import { Money } from '../Badges';
import { label, CONTRACT_TONE, PAYMENT_TONE, STATUS_TONE } from './labels.js';

/** The contract book in four figures: active contracts, units covered, visits due in 30 days, renewals due. */
function Book({ book, ar, h }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  if (!book) return null;
  return (
    <dl className="hb-kpi-row hb-contract-book">
      <div>
        <dt>{tr('Active contracts', 'عقود سارية')}</dt>
        <dd className="ld-num">{book.active}</dd>
      </div>
      <div>
        <dt>{tr('Units covered', 'وحدات مشمولة')}</dt>
        <dd className="ld-num">{book.units}</dd>
      </div>
      <div>
        <dt>{tr('Visits due in 30 days', 'زيارات مستحقة خلال ٣٠ يوماً')}</dt>
        <dd className="ld-num">{book.visitsDue30d}</dd>
      </div>
      <div data-tone={book.renewalsDue ? 'yellow' : undefined}>
        <dt>{tr('Renewals due', 'تجديدات مستحقة')}</dt>
        <dd className="ld-num">{book.renewalsDue}</dd>
      </div>
      <div>
        <dt>{tr('Yearly value', 'القيمة السنوية')}</dt>
        <dd>
          <Money h={h} minor={book.annualValueMinor} />
        </dd>
      </div>
    </dl>
  );
}

/**
 * Maintenance contracts (AMC, عقد صيانة سنوي): each customer's units, visits a year, next visit, renewal
 * date and payment. Hasib opens each visit as a job and drafts the renewal; the team books and the
 * owner approves.
 */
export function ContractsView({ ar, s, h, timezone, data, manager, onOpen, onAdd }) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const rows = data.contracts?.items || [];
  return (
    <>
      <SectionHeader
        title={tr('Maintenance contracts', 'عقود الصيانة')}
        description={tr(
          'Steady income between the summer peaks. Visits are opened as jobs two weeks before they are due; renewals are drafted 30 and 7 days before the end, for you to approve.',
          'دخل ثابت بين مواسم الصيف. تُفتح الزيارات كأعمال قبل موعدها بأسبوعين، وتُكتب رسائل التجديد قبل ٣٠ و٧ أيام من الانتهاء لتوافق عليها.',
        )}
        primary={manager && onAdd ? { label: tr('New contract', 'عقد جديد'), onClick: onAdd } : undefined}
      />
      <Book book={data.contracts?.book} ar={ar} h={h} />
      {rows.length ? (
        <div className="ld-table-wrap">
          <table className="ld-table hb-visits hb-contracts">
            <thead>
              <tr>
                <th>{tr('Contract', 'العقد')}</th>
                <th>{tr('Units', 'الوحدات')}</th>
                <th>{tr('Visits', 'الزيارات')}</th>
                <th>{tr('Ends', 'ينتهي')}</th>
                <th>{tr('Payment', 'الدفع')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} data-tone={CONTRACT_TONE[c.status]}>
                  <td data-label={tr('Contract', 'العقد')}>
                    <button type="button" className="ld-link hb-visit-open" onClick={() => onOpen(c.id)}>
                      <bdi>{c.reference}</bdi> · <bdi>{c.contactName || tr('Customer', 'عميل')}</bdi>
                    </button>{' '}
                    <span className="ld-chip" data-tone={CONTRACT_TONE[c.status]}>
                      {label('contract', c.status, ar)}
                    </span>
                    {c.renewalDue && (
                      <span className="ld-chip" data-tone="yellow">
                        {tr('Renewal due', 'التجديد مستحق')}
                      </span>
                    )}
                  </td>
                  <td data-label={tr('Units', 'الوحدات')}>{c.units.map(u => u.label).join(' · ') || '—'}</td>
                  <td data-label={tr('Visits', 'الزيارات')}>
                    <span className="ld-num">
                      {c.visitsDone}/{c.visitsPerYear}
                    </span>
                    {c.nextVisit ? (
                      <small>
                        {' '}
                        · {tr('next', 'التالية')} {formatDate(c.nextVisit.dueAt, s.lang, timezone)}
                      </small>
                    ) : null}
                  </td>
                  <td data-label={tr('Ends', 'ينتهي')} className="ld-num">
                    {formatDate(c.endsAt, s.lang, timezone)}
                  </td>
                  <td data-label={tr('Payment', 'الدفع')}>
                    <span className="ld-chip" data-tone={PAYMENT_TONE[c.paymentStatus]}>
                      {label('payment', c.paymentStatus, ar)}
                    </span>
                    {c.balanceMinor ? (
                      <small>
                        {' '}
                        · <Money h={h} minor={c.balanceMinor} />
                      </small>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="receipt"
          title={tr('No maintenance contracts yet', 'لا عقود صيانة بعد')}
          description={tr(
            'Offer a contract after a good visit: a few visits a year, priced per unit.',
            'اعرض عقداً بعد زيارة ناجحة: عدة زيارات في السنة بسعر لكل وحدة.',
          )}
          action={manager && onAdd ? { label: tr('New contract', 'عقد جديد'), onClick: onAdd } : undefined}
        />
      )}
    </>
  );
}

/** One contract: its units, each visit with the job Hasib opened for it, payment, renewal and activity. */
export function ContractRecord({
  contractId,
  ar,
  h,
  s,
  timezone,
  manager,
  busy,
  version,
  backLabel,
  act,
  openForm,
  onGo,
  onClose,
  onOpenJob,
  onOpenContract,
}) {
  const tr = (en, arabic) => (ar ? arabic : en);
  const state = usePolling(() => hasib('hvac_contract', { contractId }), [contractId, version], { interval: 30000 });
  const c = state.data;
  if (!c)
    return (
      <p className="ld-state" role={state.error ? 'alert' : 'status'}>
        {state.error ? h.reason(state.error.reason) || s.reason(state.error.reason) : s.t('loading')}
      </p>
    );
  const date = ms => (ms ? formatDate(ms, s.lang, timezone) : '—'),
    when = ms => (ms ? formatDateTime(ms, s.lang, timezone) : '—'),
    local = ms => formatLocal(ms, timezone).slice(0, 10);
  const subject = `${c.reference} · ${c.contactName || tr('Customer', 'عميل')}`;
  return (
    <article className="hb-production-record hb-visit-record" aria-labelledby="hv-contract-title">
      <div className="hb-status-line">
        <button type="button" className="ld-button ld-quiet" onClick={onClose}>
          {backLabel}
        </button>
        {c.conversationId && (
          <button
            type="button"
            className="ld-button ld-quiet"
            onClick={() => onGo('chats', { chat: c.conversationId })}
          >
            {tr('Open chat', 'فتح المحادثة')}
          </button>
        )}
      </div>
      <header className="hb-panel" data-tone={CONTRACT_TONE[c.status]}>
        <h2 id="hv-contract-title">
          <bdi>{c.reference}</bdi> · <bdi>{c.contactName || tr('Customer', 'عميل')}</bdi>{' '}
          <span className="ld-chip" data-tone={CONTRACT_TONE[c.status]}>
            {label('contract', c.status, ar)}
          </span>
          <span className="ld-chip" data-tone={PAYMENT_TONE[c.paymentStatus]}>
            {label('payment', c.paymentStatus, ar)}
          </span>
        </h2>
        <p className="ld-help">
          {date(c.startsAt)} → {date(c.endsAt)} · <span className="ld-num">{c.visitsPerYear}</span>{' '}
          {tr('visits a year', 'زيارات سنوياً')} · <Money h={h} minor={c.priceMinor} />
        </p>
        {manager && (
          <div className="ld-actions">
            {c.storedStatus === 'draft' && (
              <button
                type="button"
                className="ld-button ld-primary"
                onClick={() => openForm('activate', { contractId: c.id, version: c.version, subject })}
              >
                {tr('Customer agreed: activate', 'وافق العميل: تفعيل')}
              </button>
            )}
            {c.storedStatus === 'draft' && (
              <button
                type="button"
                className="ld-button"
                onClick={() =>
                  openForm('contract', {
                    contractId: c.id,
                    version: c.version,
                    contactId: c.contactId,
                    unitIds: c.unitIds,
                    visitsPerYear: c.visitsPerYear,
                    price: String(c.priceMinor / 1000),
                    startsOn: local(c.startsAt),
                    endsOn: local(c.endsAt),
                    subject,
                  })
                }
              >
                {tr('Edit draft', 'تعديل المسودة')}
              </button>
            )}
            {c.balanceMinor > 0 && (
              <button
                type="button"
                className="ld-button ld-primary"
                onClick={() =>
                  openForm('payment', {
                    contractId: c.id,
                    amount: c.balanceMinor / 1000,
                    method: 'bank_transfer',
                    subject,
                  })
                }
              >
                {tr('Record payment', 'تسجيل دفعة')}
              </button>
            )}
            {['active', 'expired'].includes(c.status) &&
              !c.renewedToId &&
              (c.renewalDraftId ? (
                <button type="button" className="ld-button" onClick={() => onOpenContract(c.renewalDraftId)}>
                  {tr('Open the renewal draft', 'فتح مسودة التجديد')}
                </button>
              ) : (
                <button
                  type="button"
                  className="ld-button"
                  disabled={busy}
                  onClick={() =>
                    act(
                      'hvac_contract_renew',
                      { contractId: c.id },
                      null,
                      tr(
                        'Draft next year’s contract with the same units and visits?',
                        'كتابة عقد السنة القادمة بنفس الوحدات والزيارات؟',
                      ),
                    )
                  }
                >
                  {tr('Draft renewal', 'كتابة التجديد')}
                </button>
              ))}
            {['draft', 'active'].includes(c.storedStatus) && (
              <button
                type="button"
                className="ld-button ld-quiet"
                onClick={() => openForm('contractCancel', { contractId: c.id, version: c.version, subject })}
              >
                {tr('Cancel contract', 'إلغاء العقد')}
              </button>
            )}
          </div>
        )}
      </header>
      <section aria-labelledby="hv-cv-h">
        <h3 id="hv-cv-h">{tr('Visits', 'الزيارات')}</h3>
        <ol className="hb-re-list">
          {c.visits.map(v => (
            <li key={v.index} data-tone={v.jobStatus ? STATUS_TONE[v.jobStatus] : undefined}>
              {tr('Visit', 'زيارة')} <span className="ld-num">{v.index + 1}</span> · {tr('due', 'مستحقة')}{' '}
              {date(v.dueAt)}
              {' · '}
              {v.jobId ? (
                <>
                  <button type="button" className="ld-link" onClick={() => onOpenJob(v.jobId)}>
                    #{v.jobNumber}
                  </button>{' '}
                  · {label('status', v.jobStatus, ar)}
                </>
              ) : (
                <span className="ld-help">{tr('opens two weeks before', 'تُفتح قبل موعدها بأسبوعين')}</span>
              )}
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="hv-cu-h">
        <h3 id="hv-cu-h">{tr('Units', 'الوحدات')}</h3>
        <ul className="hb-re-list">
          {c.units.map(u => (
            <li key={u.id}>
              <bdi>{u.label}</bdi> · {label('unitType', u.unitType, ar)}
            </li>
          ))}
        </ul>
      </section>
      {c.payments.length > 0 && (
        <section aria-labelledby="hv-cp-h">
          <h3 id="hv-cp-h">{tr('Payments', 'المدفوعات')}</h3>
          <ul className="hb-re-list">
            {c.payments.map(p => (
              <li key={p.id}>
                <Money h={h} minor={p.amountMinor} /> · {label('method', p.method, ar)} · {when(p.at)}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="hv-cr-h">
        <h3 id="hv-cr-h">{tr('Renewal', 'التجديد')}</h3>
        <p className="ld-help">
          {c.renewedToId ? (
            <button type="button" className="ld-link" onClick={() => onOpenContract(c.renewedToId)}>
              {tr('Renewed: open the new contract', 'جُدد: فتح العقد الجديد')}
            </button>
          ) : c.renewedFromId ? (
            <button type="button" className="ld-link" onClick={() => onOpenContract(c.renewedFromId)}>
              {tr('Renews an earlier contract', 'يجدد عقداً سابقاً')}
            </button>
          ) : (
            tr(
              'Hasib drafts a renewal message 30 and 7 days before the end. Nothing is sent without your approval.',
              'يكتب حاسب رسالة التجديد قبل ٣٠ و٧ أيام من الانتهاء. لا يُرسل شيء دون موافقتك.',
            )
          )}
        </p>
        {c.drafts?.length > 0 && (
          <ul className="hb-re-list">
            {c.drafts.slice(0, 5).map(d => (
              <li key={d.id}>
                {label('draftKind', d.kind, ar)} · {label('draft', d.status, ar)}
                <blockquote className="hb-draft-text" dir="auto">
                  {d.text}
                </blockquote>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="hv-ca-h">
        <h3 id="hv-ca-h">{tr('Activity', 'النشاط')}</h3>
        <ol className="hb-re-list">
          {(c.activity || []).map((x, i) => (
            <li key={i}>
              {when(x.at)} · {x.kind.replace(/_/g, ' ')}
              {x.detail ? (
                <>
                  {' '}
                  ·{' '}
                  <bdi>
                    {x.kind === 'cancelled'
                      ? label('contractCancel', x.detail, ar)
                      : x.kind === 'activated'
                        ? label('evidence', x.detail, ar)
                        : x.detail}
                  </bdi>
                </>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
