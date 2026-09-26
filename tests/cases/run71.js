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

// Reported bug: a job worked entirely by a subcontractor -- no in-house
// hours, no manual hours, no manually-entered Labor job_costs line -- showed
// "Incomplete" for Gross Profit and Margin % everywhere (Job Costing, Jobs
// list, Profitability), even though its full cost (materials + the real
// $3,500 subcontractor total from the Subs tab) was fully known and its
// margin was already correctly computed server-side. Root cause:
// costingComplete()/laborCostComplete() treated only in-house hours/labor
// as "labor evidence" and never checked the subcontractor total (j.sub),
// even though the job_financials view's own `unpriced` flag already
// correctly counts a subcontractor cost as pricing evidence. Reproduces
// the exact numbers from the reported case: Jane Vitek Dixon, contract
// $21,723.74, $3,500 subcontractor labor, $0 in-house labor/hours.
global.mockJobsData = [
  { job_id: 'SLX-JVD', client_name: 'Jane Vitek Dixon', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'Completed', contract_price: 21723.74, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: '2026-02-01', monday_item_id: null, retired: false }
];
global.mockMargins = [
  { job_id: 'SLX-JVD', revenue: 21723.74, labor_cost: 0, material_cost: 3500, additional_cost: 0, overhead_cost: 630, total_job_cost: 4130, gross_profit: 17593.74, margin_pct: 81, unpriced: false, hours: 0 }
];
global.mockSubPayments = [
  { job_id: 'SLX-JVD', contract_amount: 3500 }
];

function makeChain(table) {
  const chain = {
    select() { return chain; }, insert() { return chain; }, update() { return chain; }, delete() { return chain; },
    eq() { return chain; }, neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; }, not() { return chain; }, or() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      let src;
      if (table === 'jobs') src = global.mockJobsData;
      else if (table === 'job_margins') src = global.mockMargins;
      else if (table === 'sub_payments') src = global.mockSubPayments;
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
  const j = jobs.find(x => x.id === 'SLX-JVD');

  // ---- TEST 1: the raw merged fields match the reported job exactly ----
  try {
    check('TEST 1: sub cost is $3,500', j.sub === 3500, j.sub);
    check('TEST 1: in-house labor cost is $0', j.laborCost === 0, j.laborCost);
    check('TEST 1: hours is 0', j.hrs === 0, j.hrs);
    check('TEST 1: gross profit was already computed server-side', j.gp === 17593.74, j.gp);
    check('TEST 1: margin pct was already computed server-side', j.marginPct === 81, j.marginPct);
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: costingComplete now recognizes a sub-only job as complete ----
  try {
    check('TEST 2: costingComplete is true for a sub-only job', costingComplete(j) === true);
    check('TEST 2: it is not flagged unpriced', j.unpriced === false);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: the Job Costing page shows the real margin, not "Incomplete" ----
  try {
    activateTab('jobcosting');
    drawJobCosting();
    const html = document.getElementById('jobCostingTable').innerHTML;
    check('TEST 3: shows the real gross profit', html.includes('\\$17,593.74'), html.match(/Jane Vitek Dixon[\\s\\S]{0,600}/)?.[0]);
    check('TEST 3: shows the real margin percent', html.includes('80.99%'), html.match(/Jane Vitek Dixon[\\s\\S]{0,600}/)?.[0]);
    check('TEST 3: no Incomplete badge for this job', !html.match(/Jane Vitek Dixon[\\s\\S]{0,600}/)[0].includes('Incomplete'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: the job's own Job Costing subtab shows the real margin too, with no "labor cost not yet recorded" warning ----
  try {
    openJob('SLX-JVD');
    document.querySelector('#subtabs [data-st="co"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 4: no "labor cost not yet recorded" warning', !body.includes('labor cost not yet recorded'));
    check('TEST 4: shows the real subcontractor labor line', body.includes('\\$3,500.00') && body.includes('Subs tab'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

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
