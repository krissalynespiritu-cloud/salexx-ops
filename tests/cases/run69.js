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

// Bug: on the main Job Costing page, clicking a job's client name (e.g.
// "Brad") opened that JOB's own detail view -- there was no way to see the
// client's own info (other projects, lifetime value, contact info) without
// leaving Job Costing entirely and searching for them on the Clients page.
// Fixed by making the client name open the client's detail popup directly,
// with a small separate "Open job" icon button preserving the old
// click-through-to-the-job behavior for jobs that have a linked client.
// Jobs with no linked client_id keep the old behavior (name is plain text,
// only the "Open job" button navigates) since there's no client to open.
global.mockJobsData = [
  { job_id: 'SLX-B1', client_name: 'Brad', client_id: 'C-BRAD', address_city: '1 Test St', job_type: 'Roofing', stage: 'Punch List / Touch-ups (if needed)', contract_price: 46450, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false },
  { job_id: 'SLX-B2', client_name: 'No Client Linked', client_id: null, address_city: '2 Test St', job_type: 'Siding', stage: 'In Progress', contract_price: 4000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-02', completed_date: null, monday_item_id: null, retired: false }
];
global.mockClientValueData = [
  { client_id: 'C-BRAD', name: 'Brad', phone: '', email: '', city: '1 Test St', first_source: null, lifetime_value: 46450, projects: 1, is_repeat: false, avg_margin_pct: 40 }
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
      const src = table === 'jobs' ? global.mockJobsData : table === 'client_value' ? global.mockClientValueData : [];
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
  await drawClients();
  activateTab('jobcosting');
  drawJobCosting();

  // ---- TEST 1: the client name is a link that opens the client detail popup, not the job ----
  try {
    const link = document.querySelector('#jobCostingTable [data-open-client="C-BRAD"]');
    check('TEST 1: the client name renders as a data-open-client link', !!link, document.getElementById('jobCostingTable').innerHTML.slice(0, 400));
    check('TEST 1: it shows the client name as its text', link.textContent === 'Brad');
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: clicking the client name opens the Client detail view for Brad, not the job ----
  try {
    document.querySelector('#jobCostingTable [data-open-client="C-BRAD"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    check('TEST 2: the client detail view is now visible', !document.getElementById('clientDetail').classList.contains('hidden'));
    check('TEST 2: it shows Brad', document.getElementById('clName').textContent === 'Brad');
    check('TEST 2: the job detail view was NOT opened', document.getElementById('detail').classList.contains('hidden'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: a separate "Open job" button still opens the actual job ----
  try {
    document.getElementById('clientBack').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const openJobBtn = document.querySelector('#jobCostingTable [data-open="SLX-B1"]');
    check('TEST 3: an Open-job button exists for this row', !!openJobBtn);
    openJobBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    check('TEST 3: clicking it opens the job detail view', !document.getElementById('detail').classList.contains('hidden'));
    check('TEST 3: it is the right job', document.getElementById('dName').textContent === 'Brad');
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: a job with no linked client keeps the old plain-text behavior (nothing to open as a client) ----
  try {
    document.getElementById('back').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    check('TEST 4: no data-open-client link for the unlinked job', !document.querySelector('#jobCostingTable [data-open-client=""]'));
    const openJobBtn2 = document.querySelector('#jobCostingTable [data-open="SLX-B2"]');
    check('TEST 4: its Open-job button still works', !!openJobBtn2);
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
