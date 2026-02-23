// ---------- NFL dimensions (meters) ----------
const FIELD_LEN = 109.728;       // 120 yd incl. end zones
const FIELD_WID = 48.768;        // 160 ft
const PLAY_LEN  = 91.44;         // 100 yd
const EZ_DEPTH  = 9.144;         // 10 yd
const LINE_W    = 0.1016;        // 4 in paint
const HASH_OFF  = 21.5646;       // 70'9" from each sideline
const YARD      = 0.9144;

// Visual thickness (Y) for ground stuff (must be >0 so it renders)
const TURF_H    = 0.02;
const PAINT_H   = 0.022; // slightly above turf to avoid z-fighting

// Goalpost
const XBAR_H    = 3.048;   // 10 ft
const XBAR_W    = 5.64;    // 18'6"
const UPR_H     = 10.668;  // ~35 ft above crossbar
const PIPE_D    = 0.127;   // ~5 in
const PIPE_R    = PIPE_D / 2;

// Colors
const TURF      = '#145214';
const WHITE     = '#ffffff';
const ENDZ_1    = '#0b3d91';
const ENDZ_2    = '#b22234';

const field = app.create('group');

// Helpers ------------------------------------------------------------
const addBox = (sx, sy, sz, x, y, z, color, physics='static') => {
  const b = app.create('prim', { type: 'box', size: [sx, sy, sz], position: [x, y, z], color, physics });
  field.add(b); return b;
};

// Base turf (one slab)
addBox(FIELD_LEN, TURF_H, FIELD_WID, 0, TURF_H/2, 0, TURF);

// End zones (full width, one at each end)
addBox(EZ_DEPTH, PAINT_H, FIELD_WID, -(PLAY_LEN/2 + EZ_DEPTH/2), PAINT_H/2, 0, ENDZ_1);
addBox(EZ_DEPTH, PAINT_H, FIELD_WID,  (PLAY_LEN/2 + EZ_DEPTH/2), PAINT_H/2, 0, ENDZ_2);

// Lines --------------------------------------------------------------
// Sidelines
addBox(FIELD_LEN, PAINT_H, LINE_W, 0, PAINT_H/2, -FIELD_WID/2, WHITE);
addBox(FIELD_LEN, PAINT_H, LINE_W, 0, PAINT_H/2,  FIELD_WID/2, WHITE);

// Goal lines (at start of each end zone)
addBox(LINE_W, PAINT_H, FIELD_WID, -PLAY_LEN/2, PAINT_H/2, 0, WHITE);
addBox(LINE_W, PAINT_H, FIELD_WID,  PLAY_LEN/2, PAINT_H/2, 0, WHITE);

// End lines (back of end zones)
addBox(LINE_W, PAINT_H, FIELD_WID, -(PLAY_LEN/2 + EZ_DEPTH), PAINT_H/2, 0, WHITE);
addBox(LINE_W, PAINT_H, FIELD_WID,  (PLAY_LEN/2 + EZ_DEPTH), PAINT_H/2, 0, WHITE);

// Every 5-yard lines across play area
for (let yd = -45; yd <= 45; yd += 5) {
  // midfield will be added anyway; keep it for clarity
  const x = yd * YARD;
  addBox(LINE_W, PAINT_H, FIELD_WID, x, PAINT_H/2, 0, WHITE);
}

// Hash marks (2 ft long, every yard, at NFL offsets)
const HASH_LEN = 0.6096; // 2 ft
const leftHashZ  = -FIELD_WID/2 + HASH_OFF;
const rightHashZ =  FIELD_WID/2 - HASH_OFF;

for (let yd = -50; yd <= 50; yd++) {
  if (yd === -50 || yd === 0 || yd === 50) continue; // no hashes on goal/mid
  const x = yd * YARD;
  // Oriented along X: length is sx, paint width is sz = LINE_W
  addBox(HASH_LEN, PAINT_H, LINE_W, x, PAINT_H/2, leftHashZ, WHITE);
  addBox(HASH_LEN, PAINT_H, LINE_W, x, PAINT_H/2, rightHashZ, WHITE);
}

// Goalposts (crossbar centers on the end line)
const makeGoal = (sign) => {
  const g = app.create('group');

  // Left goalpost (negative X direction)
const leftStem = app.create('prim', {
  type: 'cylinder',
  size: [PIPE_R, PIPE_R, XBAR_H],
  position: [-(PLAY_LEN/2 + 2), XBAR_H / 2, 0], // ~2m behind goal line
  color: WHITE,
  physics: 'static'
});
field.add(leftStem);

const leftArm = app.create('prim', {
  type: 'box',
  size: [2, PIPE_D, PIPE_D],
  position: [-(PLAY_LEN/2 + 1), XBAR_H, 0],
  color: WHITE,
  physics: 'static'
});
field.add(leftArm);

const leftCrossbar = app.create('prim', {
  type: 'box',
  size: [XBAR_W, PIPE_D, PIPE_D],
  position: [-(PLAY_LEN/2), XBAR_H, 0],
  color: WHITE,
  physics: 'static'
});
field.add(leftCrossbar);

const leftUpL = app.create('prim', {
  type: 'cylinder',
  size: [PIPE_R, PIPE_R, UPR_H],
  position: [-(PLAY_LEN/2), XBAR_H + UPR_H / 2, -XBAR_W / 2],
  color: WHITE,
  physics: 'static'
});
const leftUpR = leftUpL.clone();
leftUpR.position.set(-(PLAY_LEN/2), XBAR_H + UPR_H / 2, XBAR_W / 2);
field.add(leftUpL);
field.add(leftUpR);

// Right goalpost (positive X direction) – mirror of left
const rightStem = leftStem.clone();
rightStem.position.set(PLAY_LEN/2 + 2, XBAR_H / 2, 0);
field.add(rightStem);

const rightArm = leftArm.clone();
rightArm.position.set(PLAY_LEN/2 + 1, XBAR_H, 0);
field.add(rightArm);

const rightCrossbar = leftCrossbar.clone();
rightCrossbar.position.set(PLAY_LEN/2, XBAR_H, 0);
field.add(rightCrossbar);

const rightUpL = leftUpL.clone();
rightUpL.position.set(PLAY_LEN/2, XBAR_H + UPR_H / 2, -XBAR_W / 2);
const rightUpR = leftUpR.clone();
rightUpR.position.set(PLAY_LEN/2, XBAR_H + UPR_H / 2, XBAR_W / 2);
field.add(rightUpL);
field.add(rightUpR);

};

