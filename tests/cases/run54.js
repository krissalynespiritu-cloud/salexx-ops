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

// Reported bug: "Materials $475.00 + Labor in-house $1,505.50" summed to
// $1,980.50, but "Total direct cost" showed $1,669.50. Root cause (confirmed
// against job_financials/job_margins in supabase/66_hide_retired_jobs_from_
// financials.sql): when a job has ANY real time entries logged, labor_cost
// switches from the manual "Labor · in-house" job_costs figure to the real
// hours x rate total from Time Entry -- by design ("a logged timesheet
// always wins", already noted in the page's own footer note) -- but nothing
// on the Labor · in-house row itself showed that override was happening, so
// a correct total looked like a math error. SLX-OV1 reproduces exactly the
// reported numbers: Materials $475 + manual Labor-in-house $1,505.50 entered,
// but job_margins.labor_cost is $1,194.50 (a real timesheet), so Total
// direct cost is $1,669.50 -- correct, but was silent about why.
global.mockJobsData = [
  { job_id: 'SLX-OV1', client_name: 'Override Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false },
  { job_id: 'SLX-OV2', client_name: 'Clean Client', client_id: null, address_city: '2 Test St', job_type: 'Siding', stage: 'In Progress', contract_price: 4000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-02', completed_date: null, monday_item_id: null, retired: false }
];
global.mockMargins = [
  { job_id: 'SLX-OV1', revenue: 5000, labor_cost: 1194.50, material_cost: 475, additional_cost: 0, overhead_cost: 300.51, total_job_cost: 1970.01, gross_profit: 3029.99, margin_pct: 60.6, unpriced: false, hours: 34.13 },
  { job_id: 'SLX-OV2', revenue: 4000, labor_cost: 800, material_cost: 300, additional_cost: 0, overhead_cost: 198, total_job_cost: 1298, gross_profit: 2702, margin_pct: 67.6, unpriced: false, hours: 0 }
];
global.mockCosts = [
  { cost_id: 'JC-1', job_id: 'SLX-OV1', category: 'Materials', amount: 475 },
  { cost_id: 'JC-2', job_id: 'SLX-OV1', category: 'Labor', amount: 1505.50 },
  { cost_id: 'JC-3', job_id: 'SLX-OV2', category: 'Materials', amount: 300 },
  { cost_id: 'JC-4', job_id: 'SLX-OV2', category: 'Labor', amount: 800 }
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
      let src;
      if (table === 'jobs') src = global.mockJobsData;
      else if (table === 'job_margins') src = global.mockMargins;
      else if (table === 'job_costs') src = global.mockCosts;
      else src = [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}
const sbMock = {
  from(table) { return makeChain(table); },
  rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} }
};
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  await fetchJobs();

  // ---- TEST 1: the underlying totals themselves are correct, not a math bug ----
  try {
    const j = jobs.find(x => x.id === 'SLX-OV1');
    check('TEST 1: materialCost matches the Materials job_costs row', j.materialCost === 475, j.materialCost);
    check('TEST 1: laborCost reflects the real timesheet figure, not the manual entry', j.laborCost === 1194.50, j.laborCost);
    check('TEST 1: the manual Labor · in-house entry is still preserved for editing', j.laborIn === 1505.50, j.laborIn);
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: the Job Costing tab explains the override instead of silently mismatching ----
  try {
    openJob('SLX-OV1');
    document.querySelector('#subtabs [data-st="co"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 2: Total direct cost still shows the correct (real) total', body.includes('$1,669.50'), body.match(/Total direct cost[\\s\\S]{0,120}/)?.[0]);
    check('TEST 2: the Labor · in-house row now explains the timesheet override', /timesheet wins/.test(body) && body.includes('$1,194.50'), body.match(/Labor · in-house[\\s\\S]{0,300}/)?.[0]);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: a job with no override shows no confusing badge ----
  try {
    openJob('SLX-OV2');
    document.querySelector('#subtabs [data-st="co"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 3: no override badge when the manual entry matches the counted total', !/timesheet wins/.test(body));
    check('TEST 3: no materials mismatch badge either', !body.includes('check total'));
    check('TEST 3: Total direct cost is correct for this job too', body.includes('$1,100.00'), body.match(/Total direct cost[\\s\\S]{0,120}/)?.[0]);
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: the Job Costing table's own row-expand view shows the same explanation ----
  try {
    document.getElementById('detail').classList.add('hidden');
    activateTab('jobcosting');
    drawJobCosting();
    document.querySelector('[data-jc-expand="SLX-OV1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const body = document.getElementById('jobCostingTable').innerHTML;
    check('TEST 4: it now shows a Total Direct Cost line, and it is correct', body.includes('Total Direct Cost:') && body.includes('$1,669.50'), body.match(/Total Direct Cost:[\\s\\S]{0,80}/)?.[0]);
    check('TEST 4: the Labor (In-House) row explains the timesheet override here too', /timesheet wins/.test(body) && body.includes('$1,194.50'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: same view for a job with no override stays clean ----
  try {
    document.querySelector('[data-jc-expand="SLX-OV1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.querySelector('[data-jc-expand="SLX-OV2"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const body = document.getElementById('jobCostingTable').innerHTML;
    check('TEST 5: no override badge for the clean job', !/timesheet wins/.test(body));
    check('TEST 5: its Total Direct Cost is correct too', body.includes('Total Direct Cost:') && body.includes('$1,100.00'));
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
