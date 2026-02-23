// Define configurable app properties for customization
app.configure([
  {
    key: 'enterEmote',
    type: 'file',
    kind: 'emote',
    label: 'Enter Animation'
  }
])

// Core flight mechanics configuration
const FLIGHT_CONFIG = {
  // Aircraft movement parameters
  THRUST_SPEED: 10,        // Acceleration rate when thrusting
  TURN_SPEED: 0.6,        // Yaw rotation speed
  PITCH_SPEED: 0.6,       // Pitch rotation speed
  ROLL_SPEED: 1.5,        // Roll rotation speed
  MIN_SPEED: 0,           // Minimum flight speed
  MAX_SPEED: 100,         // Maximum flight speed
  
  // Initial spawn configuration
  SPAWN_POSITION: new Vector3(0, 0.5, 0),  // Where the jet initially spawns
  SPAWN_ROTATION: new Vector3(0, 0, 0),  // Initial rotation in radians
  
  // Camera view configuration
  CAMERA_DAMPING: 0.5,    // Smoothing factor for camera movement
  CAMERA_ANGLES: [        // Predefined camera positions and look-ahead distances
    { position: new Vector3(0, 2, 6), lookAhead: 5 },    // Default chase camera
    { position: new Vector3(0, 2, 1.5), lookAhead: 8 },  // Cockpit view
    { position: new Vector3(5, 4, 3), lookAhead: 5 },    // Side view
    { position: new Vector3(3, 2, 0.1), lookAhead: 1 },  // Profile view
    { position: new Vector3(0, 0.5, -1), lookAhead: 20 },// Dramatic nose camera
    { position: new Vector3(0, 8, 0.1), lookAhead: 2 },  // Top-down view
  ],

  // Special maneuvers timing
  BARREL_ROLL_DURATION: 1.0  // Duration of barrel roll animation in seconds
}

// Weapon system configuration
const PROJECTILE_CONFIG = {
  // Projectile behavior
  SPEED: 200,             // Projectile velocity
  LIFETIME: 4.0,          // How long projectiles exist before despawning
  SCALE: 0.15,           // Visual size of projectiles
  FIRE_RATE: 0.1,        // Delay between shots (10 per second)
  SEND_RATE: 1/15,       // Network update frequency (15 per second)

  // Impact effect parameters
  IMPACT_PARTICLES: 20,   // Number of particles in explosion
  IMPACT_SPEED_MIN: 5,    // Minimum particle velocity
  IMPACT_SPEED_MAX: 15,   // Maximum particle velocity
  IMPACT_LIFETIME: 1.0,   // How long impact effects last
  IMPACT_SCALE: 0.15     // Size of impact particles
}

// Network synchronization settings
const MOVEMENT_CONFIG = {
  POSITION_LERP_ALPHA: 0.3,  // Position interpolation speed
  ROTATION_LERP_ALPHA: 0.4,  // Rotation interpolation speed
  PREDICTION_STEPS: 2,       // Client-side prediction steps
  UPDATE_RATE: 1/30         // Network update frequency (30 per second)
}

// Get reference to aircraft model
const jet = app.get('Rigidbody')

