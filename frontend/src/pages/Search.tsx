import { useState, useEffect } from 'react';
import { getAccounts, searchByAddress, deleteEmails } from '../api';
import type { Account, EmailRecord } from '../api';

interface SearchResult extends EmailRecord {
  matchType: string | null;
}

export default function Search() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [domain, setDomain] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<{ type: 'info' | 'success' | 'error'; msg: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getAccounts().then((acc) => {
      setAccounts(acc);
      if (acc.length > 0) setSelectedAccount(acc[0].id);
    }).catch(() => {});
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || !selectedAccount) return;
    setSearching(true);
    setStatus(null);
    try {
      const res = await searchByAddress(selectedAccount, query.trim());
      setResults(res.emails as SearchResult[]);
      setDomain(res.domain);
      setSelected(new Set());
      setStatus({ type: 'info', msg: `Found ${res.count} email(s) from *@${res.domain}` });
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSearching(false);
    }
  }

  async function handleDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Permanently delete ${selected.size} email(s) from server?`)) return;
    setDeleting(true);
    try {
      const res = await deleteEmails(selectedAccount, [...selected]);
      setStatus({ type: 'success', msg: `Deleted ${res.deleted} email(s) from server.` });
      setResults((prev) => prev.filter((e) => !selected.has(e.uid)));
      setSelected(new Set());
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setDeleting(false);
    }
  }

  function toggleSelect(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map((e) => e.uid)));
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: '1rem', fontSize: '1.3rem' }}>Address Search</h1>

      <div className="card">
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
          Search for one email address — all mail from that <strong>entire domain</strong> will be found and grouped.
          <br />Example: search <code>donotreply@capitalone.com</code> → finds all <code>*@capitalone.com</code>
        </p>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label>Account</label>
            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.email}</option>)}
            </select>
          </div>
          <div style={{ flex: 3, minWidth: 280 }}>
            <label>Email Address to Search</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="donotreply@example.com"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={searching || !selectedAccount}>
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {status && <div className={`status-bar ${status.type}`}>{status.msg}</div>}

      {results.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="select-all-bar" style={{ borderRadius: 0 }}>
            <input type="checkbox" checked={selected.size === results.length} onChange={toggleAll} style={{ width: 'auto' }} />
            <span>{selected.size > 0 ? `${selected.size} selected` : `${results.length} results for *@${domain}`}</span>
            {selected.size > 0 && (
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : `Delete ${selected.size} from Server`}
              </button>
            )}
          </div>
          <table className="email-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>From</th>
                <th>Subject</th>
                <th>Date</th>
                <th>Match</th>
              </tr>
            </thead>
            <tbody>
              {results.map((e) => (
                <tr key={e.uid} className={e.matchType === 'exact-match' ? 'flagged' : ''}>
                  <td><input type="checkbox" checked={selected.has(e.uid)} onChange={() => toggleSelect(e.uid)} style={{ width: 'auto' }} /></td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{e.fromName || e.fromAddress}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{e.fromAddress}</div>
                  </td>
                  <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject}</td>
                  <td style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>{new Date(e.date).toLocaleDateString()}</td>
                  <td>
                    {e.matchType === 'exact-match'
                      ? <span className="badge badge-red">Exact</span>
                      : <span className="badge badge-blue">Domain</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
