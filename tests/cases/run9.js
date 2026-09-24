const { JSDOM } = require('jsdom');
const fs = require('fs');

const domHtml = fs.readFileSync(require('path').join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(require('path').join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');

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

const sbCallLog = [];
global.sbCallLog = sbCallLog;

// Job A: everything green -- all milestones done, no punch items, all materials received, zero balance
global.mockJobsData = [
  { job_id: 'SLX-CL1', client_name: 'Ready to Close Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'Review Requested', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false,
    final_walkthrough_done: true, final_payment_done: true, final_photos_done: true, review_requested_done: true },
  { job_id: 'SLX-CL2', client_name: 'Not Ready Client', client_id: null, address_city: '2 Test St', job_type: 'Siding', stage: 'In Progress', contract_price: 3000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-02-01', completed_date: null, monday_item_id: null, retired: false,
    final_walkthrough_done: false, final_payment_done: false, final_photos_done: false, review_requested_done: false }
];
global.mockPunchItems = [
  { punch_item_id: 'PI-1', job_id: 'SLX-CL2', description: 'Fix trim', done: false, created_at: '2026-03-01T00:00:00Z' }
];
global.mockMaterialRequestSummary = [
  { job_id: 'SLX-CL1', request_id: 'MR-1', project_type: 'Roofing', status: 'Received', line_count: 3, lines_filled: 3, lines_ordered: 3, lines_received: 3, invoice_count: 0, invoiced_total: 0, target_delivery_date: null },
  { job_id: 'SLX-CL2', request_id: 'MR-2', project_type: 'Siding', status: 'Ordered', line_count: 3, lines_filled: 3, lines_ordered: 3, lines_received: 0, invoice_count: 0, invoiced_total: 0, target_delivery_date: null }
];
global.mockJobPayments = {
  'SLX-CL1': { job_id: 'SLX-CL1', balance_due: 0 },
  'SLX-CL2': { job_id: 'SLX-CL2', balance_due: 1200 }
};

function makeChain(table) {
  let lastOp = null, lastArg = null, eqVal = null;
  const chain = {
    select() { return chain; },
    insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; },
    delete() { lastOp = 'delete'; return chain; },
    eq(col, val) { chain._eqCol = col; chain._eqVal = val; eqVal = val; return chain; },
    neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() {
      sbCallLog.push({ table, op: 'select-single', eqVal });
      if (table === 'job_payments') {
        const row = global.mockJobPayments[eqVal];
        return Promise.resolve({ data: row || null, error: row ? null : { message: 'not found' } });
      }
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() { sbCallLog.push({ table, op: 'maybeSingle' }); return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      sbCallLog.push({ table, op: 'select' });
      let src;
      if (table === 'jobs') src = global.mockJobsData;
      else if (table === 'job_punch_items') src = global.mockPunchItems;
      else if (table === 'material_request_summary') src = global.mockMaterialRequestSummary;
      else src = [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}

const sbMock = {
  from(table) { return makeChain(table); },
  rpc(name, args) { sbCallLog.push({ rpc: name, args }); return Promise.resolve({ data: [{ ok: true, message: 'ok' }], error: null }); },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} }
};
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  await fetchJobs();

  // ---- TEST 1: the standalone Closeout subtab was folded into Overview ----
  try {
    check('TEST 1: Closeout subtab button no longer exists on its own', !document.querySelector('#subtabs [data-st="clo"]'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: a fully-ready job shows all green checks and the "ready" banner (now on Overview), after the async balance-due fetch resolves ----
  try {
    openJob('SLX-CL1');
    document.querySelector('#subtabs [data-st="ov"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 2: shows ready banner', body.includes('ready to mark Completed'), body.slice(0,500));
    check('TEST 2: Final Walkthrough shows Done', body.includes('Final Walkthrough') && body.includes('Done'));
    check('TEST 2: Punch list shows none logged', body.includes('None logged'));
    check('TEST 2: Materials shows all received', body.includes('All received'));
    check('TEST 2: Balance due shows $0', body.includes('outstanding') && body.includes('0.00'), body);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: a not-ready job shows real blockers pulled from real data, not the ready banner ----
  try {
    openJob('SLX-CL2');
    document.querySelector('#subtabs [data-st="ov"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 3: does NOT show ready banner', !body.includes('ready to mark Completed'));
    check('TEST 3: Final Walkthrough shows Not yet', body.includes('Not yet'));
    check('TEST 3: Punch list shows the real open item count', body.includes('1 of 1 still open'));
    check('TEST 3: Materials shows the real not-received count', body.includes('1 request not yet Received'));
    check('TEST 3: Balance due shows the real $1,200 outstanding', body.includes('1,200') && body.includes('outstanding'), body);
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: switching jobs correctly re-fetches balance due for the newly opened job (no stale cache leak) ----
  try {
    openJob('SLX-CL1');
    document.querySelector('#subtabs [data-st="ov"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 4: back on SLX-CL1, shows its own $0 balance again, not SLX-CL2\\'s $1,200', body.includes('0.00') && !body.includes('1,200'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: unrelated features remain unaffected ----
  try {
    document.querySelector('#subtabs [data-st="pnl"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 5: Punch List tab still works', document.getElementById('dBody').innerHTML.includes('No punch list items'));
    check('TEST 5: Retire Job functions still present', typeof openRetireJobReview === 'function' && typeof confirmRetireJob === 'function');
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
}, 1000);
