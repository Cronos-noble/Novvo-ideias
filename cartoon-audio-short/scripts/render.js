#!/usr/bin/env node
// render.js <proj> [--stills]   Render incremental por cena (cache em segments/) + mix final.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { spawn, execFileSync } = require('child_process');
const proj = path.resolve(process.argv[2]), stillsMode = process.argv.includes('--stills');
const puppeteer = require(path.join(__dirname, '..', 'node_modules', 'puppeteer'));
const rd = f => JSON.parse(fs.readFileSync(path.join(proj, f)));
const cfg = rd('scenes.json'), amp = rd('amp.json'), fps = cfg.fps || 30, W = 1080, H = 1920;
const audio = path.join(proj, cfg.audio || 'voice.wav');
const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audio]).toString());
const total = Math.round(dur * fps), sc = cfg.scenes;
const frames = sc.map((s, i) => [Math.round(s.start * fps), i + 1 < sc.length ? Math.round(sc[i + 1].start * fps) : total]);
const engineSrc = fs.readFileSync(path.join(proj, 'engine.js'), 'utf8') + fs.readFileSync(path.join(proj, 'engine.html'), 'utf8');
const hashOf = i => crypto.createHash('sha1').update(JSON.stringify([sc[i], cfg.characters, frames[i], engineSrc])).digest('hex').slice(0, 10);
const run = (cmd, args) => new Promise((res, rej) => { const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] }); let e = ''; p.stderr.on('data', d => e += d); p.on('close', c => c ? rej(new Error(e.slice(-800))) : res()); });

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(proj, 'engine.html'));
  await page.evaluate(d => window.init(d), { scenes: sc, characters: cfg.characters, amp });

  if (stillsMode) {
    const dir = path.join(proj, 'stills'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
    for (let i = 0; i < sc.length; i++) {
      const t = sc[i].start + Math.min(1.2, (sc[i].end - sc[i].start) * 0.6);
      await page.evaluate(t => window.renderFrame(t), t);
      await page.screenshot({ path: path.join(dir, String(i + 1).padStart(2, '0') + '.png') });
    }
    await browser.close();
    const cols = Math.min(sc.length, 6);
    await run('ffmpeg', ['-y', '-v', 'error', '-i', path.join(dir, '%02d.png'), '-vf', `scale=270:-1,tile=${cols}x${Math.ceil(sc.length / cols)}:padding=8:color=white`, '-frames:v', '1', path.join(proj, 'contact_sheet.png')]);
    console.log('contact_sheet.png (' + sc.length + ' cenas)'); return;
  }

  const segDir = path.join(proj, 'segments'); fs.mkdirSync(segDir, { recursive: true });
  const segs = [];
  for (let i = 0; i < sc.length; i++) {
    const out = path.join(segDir, `scene_${String(i + 1).padStart(2, '0')}_${hashOf(i)}.mp4`); segs.push(out);
    if (fs.existsSync(out)) { console.log(`cena ${i + 1}: cache`); continue; }
    fs.readdirSync(segDir).filter(f => f.startsWith(`scene_${String(i + 1).padStart(2, '0')}_`)).forEach(f => fs.rmSync(path.join(segDir, f)));
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps), out], { stdio: ['pipe', 'ignore', 'inherit'] });
    for (let f = frames[i][0]; f < frames[i][1]; f++) {
      await page.evaluate(t => window.renderFrame(t), f / fps);
      const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
    console.log(`cena ${i + 1}/${sc.length}: renderizada (${frames[i][1] - frames[i][0]} quadros)`);
  }
  await browser.close();

  fs.writeFileSync(path.join(proj, 'concat.txt'), segs.map(s => `file '${s}'`).join('\n'));
  const video = path.join(proj, 'video_only.mp4');
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(proj, 'concat.txt'), '-c', 'copy', video]);

  const has = f => fs.existsSync(path.join(proj, f));
  const mv = (cfg.music || {}).volume ?? 0.16, ins = ['-i', video, '-i', audio]; let fc = '[1:a]volume=1.0[v]', mix = ['[v]'];
  if (has('music.wav')) { ins.push('-i', path.join(proj, 'music.wav')); fc += `;[${ins.filter(x => x === '-i').length - 1}:a]volume=${mv}[m]`; mix.push('[m]'); }
  if (has('sfx.wav')) { ins.push('-i', path.join(proj, 'sfx.wav')); fc += `;[${ins.filter(x => x === '-i').length - 1}:a]volume=0.5[s]`; mix.push('[s]'); }
  fc += `;${mix.join('')}amix=inputs=${mix.length}:duration=first:normalize=0,alimiter=limit=0.95[a]`;
  const name = (cfg.title || 'Short').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '') + '.mp4';
  const final = path.join(proj, name);
  await run('ffmpeg', ['-y', '-v', 'error', ...ins, '-filter_complex', fc, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', final]);
  console.log('PRONTO: ' + final);
})().catch(e => { console.error(e); process.exit(1); });
