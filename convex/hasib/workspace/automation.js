// Who acts when no person does: Layla (from a chat), Hasib (from recorded facts, on a schedule) or
// Adiba (drafting an offer). Their acts are recorded like a person's, with the agent named, and each
// sector lists the operations they may run; anything else (payments, confirmed holds, rights,
// refunds, cancellations) stays with people.

export const AUTOMATION_ROLE = 'automation';
export const AGENTS = Object.freeze(['layla', 'hasib', 'adiba']);

/**
 * The actor for an automated act. `actorAccountId` is the manager's account, because activity rows
 * reference a real account; `agent` names who acted and is written into the activity details.
 * @param {object|null} workspace @param {string} accountId @param {'layla'|'hasib'|'adiba'} agent
 */
export function automationActor(workspace, accountId, agent) {
  if (!AGENTS.includes(agent)) throw new Error(`unknown agent ${agent}`);
  return { workspace, role: AUTOMATION_ROLE, agent, actorAccountId: accountId };
}

export const isAutomation = actor => actor?.role === AUTOMATION_ROLE;

/** The refusal for an automated actor calling an operation its sector does not allow; null otherwise. */
export const automationRefusal = (actor, operation, allowed) => (isAutomation(actor) && !allowed.has(operation) ? 'automation_not_allowed' : null);

/** Activity details with the agent named first, e.g. "agent:hasib|rule:prep_request". */
export const agentDetails = (actor, details) => [actor?.agent ? `agent:${actor.agent}` : '', details || ''].filter(Boolean).join('|') || undefined;
