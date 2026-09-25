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

// States audit, page 3 (Labor/Payroll, Subcontractors, Clients duplicate
// check, Overhead, Estimates budget modal, Marketing/FB Ads): the same
// silent-failure pattern -- a failed fetch rendering as a confident empty
// state instead of a real error. Duplicate-client detection is the highest
// stakes of these: per CLAUDE.md, a failed check must never be presented as
// "no duplicates found", since that's a false claim of a clean data audit.
global.mockJobsData = [];
global.mockEstimatesData = [
  { estimate_id: 'EST-1', client_name: 'Budget Client', pipeline_status: 'Sent', requested_date: '2026-01-01', amount: 1000 }
];
global.mockFailTables = new Set();

function makeChain(table) {
  let lastOp = null;
  const chain = {
    select() { return chain; }, insert(arg) { lastOp = 'insert'; return chain; }, update() { return chain; }, delete() { return chain; },
    eq() { return chain; }, neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; }, not() { return chain; }, or() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    single() {
      if (global.mockFailTables.has(table)) return Promise.resolve({ data: null, error: { message: 'Simulated ' + table + ' failure' } });
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (global.mockFailTables.has(table)) { resolve({ data: null, error: { message: 'Simulated ' + table + ' failure' } }); return; }
      if (lastOp === 'insert') { resolve({ data: [], error: null }); return; }
      const src = table === 'jobs' ? global.mockJobsData : table === 'estimates' ? global.mockEstimatesData : [];
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

  // ---- TEST 1: Payroll shows a real error, not a $0 week ----
  try {
    global.mockFailTables = new Set(['time_entries']);
    await drawPayroll();
    const html = document.getElementById('payrollList').innerHTML;
    check('TEST 1: shows a real error', html.includes("Couldn't load payroll"), html);
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: Subcontractors list shows a real error, not "No subcontractors yet." ----
  try {
    global.mockFailTables = new Set(['subcontractors']);
    await drawSubs();
    const html = document.getElementById('subsList').innerHTML;
    check('TEST 2: shows a real error', html.includes("Couldn't load subcontractors"), html);
    check('TEST 2: does not show the misleading empty state', !html.includes('No subcontractors yet.'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: Subcontractor contracts/payments show a real error too ----
  try {
    global.mockFailTables = new Set(['sub_payments']);
    await drawSubs();
    const html = document.getElementById('subPaymentsList').innerHTML;
    check('TEST 3: shows a real error', html.includes("Couldn't load contracts"), html);
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: a failed duplicate-client check is never shown as "no duplicates found" ----
  try {
    global.mockFailTables = new Set(['clients']);
    await loadAndRenderDuplicateClients();
    const html = document.getElementById('dupClientsPanel').innerHTML;
    check('TEST 4: shows a real error', html.includes("Couldn't check for duplicates"), html);
    check('TEST 4: explicitly says this is not a clean result', html.includes('not "no duplicates found"'));
    check('TEST 4: does not claim 0 groups were found', !html.includes('Found <b>0</b>'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: Overhead shows a real error, not $0/blank KPIs ----
  try {
    global.mockFailTables = new Set(['overhead_expenses']);
    await drawOverhead();
    const html = document.getElementById('ohTable').innerHTML;
    check('TEST 5: shows a real error', html.includes("Couldn't load overhead"), html);
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: FB Ads shows a real error, not $0 spend ----
  try {
    global.mockFailTables = new Set(['ad_performance']);
    await drawFbAds();
    const html = document.getElementById('adTable').innerHTML;
    check('TEST 6: shows a real error', html.includes("Couldn't load ad performance"), html);
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7: Estimate budget modal shows a real error and skips the default-row seeding ----
  try {
    global.mockFailTables = new Set();
    await drawEstimates();
    global.mockFailTables = new Set(['job_labor_estimates']);
    openEstBudgetModal('EST-1');
    await new Promise(r => setTimeout(r, 20));
    const html = document.getElementById('estBudgetModalCard').innerHTML;
    check('TEST 7: shows a real error', html.includes("Couldn't load"), html);
    closeEstBudgetModal();
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

  // ---- TEST 8: everything recovers normally once fetches succeed again ----
  try {
    global.mockFailTables = new Set();
    await drawSubs();
    await drawOverhead();
    check('TEST 8: subcontractors recovers to its real empty state', document.getElementById('subsList').innerHTML.includes('No subcontractors yet.'));
    check('TEST 8: overhead recovers to its real empty state', document.getElementById('ohTable').innerHTML.includes('No line items.'));
  } catch (e) { check('TEST 8: no throw', false, e.stack); }

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
