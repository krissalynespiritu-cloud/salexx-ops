const fs = require('fs');
const path = require('path');

const domHtml = fs.readFileSync(path.join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(path.join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');

const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!doctype html><html><body>${domHtml}</body></html>`, { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.MouseEvent = dom.window.MouseEvent;
global.Event = dom.window.Event;
global.navigator = dom.window.navigator;
global.location = dom.window.location;
global.alert = () => { throw new Error('alert() should never be called anymore'); };
global.confirm = () => { throw new Error('confirm() should never be called anymore'); };

const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}
global.check = check;
global.results = results;

global.mockFailTables = new Set();
global.mockJobsData = [
  { job_id: 'SLX-1', client_name: 'Costing Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false, costing_reviewed: false }
];

function makeChain(table) {
  let lastOp = null, lastArg = null, eqVal = null;
  const chain = {
    select() { return chain; },
    insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; },
    delete() { lastOp = 'delete'; return chain; },
    eq(col, val) { eqVal = val; return chain; },
    neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; }, upsert() { lastOp = 'upsert'; return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (lastOp === 'insert' || lastOp === 'update' || lastOp === 'delete' || lastOp === 'upsert') {
        if (global.mockFailTables.has(table)) {
          resolve({ data: null, error: { message: 'Simulated ' + table + ' failure' } });
          return;
        }
        resolve({ data: null, error: null });
        return;
      }
      let src = table === 'jobs' ? global.mockJobsData : [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}
const sbMock = { from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); }, auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} } };
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  await fetchJobs();

  // ---- TEST 1: deleting a material request item shows a real error toast and keeps the item listed ----
  try {
    curMatReq = { request_id: 'MR-1', job_id: 'SLX-1', project_type: 'Roofing', status: 'Draft', spec: {} };
    curMatItems = [{ item_id: 'MI-1', section: 'Materials', item_name: 'Shingles', quantity: null, unit: 'bundle', ordered: false, received: false, request_id: 'MR-1' }];
    curMatInvoices = [];
    document.getElementById('matReqDetail').classList.remove('hidden');
    renderMatReq();
    document.getElementById('toastStack').innerHTML = '';
    global.mockFailTables.add('material_request_items');
    await delMatItem('MI-1');
    await new Promise(r => setTimeout(r, 10));
    check('TEST 1: error toast shown', document.getElementById('toastStack').innerHTML.includes('Simulated material_request_items failure'));
    check('TEST 1: item still in local state after the failed delete', curMatItems.some(i => i.item_id === 'MI-1'));
    global.mockFailTables.delete('material_request_items');
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: a failed checkbox save shows a real inline error, not the misleading "Saved" message ----
  try {
    document.getElementById('mrStatus').textContent = '';
    global.mockFailTables.add('material_requests');
    await saveMatChk('flagged_for_pickup', true);
    await new Promise(r => setTimeout(r, 10));
    const status = document.getElementById('mrStatus').textContent;
    check('TEST 2: shows a real error, not "Saved"', status.startsWith('Error:'), status);
    global.mockFailTables.delete('material_requests');
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: deleting the whole material request fails safely -- stays open, real toast shown ----
  try {
    global.mockFailTables.add('material_requests');
    deleteMatReqRecord(); // not awaited -- pauses at the real confirm dialog
    await new Promise(r => setTimeout(r, 20));
    document.getElementById('confirmModalOk').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 3: error toast shown', document.getElementById('toastStack').innerHTML.includes('Simulated material_requests failure'));
    check('TEST 3: detail panel NOT closed after the failed delete', !document.getElementById('matReqDetail').classList.contains('hidden'));
    check('TEST 3: curMatReq NOT cleared after the failed delete', curMatReq !== null && curMatReq.request_id === 'MR-1');
    global.mockFailTables.delete('material_requests');
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: a failed "Reviewed" toggle shows a real toast AND reverts the checkbox's underlying state ----
  try {
    document.getElementById('toastStack').innerHTML = '';
    global.mockFailTables.add('jobs');
    const jrec = jobs.find(j => j.id === 'SLX-1');
    await toggleCostingReviewed('SLX-1', true);
    await new Promise(r => setTimeout(r, 10));
    check('TEST 4: error toast shown', document.getElementById('toastStack').innerHTML.includes('Simulated jobs failure'));
    check('TEST 4: reviewed flag reverted back to false after the failed write', jrec.reviewed === false, JSON.stringify(jrec.reviewed));
    global.mockFailTables.delete('jobs');
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: deleting a labor row from the Estimate Budget modal shows a real toast and keeps the row ----
  try {
    estBudgetData['EST-1'] = { labor: [{ estimate_id: 'EA-1', crew_name: 'Carlos', est_hours: 10, pay_rate: 20 }], mats: [], settings: {} };
    document.getElementById('toastStack').innerHTML = '';
    global.mockFailTables.add('job_labor_estimates');
    await delEaLaborRowEst('EST-1', 'EA-1');
    await new Promise(r => setTimeout(r, 10));
    check('TEST 5: error toast shown', document.getElementById('toastStack').innerHTML.includes('Simulated job_labor_estimates failure'));
    check('TEST 5: labor row still present after the failed delete', estBudgetData['EST-1'].labor.some(r => r.estimate_id === 'EA-1'));
    global.mockFailTables.delete('job_labor_estimates');
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: a failed follower-count save shows a real error toast ----
  try {
    document.getElementById('toastStack').innerHTML = '';
    global.mockFailTables.add('social_followers');
    await saveFollower('Instagram', '2026-01-01', 500);
    await new Promise(r => setTimeout(r, 10));
    check('TEST 6: error toast shown', document.getElementById('toastStack').innerHTML.includes('Simulated social_followers failure'));
    global.mockFailTables.delete('social_followers');
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- unrelated features remain unaffected ----
  try {
    check('unrelated: Retire Job functions still present', typeof openRetireJobReview === 'function' && typeof confirmRetireJob === 'function');
  } catch (e) { check('unrelated: no throw', false, e.stack); }

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
