import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { upsertAccount, getAccounts, getAccount } from '../db/database';

const router = Router();

// GET /api/accounts — list all saved accounts
router.get('/', (_req, res) => {
  const accounts = getAccounts().map((a) => ({
    id: a.id,
    type: a.type,
    email: a.email,
    lastSyncAt: a.lastSyncAt,
    // Never return tokens to the frontend
  }));
  res.json(accounts);
});

// POST /api/accounts — add a Yahoo account with app password
router.post('/', (req, res) => {
  const { type, email, appPassword } = req.body;
  if (!type || !email) {
    return res.status(400).json({ error: 'type and email are required' });
  }

  const id = uuidv4();
  upsertAccount({
    id,
    type,
    email,
    accessToken: null,
    refreshToken: null,
    appPassword: appPassword ?? null,
    lastSyncAt: null,
  });

  res.json({ id, type, email });
});

// DELETE /api/accounts/:id
router.delete('/:id', (req, res) => {
  const db = require('../db/database').getDb();
  db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
