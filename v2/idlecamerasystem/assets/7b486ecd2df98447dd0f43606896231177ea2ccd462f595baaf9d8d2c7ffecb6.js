// Idle Camera System Script

app.configure([
  {
    key: 'idleTimeout',
    type: 'number',
    label: 'Idle Timeout (seconds)',
    initial: 60,
    min: 1,
    max: 100
  },
  {
    key: 'transitionTime',
    type: 'number',
    label: 'Camera Transition Time',
    initial: 2.5,
    min: 1,
    max: 100
  },
  {
    key: 'cameraDwellTime',
    type: 'number',
    label: 'Time at Each Camera (seconds)',
    initial: 30,
    min: 1,
    max: 100
  },
  {
    key: 'randomPlayerMode',
    type: 'switch',
    label: 'Random Player Mode',
    initial: false,
    options: [
      { value: true, label: 'Enabled' },
      { value: false, label: 'Disabled' }
    ]
  },
  {
    key: 'globalShakeEnabled',
    type: 'switch',
    label: 'Global Camera Shake',
    initial: false,
    options: [
      { value: true, label: 'Enabled' },
      { value: false, label: 'Disabled' }
    ]
  },
  {
    key: 'globalShakeIntensity',
    type: 'number',
    label: 'Global Shake Intensity',
    initial: 0.003,
    min: 0.001,
    max: 1,
    dp: 3,
    when: [{ key: 'globalShakeEnabled', op: 'eq', value: true }]
  },
  {
    key: 'globalShakeSpeed',
    type: 'number',
    label: 'Global Shake Speed',
    initial: 2.5,
    min: 0.1,
    max: 10,
    dp: 1,
    when: [{ key: 'globalShakeEnabled', op: 'eq', value: true }]
  },
  {
    type: 'section',
    key: 'cameraSection',
    label: 'Camera Positions'
  },
  {
    key: 'highOverlook',
    type: 'switch',
    label: 'High Overlook',
    initial: false,
    options: [
      { value: true, label: 'Enabled' },
      { value: false, label: 'Disabled' }
    ]
  },
  {
    key: 'highOverlookHeight',
    type: 'number',
    label: 'High Overlook Height',
    initial: 10,
    min: 1,
    max: 100,
    when: [{ key: 'highOverlook', op: 'eq', value: true }]
  },
  {
    key: 'highOverlookDistance',
    type: 'number',
    label: 'High Overlook Distance',
    initial: 20,
    min: 1,
    max: 100,
    when: [{ key: 'highOverlook', op: 'eq', value: true }]
  },
  {
    key: 'groundView',
    type: 'switch',
    label: 'Ground Views',
    initial: false,
    options: [
      { value: true, label: 'Enabled' },
      { value: false, label: 'Disabled' }
    ]
  },
  {
    key: 'groundViewHeight',
    type: 'number',
    label: 'Ground View Height',
    initial: 1,
    min: 1,
    max: 100,
    when: [{ key: 'groundView', op: 'eq', value: true }]
  },
  {
    key: 'groundViewDistance',
    type: 'number',
    label: 'Ground View Distance',
    initial: 5,
    min: 1,
    max: 100,
    when: [{ key: 'groundView', op: 'eq', value: true }]
  },
  {
    key: 'topDown',
    type: 'switch',
    label: 'Top Down View',
    initial: false,
    options: [
      { value: true, label: 'Enabled' },
      { value: false, label: 'Disabled' }
    ]
  },
  {
    key: 'topDownHeight',
    type: 'number',
    label: 'Top Down Height',
    initial: 5,
    min: 1,
    max: 100,
    when: [{ key: 'topDown', op: 'eq', value: true }]
  },
  {
    key: 'birdsEye',
    type: 'switch',
    label: 'Birds Eye View',
    initial: false,
    options: [
      { value: true, label: 'Enabled' },
      { value: false, label: 'Disabled' }
    ]
  },
  {
    key: 'birdsEyeHeight',
    type: 'number',
    label: 'Birds Eye Height',
    initial: 4,
    min: 1,
    max: 100,
    when: [{ key: 'birdsEye', op: 'eq', value: true }]
  },
  {
    key: 'birdsEyeDistance',
    type: 'number',
    label: 'Birds Eye Distance',
    initial: 3,
    min: 1,
    max: 100,
    when: [{ key: 'birdsEye', op: 'eq', value: true }]
  },
  {
    key: 'birdsEyeSpeed',
    type: 'number',
    label: 'Birds Eye Rotation Speed',
    initial: 0.5,
    min: 0.01,
    max: 2,
    dp: 2,
    when: [{ key: 'birdsEye', op: 'eq', value: true }]
  }
])

