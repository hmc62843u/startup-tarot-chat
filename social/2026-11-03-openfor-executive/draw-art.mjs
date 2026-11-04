// Draws B1-style hand-drawn stick figures and props as transparent PNGs.
// Run with the stickman skill's node_modules on NODE_PATH: node draw-art.mjs
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {createCanvas} = require(process.env.CANVAS_MODULE || '@napi-rs/canvas');
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'art');
fs.mkdirSync(OUT, {recursive: true});

const INK = '#1d1d1f', RED = '#E5463B', GREEN = '#3E9B4F', YELLOW = '#F2B92E', NAVY = '#24395E', PAPER = '#FFFDF7';

// Deterministic jitter so re-runs produce identical art.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;

function canvas(w, h) {
  const c = createCanvas(w, h), g = c.getContext('2d');
  g.lineCap = 'round'; g.lineJoin = 'round';
  return [c, g];
}

// A pen stroke through points: main line plus a faint second pass for a hand-drawn edge.
function pen(g, pts, {w = 7, color = INK, j = 2.2} = {}) {
  for (const [pass, alpha, width] of [[0, 1, w], [1, 0.35, w * 0.55]]) {
    g.strokeStyle = color; g.globalAlpha = alpha; g.lineWidth = width;
    g.beginPath();
    pts.forEach(([x, y], i) => {
      const dx = rnd() * j * (pass ? 2 : 1), dy = rnd() * j * (pass ? 2 : 1);
      i ? g.lineTo(x + dx, y + dy) : g.moveTo(x + dx, y + dy);
    });
    g.stroke();
  }
  g.globalAlpha = 1;
}

// Smooth curve through points via midpoints, for limbs and wobbly shapes.
function curve(g, pts, opts = {}) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    for (let t = 0.25; t <= 1; t += 0.25) out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
  }
  pen(g, out, opts);
}

function ellipse(g, x, y, rx, ry, {fill = null, stroke = INK, w = 7} = {}) {
  const pts = [];
  for (let a = 0; a <= Math.PI * 2 + 0.3; a += 0.25) pts.push([x + Math.cos(a) * rx * (1 + rnd() * 0.03), y + Math.sin(a) * ry * (1 + rnd() * 0.03)]);
  if (fill) {
    g.fillStyle = fill; g.beginPath();
    pts.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py));
    g.fill();
  }
  if (stroke) pen(g, pts, {w, color: stroke, j: 1});
}

function rect(g, x, y, w, h, {fill = null, stroke = INK, lw = 6, r = 10} = {}) {
  if (fill) {
    g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill();
  }
  if (stroke) pen(g, [[x + r, y], [x + w - r, y], [x + w, y + r], [x + w, y + h - r], [x + w - r, y + h], [x + r, y + h], [x, y + h - r], [x, y + r], [x + r, y]], {w: lw, color: stroke, j: 1.5});
}

// Face moods: eyes, brows and mouth change together so emotion reads at phone size.
function face(g, hx, hy, r, mood, look = 0) {
  const ex = r * 0.38, ey = hy - r * 0.05, lx = look * r * 0.18;
  for (const s of [-1, 1]) ellipse(g, hx + s * ex + lx, ey, r * 0.1, r * 0.16, {fill: INK, stroke: null});
  const brow = {
    sad: s => [[hx + s * ex * 1.5 + lx, ey - r * 0.32], [hx + s * ex * 0.4 + lx, ey - r * 0.46]],
    worried: s => [[hx + s * ex * 1.5 + lx, ey - r * 0.36], [hx + s * ex * 0.3 + lx, ey - r * 0.5]],
    happy: s => [[hx + s * ex * 1.5 + lx, ey - r * 0.42], [hx + s * ex * 0.4 + lx, ey - r * 0.52]],
    curious: s => s < 0 ? [[hx - ex * 1.5 + lx, ey - r * 0.36], [hx - ex * 0.4 + lx, ey - r * 0.38]] : [[hx + ex * 0.4 + lx, ey - r * 0.56], [hx + ex * 1.5 + lx, ey - r * 0.46]],
  }[mood];
  for (const s of [-1, 1]) pen(g, brow(s), {w: 5});
  const my = hy + r * 0.45;
  if (mood === 'sad') curve(g, [[hx - r * 0.3 + lx, my + r * 0.1], [hx + lx, my - r * 0.08], [hx + r * 0.3 + lx, my + r * 0.1]], {w: 5});
  if (mood === 'worried') ellipse(g, hx + lx, my, r * 0.17, r * 0.2, {fill: INK, stroke: null});
  if (mood === 'curious') curve(g, [[hx - r * 0.22 + lx, my], [hx + lx, my + r * 0.06], [hx + r * 0.3 + lx, my - r * 0.1]], {w: 5});
  if (mood === 'happy') {
    g.fillStyle = INK; g.beginPath();
    g.moveTo(hx - r * 0.36 + lx, my - r * 0.08);
    g.quadraticCurveTo(hx + lx, my + r * 0.5, hx + r * 0.36 + lx, my - r * 0.08); g.closePath(); g.fill();
  }
}

