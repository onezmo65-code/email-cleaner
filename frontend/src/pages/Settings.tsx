import { useState, useEffect } from 'react';
import { getAccounts, addYahooAccount, deleteAccount, getWhitelist, removeWhitelistEntry } from '../api';
import type { Account, WhitelistEntry } from '../api';
import type { Theme } from '../App';

const THEMES: { id: Theme; label: string; bg: string; accent: string }[] = [
  { id: 'light',  label: 'Light',  bg: '#ffffff', accent: '#4f46e5' },
  { id: 'dark',   label: 'Dark',   bg: '#1e293b', accent: '#818cf8' },
  { id: 'ocean',  label: 'Ocean',  bg: '#e0f2fe', accent: '#0284c7' },
  { id: 'sunset', label: 'Sunset', bg: '#ffedd5', accent: '#ea580c' },
  { id: 'forest', label: 'Forest', bg: '#dcfce7', accent: '#16a34a' },
];

export default function Settings({ theme, onThemeChange }: { theme: Theme; onThemeChange: (t: Theme) => void }) {
  const [accounts, setAccounts]   = useState<Account[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [yahooEmail, setYahooEmail] = useState('');
  const [yahooPass, setYahooPass]   = useState('');
  const [status, setStatus] = useState<{ type: 'info' | 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    if (auth === 'success') { setStatus({ type: 'success', msg: 'Gmail connected successfully.' }); load(); }
    if (auth === 'error')   { setStatus({ type: 'error',   msg: `Gmail auth failed: ${params.get('msg') ?? 'unknown error'}` }); }
  }, []);

  async function load() {
    try {
      const [acc, wl] = await Promise.all([getAccounts(), getWhitelist()]);
      setAccounts(acc);
      setWhitelist(wl);
    } catch {}
  }

  async function handleAddYahoo(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ type: 'info', msg: 'Adding account...' });
    try {
      await addYahooAccount(yahooEmail, yahooPass);
      setYahooEmail(''); setYahooPass('');
      await load();
      setStatus({ type: 'success', msg: 'Yahoo account added.' });
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    }
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Remove ${email}?`)) return;
    await deleteAccount(id);
    await load();
  }

  async function handleRemoveWhitelist(id: string, pattern: string) {
    if (!confirm(`Remove "${pattern}" from whitelist? It may reappear in flagged results.`)) return;
    await removeWhitelistEntry(id);
    await load();
  }

  return (
    <div>
      <h1 style={{ marginBottom: '1rem', fontSize: '1.3rem' }}>Settings</h1>

      {status && <div className={`status-bar ${status.type}`}>{status.msg}</div>}

      {/* Connected accounts */}
      <div className="card">
        <h2>Connected Accounts</h2>
        {accounts.length === 0 && <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No accounts added yet.</p>}
        {accounts.map((a) => (
          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <span className={`badge ${a.type === 'gmail' ? 'badge-red' : 'badge-blue'}`} style={{ marginRight: '0.5rem' }}>{a.type}</span>
              <span style={{ fontSize: '0.875rem' }}>{a.email}</span>
              {a.lastSyncAt && <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: '#9ca3af' }}>Last sync: {new Date(a.lastSyncAt).toLocaleString()}</span>}
            </div>
            <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => handleDelete(a.id, a.email)}>Remove</button>
          </div>
        ))}
      </div>

      {/* Add Gmail */}
      <div className="card">
        <h2>Add Gmail Account (OAuth)</h2>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
          Requires a free Google Cloud Console project. Click below to start the OAuth login flow.
        </p>
        <a href="http://localhost:3001/auth/gmail" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
          Connect Gmail
        </a>
        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#9ca3af' }}>
          Need setup help? See <strong>OAUTH_SETUP.md</strong> in the project root.
        </p>
      </div>

      {/* Theme picker */}
      <div className="card">
        <h2>Appearance — Color Theme</h2>
        <div className="theme-grid">
          {THEMES.map((t) => (
            <div
              key={t.id}
              className={`theme-swatch${theme === t.id ? ' active' : ''}`}
              onClick={() => onThemeChange(t.id)}
              title={t.label}
            >
              <div
                className="swatch-dot"
                style={{ background: `linear-gradient(135deg, ${t.bg} 50%, ${t.accent} 50%)` }}
              />
              {t.label}
            </div>
          ))}
        </div>
      </div>

      {/* Whitelist */}
      <div className="card">
        <h2>Whitelist — Excluded from Flagged Results</h2>
        {whitelist.length === 0 && (
          <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
            No entries yet. Click <strong>Exclude</strong> on any email in the Inbox to add one.
          </p>
        )}
        {whitelist.map((w) => (
          <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={`badge ${w.patternType === 'domain' ? 'badge-blue' : 'badge-gray'}`}>
                {w.patternType === 'domain' ? 'domain' : 'email'}
              </span>
              <span style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
                {w.patternType === 'domain' ? `*@${w.pattern}` : w.pattern}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                added {new Date(w.createdAt).toLocaleDateString()}
              </span>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: '0.78rem', color: '#dc2626' }} onClick={() => handleRemoveWhitelist(w.id, w.pattern)}>
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Add Yahoo */}
      <div className="card">
        <h2>Add Yahoo Account (App Password)</h2>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
          Generate an App Password at <strong>Yahoo Security Settings</strong> — no developer account needed.
          <br /><em>Yahoo → Account Security → Generate app password → Select "Other app"</em>
        </p>
        <form onSubmit={handleAddYahoo} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 400 }}>
          <div>
            <label>Yahoo Email Address</label>
            <input type="email" value={yahooEmail} onChange={(e) => setYahooEmail(e.target.value)} placeholder="you@yahoo.com" required />
          </div>
          <div>
            <label>App Password (16-character code from Yahoo)</label>
            <input type="password" value={yahooPass} onChange={(e) => setYahooPass(e.target.value)} placeholder="xxxx xxxx xxxx xxxx" required />
          </div>
          <div>
            <button type="submit" className="btn btn-primary">Add Yahoo Account</button>
          </div>
        </form>
      </div>
    </div>
  );
}
