// This script demonstrates how to create a physics-based projectile launcher

// Configuration Constants
// Network update rate - how often we sync positions across the network
const SEND_RATE = 1/15

// Physics configuration - these values control how the projectiles feel
let PHYSICS_SCALING = 1.0 // Makes physics run faster/slower
let GRAVITY = -9.8 // Simulates Earth-like gravity
let AIR_RESISTANCE = 0.5 // Higher values make projectiles slow down faster
let PROJECTILE_MASS = 5.0 // Affects how much air resistance impacts the projectile
let THROW_COOLDOWN = 0.1 // Prevents rapid-fire spam

// Launch parameters  
let LAUNCH_SPEED = 10 // Initial velocity (m/s)
let LAUNCH_VERTICAL_ANGLE = 15 // Launch angle in degrees
let LAUNCH_HORIZONTAL_ANGLE = 0 // Launch angle in degrees
let PROJECTILE_LIFETIME = 5.0 // Projectile lifetime in seconds

// Visual parameters
let PROJECTILE_SCALE = 0.1 // Visual scale of the projectile
let IMPACT_SCALE = 0.6 // Visual scale of the impact effect
let IMPACT_LIFETIME = 3.0 // Impact effect lifetime in seconds

// Position offsets
const PROJECTILE_SPAWN_OFFSET = { x: 0.0, y: 1.0, z: 1.0 }  // Offset for projectile spawn

const projectileLauncher = app.get('ProjectileLauncher')
const projectileTemplate = app.get('ProjectileTemplate')  // The model to clone for the projectile
const impactTemplate = app.get('ImpactTemplate')  // The model to clone for the impact effect
projectileTemplate.visible = false    // Hide the template
impactTemplate.visible = false    // Hide the template

// Add toggle action
const toggleAction = app.create('action')
toggleAction.label = 'Fire!'
toggleAction.distance = 3
toggleAction.duration = 0.5
app.add(toggleAction)