// Stick figure from joint positions. Head is an outline circle; limbs are single lines.
function figure(g, p) {
  const r = p.r ?? 52;
  ellipse(g, p.head[0], p.head[1], r, r, {fill: '#ffffff'});
  face(g, p.head[0], p.head[1], r, p.mood, p.look ?? 0);
  curve(g, [p.neck, p.hip], {w: 7});
  for (const limb of ['armL', 'armR']) curve(g, [p.neck, ...p[limb]], {w: 7});
  for (const limb of ['legL', 'legR']) curve(g, [p.hip, ...p[limb]], {w: 7});
  for (const limb of ['armL', 'armR']) { const [x, y] = p[limb].at(-1); ellipse(g, x, y, 11, 9, {fill: INK, stroke: null}); }
  for (const limb of ['legL', 'legR']) { const [x, y] = p[limb].at(-1); ellipse(g, x + (p.feet ?? 10), y, 20, 9, {fill: INK, stroke: null}); }
  // Yellow lanyard badge: the founder's one colored detail.
  pen(g, [[p.neck[0] - 14, p.neck[1] + 4], [p.neck[0] + (p.badgeDx ?? 4), p.neck[1] + 70], [p.neck[0] + 14, p.neck[1] + 4]], {w: 3, color: NAVY});
  rect(g, p.neck[0] + (p.badgeDx ?? 4) - 16, p.neck[1] + 70, 32, 26, {fill: YELLOW, lw: 3, r: 5});
}

function sweat(g, x, y) {
  g.fillStyle = '#6FB7E8'; g.beginPath();
  g.moveTo(x, y); g.quadraticCurveTo(x + 14, y + 24, x, y + 30); g.quadraticCurveTo(x - 14, y + 24, x, y); g.fill();
  pen(g, [[x, y], [x + 11, y + 22], [x, y + 30], [x - 11, y + 22], [x, y]], {w: 3, j: 0.5});
}

function question(g, x, y, s = 1, color = INK) {
  curve(g, [[x - 18 * s, y - 20 * s], [x - 10 * s, y - 40 * s], [x + 12 * s, y - 40 * s], [x + 18 * s, y - 22 * s], [x, y], [x, y + 16 * s]], {w: 6 * s, color});
  ellipse(g, x, y + 34 * s, 5 * s, 5 * s, {fill: color, stroke: null});
}

function save(c, name) { fs.writeFileSync(path.join(OUT, name), c.toBuffer('image/png')); console.log(name); }

// Executive explainer art: same B1 founder character as the pitch video.

// 1 · Three founders waiting, gently curious.
{
  const [c, g] = canvas(900, 700);
  const poses = [['curious', -0.6, 150], ['worried', 0, 450], ['curious', 0.6, 750]];
  for (const [mood, look, x] of poses) {
    figure(g, {mood, look, r: 40, head: [x, 160], neck: [x, 205], hip: [x, 430],
      armL: [[x - 60, 300], [x - 70, 400]], armR: [[x + 60, 300], [x + 70, 400]],
      legL: [[x - 30, 560], [x - 45, 670]], legR: [[x + 30, 560], [x + 45, 670]]});
  }
  save(c, 'founders-row.png');
}

// 1 · Operator overwhelmed, hands on head.
{
  const [c, g] = canvas(600, 1000);
  figure(g, {mood: 'worried', look: 1, head: [300, 250], neck: [300, 310], hip: [300, 620],
    armL: [[210, 270], [255, 195]], armR: [[390, 270], [345, 195]],
    legL: [[260, 790], [230, 950]], legR: [[340, 790], [370, 950]]});
  sweat(g, 370, 175);
  save(c, 'operator-worried.png');
}

// 1 · A tall, untidy stack of research paper.
{
  const [c, g] = canvas(360, 900);
  for (let i = 0; i < 11; i++) {
    const y = 820 - i * 70, dx = Math.sin(i * 1.7) * 26;
    rect(g, 40 + dx, y, 280, 62, {fill: i % 3 ? '#ffffff' : '#FFF6DA', lw: 5, r: 6});
    pen(g, [[70 + dx, y + 22], [250 + dx, y + 20]], {w: 3, color: '#b5bac2'});
    pen(g, [[70 + dx, y + 40], [210 + dx, y + 42]], {w: 3, color: '#b5bac2'});
  }
  save(c, 'paper-stack.png');
}