field.add(makeGoal(-1));
field.add(makeGoal( 1));

app.add(field);

// ======== Sideline / Bench Areas (replaces previous sideline block) ========

// Real-world-ish
const BORDER_W        = 1.8288;     // 6 ft solid white border outside the sideline
const LIMIT_LINE_OFF  = 3.6576;     // 12 ft from sideline (coach box line)
const TEAM_DEPTH      = 6.0;        // bench area depth outside the border
const TEAM_LEN_YDS    = 64;         // 32 to 32 yd lines
const TEAM_LEN        = TEAM_LEN_YDS * YARD;
const APRON_W         = BORDER_W + TEAM_DEPTH; // apron outside field

// Visuals
const APRON_TURF  = '#0f4a10';
const TEAM_TURF   = '#0d3b0d';

// Chair params (simple folding chair)
const CHAIR_W = 0.5;    // width left-right
const CHAIR_D = 0.5;    // seat depth front-back
const CHAIR_SEAT_H = 0.45;
const CHAIR_SEAT_T = 0.04;
const CHAIR_BACK_H = 0.40;
const CHAIR_BACK_T = 0.04;
const CHAIR_SPACING = 0.60; // center-to-center along X
const CHAIR_OFFSET_FROM_LIMIT = 0.80; // meters behind the limit line so no overlap

function addChair(x, z, sign) {
  // seat (box)
  addBox(
    CHAIR_W, CHAIR_SEAT_T, CHAIR_D,
    x, CHAIR_SEAT_H + CHAIR_SEAT_T/2, z,
    WHITE
  );
  // backrest (box) just behind seat (further from field)
  const backZ = z + sign * (CHAIR_D/2 - CHAIR_BACK_T/2);
  addBox(
    CHAIR_W, CHAIR_BACK_H, CHAIR_BACK_T,
    x, CHAIR_SEAT_H + CHAIR_BACK_H/2, backZ,
    WHITE
  );
}

function buildSideline(sign) {
  const zSideline = sign * (FIELD_WID / 2);

  // Apron base (extra turf outside the field)
  addBox(
    FIELD_LEN, TURF_H, APRON_W,
    0, TURF_H/2, zSideline + sign * (APRON_W / 2),
    APRON_TURF
  );

  // Solid white border (6 ft) immediately outside the sideline
  addBox(
    FIELD_LEN, PAINT_H, BORDER_W,
    0, PAINT_H/2, zSideline + sign * (BORDER_W / 2),
    WHITE
  );

  // Team/bench area slab between the 32s (different green so it reads)
  addBox(
    TEAM_LEN, TURF_H, TEAM_DEPTH,
    0, TURF_H/2, zSideline + sign * (BORDER_W + TEAM_DEPTH / 2),
    TEAM_TURF
  );

  // ---- Limit line as DASHES ONLY (avoid intersecting a solid line) ----
  const dashLen = 1.0, gap = 1.0;
  const nDashes = Math.floor(TEAM_LEN / (dashLen + gap));
  const startX = -TEAM_LEN/2 + dashLen/2;
  const zLimit = zSideline + sign * LIMIT_LINE_OFF;
  for (let i = 0; i < nDashes; i++) {
    const x = startX + i * (dashLen + gap);
    addBox(dashLen, PAINT_H, LINE_W, x, PAINT_H/2, zLimit, WHITE);
  }

  // ---- Chairs along the team area, centered between the 32s ----
  const zChair = zLimit + sign * CHAIR_OFFSET_FROM_LIMIT;
  const startChairX = -TEAM_LEN/2 + CHAIR_W/2;
  const endChairX =  TEAM_LEN/2 - CHAIR_W/2;

  for (let x = startChairX; x <= endChairX; x += CHAIR_SPACING) {
    // leave small aisles near each 10-yard mark
    const yd = Math.round(x / YARD); // approx yards from midfield
    if (Math.abs(yd) % 10 === 0) continue; // skip to form an aisle
    addChair(x, zChair, sign);
  }
}

// Build both sidelines
buildSideline(+1); // top (positive Z)
buildSideline(-1); // bottom (negative Z)

// ========== End-zone Bleachers ==========
const BLEACHER_ROWS   = 12;
const TREAD_DEPTH     = 0.85;     // front-to-back per row (m)
const RISER_HEIGHT    = 0.38;     // rise per row (m)
const PLATFORM_T      = 0.05;     // platform thickness
const SEAT_DEPTH      = 0.45;     // plank depth
const SEAT_T          = 0.05;     // plank thickness
const AISLE_W         = 1.2;      // center aisle
const RAIL_T          = 0.05;     // rail thickness
const SAFETY_GAP      = 6.0;      // space from end line to first row front edge
const ROW_WIDTH       = FIELD_WID + 6; // extend 3m beyond each sideline

const ALU = '#cfd3d6'; // aluminum-ish
const SEAT = '#e6e9ec';

// helper: bench seat segments left/right of aisle
function addSeatRow(xCenter, yTop, signX) {
  const segLen = (ROW_WIDTH - AISLE_W) / 2 - 0.1; // small margin
  const zLeftCenter  = -(AISLE_W/2 + segLen/2);
  const zRightCenter =  (AISLE_W/2 + segLen/2);

  // seat sits near the BACK of the tread
  const seatX = xCenter + signX * (TREAD_DEPTH/2 - SEAT_DEPTH/2 - 0.05);
  const seatY = yTop + SEAT_T/2 + 0.01;

  addBox(SEAT_DEPTH, SEAT_T, segLen, seatX, seatY, zLeftCenter,  SEAT);
  addBox(SEAT_DEPTH, SEAT_T, segLen, seatX, seatY, zRightCenter, SEAT);
}

