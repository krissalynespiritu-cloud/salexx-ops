const fs = require('fs');
const path = require('path');
const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

// Design-direction change: (1) drop the "Monday"/"GHL"/"edit" provenance
// badges cluttering Overview's Delivery and Milestones sections -- the
// fields are already obviously editable now that they're real
// inputs/selects/checkboxes, not read-only text; (2) fold the Closeout tab
// (a pure read-only rollup of Milestones/Punch List/Materials/Payments, by
// its own description) into Overview instead of being a separate click;
// (3) merge Updates into Timeline as one "Activity" log, since Timeline's
// own feed already included posted updates as one of its event types.

const deliveryBlock = (html.match(/function jobDeliveryBlock\(j\)\{[\s\S]*?\n\}/) || [''])[0];
check('TEST 1: jobDeliveryBlock exists', !!deliveryBlock);
check('TEST 2: no "Monday" provenance badge left in the Delivery block', !deliveryBlock.includes('src mon'), deliveryBlock);
check('TEST 3: no "GHL" provenance badge left in the Delivery block', !deliveryBlock.includes('src ghl'), deliveryBlock);

check('TEST 4: the standalone Closeout subtab button is gone', !html.includes('data-st="clo"'));
check('TEST 5: the standalone Updates subtab button is gone', !html.includes('data-st="up"'));
check('TEST 6: the Timeline subtab is now labeled Activity', /<button data-st="tl" aria-selected="false">Activity<\/button>/.test(html));
check('TEST 7: renderCloseoutTab is now invoked from the Overview branch', /if\(st==="ov"\)\{[\s\S]{0,3500}renderCloseoutTab\(j\)/.test(html));
const tlIdx = html.indexOf('if(st==="tl"){');
const composerIdx = html.indexOf('newUpdateBody', tlIdx);
const feedIdx = html.indexOf('renderTimelineTab()', tlIdx);
check('TEST 8: the Activity tab renders the update composer ahead of the feed', tlIdx !== -1 && composerIdx !== -1 && feedIdx !== -1 && composerIdx < feedIdx && feedIdx - tlIdx < 2000, `tl:${tlIdx} composer:${composerIdx} feed:${feedIdx}`);
check('TEST 9: posting an update now refreshes the merged Activity feed (loadTimeline), not a separate updates cache', /await loadTimeline\(\);\s*setUpdateStatus\("Posted"/.test(html));
check('TEST 10: the old dead loadUpdates()/currentUpdates plumbing was cleaned up, not left dangling', !html.includes('loadUpdates') && !html.includes('currentUpdates'));

console.log('\n=== PASS (' + results.pass.length + ') ===');
results.pass.forEach(p => console.log('  ok - ' + p));
console.log('\n=== FAIL (' + results.fail.length + ') ===');
results.fail.forEach(f => console.log('  FAIL - ' + f));
process.exit(results.fail.length ? 1 : 0);
