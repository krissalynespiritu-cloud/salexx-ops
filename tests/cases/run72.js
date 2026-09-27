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

// Feature: Job Costing showed labor cost but nothing about total hours
// worked, or how long (in real calendar days someone actually logged time)
// the crew was on a job. A "Hours" column was tried on the main table but
// removed again (it pushed the Reviewed/Approved checkboxes off-screen and
// duplicated what the expanded detail already showed). The real hours
// (from Time Entry) and the day count (from the new job_work_days view,
// supabase/86_job_work_days.sql) are shown together in a single merged
// "Hours Worked: X hrs over N days · Time Entry" line in each row's
// expanded detail, instead of two separate, redundant stats.
global.mockJobsData = [
  { job_id: 'SLX-DW1', client_name: 'Days Worked Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'Completed', contract_price: 10000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: '2026-02-01', monday_item_id: null, retired: false },
  { job_id: 'SLX-DW2', client_name: 'No Hours Client', client_id: null, address_city: '2 Test St', job_type: 'Siding', stage: 'In Progress', contract_price: 4000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-02', completed_date: null, monday_item_id: null, retired: false }
];
global.mockMargins = [
  { job_id: 'SLX-DW1', revenue: 10000, labor_cost: 2100, material_cost: 1000, additional_cost: 0, overhead_cost: 558, total_job_cost: 3658, gross_profit: 6342, margin_pct: 63.4, unpriced: false, hours: 60 },
  { job_id: 'SLX-DW2', revenue: 4000, labor_cost: 0, material_cost: 0, additional_cost: 0, overhead_cost: 0, total_job_cost: 0, gross_profit: 4000, margin_pct: 100, unpriced: true, hours: 0 }
];
global.mockWorkDays = [
  { job_id: 'SLX-DW1', days_worked: 6, first_work_date: '2026-01-10', last_work_date: '2026-01-20' }
];

function makeChain(table) {
  let eqFilters = {};
  const chain = {
    select() { return chain; }, insert() { return chain; }, update() { return chain; }, delete() { return chain; },
    eq(col, val) { eqFilters[col] = val; return chain; }, neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; }, not() { return chain; }, or() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    single() {
      if (table === 'jobs') { const row = global.mockJobsData.find(j => j.job_id === eqFilters.job_id); return Promise.resolve({ data: row || null, error: null }); }
      if (table === 'job_margins') { const row = global.mockMargins.find(m => m.job_id === eqFilters.job_id); return Promise.resolve({ data: row || null, error: null }); }
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() {
      if (table === 'job_work_days') return Promise.resolve({ data: global.mockWorkDays.find(w => w.job_id === eqFilters.job_id) || null, error: null });
      return Promise.resolve({ data: null, error: null });
    },
    then(resolve) {
      let src;
      if (table === 'jobs') src = eqFilters.job_id ? global.mockJobsData.filter(j => j.job_id === eqFilters.job_id) : global.mockJobsData;
      else if (table === 'job_margins') src = global.mockMargins;
      else if (table === 'job_work_days') src = global.mockWorkDays;
      else if (table === 'job_costs' || table === 'sub_payments') src = [];
      else src = [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}
const sbMock = {
  from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} }
};
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  await fetchJobs();

  // ---- TEST 1: real hours and day-count merge onto the job from job_margins / job_work_days ----
  try {
    const j1 = jobs.find(x => x.id === 'SLX-DW1');
    check('TEST 1: hrs comes from job_margins', j1.hrs === 60, j1.hrs);
    check('TEST 1: daysWorked comes from job_work_days', j1.daysWorked === 6, j1.daysWorked);
    check('TEST 1: first/last work dates are set', j1.firstWorkDate === '2026-01-10' && j1.lastWorkDate === '2026-01-20');
    const j2 = jobs.find(x => x.id === 'SLX-DW2');
    check('TEST 2: a job with no time entries defaults daysWorked to 0', j2.daysWorked === 0, j2.daysWorked);
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: the main Job Costing table has no separate Hours column (removed as redundant clutter) ----
  try {
    activateTab('jobcosting');
    drawJobCosting();
    const html = document.getElementById('jobCostingTable').innerHTML;
    check('TEST 2: no Hours column header', !html.includes('>Hours<'), html.match(/<thead>[\\s\\S]{0,400}/)?.[0]);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: expanding the worked job's row shows one merged Hours Worked + days line ----
  try {
    document.querySelector('[data-jc-expand="SLX-DW1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const body = document.getElementById('jobCostingTable').innerHTML;
    check('TEST 3: shows the real hours', body.includes('60.0 hrs'), body.match(/Hours Worked[\\s\\S]{0,140}/)?.[0]);
    check('TEST 3: shows the day count merged into the same line', body.includes('over 6 days'), body.match(/Hours Worked[\\s\\S]{0,140}/)?.[0]);
    check('TEST 3: labeled as coming from Time Entry', body.includes('Time Entry'));
    check('TEST 3: no separate standalone "Days Worked:" stat anymore', !body.includes('Days Worked:'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: a job with no logged hours shows no Hours Worked line at all ----
  try {
    document.querySelector('[data-jc-expand="SLX-DW2"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const body = document.getElementById('jobCostingTable').innerHTML;
    check('TEST 4: no Hours Worked line for the job with zero hours logged', !body.match(/No Hours Client[\\s\\S]{0,900}/)?.[0].includes('Hours Worked:'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: refreshJob() (the per-job save-triggered refresh) also picks up days worked ----
  try {
    global.mockWorkDays.push({ job_id: 'SLX-DW2', days_worked: 1, first_work_date: '2026-03-01', last_work_date: '2026-03-01' });
    global.mockMargins.find(m => m.job_id === 'SLX-DW2').hours = 4;
    await refreshJob('SLX-DW2');
    const j2 = jobs.find(x => x.id === 'SLX-DW2');
    check('TEST 5: refreshJob picks up the new days-worked figure', j2.daysWorked === 1, j2.daysWorked);
    check('TEST 5: refreshJob picks up the new hours figure', j2.hrs === 4, j2.hrs);
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
