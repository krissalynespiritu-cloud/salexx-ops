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

// Feature: Retire Job (safe delete) and the ⋮ menu's "Delete job" both
// refuse to touch a job with any linked records -- correctly, since
// nothing gets silently orphaned or reassigned. But that left no way at
// all to actually remove a genuinely junk/test job short of manually
// hunting down and deleting each linked record elsewhere in the app
// first. Added a "Force delete this job and everything linked to it"
// escape hatch inside the blocked state of the Retire Job dialog --
// requires a written reason AND typing the exact job ID to confirm,
// then calls the new force_delete_job() RPC (supabase/88_force_delete_
// job.sql), which snapshots the job + what it's about to destroy into
// job_force_delete_log, deletes every linked row, then the job itself.
global.mockJobsData = [
  { job_id: 'SLX-FD1', client_name: 'Force Delete Test', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false }
];
global.forceDeleteCalls = [];
let jobDeleted = false;

function makeChain(table) {
  const chain = {
    select() { return chain; }, insert() { return chain; }, update() { return chain; }, delete() { return chain; },
    eq() { return chain; }, neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; }, not() { return chain; }, or() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      const src = table === 'jobs' ? (jobDeleted ? [] : global.mockJobsData) : [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}
const sbMock = {
  from(t) { return makeChain(t); },
  rpc(name, args) {
    if (name === 'job_dependency_counts') {
      return Promise.resolve({ data: [{ job_costs: 0, time_entries: 1, payments: 0, leads: 0, estimates: 0, job_updates: 0, google_reviews: 0, sub_payments: 0, vendor_invoices: 0, tasks: 0, project_files: 0, material_requests: 0, job_labor_estimates: 0, job_material_estimates: 0, job_change_orders: 0, job_punch_items: 0, job_permits: 0, warranty_claims: 0, crew_assignments: 0, total: 1 }], error: null });
    }
    if (name === 'force_delete_job') {
      global.forceDeleteCalls.push(args);
      jobDeleted = true;
      return Promise.resolve({ data: { time_entries: 1, total: 1 }, error: null });
    }
    return Promise.resolve({ data: [{ ok: true }], error: null });
  },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {}, getUser() { return Promise.resolve({ data: { user: { id: 'U-1' } } }); } }
};
global.supabase = { createClient: () => sbMock };
global.currentUserEmail = 'test@example.com';

const testLogic = `
(async () => {
  await fetchJobs();
  openRetireJobReview('SLX-FD1');
  await new Promise(r => setTimeout(r, 30));

  // ---- TEST 1: the blocked state shows the force-delete escape hatch ----
  try {
    check('TEST 1: blocked message shows', document.getElementById('retireJobCard').innerHTML.includes('Blocked'));
    check('TEST 1: the force-delete link exists', !!document.getElementById('forceDeleteStart'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: clicking it shows the confirmation sub-view ----
  try {
    document.getElementById('forceDeleteStart').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    check('TEST 2: reason field appears', !!document.getElementById('forceDeleteReason'));
    check('TEST 2: type-to-confirm field appears', !!document.getElementById('forceDeleteConfirmId'));
    check('TEST 2: the permanent-delete button appears', !!document.getElementById('forceDeleteConfirm'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: an empty reason blocks the delete ----
  try {
    document.getElementById('forceDeleteConfirm').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 10));
    check('TEST 3: shows the reason-required message', document.getElementById('forceDeleteStatus').textContent.includes('reason is required'));
    check('TEST 3: the RPC was NOT called', global.forceDeleteCalls.length === 0);
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: a reason with the wrong typed job ID also blocks the delete ----
  try {
    document.getElementById('forceDeleteReason').value = 'Test job, never real';
    document.getElementById('forceDeleteConfirmId').value = 'SLX-WRONG';
    document.getElementById('forceDeleteConfirm').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 10));
    check('TEST 4: shows the type-to-confirm message', document.getElementById('forceDeleteStatus').textContent.includes('Type SLX-FD1'));
    check('TEST 4: the RPC still was NOT called', global.forceDeleteCalls.length === 0);
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: the correct reason + exact job ID actually calls force_delete_job and closes the modal ----
  try {
    document.getElementById('forceDeleteConfirmId').value = 'SLX-FD1';
    document.getElementById('forceDeleteConfirm').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 5: force_delete_job was called once', global.forceDeleteCalls.length === 1, JSON.stringify(global.forceDeleteCalls));
    check('TEST 5: it was called with the right job id and reason', global.forceDeleteCalls[0].p_job_id === 'SLX-FD1' && global.forceDeleteCalls[0].p_reason === 'Test job, never real');
    check('TEST 5: the modal closed', document.getElementById('retireJobModal').classList.contains('hidden'));
    check('TEST 5: the job is gone from the in-memory list', !jobs.find(j => j.id === 'SLX-FD1'));
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
