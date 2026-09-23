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
global.mockJobsData = [];
global.mockAdminDaily = [
  { log_date: '2026-09-01', leads_assigned: 10, appointments_set: 4 }
];
global.mockCloserDaily = [
  { log_date: '2026-09-01', shows_received: 5, closed_deals: 2, revenue: 15000 }
];
global.mockDesignDaily = [
  { log_date: '2026-09-01', design_sent: 3, design_sold: 1 }
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
      if (lastOp === 'delete') { sbCallLog.push({ table, op: 'delete', eqVal: chain._eqVal }); resolve({ data: null, error: null }); return; }
      if (lastOp === 'update') { sbCallLog.push({ table, op: 'update', arg: lastArg }); resolve({ data: null, error: null }); return; }
      if (lastOp === 'insert') { sbCallLog.push({ table, op: 'insert', arg: lastArg }); resolve({ data: null, error: null }); return; }
      sbCallLog.push({ table, op: 'select' });
      let src;
      if (table === 'jobs') src = global.mockJobsData;
      else if (table === 'admin_daily') src = global.mockAdminDaily;
      else if (table === 'closer_daily') src = global.mockCloserDaily;
      else if (table === 'design_daily') src = global.mockDesignDaily;
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

try {
  (0, eval)(mainScript);
  check('main script evaluates without throwing', true);
} catch (e) {
  check('main script evaluates without throwing', false, e.stack);
  console.log('\n=== FAIL (' + results.fail.length + ') ===');
  results.fail.forEach(f => console.log('  FAIL - ' + f));
  process.exit(1);
}

const testLogic = `
(async () => {
  const clickTab = (tab) => {
    const btn = document.querySelector('.sidebarLink[data-tab="' + tab + '"]');
    if (!btn) throw new Error('no sidebar button for ' + tab);
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };

  mockJobsData = [];
  await fetchJobs();

  // ---- TEST 1: old separate tracker sidebar links are gone; new one exists ----
  try {
    check('TEST 1: admintracker sidebar link removed', !document.querySelector('.sidebarLink[data-tab="admintracker"]'));
    check('TEST 1: closertracker sidebar link removed', !document.querySelector('.sidebarLink[data-tab="closertracker"]'));
    check('TEST 1: designtracker sidebar link removed', !document.querySelector('.sidebarLink[data-tab="designtracker"]'));
    check('TEST 1: teamscorecards sidebar link exists', !!document.querySelector('.sidebarLink[data-tab="teamscorecards"]'));
    check('TEST 1: old standalone sections removed from DOM', !document.getElementById('s-admintracker') && !document.getElementById('s-closertracker') && !document.getElementById('s-designtracker'));
    check('TEST 1: new consolidated section exists', !!document.getElementById('s-teamscorecards'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: clicking Team Scorecards shows section, defaults to Admin view, draws admin table ----
  try {
    clickTab('teamscorecards');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 2: Team Scorecards section shown, others hidden', !document.getElementById('s-teamscorecards').classList.contains('hidden') && document.getElementById('s-jobs').classList.contains('hidden'));
    check('TEST 2: Admin view visible by default', !document.getElementById('scorecardAdminView').classList.contains('hidden'));
    check('TEST 2: Closer view hidden by default', document.getElementById('scorecardCloserView').classList.contains('hidden'));
    check('TEST 2: Design view hidden by default', document.getElementById('scorecardDesignView').classList.contains('hidden'));
    const adminHtml = document.getElementById('adminTrackerTable').innerHTML;
    check('TEST 2: admin tracker table rendered real seeded row', adminHtml.includes('2026-09-01') && adminHtml.includes('40.0%'), adminHtml);
    check('TEST 2: chips rendered with Admin pressed', document.querySelector('[data-scorecard-view="admin"]').getAttribute('aria-pressed') === 'true');
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: switching to Closer view via chip click shows closer data ----
  try {
    const closerChip = document.querySelector('[data-scorecard-view="closer"]');
    closerChip.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 3: Closer view now visible', !document.getElementById('scorecardCloserView').classList.contains('hidden'));
    check('TEST 3: Admin view now hidden', document.getElementById('scorecardAdminView').classList.contains('hidden'));
    const closerHtml = document.getElementById('closerTrackerTable').innerHTML;
    check('TEST 3: closer tracker table rendered real seeded row', closerHtml.includes('2026-09-01') && closerHtml.includes('40.0%') && closerHtml.includes('15,000'), closerHtml);
    check('TEST 3: chips updated, Closer pressed', document.querySelector('[data-scorecard-view="closer"]').getAttribute('aria-pressed') === 'true');
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: switching to Design view via chip click shows design data ----
  try {
    const designChip = document.querySelector('[data-scorecard-view="design"]');
    designChip.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 4: Design view now visible', !document.getElementById('scorecardDesignView').classList.contains('hidden'));
    check('TEST 4: Closer view now hidden', document.getElementById('scorecardCloserView').classList.contains('hidden'));
    const designHtml = document.getElementById('designTrackerTable').innerHTML;
    check('TEST 4: design tracker table rendered real seeded row', designHtml.includes('2026-09-01') && designHtml.includes('33.3%'), designHtml);
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: navigating away and back to teamscorecards restores the last-selected view (design) ----
  try {
    clickTab('jobs');
    clickTab('teamscorecards');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 5: still on Design view after navigating away and back', !document.getElementById('scorecardDesignView').classList.contains('hidden'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: restoreLastTab() correctly restores teamscorecards from localStorage ----
  try {
    localStorage.setItem('lastTab', 'teamscorecards');
    restoreLastTab();
    await new Promise(r => setTimeout(r, 20));
    check('TEST 6: restoreLastTab shows Team Scorecards section', !document.getElementById('s-teamscorecards').classList.contains('hidden'));
    check('TEST 6: restoreLastTab draws the design table (last active view)', document.getElementById('designTrackerTable').innerHTML.includes('2026-09-01'));
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7: unrelated features (Data Health, Retire Job) remain unaffected ----
  try {
    clickTab('datahealth');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 7: Data Health tab still works', !document.getElementById('s-datahealth').classList.contains('hidden'));
    check('TEST 7: Retire Job functions still present', typeof openRetireJobReview === 'function' && typeof confirmRetireJob === 'function');
  } catch (e) { check('TEST 7: no throw', false, e.stack); }

  console.log('\\n=== PASS (' + results.pass.length + ') ===');
  results.pass.forEach(p => console.log('  ok - ' + p));
  console.log('\\n=== FAIL (' + results.fail.length + ') ===');
  results.fail.forEach(f => console.log('  FAIL - ' + f));
  global.__TEST_FAIL_COUNT__ = results.fail.length;
})();
`;

(0, eval)(testLogic);

setTimeout(() => {
  process.exit(global.__TEST_FAIL_COUNT__ ? 1 : 0);
}, 800);
