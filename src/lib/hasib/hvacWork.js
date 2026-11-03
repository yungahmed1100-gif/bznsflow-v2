// AC service forms → Hasib operations. Times are the business's local time; money is entered in OMR.
import { zonedLocalToUtc } from '../timezone.js';

const minor = v => Math.round(Number(v) * 1000);
const int = v => Number.parseInt(v, 10);
const list = v => Array.isArray(v) ? v : v ? [v] : [];

/**
 * @param {string} form which form is open
 * @param {object} v its values
 * @returns {{ operation: string, body: object } | null}
 */
export function buildHvacSubmission(form, v, { requestId, timezone }) {
  const at = (date, time) => zonedLocalToUtc(`${date}T${time}`, timezone);
  const window = () => ({ technicianAccountId: v.technicianAccountId, startsAt: at(v.date, v.from), endsAt: at(v.date, v.to) });
  if (form === 'invite') return { operation: 'team_invite', body: { email: v.email, operationalRole: v.operationalRole || 'technician' } };
  if (form === 'job') return { operation: 'hvac_job_save', body: v.jobId ? { jobId: v.jobId, version: v.version, hvac: jobFields(v) } : { requestId, contactId: v.contactId, hvac: { ...jobFields(v), source: v.source || 'staff', ...(v.repeatOfId ? { repeatOfId: v.repeatOfId } : {}) } } };
  if (form === 'visit') return { operation: 'hvac_visit_save', body: v.visitId ? { visitId: v.visitId, version: v.version, hvac: window() } : { requestId, jobId: v.jobId, hvac: window() } };
  if (form === 'visitCancel') return { operation: 'hvac_visit_status', body: { visitId: v.visitId, version: v.version, status: 'cancelled', reason: v.reason || 'rescheduled' } };
  if (form === 'visitDone') return { operation: 'hvac_visit_status', body: { visitId: v.visitId, version: v.version, status: 'done', hvac: { outcome: v.outcome } } };
  if (form === 'estimate') return { operation: 'hvac_estimate_save', body: { requestId, jobId: v.jobId, hvac: { lines: (v.lines || []).filter(l => l.name && int(l.qty) > 0 && l.price !== '').map(l => ({
    kind: l.kind || 'service', name: l.name, ...(l.variantId ? { variantId: l.variantId } : {}), qty: int(l.qty), unitPriceMinor: minor(l.price) })) } } };
  if (form === 'approval') return { operation: 'hvac_approval_record', body: { jobId: v.jobId, version: v.version, estimateId: v.estimateId, approvedBy: v.approvedBy, evidenceSource: v.evidenceSource } };
  if (form === 'parts') return { operation: 'hvac_job_status', body: { jobId: v.jobId, version: v.version, status: 'waiting_parts', hvac: { partsLabel: v.partsLabel, ...(v.expectedOn ? { partsExpectedAt: at(v.expectedOn, '09:00') } : {}) } } };
  if (form === 'cancelJob') return { operation: 'hvac_job_status', body: { jobId: v.jobId, version: v.version, status: 'cancelled', reason: v.reason } };
  if (form === 'checklist') return { operation: 'hvac_checklist_save', body: { jobId: v.jobId, version: v.version, hvac: { checklist: (v.checks || []).filter(c => c.text?.trim()).map(c => ({ text: c.text.trim(), result: c.result || 'pass' })),
    ...(v.findings !== undefined ? { findings: v.findings } : {}) } } };
  if (form === 'unit') return { operation: 'hvac_unit_save', body: { ...(v.unitId ? { unitId: v.unitId, version: v.version } : { requestId, contactId: v.contactId }), hvac: { label: v.label, unitType: v.unitType,
    ...(v.brand !== undefined ? { brand: v.brand } : {}), ...(v.capacityBtu ? { capacityBtu: int(v.capacityBtu) } : {}), ...(v.area !== undefined ? { area: v.area } : {}) } } };
  if (form === 'service') return { operation: 'hvac_unit_service', body: { unitId: v.unitId, version: v.version, hvac: v.clear ? { clearService: true } : { nextServiceAt: at(v.serviceOn, '09:00') } } };
  if (form === 'contract') return { operation: 'hvac_contract_save', body: { ...(v.contractId ? { contractId: v.contractId, version: v.version } : { requestId, contactId: v.contactId }),
    hvac: { unitIds: list(v.unitIds), visitsPerYear: int(v.visitsPerYear), startsAt: at(v.startsOn, '00:00'), ...(v.endsOn ? { endsAt: at(v.endsOn, '00:00') } : {}), priceMinor: minor(v.price) } } };
  if (form === 'activate') return { operation: 'hvac_contract_status', body: { contractId: v.contractId, version: v.version, status: 'active', evidenceSource: v.evidenceSource } };
  if (form === 'contractCancel') return { operation: 'hvac_contract_status', body: { contractId: v.contractId, version: v.version, status: 'cancelled', reason: v.reason } };
  if (form === 'costs') return { operation: 'hvac_cost_save', body: { jobId: v.jobId, version: v.version, hvac: { costs: (v.costs || []).filter(c => c.label && c.amount !== '').map(c => ({ kind: c.kind || 'parts', label: c.label, amountMinor: minor(c.amount) })),
    costsComplete: !!v.costsComplete } } };
  if (form === 'payment') return { operation: 'hvac_payment_record', body: { requestId, ...(v.jobId ? { jobId: v.jobId } : { contractId: v.contractId }), amountMinor: minor(v.amount), method: v.method, ...(v.reference ? { reference: v.reference } : {}) } };
  if (form === 'expense') return { operation: 'expense_create', body: { requestId, category: v.category, amountMinor: minor(v.amount), method: v.method, paidOn: v.paidOn, ...(v.vendor ? { vendor: v.vendor } : {}) } };
  return null;
}

function jobFields(v) {
  return { jobType: v.jobType || 'repair', unitIds: list(v.unitIds), ...(v.area !== undefined ? { area: v.area } : {}), urgent: !!v.urgent, ...(v.reportedSymptom ? { reportedSymptom: v.reportedSymptom } : {}) };
}
