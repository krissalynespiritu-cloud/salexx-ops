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

// Feature: Job Costing's collapsed row only showed a job's STAGE (Completed,
// In Progress, ...), never its TRADE/service type (Roofing, Siding, ...),
// so telling jobs apart at a glance meant expanding each one. The trade now
// shows right next to the client name in the collapsed row -- and, since
// it's now always visible without expanding, the old duplicate trade badge
// at the bottom of the expanded detail was removed as redundant.
global.mockJobsData = [
  { job_id: 'SLX-T1', client_name: 'Trade Test Client', client_id: null, address_city: '1 Test St', job_type: 'Hardscaping', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false },
  { job_id: 'SLX-T2', client_name: 'No Trade Client', client_id: null, address_city: '2 Test St', job_type: null, stage: 'In Progress', contract_price: 3000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-02', completed_date: null, monday_item_id: null, retired: false }
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
      const src = table === 'jobs' ? global.mockJobsData : [];
      resolve({ data: src, error: null });
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
  activateTab('jobcosting');
  drawJobCosting();

  // ---- TEST 1: the collapsed row shows the job's trade next to the client name ----
  try {
    const html = document.getElementById('jobCostingTable').innerHTML;
    check('TEST 1: shows the real trade for a job that has one', html.match(/Trade Test Client[\\s\\S]{0,1500}/)?.[0].includes('Hardscaping'), html.match(/Trade Test Client[\\s\\S]{0,1500}/)?.[0]);
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: a job with no trade set shows nothing extra (no stray "—") ----
  try {
    const html = document.getElementById('jobCostingTable').innerHTML;
    const row = html.match(/No Trade Client[\\s\\S]{0,300}/)?.[0];
    check('TEST 2: no trade badge rendered when job_type is unset', !row.includes('>—<'), row);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: the old duplicate trade badge at the bottom of the expanded detail is gone ----
  try {
    document.querySelector('[data-jc-expand="SLX-T1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const body = document.getElementById('jobCostingTable').innerHTML;
    const overheadArea = body.match(/Overhead \\$:[\\s\\S]{0,300}/)?.[0];
    check('TEST 3: no leftover trade badge next to Overhead $', overheadArea && !overheadArea.includes('Hardscaping'), overheadArea);
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
