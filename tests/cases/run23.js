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
global.alert = () => { throw new Error('alert() should never be called anymore'); };
global.confirm = () => true;

const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}
global.check = check;
global.results = results;

global.mockJobsData = [
  { job_id: 'SLX-HASH1', client_name: 'Hash Client One', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false },
  { job_id: 'SLX-HASH2', client_name: 'Hash Client Two', client_id: null, address_city: '1 Test St', job_type: 'Siding', stage: 'In Progress', contract_price: 3000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false }
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
      let src = table === 'jobs' ? global.mockJobsData : [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}
const sbMock = { from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); }, auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} } };
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  const clickTab = (tab) => document.querySelector('.sidebarLink[data-tab="' + tab + '"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await fetchJobs();
  drawJobs();

  // ---- TEST 1: switching to a real tab updates the URL hash ----
  try {
    clickTab('jobs');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 1: hash reflects the real Jobs tab', location.hash === '#jobs', location.hash);
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: switching back to Today clears the hash (not "#today") ----
  try {
    clickTab('today');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 2: hash cleared for Today', location.hash === '' || location.hash === '#', location.hash);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: opening a real job sets a job/<id> hash ----
  try {
    openJob('SLX-HASH1');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 3: hash reflects the real open job', location.hash === '#job/SLX-HASH1', location.hash);
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: clicking Back closes the job and restores the underlying tab's hash ----
  try {
    clickTab('jobs');
    await new Promise(r => setTimeout(r, 20));
    document.querySelector('[data-open="SLX-HASH2"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 4 setup: real job opened from Jobs tab', location.hash === '#job/SLX-HASH2', location.hash);
    document.getElementById('back').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 4: back restores the Jobs tab hash (not Today)', location.hash === '#jobs', location.hash);
    check('TEST 4: detail panel really hidden', document.getElementById('detail').classList.contains('hidden'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: manually navigating the hash to a real tab (simulating browser back/forward) applies it ----
  try {
    clickTab('jobs');
    await new Promise(r => setTimeout(r, 20));
    location.hash = 'labor';
    window.dispatchEvent(new Event('hashchange'));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 5: manual hash change to a real tab activates it', !document.getElementById('s-labor').classList.contains('hidden'));
    check('TEST 5: previous tab section now hidden', document.getElementById('s-jobs').classList.contains('hidden'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: manually navigating the hash to a real job/<id> opens that job ----
  try {
    location.hash = 'job/SLX-HASH1';
    window.dispatchEvent(new Event('hashchange'));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 6: manual hash change to a real job opens it', !document.getElementById('detail').classList.contains('hidden'));
    check('TEST 6: correct job shown', document.getElementById('dSub').innerHTML.includes('SLX-HASH1'));
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7: a hash pointing at a job that does not exist falls back to a tab instead of throwing ----
  try {
    location.hash = 'job/SLX-DOES-NOT-EXIST';
    window.dispatchEvent(new Event('hashchange'));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 7: no throw on unknown job hash', true);
    check('TEST 7: detail panel not left open for a nonexistent job', document.getElementById('detail').classList.contains('hidden'));
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

  // ---- TEST 8: a stale/duplicate hashchange that already matches current state does not re-trigger a redraw ----
  try {
    clickTab('jobs');
    await new Promise(r => setTimeout(r, 20));
    document.querySelector('[data-open="SLX-HASH1"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    document.querySelector('#subtabs [data-st="co"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const beforeBody = document.getElementById('dBody').innerHTML;
    window.dispatchEvent(new Event('hashchange'));
    await new Promise(r => setTimeout(r, 30));
    const afterBody = document.getElementById('dBody').innerHTML;
    check('TEST 8: a redundant hashchange for the already-current job does not reset the open subtab', beforeBody === afterBody && !afterBody.includes('Project Health'));
  } catch (e) { check('TEST 8: no throw', false, e.stack); }

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