// Server-side game logic
if (world.isServer) {
  // Handle player connection events
  app.on('request', playerId => {
    app.send('playerId', playerId)
  })
  
  // Synchronize movement data
  app.on('move', (rotation, speed, position, networkId) => {
    app.send('move', rotation, speed, position, networkId)
  })

  // Handle player disconnection
  app.on('release', playerId => {
    app.send('playerId', null)
  })

  // Initialize projectile management system
  const projectiles = new Map()
  let nextProjectileId = 0
  let lastUpdate = 0
  
  // Process projectile firing requests
  app.on('projectile:fire', (data, sender) => {
    const [positionArray, forwardArray, jetSpeed] = data
    const id = nextProjectileId++
    
    // Calculate projectile spawn position offset from aircraft nose
    const spawnX = positionArray[0] + forwardArray[0] * 2
    const spawnY = positionArray[1] + forwardArray[1] * 2
    const spawnZ = positionArray[2] + forwardArray[2] * 2
    
    // Create new projectile with velocity relative to aircraft speed
    const projectile = {
      id,
      position: new Vector3(spawnX, spawnY, spawnZ),
      velocity: new Vector3(
        forwardArray[0] * (PROJECTILE_CONFIG.SPEED + jetSpeed),
        forwardArray[1] * (PROJECTILE_CONFIG.SPEED + jetSpeed),
        forwardArray[2] * (PROJECTILE_CONFIG.SPEED + jetSpeed)
      ),
      timeAlive: 0
    }
    
    projectiles.set(id, projectile)
    app.send('projectile:spawn', [id, [spawnX, spawnY, spawnZ], PROJECTILE_CONFIG.SCALE])
  })
  
  // Main projectile update loop
  app.on('update', (delta) => {
    lastUpdate += delta
    
    // Update each active projectile
    for (const [id, projectile] of projectiles.entries()) {
      // Apply velocity to position
      projectile.position.x += projectile.velocity.x * delta
      projectile.position.y += projectile.velocity.y * delta
      projectile.position.z += projectile.velocity.z * delta
      
      // Check for collisions using raycasting
      const direction = projectile.velocity.clone().normalize()
      const hit = world.raycast(projectile.position, direction, PROJECTILE_CONFIG.SPEED * delta)
      if (hit) {
        projectiles.delete(id)
        app.send('projectile:hit', [id, hit.point.toArray(), projectile.velocity.toArray()])
        continue
      }
      
      // Remove expired projectiles
      projectile.timeAlive += delta
      if (projectile.timeAlive >= PROJECTILE_CONFIG.LIFETIME) {
        projectiles.delete(id)
        app.send('projectile:cleanup', [id])
        continue
      }
    }
    
    // Broadcast position updates at configured rate
    if (lastUpdate >= PROJECTILE_CONFIG.SEND_RATE) {
      for (const projectile of projectiles.values()) {
        app.send('projectile:position', [
          projectile.id,
          projectile.position.toArray()
        ])
      }
      lastUpdate = 0
    }
  })
}

