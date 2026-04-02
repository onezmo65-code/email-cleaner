import { ImapFlow, ImapFlowOptions, FetchMessageObject } from 'imapflow';
import { OAuth2Client } from 'google-auth-library';
import { EmailRecord } from '../db/models';

export type AccountType = 'gmail' | 'yahoo';
export type SyncMode = 'headers-only' | 'full-download' | 'server-side';

export interface AccountConfig {
  id: string;
  type: AccountType;
  email: string;
  // Gmail: OAuth tokens. Yahoo: app password or OAuth tokens.
  accessToken?: string;
  refreshToken?: string;
  appPassword?: string;
}

function buildImapOptions(account: AccountConfig): ImapFlowOptions {
  if (account.type === 'gmail') {
    return {
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: account.email,
        accessToken: account.accessToken!,
      },
      logger: false,
    };
  } else {
    // Yahoo — app password
    return {
      host: 'imap.mail.yahoo.com',
      port: 993,
      secure: true,
      auth: {
        user: account.email,
        pass: account.appPassword!,
      },
      logger: false,
    };
  }
}

/**
 * Fetch email headers only (From, Subject, Date, Message-ID).
 * Fast — does not download email bodies.
 */
export async function fetchHeaders(
  account: AccountConfig,
  mailbox = 'INBOX',
  limit = 5000
): Promise<EmailRecord[]> {
  const client = new ImapFlow(buildImapOptions(account));
  await client.connect();

  const lock = await client.getMailboxLock(mailbox);
  const records: EmailRecord[] = [];

  try {
    const messages = client.fetch(`1:${limit}`, {
      envelope: true,
      uid: true,
      headers: ['list-unsubscribe'],
    } as any);

    for await (const msg of messages) {
      const env = msg.envelope;
      if (!env) continue;

      // Extract List-Unsubscribe header (may be Map<string,string[]> in imapflow)
      let listUnsubscribe: string | null = null;
      try {
        const hmap = (msg as any).headers as Map<string, string[]> | undefined;
        const vals = hmap?.get('list-unsubscribe');
        if (vals?.length) listUnsubscribe = vals.join(', ');
      } catch {}

      const from = env.from?.[0];
      records.push({
        uid: String(msg.uid),
        accountId: account.id,
        mailbox,
        messageId: env.messageId ?? '',
        fromName: from?.name ?? '',
        fromAddress: from?.address ?? '',
        subject: env.subject ?? '(no subject)',
        date: (() => { const d = env.date ? new Date(env.date as any) : new Date(); return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(); })(),
        size: 0,
        bodyDownloaded: false,
        body: null,
        flagged: false,
        flagReason: null,
        deleted: false,
        listUnsubscribe,
      });
    }
  } finally {
    lock.release();
    await client.logout();
  }

  return records;
}

/**
 * Fetch full email (headers + body) for a single UID.
 */
export async function fetchBody(
  account: AccountConfig,
  uid: string,
  mailbox = 'INBOX'
): Promise<string | null> {
  const client = new ImapFlow(buildImapOptions(account));
  await client.connect();
  const lock = await client.getMailboxLock(mailbox);
  let body: string | null = null;

  try {
    const msg = await client.fetchOne(uid, { source: true }, { uid: true }) as any;
    if (msg?.source) {
      body = (msg.source as Buffer).toString('utf8');
    }
  } finally {
    lock.release();
    await client.logout();
  }

  return body;
}

/**
 * Delete emails on the server by UID list.
 * Moves to Trash first, then expunges.
 */
export async function deleteOnServer(
  account: AccountConfig,
  uids: string[],
  mailbox = 'INBOX'
): Promise<void> {
  if (uids.length === 0) return;

  const client = new ImapFlow(buildImapOptions(account));
  await client.connect();
  const lock = await client.getMailboxLock(mailbox);

  try {
    const trashMailbox = account.type === 'gmail' ? '[Gmail]/Trash' : 'Trash';
    await client.messageMove(uids.join(','), trashMailbox, { uid: true });
  } finally {
    lock.release();
    await client.logout();
  }
}

/**
 * Move emails to the provider's Spam/Junk folder.
 * Gmail → [Gmail]/Spam   Yahoo → Bulk Mail
 */
export async function moveToSpam(
  account: AccountConfig,
  uids: string[],
  mailbox = 'INBOX'
): Promise<void> {
  if (uids.length === 0) return;
  const client = new ImapFlow(buildImapOptions(account));
  await client.connect();
  const lock = await client.getMailboxLock(mailbox);
  try {
    const spamFolder = account.type === 'gmail' ? '[Gmail]/Spam' : 'Bulk Mail';
    await client.messageMove(uids.join(','), spamFolder, { uid: true });
  } finally {
    lock.release();
    await client.logout();
  }
}

/**
 * Refresh Gmail access token using stored refresh token.
 */
export async function refreshGmailToken(account: AccountConfig): Promise<string> {
  const oauth2Client = new OAuth2Client(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: account.refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials.access_token!;
}
