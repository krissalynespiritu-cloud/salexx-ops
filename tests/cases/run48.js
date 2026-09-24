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
global.confirm = () => true;

const results = { pass: [], fail: [] };
function check(name, cond, detail) {
  if (cond) results.pass.push(name);
  else results.fail.push(name + (detail ? ' -- ' + detail : ''));
}
global.check = check;
global.results = results;

global.mockSocialPosts = [
  { post_id: 'P-1', title: 'Sam Before & After 1', stage: 'Stuck', posting_date: null, final_video_link: '', content_types: ['Carousel'] }
];
global.mockContentTypes = [
  { type_id: 'T-1', name: 'Ads', sort_order: 0 },
  { type_id: 'T-2', name: 'Carousel', sort_order: 3 },
  { type_id: 'T-3', name: 'Talking Head', sort_order: 10 }
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
        if (lastOp === 'update') { const r = global.mockContentTypes.find(x => x.type_id === eqVal); if (r) Object.assign(r, lastArg); resolve({ data: null, error: null }); return; }
        if (lastOp === 'delete') { global.mockContentTypes = global.mockContentTypes.filter(x => x.type_id !== eqVal); resolve({ data: null, error: null }); return; }
        resolve({ data: global.mockContentTypes.slice(), error: null }); return;
      }
      if (table === 'social_posts') {
        if (lastOp === 'update') { const r = global.mockSocialPosts.find(x => x.post_id === eqVal); if (r) Object.assign(r, lastArg); resolve({ data: null, error: null }); return; }
        resolve({ data: global.mockSocialPosts.slice(), error: null }); return;
      }
      resolve({ data: [], error: null });
    }
  };
  return chain;
}
const sbMock = { from(t) { return makeChain(t); }, rpc() { return Promise.resolve({ data: [{ ok: true }], error: null }); }, auth: { signOut() {}, getSession() { return Promise.resolve({ data: { session: null } }); }, onAuthStateChange() {} } };
global.supabase = { createClient: () => sbMock };

// Feature: the content-type picker's "Create or find labels" search box and
// the "Edit labels" management modal, matching the request to add and edit
// labels rather than being stuck with a fixed list.
const testLogic = `
(async () => {
  await drawSocialPlanner();

  // ---- TEST 1: typing an unmatched name in the search box offers to create it ----
  try {
    document.querySelector('[data-social-type-btn="P-1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const search = document.querySelector('[data-social-type-search="P-1"]');
    search.value = 'Podcast Clip';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    check('TEST 1: offers to create the unmatched label', !!document.querySelector('[data-social-type-create="P-1"]'));
    check('TEST 1: filters out non-matching existing labels while searching', !document.querySelector('[data-social-type-toggle="P-1"][value="Ads"]'));
  } catch (e) { check('TEST 1: no throw', false, e.stack); }

  // ---- TEST 2: creating it adds a real label row and auto-selects it on the current post ----
  try {
    document.querySelector('[data-social-type-create="P-1"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 2: a real label was inserted', global.mockContentTypes.some(t => t.name === 'Podcast Clip'));
    check('TEST 2: it was auto-selected on the post that was open', global.mockSocialPosts[0].content_types.includes('Podcast Clip'));
    check('TEST 2: the search box was cleared after creating', document.querySelector('[data-social-type-search="P-1"]').value === '');
  } catch (e) { check('TEST 2: no throw', false, e.stack); }

  // ---- TEST 3: "Edit labels" opens a management modal listing every real label ----
  try {
    document.querySelector('[data-social-edit-labels]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    check('TEST 3: the labels modal is open', !document.getElementById('socialLabelsModal').classList.contains('hidden'));
    const inputs = [...document.querySelectorAll('[data-social-label-rename]')].map(i => i.value);
    check('TEST 3: lists the real labels including the one just created', inputs.includes('Ads') && inputs.includes('Podcast Clip'), JSON.stringify(inputs));
  } catch (e) { check('TEST 3: no throw', false, e.stack); }

  // ---- TEST 4: renaming a label saves it and cascades to every post using it ----
  try {
    const input = [...document.querySelectorAll('[data-social-label-rename]')].find(i => i.value === 'Carousel');
    input.value = 'Carousel Post';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 4: the label itself was renamed', global.mockContentTypes.some(t => t.name === 'Carousel Post'));
    check('TEST 4: the rename cascaded into the post that had the old name', global.mockSocialPosts[0].content_types.includes('Carousel Post') && !global.mockSocialPosts[0].content_types.includes('Carousel'), JSON.stringify(global.mockSocialPosts[0].content_types));
  } catch (e) { check('TEST 4: no throw', false, e.stack); }

  // ---- TEST 5: deleting a label (after confirming) removes it everywhere it was used ----
  try {
    const delBtn = [...document.querySelectorAll('[data-social-label-del]')].find(b => {
      const row = b.closest('div');
      return row && row.querySelector('[data-social-label-rename]').value === 'Carousel Post';
    });
    delBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    document.getElementById('confirmModalOk').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 5: the label was deleted', !global.mockContentTypes.some(t => t.name === 'Carousel Post'));
    check('TEST 5: it was removed from the post that had it', !global.mockSocialPosts[0].content_types.includes('Carousel Post'), JSON.stringify(global.mockSocialPosts[0].content_types));
  } catch (e) { check('TEST 5: no throw', false, e.stack); }

  // ---- TEST 6: adding a brand-new label from inside the management modal itself works too ----
  try {
    document.getElementById('socialLabelsNewInput').value = 'Reel';
    document.getElementById('socialLabelsAddBtn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 20));
    check('TEST 6: the new label exists', global.mockContentTypes.some(t => t.name === 'Reel'));
    check('TEST 6: the modal list now shows it', [...document.querySelectorAll('[data-social-label-rename]')].some(i => i.value === 'Reel'));
  } catch (e) { check('TEST 6: no throw', false, e.stack); }

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
