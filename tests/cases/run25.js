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
global.alert = () => {};
global.confirm = () => true;

global.printCalls = 0;
global.window.print = () => { global.printCalls++; };

const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}
global.check = check;
global.results = results;

// ---- TEST 3: print stylesheet exists in the real source and targets the app chrome ----
try {
  const realHtml = fs.readFileSync(require('path').join(__dirname, '..', '..', 'index.html'), 'utf8');
  check('TEST 3: a @media print block exists', realHtml.includes('@media print'));
  const printBlock = realHtml.slice(realHtml.indexOf('@media print'), realHtml.indexOf('@media print') + 1500);
  check('TEST 3: it hides the sidebar', printBlock.includes('#sidebar'));
  check('TEST 3: it hides interactive buttons', /\bbutton\{[^}]*display:none/.test(printBlock));
  check('TEST 3: it re-themes to a light, ink-friendly palette', printBlock.includes('#FFFFFF'));
  check('TEST 3: the detail overlay is unfixed so it flows onto printed pages', printBlock.includes('position:static'));
} catch (e) { check('TEST 3: no throw', false, e.stack); }

global.mockJobsData = [
  { job_id: 'SLX-PRINT1', client_name: 'Print Client', client_id: null, address_city: '1 Test St', job_type: 'Roofing', stage: 'In Progress', contract_price: 5000, change_orders: 0, discounts: 0, overhead_pct: 18, sold_date: '2026-01-01', completed_date: null, monday_item_id: null, retired: false }
];

function makeChain(table) {
  const chain = {
    select() { return chain; }, insert() { return chain; }, update() { return chain; }, delete() { return chain; },
    eq() { return chain; }, neq() { return chain; }, in() { return chain; }, order() { return chain; },
    ilike() { return chain; }, limit() { return chain; },
    gte() { return chain; }, lte() { return chain; }, gt() { return chain; }, lt() { return chain; },
    not() { return chain; }, or() { return chain; },
    single() { return Promise.resolve({ data: null, error: null }); },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
    then(resolve) { let src = table === 'jobs' ? global.mockJobsData : []; resolve({ data: src, error: null }); }
  };
  return chain;
}
const sbMock = { from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); }, auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} } };
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  await fetchJobs();

  // ---- TEST 1: the job detail Print button calls window.print() ----
  try {
    openJob('SLX-PRINT1');
    await new Promise(r => setTimeout(r, 20));
    const btn = document.getElementById('detailPrintBtn');
    check('TEST 1: job detail has a real Print button', !!btn);
    const before = global.printCalls;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    check('TEST 1: clicking it calls window.print()', global.printCalls === before + 1);
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: the payroll period Print button calls window.print() ----
  try {
    global.payrollWeeks = { '2026-01-01': { total: 500, people: { Carlos: { hours: 20, amount: 500 } } } };
    global.payrollPaid = {};
    openPayrollPeriod('2026-01-01');
    await new Promise(r => setTimeout(r, 20));
    const btn = document.getElementById('payrollPrintBtn');
    check('TEST 2: payroll detail has a real Print button', !!btn);
    const before = global.printCalls;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    check('TEST 2: clicking it calls window.print()', global.printCalls === before + 1);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- unrelated features remain unaffected ----
  try {
    check('unrelated: Retire Job functions still present', typeof openRetireJobReview === 'function' && typeof confirmRetireJob === 'function');
  } catch (e) { check('unrelated: no throw', false, e.stack); }

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
