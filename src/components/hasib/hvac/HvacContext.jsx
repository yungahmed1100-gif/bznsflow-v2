import React from 'react';
import { formatDate, formatDateTime } from '../../../lib/dashboard/format';
import { Money } from '../Badges';
import { useWorkContext, ContextFollowups, ContextFollowupsButton } from '../workspace/contextCard.jsx';
import { label, STATUS_TONE, BUCKET_TONE } from './labels.js';

/**
 * A customer's AC work beside a chat or a customer record: the open job (or the last one), their units
 * and contract, money owed (managers) and open follow-ups, each opening the same record in Jobs.
 */
export function HvacContext({ s, conversationId, contactId }) {
  const ctx = useWorkContext({ packId: 'hvac', operation: 'hvac_context', conversationId, contactId });
  if (!ctx) return null;
  const ar = s.ar,
    tr = (en, arabic) => (ar ? arabic : en),
    { hb, go } = ctx,
    { h } = hb;
  return (
    <section className="hb-deal-context" aria-label={tr('AC jobs', 'أعمال التكييف')}>
      {ctx.items.map(p => {
        const j = p.openJob || p.lastJob;
        return (
          <article key={p.contactId} className="hb-deal-context-card" data-tone={j ? STATUS_TONE[j.status] : 'blue'}>
            <div className="hb-status-line">
              <b>
                {p.openJob
                  ? tr('Open job', 'عمل مفتوح')
                  : p.lastJob
                    ? tr('Last job', 'آخر عمل')
                    : tr('AC customer', 'عميل تكييف')}
              </b>
              {j && (
                <span className="ld-chip" data-tone={STATUS_TONE[j.status]}>
                  {label('status', j.status, ar)}
                </span>
              )}
              {j?.urgent && (
                <span className="ld-chip" data-tone="coral">
                  {tr('Urgent', 'عاجل')}
                </span>
              )}
            </div>
            <p className="ld-help">
              {j ? (
                <>
                  <span className="ld-num">#{j.number}</span> · {label('jobType', j.jobType, ar)}
                  {j.visit ? <> · {formatDateTime(j.visit.startsAt, s.lang, hb.timezone)}</> : null}
                  {j.nextAction ? <> · {label('next', j.nextAction, ar)}</> : null}
                </>
              ) : (
                tr('no job yet', 'لا عمل بعد')
              )}
              {p.units.length ? (
                <>
                  {' '}
                  · {p.units.length}{' '}
                  {tr(p.units.length === 1 ? 'unit' : 'units', p.units.length === 1 ? 'وحدة' : 'وحدات')}
                </>
              ) : null}
              {p.contract ? (
                <>
                  {' '}
                  · <bdi>{p.contract.reference}</bdi> {tr('until', 'حتى')}{' '}
                  {formatDate(p.contract.endsAt, s.lang, hb.timezone)}
                </>
              ) : null}
              {j?.money?.balanceMinor ? (
                <>
                  {' '}
                  · {tr('owes', 'متبقٍ')} <Money h={h} minor={j.money.balanceMinor} />
                </>
              ) : null}
            </p>
            <ContextFollowups
              followups={p.followups}
              kindLabel={f => (f.source === 'draft' ? label('draftKind', f.kind, ar) : label('task', f.kind, ar))}
              bucketLabel={b => label('bucket', b, ar)}
              tones={BUCKET_TONE}
            />
            <div className="ld-actions">
              {j && (
                <button type="button" className="ld-button" onClick={() => go({ view: 'jobs', job: j.id })}>
                  {tr('Open job', 'فتح العمل')}
                </button>
              )}
              {p.contract && (
                <button
                  type="button"
                  className="ld-button ld-quiet"
                  onClick={() => go({ view: 'contracts', contract: p.contract.id })}
                >
                  {tr('Open contract', 'فتح العقد')}
                </button>
              )}
              <ContextFollowupsButton
                ar={ar}
                count={p.openFollowups}
                onOpen={() => go({ view: 'followups', customer: p.contactId })}
              />
            </div>
          </article>
        );
      })}
    </section>
  );
}
