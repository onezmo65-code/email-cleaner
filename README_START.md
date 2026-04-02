# How to Start Email Cleaner

## First time only

```bash
# 1. Copy and fill in your credentials
cp backend/.env.example backend/.env
# Edit backend/.env with your Gmail OAuth keys and/or Yahoo app password

# 2. Install dependencies (already done if you followed setup)
cd backend && npm install
cd ../frontend && npm install
```

## Start the app (every time)

Open two terminals in VS Code (click the + in the terminal panel):

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Opens at http://localhost:5173
```

Then open http://localhost:5173 in your browser.

## Access from another device (phone, tablet)

1. Find your PC's local IP: run `ipconfig` in terminal, look for IPv4 (e.g. 192.168.1.50)
2. On your phone browser: http://192.168.1.50:5173
3. Make sure both devices are on the same WiFi network

## Project structure

```
backend/src/
  index.ts              Entry point (Express server)
  routes/
    email.ts            Sync, list, search, delete endpoints
    accounts.ts         Add/remove email accounts
    auth.ts             Gmail OAuth flow
  services/
    imapService.ts      IMAP connection (Gmail + Yahoo)
    filterEngine.ts     All filter rules (frequency, domain, DNSBL, spam rules)
    syncService.ts      3 sync modes + push deletions back to server
    dnsblService.ts     Free DNS blocklist checks
  db/
    database.ts         SQLite setup and queries
    models.ts           TypeScript types

frontend/src/
  App.tsx               Navigation shell
  api.ts                All API calls to backend
  pages/
    Inbox.tsx           Flagged email list + bulk delete
    Search.tsx          Address/domain search + delete
    Settings.tsx        Add Gmail/Yahoo accounts
```
