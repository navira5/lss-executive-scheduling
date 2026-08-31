import { spawn } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [
  spawn(npm, ["run", "dev"], { stdio: "inherit", env: process.env }),
  spawn(npm, ["run", "preview:power-apps"], { stdio: "inherit", env: process.env }),
];

console.log("\nStarting both LSS planning demonstrations:");
console.log("  Main planner:       http://localhost:3000");
console.log("  Power Apps preview: http://localhost:4176\n");

let closing = false;
function stop(exitCode = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(exitCode), 250);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => stop(0));
}

for (const child of children) {
  child.on("error", error => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", code => {
    if (!closing && code && code !== 0) stop(code);
  });
}
