const template = app.get('Cube')  // Replace 'Cube' with your node name
if (!template) {
    console.error('Could not find Cube template')
    return
}

template.visible = false  // Hide the original template

const GRID_SIZE = 100
const SPACING = 1.0  // Space between objects
const WAVE_SPEED = 1.0
const WAVE_HEIGHT = 0.5
const WAVE_FREQUENCY = 2.0
const BASE_HEIGHT = 1.0

const objects = []

app.on('update', () => {
    // Skip if objects are already created
    if (objects.length > 0) return
    
    // Create grid of objects
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let z = 0; z < GRID_SIZE; z++) {
            const obj = template.clone(true)
            obj.visible = true
            obj.scale.set(0.5, 0.5, 0.5)  // Scale down the object to half size
            
            // Calculate centered grid position
            const offsetX = (x - GRID_SIZE/2) * SPACING
            const offsetZ = (z - GRID_SIZE/2) * SPACING
            obj.position.set(offsetX, 0, offsetZ)

            objects.push({
                node: obj,
                baseY: obj.position.y,
                x: x,
                z: z
            })
            
            app.add(obj)
        }
    }
})

let patternIndex = 0
const patterns = [
    // Pattern 0: Off (flat surface)
    (obj, time) => {
        return 0
    },
    // Pattern 1: Original ripple (modified to stay above base)
    (obj, time) => {
        const distance = Math.sqrt(obj.x * obj.x + obj.z * obj.z)
        return Math.max(0, Math.sin(distance - time * WAVE_FREQUENCY))
    },
    // Pattern 2: Checkerboard
    (obj, time) => {
        return Math.max(0, Math.sin(time * WAVE_FREQUENCY + (obj.x + obj.z) * Math.PI))
    },
    // Pattern 3: Diagonal waves
    (obj, time) => {
        return Math.max(0, Math.sin(time * WAVE_FREQUENCY + (obj.x - obj.z) * 0.5))
    },
    // Pattern 4: Circular rings
    (obj, time) => {
        const distance = Math.sqrt(obj.x * obj.x + obj.z * obj.z)
        return Math.max(0, Math.sin(distance * 2 + time * WAVE_FREQUENCY))
    },
    // Pattern 5: Cross ripples
    (obj, time) => {
        return Math.max(0, Math.sin(time * WAVE_FREQUENCY + Math.abs(obj.x)) * 
               Math.sin(time * WAVE_FREQUENCY + Math.abs(obj.z)))
    },
    // Pattern 6: Spiral wave
    (obj, time) => {
        const angle = Math.atan2(obj.z, obj.x)
        const distance = Math.sqrt(obj.x * obj.x + obj.z * obj.z)
        return Math.max(0, Math.sin(distance + angle * 2 + time * WAVE_FREQUENCY))
    },
    // Pattern 7: Expanding/contracting squares
    (obj, time) => {
        const maxDist = Math.max(Math.abs(obj.x), Math.abs(obj.z))
        return Math.max(0, Math.sin(maxDist - time * WAVE_FREQUENCY))
    },
    // Pattern 8: Moving diagonal stripes
    (obj, time) => {
        return Math.max(0, Math.sin(obj.x + obj.z + time * WAVE_FREQUENCY * 2))
    },
    // Pattern 9: Rotating star
    (obj, time) => {
        const angle = Math.atan2(obj.z, obj.x)
        const distance = Math.sqrt(obj.x * obj.x + obj.z * obj.z)
        obj.node.rotation.y = time * WAVE_FREQUENCY * 0.5  // Add rotation
        return Math.max(0, Math.sin(angle * 5 + time * WAVE_FREQUENCY) * 
               Math.exp(-distance * 0.03)) * 1.5  // Reduced dampening and increased amplitude
    },
    // Pattern 10: X/Z oscillation (blocks move in X and Z directions too!)
    (obj, time) => {
        obj.node.position.x = obj.x * SPACING - GRID_SIZE/2 * SPACING + 
                             Math.sin(time * WAVE_FREQUENCY) * 0.2
        obj.node.position.z = obj.z * SPACING - GRID_SIZE/2 * SPACING + 
                             Math.cos(time * WAVE_FREQUENCY) * 0.2
        return Math.max(0, Math.sin(time * WAVE_FREQUENCY))
    },
    // Pattern 11: Diamond ripples
    (obj, time) => {
        const distance = Math.abs(obj.x) + Math.abs(obj.z)
        return Math.max(0, Math.sin(distance - time * WAVE_FREQUENCY))
    },
    // Pattern 12: Breathing grid (scale animation)
    (obj, time) => {
        const scale = 0.5 + Math.sin(time * WAVE_FREQUENCY) * 0.1
        obj.node.scale.set(scale, scale, scale)
        return Math.max(0, Math.sin(time * WAVE_FREQUENCY))
    },
    // Pattern 13: Wave collision
    (obj, time) => {
        return Math.max(0, Math.sin(obj.x - time * WAVE_FREQUENCY) + 
               Math.sin(obj.z + time * WAVE_FREQUENCY))
    },
    // Pattern 14: Rotating waves
    (obj, time) => {
        const angle = Math.atan2(obj.z, obj.x)
        return Math.max(0, Math.sin(angle + time * WAVE_FREQUENCY * 2))
    },
    // Pattern 15: Hypnotic circles
    (obj, time) => {
        const distance = Math.sqrt(obj.x * obj.x + obj.z * obj.z)
        return Math.max(0, Math.sin(distance * 3 - time * WAVE_FREQUENCY) * 
               Math.cos(distance * 2 + time * WAVE_FREQUENCY))
    },
    // Pattern 16: Orbital rotation
    (obj, time) => {
        const angle = Math.atan2(obj.z, obj.x)
        const distance = Math.sqrt(obj.x * obj.x + obj.z * obj.z)
        obj.node.rotation.y = angle + time * WAVE_FREQUENCY
        return Math.max(0, Math.sin(distance - time * WAVE_FREQUENCY) * 
               Math.exp(-distance * 0.1))
    },
    // Pattern 17: DNA Helix
    (obj, time) => {
        const angle = Math.atan2(obj.z, obj.x)
        obj.node.rotation.x = time * WAVE_FREQUENCY
        return Math.max(0, Math.sin(angle * 4 + time * WAVE_FREQUENCY) * 
               Math.exp(-Math.abs(obj.x) * 0.1))
    },
    // Pattern 18: Quantum Jump (modified to not use random)
    (obj, time) => {
        const distance = Math.sqrt(obj.x * obj.x + obj.z * obj.z)
        obj.node.scale.y = 1 + Math.sin(time * WAVE_FREQUENCY + distance) * 0.5
        return Math.sin(time * WAVE_FREQUENCY + distance) * 
               Math.cos(time * WAVE_FREQUENCY * 0.5)
    },
    // Pattern 19: Vortex Pull
    (obj, time) => {
        const angle = Math.atan2(obj.z, obj.x)
        const distance = Math.sqrt(obj.x * obj.x + obj.z * obj.z)
        obj.node.rotation.z = angle + time * WAVE_FREQUENCY
        return Math.max(0, (1 - distance/GRID_SIZE) * Math.sin(time * WAVE_FREQUENCY))
    },
    // Pattern 20: Mexican Wave
    (obj, time) => {
        const wave = Math.sin(obj.x * 0.3 - time * WAVE_FREQUENCY)
        obj.node.rotation.z = wave * 0.3
        return Math.max(0, wave)
    },
    // Pattern 21: Galaxy Spin
    (obj, time) => {
        const distance = Math.sqrt(obj.x * obj.x + obj.z * obj.z)
        const angle = Math.atan2(obj.z, obj.x)
        obj.node.rotation.y = angle + time * WAVE_FREQUENCY
        return Math.max(0, Math.sin(distance - time * WAVE_FREQUENCY) * 
               Math.exp(-distance * 0.1))
    },
    // Pattern 22: Quantum Entanglement
    (obj, time) => {
        const distance = Math.sqrt(obj.x * obj.x + obj.z * obj.z)
        obj.node.rotation.x = Math.sin(time * WAVE_FREQUENCY + distance)
        obj.node.rotation.z = Math.cos(time * WAVE_FREQUENCY + distance)
        return Math.max(0, Math.sin(time * WAVE_FREQUENCY) * Math.cos(distance))
    },
    // Pattern 23: Time Crystal
    (obj, time) => {
        const phase = (obj.x + obj.z) / GRID_SIZE
        obj.node.rotation.y = time * WAVE_FREQUENCY * phase
        return Math.max(0, Math.sin(time * WAVE_FREQUENCY * (1 - phase)))
    },
    // Pattern 24: Fractal Pulse
    (obj, time) => {
        const x = Math.abs(obj.x)
        const z = Math.abs(obj.z)
        const fractalFactor = 1 / (1 + Math.min(x, z) * 0.1)  
        obj.node.scale.setScalar(0.5 * (1 + fractalFactor * 0.3))  // Add scale pulsing
        return Math.max(0, Math.sin(time * WAVE_FREQUENCY) * fractalFactor)
    },
    // Pattern 25: Quantum Superposition
    (obj, time) => {
        const distance = Math.sqrt(obj.x * obj.x + obj.z * obj.z)
        obj.node.rotation.y = time * WAVE_FREQUENCY
        const wave1 = Math.sin(distance - time * WAVE_FREQUENCY)
        const wave2 = Math.cos(distance + time * WAVE_FREQUENCY)
        return Math.max(0, (wave1 + wave2) * 0.5)
    }
]

// Add reset function before patterns array
const resetObject = (obj) => {
    obj.node.rotation.set(0, 0, 0)
    obj.node.scale.set(0.5, 0.5, 0.5)
    // Reset position to original grid position
    obj.node.position.x = (obj.x - GRID_SIZE/2) * SPACING
    obj.node.position.z = (obj.z - GRID_SIZE/2) * SPACING
}

// Modify the control structure
const control = app.control({
    onPress: (code) => {
        if (code === 'KeyN') {
            // Reset all objects before changing pattern
            objects.forEach(obj => resetObject(obj))
            patternIndex = (patternIndex + 1) % patterns.length
            return true
        }
    }
})

app.add(control)

let time = 0
app.on('update', (delta) => {
    time += delta * WAVE_SPEED
    
    // Update each object's position using current pattern
    for (const obj of objects) {
        const wave = patterns[patternIndex](obj, time)
        obj.node.position.y = obj.baseY + BASE_HEIGHT + wave * WAVE_HEIGHT
    }
}) 