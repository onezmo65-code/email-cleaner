# OAuth & Account Setup Guide

## Yahoo — App Password (5 minutes, easiest)

1. Go to https://login.yahoo.com/account/security
2. Scroll to "Generate app password"
3. Select "Other app" → type "Email Cleaner" → Generate
4. Copy the 16-character code shown
5. In Email Cleaner Settings → Add Yahoo Account → paste the code

That's it. No developer account needed.

---

## Gmail — OAuth2 (one-time setup, ~15 minutes)

### Step 1 — Create a Google Cloud project

1. Go to https://console.cloud.google.com
2. Click "Select a project" → "New Project" → name it "Email Cleaner" → Create
3. In the left menu: APIs & Services → Library
4. Search "Gmail API" → Enable it

### Step 2 — Create OAuth credentials

1. APIs & Services → Credentials → "Create Credentials" → OAuth client ID
2. If prompted, configure the consent screen first:
   - User type: External
   - App name: Email Cleaner
   - Add your Gmail as a test user
   - Scopes: add `https://mail.google.com/`
3. Back in Credentials → Create OAuth client ID:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3001/auth/gmail/callback`
4. Download the JSON or copy the Client ID and Client Secret

### Step 3 — Add to .env

Copy `backend/.env.example` to `backend/.env` and fill in:

```
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:3001/auth/gmail/callback
```

### Step 4 — Connect in the app

1. Start the app (see README_START.md)
2. Go to Settings → "Connect Gmail" → sign in with Google
3. Allow the requested permissions
4. You'll be redirected back to the app — Gmail is now connected

---

## For Public Deployment (later)

When deploying to Railway/Render:
- Change `GMAIL_REDIRECT_URI` to your deployed URL
- Submit your Google app for verification (free, ~1 week)
- Each new user who signs up uses **your** OAuth app — they never touch the console
