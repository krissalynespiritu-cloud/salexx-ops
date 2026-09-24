const fs = require('fs');
const path = require('path');

const domHtml = fs.readFileSync(path.join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(path.join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');

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

global.mockJobsData = [
  { job_id: 'SLX-MONEY1', client_name: 'Money Format Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 44869.82, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false, crew_leader_fee: 0, upsell_amount: 0 }
];
global.mockJobCostsData = [{ cost_id: 'JC-OLD', job_id: 'SLX-MONEY1', category: 'Materials', amount: 1203.55 }];
global.mockFailTables = new Set();

function makeChain(table) {
  let lastOp = null, lastArg = null, eqVal = null, inCol = null, inVals = null;
  const eqFilters = {};
  const chain = {
    select() { return chain; },
    insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; },
    delete() { lastOp = 'delete'; return chain; },
    eq(col, val) { eqVal = val; eqFilters[col] = val; return chain; },
    in(col, vals) { inCol = col; inVals = vals; return chain; },
    neq() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() {
      if (table === 'jobs') {
        const row = global.mockJobsData.find(j => j.job_id === eqVal);
        return Promise.resolve({ data: row || null, error: row ? null : { message: 'not found' } });
      }
      return Promise.resolve({ data: null, error: null });
    },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) {
      if (table === 'job_costs' && lastOp === null) {
        const matches = global.mockJobCostsData.filter(r =>
          (eqFilters.job_id === undefined || r.job_id === eqFilters.job_id) &&
          (eqFilters.category === undefined || r.category === eqFilters.category)
        );
        resolve({ data: matches, error: null });
        return;
      }
      if (lastOp === 'insert') {
        if (table === 'job_costs') global.mockJobCostsData.push({ cost_id: 'JC-NEW-' + Math.random().toString(36).slice(2, 6), ...lastArg });
        resolve({ data: null, error: null }); return;
      }
      if (lastOp === 'delete') {
        if (table === 'job_costs') {
          if (inCol === 'cost_id') global.mockJobCostsData = global.mockJobCostsData.filter(r => !inVals.includes(r.cost_id));
        }
        resolve({ data: null, error: null }); return;
      }
      if (lastOp === 'update') { resolve({ data: null, error: null }); return; }
      let src = table === 'jobs' ? global.mockJobsData : [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}
const sbMock = {
  from(t) { return makeChain(t); },
  rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); },
  auth: {
    signOut() {}, onAuthStateChange() {},
    getSession() { return Promise.resolve({ data: { session: null } }); },
    getUser() { return Promise.resolve({ data: { user: { id: 'U-TEST' } } }); }
  }
};
global.supabase = { createClient: () => sbMock };

// Design-direction change: every dollar-denominated editable field across the
// app (previously plain <input type="number">, which structurally can't show
// a "$" or thousands separator) now displays and edits as "$X,XXX.XX", while
// non-dollar numeric fields sharing the same rowInput/FI helpers (job hours,
// overhead %) are untouched. A shared `mv()` getter strips the formatting
// back to a clean number before it ever reaches a save function, so the
// underlying stored value is unaffected by the display change.
const testLogic = `
(async () => {
  await fetchJobs();

  // ---- TEST 1: the Job Costing "Est vs Actual" breakdown shows real $ formatting, not raw numbers ----
  try {
    openJob('SLX-MONEY1');
    st = 'co';
    drawDetail();
    await new Promise(r => setTimeout(r, 10));
    const body = document.getElementById('dBody').innerHTML;
    check('TEST 1: Contract price shows $44,869.82, not the raw 44869.82', body.includes('$44,869.82'));
    check('TEST 1: Materials shows $1,203.55, not the raw 1203.55', body.includes('$1,203.55'));
    check('TEST 1: Change orders shows $0.00, not a bare 0', body.includes('$0.00'));
    const matInput = document.querySelector('[data-c="mat"]');
    check('TEST 1: the Materials field is a formatted text input now, not a bare number input', matInput && matInput.type === 'text' && matInput.value === '$1,203.55', matInput && matInput.value);
    check('TEST 1: the Materials field carries the shared moneyField class', matInput && matInput.classList.contains('moneyField'));
    const hoursInput = document.querySelector('[data-c="mhrs"]');
    check('TEST 1: Job hours is NOT money-formatted (still a plain number input)', hoursInput && hoursInput.type === 'number');
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: focusing a money field strips the formatting so it is easy to edit ----
  try {
    const matInput = document.querySelector('[data-c="mat"]');
    matInput.dispatchEvent(new Event('focusin', { bubbles: true }));
    check('TEST 2: focusing the field reveals the raw number, no $ or commas', matInput.value === '1203.55', matInput.value);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: editing with real DOM events saves a clean number even though the field displays formatted currency ----
  try {
    global.mockJobCostsData = [{ cost_id: 'JC-OLD', job_id: 'SLX-MONEY1', category: 'Materials', amount: 1203.55 }];
    const matInput = document.querySelector('[data-c="mat"]');
    matInput.focus();
    matInput.value = '2,500.00'; // simulate a user pasting a formatted amount in
    matInput.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 10));
    const savedRow = global.mockJobCostsData.find(r => r.category === 'Materials');
    check('TEST 3: the saved amount is a clean 2500, not NaN or a string with $/commas', savedRow && savedRow.amount === 2500, JSON.stringify(savedRow));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: blurring a money field (without changing it) reformats it back to currency display ----
  try {
    const matInput = document.querySelector('[data-c="mat"]');
    matInput.dispatchEvent(new Event('focusout', { bubbles: true }));
    check('TEST 4: blurring reformats the field back to $2,500.00', matInput.value === '$2,500.00', matInput.value);
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
}, 1500);
