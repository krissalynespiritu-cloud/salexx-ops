const fs = require('fs');
const path = require('path');

const domHtml = fs.readFileSync(path.join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(path.join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');

const { JSDOM } = require('jsdom');
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

// Tables in this set have their next write (insert/update/delete) fail with
// a real Postgrest-shaped error; reads always succeed from the seeded data.
global.mockFailTables = new Set();

global.mockJobsData = [];
global.mockTasksData = [{ task_id: 'TASK-1', title: 'Existing task', status: 'To-do', progress: 0, due_date: null, job_id: null, assignees: [] }];
global.mockWarrantyData = [{ claim_id: 'WC-1', job_id: null, client_name: 'Warranty Client', issue: 'Roof leak', status: 'Open', reported_date: '2026-01-01', resolved_date: null, labor_cost: 0, material_cost: 0, assignee: null, resolution: null }];
global.mockProfilesData = [{ user_id: 'U-1', full_name: 'Test User', role: 'Staff', initials: 'TU', avatar_color: null, job_title: null, crew_name: null }];

function makeChain(table) {
  let lastOp = null, lastArg = null, eqVal = null;
  const chain = {
    select() { return chain; },
    insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; },
    delete() { lastOp = 'delete'; return chain; },
    eq(col, val) { eqVal = val; return chain; },
    neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() {
      if (global.mockFailTables.has(table)) return Promise.resolve({ data: null, error: { message: 'Simulated ' + table + ' failure' } });
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (lastOp === 'insert' || lastOp === 'update' || lastOp === 'delete') {
        if (global.mockFailTables.has(table)) {
          resolve({ data: null, error: { message: 'Simulated ' + table + ' failure' } });
          return;
        }
        resolve({ data: null, error: null });
        return;
      }
      let src;
      if (table === 'jobs') src = global.mockJobsData;
      else if (table === 'tasks') src = global.mockTasksData;
      else if (table === 'warranty_claims') src = global.mockWarrantyData;
      else if (table === 'profiles') src = global.mockProfilesData;
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
  await drawTaskManagement();
  await drawWarranty();
  await drawTeam();

  // ---- TEST 1: updateTaskStatus surfaces a real error toast on failure, and does NOT optimistically change local state ----
  try {
    document.getElementById('toastStack').innerHTML = '';
    global.mockFailTables.add('tasks');
    const before = JSON.stringify(taskRows.find(t => t.task_id === 'TASK-1'));
    await updateTaskStatus('TASK-1', 'Completed');
    await new Promise(r => setTimeout(r, 10));
    const toastHtml = document.getElementById('toastStack').innerHTML;
    check('TEST 1: error toast shown with a real message', toastHtml.includes('Simulated tasks failure'), toastHtml);
    check('TEST 1: toast uses the error style', document.querySelector('.toast.err') !== null);
    const after = JSON.stringify(taskRows.find(t => t.task_id === 'TASK-1'));
    check('TEST 1: local task state left untouched after the failed write', before === after, before + ' vs ' + after);
    global.mockFailTables.delete('tasks');
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: the same action succeeds cleanly once the simulated failure is removed (confirms the mock itself, and that success still works) ----
  try {
    document.getElementById('toastStack').innerHTML = '';
    await updateTaskStatus('TASK-1', 'Completed');
    await new Promise(r => setTimeout(r, 10));
    check('TEST 2: no error toast when the write succeeds', document.getElementById('toastStack').innerHTML === '');
    check('TEST 2: local state updated on real success', taskRows.find(t => t.task_id === 'TASK-1').status === 'Completed');
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: addChangeOrder surfaces a real error toast and does not silently proceed ----
  try {
    document.getElementById('toastStack').innerHTML = '';
    global.mockFailTables.add('job_change_orders');
    await addChangeOrder('SLX-NOPE');
    await new Promise(r => setTimeout(r, 10));
    const toastHtml = document.getElementById('toastStack').innerHTML;
    check('TEST 3: error toast shown for a failed change order insert', toastHtml.includes('Simulated job_change_orders failure'), toastHtml);
    global.mockFailTables.delete('job_change_orders');
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: togglePunchItem surfaces a real error toast ----
  try {
    document.getElementById('toastStack').innerHTML = '';
    global.mockFailTables.add('job_punch_items');
    await togglePunchItem('PN-1', true);
    await new Promise(r => setTimeout(r, 10));
    check('TEST 4: error toast shown for a failed punch list update', document.getElementById('toastStack').innerHTML.includes('Simulated job_punch_items failure'));
    global.mockFailTables.delete('job_punch_items');
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: updateTeamRole surfaces a real error toast and leaves the role unchanged ----
  try {
    document.getElementById('toastStack').innerHTML = '';
    global.mockFailTables.add('profiles');
    const before = teamRows.find(p => p.user_id === 'U-1').role;
    await updateTeamRole('U-1', 'Owner');
    await new Promise(r => setTimeout(r, 10));
    check('TEST 5: error toast shown for a failed role update', document.getElementById('toastStack').innerHTML.includes('Simulated profiles failure'));
    check('TEST 5: role left unchanged after the failed write', teamRows.find(p => p.user_id === 'U-1').role === before);
    global.mockFailTables.delete('profiles');
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: deleteWarrantyClaim (behind a real confirm dialog) surfaces a real error toast and leaves the claim listed ----
  try {
    document.getElementById('toastStack').innerHTML = '';
    global.mockFailTables.add('warranty_claims');
    deleteWarrantyClaim('WC-1'); // not awaited -- pauses at the real confirm dialog
    await new Promise(r => setTimeout(r, 20));
    document.getElementById('confirmModalOk').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 6: error toast shown for a failed warranty claim delete', document.getElementById('toastStack').innerHTML.includes('Simulated warranty_claims failure'));
    check('TEST 6: claim still listed in the real UI after the failed delete', document.getElementById('warrantyList').innerHTML.includes('Roof leak'));
    global.mockFailTables.delete('warranty_claims');
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

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
