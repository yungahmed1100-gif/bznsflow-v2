import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
import { PilotError } from './config.js';

export function publicIPv4(address) {
  if (isIP(address) !== 4) return false;
  const [a,b,c] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113));
}
export function readableText(html, limit=12000) {
  return html.replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|noscript|svg|nav|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ')
    .replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|lt|gt|quot|apos);/g,m=>({'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[m]))
    .replace(/\s+/g,' ').trim().slice(0,limit);
}
const RELEVANT_PATH=/(service|product|menu|price|pricing|package|catalog|faq|book|contact|delivery|خدم|منتج|قائم|سعر|أسعار|حجز|تواصل|توصيل)/i;
const EXCLUDED_PATH=/(login|sign-in|signin|account|checkout|cart|privacy|terms|wp-admin|logout)/i;
export function relevantLinks(html,baseUrl,limit=19) {
  const base=new URL(baseUrl),links=[];
  const matches=String(html||'').matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi);
  for(const match of matches){
    const href=match[1]||match[2]||match[3];let candidate;
    try{candidate=new URL(href,base);}catch{continue;}
    candidate.hash='';
    if(candidate.protocol!=='https:'||candidate.hostname!==base.hostname||candidate.username||candidate.password||candidate.port||EXCLUDED_PATH.test(candidate.pathname)||!RELEVANT_PATH.test(`${candidate.pathname}${candidate.search}`))continue;
    const value=candidate.href;if(value!==base.href&&!links.includes(value))links.push(value);
    if(links.length>=limit)break;
  }
  return links;
}
const decode = s => String(s || '').replace(/&(?:nbsp|amp|lt|gt|quot|apos|#39);/g, m => ({ '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'" }[m])).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const PRICE_LINE = /(?:OMR|RO|ر\.?\s?ع\.?|AED|SAR|QAR|BHD|KWD|USD|\$|د\.?\s?إ\.?|ر\.?\s?س\.?)\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*(?:OMR|RO|ريال|درهم|AED|SAR|QAR|BHD|KWD|USD)/i;
/**
 * What a search result shows, plus the page's service headings and price lines: the title, the meta (Google)
 * description, the social-card title and description, h1–h3 headings, and short sentences carrying a price.
 * Small enough for one quick AI read, and it skips menus, footers and long marketing copy.
 */
export function pageSummary(html, limit = 4000) {
  const body = String(html || '').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
  const meta = name => { const m = String(html || '').match(new RegExp(`<meta\\b[^>]*(?:name|property)\\s*=\\s*["']${name}["'][^>]*>`, 'i')); const c = m?.[0].match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i); return decode(c?.[1] ?? c?.[2] ?? ''); };
  const title = decode(String(html || '').match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  const lines = [], seen = new Set();
  const add = (label, text) => { const t = decode(text).slice(0, 300); const key = t.toLowerCase(); if (t.length < 2 || seen.has(key)) return; seen.add(key); lines.push(label ? `${label}: ${t}` : t); };
  add('Title', title); add('Description', meta('description')); add('Title', meta('og:title')); add('Description', meta('og:description'));
  const headings = [...body.replace(/<(nav|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ').matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map(m => m[2]).slice(0, 40);
  if (headings.length) { lines.push('Headings:'); headings.forEach(h => add('', h)); }
  // Price lines, paragraph by paragraph (abbreviations like "ر.ع." break sentence splitting): a short paragraph
  // whole, a long one as a window around each price.
  const blocks = body.replace(/<(nav|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<h[1-6]\b[^>]*>/gi, '\n\u0001')
    .replace(/<\/?(p|li|div|h[1-6]|td|tr|section|article|br|dd|dt)\b[^>]*>/gi, '\n').split('\n')
    .map(b => ({ heading: b.startsWith('\u0001'), text: decode(b.replace('\u0001', '')) })).filter(b => b.text);
  const snippets = [], seenAmounts = new Set();
  let heading = '';
  for (const block of blocks) {
    if (snippets.length >= 15) break;
    if (block.heading) { heading = block.text.slice(0, 80); continue; }
    if (!PRICE_LINE.test(block.text)) continue;
    // The nearest heading names what the price is for ("Catalyst" above "OMR 40 a month").
    const named = text => (heading && !text.includes(heading) ? `${heading} — ${text}` : text);
    // A comparison table repeats amounts already listed with their plan; repeating them would misname them.
    const amounts = [...block.text.matchAll(new RegExp(PRICE_LINE.source, 'gi'))].map(m => m[0].replace(/[^\d.,]/g, ''));
    if (amounts.length && amounts.every(a => seenAmounts.has(a))) continue;
    amounts.forEach(a => seenAmounts.add(a));
    if (block.text.length <= 220) { snippets.push(named(block.text)); continue; }
    for (const m of block.text.matchAll(new RegExp(PRICE_LINE.source, 'gi'))) {
      const from = Math.max(0, m.index - 70), to = Math.min(block.text.length, m.index + m[0].length + 50);
      let cut = block.text.slice(from, to);
      if (from > 0) cut = cut.replace(/^\S*\s/, '');
      if (to < block.text.length) cut = cut.replace(/\s\S*$/, '');
      snippets.push(named(cut.trim()));
      if (snippets.length >= 15) break;
    }
  }
  if (snippets.length) { lines.push('Prices:'); snippets.forEach(s => add('', s)); }
  return lines.join('\n').slice(0, limit);
}
export function extractCatalogFacts(text, source='website') {
  const clean=String(text||'').replace(/\s+/g,' ').trim();
  const parts=clean.split(/(?<=[.!؟])\s+|\s*[|•·]\s*/).map(s=>s.trim()).filter(s=>s.length>=4&&s.length<=500);
  const price=/(?:OMR|RO|ر\.?\s?ع\.?|AED|SAR|USD|\$|د\.?\s?إ\.?|ر\.?\s?س\.?)\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*(?:OMR|RO|ريال|AED|SAR|USD)/i;
  const entries=[];
  for(const part of parts){const match=part.match(price);if(!match)continue;const before=part.slice(0,match.index).replace(/^(price|prices|السعر|الأسعار)\s*[:—-]?\s*/i,'').trim();const name=before.split(/[:—-]/)[0].trim().slice(0,160);if(name.length<2)continue;entries.push({kind:'service',nameEn:/[\u0600-\u06ff]/.test(name)?'':name,nameAr:/[\u0600-\u06ff]/.test(name)?name:'',category:'',benefitEn:'',benefitAr:'',descriptionEn:/[\u0600-\u06ff]/.test(part)?'':part,descriptionAr:/[\u0600-\u06ff]/.test(part)?part:'',availability:'',prices:[{type:/from|starting|ابتداء|يبدأ/i.test(part)?'from':'fixed',currency:/OMR|RO|ر\.?\s?ع|ريال/i.test(match[0])?'OMR':/AED|د\.?\s?إ/i.test(match[0])?'AED':/SAR|ر\.?\s?س/i.test(match[0])?'SAR':'USD',label:match[0],unit:''}],source,confidence:.7,laylaUseEn:'Answer customer questions about this service and its approved price.',laylaUseAr:'الإجابة عن أسئلة العملاء حول هذه الخدمة وسعرها المعتمد.'});if(entries.length>=1000)break;}
  const named=entries.map(item=>`${item.nameEn||item.nameAr}${item.prices[0]?.label?` — ${item.prices[0].label}`:''}`);
  const serviceFacts=parts.filter(part=>/service|product|menu|package|offer|book|خدم|منتج|قائم|باق|نقدم|نوفر|حجز/i.test(part));
  const benefitFacts=parts.filter(part=>/help|benefit|save|support|deliver|customer|حل|يساعد|فائد|يوفر|دعم|توصيل|عميل/i.test(part));
  return {questions:{whatTheyAre:(named.length?named:serviceFacts.slice(0,6)).join('; ').slice(0,1000)||clean.slice(0,500),howTheyHelp:benefitFacts.slice(0,6).join(' ').slice(0,1000),howLaylaUsesIt:'Use only owner-approved services, prices, availability, policies, hours and contact facts to answer customer questions; hand off when a fact is missing.'},entries};
}
async function retrieve(url,address,signal) {
  return new Promise((resolve,reject)=>{
    // Pin the checked address to this request, retaining hostname TLS validation.
    const req=request(url,{method:'GET',signal,headers:{'User-Agent':'BznsFlow-Website-Preview/1.0','Accept':'text/html,text/plain','Accept-Encoding':'identity'},lookup:(hostname,options,callback)=>options.all ? callback(null,[{address,family:4}]) : callback(null,address,4)},res=>{
      let size=0; const chunks=[];
      res.on('data',chunk=>{size+=chunk.length;if(size>2000000){res.destroy();resolve({status:res.statusCode,location:res.headers.location,type:res.headers['content-type'] || '',body:Buffer.concat(chunks).toString('utf8'),partial:true});}else chunks.push(chunk);});
      res.on('error',reject);
      res.on('end',()=>resolve({status:res.statusCode,location:res.headers.location,type:res.headers['content-type'] || '',body:Buffer.concat(chunks).toString('utf8')}));
    });
    req.on('error',reject);req.end();
  });
}
export async function importWebsite(input,{resolve = lookup,get = retrieve,summary = false} = {}) {
  if(typeof input !== 'string' || input.length>2000) throw new PilotError('website_url_invalid');
  let url;
  try {url=new URL(input);} catch {throw new PilotError('website_url_invalid');}
  const signal=AbortSignal.timeout(12000),originHost=url.hostname.replace(/^www\./i,'');
  async function fetchPage(startUrl) {
    let current=new URL(startUrl);
    for(let hop=0;hop<3;hop++) {
    if(current.protocol!=='https:' || current.username || current.password || (current.port && current.port!=='443') || isIP(current.hostname) || !current.hostname.includes('.') || current.hostname.replace(/^www\./i,'')!==originHost || /\.(local|localhost|internal|test|invalid)$/i.test(current.hostname)) throw new PilotError('website_url_invalid');
    let addresses;
    try {addresses=await Promise.race([resolve(current.hostname,{all:true,family:4}),new Promise((_,reject)=>{if(signal.aborted)reject(Error('timeout'));else signal.addEventListener('abort',()=>reject(Error('timeout')),{once:true});})]);}
    catch {throw new PilotError('website_unavailable',502);}
    if(!addresses.length || !addresses.every(a=>publicIPv4(a.address))) throw new PilotError('website_url_invalid');
    let page;
    try {page=await get(current,addresses[0].address,signal);} catch(error) {if(error instanceof PilotError)throw error;throw new PilotError('website_unavailable',502);}
    if([301,302,303,307,308].includes(page.status) && page.location) {
      try {current=new URL(page.location,current);} catch {throw new PilotError('website_url_invalid');}
      continue;
    }
    if(page.status!==200 || !/^(text\/html|text\/plain)(;|$)/i.test(page.type)) throw new PilotError('website_unavailable',502);
    current.hash='';return {url:current,body:page.body,type:page.type,text:readableText(page.body),partial:!!page.partial};
    }
    throw new PilotError('website_redirect_limit',422);
  }
  const root=await fetchPage(url);
  if(!root.text) throw new PilotError('website_empty',422);
  // Summary mode (BznsBrain): the title, Google description, headings and price lines of the home page and up to
  // three service or price pages, capped so the whole site is one short AI read.
  if(summary){
    const html=/^text\/html/i.test(root.type);
    const parts=[html?pageSummary(root.body):root.text.slice(0,4000)],pages=[root.url.href];
    for(const link of html?relevantLinks(root.body,root.url.href,3):[]){
      if(signal.aborted)break;
      try{const page=await fetchPage(link);if(/^text\/html/i.test(page.type)){parts.push(`Page ${page.url.pathname}\n${pageSummary(page.body,1500)}`);pages.push(page.url.href);}}catch{/* a missing page leaves the summary shorter */}
    }
    const text=parts.filter(Boolean).join('\n\n').slice(0,4000);
    if(!text.trim()) throw new PilotError('website_empty',422);
    return {url:root.url.href,text,partial:false,pages};
  }
  const pages=[root.url.href],texts=[root.text];let partial=root.partial,total=Buffer.byteLength(root.body||'');
  const links=/^text\/html/i.test(root.type)?relevantLinks(root.body,root.url.href):[];
  for(const link of links){
    if(signal.aborted||total>=10000000){partial=true;break;}
    try{const page=await fetchPage(link);total+=Buffer.byteLength(page.body||'');if(total>10000000){partial=true;break;}if(page.text){pages.push(page.url.href);texts.push(page.text);partial=partial||page.partial;}}
    catch{partial=true;}
  }
  const text=texts.join(' ').replace(/\s+/g,' ').trim().slice(0,100000);
  if(text.length>=100000)partial=true;
  return {url:root.url.href,text,partial,pages,sections:pages.map((label,index)=>({label,text:texts[index]})),extracted:extractCatalogFacts(text,root.url.href)};
}
