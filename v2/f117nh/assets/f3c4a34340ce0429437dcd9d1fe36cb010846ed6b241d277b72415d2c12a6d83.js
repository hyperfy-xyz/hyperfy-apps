// Define configurable app properties for customization
app.configure([
    {
      key: 'enterEmote',
      type: 'file',
      kind: 'emote',
      label: 'Enter Animation'
    },
    {
      key: 'modelId',
      type: 'text',
      label: 'Aircraft Model ID',
      value: 'Mesh001'
    }
  ])
  const nighthawk = app.get('$root')
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
    SPAWN_POSITION: new Vector3(0, 11.2, 0),  // Where the jet initially spawns
    SPAWN_ROTATION: new Vector3(0, Math.PI, 0),  // Initial rotation in radians (Y rotated 180 degrees)
    
    // Camera view configuration
    CAMERA_DAMPING: 0.5,    // Smoothing factor for camera movement
    CAMERA_ANGLES: [        // Predefined camera positions and look-ahead distances
      { position: new Vector3(0, 3, 16), lookAhead: 10 },    // Default chase camera - zoomed out
      { position: new Vector3(0, 2.5, 2.5), lookAhead: 12 },  // Cockpit view - slightly raised
      { position: new Vector3(8, 5, 6), lookAhead: 8 },    // Side view - wider angle
      { position: new Vector3(5, 4, 0.5), lookAhead: 2 },    // Profile view - more distant
      { position: new Vector3(0, 4, -3), lookAhead: 25 },// Dramatic nose camera - pulled back
      { position: new Vector3(0, 12, 3), lookAhead: 5 },  // Top-down view - higher altitude
      { position: new Vector3(0, 3, -15), lookAhead: -5 },  // Front head-on view - looking at the vertibird face
      { position: new Vector3(0, 2, -5.6), lookAhead: 50 }, // True first-person pilot view - directly at cockpit position
      { position: new Vector3(10, 5, 0), lookAhead: 0, isOrbiting: true }, // Orbiting camera - circles around aircraft
    ],
  
    // Special maneuvers timing
    BARREL_ROLL_DURATION: 1.0,  // Duration of barrel roll animation in seconds
    
    // Orbiting camera settings
    ORBIT_DISTANCE: 16,        // Distance from aircraft
    ORBIT_HEIGHT: 5,           // Height relative to aircraft
    ORBIT_SPEED: 0.25          // Rotation speed in radians per second
  }
  
  // Weapon system configuration
  const PROJECTILE_CONFIG = {
    // Projectile behavior
    SPEED: 200,             // Projectile velocity
    LIFETIME: 4.0,          // How long projectiles exist before despawning
    SCALE: 0.15,           // Visual size of projectiles
    FIRE_RATE: 0.1,        // Delay between shots (10 per second)
    SEND_RATE: 1/15,       // Network update frequency (15 per second)
    SPAWN_OFFSET: 6,        // How far in front of the aircraft to spawn projectiles
  
    // Visual appearance
    COLOR: 0x00ff00,       // Bright green for plasma (hex color)
    COLOR_STRING: '#00ff00', // Same color as string for UI elements
    TRAIL_LENGTH: 3,        // Length multiplier for projectile trail
    PROJECTILE_CHAR: '━━━',  // ASCII character for projectile beam
    
    // Impact effect parameters
    IMPACT_PARTICLES: 20,   // Number of particles in explosion
    IMPACT_SPEED_MIN: 5,    // Minimum particle velocity
    IMPACT_SPEED_MAX: 15,   // Maximum particle velocity
    IMPACT_LIFETIME: 1.0,   // How long impact effects last
    IMPACT_SCALE: 0.15,     // Size of impact particles
    IMPACT_COLOR: 0x00ff88, // Green explosion for plasma impacts (hex color)
    IMPACT_COLOR_STRING: '#00ff88', // Same color as string for UI elements
    PARTICLE_CHARS: ['*', '•', '✧', '✦', '⁎', '⁕', '⚬', '○', '✺', '✹'] // ASCII chars for particles
  }
  
  // Network synchronization settings
  const MOVEMENT_CONFIG = {
    POSITION_LERP_ALPHA: 0.3,  // Position interpolation speed
    ROTATION_LERP_ALPHA: 0.4,  // Rotation interpolation speed
    PREDICTION_STEPS: 2,       // Client-side prediction steps
    UPDATE_RATE: 1/30         // Network update frequency (30 per second)
  }
  
  // Get reference to aircraft model - try multiple options for compatibility
  let jet = null
  const modelId = app.config.modelId || 'Mesh001' // Use config value or default to Mesh001

  // Try to get the model using the configured ID
  jet = app.get(modelId)
  
  // If that fails, try common alternative names
  if (!jet) {
    console.log(`Could not find model with ID "${modelId}", trying alternatives...`)
    // Try these common IDs as fallbacks
    const fallbackIds = ['Rigidbody', 'Aircraft', 'Plane', 'Vehicle', 'Model']
    for (const id of fallbackIds) {
      jet = app.get(id)
      if (jet) {
        console.log(`Found model with ID "${id}"`)
        break
      }
    }
  }
  
  // If still no model found, show error
  if (!jet) {
    console.error('ERROR: Could not find aircraft model!')
    console.error('Available model IDs:')
    app.traverse(node => {
      if (node.isObject3D) {
        console.log(`- ID: ${node.id}, Name: ${node.name}`)
      }
    })
  }

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
      const spawnX = positionArray[0] + forwardArray[0] * PROJECTILE_CONFIG.SPAWN_OFFSET
      const spawnY = positionArray[1] + forwardArray[1] * PROJECTILE_CONFIG.SPAWN_OFFSET
      const spawnZ = positionArray[2] + forwardArray[2] * PROJECTILE_CONFIG.SPAWN_OFFSET
      
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
  if (world.isClient && jet) { // Only proceed if we found the jet model
    const player = world.getPlayer()
    
    // Create a wrapper for the jet to fix model orientation
    const jetWrapper = app.create('anchor', { id: 'JetWrapper' })
    
    // Add the jet to the wrapper with 180-degree rotation
    jetWrapper.add(jet)
    jet.rotation.y = Math.PI // Rotate the model 180 degrees to fix orientation
    
    // Move aircraft to world space for independent movement
    world.add(jetWrapper)
    app.remove(jetWrapper)
    
    // Set initial spawn position and rotation
    jetWrapper.position.copy(FLIGHT_CONFIG.SPAWN_POSITION)
    jetWrapper.rotation.x = FLIGHT_CONFIG.SPAWN_ROTATION.x
    jetWrapper.rotation.y = FLIGHT_CONFIG.SPAWN_ROTATION.y
    jetWrapper.rotation.z = FLIGHT_CONFIG.SPAWN_ROTATION.z
    
    // Set up cockpit anchor point
    const cockpit = app.create('anchor', { id: 'cockpit' })
    cockpit.position.y = 0.8
    cockpit.position.z = -4.5
    jetWrapper.add(cockpit)
  
    // Create interaction trigger for entering aircraft
    const action = app.create('action')
    action.position.y = 2
    action.label = '[ PILOT VERTIBIRD ]'
    jetWrapper.add(action)
  
    // Initialize flight control variables
    let control
    let currentSpeed = 0
    let pitch = 0
    let roll = 0
    let currentCameraPosition = new Vector3()
    let currentCameraAngle = 0
    let orbitAngle = 0 // Track the current orbit angle
    let lastUpdateTime = 0
    let lastSentState = null
    let predictedPosition = new Vector3()
    let targetPosition = new Vector3()
    let targetRotation = new Vector3()
    
    // Initialize weapon system with fallback to create our own projectile template if needed
    let projectileTemplate = app.get('Cube')
    
    // If no Cube is found, create one for projectiles
    if (!projectileTemplate) {
      console.log('No Cube found for projectiles, creating a custom projectile template...')
      
      // Create a UI-based projectile template
      projectileTemplate = app.create('anchor', { id: 'ProjectileTemplate' })
      
      // Make it invisible by default 
      projectileTemplate.visible = false
    }
    
    // Configure the projectile template
    projectileTemplate.visible = false
    
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
      currentCameraPosition = jetWrapper.position.clone().add(
        new Vector3(0, 2, 6).applyQuaternion(jetWrapper.quaternion)
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
      jetWrapper.rotation.y += -mouseDelta.x * FLIGHT_CONFIG.TURN_SPEED * delta * 0.3
      
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
      jetWrapper.rotation.y = ((jetWrapper.rotation.y + Math.PI) % (2 * Math.PI)) - Math.PI
      
      // Apply rotations
      jetWrapper.rotation.x = pitch
      jetWrapper.rotation.z = roll
      
      // Update position with prediction
      const forward = new Vector3(0, 0, -1).applyQuaternion(jetWrapper.quaternion)
      predictedPosition.copy(jetWrapper.position)
      predictedPosition.addScaledVector(forward, currentSpeed * delta * MOVEMENT_CONFIG.PREDICTION_STEPS)
  
      // Smooth position updates
      jetWrapper.position.lerp(predictedPosition, MOVEMENT_CONFIG.POSITION_LERP_ALPHA)
  
      // Handle exit request
      if (control.keyQ.pressed) {
        exitJet()
        return
      }
  
      // Send network updates at configured rate
      const now = Date.now() / 1000
      if (now - lastUpdateTime >= MOVEMENT_CONFIG.UPDATE_RATE) {
        const currentState = {
          rotation: { x: jetWrapper.rotation.x, y: jetWrapper.rotation.y, z: jetWrapper.rotation.z },
          position: jetWrapper.position.toArray(),
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
      let targetPosition
      
      // Special handling for orbiting camera
      if (cameraPreset.isOrbiting) {
        // Update orbit angle based on time
        orbitAngle += FLIGHT_CONFIG.ORBIT_SPEED * delta
        
        // Calculate position in orbit around aircraft
        const orbitX = Math.cos(orbitAngle) * FLIGHT_CONFIG.ORBIT_DISTANCE
        const orbitZ = Math.sin(orbitAngle) * FLIGHT_CONFIG.ORBIT_DISTANCE
        
        // Apply rotation to orbit position based on aircraft orientation
        const orbitPosition = new Vector3(orbitX, FLIGHT_CONFIG.ORBIT_HEIGHT, orbitZ)
        orbitPosition.applyQuaternion(jetWrapper.quaternion)
        
        // Set target position relative to aircraft
        targetPosition = jetWrapper.position.clone().add(orbitPosition)
      } else {
        // Standard camera positioning for non-orbiting cameras
        targetPosition = jetWrapper.position.clone().add(
          cameraPreset.position.clone().applyQuaternion(jetWrapper.quaternion)
        )
      }
  
      currentCameraPosition.lerp(targetPosition, FLIGHT_CONFIG.CAMERA_DAMPING)
      control.camera.position.copy(currentCameraPosition)
  
      // Look target is always the aircraft for orbiting camera
      const lookAtPosition = cameraPreset.isOrbiting ? 
        jetWrapper.position.clone() :
        jetWrapper.position.clone().add(
          new Vector3(0, 0, -1).applyQuaternion(jetWrapper.quaternion).multiplyScalar(cameraPreset.lookAhead)
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
          const forward = new Vector3(0, 0, -1).applyQuaternion(jetWrapper.quaternion)
          
          // Calculate muzzle position from cockpit anchor for improved visuals
          const muzzlePosition = jetWrapper.position.clone().add(
            forward.clone().multiplyScalar(PROJECTILE_CONFIG.SPAWN_OFFSET/2)
          )
          
          app.send('projectile:fire', [muzzlePosition.toArray(), forward.toArray(), currentSpeed])
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
      
      jetWrapper.position.lerp(targetPosition, MOVEMENT_CONFIG.POSITION_LERP_ALPHA)
      jetWrapper.rotation.x = lerpAngle(jetWrapper.rotation.x, targetRotation.x, MOVEMENT_CONFIG.ROTATION_LERP_ALPHA)
      jetWrapper.rotation.y = lerpAngle(jetWrapper.rotation.y, targetRotation.y, MOVEMENT_CONFIG.ROTATION_LERP_ALPHA)
      jetWrapper.rotation.z = lerpAngle(jetWrapper.rotation.z, targetRotation.z, MOVEMENT_CONFIG.ROTATION_LERP_ALPHA)
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
      
      // Create a parent anchor for positioning
      const bullet = app.create('anchor', { id: `projectile_${id}` })
      bullet.visible = true
      bullet.position.set(posArray[0], posArray[1], posArray[2])
      
      // Create a UI element for the projectile visuals
      const bulletUI = app.create('ui')
      bulletUI.width = 100
      bulletUI.height = 30
      bulletUI.billboard = 'full'
      bulletUI.size = scale / 5
      bulletUI.backgroundColor = 'transparent'
      bullet.add(bulletUI)
      
      // Add text for the projectile
      const bulletText = app.create('uitext')
      bulletText.value = PROJECTILE_CONFIG.PROJECTILE_CHAR
      bulletText.color = PROJECTILE_CONFIG.COLOR_STRING
      bulletText.fontSize = 24
      bulletText.textAlign = 'center'
      bulletUI.add(bulletText)
      
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
      // Create a simple pseudo-random number generator
      let seed = Date.now() % 2147483647
      function randomFloat() {
        // Simple LCG (Linear Congruential Generator)
        seed = (seed * 16807) % 2147483647
        return (seed - 1) / 2147483646
      }
      
      for (let i = 0; i < PROJECTILE_CONFIG.IMPACT_PARTICLES; i++) {
        // Select a random particle character from our array
        const randomIndex = Math.floor(randomFloat() * PROJECTILE_CONFIG.PARTICLE_CHARS.length)
        const particleChar = PROJECTILE_CONFIG.PARTICLE_CHARS[randomIndex]
        
        // Create parent anchor for positioning
        const particle = app.create('anchor')
        particle.visible = true
        particle.position.set(position[0], position[1], position[2])
        
        // Create UI container
        const particleUI = app.create('ui')
        particleUI.width = 30
        particleUI.height = 30
        particleUI.billboard = 'full'
        particleUI.size = PROJECTILE_CONFIG.IMPACT_SCALE * (0.5 + randomNum(0, 1, 2)) / 5
        particleUI.backgroundColor = 'transparent'
        particle.add(particleUI)
        
        // Add text for the particle
        const particleText = app.create('uitext')
        particleText.value = particleChar
        particleText.color = PROJECTILE_CONFIG.IMPACT_COLOR_STRING
        particleText.fontSize = 24
        particleText.textAlign = 'center'
        particleUI.add(particleText)
        
        // Calculate random velocity for the particle
        const speed = PROJECTILE_CONFIG.IMPACT_SPEED_MIN + randomNum(0, 1, 2) * (PROJECTILE_CONFIG.IMPACT_SPEED_MAX - PROJECTILE_CONFIG.IMPACT_SPEED_MIN)
        const theta = randomNum(0, 1, 2) * Math.PI * 2
        const phi = randomNum(0, 0.7, 2)
        
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
        
        // Update function to animate the particle
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
            // Fade out over time - adjust opacity
            particleText.opacity = 1 - progress
          }
        }
        
        app.on('update', updateFunc)
      }
      
      // Helper function for random number generation using our custom PRNG
      function randomNum(min, max, pow = 1) {
        let rnd = randomFloat()
        if (pow !== 1) {
          rnd = Math.pow(rnd, pow)
        }
        return min + (max - min) * rnd
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
  
  // Helper function for random number generation 
  // min: minimum value
  // max: maximum value
  // pow: power factor (1 = linear, 2 = quadratic, etc.)
  function num(min, max, pow = 1) {
    // Simple deterministic pseudo-random number (using date hash)
    // This replaces the utils.random() function with something reliable
    const now = Date.now()
    const hash = (now * 9301 + 49297) % 233280
    let rnd = hash / 233280
    
    if (pow !== 1) {
      rnd = Math.pow(rnd, pow)
    }
    return min + (max - min) * rnd
  } 