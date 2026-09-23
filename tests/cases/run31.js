const fs = require('fs');
const path = require('path');

const domHtml = fs.readFileSync(path.join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(path.join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');

const { JSDOM } = require('jsdom');
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

// Every table fetchJobs() reads gets an artificial 20ms round-trip delay.
// If all 11 queries are truly dispatched in parallel (one Promise.all),
// fetchJobs() should take roughly one delay's worth of wall-clock time
// (~20-40ms with scheduling overhead). If a future edit accidentally
// reintroduces sequential `await`s for any of them, wall-clock time climbs
// roughly linearly with however many queries got serialized -- 11 sequential
// 20ms round-trips would take ~220ms. This is a real regression that a
// pure correctness check (right data returned) would never catch.
const DELAY_MS = 20;
global.mockJobsData = [
  { job_id: 'SLX-PERF1', client_name: 'Perf Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false }
];
global.dispatchTimestamps = [];

function makeChain(table) {
  const dispatchedAt = Date.now();
  const chain = {
    select() { return chain; }, insert() { return chain; }, update() { return chain; }, delete() { return chain; },
    eq() { return chain; }, neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() { return new Promise(resolve => setTimeout(() => resolve({ data: null, error: null }), DELAY_MS)); },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      global.dispatchTimestamps.push({ table, dispatchedAt });
      setTimeout(() => {
        const src = table === 'jobs' ? global.mockJobsData : [];
        resolve({ data: src, error: null });
      }, DELAY_MS);
    }
  };
  return chain;
}
const sbMock = { from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); }, auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} } };
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  // ---- TEST 1: fetchJobs() dispatches all its queries within the same tick (true parallel fan-out) ----
  try {
    global.dispatchTimestamps = [];
    const start = Date.now();
    const ok = await fetchJobs();
    const elapsed = Date.now() - start;
    check('TEST 1: fetchJobs() still returns success with the real seeded job', ok === true && jobs.some(j => j.id === 'SLX-PERF1'));
    check('TEST 1: at least 10 distinct queries were dispatched (jobs, job_margins, job_costs, sub_payments, job_updates, job_vendor_invoice_totals, material_request_summary, tasks, job_change_orders, job_punch_items, job_permits)', global.dispatchTimestamps.length >= 10, global.dispatchTimestamps.map(d => d.table).join(','));
    const dispatchSpread = Math.max(...global.dispatchTimestamps.map(d => d.dispatchedAt)) - Math.min(...global.dispatchTimestamps.map(d => d.dispatchedAt));
    check('TEST 1: every query was dispatched within a few ms of each other, not staggered one-after-another', dispatchSpread < ${DELAY_MS}, 'dispatch spread was ' + dispatchSpread + 'ms');
    check('TEST 1: total time is close to one round-trip (~' + ${DELAY_MS} + 'ms), not the sum of 11 sequential round-trips (~' + (${DELAY_MS} * 11) + 'ms) -- proves real parallel execution, not just reordered code', elapsed < ${DELAY_MS} * 4, 'took ' + elapsed + 'ms');
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

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
