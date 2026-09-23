const { JSDOM } = require('jsdom');
const fs = require('fs');

const domHtml = fs.readFileSync(require('path').join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(require('path').join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');

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
  { job_id: 'SLX-ESC1', client_name: 'Escape Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false, needs_review: true }
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
    then(resolve) { let src = table === 'jobs' ? global.mockJobsData : []; resolve({ data: src, error: null }); }
  };
  return chain;
}
const sbMock = { from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); }, auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} } };
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  const esc = (target) => (target || document.body).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await fetchJobs();

  // ---- TEST 1: Escape closes the Task modal ----
  try {
    openTaskModal(null);
    await new Promise(r => setTimeout(r, 10));
    check('TEST 1 setup: task modal really open', !document.getElementById('taskModal').classList.contains('hidden'));
    esc();
    await new Promise(r => setTimeout(r, 10));
    check('TEST 1: Escape closed the task modal', document.getElementById('taskModal').classList.contains('hidden'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: Escape resolves a plain (non-prompt) confirm dialog as Cancel, even when focus is not in an input ----
  try {
    let resolved = null;
    confirmDialog('Delete this?', 'Real body text').then(r => { resolved = r; });
    await new Promise(r => setTimeout(r, 10));
    check('TEST 2 setup: confirm modal really open', !document.getElementById('confirmModal').classList.contains('hidden'));
    esc(document.body);
    await new Promise(r => setTimeout(r, 10));
    check('TEST 2: Escape closed the confirm modal', document.getElementById('confirmModal').classList.contains('hidden'));
    check('TEST 2: it resolved to false (Cancel), not left hanging', resolved === false);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: Escape closes the Needs Review modal ----
  try {
    nrJobs = [{ job_id: 'SLX-ESC1', client_name: 'Escape Client', address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, sold_date: '2026-01-01' }];
    openNeedsReviewItem('jobs', 'SLX-ESC1');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 3 setup: needs review modal really open', !document.getElementById('needsReviewModal').classList.contains('hidden'));
    esc();
    await new Promise(r => setTimeout(r, 10));
    check('TEST 3: Escape closed the needs review modal', document.getElementById('needsReviewModal').classList.contains('hidden'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: Escape closes the profile panel ----
  try {
    document.getElementById('profileBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 10));
    check('TEST 4 setup: profile panel really open', !document.getElementById('profilePanel').classList.contains('hidden'));
    esc();
    await new Promise(r => setTimeout(r, 10));
    check('TEST 4: Escape closed the profile panel', document.getElementById('profilePanel').classList.contains('hidden'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: Escape closes the open mobile sidebar ----
  try {
    document.getElementById('hamburgerBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 10));
    check('TEST 5 setup: sidebar really open', document.getElementById('sidebar').classList.contains('open'));
    esc();
    await new Promise(r => setTimeout(r, 10));
    check('TEST 5: Escape closed the sidebar', !document.getElementById('sidebar').classList.contains('open'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: with two overlays open at once, Escape closes only the topmost-priority one, not both ----
  try {
    openTaskModal(null);
    document.getElementById('profileBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 10));
    check('TEST 6 setup: both really open', !document.getElementById('taskModal').classList.contains('hidden') && !document.getElementById('profilePanel').classList.contains('hidden'));
    esc();
    await new Promise(r => setTimeout(r, 10));
    check('TEST 6: task modal (higher priority) closed', document.getElementById('taskModal').classList.contains('hidden'));
    check('TEST 6: profile panel (lower priority) is untouched by that one Escape press', !document.getElementById('profilePanel').classList.contains('hidden'));
    esc();
    await new Promise(r => setTimeout(r, 10));
    check('TEST 6: a second Escape then closes the profile panel too', document.getElementById('profilePanel').classList.contains('hidden'));
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7: Escape while typing in the real prompt-modal input still works the original way (not double-handled) ----
  try {
    createJob();
    await new Promise(r => setTimeout(r, 10));
    const inp = document.getElementById('confirmModalInput');
    esc(inp);
    await new Promise(r => setTimeout(r, 10));
    check('TEST 7: Escape in the prompt input still closes it', document.getElementById('confirmModal').classList.contains('hidden'));
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

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
