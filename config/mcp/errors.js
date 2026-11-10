// What an MCP tool failure means and what the assistant should do next. Codes come
// from the domain; text here never includes customer data.
const E = (message, hint) => ({ message, hint });

export const ERRORS = {
  invalid_arguments: E("The arguments do not match this tool's input schema.", "Fix the named field and call again with the same requestId. bznsflow_tools_describe shows the full schema."),
  tool_not_allowed: E("This tool is not available to this connection.", "It may be outside the plan, sector or permissions the owner granted. Call bznsflow_workspace_summary to see what is available."),
  approval_required: E("This action needs the owner's approval first.", "Send the owner the approvalUrl, wait for approval, then retry the same tool with the same arguments and requestId."),
  approval_stale: E("The records changed after this request was prepared.", "Read the current records and prepare a new request with a new requestId."),
  approval_expired: E("The approval window (15 minutes) passed.", "Prepare a new request with a new requestId."),
  approval_limit: E("Too many requests are waiting for approval.", "Ask the owner to review or reject waiting requests, or cancel yours with bznsflow_requests_cancel."),
  approval_rejected: E("The owner rejected this request.", "Do not retry it. Ask the owner what to change, then prepare a new request with a new requestId."),
  request_cancelled: E("This request was cancelled.", "Prepare a new request with a new requestId if it is still needed."),
  idempotency_conflict: E("This requestId was already used with different arguments.", "Use a new requestId for a different change."),
  run_not_found: E("No request with that runId exists for this connection.", "Use bznsflow_requests_list to find recent requests."),
  rate_limited: E("Too many calls in the last minute.", "Wait about a minute, then continue."),
  concurrency_limited: E("Too many calls are running at once on this connection.", "Wait for running calls to finish, then retry."),
  connection_revoked: E("This connection was disconnected or expired.", "Ask the owner to reconnect BznsFlow in their assistant."),
  sign_in_required: E("The connection is no longer signed in.", "Ask the owner to reconnect BznsFlow in their assistant."),
  access_required: E("The workspace has no active BznsFlow plan.", "The owner can choose a plan on the BznsFlow website."),
  manager_required: E("Only the business owner can use AI connections.", null),
  setup_required: E("Business setup is not finished.", "Ask the owner to finish setup on the BznsFlow website."),
  connection_not_ready: E("The WhatsApp or Instagram channel is not connected and verified.", "Use bznsflow_messaging_state, then ask the owner to finish the channel setup on the website."),
  messaging_unavailable: E("Messaging is turned off for this deployment.", null),
  broadcast_unavailable: E("Broadcasts are turned off for this deployment.", null),
  hasib_unavailable: E("Hasib is turned off for this deployment.", null),
  dashboard_unavailable: E("The workspace is temporarily unavailable.", "Try again shortly."),
  mcp_disabled: E("AI connections are turned off.", null),
  mcp_unavailable: E("BznsFlow could not complete the call.", "Retry once with the same requestId; if it repeats, check bznsflow_requests_status."),
  result_too_large: E("The result is too large to return.", "Use a smaller limit or a cursor."),
  foreign_record: E("A referenced record does not belong to this workspace.", "Use ids returned by this workspace's tools."),
  confirmation_required: E("This action needs confirm: true.", "Show the owner what will happen, then call again with confirm: true."),
  invalid_timezone: E("The timezone is not a valid IANA name.", "Use a name such as Asia/Muscat."),
  invalid_schedule: E("The schedule time is invalid or too far ahead.", "Use local time like 2026-11-12T10:00 with a timezone."),
  draft_unavailable: E("The writing model did not answer.", "Try again shortly, or write the email yourself and use bznsflow_email_campaign_preview."),
  domain_not_verified: E("The sending domain is not verified yet.", "Use bznsflow_email_domain_check; DNS changes can take a few hours."),
  sender_required: E("The email sender is not set.", "Set it with bznsflow_email_sender_save."),
  no_eligible_recipients: E("There are no subscribed email contacts.", null),
  monthly_cap: E("This campaign would exceed the monthly email allowance.", "Check bznsflow_email_state for remaining sends."),
  too_many: E("Too many checks in the last hour.", "Wait and try again later."),
  setup_conflict: E("Setup progress changed since it was read.", "Call bznsflow_onboarding_get for the current version and try again."),
  preview_required: E("Layla's preview must be run before setup can be completed.", "Ask the owner to run the preview on the website."),
  draft_changed: E("The draft changed since it was read.", "Open it again for the current version."),
  source_changed: E("The knowledge source changed since it was read.", "Open it again for the current revision."),
  behaviour_conflict: E("Layla's behaviour settings changed since they were read.", "Call bznsflow_brain_state for the current version."),
};

/** The structured error an assistant receives. `field` comes from argument checking only. */
export function toolError(code, detail) {
  const known = ERRORS[code];
  const message = detail?.problem
    ? `${detail.field} ${detail.problem}.`
    : known?.message || `The call failed (${code.replaceAll("_", " ")}).`;
  return {
    code,
    message,
    ...(known?.hint ? { hint: known.hint } : {}),
    ...(detail?.field ? { field: detail.field } : {}),
  };
}
