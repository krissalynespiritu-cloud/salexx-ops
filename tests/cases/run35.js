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
global.alert = () => {};
global.confirm = () => true;

const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}
global.check = check;
global.results = results;

global.mockJobsData = [];
global.mockTasksData = [
  { task_id: 'T-OVERDUE', title: 'Overdue task', status: 'To-do', due_date: '2020-01-01', assignees: ['Luke'], job_id: null, priority: 'Medium', progress: 0 }
];

function makeChain(table) {
  const chain = {
    select() { return chain; }, insert() { return chain; }, update() { return chain; }, delete() { return chain; },
    eq() { return chain; }, neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      let src = table === 'tasks' ? global.mockTasksData : (table === 'jobs' ? global.mockJobsData : []);
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

  // ---- TEST 1: each empty column on My Tasks gets its own contextual message, not a repeated generic one ----
  try {
    myTasksPerson = 'Someone With No Tasks At All';
    await drawTaskManagement();
    await new Promise(r => setTimeout(r, 20));
    renderMyTasksBody();
    const body = document.getElementById('myTasksBody').innerHTML;
    check('TEST 1: Overdue column has its own contextual empty message', body.includes("Nothing overdue — you're on track."));
    check('TEST 1: Today column has its own contextual empty message', body.includes('No tasks due today.'));
    check('TEST 1: Upcoming column has its own contextual empty message', body.includes('Nothing scheduled yet.'));
    check('TEST 1: Completed column has its own contextual empty message', body.includes('No completed tasks yet.'));
    check('TEST 1: the old generic repeated message is gone', !body.includes('Nothing here.'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: a genuinely empty column renders as a lightweight inline message with no gray-panel/.taskCol wrapper at all ----
  try {
    const cols = document.querySelectorAll('#myTasksBody .taskCol');
    check('TEST 2: no .taskCol boxes are rendered when every group is empty', cols.length === 0, String(cols.length));
    const emptyMsgs = document.querySelectorAll('#myTasksBody p.empty');
    check('TEST 2: all 4 groups render as plain .empty inline text instead', emptyMsgs.length === 4, String(emptyMsgs.length));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: a column with a real task still renders the full task card in a real .taskCol, using the new "Needs Attention" label ----
  try {
    myTasksPerson = 'Luke';
    renderMyTasksBody();
    await new Promise(r => setTimeout(r, 20));
    const body = document.getElementById('myTasksBody').innerHTML;
    check('TEST 3: the real overdue task card is rendered', body.includes('Overdue task'));
    check('TEST 3: uses the "Needs Attention" construction-ops label, not "Overdue"', body.includes('Needs Attention <span') && body.includes('(1)'));
    const populatedCols = document.querySelectorAll('#myTasksBody .taskCol');
    check('TEST 3: the populated group renders inside a real .taskCol (not the plain-text empty style)', populatedCols.length === 1, String(populatedCols.length));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

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
