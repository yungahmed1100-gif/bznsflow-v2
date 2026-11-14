// Claims Layla may not make up: opening times, days, waiting times, promises, and who she is
// talking to. Each check is deterministic and compares her reply with the owner's data and the
// chat itself; a reply that fails is rewritten once by the model, then replaced by the honest
// fallback. Pure, so Convex, the setup preview and the tests share it.
//
// The same extraction runs on the reply and on the sources, so a time or day counts as known
// only when the sources state it in a form these patterns also read.

const toLatin = s =>
  String(s || '')
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x6f0));
const fold = s =>
  toLatin(s)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');

const MERIDIEM = 'a\\.?m\\.?|p\\.?m\\.?|صباحا|مساء|ظهرا|عصرا|ليلا|ص|م';
// "8:30", "9 pm", "5 مساء", "until 9", "الساعة 4".
const TIME = new RegExp(
  `(?<![\\d.,:])(\\d{1,2})[:.](\\d{2})(?![\\d.,])(?:\\s*(?:${MERIDIEM})(?![\\p{L}]))?` +
    `|(?<![\\d.,:])(\\d{1,2})\\s*(?:${MERIDIEM})(?![\\p{L}\\d])` +
    `|(?:\\b(?:until|till)|الساعه|حتي الساعه)\\s*(\\d{1,2})(?![\\d.,:%])`,
  'giu',
);
/** Clock times as "h:mm" on a 12-hour dial, so "17:30" and "5:30 pm" are the same time. */
export function timesIn(text) {
  const found = new Set();
  for (const m of fold(text).matchAll(TIME)) {
    const hour = Number(m[1] ?? m[3] ?? m[4]);
    const minute = m[2] ?? '00';
    if (hour > 24 || Number(minute) > 59) continue;
    found.add(`${hour % 12}:${minute}`);
  }
  return found;
}

const DAYS = [
  ['sunday', 'الاحد'],
  ['monday', 'الاثنين'],
  ['tuesday', 'الثلاثاء'],
  ['wednesday', 'الاربعاء'],
  ['thursday', 'الخميس'],
  ['friday', 'الجمعه'],
  ['saturday', 'السبت'],
];
const DAY_WORD = `(?:${DAYS.flat().join('|')})`;
const DAY_RE = new RegExp(`(?<![\\p{L}])(${DAY_WORD})(?![\\p{L}])`, 'gu');
const DAY_RANGE = new RegExp(
  `(${DAY_WORD})\\s*(?:to|through|until|till|-|–|—|الي|حتي|لين)\\s*(?:يوم\\s*)?(${DAY_WORD})`,
  'gu',
);
const EVERY_DAY = /\b(?:daily|every ?day|all week|7 days|seven days)\b|كل يوم|يوميا|طوال الاسبوع|طول الاسبوع/u;
const dayIndex = word => DAYS.findIndex(pair => pair.includes(word));
/** Weekdays named in a text, as indexes (Sunday = 0); a range such as "Sunday to Thursday" names every day in it. */
export function daysIn(text, { ranges = false } = {}) {
  const folded = fold(text);
  if (ranges && EVERY_DAY.test(folded)) return new Set([0, 1, 2, 3, 4, 5, 6]);
  const found = new Set([...folded.matchAll(DAY_RE)].map(m => dayIndex(m[1])));
  if (ranges)
    for (const m of folded.matchAll(DAY_RANGE))
      for (let d = dayIndex(m[1]), end = dayIndex(m[2]), n = 0; n < 7; d = (d + 1) % 7, n++) {
        found.add(d);
        if (d === end) break;
      }
  return found;
}

const RELATIVE = [
  ['tomorrow', /\btomorrow\b|بكره|باكر|غدا(?![\p{L}])/u],
  ['tonight', /\btonight\b|الليله/u],
];
const UNITS = [
  ['minute', 'minutes?|mins?|دقيقه|دقائق|دقايق'],
  ['hour', 'hours?|hrs?|ساعه|ساعات|ساعتين'],
  ['day', 'days?|يوم|ايام|يومين'],
  ['week', 'weeks?|اسبوع|اسابيع|اسبوعين'],
];
const DURATION = new RegExp(`(\\d{1,2})\\s*(${UNITS.map(u => u[1]).join('|')})(?![\\p{L}])`, 'giu');
const durationsIn = text =>
  new Set(
    [...fold(text).matchAll(DURATION)].map(m => {
      const unit = UNITS.find(u => new RegExp(`^(?:${u[1]})$`, 'u').test(m[2]));
      return `${Number(m[1])} ${unit?.[0]}`;
    }),
  );

