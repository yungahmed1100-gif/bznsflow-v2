// A stand-in for Qwen that only quotes the business data it is given: the data line sharing the
// most meaningful words with the customer's question, else "not covered" with needs_team.
// Good enough to prove grounding end to end without a network call.
const STOP = new Set(['what', 'your', 'have', 'does', 'with', 'this', 'that', 'about', 'there', 'they', 'from', 'when', 'where', 'which', 'much', 'please', 'tell']);
const words = t => (String(t).toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || []).map(w => w.replace(/s$/, '')).filter(w => !STOP.has(w));
export function groundedModel() {
  const calls = [];
  const generate = async messages => {
    calls.push(messages);
    const system = messages[0].content;
    const question = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const data = system.split('=== BUSINESS DATA')[1] || '';
    // Each data line carries the words of the section heading above it ("## Hours" answers "opening hours").
    let heading = '';
    const lines = [];
    for (const raw of data.split('\n')) {
      const l = raw.replace(/^[-*]\s*|^A:\s*/, '').trim();
      if (/^##\s/.test(l)) { heading = l.slice(3); continue; }
      if (l && !/:$/.test(l) && !/^===|^Q:/.test(l)) lines.push([l, heading]);
    }
    const asked = new Set(words(question));
    const scored = lines.map(([l, h]) => [l, words(`${l} ${h}`).filter(w => asked.has(w)).length]).filter(([, n]) => n).sort((a, b) => b[1] - a[1]);
    const intro = /introducing yourself as Layla from (.+?), in one short line/.exec(system)?.[1];
    const hello = intro ? `Hello, I’m Layla from ${intro}. ` : '';
    const body = scored.length ? { reply: `${hello}${scored[0][0]}`.trim(), intent: 'answer' } : { reply: `${hello}I don’t have that information.`, intent: 'unknown', needs_team: true };
    return { text: JSON.stringify(body), usage: { input: 10, output: 5 }, ms: 1, model: 'grounded-fake' };
  };
  generate.calls = calls;
  return generate;
}
