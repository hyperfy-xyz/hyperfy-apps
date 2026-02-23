// Get the sprite template and hide it
const particleTemplate = app.get('Particle')
if (!particleTemplate) {
    console.error('Could not find particle template')
    return
}
particleTemplate.visible = false

// Configuration for the particle system
const CONFIG = {
    MAX_PARTICLES: 400,
    SPAWN_RATE: 60, // particles per second
    LIFETIME: 2.0,
    MIN_SPEED: 2.0,
    MAX_SPEED: 4.0,
    MIN_SCALE: 0.2,
    MAX_SCALE: 0.3,
    SPAWN_RADIUS: 1.0,
    GRAVITY: -4,
    BURST_INTERVAL: 2.0,
    PARTICLES_PER_BURST: 256
}

if (world.isClient) {
    // Particle pool tracking
    const particles = []
    const inactiveIndices = []
    let timeSinceLastBurst = 0

    const control = app.control()

    // Initialize particle pool
    for (let i = 0; i < CONFIG.MAX_PARTICLES; i++) {
        const particle = particleTemplate.clone(true)
        particle.visible = false
                
        // Add metadata to particle
        particle.velocity = new Vector3()
        particle.lifetime = 0
        particle.active = false
        
        particles.push(particle)
        inactiveIndices.push(i)
        app.add(particle)
    }

    // Get an available particle from the pool
    function getParticle() {
        if (inactiveIndices.length === 0) return null
        const index = inactiveIndices.pop()
        return particles[index]
    }

    // Spawn a new particle
    function spawnParticle() {
        const particle = getParticle()
        if (!particle) return
        
        // Random position within spawn radius
        const angle = num(0, 1, 2) * Math.PI * 2
        const radius = num(0, 1, 2) * CONFIG.SPAWN_RADIUS
        particle.position.set(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
        )
        
        // Random velocity in all directions
        const speed = CONFIG.MIN_SPEED + num(0, 1, 2) * (CONFIG.MAX_SPEED - CONFIG.MIN_SPEED)
        const phi = num(0, 1, 2) * Math.PI * 2    // Horizontal angle
        const theta = num(0, 1, 2) * Math.PI      // Vertical angle
        particle.velocity.set(
            speed * Math.sin(theta) * Math.cos(phi),
            speed * Math.cos(theta),
            speed * Math.sin(theta) * Math.sin(phi)
        )
        
        // Random scale
        const scale = CONFIG.MIN_SCALE + num(0, 1, 2) * (CONFIG.MAX_SCALE - CONFIG.MIN_SCALE)
        particle.scale.set(scale, scale, scale)
        
        particle.lifetime = 0
        particle.visible = true
        particle.active = true
    }

    app.on('update', (delta) => {
        // Spawn burst of particles
        timeSinceLastBurst += delta
        if (timeSinceLastBurst >= CONFIG.BURST_INTERVAL) {
            timeSinceLastBurst = 0
            for (let i = 0; i < CONFIG.PARTICLES_PER_BURST; i++) {
                spawnParticle()
            }
        }
        
        // Update active particles
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i]
            if (!particle.active) continue
            
            // Update position based on velocity
            particle.position.x += particle.velocity.x * delta
            particle.position.y += particle.velocity.y * delta
            particle.position.z += particle.velocity.z * delta
            
            // Apply gravity
            particle.velocity.y += CONFIG.GRAVITY * delta

            // Manually rotate to face camera
            const dx = control.camera.position.x - particle.position.x
            const dz = control.camera.position.z - particle.position.z
            const dy = control.camera.position.y - particle.position.y
            
            const rotY = Math.atan2(dx, dz)
            const dist = Math.sqrt(dx * dx + dz * dz)
            const rotX = -Math.atan2(dy, dist)
            particle.rotation.set(0, rotY, 0)
            
            // Update lifetime and check for despawn
            particle.lifetime += delta
            if (particle.lifetime >= CONFIG.LIFETIME) {
                particle.visible = false
                particle.active = false
                inactiveIndices.push(i)
            } else {
                // Fade out based on lifetime
                const alpha = 1 - (particle.lifetime / CONFIG.LIFETIME)
                particle.opacity = alpha
            }
        }
    })
} 