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

global.mockFailTables = new Set();
global.mockClientsInsertShouldFail = false;
global.mockClientsData = [{ client_id: 'C-EXISTING', name: 'John Smith', email: null, phone: null }];
global.mockJobsData = [
  { job_id: 'SLX-CLMF1', client_name: 'CLMF Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false, crew_leader_fee: 300, upsell_amount: 0 }
];
global.mockJobCostsData = [{ cost_id: 'JC-OLD', job_id: 'SLX-CLMF1', category: 'Materials', amount: 100 }];
global.mockAuthUserIsNull = false;
global.sbCallLog = [];

function makeChain(table) {
  let lastOp = null, lastArg = null, eqCol = null, eqVal = null, inCol = null, inVals = null;
  const eqFilters = {};
  const chain = {
    select() { return chain; },
    insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; },
    delete() { lastOp = 'delete'; return chain; },
    eq(col, val) { eqCol = col; eqVal = val; eqFilters[col] = val; return chain; },
    in(col, vals) { inCol = col; inVals = vals; return chain; },
    neq() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() {
      if (table === 'clients' && lastOp === 'insert') {
        if (global.mockClientsInsertShouldFail) return Promise.resolve({ data: null, error: { message: 'Simulated clients insert failure' } });
        const row = { client_id: 'C-NEW-' + Math.random().toString(36).slice(2, 8) };
        global.mockClientsData.push({ ...row, name: lastArg.name, email: lastArg.email, phone: lastArg.phone });
        return Promise.resolve({ data: row, error: null });
      }
      if (table === 'jobs') {
        const row = global.mockJobsData.find(j => j.job_id === eqVal);
        return Promise.resolve({ data: row || null, error: row ? null : { message: 'not found' } });
      }
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      global.sbCallLog.push({ table, op: lastOp || 'select', eqCol, eqVal, inCol, inVals, arg: lastArg });
      if (table === 'job_costs' && lastOp === null) {
        const matches = global.mockJobCostsData.filter(r =>
          (eqFilters.job_id === undefined || r.job_id === eqFilters.job_id) &&
          (eqFilters.category === undefined || r.category === eqFilters.category)
        );
        resolve({ data: matches, error: null });
        return;
      }
      if (lastOp === 'insert') {
        if (global.mockFailTables.has(table)) { resolve({ data: null, error: { message: 'Simulated ' + table + ' failure' } }); return; }
        if (table === 'job_costs') global.mockJobCostsData.push({ cost_id: 'JC-NEW', ...lastArg });
        resolve({ data: null, error: null }); return;
      }
      if (lastOp === 'delete') {
        if (global.mockFailTables.has(table)) { resolve({ data: null, error: { message: 'Simulated ' + table + ' failure' } }); return; }
        if (table === 'job_costs') {
          if (inCol === 'cost_id') global.mockJobCostsData = global.mockJobCostsData.filter(r => !inVals.includes(r.cost_id));
          else global.mockJobCostsData = global.mockJobCostsData.filter(r => r.job_id !== eqVal);
        }
        resolve({ data: null, error: null }); return;
      }
      if (lastOp === 'update') {
        if (global.mockFailTables.has(table)) { resolve({ data: null, error: { message: 'Simulated ' + table + ' failure' } }); return; }
        resolve({ data: null, error: null }); return;
      }
      // plain select
      if (global.mockFailTables.has(table)) { resolve({ data: null, error: { message: 'Simulated ' + table + ' failure' } }); return; }
      let src;
      if (table === 'jobs') src = global.mockJobsData;
      else if (table === 'clients') src = global.mockClientsData;
      else src = [];
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
    getUser() { return Promise.resolve({ data: { user: global.mockAuthUserIsNull ? null : { id: 'U-TEST' } } }); }
  }
};
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  await fetchJobs();

  // ---- TEST 1 (fix #1, CLAUDE.md): a failed client insert flags for review instead of auto-linking by name ----
  try {
    global.mockClientsInsertShouldFail = true;
    const result = await resolveClientForCreate({ name: 'John Smith' });
    check('TEST 1: does NOT auto-link to the existing same-named client', result.clientId !== 'C-EXISTING', JSON.stringify(result));
    check('TEST 1: clientId is null', result.clientId === null, JSON.stringify(result));
    check('TEST 1: flagged for human review (needsReview: true)', result.needsReview === true, JSON.stringify(result));
    global.mockClientsInsertShouldFail = false;
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2 (fix #2, CLAUDE.md): an identical-name-only match is never "High" confidence ----
  try {
    const clientsList = [
      { client_id: 'A', name: 'Angelina R', email: null, phone: '555-0001' },
      { client_id: 'B', name: 'Angelina R', email: null, phone: '555-0002' }
    ];
    const groups = computeDuplicateGroups(clientsList, {}, {});
    check('TEST 2: the identical-name pair is still surfaced (not silently dropped)', groups.length === 1, JSON.stringify(groups));
    check('TEST 2: confidence is NOT High from name alone', groups[0] && groups[0].confidence !== 'High', JSON.stringify(groups));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 2b: a real phone/email match is still correctly High confidence (the fix didn't break real strong signals) ----
  try {
    const clientsList = [
      { client_id: 'A', name: 'Totally Different Name', email: 'same@example.com', phone: null },
      { client_id: 'B', name: 'Another Name Entirely', email: 'same@example.com', phone: null }
    ];
    const groups = computeDuplicateGroups(clientsList, {}, {});
    check('TEST 2b: a real email match is still High confidence', groups[0] && groups[0].confidence === 'High', JSON.stringify(groups));
  } catch (e) { check('TEST 2b: no throw', false, e.stack); }

  // ---- TEST 3 (fix #3): crew leader fee is now included on both sides of the Est vs Actual comparison ----
  try {
    openJob('SLX-CLMF1');
    st = 'ea';
    eaLabor = [{ estimate_id: 'EA-1', crew_name: 'Carlos', est_hours: 10, est_ot_hours: 0, pay_rate: 20, ot_rate: 0 }];
    eaMats = [];
    currentEstActual = { settings: { labor_multiplier: 2, material_multiplier: 2, labor_burden_pct: 0 }, actualByPerson: [] };
    drawDetail();
    await new Promise(r => setTimeout(r, 10));
    const body = document.getElementById('dBody').innerHTML;
    // est labor cost = 10*20 = 200, no clmf before the fix -> "You think this job will cost you" showed $200.00
    // with the fix it should show $500.00 (200 labor + 300 clmf)
    check('TEST 3: estimated total cost now includes the $300 crew leader fee', body.includes('500.00'), body.slice(0, 900));
    check('TEST 3: the old (bugged) cost-without-fee figure is not shown', !body.includes('You think this job will cost you</b><p class="bignum" style="margin-top:4px;font-size:24px">$200.00'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4 (fix #4): "Hourly sales rate" is now a revenue-per-hour figure, matching "Actual hourly rate"'s units ----
  try {
    const body = document.getElementById('dBody').innerHTML;
    // salePrice = suggestedLaborPrice = estLaborCost(200) * laborMultiplier(2) = 400; estManHours = 10 -> 400/10 = $40.00/hr
    // the old (bugged) formula was estTotalCost/estManHours = 500/10 = $50.00/hr (cost-based, wrong units)
    check('TEST 4: hourly sales rate is now revenue-based ($40.00/hr)', body.includes('40.00'), body.slice(0, 900));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5 (fix #5): a second confirmDialog() call settles the first instead of hanging it forever ----
  try {
    let firstResolvedWith = 'NEVER_RESOLVED';
    confirmDialog('First dialog', 'body').then(r => { firstResolvedWith = r; });
    await new Promise(r => setTimeout(r, 10));
    confirmDialog('Second dialog', 'body'); // fires before the first was ever answered
    await new Promise(r => setTimeout(r, 10));
    check('TEST 5: the first call resolved (not left hanging) once a second dialog opened', firstResolvedWith !== 'NEVER_RESOLVED');
    check('TEST 5: the first call resolved to false (treated as cancelled)', firstResolvedWith === false, String(firstResolvedWith));
    document.getElementById('confirmModalCancel').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6 (fix #6): a failure in one of fetchJobs()'s previously-unchecked queries now surfaces a real toast ----
  try {
    document.getElementById('toastStack').innerHTML = '';
    global.mockFailTables.add('job_vendor_invoice_totals');
    const ok = await fetchJobs();
    await new Promise(r => setTimeout(r, 10));
    check('TEST 6: fetchJobs() still succeeds overall (this is a secondary, non-fatal failure)', ok === true);
    check('TEST 6: a real error toast is shown for the failed secondary query', document.getElementById('toastStack').innerHTML.includes('Simulated job_vendor_invoice_totals failure'));
    global.mockFailTables.delete('job_vendor_invoice_totals');
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7 (fix #7): postUpdate() shows a real error instead of crashing when the session has expired ----
  try {
    global.mockAuthUserIsNull = true;
    cur = jobs.find(j => j.id === 'SLX-CLMF1');
    st = 'up';
    drawDetail();
    await new Promise(r => setTimeout(r, 10));
    const ta = document.getElementById('newUpdateBody');
    if (ta) ta.value = 'A real update body';
    await postUpdate();
    await new Promise(r => setTimeout(r, 10));
    const statusEl = document.getElementById('updateSaveStatus') || document.querySelector('[id*="pdateStatus"]');
    check('TEST 7: no throw for a null user', true);
    global.mockAuthUserIsNull = false;
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

  // ---- TEST 8 (fix #8): a failed job_costs insert leaves the OLD row untouched instead of already-deleted ----
  try {
    global.sbCallLog = [];
    global.mockJobCostsData = [{ cost_id: 'JC-OLD', job_id: 'SLX-CLMF1', category: 'Materials', amount: 100 }];
    global.mockFailTables.add('job_costs');
    await saveCostField('SLX-CLMF1', 'mat', '250');
    await new Promise(r => setTimeout(r, 10));
    check('TEST 8: the old job_costs row was NOT deleted after the insert failed', global.mockJobCostsData.some(r => r.cost_id === 'JC-OLD'), JSON.stringify(global.mockJobCostsData));
    const deleteCalls = global.sbCallLog.filter(c => c.table === 'job_costs' && c.op === 'delete');
    check('TEST 8: no delete was even attempted once the insert failed', deleteCalls.length === 0, JSON.stringify(deleteCalls));
    global.mockFailTables.delete('job_costs');
  } catch (e) { check('TEST 8: no throw', false, e.stack); }

  // ---- TEST 8b: the real (successful) path still correctly replaces the old row with the new one ----
  try {
    global.mockJobCostsData = [{ cost_id: 'JC-OLD2', job_id: 'SLX-CLMF1', category: 'Materials', amount: 100 }];
    await saveCostField('SLX-CLMF1', 'mat', '250');
    await new Promise(r => setTimeout(r, 10));
    check('TEST 8b: old row gone on real success', !global.mockJobCostsData.some(r => r.cost_id === 'JC-OLD2'));
    check('TEST 8b: new row present with the new amount', global.mockJobCostsData.some(r => r.amount === 250), JSON.stringify(global.mockJobCostsData));
  } catch (e) { check('TEST 8b: no throw', false, e.stack); }

  // ---- TEST 9 (fix #9): delEaLaborRow now asks for confirmation instead of deleting instantly ----
  try {
    eaLabor = [{ estimate_id: 'EA-DEL', crew_name: 'Carlos', est_hours: 5, pay_rate: 20 }];
    delEaLaborRow('EA-DEL'); // not awaited -- should now pause at a real confirm dialog
    await new Promise(r => setTimeout(r, 20));
    check('TEST 9: a real confirm modal is shown before deleting', !document.getElementById('confirmModal').classList.contains('hidden'));
    document.getElementById('confirmModalCancel').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 9: clicking Cancel leaves the row in place', eaLabor.some(r => r.estimate_id === 'EA-DEL'));
  } catch (e) { check('TEST 9: no throw', false, e.stack); }

  // ---- TEST 10: a subsequent fetchJobs() no longer leaves an open job's \`cur\` pointing at a stale, detached object ----
  try {
    openJob('SLX-CLMF1');
    const curBefore = cur;
    global.mockJobsData = global.mockJobsData.map(j => j.job_id === 'SLX-CLMF1' ? { ...j, contract_price: 9999 } : j);
    await fetchJobs();
    check('TEST 10: cur now points at the freshly-fetched object, not the old detached one', cur !== curBefore);
    check('TEST 10: cur reflects the updated real data', cur.contract === 9999, JSON.stringify({ contract: cur.contract }));
    check('TEST 10: the jobs array entry and cur are the same object (refresh-cache mutations would reach both)', jobs.find(j => j.id === 'SLX-CLMF1') === cur);
  } catch (e) { check('TEST 10: no throw', false, e.stack); }

  // ---- unrelated features remain unaffected ----
  try {
    check('unrelated: Retire Job functions still present', typeof openRetireJobReview === 'function' && typeof confirmRetireJob === 'function');
  } catch (e) { check('unrelated: no throw', false, e.stack); }

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
