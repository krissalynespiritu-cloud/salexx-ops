const { JSDOM } = require('jsdom');
const fs = require('fs');

const domHtml = fs.readFileSync(require('path').join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(require('path').join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');

const dom = new JSDOM(`<!doctype html><html><body>${domHtml}</body></html>`, { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.MouseEvent = dom.window.MouseEvent;
global.KeyboardEvent = dom.window.KeyboardEvent;
global.Event = dom.window.Event;
global.navigator = dom.window.navigator;
global.location = dom.window.location;
global.alert = () => { throw new Error('alert() should never be called anymore'); };
global.confirm = () => { throw new Error('confirm() should never be called anymore'); };
global.prompt = () => { throw new Error('prompt() should never be called anymore'); };

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
  { job_id: 'SLX-DRV1', client_name: 'Drive Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false, drive_folder_url: 'https://drive.google.com/drive/folders/OLDLINK' }
];

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
      if (table === 'jobs') { const row = global.mockJobsData.find(x => x.job_id === eqVal); return Promise.resolve({ data: row || null, error: row ? null : { message: 'nf' } }); }
      if (table === 'clients' && lastOp === 'insert') return Promise.resolve({ data: { client_id: 'CLIENT-NEW-1' }, error: null });
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (lastOp === 'update') {
        sbCallLog.push({ table, op: 'update', arg: lastArg, eqVal });
        if (table === 'jobs') { const r = global.mockJobsData.find(x => x.job_id === eqVal); if (r) Object.assign(r, lastArg); }
        resolve({ data: null, error: null }); return;
      }
      if (lastOp === 'insert') {
        sbCallLog.push({ table, op: 'insert', arg: lastArg });
        if (table === 'jobs') global.mockJobsData.push({ job_id: lastArg.job_id, client_name: lastArg.client_name, client_id: null, address_city: null, job_type: null, stage: 'Designs Sold', contract_price: null, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: null, completed_date: null, monday_item_id: null, retired: false });
        resolve({ data: null, error: null }); return;
      }
      let src = table === 'jobs' ? global.mockJobsData : [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}
const sbMock = { from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); }, auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} } };
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  await fetchJobs();

  // ---- TEST 1: createJob() opens the real in-app prompt modal, pre-filled empty ----
  try {
    createJob(); // not awaited -- pauses at the real prompt modal
    await new Promise(r => setTimeout(r, 20));
    check('TEST 1: confirm modal shown', !document.getElementById('confirmModal').classList.contains('hidden'));
    const inp = document.getElementById('confirmModalInput');
    check('TEST 1: real text input rendered, starts empty', !!inp && inp.value === '');
    check('TEST 1: title shown', document.getElementById('confirmModalCard').innerHTML.includes('Client name for the new job'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: cancelling the prompt does not create a job ----
  try {
    const before = global.mockJobsData.length;
    document.getElementById('confirmModalCancel').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 2: modal closed', document.getElementById('confirmModal').classList.contains('hidden'));
    check('TEST 2: no job was created', global.mockJobsData.length === before);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: typing a real name and clicking OK creates a real job with that name ----
  try {
    createJob();
    await new Promise(r => setTimeout(r, 20));
    const inp = document.getElementById('confirmModalInput');
    inp.value = 'Brand New Client';
    document.getElementById('confirmModalOk').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const jobInsert = sbCallLog.find(c => c.table === 'jobs' && c.op === 'insert' && c.arg.client_name === 'Brand New Client');
    check('TEST 3: job insert sent with the typed name', !!jobInsert, JSON.stringify(jobInsert));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: submitting a blank name does not create a job ----
  try {
    const before = sbCallLog.filter(c => c.table === 'jobs' && c.op === 'insert').length;
    createJob();
    await new Promise(r => setTimeout(r, 20));
    document.getElementById('confirmModalInput').value = '   ';
    document.getElementById('confirmModalOk').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const after = sbCallLog.filter(c => c.table === 'jobs' && c.op === 'insert').length;
    check('TEST 4: blank name does not insert a job', after === before);
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: pressing Enter in the prompt input submits it (same as clicking OK) ----
  try {
    createJob();
    await new Promise(r => setTimeout(r, 20));
    const inp = document.getElementById('confirmModalInput');
    inp.value = 'Enter Key Client';
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const jobInsert = sbCallLog.find(c => c.table === 'jobs' && c.op === 'insert' && c.arg.client_name === 'Enter Key Client');
    check('TEST 5: Enter key submits the prompt', !!jobInsert, JSON.stringify(jobInsert));
    check('TEST 5: modal closed after Enter submit', document.getElementById('confirmModal').classList.contains('hidden'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: pressing Escape in the prompt input cancels it ----
  try {
    createJob();
    await new Promise(r => setTimeout(r, 20));
    const before = global.mockJobsData.length;
    const inp = document.getElementById('confirmModalInput');
    inp.value = 'Should Not Be Created';
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 6: Escape closes the modal', document.getElementById('confirmModal').classList.contains('hidden'));
    check('TEST 6: Escape does not create a job', global.mockJobsData.length === before);
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7: editing the Drive folder link pre-fills the current value and saves the typed value ----
  try {
    openJob('SLX-DRV1');
    st = 'fi';
    drawDetail();
    await new Promise(r => setTimeout(r, 20));
    document.querySelector('[data-drive-edit="SLX-DRV1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const inp = document.getElementById('confirmModalInput');
    check('TEST 7: prompt pre-filled with the current drive url', !!inp && inp.value === 'https://drive.google.com/drive/folders/OLDLINK', inp && inp.value);
    inp.value = 'https://drive.google.com/drive/folders/abc123';
    document.getElementById('confirmModalOk').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const upd = sbCallLog.find(c => c.table === 'jobs' && c.op === 'update' && c.eqVal === 'SLX-DRV1' && c.arg.drive_folder_url === 'https://drive.google.com/drive/folders/abc123');
    check('TEST 7: real drive url saved', !!upd, JSON.stringify(upd));
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

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
}, 1500);
