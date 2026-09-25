/**
 * YourFriendsLeague — motion-graphic clips via Google Veo 3.1 (Gemini API, direct).
 *
 * Start-frame-only image-to-video: the existing action-shot PNG seeds the clip,
 * with the corresponding end-frame's content described in the prompt so the
 * model animates toward it. NOTE: Veo 3.1's `lastFrame` (first+last frame
 * interpolation) field is a real, documented API field, but this account's
 * access tier rejects it with "Your use case is currently not supported" —
 * confirmed via direct testing on 2026-07-10. Plain start-frame generation
 * works fine. If `lastFrame` access is ever granted, re-add it to submitJob().
 *
 * Usage:
 *   GOOGLE_AI_STUDIO_API_KEY=xxx node design-output/veo-generate.mjs basketball
 *   GOOGLE_AI_STUDIO_API_KEY=xxx node design-output/veo-generate.mjs basketball football hockey racing
 *   GOOGLE_AI_STUDIO_API_KEY=xxx node design-output/veo-generate.mjs basketball --model veo-3.1-fast-generate-preview
 *
 * Output: public/video/<name>.mp4
 *
 * Docs note: Gemini Developer API mode (not Vertex) — fps/seed/output_gcs_uri
 * are Vertex-only and will error if set, so this script doesn't set them.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_KEY = process.env.GOOGLE_AI_STUDIO_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.resolve(__dirname, '..', 'public', 'img');
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'video');

const CLIPS = {
  basketball: {
    start: 'sport-basketball.png',
    end: 'sport-basketball-end.png',
    prompt:
      'The basketball continues its bounce arc downward and settles onto the court surface, ' +
      'compressing slightly on impact then coming to rest. The dust and light particles kicked up ' +
      'by the bounce drift and settle to the floor. The orange spotlight beam steadies from a dynamic ' +
      'streak into a calm, steady column of light. Camera holds static throughout.',
  },
  football: {
    start: 'sport-football.png',
    end: 'sport-football-end.png',
    prompt:
      'The ball continues its arc through the rain toward the goal, water droplets trailing off it, ' +
      'and strikes the back of the net -- the net stretches and bulges around the ball on impact, ' +
      'then settles into stillness. Rain continues falling steadily throughout. Camera holds static.',
  },
  hockey: {
    start: 'sport-hockey.png',
    end: 'sport-hockey-end.png',
    prompt:
      'The puck continues sliding across the ice, its cyan speed trail fading as it decelerates, and ' +
      'comes to rest near the goal. Loose ice chips settle around it. The stick follows through and ' +
      'comes to rest flat on the ice beside the puck. Camera holds static.',
  },
  racing: {
    start: 'sport-racing.png',
    end: 'sport-racing-end.png',
    prompt:
      "The red open-wheel car continues along the straight past the camera's fixed side-profile " +
      'position, receding into the distance. The colored light trails behind it fade from intense ' +
      'saturated streaks into faint, thin glowing lines as the car\'s speed and the motion blur settle. ' +
      'Camera holds static in a locked side-on position throughout.',
  },
};

function parseArgs(argv) {
  const opts = { model: 'veo-3.1-lite-generate-preview', names: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--model') opts.model = argv[++i];
    else opts.names.push(a);
  }
  return opts;
}

function imagePart(filePath) {
  const bytes = fs.readFileSync(filePath);
  return { bytesBase64Encoded: bytes.toString('base64'), mimeType: 'image/png' };
}

async function submitJob(model, clip) {
  const body = {
    instances: [
      {
        prompt: clip.prompt,
        image: imagePart(path.join(IMG_DIR, clip.start)),
        // lastFrame intentionally omitted -- rejected by this account's access tier (see header note)
      },
    ],
    parameters: {
      aspectRatio: '16:9',
      durationSeconds: 6, // veo-3.1-lite only accepts 4, 6, or 8
    },
  };

  const res = await fetch(`${BASE_URL}/models/${model}:predictLongRunning?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`Submit failed (${res.status}): ${JSON.stringify(json)}`);
  return json.name; // operation name, e.g. "models/veo-3.1-lite-generate-preview/operations/xxxx"
}

async function pollJob(opName) {
  const maxAttempts = 60; // ~10 min at 10s intervals
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 10_000));
    const res = await fetch(`${BASE_URL}/${opName}?key=${API_KEY}`);
    const json = await res.json();
    if (!res.ok) throw new Error(`Poll failed (${res.status}): ${JSON.stringify(json)}`);
    if (json.done) {
      if (json.error) throw new Error(`Generation failed: ${JSON.stringify(json.error)}`);
      return json.response;
    }
    process.stdout.write('.');
  }
  throw new Error('Timed out waiting for video generation');
}

async function downloadVideo(uri, outPath) {
  // Auth via the key query param returns a JSON error wrapper here; the
  // x-goog-api-key header (with redirects followed) returns the real bytes.
  const res = await fetch(uri, { headers: { 'x-goog-api-key': API_KEY } });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

async function generateOne(name, clip, model) {
  console.log(`- ${name} (model=${model})`);
  const opName = await submitJob(model, clip);
  console.log(`  submitted: ${opName}`);
  process.stdout.write('  waiting');
  const response = await pollJob(opName);
  console.log(' done');

  const generated = response?.generateVideoResponse?.generatedSamples
    ?? response?.generatedVideos
    ?? [];
  if (!generated.length) throw new Error(`No video in response: ${JSON.stringify(response)}`);

  const video = generated[0].video ?? generated[0];
  const uri = video.uri ?? video.video?.uri;
  if (!uri) throw new Error(`No video URI in response: ${JSON.stringify(response)}`);

  const outPath = path.join(OUT_DIR, `${name}.mp4`);
  const bytes = await downloadVideo(uri, outPath);
  console.log(`  saved ${outPath} (${Math.round(bytes / 1024)} KB)`);
}

async function main() {
  if (!API_KEY) {
    console.error('Missing GOOGLE_AI_STUDIO_API_KEY environment variable.');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const opts = parseArgs(process.argv);
  const names = opts.names.length ? opts.names : Object.keys(CLIPS);
  const unknown = names.filter(n => !CLIPS[n]);
  if (unknown.length) {
    console.error(`Unknown clip(s): ${unknown.join(', ')}. Available: ${Object.keys(CLIPS).join(', ')}`);
    process.exit(1);
  }

  console.log(`Generating ${names.length} clip(s) with ${opts.model}...`);
  const failed = [];
  for (const name of names) {
    try {
      await generateOne(name, CLIPS[name], opts.model);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      failed.push(name);
    }
  }

  if (failed.length) {
    console.error(`\n${failed.length} failed: ${failed.join(', ')}`);
    process.exit(1);
  }
  console.log('\nAll clips generated into public/video/');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
