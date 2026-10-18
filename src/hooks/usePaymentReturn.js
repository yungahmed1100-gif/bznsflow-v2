import { useEffect, useState } from 'react';

const ATTEMPTS = 6, INTERVAL_MS = 2500;

// Back from Paymob (?payment=return&plan=…): the callback may land a moment after the customer does,
// so re-read the session a few times until the plan bought shows. `plan` only says what to wait for. Paymob's query parameters are never
// trusted here; only the server's session decides what the page says.
//
// @returns {{ status: 'none'|'checking'|'active'|'pending', plan: string|null, account: object|null }}
export function usePaymentReturn() {
  const [state, setState] = useState({ status: 'none', plan: null, account: null });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'return') return undefined;
    const plan = params.get('plan') === 'ascend' ? 'ascend' : 'catalyst';
    window.history.replaceState(null, '', window.location.pathname);
    document.getElementById('tiers')?.scrollIntoView();
    setState({ status: 'checking', plan, account: null });
    let cancelled = false, timer = null;
    const check = async attempt => {
      let account = null;
      try {
        const res = await fetch('/api/auth-session', { credentials: 'same-origin', cache: 'no-store' });
        if (res.ok) account = (await res.json())?.account || null;
      } catch { /* offline for a moment: the next attempt asks again */ }
      if (cancelled) return;
      if (account?.accessPlan === plan) return setState({ status: 'active', plan, account });
      if (attempt + 1 >= ATTEMPTS) return setState({ status: 'pending', plan, account });
      timer = setTimeout(() => check(attempt + 1), INTERVAL_MS);
    };
    check(0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  return state;
}
