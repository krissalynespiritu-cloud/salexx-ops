const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const domHtml = fs.readFileSync(path.join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(path.join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');
const block2 = fs.readFileSync(path.join(__dirname, '..', '_generated', 'block2.js'), 'utf8');

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

// Feature: every job-picking dropdown in the app (roster, leads, task modal,
// crew assignment, material requests, vendor invoices, subcontractor
// contracts, warranty claims) is now a searchable combobox instead of a
// plain <select> you had to scroll through -- and the roster's picker, which
// used to hide completed jobs, now includes every job (needed for
// backfilling hours on a job that's since been marked Completed).
global.mockJobsData = [
  { job_id: 'SLX-A1', client_name: 'Active Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false },
  { job_id: 'SLX-C1', client_name: 'Zack Completed', client_id: null, address_city: '2 Test St', job_type: 'Siding', stage: 'Completed', contract_price: 4000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-02', completed_date: '2026-08-01', monday_item_id: null, retired: false }
];
global.mockLeadsData = [
  { lead_id: 'L-1', name: 'Test Lead', phone: '', email: '', source: 'Referral', status: 'New', lead_date: '2026-01-01', value: 0, job_id: null }
];

function makeChain(table) {
  const chain = {
    select() { return chain; }, insert() { return chain; }, update() { return chain; }, delete() { return chain; },
    eq() { return chain; }, neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; }, not() { return chain; }, or() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      const src = table === 'jobs' ? global.mockJobsData : table === 'leads' ? global.mockLeadsData : [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}
const sbMock = {
  from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {}, getUser() { return Promise.resolve({ data: { user: { id: 'U-1' } } }); } }
};
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  await fetchJobs();
  drawRoster();

  // ---- TEST 1: the roster's job picker is now a searchable combobox, not a plain select ----
  try {
    const picker = document.querySelector('#roster .jobPicker');
    check('TEST 1: a jobPicker wrapper exists on the roster', !!picker);
    check('TEST 1: it has a real search input', !!picker.querySelector('.jobPickerSearch'));
    const realSelect = picker.querySelector('.jobPickerReal');
    check('TEST 1: the real select is still there with its original data attributes', !!realSelect && realSelect.dataset.f === 'job');
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: completed jobs are now included (the reported bug) ----
  try {
    const realSelect = document.querySelector('#roster .jobPickerReal');
    const values = [...realSelect.options].map(o => o.value);
    check('TEST 2: the completed job is selectable', values.includes('SLX-C1'), JSON.stringify(values));
    check('TEST 2: the active job is also selectable', values.includes('SLX-A1'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: typing filters the dropdown list by substring, case-insensitively ----
  try {
    const search = document.querySelector('#roster .jobPickerSearch');
    search.dispatchEvent(new Event('focusin', { bubbles: true }));
    search.value = 'zack';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    const list = search.closest('.jobPicker').querySelector('.jobPickerList');
    check('TEST 3: the list shows the matching completed job', list.innerHTML.includes('Zack Completed'), list.innerHTML);
    check('TEST 3: it filters out the non-matching job', !list.innerHTML.includes('Active Client'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: clicking a result selects it on the real select and fires save-triggering events ----
  try {
    const search = document.querySelector('#roster .jobPickerSearch');
    const item = search.closest('.jobPicker').querySelector('.jobPickerList [data-jp-value="SLX-C1"]');
    check('TEST 4: the matching result exists', !!item);
    item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const realSelect = document.querySelector('#roster .jobPickerReal');
    check('TEST 4: the real select value updated', realSelect.value === 'SLX-C1');
    check('TEST 4: the search box now shows the selected label', search.value.includes('Zack Completed'), search.value);
    check('TEST 4: the picker list closed', search.closest('.jobPicker').querySelector('.jobPickerList').classList.contains('hidden'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: the real underlying roster state (what save actually reads) reflects the picker's selection ----
  try {
    const hrsInput = document.querySelector('#roster input[data-p="Carlos"][data-i="0"][data-f="manualHours"]');
    hrsInput.value = '4';
    hrsInput.dispatchEvent(new Event('input', { bubbles: true }));
    check('TEST 5: the job saved through the picker is what the roster block now holds', blocksOf('Carlos')[0].job === 'SLX-C1');
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: the Leads Tracker's "Link to a job" field is also a searchable picker ----
  try {
    activateTab('leadstracker');
    await window.refreshLeads();
    const picker = document.querySelector('[data-lead-id="L-1"].jobPicker, [data-field="jobId"]')?.closest('.jobPicker');
    check('TEST 6: the leads job-link field is a jobPicker', !!picker, document.getElementById('leadList')?.innerHTML.slice(0, 300));
    const realSelect = picker?.querySelector('[data-field="jobId"]');
    check('TEST 6: it still carries the original data-field="jobId" the save handler relies on', !!realSelect);
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  console.log('\\n=== PASS (' + results.pass.length + ') ===');
  results.pass.forEach(p => console.log('  ok - ' + p));
  console.log('\\n=== FAIL (' + results.fail.length + ') ===');
  results.fail.forEach(f => console.log('  FAIL - ' + f));
  global.__TEST_FAIL_COUNT__ = results.fail.length;
})();
`;

try {
  (0, eval)(mainScript + '\n' + block2 + '\n' + testLogic);
} catch (e) {
  console.log('FAIL setup:', e.stack);
  process.exit(1);
}

setTimeout(() => {
  process.exit(global.__TEST_FAIL_COUNT__ ? 1 : 0);
}, 2000);
