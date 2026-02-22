// Add these ASCII frames near the top of the file
const particleFrames = [
    `┌── PARTICLE CONTROL ──┐
│ ▓▒░ BINARY RAIN ░▒▓ │
│  ╔═══╗  1▒0░1░0   │
│  ║ 1 ║═►0▒1░0░    │
│  ╚═0═╝  1░0▒1░    │
└───────────────────┘`,
    `┌── PARTICLE CONTROL ──┐
│ ▓▒░ BINARY RAIN ░▒▓ │
│  ╔═══╗  0░1▒0░1   │
│  ║ 0 ║═►1░0▒1░    │
│  ╚═1═╝  0▒1░0░    │
└───────────────────┘`,
    `┌── PARTICLE CONTROL ──┐
│ ▓▒░ BINARY RAIN ░▒▓ │
│  ╔═══╗  1░0░1▒0   │
│  ║ 1 ║═►0░1░0▒    │
│  ╚═0═╝  1░0░1▒    │
└───────────────────┘`
];

const FALLOUT_AMBER = '#ffb347'  // Classic Fallout terminal color
const MATRIX_GREEN = '#2ed62e'    // Digital rain green color

// Add spinning lightning bolt frames at the top with our other constants
const LIGHTNING_FRAMES = ['⚡', '↯', '⚡', '↯']  // Alternative: ['⚡', '⟁', '↯', '⭍']

// Add these animation frames near the top with other constants
const HYPERFY_FRAMES = [
    'HYPERFY',
    'HYPERFy',
    'HYPERfY',
    'HYPErFY',
    'HYPeRFY',
    'HYpERFY',
    'HyPERFY',
    'hYPERFY'
]

app.configure([
    {
        key: 'audio',
        type: 'file',
        kind: 'audio',
        label: 'Audio'
    },
    {
        key: 'particleCount',
        type: 'number',
        label: 'Particle Count',
        default: 50,
        min: 10,
        max: 400,
        step: 10
    },
    {
        key: 'scaleX',
        type: 'number',
        label: 'Scale X',
        default: 2.0,
        min: 0.5,
        max: 5.0,
        step: 0.5
    },
    {
        key: 'scaleY',
        type: 'number',
        label: 'Scale Y',
        default: 1.0,
        min: 0.5,
        max: 5.0,
        step: 0.5
    },
    {
        key: 'scaleZ',
        type: 'number',
        label: 'Scale Z',
        default: 2.0,
        min: 0.5,
        max: 5.0,
        step: 0.5
    }
])

