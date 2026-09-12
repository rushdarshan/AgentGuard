// G10 helper: project typecheck must report zero errors inside lab/.
// The pre-existing src/ baseline may still fail; that is out of scope.
// Shell-free (see check.mjs): tsc runs as a node script via execFile.
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const TSC = join(ROOT, "node_modules", "typescript", "bin", "tsc");
let out;
try {
  out = execFileSync(process.execPath, [TSC, "--noEmit"], { cwd: ROOT, timeout: 600000 }).toString();
} catch (e) {
  out = ((e.stdout ?? "") + (e.stderr ?? "")).toString();
}
const labErrors = out.split("\n").filter((l) => l.includes("lab/"));
if (labErrors.length > 0) {
  console.error(`lab typecheck errors:\n${labErrors.join("\n")}`);
  process.exit(1);
}
console.log("lab typecheck clean");
