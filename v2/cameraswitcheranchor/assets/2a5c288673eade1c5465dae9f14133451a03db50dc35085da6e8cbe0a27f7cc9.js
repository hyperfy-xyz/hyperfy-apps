// Cinematic Drone Camera System

app.configure([
    {
      key: 'droneSpeed',
      type: 'number',
      label: 'Drone Movement Speed',
      initial: 2,
      min: 0.01,
      max: 10.00,
      dp: 2
    },
    {
      key: 'turnSpeed',
      type: 'number',
      label: 'Turn Speed',
      initial: 0.8,
      min: 0.01,
      max: 10.00,
      dp: 2
    },
    {
      key: 'smoothing',
      type: 'number',
      label: 'Movement Smoothing',
      initial: 0.15,
      min: 0.01,
      max: 1,
      dp: 2
    },
    {
      key: 'bankFactor',
      type: 'number',
      label: 'Banking Intensity',
      initial: 0.25,
      min: 0,
      max: 1,
      dp: 2
    },
    {
      key: 'minHeight',
      type: 'number',
      label: 'Minimum Height',
      initial: 5,
      min: 2,
      max: 50
    },
    {
      key: 'maxHeight',
      type: 'number',
      label: 'Maximum Height',
      initial: 15,
      min: 5,
      max: 50
    },
    {
      key: 'worldPathRadius',
      type: 'number',
      label: 'World Path Radius',
      initial: 100,
      min: 10,
      max: 1000
    },
    {
      key: 'worldPathPoints',
      type: 'number',
      label: 'World Path Control Points',
      initial: 8,
      min: 4,
      max: 24
    },
    {
      key: 'worldPathVariation',
      type: 'number',
      label: 'Path Variation',
      initial: 30,
      min: 0,
      max: 100
    },
    {
      key: 'curveDetail',
      type: 'number',
      label: 'Curve Detail',
      initial: 12,
      min: 6,
      max: 24
    },
    {
      key: 'playerDetectionRadius',
      type: 'number',
      label: 'Player Detection Radius',
      initial: 40,
      min: 5,
      max: 200
    },
    {
      key: 'playerFollowTime',
      type: 'number',
      label: 'Player Follow Duration (seconds)',
      initial: 15,
      min: 5,
      max: 60
    },
    {
      key: 'playerOrbitDistance',
      type: 'number',
      label: 'Player Orbit Distance',
      initial: 5,
      min: 2,
      max: 20
    },
    {
      key: 'playerOrbitHeight',
      type: 'number',
      label: 'Player Orbit Height',
      initial: 3,
      min: 1,
      max: 10
    },
    {
      key: 'playerOrbitSpeed',
      type: 'number',
      label: 'Player Orbit Speed',
      initial: 0.5,
      min: 0.1,
      max: 2,
      dp: 1
    },
    {
      key: 'playerCooldownTime',
      type: 'number',
      label: 'Player Follow Cooldown (seconds)',
      initial: 120,
      min: 30,
      max: 600
    },
    {
      key: 'idleTimeout',
      type: 'number',
      label: 'Idle Timeout (seconds)',
      initial: 60,
      min: 10,
      max: 300
    },
    {
      key: 'autoActivateOnIdle',
      type: 'switch',
      label: 'Auto-Activate on Idle',
      initial: true,
      options: [
        { value: true, label: 'Enabled' },
        { value: false, label: 'Disabled' }
      ]
    },
    {
      key: 'fpCameraHeight',
      type: 'number',
      label: 'First-Person Camera Height',
      initial: 1.6,
      min: 0.5,
      max: 2.5,
      dp: 2
    },
    {
      key: 'fpCameraForwardOffset',
      type: 'number',
      label: 'First-Person Forward Offset',
      initial: 0,
      min: -5.0,
      max: 5.0,
      dp: 2
    },
    {
      key: 'fpCameraHorizontalOffset',
      type: 'number',
      label: 'First-Person Horizontal Offset',
      initial: 0,
      min: -0.5,
      max: 0.5,
      dp: 2
    },
    {
      key: 'camSwitchSpeed',
      type: 'number',
      label: 'Camera Switch Speed',
      initial: 1.0,
      min: 0.1,
      max: 5.0,
      dp: 1
    },
    {
      key: 'maxSavedCameras',
      type: 'number',
      label: 'Max Saved Camera Positions',
      initial: 10,
      min: 3,
      max: 30
    }
  ])
  
  if (world.isServer) {
    // Server-side camera position storage
    app.on('saveCameras', (data, playerId) => {
      // Store cameras in server state for persistence
      if (!app.state) app.state = {}
      app.state.savedCameras = data
      console.log('[DroneCam] Server received and stored camera positions from client')
      
      // Broadcast to all other clients to keep them in sync
      app.send('updateCameras', data)
    })
  }
  
  if (world.isClient) {
    // Drone camera states
    const DroneState = {
      INACTIVE: 'inactive',       // Not active
      TRANSITIONING: 'transitioning', // Transitioning between states
      WORLD_PATH: 'worldPath',    // Following world path
      PLAYER_DETECTED: 'playerDetected', // Just detected a player, transitioning
      FOLLOWING_PLAYER: 'followingPlayer', // Following a player
      RETURNING_TO_PATH: 'returningToPath', // Returning to world path
      FIRST_PERSON: 'firstPerson', // First-person view
      FIXED_CAMERA: 'fixedCamera' // Fixed camera position
    }
  
    // State variables
    let control = null
    let currentState = DroneState.INACTIVE
    let worldPathPoints = []
    let worldPathProgress = 0
    let worldPathLastPosition = 0
    let targetPosition = new Vector3()
    let targetRotation = new Quaternion()
    let velocity = new Vector3()
    let currentVelocityDirection = new Vector3()
    let lastLookAt = new Vector3()
    let bankAngle = 0
    let currentTarget = null
    let playerFollowStartTime = 0
    let orbitAngle = 0
    let transitionStartTime = 0
    let transitionProgress = 0
    let startPosition = new Vector3()
    let startRotation = new Quaternion()
    let transitioning = false
    let transitionTargetPosition = new Vector3()
    let transitionTargetRotation = new Quaternion()
    
    // Idle detection variables
    let lastActivityTime = Date.now() / 1000
    let lastActivityCheck = 0
    let lastPlayerPosition = null
    let lastMousePosition = { x: 0, y: 0 }
    let isCheckingActivity = false
    
    // Player cooldown tracking
    let followedPlayers = {}

    // First-person camera variables
    let firstPersonActive = false
    let firstPersonOffset = new Vector3(0, 0, 0)
    let firstPersonForwardVector = new Vector3(0, 0, 0)
    let firstPersonRightVector = new Vector3(0, 0, 0)
    
    // Fixed camera system variables
    let savedCameras = []
    let currentCameraIndex = -1
    let fixedCamTransitioning = false
    let fixedCamStartPos = new Vector3()
    let fixedCamStartRot = new Quaternion()
    let fixedCamTargetPos = new Vector3()
    let fixedCamTargetRot = new Quaternion()
    let fixedCamTransitionStartTime = 0
    let fixedCamTransitionDuration = 0
    
    // Helper function for serializing Vector3
    function serializeVector3(vector) {
      return {
        x: vector.x,
        y: vector.y,
        z: vector.z
      }
    }
    
    // Helper function for deserializing Vector3
    function deserializeVector3(data) {
      return new Vector3(data.x, data.y, data.z)
    }
    
    // Helper function for serializing Quaternion
    function serializeQuaternion(quaternion) {
      return {
        x: quaternion.x,
        y: quaternion.y,
        z: quaternion.z,
        w: quaternion.w
      }
    }
    
    // Helper function for deserializing Quaternion
    function deserializeQuaternion(data) {
      return new Quaternion(data.x, data.y, data.z, data.w)
    }
    
    // Save camera data to app state
    function saveCamerasToState() {
      try {
        if (!app.state) app.state = {}
        
        // Transform camera data for storage
        const storageData = savedCameras.map(camera => {
          return {
            id: camera.id,
            name: camera.name,
            position: {
              x: camera.position.x,
              y: camera.position.y,
              z: camera.position.z
            },
            rotation: {
              x: camera.rotation.x,
              y: camera.rotation.y,
              z: camera.rotation.z,
              w: camera.rotation.w
            }
          }
        })
        
        // Store in app state
        app.state.savedCameras = storageData
        
        // Send to server to persist
        app.send('saveCameras', storageData)
        
        console.log('[DroneCam] Saved ' + savedCameras.length + ' cameras to app state')
      } catch (err) {
        console.error('[DroneCam] Error saving cameras:', err)
      }
    }
    
    // Load camera data from app state
    function loadCamerasFromState() {
      try {
        if (!app.state || !app.state.savedCameras) {
          console.log('[DroneCam] No saved cameras found in app state')
          return false
        }
        
        const storageData = app.state.savedCameras
        if (!Array.isArray(storageData)) return false
        
        // Transform storage data back to camera objects
        savedCameras = storageData.map(data => {
          return {
            id: data.id,
            name: data.name,
            position: new Vector3(data.position.x, data.position.y, data.position.z),
            rotation: new Quaternion(data.rotation.x, data.rotation.y, data.rotation.z, data.rotation.w)
          }
        })
        
        console.log('[DroneCam] Loaded ' + savedCameras.length + ' cameras from app state')
        return true
      } catch (err) {
        console.error('[DroneCam] Error loading cameras:', err)
        return false
      }
    }
    
    // Helper function for linear interpolation
    function lerp(start, end, t) {
      return start + (end - start) * Math.max(0, Math.min(1, t))
    }
  
    // Generate random number between min and max
    function randomRange(min, max) {
      return min + Math.random() * (max - min)
    }
    
    // Safe chat message function
    function sendChatMessage(message) {
      try {
        // Check if we're on the client
        if (world.isClient && typeof message === 'string') {
          // Emit a chat event that will be displayed locally
          app.emit('dronecam:message', { text: message })
          console.log('[DroneCam]', message)
        }
      } catch (err) {
        console.error('[DroneCam] Error sending chat message:', err)
      }
    }
  
    // Handle user activity - exit drone mode if active
    function handleActivity() {
      // Remove excessive console log
      // console.log('[DroneCam] Activity detected')
      lastActivityTime = Date.now() / 1000
      
      // Exit drone mode if active and auto-activated
      if (currentState !== DroneState.INACTIVE && isAutoActivated) {
        console.log('[DroneCam] Auto-exiting drone mode due to user input')
        exitDroneMode()
      }
    }
    
    // Track if drone was auto-activated by idle
    let isAutoActivated = false
    
    // Create smooth curve through points
    function createCurvePoints(points) {
      const curvePoints = []
      const numPoints = app.config.curveDetail || 12
      
      for (let i = 0; i < points.length; i++) {
        const p0 = points[(i - 1 + points.length) % points.length]
        const p1 = points[i]
        const p2 = points[(i + 1) % points.length]
        const p3 = points[(i + 2) % points.length]
        
        // Generate points along the curve segment
        for (let t = 0; t < 1; t += 1 / numPoints) {
          const t2 = t * t
          const t3 = t2 * t
          
          // Catmull-Rom spline calculation
          const pos = new Vector3()
          pos.x = 0.5 * ((2 * p1.x) +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3)
          pos.y = 0.5 * ((2 * p1.y) +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
          pos.z = 0.5 * ((2 * p1.z) +
            (-p0.z + p2.z) * t +
            (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
            (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3)
          
          curvePoints.push(pos)
        }
      }
      
      return curvePoints
    }
  
    // Generate world-spanning path
    function generateWorldPath() {
      const controlPoints = []
      const radius = app.config.worldPathRadius || 100
      const numPoints = app.config.worldPathPoints || 8
      const variation = app.config.worldPathVariation || 30
      const minHeight = app.config.minHeight || 5
      const maxHeight = app.config.maxHeight || 15
      
      // Generate control points in a large circle with variations
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2
        const distVariation = randomRange(-variation, variation)
        const heightVariation = randomRange(0, maxHeight - minHeight)
        
        const position = new Vector3(
          Math.cos(angle) * (radius + distVariation),
          minHeight + heightVariation,
          Math.sin(angle) * (radius + distVariation)
        )
        
        controlPoints.push(position)
      }
      
      // Create smooth curve through control points
      return createCurvePoints(controlPoints)
    }
  
    // Find the nearest player within detection radius that is not on cooldown
    function findNearestPlayer() {
      const players = world.getPlayers()
      const detectionRadius = app.config.playerDetectionRadius || 40
      let nearestPlayer = null
      let nearestDistance = detectionRadius
      const currentTime = Date.now() / 1000
      const cooldownTime = app.config.playerCooldownTime || 120
      
      // Current drone position
      const dronePosition = control.camera.position
      
      players.forEach(player => {
        if (player) {
          const playerPos = new Vector3(player.position._x, player.position._y, player.position._z)
          const distance = dronePosition.distanceTo(playerPos)
          
          // Check if player is on cooldown
          const playerId = player.id || player.name
          const lastFollowTime = followedPlayers[playerId] || 0
          const isCooldown = (currentTime - lastFollowTime) < cooldownTime
          
          if (distance < nearestDistance && !isCooldown) {
            nearestPlayer = {
              type: 'player',
              position: playerPos,
              entity: player,
              distance: distance,
              id: playerId
            }
            nearestDistance = distance
          }
        }
      })
      
      return nearestPlayer
    }
  
    // Generate orbit position around player
    function getPlayerOrbitPosition(playerPos, angle) {
      const distance = app.config.playerOrbitDistance || 5
      const height = app.config.playerOrbitHeight || 3
      
      return new Vector3(
        playerPos.x + Math.cos(angle) * distance,
        playerPos.y + height,
        playerPos.z + Math.sin(angle) * distance
      )
    }
  
    // Start drone camera mode
    function enterDroneMode(autoActivated = false) {
      if (currentState !== DroneState.INACTIVE) return
      
      control = app.control()
      if (!control) return
      
      // Set auto-activation flag
      isAutoActivated = autoActivated
      
      // Generate world path first time
      if (worldPathPoints.length === 0) {
        worldPathPoints = generateWorldPath()
      }
      
      // Initialize state
      control.camera.write = true
      currentState = DroneState.TRANSITIONING
      
      // Store initial position and rotation
      startPosition.copy(control.camera.position)
      startRotation.copy(control.camera.quaternion)
      
      // Set initial target position as first point on path
      const firstPoint = worldPathPoints[0]
      const secondPoint = worldPathPoints[1]
      
      targetPosition.copy(firstPoint)
      transitionTargetPosition.copy(firstPoint)
      
      // Calculate initial look direction along path
      const initialDirection = secondPoint.clone().sub(firstPoint).normalize()
      lastLookAt.copy(firstPoint.clone().add(initialDirection))
      
      const rotationMatrix = new Matrix4().lookAt(
        new Vector3(0, 0, 0),
        initialDirection,
        new Vector3(0, 1, 0)
      )
      
      targetRotation.setFromRotationMatrix(rotationMatrix)
      transitionTargetRotation.copy(targetRotation)
      
      // Setup transition
      transitioning = true
      transitionStartTime = Date.now() / 1000
      transitionProgress = 0
      
      // Notify the user
      if (autoActivated) {
        sendChatMessage("Drone Cam activated due to inactivity. Move or press any key to exit.")
      } else {
        sendChatMessage("Drone Cam activated. Type /cam stop to exit.")
      }
    }
  
    // Exit drone camera mode
    function exitDroneMode(force = false) {
      if (currentState === DroneState.INACTIVE) return
      
      console.log('[DroneCam] Exiting drone mode' + (force ? ' (forced)' : ''))
      
      // If auto-activated or force flag is set, immediately release control
      if (isAutoActivated || force) {
        console.log('[DroneCam] Immediate exit - releasing camera control')
        transitioning = false
        
        if (control) {
          control.release()
          control = null
        }
        
        currentState = DroneState.INACTIVE
        isAutoActivated = false
        worldPathProgress = 0 // Reset path position
        
        sendChatMessage("Drone Cam deactivated.")
        return
      }
      
      // Regular transition for manually activated mode
      const player = world.getPlayer()
      if (player && control) {
        console.log('[DroneCam] Starting transition back to player view')
        
        const playerPos = new Vector3(player.position._x, player.position._y, player.position._z)
        const playerEyePos = playerPos.clone().add(new Vector3(0, 1.6, 0))
        
        startPosition.copy(control.camera.position)
        startRotation.copy(control.camera.quaternion)
        
        transitionTargetPosition.copy(playerEyePos)
        
        // Get player's current look direction if possible
        let playerLookDir = new Quaternion()
        
        // Use a forward-facing direction as fallback
        const direction = new Vector3(0, 0, -1)
        const rotationMatrix = new Matrix4().lookAt(
          new Vector3(0, 0, 0),
          direction,
          new Vector3(0, 1, 0)
        )
        
        playerLookDir.setFromRotationMatrix(rotationMatrix)
        transitionTargetRotation.copy(playerLookDir)
        
        currentState = DroneState.TRANSITIONING
        transitioning = true
        transitionStartTime = Date.now() / 1000
        transitionProgress = 0
        
        // Notify user
        sendChatMessage("Returning to first-person view.")
      } else {
        console.log('[DroneCam] No player found or no control - immediate exit')
        if (control) {
          control.release()
          control = null
        }
        currentState = DroneState.INACTIVE
      }
      
      // Reset auto-activated flag
      isAutoActivated = false
    }
  
    // Handle transitions between states
    function handleTransition(delta) {
      if (!transitioning) return false
      
      const currentTime = Date.now() / 1000
      transitionProgress = Math.min((currentTime - transitionStartTime) / 1.5, 1)
      
      // Smooth easing
      const eased = transitionProgress < 0.5 
        ? 2 * transitionProgress * transitionProgress 
        : 1 - Math.pow(-2 * transitionProgress + 2, 2) / 2
      
      // Interpolate position and rotation
      control.camera.position.lerpVectors(startPosition, transitionTargetPosition, eased)
      control.camera.quaternion.slerpQuaternions(startRotation, transitionTargetRotation, eased)
      
      if (transitionProgress >= 1) {
        transitioning = false
        
        // If we were exiting, complete the exit
        if (currentState === DroneState.TRANSITIONING && 
            (startPosition.equals(control.camera.position) || 
             currentState === DroneState.INACTIVE)) {
          console.log('[DroneCam] Transition complete - exiting drone mode')
          if (control) {
            control.release()
            control = null
          }
          currentState = DroneState.INACTIVE
        } else if (currentState === DroneState.TRANSITIONING) {
          console.log('[DroneCam] Transition complete - entering world path')
          currentState = DroneState.WORLD_PATH
        } else if (currentState === DroneState.RETURNING_TO_PATH) {
          console.log('[DroneCam] Transition complete - returning to path')
          currentState = DroneState.WORLD_PATH
        } else if (currentState === DroneState.PLAYER_DETECTED) {
          console.log('[DroneCam] Transition complete - following player')
          currentState = DroneState.FOLLOWING_PLAYER
          playerFollowStartTime = currentTime
          
          // Mark this player as followed for cooldown
          if (currentTarget && currentTarget.id) {
            followedPlayers[currentTarget.id] = currentTime
          }
        }
        
        return false
      }
      
      return true
    }
  
    // Calculate camera direction and banking
    function calculateCameraRotation(nextPoint, lookTarget, delta) {
      const smoothing = app.config.smoothing || 0.15
      const turnSpeed = app.config.turnSpeed || 0.8
      const bankFactor = app.config.bankFactor || 0.25
      
      // Calculate movement direction
      const moveDirection = nextPoint.clone().sub(control.camera.position).normalize()
      currentVelocityDirection.lerp(moveDirection, smoothing)
      
      // Calculate banking angle based on turn rate
      const turnRate = currentVelocityDirection.cross(moveDirection).y
      const targetBank = -turnRate * Math.PI * bankFactor
      bankAngle = lerp(bankAngle, targetBank, smoothing)
      
      // Create rotation with banking
      const up = new Vector3(Math.sin(bankAngle), Math.cos(bankAngle), 0)
      const direction = lookTarget.clone().sub(control.camera.position).normalize()
      
      const rotationMatrix = new Matrix4().lookAt(
        new Vector3(0, 0, 0),
        direction,
        up
      )
      
      targetRotation.setFromRotationMatrix(rotationMatrix)
      control.camera.quaternion.slerp(targetRotation, turnSpeed * delta)
    }
  
    // Follow world path
    function followWorldPath(delta) {
      const droneSpeed = app.config.droneSpeed || 2
      const smoothing = app.config.smoothing || 0.15
      
      // Move along path
      worldPathProgress += delta * droneSpeed
      const pathIndex = Math.floor(worldPathProgress) % worldPathPoints.length
      const nextIndex = (pathIndex + 1) % worldPathPoints.length
      
      // Save current position on path
      worldPathLastPosition = worldPathProgress
      
      // Interpolate between current and next point
      const alpha = worldPathProgress % 1
      const currentPoint = worldPathPoints[pathIndex]
      const nextPoint = worldPathPoints[nextIndex]
      
      // Get point further along path to look toward
      const lookAheadIndex = (nextIndex + 1) % worldPathPoints.length
      const lookAheadPoint = worldPathPoints[lookAheadIndex]
      
      // Update position with smooth interpolation
      targetPosition.lerpVectors(currentPoint, nextPoint, alpha)
      control.camera.position.lerp(targetPosition, smoothing)
      
      // Update look target to be ahead on path
      lastLookAt.lerp(lookAheadPoint, smoothing * 0.5)
      
      // Calculate camera direction and banking
      calculateCameraRotation(nextPoint, lastLookAt, delta)
      
      // Check for nearby players
      const nearestPlayer = findNearestPlayer()
      
      if (nearestPlayer) {
        currentTarget = nearestPlayer
        
        // Start transition to player
        currentState = DroneState.PLAYER_DETECTED
        transitioning = true
        transitionStartTime = Date.now() / 1000
        transitionProgress = 0
        startPosition.copy(control.camera.position)
        startRotation.copy(control.camera.quaternion)
        
        // Calculate initial orbit position
        orbitAngle = Math.random() * Math.PI * 2
        const orbitPos = getPlayerOrbitPosition(nearestPlayer.position, orbitAngle)
        transitionTargetPosition.copy(orbitPos)
        
        // Calculate rotation toward player
        const direction = nearestPlayer.position.clone().add(new Vector3(0, 1.6, 0)).sub(orbitPos).normalize()
        const rotationMatrix = new Matrix4().lookAt(
          new Vector3(0, 0, 0),
          direction,
          new Vector3(0, 1, 0)
        )
        transitionTargetRotation.setFromRotationMatrix(rotationMatrix)
      }
    }
  
    // Follow player
    function followPlayer(delta) {
      const currentTime = Date.now() / 1000
      const orbitSpeed = app.config.playerOrbitSpeed || 0.5
      const smoothing = app.config.smoothing || 0.15
      const followDuration = app.config.playerFollowTime || 15
      
      // Update player position
      if (currentTarget && currentTarget.entity) {
        currentTarget.position.set(
          currentTarget.entity.position._x,
          currentTarget.entity.position._y,
          currentTarget.entity.position._z
        )
      }
      
      // Update orbit angle
      orbitAngle += delta * orbitSpeed
      
      // Calculate target orbit position
      const orbitPos = getPlayerOrbitPosition(currentTarget.position, orbitAngle)
      targetPosition.copy(orbitPos)
      
      // Smooth position update
      control.camera.position.lerp(targetPosition, smoothing)
      
      // Calculate look direction toward player
      const lookTarget = currentTarget.position.clone().add(new Vector3(0, 1.6, 0))
      lastLookAt.lerp(lookTarget, smoothing)
      
      // Calculate camera rotation with banking
      calculateCameraRotation(targetPosition, lastLookAt, delta)
      
      // Check if we should return to the path
      if (currentTime - playerFollowStartTime > followDuration) {
        // Start transition back to path
        currentState = DroneState.RETURNING_TO_PATH
        transitioning = true
        transitionStartTime = Date.now() / 1000
        transitionProgress = 0
        
        startPosition.copy(control.camera.position)
        startRotation.copy(control.camera.quaternion)
        
        // Calculate return position on path
        const pathIndex = Math.floor(worldPathLastPosition) % worldPathPoints.length
        const nextIndex = (pathIndex + 1) % worldPathPoints.length
        
        const alpha = worldPathLastPosition % 1
        const pathPoint = worldPathPoints[pathIndex]
        const nextPoint = worldPathPoints[nextIndex]
        
        transitionTargetPosition.lerpVectors(pathPoint, nextPoint, alpha)
        
        // Calculate rotation along path
        const lookAheadIndex = (nextIndex + 1) % worldPathPoints.length
        const lookAheadPoint = worldPathPoints[lookAheadIndex]
        
        const direction = lookAheadPoint.clone().sub(transitionTargetPosition).normalize()
        const rotationMatrix = new Matrix4().lookAt(
          new Vector3(0, 0, 0),
          direction,
          new Vector3(0, 1, 0)
        )
        transitionTargetRotation.setFromRotationMatrix(rotationMatrix)
      }
    }
  
    // Start first-person camera view
    function enterFirstPersonMode() {
      if (currentState === DroneState.FIRST_PERSON) return
      
      console.log('[DroneCam] Entering first-person mode')
      
      // Exit drone mode if active
      if (currentState !== DroneState.INACTIVE) {
        exitDroneMode(true)
      }
      
      control = app.control()
      if (!control) return
      
      // Initialize state
      control.camera.write = true
      currentState = DroneState.FIRST_PERSON
      firstPersonActive = true
      
      // Calculate camera offset
      updateFirstPersonOffsets()
      
      // Notify the user
      sendChatMessage("First-person camera activated. Type /firstperson again to exit.")
    }
    
    // Calculate first-person camera offset vectors
    function updateFirstPersonOffsets() {
      const cameraHeight = app.config.fpCameraHeight || 1.6
      const forwardOffset = app.config.fpCameraForwardOffset || 0
      const horizontalOffset = app.config.fpCameraHorizontalOffset || 0
      
      // Set height offset
      firstPersonOffset.set(0, cameraHeight, 0)
      
      // Create forward and right vectors for additional positioning
      firstPersonForwardVector.set(0, 0, forwardOffset)
      firstPersonRightVector.set(horizontalOffset, 0, 0)
    }
    
    // Exit first-person mode
    function exitFirstPersonMode() {
      if (currentState !== DroneState.FIRST_PERSON) return
      
      console.log('[DroneCam] Exiting first-person mode')
      
      if (control) {
        control.release()
        control = null
      }
      
      currentState = DroneState.INACTIVE
      firstPersonActive = false
      
      sendChatMessage("First-person camera deactivated.")
    }
    
    // Toggle first-person mode
    function toggleFirstPersonMode() {
      if (currentState === DroneState.FIRST_PERSON) {
        exitFirstPersonMode()
      } else {
        enterFirstPersonMode()
      }
    }
    
    // Update first-person camera position
    function updateFirstPersonCamera() {
      if (!control || currentState !== DroneState.FIRST_PERSON) return
      
      const player = world.getPlayer()
      if (!player) return
      
      // Get player position and rotation
      const playerPos = new Vector3(player.position._x, player.position._y, player.position._z)
      const playerRot = player.quaternion || new Quaternion()
      
      // Update offsets in case config values were changed
      updateFirstPersonOffsets()
      
      // Create vectors for positioning
      const forward = new Vector3(0, 0, 1).applyQuaternion(playerRot).multiplyScalar(firstPersonForwardVector.z)
      const right = new Vector3(1, 0, 0).applyQuaternion(playerRot).multiplyScalar(firstPersonRightVector.x)
      
      // Set camera position at exact eye level
      control.camera.position.copy(playerPos)
        .add(firstPersonOffset) // Add height
        .add(forward)           // Add forward/backward offset
        .add(right)             // Add left/right offset
      
      // Match player rotation
      if (player.quaternion) {
        control.camera.quaternion.copy(playerRot)
      }
    }
    
    // Save current camera position
    function saveCameraPosition(name) {
      const maxCameras = app.config.maxSavedCameras || 10
      
      if (savedCameras.length >= maxCameras) {
        sendChatMessage(`Maximum of ${maxCameras} cameras reached. Delete one first.`)
        return false
      }
      
      if (!control) {
        control = app.control()
        if (!control) return false
      }
      
      // Generate a default name if none provided
      if (!name) {
        name = `Camera ${savedCameras.length + 1}`
      }
      
      // Save the position and rotation
      const cameraData = {
        id: Date.now().toString(),
        name: name,
        position: control.camera.position.clone(),
        rotation: control.camera.quaternion.clone()
      }
      
      savedCameras.push(cameraData)
      
      // Save to app state to persist across config changes
      saveCamerasToState()
      
      sendChatMessage(`Camera position "${name}" saved! Use /cam goto ${savedCameras.length} to return here.`)
      
      return true
    }
    
    // Go to a saved camera position
    function gotoCamera(indexOrName) {
      // If no cameras are saved
      if (savedCameras.length === 0) {
        sendChatMessage('No camera positions have been saved yet. Use /cam save [name] to save a position.')
        return false
      }
      
      let targetCamera = null
      
      // Check if indexOrName is a number
      if (!isNaN(indexOrName)) {
        const index = parseInt(indexOrName) - 1 // Convert to 0-based index
        if (index >= 0 && index < savedCameras.length) {
          targetCamera = savedCameras[index]
          currentCameraIndex = index
        }
      } else {
        // Try to find by name
        for (let i = 0; i < savedCameras.length; i++) {
          if (savedCameras[i].name.toLowerCase() === indexOrName.toLowerCase()) {
            targetCamera = savedCameras[i]
            currentCameraIndex = i
            break
          }
        }
      }
      
      if (!targetCamera) {
        sendChatMessage(`Camera "${indexOrName}" not found. Use /cam list to see saved cameras.`)
        return false
      }
      
      // Exit other camera modes
      if (currentState === DroneState.FIRST_PERSON) {
        exitFirstPersonMode()
      } else if (currentState !== DroneState.INACTIVE && currentState !== DroneState.FIXED_CAMERA) {
        exitDroneMode(true)
      }
      
      // Set up control if needed
      if (!control) {
        control = app.control()
        if (!control) return false
      }
      
      // Initialize state
      control.camera.write = true
      
      // Set up transition
      fixedCamStartPos.copy(control.camera.position)
      fixedCamStartRot.copy(control.camera.quaternion)
      fixedCamTargetPos.copy(targetCamera.position)
      fixedCamTargetRot.copy(targetCamera.rotation)
      
      // Start transition
      fixedCamTransitioning = true
      fixedCamTransitionStartTime = Date.now() / 1000
      fixedCamTransitionDuration = app.config.camSwitchSpeed || 1.0
      
      currentState = DroneState.FIXED_CAMERA
      
      sendChatMessage(`Moving to camera "${targetCamera.name}"`)
      
      return true
    }
    
    // List all saved camera positions
    function listCameras() {
      if (savedCameras.length === 0) {
        sendChatMessage('No camera positions have been saved yet. Use /cam save [name] to save a position.')
        return
      }
      
      let message = 'Saved camera positions:\n'
      savedCameras.forEach((cam, index) => {
        message += `${index + 1}: ${cam.name}\n`
      })
      
      sendChatMessage(message)
    }
    
    // Delete a saved camera position
    function deleteCamera(indexOrName) {
      if (savedCameras.length === 0) {
        sendChatMessage('No camera positions to delete.')
        return false
      }
      
      let targetIndex = -1
      
      // Check if indexOrName is a number
      if (!isNaN(indexOrName)) {
        const index = parseInt(indexOrName) - 1 // Convert to 0-based index
        if (index >= 0 && index < savedCameras.length) {
          targetIndex = index
        }
      } else {
        // Try to find by name
        for (let i = 0; i < savedCameras.length; i++) {
          if (savedCameras[i].name.toLowerCase() === indexOrName.toLowerCase()) {
            targetIndex = i
            break
          }
        }
      }
      
      if (targetIndex === -1) {
        sendChatMessage(`Camera "${indexOrName}" not found. Use /cam list to see saved cameras.`)
        return false
      }
      
      const deletedName = savedCameras[targetIndex].name
      savedCameras.splice(targetIndex, 1)
      
      // Update current index if necessary
      if (currentCameraIndex >= targetIndex) {
        currentCameraIndex = Math.max(-1, currentCameraIndex - 1)
      }
      
      // Save changes to app state
      saveCamerasToState()
      
      sendChatMessage(`Camera "${deletedName}" deleted.`)
      return true
    }
    
    // Go to next saved camera
    function nextCamera() {
      if (savedCameras.length === 0) {
        sendChatMessage('No camera positions have been saved yet. Use /cam save [name] to save a position.')
        return false
      }
      
      const nextIndex = (currentCameraIndex + 1) % savedCameras.length
      return gotoCamera(nextIndex + 1) // Convert to 1-based index for gotoCamera
    }
    
    // Go to previous saved camera
    function prevCamera() {
      if (savedCameras.length === 0) {
        sendChatMessage('No camera positions have been saved yet. Use /cam save [name] to save a position.')
        return false
      }
      
      const prevIndex = (currentCameraIndex - 1 + savedCameras.length) % savedCameras.length
      return gotoCamera(prevIndex + 1) // Convert to 1-based index for gotoCamera
    }
    
    // Update fixed camera view
    function updateFixedCamera(delta) {
      if (!control || currentState !== DroneState.FIXED_CAMERA) return
      
      // Handle transition between cameras
      if (fixedCamTransitioning) {
        const currentTime = Date.now() / 1000
        const elapsed = currentTime - fixedCamTransitionStartTime
        const progress = Math.min(elapsed / fixedCamTransitionDuration, 1)
        
        // Smooth easing
        const eased = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2
        
        // Interpolate position and rotation
        control.camera.position.lerpVectors(fixedCamStartPos, fixedCamTargetPos, eased)
        control.camera.quaternion.slerpQuaternions(fixedCamStartRot, fixedCamTargetRot, eased)
        
        if (progress >= 1) {
          fixedCamTransitioning = false
        }
      }
    }
    
    // Exit fixed camera mode
    function exitFixedCameraMode() {
      if (currentState !== DroneState.FIXED_CAMERA) return
      
      if (control) {
        control.release()
        control = null
      }
      
      currentState = DroneState.INACTIVE
      sendChatMessage("Fixed camera deactivated.")
    }
    
    // Update drone movement based on current state
    function updateDroneMovement(delta) {
      if (!control || currentState === DroneState.INACTIVE) return
      
      // Handle transitions between states
      if (handleTransition(delta)) {
        return
      }
      
      // Update based on current state
      switch (currentState) {
        case DroneState.WORLD_PATH:
          followWorldPath(delta)
          break
          
        case DroneState.FOLLOWING_PLAYER:
          followPlayer(delta)
          break
          
        case DroneState.FIRST_PERSON:
          updateFirstPersonCamera()
          break
          
        case DroneState.FIXED_CAMERA:
          updateFixedCamera(delta)
          break
      }
    }
    
    // Check for user activity
    function checkForActivity(dt) {
      const currentTime = Date.now() / 1000
      const player = world.getPlayer()
      
      // Update player position to detect movement
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
      
      // Only check for idle every second to save resources
      if (currentTime - lastActivityCheck >= 1) {
        lastActivityCheck = currentTime
        
        // Check if we should activate drone cam due to inactivity
        if (app.config.autoActivateOnIdle && currentState === DroneState.INACTIVE) {
          const idleTimeout = app.config.idleTimeout || 60
          if (currentTime - lastActivityTime > idleTimeout) {
            enterDroneMode(true) // Auto-activated
          }
        }
      }
    }
    
    // Create a UI text element to display messages
    const messageUI = app.create('ui')
    messageUI.width = 400
    messageUI.height = 40
    messageUI.backgroundColor = 'rgba(0, 0, 0, 0.5)'
    messageUI.borderRadius = 10
    messageUI.padding = 10
    messageUI.position.set(0, -200, 0) // Position off-screen initially
    messageUI.active = false
    
    const messageText = app.create('uitext')
    messageText.fontSize = 16
    messageText.color = '#ffffff'
    messageText.value = ''
    messageUI.add(messageText)
    app.add(messageUI)
    
    // Message display function
    function showMessage(message, duration = 3) {
      messageText.value = message
      messageUI.active = true
      
      // Hide the message after duration
      setTimeout(() => {
        messageUI.active = false
      }, duration * 1000)
    }
    
    // Listen for our custom messages
    app.on('dronecam:message', (data) => {
      if (data && data.text) {
        showMessage(data.text)
      }
    })
    
    // Process chat messages directly
    function processChatCommand(text) {
      if (!text) return
      
      console.log('[DroneCam] Processing command:', text)
      
      // Split command into parts
      const parts = text.split(' ')
      const command = parts[0].toLowerCase()
      
      if (command === '/cam') {
        const subCommand = parts[1] ? parts[1].toLowerCase() : 'help'
        
        switch (subCommand) {
          case 'start':
            console.log('[DroneCam] Activating drone cam')
            if (currentState === DroneState.INACTIVE) {
              enterDroneMode(false) // Not auto-activated
            } else {
              sendChatMessage("Camera system is already active!")
            }
            return true
            
          case 'stop':
          case 'exit':
            console.log('[DroneCam] Deactivating camera system')
            if (currentState === DroneState.FIXED_CAMERA) {
              exitFixedCameraMode()
            } else if (currentState === DroneState.FIRST_PERSON) {
              exitFirstPersonMode()
            } else if (currentState !== DroneState.INACTIVE) {
              exitDroneMode(true)
            } else {
              sendChatMessage("Camera system is not active!")
            }
            return true
            
          case 'save':
            const name = parts.slice(2).join(' ') // Get rest of command as name
            saveCameraPosition(name)
            return true
            
          case 'goto':
          case 'go':
            if (parts.length < 3) {
              sendChatMessage("Usage: /cam goto [number or name]")
            } else {
              gotoCamera(parts[2])
            }
            return true
            
          case 'list':
            listCameras()
            return true
            
          case 'delete':
          case 'del':
            if (parts.length < 3) {
              sendChatMessage("Usage: /cam delete [number or name]")
            } else {
              deleteCamera(parts[2])
            }
            return true
            
          case 'next':
            nextCamera()
            return true
            
          case 'prev':
          case 'previous':
            prevCamera()
            return true
            
          case 'help':
          default:
            const helpMessage = `
Camera commands:
/cam start - Start drone camera
/cam stop - Stop active camera
/cam save [name] - Save current position
/cam goto [#/name] - Go to saved position
/cam list - Show saved positions
/cam delete [#/name] - Delete a position
/cam next - Go to next camera
/cam prev - Go to previous camera
/firstperson - Toggle first-person view
            `.trim()
            sendChatMessage(helpMessage)
            return true
        }
      }
      
      if (text === '/firstperson') {
        console.log('[DroneCam] Toggle first-person camera')
        toggleFirstPersonMode()
        return true
      }
      
      return false
    }
    
    // Listen for chat commands
    world.on('chat', (event) => {
      try {
        console.log('[DroneCam] Chat event received:', event)
        
        if (!event) return
        
        // Try multiple ways to access the text with body as priority
        let text = null
        if (event.body) {
          text = event.body
        } else if (event.text) {
          text = event.text
        } else if (typeof event === 'string') {
          text = event
        } else if (event.message) {
          text = event.message
        } else if (event.content) {
          text = event.content
        }
        
        if (text) {
          console.log('[DroneCam] Chat command found:', text)
          processChatCommand(text)
        }
      } catch (err) {
        console.error('[DroneCam] Error processing chat command:', err)
      }
    })
    
    // Direct command method that can be called from outside
    app.droneCamCommand = (cmd) => {
      processChatCommand(cmd)
    }
    
    // Create a button for testing
    const camButton = app.create('ui')
    camButton.width = 200
    camButton.height = 40
    camButton.backgroundColor = 'rgba(0, 100, 200, 0.8)'
    camButton.borderRadius = 10
    camButton.padding = 10
    camButton.position.set(0, 200, 0)
    
    const buttonText = app.create('uitext')
    buttonText.fontSize = 16
    buttonText.color = '#ffffff'
    buttonText.value = 'Toggle Drone Cam'
    camButton.add(buttonText)
    
    camButton.onPointerDown = () => {
      if (currentState === DroneState.INACTIVE) {
        processChatCommand('/cam start')
      } else {
        // Force immediate stop when using the button
        exitDroneMode(true)
      }
    }
    
    app.add(camButton)
    
    // Create first-person button
    const fpButton = app.create('ui')
    fpButton.width = 200
    fpButton.height = 40
    fpButton.backgroundColor = 'rgba(0, 150, 100, 0.8)'
    fpButton.borderRadius = 10
    fpButton.padding = 10
    fpButton.position.set(0, 150, 0)
    
    const fpButtonText = app.create('uitext')
    fpButtonText.fontSize = 16
    fpButtonText.color = '#ffffff'
    fpButtonText.value = 'Toggle First Person'
    fpButton.add(fpButtonText)
    
    fpButton.onPointerDown = () => {
      toggleFirstPersonMode()
    }
    
    app.add(fpButton)
    
    // More comprehensive input detection
    function setupInputHandlers() {
      // Keyboard input
      app.on('keydown', (event) => {
        // Remove excessive console log
        // console.log('[DroneCam] Keydown detected', event)
        handleActivity()
      })
      
      app.on('keyup', (event) => {
        // Remove excessive console log
        // console.log('[DroneCam] Keyup detected', event)
        handleActivity()
      })
      
      // Mouse input
      app.on('pointerdown', (event) => {
        // Remove excessive console log
        // console.log('[DroneCam] Pointer down detected', event)
        handleActivity()
      })
      
      app.on('pointerup', (event) => {
        // Remove excessive console log
        // console.log('[DroneCam] Pointer up detected', event)
        handleActivity()
      })
      
      app.on('pointermove', (event) => {
        // Only count significant mouse movement
        if (event && Math.abs(event.x - lastMousePosition.x) > 5 || 
            Math.abs(event.y - lastMousePosition.y) > 5) {
          // Remove excessive console log
          // console.log('[DroneCam] Significant pointer move detected')
          handleActivity()
          lastMousePosition.x = event.x || 0
          lastMousePosition.y = event.y || 0
        }
      })
      
      // Capture mouse wheel events
      app.on('wheel', (event) => {
        // Remove excessive console log
        // console.log('[DroneCam] Mouse wheel detected', event)
        handleActivity()
      })
      
      // Listen for gamepad input if available
      app.on('gamepadbuttondown', (event) => {
        // Remove excessive console log
        // console.log('[DroneCam] Gamepad button down detected', event)
        handleActivity()
      })
      
      app.on('gamepadbuttonup', (event) => {
        // Remove excessive console log
        // console.log('[DroneCam] Gamepad button up detected', event)
        handleActivity()
      })
      
      app.on('gamepadaxismove', (event) => {
        // Remove excessive console log
        // console.log('[DroneCam] Gamepad axis move detected', event)
        handleActivity()
      })
      
      // Last resort: check all world events
      world.on('beforemove', () => {
        handleActivity()
      })
      
      world.on('afterturn', () => {
        handleActivity()
      })
    }
    
    // Initialize input handlers
    setupInputHandlers()
    
    // Create on-screen camera controls
    function setupScreenControls() {
      try {
        // Load camera positions from state first
        if (savedCameras.length === 0) {
          loadCamerasFromState()
        }
        
        const control = app.control({
          mouse: true,
          keyboard: true,
          camera: false,
          updatePriority: 1
        })
        
        // Start with collapsed panel
        let isControlPanelCollapsed = true
        
        // Create collapsed button (always visible)
        const collapsedButton = app.create('ui', {
          width: 60,
          height: 60,
          backgroundColor: 'rgba(40, 40, 50, 0.9)',
          borderRadius: 30, // Circle shape
          padding: 0,
          space: 'screen',
          position: [0.95, 0.2, 1], // Right side of screen, 20% from top
          pivot: 'center',
          interactive: true,
          justifyContent: 'center',
          alignItems: 'center'
        })
        
        // Camera icon for collapsed state
        const cameraIcon = app.create('uitext', {
          value: '🎥', // Camera icon
          color: '#fcba03', // Fallout amber color
          fontSize: 24
        })
        collapsedButton.add(cameraIcon)
        
        // Add indicator dot showing current camera mode
        const currentModeIndicator = app.create('uiview', {
          width: 16,
          height: 16,
          backgroundColor: '#00ff00', // Will be updated based on mode
          borderRadius: 8, // Circle
          position: [0.7, 0.3, 0], // Top-right corner
          pivot: 'center',
          borderWidth: 2,
          borderColor: '#fcba03'
        })
        collapsedButton.add(currentModeIndicator)
        
        // Add collapsed button to scene right away
        app.add(collapsedButton)
        
        // Create the expanded control panel (added to scene later)
        const cameraControlPanel = app.create('ui', {
          width: 380,
          height: 280, // Shorter height for better organization
          backgroundColor: 'rgba(40, 40, 50, 0.95)',
          borderRadius: 8,
          padding: 10,
          space: 'screen',
          position: [0.8, 0.4, 1], // Right side, 40% from top
          pivot: 'center',
          interactive: true,
          alignItems: 'center',
          justifyContent: 'flex-start'
        })
        
        // Add collapse button
        const collapseButton = app.create('uiview', {
          width: 24,
          height: 24,
          backgroundColor: 'rgba(60, 60, 60, 0.8)',
          borderRadius: 12,
          position: [0.94, 0.06, 0], // Top-right corner
          pivot: 'center',
          interactive: true,
          justifyContent: 'center',
          alignItems: 'center'
        })
        
        const collapseIcon = app.create('uitext', {
          value: '×', // X icon
          fontSize: 16,
          color: '#ffffff'
        })
        collapseButton.add(collapseIcon)
        cameraControlPanel.add(collapseButton)
        
        // Header - shows current mode
        const panelHeader = app.create('uitext', {
          value: 'CAMERA CONTROLS',
          color: '#fcba03',
          fontSize: 20,
          backgroundColor: 'rgba(20, 20, 20, 0.8)',
          borderRadius: 4,
          padding: 8,
          width: 360,
          textAlign: 'center',
          marginTop: 5
        })
        cameraControlPanel.add(panelHeader)
        
        // Function to update mode display based on current state
        function updateModeDisplay() {
          let modeText = 'INACTIVE'
          let modeColor = '#ffffff'
          let indicatorColor = '#00ff00'
          
          switch (currentState) {
            case DroneState.WORLD_PATH:
              modeText = 'DRONE CAM'
              modeColor = '#4287f5'
              indicatorColor = '#4287f5'
              break
              
            case DroneState.FOLLOWING_PLAYER:
              modeText = 'FOLLOWING PLAYER'
              modeColor = '#f542a7'
              indicatorColor = '#f542a7'
              break
              
            case DroneState.FIRST_PERSON:
              modeText = 'FIRST PERSON'
              modeColor = '#42f5b3'
              indicatorColor = '#42f5b3'
              break
              
            case DroneState.FIXED_CAMERA:
              modeText = 'FIXED CAMERA'
              modeColor = '#f5a142'
              indicatorColor = '#f5a142'
              if (currentCameraIndex >= 0 && currentCameraIndex < savedCameras.length) {
                modeText += `: ${savedCameras[currentCameraIndex].name}`
              }
              break
              
            default:
              modeText = 'INACTIVE'
              modeColor = '#ffffff'
              indicatorColor = '#00ff00'
          }
          
          // Update the title text
          if (panelHeader) {
            panelHeader.value = modeText
            panelHeader.color = modeColor
          }
          
          // Update indicator dot
          if (currentModeIndicator) {
            currentModeIndicator.backgroundColor = indicatorColor
          }
        }
        
        // Helper function to create control buttons
        const createControlButton = (icon, label, action, width = 110, height = 36, color = 'rgba(40, 40, 40, 0.9)') => {
          const button = app.create('uiview', {
            width: width,
            height: height,
            backgroundColor: color,
            borderRadius: 6,
            padding: 4,
            interactive: true,
            justifyContent: 'center',
            alignItems: 'center'
          })
          
          const buttonText = app.create('uitext', {
            value: icon + ' ' + label,
            color: '#ffffff',
            fontSize: 14,
            textAlign: 'center'
          })
          
          button.add(buttonText)
          button.onPointerDown = action
          
          return button
        }
        
        // Create mode buttons container
        const modeButtonsContainer = app.create('uiview', {
          width: 360,
          height: 46,
          marginTop: 10,
          justifyContent: 'center',
          alignItems: 'center'
        })
        
        // Create a row for the buttons
        const buttonRow = app.create('uiview', {
          width: 360,
          height: 40,
          justifyContent: 'space-between',
          alignItems: 'center',
          flexDirection: 'row'
        })
        
        // Drone Camera button
        const droneButton = createControlButton('🚁', 'DRONE', () => {
          processChatCommand('/cam start')
          updateModeDisplay()
        }, 110)
        buttonRow.add(droneButton)
        
        // First Person button
        const fpButton = createControlButton('👁️', 'FIRST-PERSON', () => {
          processChatCommand('/firstperson')
          updateModeDisplay()
        }, 110)
        buttonRow.add(fpButton)
        
        // Stop/Exit button
        const stopButton = createControlButton('⏹️', 'EXIT', () => {
          processChatCommand('/cam stop')
          updateModeDisplay()
        }, 110)
        buttonRow.add(stopButton)
        
        modeButtonsContainer.add(buttonRow)
        cameraControlPanel.add(modeButtonsContainer)
        
        // Divider
        const divider = app.create('uiview', {
          width: 340,
          height: 2,
          backgroundColor: 'rgba(92, 92, 92, 0.5)',
          marginTop: 8,
          marginBottom: 8
        })
        cameraControlPanel.add(divider)
        
        // Camera positions section header
        const positionsHeader = app.create('uitext', {
          value: 'SAVED CAMERA POSITIONS',
          color: '#fcba03',
          fontSize: 14,
          textAlign: 'center',
          marginBottom: 5
        })
        cameraControlPanel.add(positionsHeader)
        
        // Function to update the camera position list
        function updateCameraList() {
          console.log('[DroneCam] Updating camera list, saved cameras:', savedCameras.length)
          
          // Clear and rebuild camera list container to avoid UI errors
          while (cameraListContainer.children.length > 0) {
            cameraListContainer.remove(cameraListContainer.children[0])
          }
          
          // Add a grid for camera position buttons
          const cameraGrid = app.create('uiview', {
            width: 340,
            height: 80,
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6
          })
          
          if (savedCameras.length === 0) {
            // No cameras saved yet
            const noSavedText = app.create('uitext', {
              value: 'No saved positions. Use SAVE to create one.',
              color: '#999999',
              fontSize: 14,
              textAlign: 'center'
            })
            cameraGrid.add(noSavedText)
          } else {
            // Add up to 8 camera buttons in a grid
            const maxToShow = Math.min(savedCameras.length, 8)
            for (let i = 0; i < maxToShow; i++) {
              const camera = savedCameras[i]
              const camButton = app.create('uiview', {
                width: 80,
                height: 36,
                backgroundColor: i === currentCameraIndex ? 'rgba(60, 80, 100, 0.9)' : 'rgba(40, 40, 40, 0.9)',
                borderRadius: 6,
                borderWidth: i === currentCameraIndex ? 2 : 0,
                borderColor: '#fcba03',
                padding: 4,
                justifyContent: 'center',
                alignItems: 'center',
                interactive: true
              })
              
              const buttonLabel = app.create('uitext', {
                value: `${i+1}: ${camera.name.slice(0, 6)}${camera.name.length > 6 ? '...' : ''}`,
                color: i === currentCameraIndex ? '#fcba03' : '#ffffff',
                fontSize: 12,
                textAlign: 'center'
              })
              
              camButton.add(buttonLabel)
              
              camButton.onPointerDown = () => {
                processChatCommand(`/cam goto ${i + 1}`)
                updateModeDisplay()
                setTimeout(updateCameraList, 100)
              }
              
              cameraGrid.add(camButton)
            }
          }
          
          cameraListContainer.add(cameraGrid)
        }
        
        // Camera position list container
        const cameraListContainer = app.create('uiview', {
          width: 340,
          height: 90,
          backgroundColor: 'rgba(20, 20, 20, 0.4)',
          borderRadius: 6,
          padding: 6,
          justifyContent: 'center',
          alignItems: 'center'
        })
        cameraControlPanel.add(cameraListContainer)
        
        // Navigation row
        const navButtonsContainer = app.create('uiview', {
          width: 340,
          height: 40,
          marginTop: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        })
        
        // Previous camera
        const prevButton = createControlButton('◀', 'PREV', () => {
          processChatCommand('/cam prev')
          setTimeout(updateCameraList, 100)
          updateModeDisplay()
        }, 80, 36)
        navButtonsContainer.add(prevButton)
        
        // Save camera
        const saveButton = createControlButton('💾', 'SAVE', () => {
          processChatCommand('/cam save Camera ' + (savedCameras.length + 1))
          setTimeout(updateCameraList, 100)
        }, 80, 36, 'rgba(0, 80, 40, 0.9)')
        navButtonsContainer.add(saveButton)
        
        // Delete camera
        const deleteButton = createControlButton('🗑️', 'DELETE', () => {
          if (savedCameras.length > 0 && currentCameraIndex >= 0) {
            deleteCamera(currentCameraIndex + 1)  // We use the function instead of direct command
            setTimeout(updateCameraList, 100)
          } else {
            // If no camera selected, delete the first one
            if (savedCameras.length > 0) {
              deleteCamera(1)  // We use the function instead of direct command
              setTimeout(updateCameraList, 100)
            }
          }
        }, 80, 36, 'rgba(80, 0, 0, 0.9)')
        navButtonsContainer.add(deleteButton)
        
        // Next camera
        const nextButton = createControlButton('▶', 'NEXT', () => {
          processChatCommand('/cam next')
          setTimeout(updateCameraList, 100)
          updateModeDisplay()
        }, 80, 36)
        navButtonsContainer.add(nextButton)
        
        cameraControlPanel.add(navButtonsContainer)
        
        // Set up click handlers
        collapsedButton.onPointerDown = function() {
          // Hide collapsed button
          app.remove(collapsedButton)
          // Show panel
          app.add(cameraControlPanel)
          // Update display with current info
          updateModeDisplay()
          updateCameraList()
          return true
        }
        
        collapseButton.onPointerDown = function() {
          // Hide panel
          app.remove(cameraControlPanel)
          // Show collapsed button
          app.add(collapsedButton)
          return true
        }
        
        // Initial update
        updateModeDisplay()
        
        // Listen for app state changes
        app.on('state', () => {
          updateCameraList()
          updateModeDisplay()
        })
        
        console.log('[DroneCam] Screen controls initialized')
      } catch (err) {
        console.error('[DroneCam] Error setting up camera controls:', err)
      }
    }
    
    // Create screen controls after initialization, but load state first
    loadCamerasFromState()  // Load state before creating controls
    setTimeout(setupScreenControls, 500)
    
    // Update loop
    app.on('update', (delta) => {
      updateDroneMovement(delta)
      checkForActivity(delta)
    })
    
    // Register for app configuration changes
    app.on('configure', (changes) => {
      console.log('[DroneCam] Configuration changed, ensuring camera positions are preserved')
      // If we don't have any cameras loaded, try to load them
      if (savedCameras.length === 0) {
        loadCamerasFromState()
      }
    })
    
    // Initialize
    function initialize() {
      console.log('[DroneCam] Script initialized. Use /cam start to activate or /firstperson for first-person view.')
      
      // Try to load saved cameras from state
      if (loadCamerasFromState()) {
        console.log('[DroneCam] Successfully loaded saved camera positions.')
      }
    }
    
    initialize()
  } 