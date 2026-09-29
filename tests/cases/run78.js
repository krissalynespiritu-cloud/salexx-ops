const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const domHtml = fs.readFileSync(path.join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(path.join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');
const leadsScript = fs.readFileSync(path.join(__dirname, '..', '_generated', 'block2.js'), 'utf8');

const dom = new JSDOM(`<!doctype html><html><body>${domHtml}</body></html>`, { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.MouseEvent = dom.window.MouseEvent;
global.Event = dom.window.Event;
global.navigator = dom.window.navigator;
global.location = dom.window.location;
global.alert = () => {};
global.confirm = () => true;

const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}
global.check = check;
global.results = results;

// Feature: external automations (Zapier, reading GHL pipeline-stage-change
// events) can now write a raw stage name onto a lead via a new
// leads.pipeline_stage column (supabase/90_lead_pipeline_stage.sql),
// instead of the old approach of mirroring stage changes into a Monday.com
// item -- Monday is being retired. This is purely informational (a small
// violet dot + tooltip on the Leads Tracker), never a source of truth the
// app computes anything from -- it does not touch any of the real tracked
// milestones (estimateBooked/shown/designSent/designSold).
global.mockJobsData = [];
global.mockLeadsData = [
  { lead_id: 'L-1', name: 'Jerry Hallmark', phone: '', email: '', source: 'Referral', status: 'New', lead_date: '2026-01-01', est_value: 0, job_id: null, pipeline_stage: 'Design Presentation', pipeline_stage_updated_at: '2026-09-27T10:00:00Z' },
  { lead_id: 'L-2', name: 'No Pipeline Data', phone: '', email: '', source: 'Website', status: 'New', lead_date: '2026-01-02', est_value: 0, job_id: null, pipeline_stage: null, pipeline_stage_updated_at: null }
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
      if (table === 'jobs') { resolve({ data: global.mockJobsData, error: null }); return; }
      if (table === 'leads') { resolve({ data: global.mockLeadsData, error: null }); return; }
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

const testLogic = `
(async () => {
  await fetchJobs();
  const clickTab = (tab) => document.querySelector('.sidebarLink[data-tab="' + tab + '"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  clickTab('leadstracker');
  await window.refreshLeads();
  await new Promise(r => setTimeout(r, 20));

  // ---- TEST 1: the lead with a pipeline stage shows a small indicator with the raw stage name and updated date in its tooltip ----
  try {
    const html = document.getElementById('leadList').innerHTML;
    const row = html.match(/Jerry Hallmark[\\s\\S]{0,1400}/)?.[0];
    check('TEST 1: shows the pipeline stage in a tooltip', row && row.includes('GHL pipeline stage: Design Presentation'), row);
    check('TEST 1: includes the last-updated date', row && row.includes('as of'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: a lead with no pipeline_stage shows no indicator at all (no stray dot/tooltip) ----
  try {
    const html = document.getElementById('leadList').innerHTML;
    const row2 = html.match(/No Pipeline Data[\\s\\S]{0,1400}/)?.[0];
    check('TEST 2: no pipeline-stage tooltip for a lead with none set', row2 && !row2.includes('GHL pipeline stage'), row2);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: this is purely informational -- it never touches the real tracked lead milestones (toggles render unchecked, as seeded) ----
  try {
    const html = document.getElementById('leadList').innerHTML;
    const row = html.match(/Jerry Hallmark[\\s\\S]{0,1400}/)?.[0];
    check('TEST 3: Appt (estimateBooked) toggle is unchecked', !row.includes('data-field="estimateBooked" checked'), row.match(/data-field="estimateBooked"[^>]*>/)?.[0]);
    check('TEST 3: Design sent toggle is unchecked', !row.includes('data-field="designSent" checked'), row.match(/data-field="designSent"[^>]*>/)?.[0]);
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  console.log('\\n=== PASS (' + results.pass.length + ') ===');
  results.pass.forEach(p => console.log('  ok - ' + p));
  console.log('\\n=== FAIL (' + results.fail.length + ') ===');
  results.fail.forEach(f => console.log('  FAIL - ' + f));
  global.__TEST_FAIL_COUNT__ = results.fail.length;
})();
`;

try {
  (0, eval)(mainScript + '\n' + leadsScript + '\n' + testLogic);
} catch (e) {
  console.log('FAIL setup:', e.stack);
  process.exit(1);
}

setTimeout(() => {
  process.exit(global.__TEST_FAIL_COUNT__ ? 1 : 0);
}, 1500);
