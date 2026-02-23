// Ancient Roman City — Hyperfy script
// Performance-conscious, static colliders with some kinematic actors

// Randomness (deterministic)
const rng = prng(1066);
const R = (min, max, dp = 0) => rng(min, max, dp);
const deg = (a) => (a * Math.PI) / 180;

// Root
const city = app.create('group');
app.add(city);

// Materials/Palette
const MAT = {
  travertine: '#e8dcc8',
  marble: '#f2f2f2',
  plaster: '#f7f1e7',
  tile: '#b23a34',
  wood: '#7a4a2e',
  bronze: '#8a6f3b',
  stone: '#cbb8a0',
  basalt: '#2c2c2c',
  water: '#4fa3ff',
  greenery: '#4a7a3a',
  sand: '#d8c8a8',
  brick: '#a55233',
  shadow: '#808080',
};

// Helpers
const add = (node, parent = city) => {
  parent.add(node);
  return node;
};

const makeBox = (
  w,
  h,
  d,
  color = MAT.stone,
  physics = 'static',
  y = h / 2
) => {
  return app.create('prim', {
    type: 'box',
    size: [w, h, d],
    color,
    physics,
    position: [0, y, 0],
  });
};

const makePlaneXZ = (w, d, color, y = 0, physics = 'static') => {
  const p = app.create('prim', {
    type: 'plane',
    size: [w, d],
    color,
    physics,
  });
  p.rotation.x = -Math.PI / 2;
  p.position.y = y;
  return p;
};

const makeCylinder = (
  rTop,
  rBtm,
  h,
  color = MAT.stone,
  physics = 'static',
  y = h / 2
) => {
  return app.create('prim', {
    type: 'cylinder',
    size: [rTop, rBtm, h],
    color,
    physics,
    position: [0, y, 0],
  });
};

const makeCone = (r, h, color = MAT.tile, physics = 'static', y = h / 2) => {
  return app.create('prim', {
    type: 'cone',
    size: [r, h],
    color,
    physics,
    position: [0, y, 0],
  });
};

const makeTorus = (radius, tube, color = MAT.bronze, physics = 'static') => {
  return app.create('prim', {
    type: 'torus',
    size: [radius, tube],
    color,
    physics,
    position: [0, 0, 0],
  });
};

const setPos = (node, x, y, z) => {
  node.position.set(x, y, z);
  return node;
};

const setRot = (node, x, y, z) => {
  node.rotation.set(x, y, z);
  return node;
};

// Ground (city platform)
const ground = makePlaneXZ(480, 480, MAT.sand, 0, 'static');
add(ground, city);

// Cardo/Decumanus and street grid
const roads = app.create('group');
add(roads);

// Road builder
const buildRoad = (x, z, length, width, dir) => {
  // dir: 'x' or 'z'
  const road = makeBox(
    dir === 'x' ? length : width,
    0.1,
    dir === 'x' ? width : length,
    MAT.basalt,
    'static',
    0.05
  );
  setPos(road, x, 0.05, z);
  roads.add(road);

  // Travertine sidewalks (0.8 m each side)
  const sw = 0.8;
  const sideA =
    dir === 'x'
      ? makeBox(length, 0.08, sw, MAT.travertine, 'static', 0.04)
      : makeBox(sw, 0.08, length, MAT.travertine, 'static', 0.04);
  const sideB = sideA.clone();
  if (dir === 'x') {
    setPos(sideA, x, 0.04, z - width / 2 - sw / 2);
    setPos(sideB, x, 0.04, z + width / 2 + sw / 2);
  } else {
    setPos(sideA, x - width / 2 - sw / 2, 0.04, z);
    setPos(sideB, x + width / 2 + sw / 2, 0.04, z);
  }
  roads.add(sideA);
  roads.add(sideB);

  return road;
};

// Main axes
const CARDOW = 10;
const DECUW = 10;
buildRoad(0, 0, 440, CARDOW, 'z'); // Cardo Maximus (N-S)
buildRoad(0, 0, 440, DECUW, 'x'); // Decumanus Maximus (E-W)

// Secondary grid
const grid = [];
for (let gx = -160; gx <= 160; gx += 40) {
  if (gx === 0) continue;
  grid.push(buildRoad(gx, 0, 440, 6, 'z'));
}
for (let gz = -160; gz <= 160; gz += 40) {
  if (gz === 0) continue;
  grid.push(buildRoad(0, gz, 440, 6, 'x'));
}

// Forum precinct
const forum = app.create('group');
add(forum);
forum.position.set(0, 0, -20);

const forumW = 120;
const forumD = 70;
const forumPave = makePlaneXZ(
  forumW,
  forumD,
  MAT.travertine,
  0.02,
  'static'
);
add(forumPave, forum);

// Opus spicatum banding (approximate: angled stone bands)
const spBandCount = 10;
for (let i = 0; i < spBandCount; i++) {
  const w = forumW - 6;
  const band = makeBox(
    w,
    0.02,
    0.5,
    '#d8cdb2',
    'static',
    0.02 + 0.001 * (i + 1)
  );
  const offsetZ =
    -forumD / 2 + 6 + (i * (forumD - 12)) / (spBandCount - 1);
  forum.add(band);
  setPos(band, 0, band.position.y, offsetZ);
  setRot(band, 0, deg(i % 2 ? 35 : -35), 0);
}

