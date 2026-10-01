const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const domHtml = fs.readFileSync(path.join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(path.join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');

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

// Feature: Labor -> Payroll -> Timesheets. One tab per person (Admin
// staff like Krissalyn included) showing that person's pay period laid out
// like the per-person Google Sheets timesheets: Day / Date / Project /
// Clock In / Clock Out / Hours, a subtotal per week with $ (hours x rate),
// and a period total -- so hours can be double-checked line by line.
global.mockPeriods = [
  { period_start: '2026-09-14', paid: true, paid_on: '2026-09-30T12:00:00Z' },
  { period_start: '2026-08-31', payroll_group: 'krissalyn', paid: true, paid_on: '2026-09-15T12:00:00Z' }
];
global.mockTime = [
  { person: 'Avelino', work_date: '2026-09-14', job_id: 'SLX-1', clock_in: '07:00:00', clock_out: '17:00:00', hours: 10, kind: 'Job' },
  { person: 'Avelino', work_date: '2026-09-15', job_id: 'SLX-1', clock_in: '08:00:00', clock_out: '16:00:00', hours: 8, kind: 'Job' },
  { person: 'Avelino', work_date: '2026-09-19', job_id: 'SLX-2', clock_in: '08:00:00', clock_out: '17:30:00', hours: 9.5, kind: 'Job' },
  { person: 'Avelino', work_date: '2026-09-21', job_id: 'SLX-2', clock_in: '08:00:00', clock_out: '19:30:00', hours: 11.5, kind: 'Job' },
  { person: 'Krissalyn', work_date: '2026-09-14', job_id: null, clock_in: '10:09:00', clock_out: '18:54:00', hours: 8.75, kind: 'Admin' },
  { person: 'Krissalyn', work_date: '2026-09-15', job_id: null, clock_in: '10:00:00', clock_out: '19:16:00', hours: 9.27, kind: 'Admin' }
];

function makeChain(table) {
  const f = [];
  const chain = {
    select() { return chain; },
    eq(col, val) { f.push(r => r[col] === val); return chain; },
    gte(col, val) { f.push(r => r[col] >= val); return chain; },
    lte(col, val) { f.push(r => r[col] <= val); return chain; },
    order() { return chain; }, neq() { return chain; }, in() { return chain; }, ilike() { return chain; }, limit() { return chain; },
    gt() { return chain; }, lt() { return chain; }, not() { return chain; }, or() { return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() { return Promise.resolve({ data: table === 'payroll_periods' ? { period_start: '2026-09-14', paid: true, paid_on: '2026-09-30T12:00:00Z' } : null, error: null }); },
    then(resolve) {
      const src = table === 'time_entries' ? global.mockTime : table === 'payroll_periods' ? global.mockPeriods : [];
      resolve({ data: src.filter(r => f.every(fn => fn(r))), error: null });
    }
  };
  return chain;
}
const sbMock = {
  from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} }
};
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  people.length = 0;
  people.push({ n: 'Avelino', r: 'Crew', rate: 25 }, { n: 'Krissalyn', r: 'Admin', rate: 8 });
  jobs.length = 0;
  jobs.push({ id: 'SLX-1', client: 'Tim Packard' }, { id: 'SLX-2', client: 'Natalya Feoktistov' });
  const wait = ms => new Promise(r => setTimeout(r, ms || 20));

  laborView = 'payroll';
  drawLabor();
  await wait();

  // ---- TEST 1: Payroll has Pay Periods / Timesheets modes, Pay Periods by default ----
  try {
    check('TEST 1: mode chips exist', !!document.querySelector('[data-payroll-mode="periods"]') && !!document.querySelector('[data-payroll-mode="sheets"]'));
    check('TEST 1: timesheets hidden by default', document.getElementById('payrollSheetMode').classList.contains('hidden'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: Timesheets shows one tab per person, Admin included ----
  try {
    document.querySelector('[data-payroll-mode="sheets"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait();
    const tabs = [...document.querySelectorAll('[data-ts-person]')].map(b => b.dataset.tsPerson);
    check('TEST 2: Avelino and Krissalyn each get a tab', tabs.join() === 'Avelino,Krissalyn', tabs.join());
    check('TEST 2: no More chip when everyone is in the main list', !document.querySelector('[data-ts-more]'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: a crew timesheet lists days, projects, clock times, H:MM, week subtotals ----
  try {
    const sel = document.getElementById('tsPeriodSelect');
    sel.value = '2026-09-14';
    if (sel.value !== '2026-09-14') { sel.insertAdjacentHTML('beforeend', '<option value="2026-09-14">x</option>'); sel.value = '2026-09-14'; }
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await wait();
    const t = document.getElementById('tsSheet').textContent;
    check('TEST 3: shows project client name', t.includes('Tim Packard') && t.includes('Natalya Feoktistov'), t);
    check('TEST 3: shows clock times', t.includes('7:00 am') && t.includes('5:30 pm'), t);
    check('TEST 3: Saturday shows because it was worked', t.includes('Saturday'), t);
    check('TEST 3: Sunday hidden because it was not worked', !t.includes('Sunday'), t);
    check('TEST 3: week 1 subtotal 27:30 hrs / $687.50', t.includes('27:30') && t.includes('$687.50'), t);
    check('TEST 3: week 2 subtotal 11:30 / $287.50', t.includes('11:30') && t.includes('$287.50'), t);
    check('TEST 3: period total 39:00 / $975.00', t.includes('39:00') && t.includes('$975.00'), t);
    check('TEST 3: paid status shown from payroll_periods', t.includes('Paid'), t);
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: an Admin timesheet has no Project column and uses their own rate ----
  try {
    document.querySelector('[data-ts-person="Krissalyn"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait();
    const head = document.querySelector('#tsTable thead').textContent;
    check('TEST 4: no Project column for Admin', !head.includes('Project'), head);
    const t = document.getElementById('tsSheet').textContent;
    check('TEST 4: 8:45 shown for 8.75 hrs', t.includes('8:45'), t);
    check('TEST 4: total $144.16 at $8/hr', t.includes('$144.16'), t);
    check('TEST 4: no other person leaks in', !t.includes('Tim Packard'), t);
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: Custom range -- one week, mid-week start, and a month ----
  try {
    document.querySelector('[data-ts-person="Avelino"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait();
    const sel = document.getElementById('tsPeriodSelect');
    check('TEST 5: dropdown offers quick ranges + custom', ['thisWeek','lastWeek','month','lastMonth','custom'].every(v => [...sel.options].some(o => o.value === v)));
    sel.value = 'custom';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await wait();
    check('TEST 5: custom from/to visible', document.getElementById('tsCustom').style.display !== 'none');
    const setD = async (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); await wait(); };
    await setD('tsFrom', '2026-09-14'); await setD('tsTo', '2026-09-20');
    let t = document.getElementById('tsSheet').textContent;
    check('TEST 5: one week = 27:30 / $687.50', t.includes('27:30') && t.includes('$687.50') && !t.includes('11:30'), t);
    check('TEST 5: no Paid badge for a non-pay-period range', !/Paid|Due/.test(document.querySelector('#tsSheet .kpi').textContent), document.querySelector('#tsSheet .kpi').textContent);
    await setD('tsFrom', '2026-09-01'); await setD('tsTo', '2026-09-30');
    t = document.getElementById('tsSheet').textContent;
    check('TEST 5: whole month totals 39:00 / $975.00', t.includes('39:00') && t.includes('$975.00'), t);
    check('TEST 5: month starts mid-week on Tuesday 9/1', t.includes('9/1/26') && !t.includes('8/31/26'), t);
    check('TEST 5: month has 5 week subtotals', (t.match(/Week [0-9]/g) || []).length === 5, t);
    await setD('tsFrom', '2026-09-30'); await setD('tsTo', '2026-09-01');
    check('TEST 5: backwards range is explained', document.getElementById('tsSheet').textContent.includes('on or before'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: only the main six show; the rest sit behind More ----
  try {
    people.length = 0;
    ['Avelino','Carlos','Edy','Krissalyn','Roberto','Rosa','Tito','Victor'].forEach(n => people.push({ n, r: ['Krissalyn','Rosa','Victor'].includes(n) ? 'Admin' : 'Crew', rate: 20 }));
    tsPerson = 'Avelino';
    drawTimesheet(); await wait();
    const names = () => [...document.querySelectorAll('[data-ts-person]')].map(b => b.dataset.tsPerson).join();
    check('TEST 6: main six in the requested order', names() === 'Avelino,Edy,Roberto,Tito,Rosa,Krissalyn', names());
    const more = document.querySelector('[data-ts-more]');
    check('TEST 6: More chip counts the hidden two', more && more.textContent.includes('2'), more && more.textContent);
    more.dispatchEvent(new MouseEvent('click', { bubbles: true })); await wait();
    check('TEST 6: More reveals Carlos and Victor', names().includes('Carlos') && names().includes('Victor'), names());
    document.querySelector('[data-ts-more]').dispatchEvent(new MouseEvent('click', { bubbles: true })); await wait();
    openTimesheet('Carlos', '2026-09-14'); await wait();
    check('TEST 6: a hidden person opened from a pay period still gets a tab', names().split(',').includes('Carlos') && !names().includes('Victor'), names());
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7: Pay Periods splits Krissalyn out from the team, each with its own Paid marker ----
  try {
    people.length = 0;
    people.push({ n: 'Avelino', r: 'Crew', rate: 25 }, { n: 'Krissalyn', r: 'Admin', rate: 8 });
    payrollMode = 'periods'; payrollGroup = 'team';
    await drawPayroll(); await wait();
    const groups = [...document.querySelectorAll('[data-payroll-group]')].map(b => b.textContent).join();
    check('TEST 7: Team and Krissalyn chips', groups === 'Team,Krissalyn', groups);
    const rowOf = st => document.querySelector('[data-open-payroll="' + st + '"]');
    check('TEST 7: team 9/14 period is Avelino only = $975.00', rowOf('2026-09-14') && rowOf('2026-09-14').textContent.includes('$975.00'), rowOf('2026-09-14') && rowOf('2026-09-14').textContent);
    check('TEST 7: team 9/14 shows Paid (legacy row with no group = team)', rowOf('2026-09-14').textContent.includes('Paid'));
    check('TEST 7: team 8/31 is Due -- Krissalyn being paid does not mark the team paid', !rowOf('2026-08-31') || !rowOf('2026-08-31').textContent.includes('Paid'));
    document.querySelector('[data-payroll-group="krissalyn"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); await wait();
    check('TEST 7: Krissalyn 9/14 period = $144.16', rowOf('2026-09-14') && rowOf('2026-09-14').textContent.includes('$144.16'), rowOf('2026-09-14') && rowOf('2026-09-14').textContent);
    check('TEST 7: Krissalyn 9/14 is Due -- team being paid does not mark her paid', !rowOf('2026-09-14').textContent.includes('Paid'));
    openPayrollPeriod('2026-09-14');
    check('TEST 7: detail title names Krissalyn', document.getElementById('ppName').textContent.includes('Krissalyn'));
    const names = [...document.querySelectorAll('#ppBody [data-ts-open]')].map(b => b.textContent).join();
    check('TEST 7: detail lists only Krissalyn', names === 'Krissalyn', names);
    payrollGroup = 'team';
    // timesheet badge picks the person's own group row
    payrollMode = 'sheets'; tsPeriod = '2026-09-14'; tsPerson = 'Krissalyn';
    await drawTimesheet(); await wait();
    check('TEST 7: Krissalyn timesheet 9/14 shows Due, not the team Paid', !document.querySelector('#tsSheet .kpi').textContent.includes('Paid'), document.querySelector('#tsSheet .kpi').textContent);
    tsPerson = 'Avelino'; await drawTimesheet(); await wait();
    check('TEST 7: Avelino timesheet 9/14 shows Paid', document.querySelector('#tsSheet .kpi').textContent.includes('Paid'));
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

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
