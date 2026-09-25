const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const domHtml = fs.readFileSync(path.join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(path.join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');

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

// Feature: a task icon (matching the existing notes/updates icon pattern)
// on each Jobs list row, badged with the job's open-task count, that opens
// the real "create task" flow pre-linked to that job -- so a task can be
// created for a job without leaving the Jobs list.
global.mockJobsData = [
  { job_id: 'SLX-TK1', client_name: 'Tasked Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false },
  { job_id: 'SLX-TK2', client_name: 'Taskless Client', client_id: null, address_city: '2 Test St', job_type: 'Siding', stage: 'In Progress', contract_price: 4000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-02', completed_date: null, monday_item_id: null, retired: false }
];
global.mockTasksData = [
  { task_id: 'T-1', job_id: 'SLX-TK1', title: 'Order shingles', status: 'To-do' },
  { task_id: 'T-2', job_id: 'SLX-TK1', title: 'Schedule inspection', status: 'To-do' },
  { task_id: 'T-3', job_id: 'SLX-TK1', title: 'Old finished task', status: 'Completed' }
];

function makeChain(table) {
  const chain = {
    select() { return chain; }, insert() { return chain; }, update() { return chain; }, delete() { return chain; },
    eq() { return chain; }, neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; }, not() { return chain; }, or() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      const src = table === 'jobs' ? global.mockJobsData : table === 'tasks' ? global.mockTasksData : [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}
const sbMock = {
  from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {}, getUser() { return Promise.resolve({ data: { user: { id: 'U-1' } } }); } }
};
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  await fetchJobs();
  activateTab('jobs');
  drawJobs();

  // ---- TEST 1: a job with open tasks shows the task icon with a badge count ----
  try {
    const btn = document.querySelector('[data-new-task="SLX-TK1"]');
    check('TEST 1: the task button exists on the row', !!btn);
    check('TEST 1: it shows the open-task count (2), not the total including completed (3)', btn.innerHTML.includes('>2<'), btn.innerHTML);
    check('TEST 1: its title reflects 2 open tasks', btn.title.includes('2 open tasks'), btn.title);
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: a job with no tasks shows the icon with no badge ----
  try {
    const btn = document.querySelector('[data-new-task="SLX-TK2"]');
    check('TEST 2: the task button exists', !!btn);
    check('TEST 2: no count badge is shown', !/>\\d+</.test(btn.innerHTML), btn.innerHTML);
    check('TEST 2: its title says no tasks yet', btn.title.includes('No tasks yet'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: clicking it opens the real task-creation flow, pre-linked to that job ----
  try {
    document.querySelector('[data-new-task="SLX-TK2"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    check('TEST 3: the task modal opened', !document.getElementById('taskModal').classList.contains('hidden'));
    check('TEST 3: it is pre-linked to SLX-TK2', taskModalDefaultJobId === 'SLX-TK2');
    closeTaskModal();
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

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
