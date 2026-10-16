#!/usr/bin/env node

import dns from 'node:dns/promises';
import https from 'node:https';
import { performance } from 'node:perf_hooks';

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

if (process.argv.includes('--help')) {
  process.stdout.write('Usage: node scripts/check-global-reachability.mjs [--base https://www.bznsflowai.com] [--timeout 8000]\n');
  process.exit(0);
}

const base = new URL(option('--base', 'https://www.bznsflowai.com'));
const timeoutMs = Number(option('--timeout', '8000'));
const startedAt = new Date().toISOString();

if (base.protocol !== 'https:') throw new Error('--base must use https');
if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) throw new Error('--timeout must be at least 1000ms');

function certificateSummary(socket) {
  const certificate = socket.getPeerCertificate();
  return {
    authorized: socket.authorized,
    authorizationError: socket.authorizationError ?? null,
    protocol: socket.getProtocol(),
    cipher: socket.getCipher()?.name ?? null,
    subject: certificate.subject?.CN ?? null,
    issuer: certificate.issuer?.CN ?? null,
    validFrom: certificate.valid_from ?? null,
    validTo: certificate.valid_to ?? null,
    fingerprint256: certificate.fingerprint256 ?? null,
  };
}

function requestAtAddress(address, path) {
  return new Promise((resolve) => {
    const began = performance.now();
    let connectAt;
    let tlsAt;
    let tlsSummary;
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve({ ...value, durationMs: Math.round(performance.now() - began) });
    };

    const request = https.request({
      hostname: base.hostname,
      servername: base.hostname,
      port: base.port || 443,
      path,
      method: 'GET',
      headers: {
        Host: base.host,
        Accept: path === '/api/auth-session' ? 'application/json' : 'text/html,application/xhtml+xml,*/*;q=0.8',
        'User-Agent': 'BznsFlow-Reachability-Diagnostic/1.0',
      },
      lookup: (_hostname, options, callback) => {
        if (options?.all) callback(null, [{ address, family: 4 }]);
        else callback(null, address, 4);
      },
      timeout: timeoutMs,
      rejectUnauthorized: true,
    }, (response) => {
      const chunks = [];
      let length = 0;
      response.on('data', (chunk) => {
        if (length < 1_000_000) chunks.push(chunk);
        length += chunk.length;
      });
      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        finish({
          ok: response.statusCode >= 200 && response.statusCode < 400,
          stage: 'http',
          status: response.statusCode,
          bytes: length,
          headers: {
            contentType: response.headers['content-type'] ?? null,
            cache: response.headers['x-vercel-cache'] ?? null,
            vercelId: response.headers['x-vercel-id'] ?? null,
            location: response.headers.location ?? null,
          },
          connectMs: connectAt ? Math.round(connectAt - began) : null,
          tlsMs: tlsAt ? Math.round(tlsAt - began) : null,
          tls: tlsSummary ?? null,
          body,
        });
      });
    });

    request.on('socket', (socket) => {
      socket.once('connect', () => { connectAt = performance.now(); });
      socket.once('secureConnect', () => {
        tlsAt = performance.now();
        tlsSummary = certificateSummary(socket);
      });
    });
    request.on('timeout', () => request.destroy(new Error(`timeout after ${timeoutMs}ms`)));
    request.on('error', (error) => {
      const stage = !connectAt ? 'connect' : !tlsAt ? 'tls' : 'http';
      finish({
        ok: false,
        stage,
        error: error.message,
        code: error.code ?? null,
        connectMs: connectAt ? Math.round(connectAt - began) : null,
        tlsMs: tlsAt ? Math.round(tlsAt - began) : null,
      });
    });
    request.end();
  });
}

function withoutBody(result) {
  const { body, ...summary } = result;
  return summary;
}

function pageContract(body, language) {
  const expectedLang = language === 'ar' ? /<html[^>]+lang=["']ar["']/i : /<html[^>]+lang=["']en["']/i;
  return {
    language: expectedLang.test(body),
    canonical: /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.bznsflowai\.com\//i.test(body),
    marker: /BznsFlow/i.test(body),
  };
}

function apiContract(body) {
  try {
    const value = JSON.parse(body);
    return { validJson: true, anonymous: value.account === null && value.needsProfile === false };
  } catch {
    return { validJson: false, anonymous: false };
  }
}

function hashedAssetPath(body) {
  const matches = body.matchAll(/(?:src|href)=["'](\/assets\/[^"']+\.[a-z0-9]+)["']/gi);
  for (const match of matches) {
    if (/[-.][A-Za-z0-9_-]{6,}\.(?:js|css|woff2|webp|avif)$/i.test(match[1])) return match[1];
  }
  return null;
}

function contractFor(path, result) {
  if (base.hostname !== 'www.bznsflowai.com') {
    const expectedPath = path === '/' ? '/' : path;
    return {
      redirect: result.status >= 300 && result.status < 400 &&
        result.headers?.location === `https://www.bznsflowai.com${expectedPath}`,
    };
  }
  if (path === '/api/auth-session') return apiContract(result.body ?? '');
  return pageContract(result.body ?? '', path === '/' ? 'ar' : 'en');
}

async function inspectAddress(address) {
  const home = await requestAtAddress(address, '/');
  const assetPath = base.hostname === 'www.bznsflowai.com' && home.body ? hashedAssetPath(home.body) : null;
  const english = await requestAtAddress(address, '/en');
  const session = await requestAtAddress(address, '/api/auth-session');
  const asset = assetPath ? await requestAtAddress(address, assetPath) : null;

  const checks = {
    '/': { ...withoutBody(home), contract: contractFor('/', home) },
    '/en': { ...withoutBody(english), contract: contractFor('/en', english) },
    '/api/auth-session': { ...withoutBody(session), contract: contractFor('/api/auth-session', session) },
  };
  if (assetPath) checks[assetPath] = withoutBody(asset);

  return { address, assetPath, checks };
}

let dnsAnswers = [];
let dnsError = null;
try {
  dnsAnswers = await dns.resolve4(base.hostname, { ttl: true });
} catch (error) {
  dnsError = { message: error.message, code: error.code ?? null };
}

const addresses = [...new Set(dnsAnswers.map((answer) => answer.address))];
const edges = [];
for (const address of addresses) edges.push(await inspectAddress(address));

const report = {
  schemaVersion: 1,
  startedAt,
  completedAt: new Date().toISOString(),
  target: base.origin,
  hostname: base.hostname,
  timeoutMs,
  dns: { answers: dnsAnswers, error: dnsError },
  edges,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

const failed = dnsError || edges.length === 0 || edges.some((edge) =>
  Object.values(edge.checks).some((check) => !check.ok ||
    (check.contract && Object.values(check.contract).some((value) => value !== true))),
);
if (failed) process.exitCode = 1;
