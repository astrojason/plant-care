import { execFileSync } from 'child_process';
import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface ChangelogEntry {
  hash: string;
  message: string;
  date: string;
}

/**
 * The deployed serverless function has neither the `git` binary nor a
 * `.git` directory — only the Vercel build step does. `npm run build` runs
 * scripts/generate-changelog.mjs first, which bakes the log into this file;
 * fall back to a live `git log` (no shell, so the `|` separators in
 * --pretty=format aren't parsed as pipes) when it's absent, i.e. in dev.
 */
function getEntries(): ChangelogEntry[] {
  const generatedPath = path.join(process.cwd(), 'src', 'generated', 'changelog.json');
  if (existsSync(generatedPath)) {
    return JSON.parse(readFileSync(generatedPath, 'utf-8'));
  }

  const log = execFileSync(
    'git',
    ['log', '--pretty=format:%h|%s|%ad', '--date=short', '-n', '50'],
    { cwd: process.cwd() }
  ).toString().trim();

  return log.split('\n').filter(Boolean).map(line => {
    const [hash, ...rest] = line.split('|');
    const date = rest.pop() ?? '';
    const message = rest.join('|');
    return { hash, message, date };
  });
}

export async function GET() {
  const entries = getEntries();
  const pkg = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));

  return NextResponse.json({ version: pkg.version, entries });
}
