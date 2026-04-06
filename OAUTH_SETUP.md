# Gmail OAuth Setup Guide
## Email Cleaner — Version 1.1 | Publisher: Originatti

This guide sets up Gmail access for **one person** (you).
It takes about 15–20 minutes and is done only once.
You will need a Google account and a web browser.

---

## OVERVIEW — What you will do

1. Go to Google Cloud Console (free, no card needed)
2. Create a project called "Email Cleaner"
3. Turn on the Gmail API
4. Set up an OAuth consent screen (tells Google what your app does)
5. Add yourself as a test user
6. Create credentials and download a file
7. Place two files in the backend folder
8. Connect Gmail inside the app

---

## PART 1 — Create a Google Cloud Project

**Step 1.**
Open your browser. Go to:
```
https://console.cloud.google.com
```
Sign in with your Google account if prompted.

**Step 2.**
At the very top of the page, you will see a dropdown that says
"Select a project" or shows a project name.
Click it.

**Step 3.**
A popup window opens. In the top-right corner of that popup,
click **"NEW PROJECT"**.

**Step 4.**
In the "Project name" field, type:
```
Email Cleaner
```
Leave "Location" as-is ("No organization" is fine).
Click **"CREATE"**.

**Step 5.**
Wait 5–10 seconds. Google creates the project.
A notification appears in the top-right bell icon.
Click the notification or the "SELECT PROJECT" link to open it.

You should now see "Email Cleaner" in the top dropdown.

---

## PART 2 — Enable the Gmail API

**Step 6.**
On the left side panel, click **"APIs & Services"**.
If you don't see the panel, click the three-line menu (☰) top-left first.

**Step 7.**
Click **"Library"** from the submenu.

**Step 8.**
In the search box, type:
```
Gmail API
```
Press Enter.

**Step 9.**
Click the result called **"Gmail API"** (it has the Gmail envelope icon).

**Step 10.**
Click the blue **"ENABLE"** button.
Wait for it to finish (5 seconds).

---

## PART 3 — Configure the Consent Screen

The consent screen is the popup Google shows when you sign in.
You must fill it in before creating credentials.

