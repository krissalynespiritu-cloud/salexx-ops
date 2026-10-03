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
global.mockTime = [
  { person: 'Avelino', work_date: '2026-09-14', job_id: 'SLX-1', clock_in: '07:00:00', clock_out: '17:00:00', hours: 10, kind: 'Job', entry_id: 'a1', paid: true },
  { person: 'Avelino', work_date: '2026-09-15', job_id: 'SLX-1', clock_in: '08:00:00', clock_out: '16:00:00', hours: 8, kind: 'Job', entry_id: 'a2', paid: true },
  { person: 'Avelino', work_date: '2026-09-19', job_id: 'SLX-2', clock_in: '08:00:00', clock_out: '17:30:00', hours: 9.5, kind: 'Job', entry_id: 'a3', paid: false },
  { person: 'Avelino', work_date: '2026-09-21', job_id: 'SLX-2', clock_in: '08:00:00', clock_out: '19:30:00', hours: 11.5, kind: 'Job', entry_id: 'a4', paid: false },
  { person: 'Krissalyn', work_date: '2026-09-14', job_id: null, clock_in: '10:09:00', clock_out: '18:54:00', hours: 8.75, kind: 'Admin', entry_id: 'k1', paid: false },
  { person: 'Krissalyn', work_date: '2026-09-15', job_id: null, clock_in: '10:00:00', clock_out: '19:16:00', hours: 9.27, kind: 'Admin', entry_id: 'k2', paid: false }
];

function makeChain(table) {
  const f = []; let upd = null, inIds = null;
  const chain = {
    select() { return chain; },
    update(v) { upd = v; return chain; },
    eq(col, val) { f.push(r => r[col] === val); return chain; },
    gte(col, val) { f.push(r => r[col] >= val); return chain; },
    lte(col, val) { f.push(r => r[col] <= val); return chain; },
    order() { return chain; }, neq() { return chain; }, in(col, vals) { inIds = vals; return chain; }, ilike() { return chain; }, limit() { return chain; },
    gt() { return chain; }, lt() { return chain; }, not() { return chain; }, or() { return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() { return Promise.resolve({ data: table === 'payroll_periods' ? { period_start: '2026-09-14', paid: true, paid_on: '2026-09-30T12:00:00Z' } : null, error: null }); },
    then(resolve) {
      if (upd && table === 'time_entries') { global.mockTime.filter(r => inIds.includes(r.entry_id)).forEach(r => Object.assign(r, upd)); global.lastPaidUpdate = { upd, inIds }; return resolve({ data: null, error: null }); }
      const src = table === 'time_entries' ? global.mockTime : [];
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

  // ---- TEST 1: Payroll opens straight on Timesheets (Pay Periods removed) ----
  try {
    check('TEST 1: no Pay Periods / Timesheets mode chips', !document.querySelector('[data-payroll-mode]') && !document.getElementById('payrollList'));
    check('TEST 1: timesheet visible', !document.getElementById('payrollSheetMode').classList.contains('hidden'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: Timesheets shows one tab per person, Admin included ----
  try {
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
    const marks = [...document.querySelectorAll('[data-ts-paid]')].map(b => b.textContent);
    check('TEST 3: week 1 partly paid (9/19 unpaid), week 2 unpaid', marks.join('|') === 'Partly paid · mark paid|Unpaid · mark paid', marks.join('|'));
    const hdr = document.querySelector('#tsSheet .kpi').textContent;
    check('TEST 3: header shows unpaid $525.00 (21h) and paid $450.00 (18h)', hdr.includes('Unpaid $525.00') && hdr.includes('Paid $450.00'), hdr);
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
    check('TEST 5: paid status also shown for a custom range', /Unpaid|All paid/.test(document.querySelector('#tsSheet .kpi').textContent), document.querySelector('#tsSheet .kpi').textContent);
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

  // ---- TEST 7: marking a week paid / unpaid, and partly paid ----
  try {
    people.length = 0; people.push({ n: 'Avelino', r: 'Crew', rate: 25 }, { n: 'Krissalyn', r: 'Admin', rate: 8 });
    tsPerson = 'Avelino'; tsPeriod = '2026-09-14';
    await drawTimesheet(); await wait();
    const btn = () => document.querySelectorAll('[data-ts-paid]')[1];
    btn().dispatchEvent(new MouseEvent('click', { bubbles: true })); await wait(); await wait();
    check('TEST 7: marking week 2 paid updates exactly its entries', global.lastPaidUpdate && global.lastPaidUpdate.upd.paid === true && global.lastPaidUpdate.inIds.join() === 'a4', JSON.stringify(global.lastPaidUpdate));
    check('TEST 7: week 2 now shows Paid', btn().textContent === '✓ Paid', btn().textContent);
    btn().dispatchEvent(new MouseEvent('click', { bubbles: true })); await wait(); await wait();
    check('TEST 7: clicking Paid marks it unpaid again', global.lastPaidUpdate.upd.paid === false && btn().textContent.startsWith('Unpaid'), btn().textContent);
    // a week with one paid + one unpaid entry -> Partly paid
    global.mockTime.find(r => r.entry_id === 'a2').paid = false;
    await drawTimesheet(); await wait();
    const first = document.querySelectorAll('[data-ts-paid]')[0];
    check('TEST 7: mixed week shows Partly paid', first.textContent.startsWith('Partly paid'), first.textContent);
    first.dispatchEvent(new MouseEvent('click', { bubbles: true })); await wait(); await wait();
    check('TEST 7: marking a partly paid week pays all of it', global.lastPaidUpdate.upd.paid === true && global.lastPaidUpdate.inIds.slice().sort().join() === 'a1,a2,a3', JSON.stringify(global.lastPaidUpdate));
    tsPerson = 'Krissalyn'; await drawTimesheet(); await wait();
    check('TEST 7: other people unaffected (Krissalyn still unpaid)', document.querySelector('#tsSheet .kpi').textContent.includes('Unpaid'));
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
