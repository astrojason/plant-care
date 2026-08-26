// Bakes `git log` into a JSON file at build time. /api/changelog reads this
// instead of shelling out to git at request time — the deployed serverless
// function has neither the `git` binary nor a `.git` directory, only the
// Vercel build step does.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const log = execFileSync(
  "git",
  ["log", "--pretty=format:%h|%s|%ad", "--date=short", "-n", "50"],
  { cwd: process.cwd() }
)
  .toString()
  .trim();

const entries = log
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [hash, ...rest] = line.split("|");
    const date = rest.pop() ?? "";
    const message = rest.join("|");
    return { hash, message, date };
  });

const outDir = path.join(process.cwd(), "src", "generated");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "changelog.json"), JSON.stringify(entries, null, 2) + "\n");
