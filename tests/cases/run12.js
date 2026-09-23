const { JSDOM } = require('jsdom');
const fs = require('fs');

const domHtml = fs.readFileSync(require('path').join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(require('path').join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');

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

const sbCallLog = [];
global.sbCallLog = sbCallLog;
global.mockJobsData = [
  { job_id: 'SLX-PM1', client_name: 'Permit Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'Permitting / Drawings', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false, permit_required: true },
  { job_id: 'SLX-PM2', client_name: 'No Permit Client', client_id: null, address_city: '2 Test St', job_type: 'Paint', stage: 'Designs Sold', contract_price: 2000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-02-01', completed_date: null, monday_item_id: null, retired: false, permit_required: false }
];
global.mockPermits = [
  { permit_id: 'PM-1', job_id: 'SLX-PM1', permit_type: 'Building', permit_number: 'B-2026-001', submitted_date: '2026-03-01', approved_date: '2026-03-10', inspection_scheduled_date: '2026-03-15', inspection_result: 'Passed', inspection_result_date: '2026-03-15' }
];

function makeChain(table) {
  let lastOp = null, lastArg = null, eqCol = null, eqVal = null;
  const chain = {
    select() { return chain; },
    insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; },
    delete() { lastOp = 'delete'; return chain; },
    eq(col, val) { eqCol = col; eqVal = val; chain._eqCol = col; chain._eqVal = val; return chain; },
    neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() {
      sbCallLog.push({ table, op: 'select-single', eqVal });
      if (table === 'jobs') {
        const row = global.mockJobsData.find(x => x.job_id === eqVal);
        return Promise.resolve({ data: row || null, error: row ? null : { message: 'not found' } });
      }
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (lastOp === 'delete') {
        sbCallLog.push({ table, op: 'delete', eqVal });
        if (table === 'job_permits') global.mockPermits = global.mockPermits.filter(r => r.permit_id !== eqVal);
        resolve({ data: null, error: null }); return;
      }
      if (lastOp === 'update') {
        sbCallLog.push({ table, op: 'update', arg: lastArg, eqVal });
        if (table === 'job_permits') { const r = global.mockPermits.find(x => x.permit_id === eqVal); if (r) Object.assign(r, lastArg); }
        if (table === 'jobs') { const j = global.mockJobsData.find(x => x.job_id === eqVal); if (j) Object.assign(j, lastArg); }
        resolve({ data: null, error: null }); return;
      }
      if (lastOp === 'insert') {
        sbCallLog.push({ table, op: 'insert', arg: lastArg });
        if (table === 'job_permits') global.mockPermits.push({ permit_id: 'PM-NEW', created_at: '2026-03-20T00:00:00Z', ...lastArg });
        resolve({ data: null, error: null }); return;
      }
      sbCallLog.push({ table, op: 'select' });
      let src;
      if (table === 'jobs') src = global.mockJobsData;
      else if (table === 'job_permits') src = global.mockPermits;
      else src = [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}

const sbMock = {
  from(table) { return makeChain(table); },
  rpc(name, args) { sbCallLog.push({ rpc: name, args }); return Promise.resolve({ data: [{ ok: true, message: 'ok' }], error: null }); },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} }
};
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  await fetchJobs();

  // ---- TEST 1: new subtab button exists ----
  try {
    check('TEST 1: Permits subtab button exists', !!document.querySelector('#subtabs [data-st="prm"]'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: opening a job with a real permit shows all its real fields, and the real permit_required flag ----
  try {
    openJob('SLX-PM1');
    document.querySelector('#subtabs [data-st="prm"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 2: shows real permit_required = Yes', body.includes('<b>Yes</b>'), body.slice(0,400));
    const typeInput = document.querySelector('[data-perm="permit_type"][data-perm-id="PM-1"]');
    check('TEST 2: permit type pre-filled', typeInput && typeInput.value === 'Building');
    const numInput = document.querySelector('[data-perm="permit_number"][data-perm-id="PM-1"]');
    check('TEST 2: permit number pre-filled', numInput && numInput.value === 'B-2026-001');
    const resultSelect = document.querySelector('[data-perm="inspection_result"][data-perm-id="PM-1"]');
    check('TEST 2: inspection result pre-selected to Passed', resultSelect && resultSelect.value === 'Passed');
    const subInput = document.querySelector('[data-perm="submitted_date"][data-perm-id="PM-1"]');
    check('TEST 2: submitted date pre-filled', subInput && subInput.value === '2026-03-01');
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: a job with no permits logged, and permit_required = No, shows the empty state and correct flag ----
  try {
    openJob('SLX-PM2');
    document.querySelector('#subtabs [data-st="prm"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 3: shows real permit_required = No', body.includes('<b>No</b>'));
    check('TEST 3: shows empty state', body.includes('No permits logged for this job yet'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: adding a permit inserts with the correct job_id and default fields, appears immediately ----
  try {
    document.querySelector('[data-add-perm="SLX-PM2"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 4: insert sent with correct job_id and defaults', sbCallLog.some(c => c.table === 'job_permits' && c.op === 'insert' && c.arg.job_id === 'SLX-PM2' && c.arg.permit_type === 'Building' && c.arg.inspection_result === 'Pending'), JSON.stringify(sbCallLog.filter(c=>c.table==='job_permits')));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 4: the new permit card appears immediately', body.includes('data-perm-id="PM-NEW"'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: editing a field on the new permit sends a real update through the generic data-perm handler ----
  try {
    const numInput = document.querySelector('[data-perm="permit_number"][data-perm-id="PM-NEW"]');
    numInput.value = 'E-2026-042';
    numInput.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const updCall = sbCallLog.find(c => c.table === 'job_permits' && c.op === 'update' && c.eqVal === 'PM-NEW');
    check('TEST 5: update sent with the new permit number', updCall && updCall.arg.permit_number === 'E-2026-042', JSON.stringify(updCall));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 5: re-rendered with the saved value', body.includes('E-2026-042'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: changing the inspection result select sends the real update ----
  try {
    const resultSelect = document.querySelector('[data-perm="inspection_result"][data-perm-id="PM-NEW"]');
    resultSelect.value = 'Failed';
    resultSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const updCall = sbCallLog.find(c => c.table === 'job_permits' && c.op === 'update' && c.eqVal === 'PM-NEW' && c.arg.inspection_result !== undefined);
    check('TEST 6: update sent with inspection_result = Failed', updCall && updCall.arg.inspection_result === 'Failed', JSON.stringify(updCall));
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7: clearing a date field sends null, not an empty string (re-querying the input each time, since each change re-renders the DOM) ----
  try {
    document.querySelector('[data-perm="submitted_date"][data-perm-id="PM-NEW"]').value = '2026-04-01';
    document.querySelector('[data-perm="submitted_date"][data-perm-id="PM-NEW"]').dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    document.querySelector('[data-perm="submitted_date"][data-perm-id="PM-NEW"]').value = '';
    document.querySelector('[data-perm="submitted_date"][data-perm-id="PM-NEW"]').dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const updCall = sbCallLog.filter(c => c.table === 'job_permits' && c.op === 'update' && c.eqVal === 'PM-NEW' && c.arg.submitted_date !== undefined).pop();
    check('TEST 7: cleared date sent as null, not empty string', updCall && updCall.arg.submitted_date === null, JSON.stringify(updCall));
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

  // ---- TEST 8: deleting a permit removes it and re-renders ----
  try {
    const delBtn = document.querySelector('[data-del-perm="PM-NEW"]');
    check('TEST 8 setup: delete button exists', !!delBtn);
    delBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    document.getElementById('confirmModalOk').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 8: deleted permit no longer shown', !body.includes('PM-NEW'));
    check('TEST 8: back to empty state for SLX-PM2', body.includes('No permits logged for this job yet'));
  } catch (e) { check('TEST 8: no throw', false, e.stack); }

  // ---- TEST 9: switching back to SLX-PM1 still shows its own original permit untouched ----
  try {
    openJob('SLX-PM1');
    document.querySelector('#subtabs [data-st="prm"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 9: SLX-PM1 permit untouched by SLX-PM2 edits', body.includes('B-2026-001'));
  } catch (e) { check('TEST 9: no throw', false, e.stack); }

  // ---- TEST 10: unrelated features remain unaffected ----
  try {
    document.querySelector('#subtabs [data-st="pnl"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 10: Punch List tab still works', document.getElementById('dBody').innerHTML.includes('No punch list items'));
    check('TEST 10: Retire Job functions still present', typeof openRetireJobReview === 'function' && typeof confirmRetireJob === 'function');
    check('TEST 10: RETIRE_DEP_LABELS includes the new dependency', RETIRE_DEP_LABELS.some(([k]) => k === 'job_permits'));
  } catch (e) { check('TEST 10: no throw', false, e.stack); }

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
}, 1000);
