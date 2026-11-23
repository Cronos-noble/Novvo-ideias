#!/usr/bin/env bash
# Verifica e instala dependências: node, ffmpeg, whisper, puppeteer.
set -u
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
miss=()
SUDO=""; [ "$(id -u)" != 0 ] && command -v sudo >/dev/null && SUDO="sudo"

command -v node >/dev/null || miss+=("node (instale Node >=18: https://nodejs.org)")
if ! command -v ffmpeg >/dev/null; then
  echo "→ instalando ffmpeg"
  if command -v apt-get >/dev/null; then $SUDO apt-get install -y ffmpeg
  elif command -v brew >/dev/null; then brew install ffmpeg
  else miss+=("ffmpeg"); fi
fi
command -v ffmpeg >/dev/null || miss+=("ffmpeg")

if ! command -v whisper >/dev/null; then
  echo "→ instalando openai-whisper (pip)"
  (python3 -m pip install -U openai-whisper || python3 -m pip install --break-system-packages -U openai-whisper) >/dev/null 2>&1
fi
command -v whisper >/dev/null || miss+=("whisper (pip install openai-whisper)")

if command -v node >/dev/null; then
  cd "$SKILL"
  [ -f package.json ] || echo '{"name":"cartoon-audio-short","private":true,"type":"commonjs"}' > package.json
  node -e "require('puppeteer')" 2>/dev/null || { echo "→ instalando puppeteer"; npm install puppeteer >/dev/null 2>&1; }
  node -e "require('puppeteer')" 2>/dev/null || miss+=("puppeteer (cd $SKILL && npm i puppeteer)")
fi

if [ ${#miss[@]} -gt 0 ]; then echo "FALTAM:"; printf ' - %s\n' "${miss[@]}"; exit 1; fi
echo "OK: node $(node -v), $(ffmpeg -version | head -1 | cut -d' ' -f1-3), whisper, puppeteer"
