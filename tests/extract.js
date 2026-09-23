// Regenerates the fixtures test cases eval() against from the real index.html.
// Run automatically by run-all.js; run manually after editing index.html and
// before running a single test case directly with `node tests/cases/runN.js`.
const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "..", "index.html");
const outDir = path.join(__dirname, "_generated");

function extract() {
  const html = fs.readFileSync(indexPath, "utf8");
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  if (scripts.length !== 3) {
    throw new Error(`Expected 3 inline <script> blocks in index.html, found ${scripts.length}. ` +
      `The test harness assumes: [0] main app script, [1] a tiny inline script, [2] the Leads Tracker IIFE. ` +
      `If that structure changed, update this comment and the test cases that reference block2.js.`);
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "mainscript.js"), scripts[0]);
  fs.writeFileSync(path.join(outDir, "block2.js"), scripts[2]);

  const bodyMatch = html.replace(/<script>[\s\S]*?<\/script>/g, "").match(/<body[^>]*>([\s\S]*?)<\/body>/);
  fs.writeFileSync(path.join(outDir, "dom.html"), bodyMatch ? bodyMatch[1] : "");
}

if (require.main === module) {
  extract();
  console.log("Extracted fixtures to tests/_generated/");
} else {
  module.exports = { extract, outDir };
}
