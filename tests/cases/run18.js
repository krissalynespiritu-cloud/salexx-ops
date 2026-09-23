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
  { job_id: 'SLX-P5A', client_name: 'Vendor Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false }
];
global.mockMaterialRequestSummary = [
  { request_id: 'MR-1', job_id: 'SLX-P5A', client_name: 'Vendor Client', client_id: null, project_type: 'Roofing', status: 'Ordered', submitted_at: '2026-03-01', target_delivery_date: null, line_count: 3, lines_filled: 3, lines_ordered: 3, lines_received: 0, invoice_count: 0, invoiced_total: 0 }
];
global.mockCrewAssignments = [
  { assignment_id: 'CA-1', job_id: 'SLX-P5A', person: 'Carlos', assignment_date: '2026-09-23', shift: 'Morning' }
];
global.nextJobId = null;

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
      if (table === 'jobs') {
        const row = global.mockJobsData.find(x => x.job_id === eqVal);
        return Promise.resolve({ data: row || null, error: row ? null : { message: 'not found' } });
      }
      if (table === 'clients' && lastOp === 'insert') {
        return Promise.resolve({ data: { client_id: 'CLIENT-NEW-' + Math.random().toString(36).slice(2, 8) }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (lastOp === 'delete') { sbCallLog.push({ table, op: 'delete', eqVal }); resolve({ data: null, error: null }); return; }
      if (lastOp === 'update') { sbCallLog.push({ table, op: 'update', arg: lastArg, eqVal }); resolve({ data: null, error: null }); return; }
      if (lastOp === 'insert') {
        sbCallLog.push({ table, op: 'insert', arg: lastArg });
        if (table === 'jobs') {
          global.nextJobId = lastArg.job_id;
          global.mockJobsData.push({ job_id: global.nextJobId, client_name: lastArg.client_name, client_id: null, address_city: null, job_type: lastArg.job_type || null, stage: lastArg.stage || 'Designs Sold', contract_price: lastArg.contract_price ?? null, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: null, completed_date: null, monday_item_id: null, retired: false, manager: lastArg.manager || null });
        }
        resolve({ data: null, error: null }); return;
      }
      sbCallLog.push({ table, op: 'select' });
      let src;
      if (table === 'jobs') src = global.mockJobsData;
      else if (table === 'material_request_summary') src = global.mockMaterialRequestSummary;
      else if (table === 'crew_assignments') src = global.mockCrewAssignments;
      else src = [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}

const sbMock = {
  from(table) { return makeChain(table); },
  rpc(name, args) { sbCallLog.push({ rpc: name, args }); return Promise.resolve({ data: [{ ok: true, message: 'ok' }], error: null }); },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {}, getUser() { return Promise.resolve({ data: { user: { id: 'U-TEST' } } }); } }
};
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  await fetchTodayAssignments();
  await fetchJobs();
  drawRoster();

  // ---- SLICE A: accepting an estimate carries estimator -> manager and notes -> a job update ----
  try {
    estRows.length = 0;
    estRows.push({ estimate_id: 'EST-1', client_name: 'New Estimate Client', job_type: 'Siding', amount: 4500, pipeline_status: 'Sent', client_id: null, lead_id: null, job_id: null, estimator: 'Alex', notes: 'Client wants premium shingles, confirmed on call 9/20.' });
    updateEstField('EST-1', 'pipeline_status', 'Accepted'); // not awaited -- it pauses at the real confirm dialog
    await new Promise(r => setTimeout(r, 20));
    document.getElementById('confirmModalOk').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const jobInsert = sbCallLog.find(c => c.table === 'jobs' && c.op === 'insert' && c.arg.client_name === 'New Estimate Client');
    check('SLICE A: job insert carries manager from estimator', jobInsert && jobInsert.arg.manager === 'Alex', JSON.stringify(jobInsert));
    const updateInsert = sbCallLog.find(c => c.table === 'job_updates' && c.op === 'insert');
    check('SLICE A: an initial job update is posted with the estimate notes', updateInsert && updateInsert.arg.body.includes('Client wants premium shingles'), JSON.stringify(updateInsert));
    check('SLICE A: job update is linked to the newly created job', updateInsert && updateInsert.arg.job_id === nextJobId, JSON.stringify({updateInsertJobId: updateInsert && updateInsert.arg.job_id, nextJobId}));
  } catch (e) { check('SLICE A: no throw', false, e.stack); }

  // ---- SLICE B: the Vendor Payables "Log an invoice" form now includes a material request selector, populated with real requests ----
  try {
    const clickTab = (tab) => document.querySelector('.sidebarLink[data-tab="' + tab + '"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    clickTab('vendorpay');
    await new Promise(r => setTimeout(r, 30));
    const sel = document.getElementById('newViMatReq');
    check('SLICE B: material request selector exists on the invoice form', !!sel);
    check('SLICE B: populated with the real seeded material request', sel.innerHTML.includes('SLX-P5A') && sel.innerHTML.includes('Roofing'), sel.innerHTML);
  } catch (e) { check('SLICE B: no throw', false, e.stack); }

  // ---- SLICE B: logging an invoice with a material request selected sends request_id, matching the pre-existing (previously inert) column name ----
  try {
    document.getElementById('newViVendor').value = 'ABC Supply';
    document.getElementById('newViMatReq').value = 'MR-1';
    document.getElementById('addViBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const viInsert = sbCallLog.find(c => c.table === 'vendor_invoices' && c.op === 'insert');
    check('SLICE B: invoice insert includes request_id (not material_request_id)', viInsert && viInsert.arg.request_id === 'MR-1', JSON.stringify(viInsert));
  } catch (e) { check('SLICE B: no throw', false, e.stack); }

  // ---- SLICE C: today's crew schedule assignment shows as a hint on the Time Entry roster ----
  try {
    const clickTab2 = (tab) => document.querySelector('.sidebarLink[data-tab="' + tab + '"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    clickTab2('labor');
    await new Promise(r => setTimeout(r, 20));
    const rosterHtml = document.getElementById('roster').innerHTML;
    check('SLICE C: Carlos shows a real "Scheduled: SLX-P5A AM" hint from the actual crew_assignments row', rosterHtml.includes('Scheduled: SLX-P5A AM'), rosterHtml.slice(0, 800));
    check('SLICE C: a person with no assignment today shows no hint', !rosterHtml.match(/Tito[\\s\\S]{0,40}Scheduled:/));
  } catch (e) { check('SLICE C: no throw', false, e.stack); }

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
}, 1200);
