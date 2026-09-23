const fs = require('fs');
const path = require('path');
const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

// Real bug found via a live phone screenshot: .wrap{overflow-x:hidden} (outside any
// media query) makes the browser auto-promote its overflow-y to "auto", which turns
// .wrap into a scroll container. Since header{position:sticky;top:0} lives inside
// .wrap, but the actual page scrolling happens on <html> (not .wrap), the sticky
// header silently stopped sticking at all -- it scrolled fully off-screen with the
// rest of the page. On mobile this meant whatever the user scrolled to could end up
// rendered right where the fixed hamburger button sits, since nothing was correctly
// pinned above it anymore. The fix moves the horizontal-overflow safety net onto
// <body> instead, which is the real scrolling root, so it doesn't break sticky
// descendants. This is a CSS-authoring-time regression test: jsdom can't compute
// real sticky positioning, so it checks the source rule itself instead of rendering it.

const baseStyleBlock = html.slice(0, html.indexOf('@media print'));

const wrapRuleMatch = baseStyleBlock.match(/\.wrap\{([^}]*)\}/);
check('TEST 1: the base (non-print) .wrap rule exists', !!wrapRuleMatch);
check(
  'TEST 2: .wrap does NOT set overflow-x outside the print stylesheet (this is what broke the sticky header)',
  wrapRuleMatch && !/overflow-x/.test(wrapRuleMatch[1]),
  wrapRuleMatch && wrapRuleMatch[1]
);

const bodyRuleMatch = baseStyleBlock.match(/body\{([^}]*)\}/);
check('TEST 3: the base (non-print) body rule exists', !!bodyRuleMatch);
check(
  'TEST 4: body carries overflow-x:hidden instead, which does NOT break sticky descendants since it IS the real scroll root',
  bodyRuleMatch && /overflow-x:hidden/.test(bodyRuleMatch[1]),
  bodyRuleMatch && bodyRuleMatch[1]
);

// Follow-up real-device finding: body{overflow-x:hidden} alone, verified above, was not
// sufficient on the user's actual iOS Safari to stop page-level horizontal scroll from
// wide content inside a tab (e.g. the Leads Tracker's dense row layout), even though it
// correctly fixed the sticky-header bug and worked in simulated desktop-browser testing.
// html{overflow-x:hidden} was tried and empirically confirmed (live, via getBoundingClientRect
// before/after a real scroll) to reintroduce the exact same sticky-breaking bug as .wrap did,
// so it was reverted rather than kept. The actual fix: a new .pageContent wrapper, placed
// as a SIBLING of <header> (not an ancestor), wraps every tab section and carries its own
// overflow-x:hidden -- since it doesn't sit between <header> and the true document root,
// it can't break header's sticky-to-viewport chain, while still giving every section's
// content a real containing box that can't leak width past the viewport. This is checked
// as a real jsdom DOM-structure test (jsdom can parse structure even though it can't
// compute live sticky positioning).
const { JSDOM } = require('jsdom');
const dom = new JSDOM(html);
const doc = dom.window.document;
const pageContent = doc.querySelector('.pageContent');
check('TEST 5: a .pageContent wrapper exists', !!pageContent);
const header = doc.querySelector('header');
check('TEST 6: header is NOT inside .pageContent (so its sticky-to-viewport chain has no overflow-restricted ancestor)', !!header && pageContent && !pageContent.contains(header));
const allSections = doc.querySelectorAll('section[id^="s-"]');
const sectionsInPageContent = pageContent ? pageContent.querySelectorAll('section[id^="s-"]') : [];
check('TEST 7: every tab section is inside .pageContent', allSections.length > 0 && sectionsInPageContent.length === allSections.length, `${sectionsInPageContent.length} of ${allSections.length}`);

console.log('\n=== PASS (' + results.pass.length + ') ===');
results.pass.forEach(p => console.log('  ok - ' + p));
console.log('\n=== FAIL (' + results.fail.length + ') ===');
results.fail.forEach(f => console.log('  FAIL - ' + f));
process.exit(results.fail.length ? 1 : 0);
