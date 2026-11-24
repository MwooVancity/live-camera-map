// Saved cameras live only in this browser (localStorage). No account, no server. Each entry keeps what the saved page needs to link out.
export type Saved = { url: string; label: string; place: string; savedAt: string };
const KEY = 'wtc-saved-cameras-v1';
const MAX = 100;

export function readSaved(): Saved[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((s) => s && typeof s.url === 'string' && /^https:\/\//.test(s.url) && typeof s.label === 'string').slice(0, MAX) : [];
  } catch { return []; }
}
function write(list: Saved[]): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); return true; } catch { return false; }
}
export const storageWorks = (): boolean => { try { localStorage.setItem(KEY + '-t', '1'); localStorage.removeItem(KEY + '-t'); return true; } catch { return false; } };
export const isSaved = (url: string) => readSaved().some((s) => s.url === url);
export function toggleSaved(item: Omit<Saved, 'savedAt'>): boolean {
  const list = readSaved();
  const i = list.findIndex((s) => s.url === item.url);
  if (i >= 0) list.splice(i, 1); else if (/^https:\/\//.test(item.url)) list.unshift({ ...item, savedAt: new Date().toISOString() });
  write(list);
  return i < 0;
}
export const removeSaved = (url: string) => write(readSaved().filter((s) => s.url !== url));
