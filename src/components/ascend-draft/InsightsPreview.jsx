import React from 'react';
import { PRESENTATION } from './presentation';
import { REPORT, reportMetrics, metricIndex } from './report';

const definitions = [
  ['Completed sample deliverables handed over on time ÷ all 12 completed sample deliverables.', 'المخرجات التجريبية المكتملة التي سُلّمت في الموعد ÷ جميع المخرجات التجريبية الاثني عشر.'],
  ['Median recorded approval wait across the 12 completed sample productions.', 'الوسيط الزمني لانتظار الموافقة عبر الإنتاجات التجريبية الاثني عشر المكتملة.'],
  ['Sample productions exceeding two included revision rounds ÷ all 12 completed sample productions.', 'الإنتاجات التجريبية التي تجاوزت جولتي تعديل ÷ جميع الإنتاجات التجريبية الاثني عشر المكتملة.'],
  ['Approved sample project revenue minus recorded direct production costs, including labor. This is contribution, not net profit.', 'إيرادات المشاريع التجريبية المعتمدة ناقص تكاليف الإنتاج المباشرة المسجلة، بما فيها العمل. هذه مساهمة وليست صافي ربح.'],
];
function formatter(lang) {
  const locale=lang==='ar'?'ar-OM':'en-OM';
  const number=new Intl.NumberFormat(locale,{maximumFractionDigits:1});
  const money=new Intl.NumberFormat(locale,{style:'currency',currency:'OMR',maximumFractionDigits:3});
  return (value,index)=>value===null?'—':index===3?money.format(value/1000):`${number.format(value)}${index===1?(lang==='ar'?' ساعة':' h'):'%'}`;
}

