import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { addToWhitelist, getWhitelist, removeFromWhitelist } from '../db/database';

const router = Router();

// GET /api/whitelist
router.get('/', (_req, res) => {
  res.json(getWhitelist());
});

// POST /api/whitelist — add email or domain
router.post('/', (req, res) => {
  const { pattern, patternType, note } = req.body;
  if (!pattern || !patternType) {
    return res.status(400).json({ error: 'pattern and patternType required' });
  }
  const entry = {
    id: uuidv4(),
    pattern: pattern.toLowerCase().trim(),
    patternType,
    note: note ?? null,
    createdAt: new Date().toISOString(),
  };
  try {
    addToWhitelist(entry);
    res.json(entry);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/whitelist/:id
router.delete('/:id', (req, res) => {
  removeFromWhitelist(req.params.id);
  res.json({ ok: true });
});

export default router;
