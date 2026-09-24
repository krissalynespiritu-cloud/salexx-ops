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

const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}
global.check = check;
global.results = results;

global.mockJobsData = [
  { job_id: 'SLX-IC1', client_name: 'Noor', client_id: null, address_city: '1 Test St', job_type: 'Roofing', crew: '', stage: 'Ready For Scheduling', contract_price: 44869.82, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-06-01', completed_date: null, monday_item_id: null, retired: false, costing_reviewed: true }
];
global.mockUpdates = [
  { update_id: 'U-1', job_id: 'SLX-IC1', body: 'salvador needs to order beam', posted_at: '2026-08-29T04:27:00Z', edited_at: null, author_name: 'Alex Mendoza', author_initials: 'AL', author_color: '#5A7391' }
];

function makeChain(table) {
  let lastOp = null, eqVal = null;
  const chain = {
    select() { return chain; }, insert() { return chain; }, update() { return chain; }, delete() { return chain; },
    eq(col, val) { eqVal = val; return chain; },
    neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (table === 'job_updates_feed') { resolve({ data: global.mockUpdates.filter(u => u.job_id === eqVal), error: null }); return; }
      let src = table === 'jobs' ? global.mockJobsData : [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}
const sbMock = { from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); }, auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} } };
global.supabase = { createClient: () => sbMock };

// Design tweaks: (1) the update icon on Job Costing rows was noticeably
// smaller than the same icon on the Jobs list -- bumped to match; (2) update
// timestamps showed a vague relative time ("27d") instead of a real,
// unambiguous date and time.
const testLogic = `
(async () => {
  await fetchJobs();

  // ---- TEST 1: the Job Costing update icon now matches the Jobs-list size (22px), not the old smaller 18px ----
  try {
    activateTab('jobcosting');
    drawJobCosting();
    const btn = document.querySelector('#jobCostingTable [data-job-updates="SLX-IC1"]');
    check('TEST 1: the update icon exists on the Job Costing row', !!btn);
    check('TEST 1: it is now 22px, matching the Jobs list', btn && btn.style.width === '22px', btn && btn.style.width);
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: the popover shows a real logged date and time, not a vague relative string ----
  try {
    const btn2 = document.querySelector('#jobCostingTable [data-job-updates="SLX-IC1"]');
    btn2.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const body = document.getElementById('jobUpdatesPopover').innerHTML;
    check('TEST 2: shows a real month/day/year', /Aug 29, 2026/.test(body), body.slice(0, 400));
    check('TEST 2: shows a real time of day', /\\d{1,2}:\\d{2}\\s?(AM|PM)/.test(body), body.slice(0, 400));
    check('TEST 2: no longer shows the old vague relative format (e.g. "27d")', !/>\\d+d</.test(body));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

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
