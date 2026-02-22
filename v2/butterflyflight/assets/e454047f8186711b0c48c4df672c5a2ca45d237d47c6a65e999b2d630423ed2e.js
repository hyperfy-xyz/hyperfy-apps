// Core butterfly settings
const BUTTERFLY_SCALE = 0.05
const HOVER_HEIGHT = 2.0 // Height above ground
const HOVER_RANGE = 0.8 // How far up/down it moves
const HOVER_SPEED = 1.8 // Speed of up/down movement
const WANDER_RANGE = 4.0 // How far it wanders from center
const WANDER_SPEED = 0.75 // How fast it moves around
const ROTATION_SPEED = 4.0 // How fast it turns
const MIN_FLAP_SPEED = 10.0 // Minimum wing flap speed when gliding
const MAX_FLAP_SPEED = 12.0 // Maximum wing flap speed when moving fast
const VERTICAL_FLAP_INFLUENCE = 2.0 // How much vertical movement affects flap speed

// Create the butterfly
const butterfly = app.get('mama')
const wingR = app.get('wingR')
const wingL = app.get('wingL')
butterfly.position.y = HOVER_HEIGHT
butterfly.scale.set(BUTTERFLY_SCALE, BUTTERFLY_SCALE, BUTTERFLY_SCALE)

// Track movement state
const state = {
    time: 0,
    targetX: 0,
    targetZ: 0,
    lastTargetChange: 0,
    targetChangeInterval: 4, // How often to pick new target (seconds)
    lastHeight: HOVER_HEIGHT // Track previous height for vertical speed
}

// Update butterfly position and rotation
app.on('update', (dt) => {
    state.time += dt
    
    // Vertical hovering motion
    const newHeight = HOVER_HEIGHT + Math.sin(state.time * HOVER_SPEED) * HOVER_RANGE
    const verticalSpeed = (newHeight - state.lastHeight) / dt
    const upwardSpeed = Math.max(0, verticalSpeed) // Only consider upward movement
    butterfly.position.y = newHeight
    state.lastHeight = newHeight

    // Calculate movement speed
    const dx = state.targetX - butterfly.position.x
    const dz = state.targetZ - butterfly.position.z
    const speed = Math.sqrt(dx * dx + dz * dz)
    
    // Dynamic flap speed based on movement and vertical speed
    const flapSpeed = MIN_FLAP_SPEED + (speed + upwardSpeed * VERTICAL_FLAP_INFLUENCE) * (MAX_FLAP_SPEED - MIN_FLAP_SPEED) 
    const flapAngle = Math.sin(state.time * flapSpeed)

    // Apply the computed flap angle to each wing (mirrored for natural motion)
    wingR.rotation.y = flapAngle;   // Right wing rotates by the computed angle
    wingL.rotation.y = -flapAngle;    // Left wing rotates oppositely

    // Change target position periodically
    if (state.time - state.lastTargetChange > state.targetChangeInterval) {
        state.targetX = (Math.random() * 2 - 1) * WANDER_RANGE
        state.targetZ = (Math.random() * 2 - 1) * WANDER_RANGE
        state.lastTargetChange = state.time
    }
    
    // Move towards target position with smooth interpolation
    butterfly.position.x += dx * WANDER_SPEED * dt
    butterfly.position.z += dz * WANDER_SPEED * dt
    
    // Rotate to face movement direction
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
        const targetAngle = Math.atan2(dx, dz)
        let currentAngle = butterfly.rotation.y
        
        // Normalize angle difference
        let angleDiff = targetAngle - currentAngle
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
        
        // Smooth rotation
        butterfly.rotation.y += angleDiff * ROTATION_SPEED * dt
    }

    // Add slight random rotation for more natural movement
    butterfly.rotation.x = 45
}) 