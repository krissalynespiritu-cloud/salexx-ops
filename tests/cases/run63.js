const fs = require('fs');
const path = require('path');
const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

// Bug: the Jobs list row's stage <select> sized itself to its widest
// possible option ("Punch list / Touch-ups (if needed)", ~212px measured
// live) rather than its selected value, which pushed the row's icon/stage/
// open/menu group past the available width and wrapped it onto its own
// line -- leaving the fields line looking sparsely balanced with lots of
// empty space. Fixed with a real fixed width + ellipsis on the select, and
// trimmed field widths, verified live in the browser to fit on one line.
const jobsRowMatch = html.match(/function jobCardHTML\(j\)\{[\s\S]*?\n\}/);
const jobsRow = jobsRowMatch ? jobsRowMatch[0] : '';
check('TEST 1: jobCardHTML exists', !!jobsRow);

const stageSelect = (jobsRow.match(/<select data-jf="stage"[^>]*>/) || [''])[0];
check('TEST 2: the stage select has a fixed width instead of auto-sizing to its widest option', /width:120px/.test(stageSelect), stageSelect);
check('TEST 3: it truncates with an ellipsis instead of stretching the row', /text-overflow:ellipsis/.test(stageSelect) && /white-space:nowrap/.test(stageSelect));
check('TEST 4: it keeps the full stage name available via a title attribute', /title="\$\{escapeHtml\(j\.stage\)\}"/.test(stageSelect));

const nameInput = (jobsRow.match(/<input type="text" data-jf="client_name"[^>]*>/) || [''])[0];
check('TEST 5: the client name field no longer grows unbounded (flex-grow 1) to eat all row space', !/flex:1 1/.test(nameInput), nameInput);

console.log('\n=== PASS (' + results.pass.length + ') ===');
results.pass.forEach(p => console.log('  ok - ' + p));
console.log('\n=== FAIL (' + results.fail.length + ') ===');
results.fail.forEach(f => console.log('  FAIL - ' + f));
process.exit(results.fail.length ? 1 : 0);
