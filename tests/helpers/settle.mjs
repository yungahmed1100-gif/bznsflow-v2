// Waiting for a page to be ready, shared by the navigation crawl and the visual diff.
//
// A dashboard polls for new messages, so its network may never fall quiet:
// waiting for "networkidle" there is a race that a busy machine loses. It is
// ready when it has resolved its tab (#ld-main carries data-tab), and its first
// answers then get a bounded moment to arrive. Other pages answer from mocks
// and settle normally.
const SETTLE_MS = 5000;

/** The signed-in dashboard (the demo's); an owner preview signed out is only the admin gate. */
export const isDashboard = url => /\/layla\/dashboard$/.test(new URL(url).pathname);

/** Opens `url` in `page` and waits until it is ready to read. */
export async function settle(page, url) {
  if (!isDashboard(url)) {
    await page.goto(url, { waitUntil: 'networkidle' });
    return;
  }
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForSelector('#ld-main[data-tab]', { state: 'attached' });
  await page.waitForLoadState('networkidle', { timeout: SETTLE_MS }).catch(() => {});
}
