#!/usr/bin/env node
// SEO audit — crawls every URL in the sitemap and asserts the technical
// signals that decide whether a page can rank. Replaces Screaming Frog for
// this site, and unlike Screaming Frog it runs unattended in the build.
//
//   npm run seo:audit                       # audit production
//   npm run seo:audit -- --base http://localhost:4173
//   npm run seo:audit -- --json seo/audit.json
//
// Exits non-zero if any ERROR-severity finding is present.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from 'playwright';
import { collectPage } from './seo/collect.mjs';
import { checkPage, checkSite } from './seo/checks.mjs';
import { SEVERITY } from './seo/rules.mjs';

const DEFAULT_BASE = 'https://www.bznsflowai.com';

function parseArgs(argv) {
  const args = { base: DEFAULT_BASE, json: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--base') args.base = argv[++i];
    else if (argv[i] === '--json') args.json = argv[++i];
  }
  return args;
}

async function fetchSitemapUrls(base) {
  const res = await fetch(`${base}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml returned HTTP ${res.status}`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  if (locs.length === 0) throw new Error('sitemap.xml contains no <loc> entries');
  // Rebase onto the target origin so a local build can be audited against the
  // production sitemap without every URL pointing at production.
  const origin = new URL(base).origin;
  return locs.map((loc) => origin + new URL(loc).pathname);
}

async function checkRobots(base) {
  const findings = [];
  const res = await fetch(`${base}/robots.txt`);
  if (!res.ok) {
    findings.push({ severity: SEVERITY.ERROR, code: 'robots-missing', message: `robots.txt returned HTTP ${res.status}` });
    return findings;
  }
  const body = await res.text();
  if (/^\s*Disallow:\s*\/\s*$/mi.test(body)) {
    findings.push({ severity: SEVERITY.ERROR, code: 'robots-disallow-all', message: 'robots.txt disallows the whole site' });
  }
  if (!/^\s*Sitemap:/mi.test(body)) {
    findings.push({ severity: SEVERITY.WARN, code: 'robots-no-sitemap', message: 'robots.txt does not declare a Sitemap:' });
  }
  return findings;
}

const ICON = { error: '✗', warn: '!', info: '·' };
const rank = { error: 0, warn: 1, info: 2 };

function report(groups) {
  let errors = 0; let warns = 0; let infos = 0;
  for (const [scope, findings] of groups) {
    if (findings.length === 0) continue;
    console.log(`\n${scope}`);
    const sorted = [...findings].sort((a, b) => rank[a.severity] - rank[b.severity]);
    for (const f of sorted) {
      console.log(`  ${ICON[f.severity]} [${f.code}] ${f.message}`);
      if (f.severity === SEVERITY.ERROR) errors += 1;
      else if (f.severity === SEVERITY.WARN) warns += 1;
      else infos += 1;
    }
  }
  return { errors, warns, infos };
}

async function main() {
  const { base, json } = parseArgs(process.argv.slice(2));
  console.log(`[seo:audit] base = ${base}`);

  const urls = await fetchSitemapUrls(base);
  console.log(`[seo:audit] ${urls.length} URLs from sitemap.xml`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    userAgent: 'BznsFlow-SEO-Audit (+Playwright)',
  });

  const pages = [];
  for (const url of urls) {
    process.stdout.write(`  crawling ${url} … `);
    const page = await collectPage(context, url);
    pages.push(page);
    console.log(page.error ? 'FAILED' : `${page.status}`);
  }
  await browser.close();

  const groups = [['robots.txt', await checkRobots(base)]];
  for (const page of pages) groups.push([page.finalUrl || page.url, checkPage(page)]);
  groups.push(['site-wide', checkSite(pages, { sitemapUrls: new Set(urls) })]);

  const { errors, warns, infos } = report(groups);

  console.log(`\n[seo:audit] ${errors} error(s), ${warns} warning(s), ${infos} note(s) across ${pages.length} page(s)`);
  for (const p of pages.filter((x) => !x.error)) {
    const v = p.vitals;
    console.log(`  vitals ${p.finalUrl} — LCP ${v.lcp ?? '?'}ms  CLS ${v.cls}  FCP ${v.fcp ?? '?'}ms  TTFB ${v.ttfb ?? '?'}ms`);
  }

  if (json) {
    mkdirSync(dirname(json), { recursive: true });
    writeFileSync(json, JSON.stringify({ base, generatedAt: new Date().toISOString(), pages, groups }, null, 2));
    console.log(`[seo:audit] wrote ${json}`);
  }

  if (errors > 0) {
    console.error(`\n[seo:audit] FAILED — ${errors} error-severity finding(s)`);
    process.exit(1);
  }
  console.log('\n[seo:audit] passed');
}

main().catch((err) => {
  console.error(`[seo:audit] ${err.message}`);
  process.exit(1);
});