**Step 11.**
On the left panel, click **"OAuth consent screen"**.
(If you don't see it, click "APIs & Services" first, then "OAuth consent screen".)

**Step 12.**
Under "User Type", select **"External"**.
Click **"CREATE"**.

**Step 13.**
You are now on the "App information" page. Fill in:

- **App name**: `Email Cleaner`
- **User support email**: select your Gmail address from the dropdown
- **App logo**: skip (not required)
- **Application home page**: skip
- **Application privacy policy link**: skip
- **Application terms of service link**: skip
- **Developer contact information** (at the bottom): type your Gmail address

Click **"SAVE AND CONTINUE"**.

---

## PART 4 — Add Gmail Scope (Permission)

**Step 14.**
You are now on the "Scopes" page.
Click the **"ADD OR REMOVE SCOPES"** button.

**Step 15.**
A panel slides in from the right.
At the bottom of that panel, find the box labeled
**"Manually add scopes"**.

Type this exactly into that box:
```
https://mail.google.com/
```
Click **"ADD TO TABLE"**.

**Step 16.**
You will see a row appear in the table above with:
- Scope: `https://mail.google.com/`
- Type: Sensitive

Check the checkbox on that row to select it.

Click **"UPDATE"** at the bottom of the panel.

**Step 17.**
The panel closes. You can see the scope listed.
Click **"SAVE AND CONTINUE"**.

---

## PART 5 — Add Yourself as a Test User

While your app is in "Testing" mode, only accounts you list here
can sign in. You must add your Gmail address.

**Step 18.**
You are now on the "Test users" page.
Click **"+ ADD USERS"**.

**Step 19.**
Type your Gmail address (the one you want to connect to Email Cleaner).
Press Enter or click **"ADD"**.

**Step 20.**
Your email should now appear in the list.
Click **"SAVE AND CONTINUE"**.

**Step 21.**
You reach the "Summary" page. Scroll down and click **"BACK TO DASHBOARD"**.

---

## PART 6 — Create OAuth Credentials

**Step 22.**
On the left panel, click **"Credentials"**.

**Step 23.**
At the top, click **"+ CREATE CREDENTIALS"**.
From the dropdown, choose **"OAuth client ID"**.

**Step 24.**
Under "Application type", click the dropdown and select:
**"Desktop app"**

**Step 25.**
Under "Name", type:
```
Email Cleaner Desktop
```

Click **"CREATE"**.

**Step 26.**
A popup appears showing your Client ID and Client Secret.
Click **"DOWNLOAD JSON"** (the button on the right side of the popup).

A file called something like:
```
client_secret_XXXXXXXX.apps.googleusercontent.com.json
```
will be saved to your Downloads folder.

Click **"OK"** to close the popup.

---

## PART 7 — Place the Files in the Backend Folder

You need to place two files in the `backend` folder of Email Cleaner.

### File 1 — credentials.json

**Step 27.**
Open your **Downloads** folder.
Find the file you just downloaded (starts with `client_secret_`).

**Step 28.**
**Rename it** to:
```
credentials.json
```
(Right-click → Rename → type `credentials.json` → press Enter)

**Step 29.**
Move or copy this file into the `backend` folder of Email Cleaner.

Example locations:
- Windows: `C:\EmailCleaner\backend\credentials.json`
- macOS/Linux: `~/EmailCleaner/backend/credentials.json`

### File 2 — .env

**Step 30.**
Open the `backend` folder of Email Cleaner.
Find the file called `.env.example`. Open it with Notepad.

**Step 31.**
Go back to the Google Cloud Console browser window.
Click **"Credentials"** on the left panel.
Under "OAuth 2.0 Client IDs", find your "Email Cleaner Desktop" entry.
Click the **pencil (edit) icon** on the right.

You will see:
- **Your Client ID** — a long string ending in `.apps.googleusercontent.com`
- **Your Client Secret** — starts with `GOCSPX-`

**Step 32.**
In Notepad, replace the placeholder values so the file looks like this
(using YOUR actual values):

```
PORT=3001
GMAIL_CLIENT_ID=PASTE_YOUR_CLIENT_ID_HERE
GMAIL_CLIENT_SECRET=PASTE_YOUR_CLIENT_SECRET_HERE
GMAIL_REDIRECT_URI=http://localhost:3001/auth/gmail/callback
DB_PATH=./email-cleaner.db
```

**Step 33.**
Save the file — but **you must save it as `.env`** not `.env.txt`.

**On Windows (Notepad):**
- Click File → Save As
- Navigate to the `backend` folder
- In the "File name" box, type: `.env`  (with the dot, no other text)
- Change "Save as type" to: **All Files (\*.\*)**
- Click Save

**On macOS (TextEdit):**
- Click Format → Make Plain Text (if not already)
- Click File → Save As
- Navigate to the `backend` folder
- Name: `.env`
- Uncheck "If no extension is provided, use .txt"
- Click Save

**Step 34.**
Check the backend folder. You should now see both:
- `credentials.json`
- `.env`

---

## PART 8 — Connect Gmail in the App

**Step 35.**
Start Email Cleaner normally (double-click START.bat on Windows,
or run `bash START.sh` on macOS/Linux).

**Step 36.**
When the app opens in your browser, click **"Settings"**
(gear icon or Settings menu).

**Step 37.**
Click **"Connect Gmail"** or **"Add Gmail Account"**.

**Step 38.**
Your browser opens a Google sign-in page.
Sign in with the Gmail account you added as a test user in Step 19.

**Step 39.**
Google shows a warning: "Google hasn't verified this app."
This is normal — it is YOUR app. Click **"Continue"**.

**Step 40.**
Google asks for permission to access Gmail.
Click **"Continue"** or **"Allow"**.

**Step 41.**
You are redirected back to Email Cleaner.
Your Gmail account now appears in the app.
Emails will begin loading within a few seconds.

---

## TROUBLESHOOTING

**"Error 400: redirect_uri_mismatch"**
The redirect URI in Google Cloud does not match.
Go to Cloud Console → Credentials → edit your OAuth client.
Make sure Authorized redirect URIs contains exactly:
`http://localhost:3001/auth/gmail/callback`
(no trailing slash, no https)

**"Error 403: access_denied"**
Your Gmail address is not in the test users list.
Go to Cloud Console → OAuth consent screen → Audience → Test users.
Add your Gmail address and try again.

**"This app isn't verified"**
This is expected while the app is in Testing mode.
Click "Continue" (Advanced → Go to Email Cleaner) to proceed.

**".env not found" or credentials error**
Make sure:
- The file is named `.env` (not `.env.txt`)
- It is inside the `backend` folder
- There are no extra spaces around the `=` signs

---

## NOTES

- This setup is for personal use. Your credentials stay on your computer.
- Google keeps apps in "Testing" mode for 7 days then expires tokens.
  If your login stops working after 7 days, go back to Step 18 and
  re-add yourself as a test user. (Or publish the app — see below.)
- To allow family members to connect their Gmail, add their addresses
  in the Test Users list (Step 18–19).

---

## FOR TECHNICAL USERS — Publishing the App (Optional)

If you want anyone to connect Gmail without being a test user:
1. Cloud Console → OAuth consent screen → "PUBLISH APP"
2. Google will review your app (1–4 weeks, free)
3. After approval, any Google account can sign in

This is only needed for public distribution.

---

*Email Cleaner v1.1 | https://github.com/onezmo65-code/email-cleaner*