// Column prototype (simple Doric-ish)
const createColumnProto = (h = 7, r = 0.35, shaft = MAT.marble) => {
  const g = app.create('group');
  const base = makeCylinder(r * 1.15, r * 1.15, 0.25, shaft);
  setPos(base, 0, 0.125, 0);
  g.add(base);
  const col = makeCylinder(r, r, h, shaft);
  setPos(col, 0, h / 2 + 0.25, 0);
  g.add(col);
  const abacus = makeBox(r * 3, 0.12, r * 3, shaft);
  setPos(abacus, 0, 0.25 + h + 0.06, 0);
  g.add(abacus);
  return g;
};

// Entablature beam
const beam = (len, thick = 0.4, depth = 0.8, color = MAT.marble) => {
  const b = makeBox(len, thick, depth, color);
  setPos(b, 0, thick / 2, 0);
  return b;
};

// Simple gabled roof
const gabledRoof = (w, d, h, color = MAT.tile) => {
  const g = app.create('group');
  const halfD = d / 2;
  const slope = Math.atan(h / halfD);
  const len = Math.sqrt(h * h + halfD * halfD);

  const left = makeBox(w + 0.6, 0.1, len, color);
  const right = makeBox(w + 0.6, 0.1, len, color);

  setPos(left, 0, h / 2, -halfD / 2);
  setPos(right, 0, h / 2, halfD / 2);

  left.rotation.x = slope;
  right.rotation.x = -slope;

  g.add(left);
  g.add(right);
  return g;
};

// Rectangular temple
const buildTempleRect = (opts) => {
  const {
    name = 'Temple',
    w = 20,
    d = 30,
    stylobateH = 1.2,
    colH = 8,
    colR = 0.4,
    colsFront = 8,
    colsSide = 12,
    pos = [0, 0, 0],
  } = opts;

  const g = app.create('group');
  // g.name = name;

  // Stylobate (3 steps)
  const stepH = stylobateH / 3;
  const stepExt = 1.2;
  for (let i = 0; i < 3; i++) {
    const step = makeBox(
      w + stepExt * (i + 1) * 2,
      stepH,
      d + stepExt * (i + 1) * 2,
      MAT.travertine
    );
    setPos(step, 0, stepH / 2 + i * stepH, 0);
    g.add(step);
  }

  const topY = stylobateH;

  // Cella
  const cella = makeBox(w - 4, colH - 2, d - 6, MAT.plaster);
  setPos(cella, 0, topY + (colH - 2) / 2, 0);
  g.add(cella);

  // Colonnade
  const colProto = createColumnProto(colH, colR);
  const colGroup = app.create('group');

  // Front/back rows
  for (let i = 0; i < colsFront; i++) {
    const t = colProto.clone(true);
    const x = (-w / 2 + 2) + (i * (w - 4)) / (colsFront - 1);
    setPos(t, x, topY, -d / 2 + 2);
    colGroup.add(t);
    const tb = colProto.clone(true);
    setPos(tb, x, topY, d / 2 - 2);
    colGroup.add(tb);
  }
  // Side rows
  for (let k = 0; k < colsSide; k++) {
    const z = (-d / 2 + 2) + (k * (d - 4)) / (colsSide - 1);
    const tl = colProto.clone(true);
    setPos(tl, -w / 2 + 2, topY, z);
    colGroup.add(tl);
    const tr = colProto.clone(true);
    setPos(tr, w / 2 - 2, topY, z);
    colGroup.add(tr);
  }
  g.add(colGroup);

  // Entablature beams
  const beamY = topY + colH + 0.25;
  const bFront = beam(w, 0.5, 1.2);
  setPos(bFront, 0, beamY, -d / 2 + 2);
  const bBack = bFront.clone();
  setPos(bBack, 0, beamY, d / 2 - 2);
  const bLeft = beam(d, 0.5, 1.2);
  setPos(bLeft, -w / 2 + 2, beamY, 0);
  bLeft.rotation.y = Math.PI / 2;
  const bRight = bLeft.clone();
  setPos(bRight, w / 2 - 2, beamY, 0);

  g.add(bFront);
  g.add(bBack);
  g.add(bLeft);
  g.add(bRight);

  // Roof
  const roof = gabledRoof(w + 1.4, d - 2, 4.5, MAT.tile);
  setPos(roof, 0, beamY + 1.5 + 2.2, 0);
  g.add(roof);

  // Pediment face (simple thin box suggestion)
  const ped = makeBox(w + 1.2, 0.2, 2, MAT.marble);
  setPos(ped, 0, beamY + 1.2, -d / 2 + 2.1);
  g.add(ped);
  const ped2 = ped.clone();
  setPos(ped2, 0, beamY + 1.2, d / 2 - 2.1);
  g.add(ped2);

  setPos(g, pos[0], pos[1], pos[2]);
  return g;
};

