app.configure([
  {
    key: 'emote',
    type: 'file',
    kind: 'emote',
    label: 'Emote'
  }
])

const state = app.state
const duck = app.get('$root')

if (world.isServer) {
  state.playerId = null
  app.on('request', playerId => {
    if (state.playerId) return
    state.playerId = playerId
    app.send('playerId', playerId)
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
  anchor.position.y = 0.55
  anchor.position.x = -.38
  anchor.position.z = .11
  anchor.rotation.y += 270 * DEG2RAD
  duck.add(anchor)
  const action = app.create('action')
  action.position.y = 0.7
  action.label = 'Sit'
  action.onTrigger = () => {
    app.send('request', player.networkId)
  }
  duck.add(action)
  if (state.playerId) {
    action.active = false
  }
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
    // No rotation handling, you can remove this function or leave it empty
  }
}