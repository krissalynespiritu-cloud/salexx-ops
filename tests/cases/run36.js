const fs = require('fs');
const path = require('path');
const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

// Design-direction change: "the interface should feel dense, functional, and
// human-designed rather than decorative" -- empty states across the whole app
// (68 uses of the shared .empty class) should read as lightweight inline
// messages, not large gray/dashed-border panels. This is a source-level check
// since it's a single shared CSS rule, not something that needs re-testing
// per page.
const match = html.match(/\.empty\{([^}]*)\}/);
check('TEST 1: the shared .empty rule exists', !!match);
const rule = match ? match[1] : '';
check('TEST 2: no dashed/solid border box around empty states anymore', !/border:/.test(rule), rule);
check('TEST 3: no rounded-card corners on empty states anymore', !/border-radius/.test(rule), rule);
check('TEST 4: padding is tight (inline-message weight), not a large panel', /padding:7px/.test(rule), rule);
check('TEST 5: text is left-aligned like a normal status line, not centered like a decorative card', /text-align:left/.test(rule), rule);

console.log('\n=== PASS (' + results.pass.length + ') ===');
results.pass.forEach(p => console.log('  ok - ' + p));
console.log('\n=== FAIL (' + results.fail.length + ') ===');
results.fail.forEach(f => console.log('  FAIL - ' + f));
process.exit(results.fail.length ? 1 : 0);
