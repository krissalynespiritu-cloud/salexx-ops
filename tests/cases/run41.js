const fs = require('fs');
const path = require('path');
const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

// Bug 1: in light theme, the sidebar background (--ink) was nearly identical
// to the page background (--navy), and .sidebarLink text used a hardcoded
// color (#B7C6D6) meant for a dark sidebar -- on a near-white light-theme
// sidebar this made every nav item almost unreadable. Fixed by giving light
// theme a clearly distinct gray --ink, and making .sidebarLink theme-aware.
const lightRoot = (html.match(/:root\[data-theme="light"\]\{([^}]*)\}/) || [])[1] || '';
check('TEST 1: light theme --ink is defined', /--ink:#[0-9A-Fa-f]{6}/.test(lightRoot), lightRoot);
check('TEST 2: light theme --ink is no longer the washed-out near-white F0F2F5', !lightRoot.includes('--ink:#F0F2F5'), lightRoot);
check('TEST 3: light theme --navy (page background) and --ink (sidebar) are distinct colors', (lightRoot.match(/--navy:#[0-9A-Fa-f]{6}/) || [])[0] !== (lightRoot.match(/--ink:#[0-9A-Fa-f]{6}/) || [])[0]);

const sidebarLinkRule = (html.match(/\.sidebarLink\{([^}]*)\}/) || [])[1] || '';
check('TEST 4: .sidebarLink text color is theme-aware (var(--steel)), not a hardcoded light-on-dark color', sidebarLinkRule.includes('color:var(--steel)'), sidebarLinkRule);
check('TEST 5: the old hardcoded #B7C6D6 sidebar text color is gone from .sidebarLink specifically', !sidebarLinkRule.includes('#B7C6D6'), sidebarLinkRule);

const hoverRule = (html.match(/\.sidebarLink:not\(\.disabled\):hover\{([^}]*)\}/) || [])[1] || '';
check('TEST 6: sidebar hover uses a theme-aware surface color, not a raw white-tint overlay', hoverRule.includes('var(--navy-3)'), hoverRule);

const disabledRule = (html.match(/\.sidebarLink\.disabled\{([^}]*)\}/) || [])[1] || '';
check('TEST 7: disabled sidebar links still read as visually dimmed in both themes', disabledRule.includes('opacity:.5'), disabledRule);

// Bug 2: the Job Costing table's "Reviewed" column header broke mid-word
// ("REVIEWE" / "D") because the column was too narrow for the shared
// word-break:break-word table style. Widened the column and pinned it to a
// single line.
const reviewedColRule = (html.match(/#jobCostingTable th:nth-child\(10\),#jobCostingTable td:nth-child\(10\)\{([^}]*)\}/) || [])[1] || '';
check('TEST 8: the Reviewed column rule exists', !!reviewedColRule);
check('TEST 9: the Reviewed column is wide enough now (10%, up from 8%)', reviewedColRule.includes('width:10%'), reviewedColRule);
check('TEST 10: the Reviewed column no longer breaks its header word mid-way', reviewedColRule.includes('white-space:nowrap') && reviewedColRule.includes('word-break:normal'), reviewedColRule);

console.log('\n=== PASS (' + results.pass.length + ') ===');
results.pass.forEach(p => console.log('  ok - ' + p));
console.log('\n=== FAIL (' + results.fail.length + ') ===');
results.fail.forEach(f => console.log('  FAIL - ' + f));
process.exit(results.fail.length ? 1 : 0);
