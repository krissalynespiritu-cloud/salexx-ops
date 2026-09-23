const { JSDOM } = require('jsdom');
const fs = require('fs');

const domHtml = fs.readFileSync(require('path').join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(require('path').join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');

const dom = new JSDOM(`<!doctype html><html><body>${domHtml}</body></html>`, { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.MouseEvent = dom.window.MouseEvent;
global.KeyboardEvent = dom.window.KeyboardEvent;
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

global.promptModalOpen = () => !document.getElementById('confirmModal').classList.contains('hidden');
global.closePromptModalIfOpen = () => { if (global.promptModalOpen()) document.getElementById('confirmModalCancel').dispatchEvent(new MouseEvent('click', { bubbles: true })); };

const sbCallLog = [];
global.sbCallLog = sbCallLog;
global.mockJobsData = [
  { job_id: 'SLX-KB1', client_name: 'Keyboard Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false }
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
      sbCallLog.push({ table, op: 'select' });
      let src;
      if (table === 'jobs') src = global.mockJobsData;
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
  const clickTab = (tab) => document.querySelector('.sidebarLink[data-tab="' + tab + '"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const press = (key, target) => (target || document.body).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

  await fetchJobs();

  // ---- TEST 1: "/" focuses the global search box when not typing elsewhere ----
  try {
    document.activeElement && document.activeElement.blur && document.activeElement.blur();
    press('/');
    await new Promise(r => setTimeout(r, 10));
    check('TEST 1: "/" focuses the search box', document.activeElement === document.getElementById('globalSearch'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: typing "/" while already inside a text input does NOT hijack focus away or block the char ----
  try {
    const q = document.getElementById('q'); // the Jobs page search input
    clickTab('jobs');
    await new Promise(r => setTimeout(r, 20));
    q.focus();
    const ev = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    const notPrevented = q.dispatchEvent(ev);
    check('TEST 2: "/" while typing in a real input is not intercepted (event not prevented)', notPrevented === true);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: "g" then "j" navigates to the real Jobs tab ----
  try {
    clickTab('today');
    await new Promise(r => setTimeout(r, 20));
    document.body.focus && document.body.focus();
    press('g');
    press('j');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 3: g-j opened the real Jobs tab', !document.getElementById('s-jobs').classList.contains('hidden'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: "g" then "l" navigates to the real Leads Tracker tab ----
  try {
    clickTab('today');
    await new Promise(r => setTimeout(r, 20));
    press('g');
    press('l');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 4: g-l opened the real Leads Tracker tab', !document.getElementById('s-leadstracker').classList.contains('hidden'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: "g" then an unrelated key does nothing (chord safely expires) ----
  try {
    clickTab('today');
    await new Promise(r => setTimeout(r, 20));
    press('g');
    press('x');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 5: g-x does not navigate anywhere', !document.getElementById('s-today').classList.contains('hidden'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: "n" on the Jobs tab triggers the real "new job" flow (createJob -> promptDialog) ----
  try {
    clickTab('jobs');
    await new Promise(r => setTimeout(r, 20));
    press('n');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 6: pressing n on Jobs triggered the real createJob() flow', promptModalOpen());
    closePromptModalIfOpen();
    await new Promise(r => setTimeout(r, 20));
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7: "n" while typing in a real text field does NOT trigger the new-job flow ----
  try {
    clickTab('jobs');
    await new Promise(r => setTimeout(r, 20));
    const q = document.getElementById('q');
    q.focus();
    press('n', q);
    await new Promise(r => setTimeout(r, 20));
    check('TEST 7: n while typing in a real input does not open a new job', !promptModalOpen());
    closePromptModalIfOpen();
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

  // ---- TEST 8: "n" on a tab with no mapped shortcut (Dashboard) does nothing ----
  try {
    clickTab('today');
    await new Promise(r => setTimeout(r, 20));
    press('n');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 8: n on Dashboard (no mapped action) does nothing', !promptModalOpen());
    closePromptModalIfOpen();
  } catch (e) { check('TEST 8: no throw', false, e.stack); }

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
