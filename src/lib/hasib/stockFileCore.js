// Reads whatever file a shop keeps its stock in, in the browser. Spreadsheets
// keep their columns (and pictures placed on a row); PDFs, Word files and photos
// of a price list become text lines for the price-list parser.
import { parseDelimited } from '../dashboard/csv.js';
import { STOCK_IMPORT_MAX_ROWS, textToStockRows } from './stockImport.js';

export const STOCK_FILE_MAX_BYTES = 15 * 1024 * 1024;
export const STOCK_FILE_ACCEPT = '.xlsx,.csv,.txt,.pdf,.docx,.png,.jpg,.jpeg,.webp';
const MAX_PAGES = 50;

/** UTF-8 (without its byte-order mark), else Windows-1256 — how Excel saves Arabic CSV. */
export function decodeText(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes); }
  catch { return new TextDecoder('windows-1256').decode(bytes); }
}

/**
 * pdf.js text pieces to lines: pieces on the same baseline join, and a wide gap
 * between them becomes a tab so a table keeps its columns.
 */
export function pdfLines(items) {
  const lines = [];
  for (const it of items.filter(i => i.str && i.str.trim())) {
    const y = it.transform[5], x = it.transform[4];
    let line = lines.find(l => Math.abs(l.y - y) < 2);
    if (!line) { line = { y, parts: [] }; lines.push(line); }
    line.parts.push({ x, end: x + (it.width || 0), str: it.str.trim(), charWidth: (it.width || it.str.length * 5) / Math.max(1, it.str.length) });
  }
  return lines.sort((a, b) => b.y - a.y).map(l => {
    const parts = l.parts.sort((a, b) => a.x - b.x);
    return parts.reduce((text, p, i) => (i ? text + (p.x - parts[i - 1].end > p.charWidth * 3 ? '\t' : ' ') + p.str : p.str), '');
  }).join('\n');
}

const cellText = v => {
  if (v && typeof v === 'object') return String(v.text ?? v.result ?? (v.richText ? v.richText.map(r => r.text).join('') : ''));
  return String(v ?? '').trim();
};

async function readXlsx(buffer) {
  const module = await import('exceljs');
  const ExcelJS = module.default || module;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets.find(s => s.actualRowCount > 0) || workbook.worksheets[0];
  const rows = [], rowIndex = new Map();
  sheet?.eachRow({ includeEmpty: false }, (row, number) => {
    if (rows.length > STOCK_IMPORT_MAX_ROWS + 15) throw new Error('import_row_limit');
    rowIndex.set(number, rows.length);
    rows.push(row.values.slice(1).map(cellText));
  });
  // Pictures anchored on a row belong to that row's product.
  const images = [];
  for (const image of sheet?.getImages?.() || []) {
    const at = rowIndex.get(Math.floor(image.range?.tl?.nativeRow ?? image.range?.tl?.row ?? -1) + 1);
    const media = workbook.getImage(Number(image.imageId));
    const type = { png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', webp: 'image/webp' }[media?.extension];
    if (at !== undefined && type && media.buffer) images.push({ row: at, blob: new Blob([media.buffer], { type }) });
  }
  if (workbook.worksheets.filter(s=>s.actualRowCount>0).length > 1) throw new Error('import_multiple_sheets_select_one');
  return { rows, images };
}

async function pdfText(buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { default: workerUrl } = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
  const worker = new pdfjs.PDFWorker({port:new Worker(workerUrl,{type:'module'})});
  const task = pdfjs.getDocument({ data:new Uint8Array(buffer), worker, disableFontFace:true });
  const pdf = await task.promise;
  const pages = [];
  try {
    if (pdf.numPages > MAX_PAGES) throw new Error('import_pdf_page_limit');
    for (let n = 1; n <= pdf.numPages; n++) pages.push(pdfLines((await (await pdf.getPage(n)).getTextContent()).items));
    return pages.join('\n');
  } finally { await task.destroy(); worker.destroy(); }
}

/** Word: the largest table keeps its cells; otherwise the paragraphs as lines. */
async function docxHtml(buffer) {
  const mammoth = await import('mammoth/mammoth.browser');
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buffer });
  if (html.length > 500000) throw new Error('import_file_too_large');
  return html;
}

async function ocrText(file) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(['eng', 'ara']);
  try { return (await worker.recognize(file)).data.text; } finally { await worker.terminate(); }
}

/**
 * @returns {Promise<{ kind: 'table'|'text', rows: string[][], images: {row:number, blob:Blob}[] }>}
 * `rows` include the header row (a synthetic Name/Price/Quantity one for text).
 */
export async function readStockFileCore(file) {
  if (!file || file.size > STOCK_FILE_MAX_BYTES) throw Object.assign(new Error('import_file_too_large'), { reason: 'import_file_too_large' });
  const name = String(file.name || '').toLowerCase(), type = file.type || '';
  const buffer = await file.arrayBuffer();
  if (/\.(docx|xlsx)$/.test(name)) {
    const { default:JSZip } = await import('jszip');
    const zip=await JSZip.loadAsync(buffer),entries=Object.values(zip.files);
    if (entries.length>5000 || entries.reduce((n,entry)=>n+(entry._data?.uncompressedSize || 0),0)>64*1024*1024) throw new Error('import_file_too_large');
  }
  let result;
  if (name.endsWith('.xlsx')) result = { kind: 'table', ...(await readXlsx(buffer)) };
  else if (name.endsWith('.csv') || (name.endsWith('.txt') && decodeText(new Uint8Array(buffer)).includes(','))) result = { kind: 'table', rows: parseDelimited(decodeText(new Uint8Array(buffer)), { maxRows: STOCK_IMPORT_MAX_ROWS + 15 }), images: [] };
  else if (name.endsWith('.txt') || type.startsWith('text/')) result = { kind: 'text', rows: textToStockRows(decodeText(new Uint8Array(buffer))), images: [] };
  else if (type === 'application/pdf' || name.endsWith('.pdf')) result = { kind: 'text', rows: textToStockRows(await pdfText(buffer)), images: [] };
  else if (name.endsWith('.docx')) result = { kind: 'text', rows: [], docxHtml:await docxHtml(buffer), images: [] };
  else if (type.startsWith('image/') || /\.(png|jpe?g|webp)$/.test(name)) result = { kind: 'text', rows: textToStockRows(await ocrText(file)), images: [] };
  else throw Object.assign(new Error('import_file_type'), { reason: 'import_file_type' });
  if (!result.docxHtml && result.rows.length < 2) throw Object.assign(new Error('import_file_empty'), { reason: 'import_file_empty' });
  return result;
}
