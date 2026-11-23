#!/usr/bin/env node
// amplitude.js <proj>  → amp.json {fps, duration, values[0..1]} (envelope para lip-sync)
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const proj = process.argv[2], fps = 30, SR = 16000;
const wav = path.join(proj, 'voice.wav');
const r = spawnSync('ffmpeg', ['-v', 'error', '-i', wav, '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 1 << 30 });
if (r.status !== 0) { console.error(String(r.stderr)); process.exit(1); }
const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 1);
const win = SR / fps, n = Math.ceil(pcm.length / win), raw = [];
for (let i = 0; i < n; i++) {
  let s = 0, c = 0;
  for (let k = Math.floor(i * win); k < Math.min(pcm.length, Math.floor((i + 1) * win)); k++) { s += pcm[k] * pcm[k]; c++; }
  raw.push(c ? Math.sqrt(s / c) : 0);
}
const sorted = [...raw].sort((a, b) => a - b), ref = sorted[Math.floor(sorted.length * 0.95)] || 1;
let prev = 0;
const values = raw.map(v => { const x = Math.min(1, v / ref); prev = prev * 0.35 + x * 0.65; return +prev.toFixed(3); });
fs.writeFileSync(path.join(proj, 'amp.json'), JSON.stringify({ fps, duration: pcm.length / SR, values }));
console.log(`amp.json: ${values.length} quadros, ${(pcm.length / SR).toFixed(2)}s`);
