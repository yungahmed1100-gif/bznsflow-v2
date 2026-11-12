// One-off codemod (refactor Phase 2): hand-built language prefixes in src/
// become calls to src/lib/paths.js. Run once from the repository root:
//
//   node scripts/codemods/locale-paths.mjs src/pages/Foo.jsx …
//
// It rewrites only the shapes listed below and adds the import. Whatever it
// leaves is converted by hand; tests/paths.test.mjs fails until nothing is left.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';

// A condition that is true in Arabic, and the expression holding the page's language.
const ARABIC = [
  ['s\\.ar', 's.lang'],
  ["lang === 'ar'", 'lang'],
  ['ar', 'lang'],
];
const ENGLISH = [
  ["l\\.code === 'en'", 'l.code'],
  ["lang === 'en'", 'lang'],
];

/** `rest` of a template literal as an argument: a plain string, or a template when it interpolates. */
const argument = rest => (rest.includes('${') ? `\`${rest}\`` : `'${rest}'`);

function rewrite(source) {
  let text = source;
  const used = new Set();
  const call = (name, ...args) => {
    used.add(name);
    return `${name}(${args.join(', ')})`;
  };
  for (const [condition, lang] of ARABIC) {
    // `${ar ? '' : '/en'}/path…`  →  localePath(lang, '/path…')
    text = text.replace(new RegExp(`\`\\$\\{${condition} \\? '' : '/en'\\}(/[^\`]*)\``, 'g'), (_, rest) =>
      call('localePath', lang, argument(rest)),
    );
    // `${ar ? '/en' : ''}/path…`  →  otherLanguagePath(lang, '/path…')
    text = text.replace(new RegExp(`\`\\$\\{${condition} \\? '/en' : ''\\}(/[^\`]*)\``, 'g'), (_, rest) =>
      call('otherLanguagePath', lang, argument(rest)),
    );
    // ar ? '/' : '/en'  →  homePath(lang)
    text = text.replace(new RegExp(`\\b${condition} \\? '/' : '/en'`, 'g'), () => call('homePath', lang));
    // ar ? '/#hash' : '/en#hash'  →  `${homePath(lang)}#hash`
    text = text.replace(
      new RegExp(`\\b${condition} \\? '/(#[\\w-]+)' : '/en\\1'`, 'g'),
      (_, hash) => `\`\${${call('homePath', lang)}}${hash}\``,
    );
    // ar ? '/path' : '/en/path'  →  localePath(lang, '/path')
    text = text.replace(new RegExp(`\\b${condition} \\? '(/[\\w/-]+)' : '/en\\1'`, 'g'), (_, path) =>
      call('localePath', lang, `'${path}'`),
    );
    // ar ? '/en/path' : '/path'  →  otherLanguagePath(lang, '/path')
    text = text.replace(new RegExp(`\\b${condition} \\? '/en(/[\\w/-]+)' : '\\1'`, 'g'), (_, path) =>
      call('otherLanguagePath', lang, `'${path}'`),
    );
    // ar ? href : `/en${href}`  →  localePath(lang, href)
    text = text.replace(new RegExp(`\\b${condition} \\? (\\w+) : \`/en\\$\\{\\1\\}\``, 'g'), (_, name) =>
      call('localePath', lang, name),
    );
    // ar ? `/en${path}` : path  →  otherLanguagePath(lang, path)
    text = text.replace(new RegExp(`\\b${condition} \\? \`/en\\$\\{(\\w+)\\}\` : \\1\\b`, 'g'), (_, name) =>
      call('otherLanguagePath', lang, name),
    );
  }
  for (const [condition, lang] of ENGLISH) {
    // lang === 'en' ? '/en' : '/'  →  homePath(lang)
    text = text.replace(new RegExp(`\\b${condition} \\? '/en' : '/'`, 'g'), () => call('homePath', lang));
    // lang === 'en' ? '/en/path' : '/path'  →  localePath(lang, '/path')
    text = text.replace(new RegExp(`\\b${condition} \\? '/en(/[\\w/-]+)' : '\\1'`, 'g'), (_, path) =>
      call('localePath', lang, `'${path}'`),
    );
    // `${lang === 'en' ? '/en' : ''}/path…`  →  localePath(lang, '/path…')
    text = text.replace(new RegExp(`\`\\$\\{${condition} \\? '/en' : ''\\}(/[^\`]*)\``, 'g'), (_, rest) =>
      call('localePath', lang, argument(rest)),
    );
  }
  return { text, used };
}

function addImport(text, file, names) {
  if (!names.size) return text;
  const from = relative(dirname(file), 'src/lib/paths.js')
    .replace(/^(?!\.)/, './')
    .replace(/\.js$/, '');
  const existing = text.match(new RegExp(`import \\{([^}]*)\\} from '${from.replace(/\./g, '\\.')}';`));
  if (existing) {
    const all = new Set([
      ...existing[1]
        .split(',')
        .map(n => n.trim())
        .filter(Boolean),
      ...names,
    ]);
    return text.replace(existing[0], `import { ${[...all].sort().join(', ')} } from '${from}';`);
  }
  const imports = [...text.matchAll(/^import [^;]+;\n/gm)];
  const at = imports.length ? imports.at(-1).index + imports.at(-1)[0].length : 0;
  return `${text.slice(0, at)}import { ${[...names].sort().join(', ')} } from '${from}';\n${text.slice(at)}`;
}

for (const file of process.argv.slice(2)) {
  const source = readFileSync(file, 'utf8');
  const { text, used } = rewrite(source);
  if (text === source) continue;
  writeFileSync(file, addImport(text, file, used));
  console.log(`${file}: ${[...used].join(', ')}`);
}
