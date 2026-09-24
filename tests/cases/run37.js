const fs = require('fs');
const path = require('path');

const domHtml = fs.readFileSync(path.join(__dirname, '..', '_generated', 'dom.html'), 'utf8');
const mainScript = fs.readFileSync(path.join(__dirname, '..', '_generated', 'mainscript.js'), 'utf8');

const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!doctype html><html><body>${domHtml}</body></html>`, { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.navigator = dom.window.navigator;
global.location = dom.window.location;

const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}
global.check = check;
global.results = results;

const sbMock = { from() { return { select() { return this; }, eq() { return this; }, then(resolve) { resolve({ data: [], error: null }); } }; }, rpc() { return Promise.resolve({ data: [], error: null }); }, auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} } };
global.supabase = { createClient: () => sbMock };

// Design-direction change: "the interface should feel dense, functional, and
// human-designed rather than decorative" -- the Dashboard's rotating,
// randomized emoji greeting and the decorative sparkline trend-lines on its
// 5 KPI cards were both a generic-SaaS-dashboard signal, not construction-ops
// signal. Both were removed.
const testLogic = `
(() => {
  // ---- TEST 1: greeting is a plain, deterministic phrase with no emoji ----
  try {
    currentUserProfile = { full_name: 'Krissalyn Espiritu' };
    currentUserEmail = 'krissalynespiritu@gmail.com';
    const line = greetingLine();
    check('TEST 1: greeting includes the first name', line.includes('Krissalyn'));
    check('TEST 1: greeting has no emoji (no astral-plane / pictographic characters)', !/[\\u{1F300}-\\u{1FAFF}\\u2600-\\u27BF]/u.test(line));
    check('TEST 1: greeting is one of the plain phrase buckets', ['Good morning','Good afternoon','Good evening','Working late'].some(p => line.startsWith(p)));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: greeting is deterministic (no more random phrase rotation) ----
  try {
    const a = greetingLine(), b = greetingLine(), c = greetingLine();
    check('TEST 2: calling greetingLine() repeatedly returns the same phrase (no randomization)', a === b && b === c, JSON.stringify([a, b, c]));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: greeting falls back gracefully with no name ----
  try {
    currentUserProfile = null;
    currentUserEmail = '';
    const line = greetingLine();
    check('TEST 3: greeting with no known name is still a plain non-empty phrase', typeof line === 'string' && line.length > 0 && !line.includes(','));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: kpiCardCompact no longer renders a decorative sparkline ----
  try {
    const html = kpiCardCompact('<svg></svg>', 'var(--good)', 'Total Revenue', '$1,000', '<span>up</span>');
    check('TEST 4: card renders the label and value', html.includes('Total Revenue') && html.includes('$1,000'));
    check('TEST 4: card has no sparkline <polyline> (miniSpark removed)', !html.includes('<polyline'));
    check('TEST 4: miniSpark helper itself no longer exists', typeof miniSpark === 'undefined');
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

process.exit(global.__TEST_FAIL_COUNT__ ? 1 : 0);
