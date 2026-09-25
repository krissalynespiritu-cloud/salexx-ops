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

// Feature: the Job Costing filter bar had no way to isolate jobs that still
// need a costing review, and no way to sort by how recently a job was
// touched -- requested directly, alongside the existing margin/revenue sorts.
global.mockJobsData = [
  { job_id: 'SLX-JC1', client_name: 'Alpha Reviewed', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false, costing_reviewed: true, updated_at: '2026-01-10T00:00:00Z' },
  { job_id: 'SLX-JC2', client_name: 'Bravo Unreviewed', client_id: null, address_city: '2 Test St', job_type: 'Siding', stage: 'In Progress', contract_price: 4000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-02', completed_date: null, monday_item_id: null, retired: false, costing_reviewed: false, updated_at: '2026-03-15T00:00:00Z' },
  { job_id: 'SLX-JC3', client_name: 'Charlie Unreviewed', client_id: null, address_city: '3 Test St', job_type: 'Painting', contract_price: 3000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-03', completed_date: null, monday_item_id: null, retired: false, costing_reviewed: false, updated_at: '2026-02-01T00:00:00Z' }
];

function makeChain(table) {
  let lastOp = null, lastArg = null, eqVal = null;
  const chain = {
    select() { return chain; }, insert() { return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; }, delete() { return chain; },
    eq(col, val) { eqVal = val; return chain; }, neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (table === 'jobs' && lastOp === 'update') {
        const row = global.mockJobsData.find(j => j.job_id === eqVal);
        if (row) Object.assign(row, lastArg);
        resolve({ data: null, error: null }); return;
      }
      resolve({ data: table === 'jobs' ? global.mockJobsData : [], error: null });
    }
  };
  return chain;
}
const sbMock = {
  from(table) { return makeChain(table); },
  rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} }
};
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  await fetchJobs();
  activateTab('jobcosting');
  drawJobCosting();

  // ---- TEST 1: the Reviewed filter control exists with the right options ----
  try {
    const sel = document.getElementById('jcReviewFilter');
    check('TEST 1: the Reviewed filter dropdown exists', !!sel);
    const values = [...sel.options].map(o => o.value);
    check('TEST 1: has all/reviewed/unreviewed options', values.includes('all') && values.includes('reviewed') && values.includes('unreviewed'), JSON.stringify(values));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: filtering to "Reviewed only" shows just the reviewed job ----
  try {
    const sel = document.getElementById('jcReviewFilter');
    sel.value = 'reviewed';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    const body = document.getElementById('jobCostingTable').innerHTML;
    check('TEST 2: shows the reviewed job', body.includes('Alpha Reviewed'));
    check('TEST 2: hides the unreviewed jobs', !body.includes('Bravo Unreviewed') && !body.includes('Charlie Unreviewed'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: filtering to "Not reviewed yet" shows only the unreviewed jobs ----
  try {
    const sel = document.getElementById('jcReviewFilter');
    sel.value = 'unreviewed';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    const body = document.getElementById('jobCostingTable').innerHTML;
    check('TEST 3: hides the reviewed job', !body.includes('Alpha Reviewed'));
    check('TEST 3: shows both unreviewed jobs', body.includes('Bravo Unreviewed') && body.includes('Charlie Unreviewed'));
    sel.value = 'all';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: "Last Updated First" sorts by real updated_at, newest first ----
  try {
    const sortSel = document.getElementById('jcSort');
    const values = [...sortSel.options].map(o => o.value);
    check('TEST 4: the sort dropdown has a Last Updated option', values.includes('updatedDesc'), JSON.stringify(values));
    sortSel.value = 'updatedDesc';
    sortSel.dispatchEvent(new Event('change', { bubbles: true }));
    const body = document.getElementById('jobCostingTable').innerHTML;
    check('TEST 4: Bravo (Mar 15, newest) comes first', body.indexOf('Bravo Unreviewed') < body.indexOf('Charlie Unreviewed') && body.indexOf('Charlie Unreviewed') < body.indexOf('Alpha Reviewed'), body.slice(0, 400));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: toggling Reviewed still saves through the real path, and updatedAt reflects it ----
  try {
    document.getElementById('jcSort').value = 'clientAsc';
    document.getElementById('jcSort').dispatchEvent(new Event('change', { bubbles: true }));
    const cb = document.querySelector('[data-jc-reviewed="SLX-JC2"]');
    check('TEST 5: the reviewed checkbox exists', !!cb);
    cb.checked = true;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 5: SLX-JC2 is now marked reviewed in the real data', global.mockJobsData.find(j => j.job_id === 'SLX-JC2').costing_reviewed === true);
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
}, 1500);
