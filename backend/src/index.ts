import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db/database';
import emailRoutes from './routes/email';
import accountRoutes from './routes/accounts';
import authRoutes from './routes/auth';
import whitelistRoutes from './routes/whitelist';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' })); // Vite dev server
app.use(express.json());

// Initialize SQLite database on startup
initDatabase();

// Routes
app.use('/api/email', emailRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/auth', authRoutes);
app.use('/api/whitelist', whitelistRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Email Cleaner backend running on http://localhost:${PORT}`);
});
