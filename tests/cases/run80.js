const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const domHtml = fs.readFileSync(path.join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(path.join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');
const leadsScript = fs.readFileSync(path.join(__dirname, '..', '_generated', 'block2.js'), 'utf8');

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

// Feature: Monthly KPI's month rows are now expandable, like Profitability's
// period rows -- clicking a month drills down into the real leads behind
// that month's Leads/Appts/Sales/Revenue numbers (monthly_kpi groups all of
// those by lead_date, see 05_phase3.sql), and shows each Won lead's linked
// job/contract, if any.
global.mockJobsData = [
  { job_id: 'SLX-M1', client_name: 'Won Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 15000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-03-06', completed_date: null, monday_item_id: null, retired: false }
];
global.mockLeadsData = [
  { lead_id: 'L-1', name: 'Won Lead Person', phone: '', email: '', source: 'Referral', status: 'Won', lead_date: '2026-03-05', est_value: 15000, job_id: 'SLX-M1', estimate_booked: true, design_sent_date: '2026-03-06', closed_revenue: 15000 },
  { lead_id: 'L-2', name: 'New Lead Person', phone: '', email: '', source: 'Facebook', status: 'New', lead_date: '2026-03-10', est_value: 0, job_id: null, estimate_booked: false, design_sent_date: null, closed_revenue: null }
];
global.mockMonthlyKpiData = [
  { month: '2026-03-01', ad_spend: null, leads: 2, appointments: 1, estimates: 0, sales: 1, lost: 0, revenue: 15000, lead_to_appt_pct: 50, appt_to_estimate_pct: null, estimate_to_sale_pct: null, overall_close_pct: 50, avg_job_size: 15000, cost_per_lead: null }
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
      if (table === 'jobs') { resolve({ data: global.mockJobsData, error: null }); return; }
      if (table === 'leads') { resolve({ data: global.mockLeadsData, error: null }); return; }
      if (table === 'monthly_kpi') { resolve({ data: global.mockMonthlyKpiData, error: null }); return; }
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

const testLogic = `
(async () => {
  await fetchJobs();
  await window.refreshLeads();
  const clickTab = (tab) => document.querySelector('.sidebarLink[data-tab="' + tab + '"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  clickTab('monthlykpi');
  await new Promise(r => setTimeout(r, 20));

  // ---- TEST 1: the month row renders with an expand caret, collapsed by default ----
  try {
    const html = document.getElementById('monthlyKpiTable').innerHTML;
    check('TEST 1: shows the month row', html.includes('data-mk-period="2026-03"'));
    check('TEST 1: no drill-down content before expanding', !html.includes('Won Lead Person') && !html.includes('New Lead Person'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: clicking the month expands it to show the real leads behind the numbers ----
  try {
    document.querySelector('[data-mk-period="2026-03"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const html = document.getElementById('monthlyKpiTable').innerHTML;
    const wonRow = html.match(/Won Lead Person[\\s\\S]{0,900}?<\\/tr>/)?.[0] || '';
    const newRow = html.match(/New Lead Person[\\s\\S]{0,900}?<\\/tr>/)?.[0] || '';
    check('TEST 2: shows the Won lead by name', html.includes('Won Lead Person'));
    check('TEST 2: shows the Won lead\\'s source under the Leads column', wonRow.includes('Referral'));
    check('TEST 2: Won lead has an Appt checkmark', (wonRow.match(/✓/g) || []).length >= 3, wonRow);
    check('TEST 2: shows the Won lead\\'s closed revenue', wonRow.includes('$15,000.00'));
    check('TEST 2: shows a click-through to the linked job for the Won lead', wonRow.includes('data-open="SLX-M1"'));
    check('TEST 2: shows the second, non-Won lead too', html.includes('New Lead Person'));
    check('TEST 2: the non-Won lead shows its source too', newRow.includes('Facebook'));
    check('TEST 2: the non-Won lead has no checkmarks at all (nothing booked/sent/won)', !newRow.includes('✓'), newRow);
    check('TEST 2: the non-Won lead has no linked-job button (not Won, no job_id)', !newRow.includes('data-open='));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: clicking again collapses it back, without re-fetching monthly_kpi ----
  try {
    document.querySelector('[data-mk-period="2026-03"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const html = document.getElementById('monthlyKpiTable').innerHTML;
    check('TEST 3: drill-down gone after collapsing', !html.includes('Won Lead Person'));
    check('TEST 3: the month row and its real numbers are still there', html.includes('data-mk-period="2026-03"') && html.includes('$15,000.00'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  console.log('\\n=== PASS (' + results.pass.length + ') ===');
  results.pass.forEach(p => console.log('  ok - ' + p));
  console.log('\\n=== FAIL (' + results.fail.length + ') ===');
  results.fail.forEach(f => console.log('  FAIL - ' + f));
  global.__TEST_FAIL_COUNT__ = results.fail.length;
})();
`;

try {
  (0, eval)(mainScript + '\n' + leadsScript + '\n' + testLogic);
} catch (e) {
  console.log('FAIL setup:', e.stack);
  process.exit(1);
}

setTimeout(() => {
  process.exit(global.__TEST_FAIL_COUNT__ ? 1 : 0);
}, 1500);
