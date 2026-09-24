const fs = require('fs');
const path = require('path');
const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

// Design-direction change: replace the mixed-font system (IBM Plex Sans for
// body, IBM Plex Mono for labels/money, Barlow Condensed condensed-uppercase
// for headings) with a single clean sans-serif (Inter) everywhere, and drop
// the forced ALL-CAPS treatment on actual titles (page title, detail-page
// headers, hero name, modal dialog titles) to read closer to a mature,
// GHL-style CRM instead of a stylized construction-brand look.
check('TEST 1: no remaining Barlow Condensed references', !html.includes('Barlow Condensed'));
check('TEST 2: no remaining IBM Plex Mono references', !html.includes('IBM Plex Mono'));
check('TEST 3: no remaining IBM Plex Sans references', !html.includes('IBM Plex Sans'));
check('TEST 4: no stray bare "monospace" font-family fallback left behind', !html.includes('monospace'));
check('TEST 5: Google Fonts import now loads Inter', /fonts\.googleapis\.com\/css2\?family=Inter:/.test(html));
check('TEST 6: base body font-family is Inter', /body\{[^}]*font-family:"Inter",system-ui,sans-serif/.test(html));

const h1Rule = (html.match(/(?<!\.dhead )h1\{([^}]*)\}/) || [])[1] || '';
check('TEST 7: the h1 rule exists', !!h1Rule);
check('TEST 8: h1 no longer forces text-transform:uppercase', !/text-transform:uppercase/.test(h1Rule), h1Rule);
check('TEST 9: h1 still uses Inter', /Inter/.test(h1Rule), h1Rule);

const dheadH2Rule = (html.match(/\.dhead h2\{([^}]*)\}/) || [])[1] || '';
check('TEST 10: the detail-page header (.dhead h2) rule exists', !!dheadH2Rule);
check('TEST 11: detail-page header no longer forces uppercase', !/text-transform:uppercase/.test(dheadH2Rule), dheadH2Rule);

const heroNameRule = (html.match(/\.heroName\{([^}]*)\}/) || [])[1] || '';
check('TEST 12: the .heroName rule exists', !!heroNameRule);
check('TEST 13: hero name (a client name) no longer forced uppercase', !/text-transform:uppercase/.test(heroNameRule), heroNameRule);

check('TEST 14: no modal dialog title still pairs a 19px/20px title font-size with forced uppercase', !/font-size:(19|20)px;text-transform:uppercase/.test(html));

console.log('\n=== PASS (' + results.pass.length + ') ===');
results.pass.forEach(p => console.log('  ok - ' + p));
console.log('\n=== FAIL (' + results.fail.length + ') ===');
results.fail.forEach(f => console.log('  FAIL - ' + f));
process.exit(results.fail.length ? 1 : 0);
