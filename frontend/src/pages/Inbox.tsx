import { useState, useEffect, useMemo, Fragment } from 'react';
import { getAccounts, getFlaggedEmails, syncAccount, deleteEmails, addWhitelistEntry, callUnsubscribe, reportSpam } from '../api';
import type { Account, EmailRecord } from '../api';

type SortField = 'date' | 'domain' | 'count' | 'sender';
type SortDir   = 'asc' | 'desc';
type ViewMode  = 'grouped' | 'flat';

const PAGE_SIZE_OPTIONS = [100, 500, 1000, 2500, 5000, 10000];

interface SenderGroup {
  addr:    string;
  name:    string;
  domain:  string;
  emails:  EmailRecord[];
  minDate: string;
  maxDate: string;
  reasons: string[];
  hasUnsub: boolean;
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCsv(emails: EmailRecord[], counts: Record<string, number>) {
  const headers = ['From Name', 'From Address', 'Domain', 'Subject', 'Date', 'Reason', 'Count', 'Has Unsubscribe'];
  const rows = emails.map((e) => [
    e.fromName,
    e.fromAddress,
    e.fromAddress.split('@')[1] ?? '',
    e.subject,
    new Date(e.date).toLocaleDateString(),
    e.flagReason ?? '',
    String(counts[e.fromAddress] ?? 1),
    e.listUnsubscribe ? 'Yes' : 'No',
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `flagged-emails-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Inbox() {
  const [accounts, setAccounts]               = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [syncMode, setSyncMode]               = useState<'headers-only' | 'full-download' | 'server-side'>('headers-only');
  const [runDnsbl, setRunDnsbl]               = useState(false);
  const [freqThreshold, setFreqThreshold]     = useState(10);
  const [batchSize, setBatchSize]             = useState(5000);
  const [emails, setEmails]                   = useState<EmailRecord[]>([]);
  const [selected, setSelected]               = useState<Set<string>>(new Set());
  const [status, setStatus]                   = useState<{ type: 'info' | 'success' | 'error'; msg: string } | null>(null);
  const [syncing, setSyncing]                 = useState(false);
  const [deleting, setDeleting]               = useState(false);
  const [reporting, setReporting]             = useState(false);
  const [search, setSearch]                   = useState('');
  const [sortField, setSortField]             = useState<SortField>('count');
  const [sortDir, setSortDir]                 = useState<SortDir>('desc');
  const [viewMode, setViewMode]               = useState<ViewMode>('grouped');
  const [pageSize, setPageSize]               = useState(100);
  const [page, setPage]                       = useState(1);
  const [expandedGroups, setExpandedGroups]   = useState<Set<string>>(new Set());
  const [excludeKey, setExcludeKey]           = useState<string | null>(null);  // uid (flat) or addr (grouped)
  const [unsubStatus, setUnsubStatus]         = useState<Record<string, 'pending' | 'done' | 'mailto' | 'error'>>({});
  const [sessionHidden, setSessionHidden]     = useState<Set<string>>(new Set()); // addresses hidden this session only

  // Sender counts across entire loaded list
  const senderCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of emails) c[e.fromAddress] = (c[e.fromAddress] ?? 0) + 1;
    return c;
  }, [emails]);

  // Search filter + session-hidden filter
  const filtered = useMemo(() => {
    let list = emails.filter((e) => !sessionHidden.has(e.fromAddress));
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (e) =>
        e.fromAddress.toLowerCase().includes(q) ||
        e.fromName.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q)
    );
  }, [emails, search, sessionHidden]);

  // Build sender groups from filtered emails
  const senderGroups = useMemo<SenderGroup[]>(() => {
    const map = new Map<string, SenderGroup>();
    for (const e of filtered) {
      if (!map.has(e.fromAddress)) {
        map.set(e.fromAddress, {
          addr:     e.fromAddress,
          name:     e.fromName || e.fromAddress,
          domain:   e.fromAddress.split('@')[1] ?? '',
          emails:   [],
          minDate:  e.date,
          maxDate:  e.date,
          reasons:  [],
          hasUnsub: false,
        });
      }
      const g = map.get(e.fromAddress)!;
      g.emails.push(e);
      if (e.date < g.minDate) g.minDate = e.date;
      if (e.date > g.maxDate) g.maxDate = e.date;
      if (e.flagReason && !g.reasons.includes(e.flagReason.split(':')[0])) g.reasons.push(e.flagReason.split(':')[0]);
      if (e.listUnsubscribe) g.hasUnsub = true;
    }
    return [...map.values()];
  }, [filtered]);

  // Sort groups
  const sortedGroups = useMemo<SenderGroup[]>(() => {
    const arr = [...senderGroups];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      if (sortField === 'count')  return dir * (a.emails.length - b.emails.length);
      if (sortField === 'domain') return dir * a.domain.localeCompare(b.domain);
      if (sortField === 'sender') return dir * a.addr.localeCompare(b.addr);
      if (sortField === 'date')   return dir * (a.maxDate.localeCompare(b.maxDate));
      return 0;
    });
    return arr;
  }, [senderGroups, sortField, sortDir]);

  // Sort flat emails
  const sortedFlat = useMemo<EmailRecord[]>(() => {
    const arr = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      if (sortField === 'date')   return dir * (a.date.localeCompare(b.date));
      if (sortField === 'domain') return dir * ((a.fromAddress.split('@')[1] ?? '').localeCompare(b.fromAddress.split('@')[1] ?? ''));
      if (sortField === 'count')  return dir * ((senderCounts[a.fromAddress] ?? 0) - (senderCounts[b.fromAddress] ?? 0));
      if (sortField === 'sender') return dir * a.fromAddress.localeCompare(b.fromAddress);
      return 0;
    });
    return arr;
  }, [filtered, sortField, sortDir, senderCounts]);

  // Pagination
  const isGrouped     = viewMode === 'grouped';
  const totalItems    = isGrouped ? sortedGroups.length : sortedFlat.length;
  const totalPages    = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageGroups    = useMemo(() => sortedGroups.slice((page - 1) * pageSize, page * pageSize), [sortedGroups, page, pageSize]);
  const pageFlat      = useMemo(() => sortedFlat.slice((page - 1) * pageSize, page * pageSize),   [sortedFlat,   page, pageSize]);
  const allFiltered   = filtered.length > 0 && filtered.every((e) => selected.has(e.uid));

  useEffect(() => {
    getAccounts().then((acc) => {
      setAccounts(acc);
      if (acc.length > 0) setSelectedAccount(acc[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => { if (selectedAccount) loadFlagged(); }, [selectedAccount]);
  useEffect(() => { setPage(1); },                        [search, sortField, sortDir, viewMode, pageSize]);

  async function loadFlagged() {
    try {
      const flagged = await getFlaggedEmails(selectedAccount);
      setEmails(flagged);
      setSelected(new Set());
      setExcludeKey(null);
      setExpandedGroups(new Set());
    } catch {}
  }

  async function handleSync() {
    if (!selectedAccount) return;
    setSyncing(true);
    setStatus({ type: 'info', msg: 'Syncing… this may take a moment.' });
    try {
      const res = await syncAccount({ accountId: selectedAccount, mode: syncMode, runDnsbl, frequencyThreshold: freqThreshold, batchSize });
      setStatus({ type: 'success', msg: `Sync complete. Fetched ${res.fetched} emails, ${res.flagged} flagged.` });
      await loadFlagged();
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSyncing(false);
    }
  }

  async function handleReportSpam() {
    if (selected.size === 0) return;
    if (!confirm(`Move ${selected.size} email(s) to Spam/Junk on the server?`)) return;
    setReporting(true);
    try {
      const res = await reportSpam(selectedAccount, [...selected]);
      setStatus({ type: 'success', msg: `${res.reported} email(s) moved to Spam folder.` });
      await loadFlagged();
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setReporting(false);
    }
  }

  async function handleDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Permanently delete ${selected.size} email(s) from server?`)) return;
    setDeleting(true);
    try {
      const res = await deleteEmails(selectedAccount, [...selected]);
      setStatus({ type: 'success', msg: `Deleted ${res.deleted} email(s) from server.` });
      await loadFlagged();
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setDeleting(false);
    }
  }

