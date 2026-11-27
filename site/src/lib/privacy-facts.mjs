// The outside hosts a visitor's BROWSER contacts when the /map/ page embeds the map engine (GEV, a separate host).
// One list, used by the privacy page and pinned by site/tests/privacy.test.mjs against the engine's own files (when gev/ is present).
// Evidence: fonts: gev/index.html lines 22-29; osm: gev/src/maps/globeEngine.js:28; esri: gev/src/maps/globeEngine.js:26 and a real-browser measurement (plan item 25: 35 requests per load even with our OSM share hash); terrain: gev/src/maps/keylessTerrain.js:9 and plan item 25.
export const MAP_BROWSER_HOSTS = [
  { host: 'fonts.googleapis.com', what: 'fonts and icons for the map engine\'s own screen (loaded on every map load)', file: 'index.html' },
  { host: 'fonts.gstatic.com', what: 'the font files themselves', file: 'index.html' },
  { host: 'tile.openstreetmap.org', what: 'the OpenStreetMap map pictures the map first draws', file: 'src/maps/globeEngine.js' },
  { host: 'terrain.reearth.land', what: 'terrain height data', file: 'src/maps/keylessTerrain.js' },
  { host: 'services.arcgisonline.com', what: 'Esri satellite pictures (measured on a normal map load and offered as a map style the visitor can pick)', file: 'src/maps/globeEngine.js' },
];
// Hosts the engine contacts only when a visitor turns the layer on. This same list opens them in the static map's content policy
// (ops/deploy/build-static-map.mjs), so a layer cannot be opened without being named on /privacy/. permId = the enabled row in data/source-permissions.json.
export const MAP_LAYER_HOSTS = [
  { host: 'earthquake.usgs.gov', what: 'the Earthquakes layer (US Geological Survey)', permId: 'usgs' },
  { host: 'api.weather.gov', what: 'the US weather alerts dataset (National Weather Service)', permId: 'nws-alerts' },
  { host: 'eonet.gsfc.nasa.gov', what: 'the open natural events dataset (NASA EONET)', permId: 'nasa-eonet-open-natural-events-nasa-eonet-events-eonet-gsfc-nasa-gov' },
  { host: 'www.gdacs.org', what: 'the disaster alerts dataset (GDACS)', permId: 'disaster-alerts-gdacs-gdacs-disaster-alerts-www-gdacs-org' },
  { host: 'api.weather.gc.ca', what: 'the Canadian air quality layer (Environment and Climate Change Canada)', permId: 'environment-and-climate-change-canada-msc-geomet-ogc-api' },
  ...['gibs-a', 'gibs-b', 'gibs-c', 'wvs', 'cmr'].map((h) => ({ host: `${h}.earthdata.nasa.gov`, what: 'the Recent Imagery layer (NASA)', permId: 'nasa-gibs-wmts-tiles-worldview-snapshots-and-nasa-cmr-granule-catalog' })),
];

export const OWN_HOST_NOTE = 'worldtrafficcameras.com';
