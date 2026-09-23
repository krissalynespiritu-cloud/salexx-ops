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
global.mockJobsData = [
  { job_id: 'SLX-L1', client_name: 'Labor Test Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false }
];
global.mockTimeEntries = [
  { person: 'Alex', work_date: '2026-09-01', hours: 8 }
];
global.mockPayrollPeriods = [];
global.mockTimeEntryCosts = [
  { job_id: 'SLX-L1', person: 'Alex', hours: 8, labor_cost: 240, kind: 'Job' }
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
      else if (table === 'time_entries') src = global.mockTimeEntries;
      else if (table === 'payroll_periods') src = global.mockPayrollPeriods;
      else if (table === 'time_entry_costs') src = global.mockTimeEntryCosts;
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

try {
  (0, eval)(mainScript);
  check('main script evaluates without throwing', true);
} catch (e) {
  check('main script evaluates without throwing', false, e.stack);
  console.log('\n=== FAIL (' + results.fail.length + ') ===');
  results.fail.forEach(f => console.log('  FAIL - ' + f));
  process.exit(1);
}

const testLogic = `
(async () => {
  const clickTab = (tab) => {
    const btn = document.querySelector('.sidebarLink[data-tab="' + tab + '"]');
    if (!btn) throw new Error('no sidebar button for ' + tab);
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };

  await fetchJobs();
  drawRoster(); // real app calls this once during boot(), not on tab switch -- mirror that here

  // ---- TEST 1: old separate Time/Payroll/Project Hours sidebar links and sections are gone ----
  try {
    check('TEST 1: old s-time section removed', !document.getElementById('s-time'));
    check('TEST 1: old s-payroll section removed', !document.getElementById('s-payroll'));
    check('TEST 1: old s-projecthours section removed', !document.getElementById('s-projecthours'));
    check('TEST 1: new s-labor section exists', !!document.getElementById('s-labor'));
    check('TEST 1: sidebar has one Labor link', document.querySelectorAll('.sidebarLink[data-tab="labor"]').length >= 1);
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: clicking Labor from the sidebar shows the section, defaults to Time Entry ----
  try {
    document.querySelector('nav#sidebar .sidebarLink[data-tab="labor"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 2: Labor section shown, Jobs hidden', !document.getElementById('s-labor').classList.contains('hidden') && document.getElementById('s-jobs').classList.contains('hidden'));
    check('TEST 2: Time Entry view visible by default', !document.getElementById('laborTimeView').classList.contains('hidden'));
    check('TEST 2: Project Hours view hidden by default', document.getElementById('laborHoursView').classList.contains('hidden'));
    check('TEST 2: Payroll view hidden by default', document.getElementById('laborPayrollView').classList.contains('hidden'));
    check('TEST 2: roster (real Time page content) is present', document.getElementById('roster').innerHTML.length > 0);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: switching to Project Hours subview renders real seeded job labor data ----
  try {
    document.querySelector('[data-labor-view="hours"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 3: Project Hours view now visible', !document.getElementById('laborHoursView').classList.contains('hidden'));
    check('TEST 3: Time Entry view now hidden', document.getElementById('laborTimeView').classList.contains('hidden'));
    const phHtml = document.getElementById('projectHoursTable').innerHTML;
    check('TEST 3: project hours table shows the seeded job', phHtml.includes('SLX-L1'), phHtml);
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: switching to Payroll subview renders real seeded time-entry-derived payroll data ----
  try {
    document.querySelector('[data-labor-view="payroll"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 4: Payroll view now visible', !document.getElementById('laborPayrollView').classList.contains('hidden'));
    check('TEST 4: Project Hours view now hidden', document.getElementById('laborHoursView').classList.contains('hidden'));
    const payrollHtml = document.getElementById('payrollList').innerHTML;
    check('TEST 4: payroll list rendered a period row', payrollHtml.includes('data-open-payroll'), payrollHtml);
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: opening a payroll period still shows the standalone payrollDetail overlay correctly ----
  try {
    const periodBtn = document.querySelector('[data-open-payroll]');
    check('TEST 5 setup: a period row exists', !!periodBtn);
    periodBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 5: payrollDetail overlay is shown', !document.getElementById('payrollDetail').classList.contains('hidden'));
    document.getElementById('payrollBack').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 5: back button hides payrollDetail again', document.getElementById('payrollDetail').classList.contains('hidden'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: navigating away and back to Labor restores last-selected subview (payroll) ----
  try {
    clickTab('jobs');
    clickTab('labor');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 6: still on Payroll view after navigating away and back', !document.getElementById('laborPayrollView').classList.contains('hidden'));
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7: the Dashboard "Log hours" quick action forces the Time Entry subview regardless of last state ----
  try {
    clickTab('today');
    const logHoursBtn = document.querySelector('#quickActions [data-tab="labor"][data-labor-view="time"]');
    check('TEST 7 setup: Log hours quick action exists with data-labor-view=time', !!logHoursBtn);
    logHoursBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 7: clicking Log hours lands on Time Entry even though Payroll was last active', !document.getElementById('laborTimeView').classList.contains('hidden'));
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

  // ---- TEST 8: restoreLastTab() correctly restores labor from localStorage ----
  try {
    document.querySelector('[data-labor-view="hours"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    localStorage.setItem('lastTab', 'labor');
    restoreLastTab();
    await new Promise(r => setTimeout(r, 20));
    check('TEST 8: restoreLastTab shows Labor section', !document.getElementById('s-labor').classList.contains('hidden'));
    check('TEST 8: restoreLastTab keeps the last active subview (hours)', !document.getElementById('laborHoursView').classList.contains('hidden'));
  } catch (e) { check('TEST 8: no throw', false, e.stack); }

  // ---- TEST 9: unrelated features remain unaffected ----
  try {
    clickTab('teamscorecards');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 9: Team Scorecards still works after Labor changes', !document.getElementById('s-teamscorecards').classList.contains('hidden'));
    clickTab('datahealth');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 9: Data Health still works', !document.getElementById('s-datahealth').classList.contains('hidden'));
    check('TEST 9: Retire Job functions still present', typeof openRetireJobReview === 'function' && typeof confirmRetireJob === 'function');
  } catch (e) { check('TEST 9: no throw', false, e.stack); }

  console.log('\\n=== PASS (' + results.pass.length + ') ===');
  results.pass.forEach(p => console.log('  ok - ' + p));
  console.log('\\n=== FAIL (' + results.fail.length + ') ===');
  results.fail.forEach(f => console.log('  FAIL - ' + f));
  global.__TEST_FAIL_COUNT__ = results.fail.length;
})();
`;

(0, eval)(testLogic);

setTimeout(() => {
  process.exit(global.__TEST_FAIL_COUNT__ ? 1 : 0);
}, 800);
