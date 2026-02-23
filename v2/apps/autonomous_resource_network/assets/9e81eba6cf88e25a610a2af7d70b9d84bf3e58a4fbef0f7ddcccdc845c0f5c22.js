const player = world.getPlayer()
const PING_RADIUS = 5

// Station type configurations
const STATION_CONFIG = {
  type: 'mine',      // Change to 'mine', 'refinery', or 'storage'
  baseStats: {
    mine: {
      processTime: 5000,
      moveSpeed: 0.01,
      moveRange: 3,
      capacity: 5,
      xpPerResource: 10
    },
    refinery: {
      processTime: 3000,
      moveSpeed: 0.015,
      moveRange: 2,
      capacity: 8,
      xpPerResource: 15
    },
    storage: {
      processTime: 1000,
      moveSpeed: 0.02,
      moveRange: 1,
      capacity: 15,
      xpPerResource: 5
    }
  },
  levelBonuses: {
    processTimeReduction: 0.1,  // 10% faster per level
    capacityIncrease: 2,       // +2 capacity per level
    speedIncrease: 0.005       // Speed increase per level
  }
}

// Smart object state management
const objectState = {
  type: STATION_CONFIG.type,
  status: 'moving',
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  totalResourcesProcessed: 0,
  currentUser: null,
  actionStartTime: 0,
  nearbyObjects: [],
  resources: 0,
  maxResources: STATION_CONFIG.baseStats[STATION_CONFIG.type].capacity,
  resourceType: STATION_CONFIG.type === 'mine' ? 'ore' : 
                STATION_CONFIG.type === 'refinery' ? 'metal' : 'product',
  movement: {
    direction: 1,
    speed: STATION_CONFIG.baseStats[STATION_CONFIG.type].moveSpeed,
    range: STATION_CONFIG.baseStats[STATION_CONFIG.type].moveRange,
    startPos: app.position.x,
    atDestination: false
  }
}

// Get current process time based on level
function getCurrentProcessTime() {
  const baseTime = STATION_CONFIG.baseStats[objectState.type].processTime
  const reduction = (objectState.level - 1) * STATION_CONFIG.levelBonuses.processTimeReduction
  return baseTime * (1 - reduction)
}

// Level up function
function levelUp() {
  objectState.level++
  objectState.xp = 0
  objectState.xpToNextLevel *= 1.5
  
  // Apply level bonuses
  objectState.maxResources += STATION_CONFIG.levelBonuses.capacityIncrease
  objectState.movement.speed += STATION_CONFIG.levelBonuses.speedIncrease
  
  updateStatusText(`LEVEL UP! Now level ${objectState.level}`)
}

// Inverted grayscale colors
const COLORS = {
  background: '#FFFFFF',    
  available: '#202020',     
  in_use: '#404040',       
  communicating: '#606060', 
  completing: '#808080',    
  text: '#FFFFFF'          
}

// UI Setup
const hoverUI = app.create('ui')
hoverUI.backgroundColor = COLORS.background
hoverUI.width = 300
hoverUI.flexDirection = 'column'
hoverUI.height = 250  // Increased for level display
hoverUI.position.y = 4
app.add(hoverUI)

// Status display
const statusContainer = app.create('uiview')
statusContainer.width = 300
statusContainer.height = 75
statusContainer.backgroundColor = COLORS.available
statusContainer.justifyContent = 'center'
statusContainer.alignItems = 'center'
hoverUI.add(statusContainer)

const statusText = app.create('uitext', {
  padding: 4,
  textAlign: 'center',
  color: COLORS.text,
  value: `${objectState.type} (Level ${objectState.level})`
})
statusContainer.add(statusText)

// Level display
const levelContainer = app.create('uiview')
levelContainer.width = 300
levelContainer.height = 75
levelContainer.backgroundColor = COLORS.communicating
levelContainer.justifyContent = 'center'
levelContainer.alignItems = 'center'
hoverUI.add(levelContainer)

