import React from 'react';

/** Template body with each {{variable}} shown as a chip, so the owner sees what will be filled. */
export function TemplateBody({ template }) {
  const parts = String(template.body || '').split(/(\{\{\s*[a-z0-9_]{1,60}\s*\}\})/i);
  return (
    <small dir="auto" className="ld-template-body">
      {parts.map((part, i) => /^\{\{/.test(part) ? <span key={i} className="ld-var" dir="ltr">{part.replace(/\s+/g, '')}</span> : part)}
    </small>
  );
}
