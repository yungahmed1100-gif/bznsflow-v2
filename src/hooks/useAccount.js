import { useEffect, useState } from 'react';

// Who is signed in, for the pages that only want to say so.
//
// Every route on this site is prerendered by vite-react-ssg, so the HTML that
// reaches the browser cannot know about the session cookie — bf_session is
// HttpOnly, which is also why no script can shortcut this by reading it. The
// only way to answer "who is this" on a static page is to ask, once, after
// hydration. Until the answer lands the caller sees `null`, which is exactly
// what the prerendered markup already rendered, so there is no mismatch.
//
// GET /api/auth-session is the whole cost: no database round trip happens for a
// visitor without a session cookie, and the response is the same shape /signin
// already consumes.

/**
 * @returns {{ id: string, email: string, name: string|null } | null} the signed-in
 *   account, or null while unknown or signed out.
 */
export function useAccount() {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch('/api/auth-session', {
          credentials: 'same-origin', // what carries bf_session
          cache: 'no-store',          // the answer is per-visitor, never shared
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.account) setAccount(data.account);
      } catch {
        // Offline, blocked, or unmounted mid-flight. Staying signed-out is the
        // right failure: the visitor still gets a working sign-in link.
      }
    })();

    return () => controller.abort();
  }, []);

  return account;
}