// Circular (Vesta) temple
const buildTempleCircular = (opts) => {
  const {
    name = 'Temple of Vesta',
    radius = 7,
    colH = 7,
    colR = 0.32,
    colCount = 14,
    pos = [0, 0, 0],
  } = opts;

  const g = app.create('group');
  // g.name = name;

  const styl = makeBox(radius * 2 + 2, 1, radius * 2 + 2, MAT.travertine);
  setPos(styl, 0, 0.5, 0);
  g.add(styl);

  const cella = makeCylinder(radius * 0.65, radius * 0.65, colH - 1.4, MAT.plaster);
  setPos(cella, 0, 0.5 + (colH - 1.4) / 2, 0);
  g.add(cella);

  const colProto = createColumnProto(colH, colR);
  const cols = app.create('group');
  for (let i = 0; i < colCount; i++) {
    const a = (i / colCount) * Math.PI * 2;
    const x = Math.cos(a) * (radius - 0.7);
    const z = Math.sin(a) * (radius - 0.7);
    const c = colProto.clone(true);
    setPos(c, x, 1, z);
    cols.add(c);
  }
  g.add(cols);

  const roof = makeCone(radius + 0.6, 4.5, MAT.tile);
  setPos(roof, 0, 1 + colH + 2.25, 0);
  g.add(roof);

  setPos(g, pos[0], pos[1], pos[2]);
  return g;
};

// Basilica (courthouse)
const buildBasilica = (opts) => {
  const {
    name = 'Basilica',
    w = 30,
    d = 60,
    h = 14,
    pos = [0, 0, 0],
  } = opts;

  const g = app.create('group');
  // g.name = name;

  const plinth = makeBox(w + 2, 1, d + 2, MAT.travertine);
  setPos(plinth, 0, 0.5, 0);
  g.add(plinth);

  const hall = makeBox(w, h, d, MAT.plaster);
  setPos(hall, 0, 0.5 + h / 2, 0);
  g.add(hall);

  // Interior colonnades (two rows)
  const colProto = createColumnProto(8, 0.35);
  const rows = 2;
  const perRow = 8;
  const aisleOffset = w / 3.5;
  const colY = 0.5;
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < perRow; i++) {
      const c = colProto.clone(true);
      const x = r === 0 ? -aisleOffset : aisleOffset;
      const z = -d / 2 + 6 + (i * (d - 12)) / (perRow - 1);
      setPos(c, x, colY, z);
      g.add(c);
    }
  }

  const roof = gabledRoof(w + 0.8, d + 0.8, 5, MAT.tile);
  setPos(roof, 0, 0.5 + h + 2.6, 0);
  g.add(roof);

  // Entrance portico (front, south side)
  const port = app.create('group');
  const pCols = 6;
  for (let i = 0; i < pCols; i++) {
    const col = createColumnProto(7.5, 0.34).clone(true);
    const x = (-w / 2 + 3) + (i * (w - 6)) / (pCols - 1);
    setPos(col, x, 0.5, -d / 2 - 2);
    port.add(col);
  }
  const pBeam = beam(w, 0.4, 1.2);
  setPos(pBeam, 0, 8.4, -d / 2 - 2);
  port.add(pBeam);
  g.add(port);

  setPos(g, pos[0], pos[1], pos[2]);
  return g;
};

// Curia (Senate House)
const buildCuria = (pos) => {
  const g = app.create('group');
  const plinth = makeBox(20, 0.8, 16, MAT.travertine);
  setPos(plinth, 0, 0.4, 0);
  g.add(plinth);
  const hall = makeBox(18, 12, 14, MAT.plaster);
  setPos(hall, 0, 0.4 + 6, 0);
  g.add(hall);
  const roof = gabledRoof(18, 14, 4.2, MAT.tile);
  setPos(roof, 0, 0.4 + 12 + 2.2, 0);
  g.add(roof);
  setPos(g, pos[0], pos[1], pos[2]);
  return g;
};

// Rostra (speaker's platform)
const buildRostra = (pos, w = 28, d = 8, h = 2.2) => {
  const g = app.create('group');
  const base = makeBox(w, h, d, MAT.travertine);
  setPos(base, 0, h / 2, 0);
  g.add(base);

  // Stairs
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const t = makeBox(
      w * 0.9,
      h / steps,
      (d / steps) * (i + 1),
      MAT.travertine
    );
    setPos(t, 0, (h / steps) * (i + 0.5), -d / 2 - (t.size[2] / 2));
    g.add(t);
  }
  setPos(g, pos[0], pos[1], pos[2]);
  return g;
};

// Triumphal arch (triple bay, simplified)
const buildTriumphalArch = (pos) => {
  const g = app.create('group');
  const w = 20;
  const d = 6;
  const h = 14;

  // Piers
  const pierW = 3.2;
  const pier = makeBox(pierW, h, d, MAT.marble);
  const pl = pier.clone();
  const pr = pier.clone();
  setPos(pl, -w / 2 + pierW / 2, h / 2, 0);
  setPos(pr, w / 2 - pierW / 2, h / 2, 0);
  g.add(pl);
  g.add(pr);

  // Central opening jambs
  const jambW = 2.2;
  const jl = makeBox(jambW, h, d, MAT.marble);
  const jr = jl.clone();
  setPos(jl, -jambW / 2 - 2.4, h / 2, 0);
  setPos(jr, jambW / 2 + 2.4, h / 2, 0);
  g.add(jl);
  g.add(jr);

  // Lintel and attic
  const lintel = makeBox(w - 2, 1.2, d, MAT.marble);
  setPos(lintel, 9, h - 0.6, 0);
  lintel.position.x = 0; // center
  g.add(lintel);

  const attic = makeBox(w, 2.2, d, MAT.marble);
  setPos(attic, 0, h + 1.1 + 1.2, 0);
  g.add(attic);

  setPos(g, pos[0], pos[1], pos[2]);
  return g;
};

