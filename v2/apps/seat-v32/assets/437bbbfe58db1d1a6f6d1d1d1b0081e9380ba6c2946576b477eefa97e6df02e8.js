app.configure([
  {
    key: 'emote',
    type: 'file',
    kind: 'emote',
    label: 'Emote'
  },
  {
    key: 'visibleType',
    type: 'switch',
    label: 'Visibility Type',
    options: [
      { value: 'visible', label: 'Visible' },
      { value: 'invisible', label: 'Invisible' }
    ],
    initial: 'visible'
  },
  {
    key: 'hoverImage',
    type: 'file',
    kind: 'texture',
    label: 'Hover Image',
    optional: true
  }
])



const DEG2RAD = Math.PI / 180
const state = app.state

if (world.isServer) {
  // Simplified server logic - no need for leave event
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
}

if (world.isClient) {
  const player = world.getPlayer()
  const trigger = app.get('Trigger')

  // Visibility control for trigger mesh
  if (trigger) {
    const updateVisibility = (value) => {
      trigger.visible = value === 'visible'
    }
    app.on('props:visibleType', updateVisibility)
    updateVisibility(app.props.visibleType)
  }

  // Setup seat anchor
  const anchor = app.create('anchor', { id: 'seat' })
  anchor.position.set(0, 0.12, 0) // Adjust based on your model
  anchor.rotation.y = 280 * DEG2RAD // Fully configurable
  app.add(anchor)

  let control
  let isSitting = false
  let hoverUI = null

  // Create hover UI
  function createHoverUI() {
    if (!props.hoverImage?.url) return null

    const container = app.create('ui', {
      space: 'world',
      position: [0, 0.8, 0],
      display: 'none',
      width: 30,
      height: 20,
      billboard: 'full',
    })

    const image = app.create('uiimage', {
      src: props.hoverImage.url,
      width: 30,
      height: 20,
      objectFit: 'contain',
      backgroundColor: 'transparent'
    })

    container.add(image)
    app.add(container)

    return container
  }

  // Set cursor style
  app.cursor = 'pointer'

  // Handle pointer down
  app.onPointerDown = () => {
    if (!isSitting && !state.playerId) {
      app.send('request', player.id) // Request to sit
    }
  }

  let hideTime = 0
  let isHovered = false

  // Add hover feedback
  app.onPointerEnter = () => {
    if (!isSitting && !state.playerId && props.hoverImage?.url) {
      isHovered = true
      hideTime = 0 // Reset hide time

      // Create UI if it doesn't exist
      if (!hoverUI) {
        hoverUI = createHoverUI()
      } else {
        hoverUI.visible = 'true'
      }
    }
  }

  // Function to remove hover UI
  function removeHoverUI() {
    if (hoverUI) {
      app.remove(hoverUI)
      hoverUI = null
    }
  }

  // Update function to handle auto-hide
  app.on('update', (dt) => {
    if (isHovered && hoverUI) {
      if (hideTime > 0) {
        hideTime -= dt
        if (hideTime <= 0) {
          removeHoverUI()
          isHovered = false
        }
      } else if (hoverUI) {
        // Start the hide timer if UI exists
        hideTime = 2.0 // 2 seconds
      }
    }
  })

  // Reset hover state when pointer leaves
  app.onPointerLeave = () => {
    removeHoverUI()
    isHovered = false
    hideTime = 0
  }


  function sit() {
    if (control) return
    isSitting = true
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
    isSitting = false
    app.send('release', player.id) // Use player.id instead of networkId
  }

  // Handle seat state updates
  app.on('playerId', playerId => {
    state.playerId = playerId
    if (playerId === player.id) {
      sit()
    } else if (playerId !== null) {
      stand()
    }
  })
}