function buildBleachers(signX) {
  // signX: -1 for west end, +1 for east end
  const endLineX = signX * (PLAY_LEN/2 + EZ_DEPTH);

  // Build rows from front (lowest) to back (highest)
  for (let i = 0; i < BLEACHER_ROWS; i++) {
    const xCenter = endLineX + signX * (SAFETY_GAP + (i * TREAD_DEPTH) + TREAD_DEPTH/2);
    const yTop    = (i * RISER_HEIGHT); // platform top surface height
    const yCenter = yTop - PLATFORM_T/2;

    // tread/platform
    addBox(TREAD_DEPTH, PLATFORM_T, ROW_WIDTH, xCenter, yCenter, 0, ALU);

    // simple stringer under the front edge (visual support)
    const strY = yCenter - (PLATFORM_T/2 + 0.15/2);
    addBox(0.08, 0.15, ROW_WIDTH, xCenter - signX * (TREAD_DEPTH/2 - 0.04), strY, 0, ALU);

    // seat planks (left/right of center aisle)
    addSeatRow(xCenter, yTop, signX);
  }

  // Back guard rail (continuous bar along Z)
  const backRowCenterX = endLineX + signX * (SAFETY_GAP + (BLEACHER_ROWS - 1) * TREAD_DEPTH + TREAD_DEPTH/2);
  const backEdgeX      = backRowCenterX + signX * (TREAD_DEPTH/2);
  const railY          = (BLEACHER_ROWS - 1) * RISER_HEIGHT + 1.1; // ~1.1m above top row

  addBox(RAIL_T, RAIL_T, ROW_WIDTH, backEdgeX, railY, 0, ALU); // top rail
  addBox(RAIL_T, RAIL_T, ROW_WIDTH, backEdgeX, railY - 0.55, 0, ALU); // mid rail

  // Vertical posts at edges + beside aisle
  const postH = 1.2;
  const postZs = [
    -ROW_WIDTH/2 + 0.2,
    -(AISLE_W/2 + 0.2),
    (AISLE_W/2 + 0.2),
    ROW_WIDTH/2 - 0.2
  ];
  for (const z of postZs) {
    addBox(RAIL_T, postH, RAIL_T, backEdgeX, railY - postH/2, z, ALU);
  }
}

// Build both end-zone bleachers
buildBleachers(-1);
buildBleachers( 1);

// ================= FIXED SIDELINE STADIUM SEATING (no overlap) =================
function buildSidelineStadium() {
  const _BORDER_W   = (typeof BORDER_W   !== 'undefined') ? BORDER_W   : 1.8288;
  const _TEAM_DEPTH = (typeof TEAM_DEPTH !== 'undefined') ? TEAM_DEPTH : 6.0;

  const P = {
    FRONT_CLEAR: Math.max(8.0, _BORDER_W + _TEAM_DEPTH + 2.0),
    LOWER_ROWS: 18,
    UPPER_ROWS: 22,
    TREAD: 0.85,
    RISER: 0.40,
    PLATFORM_T: 0.05,
    SEAT_DEPTH: 0.45,
    SEAT_T: 0.05,
    SEAT_W: 0.48,
    SEAT_GAP: 0.04,
    COLS_PER_SEC: 20,
    SECTIONS: 9,
    AISLE_GAP: 1.4,
    CONCOURSE_H: 2.8,
    CONCOURSE_W: 4.0,
    UPPER_SETBACK: 3.2,
    RAIL_T: 0.05,
    RAIL_H: 1.1,
    STRINGER_T: 0.16,
    STRINGER_DROP: 0.18,
    COL_CONCRETE: '#b8bbbf',
    COL_SEAT:     '#6d89c9',
    COL_AISLE:    '#8aa07a', // darker so it reads
    COL_RAIL:     '#cfd3d6'
  };

  // along X
  const seatPitch   = P.SEAT_W + P.SEAT_GAP;
  const sectionLen  = P.COLS_PER_SEC * seatPitch;
  const totalLen    = P.SECTIONS * sectionLen + (P.SECTIONS - 1) * P.AISLE_GAP;
  const leftEdgeX   = -totalLen / 2;
  const EPS         = 0.03;  // shrink edges to avoid contact

  // Build ONE ROW (all sections + aisles), then reuse for lower/upper
  function buildOneRow(zCenter, yTop, signZ, withSeats = true) {
    // Walk sections left → right; between each pair, add an aisle pad that fits the gap exactly.
    for (let s = 0; s < P.SECTIONS; s++) {
      const secLeft  = leftEdgeX + s * (sectionLen + P.AISLE_GAP);
      const secRight = secLeft + sectionLen;
      const xCenter  = (secLeft + secRight) / 2;
      const xLen     = (secRight - secLeft) - 2*EPS;

      // tread slab
      addBox(xLen, P.PLATFORM_T, P.TREAD,
        xCenter, yTop - P.PLATFORM_T/2, zCenter,
        P.COL_CONCRETE
      );
      // front stringer
      addBox(xLen, P.STRINGER_T, 0.08,
        xCenter,
        yTop - P.PLATFORM_T/2 - P.STRINGER_DROP/2,
        zCenter - signZ * (P.TREAD/2 - 0.04),
        P.COL_CONCRETE
      );

      if (withSeats) {
        const seatZ = zCenter + signZ * (P.TREAD/2 - P.SEAT_DEPTH/2 - 0.06);
        addBox(xLen, P.SEAT_T, P.SEAT_DEPTH,
          xCenter, yTop + P.SEAT_T/2 + 0.01, seatZ,
          P.COL_SEAT
        );
      }

      // aisle between this section and next
      if (s < P.SECTIONS - 1) {
        const gapLeft  = secRight;
        const gapRight = gapLeft + P.AISLE_GAP;
        const axCenter = (gapLeft + gapRight) / 2;
        const aLen     = (gapRight - gapLeft) - 2*EPS;

        // aisle tread
        addBox(aLen, P.PLATFORM_T, P.TREAD,
          axCenter, yTop - P.PLATFORM_T/2 + 0.001, zCenter,
          P.COL_AISLE
        );
        // aisle nosing
        addBox(aLen, P.STRINGER_T, 0.08,
          axCenter,
          yTop - P.PLATFORM_T/2 - P.STRINGER_DROP/2 + 0.001,
          zCenter - signZ * (P.TREAD/2 - 0.04),
          P.COL_AISLE
        );
      }
    }
  }

  function frontRail(signZ, zSideline, yZero) {
    const zRail = zSideline + signZ * (P.FRONT_CLEAR - 0.05);
    addBox(totalLen - 2*EPS, P.RAIL_H, P.RAIL_T, 0, yZero + P.RAIL_H/2, zRail, P.COL_RAIL);
  }

  function buildBowl(signZ) {
    const zSideline = signZ * (FIELD_WID / 2);

    // LOWER BOWL
    for (let r = 0; r < P.LOWER_ROWS; r++) {
      const zCenter = zSideline + signZ * (P.FRONT_CLEAR + r*P.TREAD + P.TREAD/2);
      const yTop    = r * P.RISER;
      buildOneRow(zCenter, yTop, signZ, true);
    }
    frontRail(signZ, zSideline, 0);

    // CONCOURSE
    const concourseYTop = P.LOWER_ROWS * P.RISER + 0.02;
    const concourseZ    = zSideline + signZ * (P.FRONT_CLEAR + P.LOWER_ROWS*P.TREAD + P.CONCOURSE_W/2);
    addBox(totalLen - 2*EPS, P.PLATFORM_T, P.CONCOURSE_W,
      0, concourseYTop - P.PLATFORM_T/2, concourseZ,
      P.COL_CONCRETE
    );
    addBox(totalLen - 2*EPS, P.RAIL_H, P.RAIL_T,
      0, concourseYTop + P.RAIL_H/2, concourseZ + signZ * (P.CONCOURSE_W/2 - 0.05),
      P.COL_RAIL
    );

    // UPPER BOWL
    const upperBaseZ = zSideline + signZ * (
      P.FRONT_CLEAR + P.LOWER_ROWS*P.TREAD + P.CONCOURSE_W + P.UPPER_SETBACK
    );
    const upperLipY  = concourseYTop + P.CONCOURSE_H;

    for (let r = 0; r < P.UPPER_ROWS; r++) {
      const zCenter = upperBaseZ + signZ * (r*P.TREAD + P.TREAD/2);
      const yTop    = upperLipY + r * P.RISER;
      buildOneRow(zCenter, yTop, signZ, true);
    }
    addBox(totalLen - 2*EPS, P.RAIL_H, P.RAIL_T,
      0, upperLipY + P.RAIL_H/2, upperBaseZ - signZ * 0.05,
      P.COL_RAIL
    );
  }

  // Build both sidelines
  buildBowl(+1);
  buildBowl(-1);
}