// Forum composition
const basilica = buildBasilica({
  name: 'Basilica',
  w: 32,
  d: 62,
  h: 14,
  pos: [0, 0, -20],
});
forum.add(basilica);

const templeSaturn = buildTempleRect({
  name: 'Temple of Saturn',
  w: 22,
  d: 32,
  colH: 8.5,
  colsFront: 8,
  colsSide: 11,
  pos: [-40, 0, -24],
});
forum.add(templeSaturn);

const templeVesta = buildTempleCircular({
  name: 'Temple of Vesta',
  radius: 6.5,
  colH: 7.2,
  colCount: 12,
  pos: [36, 0, -18],
});
forum.add(templeVesta);

const curia = buildCuria([40, 0, 16]);
forum.add(curia);

const rostra = buildRostra([-2, 0, 18], 30, 8, 2.2);
forum.add(rostra);

const arch = buildTriumphalArch([0, 0, -58]);
forum.add(arch);

// Statues and columns in forum
const statue = () => {
  const g = app.create('group');
  const plinth = makeBox(1.6, 1.2, 1.6, MAT.marble);
  setPos(plinth, 0, 0.6, 0);
  g.add(plinth);
  const body = makeCylinder(0.45, 0.45, 1.6, MAT.marble);
  setPos(body, 0, 1.2 + 0.8, 0);
  g.add(body);
  const head = app.create('prim', {
    type: 'sphere',
    size: [0.35],
    color: MAT.marble,
    physics: 'static',
    position: [0, 1.2 + 1.6 + 0.35, 0],
  });
  g.add(head);
  return g;
};
for (let i = 0; i < 6; i++) {
  const s = statue();
  const x = -forumW / 2 + 10 + i * 16;
  const z = -4;
  setPos(s, x, 0, z);
  forum.add(s);
}

// Hills (Capitoline NW, Palatine SW of forum)
const hills = app.create('group');
add(hills);

const makeHillTerrace = (x, z, w, d, h, steps = true) => {
  const g = app.create('group');
  const base = makeBox(w, h, d, MAT.stone);
  setPos(base, 0, h / 2, 0);
  g.add(base);
  if (steps) {
    const stair = app.create('group');
    const sCount = 20;
    const sH = h / sCount;
    const sD = 0.6;
    for (let i = 0; i < sCount; i++) {
      const step = makeBox(3.5, sH, sD * (i + 1), MAT.travertine);
      setPos(step, 0, sH / 2 + i * sH, -d / 2 - (sD * (i + 1)) / 2);
      stair.add(step);
    }
    setPos(stair, -w / 4, 0, 0);
    g.add(stair);
  }
  setPos(g, x, 0, z);
  hills.add(g);
  return g;
};

// Capitoline
const cap = makeHillTerrace(-100, -80, 50, 60, 12, true);
// Temple of Jupiter Optimus Maximus (approx.)
const templeJupiter = buildTempleRect({
  name: 'Temple of Jupiter',
  w: 28,
  d: 40,
  colH: 9,
  colsFront: 8,
  colsSide: 12,
  pos: [cap.position.x, 12, cap.position.z],
});
hills.add(templeJupiter);

// Palatine
const pal = makeHillTerrace(-110, -10, 60, 80, 10, true);
// Palatine villa mass
const palHouse = makeBox(38, 9, 30, MAT.plaster);
setPos(palHouse, pal.position.x, 10 + 4.5, pal.position.z + 6);
hills.add(palHouse);
const palRoof = gabledRoof(38, 30, 4.5, MAT.tile);
setPos(
  palRoof,
  pal.position.x,
  10 + 9 + 2.25,
  pal.position.z + 6
);
hills.add(palRoof);

