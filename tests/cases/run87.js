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
    insert(arg) { lastOp = 'insert'; lastArg = arg; sbCallLog.push({ table, op: 'insert', arg }); return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; sbCallLog.push({ table, op: 'update', arg }); return chain; },
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
  // Feature: rename a job from its own page (and the Jobs list), changing
  // only the job's name -- never creating a client or changing the link.
  await fetchJobs();
  const wait = () => new Promise(r => setTimeout(r, 30));
  const click = id => document.getElementById(id).dispatchEvent(new MouseEvent('click', { bubbles: true }));

  // ---- TEST 1: Rename button opens an editor with the current name ----
  try {
    openJob('SLX-TL1'); await wait();
    check('TEST 1: Rename button on the job page', !!document.getElementById('dRenameBtn'));
    click('dRenameBtn');
    check('TEST 1: editor shown, title hidden', document.getElementById('dRename').style.display === 'flex' && document.getElementById('dName').style.display === 'none');
    check('TEST 1: prefilled with the current name', document.getElementById('dRenameInput').value === 'Timeline Client');
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: saving updates only client_name -- no client created, link untouched ----
  try {
    sbCallLog.length = 0;
    document.getElementById('dRenameInput').value = '  Timeline Client (Deck)  ';
    await saveRenameJob(); await wait();
    const upd = sbCallLog.find(c => c.table === 'jobs' && c.op === 'update');
    check('TEST 2: jobs updated with the trimmed name', upd && upd.arg.client_name === 'Timeline Client (Deck)', JSON.stringify(upd));
    check('TEST 2: only the name is sent (no client_id / needs_review)', upd && Object.keys(upd.arg).join() === 'client_name', JSON.stringify(upd && upd.arg));
    check('TEST 2: no client record created', !sbCallLog.some(c => c.table === 'clients' && c.op === 'insert'));
    check('TEST 2: editor closed', document.getElementById('dRename').style.display === 'none' && document.getElementById('dName').style.display === '');
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: empty name refused; Escape cancels ----
  try {
    sbCallLog.length = 0;
    click('dRenameBtn');
    document.getElementById('dRenameInput').value = '   ';
    await saveRenameJob(); await wait();
    check('TEST 3: blank name not saved', !sbCallLog.some(c => c.table === 'jobs' && c.op === 'update'));
    document.getElementById('dRenameInput').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    check('TEST 3: Escape closes the editor', document.getElementById('dRename').style.display === 'none');
    check('TEST 3: Escape did not close the job page', !document.getElementById('detail').classList.contains('hidden'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: Jobs list rename follows the same rule ----
  try {
    sbCallLog.length = 0;
    await saveJobField('SLX-TL2', 'client_name', 'Empty Timeline Client 2'); await wait();
    const upd = sbCallLog.find(c => c.table === 'jobs' && c.op === 'update');
    check('TEST 4: list rename sends only the name', upd && Object.keys(upd.arg).join() === 'client_name', JSON.stringify(upd && upd.arg));
    check('TEST 4: no client created for an unlinked job', !sbCallLog.some(c => c.table === 'clients' && c.op === 'insert'));
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
