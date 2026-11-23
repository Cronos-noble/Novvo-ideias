#!/usr/bin/env node
// audio_synth.js <proj> → music.wav + sfx.wav (sintetizados, livres de direitos)
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const proj = process.argv[2], SR = 44100;
const cfg = JSON.parse(fs.readFileSync(path.join(proj, 'scenes.json')));
const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(proj, cfg.audio || 'voice.wav')]).toString()) + 1;
const N = Math.ceil(dur * SR), hz = m => 440 * Math.pow(2, (m - 69) / 12);
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296 * 2 - 1;

function writeWav(file, buf) {
  const b = Buffer.alloc(44 + buf.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + buf.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(buf.length * 2, 40);
  for (let i = 0; i < buf.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2);
  fs.writeFileSync(file, b);
}
function add(buf, t, fn, len, gain = 1) { const s0 = Math.floor(t * SR), n = Math.floor(len * SR); for (let i = 0; i < n && s0 + i < buf.length; i++) if (s0 + i >= 0) buf[s0 + i] += fn(i / SR, i / n) * gain; }
const tone = (f, decay, harm = [1, 0.4, 0.2]) => (t) => harm.reduce((a, h, k) => a + h * Math.sin(2 * Math.PI * f * (k + 1) * t), 0) * Math.min(1, t * 400) * Math.exp(-t * decay);
const noiseHit = (decay, hp = 0.9) => { let p = 0; return (t) => { const n = rnd(); const o = n - p * hp; p = n; return o * Math.exp(-t * decay); }; };

// ---------- Música ----------
function music(style, bpm, buf) {
  const beat = 60 / bpm, beats = Math.floor(dur / beat);
  if (style === 'jazz') {
    const prog = [[50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59], [45, 49, 52, 55]]; // Dm7 G7 Cmaj7 A7
    for (let b = 0; b < beats; b++) {
      const ch = prog[Math.floor(b / 4) % 4], bt = b * beat, sw = beat * 0.62;
      const bassNote = [ch[0], ch[1], ch[2], ch[1] + 2][b % 4] - 12;
      add(buf, bt, tone(hz(bassNote), 5, [1, 0.5, 0.15]), beat, 0.5);
      add(buf, bt, noiseHit(40), 0.08, 0.1); add(buf, bt + sw, noiseHit(45), 0.07, 0.07);
      if (b % 2 === 1) ch.forEach(n => add(buf, bt + (b % 4 === 3 ? sw : 0), tone(hz(n + 12), 6, [1, 0.3, 0.1]), beat, 0.09));
    }
  } else if (style === 'suspense') {
    for (let b = 0; b < beats; b++) {
      const bt = b * beat; add(buf, bt, tone(hz(33), 1.2, [1, 0.6, 0.4, 0.2]), beat * 2, 0.22);
      add(buf, bt, tone(hz(45), 12, [1]), 0.25, 0.28); add(buf, bt + beat * 0.25, tone(hz(45), 14, [1]), 0.2, 0.18); // batida
      if (b % 8 === 0) { const m = [57, 60, 63, 59][(b / 8) % 4]; add(buf, bt, tone(hz(m), 0.6, [1, 0.5]), beat * 4, 0.07); }
    }
  } else { // upbeat
    const prog = [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]];
    for (let b = 0; b < beats * 2; b++) {
      const ch = prog[Math.floor(b / 8) % 4], bt = b * beat / 2;
      add(buf, bt, tone(hz(ch[b % 3] + 24), 9, [1, 0.3]), beat, 0.13);
      if (b % 2 === 0) add(buf, bt, tone(hz(ch[0] - 12), 6, [1, 0.4]), beat, 0.3);
      if (b % 4 === 2) add(buf, bt, noiseHit(30), 0.07, 0.12);
    }
  }
  const fi = Math.floor(SR * 1.2); for (let i = 0; i < fi; i++) { buf[i] *= i / fi; buf[buf.length - 1 - i] *= i / fi; }
}

// ---------- Efeitos ----------
const SFX = {
  register: (buf, t) => { add(buf, t, noiseHit(60), 0.05, 0.6); add(buf, t + 0.08, tone(2093, 7, [1, 0.5]), 0.7, 0.5); add(buf, t + 0.2, tone(2637, 6, [1, 0.5]), 0.9, 0.5); },
  whoosh: (buf, t) => { let lp = 0; add(buf, t, (x, k) => { lp += (rnd() - lp) * (0.02 + 0.5 * k * k); return lp * Math.sin(Math.PI * k) * 6; }, 0.5, 0.6); },
  pop: (buf, t) => add(buf, t, (x) => Math.sin(2 * Math.PI * (500 + 700 * Math.exp(-x * 40)) * x) * Math.exp(-x * 25), 0.18, 0.7)
};

const m = new Float32Array(N), s = new Float32Array(N);
music((cfg.music || {}).style || 'jazz', (cfg.music || {}).bpm || 118, m);
(cfg.sfx || []).forEach(e => (SFX[e.type] || SFX.pop)(s, e.t));
writeWav(path.join(proj, 'music.wav'), m); writeWav(path.join(proj, 'sfx.wav'), s);
console.log(`music.wav + sfx.wav (${dur.toFixed(1)}s, estilo ${(cfg.music || {}).style || 'jazz'})`);
