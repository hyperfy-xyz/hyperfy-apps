const PREPARE_TIME = 10
const PLAY_TIME = 30
const END_TIME = 10
const POINTS_INTERVAL = 1
const POINTS_PER = 1 / 100

app.emit('hyperball:play')

const v1 = new Vector3()
const v2 = new Vector3()
const q1 = new Quaternion()
const e1 = new Euler()

const spawnBlue = app.get('SpawnBlue')
const spawnRed = app.get('SpawnRed')
const spawnLobby = app.get('SpawnLobby')

const btnArena = app.get('BtnArena')
const btnOutside = app.get('BtnOutside')
const btnLobby = app.get('BtnLobby')

const playerRingBlue = app.get('PlayerRingBlue')
const playerRingRed = app.get('PlayerRingRed')

const lobbyRingBlue = app.get('LobbyRingBlue')
const lobbyRingRed = app.get('LobbyRingRed')

const zoneBlue1 = app.get('ZoneBlue1')
const zoneBlue2 = app.get('ZoneBlue2')
const zoneRed1 = app.get('ZoneRed1')
const zoneRed2 = app.get('ZoneRed2')

const vialBlueLiquid = app.get('VialBlueLiquid')
const vialRedLiquid = app.get('VialRedLiquid')
const vialTimeLiquid = app.get('VialTimeLiquid')

const player = world.getPlayer()

btnArena.onPointerDown = () => teleport(player, spawnLobby)
btnOutside.onPointerDown = () => teleport(player, spawnLobby)
btnLobby.onPointerDown = () => teleport(player, spawnBlue)

function teleport(player, node) {
  const position = v1.setFromMatrixPosition(node.matrixWorld)
  const rotationY = e1.setFromRotationMatrix(node.matrixWorld).reorder('YXZ').y
  player.teleport(position, rotationY)
}

if (world.isServer) {
  const state = {
    ready: true,
    phase: 'queue',
    phaseAt: 0,
    players: new Map(),
    teams: {
      red: new Set(),
      blue: new Set(),
    },
    points: {
      red: 0,
      blue: 0,
    },
    multipliers: {
      red: 0,
      blue: 0,
    },
  }
  app.state = state
  app.send('state', state)
  function setPlayerTeam(id, team) {
    state.teams.red.delete(id)
    state.teams.blue.delete(id)
    if (team) {
      state.players.set(id, { id, team })
      state.teams[team].add(id)
    } else {
      state.players.delete(id)
    }
    app.send('setPlayerTeam', { id, team })
    // queue -> prepare
    if (state.phase === 'queue' && state.teams.red.size > 0 && state.teams.blue.size > 0) {
      setPhase('prepare')
    }
    // prepare -> queue
    if (state.phase === 'prepare' && (state.teams.red.size <= 0 || state.teams.blue.size <= 0)) {
      setPhase('queue')
    }
  }
  function setPhase(phase) {
    state.phase = phase
    state.phaseAt = world.getTime()
    console.log('phase:', state.phase, state.phaseAt)
    app.send('phase', { phase: state.phase, phaseAt: state.phaseAt })
    if (state.phase === 'queue') {
      // ...
    }
    if (state.phase === 'play') {
      // ...
    }
    if (state.phase === 'end') {
      // ...
    }
  }
  function onLobbyRingTrigger(player, team) {
    if (state.phase === 'queue' || state.phase === 'prepare') {
      setPlayerTeam(player.entityId, team)
    }
  }
  lobbyRingBlue.onTriggerEnter = e => onLobbyRingTrigger(e.player, 'blue')
  lobbyRingBlue.onTriggerLeave = e => onLobbyRingTrigger(e.player, null)
  lobbyRingRed.onTriggerEnter = e => onLobbyRingTrigger(e.player, 'red')
  lobbyRingRed.onTriggerLeave = e => onLobbyRingTrigger(e.player, null)
  function onZoneTrigger(tag, team, didEnter) {
    if (tag !== 'hyperball:ball') return
    const amt = didEnter ? 1 : -1
    state.multipliers[team] += amt
    if (state.multipliers[team] < 0) state.multipliers[team] = 0
    // console.log(`red:${state.multipliers.red} blue:${state.multipliers.blue}`)
  }
  zoneBlue1.onTriggerEnter = e => onZoneTrigger(e.tag, 'blue', true)
  zoneBlue2.onTriggerEnter = e => onZoneTrigger(e.tag, 'blue', true)
  zoneRed1.onTriggerEnter = e => onZoneTrigger(e.tag, 'red', true)
  zoneRed2.onTriggerEnter = e => onZoneTrigger(e.tag, 'red', true)
  zoneBlue1.onTriggerLeave = e => onZoneTrigger(e.tag, 'blue', false)
  zoneBlue2.onTriggerLeave = e => onZoneTrigger(e.tag, 'blue', false)
  zoneRed1.onTriggerLeave = e => onZoneTrigger(e.tag, 'red', false)
  zoneRed2.onTriggerLeave = e => onZoneTrigger(e.tag, 'red', false)
  let lastPoints = 0
  app.on('fixedUpdate', delta => {
    const now = world.getTime()
    const start = state.phaseAt
    const elapsed = now - start
    if (state.phase === 'queue') {
      // ...
    } else if (state.phase === 'prepare') {
      if (elapsed > PREPARE_TIME) {
        state.multipliers.blue = 0
        state.multipliers.red = 0
        for (const [_, player] of state.players) {
          const p = world.getPlayer(player.id)
          const node = player.team === 'red' ? spawnRed : spawnBlue
          teleport(p, node)
        }
        app.emit('hyperball:play')
        setPhase('play')
      }
    } else if (state.phase === 'play') {
      lastPoints += delta
      if (lastPoints > POINTS_INTERVAL) {
        lastPoints = 0
        state.points.red += state.multipliers.red * POINTS_PER
        state.points.blue += state.multipliers.blue * POINTS_PER
        app.send('points', state.points)
      }
      const remaining = PLAY_TIME - elapsed
      if (remaining < 0 || state.points.red >= 1 || state.points.blue >= 1) {
        const winningTeam = state.points.red > state.points.blue ? 'red' : 'blue'
        for (const [_, player] of state.players) {
          const p = world.getPlayer(player.id)
          const node = spawnLobby
          teleport(p, node)
          if (player.team !== winningTeam) {
            setPlayerTeam(player.id, null)
          }
        }
        setPhase('end')
      }
    } else if (state.phase === 'end') {
      if (elapsed > END_TIME) {
        state.points.red = 0
        state.points.blue = 0
        app.send('points', state.points)
        for (const [_, player] of state.players) {
          setPlayerTeam(player.id, null)
        }
        setPhase('queue')
      }
    }
  })
  world.on('leave', e => {
    setPlayerTeam(e.player.entityId, null)
  })
}