// Macellum (market)
const buildMacellum = (pos) => {
  const g = app.create('group');
  const w = 36;
  const d = 36;
  const h = 8;

  const plinth = makeBox(w + 2, 0.8, d + 2, MAT.travertine);
  setPos(plinth, 0, 0.4, 0);
  g.add(plinth);

  const wall = makeBox(w, h, d, MAT.plaster);
  setPos(wall, 0, 0.4 + h / 2, 0);
  g.add(wall);

  // Courtyard cut (simulate by inner low box courtyard)
  const yard = makePlaneXZ(w - 8, d - 8, '#dcd2c0', 0.05, 'static');
  setPos(yard, 0, 0.05, 0);
  g.add(yard);

  // Central tholos kiosk
  const thBase = makeCylinder(3.2, 3.2, 0.8, MAT.travertine);
  setPos(thBase, 0, 0.4, 0);
  g.add(thBase);
  const thCols = app.create('group');
  const thCP = createColumnProto(4.2, 0.25);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const x = Math.cos(a) * 2.6;
    const z = Math.sin(a) * 2.6;
    const c = thCP.clone(true);
    setPos(c, x, 0.4, z);
    thCols.add(c);
  }
  g.add(thCols);
  const thRoof = makeCone(3.6, 2.2, MAT.tile);
  setPos(thRoof, 0, 0.4 + 4.2 + 1.1, 0);
  g.add(thRoof);

  // Stalls
  const stall = () => {
    const s = app.create('group');
    const counter = makeBox(2.4, 1.0, 1.2, MAT.wood);
    setPos(counter, 0, 0.5, 0);
    s.add(counter);
    const awn = makeBox(2.6, 0.08, 1.6, '#e8a860');
    setPos(awn, 0, 1.9, 0.2);
    awn.rotation.x = -deg(15);
    s.add(awn);
    return s;
  };
  const stalls = app.create('group');
  for (let i = 0; i < 8; i++) {
    const s = stall();
    const x = -w / 2 + 6 + (i % 4) * 8;
    const z = i < 4 ? -d / 2 + 6 : d / 2 - 6;
    setPos(s, x, 0, z);
    stalls.add(s);
  }
  g.add(stalls);

  setPos(g, pos[0], pos[1], pos[2]);
  return g;
};
const macellum = buildMacellum([80, 0, -10]);
add(macellum);

// Thermae (public baths)
const buildBaths = (pos) => {
  const g = app.create('group');
  const w = 48;
  const d = 56;
  const h = 12;

  const plinth = makeBox(w + 2, 0.8, d + 2, MAT.travertine);
  setPos(plinth, 0, 0.4, 0);
  g.add(plinth);

  const block = makeBox(w, h, d, MAT.brick);
  setPos(block, 0, 0.4 + h / 2, 0);
  g.add(block);

  // Frigidarium (central pools)
  const pool = (px, pz, pw, pd) => {
    const rim = makeBox(pw, 0.6, pd, MAT.marble);
    setPos(rim, px, 0.3 + 0.6 / 2, pz);
    g.add(rim);
    const water = makeBox(pw - 1, 0.2, pd - 1, MAT.water);
    water.emissive = '#7fd4ff';
    water.emissiveIntensity = 0.5;
    setPos(water, px, 0.25, pz);
    g.add(water);
  };
  pool(0, 0, 12, 8);
  pool(-14, 0, 8, 6);
  pool(14, 0, 8, 6);

  // Caldarium apse (south)
  const apse = makeCylinder(8, 8, 8, MAT.plaster);
  setPos(apse, 0, 0.4 + 4, d / 2 - 6);
  g.add(apse);

  // Roof
  const roof = gabledRoof(w, d, 6, MAT.tile);
  setPos(roof, 0, 0.4 + h + 3, 0);
  g.add(roof);

  setPos(g, pos[0], pos[1], pos[2]);
  return g;
};
const baths = buildBaths([-80, 0, 30]);
add(baths);

// Theater (semi-circular, stepped)
const buildTheater = (pos) => {
  const g = app.create('group');
  const rMax = 42;
  const rows = 12;
  const segs = 18;
  const riser = 0.5;
  const tread = 1.6;

  for (let r = 0; r < rows; r++) {
    const radius = 10 + r * tread;
    const y = (r + 1) * riser;
    for (let s = 0; s < segs; s++) {
      const a0 = Math.PI * (s / segs);
      const a1 = Math.PI * ((s + 1) / segs);
      const mid = (a0 + a1) / 2;
      const block = makeBox(2.6, 0.4, tread, MAT.travertine);
      block.rotation.y = mid + Math.PI / 2;
      const cx = Math.cos(mid) * (radius + tread / 2);
      const cz = Math.sin(mid) * (radius + tread / 2);
      setPos(block, cx, y, cz);
      g.add(block);
    }
  }

  // Stage building (scaenae frons)
  const stage = makeBox(38, 10, 6, MAT.plaster);
  setPos(stage, 0, 5, -6);
  g.add(stage);
  const stageRoof = gabledRoof(38, 6, 3.5, MAT.tile);
  setPos(stageRoof, 0, 10 + 2.0, -6);
  g.add(stageRoof);

  setPos(g, pos[0], pos[1], pos[2]);
  return g;
};
const theater = buildTheater([120, 0, 80]);
add(theater);

// Fountains in forum corners
const fountain = (pos) => {
  const g = app.create('group');
  const basin = makeCylinder(2.2, 2.2, 0.9, MAT.marble);
  setPos(basin, 0, 0.45, 0);
  g.add(basin);
  const water = makeCylinder(1.9, 1.9, 0.28, MAT.water);
  water.emissive = '#7fd4ff';
  water.emissiveIntensity = 0.6;
  setPos(water, 0, 0.35, 0);
  g.add(water);
  const pedestal = makeCylinder(0.4, 0.4, 1.2, MAT.marble);
  setPos(pedestal, 0, 0.45 + 0.6 + 0.6, 0);
  g.add(pedestal);
  const bowl = makeTorus(0.8, 0.08, MAT.marble);
  setPos(bowl, 0, 0.45 + 1.2 + 0.2, 0);
  g.add(bowl);
  setPos(g, pos[0], pos[1], pos[2]);
  return g;
};
forum.add(fountain([-forumW / 2 + 8, 0, -forumD / 2 + 8]));
forum.add(fountain([forumW / 2 - 8, 0, -forumD / 2 + 8]));
forum.add(fountain([-forumW / 2 + 8, 0, forumD / 2 - 8]));
forum.add(fountain([forumW / 2 - 8, 0, forumD / 2 - 8]));