// A promise is refused only in its affirmative form: "I can't agree discounts here" is allowed.
const PROMISES = [
  /\b\d{1,3}\s?% (?:off|discount)\b|\bdiscount of\b|\b(?:we|i)(?:'ll| will| can) (?:give|offer|apply)[^.!?\n]{0,30}\bdiscount\b/i,
  /خصم\s*\d|نعطيك\s+خصم|لك\s+خصم|بنسوي\s+لك\s+خصم/u,
  /\bfree (?:delivery|shipping)\b|توصيل\s+مجاني|التوصيل\s+مجاني/iu,
  /\b(?:we|i) guarantee\b|\bguaranteed\b|نضمن\s+لك/iu,
  /(?<![\p{L}])ابشر(?:ي|وا)?(?![\p{L}])/u,
];

// Gendered or titled address: Layla does not know who she is talking to, so she never guesses.
// Read from the reply as written: a title before a capitalised name, or a bare "sir" or "madam".
const GENDERED_EN = /\b(?:Mr|Mrs|Ms)\.?\s+[A-Z]|\b(?:sir|madam|ma'am)\b/;
const GENDERED_AR =
  /(?<![\p{L}])(?:استاذ|استاذه|استاذي|استاذتي|اخوي|اختي|اخي|سيدي|سيدتي|يا\s+(?:اخ|اخت|غالي|غاليه|طيب|طيبه))(?![\p{L}])/u;
// A name she addresses the customer by: "Hi Ahmed,", "Thank you, Noura!", "يا أحمد". In English the name
// must end the greeting ("Hello, I'm Layla" and "Hello, This is…" are not names).
const ADDRESSED = [
  /(?:^|[.!?\n]\s*)(?i:hi|hello|hey|dear|welcome(?: back)?|thanks|thank you|good (?:morning|afternoon|evening))[,]?\s+([A-Z][\p{L}'’-]{1,29})(?=[,!.?]|$)/gu,
  /(?<![\p{L}])يا\s+([\p{Script=Arabic}]{2,20})(?![\p{L}])/gu,
];
const NOT_NAMES = new Set(
  [
    ...['there', 'again', 'everyone', 'team', 'welcome', 'layla', 'sure', 'yes', 'certainly', 'thanks'],
    ...['هلا', 'مرحبا', 'اهلا', 'ريت', 'ليت', 'رب', 'الله', 'سلام', 'طويل', 'جماعه', 'حي', 'مساء', 'صباح'],
  ].map(fold),
);
/** The names Layla addressed someone by in a reply, folded for comparison. */
export function addressedNames(reply) {
  const names = [];
  for (const pattern of ADDRESSED)
    for (const m of String(reply || '').matchAll(pattern)) {
      const name = fold(m[1]);
      if (!NOT_NAMES.has(name)) names.push(name);
    }
  return names;
}

// Words that mark another dialect: Layla's Arabic is polite Gulf Arabic or plain formal Arabic.
const OTHER_DIALECT =
  /(?<![\p{L}])(?:عايز|عايزه|عاوز|عاوزه|ازيك|دلوقتي|كده|مفيش|اوي|بتاعك|بتاعتك|هلق|هلا[ءأ]|كتير|منيح|منيحه|بدك|بدي|هيك|مشان|لسه)(?![\p{L}])/u;

/**
 * The first claim in a reply that nothing backs, as a reason code, or ''.
 * @param {string} reply what Layla wants to send
 * @param {string} sources the owner's data and this chat, as text
 * @param {{ customerName?: string, lang?: 'en'|'ar' }} [about]
 * @returns {''|'untraced_time'|'untraced_day'|'untraced_wait'|'unbacked_promise'|'gendered_address'|'wrong_name'|'other_dialect'}
 */
export function untracedClaim(reply, sources, about = {}) {
  const known = fold(sources);
  const said = fold(reply);
  const times = timesIn(sources);
  for (const t of timesIn(reply)) if (!times.has(t)) return 'untraced_time';
  const days = daysIn(sources, { ranges: true });
  for (const d of daysIn(reply)) if (!days.has(d)) return 'untraced_day';
  for (const [, pattern] of RELATIVE) if (pattern.test(said) && !pattern.test(known)) return 'untraced_day';
  const waits = durationsIn(sources);
  for (const w of durationsIn(reply)) if (!waits.has(w)) return 'untraced_wait';
  for (const pattern of PROMISES) {
    const made = said.match(pattern);
    if (made && !known.includes(made[0])) return 'unbacked_promise';
  }
  if (GENDERED_EN.test(String(reply || '')) || GENDERED_AR.test(said)) return 'gendered_address';
  const first = fold(about.customerName || '').split(/\s+/)[0];
  for (const name of addressedNames(reply))
    if (name !== first && !new RegExp(`(?<![\\p{L}])${name}(?![\\p{L}])`, 'u').test(known)) return 'wrong_name';
  if (about.lang === 'ar' && OTHER_DIALECT.test(said)) return 'other_dialect';
  return '';
}
