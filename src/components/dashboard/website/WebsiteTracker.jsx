import React from 'react';
import { WEBSITE_STAGES } from '../../../../config/website-brief.js';
import { W } from './copy';

const ZOHO_MAIL = 'https://mail.zoho.com';

/**
 * Where the free website is, stage by stage, and the date it is promised for. A delay Ahmed explains
 * moves the date and says why; once live, the site, the mailbox and Email campaigns are one click away.
 */
export function WebsiteTracker({ s, project, emailOpen, onChange, onGo }) {
  const tr = pair => pair[s.ar ? 1 : 0];
  const date = (ms, withDay = true) => new Intl.DateTimeFormat(s.ar ? 'ar-OM-u-nu-latn' : 'en-GB',
    { ...(withDay ? { weekday: 'long' } : {}), day: 'numeric', month: 'long', timeZone: 'Asia/Muscat' }).format(new Date(ms));
  const at = WEBSITE_STAGES.indexOf(project.stage);
  const live = project.stage === 'live';

  return (
    <section className="ld-web-tracker" aria-labelledby="ld-web-track-title">
      <h2 id="ld-web-track-title">{tr(live ? W.liveTitle : W.trackTitle)}</h2>
      {!live && <p className={`ld-web-due ld-num${project.delayReason ? ' is-late' : ''}`} role="status">
        {project.delayReason ? tr(W.late).replace('{reason}', project.delayReason).replace('{date}', date(project.dueAt)) : tr(W.readyBy).replace('{date}', date(project.dueAt))}
      </p>}
      <ol className="ld-web-stages">
        {WEBSITE_STAGES.map((stage, i) => {
          // `stage` is the last milestone reached; the next one is what BznsFlow is working on now.
          const state = i <= at ? 'is-done' : i === at + 1 ? 'is-current' : '';
          return (
            <li key={stage} className={state} aria-current={state === 'is-current' ? 'step' : undefined}>
              <span className="ld-web-stage-name">{tr(W.stage[stage])}</span>
              {project.stageAt?.[stage] && <span className="ld-web-stage-at ld-num">{date(project.stageAt[stage], false)}</span>}
            </li>
          );
        })}
      </ol>
      <dl className="ld-web-facts">
        {project.domain && <div><dt>{tr(W.domainChoice)}</dt><dd><bdi dir="ltr">{project.domain}</bdi></dd></div>}
        {project.mailbox && <div><dt>{tr(W.mailboxLocal)}</dt><dd><bdi dir="ltr">{project.mailbox}</bdi></dd></div>}
      </dl>
      <div className="ld-actions">
        {live && project.liveUrl && <a className="ld-button ld-primary" href={project.liveUrl} target="_blank" rel="noopener noreferrer">{tr(W.visit)}</a>}
        {live && project.mailbox && <a className="ld-button" href={ZOHO_MAIL} target="_blank" rel="noopener noreferrer">{tr(W.openMail)}</a>}
        {live && emailOpen && <button type="button" className="ld-button" onClick={() => onGo('email')}>{tr(W.toEmail)}</button>}
        {!live && <button type="button" className="ld-button" onClick={onChange}>{tr(W.change)}</button>}
      </div>
    </section>
  );
}
