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
  { job_id: 'SLX-TL1', client_name: 'Timeline Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false },
  { job_id: 'SLX-TL2', client_name: 'Empty Timeline Client', client_id: null, address_city: '2 Test St', job_type: 'Siding', stage: 'Designs Sold', contract_price: 3000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-02-01', completed_date: null, monday_item_id: null, retired: false }
];
global.mockTimeEntries = [
  { job_id: 'SLX-TL1', person: 'Luke', work_date: '2026-03-05', hours: 8, kind: 'Job' },
  { job_id: 'SLX-TL2', person: 'Kriss', work_date: '2026-03-01', hours: 4, kind: 'Job' }
];
global.mockJobUpdates = [
  { job_id: 'SLX-TL1', author_name: 'Kriss', posted_at: '2026-03-06T10:00:00Z', body: 'Started tear-off today' }
];
global.mockPayments = [
  { job_id: 'SLX-TL1', amount: 2500, paid_on: '2026-03-02', method: 'Check', is_deposit: true }
];
global.mockVendorInvoices = [
  { job_id: 'SLX-TL1', vendor: 'ABC Supply', bill_date: '2026-03-04', total_amount: 1200, category: 'Materials' }
];
global.mockMaterialRequests = [
  { job_id: 'SLX-TL1', project_type: 'Roofing', submitted_at: '2026-03-01T00:00:00Z', ordered_at: '2026-03-03T00:00:00Z', received_at: null }
];

function makeChain(table) {
  let lastOp = null, lastArg = null, eqCol = null, eqVal = null;
  const chain = {
    select() { return chain; },
    insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; },
    delete() { lastOp = 'delete'; return chain; },
    eq(col, val) { eqCol = col; eqVal = val; chain._eqCol = col; chain._eqVal = val; return chain; },
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
      sbCallLog.push({ table, op: 'select', eqCol, eqVal });
      let src;
      const byJob = (rows) => eqCol === 'job_id' ? rows.filter(r => r.job_id === eqVal) : rows;
      if (table === 'jobs') src = global.mockJobsData;
      else if (table === 'time_entries') src = byJob(global.mockTimeEntries);
      else if (table === 'job_updates') src = byJob(global.mockJobUpdates);
      else if (table === 'payments') src = byJob(global.mockPayments);
      else if (table === 'vendor_invoices') src = byJob(global.mockVendorInvoices);
      else if (table === 'material_requests') src = byJob(global.mockMaterialRequests);
      else src = [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}

const sbMock = {
  from(table) { return makeChain(table); },
  rpc(name, args) { sbCallLog.push({ rpc: name, args }); if (name === 'job_dependency_counts') return Promise.resolve({ data: [{ total: 0 }], error: null }); return Promise.resolve({ data: [{ ok: true, message: 'Retired.', dep_total: 0 }], error: null }); },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} }
};
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  // Feature: "Delete…" on the job page itself, opening the same Retire /
  // permanent-delete review the Jobs list ⋮ menu uses, and closing the
  // job page once its job is gone.
  await fetchJobs();
  const wait = () => new Promise(r => setTimeout(r, 30));

  // ---- TEST 1: the job page has a Delete… button ----
  try {
    openJob('SLX-TL1'); await wait();
    const btn = document.getElementById('detailDeleteBtn');
    check('TEST 1: Delete… button on the job page', !!btn && btn.textContent.includes('Delete'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: it opens the retire/delete review for THIS job ----
  try {
    document.getElementById('detailDeleteBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait();
    check('TEST 2: review dialog opened', !document.getElementById('retireJobModal').classList.contains('hidden'));
    check('TEST 2: for the open job', retireJobId === 'SLX-TL1', retireJobId);
    check('TEST 2: dependency check ran first', sbCallLog.some(c => c.rpc === 'job_dependency_counts' && c.args.p_job_id === 'SLX-TL1'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: after retiring, the job page closes ----
  try {
    const reason = document.getElementById('retireJobReason');
    if (reason) { reason.value = 'duplicate'; }
    await confirmRetireJob(); await wait();
    check('TEST 3: retire_job called for the open job', sbCallLog.some(c => c.rpc === 'retire_job' && c.args.p_job_id === 'SLX-TL1'));
    check('TEST 3: job page closed', document.getElementById('detail').classList.contains('hidden'));
    check('TEST 3: cur cleared', cur === null);
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: retiring a different job leaves the open job page alone ----
  try {
    openJob('SLX-TL2'); await wait();
    closeDetailIfJob('SLX-TL1');
    check('TEST 4: other job page stays open', !document.getElementById('detail').classList.contains('hidden') && cur && cur.id === 'SLX-TL2');
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

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
