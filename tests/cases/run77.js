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
// Node 21+ ships its own read-only globalThis.navigator getter (no setter),
// so a plain assignment here silently no-ops -- must redefine the property
// outright to make navigator.onLine reflect jsdom's window instead.
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true, writable: true });
// jsdom's own navigator.onLine is hardcoded true and can't be changed by
// setting it directly (real connectivity isn't simulated) -- override it
// with a controllable getter so the offline/online event tests can flip it.
global.__fakeOnLine = true;
Object.defineProperty(global.navigator, 'onLine', { get: () => global.__fakeOnLine, configurable: true });
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

// Feature: (1) a global "You're offline" banner that shows/hides based on
// real online/offline browser events, and (2) a shared retryableErrorHTML()
// helper -- any fetch-failure message can now include a real "Retry"
// button that re-runs the failed load, instead of leaving the user stuck
// with a dead-end error and no way to recover short of a full page reload.
global.mockJobsData = [];
global.retryCallCount = { dup: 0, deleted: 0 };

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
      if (table === 'possible_duplicates') {
        global.retryCallCount.dup++;
        resolve({ data: null, error: { message: 'network error' } }); return;
      }
      if (table === 'job_force_delete_log') {
        global.retryCallCount.deleted++;
        resolve({ data: null, error: { message: 'network error' } }); return;
      }
      resolve({ data: [], error: null });
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

  // ---- TEST 1: the offline banner starts hidden when the browser reports online ----
  try {
    check('TEST 1: offlineBanner element exists', !!document.getElementById('offlineBanner'));
    check('TEST 1: it starts hidden (navigator.onLine is true)', document.getElementById('offlineBanner').classList.contains('hidden'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: going offline (real 'offline' event, matching what a browser fires) shows the banner; 'online' hides it again ----
  try {
    global.__fakeOnLine = false;
    window.dispatchEvent(new Event('offline'));
    check('TEST 2: banner shows on offline event', !document.getElementById('offlineBanner').classList.contains('hidden'));
    global.__fakeOnLine = true;
    window.dispatchEvent(new Event('online'));
    check('TEST 2: banner hides again on online event', document.getElementById('offlineBanner').classList.contains('hidden'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: a failed Data Health load shows a real Retry button, and clicking it re-runs the load ----
  try {
    activateTab('datahealth');
    await new Promise(r => setTimeout(r, 30));
    const dupHtml = document.getElementById('dupJobsPanel').innerHTML;
    check('TEST 3: shows the error message', dupHtml.includes('duplicate candidates'));
    const retryBtn = document.querySelector('#dupJobsPanel [data-retry-fn="loadAndRenderDuplicateJobs"]');
    check('TEST 3: a real Retry button exists, wired to the actual reload function', !!retryBtn);
    const before = global.retryCallCount.dup;
    retryBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 3: clicking Retry actually re-ran the failed query', global.retryCallCount.dup === before + 1);
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: same pattern for the Deleted Jobs panel ----
  try {
    const retryBtn2 = document.querySelector('#deletedJobsPanel [data-retry-fn="loadAndRenderDeletedJobs"]');
    check('TEST 4: Deleted Jobs panel also has a real Retry button', !!retryBtn2);
    const before = global.retryCallCount.deleted;
    retryBtn2.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 4: clicking it re-ran the failed query', global.retryCallCount.deleted === before + 1);
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: the boot-failure auth gate also gets a real Retry button wired to boot() ----
  try {
    showAuthGate('Couldn\\'t load data (network error) — check your connection and try again.');
    const authErrorHtml = document.getElementById('authError').innerHTML;
    check('TEST 5: shows the error message', authErrorHtml.includes('network error'));
    check('TEST 5: shows a Retry button wired to boot()', document.querySelector('#authError [data-retry-fn="boot"]') !== null);
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
}, 2000);
