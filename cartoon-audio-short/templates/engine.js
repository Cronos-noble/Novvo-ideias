// Engine de cenas 2D recortadas. render.js chama: window.init(data); window.renderFrame(t)
const W = 1080, H = 1920;
let D = null;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeOutCubic = x => 1 - Math.pow(1 - clamp(x), 3);
const easeOutBack = x => { x = clamp(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---------- Fundos (cores chapadas, parallax por pan) ----------
function background(bg, prog, seed) {
  const [sky = '#f6d6a8', mid = '#e07a5f', dark = '#3d405b'] = bg.colors || [];
  const pan = (bg.pan ?? 0.2) * W * prog, R = rng(seed);
  let s = `<rect width="${W}" height="${H}" fill="${sky}"/>`;
  const far = `translate(${-pan * 0.4} 0)`, near = `translate(${-pan} 0)`;
  if (bg.type === 'city') {
    s += `<circle cx="820" cy="420" r="150" fill="${mid}" opacity=".6"/><g transform="${far}">`;
    for (let x = -100; x < W * 1.6; x += 170) { const h = 500 + R() * 600; s += `<rect x="${x}" y="${1450 - h}" width="150" height="${h}" fill="${mid}"/>`; }
    s += `</g><g transform="${near}">`;
    for (let x = -60; x < W * 1.9; x += 230) {
      const h = 400 + R() * 700; s += `<rect x="${x}" y="${1500 - h}" width="200" height="${h}" fill="${dark}"/>`;
      for (let wy = 1500 - h + 40; wy < 1440; wy += 90) for (let wx = x + 25; wx < x + 170; wx += 60) s += `<rect x="${wx}" y="${wy}" width="30" height="46" fill="${sky}" opacity=".85"/>`;
    }
    s += `</g>`;
  } else if (bg.type === 'room' || bg.type === 'office') {
    s += `<rect y="1300" width="${W}" height="620" fill="${dark}"/><rect y="1290" width="${W}" height="20" fill="${mid}"/><g transform="${near}">`;
    s += `<rect x="120" y="420" width="360" height="460" fill="${mid}"/><rect x="145" y="445" width="150" height="410" fill="${sky}"/><rect x="305" y="445" width="150" height="410" fill="${sky}"/>`;
    if (bg.type === 'office') s += `<rect x="760" y="1060" width="520" height="30" fill="${dark}"/><rect x="800" y="1090" width="30" height="220" fill="${dark}"/><rect x="1180" y="1090" width="30" height="220" fill="${dark}"/><rect x="900" y="700" width="260" height="190" fill="${mid}"/>`;
    else s += `<rect x="760" y="560" width="300" height="220" fill="${mid}"/><rect x="780" y="580" width="260" height="180" fill="${sky}"/>`;
    s += `</g>`;
  } else { // outdoor
    s += `<g transform="${far}">`;
    for (let x = -200; x < W * 1.6; x += 200) s += `<circle cx="${x}" cy="1400" r="${230 + R() * 140}" fill="${mid}"/>`;
    s += `</g><g transform="${near}">`;
    for (let x = 0; x < W * 1.9; x += 430) s += `<ellipse cx="${x + R() * 100}" cy="${260 + R() * 280}" rx="150" ry="55" fill="#fff" opacity=".9"/>`;
    s += `</g><rect y="1380" width="${W}" height="540" fill="${dark}"/>`;
  }
  return s;
}

// ---------- Boca: 0 fechada, 1 pequena, 2 média, 3 aberta ----------
function mouth(i) {
  if (i === 0) return `<path d="M-16 0 Q0 8 16 0" stroke="#3a1d1d" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  if (i === 1) return `<ellipse rx="10" ry="6" fill="#5a1f2b"/>`;
  if (i === 2) return `<ellipse rx="15" ry="12" fill="#5a1f2b"/>`;
  return `<path d="M-20 -5 Q0 38 20 -5 Z" fill="#5a1f2b"/><rect x="-14" y="-5" width="28" height="7" fill="#fff"/>`;
}

// ---------- Personagem articulado (pés em 0,0; altura ~430) ----------
function person(c, o) {
  const skin = c.skin || '#f2c9a0', shirt = c.shirt || '#2b4c7e', pants = c.pants || '#2a2a3a', hair = c.hair || '#3b2a20';
  const hs = c.hairStyle || 'short', hat = c.hat || 'none';
  const arm = (side, ang) => `<g transform="translate(${side * 72} -245) rotate(${ang})"><rect x="-15" y="-10" width="30" height="130" rx="15" fill="${shirt}"/><circle cy="132" r="19" fill="${skin}"/></g>`;
  let s = `<g transform="translate(0 ${o.bob})">`;
  s += `<rect x="-52" y="-100" width="44" height="100" rx="10" fill="${pants}"/><rect x="8" y="-100" width="44" height="100" rx="10" fill="${pants}"/>`;
  s += `<rect x="-62" y="-12" width="60" height="16" rx="8" fill="#111"/><rect x="2" y="-12" width="60" height="16" rx="8" fill="#111"/>`;
  s += arm(-1, o.armL);
  s += `<rect x="-78" y="-285" width="156" height="205" rx="42" fill="${shirt}"/>`;
  s += arm(1, o.armR);
  s += `<rect x="-18" y="-310" width="36" height="40" fill="${skin}"/>`;
  if (hs === 'long') s += `<rect x="-88" y="-420" width="176" height="210" rx="70" fill="${hair}"/>`;
  s += `<circle cy="-360" r="84" fill="${skin}"/>`;
  if (hs === 'short' || hs === 'long') s += `<path d="M-86 -370 Q-80 -455 0 -452 Q80 -455 86 -370 Q40 -400 0 -395 Q-40 -400 -86 -370Z" fill="${hair}"/>`;
  if (hat === 'top') s += `<rect x="-100" y="-452" width="200" height="20" rx="8" fill="#161616"/><rect x="-62" y="-560" width="124" height="115" rx="8" fill="#161616"/><rect x="-62" y="-478" width="124" height="22" fill="#a33"/>`;
  if (hat === 'cap') s += `<path d="M-86 -385 Q0 -470 86 -385Z" fill="#c0392b"/><rect x="40" y="-396" width="90" height="16" rx="8" fill="#c0392b"/>`;
  s += `<circle cx="86" cy="-360" r="14" fill="${skin}"/><circle cx="-86" cy="-360" r="14" fill="${skin}"/>`;
  const ey = -372;
  s += o.blink ? `<path d="M-42 ${ey} h24 M18 ${ey} h24" stroke="#222" stroke-width="6" stroke-linecap="round"/>`
               : `<circle cx="-30" cy="${ey}" r="10" fill="#222"/><circle cx="30" cy="${ey}" r="10" fill="#222"/>`;
  if (c.glasses) s += `<circle cx="-30" cy="${ey}" r="22" fill="none" stroke="#222" stroke-width="5"/><circle cx="30" cy="${ey}" r="22" fill="none" stroke="#222" stroke-width="5"/><path d="M-8 ${ey} h16" stroke="#222" stroke-width="5"/>`;
  if (c.mustache) s += `<path d="M-34 -340 Q-16 -352 0 -342 Q16 -352 34 -340 Q16 -328 0 -336 Q-16 -328 -34 -340Z" fill="${hair}"/>`;
  s += `<g transform="translate(0 -318)">${mouth(o.mouth)}</g></g>`;
  return s;
}

// ---------- Props: só texto dentro de objetos ----------
function textLines(text, cx, cy, size, color) {
  const lines = String(text).split('|'), lh = size * 1.15, y0 = cy - ((lines.length - 1) * lh) / 2 + size * 0.35;
  return lines.map((l, i) => `<text x="${cx}" y="${y0 + i * lh}" font-family="Impact,'Arial Black',sans-serif" font-weight="900" font-size="${size}" fill="${color}" text-anchor="middle">${esc(l)}</text>`).join('');
}
function prop(p) {
  const w = p.w || 600, h = p.h || 240, n = String(p.text || '').split('|'), size = Math.min(h / (n.length * 1.6), w / (Math.max(...n.map(l => l.length)) * 0.62));
  if (p.type === 'newspaper') return `<g transform="rotate(-4)"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="#f4efe0" stroke="#222" stroke-width="6"/><rect x="${-w / 2 + 20}" y="${h / 2 - 60}" width="${w - 40}" height="14" fill="#999"/><rect x="${-w / 2 + 20}" y="${h / 2 - 34}" width="${w - 40}" height="14" fill="#999"/>${textLines(p.text, 0, -h * 0.1, size * 0.9, '#111')}</g>`;
  if (p.type === 'banner') return `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="18" fill="${p.color || '#c0392b'}" stroke="#222" stroke-width="6"/>${textLines(p.text, 0, 0, size, '#fff')}`;
  return `<rect x="-12" y="${h / 2 - 10}" width="24" height="200" fill="#6b4423"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="14" fill="${p.color || '#e9b44c'}" stroke="#222" stroke-width="6"/>${textLines(p.text, 0, 0, size, '#2a1a0a')}`;
}

// ---------- Quadro ----------
window.init = d => { D = d; };
function ampAt(t) { const i = Math.floor(t * D.amp.fps); return D.amp.values[i] ?? 0; }
function mouthIdx(t) { const a = ampAt(t); if (a < 0.1) return 0; if (a < 0.32) return 1; if (a < 0.62) return 2; return 3; }

window.renderFrame = t => {
  let si = D.scenes.findIndex(s => t >= s.start && t < s.end); if (si < 0) si = D.scenes.length - 1;
  const sc = D.scenes[si], lt = t - sc.start, prog = clamp(lt / Math.max(0.1, sc.end - sc.start));
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  s += background(sc.bg || {}, prog, si * 977 + 13);
  (sc.props || []).forEach(p => {
    const k = easeOutBack((lt - (p.t_in || 0)) / 0.35); if (lt < (p.t_in || 0)) return;
    s += `<g transform="translate(${p.x ?? 540} ${p.y ?? 500}) scale(${k})">${prop(p)}</g>`;
  });
  (sc.actors || []).forEach((a, i) => {
    const c = D.characters[a.char || a.id] || {}, sc0 = a.scale || 1.5, flip = a.flip ? -1 : 1;
    let x = a.x ?? 540, y = a.y ?? 1500, k = 1;
    const e = easeOutCubic(lt / 0.55);
    if (a.enter === 'left') x = x - (1 - e) * 900; else if (a.enter === 'right') x = x + (1 - e) * 900; else if (a.enter === 'pop') k = easeOutBack(lt / 0.4);
    const sp = !!a.speaks, m = sp ? mouthIdx(t) : 0, amp = sp ? ampAt(t) : 0;
    const blink = ((t + i * 1.3) % 3.4) < 0.14;
    const sway = Math.sin(t * 2.2 + i) * 4, ph = t * 7 + i;
    const armL = sp ? 10 + amp * 40 * Math.sin(ph) : 8 + sway, armR = sp ? -12 - amp * 50 * Math.sin(ph + 1.5) : -8 - sway;
    const bob = Math.sin(t * 3 + i) * 5 - (sp ? amp * 8 : 0);
    s += `<g transform="translate(${x} ${y}) scale(${sc0 * flip * k} ${sc0 * k})"><ellipse cy="4" rx="95" ry="14" fill="#000" opacity=".18"/>${person(c, { mouth: m, blink, armL, armR, bob })}</g>`;
  });
  if (si > 0 && lt < 0.28) { const w = 1 - lt / 0.28; s += `<rect x="0" width="${W * w}" height="${H}" fill="${(sc.bg?.colors || [])[2] || '#222'}"/>`; }
  s += `</svg>`;
  document.getElementById('stage').innerHTML = s;
};
