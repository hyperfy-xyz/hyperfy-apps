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

// Add image configuration at the top with other constants
const PARTICLE_TYPES = {
    TEXT: {
        primary: ['1', '0', '1', '1', '0', '1', '0', '1', '1', '0', '1', '0'],   // Double the characters
        secondary: ['0', '1', '0', '0', '1', '0', '1', '0', '0', '1', '0', '1'], // Double the characters
        switchInterval: 10  // Reduced from 30 to 10 for faster switching
    },
    IMAGES: [  // Change from object with urls array to direct array
        'https://imgs.search.brave.com/kiX4zUZx978DwiaouTqMyEzkVAwjdo4eSZs5caZbinA/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9hc3Nl/dHMuc3RpY2twbmcu/Y29tL2ltYWdlcy81/ODQ4NmE3Mjg0OWNm/NDZhMmE5MzEzMzgu/cG5n',  // Default or null
        'https://imgs.search.brave.com/Iz3Uh9wsGfAZYbYYTEjxUch8B-CzUyQ1MfWsgQg2PaM/rs:fit:500:0:0:0/g:ce/aHR0cHM6Ly9oeXBl/cmZ5Lnh5ei9sb2dv/LWljb24uc3Zn',
        null
    ]
}

app.configure(() => [
    {
        key: 'audio',
        type: 'file',
        kind: 'audio',
        label: 'Audio'
    },
    {
        key: 'particleType',
        type: 'dropdown',
        label: 'Particle Type',
        options: [
            { label: 'Text Only', value: 'text' },
            { label: 'Images Only', value: 'images' },
            { label: 'Mixed (Text & Images)', value: 'mixed' }
        ],
        initial: 'text'
    },
    // Add section for particle images
    {
        type: 'section',
        key: 'particleImageSection',
        label: 'Particle Images'
    },
    // Image 1 controls
    {
        key: 'particleImage1',
        type: 'file',
        kind: 'image',
        label: 'Particle Image 1 Upload'
    },
    {
        type: 'text',
        key: 'particleImageUrl1',
        label: 'Particle Image 1 URL',
        placeholder: 'Enter image URL',
        initial: ''  // Add initial value
    },
    // Image 2 controls
    {
        key: 'particleImage2',
        type: 'file',
        kind: 'image',
        label: 'Particle Image 2 Upload'
    },
    {
        type: 'text',
        key: 'particleImageUrl2',
        label: 'Particle Image 2 URL',
        placeholder: 'Enter image URL',
        initial: ''
    },
    // Image 3 controls
    {
        key: 'particleImage3',
        type: 'file',
        kind: 'image',
        label: 'Particle Image 3 Upload'
    },
    {
        type: 'text',
        key: 'particleImageUrl3',
        label: 'Particle Image 3 URL',
        placeholder: 'Enter image URL',
        initial: ''
    },
    {
        key: 'imageRatio',
        type: 'number',
        label: 'Image Spawn Ratio',
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.1,
        visible: (props) => props.particleType === 'mixed'
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
        max: 50.0,
        step: 0.5
    },
    {
        key: 'scaleY',
        type: 'number',
        label: 'Scale Y',
        default: 1.0,
        min: 0.5,
        max: 50.0,
        step: 0.5
    },
    {
        key: 'scaleZ',
        type: 'number',
        label: 'Scale Z',
        default: 2.0,
        min: 0.5,
        max: 50.0,
        step: 0.5
    },
    {
        key: 'orbitalSpeed',
        type: 'number',
        label: 'Orbital Speed',
        default: 5,    // Default to middle speed
        min: 1,        // Slowest
        max: 10,       // Fastest
        step: 1        // Whole numbers only
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
        
        const newScale = Number(scale)
        console.log('Setting X scale to:', newScale)
        
        // Force complete reinitialize with new scale
        if (particleEffect) {
            particleEffect.stop()
            particleEffect = createParticleEffect(
                { x: 0, y: 3, z: 0 },
                { 
                    x: newScale,
                    y: props.scaleY || 1.0,
                    z: props.scaleZ || 2.0
                },
                Number(props.particleCount) || 50
            )
        }
    })
    
    app.on('prop:scaleY', (scale) => {
        if (!particleEffect || !particleEffect.system) return
        
        const newScale = Number(scale)
        console.log('Setting Y scale to:', newScale)
        
        // Force complete reinitialize with new scale
        if (particleEffect) {
            particleEffect.stop()
            particleEffect = createParticleEffect(
                { x: 0, y: 3, z: 0 },
                { 
                    x: props.scaleX || 2.0,
                    y: newScale,
                    z: props.scaleZ || 2.0
                },
                Number(props.particleCount) || 50
            )
        }
    })
    
    app.on('prop:scaleZ', (scale) => {
        if (!particleEffect || !particleEffect.system) return
        
        const newScale = Number(scale)
        console.log('Setting Z scale to:', newScale)
        
        // Force complete reinitialize with new scale
        if (particleEffect) {
            particleEffect.stop()
            particleEffect = createParticleEffect(
                { x: 0, y: 3, z: 0 },
                { 
                    x: props.scaleX || 2.0,
                    y: props.scaleY || 1.0,
                    z: newScale
                },
                Number(props.particleCount) || 50
            )
        }
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

    // File upload handlers
    app.on('prop:particleImage1', (file) => {
        if (file?.url) {
            PARTICLE_TYPES.IMAGES[0] = file.url
            console.log('Updated particle image 1 from upload:', file.url)
        }
    })

    app.on('prop:particleImage2', (file) => {
        if (file?.url) {
            PARTICLE_TYPES.IMAGES[1] = file.url
            console.log('Updated particle image 2 from upload:', file.url)
        }
    })

    app.on('prop:particleImage3', (file) => {
        if (file?.url) {
            PARTICLE_TYPES.IMAGES[2] = file.url
            console.log('Updated particle image 3 from upload:', file.url)
        }
    })

    // URL input handlers
    app.on('prop:particleImageUrl1', (url) => {
        if (url && url.trim()) {
            const trimmedUrl = url.trim()
            console.log('Setting image URL 1:', trimmedUrl)
            
            // Update the array directly
            PARTICLE_TYPES.IMAGES = [
                trimmedUrl,  // New URL in slot 1
                PARTICLE_TYPES.IMAGES[1],  // Keep existing URL in slot 2
                PARTICLE_TYPES.IMAGES[2]   // Keep existing URL in slot 3
            ]
            
            console.log('Updated PARTICLE_TYPES.IMAGES:', PARTICLE_TYPES.IMAGES)
            
            // Force complete reinitialize
            if (particleEffect) {
                particleEffect.stop()
            }
            initParticleEffect()
        }
    })

    app.on('prop:particleImageUrl2', (url) => {
        if (url && url.trim()) {
            const trimmedUrl = url.trim()
            console.log('Setting image URL 2:', trimmedUrl)
            
            // Update the array directly
            PARTICLE_TYPES.IMAGES = [
                PARTICLE_TYPES.IMAGES[0],  // Keep existing URL in slot 1
                trimmedUrl,  // New URL in slot 2
                PARTICLE_TYPES.IMAGES[2]   // Keep existing URL in slot 3
            ]
            
            console.log('Updated PARTICLE_TYPES.IMAGES:', PARTICLE_TYPES.IMAGES)
            
            // Force complete reinitialize
            if (particleEffect) {
                particleEffect.stop()
            }
            initParticleEffect()
        }
    })

    app.on('prop:particleImageUrl3', (url) => {
        if (url && url.trim()) {
            const trimmedUrl = url.trim()
            console.log('Setting image URL 3:', trimmedUrl)
            
            // Update the array directly
            PARTICLE_TYPES.IMAGES = [
                PARTICLE_TYPES.IMAGES[0],  // Keep existing URL in slot 1
                PARTICLE_TYPES.IMAGES[1],  // Keep existing URL in slot 2
                trimmedUrl   // New URL in slot 3
            ]
            
            console.log('Updated PARTICLE_TYPES.IMAGES:', PARTICLE_TYPES.IMAGES)
            
            // Force complete reinitialize
            if (particleEffect) {
                particleEffect.stop()
            }
            initParticleEffect()
        }
    })

    // Add this with your other app.on handlers in the client section
    app.on('prop:particleType', (type) => {
        console.log('Particle type changed to:', type)
        // Reinitialize particle effect with new type
        if (particleEffect) {
            particleEffect.stop()
        }
        initParticleEffect()
    })

    // Add the orbital speed handler
    app.on('prop:orbitalSpeed', (speed) => {
        if (!particleEffect || !particleEffect.system) return
        
        // Convert 1-10 scale to actual speed values (0.001 to 0.05)
        const actualSpeed = 0.001 + (Number(speed) - 1) * (0.05 - 0.001) / 9
        particleEffect.system.setOrbitalSpeed(actualSpeed)
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
        orbitalSpeed: 0.001 + (Number(props.orbitalSpeed || 5) - 1) * (0.05 - 0.001) / 9,
        
        random() {
            this.seed = (this.seed * 16807) % 2147483647
            return (this.seed - 1) / 2147483646
        },

        createTextParticle(container, size) {
            const chars = PARTICLE_TYPES.TEXT[this.random() < 0.3 ? 'primary' : 'secondary']
            const text = app.create('uitext', {
                value: chars[Math.floor(this.random() * chars.length)],
                fontSize: size * 0.6,  // Reduced from 0.8 to 0.6 for more density
                color: MATRIX_GREEN,
                textAlign: 'center',
                padding: 0,
                fontFamily: 'monospace'
            })
            container.add(text)
            container.text = text
            container.charSet = chars
            container.nextSwitch = PARTICLE_TYPES.TEXT.switchInterval
        },

        createParticle(forceFlung = false) {
            try {
                const container = app.create('ui', {
                    width: 12 * this.scale.x,
                    height: 12 * this.scale.y,
                    backgroundColor: 'rgba(0,0,0,0)',
                    padding: 0,
                    billboard: 'full'  // Add billboard property to make particles face player
                })

                const size = (this.random() < 0.3 ? 16 + this.random() * 4 : 
                            12 + this.random() * 4) * this.scale.x

                // Get valid URLs
                const availableImages = PARTICLE_TYPES.IMAGES.filter(url => url && url.length > 0)
                console.log('Available image URLs:', availableImages)

                const useImage = props.particleType === 'images' || 
                                (props.particleType === 'mixed' && this.random() < 0.5)

                console.log('Use image?', useImage, 'Type:', props.particleType)

                if (useImage && availableImages.length > 0) {
                    const imageUrl = availableImages[Math.floor(this.random() * availableImages.length)]
                    console.log('Creating image particle with URL:', imageUrl)
                    
                    // Randomize the scale between 1-2
                    const imageScale = 1 + this.random()
                    
                    // Create container with fixed size
                    const containerSize = size * imageScale
                    container.width = containerSize
                    container.height = containerSize
                    
                    const image = app.create('uiimage', {
                        src: imageUrl,
                        width: containerSize,     // Use numeric value
                        height: containerSize,    // Use numeric value
                        opacity: 1.0,
                        backgroundColor: 'transparent',
                        objectFit: 'contain',
                        pointerEvents: 'none'
                    })
                    
                    // Set initial rotation
                    container.rotation.z = this.random() * Math.PI * 2
                    
                    container.add(image)
                    container.image = image
                    container.type = 'image'
                    
                    // Increase rotation speed (was 0.2-0.5, now 0.5-1.0)
                    container.rotationSpeed = (0.5 + this.random() * 0.5) * (this.random() < 0.5 ? 1 : -1)
                } else {
                    this.createTextParticle(container, size)
                }
                
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
                
                container.velocity = {
                    angle: angle,
                    speed: this.orbitalSpeed,  // Use the configurable speed
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
                    if (!particle || (!particle.text && !particle.image)) return false
                    
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
                    
                    // Update text characters
                    if (particle.text) {
                        particle.text.color = `rgba(46, 214, 46, ${particle.life})`
                        
                        // Handle character switching
                        particle.nextSwitch--
                        if (particle.nextSwitch <= 0) {
                            particle.nextSwitch = PARTICLE_TYPES.TEXT.switchInterval
                            particle.text.value = particle.charSet[Math.floor(this.random() * particle.charSet.length)]
                        }
                    } else if (particle.image) {
                        particle.image.opacity = 1.0
                        // Increase rotation speed multiplier (was 0.02, now 0.05)
                        particle.rotation.z += particle.rotationSpeed * 0.05
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
            console.log('Adjusting particle count from', this.maxParticles, 'to', newCount)
            this.maxParticles = newCount
            
            // Force immediate particle creation/removal
            const currentLength = this.particles.length
            
            if (currentLength > newCount) {
                // Remove excess particles
                const removeCount = currentLength - newCount
                console.log('Removing', removeCount, 'particles')
                for (let i = 0; i < removeCount; i++) {
                    const particle = this.particles.pop()
                    if (particle) {
                        app.remove(particle)
                    }
                }
            } else if (currentLength < newCount) {
                // Add new particles
                const addCount = newCount - currentLength
                console.log('Adding', addCount, 'new particles')
                for (let i = 0; i < addCount; i++) {
                    const newParticle = this.createParticle()
                    if (newParticle) {
                        this.particles.push(newParticle)
                    }
                }
            }
            
            console.log('Final particle count:', this.particles.length)
        },

        // Add setter method
        setOrbitalSpeed(speed) {
            this.orbitalSpeed = speed
            // Update existing particles
            this.particles.forEach(particle => {
                if (particle.velocity) {
                    particle.velocity.speed = speed
                }
            })
        },
    }

    // Initialize particles
    while (particleSystem.particles.length < particleSystem.maxParticles) {
        const particle = particleSystem.createParticle()
        if (particle) {
            particleSystem.particles.push(particle)
        }
    }

    // Create update handler
    const updateHandler = app.on('update', () => {
        particleSystem.update()
    })

    // Return both system and cleanup method
    return {
        system: particleSystem,
        stop: () => {
            app.off('update', updateHandler)
            particleSystem.particles.forEach(particle => app.remove(particle))
            particleSystem.particles = []
        }
    }
}
