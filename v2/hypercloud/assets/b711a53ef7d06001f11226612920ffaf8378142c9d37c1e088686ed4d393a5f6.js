const SIZE = 3 // Distance from one hexagon point to its opposite point
const RINGS = 10 // Number of rings to generate
const LAYERS = 6
const HEIGHT = 50 // meters above app where the bottom layer begins
const GAP = 10 // gap size between layers

const QUEUE_TIME = 15 // seconds
const START_TIME = 5 // seconds

const FORWARD = new Vector3(0, 0, -1)

const v1 = new Vector3()
const q1 = new Quaternion(0, 0, 0, 1)
const e1 = new Euler().reorder('YXZ')

const totalHexagons = (1 + 3 * RINGS * (RINGS + 1)) * LAYERS

const origin = new Vector3().copy(app.position)

const localPlayer = world.getPlayer()

const activeTpl = app.get('Active')
const fallingTpl = app.get('Falling')
const cageTpl = app.get('Cage')
const deathZone = app.get('DeathZone')
app.remove(activeTpl)
app.remove(fallingTpl)
app.remove(cageTpl)
app.remove(deathZone)

const maxRadius = ((SIZE * RINGS * 2) + SIZE) / 2
const deathZoneWidth = (maxRadius * 2) + 10
const deathZoneHeight = (LAYERS * GAP) + GAP + GAP
deathZone.position.set(0, HEIGHT + (deathZoneHeight / 2), 0)
deathZone.scale.set(deathZoneWidth, deathZoneHeight, deathZoneWidth)

console.log('#hexagons', totalHexagons)

if (world.isServer) {
  const state = app.state

  // generate hexagons
  const hexagons = []
  for (let i = 0; i < LAYERS; i++) {
    const y = HEIGHT + (i * GAP)
    generateLayer(pos => {
      const idx = hexagons.length
      pos.y += y
      const hexagon = createHexagon(pos, playerId => {
        state.hexagons[idx] = 1
        app.send('trip', idx)
      })
      hexagons.push(hexagon)
    })
  }

  // watch death zone
  app.add(deathZone)
  deathZone.onTriggerLeave = (e) => {
    if (!e.playerId) return
    if (!state.players.has(e.playerId)) return
    if (state.phase !== 'play' && state.phase !== 'start') return
    state.players.delete(e.playerId)
    if (!state.players.size) {
      const winner = state.phase === 'play'
      state.phase = 'idle'
      state.hexagons.fill(1)
      for (const hexagon of hexagons) {
        hexagon.deactivate()
      }
      app.send('idle')
      if (winner) {
        app.send('winner', e.playerId)
      }
    }
  }

  app.on('queue', (_, playerId) => {
    // if idle phase
    if (state.phase === 'idle') {
      // queue and start countdown
      state.phase = 'queue'
      state.phaseEndsAt = world.getTime() + QUEUE_TIME
      state.players.add(playerId)
      app.send('queue', [state.players, state.phaseEndsAt])
    }
    // if queue phase, enter or leave the queue
    else if (state.phase === 'queue') {
      const queued = state.players.has(playerId)
      if (!queued) {
        // join queue
        state.players.add(playerId)
        app.send('player-join', playerId)
      } else {
        // leave queue
        state.players.delete(playerId)
        if (state.players.size) {
          app.send('player-leave', playerId)
        } else {
          // no players left, go back to idle
          state.phase = 'idle'
          state.phaseEndsAt = null
          app.send('idle')
        }
      }
    }
  })
  app.on('update', delta => {
    if (state.phase === 'queue') {
      const time = world.getTime()
      if (time >= state.phaseEndsAt) {
        state.phase = 'start'
        state.phaseEndsAt = time + START_TIME
        state.hexagons.fill(0)
        for (const hexagon of hexagons) {
          hexagon.activate()
        }
        const playerIds = Array.from(state.players)
        app.send('start', [playerIds, state.phaseEndsAt])
      }
    }
    else if (state.phase === 'start') {
      const time = world.getTime()
      if (time >= state.phaseEndsAt) {
        state.phase = 'play'
        state.phaseEndsAt = null
        app.send('play')
      }
    }
  })
  world.on('leave', e => {
    if (state.players.has(e.playerId)) {
      state.players.delete(e.playerId)
      if (state.players.size) {
        app.send('player-leave', playerId)
      } else if (state.phase === 'play') {
        state.phase = 'idle'
        app.send('idle')
        app.send('winner', e.playerId)
      } else {
        state.phase = 'idle'
        state.hexagons.fill(2)
        app.send('idle')
      }
    }
  })
  state.phase = 'idle'
  state.phaseEndsAt = null
  state.players = new Set()
  state.hexagons = new Array(totalHexagons).fill(2)
  state.ui = { 
    active: true,
    title: 'HyperCloud',
    subtitle: '',
  }
  state.ready = true
  app.send('init', state)
}

