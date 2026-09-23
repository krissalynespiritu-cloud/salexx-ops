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
global.mockJobsData = [
  { job_id: 'SLX-CO1', client_name: 'CO Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 300, discounts: 100, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false }
];
global.mockChangeOrders = [
  { change_order_id: 'CO-1', job_id: 'SLX-CO1', description: 'Upgrade shingles', amount: 800, cost_impact: 600, co_date: '2026-03-01', approved_by: 'Kriss', reason: 'Client Request', status: 'Approved', approved_date: '2026-03-02' },
  { change_order_id: 'CO-2', job_id: 'SLX-CO1', description: 'Extra flashing', amount: 150, cost_impact: 100, co_date: '2026-03-05', approved_by: null, reason: '', status: 'Pending', approved_date: null }
];

function makeChain(table) {
  let lastOp = null, lastArg = null, eqVal = null;
  const chain = {
    select() { return chain; },
    insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; },
    delete() { lastOp = 'delete'; return chain; },
    eq(col, val) { eqVal = val; chain._eqCol = col; chain._eqVal = val; return chain; },
    neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() {
      sbCallLog.push({ table, op: 'select-single', eqVal });
      if (table === 'jobs') {
        const row = global.mockJobsData.find(x => x.job_id === eqVal);
        return Promise.resolve({ data: row || null, error: row ? null : { message: 'not found' } });
      }
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (lastOp === 'delete') {
        sbCallLog.push({ table, op: 'delete', eqVal });
        if (table === 'job_change_orders') global.mockChangeOrders = global.mockChangeOrders.filter(r => r.change_order_id !== eqVal);
        resolve({ data: null, error: null }); return;
      }
      if (lastOp === 'update') {
        sbCallLog.push({ table, op: 'update', arg: lastArg, eqVal });
        if (table === 'job_change_orders') { const r = global.mockChangeOrders.find(x => x.change_order_id === eqVal); if (r) Object.assign(r, lastArg); }
        resolve({ data: null, error: null }); return;
      }
      if (lastOp === 'insert') {
        sbCallLog.push({ table, op: 'insert', arg: lastArg });
        if (table === 'job_change_orders') global.mockChangeOrders.push({ change_order_id: 'CO-NEW', status: 'Pending', cost_impact: 0, reason: null, approved_by: null, approved_date: null, co_date: null, ...lastArg });
        resolve({ data: null, error: null }); return;
      }
      sbCallLog.push({ table, op: 'select' });
      let src;
      if (table === 'jobs') src = global.mockJobsData;
      else if (table === 'job_change_orders') src = global.mockChangeOrders;
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
  openJob('SLX-CO1');
  document.querySelector('#subtabs [data-st="cho"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 30));

  // ---- TEST 1: formula block shows real computed values (only Approved CO counted) ----
  try {
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 1: Original contract shown correctly', body.includes('5,000.00'));
    check('TEST 1: Approved change orders total only counts the Approved row (800, not 950)', body.includes('800.00') && !body.includes('950.00'));
    check('TEST 1: Discounts shown correctly', body.includes('100.00'));
    check('TEST 1: Current contract computed correctly (5000+800-100=5700)', body.includes('5,700.00'), body.slice(0,700));
    check('TEST 1: shows 1 pending note', body.includes('1 pending'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: both cards show all real extended fields pre-filled ----
  try {
    const reasonSelect = document.querySelector('[data-cho="reason"][data-cho-id="CO-1"]');
    check('TEST 2: reason pre-selected to Client Request', reasonSelect && reasonSelect.value === 'Client Request');
    const statusSelect = document.querySelector('[data-cho="status"][data-cho-id="CO-1"]');
    check('TEST 2: status pre-selected to Approved', statusSelect && statusSelect.value === 'Approved');
    const costImpactInput = document.querySelector('[data-cho="cost_impact"][data-cho-id="CO-1"]');
    check('TEST 2: cost_impact pre-filled with the real internal cost (600), distinct from amount (800)', costImpactInput && costImpactInput.value === '600');
    const approvedDateInput = document.querySelector('[data-cho="approved_date"][data-cho-id="CO-1"]');
    check('TEST 2: approved_date pre-filled', approvedDateInput && approvedDateInput.value === '2026-03-02');
    const pendingStatus = document.querySelector('[data-cho="status"][data-cho-id="CO-2"]');
    check('TEST 2: second CO correctly shows Pending', pendingStatus && pendingStatus.value === 'Pending');
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: adding a new change order inserts a sane default row ----
  try {
    document.querySelector('[data-add-cho="SLX-CO1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 3: insert sent with correct job_id and safe defaults', sbCallLog.some(c => c.table === 'job_change_orders' && c.op === 'insert' && c.arg.job_id === 'SLX-CO1' && c.arg.amount === 0), JSON.stringify(sbCallLog.filter(c=>c.table==='job_change_orders'&&c.op==='insert')));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 3: new card appears immediately', body.includes('data-cho-id="CO-NEW"'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: flipping status to Approved on the new (never-approved) row auto-sets approved_date ----
  try {
    const statusSelect = document.querySelector('[data-cho="status"][data-cho-id="CO-NEW"]');
    statusSelect.value = 'Approved';
    statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const updCall = sbCallLog.find(c => c.table === 'job_change_orders' && c.op === 'update' && c.eqVal === 'CO-NEW' && c.arg.status === 'Approved');
    check('TEST 4: status update sent', !!updCall);
    check('TEST 4: approved_date auto-set on the same update since it had none before', updCall && !!updCall.arg.approved_date, JSON.stringify(updCall));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 4: formula total now includes the newly-approved $0 change order (still 800, unchanged since amount is 0)', body.includes('800.00'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: editing amount on the approved new row updates the approved total shown ----
  try {
    document.querySelector('[data-cho="amount"][data-cho-id="CO-NEW"]').value = '200';
    document.querySelector('[data-cho="amount"][data-cho-id="CO-NEW"]').dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 5: approved total now reflects 800 + 200 = 1000.00', body.includes('1,000.00'), body.slice(0,700));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: deleting the pending change order removes it, formula unaffected (it was never counted) ----
  try {
    document.querySelector('[data-del-cho="CO-2"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    document.getElementById('confirmModalOk').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 6: deleted pending CO no longer shown', !body.includes('Extra flashing'));
    check('TEST 6: no longer shows a pending count', !body.includes('pending'));
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7: unrelated features remain unaffected ----
  try {
    document.querySelector('#subtabs [data-st="pnl"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 7: Punch List tab still works', document.getElementById('dBody').innerHTML.includes('No punch list items'));
    check('TEST 7: Retire Job functions still present', typeof openRetireJobReview === 'function' && typeof confirmRetireJob === 'function');
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

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
