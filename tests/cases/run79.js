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

// Feature: the same GHL-stage-mirror pattern used on leads (90/91) is now
// also on jobs (94_job_pipeline_stage_always_sync.sql) -- set_job_stage_
// by_contact() always records the raw GHL stage name onto a job (so
// nothing from GHL is ever silently dropped), and additionally updates
// the job's real `stage` enum whenever the GHL stage has a confirmed
// mapping. The app only shows the mirror as a small violet dot on the
// Jobs list; it never computes anything from it.
global.mockJobsData = [
  { job_id: 'SLX-P1', client_name: 'Synced Job Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false, pipeline_stage: 'Ready for Scheduling', pipeline_stage_updated_at: '2026-09-27T10:00:00Z' },
  { job_id: 'SLX-P2', client_name: 'No Sync Client', client_id: null, address_city: '2 Test St', job_type: 'Siding', stage: 'Completed', contract_price: 4000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-02', completed_date: null, monday_item_id: null, retired: false, pipeline_stage: null, pipeline_stage_updated_at: null }
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
      const src = table === 'jobs' ? global.mockJobsData : [];
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
  await fetchJobs();
  activateTab('jobs');
  drawJobs();

  // ---- TEST 1: the synced job shows a small indicator with the raw GHL stage and date in its tooltip ----
  try {
    const html = document.getElementById('jobList').innerHTML;
    const row = html.match(/Synced Job Client[\\s\\S]{0,6000}/)?.[0];
    check('TEST 1: shows the raw GHL stage in a tooltip', row && row.includes('GHL pipeline stage: Ready for Scheduling'), row);
    check('TEST 1: includes the last-updated date', row && row.includes('as of'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: a job with no pipeline_stage shows no indicator at all ----
  try {
    const html = document.getElementById('jobList').innerHTML;
    const row2 = html.match(/No Sync Client[\\s\\S]{0,6000}/)?.[0];
    check('TEST 2: no pipeline-stage tooltip for a job with none set', row2 && !row2.includes('GHL pipeline stage'), row2);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: this is purely informational -- the job's real, structured stage is untouched by the mirror ----
  try {
    const j = jobs.find(x => x.id === 'SLX-P1');
    check('TEST 3: real stage stays whatever it actually is in the DB', j.stage === 'In Progress', j.stage);
    check('TEST 3: pipelineStage is mapped separately', j.pipelineStage === 'Ready for Scheduling');
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

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
