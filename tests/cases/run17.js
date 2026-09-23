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
global.mockProfiles = [
  { user_id: 'U-1', full_name: 'Kriss Owner', initials: 'KO', avatar_color: '#5BA8D4', job_title: 'Owner', crew_name: null, role: 'Owner' },
  { user_id: 'U-2', full_name: 'Luke Crew', initials: 'LC', avatar_color: '#3E9C6D', job_title: 'Crew Lead', crew_name: 'Luke', role: 'Staff' }
];

function makeChain(table) {
  let lastOp = null, lastArg = null, eqVal = null;
  const chain = {
    select() { return chain; },
    insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; },
    delete() { lastOp = 'delete'; return chain; },
    eq(col, val) { eqVal = val; chain._eqCol = col; chain._eqVal = val; return chain; },
    neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (lastOp === 'update') {
        sbCallLog.push({ table, op: 'update', arg: lastArg, eqVal });
        if (table === 'profiles') { const r = global.mockProfiles.find(x => x.user_id === eqVal); if (r) Object.assign(r, lastArg); }
        resolve({ data: null, error: null }); return;
      }
      sbCallLog.push({ table, op: 'select' });
      let src;
      if (table === 'jobs') src = global.mockJobsData;
      else if (table === 'profiles') src = global.mockProfiles;
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

const testLogic = `
(async () => {
  const clickTab = (tab) => {
    const btn = document.querySelector('.sidebarLink[data-tab="' + tab + '"]');
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };

  await fetchJobs();

  // ---- TEST 1: sidebar link and section exist ----
  try {
    check('TEST 1: Team sidebar link exists', !!document.querySelector('.sidebarLink[data-tab="team"]'));
    check('TEST 1: s-team section exists', !!document.getElementById('s-team'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: opening Team shows both real profiles with correct pre-selected roles ----
  try {
    clickTab('team');
    await new Promise(r => setTimeout(r, 30));
    const body = document.getElementById('teamList').innerHTML;
    check('TEST 2: shows both real team members', body.includes('Kriss Owner') && body.includes('Luke Crew'));
    check('TEST 2: shows real job titles', body.includes('Owner') && body.includes('Crew Lead'));
    const ownerSelect = document.querySelector('[data-team-role="U-1"]');
    check('TEST 2: Kriss pre-selected to Owner role', ownerSelect && ownerSelect.value === 'Owner');
    const staffSelect = document.querySelector('[data-team-role="U-2"]');
    check('TEST 2: Luke pre-selected to Staff role', staffSelect && staffSelect.value === 'Staff');
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: changing a role sends a real update and re-renders with the new value ----
  try {
    const staffSelect = document.querySelector('[data-team-role="U-2"]');
    staffSelect.value = 'Admin';
    staffSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    const updCall = sbCallLog.find(c => c.table === 'profiles' && c.op === 'update' && c.eqVal === 'U-2' && c.arg.role === 'Admin');
    check('TEST 3: update sent with the correct user_id and new role', !!updCall, JSON.stringify(sbCallLog.filter(c=>c.table==='profiles')));
    const reSelect = document.querySelector('[data-team-role="U-2"]');
    check('TEST 3: select now reflects Admin after re-render', reSelect && reSelect.value === 'Admin');
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: unrelated features remain unaffected, no restrictions introduced anywhere ----
  try {
    clickTab('warranty');
    await new Promise(r => setTimeout(r, 20));
    check('TEST 4: Warranty tab still works', !document.getElementById('s-warranty').classList.contains('hidden'));
    check('TEST 4: Retire Job functions still present', typeof openRetireJobReview === 'function' && typeof confirmRetireJob === 'function');
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

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
}, 1000);
