const fs = require('fs');
const path = require('path');
const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

// The updates popover's header showed "<Client> · updates", redundant with
// the popover's own obvious purpose -- removed per direct request.
check('TEST 1: the popover header no longer appends "· updates" after the client name', !html.includes('${escapeHtml(jb?.client||"")} · updates'));
check('TEST 2: the header still shows the client name on its own', html.includes('<b style="font-size:12.5px">${escapeHtml(jb?.client||"")}</b>'));

console.log('\n=== PASS (' + results.pass.length + ') ===');
results.pass.forEach(p => console.log('  ok - ' + p));
console.log('\n=== FAIL (' + results.fail.length + ') ===');
results.fail.forEach(f => console.log('  FAIL - ' + f));
process.exit(results.fail.length ? 1 : 0);