// Aqueduct (north edge, delivering water)
const aqueduct = app.create('group');
add(aqueduct);
const aqY = 10;
const span = 12;
const pierW = 2;
const pierD = 3.2;
for (let i = -8; i <= 8; i++) {
  const x = i * span;
  const pier = makeBox(pierW, aqY, pierD, MAT.travertine);
  setPos(pier, x, aqY / 2, -200);
  aqueduct.add(pier);

  if (i < 8) {
    const deck = makeBox(span - 1, 1.2, pierD, MAT.travertine);
    setPos(deck, x + span / 2, aqY + 0.6, -200);
    aqueduct.add(deck);
  }
}

// City walls with gates and towers
const walls = app.create('group');
add(walls);

const buildWallLine = (x, z, len, thick, height, dir) => {
  const w = makeBox(
    dir === 'x' ? len : thick,
    height,
    dir === 'x' ? thick : len,
    MAT.stone
  );
  setPos(w, x, height / 2, z);
  walls.add(w);
};

const citySize = 380;
const wallThick = 4.5;
const wallH = 12;

buildWallLine(0, -citySize / 2, citySize, wallThick, wallH, 'x');
buildWallLine(0, citySize / 2, citySize, wallThick, wallH, 'x');
buildWallLine(-citySize / 2, 0, citySize, wallThick, wallH, 'z');
buildWallLine(citySize / 2, 0, citySize, wallThick, wallH, 'z');

// Towers every ~60m
for (let i = -3; i <= 3; i++) {
  const tw = makeBox(8, wallH + 4, 8, MAT.stone);
  setPos(tw, -citySize / 2, (wallH + 4) / 2, i * 60);
  walls.add(tw.clone());
  const tw2 = tw.clone();
  setPos(tw2, citySize / 2, (wallH + 4) / 2, i * 60);
  walls.add(tw2);
  const tw3 = tw.clone();
  setPos(tw3, i * 60, (wallH + 4) / 2, -citySize / 2);
  walls.add(tw3);
  const tw4 = tw.clone();
  setPos(tw4, i * 60, (wallH + 4) / 2, citySize / 2);
  walls.add(tw4);
}

// Gates: Porta Capena (south), Porta Appia-style (southeast)
const buildGate = (x, z, dir = 'x', name = 'Gate') => {
  const g = app.create('group');
  // g.name = name;

  const w = 16;
  const d = wallThick + 2;
  const h = 14;

  // Flanking towers
  const t = makeBox(8, h + 2, 8, MAT.stone);
  const tL = t.clone();
  const tR = t.clone();
  if (dir === 'x') {
    setPos(tL, -w / 2 - 4, (h + 2) / 2, 0);
    setPos(tR, w / 2 + 4, (h + 2) / 2, 0);
  } else {
    setPos(tL, 0, (h + 2) / 2, -w / 2 - 4);
    setPos(tR, 0, (h + 2) / 2, w / 2 + 4);
  }
  g.add(tL);
  g.add(tR);

  // Gatehouse
  const house = makeBox(
    dir === 'x' ? w : d,
    h,
    dir === 'x' ? d : w,
    MAT.stone
  );
  setPos(house, 0, h / 2, 0);
  g.add(house);

  setPos(g, x, 0, z);
  walls.add(g);
  return g;
};

buildGate(0, citySize / 2, 'x', 'Porta Capena');
buildGate(120, citySize / 2, 'x', 'Porta Appia');

// Harbor (west coast)
const harbor = app.create('group');
add(harbor);
const sea = makePlaneXZ(220, 160, '#6aa7d8', -0.02, 'static');
setPos(sea, -citySize / 2 - 80, -0.02, 100);
harbor.add(sea);

// Docks
for (let i = 0; i < 4; i++) {
  const pier = makeBox(4, 1, 28, MAT.stone);
  setPos(pier, -citySize / 2 - 30 - i * 16, 0.5, 70 + i * 16);
  harbor.add(pier);
}

// Simple ship
const buildShip = (pos) => {
  const g = app.create('group');
  const hull = makeBox(12, 2, 3.2, '#6d4c33');
  setPos(hull, 0, 1, 0);
  g.add(hull);
  const prow = makeBox(2, 1.6, 2.8, '#6d4c33');
  setPos(prow, -7, 1.2, 0);
  g.add(prow);
  const mast = makeCylinder(0.1, 0.1, 8, '#8b6b45');
  setPos(mast, -1, 4, 0);
  g.add(mast);
  const sail = makeBox(0.1, 4, 4, '#ddd9cf');
  setPos(sail, -1, 5, 0);
  g.add(sail);
  setPos(g, pos[0], pos[1], pos[2]);
  return g;
};
harbor.add(buildShip([-citySize / 2 - 60, 0, 110]));
harbor.add(buildShip([-citySize / 2 - 90, 0, 85]));

