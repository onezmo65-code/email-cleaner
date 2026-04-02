import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DB_PATH ?? './email-cleaner.db';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(path.resolve(DB_PATH));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDatabase(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id          TEXT PRIMARY KEY,
      type        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      accessToken  TEXT,
      refreshToken TEXT,
      appPassword  TEXT,
      lastSyncAt   TEXT
    );

    CREATE TABLE IF NOT EXISTS emails (
      uid             TEXT NOT NULL,
      accountId       TEXT NOT NULL,
      mailbox         TEXT NOT NULL DEFAULT 'INBOX',
      messageId       TEXT,
      fromName        TEXT,
      fromAddress     TEXT NOT NULL,
      subject         TEXT,
      date            TEXT,
      size            INTEGER DEFAULT 0,
      bodyDownloaded  INTEGER DEFAULT 0,
      body            TEXT,
      flagged         INTEGER DEFAULT 0,
      flagReason      TEXT,
      deleted         INTEGER DEFAULT 0,
      PRIMARY KEY (uid, accountId),
      FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_emails_fromAddress ON emails(fromAddress);
    CREATE INDEX IF NOT EXISTS idx_emails_flagged     ON emails(flagged);
    CREATE INDEX IF NOT EXISTS idx_emails_accountId  ON emails(accountId);

    CREATE TABLE IF NOT EXISTS whitelist (
      id          TEXT PRIMARY KEY,
      pattern     TEXT NOT NULL UNIQUE,
      patternType TEXT NOT NULL,
      note        TEXT,
      createdAt   TEXT NOT NULL
    );
  `);

  // Schema migrations — safe to run on existing DBs
  try { db.exec('ALTER TABLE emails ADD COLUMN listUnsubscribe TEXT'); } catch {}

  console.log('Database initialized at', path.resolve(DB_PATH));
}

// --- Email queries ---

export function upsertEmails(emails: import('./models').EmailRecord[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO emails (uid, accountId, mailbox, messageId, fromName, fromAddress,
                        subject, date, size, bodyDownloaded, body, flagged, flagReason, deleted, listUnsubscribe)
    VALUES (@uid, @accountId, @mailbox, @messageId, @fromName, @fromAddress,
            @subject, @date, @size, @bodyDownloaded, @body, @flagged, @flagReason, @deleted, @listUnsubscribe)
    ON CONFLICT(uid, accountId) DO UPDATE SET
      flagged         = excluded.flagged,
      flagReason      = excluded.flagReason,
      deleted         = excluded.deleted,
      body            = COALESCE(excluded.body, body),
      bodyDownloaded  = COALESCE(excluded.bodyDownloaded, bodyDownloaded),
      listUnsubscribe = COALESCE(excluded.listUnsubscribe, listUnsubscribe)
  `);

  const insertMany = db.transaction((rows: import('./models').EmailRecord[]) => {
    for (const row of rows) {
      stmt.run({ ...row, bodyDownloaded: row.bodyDownloaded ? 1 : 0, flagged: row.flagged ? 1 : 0, deleted: row.deleted ? 1 : 0 });
    }
  });

  insertMany(emails);
}

export function getFlaggedEmails(accountId: string): import('./models').EmailRecord[] {
  const whitelist = getWhitelist();
  const emails = getDb()
    .prepare('SELECT * FROM emails WHERE accountId = ? AND flagged = 1 AND deleted = 0 ORDER BY date DESC')
    .all(accountId) as import('./models').EmailRecord[];
  if (whitelist.length === 0) return emails;
  return emails.filter((e) => !isAddressWhitelisted(e.fromAddress, whitelist));
}

export function markDeleted(uids: string[], accountId: string): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE emails SET deleted = 1 WHERE uid = ? AND accountId = ?');
  const run = db.transaction(() => uids.forEach((uid) => stmt.run(uid, accountId)));
  run();
}

export function updateFlags(
  updates: Array<{ uid: string; accountId: string; flagged: boolean; flagReason: string | null }>
): void {
  const db = getDb();
  const stmt = db.prepare(
    'UPDATE emails SET flagged = @flagged, flagReason = @flagReason WHERE uid = @uid AND accountId = @accountId'
  );
  const run = db.transaction(() =>
    updates.forEach((u) => stmt.run({ ...u, flagged: u.flagged ? 1 : 0 }))
  );
  run();
}

export function searchByDomain(domain: string, accountId: string): import('./models').EmailRecord[] {
  return getDb()
    .prepare("SELECT * FROM emails WHERE accountId = ? AND fromAddress LIKE ? AND deleted = 0")
    .all(accountId, `%@${domain}`) as import('./models').EmailRecord[];
}

// --- Whitelist queries ---

function isAddressWhitelisted(fromAddress: string, whitelist: import('./models').WhitelistEntry[]): boolean {
  const addr = fromAddress.toLowerCase();
  const domain = addr.split('@')[1] ?? '';
  return whitelist.some(
    (w) =>
      (w.patternType === 'email' && w.pattern === addr) ||
      (w.patternType === 'domain' && w.pattern === domain)
  );
}

export function getWhitelist(): import('./models').WhitelistEntry[] {
  return getDb()
    .prepare('SELECT * FROM whitelist ORDER BY createdAt DESC')
    .all() as import('./models').WhitelistEntry[];
}

export function addToWhitelist(entry: import('./models').WhitelistEntry): void {
  getDb().prepare(`
    INSERT OR REPLACE INTO whitelist (id, pattern, patternType, note, createdAt)
    VALUES (@id, @pattern, @patternType, @note, @createdAt)
  `).run(entry);
}

export function removeFromWhitelist(id: string): void {
  getDb().prepare('DELETE FROM whitelist WHERE id = ?').run(id);
}

// --- Account queries ---

export function upsertAccount(account: import('./models').AccountRecord): void {
  getDb().prepare(`
    INSERT INTO accounts (id, type, email, accessToken, refreshToken, appPassword, lastSyncAt)
    VALUES (@id, @type, @email, @accessToken, @refreshToken, @appPassword, @lastSyncAt)
    ON CONFLICT(id) DO UPDATE SET
      accessToken  = excluded.accessToken,
      refreshToken = excluded.refreshToken,
      appPassword  = excluded.appPassword,
      lastSyncAt   = excluded.lastSyncAt
  `).run(account);
}

export function getAccounts(): import('./models').AccountRecord[] {
  return getDb().prepare('SELECT * FROM accounts').all() as import('./models').AccountRecord[];
}

export function getAccount(id: string): import('./models').AccountRecord | null {
  return (getDb().prepare('SELECT * FROM accounts WHERE id = ?').get(id) as import('./models').AccountRecord) ?? null;
}
