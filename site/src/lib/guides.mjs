import { MAX_AGE_MIN } from '../../../ops/importers/lib/conditions.mjs';
// Guide text. Short, factual, about how THIS site works. Numbers come in through ctx (from the registry), never typed here.
// ctx: { total, districts: ['10',...], failed: [...], dropped: {notInService, dupLocation}, date }
export const GUIDE_BODY = {
  'how-to-read-last-checked-status': (x) => [
    { h: 'Four statuses', p: [
      'Each camera gets one of four statuses from our own checker: reachable, stale, unavailable or unknown.',
      'Reachable means the official link answered with an image (or a video playlist for video feeds) of a plausible size. Stale means it answered, but the last-modified time for the picture is older than 6 hours; when a server gives no last-modified time we cannot tell, and it stays reachable. Unavailable means the link failed, or answered with a web page, an error text or a file that is not a picture. Unknown means this check could not be completed, for example because the source told us to slow down or our run ran out of time, so we do not guess.',
    ] },
    { h: 'Why a 200 answer is not enough', p: [
      'A server can say "OK" and still hand back an error page. We read the content type of the answer, the size and the first bytes of the file type, and treat an HTML or JSON page, a tiny file or a wrong file type as a failure. We do not download or keep the pictures.',
    ] },
    { h: '"Last checked" and "last changed" are different', p: [
      'Last checked is when our checker last asked. Last changed is when the picture last looked different, judged only from the ETag, last-modified time or file size compared with our previous run. A quiet road at night can give an identical picture for hours, so an unchanged picture alone is not proof of a dead camera. That is why stale is its own status and not the same as unavailable.',
    ] },
    { h: 'Today', p: [
      x.healthAsof
        ? `The checker last ran at ${x.healthAsof.slice(0, 16).replace('T', ' ')} UTC and covers ${x.healthTotal} cameras. The statuses on a city page come from that run only. If the last run is more than 24 hours old when the site is built, the page shows no statuses at all. The camera list itself was imported on ${x.date}.`
        : `The checker has not produced a usable result for this build, so every page says "not checked yet". We would rather say that than show a guess. The camera list itself was imported on ${x.date} and none of its ${x.total} links has been tested by us.`,
    ] },
  ],
  'what-link-out-only-means': (x) => [
    { h: 'The short version', p: [
      'Every camera on this site is a link to the official source. We show the name, road, direction and place. We do not show the picture, a thumbnail or the video.',
    ] },
    { h: 'Why', p: [
      'A source decides whether others may show or copy its pictures. For every source we use, those permissions are still marked "unverified" in our records, and we do not assume they are allowed. Until a permission is confirmed by reading the source\'s own terms, we link and nothing more.',
    ] },
    { h: 'What you get', p: [
      `You see ${x.total} camera locations, the roads they cover and when our list was updated, then one click takes you to the owner of the camera. The picture you see there is theirs, at their update speed, under their terms.`,
    ] },
    { h: 'What we do not do', p: [
      'We do not store camera images, we do not proxy them through our servers and we do not embed them. The page code has a test that fails the build if a camera picture address appears in an image tag.',
    ] },
  ],
  'how-caltrans-cameras-work': (x) => [
    { h: 'Who runs them', p: [
      'These cameras belong to Caltrans, the California Department of Transportation. Caltrans publishes a list of its cameras, grouped by its twelve districts, with a name, road, direction, position and an address for the picture or video.',
    ] },
    { h: 'What we took from the list', p: [
      `Our last import loaded districts ${x.districts.join(', ')}.${x.failed.length ? ` Districts ${x.failed.join(', ')} returned a server error, so California is only partly covered and we say so on the region page.` : ''} After cleaning, the registry holds ${x.total} cameras.`,
      `We left out ${x.dropped.notInService ?? 0} cameras that Caltrans marks as not in service and ${x.dropped.dupLocation ?? 0} entries that repeated another camera's position, road and direction.`,
    ] },
    { h: 'What the "city" means', p: [
      'The city on our pages comes from the "nearby place" field Caltrans fills in for each camera. It is a nearby town, not an official boundary, and some cameras leave it blank. Those cameras count in the region total but in no city total.',
    ] },
    { h: 'What we have not measured', p: [
      'How often each camera refreshes its picture is set by Caltrans and we have not measured it. Licence terms for reuse are not confirmed, which is one more reason we link out.',
    ] },
  ],
  'what-live-road-conditions-mean': () => [
    { h: 'Where the numbers come from', p: [
      'The road blocks on a city page come from public Caltrans feeds, and the weather blocks come from the National Weather Service. Each block names its source, links the feed page and shows the time we fetched it.',
    ] },
    { h: 'Lane closures', p: [
      'Caltrans says its lane closure system reports all approved closures planned for the next 7 days, plus current lane, ramp and road closures from maintenance, construction and special events. We show only closures whose start has passed and whose end has not, so a closure planned for next week is left out.',
    ] },
    { h: 'Chain controls', p: [
      'A chain control row shows the status code Caltrans reports and the description Caltrans attaches to it, word for word. We do not reword it. A city with no chain control near it shows no such list.',
    ] },
    { h: 'Message signs', p: [
      'These are the words on a Caltrans changeable message sign. Caltrans describes the sign feed as updating about once a minute in some districts and every five minutes in others, but a sign can keep the same message for days, so read the time beside each message. We leave out signs that are blank.',
    ] },
    { h: 'Road weather stations', p: [
      'Caltrans runs about 150 weather and visibility sensing units on the highway system, mostly in rural places, mountain passes, central valley fog areas and desert high-wind areas. Most cities have none nearby, and then the block is not shown. Caltrans does not state the units of the readings in the field description, so we show the numbers as reported and do not add units.',
    ] },
    { h: 'Forecast and alerts', p: [
      'The forecast and the alerts come from the National Weather Service for the point at the middle of the city, not for each road. An alert block appears only when the Weather Service lists an active alert for that point.',
    ] },
    { h: 'Why a block can be missing', p: [
      `A block is left out when its licence record is not enabled, when nothing is near the city, or when the data is older than its limit when the site is built: ${MAX_AGE_MIN.lcs} minutes for closures, chain controls and signs, ${MAX_AGE_MIN.rwis} minutes for road weather and ${MAX_AGE_MIN['nws-forecast']} minutes for the forecast and alerts. We would rather show nothing than old data presented as current.`,
      'These feeds come with no accuracy guarantee from Caltrans, and the times Caltrans gives for signs and chain controls have no time zone, which we read as Pacific time. For a closure that affects your trip, check the official source before you drive.',
    ] },
  ],
  'camera-link-is-dead': (x) => [
    { h: 'First, check what you actually got', p: [
      'A blank page, an error message or a picture that never changes can each mean something different. If the page itself loads but the picture is old, the camera may be offline; if the address fails to load, the source may have moved the file.',
    ] },
    { h: 'Things to try, in order', p: [
      'Reload once. Cameras and their servers drop requests now and then, and a second try often works.',
      'Try another camera on the same road, listed on the same city page. If those work, one camera is down and the source is fine.',
      'Come back later. Cameras are taken out of service for maintenance and for road work.',
    ] },
    { h: 'What we do about it', p: [
      `We drop cameras the source itself marks as out of service (${x.dropped.notInService ?? 0} in our last import). Our own checker marks every link reachable, stale, unavailable or unknown, so you can often see a bad link before you click.`,
      'If the source has removed a camera, it will disappear from our list the next time we re-import its camera list.',
    ] },
  ],
};
