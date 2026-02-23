

const initialPosition = app.position.toArray()
const initialQuaternion = app.quaternion.toArray()

if (world.isClient) {
  let control
  const player = world.getPlayer()
  const action = app.create('action', {
    active: false,
    label: 'Equip',
    onTrigger: e => {
      action.active = false
      
      app.send('request', player.entityId)
    },
  })
  app.add(action)
  const state = app.state
  if (!state.playerId) {
    action.active = true
  }
  app.on('playerId', playerId => {
    state.playerId = playerId
    action.active = !playerId
    if (player.entityId === playerId) {
      control = app.control()
    } else {
      control?.release()
      control = null
    }
    if (!playerId) {
      app.position.fromArray(initialPosition)
      app.quaternion.fromArray(initialQuaternion)
    }
  })
  app.on('lateUpdate', delta => {
    if (!state.playerId) return
    const player = world.getPlayer(state.playerId)
    const matrix = player.getBoneTransform('rightHand')
    if (matrix) {
      app.position.setFromMatrixPosition(matrix)
      app.quaternion.setFromRotationMatrix(matrix)
    }
    if (control?.keyQ.pressed) {
      app.send('release', player.entityId)
    }
  })
}

if (world.isServer) {
  const state = app.state
  state.playerId = null
  app.on('request', playerId => {
    if (state.playerId) return
    state.playerId = playerId
    app.send('playerId', playerId)
  })
  app.on('release', playerId => {
    console.log(state.playerId, playerId)
    if (state.playerId !== playerId) return
    state.playerId = null
    app.send('playerId', null)
  })
  world.on('leave', e => {
    if (state.playerId === e.player.entityId) {
      state.playerId = null
      app.send('playerId', null)
    }
  })
}