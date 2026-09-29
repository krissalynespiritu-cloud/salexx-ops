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

// Feature: added a new crew member, Carlos Jr., to the Time Entry roster,
// with a $22/hr wage on file (supabase/87_add_carlos_jr.sql) so his labor
// cost is calculated at his real rate instead of the company fallback rate.
global.mockJobsData = [];
global.mockCrewData = [{ name: 'Carlos Jr.', role: 'Crew', hourly_wage: 22, active: true }];

function makeChain(table) {
  const chain = {
    select() { return chain; }, insert() { return chain; }, update() { return chain; }, delete() { return chain; },
    eq() { return chain; }, neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; }, not() { return chain; }, or() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      const src = table === 'jobs' ? global.mockJobsData : table === 'crew' ? global.mockCrewData : [];
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
  await fetchCrewRates();
  drawRoster();

  // ---- TEST 1: Carlos Jr. is in the roster, as Crew ----
  try {
    const p = people.find(x => x.n === 'Carlos Jr.');
    check('TEST 1: Carlos Jr. is in the people roster', !!p);
    check('TEST 1: he is Crew, not Admin', p.r === 'Crew');
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: his real $22/hr wage was picked up from the crew table ----
  try {
    const p = people.find(x => x.n === 'Carlos Jr.');
    check('TEST 2: his rate is 22', p.rate === 22, p.rate);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: he renders on the Time Entry roster with his own fields ----
  try {
    check('TEST 3: his name shows in the roster', document.getElementById('roster').innerHTML.includes('Carlos Jr.'));
    check('TEST 3: his own job picker exists', !!document.querySelector('#roster select[data-p="Carlos Jr."][data-i="0"]'));
    check('TEST 3: his own Save button exists', !!document.querySelector('[data-save-person="Carlos Jr."]'));
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
