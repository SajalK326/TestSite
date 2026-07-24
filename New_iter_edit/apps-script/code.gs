/**
 * TOMORROW.EXE — Hackathon Registration Backend
 * Google Apps Script Web App
 *
 * Reads a JSON POST body from js/registration.js, appends a row to a
 * "Registrations" Google Sheet, uploads the payment screenshot to a
 * Google Drive folder, and returns a JSON response.
 *
 * DEPLOYMENT: see apps-script/README.md
 */

// ============================================================
// CONFIG — edit these two values before deploying
// ============================================================

/** Name of the sheet tab to write registrations into. */
var SHEET_NAME = 'Registrations';

/** ID of the Google Drive folder where payment screenshots are saved.
 *  Create the folder, then copy the ID from its URL. */
var FOLDER_ID  = 'PASTE_YOUR_DRIVE_FOLDER_ID';

/** WhatsApp group invite link to return to the client on success. */
var WHATSAPP   = 'https://chat.whatsapp.com/PLACEHOLDER_INVITE_LINK';

// ============================================================
// HTTP HANDLERS
// ============================================================

/** POST handler — the form submits here. */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // Header row — written once, on the first submission.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp',
        'Full Name',
        'Email',
        'Mobile',
        'School / Course / Branch / Specialization',
        'Year',
        'Txn ID / UTR',
        'Screenshot URL',
        'Event Type'
      ]);
      // Bold the header row
      sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    }

    // Duplicate-email guard (O(n); fine up to ~5,000 rows).
    var emails = sheet.getRange('B:B').getValues().flat();
    if (emails.indexOf(data.email) !== -1) {
      return jsonOut({
        success: false,
        error:   'This email has already registered. Contact the organizers if you need to edit your entry.'
      });
    }

    // Screenshot → Drive
    var screenshotUrl = '';
    if (data.screenshot && data.screenshot.data) {
      var bytes;
      try {
        bytes = Utilities.base64Decode(data.screenshot.data);
      } catch (b64err) {
        return jsonOut({ success: false, error: 'Screenshot encoding is invalid.' });
      }
      if (bytes.length > 10 * 1024 * 1024) {
        return jsonOut({ success: false, error: 'Screenshot must be under 10 MB.' });
      }
      var blob = Utilities.newBlob(bytes, data.screenshot.type, data.screenshot.name);
      var ts   = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd_HHmmss');
      var safeEmail = String(data.email || 'unknown').replace(/[^A-Za-z0-9._-]/g, '_');
      var file = DriveApp.getFolderById(FOLDER_ID)
        .createFile(blob.setName(ts + '_' + safeEmail + '_' + data.screenshot.name));
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      screenshotUrl = file.getUrl();
    }

    // Append the row
    sheet.appendRow([
      new Date(),
      data.fullName    || '',
      data.email       || '',
      data.mobile      || '',
      data.department  || '',
      data.year        || '',
      data.txnId       || '',
      screenshotUrl,
      data.eventType   || 'hackathon'
    ]);

    return jsonOut({ success: true, whatsapp: WHATSAPP });
  } catch (err) {
    return jsonOut({ success: false, error: 'Server error: ' + err.toString() });
  }
}

/** GET handler — quick liveness probe. */
function doGet() {
  return jsonOut({ ok: true, hint: 'POST only. See apps-script/README.md.' });
}

// ============================================================
// HELPERS
// ============================================================

/** Return a ContentService response with proper JSON content-type. */
function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
