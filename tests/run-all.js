// Runs every test case in tests/cases/ against the current index.html.
// Each case is a self-contained script: it loads jsdom + a mocked Supabase
// client, eval()s the real inline app scripts, and drives the app through
// real DOM events. See tests/README.md for the methodology and how to add
// a new case.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { extract } = require("./extract");

extract();

const casesDir = path.join(__dirname, "cases");
const files = fs.readdirSync(casesDir).filter(f => f.endsWith(".js")).sort();

let totalPass = 0, totalFail = 0;
const failedFiles = [];

for (const file of files) {
  const full = path.join(casesDir, file);
  let output = "";
  let exitCode = 0;
  try {
    output = execFileSync(process.execPath, [full], { encoding: "utf8" });
  } catch (e) {
    output = (e.stdout || "") + (e.stderr || "");
    exitCode = e.status ?? 1;
  }
  const passMatch = output.match(/=== PASS \((\d+)\) ===/);
  const failMatch = output.match(/=== FAIL \((\d+)\) ===/);
  const pass = passMatch ? parseInt(passMatch[1], 10) : 0;
  const fail = failMatch ? parseInt(failMatch[1], 10) : (exitCode ? 1 : 0);
  totalPass += pass;
  totalFail += fail;
  const status = fail ? "FAIL" : "ok";
  console.log(`${status === "ok" ? "  ok" : "FAIL"} - ${file}  (${pass} passed, ${fail} failed)`);
  if (fail) {
    failedFiles.push(file);
    const failLines = output.split("\n").filter(l => l.trim().startsWith("FAIL -") || l.includes("FAIL setup"));
    failLines.forEach(l => console.log("       " + l.trim()));
  }
}

console.log("");
console.log(`TOTAL: ${totalPass} passed, ${totalFail} failed across ${files.length} files`);
if (failedFiles.length) {
  console.log("Failed files: " + failedFiles.join(", "));
  process.exit(1);
}
