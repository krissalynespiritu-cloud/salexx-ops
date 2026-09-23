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

global.mockJobsData = [];
global.mockTasksData = [
  { task_id: 'T-VICTOR', title: 'Task for Victor', status: 'To-do', due_date: '2026-09-22', assignees: ['Victor'], progress: 0, priority: 'Medium', job_id: null, notes: '' }
];

function makeChain(table) {
  let lastOp = null;
  const chain = {
    select() { return chain; }, insert(a){lastOp='insert';return chain}, update(a){lastOp='update';return chain}, delete(){lastOp='delete';return chain},
    eq(){return chain}, neq(){return chain}, in(){return chain}, order(){return chain}, ilike(){return chain}, limit(){return chain},
    gte(){return chain}, lte(){return chain}, gt(){return chain}, lt(){return chain}, not(){return chain}, or(){return chain}, single(){return chain},
    maybeSingle(){return Promise.resolve({data:null,error:null})},
    then(resolve){
      let src;
      if (table === 'jobs') src = global.mockJobsData;
      else if (table === 'tasks') src = global.mockTasksData;
      else src = [];
      resolve({ data: src, error: null });
    }
  };
  return chain;
}
const sbMock = { from(table){return makeChain(table)}, rpc(){return Promise.resolve({data:[{ok:true}],error:null})}, auth:{signOut(){},getSession(){return Promise.resolve({data:{session:null}})},onAuthStateChange(){}} };
global.supabase = { createClient: () => sbMock };

const testLogic = `
(async () => {
  // Simulate a logged-in profile whose crew_name maps to a real TASK_PEOPLE entry
  currentUserProfile = { full_name: 'Victor Test', crew_name: 'Victor' };
  await fetchJobs();
  const btn = document.querySelector('.sidebarLink[data-tab="mytasks"]');
  btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(r => setTimeout(r, 30));
  check('crew_name from profile is used as the default person, not TASK_PEOPLE[0]', myTasksPerson === 'Victor', myTasksPerson);
  const body = document.getElementById('myTasksBody').innerHTML;
  check('shows the task assigned to the profile-derived person', body.includes('T-VICTOR'));

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
}, 800);
