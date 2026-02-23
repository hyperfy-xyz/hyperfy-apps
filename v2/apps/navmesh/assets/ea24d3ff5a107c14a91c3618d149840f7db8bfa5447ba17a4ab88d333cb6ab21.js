// Configuration
const CONFIG = {
    GRID_SIZE: 60,         // Number of vertices per side
    CELL_SIZE: .5,         // Size of each grid cell in meters
    MAX_HEIGHT: 100,      // Maximum raycast distance
    VISUALIZATION: true,   // Show the 
    MARKER_SCALE: 0.025,    // Scale of the visualization markers
    
    // Agent settings
    AGENT_SCALE: 0.5,     // Size of the wandering agent
    AGENT_SPEED: 6,       // Units per second
    AGENT_PAUSE: 0,       // Time to pause at each destination
    MAX_HEIGHT_DIFF: .1,   // Maximum height difference the agent can handle
    MIN_FOLLOW_DISTANCE: 1, // Minimum distance to maintain from player
}

// Add after CONFIG
const DIRECTIONS = [
    {x: 0, z: 1},   // North
    {x: 1, z: 1},   // Northeast
    {x: 1, z: 0},   // East
    {x: 1, z: -1},  // Southeast
    {x: 0, z: -1},  // South
    {x: -1, z: -1}, // Southwest
    {x: -1, z: 0},  // West
    {x: -1, z: 1},  // Northwest
]

if (world.isServer) {
    // Clean up any existing visualization markers
    if (app.navMeshMarkers) {
        app.navMeshMarkers.forEach(marker => world.remove(marker))
    }
    app.navMeshMarkers = []

    // Store vertices and their heights
    const vertices = []
    const gridWorldSize = CONFIG.GRID_SIZE * CONFIG.CELL_SIZE
    const halfSize = gridWorldSize / 2
    const centerPos = app.position

    // Create reusable vectors for raycast
    const origin = new Vector3()
    const direction = new Vector3(0, -1, 0)

    // Generate grid points and raycast for heights
    for (let z = 0; z < CONFIG.GRID_SIZE; z++) {
        for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
            const worldX = (x * CONFIG.CELL_SIZE - halfSize) + centerPos.x
            const worldZ = (z * CONFIG.CELL_SIZE - halfSize) + centerPos.z
            
            // Set raycast origin
            origin.set(worldX, CONFIG.MAX_HEIGHT, worldZ)
            
            const hit = world.raycast(origin, direction, CONFIG.MAX_HEIGHT)
            const worldY = hit ? hit.point.y : 0
            
            vertices.push({
                x: worldX,
                y: worldY,
                z: worldZ
            })
        }
    }

    // Store navmesh data for future use
    app.navMeshData = {
        vertices: vertices,
        gridSize: CONFIG.GRID_SIZE,
        cellSize: CONFIG.CELL_SIZE
    }

    // Send navmesh data to clients
    app.send('navmesh:init', app.navMeshData)

    // Helper functions remain on server
    app.getNavMeshVertex = (gridX, gridZ) => {
        if (gridX < 0 || gridX >= CONFIG.GRID_SIZE || 
            gridZ < 0 || gridZ >= CONFIG.GRID_SIZE) {
            return null
        }
        return vertices[gridZ * CONFIG.GRID_SIZE + gridX]
    }

    app.findNearestNavMeshPoint = (position) => {
        let nearest = null
        let minDist = Infinity
        const maxHeightDiff = CONFIG.MAX_HEIGHT_DIFF

        console.log('Finding nearest point for position:', position)
        console.log('Number of vertices to check:', vertices.length)

        for (const vertex of vertices) {
            const dx = vertex.x - position.x
            const dz = vertex.z - position.z
            const dy = Math.abs(vertex.y - position.y)
            const dist = Math.sqrt(dx * dx + dz * dz)
            
            // Skip points that are too high or too low relative to current position
            if (dy > maxHeightDiff) continue
            
            if (dist < minDist) {
                minDist = dist
                nearest = vertex
            }
        }

        console.log('Found nearest point:', nearest, 'at distance:', minDist)
        return nearest
    }
}

