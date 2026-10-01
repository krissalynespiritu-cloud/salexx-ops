const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const domHtml = fs.readFileSync(path.join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(path.join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');

const dom = new JSDOM(`<!doctype html><html><body>${domHtml}</body></html>`, { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.MouseEvent = dom.window.MouseEvent;
global.Event = dom.window.Event;
global.navigator = dom.window.navigator;
global.location = dom.window.location;
global.prompt = () => null;
global.alert = () => {};
global.confirm = () => true;

const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}
global.check = check;
global.results = results;

// Feature: KPI cards on Job Costing. They total whatever the stage chip /
// search / Reviewed / Approved filters show, and revenue/cost/profit/margin
// only count fully-costed jobs (costingComplete), so a job with no labor
// logged yet can't inflate the margin.
const sbMock = {
  from() { const c = { select() { return c; }, eq() { return c; }, order() { return c; }, then(r) { r({ data: [], error: null }); } }; return c; },
  rpc() { return Promise.resolve({ data: [], error: null }); },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} }
};
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  jobs.length = 0;
  jobs.push(
    { id: 'A', client: 'Alpha', stage: 'Completed', type: 'Painting', contract: 10000, revenue: 10000, totalCost: 6000, gp: 4000, marginPct: 40, laborCost: 2000, reviewed: true, approved: true },
    { id: 'B', client: 'Bravo', stage: 'Completed', type: 'Roofing', contract: 20000, revenue: 20000, totalCost: 10000, gp: 10000, marginPct: 50, laborCost: 3000, reviewed: false, approved: false },
    { id: 'C', client: 'Charlie', stage: 'In Progress', type: 'Decking', contract: 5000, revenue: 5000, totalCost: 500, gp: 4500, marginPct: 90, laborCost: 0, sub: 0, reviewed: false, approved: false },
    { id: 'D', client: 'Delta', stage: 'In Progress', type: 'Siding', contract: null, revenue: null, totalCost: null, gp: null, unpriced: true }
  );
  const k = () => document.getElementById('jcKpis').textContent.replace(/\\s+/g, ' ');

  drawJobCosting();
  // ---- TEST 1: all jobs -- only A and B are fully costed ----
  try {
    check('TEST 1: revenue counts only costed jobs ($30,000)', k().includes('$30,000.00'), k());
    check('TEST 1: job cost $16,000', k().includes('$16,000.00'), k());
    check('TEST 1: gross profit $14,000', k().includes('$14,000.00'), k());
    check('TEST 1: weighted margin 46.7% (not inflated by C)', k().includes('46.7%'), k());
    check('TEST 1: coverage note 2 of 4', k().includes('2 of 4 jobs fully costed'), k());
    check('TEST 1: Needs Costing = 1 (C is priced but has no labor)', /Needs Costing 1 /.test(k()), k());
    check('TEST 1: Reviewed 1 / 4, 1 approved', k().includes('1 / 4') && k().includes('1 approved'), k());
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: cards follow the stage filter ----
  try {
    jcStageFilter = 'In Progress'; drawJobCosting();
    check('TEST 2: no costed jobs -> margin shows a dash', k().includes('Margin — ') || /Margin\\s*—/.test(k()), k());
    check('TEST 2: revenue $0.00', k().includes('Revenue $0.00'), k());
    check('TEST 2: 0 of 2', k().includes('0 of 2 jobs fully costed'), k());
    jcStageFilter = 'All';
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: cards follow search and the Reviewed filter ----
  try {
    jcQuery = 'bravo'; drawJobCosting();
    check('TEST 3: search narrows to Bravo -- 50.0%', k().includes('50.0%') && k().includes('$20,000.00'), k());
    jcQuery = ''; jcReviewFilter = 'reviewed'; drawJobCosting();
    check('TEST 3: Reviewed only -> Alpha 40.0%', k().includes('40.0%') && k().includes('1 / 1'), k());
    jcReviewFilter = 'all';
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  console.log('\\n=== PASS (' + results.pass.length + ') ===');
  results.pass.forEach(p => console.log('  ok - ' + p));
  console.log('\\n=== FAIL (' + results.fail.length + ') ===');
  results.fail.forEach(f => console.log('  FAIL - ' + f));
  global.__TEST_FAIL_COUNT__ = results.fail.length;
})();
`;

try {
  (0, eval)(mainScript + '\n' + testLogic);
} catch (e) {
  console.log('FAIL setup:', e.stack);
  process.exit(1);
}

setTimeout(() => {
  process.exit(global.__TEST_FAIL_COUNT__ ? 1 : 0);
}, 1500);