if (world.isClient) {
    // UI Setup
    const ui = app.create('ui')
    ui.width = 400
    ui.height = 150  // Increased height for ASCII art
    ui.backgroundColor = 'rgba(0, 0, 0, 0.85)'
    ui.position.set(0, 3, 8)
    ui.billboard = 'full'
    ui.justifyContent = 'center'
    ui.alignItems = 'center'
    ui.padding = 15
    ui.border = `2px solid rgba(255, 179, 71, 0.3)` // Amber with transparency
    
    // Title with terminal styling
    const titleText = app.create('uitext', {
        value: '╔══ DOGE INDUSTRIES ══╗\n HYPERFY  v2.1  \n╚════════════════════╝',
        fontSize: 14,
        color: FALLOUT_AMBER,
        textAlign: 'center',
        fontFamily: 'monospace',
        marginBottom: 10,
        whiteSpace: 'pre-line'
    })
    ui.add(titleText)
    
    // ASCII Animation Display
    const asciiDisplay = app.create('uitext', {
        value: particleFrames[0],
        color: FALLOUT_AMBER,
        fontSize: 12,
        fontFamily: 'monospace',
        whiteSpace: 'pre',
        textAlign: 'center',
        marginBottom: 15
    })
    ui.add(asciiDisplay)
    
    // Status text
    const statusText = app.create('uitext', {
        value: 'WELCOME TO WEST WORLD',
        color: FALLOUT_AMBER,
        fontSize: 14,
        fontFamily: 'monospace',
        marginBottom: 10
    })
    ui.add(statusText)

    let particleEffect = null
    
    const initParticleEffect = () => {
        if (particleEffect) {
            particleEffect.stop()
        }
        
        particleEffect = createParticleEffect(
            { x: 0, y: 3, z: 0 }, 
            { 
                x: props.scaleX || 2.0,
                y: props.scaleY || 1.0,
                z: props.scaleZ || 2.0
            },
            Number(props.particleCount) || 50
        )
    }
    
    initParticleEffect()
    
    // Update particle count listener
    app.on('prop:particleCount', (count) => {
        if (!particleEffect || !particleEffect.system) {
            console.log('No particle effect found, reinitializing...')
            initParticleEffect()
            return
        }
        
        const numCount = Number(count)
        console.log('Attempting to update particle count to:', numCount)
        
        // Call the method directly on the system
        particleEffect.system.setParticleCount(numCount)
    })
    
    // Individual scale listeners
    app.on('prop:scaleX', (scale) => {
        if (!particleEffect || !particleEffect.system) return
        const currentScale = particleEffect.system.scale
        particleEffect.system.setScale({
            ...currentScale,
            x: Number(scale)
        })
    })
    
    app.on('prop:scaleY', (scale) => {
        if (!particleEffect || !particleEffect.system) return
        const currentScale = particleEffect.system.scale
        particleEffect.system.setScale({
            ...currentScale,
            y: Number(scale)
        })
    })
    
    app.on('prop:scaleZ', (scale) => {
        if (!particleEffect || !particleEffect.system) return
        const currentScale = particleEffect.system.scale
        particleEffect.system.setScale({
            ...currentScale,
            z: Number(scale)
        })
    })

    // Action button
    const action = app.create('action')
    action.label = 'Interact'
    action.position.set(0, .2, 8)

    action.onTrigger = () => {
        audio.play()
        // Reset particle effect if needed
        if (!particleEffect) {
            initParticleEffect()
        }
    }

    // Listen for UI updates
    app.on('uitext:update', (text) => {
        label.value = text
    })

    app.on('action:update', (text) => {
        action.label = text
    })

    app.add(action)
    app.add(ui)

    // Track connected players
    let playerCount = 1  // Start at 1 to include current user

    // Listen for player join/leave events
    world.on('playerJoin', (player) => {
        if (!player.isLocal) {  // Only increment for other players
            playerCount++
        }
    })

    world.on('playerLeave', (player) => {
        if (!player.isLocal) {  // Only decrement for other players
            playerCount = Math.max(1, playerCount - 1)  // Never go below 1
        }
    })

    // Initialize player count on connection
    world.on('ready', () => {
        // Count other connected players plus self
        const otherPlayers = world.players.filter(p => p.connected && !p.isLocal).length
        playerCount = otherPlayers + 1
    })

    // Update the status text in the update loop
    app.on('update', () => {
        try {
            frameCount++
            
            // Update ASCII animation every few frames
            if (frameCount % 30 === 0) {
                const frameIndex = Math.floor(frameCount / 30) % particleFrames.length
                asciiDisplay.value = particleFrames[frameIndex]
            }
            
            // Update HYPERFY animation
            if (frameCount % 15 === 0) {
                const hyperfyFrame = HYPERFY_FRAMES[Math.floor(frameCount / 15) % HYPERFY_FRAMES.length]
                titleText.value = `╔══ DOGE INDUSTRIES ══╗\n ${hyperfyFrame}  v2.1  \n╚════════════════════╝`
            }
            
            // Update status with player count
            if (frameCount % 60 === 0 && particleEffect?.system) {
                const count = particleEffect.system.particles.length
                const lightningFrame = LIGHTNING_FRAMES[Math.floor(frameCount / 15) % LIGHTNING_FRAMES.length]
                
                statusText.value = `    WELCOME TO WEST WORLD${lightningFrame}\n 
                    PARTICLES: ${count}\n
                    PLAYERS: ${playerCount}`
            }
            
        } catch (err) {
            console.error('Error in update loop:', err)
        }
    })
}

const audio = app.create('audio', {
	src: props.audio?.url,
	volume: props.volume || 3,
	group: props.audioType || 'music',
	spatial: true
})

app.add(audio)

let frameCount = 0

