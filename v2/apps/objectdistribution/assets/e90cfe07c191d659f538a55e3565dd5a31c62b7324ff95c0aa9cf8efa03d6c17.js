app.configure([
    {
        key: 'generate',
        type: 'button',
        label: 'Generate',
        onClick: distributeObjects
    },
    {
        key: 'generateRandom',
        type: 'button',
        label: 'Generate Random',
        onClick: generateRandom
    },
    {
        key: 'seed',
        type: 'text',
        label: 'Seed',
        initial: 42
    },
    {
        key: 'template',
        type: 'text',
        label: 'Template Name',
        initial: 'Template'
    }, 
    {
        key: 'terrainTag',
        type: 'text',
        label: 'Terrain Tag',
        initial: 'Terrain'
    },
    {
        key: 'radius',
        type: 'text',
        label: 'Radius',
        initial: 20.0
    },
    {
        key: 'minimumHeight',
        type: 'range',
        label: 'Minimum Height',
        min: -100,
        max: 100,
        step: 1,
        initial: -100
    },
    {
        key: 'maximumHeight',
        type: 'range',
        label: 'Maximum Height',
        min: -100,
        max: 300,
        step: 1,
        initial: 100
    },
    {
        key: 'minimumAngle',
        type: 'range',
        label: 'Minimum Angle',
        min: 0,
        max: 90,
        step: 1,
        initial: 0
    },
    {
        key: 'maximumAngle',
        type: 'range',
        label: 'Maximum Angle',
        min: 0,
        max: 90,
        step: 1,
        initial: 90
    },
    {
        type: 'toggle',
        key: 'useNoise',
        label: 'Use Noise',
        trueLabel: 'Yes',
        falseLabel: 'No',
        initial: 'true',
    },
    {
        key: 'density',
        type: 'text',
        label: 'Density',
        initial: 0.1
    },
    {
        key: 'minScale',
        type: 'text',
        label: 'Min Scale',
        initial: 1.0
    },
    {
        key: 'maxScale',
        type: 'text',
        label: 'Max Scale',
        initial: 2.0
    },
    {
        key: 'randomRotation',
        type: 'toggle',
        label: 'Random Rotation',
        trueLabel: 'Yes',
        falseLabel: 'No',
        initial: 'true'
    },
    {
        key: 'rotateInAllDirections',
        type: 'toggle',
        label: 'Rotate In All Directions',
        trueLabel: 'Yes',
        falseLabel: 'No',
        initial: 'No'
    },    
    {
        key: 'minDistance',
        type: 'text',
        label: 'Min Distance',
        initial: 2.0
    },
    {
        key: 'randomOffset',
        type: 'text',
        label: 'Random Offset',
        initial: 2.0
    },
    {
        key: 'maxObjects',
        type: 'text',
        label: 'Max Objects',
        initial: 1000
    },
    {
        key: 'SPAWN_HEIGHT_OFFSET',
        type: 'text',
        label: 'Spawn Height Offset',
        initial: -0.25
    },
    {
        key: 'noiseScale',
        type: 'text',
        label: 'Noise Scale',
        initial: 0.1
    },
    {
        key: 'noiseOctaves',
        type: 'range',
        label: 'Noise Octaves',
        min: 1,
        max: 10,
        step: 1,
        initial: 3
    },
    {
        key: 'noiseAmplitude',
        type: 'text',
        label: 'Noise Amplitude',
        initial: 1.0
    },
    {
        key: 'distributionShape',
        type: 'switch',
        label: 'Distribution Shape',
        options: [
            { label: 'Circle', value: 'circle' },
            { label: 'Square', value: 'square' },
            { label: 'Triangle', value: 'triangle' }
        ],
        initial: 'circle'
    },
    {
        key: 'TerrainId',
        type: 'text',
        label: 'Terrain ID (Optional)',
        initial: '' // Leave empty to operate independently
    }
]);

// Create main container
const container = app.create('group')
world.add(container)

// Track placed objects
const placedObjects = []

// Store data received from TerrainGenerator if linked
let terrainDataFromGenerator = null;

