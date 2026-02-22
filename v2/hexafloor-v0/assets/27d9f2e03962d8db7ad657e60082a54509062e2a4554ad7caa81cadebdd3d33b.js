const RADIUS = 1.4
const platform = app.get('Body')
app.remove(platform)

// Calculate the proper offsets for hexagonal tiling
const WIDTH = RADIUS * 2
const HEIGHT = WIDTH * Math.sqrt(3) / 2

// Key control planes
const SIZE = 10
let patternIndex = 1

// Parameters for pattern functions
const GRID_SIZE = 100
const SPACING = 0.2
const WAVE_SPEED = 1.5
const WAVE_HEIGHT = 1
const WAVE_FREQUENCY = 1.5
const BASE_HEIGHT = 0.1
// const RADIUS = GRID_SIZE * 0.5 //couldn't get this to work :(
const WAVE_SPEED_MIN = 0.5
const WAVE_SPEED_MAX = 3.0
const WAVE_FREQ_MIN = 0.5
const WAVE_FREQ_MAX = 3.0
let isCircular = false
let intensity = 0.5  // Add intensity variable with default value
let waveSpeed = WAVE_SPEED  // Initialize with original constant
let waveFrequency = WAVE_FREQUENCY  // Initialize with original constant
const objects = [] // Container array for object control

for (let row = 0; row < SIZE; row++) {
    const offset = row % 2 === 0 ? 0 : WIDTH / 2

	
    for (let col = 0; col < SIZE; col++) {
        let x = col * WIDTH + offset
        let z = row * HEIGHT
        const obj = platform.clone(true)
        obj.position.set(
            x,
            0,
            z
        )
		
		objects.push({
			node: obj,
			baseY: obj.position.y,
			x: x,
			z: z
		})
    
        app.add(obj)
    }
}

// Define wave patterns
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
    // Pattern 9: Rotating star (enhanced)
    (obj, time) => {
        const angle = Math.atan2(obj.z, obj.x)
        const distance = Math.sqrt(obj.x * obj.x + obj.z * obj.z)
        // Show different faces based on the wave height
        const faceIndex = Math.floor((Math.sin(angle * 5 + time * WAVE_FREQUENCY) + 1) * 2) % 6
        const rotation = Object.values(FACE_ROTATIONS)[faceIndex]
        obj.node.rotation.set(...rotation)
        return Math.max(0, Math.sin(angle * 5 + time * WAVE_FREQUENCY) * 
               Math.exp(-distance * 0.03)) * 1.5
    },
    // Pattern 10: X/Z oscillation (blocks move in X and Z directions too!)
    (obj, time) => {
        obj.node.position.x = obj.x * SPACING + Math.sin(time * WAVE_FREQUENCY) * 0.2
        obj.node.position.z = obj.z * SPACING + Math.cos(time * WAVE_FREQUENCY) * 0.2
        return Math.max(0, Math.sin(time * WAVE_FREQUENCY))
    },
    // Pattern 11: Diamond ripples
    (obj, time) => {
        const distance = Math.abs(obj.x) + Math.abs(obj.z)
        return Math.max(0, Math.sin(distance - time * WAVE_FREQUENCY))
    },
    // Pattern 12: Breathing grid (scale animation)
    (obj, time) => {
        const scale = 0.08 + Math.sin(time * WAVE_FREQUENCY) * 0.04  // Reduced scale range
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
    // Pattern 16: Orbital rotation (enhanced)
    (obj, time) => {
        const angle = Math.atan2(obj.z, obj.x)
        const distance = Math.sqrt(obj.x * obj.x + obj.z * obj.z)
        // Show different faces based on distance from center
        const faceIndex = Math.floor(distance * 0.2) % 6
        const rotation = Object.values(FACE_ROTATIONS)[faceIndex]
        obj.node.rotation.set(...rotation)
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
    // Pattern 21: Galaxy Spin (enhanced)
    (obj, time) => {
        const distance = Math.sqrt(obj.x * obj.x + obj.z * obj.z)
        const angle = Math.atan2(obj.z, obj.x)
        // Create spiral color effect
        const spiralIndex = Math.floor((angle + distance * 0.1 + time) % 6)
        const rotation = Object.values(FACE_ROTATIONS)[spiralIndex]
        obj.node.rotation.set(...rotation)
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
    // Pattern 24: Distance Pulse
    (obj, time) => {
        const x = Math.abs(obj.x)
        const z = Math.abs(obj.z)
        const distanceFactor = 1 / (1 + Math.min(x, z) * 0.1)
        // Scale relative to base scale (0.1) and make the effect more subtle
        obj.node.scale.setScalar(0.1 * (1 + distanceFactor * 0.2 * Math.sin(time * WAVE_FREQUENCY)))
        return Math.max(0, Math.sin(time * WAVE_FREQUENCY) * distanceFactor)
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

// Additional control plans, add after other constants
const SPIKE_DURATION = 0.2  // Duration of spike in seconds
const SPIKE_INTENSITY = 2.0  // Maximum intensity during spike

// Add before control structure
let spikeTimer = 0
let isSpikingIntensity = false
let originalIntensity = 0

let time = 0
app.on('update', (delta) => {
    time += delta * waveSpeed

    // Handle intensity spike
    let currentIntensity = intensity
    if (isSpikingIntensity) {
        spikeTimer += delta
        if (spikeTimer >= SPIKE_DURATION) {
            isSpikingIntensity = false
            currentIntensity = intensity
        } else {
            // Create a quick spike that ramps up and down
            const progress = spikeTimer / SPIKE_DURATION
            const spikeAmount = Math.sin(progress * Math.PI)  // Creates a 0 to 1 to 0 curve
            currentIntensity = originalIntensity + (SPIKE_INTENSITY - originalIntensity) * spikeAmount
        }
    }
    
    // Update each object's position using current pattern
    for (const obj of objects) {
        const wave = patterns[patternIndex](obj, time * waveFrequency / WAVE_FREQUENCY)
        obj.node.position.y = obj.baseY + BASE_HEIGHT + wave * WAVE_HEIGHT * currentIntensity
    }
})