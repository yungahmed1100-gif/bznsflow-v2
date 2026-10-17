// Where a signed-in account goes next. Shared by the sign-in page and the OAuth callback, so a social
// sign-in lands on its destination in one hop instead of stopping on /signin to be redirected again.

// Only these destinations may be resumed after sign-in, so ?next= cannot be used as an open redirect.
export const NEXT_PATH = /^\/(en\/)?(catalyst\/setup|layla\/dashboard|mcp)$/;
const DASHBOARD = /layla\/dashboard$/;

/**
 * @param {{ account?: { profileComplete?: boolean, accessPlan?: string|null, hasWorkspace?: boolean } | null,
 *           lang?: string, next?: string|null }} input
 * @returns {string|null} a path to leave for, or null to stay on the sign-in page (profile or done step)
 */
export function signinDestination({ account, lang, next }) {
  if (!account || !account.profileComplete) return null;
  const noWorkspace = account.hasWorkspace === false;
  if (next && NEXT_PATH.test(next)) {
    // The dashboard sends an account without a workspace straight back to setup; skip that bounce.
    return DASHBOARD.test(next) && noWorkspace ? next.replace(DASHBOARD, 'catalyst/setup') : next;
  }
  if (!account.accessPlan) return null;
  const prefix = lang === 'en' ? '/en' : '';
  return `${prefix}/${noWorkspace ? 'catalyst/setup' : 'layla/dashboard'}`;
}
