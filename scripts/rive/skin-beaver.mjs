#!/usr/bin/env node
// Skins the beaver in rive/hero-walk/hero.rml to the bones written by hand in
// that file. Usage: node scripts/rive/skin-beaver.mjs [path/to/hero.rml]
//
// Rive's docs ask that no script writes the markup, with one exception this
// script stays inside: computed data nobody edits by hand (skin binds and
// vertex weights). It only replaces the <Skin>, <Weight> and <CubicWeight>
// elements of the beaver's paths; every other line is left as written, so it
// can be run again after a bone moves.
//
// The weights come from ONE field over artboard space: a vertex's bone
// influences depend only on where it sits at rest. The ink silhouette, the
// fills on top of it, their detail shapes and the clip-path copies therefore
// bend identically, and outlines can't drift off their fills.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILE = resolve(process.argv[2] ?? 'rive/hero-walk/hero.rml');
const BEAVER_NODE = 'beaver-long-stride-grip';
/** Tendon order. Must match the bone names in hero.rml. */
const BONES = ['Body', 'Head', 'Arm', 'Tail', 'BackLeg', 'BackFoot', 'FrontLeg', 'FrontFoot'];

// ---------------------------------------------------------------- weight field
// All coordinates are artboard units (the card is 1348 x 1100).
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smooth = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
/** Signed distance of p from the line a→b, positive on the side of `inside`. */
function side(a, b, inside) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const raw = (p) => (dx * (p[1] - a[1]) - dy * (p[0] - a[0])) / len;
  const sign = Math.sign(raw(inside));
  return (p) => sign * raw(p);
}
function segment(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  return (p) => {
    const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
    const c = clamp01(t);
    return { t, dist: Math.hypot(p[0] - (a[0] + c * dx), p[1] - (a[1] + c * dy)) };
  };
}

// Where each limb leaves the body; tuned against a gridded render of the card.
const frontHip = side([842, 512], [788, 648], [900, 580]);
const frontAnkle = side([884, 540], [886, 650], [950, 520]);
const backHip = side([548, 665], [700, 690], [600, 720]);
const backAnkle = side([515, 700], [660, 712], [580, 745]);
const arm = segment([612, 382], [498, 503]);

/** Bone influences at artboard point p, in BONES order (sums to 1). */
function field(p) {
  const [x, y] = p;
  // The front leg joins the body along a tall seam, so its bend is spread
  // well into the body (-40) rather than hinged on the seam.
  // y > ~430 keeps the log on the shoulder (above) out; the raised toes reach y ≈ 470.
  const front = smooth(-40, 30, frontHip(p)) * smooth(410, 440, y);
  // The back leg starts right of the tail; where their outlines merge (x < 545) the tail wins.
  const back = smooth(-8, 26, backHip(p)) * smooth(540, 560, x) * (1 - smooth(700, 730, x));
  const e = ((x - 455) / 118) ** 2 + ((y - 602) / 90) ** 2;
  const tail = (1 - smooth(0.8, 1.15, e)) * (1 - back);
  const a = arm(p);
  const armW = (1 - smooth(40, 70, a.dist)) * smooth(0.05, 0.4, a.t) * (1 - front) * (1 - back) * (1 - tail);
  const head = 1 - smooth(305, 360, y);

  let parts = { front, back, tail, arm: armW, head };
  const sum = front + back + tail + armW + head;
  if (sum > 1) parts = Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, v / sum]));
  const body = Math.max(0, 1 - Object.values(parts).reduce((s, v) => s + v, 0));
  const ff = smooth(-10, 14, frontAnkle(p));
  const bf = smooth(-8, 12, backAnkle(p));
  return [
    body,
    parts.head,
    parts.arm,
    parts.tail,
    parts.back * (1 - bf),
    parts.back * bf,
    parts.front * (1 - ff),
    parts.front * ff,
  ];
}

/** Top four influences, packed as Rive wants them (1-based tendon bytes, values summing to 255). */
function pack(weights) {
  const top = weights
    .map((w, i) => ({ w, i }))
    .filter((e) => e.w > 1e-4)
    .sort((a, b) => b.w - a.w)
    .slice(0, 4);
  const total = top.reduce((s, e) => s + e.w, 0);
  const bytes = top.map((e) => Math.round((e.w / total) * 255));
  bytes[0] += 255 - bytes.reduce((s, b) => s + b, 0);
  let indices = 0;
  let values = 0;
  top.forEach((e, slot) => {
    if (bytes[slot] <= 0) return;
    indices += (e.i + 1) * 256 ** slot;
    values += bytes[slot] * 256 ** slot;
  });
  return { indices, values };
}