// Client-Side Logic
if (world.isClient) {
    const projectiles = new Map()  // Stores active projectiles
    const impactEffects = new Map()  // Stores splash effects
    let lastThrowTime = 0  // Used for throw cooldown

    const player = world.getPlayer()     

    // Add configuration presets
    const CONFIG_PRESETS = {
        LAUNCH_SPEED: [10, 50, 100, 200],
        LAUNCH_VERTICAL_ANGLE: [0, 15, 30, 45, 90],
        LAUNCH_HORIZONTAL_ANGLE: [-30, -15, 0, 15, 30],
        PROJECTILE_MASS: [5.0, 10.0, 20.0],
        AIR_RESISTANCE: [0.1, 0.5, 0.9],
        PROJECTILE_SCALE: [0.1, 0.3, 0.5],
        PHYSICS_SCALING: [0.5, 1.0, 1.5],
        THROW_COOLDOWN: [0.5, 0.75, 1.0, 1.25, 1.5]
    }

    // Helper function to cycle through presets
    function cyclePreset(setting) {
        const presets = CONFIG_PRESETS[setting]
        let currentValue
        
        // Get current value based on setting
        switch(setting) {
            case 'LAUNCH_SPEED': currentValue = LAUNCH_SPEED; break;
            case 'LAUNCH_VERTICAL_ANGLE': currentValue = LAUNCH_VERTICAL_ANGLE; break;
            case 'LAUNCH_HORIZONTAL_ANGLE': currentValue = LAUNCH_HORIZONTAL_ANGLE; break;
            case 'PROJECTILE_MASS': currentValue = PROJECTILE_MASS; break;
            case 'AIR_RESISTANCE': currentValue = AIR_RESISTANCE; break;
            case 'PROJECTILE_SCALE': currentValue = PROJECTILE_SCALE; break;
            case 'PHYSICS_SCALING': currentValue = PHYSICS_SCALING; break;
            case 'THROW_COOLDOWN': currentValue = THROW_COOLDOWN; break;
        }
        
        const currentIndex = presets.indexOf(currentValue)
        const nextIndex = (currentIndex + 1) % presets.length
        const newValue = presets[nextIndex]
        
        // Update server
        app.send('settings:update', [setting, newValue])
        
        // Update local value
        switch(setting) {
            case 'LAUNCH_SPEED': LAUNCH_SPEED = newValue; break;
            case 'LAUNCH_VERTICAL_ANGLE': LAUNCH_VERTICAL_ANGLE = newValue; break;
            case 'LAUNCH_HORIZONTAL_ANGLE': LAUNCH_HORIZONTAL_ANGLE = newValue; break;
            case 'PROJECTILE_MASS': PROJECTILE_MASS = newValue; break;
            case 'AIR_RESISTANCE': AIR_RESISTANCE = newValue; break;
            case 'PROJECTILE_SCALE': PROJECTILE_SCALE = newValue; break;
            case 'PHYSICS_SCALING': PHYSICS_SCALING = newValue; break;
            case 'THROW_COOLDOWN': THROW_COOLDOWN = newValue; break;
        }
        
        return newValue
    }

    // UI Setup
    const ui = app.create('ui')
    ui.width = 300
    ui.height = 300
    ui.backgroundColor = 'rgba(0, 0, 0, 0.7)'
    ui.position.set(0, 3, 0)
    ui.billboard = 'full'
    ui.justifyContent = 'center'
    ui.alignItems = 'center'
    ui.padding = 10
    ui.gap = 5

    const label = app.create('uitext', {
        padding: 4,
        textAlign: 'center',
        value: 'Fun with Projectiles!',
        color: 'white',
        fontSize: 24
    })
    ui.add(label)

    // Launch Speed
    const speedText = app.create('uitext', {
        padding: 4,
        textAlign: 'center',
        value: `Launch Speed: ${LAUNCH_SPEED}`,
        color: 'white',
        onPointerDown: () => {
            const newValue = cyclePreset('LAUNCH_SPEED')
            speedText.value = `Launch Speed: ${newValue}`
        },
        onPointerEnter: () => speedText.color = 'purple',
        onPointerLeave: () => speedText.color = 'white',
        cursor: 'pointer'
    })
    ui.add(speedText)

    // Launch Angle - Vertical
    const verticalAngleText = app.create('uitext', {
        padding: 4,
        textAlign: 'center',
        value: `Vertical Angle: ${LAUNCH_VERTICAL_ANGLE}`,
        color: 'white',
        onPointerDown: () => {
            const newValue = cyclePreset('LAUNCH_VERTICAL_ANGLE')
            verticalAngleText.value = `Vertical Angle: ${newValue}`
        },
        onPointerEnter: () => verticalAngleText.color = 'purple',
        onPointerLeave: () => verticalAngleText.color = 'white',
        cursor: 'pointer'
    })
    ui.add(verticalAngleText)

    // Launch Angle - Horizontal 
    const horizontalAngleText = app.create('uitext', {
        padding: 4,
        textAlign: 'center',
        value: `Horizontal Angle: ${LAUNCH_HORIZONTAL_ANGLE}`,
        color: 'white',
        onPointerDown: () => {
            const newValue = cyclePreset('LAUNCH_HORIZONTAL_ANGLE')
            horizontalAngleText.value = `Horizontal Angle: ${newValue}`
        },
        onPointerEnter: () => horizontalAngleText.color = 'purple',
        onPointerLeave: () => horizontalAngleText.color = 'white',
        cursor: 'pointer'
    })
    ui.add(horizontalAngleText)

    // Mass
    const massText = app.create('uitext', {
        padding: 4,
        textAlign: 'center',
        value: `Mass: ${PROJECTILE_MASS}`,
        color: 'white',
        onPointerDown: () => {
            const newValue = cyclePreset('PROJECTILE_MASS')
            massText.value = `Mass: ${newValue}`
        },
        onPointerEnter: () => massText.color = 'purple',
        onPointerLeave: () => massText.color = 'white',
        cursor: 'pointer'
    })
    ui.add(massText)

    // Air Resistance
    const airText = app.create('uitext', {
        padding: 4,
        textAlign: 'center',
        value: `Air Resistance: ${AIR_RESISTANCE}`,
        color: 'white',
        onPointerDown: () => {
            const newValue = cyclePreset('AIR_RESISTANCE')
            airText.value = `Air Resistance: ${newValue}`
        },
        onPointerEnter: () => airText.color = 'purple',
        onPointerLeave: () => airText.color = 'white',
        cursor: 'pointer'
    })
    ui.add(airText)

    // Scale
    const scaleText = app.create('uitext', {
        padding: 4,
        textAlign: 'center',
        value: `Scale: ${PROJECTILE_SCALE}`,
        color: 'white',
        onPointerDown: () => {
            const newValue = cyclePreset('PROJECTILE_SCALE')
            scaleText.value = `Scale: ${newValue}`
        },
        onPointerEnter: () => scaleText.color = 'purple',
        onPointerLeave: () => scaleText.color = 'white',
        cursor: 'pointer'
    })
    ui.add(scaleText)

    // Physics Scaling
    const physicsText = app.create('uitext', {
        padding: 4,
        textAlign: 'center',
        value: `Physics Scale: ${PHYSICS_SCALING}`,
        color: 'white',
        onPointerDown: () => {
            const newValue = cyclePreset('PHYSICS_SCALING')
            physicsText.value = `Physics Scale: ${newValue}`
        },
        onPointerEnter: () => physicsText.color = 'purple',
        onPointerLeave: () => physicsText.color = 'white',
        cursor: 'pointer'
    })
    ui.add(physicsText)

    app.on('update', (delta) => {
        // Update projectile positions and rotations
        for (const projectile of projectiles.values()) {
            projectile.position.update(delta)            
        }

        // Update and cleanup impact effects
        for (const [effect, data] of impactEffects.entries()) {
            data.timeAlive += delta
            if (data.timeAlive >= IMPACT_LIFETIME) {
                app.remove(data.object)
                impactEffects.delete(effect)
            }
        }
    })

    // Handle projectile spawning and updates
    app.on('projectile:spawn', (data) => {
        const [id, posArray, scale] = data
        
        const projectile = projectileTemplate.clone(true)
        projectile.visible = true
        projectile.position.set(posArray[0], posArray[1], posArray[2])
        projectile.scale.set(scale, scale, scale)
                
        projectiles.set(id, {
            object: projectile,
            position: new LerpVector3(projectile.position, SEND_RATE)
        })
        
        app.add(projectile)
    })

    // Handle projectile position updates
    app.on('projectile:position', (data) => {
        const [id, posArray] = data
        const projectile = projectiles.get(id)
        if (projectile) {
            projectile.position.pushArray(posArray)
        }
    })

    // Handle projectile cleanup
    app.on('projectile:cleanup', (data) => {
        const [id, posArray] = data
        const projectile = projectiles.get(id)
        if (projectile) {
            // Spawn impact effect at projectile position
            const impactEffect = impactTemplate.clone(true)
            impactEffect.visible = true
            impactEffect.position.set(posArray[0], posArray[1], posArray[2])
            impactEffect.scale.set(IMPACT_SCALE, IMPACT_SCALE, IMPACT_SCALE)
            app.add(impactEffect)
            
            // Track the impact effect with its controller
            impactEffects.set(impactEffect, {
                object: impactEffect,
                timeAlive: 0
            })
            
            // Remove the projectile
            app.remove(projectile.object)
            projectiles.delete(id)
        }
    })
    
    app.add(ui)

    // Modify toggle handler to send player ID
    toggleAction.onTrigger = () => {
        const currentTime = Date.now() / 1000
        if (currentTime - lastThrowTime < THROW_COOLDOWN) {
            return true
        }
        
        lastThrowTime = currentTime
        
        app.send('projectile:fire', [
            projectileLauncher.position.toArray(),
            projectileLauncher.rotation.toArray()
        ])
        return true
    }
}

