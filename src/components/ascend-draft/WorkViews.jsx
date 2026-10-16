import React from 'react';
import { customers } from './data';

export function WorkList({ jobs, pack, lang, date, money, onOpen }) {
  const tr=(en,ar)=>lang==='ar'?ar:en;
  return <section className="ad-panel ad-work-list" aria-label={tr('Scheduled work','الأعمال المجدولة')}>
    <div className="ad-panel-heading"><h2>{tr('Next on the schedule','التالي في الجدول')}</h2><span>{tr('Asia/Muscat','مسقط')}</span></div>
    {[...jobs].sort((a,b)=>a.dueAt-b.dueAt).map(job=><button key={job.id} className="ad-schedule-row" onClick={()=>onOpen(job)}>
      <span className="ad-schedule-date">{date(job.dueAt)}</span>
      <span className="ad-row-copy"><strong>{job.title[lang]}</strong><small>{customers[job.customer][lang]}</small></span>
      <span className="ad-status">{pack.stages[job.stage][lang]}</span><span>{money(job.amount)}</span>
    </button>)}
  </section>;
}
