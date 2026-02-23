app.configure([
    {
      key: 'emote',
      type: 'file',
      kind: 'emote',
      label: 'Emote'
    }
  ])
  
  const DEG2RAD = Math.PI / 180
  const state = app.state
  const chair = app.get('$root')
  
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
    anchor.position.set(.07,0.36,0)
    anchor.rotation.y = 270 * DEG2RAD // 180 degrees (standard sitting direction) + 90 degree adjustment
    chair.add(anchor)
    const action = app.create('action')
    action.position.y = 0.7
    action.label = 'Sit'
    action.onTrigger = () => {
      app.send('request', player.networkId)
    }
    chair.add(action)
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
      player.applyEffect({
        anchor,
        emote: props.emote?.url,
        cancellable: true,
        onEnd: stand
      })
    }
    function stand() {
      if (!control) return
      control.release()
      control = null
      action.active = true
      app.send('release', player.networkId)
    }
  }