// Call once:
buildSidelineStadium();

// ==== FOUNDATIONS: End-zone bleachers (stepped raker walls + back wall) ====
(function buildBleacherFoundations(){
  const WALL_T = 0.25;         // thickness (m) of each raker wall
  const SIDE_OVERHANG = 1.0;   // extend beyond seat width, each side
  const FOOTING_T = 0.3;       // slab at ground under the whole bleacher

  function buildBleacherBase(signX){
    const endLineX = signX * (PLAY_LEN/2 + EZ_DEPTH);
    const fullW = ROW_WIDTH + 2*SIDE_OVERHANG;

    // ground footing slab (whole footprint)
    const frontX = endLineX + signX * SAFETY_GAP;
    const backX  = endLineX + signX * (SAFETY_GAP + BLEACHER_ROWS*TREAD_DEPTH);
    const lenX   = Math.abs(backX - frontX);
    const midX   = (frontX + backX)/2;
    addBox(lenX, FOOTING_T, fullW, midX, FOOTING_T/2, 0, '#9da3a7');

    // stepped raker walls under each row (sit just behind the front nosing)
    for (let i=0;i<BLEACHER_ROWS;i++){
      const yTop = i * RISER_HEIGHT;
      const xCtr = endLineX + signX*(SAFETY_GAP + i*TREAD_DEPTH + TREAD_DEPTH/2);
      const yH   = yTop + (PLATFORM_T/2);               // top meets underside of row tread
      const xPos = xCtr - signX*(TREAD_DEPTH/2 - 0.06); // align to front nosing
      addBox(WALL_T, yH, fullW, xPos, yH/2, 0, '#b8bbbf');
    }

    // back retaining wall
    const backRowCenterX = endLineX + signX * (SAFETY_GAP + (BLEACHER_ROWS - 1) * TREAD_DEPTH + TREAD_DEPTH/2);
    const backEdgeX = backRowCenterX + signX * (TREAD_DEPTH/2 + WALL_T/2);
    const backH = (BLEACHER_ROWS-1)*RISER_HEIGHT + 1.2;
    addBox(WALL_T, backH, fullW, backEdgeX, backH/2, 0, '#b8bbbf');

    // side cheek walls
    const sideZ = (ROW_WIDTH/2) + SIDE_OVERHANG + WALL_T/2;
    const sideH = (BLEACHER_ROWS-1)*RISER_HEIGHT + 0.8;
    addBox(Math.abs(lenX), sideH, WALL_T, midX, sideH/2,  sideZ, '#b8bbbf');
    addBox(Math.abs(lenX), sideH, WALL_T, midX, sideH/2, -sideZ, '#b8bbbf');
  }

  buildBleacherBase(-1);
  buildBleacherBase(+1);
})();


