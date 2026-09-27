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

// Feature: force_delete_job() (88) was one-way -- once you deleted a job
// this way, it was truly gone, unlike Retire which just flips a flag. Made
// it undoable: force_delete_job() now also snapshots the full row content
// of every linked table it deletes (not just counts), and a new "Deleted
// Jobs" panel on the Data Health tab lists those snapshots with a Restore
// button, calling the new restore_deleted_job() RPC (89_restore_deleted_
// job.sql).
global.mockJobsData = [];
global.mockDeleteLog = [
  {
    log_id: 'LOG-1',
    job_id: 'SLX-GONE',
    job_snapshot: { job_id: 'SLX-GONE', client_name: 'Ghost Client', contract_price: 5000 },
    deleted_counts: { time_entries: 1, job_costs: 0, payments: 0, leads: 0, estimates: 0, job_updates: 0, google_reviews: 0, sub_payments: 0, vendor_invoices: 0, tasks: 0, project_files: 0, material_requests: 0, job_labor_estimates: 0, job_material_estimates: 0, job_change_orders: 0, job_punch_items: 0, job_permits: 0, warranty_claims: 0, crew_assignments: 0, total: 1 },
    deleted_by: 'Kris',
    reason: 'Test job, never real',
    deleted_at: '2026-09-01T10:00:00Z',
    restored_at: null
  },
  {
    log_id: 'LOG-2',
    job_id: 'SLX-ALREADY-RESTORED',
    job_snapshot: { job_id: 'SLX-ALREADY-RESTORED', client_name: 'Already Back' },
    deleted_counts: { total: 0 },
    deleted_by: 'Kris',
    reason: 'oops',
    deleted_at: '2026-08-01T10:00:00Z',
    restored_at: '2026-08-02T10:00:00Z'
  }
];
global.restoreCalls = [];

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
      if (table === 'job_force_delete_log') { resolve({ data: global.mockDeleteLog, error: null }); return; }
      if (table === 'possible_duplicates') { resolve({ data: [], error: null }); return; }
      resolve({ data: [], error: null });
    }
  };
  return chain;
}
const sbMock = {
  from(t) { return makeChain(t); },
  rpc(name, args) {
    if (name === 'restore_deleted_job') {
      global.restoreCalls.push(args);
      const entry = global.mockDeleteLog.find(r => r.log_id === args.p_log_id);
      if (entry) { entry.restored_at = '2026-09-27T00:00:00Z'; entry.restored_by = args.p_restored_by; }
      return Promise.resolve({ data: entry ? entry.job_id : null, error: null });
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
  activateTab('datahealth');
  await new Promise(r => setTimeout(r, 30));

  // ---- TEST 1: the Deleted Jobs panel lists the not-yet-restored entry, not the already-restored one ----
  try {
    const html = document.getElementById('deletedJobsPanel').innerHTML;
    check('TEST 1: shows the deleted job', html.includes('SLX-GONE') && html.includes('Ghost Client'), html.slice(0, 300));
    check('TEST 1: shows who deleted it and why', html.includes('Kris') && html.includes('Test job, never real'));
    check('TEST 1: does NOT show the already-restored entry', !html.includes('SLX-ALREADY-RESTORED'));
    check('TEST 1: summarizes what will come back', html.includes('1 Time entries') || html.includes('1 Time entries'.toLowerCase()) || /1\\s*Time entries/i.test(html));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: clicking Restore calls restore_deleted_job with the right log id ----
  try {
    document.querySelector('[data-restore-deleted-job="LOG-1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 2: restore_deleted_job was called once', global.restoreCalls.length === 1, JSON.stringify(global.restoreCalls));
    check('TEST 2: with the right log id', global.restoreCalls[0].p_log_id === 'LOG-1');
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: after restoring, the entry drops off the list (panel re-renders) ----
  try {
    const html = document.getElementById('deletedJobsPanel').innerHTML;
    check('TEST 3: the restored job no longer shows in the list', !html.includes('SLX-GONE'), html.slice(0, 300));
    check('TEST 3: shows the empty state now that nothing is left', html.includes('No force-deleted jobs'));
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
}, 2000);
