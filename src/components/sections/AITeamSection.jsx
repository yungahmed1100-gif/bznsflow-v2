import React from 'react';
import { Icon } from '../ui/Icon';
import { waLink } from '../../lib/whatsapp';

// "Meet the AI team" — the full 12-agent roster. Copy is the website-ready
// source in marketing/agents.md («كل اسم له معنى» — every agent is named for
// the job it does). Copy is intentionally identical across locales for now;
// when Arabic card copy lands, mirror the TIERS / TIERS_AR pattern.
const AGENTS = [
  {
    key: 'layla', name: 'Layla', nameAr: 'ليلى', role: 'AI Receptionist', icon: 'message-circle', accent: 'lead',
    tagline: 'Every message answered in seconds. Every lead followed up. Even at 3 AM.',
    problem: '78% of customers buy from the business that responds first. Your competitors take hours. Layla takes seconds.',
    duties: [
      'Answers every WhatsApp and website message instantly — 24/7, weekends, Eid holidays, all of it',
      'Qualifies each lead with smart questions: budget, timeline, requirements — so you only talk to serious buyers',
      'Books appointments directly into your calendar, no back-and-forth',
      'Follows up automatically on cold conversations — the follow-up your team forgets is the one Layla never misses',
      "Speaks your customer's language: Khaleeji Arabic, Egyptian Arabic, English — naturally, not robotically",
      "Hands hot leads to you (or to Saqr) the moment they're ready to close",
    ],
    outcome: 'Zero missed inquiries. A calendar that fills itself. Proven in real estate — where a 5-minute delay is a lost commission.',
  },
  {
    key: 'hatif', name: 'Hatif', nameAr: 'هاتف', role: 'AI Voice Agent', icon: 'phone', accent: 'order',
    tagline: 'A voice you hear, always there. No ringing call ever dies in voicemail again.',
    problem: 'Every unanswered call is a customer dialing your competitor next. Voicemail is where revenue goes to die.',
    duties: [
      'Answers every phone call in a natural, professional voice — first ring, every time',
      'Handles the full conversation: questions, pricing basics, availability, directions',
      'Qualifies the caller and books the appointment during the call itself',
      'Takes structured messages for anything needing a human — and pushes them to you on WhatsApp instantly',
      'Covers after-hours, lunch breaks, Fridays, and the moments your team is with another client',
      "Logs every call with a summary, so nothing lives only in someone's memory",
    ],
    outcome: 'Your phone line becomes a booking machine instead of a bottleneck. One missed call per day recovered often pays for Hatif alone.',
  },
  {
    key: 'samira', name: 'Samira', nameAr: 'سميرة', role: 'AI Social Media Manager', icon: 'megaphone', accent: 'lead',
    tagline: 'Your brand, posting consistently, in flawless Arabic and English — without you touching it.',
    problem: "Businesses don't fail at social media. They abandon it — because it's one more job nobody has time for.",
    duties: [
      'Builds your social strategy: goals, channels, content pillars, posting cadence',
      'Creates the content: posts, captions with variations, hashtags, carousels, video scripts, story ideas',
      'Adapts every piece per platform — Instagram, Facebook, LinkedIn — correct format, length, and tone',
      'Plans campaigns around what matters in your market: Ramadan, Eid, National Day, launches, seasonal cycles',
      'Schedules and publishes directly to your connected accounts — timezone-aware',
      'Nothing ships without your approval — you review, edit, approve. Full brand control, zero surprises',
    ],
    outcome: 'A brand that shows up every day while you run the business. Samira fills the funnel; Layla converts it.',
  },
  {
    key: 'wisal', name: 'Wisal', nameAr: 'وصال', role: 'AI Outreach & Reactivation', icon: 'repeat', accent: 'order',
    tagline: 'The revenue you already paid for is sitting in your old lead list. Wisal goes and gets it.',
    problem: "You paid ad money for every lead in your CRM. Most went quiet. That's not a dead list — it's buried revenue.",
    duties: [
      'Reactivates dormant leads and old customer lists with intelligent, personalized outbound sequences',
      'Segments the list: past buyers, ghosted prospects, expired inquiries — each gets a different conversation',
      'Runs smart follow-up cadences that feel human, not spammy — spaced, contextual, in the right dialect',
      'Re-qualifies revived leads and routes hot ones straight to Saqr or your sales team',
      'Wins back lapsed customers with tailored offers and check-ins',
      'Reports exactly how much pipeline was revived — in numbers, not vibes',
    ],
    outcome: "New revenue with zero new ad spend. The cheapest customer you'll ever acquire is the one you already paid for.",
  },
  {
    key: 'saqr', name: 'Saqr', nameAr: 'صقر', role: 'AI Sales Closer', icon: 'target', accent: 'lead',
    tagline: "The falcon doesn't chase everything. It watches, waits, and strikes the right moment.",
    problem: 'Leads don\'t die because your offer is weak. They die in the gap between "interested" and "signed" — where nobody followed up with precision.',
    duties: [
      'Takes qualified leads from Layla, Hatif, and Wisal and drives them to a decision',
      'Handles objections with prepared, honest answers: price, timing, trust, "let me think about it"',
      'Sends proposals, quotes, and payment links at the exact right moment in the conversation',
      'Runs deal follow-up sequences with the patience of a hunter — persistent, never desperate',
      'Knows when to escalate to you personally — the big deals get the human touch, prepped with full context',
      'Tracks every deal stage so you see the pipeline, not a mystery',
    ],
    outcome: "A closing process that never sleeps, never forgets, and never gets discouraged. Your conversion rate stops depending on someone's mood.",
  },
  {
    key: 'hasib', name: 'Hasib', nameAr: 'حاسب', role: 'AI Data & Reporting Analyst', icon: 'bar-chart', accent: 'order',
    tagline: 'The one who counts. Every dirham of ROI, proven in a weekly report.',
    problem: "Business owners don't quit marketing because it fails — they quit because nobody proves it's working.",
    duties: [
      'Produces your weekly business report: leads captured, calls answered, appointments booked, deals closed, revenue attributed',
      "Tracks the performance of every other agent — Layla's response times, Samira's engagement, Wisal's revival rate — in one dashboard",
      'Monitors your ad spend against results and flags waste before it compounds',
      'Translates raw data into three clear next actions — not a spreadsheet dump',
      'Benchmarks month against month, so growth is visible and provable',
      'Delivers it all as a clean, branded report you can forward to a partner or investor as-is',
    ],
    outcome: 'You stop guessing. Every decision — and every invoice you pay — is backed by a number.',
  },
  {
    key: 'rashid', name: 'Rashid', nameAr: 'رشيد', role: 'AI Business Growth Strategist', icon: 'compass', accent: 'lead',
    tagline: "Rashid thinks three moves ahead, so you don't have to.",
    problem: 'SME owners work in the business all day. Nobody is left to work on it.',
    duties: [
      'Analyzes your market and competitors: pricing, positioning, gaps you can attack',
      'Builds growth plans: quarterly goals, launch roadmaps, expansion strategy',
      'Evaluates new ideas before you spend money on them — honest verdicts, not cheerleading',
      'Drafts the serious documents: investor updates, partnership proposals, business plans',
      'Turns your meeting notes and voice memos into structured decisions and action items',
      'Advises like a majlis counselor, modernized: calm, data-driven, speaks in numbers and next steps',
    ],
    outcome: 'Strategy stops being the thing you\'ll "get to eventually." You get a thinking partner on demand.',
  },
  {
    key: 'adiba', name: 'Adiba', nameAr: 'أديبة', role: 'AI Copywriter', icon: 'feather', accent: 'order',
    tagline: 'Words that sell, crafted like literature, delivered like clockwork.',
    problem: "Weak copy quietly kills strong offers. Most businesses describe what they do — nobody's writing why it matters.",
    duties: [
      'Writes conversion copy for your website: headlines, landing pages, service pages, CTAs',
      'Crafts ad copy variants for Meta campaigns — hooks tested against each other, not guessed',
      'Produces brochures, proposals, company profiles, and pitch documents that read premium',
      'Maintains one consistent brand voice across everything — Arabic and English, each written natively',
      'Rewrites and sharpens existing copy: same page, double the persuasion',
      'Adapts tone per audience: corporate for B2B, warm for consumers, formal for government',
    ],
    outcome: 'Every word representing your business earns its place. Your materials finally sound as good as your work.',
  },
  {
    key: 'dalil', name: 'Dalil', nameAr: 'دليل', role: 'AI SEO Specialist', icon: 'search', accent: 'lead',
    tagline: 'When they search, Dalil makes sure they find you — not your competitor.',
    problem: "Ads stop the moment you stop paying. Search traffic compounds — and in Arabic, it's nearly uncontested territory.",
    duties: [
      'Researches what your customers actually search for — in Arabic AND English (your competitors ignore the Arabic half)',
      'Optimizes your website pages: titles, structure, speed, internal linking',
      'Builds programmatic landing pages targeting long-tail searches in your vertical',
      "Tracks your rankings and your competitors' — and tells you where to strike next",
      'Fixes the technical issues silently costing you visibility',
      'Turns every service you offer into a findable, rankable page',
    ],
    outcome: 'A growing stream of free, high-intent leads. The moat gets deeper every month while competitors keep renting attention.',
  },
  {
    key: 'rasil', name: 'Rasil', nameAr: 'راسل', role: 'AI Email Marketing', icon: 'mail', accent: 'order',
    tagline: 'The correspondent. Every message sent on time, to the right person, with a reason.',
    problem: 'Your email list is an owned audience — no algorithm, no ad auction. Most businesses let it rot.',
    duties: [
      'Builds and runs your email sequences: welcome series, nurture flows, post-purchase follow-up',
      'Writes newsletters your list actually opens — value first, pitch second',
      'Segments your audience so the right offer reaches the right customer',
      'Automates the lifecycle: new lead → nurture → offer → win-back',
      'A/B tests subject lines and send times, then keeps what wins',
      'Reports opens, clicks, and — the only number that matters — revenue per send',
    ],
    outcome: 'A sales channel you own outright, working your list while you sleep.',
  },
  {
    key: 'raqib', name: 'Raqib', nameAr: 'رقيب', role: 'AI Operations Overseer', icon: 'eye', accent: 'lead',
    tagline: 'The watcher. While your team works, Raqib makes sure everything works.',
    problem: 'Automated systems fail silently. You find out when a customer complains — which is the most expensive way to find out.',
    duties: [
      'Monitors every agent and system around the clock — uptime, response times, error rates',
      'Flags issues the moment they appear, before customers ever notice',
      'Watches performance trends and alerts you when something drifts off baseline',
      'Coordinates between agents so handoffs (Layla → Saqr, Wisal → Saqr) never drop a lead',
      'Keeps a live operational log: what ran, what succeeded, what needs attention',
      'Escalates to a human only when it matters — no noise, no false alarms',
    ],
    outcome: 'You sleep knowing the machine is being watched by something that never sleeps.',
  },
  {
    key: 'haris', name: 'Haris', nameAr: 'حارس', role: 'AI Security & Data Guardian', icon: 'shield-check', accent: 'order',
    tagline: "The guardian. Your customers' trust, protected like it's your reputation — because it is.",
    problem: 'One data leak destroys years of trust. GCC customers are rightfully sensitive about privacy — and most SMEs have no answer when asked "is my data safe with you?"',
    duties: [
      'Guards every customer conversation and record — encrypted in transit and at rest',
      'Enforces data protection standards: GDPR for EU operations, regional compliance for GCC markets',
      'Controls who and what can access client data — including which agents see which information',
      "Guarantees data ownership: your clients' data is exportable, deletable, never sold, never used for training",
      'Maintains audit trails, so every access is accounted for',
      'Gives YOU the answer that closes enterprise deals: "yes, and here\'s exactly how we protect it"',
    ],
    outcome: 'Security stops being a weakness you hope nobody asks about — and becomes a selling point you lead with.',
  },
];

