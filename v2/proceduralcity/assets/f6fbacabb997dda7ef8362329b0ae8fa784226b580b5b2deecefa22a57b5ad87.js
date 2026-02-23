/**
 * Procedural City Generator
 * Generates an infinite city with distinct districts and building types.
 * Uses a tile-based system for efficient memory usage and performance.
 */

// Core city configuration parameters
const CONFIG = {
    CITY_SIZE: 24,                // Number of blocks per tile edge
    BLOCK_SIZE: 4,                // Size of each city block
    DISTRICT_SIZE: 12,            // Size of each district
    ROAD_WIDTH: 2,                // Width of major roads
    GLOBAL_SCALE: 6,              // Global scale factor for all buildings
    BUILDING_TYPES: {
        RESIDENTIAL: {
            scale: 1.0,           // Base scale for residential buildings
            minHeight: .4,        // Minimum height for residential buildings
            maxHeight: .8         // Maximum height for residential buildings
        },
        COMMERCIAL: {
            scale: 2.0,           // Base scale for commercial buildings
            minHeight: 1.5,       // Minimum height for commercial buildings
            maxHeight: 3          // Maximum height for commercial buildings
        },
        INDUSTRIAL: {
            scale: 2.0,           // Base scale for industrial buildings
            minHeight: 1.2,       // Fixed height for industrial buildings
            maxHeight: 1.2,       // Fixed height for industrial buildings
        },
        SKYSCRAPER: {
            scale: 1.6,           // Base scale for skyscrapers
            minHeight: 10,        // Minimum height for skyscrapers
            maxHeight: 16         // Maximum height for skyscrapers
        }
    },
    // Tile management settings
    TILE_VISIBILITY_RANGE: 2,     // Number of tiles to keep loaded in each direction
    TILE_SIZE: 24 * 4,           // Total world units per tile (CITY_SIZE * BLOCK_SIZE)
    UPDATE_INTERVAL: 1            // Tile update check interval in seconds
}

// Map to store consistent heights for industrial districts
const industrialDistrictHeights = new Map()

// Get the template cube for building generation
const templateBlueCube = app.get('BlueCube')
if (!templateBlueCube) {
    console.error('BlueCube template not found!')
    return
}
const templateRedCube = app.get('RedCube')
if (!templateRedCube) {
    console.error('RedCube template not found!')
    return
}
const templateYellowCube = app.get('YellowCube')
if (!templateYellowCube) {
    console.error('YellowCube template not found!')
    return
}
const templateGrayCube = app.get('GrayCube')
if (!templateGrayCube) {
    console.error('GrayCube template not found!')
    return
}

// Track active city tiles and player position
const activeTiles = new Map()
let lastPlayerTile = null
let updateTimer = 0

// Create main city container
const city = app.create('group')
world.add(city)

/**
 * Converts world position to tile coordinates
 * @param {number} x - World X coordinate
 * @param {number} z - World Z coordinate
 * @returns {Object} Tile coordinates {x, z}
 */
function getTileCoords(x, z) {
    return {
        x: Math.floor(x / (CONFIG.TILE_SIZE * CONFIG.GLOBAL_SCALE)),
        z: Math.floor(z / (CONFIG.TILE_SIZE * CONFIG.GLOBAL_SCALE))
    }
}

/**
 * Generates a unique key for tile identification
 * @param {number} tileX - Tile X coordinate
 * @param {number} tileZ - Tile Z coordinate
 * @returns {string} Unique tile key
 */
function getTileKey(tileX, tileZ) {
    return `${tileX},${tileZ}`
}

/**
 * Deterministic noise function for consistent generation
 * @param {number} x - X coordinate
 * @param {number} z - Z coordinate
 * @param {number} seed - Random seed
 * @returns {number} Noise value between 0 and 1
 */
function noise(x, z, seed = 12345) {
    const X = Math.floor(x * 100)
    const Z = Math.floor(z * 100)
    return (((X + seed) * 123456789) ^ ((Z + seed) * 987654321)) % 1000 / 1000
}

/**
 * Multi-octave noise function for smoother results
 * @param {number} x - X coordinate
 * @param {number} z - Z coordinate
 * @param {number} scale - Noise scale factor
 * @returns {number} Smoothed noise value
 */
