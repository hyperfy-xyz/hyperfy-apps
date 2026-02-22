// Sky + Constant Volume Snow for Hyperfy
// - Sky/HDRI/Sun/Fog controls
// - Snow: volumetric box emitter (fills baseY..baseY+height)
// - Prewarm burst so snow is already in the air on start
// - Constant emission, no waves or pauses

app.configure(() => {
  return [
    {
      key: 'sky',
      label: 'Sky',
      type: 'file',
      kind: 'texture',
      hint: 'The image to use as the background.',
    },
    {
      key: 'hdr',
      label: 'HDR',
      type: 'file',
      kind: 'hdr',
      hint: 'The HDRI to use for reflections and lighting.',
    },
    {
      key: 'rotationY',
      label: 'Rotation',
      type: 'number',
      step: 10,
      bigStep: 50,
    },
    {
      key: '002',
      type: 'section',
      label: 'Sun'
    },
    {
      key: 'horizontalRotation',
      label: 'Direction',
      type: 'number',
      min: 0,
      max: 360,
      step: 10,
      bigStep: 50,
      initial: 0,
      dp: 0,
      hint: 'The direction of the sun in degrees',
    },
    {
      key: 'verticalRotation',
      label: 'Elevation',
      type: 'number',
      min: 0,
      max: 360,
      step: 10,
      bigStep: 50,
      initial: 0,
      dp: 0,
      hint: 'The elevation of the sun in degrees',
    },
    {
      key: 'intensity',
      label: 'Intensity',
      type: 'number',
      min: 0,
      max: 10,
      step: 0.1,
      initial: 1,
      dp: 1,
    },
    {
      key: '003',
      type: 'section',
      label: 'Fog'
    },
    {
      key: 'fogColor',
      label: 'Color',
      type: 'text',
      hint: 'The fog color. Leave blank to disable fog' 
    },
    {
      key: 'fogNear',
      label: 'Near',
      type: 'number',
      dp: 0,
      min: 0,
      step: 10,
      initial: 0,
      hint: 'The near distance for fog in metres'
    },
    {
      key: 'fogFar',
      label: 'Far',
      type: 'number',
      dp: 0,
      min: 0,
      step: 10,
      initial: 1000,
      hint: 'The far distance for fog in metres'
    },

    // Snow UI
    { key: 's001', type: 'section', label: 'Snow Image' },
    { key: 'snowImage', type: 'file', kind: 'texture', label: 'Snow PNG' },

    { key: 's002', type: 'section', label: 'Area & Height' },
    { key: 'width',  type: 'number', label: 'Width (m)',  min: 2, max: 500, step: 1, initial: 50 },
    { key: 'depth',  type: 'number', label: 'Depth (m)',  min: 2, max: 500, step: 1, initial: 50 },
    { key: 'height', type: 'number', label: 'Snow Height (m)', min: 2, max: 200, step: 1, initial: 30 },
    { key: 'baseY',  type: 'number', label: 'Ground Y (m)', min: -1000, max: 1000, step: 0.1, initial: 0 },

    { key: 's003', type: 'section', label: 'Density & Flow' },
    { key: 'rate',   type: 'number', label: 'Spawn Rate (per sec)', min: 50, max: 40000, step: 50, initial: 2400 },
    { key: 'maxSim', type: 'number', label: 'Max Simultaneous',     min: 100, max: 200000, step: 100, initial: 20000 },

    { key: 's004', type: 'section', label: 'Life & Speed' },
    { key: 'lifeMin',  type: 'range', label: 'Life Min (s)',  min: 2, max: 120, step: 0.1, initial: 25 },
    { key: 'lifeMax',  type: 'range', label: 'Life Max (s)',  min: 3, max: 180, step: 0.1, initial: 40 },
    { key: 'speedMin', type: 'range', label: 'Fall Speed Min', min: 0.05, max: 3.0, step: 0.01, initial: 0.18 },
    { key: 'speedMax', type: 'range', label: 'Fall Speed Max', min: 0.06, max: 4.0, step: 0.01, initial: 0.42 },

    { key: 's005', type: 'section', label: 'Look' },
    { key: 'sizeMin',   type: 'range', label: 'Size Min',   min: 0.02, max: 2.0, step: 0.01, initial: 0.06 },
    { key: 'sizeMax',   type: 'range', label: 'Size Max',   min: 0.03, max: 2.5, step: 0.01, initial: 0.14 },
    { key: 'baseAlpha', type: 'range', label: 'Base Alpha', min: 0.05, max: 1.0, step: 0.01, initial: 0.9 },
    {
      key: 'alphaOverLife',
      type: 'select',
      label: 'Alpha Over Life',
      options: [
        { label: 'Soft fade in/out', value: '0,0|0.1,1|0.9,1|1,0' },
        { label: 'Constant',         value: '0,1|1,1' },
        { label: 'Fade in only',     value: '0,0|0.3,1|1,1' },
        { label: 'Fade out only',    value: '0,1|1,0' }
      ],
      initial: '0,0|0.1,1|0.9,1|1,0'
    },
    {
      key: 'blending',
      type: 'select',
      label: 'Blending',
      options: [
        { label: 'Normal',   value: 'normal' },
        { label: 'Additive', value: 'additive' }
      ],
      initial: 'normal'
    },

    { key: 's006', type: 'section', label: 'Subtle Drift' },
    { key: 'driftAmount', type: 'range', label: 'Yaw Drift (deg)', min: 0, max: 30, step: 0.1, initial: 3 },
    { key: 'driftSpeed',  type: 'range', label: 'Drift Speed',     min: 0, max: 5,  step: 0.01, initial: 0.6 },

    { key: 's007', type: 'section', label: 'Startup Prewarm' },
    { key: 'prewarmFactor', type: 'range', label: 'Prewarm Factor (0–2× rate×avgLife)', min: 0, max: 2, step: 0.05, initial: 0.8 }
  ]
})

