import React from 'react';
import { parseBzns } from '../../lib/bzns-doc.js';

// Renders bzns.md as React elements: headings, lists, bold and https links only.
// No HTML string ever reaches the DOM, so owner text cannot inject markup.

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\(https:\/\/[^)\s]+\))/g;
function inline(text) {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/);
    if (link) return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function blocks(body) {
  const out = [];
  let list = null;
  body.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    const item = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
    if (item) { (list ||= []).push(<li key={i}>{inline(item[1])}</li>); return; }
    if (list) { out.push(<ul key={`l${i}`}>{list}</ul>); list = null; }
    const sub = line.match(/^#{3,6}\s+(.+)$/);
    if (sub) out.push(<h5 key={i}>{inline(sub[1])}</h5>);
    else if (line) out.push(<p key={i}>{inline(line)}</p>);
  });
  if (list) out.push(<ul key="last">{list}</ul>);
  return out;
}

/** @param {{ markdown: string, lang?: 'en'|'ar' }} props */
export function BznsPreview({ markdown, lang = 'en' }) {
  const parsed = parseBzns(markdown);
  const ar = lang === 'ar';
  return (
    <article className="bzns-preview" dir="auto" aria-label={ar ? 'معاينة مستند النشاط' : 'Business document preview'}>
      <h3>{parsed.meta.name || (ar ? 'بدون اسم' : 'Untitled')}</h3>
      {parsed.meta.sector && <p className="bzns-preview-sector">{parsed.meta.sector}</p>}
      {parsed.sections.map((section, i) => (
        <section key={i}>
          <h4>{inline(section.heading)}</h4>
          {blocks(section.body)}
        </section>
      ))}
    </article>
  );
}
