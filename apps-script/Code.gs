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
var TEASER_URL    = 'https://www.bznsflowai.com/bznsflow-email-teaser';   // extensionless — Vercel cleanUrls 308-redirects the .html form
var PLAYBOOK_URL  = 'https://www.bznsflowai.com/bznsflow-growth-playbook-realestate.pdf';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
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

    // Auto-deliver the playbook — never let an email failure break lead capture.
    if (data.playbook === true && data.email) {
      try { sendPlaybook_(String(data.email).trim(), data.name ? String(data.name).trim() : ''); }
      catch (mailErr) { /* logged below; row is already saved */ console.error('Playbook email failed: ' + mailErr); }
    }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Emails the playbook: teaser HTML body + PDF attachment, sent from SENDER_EMAIL.
function sendPlaybook_(email, name) {
  // Guard the fetches — a non-200 would otherwise email an error page / bad PDF.
  var teaserResp = UrlFetchApp.fetch(TEASER_URL, { muteHttpExceptions: true });
  if (teaserResp.getResponseCode() !== 200) throw new Error('Teaser fetch ' + teaserResp.getResponseCode());
  var html = teaserResp.getContentText();
  if (name) {
    // Prepend a short personalized greeting above the teaser body.
    html = '<p style="font-family:Arial,sans-serif;font-size:15px;color:#1A1A1A;margin:0 0 12px;">'
         + 'مرحباً ' + escapeHtml_(name) + '، إليك دليلك العملي 👇 / Hi ' + escapeHtml_(name) + ', here is your playbook 👇'
         + '</p>' + html;
  }
  var pdfResp = UrlFetchApp.fetch(PLAYBOOK_URL, { muteHttpExceptions: true });
  if (pdfResp.getResponseCode() !== 200) throw new Error('PDF fetch ' + pdfResp.getResponseCode());
  var pdf = pdfResp.getBlob().setName('BznsFlow-Growth-Playbook.pdf');

  GmailApp.sendEmail(email, EMAIL_SUBJECT,
    'Your BznsFlow Growth Playbook is attached. If it doesn\'t open, reply and we\'ll resend it.',
    { htmlBody: html, attachments: [pdf], name: SENDER_NAME, from: SENDER_EMAIL });
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
