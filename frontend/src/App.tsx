import { useState, useEffect, Suspense, lazy } from 'react';
import './App.css';

const Inbox    = lazy(() => import('./pages/Inbox'));
const Search   = lazy(() => import('./pages/Search'));
const Settings = lazy(() => import('./pages/Settings'));
const Help     = lazy(() => import('./pages/Help'));

type Page = 'inbox' | 'search' | 'settings' | 'help';
export type Theme = 'light' | 'dark' | 'ocean' | 'sunset' | 'forest';

export default function App() {
  const [page,  setPage]  = useState<Page>('inbox');
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('ec-theme') as Theme) ?? 'light'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? '' : theme);
    localStorage.setItem('ec-theme', theme);
  }, [theme]);

  return (
    <div className="app">
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
