app.configure([
    {
      key: 'emote',
      type: 'file',
      kind: 'emote',
      label: 'Emote'
    },
    {
      key: 'speed',
      type: 'number',
      label: 'Movement Speed',
      value: 5,
      min: 1,
      max: 10
    },
    {
      key: 'turnSpeed',
      type: 'number',
      label: 'Turning Speed',
      value: 2,
      min: 0.5,
      max: 4
    }
  ])
  
  const state = app.state
  let vehicle = null
  let rigidbody = null
  const VEHICLE_ID = 'FalloutMoto_0001'
  const DEG2RAD = Math.PI / 180
  
  // Try to find the vehicle with different possible IDs
  function findVehicle() {
    const possibleIds = [
      VEHICLE_ID,
      'FalloutMoto_0001',
      'FalloutMoto_0001MeshLOD0'
    ]
    
    for (const id of possibleIds) {
      const found = app.get(id)
      if (found) {
        console.log('Found vehicle with ID:', id)
        return found
      }
    }
    return null
  }
  
  // Initialize function to set up the vehicle
  function initVehicle() {
    console.log('Attempting to find motorcycle...')
    vehicle = findVehicle()
    
    if (!vehicle) {
      console.error('Could not find motorcycle. Will retry in 1 second...')
      setTimeout(initVehicle, 1000)
      return
    }
    
    console.log('Successfully found motorcycle, initializing...')
    // Set initial ground position
    if (vehicle && vehicle.position) {
      // Just ensure it's slightly above ground to prevent clipping
      vehicle.position.y = vehicle.position.y + 0.1
    }
    setupVehicle()
  }
  
  // Main setup function once we have the vehicle
  function setupVehicle() {
    // Set up physics properties for motorcycle
    rigidbody = vehicle
    rigidbody.type = 'dynamic'
    rigidbody.mass = 300 // Heavier for better ground stability
    rigidbody.linearDamping = 3.0 // Much higher damping to prevent sliding
    rigidbody.angularDamping = 10.0 // Increased to prevent unwanted rotation
    rigidbody.detectCollisions = true
    rigidbody.friction = 1.0 // Maximum friction to reduce sliding
    
    // Create collider for motorcycle
    const collider = app.create('collider')
    collider.type = 'box'
    collider.setSize(0.5, 0.4, 1.2) // Sized for motorcycle
    collider.position.set(0, 0.2, 0) 
    collider.friction = 0.8 // Good friction for tires
    collider.restitution = 0.1 // Some bounce for suspension feel
    collider.layer = 'prop'
    
    vehicle.add(collider)

    if (world.isServer) {
      state.y = 0
      state.position = { 
        x: vehicle.position.x, 
        y: vehicle.position.y, 
        z: vehicle.position.z 
      }
      state.lastUpdateTime = Date.now()
      vehicle.rotation.y = 0
      
      // Server update loop for consistent state broadcasts
      app.on('update', (delta) => {
        if (state.playerId) {
          // Only send updates when the vehicle has moved significantly
          const now = Date.now()
          if (now - state.lastUpdateTime > 100) { // 10 updates per second is sufficient for server
            state.lastUpdateTime = now
            state.position = {
              x: vehicle.position.x,
              y: vehicle.position.y,
              z: vehicle.position.z
            }
            state.rotation = vehicle.rotation.y
            state.velocity = {
              x: 0,
              y: 0,
              z: 0
            }
            
            // Get current velocity for state
            const velocityVec = { x: 0, y: 0, z: 0 }
            rigidbody.getLinearVelocity(velocityVec)
            state.velocity.x = velocityVec.x
            state.velocity.y = velocityVec.y
            state.velocity.z = velocityVec.z
            
            // Broadcast state to all clients
            app.send('vehicle:state', {
              position: state.position,
              rotation: state.rotation,
              velocity: state.velocity,
              timestamp: now
            })
          }
        }
      })
      
      app.on('request', playerId => {
        if (state.playerId) return
        state.playerId = playerId
        state.position = {
          x: vehicle.position.x,
          y: vehicle.position.y,
          z: vehicle.position.z
        }
        app.send('playerId', playerId)
      })
      
      app.on('rotate', y => {
        state.y = y
        vehicle.rotation.y = y
        app.send('rotate', y)
      })

      app.on('move', moveData => {
        const { velocity, rotation } = moveData
        
        if (velocity) {
          // Convert velocity to proper format
          rigidbody.setLinearVelocity({
            x: velocity.x || 0,
            y: velocity.y || 0,
            z: velocity.z || 0
          })
        }
        
        vehicle.rotation.y = rotation
        state.position = {
          x: vehicle.position.x,
          y: vehicle.position.y,
          z: vehicle.position.z
        }
        state.rotation = rotation
        
        // We'll let the regular update loop broadcast to all clients
        // instead of sending immediately for each move
      })
      
      // Handle collisions
      rigidbody.onContactStart = (contact) => {
        console.log('Collision detected with:', contact.body.id)
      }
      
      app.on('release', playerId => {
        if (state.playerId === playerId) {
          state.playerId = null
          app.send('playerId', null)
          // Stop the vehicle when dismounting
          rigidbody.setLinearVelocity({ x: 0, y: 0, z: 0 })
        }
      })
      
      world.on('leave', e => {
        if (state.playerId === e.player.networkId) {
          state.playerId = null
          app.send('playerId', null)
          // Stop the vehicle when player leaves
          rigidbody.setLinearVelocity({ x: 0, y: 0, z: 0 })
        }
      })
    }
    
    if (world.isClient) {
      const player = world.getPlayer()
      const anchor = app.create('anchor', { id: 'seat' })
      anchor.position.x = 0 // Forward/backward adjustment
      anchor.position.y = 0.5 // Height adjustment
      anchor.position.z = -.2 // Left/right adjustment
      anchor.rotation.y += 180 * DEG2RAD
      vehicle.add(anchor)
      
      const action = app.create('action')
      action.position.y = 0.9
      action.label = 'Mount'
      vehicle.add(action)
      
      let control = null
      let lastUpdate = 0
      const UPDATE_INTERVAL = 16
      const MOVEMENT_THRESHOLD = 0.0005
      // Base speeds - will be multiplied by configuration values
      const BASE_MAX_SPEED = 5
      const BASE_TURN_SPEED = 1.0
      const BANK_FACTOR = 0.12 // Banking during turns
      
      // Create reusable vectors for physics
      const forceVec = new Vector3()
      const velocityVec = new Vector3()
      const tempVec = new Vector3()
      const gravityVec = new Vector3(0, -15, 0) // Gravity for grounding
      
      // Helper function for linear interpolation
      function lerp(start, end, t) {
        return start * (1 - t) + end * t
      }

      // Define sit and stand functions first
      function sit() {
        if (control) return
        action.active = false
        control = app.control()
        control.setEffect({
          anchor,
          emote: app.config.emote?.url,
          cancellable: true,
          onEnd: stand
        })
        control.keyW.capture = true
        control.keyS.capture = true
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

      // Network interpolation variables
      const interpolation = {
        active: false,
        startTime: 0,
        duration: 0.1, // 100ms interpolation
        startPos: new Vector3(),
        targetPos: new Vector3(),
        startRot: 0,
        targetRot: 0
      }

      function update(delta) {
        let rotated = false
        let moved = false
        
        // Get configured speeds
        const speedMultiplier = app.config.speed || 5
        const turnSpeedMultiplier = app.config.turnSpeed || 2
        
        // Calculate actual speeds based on configuration
        const MAX_SPEED = BASE_MAX_SPEED * speedMultiplier
        const REVERSE_SPEED = MAX_SPEED * 0.5 // Half speed for reverse
        const TURN_SPEED = BASE_TURN_SPEED * turnSpeedMultiplier
        
        // Calculate movement vector (FALLOUTBIKE.js style)
        const moveVector = { x: 0, y: 0, z: 0 }
        
        // Get current velocity for reference
        rigidbody.getLinearVelocity(velocityVec)
        const currentSpeed = Math.sqrt(velocityVec.x * velocityVec.x + velocityVec.z * velocityVec.z)
        
        // Keep motorcycle firmly on the ground
        rigidbody.addForce(gravityVec)
        
        // FALLOUTBIKE.js style rotation - direct control with configurable speed
        if (control.keyA.down) {
          vehicle.rotation.y += TURN_SPEED * delta
          rotated = true
        }
        
        if (control.keyD.down) {
          vehicle.rotation.y -= TURN_SPEED * delta
          rotated = true
        }
        
        // FALLOUTBIKE.js style movement calculation
        if (control.keyW.down) {
          // Forward movement based on vehicle orientation - swap sin/cos
          moveVector.x = -Math.cos(vehicle.rotation.y) * MAX_SPEED
          moveVector.z = Math.sin(vehicle.rotation.y) * MAX_SPEED
          moved = true
        }
        
        if (control.keyS.down) {
          // Reverse at reduced speed - swap sin/cos
          moveVector.x = Math.cos(vehicle.rotation.y) * REVERSE_SPEED
          moveVector.z = -Math.sin(vehicle.rotation.y) * REVERSE_SPEED
          moved = true
        }
        
        // Apply physics, but with direct velocity control
        if (moved) {
          // Set velocity directly for responsive control
          velocityVec.x = moveVector.x
          velocityVec.z = moveVector.z
          
          // Maintain current Y velocity for gravity/jumping
          rigidbody.setLinearVelocity(velocityVec)
          
          // Banking effect when turning (FALLOUTBIKE.js visual feedback)
          let targetBank = 0
          if (control.keyA.down && currentSpeed > 1) {
            targetBank = BANK_FACTOR
          } else if (control.keyD.down && currentSpeed > 1) {
            targetBank = -BANK_FACTOR
          }
          
          // Smooth banking transition
          vehicle.rotation.z = lerp(vehicle.rotation.z, targetBank, 0.15)
        } else {
          // Hard stop when no keys pressed - more responsive feel
          velocityVec.x *= 0.8 // Quick deceleration
          velocityVec.z *= 0.8
          
          // If speed is very low, come to a complete stop
          if (currentSpeed < 0.5) {
            velocityVec.x = 0
            velocityVec.z = 0
          }
          
          // Update velocity with maintained Y component
          rigidbody.setLinearVelocity(velocityVec)
          
          // Return to upright position when not moving
          vehicle.rotation.z = lerp(vehicle.rotation.z, 0, 0.1)
        }

        // Handle interpolation for remote players
        if (interpolation.active && state.playerId !== player.networkId) {
          const now = Date.now() / 1000; // Convert to seconds for easier math
          const elapsed = now - interpolation.startTime;
          const t = Math.min(elapsed / interpolation.duration, 1.0);
          
          // Only interpolate if we're not the controlling player
          if (t < 1.0) {
            // Interpolate position
            tempVec.copy(interpolation.startPos).lerp(interpolation.targetPos, t);
            vehicle.position.copy(tempVec);
            
            // Interpolate rotation
            vehicle.rotation.y = lerp(interpolation.startRot, interpolation.targetRot, t);
          } else {
            // We've reached the target
            interpolation.active = false;
          }
        }

        // Send updates more frequently for controlling player
        const now = Date.now()
        if ((moved || rotated) && now - lastUpdate > 50) { // 20 updates per second when changes occur
          lastUpdate = now
          
          // Get the latest velocity after changes
          rigidbody.getLinearVelocity(velocityVec)
          
          const velocityObj = {
            x: velocityVec.x,
            y: velocityVec.y,
            z: velocityVec.z
          }
          
          app.send('move', {
            velocity: velocityObj,
            rotation: vehicle.rotation.y,
            timestamp: now
          })
        }
      }
      
      // Set up action trigger after functions are defined
      action.onTrigger = () => {
        app.send('request', player.networkId)
      }
      
      // Apply initial state
      if (state.y) {
        vehicle.rotation.y = state.y
      }
      
      if (state.position) {
        vehicle.position.set(state.position.x, state.position.y, state.position.z)
      }
      
      if (state.playerId) {
        action.active = false
      }
      
      app.on('rotate', y => {
        state.y = y
        vehicle.rotation.y = y
      })

      app.on('move', moveData => {
        const { position, rotation } = moveData
        // Only update if we're not the controlling player
        if (state.playerId !== player.networkId) {
          vehicle.position.set(position.x, position.y, position.z)
          vehicle.rotation.y = rotation
        }
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
      
      // Enhanced state handling
      app.on('vehicle:state', (stateUpdate) => {
        // Only apply state updates if we're not the driver
        if (state.playerId !== player.networkId) {
          // Set up interpolation from current to target state
          interpolation.active = true;
          interpolation.startTime = Date.now() / 1000;
          
          // Save current position as interpolation start
          interpolation.startPos.set(
            vehicle.position.x,
            vehicle.position.y,
            vehicle.position.z
          );
          
          // Save target position from state update
          interpolation.targetPos.set(
            stateUpdate.position.x,
            stateUpdate.position.y,
            stateUpdate.position.z
          );
          
          // Save rotation values
          interpolation.startRot = vehicle.rotation.y;
          interpolation.targetRot = stateUpdate.rotation;
          
          // Update state
          state.position = stateUpdate.position;
          state.rotation = stateUpdate.rotation;
          state.velocity = stateUpdate.velocity;
        }
      });
      
      // When a player first connects, request full state
      app.on('init', () => {
        app.send('requestFullState');
      });
    }
  }
  
  // Start initialization
  initVehicle()
  