// Pure helpers for Taiwan (Highway Bureau, Ministry of Transportation and Communications, provincial-road CCTV list, XML). No network here.
// Feed: one XML file, <CCTVList><CCTVs><CCTV> rows (CCTVID, SubAuthorityCode, LinkID, VideoStreamURL, VideoImageURL, LocationType, PositionLon, PositionLat,
// SurveillanceDescription, RoadID, RoadName, RoadClass, RoadDirection, LocationMile). We keep ONLY the link (the Bureau's own snapshot address), never the picture.
// Terms page (Chinese) is re-read before every run, see LICENCE_PHRASES. robots.txt of cctv-maintain.thb.gov.tw answers 404 (no rules).
// Beats Argos by: every Highway Bureau provincial-road camera named as the Bureau names it (road, direction, interchange span), with the road code and kilometre mark,
// the Bureau's own credit line the terms ask for printed on the page, the terms sentences re-read in code before every run, and an honest "live status not checked".
import { robotsAllows, pageText } from './iceland.mjs';
import { unescapeXml } from './hongkong.mjs';
export { robotsAllows, pageText };

export const BOUNDS = { latMin: 21.5, latMax: 26.5, lonMin: 118.0, lonMax: 123.0 }; // Taiwan, Penghu, Kinmen side; sanity box only
export const FEED_URL = 'https://cctv-maintain.thb.gov.tw/opendataCCTVs.xml';
export const ROBOTS_URL = 'https://cctv-maintain.thb.gov.tw/robots.txt';
export const TERMS_URL = 'https://thbapp.thb.gov.tw/opendata/';
// All must still be in the terms page text (read 2026-11-24, tags removed, spaces collapsed). English gloss:
//  1 "the traffic information is opened free of charge for use by the public"
//  2 "the data is provided for free download and use"
//  3 "when downloaded or value-added content is provided externally, the original data source must be stated as the Bureau"
//  4 "a user may not re-fetch the data at an interval shorter than 60 seconds"
export const LICENCE_PHRASES = [
  '交通資訊內容免費對外開放使用',
  '資料提供免費下載使用',
  '下載資料內容或加值後對外提供時，應說明原始資料來源為本局',
  '使用者重複擷取資料週期不得小於60秒',
];
export const ATTRIBUTION = 'Source: Highway Bureau, MOTC, Taiwan (thbapp.thb.gov.tw/opendata), provincial road CCTV list.';
// the link-out target must be the Bureau's own snapshot host (cctv-ss01 to cctv-ss08)
export const IMAGE_RE = /^https:\/\/cctv-ss0[1-8]\.thb\.gov\.tw(?::443)?\/[A-Za-z0-9_+().-]{1,60}\/snapshot$/; // a few names carry a direction in brackets, for example T9-151K+642(N)
export const TW_REGION = { slug: 'taiwan', name: 'Taiwan' };
export const TW_COUNTRY = { countryCode: 'TW', countrySlug: 'taiwan', countryName: 'Taiwan' };

const s = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');

// XML text -> list of plain { tag: text } records. Throws when the body is not the camera list (an HTML error page, a cut-off body).
export function parseCctvs(xml) {
  if (typeof xml !== 'string' || !/^\s*(<\?xml[^>]*\?>\s*)?<CCTVList[\s>]/.test(xml)) throw new Error('not the camera list (no <CCTVList> root)');
  if (!/<\/CCTVList>\s*$/.test(xml)) throw new Error('camera list cut off (no closing </CCTVList>)');
  return [...xml.matchAll(/<CCTV>([\s\S]*?)<\/CCTV>/g)].map((m) => Object.fromEntries([...m[1].matchAll(/<([A-Za-z]+)>([\s\S]*?)<\/\1>/g)].map((a) => [a[1], unescapeXml(a[2].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1'))])));
}

// Returns a camera or null; drop reasons are counted into `drop`. `seen` (a Set) drops a repeated CCTVID.
export function normalizeTw(r, lastSeen, drop = {}, seen = new Set()) {
  const bump = (k) => { drop[k] = (drop[k] || 0) + 1; return null; };
  if (!r || typeof r !== 'object') return bump('malformed');
  const link = s(r.VideoImageURL);
  if (!IMAGE_RE.test(link)) return bump('noUrl');
  const name = s(r.SurveillanceDescription);
  if (!name) return bump('noName');
  const lat = Number(s(r.PositionLat)), lon = Number(s(r.PositionLon));
  if (!s(r.PositionLat) || !s(r.PositionLon) || !Number.isFinite(lat) || !Number.isFinite(lon)) return bump('badCoords');
  if (lat < BOUNDS.latMin || lat > BOUNDS.latMax || lon < BOUNDS.lonMin || lon > BOUNDS.lonMax) return bump('outOfBounds');
  const key = s(r.CCTVID);
  if (!/^[0-9A-Za-z-]{8,64}$/.test(key)) return bump('noId');
  const id = `taiwan-thb-${key.toLowerCase()}`;
  if (seen.has(id)) return bump('dupKey');
  seen.add(id);
  // The Bureau's own road code (for example 台9線) and kilometre mark are kept as text; its direction letter is not turned into a traffic direction.
  const road = s(r.RoadName), mile = s(r.LocationMile);
  const text = [road && `Road: ${road}`, mile && `Kilometre mark: ${mile}`].filter(Boolean).join('. ');
  return {
    id,
    sourceId: 'taiwan-thb',
    name, // the Bureau's own Chinese text: road, interchange span and direction letter, for example 快速公路62號(暖暖交流道到大華系統交流道)(W)
    road: '',
    direction: '',
    city: null,
    regionSlug: TW_REGION.slug,
    regionName: TW_REGION.name,
    lat, lon,
    feedType: 'still',
    officialUrl: link,
    officialUrlLastVerified: null,
    lastSeen,
    ...(text ? { locationText: `${text}.` } : {}),
  };
}
