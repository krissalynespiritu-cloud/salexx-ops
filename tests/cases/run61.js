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

// States audit, page 4 (Billing, Marketing Performance): Billing already
// captured its fetch error into billingErr but never actually checked it
// before rendering the KPI cards, so a failed job_payments fetch still
// showed $0 Outstanding / $0 Collected / "0 of 0 jobs paid in full" on the
// Billing page. Marketing Performance had a half-finished attempt (a wkErr
// field that was captured but never read anywhere) across its 5-way fetch.
global.mockJobsData = [];
global.mockFailTables = new Set();

function makeChain(table) {
  const chain = {
    select() { return chain; }, insert() { return chain; }, update() { return chain; }, delete() { return chain; },
    eq() { return chain; }, neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; }, not() { return chain; }, or() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (global.mockFailTables.has(table)) { resolve({ data: null, error: { message: 'Simulated ' + table + ' failure' } }); return; }
      const src = table === 'jobs' ? global.mockJobsData : [];
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

  // ---- TEST 1: Billing shows a real error, not $0 outstanding / $0 collected ----
  try {
    global.mockFailTables = new Set(['job_payments']);
    await drawBilling();
    const summary = document.getElementById('billingSummary').innerHTML;
    const list = document.getElementById('billingList').innerHTML;
    check('TEST 1: the KPI cards are cleared instead of showing $0', summary === '');
    check('TEST 1: the list shows a real error', list.includes("Couldn't load billing data"), list);
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: Billing recovers to its real empty state once the fetch succeeds ----
  try {
    global.mockFailTables = new Set();
    await drawBilling();
    const summary = document.getElementById('billingSummary').innerHTML;
    check('TEST 2: KPI cards render again with real ($0) data', summary.includes('Outstanding') && summary.includes('$0.00'));
    check('TEST 2: the list shows the real empty state', document.getElementById('billingList').innerHTML.includes('No jobs match.'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: Marketing Performance surfaces a toast on a failed fetch ----
  try {
    global.mockFailTables = new Set(['weekly_metrics']);
    perfData = null;
    await drawPerformance();
    await new Promise(r => setTimeout(r, 20));
    check('TEST 3: a real error toast fired', document.getElementById('toastStack').innerHTML.includes('Simulated weekly_metrics failure'));
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
}, 2000);
