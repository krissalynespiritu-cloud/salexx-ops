const fs = require('fs');
const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}

const html = fs.readFileSync(require('path').join(__dirname, '..', '..', 'index.html'), 'utf8');

check('TEST 1: the only remaining literal #1A2C4A is the token definition itself, not a duplicate', (html.match(/#1A2C4A/g) || []).length === 1);
check('TEST 2: --highlight-bg token is defined once with the original color', (html.match(/--highlight-bg:#1A2C4A/g) || []).length === 1, html.match(/--highlight-bg:[^;}]*/g));
check('TEST 3: var(--highlight-bg) is used at least 7 times (the original occurrence count)', (html.match(/var\(--highlight-bg\)/g) || []).length >= 7);
check('TEST 4: no accidental circular self-reference from a blind find/replace', !html.includes('--highlight-bg:var(--highlight-bg)'));

console.log('\n=== PASS (' + results.pass.length + ') ===');
results.pass.forEach(p => console.log('  ok - ' + p));
console.log('\n=== FAIL (' + results.fail.length + ') ===');
results.fail.forEach(f => console.log('  FAIL - ' + f));
process.exit(results.fail.length ? 1 : 0);