// ------------------------------------------------------------------ transforms
// [a, b, c, d, tx, ty]: (x, y) -> (a x + c y + tx, b x + d y + ty)
const IDENTITY = [1, 0, 0, 1, 0, 0];
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const num = (attrs, key, dflt = 0) => (attrs[key] === undefined ? dflt : Number(attrs[key]));
function local(attrs) {
  const r = num(attrs, 'rotation');
  const sx = num(attrs, 'scaleX', 1);
  const sy = num(attrs, 'scaleY', 1);
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c * sx, s * sx, -s * sy, c * sy, num(attrs, 'x'), num(attrs, 'y')];
}
const parseAttrs = (s) => Object.fromEntries([...s.matchAll(/([\w:]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const fmt = (v) => String(Number(v.toFixed(6)));

// --------------------------------------------------------------------- the file
const src = readFileSync(FILE, 'utf8');
const lines = src.split(/\r?\n/);

// 1. Bones: world transforms from the hand-written RootBone/Bone chains.
const bones = new Map();
{
  const stack = [];
  for (const line of lines) {
    const m = line.match(/^\s*<(\/?)(RootBone|Bone)\b([^>]*?)(\/?)>/);
    if (!m) continue;
    if (m[1]) {
      stack.pop();
      continue;
    }
    const attrs = parseAttrs(m[3]);
    const parent = stack[stack.length - 1];
    let world;
    if (m[2] === 'RootBone') world = local(attrs);
    else {
      const tip = mul(parent.world, [1, 0, 0, 1, parent.length, 0]);
      world = mul(tip, local({ rotation: attrs.rotation }));
    }
    const bone = { world, length: num(attrs, 'length'), id: attrs.id };
    bones.set(attrs.name, bone);
    if (!m[4]) stack.push(bone);
  }
}
for (const name of BONES) {
  if (!bones.has(name)) throw new Error(`bone "${name}" not found in ${FILE}`);
  if (!bones.get(name).id) throw new Error(`bone "${name}" needs an id`);
}

// 2. Walk the tree; rewrite every PointsPath under the beaver or its clip copies.
const out = [];
const stack = []; // { tag, world, skinned }
let path = null; // PointsPath being rewritten
let vertex = null; // open vertex (written as a block, with children)
let inSkin = false;
let count = 0;

const isBeaverRoot = (a) => a.name === BEAVER_NODE || (a.name?.startsWith('clip-') && a.x === '334.021');

function emitVertex(v) {
  const p = apply(v.world, v.x, v.y);
  const own = pack(field(p));
  const pad = v.indent + '    ';
  let child;
  if (v.tag === 'StraightVertex') {
    child = `${pad}<Weight values="${own.values}" indices="${own.indices}"/>`;
  } else {
    const a = v.attrs;
    let inRot, inDist, outRot, outDist;
    if (v.tag === 'CubicDetachedVertex') {
      [inRot, inDist, outRot, outDist] = [num(a, 'inRotation'), num(a, 'inDistance'), num(a, 'outRotation'), num(a, 'outDistance')];
    } else if (v.tag === 'CubicMirroredVertex') {
      [outRot, outDist] = [num(a, 'rotation'), num(a, 'distance')];
      [inRot, inDist] = [outRot + Math.PI, outDist];
    } else {
      [outRot, outDist, inDist] = [num(a, 'rotation'), num(a, 'outDistance'), num(a, 'inDistance')];
      inRot = outRot + Math.PI;
    }
    const pin = pack(field(apply(v.world, v.x + Math.cos(inRot) * inDist, v.y + Math.sin(inRot) * inDist)));
    const pout = pack(field(apply(v.world, v.x + Math.cos(outRot) * outDist, v.y + Math.sin(outRot) * outDist)));
    child =
      `${pad}<CubicWeight values="${own.values}" indices="${own.indices}" ` +
      `inValues="${pin.values}" inIndices="${pin.indices}" outValues="${pout.values}" outIndices="${pout.indices}"/>`;
  }
  out.push(`${v.indent}<${v.tag}${v.attrText}>`, child, `${v.indent}</${v.tag}>`);
}

function emitSkin(indent, world) {
  const pad = indent + '    ';
  const [a, b, c, d, tx, ty] = world;
  out.push(`${indent}<Skin xx="${fmt(a)}" xy="${fmt(b)}" yx="${fmt(c)}" yy="${fmt(d)}" tx="${fmt(tx)}" ty="${fmt(ty)}" name="Skin">`);
  for (const name of BONES) {
    const w = bones.get(name).world;
    out.push(
      `${pad}<Tendon boneId="${bones.get(name).id}" xx="${fmt(w[0])}" xy="${fmt(w[1])}" yx="${fmt(w[2])}" yy="${fmt(w[3])}" ` +
        `tx="${fmt(w[4])}" ty="${fmt(w[5])}" name="${name}"/>`,
    );
  }
  out.push(`${indent}</Skin>`);
}

for (const line of lines) {
  const m = line.match(/^(\s*)<(\/?)(\w+)\b([^>]*?)(\/?)>\s*$/);
  if (!m) {
    if (!(path && (inSkin || vertex))) out.push(line);
    continue;
  }
  const [, indent, closing, tag, attrText, selfClosing] = m;

  if (path) {
    // Inside a skinned PointsPath: drop old skin data, rebuild vertices.
    if (tag === 'Skin') {
      inSkin = !closing && !selfClosing;
      continue;
    }
    if (inSkin) continue;
    if (tag === 'Weight' || tag === 'CubicWeight') continue;
    if (/Vertex$/.test(tag)) {
      if (closing) {
        emitVertex(vertex);
        vertex = null;
        continue;
      }
      const attrs = parseAttrs(attrText);
      const v = { tag, attrs, attrText, indent, world: path.world, x: num(attrs, 'x'), y: num(attrs, 'y') };
      if (selfClosing) emitVertex(v);
      else vertex = v;
      continue;
    }
    if (tag === 'PointsPath' && closing) {
      emitSkin(indent + '    ', path.world);
      out.push(line);
      path = null;
      count++;
      continue;
    }
    out.push(line);
    continue;
  }

  out.push(line);
  if (closing) {
    stack.pop();
    continue;
  }
  const attrs = parseAttrs(attrText);
  const parent = stack[stack.length - 1];
  const world = mul(parent?.world ?? IDENTITY, local(attrs));
  const skinned = (parent?.skinned ?? false) || (tag === 'Node' && isBeaverRoot(attrs));
  if (tag === 'PointsPath' && skinned && !selfClosing) {
    path = { world };
    continue;
  }
  if (!selfClosing) stack.push({ tag, world, skinned });
}

writeFileSync(FILE, out.join('\n'));
console.log(`skinned ${count} paths to ${BONES.length} bones in ${FILE}`);
