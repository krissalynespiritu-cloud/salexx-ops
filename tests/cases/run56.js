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

// Feature: Reviewed alone didn't cover the real workflow -- a job can be
// reviewed but still not signed off as done. Added a separate "Approved"
// checkbox/column (jobs.costing_approved, migration 85) and a matching
// filter, independent of Reviewed (which keeps its existing meaning
// everywhere it's already used -- margin-completeness, Profitability's
// "Costing reviewed only" scope).
global.mockJobsData = [
  { job_id: 'SLX-AP1', client_name: 'Alpha Both', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false, costing_reviewed: true, costing_approved: true },
  { job_id: 'SLX-AP2', client_name: 'Bravo ReviewedOnly', client_id: null, address_city: '2 Test St', job_type: 'Siding', stage: 'In Progress', contract_price: 4000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-02', completed_date: null, monday_item_id: null, retired: false, costing_reviewed: true, costing_approved: false },
  { job_id: 'SLX-AP3', client_name: 'Charlie Neither', client_id: null, address_city: '3 Test St', job_type: 'Painting', contract_price: 3000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-03', completed_date: null, monday_item_id: null, retired: false, costing_reviewed: false, costing_approved: false }
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

  // ---- TEST 1: the Approved column and filter both exist ----
  try {
    check('TEST 1: the Approved column header exists', document.getElementById('jobCostingTable').innerHTML.includes('<th>Approved</th>'));
    check('TEST 1: each row has an Approved checkbox', !!document.querySelector('[data-jc-approved="SLX-AP1"]'));
    const sel = document.getElementById('jcApprovedFilter');
    check('TEST 1: the Approved filter dropdown exists', !!sel);
    const values = [...sel.options].map(o => o.value);
    check('TEST 1: has all/approved/unapproved options', values.includes('all') && values.includes('approved') && values.includes('unapproved'), JSON.stringify(values));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: Approved starts independent of Reviewed ----
  try {
    const cbReviewed = document.querySelector('[data-jc-reviewed="SLX-AP2"]');
    const cbApproved = document.querySelector('[data-jc-approved="SLX-AP2"]');
    check('TEST 2: Bravo is Reviewed', cbReviewed.checked === true);
    check('TEST 2: but Bravo is NOT yet Approved', cbApproved.checked === false);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: filtering to "Approved only" shows just the approved job ----
  try {
    const sel = document.getElementById('jcApprovedFilter');
    sel.value = 'approved';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    const body = document.getElementById('jobCostingTable').innerHTML;
    check('TEST 3: shows Alpha (approved)', body.includes('Alpha Both'));
    check('TEST 3: hides Bravo and Charlie (not approved)', !body.includes('Bravo ReviewedOnly') && !body.includes('Charlie Neither'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: combining Reviewed + Approved filters finds "reviewed but not approved" ----
  try {
    document.getElementById('jcApprovedFilter').value = 'unapproved';
    document.getElementById('jcApprovedFilter').dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('jcReviewFilter').value = 'reviewed';
    document.getElementById('jcReviewFilter').dispatchEvent(new Event('change', { bubbles: true }));
    const body = document.getElementById('jobCostingTable').innerHTML;
    check('TEST 4: only Bravo (reviewed, not approved) shows', body.includes('Bravo ReviewedOnly') && !body.includes('Alpha Both') && !body.includes('Charlie Neither'), body.slice(0, 300));
    document.getElementById('jcApprovedFilter').value = 'all';
    document.getElementById('jcApprovedFilter').dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('jcReviewFilter').value = 'all';
    document.getElementById('jcReviewFilter').dispatchEvent(new Event('change', { bubbles: true }));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: checking Approved saves through the real path without touching Reviewed ----
  try {
    const cb = document.querySelector('[data-jc-approved="SLX-AP3"]');
    cb.checked = true;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const row = global.mockJobsData.find(j => j.job_id === 'SLX-AP3');
    check('TEST 5: SLX-AP3 is now approved in the real data', row.costing_approved === true);
    check('TEST 5: its Reviewed state was left untouched', row.costing_reviewed === false);
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
