# Sheet backend setup (one time, about 5 minutes, free)

The page saves stars, rejections and added addresses to the Starred analysis sheet through this script. Everyone with the page password sees the same data. 3-star listings land in the sheet's **Starred** tab automatically.

**Cost:** none. Google Sheets and Apps Script are free with any Google account. Gemini is not needed: skip any Gemini, "Help me" or AI side-panel prompts in Sheets or the script editor.

## Before you start: use one Google account

"Sorry, unable to open the file at this time" usually means the browser is signed in to more than one Google account and opened the script editor as the wrong one. Fix: open a private/incognito window (or a browser profile) and sign in only with the account that owns the sheet.

## Steps

1. In that window, go to [script.google.com](https://script.google.com) → **New project**. Name it "Listing check sync". (This avoids the sheet's Extensions menu, which is where the multi-account error shows up. Extensions → Apps Script also works if it opens for you.)
2. Replace the editor's contents with `Code.gs` from this folder. Save.
3. Pick `setup` in the function menu and click **Run**. Approve the access prompt (choose the sheet-owner account; if you see "Google hasn't verified this app", click Advanced → Go to Listing check sync). Open **Execution log** and copy the `TOKEN` value. The sheet now has tabs: added, removed, stars, Starred.
4. Click **Deploy → New deployment**. Type: **Web app**. Execute as: **Me**. Who has access: **Anyone**. Click **Deploy** and copy the web app URL (ends in `/exec`).
5. In GitHub, open **Settings → Secrets and variables → Actions** for `bd3vani/homein2027`. Add:
   - `LISTING_SHEET_URL`: the web app URL
   - `LISTING_SHEET_TOKEN`: the token from step 3
   - `STATICRYPT_PASSWORD`: the page password you choose
6. Open **Actions → Build and encrypt page → Run workflow**. The page now syncs to the sheet.

If you change `Code.gs` later, use **Deploy → Manage deployments → Edit → New version** so the URL stays the same.

"Anyone" access is required so the page can reach the script without a Google sign-in. Writes still need the token, and the token is only inside the encrypted page.

## Free limits that matter here

Consumer-account limits are far above this page's use (a few dozen writes a week): 6 minutes per execution and 30 simultaneous executions per user. See Google's [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas).
