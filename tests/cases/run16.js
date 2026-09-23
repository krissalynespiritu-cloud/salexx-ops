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
// Today is 2026-09-23 (Wednesday) per the system clock; Monday of that week is 2026-09-21
global.mockJobsData = [
  { job_id: 'SLX-CS1', client_name: 'Scheduled Job Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false, scheduled_start_date: '2026-09-21', scheduled_end_date: '2026-09-25' },
  { job_id: 'SLX-CS2', client_name: 'Other Job Client', client_id: null, address_city: '2 Test St', job_type: 'Siding', stage: 'Designs Sold', contract_price: 3000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-02-01', completed_date: null, monday_item_id: null, retired: false }
];
global.mockCrewAssignments = [
  { assignment_id: 'CA-1', job_id: 'SLX-CS1', person: 'Carlos', assignment_date: '2026-09-21', shift: 'Full Day' },
  { assignment_id: 'CA-2', job_id: 'SLX-CS2', person: 'Carlos', assignment_date: '2026-09-22', shift: 'Morning' },
  { assignment_id: 'CA-3', job_id: 'SLX-CS1', person: 'Carlos', assignment_date: '2026-09-22', shift: 'Afternoon' }
];

function makeChain(table) {
  let lastOp = null, lastArg = null, eqVal = null;
  const chain = {
    select() { return chain; },
    insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; },
    delete() { lastOp = 'delete'; return chain; },
    eq(col, val) { eqVal = val; chain._eqCol = col; chain._eqVal = val; return chain; },
    neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte(col, val) { chain._gte = val; return chain; },
    lte(col, val) { chain._lte = val; return chain; },
    gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() {
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
        if (table === 'crew_assignments') global.mockCrewAssignments = global.mockCrewAssignments.filter(r => r.assignment_id !== eqVal);
        resolve({ data: null, error: null }); return;
      }
      if (lastOp === 'update') {
        sbCallLog.push({ table, op: 'update', arg: lastArg, eqVal });
        if (table === 'crew_assignments') { const r = global.mockCrewAssignments.find(x => x.assignment_id === eqVal); if (r) Object.assign(r, lastArg); }
        resolve({ data: null, error: null }); return;
      }
      if (lastOp === 'insert') {
        sbCallLog.push({ table, op: 'insert', arg: lastArg });
        if (table === 'crew_assignments') global.mockCrewAssignments.push({ assignment_id: 'CA-NEW', ...lastArg });
        resolve({ data: null, error: null }); return;
      }
      sbCallLog.push({ table, op: 'select' });
      let src;
      if (table === 'jobs') src = global.mockJobsData;
      else if (table === 'crew_assignments') {
        src = global.mockCrewAssignments.filter(r => (!chain._gte || r.assignment_date >= chain._gte) && (!chain._lte || r.assignment_date <= chain._lte));
      }
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
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };

  await fetchJobs();

  // ---- TEST 1: Crew Schedule chip exists under Labor ----
  try {
    clickTab('labor');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 1: Crew Schedule chip exists', !!document.querySelector('[data-labor-view="sched"]'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: switching to Crew Schedule shows the real assignments for the current week (Mon 2026-09-21) ----
  try {
    document.querySelector('[data-labor-view="sched"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 2: week label shows the real Monday-anchored week', document.getElementById('crewSchedLabel').textContent.includes('Sep 21'));
    const table = document.getElementById('crewScheduleTable').innerHTML;
    check('TEST 2: shows real assigned job chip for Carlos on Mon', table.includes('SLX-CS1'));
    check('TEST 2: shows real assigned job chip for Carlos on Tue (both AM and PM)', table.includes('SLX-CS2 AM') && table.includes('SLX-CS1 PM'), table.slice(0,2000));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: AM/PM split on the same day for the same person is NOT flagged as a conflict ----
  try {
    const tueCell = [...document.querySelectorAll('td')].find(td => td.innerHTML.includes('SLX-CS2 AM'));
    check('TEST 3: the split AM/PM day cell is not marked as a conflict', tueCell && !tueCell.className.includes('crewSchedConflict'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: unstaffed jobs list shows the real job scheduled this week with a staffed day, but flags days aren't checked -- job SLX-CS1 already has assignments so should NOT appear; verify a genuinely unstaffed scheduled job does appear ----
  try {
    global.mockJobsData.push({ job_id: 'SLX-CS3', client_name: 'Unstaffed Client', client_id: null, address_city: '3 Test St', job_type: 'Deck', stage: 'Project Scheduled', contract_price: 1000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-03-01', completed_date: null, monday_item_id: null, retired: false, scheduled_start_date: '2026-09-22', scheduled_end_date: '2026-09-23' });
    await fetchJobs();
    await drawCrewSchedule();
    const body = document.getElementById('unstaffedJobs').innerHTML;
    check('TEST 4: flags the genuinely unstaffed scheduled job', body.includes('Unstaffed Client'));
    check('TEST 4: does not flag the already-staffed job', !body.includes('Scheduled Job Client'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: clicking + on an empty cell opens the assignment modal pre-targeted to that person/date ----
  try {
    const addBtn = document.querySelector('[data-new-assignment="Tito"][data-assign-date="2026-09-21"]');
    check('TEST 5 setup: add button exists for an empty cell', !!addBtn);
    addBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 5: modal opened', !document.getElementById('assignmentModal').classList.contains('hidden'));
    check('TEST 5: shows the correct person and date', document.getElementById('assignmentModalCard').innerHTML.includes('Tito') && document.getElementById('assignmentModalCard').innerHTML.includes('2026-09-21'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: saving a new assignment inserts correctly and appears immediately, creating a real conflict since Carlos already has Full Day that Monday -- test with a clean person instead ----
  try {
    document.getElementById('assignmentModalJob').value = 'SLX-CS2';
    document.getElementById('assignmentModalShift').value = 'Full Day';
    document.getElementById('assignmentModalSave').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 6: insert sent with correct person, date, job, shift', sbCallLog.some(c => c.table === 'crew_assignments' && c.op === 'insert' && c.arg.person === 'Tito' && c.arg.assignment_date === '2026-09-21' && c.arg.job_id === 'SLX-CS2' && c.arg.shift === 'Full Day'), JSON.stringify(sbCallLog.filter(c=>c.table==='crew_assignments'&&c.op==='insert')));
    const table = document.getElementById('crewScheduleTable').innerHTML;
    check('TEST 6: new assignment appears immediately', table.includes('data-open-assignment="CA-NEW"'));
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7: double-booking the same person with two overlapping Full Day assignments IS flagged ----
  try {
    const addBtn2 = document.querySelector('[data-new-assignment="Tito"][data-assign-date="2026-09-21"]');
    check('TEST 7 setup: add button still available on the same cell (multiple assignments allowed)', !!addBtn2);
    addBtn2.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    document.getElementById('assignmentModalJob').value = 'SLX-CS1';
    document.getElementById('assignmentModalShift').value = 'Full Day';
    document.getElementById('assignmentModalSave').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const kriegChip = document.querySelector('[data-open-assignment="CA-NEW"][data-assign-person="Tito"]');
    const conflictCell = kriegChip ? kriegChip.closest('td') : null;
    check('TEST 7: the doubled-up Full Day cell (Tito, Mon) is flagged as a conflict', conflictCell && conflictCell.className.includes('crewSchedConflict'), conflictCell ? conflictCell.outerHTML : 'not found');
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

  // ---- TEST 8: opening an existing assignment via its chip pre-fills the edit form, and deleting it removes it ----
  try {
    const chip = document.querySelector('[data-open-assignment="CA-1"]');
    check('TEST 8 setup: chip exists', !!chip);
    chip.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 8: edit modal shows Edit Assignment title', document.getElementById('assignmentModalCard').innerHTML.includes('Edit Assignment'));
    check('TEST 8: job pre-selected to the real assigned job', document.getElementById('assignmentModalJob').value === 'SLX-CS1');
    document.getElementById('assignmentModalDelete').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    document.getElementById('confirmModalOk').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const table = document.getElementById('crewScheduleTable').innerHTML;
    check('TEST 8: deleted assignment no longer shown', !table.includes('data-open-assignment="CA-1"'));
  } catch (e) { check('TEST 8: no throw', false, e.stack); }

  // ---- TEST 9: week navigation moves forward/back by 7 days and re-fetches ----
  try {
    document.getElementById('crewSchedNext').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 9: next week label updated', document.getElementById('crewSchedLabel').textContent.includes('Sep 28'));
    document.getElementById('crewSchedPrev').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 9: back to the original week', document.getElementById('crewSchedLabel').textContent.includes('Sep 21'));
  } catch (e) { check('TEST 9: no throw', false, e.stack); }

  // ---- TEST 10: unrelated features remain unaffected ----
  try {
    clickTab('jobs');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 10: Jobs tab still works', !document.getElementById('s-jobs').classList.contains('hidden'));
    check('TEST 10: Retire Job functions still present', typeof openRetireJobReview === 'function' && typeof confirmRetireJob === 'function');
    check('TEST 10: RETIRE_DEP_LABELS includes the new dependency', RETIRE_DEP_LABELS.some(([k]) => k === 'crew_assignments'));
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
}, 1200);