if (world.isClient) {
  // app.add(deathZone)
  if (app.state.ready) {
    init(app.state)
  } else {
    app.on('init', init)
  }
  function init(state) {
    console.log('init', state)

    // create ui
    const ui = createUI(state.ui)
    if (state.phase === 'idle') {
      ui.title = 'HyperCloud'
      ui.subtitle = 'No Players'
      ui.visible = true
    } else if (state.phase === 'queue') {
      ui.title = 'HyperCloud'
      ui.subtitle = `Starting in ${Math.round(state.phaseEndsAt - world.getTime())} (${state.players.size} Players)`
      ui.visible = true
    }

    // generate hexagons
    console.time('generate')
    const hexagons = []
    for (let i = 0; i < LAYERS; i++) {
      const y = HEIGHT + (i * GAP)
      generateLayer(pos => {
        const idx = hexagons.length
        pos.y += y
        const hexagon = createHexagon(pos)
        if (state.hexagons[idx] === 0) {
          hexagon.activate()
        }
        hexagons.push(hexagon)
      })
    }
    console.timeEnd('generate')

    const base = activeTpl.clone(true)
    const action = app.create('action', {  
      distance: 10,
      duration: 0.5,
      onTrigger: () => app.send('queue')
    })
    action.position.y += 1.1
    base.add(action)
    if (state.phase === 'idle') {
      action.label = 'Start Game'
      app.add(base)
    }
    if (state.phase === 'queue') {
      action.label = state.players.has(localPlayer.id) ? 'Leave Game' : 'Join Game'
      app.add(base)
    }

    // const btn = activeTpl.clone(true)
    // btn.onPointerDown = () => app.send('queue')    
    // if (state.phase === 'idle' || state.phase === 'queue') {
    //   app.add(btn)      
    // }

    // init cages group
    const cages = app.create('group')
    cages.position.y = HEIGHT + (LAYERS * GAP)
    app.add(cages)

    console.log(state.phase)

    app.on('idle', () => {
      state.phase = 'idle'
      state.phaseEndsAt = null
      state.players.clear()
      ui.title = 'HyperCloud'
      ui.subtitle = 'No Players'
      ui.visible = true
      app.add(base)
      action.label = 'Start Game'
      for (const hexagon of hexagons) {
        hexagon.deactivate()
      }
      for (const child of cages.children) {
        cages.remove(child)
      }
      console.log('idle')
    })
    app.on('queue', ([players, phaseEndsAt]) => {
      state.phase = 'queue'
      state.phaseEndsAt = phaseEndsAt
      state.players = players
      ui.title = 'HyperCloud'
      ui.subtitle = `Starting in ${Math.round(state.phaseEndsAt - world.getTime())} (${state.players.size} Players)`
      ui.visible = true
      action.label = state.players.has(localPlayer.id) ? 'Leave Game' : 'Join Game'
      console.log('queue')
    })
    app.on('player-leave', playerId => {
      state.players.delete(playerId)
      console.log('player-leave')
    })
    app.on('player-join', playerId => {
      state.players.add(playerId)
      console.log('player-join')
    })
    app.on('start', ([playerIds, phaseEndsAt]) => {
      state.phase = 'start'
      state.phaseEndsAt = phaseEndsAt
      state.hexagons.fill(0)
      ui.visible = false
      app.remove(base)
      for (const hexagon of hexagons) {
        hexagon.activate()
      }
      for (let i = 0; i < playerIds.length; i++) {
        const playerId = playerIds[i]
        const group = app.create('group')
        group.rotation.y = (360 / playerIds.length) * DEG2RAD * i
        cages.add(group)
        const cage = cageTpl.clone(true)
        cage.position.x = maxRadius / 3
        group.add(cage)
        if (localPlayer.id === playerId) {
          localPlayer.teleport(v1.setFromMatrixPosition(cage.matrixWorld))
        }
      }
      console.log('start')
    })
    app.on('play', () => {
      state.phase = 'play'
      state.phaseEndsAt = null
      for (const child of cages.children) {
        cages.remove(child)
      }
      console.log('play')
    })
    app.on('trip', (idx) => {
      hexagons[idx].trip()
    })
    app.on('winner', playerId => {
      const player = world.getPlayer(playerId)
      console.log('winner:', player.name)
      world.chat({
        body: `${player.name} is the WINNER!`
      })
      showWinnerParticles(player)
    })
    app.on('update', delta => {
      if (state.phase === 'queue') {
        ui.subtitle = `${state.players.size} Player${state.players.size > 1 ? 's' : ''} - Starting in ${Math.round(state.phaseEndsAt - world.getTime())}`
      }
    })
  }
}

