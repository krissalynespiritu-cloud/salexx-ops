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
  { job_id: 'SLX-PN1', client_name: 'Punch List Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'Punch list / Touch-ups (if needed)', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false },
  { job_id: 'SLX-PN2', client_name: 'Other Client', client_id: null, address_city: '2 Test St', job_type: 'Siding', stage: 'Designs Sold', contract_price: 3000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-02-01', completed_date: null, monday_item_id: null, retired: false }
];
global.mockPunchItems = [
  { punch_item_id: 'PI-1', job_id: 'SLX-PN1', description: 'Touch up paint near gutter', done: false, created_at: '2026-03-01T00:00:00Z' },
  { punch_item_id: 'PI-2', job_id: 'SLX-PN1', description: 'Replace cracked shingle', done: true, created_at: '2026-03-02T00:00:00Z' }
];

function makeChain(table) {
  let lastOp = null, lastArg = null;
  const chain = {
    select() { return chain; },
    insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; },
    delete() { lastOp = 'delete'; return chain; },
    eq(col, val) { chain._eqCol = col; chain._eqVal = val; return chain; },
    neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() { return chain; },
    maybeSingle() { sbCallLog.push({ table, op: 'maybeSingle' }); return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (lastOp === 'delete') {
        sbCallLog.push({ table, op: 'delete', eqVal: chain._eqVal });
        if (table === 'job_punch_items') global.mockPunchItems = global.mockPunchItems.filter(r => r.punch_item_id !== chain._eqVal);
        resolve({ data: null, error: null }); return;
      }
      if (lastOp === 'update') {
        sbCallLog.push({ table, op: 'update', arg: lastArg, eqVal: chain._eqVal });
        if (table === 'job_punch_items') { const r = global.mockPunchItems.find(x => x.punch_item_id === chain._eqVal); if (r) Object.assign(r, lastArg); }
        resolve({ data: null, error: null }); return;
      }
      if (lastOp === 'insert') {
        sbCallLog.push({ table, op: 'insert', arg: lastArg });
        if (table === 'job_punch_items') global.mockPunchItems.push({ punch_item_id: 'PI-NEW', done: false, created_at: '2026-03-05T00:00:00Z', ...lastArg });
        resolve({ data: null, error: null }); return;
      }
      sbCallLog.push({ table, op: 'select' });
      let src;
      if (table === 'jobs') src = global.mockJobsData;
      else if (table === 'job_punch_items') src = global.mockPunchItems;
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
    check('TEST 1: Punch List subtab button exists', !!document.querySelector('#subtabs [data-st="pnl"]'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: opening a job shows real seeded items with correct open/done state and count ----
  try {
    openJob('SLX-PN1');
    document.querySelector('#subtabs [data-st="pnl"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 2: shows the open item', body.includes('Touch up paint near gutter'));
    check('TEST 2: shows the done item', body.includes('Replace cracked shingle'));
    check('TEST 2: shows correct open/total count', body.includes('(1 open of 2)'), body.slice(0,300));
    const doneCheckbox = document.querySelector('[data-punch-toggle="PI-2"]');
    check('TEST 2: done item checkbox is checked', doneCheckbox && doneCheckbox.checked === true);
    const openCheckbox = document.querySelector('[data-punch-toggle="PI-1"]');
    check('TEST 2: open item checkbox is unchecked', openCheckbox && openCheckbox.checked === false);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: a job with no punch list items shows the empty state ----
  try {
    openJob('SLX-PN2');
    document.querySelector('#subtabs [data-st="pnl"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 3: shows empty state', body.includes('No punch list items for this job yet'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: adding an item inserts with the correct job_id and appears immediately ----
  try {
    document.getElementById('newPunchDesc').value = 'Sweep debris from driveway';
    document.querySelector('[data-add-punch="SLX-PN2"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 4: insert sent with correct job_id', sbCallLog.some(c => c.table === 'job_punch_items' && c.op === 'insert' && c.arg.job_id === 'SLX-PN2' && c.arg.description === 'Sweep debris from driveway'), JSON.stringify(sbCallLog.filter(c=>c.table==='job_punch_items')));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 4: new item appears immediately', body.includes('Sweep debris from driveway'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: blank description is rejected client-side ----
  try {
    const before = sbCallLog.filter(c=>c.table==='job_punch_items'&&c.op==='insert').length;
    document.getElementById('newPunchDesc').value = '   ';
    document.querySelector('[data-add-punch="SLX-PN2"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const after = sbCallLog.filter(c=>c.table==='job_punch_items'&&c.op==='insert').length;
    check('TEST 5: blank description does not insert', before === after);
    check('TEST 5: status message shown', document.getElementById('punchStatus').textContent.includes('required'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: checking an item off sends done=true and a done_at timestamp, and re-renders ----
  try {
    const newItemCheckbox = document.querySelector('[data-punch-toggle="PI-NEW"]');
    check('TEST 6 setup: new item checkbox exists', !!newItemCheckbox);
    newItemCheckbox.checked = true;
    newItemCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const updCall = sbCallLog.find(c => c.table === 'job_punch_items' && c.op === 'update' && c.eqVal === 'PI-NEW');
    check('TEST 6: update sent with done=true and a done_at value', updCall && updCall.arg.done === true && !!updCall.arg.done_at, JSON.stringify(updCall));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 6: item now shows as done (struck through) after re-render', body.includes('text-decoration:line-through') && body.includes('Sweep debris from driveway'));
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7: deleting an item removes it and re-renders ----
  try {
    const delBtn = document.querySelector('[data-del-punch="PI-NEW"]');
    check('TEST 7 setup: delete button exists', !!delBtn);
    delBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    document.getElementById('confirmModalOk').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 7: deleted item no longer shown', !body.includes('Sweep debris from driveway'));
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

  // ---- TEST 8: switching back to SLX-PN1 still shows its own original items untouched ----
  try {
    openJob('SLX-PN1');
    document.querySelector('#subtabs [data-st="pnl"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 8: SLX-PN1 items untouched by SLX-PN2 edits', body.includes('Touch up paint near gutter') && body.includes('Replace cracked shingle'));
  } catch (e) { check('TEST 8: no throw', false, e.stack); }

  // ---- TEST 9: unrelated features remain unaffected ----
  try {
    document.querySelector('#subtabs [data-st="co"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 9: Change Orders section (now merged into Job Costing) still works', document.getElementById('dBody').innerHTML.includes('No change orders logged'));
    check('TEST 9: Retire Job functions still present', typeof openRetireJobReview === 'function' && typeof confirmRetireJob === 'function');
    check('TEST 9: RETIRE_DEP_LABELS includes the new dependency', RETIRE_DEP_LABELS.some(([k]) => k === 'job_punch_items'));
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
}, 1000);