function smoothNoise(x, z, scale = 1) {
    let value = 0
    value += noise(x * scale, z * scale, 12345) * 0.5
    value += noise(x * scale * 2, z * scale * 2, 54321) * 0.25
    value += noise(x * scale * 4, z * scale * 4, 98765) * 0.125
    value += noise(x * scale * 8, z * scale * 8, 23456) * 0.125
    return value
}

/**
 * Calculates influence from district centers and downtown areas
 * @param {number} x - World X coordinate
 * @param {number} z - World Z coordinate
 * @param {number} citySize - Size of the city
 * @returns {Object} Influence type and strength
 */
function getClusterInfluence(x, z, citySize) {
    // Calculate downtown locations using noise and tile coordinates
    const tileX = Math.floor(x / CONFIG.TILE_SIZE)
    const tileZ = Math.floor(z / CONFIG.TILE_SIZE)
    
    // Downtown spacing and positioning
    const downtownSpacing = CONFIG.TILE_SIZE * 6
    const globalX = x - (tileX * CONFIG.TILE_SIZE)
    const globalZ = z - (tileZ * CONFIG.TILE_SIZE)
    
    // Find nearest downtown center
    const nearestDowntownX = Math.round(x / downtownSpacing) * downtownSpacing
    const nearestDowntownZ = Math.round(z / downtownSpacing) * downtownSpacing
    
    // Calculate distance to nearest downtown
    const dx = (x - nearestDowntownX) / downtownSpacing
    const dz = (z - nearestDowntownZ) / downtownSpacing
    const downtownDistance = Math.sqrt(dx * dx + dz * dz)
    
    // Downtown zone check
    if (downtownDistance < 0.15) {
        return { type: 'DOWNTOWN', strength: 1 - (downtownDistance / 0.15), index: null }
    }
    
    // District cluster definitions
    const clusters = [
        { x: 0.2, z: 0.2, type: 'COMMERCIAL', radius: 0.15 },
        { x: 0.8, z: 0.2, type: 'COMMERCIAL', radius: 0.15 },
        { x: 0.2, z: 0.8, type: 'INDUSTRIAL', radius: 0.2, index: 1 },
        { x: 0.8, z: 0.8, type: 'INDUSTRIAL', radius: 0.2, index: 2 }
    ]
    
    // Normalize coordinates for zone calculation
    const nx = globalX / citySize
    const nz = globalZ / citySize
    
    // Find strongest cluster influence
    let strongestInfluence = { type: null, strength: 0, index: null }
    
    for (const cluster of clusters) {
        const cdx = nx - cluster.x
        const cdz = nz - cluster.z
        const distance = Math.sqrt(cdx * cdx + cdz * cdz)
        
        let strength = Math.max(0, 1 - (distance / cluster.radius))
        
        if (strength > strongestInfluence.strength) {
            strongestInfluence = { 
                type: cluster.type, 
                strength: strength,
                index: cluster.index
            }
        }
    }
    
    return strongestInfluence
}

/**
 * Determines zone type based on position and various factors
 * @param {number} x - World X coordinate
 * @param {number} z - World Z coordinate
 * @param {number} citySize - Size of the city
 * @returns {string} Zone type identifier
 */
function getZoneType(x, z, citySize) {
    const influence = getClusterInfluence(x, z, citySize)
    
    // Calculate downtown center and distance
    const downtownSeed = 98765
    const downtownX = (0.5 + (noise(0.5, 0.5, downtownSeed) - 0.5) * 0.6) * citySize
    const downtownZ = (0.5 + (noise(0.5, 0.6, downtownSeed) - 0.5) * 0.6) * citySize
    const dx = (x - downtownX) / (citySize / 2)
    const dz = (z - downtownZ) / (citySize / 2)
    const distanceFromDowntown = Math.sqrt(dx * dx + dz * dz)
    
    // Get noise values for variation
    const noiseValue = smoothNoise(x / citySize, z / citySize, 2)
    const secondaryNoise = smoothNoise(x / citySize, z / citySize, 4)
    
    // Zone determination logic
    if (influence.strength > 0.5) {
        if (influence.type === 'DOWNTOWN') {
            return noiseValue > 0.4 ? 'DOWNTOWN' : 'COMMERCIAL'
        }
        return influence.type
    }
    
    if (distanceFromDowntown < 0.2 && noiseValue > 0.7) return 'DOWNTOWN'
    if (distanceFromDowntown < 0.2 && noiseValue > 0.5) return 'COMMERCIAL'
    if (distanceFromDowntown > 0.6 && noiseValue > 0.6 && secondaryNoise > 0.6) return 'INDUSTRIAL'
    if (isNearMajorDistrictRoad(x, z) && noiseValue > 0.6) return 'COMMERCIAL'
    if (noiseValue > 0.85 && secondaryNoise > 0.7 && distanceFromDowntown < 0.5) return 'COMMERCIAL'
    
    return 'RESIDENTIAL'
}

