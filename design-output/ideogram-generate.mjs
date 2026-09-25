/**
 * YourFriendsLeague — brand imagery via Ideogram API (v3).
 *
 * Usage:
 *   IDEOGRAM_API_KEY=xxx node design-output/ideogram-generate.mjs            # generate all
 *   IDEOGRAM_API_KEY=xxx node design-output/ideogram-generate.mjs hero-arena # one image
 *   IDEOGRAM_API_KEY=xxx node design-output/ideogram-generate.mjs --speed TURBO
 *   IDEOGRAM_API_KEY=xxx node design-output/ideogram-generate.mjs --resolution 1536x864 hero-arena
 *
 * Output: public/img/<name>.png
 *
 * Notes on pixels/quality:
 *  - Default output is ~1MP (per aspect ratio). Pass --resolution WxH for a
 *    specific supported resolution (see Ideogram docs, up to ~1.5MP).
 *  - For genuinely larger files (retina hero, print), generate normally and
 *    run the result through Ideogram's /upscale endpoint (2x) — or ask for
 *    the upscale companion script.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_URL = 'https://api.ideogram.ai/v1/ideogram-v3/generate';
const API_KEY = process.env.IDEOGRAM_API_KEY;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'img');

// Shared brand look — keeps every image in the same visual family.
const BRAND =
  'Moody premium cinematic photograph, deep navy-black darkness (#050a14), ' +
  'electric cyan (#38bdf8) and soft indigo (#818cf8) accent lighting with a subtle warm orange (#f97316) counterpoint, ' +
  'atmospheric haze, high contrast, shallow depth of field, editorial sports-magazine quality, ultra detailed.';

const NEGATIVE =
  'text, words, letters, numbers, logo, logos, watermark, signature, jersey branding, ' +
  'advertising boards with readable text, signage, human faces in focus, cartoon, illustration, low quality, blurry';

const IMAGES = [
  {
    name: 'hero-arena',
    aspect: '16x9',
    prompt:
      `Epic ultra-wide view from high in the stands of a packed modern stadium at night, ` +
      `towering floodlights cutting through mist, glowing cyan and indigo light haze over the pitch, ` +
      `crowd as dark anonymous silhouettes, sense of anticipation before kick-off. ${BRAND}`,
  },
  {
    name: 'sport-football',
    aspect: '16x9',
    prompt:
      `A soccer ball launching off wet turf mid-strike, water droplets exploding outward from the ` +
      `point of contact, motion-blurred trail behind the ball arcing toward a glowing out-of-focus ` +
      `goal frame, rain streaking diagonally through cyan stadium light, dark night-match atmosphere, ` +
      `dramatic sports photography. ${BRAND}`,
  },
  {
    name: 'sport-hockey',
    aspect: '16x9',
    prompt:
      `A hockey puck rocketing away across ice after a slapshot, the puck a completely plain matte ` +
      `black disc with no logo or markings, glowing cyan speed-line trail streaking behind it, ` +
      `ice-chip spray dispersing in the air where the stick made contact, framed tightly so only the ` +
      `curved blade and the very bottom few inches of the shaft are visible at the frame's edge -- the ` +
      `rest of the shaft is cropped out of frame entirely, out of focus, and in deep shadow, the visible ` +
      `blade wrapped in plain matte black hockey tape with no text, decals, or markings, warm amber ` +
      `light streak blurred in the background, dark rink atmosphere, high-speed sports photography. ${BRAND}`,
  },
  {
    name: 'sport-football-end',
    aspect: '16x9',
    prompt:
      `The same soccer ball now resting still inside the back of the goal net, net bulging softly ` +
      `around it, rain droplets settled and glistening on the mesh, motion fully resolved with no ` +
      `blur or spray, calm dark night-match atmosphere, cyan stadium light glowing softly through the ` +
      `net, same camera angle and lighting as an impact moment just before it. ${BRAND}`,
  },
  {
    name: 'sport-hockey-end',
    aspect: '16x9',
    prompt:
      `The same hockey puck now resting still on the ice near the goal, the puck a completely plain ` +
      `matte black disc with no logo or markings, ice chips settled around it, ` +
      `no motion blur or speed trail, only the curved blade and the very bottom few inches of a hockey ` +
      `stick's shaft visible resting flat on the ice beside it -- the rest of the shaft is cropped out ` +
      `of frame entirely, out of focus, and in deep shadow, the visible blade wrapped in plain matte ` +
      `black hockey tape with no text, decals, or markings, calm dark rink atmosphere, ` +
      `warm amber light glowing softly in the background, same camera angle ` +
      `and lighting as the moment of impact just before it. ${BRAND}`,
  },
  {
    name: 'sport-basketball-end',
    aspect: '16x9',
    prompt:
      `The same basketball now resting still on the glossy dark court, dust and light particles fully ` +
      `settled, no motion blur, calm reflective floor, the orange spotlight now steady and soft above ` +
      `it, cyan and magenta neon ceiling strips still glowing in the background, same camera angle and ` +
      `lighting as the moment of impact just before it. ${BRAND}`,
  },
  {
    name: 'sport-racing-end',
    aspect: '16x9',
    prompt:
      `Extreme 90-degree side profile view of a Formula-style open-wheel single-seater red race car -- ` +
      `the car's entire flank fills the width of the frame horizontally, nose pointing toward the left ` +
      `edge of frame and tail toward the right edge, all four exposed wheels visible in a horizontal ` +
      `line, helmet of the driver visible in profile, this is a strict side-on elevation view like a ` +
      `technical drawing, absolutely not a three-quarter or front view, small and distant on a night ` +
      `track with thin glowing horizontal light-trail streaks behind it, motion blur mostly resolved, ` +
      `calm atmosphere under the floodlights, plain solid red bodywork with absolutely no text, numbers, ` +
      `decals, or sponsor logos anywhere on the car. ${BRAND}`,
  },
  {
    name: 'sport-tennis',
    aspect: '3x2',
    prompt:
      `A single tennis ball on a dark hard court at night lit by one dramatic overhead beam, ` +
      `indigo and cyan reflections on the court surface, faint chalk dust in the air. ${BRAND}`,
  },
  {
    name: 'sport-basketball',
    aspect: '16x9',
    prompt:
      `A basketball frozen mid-bounce just above a glossy dark court, orange spotlight streaking ` +
      `upward from the point of impact, faint dust and light particles scattering outward, motion ` +
      `blur trailing beneath the ball, cyan and magenta neon ceiling strips reflected in the wet-look ` +
      `floor, dramatic high-contrast lighting, cinematic sports photography, moody arena atmosphere. ${BRAND}`,
  },
  {
    name: 'sport-crowd',
    aspect: '3x2',
    prompt:
      `Small group of friends seen from behind in stadium stands at night, arms raised celebrating, ` +
      `silhouetted against glowing cyan floodlit pitch, camaraderie, no faces visible. ${BRAND}`,
  },
  {
    name: 'sport-racing',
    aspect: '16x9',
    prompt:
      `A Formula-style open-wheel single-seater race car with clearly exposed uncovered wheels (not a ` +
      `closed-cockpit endurance car) speeding down a night track, closer to camera and partially exiting ` +
      `frame, intensified long-exposure light trails in red, magenta, and cyan streaking horizontally, ` +
      `motion blur heavier on the car's rear, floodlights flaring in the background, high-speed panning ` +
      `photography, cinematic night racing atmosphere, plain solid-color bodywork with absolutely no ` +
      `text, numbers, decals, or sponsor logos anywhere on the car. ${BRAND}`,
  },
  {
    name: 'sport-scoreboard',
    aspect: '3x2',
    prompt:
      `Giant blank glowing stadium screen and scoreboard structure seen from below in a dark arena, ` +
      `abstract cyan light panels, dramatic perspective, anticipation atmosphere, screen content out of focus. ${BRAND}`,
  },
  {
    name: 'sport-floodlight',
    aspect: '3x2',
    prompt:
      `Stadium floodlight tower blazing against a deep twilight sky, lens flare, moths of light dust ` +
      `in the beams, silhouette of stadium roof edge, cyan-tinted night. ${BRAND}`,
  },
  {
    name: 'cta-celebration',
    aspect: '16x9',
    prompt:
      `Confetti falling through cyan and indigo floodlight beams in a dark stadium, silhouettes of ` +
      `fans with raised arms in the foreground, victorious atmosphere, cinematic depth. ${BRAND}`,
  },
];

function parseArgs(argv) {
  const opts = { speed: 'QUALITY', resolution: null, only: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--speed') opts.speed = argv[++i];
    else if (a === '--resolution') opts.resolution = argv[++i];
    else opts.only.push(a);
  }
  return opts;
}

async function generateOne(spec, opts) {
  const form = new FormData();
  form.append('prompt', spec.prompt);
  form.append('negative_prompt', NEGATIVE);
  form.append('rendering_speed', opts.speed);
  form.append('style_type', 'REALISTIC');
  form.append('num_images', '1');
  if (opts.resolution) form.append('resolution', opts.resolution);
  else form.append('aspect_ratio', spec.aspect);

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Api-Key': API_KEY },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ideogram API ${res.status} for "${spec.name}": ${body}`);
  }

  const json = await res.json();
  const url = json?.data?.[0]?.url;
  if (!url) throw new Error(`No image URL in response for "${spec.name}": ${JSON.stringify(json)}`);

  // URLs expire quickly — download immediately.
  const img = await fetch(url);
  if (!img.ok) throw new Error(`Download failed (${img.status}) for "${spec.name}"`);
  const buf = Buffer.from(await img.arrayBuffer());

  const outPath = path.join(OUT_DIR, `${spec.name}.png`);
  fs.writeFileSync(outPath, buf);
  const kb = Math.round(buf.length / 1024);
  const resInfo = json.data[0].resolution ?? '?';
  console.log(`  saved ${outPath} (${kb} KB, ${resInfo})`);
}

async function main() {
  if (!API_KEY) {
    console.error('Missing IDEOGRAM_API_KEY environment variable.');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const opts = parseArgs(process.argv);
  const queue = opts.only.length
    ? IMAGES.filter(i => opts.only.includes(i.name))
    : IMAGES;

  if (!queue.length) {
    console.error(`No matching images. Available: ${IMAGES.map(i => i.name).join(', ')}`);
    process.exit(1);
  }

  console.log(`Generating ${queue.length} image(s) at speed=${opts.speed}${opts.resolution ? ` resolution=${opts.resolution}` : ''}...`);
  const failed = [];
  for (const spec of queue) {
    console.log(`- ${spec.name} (${spec.aspect})`);
    try {
      await generateOne(spec, opts);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      failed.push(spec.name);
    }
    // Gentle pacing to stay clear of rate limits.
    await new Promise(r => setTimeout(r, 1200));
  }

  if (failed.length) {
    console.error(`\n${failed.length} failed: ${failed.join(', ')} — re-run with those names as args.`);
    process.exit(1);
  }
  console.log('\nAll images generated into public/img/');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
