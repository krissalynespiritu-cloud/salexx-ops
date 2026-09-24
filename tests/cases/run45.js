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

const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}
global.check = check;
global.results = results;

global.mockJobsData = [
  { job_id: 'SLX-UP1', client_name: 'Phil Rose', client_id: null, address_city: '1 Test St', job_type: 'Decking', crew: '', stage: 'Project Scheduled', contract_price: 19779.25, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-08-26', completed_date: null, monday_item_id: null, retired: false, costing_reviewed: true }
];
global.mockUpdates = [
  { update_id: 'U-1', job_id: 'SLX-UP1', body: 'whiskey barrel trex', kind: null, posted_at: '2026-08-01T00:00:00Z', edited_at: null, author_name: 'Alex Mendoza', author_initials: 'AL', author_color: '#5A7391' }
];
global.sbCallLog = [];

function makeChain(table) {
  let lastOp = null, lastArg = null, eqVal = null;
  const chain = {
    select() { return chain; },
    insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; },
    delete() { lastOp = 'delete'; return chain; },
    eq(col, val) { eqVal = val; return chain; },
    neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() {
      if (table === 'jobs') {
        const row = global.mockJobsData.find(j => j.job_id === eqVal);
        return Promise.resolve({ data: row || null, error: row ? null : { message: 'not found' } });
      }
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      global.sbCallLog.push({ table, op: lastOp || 'select', eqVal, arg: lastArg });
      if (table === 'job_updates_feed') {
        resolve({ data: global.mockUpdates.filter(u => u.job_id === eqVal).slice().sort((a, b) => b.posted_at.localeCompare(a.posted_at)), error: null });
        return;
      }
      if (table === 'job_updates') {
        if (lastOp === 'insert') {
          global.mockUpdates.unshift({ update_id: 'U-NEW', job_id: lastArg.job_id, body: lastArg.body, posted_at: new Date().toISOString(), edited_at: null, author_name: lastArg.author, author_initials: 'KE', author_color: '#5A7391' });
          resolve({ data: null, error: null }); return;
        }
        if (lastOp === 'update') {
          const u = global.mockUpdates.find(x => x.update_id === eqVal);
          if (u) Object.assign(u, lastArg);
          resolve({ data: null, error: null }); return;
        }
        if (lastOp === 'delete') {
          global.mockUpdates = global.mockUpdates.filter(x => x.update_id !== eqVal);
          resolve({ data: null, error: null }); return;
        }
      }
      let src = table === 'jobs' ? global.mockJobsData : [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}
const sbMock = {
  from(t) { return makeChain(t); },
  rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); },
  auth: {
    signOut() {}, onAuthStateChange() {},
    getSession() { return Promise.resolve({ data: { session: null } }); },
    getUser() { return Promise.resolve({ data: { user: { id: 'U-TEST' } } }); }
  }
};
global.supabase = { createClient: () => sbMock };

// Feature: the Jobs-list "updates" popover now supports editing and deleting
// an existing update inline, matching the request from a screenshot of that
// exact popover. The same update icon+badge (previously Jobs-list only) is
// now also shown next to the client name in the Job Costing table, wired to
// the identical popover so both surfaces read/write the same job_updates
// rows -- "connected", not a separate per-page note system.
const testLogic = `
(async () => {
  await fetchJobs();
  activateTab('jobs');
  drawJobs();

  // ---- TEST 1: opening the popover shows the existing update with Edit/Delete controls ----
  try {
    document.querySelector('[data-job-updates="SLX-UP1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 1: shows the real update body', document.getElementById('jobUpdatesPopover').innerHTML.includes('whiskey barrel trex'));
    check('TEST 1: has an Edit control', !!document.querySelector('[data-jup-edit="U-1"]'));
    check('TEST 1: has a Delete control', !!document.querySelector('[data-jup-del="U-1"]'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: clicking Edit reveals an inline textarea pre-filled with the real body ----
  try {
    document.querySelector('[data-jup-edit="U-1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const ta = document.querySelector('[data-jup-edit-body="U-1"]');
    check('TEST 2: inline edit textarea appears, pre-filled', ta && ta.value === 'whiskey barrel trex');
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: saving the edit sends a real update with edited_at set, and reflects immediately ----
  try {
    document.querySelector('[data-jup-edit-body="U-1"]').value = 'whiskey barrel trex - restocked';
    document.querySelector('[data-jup-save="U-1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const updCall = global.sbCallLog.find(c => c.table === 'job_updates' && c.op === 'update' && c.eqVal === 'U-1');
    check('TEST 3: update sent with the new body', updCall && updCall.arg.body === 'whiskey barrel trex - restocked', JSON.stringify(updCall));
    check('TEST 3: edited_at was set on save', updCall && !!updCall.arg.edited_at);
    check('TEST 3: the popover now shows the edited text and an "edited" marker', document.getElementById('jobUpdatesPopover').innerHTML.includes('restocked') && document.getElementById('jobUpdatesPopover').innerHTML.includes('edited'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: deleting (after confirming) removes the update and updates the row's badge count ----
  try {
    document.querySelector('[data-jup-del="U-1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 4: a real confirm modal is shown (popover must stay open behind it)', !document.getElementById('confirmModal').classList.contains('hidden'));
    check('TEST 4: the update popover is still open while the confirm modal is up', !document.getElementById('jobUpdatesPopover').classList.contains('hidden'));
    document.getElementById('confirmModalOk').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const delCall = global.sbCallLog.find(c => c.table === 'job_updates' && c.op === 'delete' && c.eqVal === 'U-1');
    check('TEST 4: a real delete was sent', !!delCall);
    check('TEST 4: the popover now shows the empty state', document.getElementById('jobUpdatesPopover').innerHTML.includes('No updates yet'));
    const badge = document.querySelector('[data-job-updates="SLX-UP1"]');
    check('TEST 4: the Jobs-list badge count dropped to 0 (no visible badge)', badge && !badge.innerHTML.includes('>1<'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: the same update icon+badge now also appears next to the client name on Job Costing, wired to the same popover ----
  try {
    closeJobUpdatesPopover();
    global.mockUpdates.push({ update_id: 'U-2', job_id: 'SLX-UP1', body: 'seen on Job Costing too', posted_at: '2026-08-02T00:00:00Z', edited_at: null, author_name: 'Alex Mendoza', author_initials: 'AL', author_color: '#5A7391' });
    const jrec = jobs.find(j => j.id === 'SLX-UP1'); jrec.updatesCount = 1;
    activateTab('jobcosting');
    drawJobCosting();
    const jcBtn = document.querySelector('#jobCostingTable [data-job-updates="SLX-UP1"]');
    check('TEST 5: the update icon is present next to the client name in Job Costing', !!jcBtn);
    jcBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 5: clicking it opens the same connected popover with the real update', document.getElementById('jobUpdatesPopover').innerHTML.includes('seen on Job Costing too'));
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
