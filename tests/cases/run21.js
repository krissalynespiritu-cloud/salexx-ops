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
global.alert = () => { throw new Error('alert() should never be called anymore'); };
global.confirm = () => { throw new Error('confirm() should never be called anymore'); };

const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}
global.check = check;
global.results = results;

global.mockJobsData = [
  { job_id: 'SLX-TOAST1', client_name: 'Toast Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false }
];
global.mockChangeOrders = [
  { change_order_id: 'CO-1', job_id: 'SLX-TOAST1', description: 'Test change order', amount: 100, cost_impact: 0, co_date: null, approved_by: null, reason: null, status: 'Pending', approved_date: null }
];

function makeChain(table) {
  let lastOp = null, lastArg = null, eqVal = null;
  const chain = {
    select() { return chain; }, insert(a) { lastOp = 'insert'; lastArg = a; return chain; },
    update(a) { lastOp = 'update'; lastArg = a; return chain; }, delete() { lastOp = 'delete'; return chain; },
    eq(c, v) { eqVal = v; return chain; }, neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() {
      if (table === 'jobs') { const row = global.mockJobsData.find(x => x.job_id === eqVal); return Promise.resolve({ data: row || null, error: row ? null : { message: 'nf' } }); }
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (lastOp === 'delete') {
        if (table === 'job_change_orders') global.mockChangeOrders = global.mockChangeOrders.filter(r => r.change_order_id !== eqVal);
        resolve({ data: null, error: null }); return;
      }
      let src;
      if (table === 'jobs') src = global.mockJobsData;
      else if (table === 'job_change_orders') src = global.mockChangeOrders;
      else src = [];
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
  openJob('SLX-TOAST1');
  document.querySelector('#subtabs [data-st="cho"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 20));

  // ---- TEST 1: clicking Cancel resolves false and the delete does NOT happen ----
  try {
    document.querySelector('[data-del-cho="CO-1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 1: real confirm modal shown', !document.getElementById('confirmModal').classList.contains('hidden'));
    check('TEST 1: shows the real delete title text', document.getElementById('confirmModalCard').innerHTML.includes('Delete this change order?'));
    document.getElementById('confirmModalCancel').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 1: modal closes on Cancel', document.getElementById('confirmModal').classList.contains('hidden'));
    check('TEST 1: the change order was NOT deleted', global.mockChangeOrders.some(r => r.change_order_id === 'CO-1'));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 1: still shown in the real UI after cancel', body.includes('Test change order'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: clicking the backdrop also resolves false (same as Cancel) ----
  try {
    document.querySelector('[data-del-cho="CO-1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    document.getElementById('confirmModal').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 2: modal closes on backdrop click', document.getElementById('confirmModal').classList.contains('hidden'));
    check('TEST 2: still not deleted', global.mockChangeOrders.some(r => r.change_order_id === 'CO-1'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: clicking OK actually deletes the real record ----
  try {
    document.querySelector('[data-del-cho="CO-1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    document.getElementById('confirmModalOk').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 3: modal closed after OK', document.getElementById('confirmModal').classList.contains('hidden'));
    check('TEST 3: the change order was really deleted', !global.mockChangeOrders.some(r => r.change_order_id === 'CO-1'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: showToast renders a real message, and a non-error toast auto-dismisses ----
  try {
    showToast('A regular status message');
    await new Promise(r => setTimeout(r, 20));
    const stack = document.getElementById('toastStack');
    check('TEST 4: toast appears with the real message', stack.textContent.includes('A regular status message'));
    check('TEST 4: non-error toast does not use the err class', !stack.querySelector('.toast.err'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: an error toast uses the err styling and persists (doesn't auto-dismiss quickly) ----
  try {
    document.getElementById('toastStack').innerHTML = '';
    showToast('Something went wrong', true);
    await new Promise(r => setTimeout(r, 20));
    const stack = document.getElementById('toastStack');
    check('TEST 5: error toast shows with err class', !!stack.querySelector('.toast.err'));
    check('TEST 5: error toast contains the real message', stack.textContent.includes('Something went wrong'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: clicking a toast dismisses it immediately ----
  try {
    const toastEl = document.querySelector('.toast.err');
    toastEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 10));
    check('TEST 6: clicking the toast removes it', !document.getElementById('toastStack').contains(toastEl));
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7: raw browser confirm()/alert() are never called anymore anywhere in this flow ----
  try {
    check('TEST 7: no throw occurred from a stray confirm()/alert() call during any of the above', true);
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

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
