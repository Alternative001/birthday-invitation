/**
 * Julian at Thirty — RSVP collector
 * -----------------------------------------------------------------------------
 * Receives RSVP submissions from the birthday website, appends them as rows to
 * the bound Google Sheet, AND emails Julian a notification with a running tally.
 *
 * SETUP (see google-apps-script/SETUP.md for the click-by-click version):
 *   1. Create a Google Sheet.
 *   2. Extensions ▸ Apps Script, delete any sample code, paste THIS file.
 *   3. Deploy ▸ New deployment ▸ type "Web app".
 *        - Execute as: Me
 *        - Who has access: Anyone
 *   4. Copy the Web app URL and paste it into main.js as RSVP_ENDPOINT.
 *
 * TO UPDATE an already-deployed script (e.g. to enable these emails):
 *   paste this over the old code ▸ Save ▸ Deploy ▸ Manage deployments ▸
 *   edit (pencil) ▸ Version: "New version" ▸ Deploy. The URL stays the same.
 * -----------------------------------------------------------------------------
 */

// Where the notification emails go. Change if you want them elsewhere.
var NOTIFY_EMAIL = 'julian.hesss@gmail.com';

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

    var row = {
      name: String(data.name || '').slice(0, 200),
      guests: String(data.guests || '').slice(0, 10),
      attending: String(data.attending || '').slice(0, 10),
      note: String(data.note || '').slice(0, 1000),
    };

    sheet.appendRow([new Date(), row.name, row.guests, row.attending, row.note]);

    // email notification — never let a mail hiccup break the RSVP write
    var mailStatus = 'ok';
    try {
      notify(sheet, row);
    } catch (mailErr) {
      mailStatus = String(mailErr);
      Logger.log('notify FAILED: ' + mailErr);   // shows in View ▸ Executions
    }

    return json({ ok: true, mail: mailStatus });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Build and send the notification email with a running tally.
function notify(sheet, row) {
  var tally = computeTally(sheet);
  var accepted = String(row.attending).toLowerCase() === 'yes';

  var subject = 'RSVP: ' + row.name + (accepted ? ' — coming 🎉' : ' — can’t make it');

  var body =
    row.name + ' just replied.\n\n' +
    '  Response:  ' + (accepted ? 'Joyfully accepts' : 'Regretfully declines') + '\n' +
    '  Party:     ' + (row.guests || '1') + '\n' +
    '  Note:      ' + (row.note || '—') + '\n\n' +
    '——— Tally so far ———\n' +
    '  Accepting: ' + tally.guestsComing + ' guests  (' + tally.acceptReplies + ' replies)\n' +
    '  Declining: ' + tally.declineReplies + ' replies\n' +
    '  Total replies: ' + (tally.acceptReplies + tally.declineReplies) + '\n';

  MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
}

// Count accepts/declines and total guests coming from the sheet.
function computeTally(sheet) {
  var last = sheet.getLastRow();
  var t = { acceptReplies: 0, declineReplies: 0, guestsComing: 0 };
  if (last < 2) return t; // only the header row
  var values = sheet.getRange(2, 3, last - 1, 2).getValues(); // cols C (Guests) & D (Attending)
  for (var i = 0; i < values.length; i++) {
    var guests = parseInt(values[i][0], 10);
    if (isNaN(guests)) guests = 1;
    var attending = String(values[i][1]).toLowerCase();
    if (attending === 'yes') {
      t.acceptReplies++;
      t.guestsComing += guests;
    } else if (attending === 'no') {
      t.declineReplies++;
    }
  }
  return t;
}

// Run this ONCE from the editor (pick "testEmail" ▸ Run) to grant the email
// permission and send yourself a test. Check inbox AND spam afterwards.
function testEmail() {
  var quota = MailApp.getRemainingDailyQuota();
  MailApp.sendEmail(
    NOTIFY_EMAIL,
    'RSVP test email',
    'If you can read this, notifications work.\nEmails left today: ' + quota
  );
  Logger.log('Sent test to ' + NOTIFY_EMAIL + '. Remaining quota: ' + quota);
}

// Run this from the editor (pick "testDoPost" ▸ Run) to exercise the REAL RSVP
// path — it appends a test row and emails you, with any error shown in the log.
function testDoPost() {
  var fake = { postData: { contents: JSON.stringify({
    name: 'Test Guest', guests: '2', attending: 'yes', note: 'from testDoPost'
  }) } };
  var res = doPost(fake);
  Logger.log('doPost returned: ' + res.getContent());
}

// A GET on the URL just confirms the endpoint is live (handy for testing).
function doGet() {
  return json({ ok: true, message: 'RSVP endpoint is live.', version: 'v3-email' });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
