// Launch Party by Shiffty
// The ultimate virtual throwing experience! Launch Party lets you toss 
// water balloons with realistic physics and satisfying splash effects.
// Perfect for adding playful interactions to any metaverse gathering -
// because sometimes you just need to throw stuff!

// This is free and unencumbered software released into the public domain.
//
// Anyone is free to copy, modify, publish, use, compile, sell, or
// distribute this software, either in source code form or as a compiled
// binary, for any purpose, commercial or non-commercial, and by any
// means.
//
// In jurisdictions that recognize copyright laws, the author or authors
// of this software dedicate any and all copyright interest in the
// software to the public domain. We make this dedication for the benefit
// of the public at large and to the detriment of our heirs and
// successors. We intend this dedication to be an overt act of
// relinquishment in perpetuity of all present and future rights to this
// software under copyright law.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
// OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.
//
// For more information, please refer to <https://unlicense.org/>

app.configure([
    {
        key: 'emote',
        type: 'file',
        kind: 'emote',
        label: 'Emote'
    }
    ])
    
    // Core game settings
    const SEND_RATE = 1/15 // How often network updates are sent (15 times per second)
    
    // Physics settings
    let PHYSICS_SCALING = 1.0 // Overall physics simulation speed multiplier  
    let GRAVITY = -9.8 // Downward force on projectiles
    let AIR_RESISTANCE = 0.3 // How quickly projectiles slow down in the air
    let PROJECTILE_MASS = 4.0 // Heavier projectiles are less affected by air resistance
    let THROW_COOLDOWN = 0.1 // Time between throws
    
    // Projectile settings  
    let LAUNCH_SPEED = 90 // Initial throw speed
    let PROJECTILE_LIFETIME = 5.0 // How long projectiles exist before despawning
    let PROJECTILE_SCALE = 0.1 // Size of the water balloon
    
    // Where projectiles spawn relative to the player
    const PROJECTILE_SPAWN_OFFSET = { x: -0.28, y: 1.6, z: 0.6 }
    
    // Impact effect settings
    let IMPACT_PARTICLES = 128 // Number of water droplets on impact
    let IMPACT_MIN_SPEED = 2 // Slowest particle speed  
    let IMPACT_MAX_SPEED = 16 // Fastest particle speed
    let IMPACT_MIN_SCALE = 0.01 // Smallest particle size
    let IMPACT_MAX_SCALE = 0.05 // Largest particle size
    let IMPACT_LIFETIME = 1.0 // How long particles last
    let IMPACT_CONE_ANGLE = 75 // How wide particles spread out
    
    // Large splash effect settings
    let SPLASH_PARTICLES = 4 // Number of large splash elements
    let SPLASH_SCALE = 0.06 // Size of splash elements
    let SPLASH_SPEED = 4 // How fast splash elements move
    let SPLASH_LIFETIME = 0.8 // How long splash elements last
    
    // 2D splash sprite settings
    let SPLASH_SPRITE_SCALE = 0.4 // Size of the splash sprite
    let SPLASH_SPRITE_LIFETIME = 0.0 // How long the sprite lasts
    
    // Animation timing
    let THROW_ANIMATION_DURATION = 1.2 // Length of throw animation
    let THROW_DELAY = 0.6 // Delay before projectile appears
    
    // Reference the 3D models we'll use
    const projectileTemplate = app.get('ProjectileTemplate') 
    const particleTemplate = app.get('WaterParticle')
    const splashSpriteTemplate = app.get('WaterSplashSprite')
    projectileTemplate.visible = false
    particleTemplate.visible = false
    splashSpriteTemplate.visible = false
    
    // Client-Side Logic
    if (world.isClient) {
        const projectiles = new Map()  // Stores active projectiles
        let lastThrowTime = 0  // Used for throw cooldown
        let pendingThrow = null  // Track pending throw data
        let projectilesEquipped = false  // Track if projectiles are equipped
    
        // Game Controls
        const control = app.control()
        // Primary controls - Left mouse click and F key    
        control.mouseLeft.onRelease = throwProjectile
        // Get forward vector once to work around issue of first throw not being in the correct direction.
        const forward = new Vector3(0, 0, -1).applyQuaternion(control.camera.quaternion)
        
        // Add P key to toggle projectiles on/off
        control.keyP.capture = true
        control.keyP.onPress = () => {
            projectilesEquipped = !projectilesEquipped
            app.send('player:status', projectilesEquipped ? 'equipped' : 'unequipped')
        }
        
        // Helper function for throwing
        function throwProjectile() {
            // Only throw if projectiles are equipped
            if (!projectilesEquipped) 
                return
                
            if (!control.pointer.locked)
                return
            
            const currentTime = Date.now() / 1000
            if (currentTime - lastThrowTime >= THROW_COOLDOWN) {           
                // Only store the start time initially
                pendingThrow = {
                    startTime: currentTime
                }
    
                // Add throwing animation effect
                control.setEffect({
                    emote: props.emote?.url,
                    turn: true,
                    duration: THROW_ANIMATION_DURATION,
                    cancellable: false
                })
    
                lastThrowTime = currentTime
            }
        }
    
        app.on('update', (delta) => {
            // Check for pending throw
            if (pendingThrow) {
                const currentTime = Date.now() / 1000
                if (currentTime - pendingThrow.startTime >= THROW_DELAY) {
                    const player = world.getPlayer()
                    // Calculate forward vector at actual throw time
                    const forward = new Vector3(0, 0, -1).applyQuaternion(control.camera.quaternion)
                    app.send('projectile:fire', [player.position.toArray(), forward.toArray()])
                    pendingThrow = null
                }
            }
    
            // Update projectile positions and rotations
            for (const projectile of projectiles.values()) {
                projectile.position.update(delta)            
            }
        })
    
        // Handle projectile spawning and updates
        app.on('projectile:spawn', (data) => {
            const [id, posArray, scale] = data
                    
            const projectile = projectileTemplate.clone(true)
            projectile.visible = true
            projectile.position.set(posArray[0], posArray[1], posArray[2])
            projectile.scale.set(scale, scale, scale)
            
            console.log('Projectile created at:', projectile.position.toArray())
                    
            projectiles.set(id, {
                object: projectile,
                position: new LerpVector3(projectile.position, SEND_RATE)
            })
            
            world.add(projectile)
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
            const [id, posArray, velocityArray] = data
            const projectile = projectiles.get(id)
            if (projectile) {
                // Create impact particles
                createImpactEffect(posArray, velocityArray)
                
                // Remove the projectile
                world.remove(projectile.object)
                projectiles.delete(id)
            }
        })
    
        function createImpactEffect(position, incomingVelocity) {
            // Create splash sprite
            const splashSprite = splashSpriteTemplate.clone(true)
            splashSprite.visible = true
            // Adjust Y position up by half the sprite scale to avoid ground clipping
            splashSprite.position.set(position[0], position[1] + SPLASH_SPRITE_SCALE/2, position[2])
            
            // Set scale
            const scale = SPLASH_SPRITE_SCALE
            splashSprite.scale.set(scale, scale, scale)
            
            // Face the sprite towards the camera
            const camera = control.camera
            const dx = camera.position.x - splashSprite.position.x
            const dz = camera.position.z - splashSprite.position.z
            const dy = camera.position.y - splashSprite.position.y
            
            const rotY = Math.atan2(dx, dz)
            const dist = Math.sqrt(dx * dx + dz * dz)
            const rotX = Math.atan2(dy, dist)
            
            // Start with 90 degree X rotation to make it vertical, then apply camera-facing rotation
            splashSprite.rotation.set(rotX + Math.PI/2, rotY, 0)
            
            world.add(splashSprite)
            
            // Update splash sprite animation
            let lifetime = 0
            const updateSplash = (delta) => {
                lifetime += delta
                if (lifetime >= SPLASH_SPRITE_LIFETIME) {
                    world.remove(splashSprite)
                    app.off('update', updateSplash)
                } else {
                    // Only fade out, no scale change
                    const progress = lifetime / SPLASH_SPRITE_LIFETIME
                    splashSprite.opacity = 1 - progress
                }
            }
            
            app.on('update', updateSplash)
    
            // Create large splash particles
            for (let i = 0; i < SPLASH_PARTICLES; i++) {
                const splash = particleTemplate.clone(true)
                splash.visible = true
                splash.position.set(position[0], position[1], position[2])
                
                // Set large scale for splash
                splash.scale.set(SPLASH_SCALE, SPLASH_SCALE, SPLASH_SCALE)
                
                // Slightly randomized upward velocity for splash
                const theta = num(0, 1, 2) * Math.PI * 2
                splash.velocity = new Vector3(
                    SPLASH_SPEED * Math.cos(theta) * 0.3,
                    SPLASH_SPEED,
                    SPLASH_SPEED * Math.sin(theta) * 0.3
                )
                
                splash.lifetime = 0
                splash.maxLifetime = SPLASH_LIFETIME
                
                world.add(splash)
                
                // Update splash position and velocity
                const updateFunc = (delta) => {
                    splash.position.x += splash.velocity.x * delta
                    splash.position.y += splash.velocity.y * delta
                    splash.position.z += splash.velocity.z * delta
                    
                    splash.velocity.y += GRAVITY * delta
                    
                    splash.lifetime += delta
                    if (splash.lifetime >= splash.maxLifetime) {
                        world.remove(splash)
                        app.off('update', updateFunc)
                    } else {
                        splash.opacity = 1 - (splash.lifetime / splash.maxLifetime)
                        // Scale up slightly as it fades
                        const scale = SPLASH_SCALE * (1 + splash.lifetime / splash.maxLifetime * 0.5)
                        splash.scale.set(scale, scale, scale)
                    }
                }
                
                app.on('update', updateFunc)
            }
    
            // Original spray particles continue as before
            for (let i = 0; i < IMPACT_PARTICLES; i++) {
                const particle = particleTemplate.clone(true)
                particle.visible = true
                
                // Set initial position
                particle.position.set(position[0], position[1], position[2])
                
                // Random scale - calculate this first since speed depends on it
                const scale = IMPACT_MIN_SCALE + num(0, 1, 2) * (IMPACT_MAX_SCALE - IMPACT_MIN_SCALE)
                particle.scale.set(scale, scale, scale)
                
                // Calculate scale factor (0-1) where 0 is smallest and 1 is largest
                const scaleFactor = (scale - IMPACT_MIN_SCALE) / (IMPACT_MAX_SCALE - IMPACT_MIN_SCALE)
                // Invert scale factor so smaller particles get higher speeds
                const speedFactor = 1 - scaleFactor
                
                // Calculate particle velocity - faster for smaller particles
                const speed = IMPACT_MIN_SPEED + speedFactor * (IMPACT_MAX_SPEED - IMPACT_MIN_SPEED)
                
                // Rest of the particle setup remains the same
                const coneRad = (IMPACT_CONE_ANGLE * Math.PI) / 180
                const theta = num(0, 1, 2) * Math.PI * 2
                const phi = num(0, 1, 2) * (coneRad / 2)
                
                const vx = speed * Math.sin(phi) * Math.cos(theta)
                const vy = speed * Math.cos(phi)
                const vz = speed * Math.sin(phi) * Math.sin(theta)
                
                particle.velocity = new Vector3(vx, vy, vz)
                
                // Add lifetime and opacity properties
                particle.lifetime = 0
                particle.maxLifetime = IMPACT_LIFETIME * (0.8 + num(0, 1, 2) * 0.4) // Vary lifetime slightly
                
                world.add(particle)
                
                // Update particle
                const updateFunc = (delta) => {
                    // Update position
                    particle.position.x += particle.velocity.x * delta
                    particle.position.y += particle.velocity.y * delta
                    particle.position.z += particle.velocity.z * delta
                    
                    // Apply gravity
                    particle.velocity.y += GRAVITY * delta
                    
                    // Update lifetime and opacity
                    particle.lifetime += delta
                    if (particle.lifetime >= particle.maxLifetime) {
                        world.remove(particle)
                        app.off('update', updateFunc)
                    } else {
                        // Fade out
                        particle.opacity = 1 - (particle.lifetime / particle.maxLifetime)
                    }
                }
                
                app.on('update', updateFunc)
            }
        }
    }
    
    // Server-Side Logic
    if (world.isServer) {
        // Track game state on the server
        const projectiles = new Map()
        let nextProjectileId = 0
    
        // Update the forward direction calculation
        function getForwardDirection(rotationArray) {
            // Camera rotation comes in as [x, y, z, order] in radians
            const [rotX, rotY] = rotationArray  // We only need X and Y rotation
            
            // Calculate direction vector
            const direction = {
                x: -Math.sin(rotY) * Math.cos(rotX),
                y: Math.sin(rotX),
                z: Math.cos(rotY) * Math.cos(rotX)
            }
            
            // Normalize the direction vector
            const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z)
            direction.x /= length
            direction.y /= length
            direction.z /= length
            
            return direction
        }
    
        // Handle projectile creation and launching
        app.on('projectile:fire', (data, sender) => {
            const [positionArray, forwardArray] = data
            fireProjectile(positionArray, forwardArray, sender)
        })
    
        // Handle projectile creation and launching
        function fireProjectile(positionArray, forwardArray, sender) {
            const id = nextProjectileId++
            
            // Forward vector is already normalized and in world space
            const velocityX = LAUNCH_SPEED * forwardArray[0]
            const velocityY = LAUNCH_SPEED * forwardArray[1]
            const velocityZ = LAUNCH_SPEED * forwardArray[2]
            
            // Calculate right vector using cross product of forward and up vectors
            const rightX = forwardArray[2]  // Cross product with (0,1,0)
            const rightZ = -forwardArray[0] // Cross product with (0,1,0)
            
            // Calculate spawn position using both forward and right vectors
            const spawnX = positionArray[0] + (PROJECTILE_SPAWN_OFFSET.z * forwardArray[0]) + (PROJECTILE_SPAWN_OFFSET.x * rightX)
            const spawnY = positionArray[1] + PROJECTILE_SPAWN_OFFSET.y
            const spawnZ = positionArray[2] + (PROJECTILE_SPAWN_OFFSET.z * forwardArray[2]) + (PROJECTILE_SPAWN_OFFSET.x * rightZ)
            
            const projectile = {
                id,
                position: new Vector3(spawnX, spawnY, spawnZ),
                velocity: { x: velocityX, y: velocityY, z: velocityZ },
                timeAlive: 0,
                mass: PROJECTILE_MASS
            }
            
            projectiles.set(id, projectile)
            app.send('projectile:spawn', [id, [spawnX, spawnY, spawnZ], PROJECTILE_SCALE])
        }
    
        let lastUpdate = 0
        
        // Physics Update Loop
        // Update projectile positions and handle collisions
        app.on('update', (delta) => {
            lastUpdate += delta
            
            // Increase physics scaling for more responsive movement
            const scaledDelta = delta * PHYSICS_SCALING
            
            // Update each projectile's position and check for cleanup
            for (const [id, projectile] of projectiles.entries()) {
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
                
                // Update velocity due to gravity
                projectile.velocity.y += GRAVITY * scaledDelta
                
                // Update position based on velocity (if no collision)
                projectile.position.x += projectile.velocity.x * scaledDelta
                projectile.position.y += projectile.velocity.y * scaledDelta
                projectile.position.z += projectile.velocity.z * scaledDelta
    
                // Check for collisions before updating position
                const currentPos = projectile.position.clone()
                const nextPos = currentPos.clone().add({
                    x: projectile.velocity.x * scaledDelta,
                    y: projectile.velocity.y * scaledDelta,
                    z: projectile.velocity.z * scaledDelta
                })
                
                const direction = nextPos.clone().sub(currentPos).normalize()
                const distance = currentPos.distanceTo(nextPos)
    
                // Replace the single raycast with multiple smaller raycasts
                const steps = 4  // Number of sub-steps to check
                const stepDistance = distance / steps
    
                for (let i = 0; i < steps; i++) {
                    const stepStart = currentPos.clone().add({
                        x: direction.x * stepDistance * i,
                        y: direction.y * stepDistance * i,
                        z: direction.z * stepDistance * i
                    })
                    
                    const hit = world.raycast(stepStart, direction, stepDistance)
                    if (hit) {
                        projectiles.delete(id)
                        app.send('projectile:cleanup', [
                            id, 
                            hit.point.toArray(),
                            [projectile.velocity.x, projectile.velocity.y, projectile.velocity.z]
                        ])
                        return true
                    }
                }
                
                // Update lifetime and check for cleanup
                projectile.timeAlive += delta
                if (projectile.timeAlive >= PROJECTILE_LIFETIME) {
                    console.log('Cleaning up projectile:', id)
                    projectiles.delete(id)
                    app.send('projectile:cleanup', [
                        id,
                        projectile.position.toArray(),
                        [projectile.velocity.x, projectile.velocity.y, projectile.velocity.z]
                    ])
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
    } 