/**
 * Checks if a position is near a major district road
 * @param {number} x - World X coordinate
 * @param {number} z - World Z coordinate
 * @returns {boolean} True if near major road
 */
function isNearMajorDistrictRoad(x, z) {
    const districtX = Math.floor(x / CONFIG.DISTRICT_SIZE)
    const districtZ = Math.floor(z / CONFIG.DISTRICT_SIZE)
    const localX = x % CONFIG.DISTRICT_SIZE
    const localZ = z % CONFIG.DISTRICT_SIZE
    
    return localX < CONFIG.ROAD_WIDTH || localZ < CONFIG.ROAD_WIDTH || 
           localX > CONFIG.DISTRICT_SIZE - CONFIG.ROAD_WIDTH || 
           localZ > CONFIG.DISTRICT_SIZE - CONFIG.ROAD_WIDTH
}

/**
 * Gets industrial district ID for a position
 * @param {number} x - World X coordinate
 * @param {number} z - World Z coordinate
 * @param {number} citySize - Size of the city
 * @returns {number|null} District ID or null
 */
function getIndustrialDistrictId(x, z, citySize) {
    const influence = getClusterInfluence(x, z, citySize)
    if (influence.type === 'INDUSTRIAL' && influence.strength > 0.5) {
        return influence.index
    }
    return null
}

/**
 * Debug function for industrial district information
 */
function debugIndustrialDistrict(x, z, influence, height) {
    if (!influence || influence.type !== 'INDUSTRIAL') return
    
    console.log(`Industrial Building at (${x.toFixed(1)}, ${z.toFixed(1)}) - District: ${influence.index}, Height: ${height.toFixed(2)}, Strength: ${influence.strength.toFixed(2)}`)
}

/**
 * Determines building height based on type and location
 * @param {string} type - Building type
 * @param {Object} influence - District influence data
 * @param {number} x - World X coordinate
 * @param {number} z - World Z coordinate
 * @returns {number} Building height
 */
function getRandomHeight(type, influence, x, z) {
    const config = CONFIG.BUILDING_TYPES[type]
    
    // Industrial district height consistency
    if (type === 'INDUSTRIAL' && influence && influence.type === 'INDUSTRIAL' && influence.strength > 0.5) {
        const districtId = influence.index
        if (!industrialDistrictHeights.has(districtId)) {
            const height = config.minHeight
            console.log(`New Industrial District ${districtId} - Setting Height: ${height.toFixed(2)}`)
            industrialDistrictHeights.set(districtId, height)
        }
        const height = industrialDistrictHeights.get(districtId)
        debugIndustrialDistrict(x, z, influence, height)
        return height
    }
    
    return num(config.minHeight, config.maxHeight, 1)
}

/**
 * Creates a building at specified coordinates
 * @param {number} x - World X coordinate
 * @param {number} z - World Z coordinate
 * @param {string} zoneType - Zone type identifier
 * @returns {Object} Building object
 */
