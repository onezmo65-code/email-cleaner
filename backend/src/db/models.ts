export interface EmailRecord {
  uid: string;
  accountId: string;
  mailbox: string;
  messageId: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  date: string;         // ISO string
  size: number;
  bodyDownloaded: boolean;
  body: string | null;
  flagged: boolean;
  flagReason: string | null;
  deleted: boolean;
  listUnsubscribe: string | null;  // raw List-Unsubscribe header value
}

export interface AccountRecord {
  id: string;
  type: 'gmail' | 'yahoo';
  email: string;
  accessToken: string | null;
  refreshToken: string | null;
  appPassword: string | null;
  lastSyncAt: string | null;
}

export interface WhitelistEntry {
  id: string;
  pattern: string;       // exact email address OR domain name (no @)
  patternType: 'email' | 'domain';
  note: string | null;
  createdAt: string;     // ISO string
}
