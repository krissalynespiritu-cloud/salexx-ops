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

// Feature: Calendar page -- read-only view of calendar_events (GHL
// appointments + Google Calendar events that GHL shows as blocked slots),
// bucketed by Oregon date, with week/month/list views, per-calendar
// filters, daily REMINDER events hidden by default, and cancelled hidden.
global.mockEvents = [
  { event_id: 'e1', source: 'ghl', external_id: 'g1', calendar_name: 'Design Presentation', title: 'Juan Romero & Salexx', starts_at: '2026-10-01T16:30:00Z', ends_at: '2026-10-01T17:30:00Z', all_day: false, status: 'confirmed', contact_phone: '503-555-0100' },
  // 11:30pm Oregon on Sep 28 = 06:30Z Sep 29 -- must land on Mon 28, not Tue 29
  { event_id: 'e2', source: 'google', external_id: 'x2', calendar_name: null, title: 'Randy Johnson', starts_at: '2026-09-29T06:30:00Z', ends_at: '2026-09-29T07:00:00Z', all_day: false, status: 'confirmed' },
  { event_id: 'e3', source: 'google', external_id: 'x3', title: '!!REMINDER!! CALL leads', starts_at: '2026-09-30T17:30:00Z', all_day: false, status: 'confirmed' },
  // Google all-day: Sep 28 through Sep 29 (end date exclusive = Sep 30)
  { event_id: 'e4', source: 'google', external_id: 'x4', title: 'Bid Opportunity', starts_at: '2026-09-28T00:00:00Z', ends_at: '2026-09-30T00:00:00Z', all_day: true, status: 'confirmed' },
  { event_id: 'e5', source: 'ghl', external_id: 'g5', calendar_name: 'Final Photos', title: 'Kevin Marugg & Salexx', starts_at: '2026-09-29T18:30:00Z', all_day: false, status: 'cancelled' }
];
function makeChain() {
  const f = [];
  const chain = {
    select() { return chain; },
    neq(col, val) { f.push(r => r[col] !== val); return chain; },
    gte(col, val) { f.push(r => r[col] >= val); return chain; },
    lte(col, val) { f.push(r => r[col] <= val); return chain; },
    order() { return chain; }, eq() { return chain; },
    then(resolve) { resolve({ data: global.mockEvents.filter(r => f.every(fn => fn(r))), error: global.mockError || null }); }
  };
  return chain;
}
const sbMock = {
  from() { return makeChain(); }, rpc() { return Promise.resolve({ data: [], error: null }); },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} }
};
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  const wait = () => new Promise(r => setTimeout(r, 20));
  const dayText = d => { const days = [...document.querySelectorAll('#calBody .calDay')]; return days.map(x => x.textContent); };
  calAnchor = '2026-10-01'; calView = 'week';
  await drawCalendar(); await wait();

  // ---- TEST 1: sidebar + week view basics ----
  try {
    check('TEST 1: Calendar sidebar link exists', !!document.querySelector('.sidebarLink[data-tab="calendar"]'));
    check('TEST 1: week runs Sun Sep 27 - Sat Oct 3', document.getElementById('calRangeLabel').textContent.includes('Sep 27') && document.getElementById('calRangeLabel').textContent.includes('Oct 03'), document.getElementById('calRangeLabel').textContent);
    const d = dayText();
    check('TEST 1: 7 day columns', d.length === 7, d.length);
    check('TEST 1: GHL appt on Thu Oct 1 at 9:30 AM Oregon', d[4].includes('Juan Romero') && d[4].includes('9:30 AM'), d[4]);
    check('TEST 1: late-night Google event stays on Mon Sep 28 (Oregon date)', d[1].includes('Randy Johnson') && !d[2].includes('Randy Johnson'), d[1] + ' / ' + d[2]);
    check('TEST 1: all-day event spans Mon + Tue only (end date exclusive)', d[1].includes('Bid Opportunity') && d[2].includes('Bid Opportunity') && !d[3].includes('Bid Opportunity'), d.join(' | '));
    check('TEST 1: cancelled appointment hidden', !d.join('').includes('Kevin Marugg'));
    check('TEST 1: REMINDER hidden by default', !d.join('').includes('REMINDER'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: reminders toggle, calendar filter, event details ----
  try {
    const cb = document.getElementById('calShowReminders'); cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true }));
    check('TEST 2: Show reminders brings it back', dayText()[3].includes('REMINDER'), dayText()[3]);
    const chips = [...document.querySelectorAll('[data-cal-toggle]')].map(b => b.dataset.calToggle);
    check('TEST 2: one chip per calendar, Google last', chips.join() === 'Design Presentation,Google Calendar', chips.join());
    document.querySelector('[data-cal-toggle="Google Calendar"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    check('TEST 2: hiding Google hides its events only', !dayText().join('').includes('Randy') && dayText()[4].includes('Juan'), dayText().join('|'));
    document.querySelector('[data-cal-toggle="Google Calendar"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.querySelector('[data-cal-ev="e1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    check('TEST 2: clicking an event shows its details', document.querySelector('[data-cal-ev="e1"]').textContent.includes('503-555-0100'), document.querySelector('[data-cal-ev="e1"]').textContent);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: month and list views ----
  try {
    document.querySelector('[data-cal-view="month"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); await wait();
    check('TEST 3: month label', document.getElementById('calRangeLabel').textContent === 'October 2026', document.getElementById('calRangeLabel').textContent);
    check('TEST 3: month grid starts on Sun Sep 27 (5 weeks = 35 days)', document.querySelectorAll('#calBody .calDay').length === 35, document.querySelectorAll('#calBody .calDay').length);
    document.querySelector('[data-cal-view="list"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); await wait();
    const t = document.getElementById('calBody').textContent;
    check('TEST 3: list (October) shows Oct 1 appt but not September items', t.includes('Juan Romero') && !t.includes('Randy Johnson'), t);
    document.getElementById('calPrev').dispatchEvent(new MouseEvent('click', { bubbles: true })); await wait();
    check('TEST 3: prev goes to September', document.getElementById('calRangeLabel').textContent === 'September 2026' && document.getElementById('calBody').textContent.includes('Randy Johnson'), document.getElementById('calBody').textContent);
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 5: Google event colours ----
  try {
    check('TEST 5: Google colorId 11 = Tomato', calEvColor({ color: '11', source: 'google' }) === '#d50000');
    check('TEST 5: no colorId -> its calendar colour', calEvColor({ source: 'google', calendar_name: 'Crew' }) === calColor('Crew'));
    check('TEST 5: unknown colorId falls back', calEvColor({ color: '99', source: 'google' }) === calColor('Google Calendar'));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 4: load failure -> Retry, with a hint if the table is missing ----
  try {
    global.mockError = { message: 'relation "public.calendar_events" does not exist' };
    await drawCalendar(); await wait();
    const html = document.getElementById('calBody').innerHTML;
    check('TEST 4: Retry button', html.includes('data-retry-fn="drawCalendar"'), html);
    check('TEST 4: points at the migration', html.includes('99_calendar_events.sql'), html);
    global.mockError = null;
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