// Server-Side Logic
if (world.isServer) {
    // Track game state on the server
    const projectiles = new Map()
    let nextProjectileId = 0

    // Projectile Physics
    // Calculate forward direction based on player rotation
    function getForwardDirection(rotationArray) {
        const rotY = rotationArray[1]
        const horizontalRad = LAUNCH_HORIZONTAL_ANGLE * Math.PI / 180
        
        // Add debug logging
        console.log('Direction calculation:', {
            rotY,
            horizontalRad,
            totalAngle: rotY + horizontalRad,
            resultX: Math.sin(rotY + horizontalRad),
            resultZ: -Math.cos(rotY + horizontalRad)
        })
        
        return {
            x: Math.sin(rotY + horizontalRad),
            z: -Math.cos(rotY + horizontalRad)
        }
    }

    app.on('projectile:fire', (data, sender) => {
        console.log('Server received projectile:fire event')
        console.log('Raw position:', data[0])  // Log the raw position array
        const [positionArray, rotationArray] = data
        
        // Log the final spawn position before any offsets
        console.log('Final position before offsets:', {
            x: positionArray[0],
            y: positionArray[1],
            z: positionArray[2]
        })
        
        fireProjectile(positionArray, rotationArray, sender)
    })

    // Handle projectile creation and launching
    function fireProjectile(positionArray, rotationArray, sender) {
        const id = nextProjectileId++
        
        const forward = getForwardDirection(rotationArray)
        const launchVerticalRadians = LAUNCH_VERTICAL_ANGLE * Math.PI / 180
        
        // Calculate initial velocity components
        const velocityX = LAUNCH_SPEED * forward.x
        const velocityY = LAUNCH_SPEED * Math.sin(launchVerticalRadians)
        const velocityZ = LAUNCH_SPEED * forward.z
        
        // Add debug logging
        console.log('Projectile launch data:', {
            speed: LAUNCH_SPEED,
            forward,
            verticalAngle: LAUNCH_VERTICAL_ANGLE,
            velocities: { velocityX, velocityY, velocityZ }
        })
        
        // Calculate spawn point
        const spawnX = positionArray[0] + (forward.x * PROJECTILE_SPAWN_OFFSET.z)
        const spawnY = positionArray[1] + PROJECTILE_SPAWN_OFFSET.y
        const spawnZ = positionArray[2] + (forward.z * PROJECTILE_SPAWN_OFFSET.z)

        const projectile = {
            id,
            position: new Vector3(spawnX, spawnY, spawnZ),
            velocity: { x: velocityX, y: velocityY, z: velocityZ },
            timeAlive: 0,
            mass: PROJECTILE_MASS
        }
        projectiles.set(id, projectile)
        
        console.log('Spawning projectile with data:', [id, [spawnX, spawnY, spawnZ], PROJECTILE_SCALE])
        
        app.send('projectile:spawn', [id, [
            spawnX,
            spawnY,
            spawnZ
        ], PROJECTILE_SCALE])
    }

    let lastUpdate = 0
    
    // Physics Update Loop
    // Update projectile positions and handle collisions
    app.on('update', (delta) => {
        if (!world.isServer) return
        
        lastUpdate += delta
        
        // Scale delta by PHYSICS_SCALING
        const scaledDelta = Math.min(delta, 1/60) * PHYSICS_SCALING
        
        for (const [id, projectile] of projectiles.entries()) {
            // Use scaledDelta for all physics calculations
            const moveX = projectile.velocity.x * scaledDelta
            const moveY = projectile.velocity.y * scaledDelta
            const moveZ = projectile.velocity.z * scaledDelta
            
            // Update position
            projectile.position.x += moveX
            projectile.position.y += moveY
            projectile.position.z += moveZ

            // Calculate air resistance force (proportional to velocity squared and inverse to mass)
            const speed = Math.sqrt(
                projectile.velocity.x * projectile.velocity.x +
                projectile.velocity.y * projectile.velocity.y +
                projectile.velocity.z * projectile.velocity.z
            )
            const dragFactor = (AIR_RESISTANCE * speed * speed) / projectile.mass
            
            // Apply air resistance in opposite direction of velocity
            if (speed > 0) {
                projectile.velocity.x -= (dragFactor * projectile.velocity.x / speed) * scaledDelta
                projectile.velocity.y -= (dragFactor * projectile.velocity.y / speed) * scaledDelta
                projectile.velocity.z -= (dragFactor * projectile.velocity.z / speed) * scaledDelta
            }
            
            // This is the correct place to apply gravity
            projectile.velocity.y += GRAVITY * scaledDelta
            
            // Replace the raycast collision check section
            const currentPos = projectile.position.clone()
            const nextPos = currentPos.clone().add({
                x: projectile.velocity.x * scaledDelta,
                y: projectile.velocity.y * scaledDelta,
                z: projectile.velocity.z * scaledDelta
            })
            
            const direction = nextPos.clone().sub(currentPos).normalize()
            const distance = currentPos.distanceTo(nextPos)

            // Remove the minimum distance check
            const hit = world.raycast(currentPos, direction, distance)
            if (hit) {
                console.log(`Projectile ${id} collision:`, {
                    hitPoint: hit.point.toArray(),
                    hitDistance: hit.distance,
                    hitNormal: hit.normal.toArray()
                })
                
                projectiles.delete(id)
                app.send('projectile:cleanup', [id, hit.point.toArray()])
                continue
            }

            // Update position if no collision
            projectile.position.x += projectile.velocity.x * scaledDelta
            projectile.position.y += projectile.velocity.y * scaledDelta
            projectile.position.z += projectile.velocity.z * scaledDelta
            
            // Update lifetime and check for cleanup
            projectile.timeAlive += scaledDelta
            if (projectile.timeAlive >= PROJECTILE_LIFETIME) {
                console.log('Cleaning up projectile:', id)
                projectiles.delete(id)
                app.send('projectile:cleanup', [id, projectile.position.toArray()])
                continue
            }
        }

        // Send network updates at SEND_RATE
        if (lastUpdate >= SEND_RATE) {
            for (const projectile of projectiles.values()) {                
                app.send('projectile:position', [
                    projectile.id,
                    projectile.position.toArray()
                ])
            }
            lastUpdate = 0
        }
    })

    // Settings Management
    // Allow runtime modification of game parameters
    app.on('settings:update', (data) => {
        const [setting, value] = data
        switch(setting) {
            case 'LAUNCH_SPEED':
                LAUNCH_SPEED = value
                break
            case 'LAUNCH_VERTICAL_ANGLE':
                LAUNCH_VERTICAL_ANGLE = value    
                break
            case 'LAUNCH_HORIZONTAL_ANGLE':
                LAUNCH_HORIZONTAL_ANGLE = value
                break
            case 'PROJECTILE_MASS':
                PROJECTILE_MASS = value
                break
            case 'AIR_RESISTANCE':
                AIR_RESISTANCE = value
                break
            case 'PROJECTILE_SCALE':
                PROJECTILE_SCALE = value
                break
            case 'PHYSICS_SCALING':
                PHYSICS_SCALING = value
                break
            case 'THROW_COOLDOWN':
                THROW_COOLDOWN = value
                break
        }
    })
} 