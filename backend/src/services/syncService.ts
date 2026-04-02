import { AccountConfig, SyncMode, fetchHeaders, fetchBody, deleteOnServer, refreshGmailToken } from './imapService';
import { runAllFilters } from './filterEngine';
import { upsertEmails, markDeleted, updateFlags, getDb, upsertAccount, getAccount } from '../db/database';
import { EmailRecord } from '../db/models';

export interface SyncOptions {
  mode: SyncMode;
  runDnsbl?: boolean;
  runRules?: boolean;
  frequencyThreshold?: number;
  searchAddress?: string;
  mailbox?: string;
  limit?: number;
}

export interface SyncProgress {
  stage: string;
  fetched: number;
  flagged: number;
  total: number;
}

/**
 * Main sync entry point.
 * mode = 'headers-only'  → fetch headers, filter, save flags. No bodies.
 * mode = 'full-download' → fetch headers + all bodies, save locally.
 * mode = 'server-side'   → run IMAP SEARCH commands; minimal local storage.
 */
export async function syncAccount(
  account: AccountConfig,
  opts: SyncOptions,
  onProgress?: (p: SyncProgress) => void
): Promise<{ fetched: number; flagged: number }> {
  const mailbox = opts.mailbox ?? 'INBOX';
  const limit = opts.limit ?? 5000;

  // Auto-refresh Gmail access token before connecting
  if (account.type === 'gmail' && account.refreshToken) {
    try {
      const newToken = await refreshGmailToken(account);
      account.accessToken = newToken;
      const stored = getAccount(account.id);
      if (stored) {
        upsertAccount({ ...stored, accessToken: newToken });
      }
    } catch (e) {
      console.warn('Gmail token refresh failed, trying with existing token:', e);
    }
  }

  onProgress?.({ stage: 'Fetching headers...', fetched: 0, flagged: 0, total: 0 });

  // Step 1 — always fetch headers
  const headers = await fetchHeaders(account, mailbox, limit);

  onProgress?.({ stage: 'Saving to local cache...', fetched: headers.length, flagged: 0, total: headers.length });
  upsertEmails(headers);

  // Step 2 — full download: fetch bodies too
  if (opts.mode === 'full-download') {
    onProgress?.({ stage: 'Downloading email bodies...', fetched: headers.length, flagged: 0, total: headers.length });
    const BATCH = 50;
    for (let i = 0; i < headers.length; i += BATCH) {
      const batch = headers.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (h) => {
          const body = await fetchBody(account, h.uid, mailbox);
          if (body) {
            getDb()
              .prepare('UPDATE emails SET body = ?, bodyDownloaded = 1 WHERE uid = ? AND accountId = ?')
              .run(body, h.uid, account.id);
          }
        })
      );
      onProgress?.({ stage: 'Downloading bodies...', fetched: Math.min(i + BATCH, headers.length), flagged: 0, total: headers.length });
    }
  }

  // Step 3 — run filters
  onProgress?.({ stage: 'Running filters...', fetched: headers.length, flagged: 0, total: headers.length });

  const filterResults = await runAllFilters(headers, {
    frequencyThreshold: opts.frequencyThreshold ?? 10,
    searchAddress: opts.searchAddress,
    runDnsbl: opts.runDnsbl ?? false,
    runRules: opts.runRules ?? true,
  });

  const flagUpdates = [...filterResults.values()].map((r) => ({
    uid: r.uid,
    accountId: account.id,
    flagged: r.flagged,
    flagReason: r.detail || null,
  }));
  updateFlags(flagUpdates);

  const flaggedCount = flagUpdates.filter((u) => u.flagged).length;
  onProgress?.({ stage: 'Done', fetched: headers.length, flagged: flaggedCount, total: headers.length });

  // Update lastSyncAt
  getDb()
    .prepare('UPDATE accounts SET lastSyncAt = ? WHERE id = ?')
    .run(new Date().toISOString(), account.id);

  return { fetched: headers.length, flagged: flaggedCount };
}

/**
 * Push local deletion decisions back to the mail server.
 * Call this after the user confirms which flagged emails to delete.
 */
export async function pushDeletions(
  account: AccountConfig,
  uids: string[],
  mailbox = 'INBOX'
): Promise<void> {
  await deleteOnServer(account, uids, mailbox);
  markDeleted(uids, account.id);
}