// ==== FOUNDATIONS: Sideline bowls (stepped raker walls + columns) ====
(function buildSidelineFoundations(){
  // Mirror the params from buildSidelineStadium
  const _BORDER_W   = (typeof BORDER_W   !== 'undefined') ? BORDER_W   : 1.8288;
  const _TEAM_DEPTH = (typeof TEAM_DEPTH !== 'undefined') ? TEAM_DEPTH : 6.0;

  const P = {
    FRONT_CLEAR: Math.max(8.0, _BORDER_W + _TEAM_DEPTH + 2.0),
    LOWER_ROWS: 18,
    UPPER_ROWS: 22,
    TREAD: 0.85,
    RISER: 0.40,
    PLATFORM_T: 0.05,
    SEAT_W: 0.48,
    SEAT_GAP: 0.04,
    COLS_PER_SEC: 20,
    SECTIONS: 9,
    AISLE_GAP: 1.4,
    CONCOURSE_H: 2.8,
    CONCOURSE_W: 4.0,
    UPPER_SETBACK: 3.2
  };

  // Derived along X (exactly as in seating builder)
  const seatPitch   = P.SEAT_W + P.SEAT_GAP;
  const sectionLen  = P.COLS_PER_SEC * seatPitch;
  const totalLen    = P.SECTIONS * sectionLen + (P.SECTIONS - 1) * P.AISLE_GAP;
  const leftEdgeX   = -totalLen / 2;
  const EPS         = 0.03;

  // Foundation look
  const WALL_T      = 0.30;     // raker wall thickness
  const SIDE_WALL_T = 0.40;     // outer cheek wall
  const FOOT_T      = 0.35;     // footing pad thickness
  const COL_SIZE    = 0.45;     // square column size
  const COL_SPAN_X  = 6.0;      // grid spacing along X
  const COL_ROWS_Z  = 2;        // 2 column lines under concourse & upper lip

  // Helper: run one stepped raker wall strip under a row (per section & per aisle gap)
  function rakerRow(zCenter, yTop, signZ){
    for (let s=0; s<P.SECTIONS; s++){
      const secLeft  = leftEdgeX + s*(sectionLen + P.AISLE_GAP);
      const secRight = secLeft + sectionLen;
      const xCtr     = (secLeft + secRight)/2;
      const xLen     = (secRight - secLeft) - 2*EPS;

      // wall sits just behind the row nosing and runs to ground
      const yH   = yTop + P.PLATFORM_T/2;
      const zPos = zCenter - signZ*(P.TREAD/2 - 0.06);
      addBox(xLen, yH, WALL_T, xCtr, yH/2, zPos, '#b8bbbf');

      // aisle gap wall (between sections)
      if (s < P.SECTIONS - 1){
        const gapLeft  = secRight;
        const gapRight = gapLeft + P.AISLE_GAP;
        const axCtr    = (gapLeft + gapRight)/2;
        const aLen     = (gapRight - gapLeft) - 2*EPS;
        addBox(aLen, yH, WALL_T, axCtr, yH/2, zPos, '#adb2b6'); // slightly darker so you read the aisle rib
      }
    }
  }

  // Columns & footings under a rectangular band (used for concourse and upper lip)
  function columnBand(zBandCenter, zBandDepth, topY){
    const xStart = leftEdgeX + COL_SPAN_X/2;
    for (let row=0; row<COL_ROWS_Z; row++){
      const z = zBandCenter + (row - (COL_ROWS_Z-1)/2) * (zBandDepth - COL_SIZE);
      for (let x = xStart; x <= -xStart; x += COL_SPAN_X){
        // footing
        addBox(COL_SIZE*1.8, FOOT_T, COL_SIZE*1.8, x, FOOT_T/2, z, '#9da3a7');
        // column up to supporting level
        addBox(COL_SIZE, topY - FOOT_T, COL_SIZE, x, (topY + FOOT_T)/2, z, '#c2c6ca');
      }
    }
  }

  function buildSide(signZ){
    const zSideline = signZ*(FIELD_WID/2);

    // LOWER BOWL: stepped raker walls
    for (let r=0; r<P.LOWER_ROWS; r++){
      const zCenter = zSideline + signZ*(P.FRONT_CLEAR + r*P.TREAD + P.TREAD/2);
      const yTop    = r*P.RISER;
      rakerRow(zCenter, yTop, signZ);
    }

    // continuous footing slab in front of lower bowl
    const zFront = zSideline + signZ*P.FRONT_CLEAR;
    const zBackLower = zSideline + signZ*(P.FRONT_CLEAR + P.LOWER_ROWS*P.TREAD);
    const zMid  = (zFront + zBackLower)/2;
    const zLen  = Math.abs(zBackLower - zFront);
    addBox(totalLen, FOOT_T, zLen, 0, FOOT_T/2, zMid, '#959a9e');

    // Side cheek walls running the full depth of lower bowl
    const sideZ   = zMid + signZ*(zLen/2 + SIDE_WALL_T/2);
    const sideH   = (P.LOWER_ROWS-1)*P.RISER + 1.0;
    addBox(totalLen, sideH, SIDE_WALL_T, 0, sideH/2, sideZ, '#b8bbbf');

    // CONCOURSE: column grid below, then back cheek wall
    const concourseTopY = P.LOWER_ROWS*P.RISER + 0.02;
    const concourseZ    = zSideline + signZ*(P.FRONT_CLEAR + P.LOWER_ROWS*P.TREAD + P.CONCOURSE_W/2);
    columnBand(concourseZ, P.CONCOURSE_W, concourseTopY); // columns to concourse level

    // UPPER BOWL: stepped raker walls
    const upperBaseZ = zSideline + signZ*(P.FRONT_CLEAR + P.LOWER_ROWS*P.TREAD + P.CONCOURSE_W + P.UPPER_SETBACK);
    const upperLipY  = concourseTopY + P.CONCOURSE_H;
    for (let r=0; r<P.UPPER_ROWS; r++){
      const zCenter = upperBaseZ + signZ*(r*P.TREAD + P.TREAD/2);
      const yTop    = upperLipY + r*P.RISER;
      rakerRow(zCenter, yTop, signZ);
    }

    // columns band under upper lip (to lip height)
    columnBand(upperBaseZ - signZ*(P.TREAD/2), P.TREAD, upperLipY);

    // rear retaining wall behind top row
    const zRear = upperBaseZ + signZ*(P.UPPER_ROWS*P.TREAD + SIDE_WALL_T/2);
    const rearH = upperLipY + (P.UPPER_ROWS-1)*P.RISER + 0.8;
    addBox(totalLen, rearH, SIDE_WALL_T, 0, rearH/2, zRear, '#b8bbbf');
  }

  // Build both sides
  buildSide(+1);
  buildSide(-1);
})();

// ================= COSMETIC LIGHTING / GLOW =================
const fx = app.create('group');

// Colors for glow
const GLOW_HOME = '#0b3d91';  // blue-ish
const GLOW_AWAY = '#b22234';  // red-ish
const GLOW_NEUT = '#9ad8ff';  // cool white/blue

