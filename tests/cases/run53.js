const fs = require('fs');
const path = require('path');

const domHtml = fs.readFileSync(path.join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(path.join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');
const leadsScript = fs.readFileSync(path.join(__dirname, '..', '_generated', 'block2.js'), 'utf8');
const rawHtml = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!doctype html><html><body>${domHtml}</body></html>`, { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.MouseEvent = dom.window.MouseEvent;
global.Event = dom.window.Event;
global.navigator = dom.window.navigator;
global.location = dom.window.location;
global.alert = () => { throw new Error('alert() should never be called anymore'); };
global.confirm = () => { throw new Error('confirm() should never be called anymore'); };

const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}
global.check = check;
global.results = results;

// A row with every toggle field on, so the compacted checkboxes are visible in a real render.
global.mockLeadsData = [
  { lead_id: 'L-1', name: 'Full Toggle Lead', phone: '', email: '', source: 'Website', status: 'Estimated', lead_date: '2026-08-01', est_value: 5000, estimate_booked: true, shown: true, design_sent_date: '2026-08-05', design_sold_date: '2026-08-06', closed_revenue: null, loss_reason: '', job_id: null }
];
global.mockJobsData = [];
global.sbInsertLog = [];

function makeChain(table) {
  let lastOp = null, lastArg = null, eqVal = null;
  const chain = {
    select() { return chain; }, insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; }, delete() { lastOp = 'delete'; return chain; },
    eq(col, val) { eqVal = val; return chain; }, neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() {
      if (table === 'clients' && lastOp === 'insert') return Promise.resolve({ data: { client_id: 'C-NEW' }, error: null });
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (table === 'jobs') { resolve({ data: global.mockJobsData, error: null }); return; }
      if (table === 'clients') { resolve({ data: [], error: null }); return; }
      if (table === 'leads') {
        if (lastOp === 'insert') {
          global.sbInsertLog.push(lastArg);
          global.mockLeadsData.push({ lead_id: 'L-NEW', name: lastArg.name, phone: '', email: '', source: lastArg.source, status: lastArg.status, lead_date: lastArg.lead_date, est_value: lastArg.est_value, estimate_booked: false, shown: false, design_sent_date: null, design_sold_date: null, closed_revenue: null, loss_reason: '', job_id: null });
          resolve({ data: null, error: null }); return;
        }
        if (lastOp === 'update') {
          const row = global.mockLeadsData.find(l => l.lead_id === eqVal);
          if (row) Object.assign(row, lastArg);
          resolve({ data: null, error: null }); return;
        }
        resolve({ data: global.mockLeadsData, error: null }); return;
      }
      resolve({ data: [], error: null });
    }
  };
  return chain;
}
const sbMock = {
  from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {}, getUser() { return Promise.resolve({ data: { user: { id: 'U-1' } } }); } }
};
global.supabase = { createClient: () => sbMock };

// Feature: the always-visible "New lead" fields+button card crushed the page --
// collapsed it behind a "+ Add lead" toggle. The lead-row toggles (Appt/Shown/
// Design sent/Design sold) showed a text label next to each checkbox, which
// combined with the other fixed-width columns forced the row wider than the
// page and needed a horizontal scroll -- switched those to bare checkboxes
// (title/aria-label only, matching the hover-tooltip UX already used
// elsewhere) so the whole row fits without scrolling.
const testLogic = `
(async () => {
  const clickTab = (tab) => document.querySelector('.sidebarLink[data-tab="' + tab + '"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  clickTab('leadstracker');
  await window.refreshLeads();
  await new Promise(r => setTimeout(r, 20));

  // ---- TEST 1: the new-lead form starts collapsed behind a + toggle ----
  try {
    check('TEST 1: the + Add lead toggle exists', !!document.getElementById('newLeadToggleBtn'));
    check('TEST 1: the new-lead fields panel starts hidden', document.getElementById('newLeadPanel').classList.contains('hidden'));
    check('TEST 1: the save-status line is outside the panel (visible even when collapsed)', !document.getElementById('newLeadPanel').contains(document.getElementById('leadSaveStatus')));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: clicking + reveals the real fields ----
  try {
    document.getElementById('newLeadToggleBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    check('TEST 2: the panel is now visible', !document.getElementById('newLeadPanel').classList.contains('hidden'));
    check('TEST 2: the name field is there', !!document.getElementById('newLeadName'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: submitting with no name shows the real validation error and keeps the panel open ----
  try {
    document.getElementById('addLeadBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 3: shows the real required-name error', document.getElementById('leadSaveStatus').textContent.includes('name is required'));
    check('TEST 3: panel stays open so the error/fields are visible', !document.getElementById('newLeadPanel').classList.contains('hidden'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: a successful add clears the fields and collapses the panel again ----
  try {
    global.sbInsertLog = [];
    document.getElementById('newLeadName').value = 'Jordan Test';
    document.getElementById('addLeadBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    check('TEST 4: a real lead was inserted', global.sbInsertLog.some(l => l.name === 'Jordan Test'), JSON.stringify(global.sbInsertLog));
    check('TEST 4: the name field was cleared', document.getElementById('newLeadName').value === '');
    check('TEST 4: the panel collapsed again after success', document.getElementById('newLeadPanel').classList.contains('hidden'));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: the row's toggles are bare checkboxes now (tooltip only, no permanent text label) ----
  try {
    const row = document.getElementById('leadList').innerHTML;
    check('TEST 5: no visible "Appt" text label', !/>Appt</.test(row), row.match(/.{20}Appt.{20}/)?.[0]);
    check('TEST 5: no visible "Shown" text label', !/>Shown</.test(row));
    check('TEST 5: no visible "Design sent" text label', !/>Design sent</.test(row));
    check('TEST 5: no visible "Design sold" text label', !/>Design sold</.test(row));
    check('TEST 5: the Design sent checkbox keeps an accessible label', row.includes('aria-label="Design sent"') || row.includes('title="Design sent"'));
    check('TEST 5: the Design sold checkbox keeps an accessible label', row.includes('aria-label="Design sold"') || row.includes('title="Design sold"'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: the toggles still function -- unchecking Design sold still saves through the real field-save path ----
  try {
    const cb = document.querySelector('[data-lead-id="L-1"][data-field="designSold"]');
    check('TEST 6: the design-sold checkbox exists and starts checked', cb && cb.checked === true);
    cb.checked = false;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 6: it saved through the real leads update path', global.mockLeadsData.find(l => l.lead_id === 'L-1').design_sold_date == null);
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

  global.__ASYNC_TESTS_DONE__ = true;
})();
`;

try {
  (0, eval)(mainScript + '\n' + leadsScript + '\n' + testLogic);
} catch (e) {
  console.log('FAIL setup:', e.stack);
  process.exit(1);
}

setTimeout(() => {
  // ---- TEST 7 (source-level): the row's fixed-width columns were trimmed so the
  // whole row fits inside the page's 900px .wrap without a horizontal scroll ----
  const leadDateW = Number((rawHtml.match(/li\("leadDate",lead\.leadDate,"","(\d+)px","date"\)/) || [])[1] || 999);
  check('TEST 7: lead date column narrower than the old 104px', leadDateW < 104, leadDateW);
  const lossReasonW = Number((rawHtml.match(/LOSS_REASONS\.map\(o=>`<option \$\{lead\.lossReason===o\?"selected":""\}>\$\{o\}<\/option>`\)\.join\(""\),"(\d+)px"\)/) || [])[1] || 999);
  check('TEST 7: why-lost column narrower than the old 110px', lossReasonW < 110, lossReasonW);
  const jobSelectW = Number((rawHtml.match(/data-field="jobId" aria-label="Linked job" style="width:(\d+)px/) || [])[1] || 999);
  check('TEST 7: linked-job column narrower than the old 140px', jobSelectW < 140, jobSelectW);

  console.log('\n=== PASS (' + results.pass.length + ') ===');
  results.pass.forEach(p => console.log('  ok - ' + p));
  console.log('\n=== FAIL (' + results.fail.length + ') ===');
  results.fail.forEach(f => console.log('  FAIL - ' + f));
  process.exit(results.fail.length || !global.__ASYNC_TESTS_DONE__ ? 1 : 0);
}, 1500);