function createUI(data) {
  const $ui = app.create('ui', {
    pivot: 'bottom-center',
    width: 300,
    height: 150,
    // backgroundColor: 'black',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 10,
  })
  const $title = app.create('uitext', {
    value: '',
    color: 'white',
    fontSize: 30,
    margin: [0, 0, 20, 0],
  })
  $ui.add($title)
  const $subtitle = app.create('uitext', {
    value: '',
    color: 'white',
    fontSize: 25,
    margin: [0, 0, 20, 0],
  })
  $ui.add($subtitle)
  $ui.position.copy(app.position)
  $ui.position.y += 0.7
  const control = app.control()
  app.on('update', delta => {
    if (!$ui.active) return
    // match camera Y rotation
    e1.setFromQuaternion(control.camera.quaternion)
    e1.x = 0
    e1.z = 0
    $ui.quaternion.setFromEuler(e1)
  })
  return {
    set active(value) {
      $ui.active = value
    },
    set title(value) {
      $title.value = value
    },
    set subtitle(value) {
      $subtitle.value = value
    },
    set visible(value) {
      value ? world.add($ui) : world.remove($ui)
    }
  }
}

// showWinnerParticles(world.getPlayer())

function showWinnerParticles(player) {
  const particles = app.create('particles', {
    shape: ['box', 0.8, 1.6, 0.8, 1, 'volume', false],
    rate: 40,
    rateOverDistance: 10,
    color: '#1D4BA8',
    size: '0.001~0.04',
    // speed: '0.1',
    alpha: '0.5',
    emissive: '1000',
    life: '0.5',
    space: 'world',
    alphaOverLife: '0,0|0.2,1|0.8,1|1,0',
    velocityLinear: new Vector3(0, 0.3, 0),
    velocityOrbital: new Vector3(0, 0.3, 0),
  })
  particles.position.y += 0.8
  const group = app.create('group')
  group.add(particles)
  world.add(group)
  group.position.copy(player.position)
  let elapsed = 0
  const update = delta => {
    group.position.copy(player.position)
    elapsed += delta
    if (elapsed > 30) {
      world.remove(group)
      app.off('update', update)
    }
  }
  app.on('update', update)
}

