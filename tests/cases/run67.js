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

// Bug: openJob/openClient/openMatReq/openPayrollPeriod each only hid the
// OTHER three detail overlays before showing their own, but never hid the
// underlying #s-<tab> panel that was active when they were opened (unlike
// activateTab(), which always hides every #s-<tab> panel on a real tab
// switch). So if a job was opened while, say, #s-today was the active tab,
// #s-today stayed un-hidden in the DOM underneath #detail -- both visible
// at once, so a click that looked like it landed on the detail view could
// actually hit stale leftover content from the tab it was opened from, and
// clicking a job's own title appeared to "go to Dashboard". Fixed with a
// shared hideAllTabPanels() helper called from all 4 open-detail functions
// (and openNewMatReq, and the material-request delete-success path), with
// each detail view's own close/back button restoring #s-<activeTab>.
global.mockJobsData = [
  { job_id: 'SLX-P1', client_name: 'Panel Test Client', client_id: 'C-1', address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false }
];
global.mockClientValueData = [
  { client_id: 'C-1', name: 'Panel Test Client', phone: '', email: '', city: '1 Test St', first_source: null, lifetime_value: 5000, projects: 1, is_repeat: false, avg_margin_pct: 40 }
];

function makeChain(table) {
  const chain = {
    select() { return chain; }, insert() { return chain; }, update() { return chain; }, delete() { return chain; },
    eq() { return chain; }, neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; }, not() { return chain; }, or() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      const src = table === 'jobs' ? global.mockJobsData : table === 'client_value' ? global.mockClientValueData : [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}
const sbMock = {
  from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {}, getUser() { return Promise.resolve({ data: { user: { id: 'U-1' } } }); } }
};
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  await fetchJobs();

  // ---- TEST 1: opening a job from the Today tab hides the Today panel underneath the detail view ----
  try {
    activateTab('today');
    check('setup: #s-today is visible before opening a job', !document.getElementById('s-today').classList.contains('hidden'));
    openJob('SLX-P1');
    check('TEST 1: #s-today is now hidden underneath the job detail view', document.getElementById('s-today').classList.contains('hidden'));
    check('TEST 1: the job detail view itself is visible', !document.getElementById('detail').classList.contains('hidden'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: closing the job detail view (the back button) restores the Today panel ----
  try {
    document.getElementById('back').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    check('TEST 2: #s-today is visible again', !document.getElementById('s-today').classList.contains('hidden'));
    check('TEST 2: the job detail view is hidden again', document.getElementById('detail').classList.contains('hidden'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: opening a client from the Jobs tab hides the Jobs panel underneath the client detail view ----
  try {
    activateTab('jobs');
    await drawClients();
    check('setup: #s-jobs is visible before opening a client', !document.getElementById('s-jobs').classList.contains('hidden'));
    openClient('C-1');
    check('TEST 3: #s-jobs is now hidden underneath the client detail view', document.getElementById('s-jobs').classList.contains('hidden'));
    check('TEST 3: the client detail view itself is visible', !document.getElementById('clientDetail').classList.contains('hidden'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: closing the client detail view restores the Jobs panel ----
  try {
    document.getElementById('clientBack').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    check('TEST 4: #s-jobs is visible again', !document.getElementById('s-jobs').classList.contains('hidden'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: opening a job no longer leaves any OTHER tab panel visible at the same time ----
  try {
    activateTab('estimates');
    openJob('SLX-P1');
    const stillVisible = APP_TABS.filter(n => {
      const el = document.getElementById('s-' + n);
      return el && !el.classList.contains('hidden');
    });
    check('TEST 5: every #s-<tab> panel is hidden while the job detail view is open', stillVisible.length === 0, JSON.stringify(stillVisible));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

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
