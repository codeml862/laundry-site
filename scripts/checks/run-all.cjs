/* Runs every route/permission check in this folder and fails if any of them fail. */
const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const files = readdirSync(__dirname).filter((name) => name.endsWith(".cjs") && name !== "run-all.cjs").sort();
let failed = 0;
for (const name of files) {
  const result = spawnSync(process.execPath, [join(__dirname, name)], { stdio: "inherit" });
  console.log(`${result.status === 0 ? "PASS" : "FAIL"}  ${name}`);
  if (result.status !== 0) failed++;
}
console.log(`\n${files.length - failed}/${files.length} checks passed.`);
process.exit(failed ? 1 : 0);
