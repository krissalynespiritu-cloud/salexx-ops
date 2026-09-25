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
global.alert = () => { throw new Error('alert() should never be called anymore'); };
global.confirm = () => { throw new Error('confirm() should never be called anymore'); };

const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}
global.check = check;
global.results = results;

global.mockJobsData = [
  { job_id: 'SLX-A', client_name: 'Alpha Safe', client_id: null, address_city: '—', job_type: 'Decking', crew: '', stage: 'Project Scheduled', contract_price: 10000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-08-01', scheduled_start_date: null, scheduled_end_date: null, completed_date: null, permit_required: null, monday_item_id: null, retired: false },
  { job_id: 'SLX-B', client_name: 'Beta Blocked', client_id: null, address_city: '—', job_type: 'Roofing', crew: '', stage: 'Project Scheduled', contract_price: 20000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-08-02', scheduled_start_date: null, scheduled_end_date: null, completed_date: null, permit_required: null, monday_item_id: null, retired: false }
];
global.mockSocialPosts = [
  { post_id: 'P-1', title: 'Post One', stage: 'Stuck', posting_date: null, final_video_link: '', content_types: [] },
  { post_id: 'P-2', title: 'Post Two', stage: 'Stuck', posting_date: null, final_video_link: '', content_types: [] }
];
global.mockContentTypes = [];
global.retireCalls = [];

function makeChain(table) {
  let lastOp = null, lastArg = null, eqVal = null, inCol = null, inVals = null;
  const chain = {
    select() { return chain; },
    insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; },
    delete() { lastOp = 'delete'; return chain; },
    eq(col, val) { eqVal = val; return chain; },
    in(col, vals) { inCol = col; inVals = vals; return chain; },
    neq() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() {
      if (table === 'jobs') {
        const row = global.mockJobsData.find(j => j.job_id === eqVal);
        return Promise.resolve({ data: row || null, error: row ? null : { message: 'not found' } });
      }
      if (table === 'social_posts' && lastOp === 'insert') {
        const row = { post_id: 'P-NEW', ...lastArg, content_types: [] };
        global.mockSocialPosts.push(row);
        return Promise.resolve({ data: row, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (table === 'jobs') {
        if (lastOp === 'update') {
          const row = global.mockJobsData.find(j => j.job_id === eqVal);
          if (row) Object.assign(row, lastArg);
          resolve({ data: null, error: null });
          return;
        }
        resolve({ data: global.mockJobsData, error: null });
        return;
      }
      if (table === 'social_posts') {
        if (lastOp === 'delete' && inCol === 'post_id') {
          global.mockSocialPosts = global.mockSocialPosts.filter(p => !inVals.includes(p.post_id));
          resolve({ data: null, error: null });
          return;
        }
        if (lastOp === 'update') {
          const row = global.mockSocialPosts.find(p => p.post_id === eqVal);
          if (row) Object.assign(row, lastArg);
          resolve({ data: null, error: null });
          return;
        }
        resolve({ data: global.mockSocialPosts.slice(), error: null });
        return;
      }
      resolve({ data: [], error: null });
    }
  };
  return chain;
}
const sbMock = {
  from(t) { return makeChain(t); },
  rpc(name, params) {
    if (name === 'job_dependency_counts') {
      if (params.p_job_id === 'SLX-B') return Promise.resolve({ data: [{ job_costs: 2, total: 2 }], error: null });
      return Promise.resolve({ data: [{ total: 0 }], error: null });
    }
    if (name === 'retire_job') {
      global.retireCalls.push(params.p_job_id);
      const row = global.mockJobsData.find(j => j.job_id === params.p_job_id);
      if (row) row.retired = true;
      return Promise.resolve({ data: [{ ok: true }], error: null });
    }
    return Promise.resolve({ data: [{ ok: true }], error: null });
  },
  auth: {
    signOut() {}, onAuthStateChange() {},
    getSession() { return Promise.resolve({ data: { session: null } }); },
    getUser() { return Promise.resolve({ data: { user: { id: 'U-TEST' } } }); }
  }
};
global.supabase = { createClient: () => sbMock };

// Feature: checkbox multi-select + a floating bulk-action bar on both the
// Jobs list and Social Media Planner, plus a "+ Add row" affordance on each,
// matching a Monday.com-style bulk toolbar. Jobs get "Retire selected"
// (reusing the existing dependency-checked retire_job path so nothing is
// ever hard-deleted or retired out from under linked records); Social
// Planner gets a straightforward "Delete selected" since posts carry no
// retire concept.
const testLogic = `
(async () => {
  await fetchJobs();
  activateTab('jobs');
  drawJobs();

  // ---- TEST 1: bulk bar hidden with nothing selected ----
  try {
    check('TEST 1: jobs bulk bar starts hidden', document.getElementById('jobsBulkBar').classList.contains('hidden'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: checking a row shows the bulk bar with a count ----
  try {
    const cbA = document.querySelector('[data-job-select="SLX-A"]');
    check('TEST 2: job row has a select checkbox', !!cbA);
    cbA.checked = true;
    cbA.dispatchEvent(new Event('change', { bubbles: true }));
    const bar = document.getElementById('jobsBulkBar');
    check('TEST 2: the bulk bar appears', !bar.classList.contains('hidden'));
    check('TEST 2: it shows 1 selected', bar.innerHTML.includes('1 selected'), bar.innerHTML);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: selecting a second row updates the count ----
  try {
    const cbB = document.querySelector('[data-job-select="SLX-B"]');
    cbB.checked = true;
    cbB.dispatchEvent(new Event('change', { bubbles: true }));
    check('TEST 3: bulk bar now shows 2 selected', document.getElementById('jobsBulkBar').innerHTML.includes('2 selected'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: the clear (x) button deselects everything ----
  try {
    document.getElementById('jobsBulkClearBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    check('TEST 4: the bulk bar hides again', document.getElementById('jobsBulkBar').classList.contains('hidden'));
    check('TEST 4: the checkboxes were unchecked', !document.querySelector('[data-job-select="SLX-A"]').checked && !document.querySelector('[data-job-select="SLX-B"]').checked);
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: "+ Add row" reuses the real createJob() -> promptDialog flow ----
  try {
    document.getElementById('jobAddRowBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const promptOpen = !document.getElementById('confirmModal').classList.contains('hidden');
    check('TEST 5: clicking + Add row opened the real new-job prompt', promptOpen);
    if (promptOpen) document.getElementById('confirmModalCancel').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: bulk retire separates safe jobs from blocked ones and only retires the safe one ----
  try {
    document.querySelector('[data-job-select="SLX-A"]').checked = true;
    document.querySelector('[data-job-select="SLX-A"]').dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('[data-job-select="SLX-B"]').checked = true;
    document.querySelector('[data-job-select="SLX-B"]').dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('jobsBulkRetireBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 6: the bulk retire modal is open', !document.getElementById('bulkRetireModal').classList.contains('hidden'));
    const card = document.getElementById('bulkRetireCard').innerHTML;
    check('TEST 6: the safe job shows as safe to retire', /Alpha Safe[\\s\\S]*?Safe to retire/.test(card), card);
    check('TEST 6: the blocked job shows as blocked', /Beta Blocked[\\s\\S]*?Blocked/.test(card), card);
    const reasonEl = document.getElementById('bulkRetireReason');
    check('TEST 6: a shared reason field is present since one safe job exists', !!reasonEl);
    reasonEl.value = 'Accidental duplicate, confirmed manually';
    document.getElementById('bulkRetireConfirm').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 6: only the safe job was actually retired', global.retireCalls.includes('SLX-A') && !global.retireCalls.includes('SLX-B'), JSON.stringify(global.retireCalls));
    check('TEST 6: the modal closed afterward', document.getElementById('bulkRetireModal').classList.contains('hidden'));
    check('TEST 6: selection was cleared', document.getElementById('jobsBulkBar').classList.contains('hidden'));
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- Social Media Planner: same pattern, delete instead of retire ----
  await drawSocialPlanner();

  // ---- TEST 7: social bulk bar starts hidden, checkbox shows it ----
  try {
    check('TEST 7: social bulk bar starts hidden', document.getElementById('socialBulkBar').classList.contains('hidden'));
    const cb1 = document.querySelector('[data-social-select="P-1"]');
    check('TEST 7: social post row has a select checkbox', !!cb1);
    cb1.checked = true;
    cb1.dispatchEvent(new Event('change', { bubbles: true }));
    const bar = document.getElementById('socialBulkBar');
    check('TEST 7: the social bulk bar appears with 1 selected', !bar.classList.contains('hidden') && bar.innerHTML.includes('1 selected'), bar.innerHTML);
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

  // ---- TEST 8: "+ Add row" on Social Planner creates a real blank post ----
  try {
    const before = global.mockSocialPosts.length;
    document.getElementById('socialAddRowBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 8: a new post was inserted', global.mockSocialPosts.length === before + 1, global.mockSocialPosts.length);
  } catch (e) { check('TEST 8: no throw', false, e.stack); }

  // ---- TEST 9: bulk delete removes exactly the selected posts after confirming ----
  try {
    document.querySelector('[data-social-select="P-1"]').checked = true;
    document.querySelector('[data-social-select="P-1"]').dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('[data-social-select="P-2"]').checked = true;
    document.querySelector('[data-social-select="P-2"]').dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('socialBulkDeleteBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    document.getElementById('confirmModalOk').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 9: P-1 and P-2 were deleted', !global.mockSocialPosts.some(p => p.post_id === 'P-1' || p.post_id === 'P-2'), JSON.stringify(global.mockSocialPosts.map(p => p.post_id)));
  } catch (e) { check('TEST 9: no throw', false, e.stack); }

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
