app.configure([
  {
    key: 'visible',
    type: 'toggle',
    label: 'Visible',
    initial: true,
  },
  {
    key: 'level',
    type: 'switch',
    label: 'Voice Chat',
    options: [
      { label: 'Disabled', value: 'disabled' },
      { label: 'Spatial', value: 'spatial' },
      { label: 'Global', value: 'global' },
    ],
    initial: 'disabled',
  },

])

if (!config.visible) {
  const mesh = app.get('ZoneMesh')
  mesh.active = false
}

if (world.isServer) {
  const body = app.get('Zone')
  body.onTriggerEnter = e => {
    const player = world.getPlayer(e.playerId)
    player?.setVoiceLevel(config.level)
  }
  body.onTriggerLeave = e => {
    const player = world.getPlayer(e.playerId)
    player?.setVoiceLevel(null)
  }
}