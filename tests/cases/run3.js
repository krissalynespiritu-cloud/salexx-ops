const { JSDOM } = require('jsdom');
const fs = require('fs');

const domHtml = fs.readFileSync(require('path').join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(require('path').join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');
const leadsScript = fs.readFileSync(require('path').join(__dirname, '..', '_generated', 'block2.js'), 'utf8');

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
global.mockLeadsData = [
  { lead_id: 'LD-1', name: 'Marketing Test Lead', phone: '5035551234', email: 'mt@example.com', source: 'Facebook', status: 'New', lead_date: '2026-09-01', est_value: 8000, notes: '', estimate_booked: false, shown: false, closed_revenue: null }
];
global.mockAdSpend = [
  { spend_id: 1, month: '2026-09-01', platform: 'Facebook', campaign: '', spend: 500, leads: 3, notes: '' }
];
global.mockAdPerformance = [
  { month: '2026-09-01', spend: 500, leads: 3, revenue: 6000, won: 1 }
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
      else if (table === 'leads') src = global.mockLeadsData;
      else if (table === 'ad_spend') src = global.mockAdSpend;
      else if (table === 'ad_performance') src = global.mockAdPerformance;
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
  (0, eval)(mainScript + '\n' + leadsScript);
  check('main + leads-tracker scripts evaluate without throwing', true);
} catch (e) {
  check('main + leads-tracker scripts evaluate without throwing', false, e.stack);
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

  await fetchJobs();
  await window.refreshLeads(); // real app calls this once during boot(), mirror that here
  await new Promise(r => setTimeout(r, 30));

  // ---- TEST 1: old separate Lead Source Report / FB Ads sidebar links and sections are gone ----
  try {
    check('TEST 1: old leadsourcereport sidebar link removed', !document.querySelector('.sidebarLink[data-tab="leadsourcereport"]'));
    check('TEST 1: old fbads sidebar link removed', !document.querySelector('.sidebarLink[data-tab="fbads"]'));
    check('TEST 1: new marketingperformance sidebar link exists', !!document.querySelector('.sidebarLink[data-tab="marketingperformance"]'));
    check('TEST 1: new s-marketingperformance section exists', !!document.getElementById('s-marketingperformance'));
    check('TEST 1: old s-fbads top-level section removed', !document.getElementById('s-fbads'));
    check('TEST 1: inner leadsourcereport div still exists (Leads Tracker IIFE target)', !!document.getElementById('s-leadsourcereport'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: clicking Marketing Performance shows the section, defaults to Lead Source Report, and it actually renders real seeded lead data ----
  try {
    clickTab('marketingperformance');
    await new Promise(r => setTimeout(r, 30));
    check('TEST 2: Marketing Performance section shown, Jobs hidden', !document.getElementById('s-marketingperformance').classList.contains('hidden') && document.getElementById('s-jobs').classList.contains('hidden'));
    check('TEST 2: Lead Source view visible by default', !document.getElementById('marketingLeadSourceView').classList.contains('hidden'));
    check('TEST 2: FB Ads view hidden by default', document.getElementById('marketingFbAdsView').classList.contains('hidden'));
    const reportHtml = document.getElementById('s-leadsourcereport').innerHTML;
    check('TEST 2: real Lead Source Report content rendered inside the moved div', reportHtml.includes('leadReport') || document.getElementById('leadReport'), reportHtml.slice(0,300));
    const innerReport = document.getElementById('leadReport');
    check('TEST 2: leadReport inner content populated with real seeded source data', innerReport && innerReport.innerHTML.includes('Facebook'), innerReport ? innerReport.innerHTML.slice(0,400) : 'no #leadReport');
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: switching to Facebook Ads subview renders real seeded ad performance data ----
  try {
    document.querySelector('[data-marketing-view="fbads"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 3: FB Ads view now visible', !document.getElementById('marketingFbAdsView').classList.contains('hidden'));
    check('TEST 3: Lead Source view now hidden', document.getElementById('marketingLeadSourceView').classList.contains('hidden'));
    const adHtml = document.getElementById('adTable').innerHTML;
    check('TEST 3: FB Ads table shows real seeded spend row', adHtml.includes('500') || adHtml.includes('Facebook'), adHtml);
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: switching back to Lead Source Report subview still works after visiting FB Ads ----
  try {
    document.querySelector('[data-marketing-view="leadsource"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 4: Lead Source view visible again', !document.getElementById('marketingLeadSourceView').classList.contains('hidden'));
    check('TEST 4: FB Ads view hidden again', document.getElementById('marketingFbAdsView').classList.contains('hidden'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: navigating away and back preserves last-selected subview, and restoreLastTab works ----
  try {
    document.querySelector('[data-marketing-view="fbads"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    clickTab('jobs');
    clickTab('marketingperformance');
    await new Promise(r => setTimeout(r, 30));
    check('TEST 5: still on FB Ads view after navigating away and back', !document.getElementById('marketingFbAdsView').classList.contains('hidden'));
    localStorage.setItem('lastTab', 'marketingperformance');
    restoreLastTab();
    await new Promise(r => setTimeout(r, 30));
    check('TEST 5: restoreLastTab shows Marketing Performance section', !document.getElementById('s-marketingperformance').classList.contains('hidden'));
    check('TEST 5: restoreLastTab keeps FB Ads as the last active subview', !document.getElementById('marketingFbAdsView').classList.contains('hidden'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: Social Media Planner (explicitly kept separate per roadmap) still works unaffected ----
  try {
    clickTab('socialplanner');
    await new Promise(r => setTimeout(r, 30));
    check('TEST 6: Social Media Planner still works unaffected', !document.getElementById('s-socialplanner').classList.contains('hidden'));
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  // ---- TEST 7: unrelated features remain unaffected ----
  try {
    clickTab('teamscorecards');
    await new Promise(r => setTimeout(r, 30));
    check('TEST 7: Team Scorecards still works', !document.getElementById('s-teamscorecards').classList.contains('hidden'));
    clickTab('labor');
    await new Promise(r => setTimeout(r, 30));
    check('TEST 7: Labor still works', !document.getElementById('s-labor').classList.contains('hidden'));
    clickTab('datahealth');
    await new Promise(r => setTimeout(r, 30));
    check('TEST 7: Data Health still works', !document.getElementById('s-datahealth').classList.contains('hidden'));
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
}, 1000);
