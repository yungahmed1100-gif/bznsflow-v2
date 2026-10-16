import {
  ApiCheck,
  AssertionBuilder,
  BrowserCheck,
  DnsAssertionBuilder,
  DnsMonitor,
  EmailAlertChannel,
  Frequency,
  RetryStrategyBuilder,
  SslMonitor,
} from 'checkly/constructs';

const BASE_URL = 'https://www.bznsflowai.com';
const LOCATIONS = ['eu-central-1', 'ap-southeast-1', 'us-east-1'] as const;
const retryOnce = RetryStrategyBuilder.singleRetry({ baseBackoffSeconds: 15, sameRegion: true });

const ownerEmail = new EmailAlertChannel('owner-reliability-email', {
  address: process.env.CHECKLY_ALERT_EMAIL || 'ahmed@bznsflowai.com',
  sendFailure: true,
  sendRecovery: true,
  sendDegraded: true,
  sslExpiry: true,
  sslExpiryThreshold: 30,
});

function homepageCheck(id: string, path: string, language: string, canonical: string) {
  new ApiCheck(id, {
    name: `Homepage ${language.toUpperCase()} — HTTP, content, canonical and TLS`,
    frequency: Frequency.EVERY_5M,
    locations: [...LOCATIONS],
    retryStrategy: retryOnce,
    alertChannels: [ownerEmail],
    degradedResponseTime: 1500,
    maxResponseTime: 5000,
    request: {
      method: 'GET',
      url: `${BASE_URL}${path}`,
      followRedirects: true,
      assertions: [
        AssertionBuilder.statusCode().equals(200),
        AssertionBuilder.textBody().contains(`<html lang="${language}"`),
        AssertionBuilder.textBody().contains(`href="${canonical}"`),
        AssertionBuilder.textBody().contains('BznsFlow'),
      ],
    },
  });
}

homepageCheck('homepage-ar', '/', 'ar', `${BASE_URL}/`);
homepageCheck('homepage-en', '/en', 'en', `${BASE_URL}/en`);

new ApiCheck('anonymous-auth-session', {
  name: 'Anonymous auth session contract',
  frequency: Frequency.EVERY_5M,
  locations: [...LOCATIONS],
  retryStrategy: retryOnce,
  alertChannels: [ownerEmail],
  degradedResponseTime: 2000,
  maxResponseTime: 5000,
  request: {
    method: 'GET',
    url: `${BASE_URL}/api/auth-session`,
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.headers('content-type').contains('application/json'),
      AssertionBuilder.jsonBody('$.account').isNull(),
      AssertionBuilder.jsonBody('$.needsProfile').equals(false),
    ],
  },
});

new BrowserCheck('public-homepages-browser', {
  name: 'Arabic and English homepages — browser, fonts, images and hydration',
  frequency: Frequency.EVERY_30M,
  locations: [...LOCATIONS],
  retryStrategy: retryOnce,
  alertChannels: [ownerEmail],
  playwrightConfig: { use: { viewport: { width: 390, height: 844 } } },
  code: {
    content: `
      const { test, expect } = require('@playwright/test')

      test('public homepages remain complete when marketing domains are blocked', async ({ page }) => {
        const uncaught = []
        page.on('pageerror', error => uncaught.push(error.message))
        await page.route(/(googleapis\\.com|gstatic\\.com|facebook\\.net|facebook\\.com)/, route => route.abort())

        for (const route of [
          { path: '/', lang: 'ar', direction: 'rtl', font: 'IBM Plex Sans Arabic' },
          { path: '/en', lang: 'en', direction: 'ltr', font: 'Poppins' },
        ]) {
          const response = await page.goto('${BASE_URL}' + route.path, { waitUntil: 'networkidle', timeout: 5000 })
          expect(response.status()).toBe(200)
          await expect(page.locator('html')).toHaveAttribute('lang', route.lang)
          await expect(page.locator('html')).toHaveAttribute('dir', route.direction)
          await expect(page.locator('nav')).toBeVisible()
          await expect(page.locator('main')).toBeVisible()
          await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', '${BASE_URL}' + route.path)

          const teamImage = page.locator('.about-art img')
          await teamImage.scrollIntoViewIfNeeded()
          await expect(teamImage).toBeVisible()
          expect(await teamImage.evaluate(img => img.complete && img.naturalWidth > 0 && new URL(img.currentSrc).origin === location.origin)).toBe(true)
          expect(await page.evaluate(font => document.fonts.check('16px "' + font + '"'), route.font)).toBe(true)
          expect(await page.locator('#root').evaluate(root => root.childElementCount > 0)).toBe(true)
        }

        expect(uncaught).toEqual([])
      })
    `,
  },
});

new SslMonitor('production-tls', {
  name: 'Production TLS certificate and handshake',
  frequency: Frequency.EVERY_30M,
  locations: [...LOCATIONS],
  retryStrategy: retryOnce,
  alertChannels: [ownerEmail],
  degradedResponseTime: 1500,
  maxResponseTime: 5000,
  request: {
    hostname: 'www.bznsflowai.com',
    port: 443,
    sslConfig: {
      serverName: 'www.bznsflowai.com',
      handshakeTimeout: 5000,
      alertDaysBeforeExpiry: 30,
    },
  },
});

new DnsMonitor('production-dns', {
  name: 'Production www CNAME',
  frequency: Frequency.EVERY_30M,
  locations: [...LOCATIONS],
  retryStrategy: retryOnce,
  alertChannels: [ownerEmail],
  degradedResponseTime: 1000,
  maxResponseTime: 5000,
  request: {
    recordType: 'CNAME',
    query: 'www.bznsflowai.com',
    assertions: [
      DnsAssertionBuilder.responseCode().equals('NOERROR'),
      DnsAssertionBuilder.textAnswer().contains('cname.vercel-dns.com'),
    ],
  },
});
