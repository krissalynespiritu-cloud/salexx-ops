const fs = require('fs');
const path = require('path');
const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

// Bug: the Profitability page's period drill-down rows combine the client
// name and job type into one cell (e.g. "Ronald Lai · Siding + Windows &
// Doors + Patio Cover + Door Installation"). A long multi-trade job type
// pushed the row wider than the table, cutting off the Margin % column at
// the edge of the screen instead of the table fitting or scrolling cleanly.
const rule = (html.match(/#pfPeriodTable \.pfDrill td:first-child\{([^}]*)\}/) || [])[1] || '';
check('TEST 1: the pfDrill first-column truncation rule exists', !!rule);
check('TEST 2: it clips overflow instead of forcing the table wider', /overflow:hidden/.test(rule), rule);
check('TEST 3: it truncates with an ellipsis rather than wrapping awkwardly', /text-overflow:ellipsis/.test(rule), rule);
check('TEST 4: it never wraps to a second line (which would also break row height)', /white-space:nowrap/.test(rule), rule);

check('TEST 5: the full "client · type" text is preserved as a hover tooltip', /pfDrill"><td style="padding-left:22px" title="\$\{escapeHtml\(j\.client\)\} · \$\{escapeHtml\(j\.type\)\}"/.test(html));

console.log('\n=== PASS (' + results.pass.length + ') ===');
results.pass.forEach(p => console.log('  ok - ' + p));
console.log('\n=== FAIL (' + results.fail.length + ') ===');
results.fail.forEach(f => console.log('  FAIL - ' + f));
process.exit(results.fail.length ? 1 : 0);