// 2 · Operator calmly working at a laptop.
{
  const [c, g] = canvas(900, 820);
  pen(g, [[60, 640], [840, 640]], {w: 8});
  pen(g, [[120, 640], [110, 800]], {w: 7}); pen(g, [[780, 640], [790, 800]], {w: 7});
  rect(g, 470, 380, 330, 230, {fill: '#ffffff', lw: 7});
  pen(g, [[440, 640], [830, 640], [800, 610], [470, 610]], {w: 7});
  for (let i = 0; i < 3; i++) pen(g, [[510, 440 + i * 50], [720 - i * 30, 440 + i * 50]], {w: 4, color: '#9aa1aa'});
  figure(g, {mood: 'happy', look: 1, head: [290, 290], neck: [290, 350], hip: [240, 600],
    armL: [[360, 470], [470, 590]], armR: [[340, 500], [480, 600]],
    legL: [[350, 630], [340, 790]], legR: [[320, 640], [300, 795]]});
  save(c, 'operator-laptop.png');
}

// 2 · The assistant: a small four-point sparkle.
{
  const [c, g] = canvas(220, 220);
  const pts = [];
  for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, rr = i % 2 ? 26 : 92; pts.push([110 + Math.cos(a) * rr, 110 + Math.sin(a) * rr]); }
  g.fillStyle = YELLOW; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.fill();
  pen(g, pts, {w: 5});
  save(c, 'sparkle.png');
}

// 2 · A neat research card produced from the paper.
{
  const [c, g] = canvas(300, 210);
  rect(g, 15, 15, 270, 180, {fill: PAPER, lw: 6, r: 14});
  pen(g, [[50, 65], [210, 62]], {w: 6, color: NAVY});
  pen(g, [[50, 105], [180, 108]], {w: 4, color: '#9aa1aa'});
  pen(g, [[50, 140], [160, 138]], {w: 4, color: '#9aa1aa'});
  curve(g, [[205, 130], [228, 158], [262, 100]], {w: 9, color: GREEN});
  save(c, 'research-card.png');
}

// 3 · Founder delighted, arms forward to receive a copy.
{
  const [c, g] = canvas(700, 1000);
  figure(g, {mood: 'happy', look: 1, head: [300, 250], neck: [310, 310], hip: [300, 620],
    armL: [[420, 420], [540, 440]], armR: [[410, 450], [530, 480]],
    legL: [[260, 790], [230, 950]], legR: [[340, 790], [380, 950]], badgeDx: 12});
  save(c, 'founder-receive.png');
}

// 3 · Open box with flaps.
{
  const [c, g] = canvas(420, 360);
  rect(g, 60, 150, 300, 190, {fill: '#E9C48A', lw: 7, r: 8});
  pen(g, [[60, 150], [10, 90], [140, 70], [175, 150]], {w: 7});
  pen(g, [[360, 150], [410, 90], [280, 70], [245, 150]], {w: 7});
  pen(g, [[160, 230], [260, 230]], {w: 5, color: NAVY});
  save(c, 'box-open.png');
}

// 3 · The app as a small card: the familiar star-and-coin tarot face.
{
  const [c, g] = canvas(300, 440);
  rect(g, 15, 15, 270, 410, {fill: PAPER, lw: 7, r: 22});
  rect(g, 40, 40, 220, 360, {fill: null, stroke: NAVY, lw: 4, r: 14});
  const star = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 34 : 84; star.push([150 + Math.cos(a) * rr, 180 + Math.sin(a) * rr]); }
  g.fillStyle = NAVY; g.beginPath(); star.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.fill(); pen(g, star, {w: 4});
  ellipse(g, 150, 330, 38, 38, {fill: YELLOW, w: 5});
  save(c, 'app-card.png');
}

// 3 · Sticky note: the next small experiment.
{
  const [c, g] = canvas(300, 300);
  g.save(); g.translate(150, 150); g.rotate(-0.06);
  rect(g, -125, -125, 250, 250, {fill: YELLOW, lw: 6, r: 6});
  pen(g, [[-85, -50], [75, -58]], {w: 7, color: NAVY}); pen(g, [[-85, 10], [50, 2]], {w: 7, color: NAVY});
  curve(g, [[-85, 68], [-50, 95], [10, 35]], {w: 9, color: GREEN});
  g.restore();
  save(c, 'sticky-note.png');
}

