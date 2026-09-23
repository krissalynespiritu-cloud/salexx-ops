const fs = require('fs');
const path = require('path');

const domHtml = fs.readFileSync(path.join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(path.join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');
const leadsScript = fs.readFileSync(path.join(__dirname, '..', '_generated', 'block2.js'), 'utf8');

const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!doctype html><html><body>${domHtml}</body></html>`, { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.MouseEvent = dom.window.MouseEvent;
global.KeyboardEvent = dom.window.KeyboardEvent;
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

global.mockJobsData = [
  { job_id: 'SLX-B', client_name: 'Bravo Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 3000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-02-01', completed_date: null, monday_item_id: null, retired: false },
  { job_id: 'SLX-A', client_name: 'Alpha Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false },
  { job_id: 'SLX-C', client_name: 'Charlie Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 4000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-03-01', completed_date: null, monday_item_id: null, retired: false }
];
global.mockEstimatesData = [
  { estimate_id: 'EST-B', client_name: 'Bravo Estimate', pipeline_status: 'Sent', requested_date: '2026-02-15', amount: 1000 },
  { estimate_id: 'EST-A', client_name: 'Alpha Estimate', pipeline_status: 'Sent', requested_date: '2026-01-15', amount: 1000 },
  { estimate_id: 'EST-C', client_name: 'Charlie Estimate', pipeline_status: 'Sent', requested_date: '2026-03-15', amount: 1000 }
];
global.mockVendorInvoicesData = [
  { invoice_id: 'VI-B', vendor: 'Bravo Supply', bill_date: '2026-02-10', total_amount: 100, payment_status: 'Unpaid' },
  { invoice_id: 'VI-A', vendor: 'Alpha Supply', bill_date: '2026-01-10', total_amount: 100, payment_status: 'Unpaid' },
  { invoice_id: 'VI-C', vendor: 'Charlie Supply', bill_date: '2026-03-10', total_amount: 100, payment_status: 'Unpaid' }
];
global.mockLeadsData = [
  { lead_id: 'L-B', name: 'Bravo Lead', phone: '', email: '', source: 'Referral', status: 'New', lead_date: '2026-02-20', value: 0 },
  { lead_id: 'L-A', name: 'Alpha Lead', phone: '', email: '', source: 'Referral', status: 'New', lead_date: '2026-01-20', value: 0 },
  { lead_id: 'L-C', name: 'Charlie Lead', phone: '', email: '', source: 'Referral', status: 'New', lead_date: '2026-03-20', value: 0 }
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
      else if (table === 'estimates') src = global.mockEstimatesData;
      else if (table === 'vendor_invoices') src = global.mockVendorInvoicesData;
      else if (table === 'leads') src = global.mockLeadsData;
      else src = [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}
const sbMock = { from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); }, auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {}, getUser() { return Promise.resolve({ data: { user: { id: 'U-1' } } }); } } };
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  const clickTab = (tab) => document.querySelector('.sidebarLink[data-tab="' + tab + '"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const setVal = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); };

  await fetchJobs();
  drawJobs();

  // ---- JOBS PAGE ----
  try {
    clickTab('jobs');
    await new Promise(r => setTimeout(r, 20));
    let body = document.getElementById('jobList').innerHTML;
    check('Jobs: defaults to newest-sold-first', body.indexOf('Charlie Client') < body.indexOf('Bravo Client') && body.indexOf('Bravo Client') < body.indexOf('Alpha Client'), 'order wrong');
    setVal('jobSort', 'nameAsc');
    body = document.getElementById('jobList').innerHTML;
    check('Jobs: Name A-Z sort works', body.indexOf('Alpha Client') < body.indexOf('Bravo Client') && body.indexOf('Bravo Client') < body.indexOf('Charlie Client'));
    setVal('jobSort', 'soldAsc');
    body = document.getElementById('jobList').innerHTML;
    check('Jobs: oldest-sold-first sort works', body.indexOf('Alpha Client') < body.indexOf('Bravo Client') && body.indexOf('Bravo Client') < body.indexOf('Charlie Client'));
    document.getElementById('jobSort').value = 'soldDesc';
    setVal('jobDateFrom', '2026-02-01');
    setVal('jobDateTo', '2026-02-28');
    body = document.getElementById('jobList').innerHTML;
    check('Jobs: date range filter includes only Bravo (Feb)', body.includes('Bravo Client') && !body.includes('Alpha Client') && !body.includes('Charlie Client'), body.slice(0, 500));
    document.getElementById('jobDateClear').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    body = document.getElementById('jobList').innerHTML;
    check('Jobs: Clear dates restores all three', body.includes('Alpha Client') && body.includes('Bravo Client') && body.includes('Charlie Client'));
  } catch (e) { check('Jobs: no throw', false, e.stack); }

  // ---- ESTIMATES PAGE (drawEstimates refetches from Supabase on every change, so each step needs a real wait) ----
  try {
    await drawEstimates();
    let body = document.getElementById('estList').innerHTML;
    check('Estimates: defaults to newest-requested-first', body.indexOf('Charlie Estimate') < body.indexOf('Bravo Estimate') && body.indexOf('Bravo Estimate') < body.indexOf('Alpha Estimate'));
    setVal('estSort', 'nameAsc');
    await new Promise(r => setTimeout(r, 20));
    body = document.getElementById('estList').innerHTML;
    check('Estimates: Name A-Z sort works', body.indexOf('Alpha Estimate') < body.indexOf('Bravo Estimate') && body.indexOf('Bravo Estimate') < body.indexOf('Charlie Estimate'));
    document.getElementById('estSort').value = 'dateDesc';
    setVal('estDateFrom', '2026-02-01');
    await new Promise(r => setTimeout(r, 20));
    setVal('estDateTo', '2026-02-28');
    await new Promise(r => setTimeout(r, 20));
    body = document.getElementById('estList').innerHTML;
    check('Estimates: date range filter includes only Bravo (Feb)', body.includes('Bravo Estimate') && !body.includes('Alpha Estimate') && !body.includes('Charlie Estimate'));
    document.getElementById('estDateClear').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    body = document.getElementById('estList').innerHTML;
    check('Estimates: Clear dates restores all three', body.includes('Alpha Estimate') && body.includes('Bravo Estimate') && body.includes('Charlie Estimate'));
  } catch (e) { check('Estimates: no throw', false, e.stack); }

  // ---- VENDOR PAYABLES PAGE (drawVendorPayables fetches+populates viRows once; renderVendorPayables is the sync re-render the sort/filter controls use) ----
  try {
    await drawVendorPayables();
    let body = document.getElementById('viList').innerHTML;
    check('Vendor Payables: defaults to newest-bill-date-first', body.indexOf('Charlie Supply') < body.indexOf('Bravo Supply') && body.indexOf('Bravo Supply') < body.indexOf('Alpha Supply'));
    setVal('viSort', 'vendorAsc');
    body = document.getElementById('viList').innerHTML;
    check('Vendor Payables: Vendor A-Z sort works', body.indexOf('Alpha Supply') < body.indexOf('Bravo Supply') && body.indexOf('Bravo Supply') < body.indexOf('Charlie Supply'));
    document.getElementById('viSort').value = 'dateDesc';
    setVal('viDateFrom', '2026-02-01');
    setVal('viDateTo', '2026-02-28');
    body = document.getElementById('viList').innerHTML;
    check('Vendor Payables: date range filter includes only Bravo (Feb)', body.includes('Bravo Supply') && !body.includes('Alpha Supply') && !body.includes('Charlie Supply'));
    document.getElementById('viDateClear').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    body = document.getElementById('viList').innerHTML;
    check('Vendor Payables: Clear dates restores all three', body.includes('Alpha Supply') && body.includes('Bravo Supply') && body.includes('Charlie Supply'));
  } catch (e) { check('Vendor Payables: no throw', false, e.stack); }

  // ---- LEADS TRACKER PAGE (biggest real-world list in the app -- 224 records today, the top priority) ----
  try {
    clickTab('leadstracker');
    await window.refreshLeads();
    await new Promise(r => setTimeout(r, 20));
    let body = document.getElementById('leadList').innerHTML;
    check('Leads: defaults to newest-lead-date-first', body.indexOf('Charlie Lead') < body.indexOf('Bravo Lead') && body.indexOf('Bravo Lead') < body.indexOf('Alpha Lead'), body.slice(0, 400));
    setVal('leadSort', 'nameAsc');
    body = document.getElementById('leadList').innerHTML;
    check('Leads: Name A-Z sort works', body.indexOf('Alpha Lead') < body.indexOf('Bravo Lead') && body.indexOf('Bravo Lead') < body.indexOf('Charlie Lead'));
    setVal('leadSort', 'dateAsc');
    body = document.getElementById('leadList').innerHTML;
    check('Leads: oldest-first sort works', body.indexOf('Alpha Lead') < body.indexOf('Bravo Lead') && body.indexOf('Bravo Lead') < body.indexOf('Charlie Lead'));
    document.getElementById('leadSort').value = 'dateDesc';
    setVal('leadDateFrom', '2026-02-01');
    setVal('leadDateTo', '2026-02-28');
    body = document.getElementById('leadList').innerHTML;
    check('Leads: date range filter includes only Bravo (Feb)', body.includes('Bravo Lead') && !body.includes('Alpha Lead') && !body.includes('Charlie Lead'));
    document.getElementById('leadDateClear').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    body = document.getElementById('leadList').innerHTML;
    check('Leads: Clear dates restores all three', body.includes('Alpha Lead') && body.includes('Bravo Lead') && body.includes('Charlie Lead'));
  } catch (e) { check('Leads: no throw', false, e.stack); }

  // ---- unrelated features remain unaffected ----
  try {
    check('unrelated: Retire Job functions still present', typeof openRetireJobReview === 'function' && typeof confirmRetireJob === 'function');
  } catch (e) { check('unrelated: no throw', false, e.stack); }

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
}, 2000);