function createBuilding(x, z, zoneType) {
    const influence = getClusterInfluence(x, z, CONFIG.CITY_SIZE)
    const type = getBuildingTypeForZone(zoneType)
    const baseConfig = CONFIG.BUILDING_TYPES[type]
    let buildingConfig = { ...baseConfig }
    let height = getRandomHeight(type, influence, x, z)
    
    // Select template based on building type
    let building
    switch(type) {
        case 'SKYSCRAPER':
            building = templateBlueCube.clone(true)
            break
        case 'RESIDENTIAL':
            building = templateRedCube.clone(true)
            break
        case 'COMMERCIAL':
            building = templateBlueCube.clone(true)
            break
        case 'INDUSTRIAL':
            building = templateYellowCube.clone(true)
            break
        default:
            building = templateRedCube.clone(true)
    }
    
    // Position offsets for variety
    const offsetX = (noise(x, z, 54321) - 0.5) * (CONFIG.BLOCK_SIZE * 0.2)
    const offsetZ = (noise(z, x, 65432) - 0.5) * (CONFIG.BLOCK_SIZE * 0.2)
    
    // Building placement logic based on type
    if (type === 'INDUSTRIAL' && influence.type === 'INDUSTRIAL' && influence.strength > 0.5) {
        building.scale.set(
            buildingConfig.scale * CONFIG.GLOBAL_SCALE, 
            CONFIG.GLOBAL_SCALE,
            buildingConfig.scale * CONFIG.GLOBAL_SCALE
        )
        building.position.set(
            x * CONFIG.GLOBAL_SCALE,
            height * CONFIG.GLOBAL_SCALE,
            z * CONFIG.GLOBAL_SCALE
        )
    } else if (type === 'RESIDENTIAL' || type === 'SKYSCRAPER') {
        building.scale.set(
            buildingConfig.scale * CONFIG.GLOBAL_SCALE, 
            height * CONFIG.GLOBAL_SCALE, 
            buildingConfig.scale * CONFIG.GLOBAL_SCALE
        )
        building.position.set(
            (x + offsetX) * CONFIG.GLOBAL_SCALE,
            (height/2) * CONFIG.GLOBAL_SCALE,
            (z + offsetZ) * CONFIG.GLOBAL_SCALE
        )
    } else {
        building.scale.set(
            buildingConfig.scale * CONFIG.GLOBAL_SCALE, 
            height * CONFIG.GLOBAL_SCALE, 
            buildingConfig.scale * CONFIG.GLOBAL_SCALE
        )
        building.position.set(
            x * CONFIG.GLOBAL_SCALE,
            (height/2) * CONFIG.GLOBAL_SCALE,
            z * CONFIG.GLOBAL_SCALE
        )
    }
    
    return building
}

/**
 * Determines building type based on zone
 * @param {string} zoneType - Zone type identifier
 * @returns {string} Building type
 */
function getBuildingTypeForZone(zoneType) {
    switch(zoneType) {
        case 'DOWNTOWN':
            return 'SKYSCRAPER'
        case 'INDUSTRIAL':
            return 'INDUSTRIAL'
        case 'COMMERCIAL':
            return num(0, 100) < 95 ? 'COMMERCIAL' : 'RESIDENTIAL'
        case 'RESIDENTIAL':
            return num(0, 100) < 98 ? 'RESIDENTIAL' : 'COMMERCIAL'
        default:
            return 'RESIDENTIAL'
    }
}

/**
 * Determines if a position should be a road
 * @param {number} x - Local X coordinate
 * @param {number} z - Local Z coordinate
 * @returns {boolean} True if position should be road
 */
function isRoad(x, z) {
    const districtX = Math.floor(x / CONFIG.DISTRICT_SIZE)
    const districtZ = Math.floor(z / CONFIG.DISTRICT_SIZE)
    const localX = x % CONFIG.DISTRICT_SIZE
    const localZ = z % CONFIG.DISTRICT_SIZE
    
    // Main district boundary roads
    if (localX < CONFIG.ROAD_WIDTH || localZ < CONFIG.ROAD_WIDTH) {
        return true
    }
    
    // Local roads within districts
    if ((localX - CONFIG.ROAD_WIDTH) % 4 === 0 || (localZ - CONFIG.ROAD_WIDTH) % 4 === 0) {
        if (localX > CONFIG.ROAD_WIDTH + 1 && localX < CONFIG.DISTRICT_SIZE - CONFIG.ROAD_WIDTH - 1 &&
            localZ > CONFIG.ROAD_WIDTH + 1 && localZ < CONFIG.DISTRICT_SIZE - CONFIG.ROAD_WIDTH - 1) {
            return true
        }
    }
    
    // Internal district roads
    const seed = (districtX * 1000) + districtZ
    const hasInternalXRoad = (seed % 3 === 0)
    const hasInternalZRoad = ((seed + 1) % 3 === 0)
    
    if (hasInternalXRoad && localX >= CONFIG.DISTRICT_SIZE/2 - CONFIG.ROAD_WIDTH/2 && 
        localX < CONFIG.DISTRICT_SIZE/2 + CONFIG.ROAD_WIDTH/2) {
        return true
    }
    
    if (hasInternalZRoad && localZ >= CONFIG.DISTRICT_SIZE/2 - CONFIG.ROAD_WIDTH/2 && 
        localZ < CONFIG.DISTRICT_SIZE/2 + CONFIG.ROAD_WIDTH/2) {
        return true
    }
    
    return false
}

