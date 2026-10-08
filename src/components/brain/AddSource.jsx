import React, { useRef, useState } from 'react';
import { chunkText } from '../../../config/brain-extract.js';

/**
 * One place to add information: a file, a web page or pasted text. The text is split into parts;
 * Layla (Qwen) reads each part and suggests catalog items and bzns.md text, each with the passage it
 * came from. Suggestions wait in "Needs your review"; nothing goes live from here.
 */
export function AddSource({ b, request, take, act, busy, websiteAvailable, onDone, open = false }) {
  const [url, setUrl] = useState(''), [text, setText] = useState(''), [progress, setProgress] = useState(''), [result, setResult] = useState(null);
  const fileRef = useRef(null);
  async function read(raw, sourceKind, sourceLabel, partial = false) {
    const { chunks, partial: cut } = chunkText(raw);
    const totals = { added: 0, rejected: 0, failed: 0, partial: partial || cut };
    for (const [i, chunk] of chunks.entries()) {
      setProgress(b.t('reading', { done: i + 1, total: chunks.length }));
      const next = take(await request({ action: 'brain_extract', text: chunk, sourceKind, sourceLabel }));
      const x = next.extraction || {};
      if (x.ok) { totals.added += x.added || 0; totals.rejected += x.rejected || 0; } else totals.failed++;
    }
    take(await request({ action: 'brain_state' }));
    setProgress(''); setResult(totals); onDone?.(totals);
  }
  const fromFile = file => act('source', async () => {
    setResult(null);
    const { extractInformation } = await import('../../lib/information-import.js');
    setProgress(b.t('reading', { done: 0, total: 1 }));
    let extracted = await extractInformation(file);
    // A scanned PDF has no text layer: read its pages as images instead of asking the owner.
    if (!String(extracted.text || '').trim() && /\.pdf$/i.test(file.name)) extracted = await extractInformation(file, { scanned: true });
    if (!String(extracted.text || '').trim()) throw Object.assign(new Error('empty'), { reason: 'knowledge_extraction_failed' });
    await read(extracted.text, 'file', file.name, extracted.partial);
  }).finally(() => setProgress(''));
  const fromWebsite = () => act('source', async () => {
    setResult(null);
    const next = take(await request({ action: 'brain_website', url }));
    await read(next.page.text, 'website', next.page.url, next.page.partial);
    setUrl('');
  }).finally(() => setProgress(''));
  const fromText = () => act('source', async () => { setResult(null); await read(text, 'paste', b.ar ? 'نص ملصق' : 'Pasted text'); setText(''); }).finally(() => setProgress(''));
  const working = busy === 'source';
  return (
    <details className="brain-card brain-add" open={open || undefined}>
      <summary><span className="brain-card-title">{b.t('addTitle')}</span></summary>
      <p className="ld-help">{b.t('addIntro')}</p>
      <div className="brain-add-row">
        <button type="button" className="ld-button" disabled={!!busy} onClick={() => fileRef.current?.click()}>{b.t('addFile')}</button>
        <span className="ld-help">{b.t('fileTypes')}</span>
        <input ref={fileRef} type="file" hidden accept=".pdf,.docx,.txt,.md,.csv,.xlsx,.png,.jpg,.jpeg,.webp" aria-label={b.t('addFile')}
          onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) fromFile(file); }} />
      </div>
      {websiteAvailable && <form className="brain-add-row" onSubmit={e => { e.preventDefault(); if (url.trim()) fromWebsite(); }}>
        <label className="brain-grow">{b.t('website')}<input type="url" inputMode="url" dir="ltr" maxLength={2000} placeholder="https://" value={url} onChange={e => setUrl(e.target.value)} disabled={!!busy} /></label>
        <button type="submit" className="ld-button" disabled={!!busy || !url.trim()}>{b.t('readWebsite')}</button>
      </form>}
      <form className="brain-add-col" onSubmit={e => { e.preventDefault(); if (text.trim()) fromText(); }}>
        <label>{b.t('paste')}<textarea rows={4} dir="auto" maxLength={48000} value={text} onChange={e => setText(e.target.value)} disabled={!!busy} /></label>
        <div><button type="submit" className="ld-button" disabled={!!busy || !text.trim()}>{b.t('readText')}</button></div>
      </form>
      {working && progress && <p role="status" className="ld-help">{progress}</p>}
      {result && <p role="status" className="brain-note">{b.t('readDone', result)}{result.partial ? ` ${b.t('readPartial')}` : ''}{result.failed ? ` ${b.t('readFailed')}` : ''}</p>}
    </details>
  );
}
