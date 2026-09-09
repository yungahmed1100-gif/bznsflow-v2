// Country dial codes for the sign-in page's phone field.
//
// Only [ISO-3166 alpha-2, dial code] is stored here. The display name comes from
// Intl.DisplayNames at render time, which means correct Arabic and English names
// for every country without shipping two translated lists — about 3 KB of data
// instead of about 30 KB, and no vocabulary to keep up to date. Node has full ICU
// built in, so this also resolves during the vite-react-ssg prerender rather than
// leaving blank options in the static HTML.
//
// GCC markets are pulled to the front because that is where the customers are;
// everything after them is sorted by localised name at render time, not here,
// since alphabetical order differs between Arabic and English.

/** Markets that appear above the divider, in this order. */
export const PRIORITY = ['AE', 'SA', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO'];

/** [alpha-2, dial code without '+'] */
export const COUNTRIES = [
  ['AE', '971'], ['SA', '966'], ['KW', '965'], ['QA', '974'], ['BH', '973'],
  ['OM', '968'], ['EG', '20'],  ['JO', '962'], ['LB', '961'], ['IQ', '964'],
  ['SY', '963'], ['YE', '967'], ['PS', '970'], ['LY', '218'], ['SD', '249'],
  ['TN', '216'], ['DZ', '213'], ['MA', '212'], ['MR', '222'], ['SO', '252'],
  ['DJ', '253'], ['KM', '269'],

  ['AF', '93'],  ['AL', '355'], ['AD', '376'], ['AO', '244'], ['AG', '1268'],
  ['AR', '54'],  ['AM', '374'], ['AU', '61'],  ['AT', '43'],  ['AZ', '994'],
  ['BS', '1242'],['BD', '880'], ['BB', '1246'],['BY', '375'], ['BE', '32'],
  ['BZ', '501'], ['BJ', '229'], ['BT', '975'], ['BO', '591'], ['BA', '387'],
  ['BW', '267'], ['BR', '55'],  ['BN', '673'], ['BG', '359'], ['BF', '226'],
  ['BI', '257'], ['KH', '855'], ['CM', '237'], ['CA', '1'],   ['CV', '238'],
  ['CF', '236'], ['TD', '235'], ['CL', '56'],  ['CN', '86'],  ['CO', '57'],
  ['CG', '242'], ['CD', '243'], ['CR', '506'], ['CI', '225'], ['HR', '385'],
  ['CU', '53'],  ['CY', '357'], ['CZ', '420'], ['DK', '45'],  ['DM', '1767'],
  ['DO', '1809'],['EC', '593'], ['SV', '503'], ['GQ', '240'], ['ER', '291'],
  ['EE', '372'], ['SZ', '268'], ['ET', '251'], ['FJ', '679'], ['FI', '358'],
  ['FR', '33'],  ['GA', '241'], ['GM', '220'], ['GE', '995'], ['DE', '49'],
  ['GH', '233'], ['GR', '30'],  ['GD', '1473'],['GT', '502'], ['GN', '224'],
  ['GW', '245'], ['GY', '592'], ['HT', '509'], ['HN', '504'], ['HK', '852'],
  ['HU', '36'],  ['IS', '354'], ['IN', '91'],  ['ID', '62'],  ['IR', '98'],
  ['IE', '353'], ['IL', '972'], ['IT', '39'],  ['JM', '1876'],['JP', '81'],
  ['KZ', '7'],   ['KE', '254'], ['KI', '686'], ['KG', '996'], ['LA', '856'],
  ['LV', '371'], ['LS', '266'], ['LR', '231'], ['LI', '423'], ['LT', '370'],
  ['LU', '352'], ['MO', '853'], ['MG', '261'], ['MW', '265'], ['MY', '60'],
  ['MV', '960'], ['ML', '223'], ['MT', '356'], ['MH', '692'], ['MU', '230'],
  ['MX', '52'],  ['FM', '691'], ['MD', '373'], ['MC', '377'], ['MN', '976'],
  ['ME', '382'], ['MZ', '258'], ['MM', '95'],  ['NA', '264'], ['NR', '674'],
  ['NP', '977'], ['NL', '31'],  ['NZ', '64'],  ['NI', '505'], ['NE', '227'],
  ['NG', '234'], ['KP', '850'], ['MK', '389'], ['NO', '47'],  ['PK', '92'],
  ['PW', '680'], ['PA', '507'], ['PG', '675'], ['PY', '595'], ['PE', '51'],
  ['PH', '63'],  ['PL', '48'],  ['PT', '351'], ['PR', '1787'],['RO', '40'],
  ['RU', '7'],   ['RW', '250'], ['KN', '1869'],['LC', '1758'],['VC', '1784'],
  ['WS', '685'], ['SM', '378'], ['ST', '239'], ['SN', '221'], ['RS', '381'],
  ['SC', '248'], ['SL', '232'], ['SG', '65'],  ['SK', '421'], ['SI', '386'],
  ['SB', '677'], ['ZA', '27'],  ['KR', '82'],  ['SS', '211'], ['ES', '34'],
  ['LK', '94'],  ['SR', '597'], ['SE', '46'],  ['CH', '41'],  ['TW', '886'],
  ['TJ', '992'], ['TZ', '255'], ['TH', '66'],  ['TL', '670'], ['TG', '228'],
  ['TO', '676'], ['TT', '1868'],['TR', '90'],  ['TM', '993'], ['TV', '688'],
  ['UG', '256'], ['UA', '380'], ['GB', '44'],  ['US', '1'],   ['UY', '598'],
  ['UZ', '998'], ['VU', '678'], ['VA', '379'], ['VE', '58'],  ['VN', '84'],
  ['ZM', '260'], ['ZW', '263'],
];

/** Every valid alpha-2 code, for the server-side validator. */
export const COUNTRY_CODES = new Set(COUNTRIES.map(([iso]) => iso));

/** Dial code for an alpha-2, or '' if unknown. */
export function dialFor(iso) {
  const found = COUNTRIES.find(([code]) => code === iso);
  return found ? found[1] : '';
}

/**
 * Localised country name.
 *
 * Wrapped because Intl.DisplayNames is missing in a few older engines and throws
 * on a malformed locale rather than degrading. Falling back to the raw ISO code
 * keeps the dropdown usable — "AE +971" is still selectable — instead of
 * rendering an empty option.
 */
export function countryName(iso, lang = 'en') {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(iso) || iso;
  } catch {
    return iso;
  }
}

/**
 * The dropdown's options: priority markets first, then everything else sorted by
 * localised name using a collator for the active language, so Arabic sorts in
 * Arabic order rather than by Unicode code point.
 *
 * @returns {Array<{ iso: string, dial: string, name: string, priority: boolean }>}
 */
export function countryOptions(lang = 'en') {
  const decorate = ([iso, dial]) => ({
    iso, dial, name: countryName(iso, lang), priority: PRIORITY.includes(iso),
  });

  const all = COUNTRIES.map(decorate);
  const top = PRIORITY
    .map((iso) => all.find((c) => c.iso === iso))
    .filter(Boolean);

  let collator;
  try {
    collator = new Intl.Collator(lang);
  } catch {
    collator = { compare: (a, b) => (a < b ? -1 : a > b ? 1 : 0) };
  }

  const rest = all
    .filter((c) => !c.priority)
    .sort((a, b) => collator.compare(a.name, b.name));

  return [...top, ...rest];
}
