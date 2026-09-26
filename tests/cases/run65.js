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

// Feature: a shared date-range filter for the Team Scorecards page, matching
// the same From/To/Clear pattern already used on Leads Tracker, Jobs,
// Estimates, and Vendor Payables -- applies across all three tracker views
// (Admin/Closer/Design) since they share one filter bar.
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

  // ---- TEST 1: the date filter controls exist ----
  try {
    check('TEST 1: from-date input exists', !!document.getElementById('scorecardDateFrom'));
    check('TEST 1: to-date input exists', !!document.getElementById('scorecardDateTo'));
    check('TEST 1: clear-dates button exists', !!document.getElementById('scorecardDateClear'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: with no filter, the Admin Tracker (default view) shows both rows ----
  try {
    const html = document.getElementById('adminTrackerTable').innerHTML;
    check('TEST 2: both dates show', html.includes('2026-01-05') && html.includes('2026-02-10'), html);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: setting a date range filters the Admin Tracker to just the matching row ----
  try {
    const from = document.getElementById('scorecardDateFrom');
    from.value = '2026-02-01';
    from.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const html = document.getElementById('adminTrackerTable').innerHTML;
    check('TEST 3: only the Feb row shows', html.includes('2026-02-10') && !html.includes('2026-01-05'), html);
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: the filter carries over to the Closer Tracker view too (shared filter bar) ----
  try {
    document.querySelector('[data-scorecard-view="closer"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const html = document.getElementById('closerTrackerTable').innerHTML;
    check('TEST 4: only the Feb closer row shows', html.includes('2026-02-10') && !html.includes('2026-01-05'), html);
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: Clear dates restores both rows ----
  try {
    document.getElementById('scorecardDateClear').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 5: the date inputs are cleared', document.getElementById('scorecardDateFrom').value === '' && document.getElementById('scorecardDateTo').value === '');
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
