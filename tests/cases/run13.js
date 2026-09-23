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
  { job_id: 'SLX-W1', client_name: 'Warranty Client A', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'Completed', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: '2026-02-01', monday_item_id: null, retired: false },
  { job_id: 'SLX-W2', client_name: 'Warranty Client B', client_id: null, address_city: '2 Test St', job_type: 'Siding', stage: 'Completed', contract_price: 3000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-02-01', completed_date: '2026-03-01', monday_item_id: null, retired: false }
];
global.mockWarrantyClaims = [
  { claim_id: 'WC-1', job_id: 'SLX-W1', issue: 'Roof leak near chimney', reported_date: '2026-04-01', assignee: 'Luke', status: 'Open', resolution: null, resolved_date: null, labor_cost: 0, material_cost: 0 }
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
        if (table === 'warranty_claims') global.mockWarrantyClaims = global.mockWarrantyClaims.filter(r => r.claim_id !== eqVal);
        resolve({ data: null, error: null }); return;
      }
      if (lastOp === 'update') {
        sbCallLog.push({ table, op: 'update', arg: lastArg, eqVal });
        if (table === 'warranty_claims') { const r = global.mockWarrantyClaims.find(x => x.claim_id === eqVal); if (r) Object.assign(r, lastArg); }
        resolve({ data: null, error: null }); return;
      }
      if (lastOp === 'insert') {
        sbCallLog.push({ table, op: 'insert', arg: lastArg });
        if (table === 'warranty_claims') global.mockWarrantyClaims.push({ claim_id: 'WC-NEW', reported_date: '2026-05-01', status: 'Open', labor_cost: 0, material_cost: 0, ...lastArg });
        resolve({ data: null, error: null }); return;
      }
      sbCallLog.push({ table, op: 'select' });
      let src;
      if (table === 'jobs') src = global.mockJobsData;
      else if (table === 'warranty_claims') src = global.mockWarrantyClaims;
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
  const clickTab = (tab) => {
    const btn = document.querySelector('.sidebarLink[data-tab="' + tab + '"]');
    if (!btn) throw new Error('no sidebar button for ' + tab);
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };

  await fetchJobs();

  // ---- TEST 1: sidebar link and section exist ----
  try {
    check('TEST 1: Warranty sidebar link exists', !!document.querySelector('.sidebarLink[data-tab="warranty"]'));
    check('TEST 1: s-warranty section exists', !!document.getElementById('s-warranty'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: opening the page shows the real seeded claim with correct fields, and job select is populated ----
  try {
    clickTab('warranty');
    await new Promise(r => setTimeout(r, 30));
    check('TEST 2: Warranty section shown, Jobs hidden', !document.getElementById('s-warranty').classList.contains('hidden') && document.getElementById('s-jobs').classList.contains('hidden'));
    const body = document.getElementById('warrantyList').innerHTML;
    check('TEST 2: shows the real client name via job join', body.includes('Warranty Client A'));
    check('TEST 2: shows the real issue text', body.includes('Roof leak near chimney'));
    check('TEST 2: shows the real assignee', body.includes('value="Luke"'));
    const jobSelect = document.getElementById('newWarrantyJob');
    check('TEST 2: job select populated with real jobs', jobSelect.innerHTML.includes('SLX-W1') && jobSelect.innerHTML.includes('SLX-W2'));
    check('TEST 2: count shows 1 claim', document.getElementById('warrantyCount').textContent.includes('1 claim'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: status filter chips work and show correct counts ----
  try {
    const chips = document.getElementById('warrantyChips').innerHTML;
    check('TEST 3: chips render with correct Open count', chips.includes('Open') && chips.includes('<b>1</b>'));
    document.querySelector('[data-warranty-filter="Resolved"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 3: filtering to Resolved shows the empty state (real claim is Open)', document.getElementById('warrantyList').innerHTML.includes('No warranty claims in this status'));
    document.querySelector('[data-warranty-filter="All"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 3: back to All shows the claim again', document.getElementById('warrantyList').innerHTML.includes('Roof leak near chimney'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: search filters by client, job id, and issue text ----
  try {
    document.getElementById('warrantyQuery').value = 'chimney';
    document.getElementById('warrantyQuery').dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 4: search by issue text matches', document.getElementById('warrantyList').innerHTML.includes('Roof leak near chimney'));
    document.getElementById('warrantyQuery').value = 'nonexistent';
    document.getElementById('warrantyQuery').dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 4: search with no match shows empty state', document.getElementById('warrantyList').innerHTML.includes('matching your search'));
    document.getElementById('warrantyQuery').value = '';
    document.getElementById('warrantyQuery').dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: adding a claim requires job and issue, then inserts correctly and appears immediately ----
  try {
    document.getElementById('addWarrantyBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 5: blank submission rejected with a status message', document.getElementById('warrantyStatus').textContent.includes('required'));
    document.getElementById('newWarrantyJob').value = 'SLX-W2';
    document.getElementById('newWarrantyIssue').value = 'Siding panel came loose';
    document.getElementById('addWarrantyBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 5: insert sent with correct job_id and issue', sbCallLog.some(c => c.table === 'warranty_claims' && c.op === 'insert' && c.arg.job_id === 'SLX-W2' && c.arg.issue === 'Siding panel came loose'), JSON.stringify(sbCallLog.filter(c=>c.table==='warranty_claims')));
    const body = document.getElementById('warrantyList').innerHTML;
    check('TEST 5: new claim appears immediately with the right client', body.includes('Siding panel came loose') && body.includes('Warranty Client B'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: editing a field on the new claim sends a real update, and total cost computes correctly ----
  try {
    document.querySelector('[data-warr="labor_cost"][data-warr-id="WC-NEW"]').value = '150';
    document.querySelector('[data-warr="labor_cost"][data-warr-id="WC-NEW"]').dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    document.querySelector('[data-warr="material_cost"][data-warr-id="WC-NEW"]').value = '50';
    document.querySelector('[data-warr="material_cost"][data-warr-id="WC-NEW"]').dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const updCall = sbCallLog.filter(c => c.table === 'warranty_claims' && c.op === 'update' && c.eqVal === 'WC-NEW').pop();
    check('TEST 6: last update sent material_cost = 50', updCall && updCall.arg.material_cost === 50, JSON.stringify(updCall));
    const body = document.getElementById('warrantyList').innerHTML;
    check('TEST 6: computed total cost shows $200.00 (150 + 50)', body.includes('200.00'), body);
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7: changing status via the select sends a real update and re-buckets the chip counts ----
  try {
    document.querySelector('[data-warr="status"][data-warr-id="WC-NEW"]').value = 'Resolved';
    document.querySelector('[data-warr="status"][data-warr-id="WC-NEW"]').dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const updCall = sbCallLog.find(c => c.table === 'warranty_claims' && c.op === 'update' && c.eqVal === 'WC-NEW' && c.arg.status === 'Resolved');
    check('TEST 7: status update sent', !!updCall);
    const chips = document.getElementById('warrantyChips').innerHTML;
    check('TEST 7: Resolved chip count now shows 1', chips.match(/Resolved<b>1<\\/b>/));
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

  // ---- TEST 8: clicking the client/job button on a claim opens the real job ----
  try {
    document.querySelector('[data-open="SLX-W1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 8: clicking a claim\\'s job opens the real job detail', !document.getElementById('detail').classList.contains('hidden') && document.getElementById('dName').textContent === 'Warranty Client A');
    document.getElementById('back').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  } catch (e) { check('TEST 8: no throw', false, e.stack); }

  // ---- TEST 9: deleting a claim removes it and re-renders ----
  try {
    clickTab('warranty');
    await new Promise(r => setTimeout(r, 30));
    const delBtn = document.querySelector('[data-del-warr="WC-NEW"]');
    check('TEST 9 setup: delete button exists', !!delBtn);
    delBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    document.getElementById('confirmModalOk').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const body = document.getElementById('warrantyList').innerHTML;
    check('TEST 9: deleted claim no longer shown', !body.includes('Siding panel came loose'));
    check('TEST 9: original claim untouched', body.includes('Roof leak near chimney'));
  } catch (e) { check('TEST 9: no throw', false, e.stack); }

  // ---- TEST 10: unrelated features remain unaffected ----
  try {
    clickTab('materialrequests');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 10: Material Requests tab still works', !document.getElementById('s-materialrequests').classList.contains('hidden'));
    check('TEST 10: Retire Job functions still present', typeof openRetireJobReview === 'function' && typeof confirmRetireJob === 'function');
    check('TEST 10: RETIRE_DEP_LABELS includes the new dependency', RETIRE_DEP_LABELS.some(([k]) => k === 'warranty_claims'));
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
