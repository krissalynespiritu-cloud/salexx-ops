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
global.mockJobsData = [];
const todayStr = '2026-09-22'; // matches system date used this session
global.mockTasksData = [
  { task_id: 'T-OVERDUE', title: 'Overdue task for Luke', status: 'To-do', due_date: '2026-09-10', assignees: ['Luke'], progress: 0, priority: 'Medium', job_id: null, notes: '' },
  { task_id: 'T-TODAY', title: 'Due today for Luke', status: 'In Progress', due_date: '2026-09-22', assignees: ['Luke'], progress: 40, priority: 'High', job_id: null, notes: '' },
  { task_id: 'T-UPCOMING', title: 'Future task for Luke', status: 'To-do', due_date: '2026-10-05', assignees: ['Luke'], progress: 0, priority: 'Low', job_id: null, notes: '' },
  { task_id: 'T-NODATE', title: 'No due date for Luke', status: 'To-do', due_date: null, assignees: ['Luke'], progress: 0, priority: 'Low', job_id: null, notes: '' },
  { task_id: 'T-DONE', title: 'Completed for Luke', status: 'Completed', due_date: '2026-09-01', assignees: ['Luke'], progress: 100, priority: 'Medium', job_id: null, notes: '' },
  { task_id: 'T-OTHER', title: 'Not assigned to Luke', status: 'To-do', due_date: '2026-09-10', assignees: ['Kriss'], progress: 0, priority: 'Medium', job_id: null, notes: '' }
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
    single() { return chain; },
    maybeSingle() { sbCallLog.push({ table, op: 'maybeSingle' }); return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (lastOp === 'delete') { sbCallLog.push({ table, op: 'delete', eqVal: chain._eqVal }); resolve({ data: null, error: null }); return; }
      if (lastOp === 'update') { sbCallLog.push({ table, op: 'update', arg: lastArg }); resolve({ data: null, error: null }); return; }
      if (lastOp === 'insert') { sbCallLog.push({ table, op: 'insert', arg: lastArg }); resolve({ data: null, error: null }); return; }
      sbCallLog.push({ table, op: 'select' });
      let src;
      if (table === 'jobs') src = global.mockJobsData;
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
  const clickTab = (tab) => {
    const btn = document.querySelector('.sidebarLink[data-tab="' + tab + '"]');
    if (!btn) throw new Error('no sidebar button for ' + tab);
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };

  await fetchJobs();

  // ---- TEST 1: sidebar and section exist ----
  try {
    check('TEST 1: My Tasks sidebar link exists', !!document.querySelector('.sidebarLink[data-tab="mytasks"]'));
    check('TEST 1: s-mytasks section exists', !!document.getElementById('s-mytasks'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: with no profile crew_name and no localStorage pick, defaults to the first TASK_PEOPLE entry (Luke), and buckets correctly ----
  try {
    check('TEST 2 setup: currentUserProfile is null (no crew_name)', currentUserProfile === null);
    clickTab('mytasks');
    await new Promise(r => setTimeout(r, 30));
    check('TEST 2: My Tasks section shown, Jobs hidden', !document.getElementById('s-mytasks').classList.contains('hidden') && document.getElementById('s-jobs').classList.contains('hidden'));
    check('TEST 2: defaulted to first TASK_PEOPLE entry (Luke)', myTasksPerson === 'Luke', myTasksPerson);
    const body = document.getElementById('myTasksBody').innerHTML;
    check('TEST 2: Overdue task for Luke rendered', body.includes('T-OVERDUE') && body.includes('Overdue task for Luke'));
    check('TEST 2: Today task for Luke rendered', body.includes('T-TODAY'));
    check('TEST 2: Upcoming task for Luke rendered', body.includes('T-UPCOMING'));
    check('TEST 2: no-due-date task for Luke bucketed into Upcoming (still shown)', body.includes('T-NODATE'));
    check('TEST 2: Completed task for Luke rendered', body.includes('T-DONE'));
    check('TEST 2: task assigned to someone else NOT shown', !body.includes('T-OTHER'));
    check('TEST 2: group counts shown correctly', body.includes('Overdue') && body.includes('(1)') && body.includes('Today') && body.includes('Completed'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: switching the person select re-filters to a different assignee ----
  try {
    const sel = document.getElementById('myTasksPersonSelect');
    check('TEST 3 setup: select has all TASK_PEOPLE as options', [...sel.options].map(o=>o.value).join(',') === TASK_PEOPLE.join(','));
    sel.value = 'Kriss';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 3: myTasksPerson updated to Kriss', myTasksPerson === 'Kriss');
    const body2 = document.getElementById('myTasksBody').innerHTML;
    check('TEST 3: now shows the task assigned to Kriss', body2.includes('T-OTHER'));
    check('TEST 3: no longer shows Luke-only tasks', !body2.includes('T-OVERDUE'));
    check('TEST 3: choice persisted to localStorage', localStorage.getItem('myTasksPerson') === 'Kriss');
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: navigating away and back preserves the selected person (via localStorage-backed myTasksPerson) ----
  try {
    clickTab('jobs');
    clickTab('mytasks');
    await new Promise(r => setTimeout(r, 30));
    check('TEST 4: still showing Kriss after navigating away and back', myTasksPerson === 'Kriss');
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: clicking a task card in My Tasks opens the real task modal (reuses existing card + click handler, not a duplicate) ----
  try {
    sel_reset: {
      const sel = document.getElementById('myTasksPersonSelect');
      sel.value = 'Luke'; sel.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 30));
    }
    const card = document.querySelector('[data-task-card="T-TODAY"]');
    check('TEST 5 setup: task card exists in My Tasks', !!card);
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 5: real task modal opened from a My Tasks card', !document.getElementById('taskModal').classList.contains('hidden'));
    document.getElementById('taskModalClose').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: restoreLastTab() correctly restores mytasks from localStorage ----
  try {
    localStorage.setItem('lastTab', 'mytasks');
    restoreLastTab();
    await new Promise(r => setTimeout(r, 30));
    check('TEST 6: restoreLastTab shows My Tasks section', !document.getElementById('s-mytasks').classList.contains('hidden'));
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7: Task Management board (the original feature) remains fully unaffected ----
  try {
    clickTab('tasks');
    await new Promise(r => setTimeout(r, 30));
    const boardHtml = document.getElementById('taskBoard').innerHTML;
    check('TEST 7: Task Management still renders all tasks across all people', boardHtml.includes('T-OTHER') && boardHtml.includes('T-OVERDUE'));
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

  // ---- TEST 8: unrelated features remain unaffected ----
  try {
    clickTab('teamscorecards');
    await new Promise(r => setTimeout(r, 30));
    check('TEST 8: Team Scorecards still works', !document.getElementById('s-teamscorecards').classList.contains('hidden'));
    clickTab('labor');
    await new Promise(r => setTimeout(r, 30));
    check('TEST 8: Labor still works', !document.getElementById('s-labor').classList.contains('hidden'));
    clickTab('datahealth');
    await new Promise(r => setTimeout(r, 30));
    check('TEST 8: Data Health still works', !document.getElementById('s-datahealth').classList.contains('hidden'));
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
  check('combined script evaluates without throwing', false, e.stack);
  console.log('\n=== FAIL (' + results.fail.length + ') ===');
  results.fail.forEach(f => console.log('  FAIL - ' + f));
  process.exit(1);
}

setTimeout(() => {
  process.exit(global.__TEST_FAIL_COUNT__ ? 1 : 0);
}, 1000);
