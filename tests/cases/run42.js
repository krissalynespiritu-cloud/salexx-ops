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

global.mockJobsData = [
  { job_id: 'SLX-QR1', client_name: 'Phil Rose', client_id: null, address_city: '—', job_type: 'Decking', crew: '', stage: 'Project Scheduled', contract_price: 19779.25, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-08-26', scheduled_start_date: null, scheduled_end_date: null, completed_date: null, permit_required: null, monday_item_id: null, retired: false }
];
global.sbUpdateLog = [];

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
      if (table === 'jobs') {
        const row = global.mockJobsData.find(j => j.job_id === eqVal);
        return Promise.resolve({ data: row || null, error: row ? null : { message: 'not found' } });
      }
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (lastOp === 'update' && table === 'jobs') {
        global.sbUpdateLog.push({ jobId: eqVal, ...lastArg });
        const row = global.mockJobsData.find(j => j.job_id === eqVal);
        if (row) Object.assign(row, lastArg);
        resolve({ data: null, error: null });
        return;
      }
      let src = table === 'jobs' ? global.mockJobsData : [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}
const sbMock = {
  from(t) { return makeChain(t); },
  rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); },
  auth: {
    signOut() {}, onAuthStateChange() {},
    getSession() { return Promise.resolve({ data: { session: null } }); },
    getUser() { return Promise.resolve({ data: { user: { id: 'U-TEST' } } }); }
  }
};
global.supabase = { createClient: () => sbMock };

// Feature: a "quick review" expand toggle on each Jobs-list row, matching the
// existing expand pattern already used on the Job Costing table. Lets someone
// check/edit a job's key dates and permit-required flag without leaving the
// Jobs list or opening the full job detail page.
const testLogic = `
(async () => {
  await fetchJobs();
  activateTab('jobs');
  drawJobs();

  // ---- TEST 1: collapsed by default, with an expand toggle on the row ----
  try {
    const toggle = document.querySelector('[data-job-expand="SLX-QR1"]');
    check('TEST 1: the row has an expand toggle', !!toggle);
    check('TEST 1: it starts collapsed (closed triangle)', toggle && toggle.textContent === '▸');
    check('TEST 1: no quick-review panel is rendered yet', !document.querySelector('[data-jf="scheduled_start_date"]'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: clicking the toggle reveals the quick-review fields, pre-filled from the job ----
  try {
    document.querySelector('[data-job-expand="SLX-QR1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const soldInput = document.querySelector('[data-jf="sold_date"][data-job="SLX-QR1"]');
    check('TEST 2: sold date is pre-filled from the job', soldInput && soldInput.value === '2026-08-26', soldInput && soldInput.value);
    const permitCb = document.querySelector('[data-jf="permit_required"][data-job="SLX-QR1"]');
    check('TEST 2: permit checkbox exists and starts unchecked (unset)', permitCb && permitCb.checked === false);
    check('TEST 2: shows a real cost-status note, not a fabricated health score', /No (contract price|cost data logged) yet/.test(document.getElementById('jobList').innerHTML));
    const toggle = document.querySelector('[data-job-expand="SLX-QR1"]');
    check('TEST 2: the toggle now shows open (down triangle)', toggle.textContent === '▾');
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: editing a field inline saves through the normal job-field save path ----
  try {
    global.sbUpdateLog = [];
    const startInput = document.querySelector('[data-jf="scheduled_start_date"][data-job="SLX-QR1"]');
    startInput.value = '2026-09-10';
    startInput.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const upd = global.sbUpdateLog.find(u => u.jobId === 'SLX-QR1' && 'scheduled_start_date' in u);
    check('TEST 3: the scheduled start date was saved to the jobs table', upd && upd.scheduled_start_date === '2026-09-10', JSON.stringify(upd));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: checking the permit box inline saves a real boolean ----
  try {
    global.sbUpdateLog = [];
    const permitCb = document.querySelector('[data-jf="permit_required"][data-job="SLX-QR1"]');
    permitCb.checked = true;
    permitCb.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const upd = global.sbUpdateLog.find(u => u.jobId === 'SLX-QR1' && 'permit_required' in u);
    check('TEST 4: permit_required was saved as boolean true, not a string', upd && upd.permit_required === true, JSON.stringify(upd));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: clicking the toggle again collapses it ----
  try {
    document.querySelector('[data-job-expand="SLX-QR1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    check('TEST 5: the quick-review panel is gone again', !document.querySelector('[data-jf="scheduled_start_date"]'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

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
