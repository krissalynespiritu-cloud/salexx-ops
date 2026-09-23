const fs = require('fs');
const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}

const html = fs.readFileSync(require('path').join(__dirname, '..', '..', 'index.html'), 'utf8');

// ---- TEST 1: mobile breakpoint makes .subtabs horizontally scrollable instead of squeezing 15 tabs into flex:1 slivers ----
const mobileBlock = html.slice(html.indexOf('@media(max-width:767px)'), html.indexOf('@media(max-width:767px)') + 1200);
check('TEST 1: the 767px mobile block overrides .subtabs to scroll', mobileBlock.includes('.subtabs{overflow-x:auto'), mobileBlock);
check('TEST 2: mobile subtabs buttons get a natural width instead of flex:1', mobileBlock.includes('.subtabs button{flex:0 0 auto'), mobileBlock);
check('TEST 3: mobile subtabs buttons keep their label on one line (no mid-word wrap)', mobileBlock.includes('white-space:nowrap'));

// ---- TEST 4: the desktop .subtabs rule is untouched (flex:1 stays outside the media query) ----
const desktopRule = html.slice(html.indexOf('.subtabs{display:flex'), html.indexOf('.subtabs{display:flex') + 260);
check('TEST 4: desktop .subtabs button still uses flex:1 (unchanged)', desktopRule.includes('.subtabs button{flex:1'), desktopRule);

// ---- TEST 5: the profile panel has a real max-width fallback so it can't overflow a narrow screen ----
const panelLine = html.slice(html.indexOf('id="profilePanel"'), html.indexOf('id="profilePanel"') + 260);
check('TEST 5: profilePanel has a max-width fallback', panelLine.includes('max-width:calc(100vw'), panelLine);

console.log('\n=== PASS (' + results.pass.length + ') ===');
results.pass.forEach(p => console.log('  ok - ' + p));
console.log('\n=== FAIL (' + results.fail.length + ') ===');
results.fail.forEach(f => console.log('  FAIL - ' + f));
process.exit(results.fail.length ? 1 : 0);
