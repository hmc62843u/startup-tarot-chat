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

// 1 · Slumped at laptop, head on hand.
{
  const [c, g] = canvas(900, 820);
  pen(g, [[60, 640], [840, 640]], {w: 8});               // desk top
  pen(g, [[120, 640], [110, 800]], {w: 7}); pen(g, [[780, 640], [790, 800]], {w: 7});
  rect(g, 470, 380, 330, 230, {fill: '#ffffff', lw: 7});  // laptop screen
  pen(g, [[440, 640], [830, 640], [800, 610], [470, 610]], {w: 7});
  for (let i = 0; i < 3; i++) pen(g, [[510, 440 + i * 50], [700 - i * 40, 440 + i * 50]], {w: 4, color: '#c9cdd3'});
  ellipse(g, 760, 410, 34, 34, {fill: RED, stroke: INK, w: 4});
  pen(g, [[752, 396], [760, 392], [768, 396], [768, 424], [752, 424], [752, 396]], {w: 4, color: '#ffffff', j: 0.3});
  figure(g, {mood: 'sad', look: 0.8, head: [300, 300], neck: [280, 360], hip: [200, 600],
    armL: [[330, 470], [330, 360]], armR: [[340, 520], [470, 600]],
    legL: [[330, 640], [320, 790]], legR: [[300, 650], [270, 795]]});
  sweat(g, 368, 225);
  save(c, 'founder-laptop.png');
}

// 2 · Confused founder, arms out, question marks.
{
  const [c, g] = canvas(700, 1000);
  figure(g, {mood: 'worried', head: [350, 250], neck: [350, 310], hip: [350, 620],
    armL: [[230, 380], [130, 330]], armR: [[470, 380], [570, 320]],
    legL: [[310, 790], [270, 950]], legR: [[390, 790], [430, 950]]});
  question(g, 210, 110, 1.3); question(g, 500, 90, 1.6, RED);
  sweat(g, 420, 170);
  save(c, 'founder-confused.png');
}

// 3 · Founder leaning to place a card.
{
  const [c, g] = canvas(800, 1000);
  figure(g, {mood: 'curious', look: 1, head: [330, 280], neck: [350, 340], hip: [300, 640],
    armL: [[420, 460], [560, 560]], armR: [[400, 470], [520, 600]],
    legL: [[280, 800], [250, 960]], legR: [[340, 800], [380, 960]], badgeDx: 18});
  save(c, 'founder-card.png');
}

// 4 · Excited founder pointing right.
{
  const [c, g] = canvas(760, 1000);
  figure(g, {mood: 'happy', look: 1, head: [300, 250], neck: [310, 310], hip: [300, 620],
    armL: [[480, 300], [660, 250]], armR: [[230, 450], [250, 560]],
    legL: [[350, 790], [420, 950]], legR: [[270, 790], [220, 950]], feet: 14});
  save(c, 'founder-pointing.png');
}

// Props
{
  const [c, g] = canvas(820, 1000);                      // three signposts
  pen(g, [[410, 120], [410, 980]], {w: 12});
  const boards = [[RED, -1, 200, -0.12], [YELLOW, 1, 380, 0.1], [GREEN, -1, 560, 0.06]];
  for (const [color, dir, y, tilt] of boards) {
    g.save(); g.translate(410, y); g.rotate(tilt);
    const x0 = dir < 0 ? -340 : 20, x1 = dir < 0 ? -20 : 340, tip = dir < 0 ? x0 - 50 : x1 + 50;
    g.fillStyle = color; g.beginPath();
    g.moveTo(x0, -50); g.lineTo(x1, -50); g.lineTo(dir > 0 ? tip : x1, 0); g.lineTo(x1, 50); g.lineTo(x0, 50); g.lineTo(dir < 0 ? tip : x0, 0); g.closePath(); g.fill();
    pen(g, [[x0, -50], [x1, -50], [dir > 0 ? tip : x1, 0], [x1, 50], [x0, 50], [dir < 0 ? tip : x0, 0], [x0, -50]], {w: 6});
    g.restore();
  }
  save(c, 'signposts.png');
}
{
  const [c, g] = canvas(420, 640);                      // tarot card
  rect(g, 20, 20, 380, 600, {fill: PAPER, lw: 8, r: 26});
  rect(g, 50, 50, 320, 540, {fill: null, stroke: NAVY, lw: 4, r: 16});
  const star = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 50 : 120; star.push([210 + Math.cos(a) * rr, 260 + Math.sin(a) * rr]); }
  g.fillStyle = NAVY; g.beginPath(); star.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.fill(); pen(g, star, {w: 5});
  ellipse(g, 210, 470, 52, 52, {fill: YELLOW, w: 6}); ellipse(g, 210, 470, 30, 30, {fill: null, w: 4});
  save(c, 'tarot-card.png');
}
{
  const [c, g] = canvas(640, 820);                      // checklist base without marks
  rect(g, 20, 20, 600, 780, {fill: PAPER, lw: 8, r: 22});
  pen(g, [[250, 10], [390, 10], [390, 50], [250, 50], [250, 10]], {w: 6});
  for (let i = 0; i < 5; i++) {
    const y = 140 + i * 135;
    rect(g, 70, y - 40, 80, 80, {fill: '#ffffff', lw: 5, r: 10});
    curve(g, [[190, y], [300, y - 8], [420, y + 6], [540 - i * 22, y - 4]], {w: 5, color: '#9aa1aa'});
  }
  save(c, 'checklist.png');
}
{
  const [c, g] = canvas(140, 140);
  curve(g, [[22, 72], [55, 112], [120, 22]], {w: 14, color: GREEN});
  save(c, 'mark-tick.png');
}
{
  const [c, g] = canvas(140, 140);
  pen(g, [[28, 28], [112, 112]], {w: 14, color: RED}); pen(g, [[112, 28], [28, 112]], {w: 14, color: RED});
  save(c, 'mark-cross.png');
}
{
  const [c, g] = canvas(140, 140);
  question(g, 70, 70, 1.4, YELLOW);
  save(c, 'mark-question.png');
}
{
  const [c, g] = canvas(260, 190);                      // envelope
  rect(g, 15, 15, 230, 160, {fill: '#ffffff', lw: 6, r: 10});
  pen(g, [[18, 22], [130, 110], [242, 22]], {w: 6});
  save(c, 'envelope.png');
}