// 4 · Operator reviewing a clipboard: the human in charge.
{
  const [c, g] = canvas(600, 1000);
  figure(g, {mood: 'curious', look: 1, head: [260, 250], neck: [270, 310], hip: [270, 620],
    armL: [[350, 400], [410, 360]], armR: [[340, 440], [400, 420]],
    legL: [[240, 790], [210, 950]], legR: [[310, 790], [340, 950]], badgeDx: 10});
  rect(g, 390, 300, 130, 170, {fill: PAPER, lw: 6, r: 8});
  for (let i = 0; i < 3; i++) curve(g, [[410, 350 + i * 38], [430, 368 + i * 38], [455, 335 + i * 38]], {w: 6, color: GREEN});
  save(c, 'operator-clipboard.png');
}

// 4 · Safeguard icons.
{
  const [c, g] = canvas(240, 240);                       // approval stamp
  ellipse(g, 120, 120, 100, 100, {fill: '#E8F4EA', stroke: GREEN, w: 9});
  curve(g, [[70, 125], [105, 160], [175, 85]], {w: 16, color: GREEN});
  save(c, 'icon-approval.png');
}
{
  const [c, g] = canvas(260, 240);                       // unsent envelope
  rect(g, 20, 50, 220, 150, {fill: '#ffffff', lw: 7, r: 10});
  pen(g, [[24, 58], [130, 140], [236, 58]], {w: 7});
  ellipse(g, 205, 60, 42, 42, {fill: '#ffffff', stroke: RED, w: 7});
  pen(g, [[188, 43], [222, 77]], {w: 8, color: RED}); pen(g, [[222, 43], [188, 77]], {w: 8, color: RED});
  save(c, 'icon-unsent.png');
}
{
  const [c, g] = canvas(260, 240);                       // locked folder
  rect(g, 20, 70, 220, 150, {fill: '#F6D98B', lw: 7, r: 10});
  pen(g, [[20, 80], [20, 50], [100, 50], [120, 70]], {w: 7});
  rect(g, 100, 120, 64, 56, {fill: NAVY, lw: 5, r: 6});
  curve(g, [[112, 120], [112, 98], [132, 88], [152, 98], [152, 120]], {w: 7});
  save(c, 'icon-locked.png');
}
{
  const [c, g] = canvas(300, 240);                       // version stack with back arrow
  for (let i = 0; i < 3; i++) rect(g, 70 + i * 22, 30 + i * 30, 150, 110, {fill: i === 2 ? '#ffffff' : '#EEF0F3', lw: 6, r: 8});
  curve(g, [[60, 200], [30, 160], [45, 110], [85, 95]], {w: 8, color: NAVY});
  pen(g, [[65, 80], [88, 96], [66, 115]], {w: 8, color: NAVY});
  save(c, 'icon-versions.png');
}

// 5 · Test flask for the synthetic demonstration.
{
  const [c, g] = canvas(240, 320);
  g.fillStyle = '#CFE7F7'; g.beginPath(); g.moveTo(60, 200); g.lineTo(180, 200); g.lineTo(215, 290); g.lineTo(25, 290); g.closePath(); g.fill();
  pen(g, [[95, 30], [95, 130], [25, 290], [215, 290], [145, 130], [145, 30]], {w: 7});
  pen(g, [[80, 30], [160, 30]], {w: 8});
  for (const [x, y] of [[110, 240], [140, 255], [120, 225]]) ellipse(g, x, y, 8, 8, {fill: '#ffffff', stroke: INK, w: 3});
  save(c, 'flask.png');
}
{
  const [c, g] = canvas(300, 240);                       // closed folder for OpenFor's data
  rect(g, 20, 60, 260, 160, {fill: '#E9EEF5', lw: 7, r: 10});
  pen(g, [[20, 70], [20, 40], [110, 40], [130, 60]], {w: 7});
  pen(g, [[70, 140], [230, 140]], {w: 5, color: '#9aa1aa'});
  save(c, 'folder-closed.png');
}

// 6 · Operator offering a hand.
{
  const [c, g] = canvas(600, 1000);
  figure(g, {mood: 'happy', look: 1, head: [260, 250], neck: [270, 310], hip: [270, 620],
    armL: [[370, 420], [470, 400]], armR: [[210, 450], [220, 560]],
    legL: [[240, 790], [210, 950]], legR: [[310, 790], [340, 950]], badgeDx: 10});
  save(c, 'operator-offer.png');
}
