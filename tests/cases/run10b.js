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
// today is 2026-09-23 per the system clock
global.mockJobsData = [
  { job_id: 'SLX-S1', client_name: 'Running Job Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false, scheduled_start_date: '2026-09-20', scheduled_end_date: '2026-09-30' },
  { job_id: 'SLX-S2', client_name: 'Upcoming Job Client', client_id: null, address_city: '2 Test St', job_type: 'Siding', stage: 'Designs Sold', contract_price: 3000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-02-01', completed_date: null, monday_item_id: null, retired: false, scheduled_start_date: '2026-09-28', scheduled_end_date: '2026-10-02' },
  { job_id: 'SLX-S3', client_name: 'Far Future Client', client_id: null, address_city: '3 Test St', job_type: 'Paint', stage: 'Designs Sold', contract_price: 2000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-03-01', completed_date: null, monday_item_id: null, retired: false, scheduled_start_date: '2026-12-01', scheduled_end_date: '2026-12-05' },
  { job_id: 'SLX-S4', client_name: 'No Schedule Client', client_id: null, address_city: '4 Test St', job_type: 'Deck', stage: 'Designs Sold', contract_price: 1500, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-04-01', completed_date: null, monday_item_id: null, retired: false, scheduled_start_date: null, scheduled_end_date: null }
];

function makeChain(table) {
  let lastOp = null, lastArg = null, eqCol = null, eqVal = null;
  const chain = {
    select() { return chain; },
    insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; },
    delete() { lastOp = 'delete'; return chain; },
    eq(col, val) { eqCol = col; eqVal = val; chain._eqCol = col; chain._eqVal = val; return chain; },
    neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() {
      sbCallLog.push({ table, op: 'select-single', eqVal });
      if (table === 'jobs') {
        const row = global.mockJobsData.find(x => x.job_id === eqVal);
        return Promise.resolve({ data: row || null, error: row ? null : { message: 'not found' } });
      }
      return Promise.resolve({ data: null, error: null }); // no margin/payments row -- graceful, not an error
    },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (lastOp === 'update') {
        sbCallLog.push({ table, op: 'update', arg: lastArg, eqVal });
        if (table === 'jobs') { const j = global.mockJobsData.find(x => x.job_id === eqVal); if (j) Object.assign(j, lastArg); }
        resolve({ data: null, error: null }); return;
      }
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
  await fetchJobs();

  // ---- TEST 1: the standalone Schedule subtab was folded into Overview's Delivery section ----
  try {
    check('TEST 1: Schedule subtab button no longer exists on its own', !document.querySelector('#subtabs [data-st="sch"]'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: opening a job with dates shows them pre-filled (on Overview now) and computes real duration ----
  try {
    openJob('SLX-S1');
    document.querySelector('#subtabs [data-st="ov"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const startInput = document.querySelector('[data-jf="scheduled_start_date"]');
    const endInput = document.querySelector('[data-jf="scheduled_end_date"]');
    check('TEST 2: start date pre-filled with real value', startInput && startInput.value === '2026-09-20');
    check('TEST 2: end date pre-filled with real value', endInput && endInput.value === '2026-09-30');
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 2: computed duration is correct (11 days inclusive)', body.includes('11 days'), body);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: editing the start date sends a real update through the existing saveJobField path ----
  try {
    const startInput = document.querySelector('[data-jf="scheduled_start_date"]');
    startInput.value = '2026-09-22';
    startInput.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const updCall = sbCallLog.find(c => c.table === 'jobs' && c.op === 'update' && c.eqVal === 'SLX-S1');
    check('TEST 3: update sent with the new start date', updCall && updCall.arg.scheduled_start_date === '2026-09-22', JSON.stringify(updCall));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: clearing a date sends null, not an empty string (reusing saveJobField's existing null-date handling) ----
  try {
    const endInput = document.querySelector('[data-jf="scheduled_end_date"]');
    endInput.value = '';
    endInput.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const updCall = sbCallLog.find(c => c.table === 'jobs' && c.op === 'update' && c.arg.scheduled_end_date !== undefined);
    check('TEST 4: cleared end date sent as null', updCall && updCall.arg.scheduled_end_date === null, JSON.stringify(updCall));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: a job with no schedule dates shows no duration row, no crash ----
  try {
    openJob('SLX-S4');
    document.querySelector('#subtabs [data-st="ov"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 5: no duration text shown for a job with no dates', !body.includes('Planned duration'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: Dashboard Upcoming Schedule list shows the right jobs, correctly labeled Running vs Upcoming, excludes far-future and unscheduled jobs ----
  try {
    renderUpcomingSchedule();
    const html = document.getElementById('upcomingSchedule').innerHTML;
    check('TEST 6: shows the running job (already started, still within window)', html.includes('Running Job Client') && html.includes('Running'));
    check('TEST 6: shows the upcoming job within 14 days as Upcoming', html.includes('Upcoming Job Client') && html.includes('>Upcoming<'));
    check('TEST 6: excludes a job scheduled far in the future (outside the 14-day horizon)', !html.includes('Far Future Client'));
    check('TEST 6: excludes a job with no schedule dates at all', !html.includes('No Schedule Client'));
    check('TEST 6: sorted chronologically (running job listed before upcoming job)', html.indexOf('Running Job Client') < html.indexOf('Upcoming Job Client'));
    check('TEST 6: clicking a row opens the real job via the existing data-open handler', html.includes('data-open="SLX-S1"') && html.includes('data-open="SLX-S2"'));
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7: a job with zero jobs scheduled at all shows the empty state ----
  try {
    mockJobsData.forEach(j => { j.scheduled_start_date = null; j.scheduled_end_date = null; });
    await fetchJobs();
    renderUpcomingSchedule();
    const html = document.getElementById('upcomingSchedule').innerHTML;
    check('TEST 7: shows empty state when nothing is scheduled', html.includes('Nothing scheduled in the next 14 days'));
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

  // ---- TEST 8: unrelated features remain unaffected ----
  try {
    document.querySelector('#subtabs [data-st="ov"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 8: Overview tab still works', document.getElementById('dBody').innerHTML.length > 0);
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
  console.log('FAIL setup:', e.stack);
  process.exit(1);
}

setTimeout(() => {
  process.exit(global.__TEST_FAIL_COUNT__ ? 1 : 0);
}, 1000);
