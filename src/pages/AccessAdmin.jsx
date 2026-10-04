import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { livePackSummaries } from '../../config/hasib-packs';

const labels = { catalyst: 'Catalyst · Layla only', ascend: 'Ascend · Layla + Hasib' };

export default function AccessAdmin() {
  const [authorized, setAuthorized] = useState(false);
  const [packId, setPackId] = useState('');
  const [csrf, setCsrf] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('catalyst');
  const [note, setNote] = useState('');
  const [grants, setGrants] = useState([]);
  const [status, setStatus] = useState('Loading access list…');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setAuthorized(false);
    const session = await fetch('/api/auth-session', { credentials: 'same-origin', cache: 'no-store' }).then(r => r.json());
    setCsrf(session?.csrfToken || '');
    if (!session?.account) { setStatus('Sign in with the administrator account to manage access.'); return; }
    const response = await fetch('/api/access-admin', { credentials: 'same-origin', cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) { setStatus(data.reason === 'admin_required' ? 'This account cannot manage access.' : 'Could not load access grants.'); return; }
    setAuthorized(true);
    setGrants(data.grants || []);
    setStatus('Access list is up to date.');
  }, []);

  useEffect(() => { load().catch(() => setStatus('Could not load access grants.')); }, [load]);

  async function changeAccess(method, body) {
    setBusy(true);
    setStatus('Saving…');
    try {
      const response = await fetch('/api/access-admin', {
        method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if ([401, 403].includes(response.status)) setAuthorized(false);
      if (!response.ok || !data.ok) throw new Error(data.reason || 'access_unavailable');
      setEmail(''); setNote('');
      await load();
    } catch (error) {
      setStatus(error.message === 'admin_required' ? 'This account cannot manage access.' : 'Access update failed. Try again.');
    } finally { setBusy(false); }
  }

  return <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px', color: '#171923' }}>

    <p><Link to="/owner">Admin dashboard</Link></p>
    <h1>Product access</h1>
    <p>Only this account can grant or revoke access. New users can verify an email address, but receive no product access until granted.</p>
    {authorized && <><form onSubmit={event => { event.preventDefault(); changeAccess('POST', { email, plan, note, ...(plan === 'ascend' && packId ? { packId } : {}) }); }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12, maxWidth: 680 }}>
      <label>Email<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} style={inputStyle} /></label>
      <label>Product<select value={plan} onChange={event => setPlan(event.target.value)} style={inputStyle}><option value="catalyst">Catalyst</option><option value="ascend">Ascend</option></select></label>
      {plan === 'ascend' && <label>Live sector (optional)<select value={packId} onChange={event => setPackId(event.target.value)} style={inputStyle}><option value="">Keep existing sector</option>{livePackSummaries().map(pack => <option key={pack.id} value={pack.id}>{pack.en}</option>)}</select></label>}
      <label style={{ gridColumn: '1 / -1' }}>Internal note (optional)<input maxLength={200} value={note} onChange={event => setNote(event.target.value)} style={inputStyle} /></label>
      <button disabled={busy || !csrf} type="submit" style={buttonStyle}>Grant access</button>
    </form>
    <h2>Active grants</h2>
    {grants.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}><thead><tr><th style={cellStyle}>Email</th><th style={cellStyle}>Access</th><th style={cellStyle}>Granted</th><th style={cellStyle}>Note</th><th style={cellStyle}>Action</th></tr></thead><tbody>{grants.map(grant => <tr key={grant.email}><td style={cellStyle}>{grant.email}</td><td style={cellStyle}>{labels[grant.plan] || grant.plan}</td><td style={cellStyle}>{new Date(grant.grantedAt).toLocaleDateString()}</td><td style={cellStyle}>{grant.note}</td><td style={cellStyle}><button disabled={busy} type="button" onClick={() => changeAccess('DELETE', { email: grant.email })}>Revoke</button></td></tr>)}</tbody></table></div> : <p>No active access grants.</p>}</>}
    <p role="status" aria-live="polite">{status}</p>
    {!authorized && <Link to="/signin">Sign in</Link>}
  </main>;
}

const inputStyle = { display: 'block', boxSizing: 'border-box', width: '100%', marginTop: 6, padding: '12px 14px', border: '1px solid #a5a8b2', borderRadius: 8, font: 'inherit' };
const buttonStyle = { padding: '12px 18px', border: 0, borderRadius: 8, color: '#fff', background: '#25283a', font: 'inherit', fontWeight: 700, cursor: 'pointer' };
const cellStyle = { padding: '12px 8px', borderBottom: '1px solid #ddd' };