// Create a Perlin noise generator
const PerlinNoise = {
    perm: [],
    
    initialize: function(seed) {
        const permSize = 256
        const p = new Array(permSize)
        
        for (let i = 0; i < permSize; i++) {
            p[i] = i
        }
        
        let state = seed
        const seededRandom = function() {
            state = (state * 1664525 + 1013904223) % 4294967296
            return state / 4294967296
        }
        
        for (let i = permSize - 1; i > 0; i--) {
            const j = Math.floor(seededRandom() * (i + 1))
            const temp = p[i]
            p[i] = p[j]
            p[j] = temp
        }
        
        this.perm = new Array(permSize * 2)
        for (let i = 0; i < permSize * 2; i++) {
            this.perm[i] = p[i % permSize]
        }
    },
    
    fade: function(t) {
        return t * t * t * (t * (t * 6 - 15) + 10)
    },
    
    lerp: function(a, b, t) {
        return a + t * (b - a)
    },
    
    grad: function(hash, x, y, z) {
        const h = hash & 15
        const u = h < 8 ? x : y
        const v = h < 4 ? y : (h === 12 || h === 14 ? x : z)
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
    },
    
    noise: function(x, y, z = 0) {
        const X = Math.floor(x) & 255
        const Y = Math.floor(y) & 255
        const Z = Math.floor(z) & 255
        
        x -= Math.floor(x)
        y -= Math.floor(y)
        z -= Math.floor(z)
        
        const u = this.fade(x)
        const v = this.fade(y)
        const w = this.fade(z)
        
        const A = this.perm[X] + Y
        const AA = this.perm[A] + Z
        const AB = this.perm[A + 1] + Z
        const B = this.perm[X + 1] + Y
        const BA = this.perm[B] + Z
        const BB = this.perm[B + 1] + Z
        
        const result = this.lerp(
            this.lerp(
                this.lerp(this.grad(this.perm[AA], x, y, z), 
                     this.grad(this.perm[BA], x - 1, y, z), 
                     u),
                this.lerp(this.grad(this.perm[AB], x, y - 1, z), 
                     this.grad(this.perm[BB], x - 1, y - 1, z), 
                     u),
            v),
            this.lerp(
                this.lerp(this.grad(this.perm[AA + 1], x, y, z - 1), 
                     this.grad(this.perm[BA + 1], x - 1, y, z - 1), 
                     u),
                this.lerp(this.grad(this.perm[AB + 1], x, y - 1, z - 1), 
                     this.grad(this.perm[BB + 1], x - 1, y - 1, z - 1), 
                     u),
                v),
            w)
        
        return (result + 1) * 0.5
    }
}

// Simple seeded random number generator
const SeededRandom = {
    state: 0,
    
    initialize: function(seed) {
        this.state = seed
    },
    
    next: function() {
        this.state = (this.state * 1664525 + 1013904223) % 4294967296
        return this.state / 4294967296
    }
}

// Get the template object from the app
const template = app.get(props.template)
if (!template) {
    console.error('No object template found! Please add a model to the app.')
}

app.on('onGenerateClick', () => {
    console.log('Generate button clicked, waiting one frame...')

    // Custom logic to wait one frame
    requestAnimationFrame(() => {
        console.log('Distributing objects after one frame')
            distributeObjects()
    })
})

// Function to get noise value at position
function getNoiseAt(x, z) {
    let value = 0
    let amplitude = 1.0
    let frequency = props.noiseScale
    let totalAmplitude = 0
    
    for (let i = 0; i < props.noiseOctaves; i++) {
        value += PerlinNoise.noise(x * frequency, z * frequency) * amplitude
        totalAmplitude += amplitude
        amplitude *= 0.5
        frequency *= 2.0
    }
    
    return value / totalAmplitude * props.noiseAmplitude
}

// Function to check if position is too close to other objects
function isTooCloseToOthers(x, z, objects, minDistance) {
    const minDistSq = minDistance * minDistance
    const buffer = minDistance * 0.1 // Add a small buffer to prevent edge cases
    
    for (const obj of objects) {
        const dx = obj.x - x
        const dz = obj.z - z
        const distSq = dx * dx + dz * dz
        
        if (distSq < minDistSq - buffer) {
            return true
        }
    }
    
    return false
}