if (world.isClient) {
  // System state
  let control = null
  let isIdle = false
  let lastActivityTime = Date.now() / 1000
  let lastActivityCheck = 0
  let currentCameraIndex = -1
  let nextCameraIndex = 0
  let transitionStartTime = 0
  let dwellStartTime = 0
  let currentPosition = new Vector3()
  let currentLookAt = new Vector3()
  let targetPosition = new Vector3()
  let targetLookAt = new Vector3()
  let lastPlayerPosition = null
  let isTransitioningToPlayer = false
  let isZoomingOut = false
  let isZoomingIn = false
  let birdsEyeAngle = 0
  let shakeTime = 0
  let shakeOffset = new Vector3()
  let currentRotation = new Quaternion()
  let targetRotation = new Quaternion()
  let basePosition = new Vector3()  // Store base position before shake
  let currentTargetPlayer = null  // Store current target player

  // Helper function to get target player based on mode
  function getTargetPlayer() {
    const player = world.getPlayer()
    if (!app.config.randomPlayerMode) return player
    
    // If we already have a target player, keep using them
    if (currentTargetPlayer) return currentTargetPlayer
    
    const players = world.getPlayers()
    if (players.length === 0) return player

    // Select a new random player and store them
    currentTargetPlayer = players[Math.floor(num(0, players.length - 1))]
    return currentTargetPlayer
  }

  // Helper function to get camera positions from config
  function getCameraPositions() {
    const positions = []
    const config = app.config
    const targetPlayer = getTargetPlayer()
    if (!targetPlayer) return positions

    const playerPos = new Vector3(targetPlayer.position._x, targetPlayer.position._y, targetPlayer.position._z)

    function createHighOverlookCamera() {
      const height = config.highOverlookHeight || 15
      const distance = config.highOverlookDistance || 20
      const position = playerPos.clone().add(new Vector3(0, height, -distance))
      const lookAt = playerPos.clone()
      const lookDir = lookAt.clone().sub(position).normalize()
      const upVector = new Vector3(0, 1, 0)
      const rotationMatrix = new Matrix4().lookAt(new Vector3(0, 0, 0), lookDir, upVector)
      const rotation = new Quaternion().setFromRotationMatrix(rotationMatrix)

      return {
        position: position,
        lookAt: lookAt,
        rotation: rotation,
        name: "HIGH_OVERLOOK"
      }
    }

    function createGroundViewCameras() {
      const distance = config.groundViewDistance || 20
      const height = config.groundViewHeight || 2
      
      const groundPositions = [
        { pos: new Vector3(distance, height, distance), name: "GROUND_VIEW_1" },
        { pos: new Vector3(-distance, height, -distance), name: "GROUND_VIEW_2" }
      ]

      return groundPositions.map(({ pos, name }) => {
        const position = playerPos.clone().add(pos)
        const lookAt = playerPos.clone().add(new Vector3(0, 1, 0))
        const lookDir = lookAt.clone().sub(position).normalize()
        const upVector = new Vector3(0, 1, 0)
        const rotationMatrix = new Matrix4().lookAt(new Vector3(0, 0, 0), lookDir, upVector)
        const rotation = new Quaternion().setFromRotationMatrix(rotationMatrix)

        return {
          position: position,
          lookAt: lookAt,
          rotation: rotation,
          name: name,
          isGroundView: true,
          updatePosition: true
        }
      })
    }

    function createTopDownCamera() {
      const height = config.topDownHeight || 40
      const position = playerPos.clone().add(new Vector3(0, height, 0))
      const lookAt = playerPos.clone()
      const lookDir = lookAt.clone().sub(position).normalize()
      const upVector = new Vector3(0, 1, 0)
      const rotationMatrix = new Matrix4().lookAt(new Vector3(0, 0, 0), lookDir, upVector)
      const rotation = new Quaternion().setFromRotationMatrix(rotationMatrix)

      return {
        position: position,
        lookAt: lookAt,
        rotation: rotation,
        name: "TOP_DOWN"
      }
    }

    function createBirdsEyeCamera() {
      const height = config.birdsEyeHeight || 25
      const distance = config.birdsEyeDistance || 20
      const x = Math.cos(birdsEyeAngle) * distance
      const z = Math.sin(birdsEyeAngle) * distance
      const position = playerPos.clone().add(new Vector3(x, height, z))
      const lookAt = playerPos.clone()
      const lookDir = lookAt.clone().sub(position).normalize()
      const upVector = new Vector3(0, 1, 0)
      const rotationMatrix = new Matrix4().lookAt(new Vector3(0, 0, 0), lookDir, upVector)
      const rotation = new Quaternion().setFromRotationMatrix(rotationMatrix)

      return {
        position: position,
        lookAt: lookAt,
        rotation: rotation,
        name: "BIRDS_EYE",
        updatePosition: true,
        targetPlayer: targetPlayer
      }
    }

    // Add cameras based on config
    if (config.highOverlook) {
      positions.push(createHighOverlookCamera())
    }

    if (config.groundView) {
      positions.push(...createGroundViewCameras())
    }

    if (config.topDown) {
      positions.push(createTopDownCamera())
    }

    if (config.birdsEye) {
      positions.push(createBirdsEyeCamera())
    }

    return positions
  }

  // Helper function to get next random camera index
  function getNextCameraIndex() {
    const positions = getCameraPositions()
    if (positions.length <= 1) return 0
    
    // Get current camera type
    const currentType = currentCameraIndex >= 0 ? positions[currentCameraIndex]?.name.split('_')[0] : null
    
    // Get all available indices of different types
    const differentTypeIndices = positions
      .map((pos, idx) => ({ idx, type: pos.name.split('_')[0] }))
      .filter(item => item.type !== currentType)
      .map(item => item.idx)
    
    // If we have different types available, choose randomly from them
    if (differentTypeIndices.length > 0) {
      return differentTypeIndices[Math.floor(num(0, differentTypeIndices.length - 1))]
    }
    
    // If no different types, just get any different index
    let nextIndex
    do {
      nextIndex = Math.floor(num(0, positions.length - 1))
    } while (nextIndex === currentCameraIndex)
    return nextIndex
  }

  // Helper function to get camera position relative to player
  function getCameraPositionFromIndex(index) {
    const positions = getCameraPositions()
    if (!positions[index]) return null
    
    const player = world.getPlayer()
    const playerPos = new Vector3(player.position._x, player.position._y, player.position._z)
    
    return {
      position: playerPos.clone().add(positions[index].position),
      lookAt: playerPos.clone().add(positions[index].lookAt)
    }
  }

  // Function to handle user activity
  function handleActivity() {
    lastActivityTime = Date.now() / 1000
    if (isIdle) {
      exitIdleMode()
    }
  }

  // Function to start idle camera mode
  function enterIdleMode() {
    if (isIdle) return
    
    control = app.control()
    if (!control) return

    isIdle = true
    control.camera.write = true

    const startPosition = control.camera.position.clone()
    const startRotation = control.camera.quaternion.clone()
    const startDirection = new Vector3(0, 0, -1).applyQuaternion(startRotation)
    
    currentPosition.copy(startPosition)
    currentLookAt.copy(startPosition).add(startDirection)
    currentRotation.copy(startRotation)
    
    const positions = getCameraPositions()
    if (positions.length > 0) {
        currentCameraIndex = -1
        nextCameraIndex = getNextCameraIndex()
        const nextCamera = positions[nextCameraIndex]
        
        if (nextCamera) {
            currentPosition.copy(startPosition)
            targetPosition.copy(nextCamera.position)
            targetLookAt.copy(nextCamera.lookAt)
            targetRotation.copy(nextCamera.rotation)
            transitionStartTime = Date.now() / 1000
            dwellStartTime = 0
            isTransitioningToPlayer = false
            
            // Immediately update camera to start position
            control.camera.position.copy(startPosition)
            control.camera.quaternion.copy(startRotation)
        }
    }
  }

  // Function to exit idle camera mode
  function exitIdleMode() {
    if (!isIdle) return

    const lastIdlePosition = control.camera.position.clone()
    const lastIdleLookAt = currentLookAt.clone()
    const lastIdleRotation = control.camera.quaternion.clone()
    
    if (control) {
      control.release()
      control = app.control()
    }
    
    if (control) {
      const player = world.getPlayer()
      if (player) {
        const playerPos = new Vector3(player.position._x, player.position._y, player.position._z)
        currentPosition.copy(lastIdlePosition)
        currentLookAt.copy(lastIdleLookAt)
        currentRotation.copy(lastIdleRotation)
        
        const playerEyePos = playerPos.clone().add(new Vector3(0, 1.6, 0))
        const playerLookDir = control.camera.quaternion.clone()
        const playerLookPos = playerEyePos.clone().add(new Vector3(0, 0, -1).applyQuaternion(playerLookDir))
        
        targetPosition.copy(playerEyePos)
        targetLookAt.copy(playerLookPos)
        targetRotation.copy(playerLookDir)
        
        transitionStartTime = Date.now() / 1000
        isTransitioningToPlayer = true
        isZoomingIn = true
        dwellStartTime = 0
        currentCameraIndex = -1
      }
    }
    
    isIdle = false
  }

  // Start transition to next camera
  function startCameraTransition() {
    // Reset current target player to force selection of a new random player
    currentTargetPlayer = null
    
    const positions = getCameraPositions()
    if (positions.length === 0) return

    // Get next camera index before updating current position
    const nextIndex = getNextCameraIndex()
    const nextCamera = positions[nextIndex]
    
    if (!nextCamera) return
    
    // Always start from current camera position
    currentPosition.copy(control.camera.position)
    currentLookAt.copy(targetLookAt)
    currentRotation.copy(control.camera.quaternion)
    
    // Set target directly to next camera
    targetPosition.copy(nextCamera.position)
    targetLookAt.copy(nextCamera.lookAt)
    targetRotation.copy(nextCamera.rotation)
    
    // Update indices and start transition
    currentCameraIndex = nextCameraIndex
    nextCameraIndex = nextIndex
    transitionStartTime = Date.now() / 1000
    dwellStartTime = 0
  }

  // Helper function to get camera shake offset
  function calculateShake(delta) {
    if (app.config.globalShakeEnabled) {
      shakeTime += delta * (app.config.globalShakeSpeed || 2.5)
      const intensity = app.config.globalShakeIntensity || 0.003
      
      shakeOffset.x = Math.sin(shakeTime * 1.1) * intensity
      shakeOffset.y = Math.cos(shakeTime * 1.3) * intensity * 0.5
      shakeOffset.z = Math.sin(shakeTime * 0.7) * intensity
      
      return shakeOffset
    }

    shakeOffset.set(0, 0, 0)
    return shakeOffset
  }

  // Update function for idle camera and activity checking
  app.on('update', (delta) => {
    const currentTime = Date.now() / 1000
    const player = world.getPlayer()

    // Pre-calculate values outside the transition loop
    const transitionDuration = app.config.transitionTime || 2.5
    const dwellTime = app.config.cameraDwellTime || 8

    // Update birds eye rotation - moved before player check
    if (isIdle && app.config.birdsEye) {
      const rotationSpeed = app.config.birdsEyeSpeed || 0.5
      birdsEyeAngle = (birdsEyeAngle + delta * rotationSpeed) % (Math.PI * 2)
    }

    // Always apply camera shake if enabled, regardless of mode
    if (control && app.config.globalShakeEnabled) {
      basePosition.copy(control.camera.position)
      const shake = calculateShake(delta)
      control.camera.position.copy(basePosition).add(shake)
    }

    // Check for player movement
    if (player && player.position) {
      if (!lastPlayerPosition) {
        lastPlayerPosition = new Vector3(player.position._x, player.position._y, player.position._z)
      } else {
        // Check if player has moved
        const currentPlayerPos = new Vector3(player.position._x, player.position._y, player.position._z)
        if (!currentPlayerPos.equals(lastPlayerPosition)) {
          handleActivity()
          lastPlayerPosition.copy(currentPlayerPos)
        }
      }
    }

    // Check for activity every second
    if (currentTime - lastActivityCheck >= 1) {
      lastActivityCheck = currentTime
      const idleTimeout = app.config.idleTimeout || 30
      
      if (currentTime - lastActivityTime > idleTimeout) {
        if (!isIdle) {
          enterIdleMode()
        }
      }
    }

    // Handle camera transitions
    if ((isIdle || isTransitioningToPlayer) && control) {
      // Handle transition timing
      if (transitionStartTime > 0) {
        const positions = getCameraPositions()
        const progress = Math.min((currentTime - transitionStartTime) / transitionDuration, 1)
        
        // Simple smooth easing for all transitions
        const smoothProgress = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2

        // Pre-calculate vectors for performance
        const newPos = new Vector3()
        const newLook = new Vector3()
        const newRotation = new Quaternion()
        
        // Calculate shake if enabled
        const shake = calculateShake(delta)
        
        // Interpolate position and lookAt
        newPos.lerpVectors(currentPosition, targetPosition, smoothProgress)
        basePosition.copy(newPos)  // Store base position before shake
        newPos.add(shake)
        newLook.lerpVectors(currentLookAt, targetLookAt, smoothProgress)
        newRotation.slerpQuaternions(currentRotation, targetRotation, smoothProgress)
        
        // Update camera position and rotation
        control.camera.position.copy(newPos)
        control.camera.quaternion.copy(newRotation)

        // Handle transition completion
        if (progress === 1) {
          transitionStartTime = 0
          if (isTransitioningToPlayer) {
            isTransitioningToPlayer = false
          } else {
            dwellStartTime = currentTime
            currentPosition.copy(targetPosition)
            currentLookAt.copy(targetLookAt)
            currentRotation.copy(targetRotation)
            currentCameraIndex = nextCameraIndex  // Update current camera index after transition completes
          }
        }
      }
      // Check if we need to update position for rotating cameras
      else if (isIdle && currentCameraIndex >= 0) {
        const positions = getCameraPositions()
        const currentCam = positions[currentCameraIndex]
        
        // Update rotating camera position if needed
        if (currentCam && currentCam.updatePosition) {
          const shake = calculateShake(delta)
          basePosition.copy(currentCam.position)
          control.camera.position.copy(basePosition).add(shake)
          control.camera.quaternion.copy(currentCam.rotation)
        }
        
        // Check if dwell time is complete and start next transition
        if (dwellStartTime > 0 && (currentTime - dwellStartTime) >= dwellTime) {
          const nextIndex = getNextCameraIndex()
          if (nextIndex !== currentCameraIndex) {
            nextCameraIndex = nextIndex
            startCameraTransition()
          }
        }
      } else if (isIdle && currentCameraIndex === -1) {
        // If we're idle but don't have a current camera, start a transition
        const nextIndex = getNextCameraIndex()
        nextCameraIndex = nextIndex
        startCameraTransition()
      }
    }
  })
} 