  function toggleSelect(uid: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(uid) ? n.delete(uid) : n.add(uid); return n; });
  }

  function toggleGroup(addr: string, groupEmails: EmailRecord[]) {
    const uids = groupEmails.map((e) => e.uid);
    const allIn = uids.every((uid) => selected.has(uid));
    setSelected((prev) => {
      const n = new Set(prev);
      allIn ? uids.forEach((uid) => n.delete(uid)) : uids.forEach((uid) => n.add(uid));
      return n;
    });
  }

  function toggleAll() {
    if (allFiltered) setSelected(new Set());
    else             setSelected(new Set(filtered.map((e) => e.uid)));
  }

  function toggleExpand(addr: string) {
    setExpandedGroups((prev) => { const n = new Set(prev); n.has(addr) ? n.delete(addr) : n.add(addr); return n; });
  }

  async function handleExclude(type: 'email' | 'domain', pattern: string) {
    try {
      await addWhitelistEntry(pattern, type);
      setExcludeKey(null);
      setStatus({ type: 'success', msg: `"${pattern}" added to whitelist.` });
      await loadFlagged();
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    }
  }

  function handleExcludeSession(addr: string, domain: string, scope: 'email' | 'domain') {
    setSessionHidden((prev) => {
      const n = new Set(prev);
      if (scope === 'domain') {
        // hide all addresses sharing this domain
        emails.filter((e) => e.fromAddress.endsWith('@' + domain)).forEach((e) => n.add(e.fromAddress));
      } else {
        n.add(addr);
      }
      return n;
    });
    setExcludeKey(null);
    setStatus({ type: 'info', msg: `Hidden for this session. Reload or Sync to restore.` });
  }

  async function handleUnsubscribe(listUnsubscribe: string, key: string) {
    setUnsubStatus((s) => ({ ...s, [key]: 'pending' }));
    try {
      const res = await callUnsubscribe(listUnsubscribe);
      if (res.method === 'mailto') {
        window.open(res.url, '_blank');
        setUnsubStatus((s) => ({ ...s, [key]: 'mailto' }));
        setStatus({ type: 'info', msg: `Opened email client to unsubscribe. Address: ${res.url.replace('mailto:', '')}` });
      } else {
        setUnsubStatus((s) => ({ ...s, [key]: 'done' }));
        setStatus({ type: 'success', msg: `Unsubscribe request sent (HTTP ${res.status}).` });
      }
    } catch (err: any) {
      setUnsubStatus((s) => ({ ...s, [key]: 'error' }));
      setStatus({ type: 'error', msg: `Unsubscribe failed: ${err.message}` });
    }
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  }

  function SortBtn({ field, label }: { field: SortField; label: string }) {
    const active = sortField === field;
    return (
      <button
        className={`btn btn-ghost${active ? ' sort-active' : ''}`}
        style={{ padding: '0.25rem 0.6rem', fontSize: '0.76rem' }}
        onClick={() => toggleSort(field)}
      >
        {label}&nbsp;{active ? (sortDir === 'desc' ? '↓' : '↑') : <span style={{ color: '#d1d5db' }}>↕</span>}
      </button>
    );
  }

  function ReasonBadge({ reason }: { reason: string | null }) {
    if (!reason) return null;
    const r = reason.toLowerCase();
    if (r.includes('frequency')) return <span className="badge badge-orange" title="Sent more than the frequency threshold">Bulk</span>;
    if (r.includes('dnsbl'))     return <span className="badge badge-red"    title="Sender domain is on a spam blocklist">🚫 Blocklist</span>;
    if (r.includes('rule'))      return <span className="badge badge-spam"   title="Subject matched a spam keyword pattern">⚠ Spam?</span>;
    if (r.includes('domain'))    return <span className="badge badge-blue"   title="Matches a searched domain">Domain</span>;
    if (r.includes('exact'))     return <span className="badge badge-blue"   title="Exact address match">Exact</span>;
    return <span className="badge badge-gray">{reason.split(':')[0]}</span>;
  }

  function ExcludePanel({ emailAddr, domain, panelKey }: { emailAddr: string; domain: string; panelKey: string }) {
    if (excludeKey !== panelKey) return null;
    return (
      <div className="exclude-panel" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '0.78rem', minWidth: 110 }}>Exclude forever:</span>
          <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => handleExclude('email', emailAddr)}>
            📧 {emailAddr}
          </button>
          <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => handleExclude('domain', domain)}>
            🌐 All *@{domain}
          </button>
          <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Saved to whitelist · manage in Settings</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '0.78rem', minWidth: 110 }}>This session only:</span>
          <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => handleExcludeSession(emailAddr, domain, 'email')}>
            📧 {emailAddr}
          </button>
          <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => handleExcludeSession(emailAddr, domain, 'domain')}>
            🌐 All *@{domain}
          </button>
          <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Hidden until reload · not saved</span>
        </div>
      </div>
    );
  }

  // ── Shared action bar (rendered top + bottom) ───────────────────────────────
  function ActionBar({ position }: { position: 'top' | 'bottom' }) {
    return (
      <div className="select-all-bar" style={{ borderRadius: position === 'top' ? 0 : '0 0 10px 10px' }}>
        <input
          type="checkbox"
          checked={allFiltered}
          ref={(el) => { if (el) el.indeterminate = selected.size > 0 && !allFiltered; }}
          onChange={toggleAll}
          style={{ width: 'auto' }}
          title="Select / deselect all filtered emails"
        />
        <span>
          {selected.size > 0
            ? `${selected.size} emails selected`
            : isGrouped
              ? `${sortedGroups.length} senders · ${filtered.length} emails`
              : `${filtered.length} flagged`}
        </span>
        {selected.size > 0 && (
          <>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : `🗑 Delete ${selected.size}`}
            </button>
            <button className="btn btn-spam" onClick={handleReportSpam} disabled={reporting}>
              {reporting ? 'Reporting…' : `🚨 Spam ${selected.size}`}
            </button>
            <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </>
        )}
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <h1 style={{ marginBottom: '1rem', fontSize: '1.3rem' }}>Flagged Inbox</h1>

      {accounts.length === 0 && (
        <div className="status-bar info">No accounts connected. Go to <strong>Settings</strong> to add Gmail or Yahoo.</div>
      )}

      {/* Sync controls */}
      <div className="card">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 2, minWidth: 160 }}>
            <label>Account</label>
            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.email}</option>)}
            </select>
          </div>
          <div style={{ flex: 2, minWidth: 160 }}>
            <label>Sync Mode</label>
            <select value={syncMode} onChange={(e) => setSyncMode(e.target.value as any)}>
              <option value="headers-only">Headers Only (fast)</option>
              <option value="full-download">Full Download</option>
              <option value="server-side">Server-Side Only</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 90 }}>
            <label>Freq. Threshold</label>
            <input type="number" min={1} value={freqThreshold} onChange={(e) => setFreqThreshold(Number(e.target.value))} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label>Batch Size</label>
            <select value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))}>
              <option value={1000}>1,000</option>
              <option value={5000}>5,000</option>
              <option value={10000}>10,000</option>
              <option value={20000}>20,000</option>
              <option value={50000}>50,000</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', paddingBottom: '0.15rem' }}>
            <input type="checkbox" id="dnsbl" checked={runDnsbl} onChange={(e) => setRunDnsbl(e.target.checked)} style={{ width: 'auto' }} />
            <label htmlFor="dnsbl" style={{ marginBottom: 0 }}>DNSBL</label>
          </div>
          <button className="btn btn-primary" onClick={handleSync} disabled={syncing || !selectedAccount}>
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </div>

      {status && <div className={`status-bar ${status.type}`}>{status.msg}</div>}

      {/* Toolbar: search + sort + view + page size + export */}
      {emails.length > 0 && (
        <div className="card" style={{ padding: '0.65rem 1rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>

            {/* Search */}
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.85rem' }}>🔍</span>
              <input
                type="text"
                placeholder="Filter by sender, address, or subject…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); }}
                style={{ paddingLeft: '2rem' }}
              />
            </div>

            {/* Sort */}
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Sort:</span>
              <SortBtn field="count"  label="Count" />
              <SortBtn field="domain" label="Domain" />
              <SortBtn field="date"   label="Date" />
              <SortBtn field="sender" label="Sender" />
            </div>

            {/* View toggle */}
            <div className="view-toggle">
              <button className={viewMode === 'grouped' ? 'active' : ''} onClick={() => setViewMode('grouped')}>Grouped</button>
              <button className={viewMode === 'flat'    ? 'active' : ''} onClick={() => setViewMode('flat')}>Flat</button>
            </div>

            {/* Page size */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ width: 'auto', fontSize: '0.78rem' }}
              title="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}/page</option>)}
            </select>

            {/* Stats */}
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
              {isGrouped
                ? `${sortedGroups.length} senders · ${filtered.length} emails`
                : `${filtered.length} emails`}
              {filtered.length !== emails.length ? ` (of ${emails.length})` : ''}
            </span>

            {/* Export CSV */}
            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}
              onClick={() => exportCsv(filtered, senderCounts)}
              title="Export current filtered list to CSV"
            >
              ⬇ CSV
            </button>
          </div>
        </div>
      )}

      {/* Email list */}
      {(isGrouped ? sortedGroups.length > 0 : sortedFlat.length > 0) && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>

          {/* Selection bar — top */}
          <ActionBar position="top" />

          {/* ── GROUPED VIEW ── */}
          {isGrouped && (
            <table className="email-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th style={{ width: 28 }}></th>
                  <th>Sender</th>
                  <th style={{ width: 56, textAlign: 'center' }}>Emails</th>
                  <th>Reasons</th>
                  <th style={{ width: 180 }}>Date Range</th>
                  <th style={{ width: 130 }}></th>
                </tr>
              </thead>
              <tbody>
                {pageGroups.map((g) => {
                  const groupSelected  = g.emails.every((e) => selected.has(e.uid));
                  const groupPartial   = !groupSelected && g.emails.some((e) => selected.has(e.uid));
                  const expanded       = expandedGroups.has(g.addr);
                  const unsubKey       = `g:${g.addr}`;
                  const unsubState     = unsubStatus[unsubKey];
                  const isExcludeOpen  = excludeKey === `g:${g.addr}`;

                  return (
                    <Fragment key={g.addr}>
                      {/* Group header row */}
                      <tr className="group-row">
                        <td>
                          <input
                            type="checkbox"
                            checked={groupSelected}
                            ref={(el) => { if (el) el.indeterminate = groupPartial; }}
                            onChange={() => toggleGroup(g.addr, g.emails)}
                            style={{ width: 'auto' }}
                          />
                        </td>
                        <td>
                          <button className="expand-btn" onClick={() => toggleExpand(g.addr)}>
                            {expanded ? '▼' : '▶'}
                          </button>
                        </td>
                        <td>
                          <div className="sender-link" onClick={() => toggleExpand(g.addr)}>
                            {g.name !== g.addr ? g.name : g.domain}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{g.addr}</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-gray" style={{ minWidth: 32, textAlign: 'center' }}>{g.emails.length}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {g.reasons.slice(0, 3).map((r) => <ReasonBadge key={r} reason={r} />)}
                            {g.hasUnsub && <span className="badge badge-unsub" title="Has List-Unsubscribe header">Unsub</span>}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                          {new Date(g.minDate).toLocaleDateString()} – {new Date(g.maxDate).toLocaleDateString()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
                            {g.hasUnsub && (
                              <button
                                className="btn btn-ghost"
                                style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', color: unsubState === 'done' ? '#166534' : undefined }}
                                disabled={unsubState === 'pending' || unsubState === 'done'}
                                onClick={() => {
                                  const unsubEmail = g.emails.find((e) => e.listUnsubscribe);
                                  if (unsubEmail?.listUnsubscribe) handleUnsubscribe(unsubEmail.listUnsubscribe, unsubKey);
                                }}
                                title="Send unsubscribe request"
                              >
                                {unsubState === 'pending' ? '…' : unsubState === 'done' ? '✓ Done' : unsubState === 'error' ? '✗' : '🚫 Unsub'}
                              </button>
                            )}
                            <button
                              className={`btn ${isExcludeOpen ? 'btn-primary' : 'btn-ghost'}`}
                              style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                              onClick={() => setExcludeKey(isExcludeOpen ? null : `g:${g.addr}`)}
                            >
                              {isExcludeOpen ? '✕' : 'Exclude'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Exclude panel (group) */}
                      {isExcludeOpen && (
                        <tr style={{ background: '#f0fdf4' }}>
                          <td colSpan={7}>
                            <ExcludePanel emailAddr={g.addr} domain={g.domain} panelKey={`g:${g.addr}`} />
                          </td>
                        </tr>
                      )}

                      {/* Expanded individual emails */}
                      {expanded && g.emails.map((e) => {
                        const eUnsubKey  = `e:${e.uid}`;
                        const eUnsubState = unsubStatus[eUnsubKey];
                        return (
                          <tr key={e.uid} className="expanded-row">
                            <td>
                              <input type="checkbox" checked={selected.has(e.uid)} onChange={() => toggleSelect(e.uid)} style={{ width: 'auto' }} />
                            </td>
                            <td></td>
                            <td style={{ paddingLeft: '2rem', fontSize: '0.82rem', color: '#6b7280', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {e.subject}
                            </td>
                            <td></td>
                            <td><ReasonBadge reason={e.flagReason} /></td>
                            <td style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{new Date(e.date).toLocaleDateString()}</td>
                            <td>
                              {e.listUnsubscribe && (
                                <button
                                  className="btn btn-ghost"
                                  style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', color: eUnsubState === 'done' ? '#166534' : undefined }}
                                  disabled={eUnsubState === 'pending' || eUnsubState === 'done'}
                                  onClick={() => handleUnsubscribe(e.listUnsubscribe!, eUnsubKey)}
                                >
                                  {eUnsubState === 'pending' ? '…' : eUnsubState === 'done' ? '✓' : '🚫 Unsub'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* ── FLAT VIEW ── */}
          {!isGrouped && (
            <table className="email-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>From</th>
                  <th>Subject</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Date</th>
                  <th>Reason</th>
                  <th style={{ width: 54, textAlign: 'center' }}>#</th>
                  <th style={{ width: 130 }}></th>
                </tr>
              </thead>
              <tbody>
                {pageFlat.map((e) => {
                  const domain      = e.fromAddress.split('@')[1] ?? '';
                  const count       = senderCounts[e.fromAddress] ?? 1;
                  const isExcOpen   = excludeKey === e.uid;
                  const eUnsubKey   = `e:${e.uid}`;
                  const unsubState  = unsubStatus[eUnsubKey];

                  return (
                    <Fragment key={e.uid}>
                      <tr className="flagged">
                        <td><input type="checkbox" checked={selected.has(e.uid)} onChange={() => toggleSelect(e.uid)} style={{ width: 'auto' }} /></td>
                        <td>
                          <div className="sender-link" title={`Select all ${count} from ${e.fromAddress}`} onClick={() => {
                            const uids = emails.filter(x => x.fromAddress === e.fromAddress).map(x => x.uid);
                            setSelected(prev => { const n = new Set(prev); const allIn = uids.every(u => n.has(u)); allIn ? uids.forEach(u => n.delete(u)) : uids.forEach(u => n.add(u)); return n; });
                          }}>
                            {e.fromName || e.fromAddress}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{e.fromAddress}</div>
                        </td>
                        <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject}</td>
                        <td style={{ whiteSpace: 'nowrap', color: '#6b7280', fontSize: '0.82rem' }}>{new Date(e.date).toLocaleDateString()}</td>
                        <td style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                          <ReasonBadge reason={e.flagReason} />
                          {e.listUnsubscribe && <span className="badge badge-unsub" title="Has List-Unsubscribe header">Unsub</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}><span className="badge badge-gray">{count}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                            {e.listUnsubscribe && (
                              <button
                                className="btn btn-ghost"
                                style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', color: unsubState === 'done' ? '#166534' : undefined }}
                                disabled={unsubState === 'pending' || unsubState === 'done'}
                                onClick={() => handleUnsubscribe(e.listUnsubscribe!, eUnsubKey)}
                              >
                                {unsubState === 'pending' ? '…' : unsubState === 'done' ? '✓' : '🚫 Unsub'}
                              </button>
                            )}
                            <button
                              className={`btn ${isExcOpen ? 'btn-primary' : 'btn-ghost'}`}
                              style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
                              onClick={() => setExcludeKey(isExcOpen ? null : e.uid)}
                            >
                              {isExcOpen ? '✕' : 'Exclude'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExcOpen && (
                        <tr style={{ background: '#f0fdf4' }}>
                          <td colSpan={7}>
                            <ExcludePanel emailAddr={e.fromAddress} domain={domain} panelKey={e.uid} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-bar">
              <button className="btn btn-ghost" disabled={page === 1}          onClick={() => setPage(1)}>«</button>
              <button className="btn btn-ghost" disabled={page === 1}          onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
              <span>Page {page} of {totalPages} · {totalItems} {isGrouped ? 'senders' : 'emails'}</span>
              <button className="btn btn-ghost" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next ›</button>
              <button className="btn btn-ghost" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
            </div>
          )}

          {/* Selection bar — bottom */}
          <ActionBar position="bottom" />
        </div>
      )}

      {filtered.length === 0 && !syncing && selectedAccount && (
        <div className="card" style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
          {emails.length > 0
            ? <>No results for <strong>"{search}"</strong>.</>
            : <>No flagged emails. Click <strong>Sync Now</strong> to scan your inbox.</>}
        </div>
      )}
    </div>
  );
}
