/**
 * BznsFlow — Lead capture → Google Sheet
 * Bound Web App for: https://docs.google.com/spreadsheets/d/125VxXDHIlesWDZijAkzwCOKcSBDT-sSMXMQnwSmcSYY
 * Hosted on ahmed@bznsflowai.com → GmailApp sends from ahmed natively (no send-as alias needed).
 *
 * Appends one row per lead. Matches incoming JSON keys to the sheet's HEADER ROW
 * by normalized name (case/space/punctuation-insensitive), so the same endpoint
 * works for the simple email modal today AND the full Growth Assessment later —
 * each form just sends whatever fields it has; unmatched columns stay blank.
 *
 * Deploy: Extensions → Apps Script → paste this → Deploy → New deployment →
 *   type "Web app" → Execute as "Me" → Who has access "Anyone" → Deploy →
 *   copy the /exec URL.
 */

var SHEET_ID = '125VxXDHIlesWDZijAkzwCOKcSBDT-sSMXMQnwSmcSYY';
var SHEET_NAME = '';            // '' = use SHEET_GID / first tab. Set to a tab name to force it.
var SHEET_GID = 580821186;     // the tab from the URL (#gid=...). Targets the RIGHT tab even if it isn't leftmost.
var HEADER_ROW = 2;            // Row 1 is the banner (CAPTURE/QUALIFICATION/...). Real headers live on row 2.