// Insula (apartment) prototype
const buildInsulaProto = () => {
  const g = app.create('group');
  const w = 26;
  const d = 18;
  const floors = 4;
  const fh = 3;

  for (let f = 0; f < floors; f++) {
    const level = makeBox(w, fh, d, MAT.plaster);
    setPos(level, 0, fh / 2 + f * fh, 0);
    g.add(level);

    // Roof for top
    if (f === floors - 1) {
      const roof = gabledRoof(w, d, 2.2, MAT.tile);
      setPos(roof, 0, floors * fh + 1.2, 0);
      g.add(roof);
    }

    // Facade bands
    const band = makeBox(w, 0.2, d + 0.2, MAT.travertine);
    setPos(band, 0, f * fh + fh - 0.1, 0);
    g.add(band);
  }

  // Door block
  const door = makeBox(2, 2.6, 0.6, '#3b2b1f');
  setPos(door, 0, 1.3, d / 2 + 0.3);
  g.add(door);

  return g;
};

// Domus (house) prototype
const buildDomusProto = () => {
  const g = app.create('group');
  const w = 18;
  const d = 18;
  const h = 8;

  const shell = makeBox(w, h, d, MAT.plaster);
  setPos(shell, 0, h / 2, 0);
  g.add(shell);

  // Atrium opening (suggested by inner court plane)
  const atr = makePlaneXZ(8, 6, '#dcd2c0', 0.05, 'static');
  setPos(atr, 0, 0.05, 0);
  g.add(atr);

  const roof = gabledRoof(w, d, 3.2, MAT.tile);
  setPos(roof, 0, h + 1.6, 0);
  g.add(roof);

  const door = makeBox(1.8, 2.4, 0.5, '#3b2b1f');
  setPos(door, 0, 1.2, d / 2 + 0.25);
  g.add(door);

  return g;
};

const insulaProto = buildInsulaProto();
const domusProto = buildDomusProto();

// Populate blocks with insulae and domus
const buildings = app.create('group');
add(buildings);

const placeBuilding = (proto, x, z, rot = 0, scale = 1) => {
  const b = proto.clone(true);
  b.position.set(x, 0, z);
  b.rotation.y = rot;
  b.scale.set(scale, scale, scale);
  buildings.add(b);
};

const blockCoords = [];
for (let gx = -160; gx <= 160; gx += 40) {
  for (let gz = -160; gz <= 160; gz += 40) {
    // Skip forum/hills/baths/macellum areas
    const dx = gx - forum.position.x;
    const dz = gz - forum.position.z;
    const farFromForum =
      Math.abs(dx) > forumW / 2 + 20 || Math.abs(dz) > forumD / 2 + 20;
    const farFromHills =
      (Math.abs(gx + 100) > 50 || Math.abs(gz + 80) > 40) &&
      (Math.abs(gx + 110) > 60 || Math.abs(gz + 10) > 50);
    const farFromBaths =
      Math.abs(gx + 80) > 40 || Math.abs(gz - 30) > 32;
    const farFromMacellum =
      Math.abs(gx - 80) > 26 || Math.abs(gz + 10) > 26;

    if (farFromForum && farFromHills && farFromBaths && farFromMacellum) {
      blockCoords.push([gx, gz]);
    }
  }
}

// Fill blocks
blockCoords.forEach(([bx, bz]) => {
  const isInsula = R(0, 1) > 0.35;
  const proto = isInsula ? insulaProto : domusProto;

  const slots = [
    [bx - 12, bz - 12],
    [bx + 12, bz - 12],
    [bx - 12, bz + 12],
    [bx + 12, bz + 12],
  ];
  slots.forEach(([x, z]) => {
    if (R(0, 100) < 65) {
      placeBuilding(proto, x + R(-2, 2), z + R(-2, 2), deg(R(0, 3) * 90));
    }
  });
});

// Crowd (citizens, vendors, guards)
const walkers = [];
const makePerson = (colorTunic = '#d6b28a', withCloak = false) => {
  const g = app.create('group');

  const body = makeCylinder(0.25, 0.35, 1.6, colorTunic, 'kinematic');
  setPos(body, 0, 0.8, 0);
  g.add(body);

  const head = app.create('prim', {
    type: 'sphere',
    size: [0.22],
    color: '#f0d6b1',
    physics: 'kinematic',
    position: [0, 1.6 + 0.2, 0],
  });
  g.add(head);

  if (withCloak) {
    const cloak = makeBox(0.9, 1.0, 0.05, '#a22b2b', 'kinematic', 1.2);
    setPos(cloak, 0, 1.1, -0.28);
    g.add(cloak);
  }

  return g;
};

const addWalker = (route, speed, color, cloak = false) => {
  const p = makePerson(color, cloak);
  const start = route[0];
  p.position.set(start[0], 0, start[2]);
  p.physics = 'kinematic';
  const state = {
    node: p,
    route,
    idx: 0,
    speed,
  };
  walkers.push(state);
  city.add(p);
  return state;
};

