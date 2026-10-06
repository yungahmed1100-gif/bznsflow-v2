// Expensive format parsing runs off the UI thread; Blob images survive structured cloning.
import { readStockFileCore } from './stockFileCore.js';
import { textToStockRows } from './stockImport.js';
export { decodeText, pdfLines, STOCK_FILE_MAX_BYTES, STOCK_FILE_ACCEPT } from './stockFileCore.js';
function finish(result) {
  if (result.docxHtml) {
    const html=result.docxHtml;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tables = [...doc.querySelectorAll('table')].map(t => [...t.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('td,th')].map(td => td.textContent.trim())));
  const biggest = tables.sort((a, b) => b.length - a.length)[0];

  const paragraphs = textToStockRows([...doc.body.querySelectorAll('p,li,h1,h2,h3')].map(p => p.textContent.trim()).join('\n'));
    result={kind:'text',rows:biggest?.length>=2?biggest:paragraphs,images:[]};
  }
  if(result.rows.length<2) throw Object.assign(new Error('import_file_empty'),{reason:'import_file_empty'});
  return result;
}
export async function readStockFile(file, {signal} = {}) {
  if(typeof Worker === 'undefined') return finish(await readStockFileCore(file));
  return new Promise((resolve,reject)=>{
    if(signal?.aborted) return reject(new DOMException('Cancelled','AbortError'));
    const worker=new Worker(new URL('./stock-file-worker.js',import.meta.url),{type:'module'});
    let deadline;
    const cleanup=()=>{clearTimeout(deadline);worker.terminate();signal?.removeEventListener('abort',abort);};
    const abort=()=>{cleanup();reject(new DOMException('Cancelled','AbortError'));};
    signal?.addEventListener('abort',abort,{once:true});
    worker.onmessage=({data})=>{
      if(!data.result && !data.error) return;
      cleanup();
      if(data.error) return reject(Object.assign(new Error(data.error),{reason:data.error}));
      try {resolve(finish(data.result));} catch(error){reject(error);}
    };
    worker.onerror=()=>{cleanup();reject(new Error('import_file_failed'));};
    deadline=setTimeout(()=>{cleanup();reject(new Error('import_file_timeout'));},120000);
    worker.postMessage({file});
  });
}
