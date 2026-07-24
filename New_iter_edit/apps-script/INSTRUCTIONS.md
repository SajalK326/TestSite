# Google Apps Script — Registration Backend

This is the backend for the registration form on the IEEE Ignite Week / Tomorrow.exe landing page. The form posts JSON (with the payment screenshot base64-encoded) to a Google Apps Script Web App, which appends a row to a Google Sheet and uploads the screenshot to a Google Drive folder.

## One-time setup

### 1. Create a Google Sheet
1. Go to [sheets.new](https://sheets.new) → name it **IEEE Ignite Week — Registrations**.
2. (Optional) Add a header row manually. If you don't, the script will add it on the first submission.

### 2. Create a Google Drive folder for screenshots
1. Go to [drive.google.com](https://drive.google.com) → **New** → **Folder** → name it **Payment Screenshots**.
2. Open the folder. Copy the **folder ID** from the URL bar — it's the long string between `/folders/` and `?usp=...`. Example:
   ```
   https://drive.google.com/drive/folders/1aBcD-eFgHiJkLmNoPqRsTuVwXyZ   ← this part
   ```

### 3. Create the Apps Script project
1. Go to [script.google.com](https://script.google.com) → **New project**.
2. Rename the project to **Tomorrow.exe Registration**.
3. Open `Code.gs` (the default file) and **delete its contents**.
4. Open `apps-script/code.gs` from this repo, **copy the entire file**, and **paste it** into the Apps Script editor.
5. At the top of the file, replace two placeholders:
   - `var FOLDER_ID = 'PASTE_YOUR_DRIVE_FOLDER_ID';` → paste the folder ID from step 2.
   - `var WHATSAPP  = 'https://chat.whatsapp.com/PLACEHOLDER_INVITE_LINK';` → paste your real WhatsApp group invite.
6. Click the **Save** icon (💾).

### 4. Bind the script to the sheet
1. In the Apps Script editor, click the **clock icon** (Triggers) on the left sidebar.
2. Click **+ Add Trigger** at the bottom-right.
3. Configure:
   - Choose which function to run: **`doPost`**
   - Which deployment should run: **Head**
   - Event source: **From spreadsheet** → **On form submit** (or leave as Time-driven for testing)
   - *Note: triggers are optional for this setup — they matter only if you want automatic side-effects (email, etc.). For pure sheet + Drive logging, you can skip this step.*
4. Save → you may be asked to review permissions → click **Review Permissions** → sign in with the same Google account that owns the sheet and Drive folder → **Allow**.

### 5. Bind the script to the sheet (one-time `getActiveSpreadsheet` link)
The script uses `SpreadsheetApp.getActiveSpreadsheet()` — which means the Apps Script project must be **container-bound** to the sheet, OR you must swap that line to `SpreadsheetApp.openById('YOUR_SHEET_ID')`.

**Easier path (container-bound):**
1. Open the **Registrations** Google Sheet.
2. Click **Extensions** → **Apps Script** → this opens a new Apps Script project *bound to this sheet*.
3. Paste the `code.gs` into that project (delete the default content first).
4. Save.

**Alternative path (standalone script — recommended for easier deployment):**
1. In your standalone `Tomorrow.exe Registration` project, change the line:
   ```js
   var ss = SpreadsheetApp.getActiveSpreadsheet();
   ```
   to:
   ```js
   var ss = SpreadsheetApp.openById('PASTE_YOUR_GOOGLE_SHEET_ID');
   ```
   You can find the sheet ID the same way as the folder ID — it's the long string between `/d/` and `/edit` in the sheet's URL.

### 6. Deploy as a Web App
1. In the Apps Script editor, click **Deploy** (top-right) → **New deployment**.
2. Click the gear icon next to "Select type" → choose **Web app**.
3. Fill in:
   - **Description:** `Registration v1`
   - **Execute as:** **Me** (your account)
   - **Who has access:** **Anyone**
4. Click **Deploy**.
5. Copy the **Web app URL** — it ends in `/exec`. Example:
   ```
   https://script.google.com/macros/s/AKfycbw.../exec
   ```

### 7. Wire it into the front-end
1. Open `js/registration.js` in this repo.
2. Replace the two placeholders in the `REG_CONFIG` block at the top of the file:
   ```js
   APPS_SCRIPT_URL: 'https://script.google.com/macros/s/PASTE_YOUR_DEPLOYMENT_ID/exec',
   WHATSAPP_LINK:   'https://chat.whatsapp.com/PLACEHOLDER_INVITE_LINK',
   ```
3. Save.

### 8. Test
1. Open `index.html` in your browser.
2. Click any **Register Now** button — the modal should open.
3. Fill out the form with valid data. Use a small test image for the screenshot.
4. Submit. You should see the success view with the WhatsApp link.
5. Verify:
   - A new row appeared in your Google Sheet.
   - The screenshot file appeared in your Drive folder.
6. Test the duplicate-email guard: re-submit the same email → you should see the error message.

## Notes

- **CORS:** Apps Script Web Apps do not let you set CORS headers. The client gets around this by sending a **simple request** with `Content-Type: text/plain;charset=utf-8` and a JSON string body. The browser allows reading the response because no preflight is triggered.
- **Response content-type:** Apps Script always sends `Content-Type: text/html` even when the body is JSON. The client reads the response as raw text and parses it manually — do not use `response.json()`.
- **Timeouts:** Apps Script cold-starts can take 5–10 seconds. The client uses a 30-second timeout.
- **File size limit:** Apps Script Web Apps have a 50 MB body limit. The 10 MB screenshot cap on the client stays well within that.
- **Deployment updates:** When you change the script code, you must create a **new versioned deployment** (Deploy → Manage deployments → ✏ → Version: New version) and update the `APPS_SCRIPT_URL` in `js/registration.js`. Alternatively, append `?v=2` to the URL — but the cleanest fix is always a new versioned deployment.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Submit silently does nothing | CORS preflight failure (you changed `Content-Type` to `application/json`) | Revert the client to `text/plain;charset=utf-8` |
| `Unexpected response from server` | Wrong `/exec` URL or script error | Open the `/exec` URL in a browser — it should show `{"ok":true,...}`. If it shows a Google login page, the deployment is misconfigured. |
| Sheet shows headers but no row | An exception was thrown in `doPost` (e.g. invalid FOLDER_ID) | Open the Apps Script editor → **Executions** (left sidebar) → click the latest run → read the error. |
| Screenshot saved but not in the folder | `FOLDER_ID` is wrong or the Apps Script account lacks access to the folder | Verify the ID, and that the folder is owned by (or shared with) the same Google account that owns the script. |
| `This email has already registered` for a new submission | The email column already has a stale value from manual testing | Delete the test row, or use a different email for the next test. |
