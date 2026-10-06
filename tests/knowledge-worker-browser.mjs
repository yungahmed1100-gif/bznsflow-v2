// Run after npm run build with the static preview server running. Synthetic files only.
import { chromium } from 'playwright';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import { readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const asset=(await readdir(new URL('../dist/assets',import.meta.url))).find(n=>n.startsWith('information-worker-'));
const browser=await chromium.launch({headless:true});
try {
const page=await browser.newPage();await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:5199'}/en/signin`);
const pdfPage=await browser.newPage();await pdfPage.setContent('<p>Business hours Monday nine to five.</p>');const pdf=await pdfPage.pdf();await pdfPage.close();
const zip=new JSZip();zip.file('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');zip.file('word/document.xml','<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Business hours Monday nine to five.</w:t></w:r></w:p></w:body></w:document>');const docx=await zip.generateAsync({type:'nodebuffer'});
const book=new ExcelJS.Workbook();book.addWorksheet('Hours').addRow(['Monday','Nine to five']);const xlsx=await book.xlsx.writeBuffer();
const fixtures=[['facts.txt',Buffer.from('Business hours\nMonday: 9–5')],['facts.csv',Buffer.from('Day,Hours\nMonday,9–5')],['facts.pdf',pdf],['facts.docx',docx],['facts.xlsx',xlsx],['bad.pdf',Buffer.from('broken')],['bad.docx',Buffer.from('broken')],['bad.xlsx',Buffer.from('broken')]];
if (process.env.OCR === '1') {
  for (const [extension, type] of [['png','image/png'],['jpeg','image/jpeg'],['webp','image/webp']]) {
    const image = await page.evaluate(async type => {
      const canvas = document.createElement('canvas'); canvas.width=900; canvas.height=180;
      const ctx=canvas.getContext('2d'); ctx.fillStyle='white'; ctx.fillRect(0,0,900,180); ctx.fillStyle='black'; ctx.font='48px Arial'; ctx.fillText('OPEN MONDAY',40,90);
      return [...new Uint8Array(await (await new Promise(resolve=>canvas.toBlob(resolve,type))).arrayBuffer())];
    }, type);
    fixtures.push([`ocr.${extension}`,Buffer.from(image)]);
  }
  fixtures.push(['scanned.pdf',pdf],['bad.png',Buffer.from('broken')]);
}
for (const [name,bytes] of fixtures) {
const result=await page.evaluate(async({asset,name,bytes})=>await new Promise(resolve=>{ const worker=new Worker(`/assets/${asset}`,{type:'module'});const timer=setTimeout(()=>{worker.terminate();resolve({error:'timeout'});},60000);worker.onmessage=({data})=>{if(data.progress || (!data.result && !data.error))return;clearTimeout(timer);worker.terminate();resolve(data);};worker.onerror=e=>{clearTimeout(timer);worker.terminate();resolve({error:e.message});};worker.postMessage({file:new File([new Uint8Array(bytes)],name),scanned:name.startsWith('scanned')});}),{asset,name,bytes:[...bytes]});
console.log(name,JSON.stringify(result));if(name.startsWith('bad')) assert.ok(result.error);else { assert.ok(result.result?.text,`${name}: ${result.error}`); if(name.startsWith('ocr.')) assert.match(result.result.text,/OPEN MONDAY/); if(name === 'scanned.pdf') assert.match(result.result.text,/Business hours/i); }
}
} finally { await browser.close(); }
