#!/usr/bin/env bash
# Generates the landing-page photos via the Ideogram v3 API.
# Usage: IDEOGRAM_API_KEY must be set in the environment (never commit it).
#   bash docs/scripts/generate-landing-images.sh   → writes PNGs to docs/scripts/out/
# Then copy them to /public/img and point landing/media.ts at them.
set -euo pipefail
: "${IDEOGRAM_API_KEY:?Set IDEOGRAM_API_KEY in the environment first}"
cd "$(dirname "$0")"
mkdir -p out

STYLE="Bright daytime lifestyle sports photography, vivid saturated colours with orange and lime-green accents, natural light, candid and joyful, shot on 35mm, shallow depth of field. No logos, no brand names, no text, no watermarks, no famous people."

gen() { # name aspect prompt
  local name=$1 aspect=$2 prompt="$3 $STYLE"
  echo "→ $name"
  resp=$(curl -sS -X POST https://api.ideogram.ai/v1/ideogram-v3/generate \
    -H "Api-Key: $IDEOGRAM_API_KEY" \
    -F "prompt=$prompt" -F "aspect_ratio=$aspect" \
    -F "rendering_speed=QUALITY" -F "style_type=REALISTIC" -F "magic_prompt=OFF" \
    -F "negative_prompt=text, logo, watermark, club crest, sponsor, dark night scene")
  url=$(printf '%s' "$resp" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"][0]["url"])') \
    || { echo "  failed: $resp" | head -c 400; echo; return 1; }
  curl -sS -o "out/$name.png" "$url" && echo "  saved out/$name.png"
}

gen why-debate 16x10 "Four diverse young friends on a bright sofa laughing and playfully arguing while pointing at one smartphone, a football match blurred on a TV behind them."
gen why-matter 16x10 "A tense young football fan in a sunny stadium stand with both hands on head, mouth open in suspense, colourful crowd softly blurred behind."
gen why-friends 16x10 "Group of friends high-fiving and cheering at an outdoor sunny beer garden table, a big screen showing a match softly blurred in the background."
gen finale 16x9 "Ecstatic sports fans celebrating with arms raised under an explosion of orange, pink and lime confetti on a sunny afternoon, wide shot, lots of motion and energy."