// Function to distribute objects around player
function distributeObjects() {
    console.log('Starting object distribution')

    // Use terrain tag from generator if available, otherwise use prop
    const terrainTagToUse = terrainDataFromGenerator?.terrainTag || props.terrainTag;
    console.log(`Using terrain tag: ${terrainTagToUse}`);

    // Initialize both generators
    PerlinNoise.initialize(props.seed)
    SeededRandom.initialize(props.seed)
    console.log('PerlinNoise and SeededRandom initialized with seed:', props.seed)

    if (!template) {
        console.error('Template is not available. Aborting object distribution.')
        return
    }

    const radius = props.radius
    console.log('Distribution radius:', radius)

    // Clear existing objects
    console.log('Clearing existing objects...')
    container.children.forEach(child => container.remove(child))
    placedObjects.length = 0

    // Calculate step size based on density and minimum distance
    const stepSize = Math.max(props.minDistance, 1 / props.density)
    console.log('Step size calculated:', stepSize)

    let objectsPlaced = 0

    // Distribute objects in a circle around player
    for (let x = -radius; x < radius; x += stepSize) {
        for (let z = -radius; z < radius; z += stepSize) {
            if (props.distributionShape === 'circle' && x * x + z * z > radius * radius) {                
                continue
            }

            if (props.distributionShape === 'triangle') {
                const height = radius * Math.sqrt(3) / 2
                if (z < -height || z > height || z > Math.sqrt(3) * x + height || z > -Math.sqrt(3) * x + height) {                    
                    continue
                }
            }

            // Add some jitter to break up the grid pattern
            const jitterX = props.useNoise ? (PerlinNoise.noise(x * 0.1, z * 0.1, 0.5) * 2 - 1) * stepSize * 0.5 : 0
            const jitterZ = props.useNoise ? (PerlinNoise.noise(x * 0.1, z * 0.1, 0.7) * 2 - 1) * stepSize * 0.5 : 0

            const worldX = app.position.x + x + jitterX
            const worldZ = app.position.z + z + jitterZ

            // Add random offset to break up grid pattern
            const offsetX = (SeededRandom.next() * 2 - 1) * props.randomOffset
            const offsetZ = (SeededRandom.next() * 2 - 1) * props.randomOffset

            const finalX = worldX + offsetX
            const finalZ = worldZ + offsetZ

            // Raycast down to find terrain height
            const origin = new Vector3(finalX, 100, finalZ)
            const direction = new Vector3(0, -1, 0)
            const hit = world.raycast(origin, direction, 200)

            if (!hit) {                
                continue
            }

            // Check terrain tag
            if (hit.tag !== terrainTagToUse) {                
                continue
            }

            if (hit.point.y < props.minimumHeight || hit.point.y > props.maximumHeight) {                
                continue
            }

            // Calculate angle between surface normal and up vector
            const normal = hit.normal
            const up = new Vector3(0, 1, 0)
            const angle = Math.acos(normal.dot(up)) * (180 / Math.PI)

            if (angle < props.minimumAngle || angle > props.maximumAngle) {                
                continue
            }

            // Get noise value for this position
            const noiseValue = props.useNoise ? getNoiseAt(finalX, finalZ) : 1

            if (noiseValue <= 0.5) {                
                continue
            }

            // Check if position is too close to other objects
            if (isTooCloseToOthers(finalX, finalZ, placedObjects, props.minDistance)) {                
                continue
            }

            // Clone and place the object
            const obj = template.clone(true)
            container.add(obj)

            // Position the object at terrain height
            obj.position.set(
                finalX,
                hit.point.y + props.SPAWN_HEIGHT_OFFSET,
                finalZ
            )

            // Apply random rotation if enabled
            if (props.randomRotation) {
                if (props.rotateInAllDirections) {
                    obj.rotation.x = SeededRandom.next() * Math.PI * 2
                    obj.rotation.y = SeededRandom.next() * Math.PI * 2
                    obj.rotation.z = SeededRandom.next() * Math.PI * 2
                } else {
                    obj.rotation.y = props.useNoise ? PerlinNoise.noise(x * 0.1, z * 0.1, 0.3) * Math.PI * 2 : SeededRandom.next() * Math.PI * 2
                }
            }

            // Apply random scale
            const minScale = parseFloat(props.minScale)
            const maxScale = parseFloat(props.maxScale)
            const randomValue = SeededRandom.next()
            const scale = minScale + randomValue * (maxScale - minScale)

            obj.scale.set(scale, scale, scale)

            // Record position for minimum distance checks
            placedObjects.push({ x: finalX, z: finalZ })
            objectsPlaced++
        }
    }

    console.log('Total objects placed:', objectsPlaced)
}

// Function to generate random objects
function generateRandom() {
    // Get new seed
    const newSeed = Math.floor(Math.random() * 1000000)
    props.seed = newSeed
    console.log('New seed:', newSeed)
    
    // Distribute objects with new seed
    distributeObjects()
}

// SERVER-SIDE LOGIC
if (world.isServer) {
    const TERRAIN_ID = props.TerrainId;

    // Listen for a TerrainGenerator if TerrainId is set
    if (TERRAIN_ID) {
        console.log(`[ObjectDistributor:${app.instanceId}] Found TerrainId: ${TERRAIN_ID}. Waiting for init...`);

        // Listen for the specific terrain generator's init
        world.on(`terrain:init:${TERRAIN_ID}`, (initData) => {
            console.log(`[ObjectDistributor:${app.instanceId}] Received terrain:init from ${initData.generatorInstanceId}. Registering...`);

            // Register with the terrain generator
            world.emit(`distributor:register:${TERRAIN_ID}`, {
                distributorInstanceId: app.instanceId,
                template: props.template
            });

            // Listen for the terrain generated event
            world.on(`terrain:generated:${TERRAIN_ID}`, (generatedData) => {
                console.log(`[ObjectDistributor:${app.instanceId}] Received terrain:generated event with data: `, generatedData);
                terrainDataFromGenerator = generatedData.terrainData;
            });
        });
    }
}