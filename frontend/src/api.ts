const BASE = 'http://localhost:3001';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json();
}

// Accounts
export const getAccounts = () => req<Account[]>('/api/accounts');
export const addYahooAccount = (email: string, appPassword: string) =>
  req('/api/accounts', { method: 'POST', body: JSON.stringify({ type: 'yahoo', email, appPassword }) });
export const deleteAccount = (id: string) =>
  req(`/api/accounts/${id}`, { method: 'DELETE' });

// Sync
export const syncAccount = (opts: {
  accountId: string;
  mode: 'headers-only' | 'full-download' | 'server-side';
  runDnsbl?: boolean;
  searchAddress?: string;
  frequencyThreshold?: number;
  batchSize?: number;
}) => req<{ fetched: number; flagged: number }>('/api/email/sync', { method: 'POST', body: JSON.stringify(opts) });

// Emails
export const getFlaggedEmails = (accountId: string) =>
  req<EmailRecord[]>(`/api/email/flagged?accountId=${encodeURIComponent(accountId)}`);

export const getAllEmails = (accountId: string, page = 1, limit = 100) =>
  req<{ emails: EmailRecord[]; total: number; page: number; limit: number }>(
    `/api/email/all?accountId=${encodeURIComponent(accountId)}&page=${page}&limit=${limit}`
  );

export const searchByAddress = (accountId: string, address: string) =>
  req<{ emails: EmailRecord[]; domain: string; count: number }>('/api/email/search', {
    method: 'POST',
    body: JSON.stringify({ accountId, address }),
  });

export const deleteEmails = (accountId: string, uids: string[]) =>
  req<{ deleted: number }>('/api/email/delete', {
    method: 'POST',
    body: JSON.stringify({ accountId, uids }),
  });

export const reportSpam = (accountId: string, uids: string[]) =>
  req<{ reported: number }>('/api/email/report-spam', {
    method: 'POST',
    body: JSON.stringify({ accountId, uids }),
  });

export const callUnsubscribe = (listUnsubscribe: string) =>
  req<{ ok: boolean; method: 'http' | 'mailto'; url: string; status?: number }>('/api/email/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ listUnsubscribe }),
  });

// Whitelist
export interface WhitelistEntry {
  id: string;
  pattern: string;
  patternType: 'email' | 'domain';
  note: string | null;
  createdAt: string;
}
export const getWhitelist = () => req<WhitelistEntry[]>('/api/whitelist');
export const addWhitelistEntry = (pattern: string, patternType: 'email' | 'domain', note?: string) =>
  req<WhitelistEntry>('/api/whitelist', { method: 'POST', body: JSON.stringify({ pattern, patternType, note }) });
export const removeWhitelistEntry = (id: string) =>
  req<{ ok: boolean }>(`/api/whitelist/${id}`, { method: 'DELETE' });

// Types
export interface Account {
  id: string;
  type: 'gmail' | 'yahoo';
  email: string;
  lastSyncAt: string | null;
}

export interface EmailRecord {
  uid: string;
  accountId: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  date: string;
  flagged: boolean;
  flagReason: string | null;
  deleted: boolean;
  listUnsubscribe: string | null;
  matchType?: string | null;
}