if (world.isClient) {
  vialBlueLiquid.scale.y = 0
  vialRedLiquid.scale.y = 0
  vialTimeLiquid.scale.y = 0
  let state
  if (app.state.ready) {
    init(app.state)
  } else {
    app.on('state', init)
  }
  function init(_state) {
    state = _state
    console.log('state', state)
    for (const [_, player] of state.players) {
      player.ring = player.team === 'blue' ? playerRingBlue.clone() : playerRingRed.clone()
      world.add(player.ring)
    }
    const lobbyRingsActive = state.phase === 'queue' || state.phase === 'prepare'
    lobbyRingBlue.active = lobbyRingsActive
    lobbyRingRed.active = lobbyRingsActive
    const notifier = makeNotifier()
    vialBlueLiquid.scale.y = state.points.blue
    vialRedLiquid.scale.y = state.points.red
    if (state.phase === 'play') {
      const now = world.getTime()
      const start = state.phaseAt
      const elapsed = now - start
      const remaining = PLAY_TIME - elapsed
      vialTimeLiquid.scale.y = remaining / PLAY_TIME
    } else {
      vialTimeLiquid.scale.y = 0
    }
    app.on('setPlayerTeam', ({ id, team }) => {
      let player = state.players.get(id)
      if (player) world.remove(player.ring)
      state.teams.red.delete(id)
      state.teams.blue.delete(id)
      state.players.delete(id)
      if (!team) return
      const ring = team === 'blue' ? playerRingBlue.clone() : playerRingRed.clone()
      world.add(ring)
      player = { id, team, ring }
      state.players.set(id, player)
      state.teams[team].add(id)
    })
    app.on('phase', ({ phase, phaseAt }) => {
      state.phase = phase
      state.phaseAt = phaseAt
      console.log('phase:', phase, phaseAt)
      if (state.phase === 'queue') {
        notifier.set(null)
        lobbyRingBlue.active = true
        lobbyRingRed.active = true
      }
      if (state.phase === 'prepare') {
        // ...
      }
      if (state.phase === 'play') {
        notifier.set(null)
        lobbyRingBlue.active = false
        lobbyRingRed.active = false
      }
      if (state.phase === 'end') {
        notifier.set(null)
        vialTimeLiquid.scale.y = 0
      }
    })
    app.on('points', points => {
      state.points = points
      vialBlueLiquid.scale.y = state.points.blue
      vialRedLiquid.scale.y = state.points.red
    })
    app.on('lateUpdate', delta => {
      for (const [_, player] of state.players) {
        const p = world.getPlayer(player.id)
        if (!p) continue
        player.ring.position.copy(p.position)
      }
      const now = world.getTime()
      const start = state.phaseAt
      const elapsed = now - start
      if (state.phase === 'queue') {
      }
      if (state.phase === 'prepare') {
        const remaining = Math.floor(PREPARE_TIME - elapsed)
        notifier.set(`Starting in ${remaining}...`)
      }
      if (state.phase === 'play') {
        notifier.set(null)
        const remaining = PLAY_TIME - elapsed
        vialTimeLiquid.scale.y = remaining / PLAY_TIME
        vialBlueLiquid.scale.y = state.points.blue
        vialRedLiquid.scale.y = state.points.red
        console.log(state.points.blue, state.points.redAW)
      }
      if (state.phase === 'end') {
        // ...
      }
    })
  }
}

function makeNotifier() {
  const root = app.get('Notifier')

  const ui = app.create('ui')
  // ui.backgroundColor = 'red'
  ui.doubleside = false
  ui.width = 600
  ui.height = 200
  ui.justifyContent = 'center'
  ui.alignItems = 'center'
  root.add(ui)

  const text = app.create('uitext')
  text.value = ''
  text.color = 'white'
  text.fontSize = 50
  ui.add(text)

  return {
    set(value) {
      text.value = value || ''
    },
  }
}
