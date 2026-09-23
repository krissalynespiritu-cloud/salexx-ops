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
  { job_id: 'SLX-P1', client_name: 'Project Workspace Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false },
  { job_id: 'SLX-P2', client_name: 'Other Client', client_id: null, address_city: '2 Test St', job_type: 'Siding', stage: 'Designs Sold', contract_price: 3000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-02-01', completed_date: null, monday_item_id: null, retired: false }
];
global.mockMaterialRequestSummary = [
  { job_id: 'SLX-P1', request_id: 'MR-1', project_type: 'Roofing', status: 'Ordered', line_count: 5, lines_filled: 5, lines_ordered: 5, lines_received: 0, invoice_count: 0, invoiced_total: 0, target_delivery_date: '2026-10-01' }
];
global.mockTasksData = [
  { task_id: 'T-P1A', title: 'Frame the roof', status: 'To-do', due_date: '2026-09-25', assignees: ['Luke'], progress: 0, priority: 'High', job_id: 'SLX-P1', notes: '' },
  { task_id: 'T-P2A', title: 'Task for other job', status: 'To-do', due_date: '2026-09-25', assignees: ['Kriss'], progress: 0, priority: 'Medium', job_id: 'SLX-P2', notes: '' }
];

function makeChain(table) {
  let lastOp = null, lastArg = null;
  const chain = {
    select() { return chain; },
    insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; },
    delete() { lastOp = 'delete'; return chain; },
    eq(col, val) { chain._eqCol = col; chain._eqVal = val; return chain; },
    neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() {
      if (lastOp === 'insert' || lastOp === 'update') {
        sbCallLog.push({ table, op: lastOp + '-single', arg: lastArg, eqVal: chain._eqVal });
        return Promise.resolve({ data: { ...(lastArg || {}), task_id: 'T-NEW' }, error: null });
      }
      return chain;
    },
    maybeSingle() { sbCallLog.push({ table, op: 'maybeSingle' }); return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (lastOp === 'delete') {
        sbCallLog.push({ table, op: 'delete', eqVal: chain._eqVal });
        if (table === 'tasks') global.mockTasksData = global.mockTasksData.filter(t => t.task_id !== chain._eqVal);
        resolve({ data: null, error: null }); return;
      }
      if (lastOp === 'update') {
        sbCallLog.push({ table, op: 'update', arg: lastArg, eqVal: chain._eqVal });
        if (table === 'tasks') { const t = global.mockTasksData.find(x => x.task_id === chain._eqVal); if (t) Object.assign(t, lastArg); }
        resolve({ data: null, error: null }); return;
      }
      if (lastOp === 'insert') {
        sbCallLog.push({ table, op: 'insert', arg: lastArg });
        if (table === 'tasks') global.mockTasksData.push({ task_id: 'T-NEW', ...lastArg });
        resolve({ data: null, error: null }); return;
      }
      sbCallLog.push({ table, op: 'select' });
      let src;
      if (table === 'jobs') src = global.mockJobsData;
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

  // ---- TEST 1: new subtab buttons exist on the job detail view ----
  try {
    check('TEST 1: Materials subtab button exists', !!document.querySelector('#subtabs [data-st="mtl"]'));
    check('TEST 1: Tasks subtab button exists', !!document.querySelector('#subtabs [data-st="tk"]'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: opening a job and switching to Materials shows real seeded material request data ----
  try {
    openJob('SLX-P1');
    const mtlBtn = document.querySelector('#subtabs [data-st="mtl"]');
    mtlBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 2: Materials tab shows the real seeded material request', body.includes('Roofing materials') && body.includes('Ordered'), body.slice(0,500));
    check('TEST 2: Materials tab reuses the real open-material-request link', body.includes('data-open-mr="MR-1"'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: switching to Tasks shows only THIS job's real seeded task, not other jobs' tasks ----
  try {
    const tkBtn = document.querySelector('#subtabs [data-st="tk"]');
    tkBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 3: Tasks tab shows this job\\'s real seeded task', body.includes('T-P1A') && body.includes('Frame the roof'));
    check('TEST 3: Tasks tab does NOT show a task from a different job', !body.includes('T-P2A'));
    check('TEST 3: New task button present with this job pre-targeted', body.includes('data-new-task="SLX-P1"'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: clicking a task card from the Tasks tab opens the real task modal with real data pre-filled ----
  try {
    const card = document.querySelector('[data-task-card="T-P1A"]');
    check('TEST 4 setup: task card rendered', !!card);
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 4: task modal opened', !document.getElementById('taskModal').classList.contains('hidden'));
    check('TEST 4: title field pre-filled with real task title', document.getElementById('taskModalTitle').value === 'Frame the roof');
    check('TEST 4: job select pre-filled with the correct job', document.getElementById('taskModalJob').value === 'SLX-P1');
    document.getElementById('taskModalClose').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: clicking "+ New task" opens a blank modal pre-targeted at this job ----
  try {
    const newBtn = document.querySelector('[data-new-task="SLX-P1"]');
    newBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 5: modal opened for a new task', !document.getElementById('taskModal').classList.contains('hidden'));
    check('TEST 5: title field is blank (new task, not edit)', document.getElementById('taskModalTitle').value === '');
    check('TEST 5: job select pre-selected to this job even though creating new', document.getElementById('taskModalJob').value === 'SLX-P1');
    document.getElementById('taskModalTitle').value = 'New roof task';
    document.getElementById('taskModalSave').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 5: new task was inserted with the pre-targeted job_id', sbCallLog.some(c => c.table === 'tasks' && c.op === 'insert' && c.arg.job_id === 'SLX-P1' && c.arg.title === 'New roof task'), JSON.stringify(sbCallLog.filter(c=>c.table==='tasks')));
    const bodyAfter = document.getElementById('dBody').innerHTML;
    check('TEST 5: the new task now appears in the job\\'s Tasks tab immediately (cache refreshed + redrawn)', bodyAfter.includes('New roof task'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: deleting a task from the job's Tasks tab removes it and re-renders correctly ----
  try {
    const delBtn = document.querySelector('[data-del-task="T-P1A"]');
    check('TEST 6 setup: delete button exists on the card', !!delBtn);
    delBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 6: real confirm modal shown before deleting', !document.getElementById('confirmModal').classList.contains('hidden'));
    document.getElementById('confirmModalOk').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const bodyAfterDelete = document.getElementById('dBody').innerHTML;
    check('TEST 6: deleted task no longer shown', !bodyAfterDelete.includes('T-P1A'));
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7: switching to a completely different job shows that job's own (empty) Materials/Tasks state ----
  try {
    openJob('SLX-P2');
    document.querySelector('#subtabs [data-st="tk"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 7: shows the OTHER job\\'s own task', body.includes('T-P2A'));
    document.querySelector('#subtabs [data-st="mtl"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const body2 = document.getElementById('dBody').innerHTML;
    check('TEST 7: shows empty-state for a job with no material requests', body2.includes('No material request for this job yet'));
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

  // ---- TEST 8: unrelated existing job detail tabs remain unaffected ----
  try {
    document.querySelector('#subtabs [data-st="ov"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 8: Overview tab still works', document.getElementById('dBody').innerHTML.length > 0);
    document.querySelector('#subtabs [data-st="co"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 8: Job Costing tab still works', document.getElementById('dBody').innerHTML.includes('Revenue breakdown'));
    check('TEST 8: Retire Job functions still present', typeof openRetireJobReview === 'function' && typeof confirmRetireJob === 'function');
  } catch (e) { check('TEST 8: no throw', false, e.stack); }

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
