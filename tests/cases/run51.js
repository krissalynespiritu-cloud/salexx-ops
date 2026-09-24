const fs = require('fs');
const path = require('path');
const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

// The updates popover was cramped (300px wide, 12px note text, 220px list
// height) -- widened it and gave the note text itself more size and
// line-height to read clearly, per a direct follow-up request.
const widthLine = (html.match(/const width=Math\.min\((\d+),window\.innerWidth\*0\.92\);/) || [])[1];
check('TEST 1: the popover width cap was increased past the old 300px', widthLine && Number(widthLine) > 300, widthLine);

const noteDiv = (html.match(/<div style="font-size:([\d.]+)px;margin-top:\d+px;white-space:pre-wrap;line-height:([\d.]+)">\$\{escapeHtml\(u\.body\)\}<\/div>/) || []);
check('TEST 2: the note text font-size grew past the old 12px', noteDiv[1] && Number(noteDiv[1]) > 12, noteDiv[1]);
check('TEST 3: the note text line-height grew past the old 1.4 for easier reading', noteDiv[2] && Number(noteDiv[2]) > 1.4, noteDiv[2]);

const listMaxH = (html.match(/id="jupList" style="max-height:(\d+)px/) || [])[1];
check('TEST 4: the scrollable update list shows more before needing to scroll (past the old 220px)', listMaxH && Number(listMaxH) > 220, listMaxH);

console.log('\n=== PASS (' + results.pass.length + ') ===');
results.pass.forEach(p => console.log('  ok - ' + p));
console.log('\n=== FAIL (' + results.fail.length + ') ===');
results.fail.forEach(f => console.log('  FAIL - ' + f));
process.exit(results.fail.length ? 1 : 0);