export function AITeamSection({ t }) {
  return (
    <section className="section" id="ai-team">
      <div className="container">
        <div className="section-label" data-reveal>{t.team_label}</div>
        <h2 className="section-title" data-reveal dangerouslySetInnerHTML={{ __html: t.team_title }} />
        <p className="section-subtitle" data-reveal>{t.team_sub}</p>

        <div className="team-grid">
          {AGENTS.map(({ key, name, nameAr, role, icon, accent, tagline, problem, duties, outcome }) => (
            <details key={key} className={`team-card team-card--${accent}`} data-reveal>
              <summary className="team-summary">
                <span className="team-avatar" aria-hidden="true"><Icon name={icon} size={26} strokeWidth={1.8} /></span>
                <span className="team-meta">
                  <span className="team-name">
                    {name} <span className="team-name-ar" lang="ar">{nameAr}</span>
                  </span>
                  <span className="team-role">{role}</span>
                </span>
                <svg className="team-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                {/* Card copy is English for now — dir keeps bidi punctuation correct on /ar */}
                <span className="team-tagline" dir="ltr">“{tagline}”</span>
              </summary>
              <div className="team-detail" dir="ltr">
                <p className="team-problem">{problem}</p>
                <ul className="team-duties">
                  {duties.map((d, i) => (
                    <li key={i}>
                      <span className="list-icon list-icon--green"><Icon name="check" size={13} strokeWidth={2.5} /></span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
                <p className="team-outcome">{outcome}</p>
              </div>
            </details>
          ))}
        </div>

        <div className="team-pitch" data-reveal dir="ltr">
          <p className="team-pitch-title">One team. Twelve specialists. Zero salaries, sick days, or resignations.</p>
          <p className="team-pitch-body">
            They answer at 3 AM. They follow up on day 14. They report every Sunday. They never forget a lead,
            a call, or a promise. And every one of them is named for exactly what it does —{' '}
            <span className="team-pitch-promise" lang="ar">«كل اسم له معنى»</span>.
          </p>
        </div>

        <div className="team-cta" data-reveal>
          <a
            href={waLink(t.wa_msg_team)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-large"
          >
            <Icon name="whatsapp" size={20} />
            <span>{t.team_cta}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
