// Guide text. Short, factual, about how THIS site works. Numbers come in through ctx (from the registry), never typed here.
// ctx: { total, districts: ['10',...], failed: [...], dropped: {notInService, dupLocation}, date }
export const GUIDE_BODY = {
  'how-to-read-last-checked-status': (x) => [
    { h: 'Four statuses', p: [
      'Each camera gets one of four statuses from our own checker: reachable, stale, unavailable or unknown.',
      'Reachable means the official link answered with an image or video type of content. Stale means it answered, but the picture has not changed for longer than expected. Unavailable means it failed, or answered with a web page instead of an image. Unknown means we have not checked it, or the check itself failed.',
    ] },
    { h: 'Why a 200 answer is not enough', p: [
      'A server can say "OK" and still hand back an error page. We read the content type of the answer and treat an HTML page as a failure.',
    ] },
    { h: '"Last checked" and "last changed" are different', p: [
      'Last checked is when our checker last asked. Last changed is when the picture last looked different. A quiet road at night can give an identical picture for hours, so an unchanged picture alone is not proof of a dead camera. That is why stale is its own status and not the same as unavailable.',
    ] },
    { h: 'Today', p: [
      `The checker has not run yet, so every page says "not checked yet". We would rather say that than show a guess. The camera list itself was imported on ${x.date} and none of its ${x.total} links has been tested by us.`,
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
      `We drop cameras the source itself marks as out of service (${x.dropped.notInService ?? 0} in our last import). Our own checker, once it runs, will mark links reachable, stale or unavailable, so you can see a bad link before you click.`,
      'If the source has removed a camera, it will disappear from our list the next time we re-import its camera list.',
    ] },
  ],
};
