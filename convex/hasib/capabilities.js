// One server-owned package matrix. The browser may hide controls for usability,
// but every protected operation is checked against this matrix in Convex.
export const PLAN_CAPABILITIES = Object.freeze({
  // Catalyst broadcasts, and adds recipients by uploading a number list or typing numbers in (Ahmed, 2026-10-07).
  // Catalyst exports its customer list as CSV; chat and full-account exports stay with Ascend and Apex.
  catalyst: Object.freeze({ chats: true, customers: true, customerDelete: true, humanHandoff: true, businessDetails: true, channelsSetup: true, broadcasts: true, imports: true, customerExport: true }),
  ascend: Object.freeze({ chats: true, customers: true, customerDelete: true, humanHandoff: true, businessDetails: true, channelsSetup: true,
    realEstate: true, automotive: true, operations: true, money: true, insights: true, approvals: true, exports: true, customerExport: true, imports: true, broadcasts: true, team: true, settings: true }),
  apex: Object.freeze({ chats: true, customers: true, customerDelete: true, humanHandoff: true, businessDetails: true, channelsSetup: true,
    realEstate: true, automotive: true, operations: true, money: true, insights: true, approvals: true, exports: true, customerExport: true, imports: true, broadcasts: true, team: true, settings: true }),
});

export const effectivePlan = plan => plan === 'ascend' || plan === 'apex' ? plan : 'catalyst';
const MANAGER_ONLY = ['money', 'insights', 'approvals', 'exports', 'customerExport', 'imports', 'broadcasts', 'team', 'settings'];

export const capabilitiesFor = (plan, role = 'manager') => {
  const capabilities = { ...PLAN_CAPABILITIES[effectivePlan(plan)] };
  if (role === 'employee') for (const capability of MANAGER_ONLY) capabilities[capability] = false;
  return capabilities;
};

export const EMPLOYEE_DENIED = new Set([
  'team_invite', 'team_resend', 'team_revoke', 'settings_update', 'contact_delete',
  'offer_approve', 'draft_approve', 'deal_close', 'commission_record', 'expenses',
  'expense_create', 'expense_void', 'insights', 'real_estate_insights', 'real_estate_metric_records', 'export_account', 'export_contacts', 'items_import',
  'clinic_insights', 'clinic_governance', 'clinic_governance_update', 'clinic_metric_snapshot',
  'construction_insights', 'construction_baseline_approve', 'construction_retention_release',
  'automotive_insights',
]);

export function roleAllows(role, operation) {
  return role === 'manager' || !EMPLOYEE_DENIED.has(operation);
}
