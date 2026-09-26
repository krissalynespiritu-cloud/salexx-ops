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

// Feature: saving Time Entry hours required clicking each crew member's own
// "Save" button one by one. Added a single "Save all" button above the
// roster that saves every person's entered hours in one click.
global.mockJobsData = [
  { job_id: 'SLX-SA1', client_name: 'Save All Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false }
];
global.mockTimeEntries = [];
global.sbInsertLog = [];

function makeChain(table) {
  let lastOp = null, lastArg = null, eqFilters = {};
  const chain = {
    select() { return chain; },
    insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; },
    delete() { lastOp = 'delete'; return chain; },
    eq(col, val) { eqFilters[col] = val; return chain; },
    neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() {
      if (table === 'jobs') { const row = global.mockJobsData.find(j => j.job_id === eqFilters.job_id); return Promise.resolve({ data: row || null, error: row ? null : { message: 'not found' } }); }
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (table === 'jobs') { resolve({ data: global.mockJobsData, error: null }); return; }
      if (table === 'job_margins' || table === 'job_costs' || table === 'sub_payments') { resolve({ data: [], error: null }); return; }
      if (table === 'time_entries') {
        if (lastOp === 'delete') {
          global.mockTimeEntries = global.mockTimeEntries.filter(r => !(r.person === eqFilters.person && r.work_date === eqFilters.work_date));
          resolve({ data: null, error: null }); return;
        }
        if (lastOp === 'insert') {
          const rows = Array.isArray(lastArg) ? lastArg : [lastArg];
          global.sbInsertLog.push(...rows);
          global.mockTimeEntries.push(...rows.map(r => ({ entry_id: 'TE-NEW', ...r })));
          resolve({ data: null, error: null }); return;
        }
        resolve({ data: global.mockTimeEntries, error: null }); return;
      }
      resolve({ data: [], error: null });
    }
  };
  return chain;
}
const sbMock = {
  from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {}, getUser() { return Promise.resolve({ data: { user: { id: 'U-1' } } }); } }
};
global.supabase = { createClient: () => sbMock };
global.currentUserEmail = 'test@example.com';

const testLogic = `
(async () => {
  await fetchJobs();
  drawRoster();

  // ---- TEST 1: the "Save all" button exists above the roster ----
  try {
    check('TEST 1: the saveAllRosterBtn exists', !!document.getElementById('saveAllRosterBtn'));
    check('TEST 1: it sits above the roster', document.getElementById('laborTimeView').contains(document.getElementById('saveAllRosterBtn')));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: filling in hours for two different people, then clicking "Save all" saves BOTH without touching their individual Save buttons ----
  try {
    const carlosJob = document.querySelector('#roster select[data-p="Carlos"][data-i="0"]');
    carlosJob.value = 'SLX-SA1';
    carlosJob.dispatchEvent(new Event('input', { bubbles: true }));
    const carlosHrs = document.querySelector('#roster input[data-p="Carlos"][data-i="0"][data-f="manualHours"]');
    carlosHrs.value = '5';
    carlosHrs.dispatchEvent(new Event('input', { bubbles: true }));

    const titoJob = document.querySelector('#roster select[data-p="Tito"][data-i="0"]');
    titoJob.value = 'SLX-SA1';
    titoJob.dispatchEvent(new Event('input', { bubbles: true }));
    const titoHrs = document.querySelector('#roster input[data-p="Tito"][data-i="0"][data-f="manualHours"]');
    titoHrs.value = '3.5';
    titoHrs.dispatchEvent(new Event('input', { bubbles: true }));

    global.sbInsertLog = [];
    document.getElementById('saveAllRosterBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 40));

    const carlosSaved = global.mockTimeEntries.find(r => r.person === 'Carlos' && Number(r.hours) === 5);
    const titoSaved = global.mockTimeEntries.find(r => r.person === 'Tito' && Number(r.hours) === 3.5);
    check('TEST 2: Carlos was saved without clicking his own Save button', !!carlosSaved, JSON.stringify(global.mockTimeEntries));
    check('TEST 2: Tito was saved too, in the same click', !!titoSaved, JSON.stringify(global.mockTimeEntries));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: the status line reports a completed batch save ----
  try {
    check('TEST 3: status shows a final "All saved" message', document.getElementById('timeSaveStatus').textContent === 'All saved');
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
}, 2000);
