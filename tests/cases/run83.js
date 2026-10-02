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

// Feature: Dashboard clock + weather card under the mini calendar --
// Oregon time, current Beaverton weather, next 4 days with rain >= 50%
// highlighted, and a real Retry button if the weather can't load.
const sbMock = {
  from() { const c = { select() { return c; }, eq() { return c; }, order() { return c; }, then(r) { r({ data: [], error: null }); } }; return c; },
  rpc() { return Promise.resolve({ data: [], error: null }); },
  auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} }
};
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  // ---- TEST 1: clock shows an Oregon-time time and date ----
  try {
    drawDashClock();
    const t = document.getElementById('dashClockTime').textContent, d = document.getElementById('dashClockDate').textContent;
    check('TEST 1: time looks like h:mm AM/PM', /^[0-9]{1,2}:[0-9]{2} (AM|PM)$/.test(t), t);
    check('TEST 1: date has a weekday', /day,/.test(d), d);
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: weather renders now + 4 days, rain >= 50% highlighted ----
  try {
    dashWeather = {
      current: { temperature_2m: 61.6, weather_code: 3 },
      daily: { time: ['2026-10-01','2026-10-02','2026-10-03','2026-10-04','2026-10-05'], weather_code: [3, 61, 0, 2, 95],
        temperature_2m_max: [64, 58, 70, 66, 60], temperature_2m_min: [50, 49, 51, 52, 53], precipitation_probability_max: [10, 80, 0, 49, 50] }
    };
    dashWeatherErr = false;
    drawDashWeather();
    const now = document.getElementById('dashWeatherNow').textContent;
    check('TEST 2: current temp rounded to 62°', now.includes('62°'), now);
    check('TEST 2: today high/low', now.includes('H 64°') && now.includes('L 50°'), now);
    check('TEST 2: condition label', now.includes('Cloudy'), now);
    const days = [...document.querySelectorAll('#dashWeatherDays > div')];
    check('TEST 2: four forecast days, today excluded', days.length === 4 && days[0].textContent.includes('Fri'), days.map(d => d.textContent).join('|'));
    check('TEST 2: 80% rain day is flagged', days[0].title.includes('likely rain'), days[0].title);
    check('TEST 2: 49% is not flagged, 50% is', !days[2].title.includes('likely rain') && days[3].title.includes('likely rain'), days[2].title + ' / ' + days[3].title);
    check('TEST 2: storm code labelled', days[3].title.startsWith('Thunderstorms'), days[3].title);
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: load failure shows a real Retry button ----
  try {
    dashWeather = null; dashWeatherErr = true;
    drawDashWeather();
    const btn = document.querySelector('#dashWeatherDays [data-retry-fn="retryDashWeather"]');
    check('TEST 3: Retry button present', !!btn, document.getElementById('dashWeatherDays').innerHTML);
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    check('TEST 3: Retry clears the error and shows loading', !dashWeatherErr && document.getElementById('dashWeatherNow').textContent.includes('Loading'), document.getElementById('dashWeatherNow').textContent);
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  clearInterval(dashClockTimer);
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
