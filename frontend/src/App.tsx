import { useState, useEffect, Suspense, lazy } from 'react';
import './App.css';

const Inbox    = lazy(() => import('./pages/Inbox'));
const Search   = lazy(() => import('./pages/Search'));
const Settings = lazy(() => import('./pages/Settings'));
const Help     = lazy(() => import('./pages/Help'));

type Page = 'inbox' | 'search' | 'settings' | 'help';
export type Theme = 'light' | 'dark' | 'ocean' | 'sunset' | 'forest';

const APP_VERSION = '1.1';
const RELEASES_API = 'https://api.github.com/repos/onezmo65-code/email-cleaner/releases/latest';
const RELEASES_URL = 'https://github.com/onezmo65-code/email-cleaner/releases/latest';

function newerThan(latest: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const [la, lb] = parse(latest);
  const [ca, cb] = parse(current);
  return la > ca || (la === ca && lb > cb);
}

export default function App() {
  const [page,           setPage]           = useState<Page>('inbox');
  const [theme,          setTheme]          = useState<Theme>(() =>
    (localStorage.getItem('ec-theme') as Theme) ?? 'light'
  );
  const [updateVersion,  setUpdateVersion]  = useState<string | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? '' : theme);
    localStorage.setItem('ec-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (sessionStorage.getItem('ec-update-checked')) return;
    sessionStorage.setItem('ec-update-checked', '1');
    fetch(RELEASES_API)
      .then(r => r.json())
      .then(data => {
        const tag = (data.tag_name ?? '').replace(/^v/, '');
        if (tag && newerThan(tag, APP_VERSION)) setUpdateVersion(tag);
      })
      .catch(() => {});
  }, []);

  const showBanner = updateVersion && !updateDismissed;

  return (
    <div className="app">
      {showBanner && (
        <div className="update-banner">
          <span>✨ Email Cleaner v{updateVersion} is available —</span>
          <a href={RELEASES_URL} target="_blank" rel="noreferrer">Download update</a>
          <button className="update-dismiss" onClick={() => setUpdateDismissed(true)} aria-label="Dismiss">✕</button>
        </div>
      )}
      <nav className="nav">
        <span className="nav-title">📧 Email Cleaner</span>
        <div className="nav-links">
          <button className={page === 'inbox'    ? 'active' : ''} onClick={() => setPage('inbox')}>Inbox</button>
          <button className={page === 'search'   ? 'active' : ''} onClick={() => setPage('search')}>Search</button>
          <button className={page === 'settings' ? 'active' : ''} onClick={() => setPage('settings')}>Settings</button>
          <button className={page === 'help'     ? 'active' : ''} onClick={() => setPage('help')}>Help</button>
        </div>
      </nav>
      <main className="main">
        <Suspense fallback={<div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div>}>
          {page === 'inbox'    && <Inbox />}
          {page === 'search'   && <Search />}
          {page === 'settings' && <Settings theme={theme} onThemeChange={setTheme} />}
          {page === 'help'     && <Help />}
        </Suspense>
      </main>
    </div>
  );
}
