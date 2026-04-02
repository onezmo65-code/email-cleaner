import { Router } from 'express';
import { getAccount, getFlaggedEmails, getDb, markDeleted } from '../db/database';
import { syncAccount, pushDeletions } from '../services/syncService';
import { moveToSpam } from '../services/imapService';
import { applyDomainFilter } from '../services/filterEngine';
import { AccountConfig } from '../services/imapService';
import { EmailRecord } from '../db/models';

const router = Router();

function toAccountConfig(a: ReturnType<typeof getAccount>): AccountConfig {
  return {
    id: a!.id,
    type: a!.type,
    email: a!.email,
    accessToken: a!.accessToken ?? undefined,
    refreshToken: a!.refreshToken ?? undefined,
    appPassword: a!.appPassword ?? undefined,
  };
}

// POST /api/email/sync — run sync for an account
router.post('/sync', async (req, res) => {
  const { accountId, mode = 'headers-only', runDnsbl = false, searchAddress, frequencyThreshold = 10, batchSize } = req.body;

  const account = getAccount(accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  try {
    const result = await syncAccount(toAccountConfig(account), {
      mode,
      runDnsbl,
      searchAddress,
      frequencyThreshold,
      limit: batchSize,
    });
    res.json(result);
  } catch (err: any) {
    console.error('Sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email/flagged?accountId=xxx — list flagged emails
router.get('/flagged', (req, res) => {
  const { accountId } = req.query;
  if (!accountId) return res.status(400).json({ error: 'accountId required' });
  res.json(getFlaggedEmails(String(accountId)));
});

// GET /api/email/all?accountId=xxx&page=1&limit=100 — paginated inbox
router.get('/all', (req, res) => {
  const { accountId, page = '1', limit = '100' } = req.query;
  if (!accountId) return res.status(400).json({ error: 'accountId required' });

  const offset = (Number(page) - 1) * Number(limit);
  const emails = getDb()
    .prepare('SELECT * FROM emails WHERE accountId = ? AND deleted = 0 ORDER BY date DESC LIMIT ? OFFSET ?')
    .all(String(accountId), Number(limit), offset) as EmailRecord[];

  const total = (getDb().prepare('SELECT COUNT(*) as cnt FROM emails WHERE accountId = ? AND deleted = 0').get(String(accountId)) as any).cnt;

  res.json({ emails, total, page: Number(page), limit: Number(limit) });
});

// POST /api/email/search — search by address/domain
router.post('/search', (req, res) => {
  const { accountId, address } = req.body;
  if (!accountId || !address) return res.status(400).json({ error: 'accountId and address required' });

  const domain = address.split('@')[1]?.toLowerCase();
  if (!domain) return res.status(400).json({ error: 'Invalid email address' });

  const emails = getDb()
    .prepare("SELECT * FROM emails WHERE accountId = ? AND fromAddress LIKE ? AND deleted = 0 ORDER BY date DESC")
    .all(String(accountId), `%@${domain}`) as EmailRecord[];

  // Tag each with exact-match or domain-match
  const results = applyDomainFilter(emails, address);
  const tagged = emails.map((e) => ({
    ...e,
    matchType: results.find((r) => r.uid === e.uid)?.reason ?? null,
  }));

  res.json({ emails: tagged, domain, count: tagged.length });
});

// POST /api/email/delete — confirm deletion (pushes to server)
router.post('/delete', async (req, res) => {
  const { accountId, uids } = req.body;
  if (!accountId || !Array.isArray(uids) || uids.length === 0) {
    return res.status(400).json({ error: 'accountId and uids[] required' });
  }

  const account = getAccount(accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  try {
    await pushDeletions(toAccountConfig(account), uids);
    res.json({ deleted: uids.length });
  } catch (err: any) {
    console.error('Delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/report-spam — move emails to provider Spam/Junk folder
router.post('/report-spam', async (req, res) => {
  const { accountId, uids } = req.body;
  if (!accountId || !Array.isArray(uids) || uids.length === 0) {
    return res.status(400).json({ error: 'accountId and uids[] required' });
  }
  const account = getAccount(accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  try {
    await moveToSpam(toAccountConfig(account), uids);
    markDeleted(uids, account.id);   // hide from local list too
    res.json({ reported: uids.length });
  } catch (err: any) {
    console.error('Report spam error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/unsubscribe — call the List-Unsubscribe URL on behalf of user
router.post('/unsubscribe', async (req, res) => {
  const { listUnsubscribe } = req.body;
  if (!listUnsubscribe) return res.status(400).json({ error: 'listUnsubscribe header value required' });

  // Parse URLs from header format: <https://...>, <mailto:...>
  const urls: string[] = [];
  const regex = /<([^>]+)>/g;
  let m;
  while ((m = regex.exec(listUnsubscribe)) !== null) urls.push(m[1]);
  // Also try bare URL if no angle brackets
  if (urls.length === 0) urls.push(listUnsubscribe.trim());

  const httpUrl   = urls.find((u) => u.startsWith('http'));
  const mailtoUrl = urls.find((u) => u.startsWith('mailto:'));

  if (httpUrl) {
    try {
      const resp = await fetch(httpUrl, { redirect: 'follow', signal: AbortSignal.timeout(10000) });
      return res.json({ ok: true, method: 'http', url: httpUrl, status: resp.status });
    } catch (err: any) {
      return res.status(500).json({ error: `Unsubscribe request failed: ${err.message}`, url: httpUrl });
    }
  }

  if (mailtoUrl) {
    // Can't send email automatically without SMTP — return the mailto so frontend can open it
    return res.json({ ok: false, method: 'mailto', url: mailtoUrl });
  }

  res.status(400).json({ error: 'No valid URL found in List-Unsubscribe header' });
});

export default router;
