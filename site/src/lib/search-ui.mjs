// Search box wiring (plain JS, no library). Loads nothing until the box is first focused. Results are real links (textContent only, never innerHTML).
import { createLoader, KIND_LABEL } from './search-core.mjs';

export const DEBOUNCE_MS = 120;
// Arrow keys move through n results with wrap-around; -1 = none highlighted.
export const nextIndex = (i, key, n) => (!n ? -1 : key === 'ArrowDown' ? (i + 1) % n : key === 'ArrowUp' ? (i <= 0 ? n - 1 : i - 1) : i);

// Site served from a sub-folder (staging on GitHub Pages): the page declares it in <meta name="site-base">; root-relative paths get it prefixed.
export const withBase = (base, u) => (typeof u === 'string' && u.startsWith('/') && !u.startsWith('//') ? base + u : u);
export const cleanBase = (v) => (/^\/[\w.-]+$/.test(v || '') ? v : '');

export function initSearchUi(root, fetchFn = (...a) => fetch(...a), wait = setTimeout, base = cleanBase(typeof document !== 'undefined' ? document.querySelector('meta[name="site-base"]')?.content : '')) {
  const box = root?.querySelector('input[type=search]'), list = root?.querySelector('[role=listbox]'), form = root?.querySelector('form'), status = root?.querySelector('[role=status]');
  if (!box || !list || !form) return null;
  form.hidden = false; // with JavaScript off the form stays hidden and the <noscript> links show instead
  const loader = createLoader(fetchFn, `${base}/search/`);
  let items = [], active = -1, timer = 0, seq = 0;
  const say = (t) => { if (status) status.textContent = t; };
  const mark = (i) => {
    active = i;
    [...list.children].forEach((li, k) => { li.setAttribute('aria-selected', String(k === i)); li.classList.toggle('on', k === i); });
    if (i >= 0) box.setAttribute('aria-activedescendant', list.children[i].id); else box.removeAttribute('aria-activedescendant');
  };
  const close = () => { list.hidden = true; box.setAttribute('aria-expanded', 'false'); mark(-1); };
  const show = (res) => {
    items = res; list.replaceChildren();
    res.forEach((e, k) => {
      const li = document.createElement('li'), a = document.createElement('a'), b = document.createElement('strong'), s = document.createElement('span');
      li.id = `sr-${k}`; li.setAttribute('role', 'option'); a.href = withBase(base, e.url);
      b.textContent = e.name; s.textContent = ` ${KIND_LABEL[e.kind] || e.kind} · ${e.region}, ${e.country}`;
      a.append(b, s); li.append(a); list.append(li);
    });
    list.hidden = !res.length; box.setAttribute('aria-expanded', String(!!res.length)); mark(-1);
    say(res.length ? `${res.length} results` : 'No results. Try a city, road or region name.');
  };
  const run = () => {
    const mine = ++seq, q = box.value;
    if (!q.trim()) { close(); say(''); return; }
    loader.query(q).then((r) => { if (mine === seq) show(r); }, () => { if (mine === seq) { close(); say('Search could not load. Use the links.'); } });
  };
  box.addEventListener('focus', () => { loader.focus().catch(() => say('Search could not load. Use the links.')); }); // the ONLY thing that starts a download
  box.addEventListener('input', () => { clearTimeout(timer); timer = wait(run, DEBOUNCE_MS); });
  box.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); mark(nextIndex(active, ev.key, items.length)); }
    else if (ev.key === 'Enter') { ev.preventDefault(); const e = items[active >= 0 ? active : 0]; if (e) location.assign(withBase(base, e.url)); }
    else if (ev.key === 'Escape') { close(); box.value = ''; say(''); }
  });
  form.addEventListener('submit', (ev) => ev.preventDefault());
  return { loader };
}
