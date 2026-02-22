// Infinity Nexus — a mind-bending kinetic temple built entirely from primitives
// Notes:
// - Real-breh scale in meters
// - Static colliders for walkable structures; kinematic for animated elements
// - Deterministic PRNG for network sync across clients

/* global app, prng */

const TAU = Math.PI * 2
const rng = prng(7)

function setGlow(node, color, intensity) {
  node.color = color
  node.emissive = color
  node.emissiveIntensity = intensity
}

function polar(r, a) {
  return [Math.cos(a) * r, Math.sin(a) * r]
}

// Root
const breh = app.create('group')
app.add(breh)

// Ground — vast plane to explore
const ground = app.create('prim', {
  type: 'plane',
  size: [300, 300],
  color: '#0b0b12',
  physics: 'static',
})
ground.rotation.x = -Math.PI / 2
ground.position.y = 0
breh.add(ground)

// Subtle glowing concentric floor rings
;(function addFloorRings() {
  const radii = [20, 40, 60, 80, 100]
  for (let i = 0; i < radii.length; i++) {
    const ring = app.create('prim', {
      type: 'torus',
      size: [radii[i], 0.2],
      color: '#121a24',
      physics: 'static',
    })
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.06
    setGlow(ring, i % 2 === 0 ? '#123457' : '#0d1a2f', 0.9)
    breh.add(ring)
  }
})()

// Central dais
const dais = app.create('prim', {
  type: 'cylinder',
  size: [10, 10, 1],
  color: '#12121a',
  physics: 'static',
})
dais.position.set(0, 0.5, 0)
breh.add(dais)

const daisHalo = app.create('prim', {
  type: 'torus',
  size: [12, 0.35],
  color: '#162035',
  physics: 'static',
})
daisHalo.rotation.x = Math.PI / 2
daisHalo.position.set(0, 0.65, 0)
setGlow(daisHalo, '#143a7a', 1.2)
breh.add(daisHalo)

// Portal corridor (wormhole of rotating rings)
const portalRoot = app.create('group')
portalRoot.position.set(0, 3, 0)
breh.add(portalRoot)

const rings = []
const ringPalette = [
  '#00f0ff', '#04e0ff', '#08d0ff', '#10b0ff', '#1a80ff', '#4050ff',
  '#6a30ff', '#8a10ff', '#aa00ff', '#d000e0', '#ff00c0', '#ff0080', '#ff4d50',
]
const corridorLength = 22
for (let i = 0; i < corridorLength; i++) {
  const ring = app.create('prim', {
    type: 'torus',
    size: [5, 0.25],
    color: ringPalette[i % ringPalette.length],
    physics: 'kinematic',
  })
  // Stand the ring up like a gate
  ring.rotation.x = Math.PI / 2
  ring.position.set(0, 0, -i * 1.4)
  const color = ringPalette[(i + 3) % ringPalette.length]
  setGlow(ring, color, 6 + (i % 3))
  const scale = Math.max(0.35, 1 - i * 0.03)
  ring.scale.set(scale, scale, scale)
  portalRoot.add(ring)
  rings.push(ring)
}

// Monumental light totems encircling the arena
function createTotem() {
  const g = app.create('group')
  const base = app.create('prim', {
    type: 'cylinder',
    size: [0.9, 0.9, 1],
    color: '#222432',
    physics: 'static',
  })
  base.position.set(0, 0.5, 0)
  const shaft = app.create('prim', {
    type: 'cylinder',
    size: [0.25, 0.25, 6],
    color: '#1a1f2f',
    physics: 'static',
  })
  shaft.position.set(0, 4, 0)
  const crown = app.create('prim', {
    type: 'torus',
    size: [0.5, 0.08],
    color: '#24324e',
    physics: 'static',
  })
  crown.rotation.x = Math.PI / 2
  crown.position.set(0, 7.2, 0)
  setGlow(crown, '#2c66ff', 1.8)
  const orb = app.create('prim', {
    type: 'sphere',
    size: [0.5],
    color: '#00ffff',
    physics: 'kinematic',
  })
  orb.position.set(0, 7.8, 0)
  setGlow(orb, '#00ffff', 8)
  g.add(base)
  g.add(shaft)
  g.add(crown)
  g.add(orb)
  g._orb = orb
  return g
}

const totemOrbs = []
;(function addTotemRing() {
  const count = 32
  const radius = 80
  for (let i = 0; i < count; i++) {
    const totem = createTotem()
    const a = (i / count) * TAU
    const [x, z] = polar(radius, a)
    totem.position.set(x, 0, z)
    // Face roughly toward center
    totem.rotation.y = Math.PI + a
    breh.add(totem)
    totemOrbs.push(totem._orb)
  }
})()