// Client-side game logic
if (world.isClient) {
  const player = world.getPlayer()
  
  // Move aircraft to world space for independent movement
  world.add(jet)
  app.remove(jet)
  
  // Set initial spawn position and rotation
  jet.position.copy(FLIGHT_CONFIG.SPAWN_POSITION)
  jet.rotation.x = FLIGHT_CONFIG.SPAWN_ROTATION.x
  jet.rotation.y = FLIGHT_CONFIG.SPAWN_ROTATION.y
  jet.rotation.z = FLIGHT_CONFIG.SPAWN_ROTATION.z
  
  // Set up cockpit anchor point
  const cockpit = app.create('anchor', { id: 'cockpit' })
  cockpit.position.y = 0.4
  cockpit.position.z = 0.35
  jet.add(cockpit)

  // Create interaction trigger for entering aircraft
  const action = app.create('action')
  action.position.y = 2
  action.label = 'Enter Jet'
  jet.add(action)

  // Initialize flight control variables
  let control
  let currentSpeed = 0
  let pitch = 0
  let roll = 0
  let currentCameraPosition = new Vector3()
  let currentCameraAngle = 0
  let lastUpdateTime = 0
  let lastSentState = null
  let predictedPosition = new Vector3()
  let targetPosition = new Vector3()
  let targetRotation = new Vector3()
  
  // Initialize weapon system
  const projectileTemplate = app.get('Cube')
  projectileTemplate.visible = false
  projectileTemplate.scale.set(0.1, 0.1, 0.3)
  
  let lastFireTime = 0
  const projectiles = new Map()
  
  // Handle aircraft entry request
  action.onTrigger = () => {
    action.active = false
    app.send('request', player.networkId)
  }

  // Handles player entry into the aircraft, setting up controls and camera
  function enterJet() {
    if (control) return
    control = app.control()
    
    // Play entry animation
    control.setEffect({
      anchor: cockpit,
      emote: props.enterEmote?.url,
      cancellable: false
    })
    
    // Capture input controls
    control.mouseLeft.capture = true
    control.keyW.capture = true
    control.keyS.capture = true
    control.keyA.capture = true
    control.keyD.capture = true
    control.keyQ.capture = true
    control.shiftLeft.capture = true
    control.keyC.capture = true
    control.camera.write = true
    
    // Initialize camera position
    currentCameraPosition = jet.position.clone().add(
      new Vector3(0, 2, 6).applyQuaternion(jet.quaternion)
    )
    control.camera.position.copy(currentCameraPosition)
    
    app.on('update', updateFlight)
  }

  // Handles player exit from aircraft, cleaning up controls and resetting state
  function exitJet() {
    if (!control) return
    app.off('update', updateFlight)
    control.release()
    control = null
    action.active = true
    currentSpeed = 0
    pitch = 0
    roll = 0
    app.send('release', player.networkId)
  }

  // Main flight update loop handling physics, controls and camera
  function updateFlight(delta) {
    if (!control) return

    // Process thrust input
    if (control.keyW.down) {
      currentSpeed = Math.min(currentSpeed + FLIGHT_CONFIG.THRUST_SPEED * delta, FLIGHT_CONFIG.MAX_SPEED)
    } else if (control.keyS.down) {
      currentSpeed = Math.max(currentSpeed - FLIGHT_CONFIG.THRUST_SPEED * delta, FLIGHT_CONFIG.MIN_SPEED)
    }

    // Process mouse input for pitch and yaw
    const mouseDelta = control.pointer.delta
    pitch += -mouseDelta.y * FLIGHT_CONFIG.PITCH_SPEED * delta * 0.3
    jet.rotation.y += -mouseDelta.x * FLIGHT_CONFIG.TURN_SPEED * delta * 0.3
    
    // Process roll input with shift modifier
    const rollMultiplier = control.shiftLeft.down ? 3.0 : 1.0
    
    if (control.keyA.down) {
      if (control.shiftLeft.down) {
        roll += FLIGHT_CONFIG.ROLL_SPEED * rollMultiplier * delta
      } else {
        roll = Math.min(roll + FLIGHT_CONFIG.ROLL_SPEED * delta, Math.PI / 4)
      }
    } else if (control.keyD.down) {
      if (control.shiftLeft.down) {
        roll -= FLIGHT_CONFIG.ROLL_SPEED * rollMultiplier * delta
      } else {
        roll = Math.max(roll - FLIGHT_CONFIG.ROLL_SPEED * delta, -Math.PI / 4)
      }
    } else {
      // Auto-level roll when no input
      roll = ((roll % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      if (roll > Math.PI) roll -= 2 * Math.PI
      
      const dampingFactor = Math.abs(roll) < 0.1 ? 0.8 : 0.95
      roll *= dampingFactor
    }
    
    // Normalize rotation angles
    roll = ((roll % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    if (roll > Math.PI) roll -= 2 * Math.PI
    jet.rotation.y = ((jet.rotation.y + Math.PI) % (2 * Math.PI)) - Math.PI
    
    // Apply rotations
    jet.rotation.x = pitch
    jet.rotation.z = roll
    
    // Update position with prediction
    const forward = new Vector3(0, 0, -1).applyQuaternion(jet.quaternion)
    predictedPosition.copy(jet.position)
    predictedPosition.addScaledVector(forward, currentSpeed * delta * MOVEMENT_CONFIG.PREDICTION_STEPS)

    // Smooth position updates
    jet.position.lerp(predictedPosition, MOVEMENT_CONFIG.POSITION_LERP_ALPHA)

    // Handle exit request
    if (control.keyQ.pressed) {
      exitJet()
      return
    }

    // Send network updates at configured rate
    const now = Date.now() / 1000
    if (now - lastUpdateTime >= MOVEMENT_CONFIG.UPDATE_RATE) {
      const currentState = {
        rotation: { x: jet.rotation.x, y: jet.rotation.y, z: jet.rotation.z },
        position: jet.position.toArray(),
        speed: currentSpeed
      }

      // Only send significant state changes
      if (!lastSentState || 
          Math.abs(currentState.speed - lastSentState.speed) > 0.1 ||
          !vectorsEqual(currentState.position, lastSentState.position, 0.1) ||
          !vectorsEqual(currentState.rotation, lastSentState.rotation, 0.01)) {
        
        app.send('move', 
          currentState.rotation,
          currentState.speed,
          currentState.position,
          player.networkId
        )
        
        lastSentState = currentState
      }
      
      lastUpdateTime = now
    }

    // Handle camera view switching
    if (control.keyC.pressed) {
      currentCameraAngle = (currentCameraAngle + 1) % FLIGHT_CONFIG.CAMERA_ANGLES.length
    }

    // Update camera position and orientation
    const cameraPreset = FLIGHT_CONFIG.CAMERA_ANGLES[currentCameraAngle]
    const targetPosition = jet.position.clone().add(
      cameraPreset.position.clone().applyQuaternion(jet.quaternion)
    )

    currentCameraPosition.lerp(targetPosition, FLIGHT_CONFIG.CAMERA_DAMPING)
    control.camera.position.copy(currentCameraPosition)

    const lookAtPosition = jet.position.clone().add(
      forward.clone().multiplyScalar(cameraPreset.lookAhead)
    )
    
    const lookDirection = lookAtPosition.clone().sub(currentCameraPosition).normalize()
    control.camera.quaternion.setFromRotationMatrix(
      new Matrix4().lookAt(
        new Vector3(0, 0, 0),
        lookDirection,
        new Vector3(0, 1, 0)
      )
    )

    // Handle weapon firing
    if (control.mouseLeft.down) {
      const currentTime = Date.now() / 1000
      if (currentTime - lastFireTime >= PROJECTILE_CONFIG.FIRE_RATE) {
        const forward = new Vector3(0, 0, -1).applyQuaternion(jet.quaternion)
        app.send('projectile:fire', [jet.position.toArray(), forward.toArray(), currentSpeed])
        lastFireTime = currentTime
      }
    }
    
    // Update projectile positions
    for (const projectile of projectiles.values()) {
      const object = projectile.object
      
      if (object && projectile.position) {
        if (!projectile.lastPosition) {
          object.position.set(projectile.position[0], projectile.position[1], projectile.position[2])
          projectile.lastPosition = [...projectile.position]
        } else {
          if (!projectile.velocity) {
            projectile.velocity = [
              (projectile.position[0] - projectile.lastPosition[0]) / PROJECTILE_CONFIG.SEND_RATE,
              (projectile.position[1] - projectile.lastPosition[1]) / PROJECTILE_CONFIG.SEND_RATE,
              (projectile.position[2] - projectile.lastPosition[2]) / PROJECTILE_CONFIG.SEND_RATE
            ]
          }
          
          object.position.x += projectile.velocity[0] * delta
          object.position.y += projectile.velocity[1] * delta
          object.position.z += projectile.velocity[2] * delta
          
          if (projectile.needsVelocityUpdate) {
            const errorX = projectile.position[0] - object.position.x
            const errorY = projectile.position[1] - object.position.y
            const errorZ = projectile.position[2] - object.position.z
            
            const correction = 0.3
            object.position.x += errorX * correction
            object.position.y += errorY * correction
            object.position.z += errorZ * correction
            
            projectile.velocity = [
              (projectile.position[0] - projectile.lastPosition[0]) / PROJECTILE_CONFIG.SEND_RATE,
              (projectile.position[1] - projectile.lastPosition[1]) / PROJECTILE_CONFIG.SEND_RATE,
              (projectile.position[2] - projectile.lastPosition[2]) / PROJECTILE_CONFIG.SEND_RATE
            ]
            
            projectile.needsVelocityUpdate = false
          }
        }
      }
    }
  }

  // Handle network events
  app.on('playerId', playerId => {
    action.active = !playerId
    if (playerId === player.networkId) {
      enterJet()
    }
  })

  // Synchronize other players' movement
  app.on('move', (rotation, speed, position, networkId) => {
    if (networkId === player.networkId) return
    
    targetPosition.set(position[0], position[1], position[2])
    targetRotation.set(rotation.x, rotation.y, rotation.z)
    
    jet.position.lerp(targetPosition, MOVEMENT_CONFIG.POSITION_LERP_ALPHA)
    jet.rotation.x = lerpAngle(jet.rotation.x, targetRotation.x, MOVEMENT_CONFIG.ROTATION_LERP_ALPHA)
    jet.rotation.y = lerpAngle(jet.rotation.y, targetRotation.y, MOVEMENT_CONFIG.ROTATION_LERP_ALPHA)
    jet.rotation.z = lerpAngle(jet.rotation.z, targetRotation.z, MOVEMENT_CONFIG.ROTATION_LERP_ALPHA)
  })

  // Handle projectile network events
  app.on('projectile:position', (data) => {
    const [id, posArray] = data
    const projectile = projectiles.get(id)
    if (projectile) {
      if (projectile.position) {
        projectile.lastPosition = [...projectile.position]
      }
      projectile.position = posArray
      projectile.needsVelocityUpdate = true
    }
  })
  
  // Create new projectile instances
  app.on('projectile:spawn', (data) => {
    const [id, posArray, scale] = data
    
    const bullet = projectileTemplate.clone(true)
    bullet.visible = true
    bullet.position.set(posArray[0], posArray[1], posArray[2])
    bullet.scale.set(scale, scale, scale)
    
    projectiles.set(id, {
      object: bullet,
      position: posArray,
      lastPosition: null,
      velocity: null,
      needsVelocityUpdate: false
    })
    
    world.add(bullet)
  })
  
  // Creates a particle effect explosion at the impact point of a projectile
  // Uses velocity of the projectile to influence particle direction
  function createExplosion(position, velocity) {
    for (let i = 0; i < PROJECTILE_CONFIG.IMPACT_PARTICLES; i++) {
      const particle = projectileTemplate.clone(true)
      particle.visible = true
      particle.position.set(position[0], position[1], position[2])
      
      const scale = PROJECTILE_CONFIG.IMPACT_SCALE * (0.5 + num(0, 1, 2))
      particle.scale.set(scale, scale, scale)
      
      const speed = PROJECTILE_CONFIG.IMPACT_SPEED_MIN + num(0, 1, 2) * (PROJECTILE_CONFIG.IMPACT_SPEED_MAX - PROJECTILE_CONFIG.IMPACT_SPEED_MIN)
      const theta = num(0, 1, 2) * Math.PI * 2
      const phi = num(0, 0.7, 2)
      
      particle.velocity = new Vector3(
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.cos(phi) + speed * 0.5,
        speed * Math.sin(phi) * Math.sin(theta)
      )
      
      // Add some of the projectile's velocity to the particles
      particle.velocity.x += velocity[0] * 0.3
      particle.velocity.z += velocity[2] * 0.3
      
      particle.lifetime = 0
      world.add(particle)
      
      const updateFunc = (delta) => {
        particle.position.x += particle.velocity.x * delta
        particle.position.y += particle.velocity.y * delta
        particle.position.z += particle.velocity.z * delta
        
        particle.velocity.y -= 9.8 * delta
        
        particle.lifetime += delta
        if (particle.lifetime >= PROJECTILE_CONFIG.IMPACT_LIFETIME) {
          world.remove(particle)
          app.off('update', updateFunc)
        } else {
          const progress = particle.lifetime / PROJECTILE_CONFIG.IMPACT_LIFETIME
          particle.opacity = 1 - progress
          const currentScale = scale * (1 - progress * 0.5)
          particle.scale.set(currentScale, currentScale, currentScale)
        }
      }
      
      app.on('update', updateFunc)
    }
  }

  // Handle network events for projectile cleanup
  app.on('projectile:cleanup', (data) => {
    const [id] = data
    const projectile = projectiles.get(id)
    if (projectile) {
      world.remove(projectile.object)
      projectiles.delete(id)
    }
  })

  // Handle network events for projectile impacts
  app.on('projectile:hit', (data) => {
    const [id, posArray, velocityArray] = data
    const projectile = projectiles.get(id)
    if (projectile) {
      createExplosion(posArray, velocityArray)
      world.remove(projectile.object)
      projectiles.delete(id)
    }
  })
}

// Compares two vectors (either arrays or objects) for approximate equality within a threshold
// Used for network state comparison to determine if updates need to be sent
function vectorsEqual(a, b, threshold) {
  if (Array.isArray(a)) {
    return Math.abs(a[0] - b[0]) < threshold &&
           Math.abs(a[1] - b[1]) < threshold &&
           Math.abs(a[2] - b[2]) < threshold
  }
  return Math.abs(a.x - b.x) < threshold &&
         Math.abs(a.y - b.y) < threshold &&
         Math.abs(a.z - b.z) < threshold
}

// Interpolates between two angles in radians, taking the shortest path around the circle
// Used for smooth rotation transitions in aircraft movement
function lerpAngle(start, end, alpha) {
  start = ((start + Math.PI) % (2 * Math.PI)) - Math.PI
  end = ((end + Math.PI) % (2 * Math.PI)) - Math.PI
  
  let delta = end - start
  if (delta > Math.PI) delta -= 2 * Math.PI
  if (delta < -Math.PI) delta += 2 * Math.PI
  
  return start + delta * alpha
} 