/**
 * Generates a city tile at specified coordinates
 * @param {number} tileX - Tile X coordinate
 * @param {number} tileZ - Tile Z coordinate
 */
function generateCityTile(tileX, tileZ) {
    const tileKey = getTileKey(tileX, tileZ)
    if (activeTiles.has(tileKey)) return

    // Create tile container
    const tile = app.create('group')
    tile.position.set(
        tileX * CONFIG.TILE_SIZE * CONFIG.GLOBAL_SCALE,
        0,
        tileZ * CONFIG.TILE_SIZE * CONFIG.GLOBAL_SCALE
    )
    city.add(tile)

    // Create ground plane using gray cube
    const gridExtent = CONFIG.TILE_SIZE / 2
    const ground = templateGrayCube.clone(true)
    ground.scale.set(
        gridExtent * CONFIG.GLOBAL_SCALE, 
        0.1 * CONFIG.GLOBAL_SCALE, 
        gridExtent * CONFIG.GLOBAL_SCALE
    )
    ground.position.y = -0.05 * CONFIG.GLOBAL_SCALE
    tile.add(ground)

    // Generate buildings
    for (let localX = 0; localX < CONFIG.CITY_SIZE; localX++) {
        for (let localZ = 0; localZ < CONFIG.CITY_SIZE; localZ++) {
            const worldX = (tileX * CONFIG.TILE_SIZE) + (localX * CONFIG.BLOCK_SIZE)
            const worldZ = (tileZ * CONFIG.TILE_SIZE) + (localZ * CONFIG.BLOCK_SIZE)

            if (isRoad(localX, localZ)) continue
            
            const zoneType = getZoneType(worldX, worldZ, CONFIG.CITY_SIZE * CONFIG.BLOCK_SIZE)
            
            const posX = (-gridExtent + (localX * CONFIG.BLOCK_SIZE) + (CONFIG.BLOCK_SIZE / 2)) * CONFIG.GLOBAL_SCALE
            const posZ = (-gridExtent + (localZ * CONFIG.BLOCK_SIZE) + (CONFIG.BLOCK_SIZE / 2)) * CONFIG.GLOBAL_SCALE
            
            const building = createBuilding(worldX, worldZ, zoneType)
            building.position.x = posX
            building.position.z = posZ
            tile.add(building)
        }
    }

    activeTiles.set(tileKey, tile)
}

/**
 * Removes a city tile
 * @param {number} tileX - Tile X coordinate
 * @param {number} tileZ - Tile Z coordinate
 */
function removeTile(tileX, tileZ) {
    const key = getTileKey(tileX, tileZ)
    const tile = activeTiles.get(key)
    if (tile) {
        city.remove(tile)
        activeTiles.delete(key)
    }
}

/**
 * Updates visible tiles based on player position
 */
function updateTiles() {
    const player = world.getPlayer()
    if (!player) return

    const currentTile = getTileCoords(player.position.x, player.position.z)
    const tileKey = getTileKey(currentTile.x, currentTile.z)

    if (lastPlayerTile && 
        lastPlayerTile.x === currentTile.x && 
        lastPlayerTile.z === currentTile.z) {
        return
    }

    lastPlayerTile = currentTile

    // Manage visible tiles
    const range = CONFIG.TILE_VISIBILITY_RANGE
    const tilesToKeep = new Set()

    for (let dx = -range; dx <= range; dx++) {
        for (let dz = -range; dz <= range; dz++) {
            const tileX = currentTile.x + dx
            const tileZ = currentTile.z + dz
            const key = getTileKey(tileX, tileZ)
            tilesToKeep.add(key)
            
            if (!activeTiles.has(key)) {
                generateCityTile(tileX, tileZ)
            }
        }
    }

    // Remove out-of-range tiles
    for (const [key, tile] of activeTiles) {
        if (!tilesToKeep.has(key)) {
            const [tileX, tileZ] = key.split(',').map(Number)
            removeTile(tileX, tileZ)
        }
    }
}

// Update loop for tile management
app.on('update', (dt) => {
    updateTimer += dt
    if (updateTimer >= CONFIG.UPDATE_INTERVAL) {
        updateTimer = 0
        updateTiles()
    }
})

// Generate initial city tiles around origin
const initialRange = CONFIG.TILE_VISIBILITY_RANGE
for (let dx = -initialRange; dx <= initialRange; dx++) {
    for (let dz = -initialRange; dz <= initialRange; dz++) {
        generateCityTile(dx, dz)
    }
}