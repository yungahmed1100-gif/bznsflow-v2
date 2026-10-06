// Parsers are loaded only after selection, inside an interruptible worker.
const LIMIT = 100000;
async function extract(file, scanned) {
  if (!file || file.size > 15 * 1024 * 1024) throw Error('knowledge_file_too_large');
  const name = file.name.toLowerCase(), references = [], warnings = [];
  let extractedChars = 0, truncated = false;
  const add = (label, value) => {
    const text = String(value || '').replace(/\0/g, '');
    const separator = references.length ? 1 : 0;
    const remaining = LIMIT - extractedChars - separator;
    if (remaining <= 0 || references.length >= 500) { if (text.trim()) truncated = true; return; }
    if (text.length > remaining) truncated = true;
    const bounded = text.slice(0, remaining); extractedChars += bounded.length + separator;
    references.push({ label, text:bounded });
  };
  if (/\.(docx|xlsx)$/.test(name)) {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const entries = Object.values(zip.files);
    if (entries.length > 5000 || entries.reduce((size, entry) => size + (entry._data?.uncompressedSize || 0), 0) > 64 * 1024 * 1024) throw Error('knowledge_expanded_file_too_large');
  }
  let ocrWorker;
  const ocr = async image => {
    if (!ocrWorker) { const { createWorker } = await import('tesseract.js'); ocrWorker = await createWorker(['eng', 'ara']); }
    return (await ocrWorker.recognize(image)).data.text;
  };
  try {
    if (/\.(png|jpe?g|webp)$/.test(name)) {
      const bitmap = await createImageBitmap(file);
      const pixels = bitmap.width * bitmap.height; bitmap.close();
      if (pixels > 16000000) throw Error('knowledge_image_too_large');
      add(file.name, await ocr(file));
    }
    else if (name.endsWith('.pdf')) {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const { default: workerUrl } = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      const pdfWorker = new pdfjs.PDFWorker({ port:new Worker(workerUrl, {type:'module'}) });
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), worker:pdfWorker, disableFontFace:true });
      const pdf = await loadingTask.promise;
      try {
        for (let n = 1; n <= Math.min(pdf.numPages, 200); n++) {
          self.postMessage({ progress: `${n}/${pdf.numPages}` });
          try {
          const page = await pdf.getPage(n);
          let text = (await page.getTextContent()).items.map(item => item.str || '').join(' ');
          if (scanned) {
            const viewport = page.getViewport({ scale: 1.5 });
            if (viewport.width * viewport.height > 16000000) throw Error('knowledge_image_too_large');
            const canvas = new OffscreenCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            text = await ocr(await canvas.convertToBlob({ type: 'image/png' }));
          }
          if (!text.trim()) warnings.push(`Page ${n}: no text; retry with scanned PDF OCR.`);
          add(`Page ${n}`, text); page.cleanup();
          } catch { warnings.push(`Page ${n}: extraction failed. Retry this page separately.`); }
        }
        if (pdf.numPages > 200) warnings.push('Only the first 200 pages were extracted.');
      } finally { await loadingTask.destroy(); pdfWorker.destroy(); }
    } else if (name.endsWith('.docx')) {
      const mammoth = await import('mammoth/mammoth.browser');
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      add(file.name, result.value); warnings.push(...result.messages.map(item => item.message));
    } else if (name.endsWith('.xlsx')) {
      const module = await import('exceljs'); const Excel = module.default || module;
      const book = new Excel.Workbook(); await book.xlsx.load(await file.arrayBuffer());
      book.eachSheet(sheet => sheet.eachRow((row, n) => add(`${sheet.name} · Row ${n}`, row.values.slice(1).map(value => typeof value === 'object' && value !== null ? value.text ?? value.result ?? JSON.stringify(value) : value ?? '').join('\t'))));
    } else if (/\.(csv|txt)$/.test(name)) {
      (await file.text()).split(/\r?\n/).forEach((line, n) => add(`Row ${n + 1}`, line));
    } else throw Error('knowledge_file_type');
  } finally { if (ocrWorker) await ocrWorker.terminate(); }
  const total = references.reduce((sum, part) => sum + part.text.length, 0);
  let remaining = LIMIT;
  const bounded = references.flatMap(part => {
    if (remaining <= 0 || !part.text.trim()) return [];
    const text = part.text.slice(0, remaining); remaining -= text.length;
    return [{ label: part.label, text }];
  }).slice(0, 500);
  const partial = truncated || total > LIMIT || references.length > 500 || warnings.length > 0;
  if (truncated || total > LIMIT) warnings.push('The extraction exceeded 100,000 characters. Split the file and retry the remaining content.');
  const text = bounded.map(part => part.text).join('\n').slice(0, LIMIT);
  if (!text.trim()) throw Error('knowledge_file_empty');
  return { text, references: bounded, partial, warnings };
}
self.onmessage = async ({ data }) => {
  try { self.postMessage({ result: await extract(data.file, data.scanned) }); }
  catch (error) { self.postMessage({ error: error.message || 'knowledge_extraction_failed' }); }
};
