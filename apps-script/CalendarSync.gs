/**
 * BznsFlow — Calendar bookings → Sheet sync
 *
 * Pulls appointment-schedule bookings off your Google Calendar and writes each
 * booker into the CRM Sheet. If the booker's email already exists (they filled a
 * form first), it fills that row's BOOKING band (Appt Booked? / Appt Date-Time /
 * Status=Booked). Otherwise it appends a new row sourced "Calendar booking".
 *
 * INSTALL (one time):
 *   1. Paste this into the SAME Apps Script project as Code.gs (so it shares the
 *      Sheet). Use the + next to "Files" → name it CalendarSync.
 *   2. Set APPOINTMENT_KEYWORD below to your booking title (what your Google
 *      booking page calls the meeting, e.g. "Growth Call") so personal meetings
 *      are ignored. Leave '' only if this calendar holds bookings exclusively.
 *   3. Run setupCalendarSync() once → authorize when prompted. Done — it then
 *      runs every 10 minutes automatically.
 */

var CAL_SHEET_ID = '1vjw4E63p8lTRHuPNBcqlz4PenhbPWQdzqHost7d4JMs';
var CAL_SHEET_NAME = '';          // '' = first/active tab
var CAL_HEADER_ROW = 2;           // real headers on row 2 (row 1 is the banner)
var CALENDAR_ID = '';             // '' = your primary calendar (where bookings land)
var APPOINTMENT_KEYWORD = 'introduction call';  // matches "introduction call with Bznsflow" bookings; ignores personal meetings.
var LOOKBACK_DAYS = 2;            // also catch bookings made for the last couple of days
var LOOKAHEAD_DAYS = 120;         // upcoming bookings window

function setupCalendarSync() {
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (tr.getHandlerFunction() === 'syncCalendarBookings') ScriptApp.deleteTrigger(tr);
  });
  ScriptApp.newTrigger('syncCalendarBookings').timeBased().everyMinutes(10).create();
  syncCalendarBookings(); // run immediately so you see results now
}

function syncCalendarBookings() {
  var cal = CALENDAR_ID ? CalendarApp.getCalendarById(CALENDAR_ID) : CalendarApp.getDefaultCalendar();
  if (!cal) throw new Error('Calendar not found: ' + CALENDAR_ID);

  var now = new Date();
  var start = new Date(now.getTime() - LOOKBACK_DAYS * 86400000);
  var end = new Date(now.getTime() + LOOKAHEAD_DAYS * 86400000);
  var events = cal.getEvents(start, end);

  var props = PropertiesService.getScriptProperties();
  var seen = JSON.parse(props.getProperty('seenEventIds') || '{}');

  var ss = SpreadsheetApp.openById(CAL_SHEET_ID);
  var sheet = CAL_SHEET_NAME ? ss.getSheetByName(CAL_SHEET_NAME) : ss.getSheets()[0];
  var numCols = sheet.getLastColumn();
  var headers = sheet.getRange(CAL_HEADER_ROW, 1, 1, numCols).getValues()[0];
  var col = colIndex_(headers);

  events.forEach(function (ev) {
    var id = ev.getId();
    if (seen[id]) return;

    var title = ev.getTitle() || '';
    if (APPOINTMENT_KEYWORD && title.toLowerCase().indexOf(APPOINTMENT_KEYWORD.toLowerCase()) === -1) return;

    var guests = ev.getGuestList(); // booker(s); excludes the calendar owner
    if (!guests || guests.length === 0) return;

    var booker = guests[0];
    upsertBooking_(sheet, col, numCols, {
      name: booker.getName() || '',
      email: booker.getEmail(),
      when: ev.getStartTime(),
    });
    seen[id] = true;
  });

  props.setProperty('seenEventIds', JSON.stringify(seen));
}

function upsertBooking_(sheet, col, numCols, b) {
  var firstDataRow = CAL_HEADER_ROW + 1;
  var lastRow = sheet.getLastRow();
  var emailCol = col['email'];
  var rowIndex = -1;

  if (emailCol && lastRow >= firstDataRow) {
    var emails = sheet.getRange(firstDataRow, emailCol, lastRow - firstDataRow + 1, 1).getValues();
    for (var i = 0; i < emails.length; i++) {
      if (String(emails[i][0]).trim().toLowerCase() === String(b.email).trim().toLowerCase()) {
        rowIndex = firstDataRow + i;
        break;
      }
    }
  }

  var apptStr = Utilities.formatDate(b.when, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

  if (rowIndex === -1) {
    var row = new Array(numCols).fill('');
    setCell_(row, col, 'timestamp', new Date());
    setCell_(row, col, 'name', b.name);
    setCell_(row, col, 'email', b.email);
    setCell_(row, col, 'sourcecta', 'Calendar booking');
    setCell_(row, col, 'apptbooked', 'Yes');
    setCell_(row, col, 'apptdatetime', apptStr);
    setCell_(row, col, 'status', 'Booked');
    setCell_(row, col, 'lastupdated', new Date());
    sheet.appendRow(row);
  } else {
    writeCell_(sheet, col, rowIndex, 'apptbooked', 'Yes');
    writeCell_(sheet, col, rowIndex, 'apptdatetime', apptStr);
    writeCell_(sheet, col, rowIndex, 'status', 'Booked');
    writeCell_(sheet, col, rowIndex, 'lastupdated', new Date());
    var nameCol = col['name'];
    if (b.name && nameCol && !String(sheet.getRange(rowIndex, nameCol).getValue()).trim()) {
      sheet.getRange(rowIndex, nameCol).setValue(b.name);
    }
  }
}

function colIndex_(headers) {
  var map = {};
  headers.forEach(function (h, i) { map[norm2_(h)] = i + 1; });
  return map; // normalized header -> 1-based column
}
function setCell_(row, col, key, val) { var c = col[key]; if (c) row[c - 1] = val; }
function writeCell_(sheet, col, rowIndex, key, val) { var c = col[key]; if (c) sheet.getRange(rowIndex, c).setValue(val); }
function norm2_(s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, ''); }
