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
  rpc(name, args) { sbCallLog.push({ rpc: name, args }); return Promise.resolve({ data: [{ ok: true, message: 'ok' }], error: null }); },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} }
};
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  await fetchJobs();

  // ---- TEST 1: new subtab button exists ----
  try {
    check('TEST 1: Timeline subtab button exists', !!document.querySelector('#subtabs [data-st="tl"]'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: opening a job with real events across all five sources shows them all, correctly sorted newest first ----
  try {
    openJob('SLX-TL1');
    document.querySelector('#subtabs [data-st="tl"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 2: shows the real labor event', body.includes('Luke logged 8.00h'));
    check('TEST 2: shows the real update event', body.includes('Started tear-off today'));
    check('TEST 2: shows the real payment event', body.includes('Deposit received') && body.includes('2,500'));
    check('TEST 2: shows the real vendor invoice event', body.includes('ABC Supply') && body.includes('1,200'));
    check('TEST 2: shows the real material submitted event', body.includes('Roofing materials submitted'));
    check('TEST 2: shows the real material ordered event', body.includes('Roofing materials ordered'));
    check('TEST 2: does NOT show a received event (received_at was null)', !body.includes('Roofing materials received'));
    check('TEST 2: does not fabricate a stage-change event and says so honestly', body.includes(\"Stage-change history isn't tracked yet\"));
    const dateIdx = {
      update: body.indexOf('2026-03-06'),
      invoice: body.indexOf('2026-03-04'),
      ordered: body.indexOf('2026-03-03'),
      labor: body.indexOf('2026-03-05'),
      payment: body.indexOf('2026-03-02'),
      submitted: body.indexOf('2026-03-01')
    };
    check('TEST 2: events sorted newest-first by real date (update 03-06, labor 03-05, invoice 03-04, ordered 03-03, payment 03-02, submitted 03-01)',
      dateIdx.update < dateIdx.labor && dateIdx.labor < dateIdx.invoice && dateIdx.invoice < dateIdx.ordered && dateIdx.ordered < dateIdx.payment && dateIdx.payment < dateIdx.submitted,
      JSON.stringify(dateIdx));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: a job with zero timeline events across all sources shows the honest empty state ----
  try {
    openJob('SLX-TL2');
    document.querySelector('#subtabs [data-st="tl"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 3: shows real Kriss labor event for its own job', body.includes('Kriss logged 4.00h'));
    check('TEST 3: does not show SLX-TL1 events (per-job scoping)', !body.includes('ABC Supply') && !body.includes('Started tear-off today'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: navigating away and back re-fetches fresh (currentTimeline reset per job) ----
  try {
    openJob('SLX-TL1');
    document.querySelector('#subtabs [data-st="tl"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 4: back on SLX-TL1, shows its own events again', body.includes('ABC Supply'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: unrelated features remain unaffected ----
  try {
    document.querySelector('#subtabs [data-st="ov"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 5: Overview tab still works', document.getElementById('dBody').innerHTML.length > 0);
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
