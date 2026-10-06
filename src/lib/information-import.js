export function extractInformation(file, { signal, scanned = false, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Cancelled', 'AbortError'));
    const worker = new Worker(new URL('./information-worker.js', import.meta.url), { type: 'module' });
    let deadline;
    const cleanup = () => { clearTimeout(deadline); worker.terminate(); signal?.removeEventListener('abort', abort); };
    const abort = () => { cleanup(); reject(new DOMException('Cancelled', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data }) => {
      if (data.progress) { onProgress?.(data.progress); return; }
      if (!data.result && !data.error) return;
      cleanup(); data.error ? reject(Error(data.error)) : resolve(data.result);
    };
    worker.onerror = () => { cleanup(); reject(Error('knowledge_extraction_failed')); };
    deadline = setTimeout(() => { cleanup(); reject(Error('knowledge_extraction_timeout')); }, 120000);
    worker.postMessage({ file, scanned });
  });
}
