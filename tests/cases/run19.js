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
  { job_id: 'SLX-GS1', client_name: 'Ferguson Roofing', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false }
];
global.mockClients = [
  { client_id: 'CL-1', name: 'Ferguson Family', active: true }
];
global.mockEstimates = [
  { estimate_id: 'EST-1', client_name: 'Ferguson Estimate Co', job_id: null }
];
global.mockVendorInvoices = [
  { invoice_id: 'VI-1', vendor: 'Ferguson Supply', job_id: null, total_amount: 850 }
];
global.mockTasksData = [
  { task_id: 'T-1', title: 'Call Ferguson about permit', job_id: null }
];

function makeChain(table) {
  let lastOp = null, lastArg = null, ilikeVal = null;
  const chain = {
    select() { return chain; },
    insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; },
    delete() { lastOp = 'delete'; return chain; },
    eq() { return chain; },
    neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike(col, pattern) { ilikeVal = pattern.replace(/%/g, '').toLowerCase(); return chain; },
    limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      sbCallLog.push({ table, op: 'select', ilikeVal });
      let src;
      const matchIlike = (rows, field) => ilikeVal ? rows.filter(r => (r[field] || '').toLowerCase().includes(ilikeVal)) : rows;
      if (table === 'jobs') src = global.mockJobsData;
      else if (table === 'clients') src = matchIlike(global.mockClients, 'name');
      else if (table === 'estimates') src = matchIlike(global.mockEstimates, 'client_name');
      else if (table === 'vendor_invoices') src = matchIlike(global.mockVendorInvoices, 'vendor');
      else if (table === 'tasks') src = matchIlike(global.mockTasksData, 'title');
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

  // ---- TEST 1: typing a query shows a loading state, then real cross-table results after the debounce ----
  try {
    document.getElementById('globalSearch').value = 'ferguson';
    document.getElementById('globalSearch').dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 1: shows a searching indicator immediately (before the debounced query resolves)', document.getElementById('globalSearchResults').innerHTML.includes('Searching'));
    await new Promise(r => setTimeout(r, 400));
    const body = document.getElementById('globalSearchResults').innerHTML;
    check('TEST 1: shows the real matching job', body.includes('Ferguson Roofing') && body.includes('· Job'));
    check('TEST 1: shows the real matching client', body.includes('Ferguson Family') && body.includes('>Client<'));
    check('TEST 1: shows the real matching estimate', body.includes('Ferguson Estimate Co') && body.includes('Estimate'));
    check('TEST 1: shows the real matching vendor invoice with its real amount', body.includes('Ferguson Supply') && body.includes('850.00'));
    check('TEST 1: shows the real matching task', body.includes('Call Ferguson about permit') && body.includes('>Task<'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: a query matching nothing anywhere shows an honest empty state, not a false positive ----
  try {
    document.getElementById('globalSearch').value = 'zzznomatch';
    document.getElementById('globalSearch').dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    check('TEST 2: shows a real no-matches message', document.getElementById('globalSearchResults').innerHTML.includes('No matches for'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: clicking a job result opens the real job and clears the search ----
  try {
    document.getElementById('globalSearch').value = 'ferguson';
    document.getElementById('globalSearch').dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    document.querySelector('[data-search-open="SLX-GS1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 3: real job detail opened', !document.getElementById('detail').classList.contains('hidden') && document.getElementById('dName').textContent === 'Ferguson Roofing');
    check('TEST 3: search box cleared after navigating', document.getElementById('globalSearch').value === '');
    check('TEST 3: results dropdown hidden after navigating', document.getElementById('globalSearchResults').classList.contains('hidden'));
    document.getElementById('back').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: clicking an estimate result navigates to the real Estimates tab ----
  try {
    document.getElementById('globalSearch').value = 'ferguson';
    document.getElementById('globalSearch').dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    const estBtn = document.querySelector('[data-search-open-tab="estimates"]');
    check('TEST 4 setup: estimate result button exists', !!estBtn);
    estBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 4: navigated to the real Estimates tab', !document.getElementById('s-estimates').classList.contains('hidden'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: an older in-flight query does not clobber a newer one (race guard) ----
  try {
    document.getElementById('globalSearch').value = 'zzznomatch';
    document.getElementById('globalSearch').dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    document.getElementById('globalSearch').value = 'ferguson';
    document.getElementById('globalSearch').dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 500));
    const body = document.getElementById('globalSearchResults').innerHTML;
    check('TEST 5: final results reflect the latest query, not a stale earlier one', body.includes('Ferguson Roofing') && !body.includes('No matches'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

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
}, 3500);
