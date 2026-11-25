// Prebuild step: writes the camera CSVs and manifest.json into site/public/data/ (gitignored, regenerated every build, like public/search/).
import { resolve } from 'node:path';
import { writeExports } from '../../ops/exports/camera-exports.mjs';
const m = writeExports(resolve(process.cwd(), 'public/data'), resolve(process.cwd(), '..'));
console.log(`exports: ${m.total} cameras, ${m.countries.length} countries, all-file ${m.allBytes} bytes`);
