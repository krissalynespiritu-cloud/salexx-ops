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

// Feature: repeating tasks (100_task_repeat.sql). The app side: a Repeat
// picker in the task window (needs a due date), a "↻ Daily" label on the
// card, and reloading tasks after a repeating one is completed so the copy
// the database trigger created shows up straight away. The trigger itself
// is covered by tests/sql/task_repeat_test.sql.
global.mockTasks = [
  { task_id: 't1', title: "Report who's at the jobsites", status: 'To-do', priority: 'High', assignees: ['Alex'], due_date: '2026-10-01', progress: 0, repeat: 'daily' },
  { task_id: 't2', title: 'MONDAY: review wins/losses', status: 'To-do', priority: 'Medium', assignees: ['Alex'], due_date: '2026-09-28', progress: 0, repeat: 'weekly' },
  { task_id: 't3', title: 'One-off', status: 'To-do', priority: 'Low', assignees: ['Kriss'], due_date: null, progress: 0, repeat: null }
];
global.writes = [];
function makeChain(table) {
  let op = null, payload = null, idEq = null;
  const chain = {
    select() { return chain; }, order() { return chain; }, limit() { return chain; },
    eq(c, v) { idEq = v; return chain; },
    insert(p) { op = 'insert'; payload = p; return chain; },
    update(p) { op = 'update'; payload = p; return chain; },
    single() { return chain; }, maybeSingle() { return chain; },
    then(resolve) {
      if (table !== 'tasks') return resolve({ data: [], error: null });
      if (op === 'update') {
        global.writes.push({ op, id: idEq, payload });
        const t = global.mockTasks.find(x => x.task_id === idEq);
        // emulate the database trigger
        if (t && t.repeat && payload.status === 'Completed' && t.status !== 'Completed') {
          global.mockTasks.push({ ...t, task_id: 'next-' + t.task_id, status: 'To-do', progress: 0, due_date: '2026-10-02' });
          Object.assign(t, payload, { repeat: null });
        } else if (t) Object.assign(t, payload);
        return resolve({ data: null, error: null });
      }
      if (op === 'insert') { global.writes.push({ op, payload }); return resolve({ data: null, error: null }); }
      resolve({ data: global.mockTasks.map(x => ({ ...x })), error: null });
    }
  };
  return chain;
}
const sbMock = {
  from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [], error: null }); },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} }
};
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  const wait = () => new Promise(r => setTimeout(r, 30));
  activeTab = 'tasks';
  await drawTaskManagement(); await wait();

  // ---- TEST 1: cards show the repeat label ----
  try {
    const c1 = document.querySelector('[data-task-card="t1"].taskCard').textContent;
    const c2 = document.querySelector('[data-task-card="t2"].taskCard').textContent;
    const c3 = document.querySelector('[data-task-card="t3"].taskCard').textContent;
    check('TEST 1: daily label', c1.includes('↻ Daily'), c1);
    check('TEST 1: weekly label names the weekday', c2.includes('↻ Every Monday'), c2);
    check('TEST 1: one-off has no label', !c3.includes('↻'), c3);
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: task window has Repeat; it needs a due date; it saves ----
  try {
    openTaskModal('t1');
    const sel = document.getElementById('taskModalRepeat');
    check('TEST 2: Repeat picker shows the current value', sel && sel.value === 'daily', sel && sel.value);
    check('TEST 2: offers the 5 choices', sel && [...sel.options].map(o => o.value).join() === ',daily,weekdays,weekly,monthly');
    closeTaskModal();

    openTaskModal(null);
    document.getElementById('taskModalTitle').value = 'Post organic content';
    document.getElementById('taskModalRepeat').value = 'weekdays';
    await saveTaskModal();
    check('TEST 2: repeat without a due date is refused', document.getElementById('taskModalStatusMsg').textContent.includes('due date'), document.getElementById('taskModalStatusMsg').textContent);
    check('TEST 2: nothing was written', !global.writes.some(w => w.op === 'insert'));
    document.getElementById('taskModalDue').value = '2026-10-05';
    await saveTaskModal(); await wait();
    const ins = global.writes.find(w => w.op === 'insert');
    check('TEST 2: saved with repeat=weekdays', ins && ins.payload.repeat === 'weekdays' && ins.payload.due_date === '2026-10-05', JSON.stringify(ins));

    openTaskModal('t3');
    await saveTaskModal(); await wait();
    const up = global.writes.filter(w => w.op === 'update' && w.id === 't3').pop();
    check('TEST 2: "Doesn\\'t repeat" saves repeat=null', up && up.payload.repeat === null, JSON.stringify(up));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 4: before the migration, ordinary saves don't send repeat ----
  try {
    global.mockTasks.push({ task_id: 'old', title: 'Pre-migration task', status: 'To-do', priority: 'Low', assignees: [], due_date: null, progress: 0 });
    await refreshTaskCache();
    openTaskModal('old');
    await saveTaskModal(); await wait();
    const up = global.writes.filter(w => w.op === 'update' && w.id === 'old').pop();
    check('TEST 4: no repeat key when the column isn\\'t there and it\\'s not used', up && !('repeat' in up.payload), JSON.stringify(up));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 3: completing a repeating task shows the next copy straight away ----
  try {
    await updateTaskStatus('t1', 'Completed'); await wait();
    const next = taskRows.find(x => x.task_id === 'next-t1');
    check('TEST 3: next copy loaded into the board', !!next && next.status === 'To-do', JSON.stringify(taskRows.map(t => t.task_id)));
    check('TEST 3: next copy rendered', !!document.querySelector('[data-task-card="next-t1"]'));
    check('TEST 3: old one is Completed', taskRows.find(x => x.task_id === 't1').status === 'Completed');
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
