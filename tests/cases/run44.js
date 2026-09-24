const fs = require('fs');
const path = require('path');
const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

// Design-direction change: (1) put Delivery and Milestones side by side in a
// 2-column grid on Overview instead of two full-width stacked blocks, to cut
// the scroll height roughly in half; (2) fold the Permits tab (permit
// records with submitted/approved/inspection dates) into Overview too, right
// under Delivery/Milestones, since the "Permit required" flag already moved
// there and a standalone tab for the rest wasn't pulling its weight.

const ovIdx = html.indexOf('if(st==="ov"){');
const gridIdx = html.indexOf('display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr))', ovIdx);
check('TEST 1: Overview wraps Delivery+Milestones in a responsive 2-column grid', gridIdx !== -1 && gridIdx - ovIdx < 2000, `ov:${ovIdx} grid:${gridIdx}`);

const deliveryIdx = html.indexOf('jobDeliveryBlock(j)', gridIdx);
const milestonesIdx = html.indexOf('<h5>Milestones</h5>', gridIdx);
check('TEST 2: Delivery comes before Milestones inside that grid', deliveryIdx !== -1 && milestonesIdx !== -1 && deliveryIdx < milestonesIdx);

check('TEST 3: the standalone Permits subtab button is gone', !html.includes('data-st="prm"'));
const permitsIdx = html.indexOf('jobPermitsBlock(j)', milestonesIdx);
check('TEST 4: Permits & Inspections now renders inside the Overview branch, after Delivery/Milestones', permitsIdx !== -1 && permitsIdx - ovIdx < 3000, `ov:${ovIdx} permits:${permitsIdx}`);
check('TEST 5: the redundant "Permit required: Yes/No" note line was removed from the Permits block (already a checkbox in Delivery)', !/Permit required[^`]*<b>\$\{j\.permitReq\}<\/b>/.test(html));

check('TEST 6: Overview proactively loads permits data instead of relying on a stale, never-fetched cache', /if\(j\.permits===undefined\)refreshPermitsCache\(\);/.test(html));

console.log('\n=== PASS (' + results.pass.length + ') ===');
results.pass.forEach(p => console.log('  ok - ' + p));
console.log('\n=== FAIL (' + results.fail.length + ') ===');
results.fail.forEach(f => console.log('  FAIL - ' + f));
process.exit(results.fail.length ? 1 : 0);
