import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import { upsertAccount, getAccounts } from '../db/database';

const router = Router();

router.get('/gmail', (_req, res) => {
  const client = new OAuth2Client(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );

  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://mail.google.com/', 'email', 'profile'],
  });

  res.redirect(url);
});

router.get('/gmail/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');

  try {
    const client = new OAuth2Client(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    const { tokens } = await client.getToken(String(code));
    client.setCredentials(tokens);

    // Use userinfo endpoint — more reliable than verifyIdToken
    const userInfoRes = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo`,
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const userInfo = await userInfoRes.json() as { email?: string };
    const email = userInfo.email ?? 'unknown@gmail.com';

    // Avoid duplicate accounts for the same email
    const existing = getAccounts().find(a => a.email === email);
    upsertAccount({
      id: existing?.id ?? uuidv4(),
      type: 'gmail',
      email,
      accessToken: tokens.access_token ?? null,
      refreshToken: tokens.refresh_token ?? null,
      appPassword: null,
      lastSyncAt: null,
    });

    res.redirect('http://localhost:5173/settings?auth=success');
  } catch (err) {
    console.error('Gmail OAuth error:', err);
    res.redirect(`http://localhost:5173/settings?auth=error&msg=${encodeURIComponent(String(err))}`);
  }
});

export default router;
