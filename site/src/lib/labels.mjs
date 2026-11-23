// Clean display label for a camera: ONE pure function, used by every list and link. The source name stays as the link's title attribute.
// Caltrans names carry codes ("TV138 -- ", "(C020)", "I-405 : (231) ", "SR-133 (284): ", "S/O"); we drop the codes and the road prefix
// (the road is shown beside the link anyway), spell out the compass shorthand and append the town. Other sources keep their own name.
const COMPASS = { n: 'North', s: 'South', e: 'East', w: 'West' };
const ROADISH = /^(?:[A-Z]{1,3}\s?-?\d{1,3}[A-Z]?)$/;

const isShouting = (s) => s === s.toUpperCase() && /[A-Z]{2}/.test(s);
const titleCase = (s) => s.split(' ').map((w) => (/\d.*-|-.*\d/.test(w) || ROADISH.test(w) ? w : /^\d+(ST|ND|RD|TH)$/i.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join(' ');

export function cleanLabel(c) {
  const name = String(c.name || '').trim();
  if (c.sourceId && c.sourceId !== 'caltrans') return name;
  let s = name
    .replace(/^T[A-Z0-9]{2,6}\s*--\s*/, '') // Caltrans video-system code (TV138, T259E, TVH15)
    .replace(/^\(C\d+\)\s*/, '') // leading camera code
    .replace(/^[A-Z]{2,4}-\d{1,3}-\s*/, '') // county code "FRE-99-"
    .replace(/^[A-Z]{1,3}\s?-?\s?\d{1,3}[A-Z]?\s*(?:\(\d+\))?\s*:\s*/, '') // "I-405 : ", "SR-133 (284): ", "I -10 : ", "SR37 : "
    .replace(/^\(\d+\)\s*/, '') // "(231) "
    .replace(/\s*\(C\d+\)$/, '') // trailing camera code
    .replace(/\s+/g, ' ').trim();
  const shout = isShouting(s);
  s = s.replace(/\b([NSEW])\/O\b/gi, (_, d) => `${COMPASS[d.toLowerCase()]} of`);
  if (shout) s = titleCase(s);
  if (s.length < 2) s = name;
  const city = c.city && String(c.city).trim();
  return city && !s.toLowerCase().endsWith(city.toLowerCase()) ? `${s}, ${city}` : s;
}
