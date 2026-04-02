export default function Help() {
  return (
    <div>
      <h1 style={{ marginBottom: '1rem', fontSize: '1.3rem' }}>Help &amp; Setup Guide</h1>

      {/* Yahoo */}
      <div className="card">
        <h2>Yahoo Mail — App Password Setup</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Yahoo requires an <strong>App Password</strong> (not your regular password). This is a 16-character code you generate once.
        </p>
        <ol style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: '2', color: 'var(--text)' }}>
          <li>Go to <strong>Yahoo Mail</strong> → click your profile icon (top right) → <strong>Manage your account</strong></li>
          <li>Click <strong>Security</strong> in the left menu</li>
          <li>Scroll to <strong>Generate app password</strong> (you may need to enable 2-Step Verification first)</li>
          <li>Under "Select your app" choose <strong>Other app</strong> — type <em>Email Cleaner</em></li>
          <li>Click <strong>Generate</strong> — copy the 16-character code (e.g. <code>abcd efgh ijkl mnop</code>)</li>
          <li>In Email Cleaner → <strong>Settings</strong> → <em>Add Yahoo Account</em>: enter your Yahoo email and paste the code</li>
          <li>Click <strong>Add Yahoo Account</strong> — then go to <strong>Inbox</strong> and click <strong>Sync Now</strong></li>
        </ol>
        <div className="help-note">
          If you don't see "Generate app password", first enable <strong>2-Step Verification</strong> in the same Security page, then it will appear.
        </div>
      </div>

      {/* Gmail */}
      <div className="card">
        <h2>Gmail — OAuth Setup (one-time)</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Gmail uses Google's secure OAuth login. You need a free Google Cloud Console project (takes ~5 minutes, no credit card).
        </p>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text)' }}>Step A — Create a Google Cloud project</h3>
        <ol style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: '2', color: 'var(--text)', marginBottom: '1rem' }}>
          <li>Go to <strong>console.cloud.google.com</strong> → sign in with your Google account</li>
          <li>Click <strong>Select a project</strong> (top bar) → <strong>New Project</strong> → name it <em>Email Cleaner</em> → <strong>Create</strong></li>
          <li>In the left menu: <strong>APIs &amp; Services</strong> → <strong>Library</strong> → search <em>Gmail API</em> → click it → <strong>Enable</strong></li>
          <li>Go to <strong>APIs &amp; Services</strong> → <strong>OAuth consent screen</strong></li>
          <li>Choose <strong>External</strong> → click <strong>Create</strong></li>
          <li>Fill in App name (<em>Email Cleaner</em>), your email for support → click <strong>Save and Continue</strong> through all steps</li>
          <li>On the <strong>Test users</strong> step → click <strong>Add Users</strong> → add your Gmail address → Save</li>
        </ol>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text)' }}>Step B — Create OAuth credentials</h3>
        <ol style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: '2', color: 'var(--text)', marginBottom: '1rem' }}>
          <li>Go to <strong>APIs &amp; Services</strong> → <strong>Credentials</strong> → <strong>Create Credentials</strong> → <strong>OAuth client ID</strong></li>
          <li>Application type: <strong>Web application</strong></li>
          <li>Under <em>Authorized redirect URIs</em> → Add: <code>http://localhost:3001/auth/gmail/callback</code></li>
          <li>Click <strong>Create</strong> → then click <strong>Download JSON</strong></li>
          <li>Rename the downloaded file to <code>credentials.json</code> and place it in the <code>backend/</code> folder of Email Cleaner</li>
        </ol>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text)' }}>Step C — Connect in Email Cleaner</h3>
        <ol style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: '2', color: 'var(--text)' }}>
          <li>Go to <strong>Settings</strong> → click <strong>Connect Gmail</strong></li>
          <li>A browser window opens Google's login — sign in and check the <strong>Gmail</strong> checkbox when asked for permissions</li>
          <li>You'll be redirected back to Settings with "Gmail connected successfully"</li>
          <li>Go to <strong>Inbox</strong>, select your Gmail account, click <strong>Sync Now</strong></li>
        </ol>
        <div className="help-note">
          If you see "Access blocked" or "invalid_client": open <code>credentials.json</code> in the backend folder and confirm the file was freshly downloaded (not edited). Re-authorize in an incognito window to avoid cached sessions.
        </div>
      </div>

      {/* Using the app */}
      <div className="card">
        <h2>Using the Inbox</h2>
        <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['Sync Now', 'Fetches latest emails from your mail server and flags suspicious ones'],
              ['Grouped view', 'Groups emails by sender — shows how many emails each sender has sent'],
              ['Flat view', 'Lists all emails individually, newest first'],
              ['Sort: Count', 'Sort senders by how many emails they sent (highest first)'],
              ['Freq. Threshold', 'How many emails from one sender = suspicious. Default 10. Lower = stricter.'],
              ['Batch Size', 'How many emails to fetch per sync. Use 5,000–10,000 to process large inboxes faster.'],
              ['Exclude button', 'Whitelist a sender — they will no longer appear in flagged results'],
              ['Report Spam', 'Moves selected emails to your Spam/Junk folder on the server'],
              ['Unsubscribe badge', 'Green badge = email has an unsubscribe link. Click to auto-unsubscribe.'],
              ['CSV Export', 'Downloads all flagged senders as a spreadsheet'],
            ].map(([action, desc]) => (
              <tr key={action} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '0.5rem 0.75rem 0.5rem 0', fontWeight: 600, whiteSpace: 'nowrap', width: 160 }}>{action}</td>
                <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reason badges */}
      <div className="card">
        <h2>What do the Reason badges mean?</h2>
        <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['Bulk', 'badge-orange', 'Sender has exceeded the frequency threshold (e.g. 10+ emails)'],
              ['🚫 Blocklist', 'badge-red', "Sender's IP or domain is on a public spam blocklist (DNSBL)"],
              ['⚠ Spam?', 'badge-orange', 'Subject line matched a known spam keyword pattern'],
              ['Domain', 'badge-blue', 'Matched by domain during a domain search'],
              ['Exact', 'badge-gray', 'Matched the exact email address you searched for'],
            ].map(([label, cls, desc]) => (
              <tr key={String(label)} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '0.5rem 0.75rem 0.5rem 0', whiteSpace: 'nowrap', width: 130 }}>
                  <span className={`badge ${cls}`}>{label}</span>
                </td>
                <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Troubleshooting */}
      <div className="card">
        <h2>Troubleshooting</h2>
        <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['NetworkError / backend down', 'Open a terminal, navigate to the backend folder, run: npm run dev — wait for "Server running on port 3001"'],
              ['Gmail auth failed', 'Delete credentials.json, download a fresh one from Google Cloud Console, re-run the OAuth flow in an incognito window'],
              ['Yahoo IMAP error', 'The app password may have expired. Generate a new one in Yahoo Security Settings and update it in Settings'],
              ['Emails not showing after sync', 'Try a higher Batch Size (10,000) and click Sync Now again. Previously synced emails remain in the database.'],
              ['"No accounts added yet"', 'Backend is not running. Start it with npm run dev in the backend folder.'],
            ].map(([problem, solution]) => (
              <tr key={String(problem)} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '0.5rem 0.75rem 0.5rem 0', fontWeight: 600, color: 'var(--danger)', whiteSpace: 'nowrap', verticalAlign: 'top', width: 220 }}>{problem}</td>
                <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>{solution}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
