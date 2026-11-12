// Did clicking a button do anything a person could notice? For
// tests/nav-crawl-browser.mjs.
//
// Counted as an effect within EFFECT_MS of the click: the URL changes, the DOM
// changes, a request is sent, a dialog, popup or download opens, the browser
// reports a form field as invalid (its validation message), or focus moves
// somewhere other than the clicked button itself.
export const EFFECT_MS = 1000;

export async function clickEffect(page, button) {
  const before = page.url();
  let signal = false;
  const mark = () => {
    signal = true;
  };
  page.on('request', mark);
  page.on('popup', mark);
  page.on('download', mark);
  page.on('dialog', mark);
  await page.evaluate(() => {
    window.__navCrawl = { changed: false };
    const observer = new MutationObserver(() => (window.__navCrawl.changed = true));
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    document.addEventListener('invalid', () => (window.__navCrawl.changed = true), true);
    window.__navCrawl.focus = document.activeElement;
  });
  const handle = await button.elementHandle();
  try {
    await button.click({ timeout: 3000, noWaitAfter: true });
  } catch {
    return 'not clickable';
  }
  const deadline = Date.now() + EFFECT_MS;
  let effect = '';
  while (!effect && Date.now() < deadline) {
    if (signal) effect = 'event';
    else if (page.url() !== before) effect = 'navigation';
    else {
      effect = await page
        .evaluate(target => {
          const state = window.__navCrawl;
          if (!state) return 'navigation';
          if (state.changed) return 'dom';
          const now = document.activeElement;
          return now && now !== target && now !== state.focus && now !== document.body ? 'focus' : '';
        }, handle)
        .catch(() => 'navigation');
      if (!effect) await page.waitForTimeout(50);
    }
  }
  page.off('request', mark);
  page.off('popup', mark);
  page.off('download', mark);
  page.off('dialog', mark);
  return effect;
}
