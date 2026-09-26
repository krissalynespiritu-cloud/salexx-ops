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

// Bug: openClient(clientId) looked the client up in the module-level
// `clientValues` array, which is only populated by drawClients() -- and
// drawClients() only ever ran once the Clients sidebar tab had actually
// been visited this session. Every data-open-client link app-wide (Job
// Costing's client name, global search's "open client" result, the
// Clients list itself before this session's Job Costing fix) silently
// did nothing if a user clicked it without having visited Clients first,
// which is the common case -- e.g. landing on Job Costing straight from
// a bookmark or the Today dashboard. Fixed by having openClient fetch
// client_value itself (via drawClients()) the first time it's needed,
// instead of assuming some other page already populated it.
global.mockJobsData = [
  { job_id: 'SLX-H1', client_name: 'Cold Start Client', client_id: 'C-COLD', address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false }
];
global.mockClientValueData = [
  { client_id: 'C-COLD', name: 'Cold Start Client', phone: '555-1234', email: '', city: '1 Test St', first_source: null, lifetime_value: 5000, projects: 1, is_repeat: false, avg_margin_pct: 40 }
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
  activateTab('jobcosting');
  drawJobCosting();

  // ---- TEST 1: clientValues starts empty -- the Clients tab was never visited this session ----
  try {
    check('TEST 1: clientValues is empty before opening a client', clientValues.length === 0, clientValues.length);
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: opening a client cold (no prior drawClients() call) still works -- it fetches client_value itself ----
  try {
    await openClient('C-COLD');
    check('TEST 2: the client detail view opened anyway', !document.getElementById('clientDetail').classList.contains('hidden'));
    check('TEST 2: it shows the real client name', document.getElementById('clName').textContent === 'Cold Start Client');
    check('TEST 2: clientValues got populated as a side effect', clientValues.length === 1);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: the same data-open-client link from Job Costing works cold too (not just a direct function call) ----
  try {
    document.getElementById('clientBack').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const link = document.querySelector('#jobCostingTable [data-open-client="C-COLD"]');
    check('TEST 3: the link exists', !!link);
    link.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 3: clicking it opened the client popup', !document.getElementById('clientDetail').classList.contains('hidden'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

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