function createParticleEffect(
    position = { x: 0, y: 3, z: -1 }, 
    scale = { x: 2.0, y: 1.0, z: 2.0 },
    particleCount = 30
) {
    const particleSystem = {
        particles: [],
        maxParticles: particleCount,
        seed: 1,
        position: position,
        scale: scale,
        
        random() {
            this.seed = (this.seed * 16807) % 2147483647
            return (this.seed - 1) / 2147483646
        },
        
        chars: {
            primary: ['1', '0'],
            secondary: ['1', '0'],
            flung: ['1', '0']
        },
        
        createParticle(forceFlung = false) {
            try {
                const container = app.create('ui', {
                    width: 12 * this.scale.x,
                    height: 12 * this.scale.y,
                    backgroundColor: 'rgba(0,0,0,0)',
                    padding: 0
                })
                
                const type = this.random() < 0.3 ? 'primary' : 'secondary'
                const size = (type === 'primary' ? 8 + this.random() * 2 : 
                            6 + this.random() * 2) * this.scale.x
                
                const text = app.create('uitext', {
                    value: this.chars[type][Math.floor(this.random() * 2)],
                    fontSize: size,
                    color: MATRIX_GREEN,
                    textAlign: 'center',
                    padding: 0,
                    fontFamily: 'monospace'
                })
                
                if (!text) {
                    console.error('Failed to create text element')
                    return null
                }
                
                container.add(text)
                
                const radius = {
                    x: (1.0 + this.random() * 0.2) * this.scale.x,
                    z: (1.0 + this.random() * 0.2) * this.scale.z
                }
                
                const angle = this.random() * Math.PI * 2
                
                container.position.set(
                    Math.cos(angle) * radius.x + this.position.x,
                    this.position.y + (this.random() * 2 * this.scale.y),
                    Math.sin(angle) * radius.z + this.position.z
                )
                
                container.life = 1.0
                container.decay = 0.005
                container.text = text
                
                container.velocity = {
                    angle: angle,
                    speed: 0.005,
                    radius: radius,
                    verticalSpeed: -0.01 * this.scale.y
                }
                
                app.add(container)
                return container
            } catch (err) {
                console.error('Error creating particle:', err)
                return null
            }
        },
        
        update() {
            if (frameCount % 4 !== 0) return
            
            this.particles = this.particles.filter(particle => {
                try {
                    if (!particle || !particle.text) return false
                    
                    particle.life -= particle.decay
                    
                    if (particle.life <= 0) {
                        app.remove(particle)
                        return false
                    }
                    
                    particle.velocity.angle += particle.velocity.speed
                    particle.position.y += particle.velocity.verticalSpeed
                    
                    if (particle.position.y < this.position.y - 2) {
                        particle.position.y = this.position.y + 2
                        particle.life = 1.0
                    }
                    
                    particle.position.x = Math.cos(particle.velocity.angle) * particle.velocity.radius.x + this.position.x
                    particle.position.z = Math.sin(particle.velocity.angle) * particle.velocity.radius.z + this.position.z
                    
                    if (particle.text) {
                        particle.text.color = `rgba(46, 214, 46, ${particle.life})`
                    }
                    
                    return true
                } catch (err) {
                    console.error('Error updating particle:', err)
                    return false
                }
            })
            
            // Modified particle creation logic
            if (this.particles.length < this.maxParticles && this.random() < 0.3) {  // Increased spawn chance
                const newParticle = this.createParticle()
                if (newParticle) {
                    this.particles.push(newParticle)
                }
            }
        },

        setScale(newScale) {
            this.scale = {
                x: newScale.x ?? this.scale.x,
                y: newScale.y ?? this.scale.y,
                z: newScale.z ?? this.scale.z
            }
        },

        setPosition(newPosition) {
            this.position = newPosition
        },

        updateTransform(newPosition, newScale) {
            this.setPosition(newPosition)
            this.setScale(newScale)
        },

        // Add method to change particle count
        setParticleCount(count) {
            const newCount = Math.min(400, Math.max(10, Number(count)))
            console.log(`Adjusting particle count from ${this.maxParticles} to ${newCount}`)
            this.maxParticles = newCount
            
            // Force immediate particle creation/removal
            const currentLength = this.particles.length
            
            if (currentLength > newCount) {
                // Remove excess particles
                const removeCount = currentLength - newCount
                console.log(`Removing ${removeCount} particles`)
                for (let i = 0; i < removeCount; i++) {
                    const particle = this.particles.pop()
                    if (particle) {
                        app.remove(particle)
                    }
                }
            } else if (currentLength < newCount) {
                // Add new particles
                const addCount = newCount - currentLength
                console.log(`Adding ${addCount} new particles`)
                for (let i = 0; i < addCount; i++) {
                    const newParticle = this.createParticle()
                    if (newParticle) {
                        this.particles.push(newParticle)
                    }
                }
            }
            
            console.log(`Final particle count: ${this.particles.length}`)
        }
    }
    
    const updateHandler = app.on('update', () => {
        try {
            particleSystem.update()
        } catch (err) {
            console.error('Error updating particles:', err)
        }
    })

    // Return enhanced controls including particle count
    return {
        system: particleSystem,
        stop: () => {
            app.off('update', updateHandler)
            particleSystem.particles.forEach(particle => app.remove(particle))
            particleSystem.particles = []
        },
        setScale: (scale) => particleSystem.setScale(scale),
        setPosition: (pos) => particleSystem.setPosition(pos),
        updateTransform: (pos, scale) => particleSystem.updateTransform(pos, scale),
        setParticleCount: (count) => particleSystem.setParticleCount(count),
        getParticleCount: () => particleSystem.maxParticles
    }
}