if (world.isClient) {
    // Store navmesh data when received from server
    app.on('navmesh:init', (data) => {
        app.navMeshData = data

        // Only create visualization if enabled
        if (CONFIG.VISUALIZATION) {
            const template = app.get('Cube')
            if (!template) {
                console.error('Could not find cube template')
                return
            }

            app.navMeshMarkers = []
            data.vertices.forEach(vertex => {
                const marker = template.clone(true)
                marker.visible = true
                marker.scale.set(CONFIG.MARKER_SCALE, CONFIG.MARKER_SCALE, CONFIG.MARKER_SCALE)
                marker.position.set(vertex.x, vertex.y, vertex.z)
                world.add(marker)
                app.navMeshMarkers.push(marker)
            })
        }
    })

    // Clean up any existing visualization markers
    if (app.navMeshMarkers) {
        app.navMeshMarkers.forEach(marker => world.remove(marker))
    }
    app.navMeshMarkers = []

    // Get template for visualization
    const template = app.get('Cube')
    if (!template) {
        console.error('Could not find cube template')
        return
    }

    // Store vertices and their heights
    const vertices = []
    const gridWorldSize = CONFIG.GRID_SIZE * CONFIG.CELL_SIZE
    const halfSize = gridWorldSize / 2
    const centerPos = app.position // Get app's position as center

    // Create reusable vectors for raycast
    const origin = new Vector3()
    const direction = new Vector3(0, -1, 0)

    // Generate grid points and raycast for heights
    for (let z = 0; z < CONFIG.GRID_SIZE; z++) {
        for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
            const worldX = (x * CONFIG.CELL_SIZE - halfSize) + centerPos.x
            const worldZ = (z * CONFIG.CELL_SIZE - halfSize) + centerPos.z
            
            // Set raycast origin
            origin.set(worldX, CONFIG.MAX_HEIGHT, worldZ)
            
            const hit = world.raycast(origin, direction, CONFIG.MAX_HEIGHT)
            const worldY = hit ? hit.point.y : 0
            
            vertices.push({
                x: worldX,
                y: worldY,
                z: worldZ
            })

            // Visualize vertices if enabled
            if (CONFIG.VISUALIZATION) {
                const marker = template.clone(true)
                marker.visible = true
                marker.scale.set(CONFIG.MARKER_SCALE, CONFIG.MARKER_SCALE, CONFIG.MARKER_SCALE)
                marker.position.set(worldX, worldY, worldZ)
                world.add(marker)
                app.navMeshMarkers.push(marker)
            }
        }
    }

    // Store navmesh data for future use
    app.navMeshData = {
        vertices: vertices,
        gridSize: CONFIG.GRID_SIZE,
        cellSize: CONFIG.CELL_SIZE
    }

    // Helper function to get vertex at grid coordinates
    app.getNavMeshVertex = (gridX, gridZ) => {
        if (gridX < 0 || gridX >= CONFIG.GRID_SIZE || 
            gridZ < 0 || gridZ >= CONFIG.GRID_SIZE) {
            return null
        }
        return vertices[gridZ * CONFIG.GRID_SIZE + gridX]
    }

    // Helper to find nearest navmesh point
    app.findNearestNavMeshPoint = (position) => {
        let nearest = null
        let minDist = Infinity
        const maxHeightDiff = CONFIG.MAX_HEIGHT_DIFF

        //console.log('Finding nearest point for position:', position)
        //console.log('Number of vertices to check:', vertices.length)

        for (const vertex of vertices) {
            const dx = vertex.x - position.x
            const dz = vertex.z - position.z
            const dy = Math.abs(vertex.y - position.y)
            const dist = Math.sqrt(dx * dx + dz * dz)
            
            // Skip points that are too high or too low relative to current position
            if (dy > maxHeightDiff) continue
            
            if (dist < minDist) {
                minDist = dist
                nearest = vertex
            }
        }

        //console.log('Found nearest point:', nearest, 'at distance:', minDist)
        return nearest
    }

    // Add agent after navmesh is built
    const agent = app.get('Cube').clone(true)
    agent.visible = true
    agent.scale.set(CONFIG.AGENT_SCALE, CONFIG.AGENT_SCALE, CONFIG.AGENT_SCALE)

    // Agent state
    const agentState = {
        moving: true,
        pauseTime: 0,
        path: [],    // Initialize as empty array instead of null
        pathIndex: 0,
        pathUpdateTimer: 0,  // Timer for path updates
        pathUpdateInterval: 2.0,  // Update path every 1 second
        currentRotation: 0,  // Track current rotation for smooth turning
        targetRotation: 0,    // Target rotation to smoothly rotate towards
        lastPlayerPos: null
    }

    // Initial spawn with correct num() usage
    const randomVertex = vertices[Math.floor(num(0, vertices.length - 1))]
    agent.position.set(randomVertex.x, randomVertex.y + CONFIG.AGENT_SCALE/2, randomVertex.z)
    world.add(agent)

    // Force initial path calculation
    app.on('update', (delta) => {
        const player = world.getPlayer()
        if (!player) return

        const dx = player.position.x - agent.position.x
        const dz = player.position.z - agent.position.z
        const dist = Math.sqrt(dx * dx + dz * dz)

        // Update path on a timer instead of every frame
        agentState.pathUpdateTimer += delta
        
        // Recalculate path if timer expired, path is empty, or we've reached the end of the current path
        const needsPathUpdate = agentState.pathUpdateTimer >= agentState.pathUpdateInterval || 
                               agentState.path.length === 0 ||
                               (agentState.path.length > 0 && agentState.pathIndex >= agentState.path.length)
        
        if (needsPathUpdate) {
            agentState.pathUpdateTimer = 0
            
            // Only recalculate path if player has moved significantly
            const playerPos = player.position
            if (!agentState.lastPlayerPos || 
                Math.abs(playerPos.x - agentState.lastPlayerPos.x) > CONFIG.CELL_SIZE || 
                Math.abs(playerPos.z - agentState.lastPlayerPos.z) > CONFIG.CELL_SIZE ||
                agentState.path.length === 0 ||
                agentState.pathIndex >= agentState.path.length) {
                
                // Get position at agent's feet
                const agentGroundPos = {
                    x: agent.position.x,
                    y: agent.position.y - CONFIG.AGENT_SCALE/2,
                    z: agent.position.z
                }
                const agentNavPoint = app.findNearestNavMeshPoint(agentGroundPos)
                
                // Raycast to find player's ground position
                const playerRayOrigin = new Vector3(player.position.x, player.position.y, player.position.z)
                const playerRayDirection = new Vector3(0, -1, 0)
                const playerGroundHit = world.raycast(playerRayOrigin, playerRayDirection, CONFIG.MAX_HEIGHT)
                
                // Use raycast result if available, otherwise use player's current position
                const playerGroundPos = playerGroundHit ? 
                    { x: playerGroundHit.point.x, y: playerGroundHit.point.y, z: playerGroundHit.point.z } : 
                    player.position
                
                const playerNavPoint = app.findNearestNavMeshPoint(playerGroundPos)
                
                if (agentNavPoint && playerNavPoint) {
                    const newPath = app.findPath(agentNavPoint, playerNavPoint)
                    if (newPath && newPath.length > 0) {
                        // Ensure we're not getting a path that immediately sends us backward
                        agentState.path = newPath
                        agentState.pathIndex = 0
                    } else {
                        // If no valid path is found, stay in place
                        agentState.path = [agentNavPoint]
                        agentState.pathIndex = 0
                    }
                } else {
                    // If we can't find valid nav points, don't update the path
                    // This prevents random wandering when player jumps
                    if (agentState.path.length === 0) {
                        // Only if we have no path at all, create a single-point path to stay in place
                        agentState.path = [agentGroundPos]
                        agentState.pathIndex = 0
                    }
                }
                
                // Store current player position
                agentState.lastPlayerPos = {x: playerPos.x, y: playerPos.y, z: playerPos.z}
            }
        }

        // Stop following if we're too close to player
        if (dist < CONFIG.MIN_FOLLOW_DISTANCE) {
            // Just pause in place rather than clearing the path
            return
        }

        // Only move if we have a valid path with at least one point
        if (agentState.path.length > 0 && agentState.pathIndex < agentState.path.length) {
            const target = agentState.path[agentState.pathIndex]
            
            // Debug check for zero coordinates
            if (target.x === 0 && target.z === 0) {
                console.log("WARNING: Agent targeting position (0,0)", target);
                console.log("Current path:", agentState.path);
                console.log("Current agent position:", agent.position);
            }
            
            const tdx = target.x - agent.position.x
            const tdz = target.z - agent.position.z
            const targetDist = Math.sqrt(tdx * tdx + tdz * tdz)

            // Move to next waypoint when close enough
            if (targetDist < CONFIG.CELL_SIZE * 0.5) {
                agentState.pathIndex++
            } else {
                const speed = CONFIG.AGENT_SPEED * delta
                const moveX = (tdx / targetDist) * speed
                const moveZ = (tdz / targetDist) * speed

                // Update horizontal position
                agent.position.x += moveX
                agent.position.z += moveZ
                
                // Create a raycast from above the agent's new position
                const origin = new Vector3(
                    agent.position.x, 
                    agent.position.y + CONFIG.MAX_HEIGHT, 
                    agent.position.z
                )
                const direction = new Vector3(0, -1, 0)
                const hit = world.raycast(origin, direction, CONFIG.MAX_HEIGHT * 2)
                
                if (hit) {
                    // Check if the height difference is within the allowed range
                    const heightDiff = Math.abs(hit.point.y - (agent.position.y - CONFIG.AGENT_SCALE/2))
                    if (heightDiff <= CONFIG.MAX_HEIGHT_DIFF) {
                        // Place agent directly on the surface with half its height as offset
                        agent.position.y = hit.point.y + CONFIG.AGENT_SCALE/2
                    }
                    // If height difference is too large, don't update the Y position
                } else {
                    // Fallback to navmesh if raycast fails
                    const nearestPoint = app.findNearestNavMeshPoint({
                        x: agent.position.x,
                        y: agent.position.y - CONFIG.AGENT_SCALE/2,
                        z: agent.position.z
                    })
                    
                    if (nearestPoint) {
                        const heightDiff = Math.abs(nearestPoint.y - (agent.position.y - CONFIG.AGENT_SCALE/2))
                        if (heightDiff <= CONFIG.MAX_HEIGHT_DIFF) {
                            agent.position.y = nearestPoint.y + CONFIG.AGENT_SCALE/2
                        }
                    }
                }
                
                // Calculate target rotation
                agentState.targetRotation = Math.atan2(tdx, tdz)
                
                // Smoothly interpolate rotation
                const rotationDiff = agentState.targetRotation - agentState.currentRotation
                
                // Normalize the angle difference to [-PI, PI]
                let normalizedDiff = rotationDiff
                while (normalizedDiff > Math.PI) normalizedDiff -= 2 * Math.PI
                while (normalizedDiff < -Math.PI) normalizedDiff += 2 * Math.PI
                
                // Apply smooth rotation with a turning speed factor
                const turnSpeed = 5.0 * delta
                agentState.currentRotation += normalizedDiff * Math.min(turnSpeed, 1.0)
                
                // Normalize current rotation
                while (agentState.currentRotation > Math.PI) agentState.currentRotation -= 2 * Math.PI
                while (agentState.currentRotation < -Math.PI) agentState.currentRotation += 2 * Math.PI
                
                // Apply the smoothed rotation
                agent.rotation.y = agentState.currentRotation
            }
        }
    })

    // Add helper functions in both server and client sections
    app.getGridCoords = (worldPos) => {
        const gridWorldSize = CONFIG.GRID_SIZE * CONFIG.CELL_SIZE
        const halfSize = gridWorldSize / 2
        const gridX = Math.floor((worldPos.x - (app.position.x - halfSize)) / CONFIG.CELL_SIZE)
        const gridZ = Math.floor((worldPos.z - (app.position.z - halfSize)) / CONFIG.CELL_SIZE)
        return { x: gridX, z: gridZ }
    }

    app.getNeighbors = (gridX, gridZ) => {
        const neighbors = []
        for (const dir of DIRECTIONS) {
            const newX = gridX + dir.x
            const newZ = gridZ + dir.z
            const neighbor = app.getNavMeshVertex(newX, newZ)
            if (neighbor) {
                const current = app.getNavMeshVertex(gridX, gridZ)
                // Check if height difference is walkable
                // For diagonal moves, we need to check both adjacent cells to ensure the ramp is traversable
                if (dir.x !== 0 && dir.z !== 0) {
                    // This is a diagonal move, check both adjacent cells
                    const neighborX = app.getNavMeshVertex(gridX + dir.x, gridZ)
                    const neighborZ = app.getNavMeshVertex(gridX, gridZ + dir.z)
                    
                    // Only allow diagonal if at least one of the adjacent cells is walkable
                    if ((neighborX && Math.abs(neighborX.y - current.y) <= CONFIG.MAX_HEIGHT_DIFF) ||
                        (neighborZ && Math.abs(neighborZ.y - current.y) <= CONFIG.MAX_HEIGHT_DIFF)) {
                        // And the diagonal itself is within height limits
                        if (Math.abs(neighbor.y - current.y) <= CONFIG.MAX_HEIGHT_DIFF) {
                            neighbors.push({x: newX, z: newZ})
                        }
                    }
                } else {
                    // Straight move, just check height difference
                    if (Math.abs(neighbor.y - current.y) <= CONFIG.MAX_HEIGHT_DIFF) {
                        neighbors.push({x: newX, z: newZ})
                    }
                }
            }
        }
        return neighbors
    }

    app.findPath = (startPos, endPos) => {
        const startGrid = app.getGridCoords(startPos)
        const endGrid = app.getGridCoords(endPos)
        
        // Early exit for very short paths
        if (Math.abs(startGrid.x - endGrid.x) <= 1 && Math.abs(startGrid.z - endGrid.z) <= 1) {
            return [startPos, endPos]
        }
        
        // Limit search space for performance
        const maxNodes = 100
        let nodesExplored = 0
        
        const openSet = new Set([`${startGrid.x},${startGrid.z}`])
        const cameFrom = new Map()
        const gScore = new Map()
        const fScore = new Map()
        
        gScore.set(`${startGrid.x},${startGrid.z}`, 0)
        fScore.set(`${startGrid.x},${startGrid.z}`, app.heuristic(startGrid, endGrid))
        
        while (openSet.size > 0 && nodesExplored < maxNodes) {
            nodesExplored++
            let current = app.getLowestFScore(openSet, fScore)
            if (current.x === endGrid.x && current.z === endGrid.z) {
                return app.reconstructPath(cameFrom, current)
            }
            
            openSet.delete(`${current.x},${current.z}`)
            
            for (const neighbor of app.getNeighbors(current.x, current.z)) {
                const tentativeGScore = gScore.get(`${current.x},${current.z}`) + 1
                
                if (!gScore.has(`${neighbor.x},${neighbor.z}`) || 
                    tentativeGScore < gScore.get(`${neighbor.x},${neighbor.z}`)) {
                    cameFrom.set(`${neighbor.x},${neighbor.z}`, current)
                    gScore.set(`${neighbor.x},${neighbor.z}`, tentativeGScore)
                    fScore.set(`${neighbor.x},${neighbor.z}`, 
                        tentativeGScore + app.heuristic(neighbor, endGrid))
                    openSet.add(`${neighbor.x},${neighbor.z}`)
                }
            }
        }
        
        // If we hit the node limit, return the best path we have so far
        if (nodesExplored >= maxNodes) {
            let closest = null
            let minDist = Infinity
            
            for (const key of gScore.keys()) {
                const [x, z] = key.split(',').map(Number)
                const dist = app.heuristic({x, z}, endGrid)
                if (dist < minDist) {
                    minDist = dist
                    closest = {x, z}
                }
            }
            
            if (closest) {
                return app.reconstructPath(cameFrom, closest)
            }
        }
        
        return null
    }

    app.heuristic = (a, b) => {
        return Math.abs(a.x - b.x) + Math.abs(a.z - b.z)
    }

    app.getLowestFScore = (openSet, fScore) => {
        let lowest = Infinity
        let lowestPos = null
        for (const pos of openSet) {
            const [x, z] = pos.split(',').map(Number)
            const score = fScore.get(pos)
            if (score < lowest) {
                lowest = score
                lowestPos = {x, z}
            }
        }
        return lowestPos
    }

    app.reconstructPath = (cameFrom, current) => {
        const path = [app.getNavMeshVertex(current.x, current.z)]
        while (cameFrom.has(`${current.x},${current.z}`)) {
            current = cameFrom.get(`${current.x},${current.z}`)
            path.unshift(app.getNavMeshVertex(current.x, current.z))
        }
        return path
    }
} 