// SKY SETUP
const sky = app.create('sky')

sky.bg = app.config.sky?.url
sky.hdr = app.config.hdr?.url
sky.rotationY = app.config.rotationY * -DEG2RAD

const sunDirection = calculateSunDirection(
  app.config.verticalRotation || 0,
  app.config.horizontalRotation || 0
)
sky.sunDirection = sunDirection
sky.sunIntensity = app.config.intensity

sky.fogNear = app.config.fogNear
sky.fogFar = app.config.fogFar
sky.fogColor = app.config.fogColor

app.add(sky)

function calculateSunDirection(verticalDegrees, horizontalDegrees) {
  const verticalRad = verticalDegrees * DEG2RAD
  const horizontalRad = horizontalDegrees * DEG2RAD
  const x = Math.sin(verticalRad) * Math.sin(horizontalRad)
  const y = -Math.cos(verticalRad)
  const z = Math.sin(verticalRad) * Math.cos(horizontalRad)  
  return new Vector3(x, y, z)
}

// SNOW SETUP
function rngStr(min, max, fallback = 1) {
  const a = Number(min), b = Number(max)
  if (Number.isFinite(a) && Number.isFinite(b) && b > a) return `${a}~${b}`
  if (Number.isFinite(a)) return `${a}`
  if (Number.isFinite(b)) return `${b}`
  return `${fallback}`
}

const img = app.config.snowImage?.url
const W = Number(app.config.width ?? 50)
const D = Number(app.config.depth ?? 50)
const H = Number(app.config.height ?? 30)
const baseY = Number(app.config.baseY ?? 0)

// Volumen-Emitter: Box füllt den Raum von baseY..baseY+H
// ['box', width, height, depth, segments, 'volume', true]
const SHAPE = ['box', W, H, D, 1, 'volume', true]

// Parameter
const RATE     = Number(app.config.rate ?? 2400)
const MAX_SIM  = Number(app.config.maxSim ?? 20000)
const LIFE_MIN = Number(app.config.lifeMin ?? 25)
const LIFE_MAX = Number(app.config.lifeMax ?? 40)
const SPEED    = rngStr(app.config.speedMin ?? 0.18, app.config.speedMax ?? 0.42, 0.25)
const SIZE     = rngStr(app.config.sizeMin ?? 0.06, app.config.sizeMax ?? 0.14, 0.1)
const ALPHA    = String(app.config.baseAlpha ?? 0.9)
const ALPHA_OL = app.config.alphaOverLife ?? '0,0|0.1,1|0.9,1|1,0'
const BLEND    = app.config.blending ?? 'normal'

// Durchschnittliche Lebensdauer
const avgLife = (LIFE_MIN + LIFE_MAX) * 0.5
// Prewarm: initial viele Partikel, damit sofort überall Flocken in der Luft sind
const PREWARM_FACTOR = Number(app.config.prewarmFactor ?? 0.8)
const prewarmCount = Math.max(0, Math.round(RATE * avgLife * PREWARM_FACTOR))

const snow = app.create('particles', {
  image: img,
  shape: SHAPE,
  rate: RATE,
  max: MAX_SIM,
  life: rngStr(LIFE_MIN, LIFE_MAX, 30),
  speed: SPEED,
  size:  SIZE,
  alpha: ALPHA,
  alphaOverLife: ALPHA_OL,
  blending: BLEND,
  space: 'world',
  lit: false,
  direction: 1,
  bursts: prewarmCount > 0 ? [{ time: 0, count: prewarmCount }] : undefined,
})

// Box ist um ihren Mittelpunkt zentriert, daher center = baseY + H/2
snow.position.y = baseY + H * 0.5
app.add(snow)

// Subtile Drift
let t = 0
app.on('update', (dt) => {
  const driftSpeed = Number(app.config.driftSpeed ?? 0.6)
  const driftAmtDeg = Number(app.config.driftAmount ?? 3)
  if (driftSpeed > 0 && driftAmtDeg > 0) {
    t += dt * driftSpeed
    const deg = Math.sin(t) * driftAmtDeg
    snow.rotation.y = deg * DEG2RAD
  }
})