// ── Playbook lead-magnet email delivery ─────────────────────────────────────
// When a submission carries { playbook: true }, the visitor is auto-emailed the
// playbook (teaser HTML as the body, PDF attached). Both assets are fetched from
// the live site, so they must be deployed first.
var SENDER_EMAIL  = 'ahmed@bznsflowai.com';   // must be the script account OR a verified "Send mail as" alias
var SENDER_NAME   = 'Ahmed — BznsFlow';
var EMAIL_SUBJECT = 'دليل عملي للتطور بمشروعك — BznsFlow Growth Playbook';
// FALLBACKS ONLY. /api/lead sends `teaserUrl` and `playbookUrl` with every
// playbook submission, so the filenames live in ONE place (src/lib/constants.js)
// and this file cannot drift out of step with what is actually deployed.
//
// It already did once: commit d5ec7b6 renamed the PDF to the SME edition and this
// constant kept pointing at bznsflow-growth-playbook-realestate.pdf. The fetch
// 404'd, the try/catch around sendPlaybook_ swallowed it, and every lead from
// then on was recorded in the sheet while silently never receiving the email.
var TEASER_URL    = 'https://www.bznsflowai.com/bznsflow-email-teaser';   // extensionless — Vercel cleanUrls 308-redirects the .html form
var PLAYBOOK_URL  = 'https://www.bznsflowai.com/bznsflow-sme-operating-playbook.pdf';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // Sign-in codes are NOT leads: this branch returns before any appendRow.
    // A row is written later, by PATCH /api/auth-session, once the visitor has
    // proved the address and filled in their profile.
    if (data.action === 'sendOtp') return sendOtp_(data);

    var sheet = getSheet_();
    var hr = detectHeaderRow_(sheet);
    var headers = sheet.getRange(hr, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Server-stamped timestamp always wins (don't trust the client clock).
    data.Timestamp = new Date();

    // Build a normalized lookup of the incoming payload.
    var payload = {};
    Object.keys(data).forEach(function (k) { payload[norm_(k)] = data[k]; });

    var row = headers.map(function (h) {
      var key = norm_(h);
      return payload.hasOwnProperty(key) ? payload[key] : '';
    });

    sheet.appendRow(row);
    forcePhoneToText_(sheet, headers, row);

    // Auto-deliver the playbook — never let an email failure break lead capture.
    if (data.playbook === true && data.email) {
      try {
        sendPlaybook_(String(data.email).trim(), data.name ? String(data.name).trim() : '',
                      data.teaserUrl, data.playbookUrl);
      } catch (mailErr) {
        // The row is already saved, so capture is never lost to a mail failure —
        // but this is exactly how the 404 above stayed invisible for weeks. The
        // caller now gets `emailed` back so a failure is at least observable.
        console.error('Playbook email failed: ' + mailErr);
        return json_({ ok: true, emailed: false, emailError: String(mailErr) });
      }
      return json_({ ok: true, emailed: true });
    }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Rewrites the phone cell as TEXT.
//
// appendRow lets Sheets parse each value, and "+96899656590" parses as the NUMBER
// 96899656590 — the leading + is gone, which breaks every wa.me link built from
// this column. Setting the format to '@' and writing the value again is what
// makes it stick; setting the format alone does not retroactively restore a
// value Sheets has already coerced.
//
// The column is found by normalised header name, not a fixed index, because the
// header row has already moved once (row 2 -> row 3).
function forcePhoneToText_(sheet, headers, row) {
  for (var i = 0; i < headers.length; i++) {
    if (norm_(headers[i]) !== 'phonewhatsapp') continue;
    var value = row[i];
    if (value === '' || value == null) return;
    sheet.getRange(sheet.getLastRow(), i + 1)
         .setNumberFormat('@')
         .setValue(String(value));
    return;
  }
}

// Emails the playbook: teaser HTML body + PDF attachment, sent from SENDER_EMAIL.
// teaserUrl/playbookUrl come from the caller so the filenames have a single
// source of truth on the site side; the module constants are only a fallback.
function sendPlaybook_(email, name, teaserUrl, playbookUrl) {
  var teaser = teaserUrl || TEASER_URL;
  var playbook = playbookUrl || PLAYBOOK_URL;

  // Guard the fetches — a non-200 would otherwise email an error page / bad PDF.
  var teaserResp = UrlFetchApp.fetch(teaser, { muteHttpExceptions: true });
  if (teaserResp.getResponseCode() !== 200) {
    throw new Error('Teaser fetch ' + teaserResp.getResponseCode() + ' for ' + teaser);
  }
  var html = teaserResp.getContentText();
  if (name) {
    // Prepend a short personalized greeting above the teaser body.
    html = '<p style="font-family:Arial,sans-serif;font-size:15px;color:#1A1A1A;margin:0 0 12px;">'
         + 'مرحباً ' + escapeHtml_(name) + '، إليك دليلك العملي 👇 / Hi ' + escapeHtml_(name) + ', here is your playbook 👇'
         + '</p>' + html;
  }
  var pdfResp = UrlFetchApp.fetch(playbook, { muteHttpExceptions: true });
  if (pdfResp.getResponseCode() !== 200) {
    throw new Error('PDF fetch ' + pdfResp.getResponseCode() + ' for ' + playbook);
  }
  var pdf = pdfResp.getBlob().setName('BznsFlow-Operating-Playbook.pdf');

  GmailApp.sendEmail(email, EMAIL_SUBJECT,
    'Your BznsFlow Growth Playbook is attached. If it doesn\'t open, reply and we\'ll resend it.',
    { htmlBody: html, attachments: [pdf], name: SENDER_NAME, from: SENDER_EMAIL });
}

// ── Sign-in one-time codes ──────────────────────────────────────────────────
// Called server-to-server by /api/auth-code on Vercel. Two things make this safe
// to expose on an "Anyone" deployment:
//   1. the shared secret, which lives in Script Properties and is never committed;
//   2. the fact that this endpoint takes an ADDRESS and a CODE, never a subject
//      or a body. Even with the secret, the worst an attacker can send from
//      ahmed@bznsflowai.com is a BznsFlow login code — not arbitrary mail. Moving
//      the template to the caller would turn this into an open relay.
function sendOtp_(data) {
  var expected = PropertiesService.getScriptProperties().getProperty('OTP_SHARED_SECRET');
  if (!expected) return json_({ ok: false, error: 'OTP_SHARED_SECRET not set in Script Properties' });
  if (String(data.secret || '') !== expected) return json_({ ok: false, error: 'forbidden' });

  var email = String(data.email || '').trim();
  var code = String(data.code || '').replace(/\D/g, '');
  if (!email || code.length !== 6) return json_({ ok: false, error: 'invalid' });

  var ar = data.language === 'ar';
  var subject = ar ? ('رمز الدخول: ' + code + ' — BznsFlow')
                   : ('Your sign-in code: ' + code + ' — BznsFlow');

  GmailApp.sendEmail(email, subject, otpPlain_(code, ar), {
    htmlBody: otpHtml_(code, ar),
    name: SENDER_NAME,
    from: SENDER_EMAIL,
  });

  return json_({ ok: true });
}

// Plain-text fallback, for clients that refuse HTML.
function otpPlain_(code, ar) {
  return ar
    ? 'رمز الدخول الخاص بك هو: ' + code + '\nصالح لمدة 10 دقائق. إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.'
    : 'Your sign-in code is: ' + code + '\nIt is valid for 10 minutes. If you did not request it, you can ignore this email.';
}

// Inline styles and a table layout on purpose — Gmail strips <style> blocks, and
// the brand palette here is copied from src/styles/base.css rather than invented.
function otpHtml_(code, ar) {
  var dir = ar ? 'rtl' : 'ltr';
  var font = ar ? "'Cairo', Tahoma, Arial, sans-serif" : "'Outfit', Arial, Helvetica, sans-serif";
  var title = ar ? 'رمز الدخول' : 'Your sign-in code';
  var lede = ar ? 'استخدم هذا الرمز لإكمال تسجيل الدخول إلى BznsFlow.'
                : 'Use this code to finish signing in to BznsFlow.';
  var expiry = ar ? 'الرمز صالح لمدة 10 دقائق.' : 'This code expires in 10 minutes.';
  var ignore = ar ? 'إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.'
                  : 'If you did not request this code, you can safely ignore this email.';

  return ''
    + '<div dir="' + dir + '" style="margin:0;padding:24px;background:#F6EFDF;font-family:' + font + ';">'
    +   '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid rgba(0,0,0,0.08);border-radius:20px;">'
    +     '<tr><td style="padding:32px;text-align:' + (ar ? 'right' : 'left') + ';">'
    +       '<p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#5C95C6;">BznsFlow</p>'
    +       '<h1 style="margin:0 0 12px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1A1A1A;">' + title + '</h1>'
    +       '<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#4B5563;">' + lede + '</p>'
    +       '<div style="margin:0 0 20px;padding:18px;background:#F6EFDF;border-radius:12px;text-align:center;">'
    +         '<span style="font-size:32px;font-weight:800;letter-spacing:0.28em;color:#1A1A1A;">' + code + '</span>'
    +       '</div>'
    +       '<p style="margin:0 0 6px;font-size:13px;color:#565E6B;">' + expiry + '</p>'
    +       '<p style="margin:0;font-size:13px;color:#565E6B;">' + ignore + '</p>'
    +     '</td></tr>'
    +   '</table>'
    + '</div>';
}

function escapeHtml_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Diagnostic health check — open the /exec URL in a browser to see exactly which
// tab the script writes to, its headers, and all tabs in the spreadsheet.
function doGet() {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var tabs = ss.getSheets().map(function (s) {
      return { name: s.getName(), gid: s.getSheetId(), rows: s.getLastRow(), cols: s.getLastColumn() };
    });
    var target = getSheet_();
    var hr = detectHeaderRow_(target);
    var cols = target.getLastColumn();
    var lastRow = target.getLastRow();
    var headers = cols ? target.getRange(hr, 1, 1, cols).getValues()[0] : [];
    var lastRowValues = (cols && lastRow >= hr) ? target.getRange(lastRow, 1, 1, cols).getValues()[0] : [];
    return json_({
      ok: true, status: 'alive',
      writesTo: { name: target.getName(), gid: target.getSheetId() },
      detectedHeaderRow: hr, headers: headers,
      lastRow: lastRow, lastRowValues: lastRowValues,
      allTabs: tabs,
    });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function getSheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  if (SHEET_NAME) return ss.getSheetByName(SHEET_NAME);
  if (SHEET_GID !== '' && SHEET_GID != null) {
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getSheetId() === SHEET_GID) return sheets[i];
    }
  }
  return ss.getSheets()[0];
}

// Auto-find the real header row: the first of the top rows that contains an
// "Email" or "Timestamp" cell. Resilient to title/banner rows above it.
function detectHeaderRow_(sheet) {
  var n = Math.min(6, sheet.getLastRow() || 1);
  var cols = sheet.getLastColumn() || 1;
  var probe = sheet.getRange(1, 1, n, cols).getValues();
  for (var r = 0; r < probe.length; r++) {
    for (var c = 0; c < probe[r].length; c++) {
      var v = norm_(probe[r][c]);
      if (v === 'email' || v === 'timestamp') return r + 1;
    }
  }
  return HEADER_ROW; // fallback
}

// "Phone / WhatsApp" -> "phonewhatsapp", "Page URL" -> "pageurl", "Language" -> "language"
function norm_(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