// Helper: thin glowing bar that blooms nicely
function glowBarX(lenX, x, y, z, color, intensity=8, t=0.05, d=0.06) {
  const b = app.create('prim', {
    type: 'box',
    size: [lenX, t, d],
    position: [x, y, z],
    color,
    emissive: color,
    emissiveIntensity: intensity,
    physics: 'static'
  });
  fx.add(b);
  return b;
}

function glowBarZ(lenZ, x, y, z, color, intensity=8, t=0.05, d=0.06) {
  const b = app.create('prim', {
    type: 'box',
    size: [d, t, lenZ],
    position: [x, y, z],
    color,
    emissive: color,
    emissiveIntensity: intensity,
    physics: 'static'
  });
  fx.add(b);
  return b;
}

// ---------- Derived (mirrors your seating math) ----------
const _BORDER_W   = (typeof BORDER_W   !== 'undefined') ? BORDER_W   : 1.8288;
const _TEAM_DEPTH = (typeof TEAM_DEPTH !== 'undefined') ? TEAM_DEPTH : 6.0;
const FRONT_CLEAR = Math.max(8.0, _BORDER_W + _TEAM_DEPTH + 2.0);

const seatPitch   = (0.48 + 0.04);     // SEAT_W + SEAT_GAP from sideline seating
const sectionLen  = 20 * seatPitch;    // COLS_PER_SEC * seatPitch
const totalLen    = 9 * sectionLen + (9 - 1) * 1.4; // SECTIONS + AISLE_GAP

// Sideline heights/depths (match your builder)
const TREAD = 0.85, RISER = 0.40;
const CONCOURSE_W = 4.0, CONCOURSE_H = 2.8, UPPER_SETBACK = 3.2;
const LOWER_ROWS = 18, UPPER_ROWS = 22;
const concourseYTop = LOWER_ROWS * RISER + 0.02;
const upperBaseOffsetZ = FRONT_CLEAR + LOWER_ROWS*TREAD + CONCOURSE_W + UPPER_SETBACK;
const upperLipY = concourseYTop + CONCOURSE_H;

// ---------- 1) LED ribbons along the concourse rails (both sidelines) ----------
[+1, -1].forEach(signZ => {
  const zSideline = signZ * (FIELD_WID / 2);
  const zConcourseFront = zSideline + signZ * (FRONT_CLEAR + LOWER_ROWS*TREAD);
  const zConcourseBack  = zSideline + signZ * (FRONT_CLEAR + LOWER_ROWS*TREAD + CONCOURSE_W);

  // front edge ribbon (player side of the concourse)
  glowBarX(totalLen - 0.06, 0, concourseYTop + 0.15, zConcourseFront + signZ*0.02, GLOW_NEUT, 6);

  // back edge ribbon (concourse back rail)
  glowBarX(totalLen - 0.06, 0, concourseYTop + 0.15, zConcourseBack - signZ*0.02, GLOW_NEUT, 6);
});

// ---------- 2) Under-lip strip lights (beneath upper deck nose) ----------
[+1, -1].forEach(signZ => {
  const zSideline = signZ * (FIELD_WID / 2);
  const upperBaseZ = zSideline + signZ * upperBaseOffsetZ;
  // place just under the lip, slightly behind the nosing
  glowBarX(totalLen - 0.06, 0, upperLipY - 0.15, upperBaseZ - signZ * (TREAD*0.35), GLOW_HOME, 7);
});

// ---------- 3) End-zone bleacher halo (back of each bleacher) ----------
const backRowX_West = -(PLAY_LEN/2 + EZ_DEPTH) + -(SAFETY_GAP) + (SAFETY_GAP + (BLEACHER_ROWS - 0.5) * TREAD_DEPTH);
const backRowX_East =  +(PLAY_LEN/2 + EZ_DEPTH) +  (SAFETY_GAP) - (SAFETY_GAP + (BLEACHER_ROWS - 0.5) * TREAD_DEPTH);
const bleacherBackX_W = -(PLAY_LEN/2 + EZ_DEPTH) - (SAFETY_GAP + (BLEACHER_ROWS * TREAD_DEPTH)) + (TREAD_DEPTH);
const bleacherBackX_E =  +(PLAY_LEN/2 + EZ_DEPTH) + (SAFETY_GAP + (BLEACHER_ROWS * TREAD_DEPTH)) - (TREAD_DEPTH);

glowBarZ(ROW_WIDTH - 0.2, bleacherBackX_W, (BLEACHER_ROWS - 1) * RISER_HEIGHT + 0.9, 0, GLOW_HOME, 6);
glowBarZ(ROW_WIDTH - 0.2, bleacherBackX_E, (BLEACHER_ROWS - 1) * RISER_HEIGHT + 0.9, 0, GLOW_AWAY, 6);

// ---------- Scoreboard with glowing panel (faces the field) ----------
(function buildScoreboard(signX = +1){
  const SB_W = 24, SB_H = 10, SB_T = 0.6; // W=screen width (along Z), H, T=thickness (along X)

  // Place outside the end-zone bleachers, centered on Z
  const x = signX * (PLAY_LEN/2 + EZ_DEPTH + SAFETY_GAP + BLEACHER_ROWS*TREAD_DEPTH + 6.0);
  const y = 6.0;
  const z = 0;

  // Masts (front/back on Z)
  const postZ = SB_W/2 + 1.2;
  const mast1 = app.create('prim', {
    type: 'box', size: [SB_T, y*2, 2.0],
    position: [x, y, -postZ], color: '#8a8f93', physics: 'static'
  });
  fx.add(mast1);
  const mast2 = mast1.clone(); mast2.position.set(x, y, postZ); fx.add(mast2);

  // Panel: oriented on the Y–Z plane (normal points ±X toward the field)
  const panel = app.create('prim', {
    type: 'box',
    size: [SB_T, SB_H, SB_W],                  // thin in X, wide in Z
    position: [x - signX*SB_T/2, y + SB_H/2 + 1.0, 0],
    color: '#0a0a0a', emissive: '#0a0a0a', emissiveIntensity: 0.5,
    physics: 'static'
  });
  fx.add(panel);

  // Bright “screen” inset toward the field (push a bit further toward -signX)
  const screen = app.create('prim', {
    type: 'box',
    size: [SB_T*0.3, SB_H - 1.0, SB_W - 1.0],
    position: [x - signX*(SB_T*0.65), y + SB_H/2 + 1.0, 0],
    color: '#1e90ff', emissive: '#1e90ff', emissiveIntensity: 9,
    physics: 'static'
  });
  fx.add(screen);
})();


