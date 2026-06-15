/**
 * BznsFlow — Lead capture → Google Sheet
 * Bound Web App for: https://docs.google.com/spreadsheets/d/1vjw4E63p8lTRHuPNBcqlz4PenhbPWQdzqHost7d4JMs
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

var SHEET_ID = '1vjw4E63p8lTRHuPNBcqlz4PenhbPWQdzqHost7d4JMs';
var SHEET_NAME = '';            // '' = first/active tab. Set to your tab name if different.
var HEADER_ROW = 2;            // Row 1 is the banner (CAPTURE/QUALIFICATION/...). Real headers live on row 2.

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getSheet_();
    var headers = sheet.getRange(HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];

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
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Health check — open the /exec URL in a browser to confirm it's live.
function doGet() {
  return json_({ ok: true, status: 'alive' });
}

function getSheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  return SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
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