// 5 · Founder striding right, one hand raised to carry the note.
{
  const [c, g] = canvas(700, 1000);
  figure(g, {mood: 'happy', look: 1, head: [300, 260], neck: [315, 320], hip: [300, 630],
    armL: [[400, 260], [470, 160]], armR: [[230, 450], [200, 560]],
    legL: [[380, 790], [470, 940]], legR: [[260, 800], [190, 950]], feet: 14, badgeDx: 10});
  save(c, 'founder-walking.png');
}

// 6 · Founder cheering, both arms up.
{
  const [c, g] = canvas(700, 1000);
  figure(g, {mood: 'happy', head: [350, 260], neck: [350, 320], hip: [350, 630],
    armL: [[250, 230], [190, 110]], armR: [[450, 230], [510, 110]],
    legL: [[300, 800], [260, 950]], legR: [[400, 800], [440, 950]]});
  for (const [x, y, a] of [[130, 70, -2.4], [570, 70, -0.7], [110, 200, 3.0], [590, 200, 0.1]]) pen(g, [[x, y], [x + Math.cos(a) * 40, y + Math.sin(a) * 40]], {w: 6, color: YELLOW});
  save(c, 'founder-cheer.png');
}
{
  const [c, g] = canvas(360, 360);                      // sticky note
  g.save(); g.translate(180, 180); g.rotate(-0.06);
  rect(g, -150, -150, 300, 300, {fill: YELLOW, lw: 6, r: 6});
  pen(g, [[-100, -60], [90, -70]], {w: 7, color: NAVY}); pen(g, [[-100, 10], [60, 0]], {w: 7, color: NAVY});
  curve(g, [[-100, 80], [-60, 110], [10, 40]], {w: 9, color: GREEN});
  g.restore();
  save(c, 'sticky-note.png');
}
{
  const [c, g] = canvas(900, 620);                      // browser window
  rect(g, 20, 20, 860, 580, {fill: '#ffffff', lw: 8, r: 24});
  pen(g, [[22, 110], [878, 110]], {w: 6});
  for (const [x, col] of [[70, RED], [115, YELLOW], [160, GREEN]]) ellipse(g, x, 65, 15, 15, {fill: col, w: 4});
  rect(g, 220, 45, 600, 42, {fill: '#f2f3f5', lw: 4, r: 20});
  rect(g, 80, 160, 330, 380, {fill: PAPER, lw: 6, r: 18});
  const star = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 30 : 72; star.push([245 + Math.cos(a) * rr, 320 + Math.sin(a) * rr]); }
  g.fillStyle = NAVY; g.beginPath(); star.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.fill(); pen(g, star, {w: 4});
  for (let i = 0; i < 4; i++) curve(g, [[470, 200 + i * 90], [600, 192 + i * 90], [780 - i * 30, 204 + i * 90]], {w: 6, color: '#9aa1aa'});
  save(c, 'browser.png');
}
