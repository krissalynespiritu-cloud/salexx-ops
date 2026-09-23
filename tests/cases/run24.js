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
global.alert = () => {};
global.confirm = () => true;

const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}
global.check = check;
global.results = results;

global.mockJobsData = [];
global.mockClientsData = [];

function makeChain(table) {
  let lastOp = null, eqVal = null, ilikeVal = null;
  const chain = {
    select() { return chain; }, insert() { return chain; }, update() { return chain; }, delete() { return chain; },
    eq(col, val) { eqVal = val; return chain; }, neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike(col, val) { ilikeVal = val; return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() {
      if (table === 'leads') return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: null, error: null });
    },
    then(resolve) {
      if (table === 'jobs') { resolve({ data: global.mockJobsData, error: null }); return; }
      if (table === 'leads') { resolve({ data: [], error: null }); return; }
      if (table === 'clients') {
        const needle = (ilikeVal || '').replace(/%/g, '').toLowerCase();
        const matches = global.mockClientsData.filter(c => c.name.toLowerCase().includes(needle));
        resolve({ data: matches, error: null }); return;
      }
      resolve({ data: [], error: null });
    }
  };
  return chain;
}
const sbMock = { from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); }, auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} } };
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  // ---- TEST 1: Jobs tab with real jobs but a filter that matches none ----
  try {
    global.mockJobsData = [
      { job_id: 'SLX-E1', client_name: 'Filter Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false }
    ];
    await fetchJobs();
    jobStageFilter = 'Completed';
    drawJobs();
    await new Promise(r => setTimeout(r, 10));
    const body = document.getElementById('jobList').innerHTML;
    check('TEST 1: filtered-to-nothing shows a filter-specific message', body.includes('No jobs match this filter.'), body);
    jobStageFilter = 'All';
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: Jobs tab with genuinely zero jobs shows an onboarding message ----
  try {
    global.mockJobsData = [];
    await fetchJobs();
    drawJobs();
    await new Promise(r => setTimeout(r, 10));
    const body = document.getElementById('jobList').innerHTML;
    check('TEST 2: zero jobs shows the real onboarding message', body.includes('No jobs yet') && body.includes('New job'), body);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: Needs Review manual search starts with a real hint, not blank ----
  try {
    global.mockJobsData = [
      { job_id: 'SLX-NR1', client_name: 'Review Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false, needs_review: true }
    ];
    await fetchJobs();
    nrJobs = [{ job_id: 'SLX-NR1', client_name: 'Review Client', address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, sold_date: '2026-01-01' }];
    openNeedsReviewItem('jobs', 'SLX-NR1');
    await new Promise(r => setTimeout(r, 20));
    const list1 = document.getElementById('nrManualResultsList');
    check('TEST 3: manual results list is not blank before typing', list1 && list1.innerHTML.trim().length > 0, list1 && list1.innerHTML);
    check('TEST 3: shows the real "type more" hint', list1 && list1.innerHTML.includes('Type at least 2 characters'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: a manual search with zero matches shows a real "no matches" message, not blank ----
  try {
    global.mockClientsData = [{ client_id: 'C-1', name: 'Someone Else', phone: '', email: '' }];
    await nrManualSearch('zzznomatch');
    await new Promise(r => setTimeout(r, 10));
    const list = document.getElementById('nrManualResultsList');
    check('TEST 4: zero-match search shows a real message quoting the query', list.innerHTML.includes('No matches for &quot;zzznomatch&quot;.') || list.innerHTML.includes('No matches for "zzznomatch".'), list.innerHTML);
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: a manual search with a real match renders the real candidate row, not the empty message ----
  try {
    global.mockClientsData = [{ client_id: 'C-2', name: 'Real Match Client', phone: '555-1111', email: 'x@y.com' }];
    await nrManualSearch('Real Match');
    await new Promise(r => setTimeout(r, 10));
    const list = document.getElementById('nrManualResultsList');
    check('TEST 5: real match rendered', list.innerHTML.includes('Real Match Client'));
    check('TEST 5: no leftover empty-state text', !list.innerHTML.includes('No matches for'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: payroll period with zero hours shows a real, correctly-punctuated message ----
  try {
    global.payrollWeeks = { '2026-01-01': { total: 0, people: {} } };
    global.payrollPaid = {};
    openPayrollPeriod('2026-01-01');
    await new Promise(r => setTimeout(r, 10));
    const body = document.getElementById('ppBody').innerHTML;
    check('TEST 6: shows the real empty message with correct punctuation', body.includes('No hours logged this period.'), body);
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

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
  (0, eval)(mainScript + '\n' + testLogic);
} catch (e) {
  console.log('FAIL setup:', e.stack);
  process.exit(1);
}

setTimeout(() => {
  process.exit(global.__TEST_FAIL_COUNT__ ? 1 : 0);
}, 1500);
