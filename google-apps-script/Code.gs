/**
 * Julian at Thirty — RSVP collector
 * -----------------------------------------------------------------------------
 * This Google Apps Script receives RSVP submissions from the birthday website
 * and appends them as rows to the Google Sheet it is bound to.
 *
 * SETUP (see google-apps-script/SETUP.md for the click-by-click version):
 *   1. Create a Google Sheet.
 *   2. Extensions ▸ Apps Script, delete any sample code, paste THIS file.
 *   3. Deploy ▸ New deployment ▸ type "Web app".
 *        - Execute as: Me
 *        - Who has access: Anyone
 *   4. Copy the Web app URL and paste it into main.js as RSVP_ENDPOINT.
 * -----------------------------------------------------------------------------
 */

var HEADERS = ['Timestamp', 'Name', 'Guests', 'Attending', 'Note'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000); // serialize concurrent submissions so no row is lost
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // ensure a header row exists exactly once
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date(),
      String(data.name || '').slice(0, 200),
      String(data.guests || '').slice(0, 10),
      String(data.attending || '').slice(0, 10),
      String(data.note || '').slice(0, 1000),
    ]);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// A GET on the URL just confirms the endpoint is live (handy for testing).
function doGet() {
  return json({ ok: true, message: 'RSVP endpoint is live.' });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