export function InsightsPreview({industry,lang,state,metric,onMetric,onRecords,onWork}) {
  const tr=(en,ar)=>lang==='ar'?ar:en, selected=metricIndex(metric), media=industry==='media';
  const cards=PRESENTATION[industry].metrics, values=media?reportMetrics():[null,null,null,null], format=formatter(lang);
  const weekly=[0,1,2,3].map(week=>reportMetrics(REPORT.filter(r=>r.week===week))[selected]);
  const ceiling=Math.max(...weekly,1);
  const active=state.followups.filter(f=>!['completed','cancelled'].includes(f.status));
  return <div className="ad-insights">
    <div className="ad-report-toolbar"><span className="ad-status">{tr('Illustrative report · sample data','تقرير توضيحي · بيانات تجريبية')}</span><span>{media?tr('4 sample weeks · 12 completed productions','٤ أسابيع تجريبية · ١٢ إنتاجاً مكتملاً'):tr('Sector KPI preview','معاينة مؤشرات القطاع')}</span></div>
    <div className="ad-insight-cards">{cards.map((card,i)=><button key={card.en} className={`ad-insight-card${selected===i?' is-selected':''}`} aria-pressed={selected===i} onClick={()=>onMetric(String(i))}>
      <span>{card[lang]}</span><strong>{format(values[i],i)}</strong><small>{media?tr('12 sample records · inspect calculation','١٢ سجلاً تجريبياً · عرض الحساب'):tr('Data not connected','البيانات غير متصلة')}</small>
    </button>)}</div>
    <div className="ad-insights-grid">
      <section className="ad-panel ad-trend-panel"><div className="ad-panel-heading"><div><span className="ad-eyebrow">{tr('PERFORMANCE DETAIL','تفاصيل الأداء')}</span><h2>{cards[selected][lang]}</h2></div></div>
        {media?<><div className="ad-bars" role="img" aria-label={weekly.map((value,i)=>`${tr('Week','الأسبوع')} ${i+1}: ${format(value,selected)}`).join('; ')}>{weekly.map((value,i)=><div key={i} className="ad-bar-column"><strong>{format(value,selected)}</strong><div className="ad-bar-track"><span style={{height:`${Math.max(4,value/ceiling*100)}%`}}/></div><small>{tr('Week','الأسبوع')} {i+1}</small></div>)}</div><p className="ad-chart-note">{tr('Three completed sample productions per week. No external benchmark or claimed improvement.','ثلاثة إنتاجات تجريبية مكتملة أسبوعياً. لا توجد مقارنة خارجية أو زيادة أداء مُدّعاة.')}</p></>:<div className="ad-empty"><h2>{tr('Start with trustworthy records','ابدأ بسجلات موثوقة')}</h2><p>{tr('This sector’s KPI definitions are ready. Its reporting data is not connected in this local preview.','تعريفات مؤشرات هذا القطاع جاهزة. بيانات تقاريره غير متصلة في هذه المعاينة المحلية.')}</p><button className="ld-button" onClick={onWork}>{tr('Explore sample work','استكشف الأعمال التجريبية')}</button></div>}
      </section>
      <section className="ad-panel ad-metric-detail"><span className="ad-eyebrow">{tr('BEHIND THE NUMBER','خلف الرقم')}</span><h2>{cards[selected][lang]}</h2><p>{media?definitions[selected][lang==='ar'?1:0]:tr('This measure needs verified sector outcomes before it can show a reliable result. Explore the sample workflow while reporting is unconnected.','يحتاج هذا المؤشر إلى نتائج موثقة للقطاع لعرض قيمة موثوقة. استكشف سير العمل التجريبي قبل ربط التقارير.')}</p><dl><div><dt>{tr('Source','المصدر')}</dt><dd>{tr('Fictional local examples','أمثلة محلية افتراضية')}</dd></div><div><dt>{tr('Coverage','التغطية')}</dt><dd>{media?tr('12 of 12 sample records','١٢ من ١٢ سجلاً تجريبياً'):tr('Not connected','غير متصل')}</dd></div><div><dt>{tr('Comparison','المقارنة')}</dt><dd>{tr('No prior-period baseline','لا توجد فترة أساس سابقة')}</dd></div></dl>{media&&<button className="ld-button ld-primary" onClick={()=>onRecords(String(selected))}>{tr('View 12 source records','عرض السجلات المصدرية الـ١٢')} <span aria-hidden="true">{lang==='ar'?'←':'→'}</span></button>}</section>
    </div>
    <section className="ad-panel ad-report-activity"><div className="ad-panel-heading"><div><h2>{tr('Current workspace activity','نشاط مساحة العمل الحالي')}</h2><p>{tr('Active examples, separate from the completed reporting cohort.','أمثلة نشطة منفصلة عن مجموعة التقارير المكتملة.')}</p></div><button className="ad-text-link" onClick={onWork}>{tr('Open work','فتح الأعمال')} {lang==='ar'?'←':'→'}</button></div>
      <dl className="ad-activity-counts">{[[tr('Active work records','سجلات أعمال نشطة'),state.jobs.length],[tr('Open follow-ups','متابعات مفتوحة'),active.length],[tr('Needs approval','تحتاج موافقة'),active.filter(f=>f.status==='approval').length],[tr('Blocked tasks','مهام محظورة'),active.filter(f=>f.status==='blocked').length]].map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
    </section>
  </div>;
}

export function ReportRecords({industry,lang,metric,onBack}) {
  const tr=(en,ar)=>lang==='ar'?ar:en, selected=metricIndex(metric), format=formatter(lang);
  if(industry!=='media')return <section className="ad-panel ad-empty"><h2>{tr('No reporting source connected','لا يوجد مصدر تقارير متصل')}</h2><button className="ld-button" onClick={onBack}>{tr('Back to Insights','العودة إلى المؤشرات')}</button></section>;
  return <section className="ad-report-records"><div className="ad-report-toolbar"><button className="ld-button" onClick={onBack}>{lang==='ar'?'→':'←'} {tr('Back to Insights','العودة إلى المؤشرات')}</button><span className="ad-status">{tr('Read-only sample cohort','مجموعة تجريبية للقراءة فقط')}</span></div><h2>{PRESENTATION.media.metrics[selected][lang]}</h2><p className="ad-footnote">{tr('The same 12 completed samples used by Insights. Expand a record to inspect its inputs.','السجلات التجريبية الاثنا عشر المكتملة المستخدمة في المؤشرات. وسّع السجل لفحص بياناته.')}</p>
    {REPORT.map(row=><details key={row.id} className="ad-report-record"><summary><span><bdi>{row.id}</bdi> · {row.title[lang]}</span><strong>{selected===0?(row.onTime?tr('On time','في الموعد'):tr('Late','متأخر')):selected===1?format(row.approvalHours,1):selected===2?`${row.revisionRounds} / ${row.includedRounds}`:format(row.revenueMinor-row.directCostMinor,3)}</strong></summary><dl className="ad-detail-grid"><div><dt>{tr('Sample revenue','إيراد تجريبي')}</dt><dd>{format(row.revenueMinor,3)}</dd></div><div><dt>{tr('Direct cost incl. labor','تكلفة مباشرة تشمل العمل')}</dt><dd>{format(row.directCostMinor,3)}</dd></div><div><dt>{tr('Approval wait','انتظار الموافقة')}</dt><dd>{format(row.approvalHours,1)}</dd></div><div><dt>{tr('Revision rounds / included','جولات التعديل / المشمولة')}</dt><dd>{row.revisionRounds} / {row.includedRounds}</dd></div></dl></details>)}
  </section>;
}
