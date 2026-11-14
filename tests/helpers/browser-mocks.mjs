// Browser contexts with every API answered synthetically, shared by the
// navigation crawl and the visual diff so both see the same signed-out site.

/** Signed out, with every API answered synthetically so pages settle quickly. */
export async function signedOut(context) {
  await context.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth-session')
      // What the live server answers a visitor without a session (checked 14 Nov 2026).
      return route.fulfill({
        json: { ok: true, csrfToken: 'c'.repeat(64), account: null, needsProfile: false, providers: [] },
      });
    if (route.request().method() === 'GET')
      return route.fulfill({ status: 401, json: { ok: false, reason: 'sign_in_required' } });
    return route.fulfill({ json: { ok: true } });
  });
  // Nothing leaves the machine: analytics, fonts from a CDN and embeds are cut off.
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, route => route.abort());
}
