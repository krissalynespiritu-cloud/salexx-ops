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

// States audit, page 2 (Jobs / job detail): the Payments tab, the Est. vs
// Actual tab, the Activity/Timeline tab, and the Material Request detail
// page all fetched data without checking for an error, so a failed query
// rendered as a confident empty state ("No payments recorded yet.", "Not
// found.") instead of a real error -- and Est. vs Actual's seeding logic
// would have tried to insert default rows on every failed load, mistaking
// the error for "no rows yet".
global.mockJobsData = [
  { job_id: 'SLX-ST1', client_name: 'States Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false }
];
global.mockFailTables = new Set();
global.mockMatReq = { request_id: 'MR-1', job_id: 'SLX-ST1', project_type: 'Roofing', status: 'Submitted' };
global.insertCallCount = { job_labor_estimates: 0, job_material_estimates: 0 };

function makeChain(table) {
  let lastOp = null;
  const chain = {
    select() { return chain; }, insert(arg) { lastOp = 'insert'; return chain; }, update() { return chain; }, delete() { return chain; },
    eq() { return chain; }, neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; }, not() { return chain; }, or() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    single() {
      if (global.mockFailTables.has(table)) return Promise.resolve({ data: null, error: { message: 'Simulated ' + table + ' failure' } });
      if (table === 'material_requests') return Promise.resolve({ data: global.mockMatReq, error: null });
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (global.mockFailTables.has(table)) { resolve({ data: null, error: { message: 'Simulated ' + table + ' failure' } }); return; }
      if (lastOp === 'insert') {
        if (table === 'job_labor_estimates' || table === 'job_material_estimates') global.insertCallCount[table]++;
        resolve({ data: [], error: null }); return;
      }
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
  cur = jobs.find(j => j.id === 'SLX-ST1');

  // ---- TEST 1: Payments tab shows a real error, not "No payments recorded yet." ----
  try {
    global.mockFailTables = new Set(['payments']);
    st = 'pay';
    await loadPayments();
    drawDetail();
    const html = document.getElementById('dBody').innerHTML;
    check('TEST 1: shows a real error', html.includes("Couldn't load payments"), html.slice(0, 400));
    check('TEST 1: does not show the misleading empty state', !html.includes('No payments recorded yet.'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: a later successful load recovers normally ----
  try {
    global.mockFailTables = new Set();
    await loadPayments();
    drawDetail();
    const html = document.getElementById('dBody').innerHTML;
    check('TEST 2: recovers to the real empty state once the fetch succeeds', html.includes('No payments recorded yet.'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: Est. vs Actual shows a real error and does NOT try to seed default rows ----
  try {
    global.mockFailTables = new Set(['job_labor_estimates']);
    global.insertCallCount.job_labor_estimates = 0;
    st = 'ea';
    await loadEstActual();
    drawDetail();
    const html = document.getElementById('dBody').innerHTML;
    check('TEST 3: shows a real error', html.includes("Couldn't load") , html.slice(0, 300));
    check('TEST 3: never tried to seed default labor rows on a failed fetch', global.insertCallCount.job_labor_estimates === 0);
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: a later successful load recovers and seeding still works when genuinely empty ----
  try {
    global.mockFailTables = new Set();
    await loadEstActual();
    drawDetail();
    check('TEST 4: no longer shows an error', !document.getElementById('dBody').innerHTML.includes("Couldn't load"));
    check('TEST 4: seeding ran now that the table is genuinely empty (no error)', global.insertCallCount.job_labor_estimates === 1);
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: Activity/Timeline surfaces a toast instead of silently showing "no activity" ----
  try {
    global.mockFailTables = new Set(['job_updates']);
    st = 'tl';
    await loadTimeline();
    await new Promise(r => setTimeout(r, 20));
    check('TEST 5: a real error toast fired', document.getElementById('toastStack').innerHTML.includes('Simulated job_updates failure'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: opening a Material Request shows a real error instead of a false "Not found." ----
  try {
    global.mockFailTables = new Set(['material_requests']);
    await openMatReq('MR-1');
    const html = document.getElementById('mrBody').innerHTML;
    check('TEST 6: shows a real error', html.includes("Couldn't load"), html);
    check('TEST 6: does not claim it was not found', !html.includes('Not found.'));
    global.mockFailTables = new Set();
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

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
