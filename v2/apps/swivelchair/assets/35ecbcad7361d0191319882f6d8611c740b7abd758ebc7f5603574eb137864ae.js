app.configure([
  {
    key: 'emote',
    type: 'file',
    kind: 'emote',
    label: 'Emote',
  }
])

const state = app.state
const chair = app.get('DeskChairTop')

if (world.isServer) {
  state.y = 0
  chair.rotation.y = 0
  app.on('request', playerId => {
    if (state.playerId) return
    state.playerId = playerId
    app.send('playerId', playerId)
  })
  app.on('rotate', (y, networkId) => {
    state.y = y
    chair.rotation.y = y
    app.send('rotate', y, networkId)
  })
  app.on('release', playerId => {
    if (state.playerId === playerId) {
      state.playerId = null
      app.send('playerId', null)
    }
  })
  world.on('leave', e => {
    if (state.playerId === e.player.networkId) {
      state.playerId = null
      app.send('playerId', null)
    }
  })
}

if (world.isClient) {
  const player = world.getPlayer()
  const anchor = app.create('anchor', { id: 'seat' })
  anchor.position.y = 0.5
  anchor.rotation.y += 180 * DEG2RAD
  chair.add(anchor)
  const action = app.create('action')
  action.position.y = 0.7
  action.label = 'Sit'
  action.onTrigger = () => {
    action.active = false
    app.send('request', player.networkId)
  }
  chair.add(action)
  if (state.y) {
    chair.rotation.y = state.y
  }
  if (state.playerId) {
    action.active = false
  }
  app.on('rotate', y => {
    state.y = y
    chair.rotation.y = y
  })
  app.on('playerId', playerId => {
    state.playerId = playerId
    action.active = !playerId
    if (playerId === player.networkId) {
      sit()
    } else {
      stand()
    }
  })
  let control 
  function sit() {
    if (control) return
    action.active = false
    control = app.control()
    control.setEffect({
      anchor,
      emote: props.emote?.url,
      cancellable: true,
      onEnd: stand
    })
    control.keyA.capture = true
    control.keyD.capture = true
    app.on('update', update)
  }

  function stand() {
    if (!control) return
    control.release()
    control = null
    action.active = true
    app.off('update', update)
    app.send('release', player.networkId)
  }

  function update(delta) {
    let rotated
    if (control.keyA.down) {
      chair.rotation.y += 2 * delta
      rotated = true
    }
    if (control.keyD.down) {
      chair.rotation.y -= 2 * delta
      rotated = true
    }
    if (rotated) {
      app.send('rotate', chair.rotation.y)
    }
  }

  app.on('rotate', y => {
    state.y = y
    chair.rotation.y = y
    if (world.isServer) app.send('rotate', y)
  })

}
