const fs = require('fs');
const path = require('path');
const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

// Bug: the Social Media Planner's Status/Type/Date/Link columns were wide
// enough (200/170/130/170px) that the row overflowed the page's 900px .wrap
// container, forcing a horizontal drag to see the later columns. Widths were
// shrunk so the whole row fits without scrolling.
const headerMatch = html.match(/function renderSocialTable\(\)\{[\s\S]*?const header=`([\s\S]*?)`;/);
const header = headerMatch ? headerMatch[1] : '';
check('TEST 1: the Social Planner header row exists', !!header);

function widthOf(label) {
  const m = header.match(new RegExp('width:(\\d+)px[^"]*">' + label + '<'));
  return m ? Number(m[1]) : null;
}
const statusW = widthOf('Status'), typeW = widthOf('Type'), dateW = widthOf('Date'), linkW = widthOf('Link');
check('TEST 2: Status column is narrower than the old 200px', statusW !== null && statusW < 200, statusW);
check('TEST 3: Type column is narrower than the old 170px', typeW !== null && typeW < 170, typeW);
check('TEST 4: Date column is narrower than the old 130px', dateW !== null && dateW < 130, dateW);
check('TEST 5: Link column is narrower than the old 170px', linkW !== null && linkW < 170, linkW);

// The header's fixed-width columns plus the flexible Content column's
// min-width, plus gaps and padding, must fit inside .wrap's 900px so no
// horizontal scroll/drag is ever needed on this page.
const contentMinW = Number((header.match(/flex:1 1 \d+px;min-width:(\d+)px/) || [])[1] || 0);
const menuW = Number((header.match(/width:(\d+)px;flex-shrink:0">\s*<\/span>/) || [])[1] || 22);
const fixedTotal = contentMinW + statusW + typeW + dateW + linkW + menuW;
check('TEST 6: the row\'s minimum total width comfortably fits inside the 900px page container', fixedTotal < 860, fixedTotal);

console.log('\n=== PASS (' + results.pass.length + ') ===');
results.pass.forEach(p => console.log('  ok - ' + p));
console.log('\n=== FAIL (' + results.fail.length + ') ===');
results.fail.forEach(f => console.log('  FAIL - ' + f));
process.exit(results.fail.length ? 1 : 0);
