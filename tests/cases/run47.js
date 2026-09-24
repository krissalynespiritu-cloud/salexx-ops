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

const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}
global.check = check;
global.results = results;

global.mockSocialPosts = [
  { post_id: 'P-1', title: 'Eating prank', stage: 'Raw Footage / Ideas', posting_date: null, final_video_link: 'https://drive.google.com/x', content_types: ['Skit/Funny'] },
  { post_id: 'P-2', title: 'Sam Before & After 1', stage: 'Stuck', posting_date: null, final_video_link: 'https://drive.google.com/y', content_types: [] }
];
global.mockContentTypes = [
  { type_id: 'T-1', name: 'Carousel', sort_order: 3 },
  { type_id: 'T-2', name: 'Talking Head', sort_order: 10 },
  { type_id: 'T-3', name: 'Skit/Funny', sort_order: 9 }
];
global.sbCallLog = [];

function makeChain(table) {
  let lastOp = null, lastArg = null, eqVal = null;
  const chain = {
    select() { return chain; },
    insert(arg) { lastOp = 'insert'; lastArg = arg; return chain; },
    update(arg) { lastOp = 'update'; lastArg = arg; return chain; },
    delete() { lastOp = 'delete'; return chain; },
    eq(col, val) { eqVal = val; return chain; },
    order() { return chain; },
    single() {
      if (table === 'social_content_types') {
        const row = { type_id: 'T-NEW-' + Math.random().toString(36).slice(2, 6), ...lastArg };
        global.mockContentTypes.push(row);
        return Promise.resolve({ data: row, error: null });
      }
      return Promise.resolve({ data: global.mockSocialPosts[0], error: null });
    },
    then(resolve) {
      global.sbCallLog.push({ table, op: lastOp || 'select', eqVal, arg: lastArg });
      if (table === 'social_content_types') {
        if (lastOp === 'update') {
          const r = global.mockContentTypes.find(x => x.type_id === eqVal);
          if (r) Object.assign(r, lastArg);
          resolve({ data: null, error: null }); return;
        }
        if (lastOp === 'delete') {
          global.mockContentTypes = global.mockContentTypes.filter(x => x.type_id !== eqVal);
          resolve({ data: null, error: null }); return;
        }
        resolve({ data: global.mockContentTypes.slice(), error: null }); return;
      }
      if (table === 'social_posts') {
        if (lastOp === 'update') {
          const r = global.mockSocialPosts.find(x => x.post_id === eqVal);
          if (r) Object.assign(r, lastArg);
          resolve({ data: null, error: null }); return;
        }
        resolve({ data: global.mockSocialPosts.slice(), error: null }); return;
      }
      resolve({ data: [], error: null });
    }
  };
  return chain;
}
const sbMock = { from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); }, auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} } };
global.supabase = { createClient: () => sbMock };

// Feature: a "Type of Content" column on the Social Media Planner, matching
// the multi-label picker from the Monday.com board this replaced (Carousel,
// Talking Head, Before & After, etc.). Each post can carry multiple content
// types, shown as chips, editable via a checkbox multi-select popover that
// stays open across multiple selections (real multi-select UX, not a
// select-one-then-closes dropdown).
const testLogic = `
(async () => {
  await drawSocialPlanner();

  // ---- TEST 1: existing content types render as chips; an empty one shows a placeholder ----
  try {
    const body = document.getElementById('socialList').innerHTML;
    check('TEST 1: shows the real existing content type as a chip', body.includes('Skit/Funny'));
    check('TEST 1: a post with no types shows a "+ Type" placeholder', body.includes('+ Type'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: clicking the type button opens a checkbox menu listing every content type ----
  try {
    document.querySelector('[data-social-type-btn="P-2"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const menu = document.querySelector('[data-social-type-menu="P-2"]');
    check('TEST 2: the menu is now visible', menu && !menu.classList.contains('hidden'));
    check('TEST 2: it lists a real option from the reference label set', !!document.querySelector('[data-social-type-toggle="P-2"][value="Carousel"]'));
    check('TEST 2: it lists the option the user explicitly asked for', !!document.querySelector('[data-social-type-toggle="P-2"][value="Talking Head"]'));
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: checking a box saves immediately, updates the chip button, and keeps the menu open for more picks ----
  try {
    const cb = document.querySelector('[data-social-type-toggle="P-2"][value="Carousel"]');
    cb.checked = true;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const updCall = global.sbCallLog.find(c => c.table === 'social_posts' && c.op === 'update' && c.eqVal === 'P-2');
    check('TEST 3: a real update was sent with the new content_types array', updCall && JSON.stringify(updCall.arg.content_types) === JSON.stringify(['Carousel']), JSON.stringify(updCall));
    check('TEST 3: the chip button now shows the new selection', document.querySelector('[data-social-type-btn="P-2"]').innerHTML.includes('Carousel'));
    check('TEST 3: the menu is still open (real multi-select, not close-on-first-pick)', !document.querySelector('[data-social-type-menu="P-2"]').classList.contains('hidden'));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: unchecking removes it from the saved array ----
  try {
    const cb = document.querySelector('[data-social-type-toggle="P-2"][value="Carousel"]');
    cb.checked = false;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    const updCall = [...global.sbCallLog].reverse().find(c => c.table === 'social_posts' && c.op === 'update' && c.eqVal === 'P-2');
    check('TEST 4: the type was removed from the saved array', updCall && JSON.stringify(updCall.arg.content_types) === JSON.stringify([]), JSON.stringify(updCall));
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
