// Claude Code PreToolUse hook: refuse any write under gev/. Reads the hook JSON on stdin. Exit 2 = blocked.
// Reads of gev/ are fine. Set GEV_BASELINE=1 to allow the baseline script's npm install inside gev/.
import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let raw = '';
  process.stdin.on('data', (c) => (raw += c));
  process.stdin.on('end', () => {
    let j = {};
    try { j = JSON.parse(raw); } catch { process.exit(0); }
    const msg = decide(j.tool_name, j.tool_input || {});
    if (msg) { console.error(`BLOCKED by ops/harness/hook-pretool.mjs: ${msg}`); process.exit(2); }
  });
}

export function decide(tool, input) {
  const inGev = (p) => typeof p === 'string' && /(^|[\\/])gev[\\/]/.test(p.replace(/^\.[\\/]/, ''));
  if (['Edit', 'Write', 'NotebookEdit'].includes(tool) && inGev(input.file_path || input.notebook_path)) {
    return 'gev/ is immutable. Explain the blocker to Mike and use an external workaround.';
  }
  if (tool === 'Bash' && typeof input.command === 'string') {
    const c = input.command;
    if (process.env.GEV_BASELINE === '1') return null;
    const touchesGev = /(^|[\s"'=(])\.?[\\/]?gev([\\/]|\s|$)|-C\s+gev|cd\s+gev/.test(c);
    const writes = /\b(rm|mv|cp|touch|mkdir|tee|patch|truncate|ln)\b|sed\s+-i|>>?\s*\S*gev|git\s+(-C\s+gev\s+)?(checkout|reset|apply|commit|clean|restore|stash|merge|rebase)|npm\s+(install|ci|update)|prettier\s+--write|eslint\s+--fix/.test(c);
    // fresh clone of gev is allowed only as the initial setup: git clone ... gev
    const cloneOnly = /^\s*git\s+clone\s+\S+\s+gev\s*$/.test(c);
    if (touchesGev && writes && !cloneOnly) return 'command writes inside gev/. gev/ is immutable.';
  }
  return null;
}
