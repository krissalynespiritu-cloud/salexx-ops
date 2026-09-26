const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const domHtml = fs.readFileSync(path.join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(path.join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');
const block1 = fs.readFileSync(path.join(__dirname, '..', '_generated', 'block1.js'), 'utf8');

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

// Bug: the "Work date" picker (index.html's 2nd <script> block, historically
// targeting the old #s-time section) was never updated when Time Entry moved
// into #s-labor/#laborTimeView, so `$("#s-time .lbl")` matched nothing and
// the picker silently never rendered -- there was no way to see or backfill
// a day other than today, and no way to log a straight hours total instead
// of clock in/out (needed when a foreman reports a past week's hours after
// the fact rather than day-of). Also: switching to a date never fetched what
// was actually already saved for it, so opening a backfilled date showed
// blank fields and clicking Save would have deleted the real saved rows for
// that person/date.
global.mockJobsData = [
  { job_id: 'SLX-L1', client_name: 'Labor Test Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false }
];
// A real, already-saved manual-hours entry for a PAST date, with no clock
// in/out -- exactly the "Alex reports Monday's totals after the fact" case.
global.mockTimeEntries = [
  { entry_id: 'TE-1', person: 'Carlos', work_date: '2026-09-22', job_id: 'SLX-L1', clock_in: null, clock_out: null, hours: 8, kind: 'Job' }
];
global.sbInsertLog = [];
global.sbDeleteLog = [];

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
          global.sbDeleteLog.push({ ...eqFilters });
          global.mockTimeEntries = global.mockTimeEntries.filter(r => !(r.person === eqFilters.person && r.work_date === eqFilters.work_date));
          resolve({ data: null, error: null }); return;
        }
        if (lastOp === 'insert') {
          const rows = Array.isArray(lastArg) ? lastArg : [lastArg];
          global.sbInsertLog.push(...rows);
          global.mockTimeEntries.push(...rows.map(r => ({ entry_id: 'TE-NEW', ...r })));
          resolve({ data: null, error: null }); return;
        }
        let src = global.mockTimeEntries;
        if (eqFilters.work_date) src = src.filter(r => r.work_date === eqFilters.work_date);
        resolve({ data: src, error: null }); return;
      }
      const src = table === 'jobs' ? global.mockJobsData : [];
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
global.currentUserEmail = 'test@example.com';

const testLogic = `
(async () => {
  await fetchJobs();
  await new Promise(r => setTimeout(r, 30));

  // ---- TEST 1: the work-date picker now actually renders (it never did before) ----
  try {
    const input = document.getElementById('workDate');
    check('TEST 1: the work-date input exists in the DOM', !!input);
    check('TEST 1: it is placed right above the roster, inside the real Time Entry view', !!input && document.getElementById('laborTimeView').contains(input));
    check('TEST 1: it defaults to today and cannot be set to a future date', input.max === todayPacific());
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: switching to a past date loads the REAL saved entry, not a blank row ----
  try {
    const input = document.getElementById('workDate');
    input.value = '2026-09-22';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const jobSelect = document.querySelector('#roster select[data-p="Carlos"][data-i="0"]');
    check('TEST 2: the real linked job is shown, not blank', jobSelect && jobSelect.value === 'SLX-L1', jobSelect && jobSelect.value);
    const hrsInput = document.querySelector('#roster input[data-p="Carlos"][data-i="0"][data-f="manualHours"]');
    check('TEST 2: the real 8 manual hours are shown, not blank', hrsInput && hrsInput.value === '8', hrsInput && hrsInput.value);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: saving from that loaded state does NOT wipe out the real entry (the data-loss risk this closes) ----
  try {
    document.querySelector('[data-save-person="Carlos"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 3: the real entry for 2026-09-22 still exists after saving', global.mockTimeEntries.some(r => r.person === 'Carlos' && r.work_date === '2026-09-22' && Number(r.hours) === 8));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: manual hours can be typed directly for a person with nothing logged, no clock times needed ----
  try {
    const input = document.getElementById('workDate');
    input.value = '2026-09-23';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const jobSelect = document.querySelector('#roster select[data-p="Tito"][data-i="0"]');
    jobSelect.value = 'SLX-L1';
    jobSelect.dispatchEvent(new Event('input', { bubbles: true }));
    const hrsInput = document.querySelector('#roster input[data-p="Tito"][data-i="0"][data-f="manualHours"]');
    hrsInput.value = '6.5';
    hrsInput.dispatchEvent(new Event('input', { bubbles: true }));
    const inTime = document.querySelector('#roster input[data-p="Tito"][data-i="0"][data-f="in"]');
    check('TEST 4: the clock in/out fields disable once manual hours is entered', inTime.disabled);
    global.sbInsertLog = [];
    document.querySelector('[data-save-person="Tito"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const saved = global.sbInsertLog.find(r => r.person === 'Tito' && r.work_date === '2026-09-23');
    check('TEST 4: it saved with the real 6.5 hours and no clock times', saved && Number(saved.hours) === 6.5 && saved.clock_in === null && saved.clock_out === null, JSON.stringify(saved));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  console.log('\\n=== PASS (' + results.pass.length + ') ===');
  results.pass.forEach(p => console.log('  ok - ' + p));
  console.log('\\n=== FAIL (' + results.fail.length + ') ===');
  results.fail.forEach(f => console.log('  FAIL - ' + f));
  global.__TEST_FAIL_COUNT__ = results.fail.length;
})();
`;

try {
  (0, eval)(mainScript + '\n' + block1 + '\n' + testLogic);
} catch (e) {
  console.log('FAIL setup:', e.stack);
  process.exit(1);
}

setTimeout(() => {
  process.exit(global.__TEST_FAIL_COUNT__ ? 1 : 0);
}, 2000);
