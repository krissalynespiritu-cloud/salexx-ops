const fs = require('fs');
const path = require('path');
const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

// Design directive: real icons from one consistent set, no emoji anywhere,
// and a small animated (150-300ms) affordance for expand/collapse instead of
// swapping text characters. This is a source-level regression guard so a
// future change can't silently reintroduce an emoji or an ad hoc unicode
// "icon" character.
check('TEST 1: the shared icon() helper exists', /function icon\(name,size=16,color="currentColor"\)/.test(html));
check('TEST 2: the icon registry includes the new general-purpose icons', ['menu:', 'moreVertical:', 'chevronDown:', 'chevronRight:', 'plus:', 'x:', 'check:', 'edit:', 'externalLink:', 'eye:', 'eyeOff:', 'printer:', 'receipt:', 'package:', 'trendDown:', 'note:', 'dot:'].every(k => html.includes(k)));

// No real emoji left anywhere in the file (the specific ones that were
// found during the audit: printer, hourglass, checkmark-button, warning,
// eye, memo, money-bag, receipt, package -- all real Unicode emoji, not
// plain punctuation).
const EMOJI = ['\u{1F5A8}', '\u{23F3}', '✅', '⚠️', '\u{1F441}', '\u{1F4DD}', '\u{1F4B0}', '\u{1F9FE}', '\u{1F4E6}'];
for (const e of EMOJI) {
  check(`TEST 3: no leftover emoji ${JSON.stringify(e)}`, !html.includes(e));
}

// The old ad hoc "icon" characters that were mixed in with real emoji are
// gone from the spots that were migrated (hamburger, plus/add buttons,
// more-options menus, timeline icons, closeout checklist, trend arrows).
check('TEST 4: no more full-width plus characters standing in for an icon', !html.includes('＋'));
check('TEST 5: no more vertical-ellipsis standing in for a menu icon', !html.includes('⋮'));
check('TEST 6: the hamburger button uses a real svg, not the ☰ character', !html.includes('>☰</button>') && /id="hamburgerBtn"[^>]*><svg/.test(html));
check('TEST 7: TIMELINE_ICON maps to real icon names, not emoji', /const TIMELINE_ICON=\{labor:"clock",update:"note",payment:"money",invoice:"receipt",material:"package"\}/.test(html));

// Expand/collapse now animates a chevron rotation instead of swapping
// between triangle characters, with a 150-300ms transition and a
// reduced-motion escape hatch.
check('TEST 8: no more triangle characters standing in for an expand caret in the Jobs/Job Costing rows', !html.includes('data-job-expand') || !/\$\{expanded\?"▾":"▸"\}/.test(html));
check('TEST 9: a shared expandCaret rotation transition exists, within the 150-300ms range', /\.expandCaret svg\{transition:transform (\d+)ms/.exec(html) && (() => { const ms = Number(/\.expandCaret svg\{transition:transform (\d+)ms/.exec(html)[1]); return ms >= 150 && ms <= 300; })());
check('TEST 10: the rotation respects prefers-reduced-motion', /@media \(prefers-reduced-motion:reduce\)/.test(html));

console.log('\n=== PASS (' + results.pass.length + ') ===');
results.pass.forEach(p => console.log('  ok - ' + p));
console.log('\n=== FAIL (' + results.fail.length + ') ===');
results.fail.forEach(f => console.log('  FAIL - ' + f));
process.exit(results.fail.length ? 1 : 0);
