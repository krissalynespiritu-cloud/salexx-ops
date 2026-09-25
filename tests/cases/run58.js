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

// Audit finding: several Today-dashboard widgets fetched data with
// Promise.all and never captured (or never checked) the error half of the
// response. A failed query silently became an empty array, which then
// rendered as a confident "$0" / "0" figure -- indistinguishable from a
// real zero. Fixed loadBalanceCard, loadTopKpis, and drawMoneyAndBreakdowns
// to show a real error state per affected card instead, and drawToday's own
// 10-way Promise.all now surfaces a toast if anything in it fails.
global.mockJobsData = [
  { job_id: 'SLX-D1', client_name: 'Dash Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false }
];
global.mockFailTables = new Set();

function makeChain(table) {
  let lastOp = null;
  const chain = {
    select() { return chain; }, insert() { return chain; }, update() { return chain; }, delete() { return chain; },
    eq() { return chain; }, neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; }, not() { return chain; }, or() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (global.mockFailTables.has(table)) { resolve({ data: null, error: { message: 'Simulated ' + table + ' failure' } }); return; }
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

const testLogic = `
(async () => {
  await fetchJobs();

  // ---- TEST 1: with nothing failing, the dashboard renders real numbers and no error state ----
  try {
    await drawToday();
    await new Promise(r => setTimeout(r, 30));
    check('TEST 1: balance card shows a real dollar figure, not an error', document.getElementById('balOwedCard').innerHTML.includes('$0.00') && !document.getElementById('balOwedCard').innerHTML.includes("Couldn't load"));
    check('TEST 1: kpis row has no error state', !document.getElementById('kpis').innerHTML.includes("Couldn't load"));
    check('TEST 1: no error toast fired', !document.getElementById('toastStack').innerHTML.includes('Simulated'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: job_payments failing shows a real error, not a confident $0 ----
  try {
    global.mockFailTables = new Set(['job_payments']);
    await drawToday();
    await new Promise(r => setTimeout(r, 30));
    const balHtml = document.getElementById('balOwedCard').innerHTML;
    check('TEST 2: Total Balance card shows an error instead of $0.00', balHtml.includes("Couldn't load") && !balHtml.includes('$0.00'), balHtml);
    const moneyHtml = document.getElementById('kpisMoney').innerHTML;
    check('TEST 2: Booked revenue KPIs show an error instead of $0', moneyHtml.includes("Couldn't load"), moneyHtml);
    const backlogHtml = document.getElementById('kpisBacklog').innerHTML;
    check('TEST 2: the backlog "no deposit" card also flags the error (it depends on the same table)', backlogHtml.includes("couldn't load payment data"), backlogHtml);
    check('TEST 2: the shared dashboard fetch also surfaced a toast', document.getElementById('toastStack').innerHTML.includes('Simulated job_payments failure'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: leads failing only flags the New Leads card, not the whole dashboard ----
  try {
    global.mockFailTables = new Set(['leads']);
    await drawToday();
    await new Promise(r => setTimeout(r, 30));
    const kpisHtml = document.getElementById('kpis').innerHTML;
    const cards = kpisHtml.split('<div class="kpi"');
    const newLeadsCard = cards.find(c => c.includes('New Leads'));
    const totalRevenueCard = cards.find(c => c.includes('Total Revenue'));
    check('TEST 3: New Leads card shows an error', !!newLeadsCard && newLeadsCard.includes("Couldn't load"), newLeadsCard);
    check('TEST 3: Total Revenue is unaffected (different table)', !!totalRevenueCard && !totalRevenueCard.includes("Couldn't load"), totalRevenueCard);
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: admin_daily failing shows a real error row in the sales activity table ----
  try {
    global.mockFailTables = new Set(['admin_daily']);
    await drawToday();
    await new Promise(r => setTimeout(r, 30));
    const salesHtml = document.getElementById('salesActivityTable').innerHTML;
    check('TEST 4: sales activity table shows an error, not "No activity logged yet"', salesHtml.includes("Couldn't load") && !salesHtml.includes('No activity logged yet'), salesHtml);
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  global.mockFailTables = new Set();
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
