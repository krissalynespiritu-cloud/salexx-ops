const fs = require('fs');
const path = require('path');
const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

// The Edit/Delete links under each update were the same size (10.5px) as
// the note's own timestamp, competing with the actual note body (12px) for
// attention. Shrunk them so the note text reads as the primary content.
const editBtn = (html.match(/<button data-jup-edit="\$\{u\.update_id\}"[^>]*>/) || [''])[0];
const delBtn = (html.match(/<button data-jup-del="\$\{u\.update_id\}"[^>]*>/) || [''])[0];
check('TEST 1: the Edit button exists', !!editBtn);
check('TEST 2: the Delete button exists', !!delBtn);
check('TEST 3: Edit is now smaller than the note body text (12px)', /font-size:(\d+(?:\.\d+)?)px/.test(editBtn) && Number(editBtn.match(/font-size:(\d+(?:\.\d+)?)px/)[1]) < 12, editBtn);
check('TEST 4: Delete is now smaller than the note body text (12px)', /font-size:(\d+(?:\.\d+)?)px/.test(delBtn) && Number(delBtn.match(/font-size:(\d+(?:\.\d+)?)px/)[1]) < 12, delBtn);
check('TEST 5: Edit shrunk below its old 10.5px size', Number(editBtn.match(/font-size:(\d+(?:\.\d+)?)px/)[1]) < 10.5);
check('TEST 6: Delete shrunk below its old 10.5px size', Number(delBtn.match(/font-size:(\d+(?:\.\d+)?)px/)[1]) < 10.5);

console.log('\n=== PASS (' + results.pass.length + ') ===');
results.pass.forEach(p => console.log('  ok - ' + p));
console.log('\n=== FAIL (' + results.fail.length + ') ===');
results.fail.forEach(f => console.log('  FAIL - ' + f));
process.exit(results.fail.length ? 1 : 0);
