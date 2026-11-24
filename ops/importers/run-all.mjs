// Runs every importer named in ops/importers/run-all.json, each in its own child process with its own time limit.
// One failing importer never stops the others, and the run says so plainly: every importer ends as ok, FAILED or TIMED OUT, a summary table is printed,
// and the exit code is 1 when any importer that is `required` failed (an importer marked required:false only warns, e.g. a live-conditions feed whose page block hides itself).
// A failed importer keeps its last committed rows (commitSource never writes on failure), so a deploy after a failure still ships the old data.
// Usage: node ops/importers/run-all.mjs [--list] [--only=id,id]
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
export const loadPlan = (file = join(HERE, 'run-all.json')) => JSON.parse(readFileSync(file, 'utf8')).importers;

// Runs one entry. `exec` is injected by the tests; it returns { status, signal, error }.
export function runOne(entry, exec = (cmd, args, opts) => spawnSync(cmd, args, opts)) {
  const t0 = Date.now();
  const r = exec(process.execPath, [join(ROOT, 'ops', 'importers', entry.script), ...(entry.args || [])], { cwd: ROOT, stdio: 'inherit', timeout: (entry.timeoutSec || 120) * 1000, killSignal: 'SIGKILL' });
  const timedOut = r.error?.code === 'ETIMEDOUT' || r.signal === 'SIGKILL';
  const outcome = timedOut ? 'TIMED OUT' : r.status === 0 ? 'ok' : 'FAILED';
  return { id: entry.id, outcome, exit: r.status, seconds: Math.round((Date.now() - t0) / 100) / 10, required: entry.required !== false };
}

export function runAll(plan, { only = null, exec, log = console.log } = {}) {
  const todo = only ? plan.filter((e) => only.includes(e.id)) : plan;
  if (only && todo.length !== only.length) throw new Error(`unknown importer id in --only (known: ${plan.map((e) => e.id).join(', ')})`);
  const results = todo.map((e) => { log(`--- ${e.id}`); return runOne(e, exec); });
  log('\nimporter           outcome    exit  seconds  required');
  for (const r of results) log(`${r.id.padEnd(18)} ${r.outcome.padEnd(10)} ${String(r.exit ?? '-').padEnd(5)} ${String(r.seconds).padEnd(8)} ${r.required}`);
  const bad = results.filter((r) => r.outcome !== 'ok');
  for (const r of bad) if (process.env.GITHUB_ACTIONS) log(`::${r.required ? "error" : "warning"}::${r.id} ${r.outcome} (exit ${r.exit ?? "none"}); its last committed rows stay in place`);
  for (const r of bad) log(`${r.required ? 'ERROR' : 'warning'}: ${r.id} ${r.outcome}; its last committed rows stay in place`);
  return { results, failedRequired: bad.filter((r) => r.required).length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const plan = loadPlan();
  if (process.argv.includes('--list')) { for (const e of plan) console.log(e.id, e.script, (e.args || []).join(' '), `${e.timeoutSec}s`, e.required === false ? 'optional' : 'required'); process.exit(0); }
  const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',') || null;
  const { failedRequired } = runAll(plan, { only });
  process.exitCode = failedRequired ? 1 : 0;
}