const levelText = app.create('uitext', {
  padding: 4,
  textAlign: 'center',
  color: COLORS.text,
  value: `XP: ${objectState.xp}/${objectState.xpToNextLevel}`
})
levelContainer.add(levelText)

// Progress display
const progressContainer = app.create('uiview')
progressContainer.width = 300
progressContainer.height = 75
progressContainer.backgroundColor = COLORS.available
progressContainer.justifyContent = 'center'
progressContainer.alignItems = 'center'
hoverUI.add(progressContainer)

const progressText = app.create('uitext', {
  padding: 4,
  textAlign: 'center',
  color: COLORS.text,
  value: 'Moving'
})
progressContainer.add(progressText)

function updateStatusText(message) {
  statusText.value = `${objectState.type} (Level ${objectState.level})\n${objectState.resources}/${objectState.maxResources} ${objectState.resourceType}`
  levelText.value = `XP: ${Math.floor(objectState.xp)}/${Math.floor(objectState.xpToNextLevel)}`
}

// Resource transfer logic
function canTransferTo(targetType) {
  if (objectState.type === 'mine' && targetType === 'refinery') return true
  if (objectState.type === 'refinery' && targetType === 'storage') return true
  return false
}

// Check for nearby stations automatically
function checkNearbyStations() {
  world.emit('proximity-check', {
    instanceId: app.instanceId,
    position: app.position,
    type: objectState.type,
    status: objectState.status
  })
}

// Update loop
app.on('update', delta => {
  // Handle movement
  if (objectState.status === 'moving') {
    const moveAmount = objectState.movement.speed * objectState.movement.direction
    app.position.x += moveAmount
    
    if (Math.abs(app.position.x - objectState.movement.startPos) >= objectState.movement.range) {
      if (!objectState.movement.atDestination) {
        objectState.movement.atDestination = true
        objectState.status = 'processing'
        objectState.actionStartTime = Date.now()
        progressText.value = `Processing: 0%`
      }
    }
  }
  
  // Handle processing
  if (objectState.status === 'processing') {
    const elapsedTime = Date.now() - objectState.actionStartTime
    const processTime = getCurrentProcessTime()
    
    if (elapsedTime >= processTime) {
      if (objectState.type === 'mine' && objectState.resources < objectState.maxResources) {
        objectState.resources++
        objectState.totalResourcesProcessed++
        
        // Add XP for processing
        objectState.xp += STATION_CONFIG.baseStats[objectState.type].xpPerResource
        if (objectState.xp >= objectState.xpToNextLevel) {
          levelUp()
        }
      }
      
      checkNearbyStations()
      
      objectState.status = 'moving'
      objectState.movement.direction *= -1
      objectState.movement.atDestination = false
      progressText.value = 'Returning'
      
      updateStatusText()
    } else {
      const progress = Math.floor((elapsedTime / processTime) * 100)
      progressText.value = `Processing: ${progress}%`
    }
  }
  
  updateStatusText()
})

// Handle resource transfers
world.on('resource-transfer', (info) => {
  if (info.to === app.instanceId && objectState.resources < objectState.maxResources) {
    objectState.resources++
    objectState.totalResourcesProcessed++
    
    // Add XP for processing transferred resources
    objectState.xp += STATION_CONFIG.baseStats[objectState.type].xpPerResource
    if (objectState.xp >= objectState.xpToNextLevel) {
      levelUp()
    }
    
    updateStatusText()
  }
})

// Listen for proximity checks
world.on('proximity-check', (info) => {
  if (info.instanceId !== app.instanceId) {
    const dx = info.position.x - app.position.x
    const dy = info.position.y - app.position.y
    const dz = info.position.z - app.position.z
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz)
    
    if (distance <= PING_RADIUS && objectState.resources > 0) {
      if (canTransferTo(info.type)) {
        world.emit('resource-transfer', {
          from: app.instanceId,
          to: info.instanceId,
          amount: 1,
          type: objectState.resourceType
        })
        objectState.resources--
        updateStatusText()
      }
    }
  }
})