function createHexagon(pos, onTrip) {
  let rotY = 60 * num(1,6) * DEG2RAD
  let mode
  function setMode(fn) {
    mode?.()
    mode = fn?.()
  }
  function $activate() {
    const body = activeTpl.clone(true)
    body.position.set(pos.x, pos.y, pos.z)
    body.rotation.y = rotY
    if (world.isServer) {
      body.onTriggerEnter = (e) => {
        onTrip(e.playerId)
        // const player = world.getPlayer(e.playerId)
        // if (player !== localPlayer) return
        setMode($trip)
      }
    }
    app.add(body)
    return () => {
      app.remove(body)
    }
  }
  function $trip() {
    const body = fallingTpl.clone(true)
    body.position.copy(pos)
    body.rotation.y = rotY
    app.add(body)
    let remaining = 1.5
    const update = delta => {
      remaining -= delta
      if (remaining <= 0) {
        setMode($fall)
      }
    }
    app.on('update', update)
    return () => {
      app.off('update', update)
      app.remove(body)
    }
  }
  function $fall() {
    const body = fallingTpl.clone(true)
    body.position.copy(pos)
    body.rotation.y = rotY
    body.get('FallingCollider').active = false
    app.add(body)
    let remaining = 0.2
    const update = delta => {
      body.getPosition(v1)
      v1.y -= 5 * delta
      body.get
      body.setKinematicTarget(v1, body.getQuaternion(q1))
      remaining -= delta
      if (remaining <= 0) {
        setMode(null)
      }
    }
    app.on('update', update)
    return () => {
      app.off('update', update)
      app.remove(body)
    }
  }
  return {
    activate() {
      setMode($activate)
    },
    trip() {
      setMode($trip)
    },
    fall() {
      setMode($fall)
    },
    deactivate() {
      setMode(null)
    },
  }
}

function generateLayer(onCreate) {
  // For a regular hexagon with point-to-point distance = SIZE:
  // - The side length = SIZE / 2
  // - Width (flat-to-flat) = SIZE * √3/2
  // - Height (point-to-point) = SIZE
  const sideLength = SIZE / 2
  const hexWidth = SIZE * Math.sqrt(3) / 2

  // Helper function to get hexagon position based on axial coordinates
  function hexToPosition(q, r) {
    // Correct spacing for touching hexagons
    // Horizontal spacing = hexWidth = SIZE * √3/2
    // Vertical spacing = SIZE * 3/4 (for proper tessellation)
    const x = hexWidth * (q + r / 2)
    const z = SIZE * 0.75 * r
    return new Vector3(x, 0, z)
  }

  // Start with center hexagon
  const center = new Vector3(0, 0, 0)
  // const centerHex = activeTpl.clone(true)
  // centerHex.position.x = center.x
  // centerHex.position.z = center.z
  // app.add(centerHex)
  onCreate(center.clone())
  // console.log('Center hex at:', center.x, center.z)

  let count = 0

  // Generate hexagons in proper hexagonal rings
  for (let ring = 1; ring <= RINGS; ring++) {
    // console.log('Generating ring', ring)
      
    // Start at the rightmost position of the ring
    let q = ring
    let r = 0
      
    // Six directions in hexagonal grid (counter-clockwise)
    const directions = [
      { q: -1, r: 1 },  // NW
      { q: -1, r: 0 },  // W
      { q: 0, r: -1 },  // SW
      { q: 1, r: -1 },  // SE
      { q: 1, r: 0 },   // E
      { q: 0, r: 1 }    // NE
    ]
      
    // For each side of the hexagon ring
    for (let side = 0; side < 6; side++) {
      // Place 'ring' number of hexagons along each side
      for (let i = 0; i < ring; i++) {
        const pos = hexToPosition(q, r)

        pos.add(center)

        onCreate(pos)

        // console.log(`Ring ${ring}, side ${side}, hex ${i} at:`, pos.x.toFixed(2), pos.z.toFixed(2), '(q:', q, 'r:', r, ')')

        count++
              
        // Move to next position along the current side
        // Move after every hex except the last one on the last side
        if (!(side === 5 && i === ring - 1)) {
          q += directions[side].q
          r += directions[side].r
        }
      }
    }
  }

  // console.log('count', count)

}


