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

// Feature: a shared date-range filter for the Team Scorecards page -- a
// preset dropdown (This Week ... All Time, Custom) matching the Dashboard's
// range picker, applied across all three tracker views (Admin/Closer/Design)
// and their KPI cards, since they share one filter bar.
global.mockAdminDaily = [
  { log_date: '2026-01-05', leads_assigned: 10, appointments_set: 5 },
  { log_date: '2026-02-10', leads_assigned: 8, appointments_set: 4 }
];
global.mockCloserDaily = [
  { log_date: '2026-01-05', shows_received: 3, closed_deals: 1, revenue: 5000 },
  { log_date: '2026-02-10', shows_received: 4, closed_deals: 2, revenue: 9000 }
];

function makeChain(table) {
  let gte = null, lte = null;
  const chain = {
    select() { return chain; },
    gte(col, val) { gte = val; return chain; },
    lte(col, val) { lte = val; return chain; },
    order() { return chain; },
    eq() { return chain; }, neq() { return chain; }, in() { return chain; }, ilike() { return chain; }, limit() { return chain; },
    gt() { return chain; }, lt() { return chain; }, not() { return chain; }, or() { return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      let src = table === 'admin_daily' ? global.mockAdminDaily : table === 'closer_daily' ? global.mockCloserDaily : [];
      if (gte) src = src.filter(r => r.log_date >= gte);
      if (lte) src = src.filter(r => r.log_date <= lte);
      resolve({ data: src, error: null });
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
  drawTeamScorecards();
  await new Promise(r => setTimeout(r, 20));

  const pick = async v => {
    const sel = document.getElementById('scorecardRangeSelect');
    sel.value = v;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
  };

  // ---- TEST 1: the range dropdown exists with the Dashboard's presets, defaulting to This Year ----
  try {
    const sel = document.getElementById('scorecardRangeSelect');
    check('TEST 1: range dropdown exists', !!sel);
    check('TEST 1: has the 7 presets', [...sel.options].map(o => o.value).join() === 'thisWeek,lastWeek,month,lastMonth,year,all,custom', [...sel.options].map(o => o.value).join());
    check('TEST 1: defaults to This Year', sel.value === 'year', sel.value);
    check('TEST 1: custom from/to are hidden by default', document.getElementById('scorecardCustom').style.display === 'none');
    check('TEST 1: old Clear dates button is gone', !document.getElementById('scorecardDateClear'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: All Time shows both rows and totals both into the KPI cards ----
  try {
    await pick('all');
    const html = document.getElementById('adminTrackerTable').innerHTML;
    check('TEST 2: both dates show', html.includes('2026-01-05') && html.includes('2026-02-10'), html);
    const kpis = document.getElementById('adminTrackerKpis').textContent;
    check('TEST 2: KPI leads total is 18', kpis.includes('18'), kpis);
    check('TEST 2: KPI set rate is 50.0%', kpis.includes('50.0%'), kpis);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: Custom reveals from/to, and a range filters the table and KPIs ----
  try {
    await pick('custom');
    check('TEST 3: custom from/to become visible', document.getElementById('scorecardCustom').style.display !== 'none');
    const from = document.getElementById('scorecardDateFrom');
    const to = document.getElementById('scorecardDateTo');
    from.value = '2026-02-01';
    from.dispatchEvent(new Event('change', { bubbles: true }));
    to.value = '2026-12-31';
    to.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const html = document.getElementById('adminTrackerTable').innerHTML;
    check('TEST 3: only the Feb row shows', html.includes('2026-02-10') && !html.includes('2026-01-05'), html);
    const kpis = document.getElementById('adminTrackerKpis').textContent;
    check('TEST 3: KPI leads total is just Feb (8)', /Leads Assigned\\s*8\\s/.test(kpis), kpis);
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: the filter carries over to the Closer Tracker view too (shared filter bar) ----
  try {
    document.querySelector('[data-scorecard-view="closer"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const html = document.getElementById('closerTrackerTable').innerHTML;
    check('TEST 4: only the Feb closer row shows', html.includes('2026-02-10') && !html.includes('2026-01-05'), html);
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: switching back to All Time restores both rows and hides custom inputs ----
  try {
    await pick('all');
    check('TEST 5: custom from/to hidden again', document.getElementById('scorecardCustom').style.display === 'none');
    const html = document.getElementById('closerTrackerTable').innerHTML;
    check('TEST 5: both closer rows show again', html.includes('2026-01-05') && html.includes('2026-02-10'), html);
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