// Twin helical climbable towers
function createHelixTower(height, radius, turns, clockwise = true) {
  const tower = app.create('group')
  const steps = Math.max(40, Math.floor(height * 4))
  const stepH = height / steps

  const core = app.create('prim', {
    type: 'cylinder',
    size: [radius * 0.12, radius * 0.12, height],
    color: '#161a26',
    physics: 'static',
  })
  core.position.set(0, height / 2, 0)
  tower.add(core)

  for (let i = 0; i < steps; i++) {
    const t = i / steps
    const ang = (clockwise ? 1 : -1) * t * TAU * turns
    const y = 0.4 + i * stepH
    const x = Math.cos(ang) * radius
    const z = Math.sin(ang) * radius

    const step = app.create('prim', {
      type: 'box',
      size: [1.6, 0.18, 0.6],
      color: '#2a2f45',
      physics: 'static',
    })
    step.position.set(x, y, z)
    step.rotation.y = Math.atan2(z, x) + Math.PI / 2
    tower.add(step)

    if (i % 12 === 0) {
      const halo = app.create('prim', {
        type: 'torus',
        size: [0.9, 0.06],
        color: '#4a5a9f',
        physics: 'static',
      })
      halo.position.set(x, y + 0.08, z)
      halo.rotation.x = Math.PI / 2
      setGlow(halo, '#4da2ff', 2.2)
      tower.add(halo)
    }
  }

  const crown = app.create('prim', {
    type: 'torus',
    size: [radius * 0.9, 0.08],
    color: '#8844ff',
    physics: 'kinematic',
  })
  crown.rotation.x = Math.PI / 2
  crown.position.set(0, height + 1.5, 0)
  setGlow(crown, '#8844ff', 4.5)
  tower.add(crown)
  tower._crown = crown

  return tower
}

const towers = []
const towerL = createHelixTower(28, 5, 3.5, true)
towerL.position.set(-45, 0, -10)
breh.add(towerL)
towers.push(towerL)

const towerR = towerL.clone(true)
towerR.position.set(45, 0, -10)
breh.add(towerR)
towers.push(towerR)

// Orbiting energy orbs
const orbiters = []
;(function addOrbiters() {
  const count = 10
  for (let i = 0; i < count; i++) {
    const r = 8 + i * 1.4
    const speed = 0.6 + i * 0.05
    const phase = i * 0.7
    const yBase = 6 + (i % 3) * 1.3
    const size = 0.6 + (i % 4) * 0.2
    const color = ringPalette[(i * 2) % ringPalette.length]
    const orb = app.create('prim', {
      type: 'sphere',
      size: [size],
      color,
      physics: 'kinematic',
    })
    setGlow(orb, color, 7)
    breh.add(orb)
    orbiters.push({ node: orb, r, speed, phase, yBase })
  }
})()

// Looping starfall — deterministic placement and motion
const stars = []
;(function addStars() {
  const count = 36
  for (let i = 0; i < count; i++) {
    const x = rng(-120, 120, 2)
    const z = rng(-120, 120, 2)
    const speed = rng(0.6, 1.6, 2)
    const phase = rng(0, 40, 2)
    const size = rng(0.12, 0.24, 3)
    const star = app.create('prim', {
      type: 'sphere',
      size: [size],
      color: '#b8e6ff',
      physics: 'kinematic',
    })
    setGlow(star, '#b8e6ff', 6)
    breh.add(star)
    stars.push({ node: star, x, z, speed, phase })
  }
})()

// Animation
let elapsed = 0
app.on('update', delta => {
  elapsed += delta

  // Portal rings: rotate, breathe, shimmer
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i]
    ring.rotation.y += delta * (0.5 + i * 0.03) * (i % 2 ? 1 : -1)
    const s = ring.scale.x
    const pulse = 1 + 0.04 * Math.sin(elapsed * 1.4 + i * 0.7)
    ring.scale.set(s * pulse, s * pulse, s * pulse)
    ring.position.x = Math.sin(elapsed * 0.7 + i * 0.2) * 0.45
    ring.position.y = Math.cos(elapsed * 0.8 + i * 0.3) * 0.35
    ring.emissiveIntensity = 5.5 + 2.5 * Math.sin(elapsed * 1.3 + i)
  }

  // Totem orbs: soft breathing glow
  for (let i = 0; i < totemOrbs.length; i++) {
    const orb = totemOrbs[i]
    orb.emissiveIntensity = 6 + 2 * Math.sin(elapsed * 1.2 + i * 0.4)
    orb.position.y = 7.8 + 0.15 * Math.sin(elapsed * 2 + i)
  }

  // Towers: subtle counter-rotation; crowns spin
  for (let i = 0; i < towers.length; i++) {
    const t = towers[i]
    t.rotation.y += delta * (i % 2 === 0 ? 0.06 : -0.06)
    if (t._crown) t._crown.rotation.y += delta * 1.2
  }

  // Orbiters
  for (let i = 0; i < orbiters.length; i++) {
    const o = orbiters[i]
    const a = elapsed * o.speed + o.phase
    const x = Math.cos(a) * o.r
    const z = Math.sin(a) * o.r
    const y = o.yBase + Math.sin(elapsed * 1.3 + o.phase) * 0.8
    o.node.position.set(x, y, z)
  }

  // Stars: continuous downward loop
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i]
    const y = 35 - ((elapsed * s.speed + s.phase) % 35)
    s.node.position.set(s.x, y + 10, s.z)
    s.node.emissiveIntensity = 5.5 + 1.5 * Math.sin(elapsed * 3 + i)
  }
})