// // ---------- 5) Corner beacons (tall glowy pylons outside apron) ----------
// (function cornerBeacons(){
//   const R = 0.18;       // radius
//   const H = 7.0;
//   const outX = PLAY_LEN/2 + EZ_DEPTH + SAFETY_GAP + BLEACHER_ROWS*TREAD_DEPTH + 5.0;
//   const outZ = FIELD_WID/2 + _BORDER_W + _TEAM_DEPTH + 5.0;

//   function beacon(x, z, color) {
//     const c = app.create('prim', {
//       type: 'cylinder',
//       size: [R, R, H],
//       position: [x, H/2, z],
//       color,
//       emissive: color,
//       emissiveIntensity: 10,
//       physics: 'static'
//     });
//     fx.add(c);
//     // cap ring
//     glowBarZ(0.8, x, H - 0.15, z, '#ffffff', 7, 0.04, 0.04);
//   }

//   beacon(+outX, +outZ, GLOW_HOME);
//   beacon(+outX, -outZ, GLOW_AWAY);
//   beacon(-outX, +outZ, GLOW_AWAY);
//   beacon(-outX, -outZ, GLOW_HOME);
// })();

// ---------- 6) Wayfinding glow strips at the ends of team benches ----------
(function benchEnds(){
  const dashY = 0.04; // slightly proud of turf
  const stripL = 2.2;
  const zTop  = (FIELD_WID/2) + _BORDER_W + 0.6;
  const zBtm  = -(FIELD_WID/2) - _BORDER_W - 0.6;
  const xL = -TEAM_LEN/2 - 0.6;
  const xR =  TEAM_LEN/2 + 0.6;

  glowBarX(stripL, xL, dashY, zTop,  GLOW_HOME, 6);
  glowBarX(stripL, xR, dashY, zTop,  GLOW_HOME, 6);
  glowBarX(stripL, xL, dashY, zBtm,  GLOW_AWAY, 6);
  glowBarX(stripL, xR, dashY, zBtm,  GLOW_AWAY, 6);
})();

app.add(fx);

/// ===================== SIMPLE FLOODLIGHT TOWERS =====================
(function buildSimpleFloods(){
  const root = (typeof fx !== 'undefined') ? fx : app.create('group');
  if (typeof fx === 'undefined') app.add(root);

  // sizing
  const MAST_H = 45.0;
  const MAST_W = 1.5;
  const BASE_W = 4.0;
  
  // colors
  const CONC = '#b0b0b0';
  const STEEL = '#808080';
  const LAMP = '#ffffff';

  // position towers at corners
  const treadD = (typeof TREAD_DEPTH !== 'undefined') ? TREAD_DEPTH : 0.85;
  const bleacherDepth = (typeof BLEACHER_ROWS !== 'undefined' ? BLEACHER_ROWS : 12) * treadD;
  const OUT_X = PLAY_LEN/2 + EZ_DEPTH + SAFETY_GAP + bleacherDepth + 12.0;
  const OUT_Z = FIELD_WID/2 + 20.0;

  function buildTower(x, z){
    // Base
    app.add(app.create('prim', {
      type: 'box',
      size: [BASE_W, 1.0, BASE_W],
      position: [x, 0.5, z],
      color: CONC,
      physics: 'static'
    }));

    // Mast
    app.add(app.create('prim', {
      type: 'box',
      size: [MAST_W, MAST_H, MAST_W],
      position: [x, MAST_H/2, z],
      color: STEEL,
      physics: 'static'
    }));

    // Simple lamp panel - just a flat glowing rectangle facing the field
    // Calculate direction to center
    const dirX = -x / Math.sqrt(x*x + z*z);
    const dirZ = -z / Math.sqrt(x*x + z*z);
    
    // Position lamp panel offset from mast toward field
    const lampX = x + dirX * 3.0;
    const lampZ = z + dirZ * 3.0;
    const lampY = MAST_H - 2.0;

    // Single large glowing panel
    // Calculate rotation to face center (0, 0, 0)
    const angleToCenter = Math.atan2(-lampX, -lampZ);
    
    app.add(app.create('prim', {
      type: 'box',
      size: [0.5, 8.0, 12.0],  // Thin, tall, wide
      position: [lampX, lampY, lampZ],
      color: LAMP,
      emissive: LAMP,
      emissiveIntensity: 15,
      physics: 'static',
      rotation: [0, angleToCenter, 0]  // Rotate around Y to face center
    }));

    // Support arm connecting lamp to mast
    app.add(app.create('prim', {
      type: 'box',
      size: [Math.abs(lampX - x) + MAST_W/2, 0.4, 0.4],
      position: [(lampX + x)/2, lampY, (lampZ + z)/2],
      color: STEEL,
      physics: 'static',
      rotation: [0, Math.atan2(dirZ, dirX), 0]
    }));
  }

  // Build 4 corner towers
  buildTower(OUT_X, OUT_Z);    // front-right
  buildTower(OUT_X, -OUT_Z);   // back-right
  buildTower(-OUT_X, OUT_Z);   // front-left
  buildTower(-OUT_X, -OUT_Z);  // back-left
})();