// Path networks
const routes = [
  // Cardo loop
  [
    [0, 0, -180],
    [0, 0, 0],
    [0, 0, 160],
    [0, 0, 0],
  ],
  // Decumanus loop
  [
    [-180, 0, 0],
    [0, 0, 0],
    [180, 0, 0],
    [0, 0, 0],
  ],
  // Forum stroll
  [
    [-40, 0, -48],
    [40, 0, -48],
    [40, 0, 30],
    [-40, 0, 30],
  ],
  // Market loop
  [
    [80, 0, -30],
    [96, 0, -10],
    [80, 0, 10],
    [64, 0, -10],
  ],
  // Baths promenade
  [
    [-110, 0, 20],
    [-80, 0, 30],
    [-50, 0, 20],
    [-80, 0, 10],
  ],
];

// Spawn citizens
const tunics = ['#d6b28a', '#bfa27a', '#c9b28e', '#e1c9a2', '#cdb59a'];
for (let i = 0; i < 36; i++) {
  const r = routes[i % routes.length];
  addWalker(
    r,
    R(0.8, 1.6, 2),
    tunics[i % tunics.length],
    false
  );
}

// Guards (red cloaks) near gates and forum
const guardPosts = [
  [0, 0, citySize / 2 - 6],
  [120, 0, citySize / 2 - 6],
  [-6, 0, -35],
  [6, 0, -35],
];
guardPosts.forEach((p) => {
  const g1 = makePerson('#a98c6c', true);
  setPos(g1, p[0], 0, p[2]);
  city.add(g1);
});

// Vendors (static) at macellum
for (let i = 0; i < 8; i++) {
  const v = makePerson('#e0b07a', false);
  const x = 80 + R(-10, 10);
  const z = -10 + R(-10, 10);
  setPos(v, x, 0, z);
  city.add(v);
}

// Caravans (carts) moving along the Appian gate road
const carts = [];
const buildCart = () => {
  const g = app.create('group');
  const base = makeBox(3, 0.6, 1.8, '#6d4c33', 'kinematic', 0.3);
  setPos(base, 0, 0.3, 0);
  g.add(base);
  const wheel = makeCylinder(0.45, 0.45, 0.2, '#2a2a2a', 'kinematic');
  setRot(wheel, 0, 0, Math.PI / 2);
  const w1 = wheel.clone();
  setPos(w1, -1.2, 0.45, 0.9);
  const w2 = wheel.clone();
  setPos(w2, -1.2, 0.45, -0.9);
  const w3 = wheel.clone();
  setPos(w3, 1.2, 0.45, 0.9);
  const w4 = wheel.clone();
  setPos(w4, 1.2, 0.45, -0.9);
  g.add(w1);
  g.add(w2);
  g.add(w3);
  g.add(w4);
  return g;
};

const cartRoute = [
  [120, 0, citySize / 2 - 12],
  [120, 0, 60],
  [80, 0, 20],
  [40, 0, 0],
  [0, 0, -40],
];
for (let i = 0; i < 3; i++) {
  const c = buildCart();
  const p = cartRoute[0];
  setPos(c, p[0], 0, p[2] - i * 12);
  c.physics = 'kinematic';
  city.add(c);
  carts.push({
    node: c,
    route: cartRoute,
    idx: 0,
    speed: 4.0 - i * 0.4,
    wheelPhase: 0,
  });
}

// Update loop (crowd + carts)
app.on('update', (dt) => {
  // Walkers
  for (const w of walkers) {
    const n = w.node;
    const route = w.route;
    const target = route[w.idx];
    const dx = target[0] - n.position.x;
    const dz = target[2] - n.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.5) {
      w.idx = (w.idx + 1) % route.length;
    } else if (dist > 0.0001) {
      const vx = (dx / dist) * w.speed * dt;
      const vz = (dz / dist) * w.speed * dt;
      n.position.x += vx;
      n.position.z += vz;
      n.rotation.y = Math.atan2(vx, vz);
    }
  }

  // Carts
  for (const c of carts) {
    const n = c.node;
    const route = c.route;
    const target = route[c.idx];
    const dx = target[0] - n.position.x;
    const dz = target[2] - n.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.5) {
      c.idx = (c.idx + 1) % route.length;
    } else if (dist > 0.0001) {
      const speed = c.speed;
      const vx = (dx / dist) * speed * dt;
      const vz = (dz / dist) * speed * dt;
      n.position.x += vx;
      n.position.z += vz;
      n.rotation.y = Math.atan2(vx, vz);
      // Wheel rotation (approx)
      c.wheelPhase += (speed * dt) / 0.9;
      // Child 1..4 are wheels in order added; rotate around Z
      const wheelRot = c.wheelPhase;
      for (let wi = 1; wi <= 4; wi++) {
        const wnode = n.children[wi];
        if (wnode) {
          wnode.rotation.z = wheelRot;
        }
      }
    }
  }
});

// Notes on scale:
// - Buildings and streets are sized in meters.
// - Forum ~120 x 70 m, basilica ~32 x 62 m, temples, hills and theater
//   sized for walkable VR exploration with static colliders.
// - Surfaces slightly offset to avoid z-fighting.