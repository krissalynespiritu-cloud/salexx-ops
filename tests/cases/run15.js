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
// Today is 2026-09-23 per the system clock
global.mockJobsData = [
  // Healthy: priced, reviewed, no punch items, no pending COs, no permit needed, no overdue tasks
  { job_id: 'SLX-H1', client_name: 'Healthy Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false, permit_required: false, costing_reviewed: true },
  // Attention: unpriced (no cost data), open punch item, pending CO
  { job_id: 'SLX-A1', client_name: 'Attention Client', client_id: null, address_city: '2 Test St', job_type: 'Siding', stage: 'In Progress', contract_price: 3000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-02-01', completed_date: null, monday_item_id: null, retired: false, permit_required: false },
  // At Risk: overdue task
  { job_id: 'SLX-R1', client_name: 'At Risk Client', client_id: null, address_city: '3 Test St', job_type: 'Paint', stage: 'In Progress', contract_price: 2000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-03-01', completed_date: null, monday_item_id: null, retired: false, permit_required: false, costing_reviewed: true },
  // On hold -> At Risk
  { job_id: 'SLX-OH1', client_name: 'On Hold Client', client_id: null, address_city: '4 Test St', job_type: 'Deck', stage: 'Project on hold', contract_price: 1500, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-04-01', completed_date: null, monday_item_id: null, retired: false, permit_required: false, costing_reviewed: true },
  // Priced but no labor logged -> "incomplete", distinct from "no cost data at all"
  { job_id: 'SLX-IC1', client_name: 'Incomplete Costing Client', client_id: null, address_city: '5 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 4000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-05-01', completed_date: null, monday_item_id: null, retired: false, permit_required: false, costing_reviewed: false }
];
global.mockPunchItems = [
  { punch_item_id: 'PI-1', job_id: 'SLX-A1', description: 'Fix trim', done: false, created_at: '2026-03-01T00:00:00Z' }
];
global.mockChangeOrders = [
  { change_order_id: 'CO-1', job_id: 'SLX-A1', description: 'Upgrade', amount: 200, cost_impact: 100, co_date: '2026-03-01', status: 'Pending' }
];
global.mockPermits = [];
global.mockMaterialRequestSummary = [];
global.mockTasksData = [
  { task_id: 'T-1', job_id: 'SLX-R1', title: 'Overdue thing', status: 'To-do', due_date: '2026-09-01', assignees: ['Luke'], progress: 0, priority: 'High', notes: '' }
];
global.mockJobMargins = [
  { job_id: 'SLX-H1', revenue: 5000, labor_cost: 1000, material_cost: 500, margin_pct: 55, total_job_cost: 2250, gross_profit: 2750, hours: 20, unpriced: false },
  { job_id: 'SLX-A1', revenue: 3000, labor_cost: 0, material_cost: 0, margin_pct: null, total_job_cost: 0, gross_profit: null, hours: 0, unpriced: true },
  { job_id: 'SLX-R1', revenue: 2000, labor_cost: 400, material_cost: 200, margin_pct: 55, total_job_cost: 900, gross_profit: 1100, hours: 10, unpriced: false },
  { job_id: 'SLX-OH1', revenue: 1500, labor_cost: 300, material_cost: 150, margin_pct: 55, total_job_cost: 675, gross_profit: 825, hours: 8, unpriced: false },
  { job_id: 'SLX-IC1', revenue: 4000, labor_cost: 0, material_cost: 300, margin_pct: null, total_job_cost: 300, gross_profit: null, hours: 0, unpriced: false }
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
      if (table === 'jobs') {
        const row = global.mockJobsData.find(x => x.job_id === eqVal);
        return Promise.resolve({ data: row || null, error: row ? null : { message: 'not found' } });
      }
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      sbCallLog.push({ table, op: 'select' });
      let src;
      if (table === 'jobs') src = global.mockJobsData;
      else if (table === 'job_margins') src = global.mockJobMargins;
      else if (table === 'job_punch_items') src = global.mockPunchItems;
      else if (table === 'job_change_orders') src = global.mockChangeOrders;
      else if (table === 'job_permits') src = global.mockPermits;
      else if (table === 'material_request_summary') src = global.mockMaterialRequestSummary;
      else if (table === 'tasks') src = global.mockTasksData;
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

  // ---- TEST 1: a fully clean job shows Healthy with no issues ----
  try {
    openJob('SLX-H1');
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 1: shows Healthy badge', body.includes('>Healthy<'), body.slice(0,600));
    check('TEST 1: shows the no-issues message', body.includes('No open issues found'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: a job with real unpriced/punch/pending-CO issues shows Attention with the real specific items ----
  try {
    openJob('SLX-A1');
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 2: shows Attention badge', body.includes('>Attention<'), body.slice(0,600));
    check('TEST 2: lists the real punch list issue', body.includes('1 punch list item still open'));
    check('TEST 2: lists the real pending change order issue', body.includes('1 change order awaiting approval'));
    check('TEST 2: unpriced job correctly shows "No cost data logged yet", not "incomplete"', body.includes('No cost data logged yet'), body.slice(0,700));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: a job with an overdue task shows At Risk ----
  try {
    openJob('SLX-R1');
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 3: shows At Risk badge', body.includes('>At Risk<'), body.slice(0,600));
    check('TEST 3: lists the real overdue task issue', body.includes('1 overdue task'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: a job on hold shows At Risk with the real reason ----
  try {
    openJob('SLX-OH1');
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 4: shows At Risk badge for on-hold job', body.includes('>At Risk<'));
    check('TEST 4: lists the on-hold reason', body.includes('Project is on hold'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 4b: priced job with no labor logged shows "incomplete", distinct from "no cost data" ----
  try {
    openJob('SLX-IC1');
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 4b: shows Attention badge', body.includes('>Attention<'));
    check('TEST 4b: shows "Costing incomplete", not "No cost data"', body.includes('Costing incomplete') && !body.includes('No cost data logged yet'), body.slice(0,700));
  } catch (e) { check('TEST 4b: no throw', false, e.stack); }

  // ---- TEST 5: health block only appears on Overview, not other tabs ----
  try {
    openJob('SLX-H1');
    document.querySelector('#subtabs [data-st="co"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 5: health block not shown on Job Costing tab', !body.includes('Project Health'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: unrelated features remain unaffected ----
  try {
    check('TEST 6: Retire Job functions still present', typeof openRetireJobReview === 'function' && typeof confirmRetireJob === 'function');
    check('TEST 6: costingComplete still works as before', typeof costingComplete === 'function');
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
}, 1000);