// =============== FULL-SPAN SIDELINE CANOPIES =================
(function buildSidelineCanopies() {
  // Pull/duplicate the seating params we already used so the roof lines up
  const _BORDER_W   = (typeof BORDER_W   !== 'undefined') ? BORDER_W   : 1.8288;
  const _TEAM_DEPTH = (typeof TEAM_DEPTH !== 'undefined') ? TEAM_DEPTH : 6.0;

  // Same derivations as seating
  const FRONT_CLEAR   = Math.max(8.0, _BORDER_W + _TEAM_DEPTH + 2.0);
  const TREAD         = 0.85,  RISER = 0.40;
  const LOWER_ROWS    = 18,    UPPER_ROWS = 22;
  const CONCOURSE_W   = 4.0,   CONCOURSE_H = 2.8, UPPER_SETBACK = 3.2;

  // X length across all sections (same as your seating calc)
  const seatPitch  = 0.48 + 0.04;            // SEAT_W + SEAT_GAP
  const sectionLen = 20 * seatPitch;         // COLS_PER_SEC * seatPitch
  const totalLen   = 9 * sectionLen + 8*1.4; // SECTIONS + (SECTIONS-1)*AISLE_GAP
  const leftEdgeX  = -totalLen / 2;

  // Canopy look/feel (tweak here)
  const CAN = {
    depth: 22.0,            // plan depth (m) measured from back line toward field
    thickness: 0.25,        // roof panel thickness
    pitchDeg: 8,            // downward pitch toward the field
    rearOverhang: 2.0,      // how much roof extends behind the back line
    frontFasciaDrop: 0.6,   // fascia depth at the front edge
    backFasciaDrop: 0.45,   // fascia depth at the rear edge
    clearanceTopRow: 1.2,   // vertical clear above top seat row
    colSize: 0.6,           // back columns size (square)
    colSpacing: 18.0,       // spacing of back columns along X
    colSetback: 1.0,        // columns sit this much behind the rear roof edge
    strutSize: [0.35, 0.35] // [thickness, width] of diagonals
  };

  const COL_CONCRETE = '#b8bbbf';
  const STEEL = '#7f8790';
  const ROOF  = '#bfc6cd';

  function buildSide(signZ) {
    const zSideline   = signZ * (FIELD_WID / 2);

    // Geometry of seating to find the top row + upper lip
    const concourseTopY = LOWER_ROWS * RISER + 0.02;
    const upperBaseZ = zSideline + signZ * (
      FRONT_CLEAR + LOWER_ROWS*TREAD + CONCOURSE_W + UPPER_SETBACK
    );
    const upperLipY = concourseTopY + CONCOURSE_H;

    const topRowY = upperLipY + (UPPER_ROWS - 1) * RISER;
    const yAnchor = topRowY + CAN.clearanceTopRow;        // where the roof “plane” sits

    // Back line of the roof (just behind the back of the upper rows)
    const zBackLine = upperBaseZ + signZ * (UPPER_ROWS * TREAD + CAN.rearOverhang);
    const zFrontLine = zBackLine - signZ * CAN.depth;     // toward the field
    const zCenter = (zBackLine + zFrontLine) / 2;

    // The big canopy panel (pitched toward field)
    const pitchRad = (Math.PI / 180) * CAN.pitchDeg;
    const canopy = app.create('prim', {
      type: 'box',
      size: [totalLen, CAN.thickness, CAN.depth],
      position: [0, yAnchor, zCenter],
      rotation: [ -signZ * pitchRad, 0, 0 ], // top side tilts down toward field; bottom side mirrors
      color: ROOF,
      physics: 'static'
    });
    app.add(canopy);

    // Rear fascia (vertical band) – doesn’t intersect seats
    const rearFascia = app.create('prim', {
      type: 'box',
      size: [totalLen, CAN.backFasciaDrop, 0.12],
      position: [0, yAnchor - CAN.backFasciaDrop/2, zBackLine + signZ*0.06],
      rotation: [ -signZ * pitchRad, 0, 0 ],
      color: ROOF,
      physics: 'static'
    });
    app.add(rearFascia);

    // Front fascia
    const frontFascia = app.create('prim', {
      type: 'box',
      size: [totalLen, CAN.frontFasciaDrop, 0.12],
      position: [0, yAnchor - CAN.frontFasciaDrop/2, zFrontLine - signZ*0.06],
      rotation: [ -signZ * pitchRad, 0, 0 ],
      color: ROOF,
      physics: 'static'
    });
    app.add(frontFascia);

    // Back columns along X (behind rear edge so they don't clip the crowd)
    const colHalf  = CAN.colSize / 2;
    const colTopY  = yAnchor - 0.1; // stop slightly below panel to avoid z-fighting
    const zCols    = zBackLine + signZ * (CAN.colSetback + CAN.colSize/2);

    const firstX = leftEdgeX + CAN.colSpacing/2;
    for (let x = firstX; x <= -firstX; x += CAN.colSpacing) {
      // footing
      app.add(app.create('prim', {
        type: 'box',
        size: [CAN.colSize*1.6, 0.35, CAN.colSize*1.6],
        position: [x, 0.175, zCols],
        color: COL_CONCRETE,
        physics: 'static'
      }));
      // column
      app.add(app.create('prim', {
        type: 'box',
        size: [CAN.colSize, colTopY, CAN.colSize],
        position: [x, colTopY/2, zCols],
        color: STEEL,
        physics: 'static'
      }));

      // Diagonal strut from column head to roof front third (adds realism / stiffness)
      const strutY = colTopY - 0.3;
      const strutToZ = zBackLine - signZ * (CAN.depth * 0.35);
      const runZ = Math.abs(strutToZ - zCols);
      const riseY = (yAnchor - strutY);
      const hyp = Math.sqrt(runZ*runZ + riseY*riseY);

      app.add(app.create('prim', {
        type: 'box',
        size: [CAN.strutSize[0], hyp, CAN.strutSize[1]],
        position: [x, strutY + riseY/2, (zCols + strutToZ)/2],
        rotation: [ -signZ * Math.atan2(riseY, runZ), 0, 0 ],
        color: STEEL,
        physics: 'static'
      }));
    }

    // A few purlins (beams) under the canopy running in Z so it reads as a roof
    const PURLIN_N = 5;
    for (let i = 0; i < PURLIN_N; i++) {
      const t = (i + 1) / (PURLIN_N + 1);
      const z = zBackLine - signZ * (CAN.depth * t);
      app.add(app.create('prim', {
        type: 'box',
        size: [totalLen - 0.5, 0.18, 0.22],
        position: [0, yAnchor - 0.12, z],
        rotation: [ -signZ * pitchRad, 0, 0 ],
        color: STEEL,
        physics: 'static'
      }));
    }
  }

  // Build both sides
  buildSide(+1);
  buildSide(-1);
})();
