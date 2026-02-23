// Minimal rifle pickup script
app.configure([
  {
    key: 'modelName',
    type: 'text',
    label: 'Model Name',
    value: 'LaserRifle_phong2_0'
  },
  {
    key: 'posX',
    type: 'number',
    label: 'Position X',
    value: 0.03,
    min: -0.5,
    max: 0.5,
    step: 0.01
  },
  {
    key: 'posY',
    type: 'number',
    label: 'Position Y',
    value: -0.1,
    min: -0.5,
    max: 0.5,
    step: 0.01
  },
  {
    key: 'posZ',
    type: 'number',
    label: 'Position Z',
    value: -0.05,
    min: -0.5,
    max: 0.5,
    step: 0.01
  }
])

// Position offset
const POSITION_OFFSET = {
  x: app.config.posX ?? 0.03,
  y: app.config.posY ?? -0.1,
  z: app.config.posZ ?? -0.05
}

// Get model name from config or use default
const modelName = app.config.modelName || 'LaserRifle_phong2_0'

// Try to get the rifle object
const rifle = app.get(modelName)

// Check if rifle exists
if (!rifle) {
  console.log(`[RIFLE SCRIPT] Could not find object named "${modelName}". Please check your model names.`)
  return // Exit the script if rifle not found
}

// Control variable for when rifle is equipped
let control

// Create pickup action
const action = app.create('action', {
  label: '[ EQUIP RIFLE ]',
  onTrigger: e => {
    // Equip rifle
    action.active = false
    control = app.control()
  }
})

// Attach rifle to world and add action
if (rifle) {
  world.attach(rifle)
  rifle.add(action)
  
  // Position the action for better visibility
  action.position.set(0, 0.5, 0)
}

// Update loop for unequipping
app.on('update', delta => {
  if (control && rifle) {
    // Unequip with Q key
    if (control.keyQ?.pressed) {
      try {
        // Unequip rifle
        action.active = true
        control.release()
        control = null
      } catch (err) {
        console.log('[RIFLE SCRIPT] Error unequipping rifle:', err)
      }
    }
  }
})

// Update position offset when config changes
app.on('config', () => {
  POSITION_OFFSET.x = app.config.posX ?? POSITION_OFFSET.x
  POSITION_OFFSET.y = app.config.posY ?? POSITION_OFFSET.y
  POSITION_OFFSET.z = app.config.posZ ?? POSITION_OFFSET.z
})

// Basic attachment to hand
app.on('lateUpdate', delta => {
  if (!control || !rifle) return
  
  try {
    const player = world.getPlayer()
    if (!player) return
    
    const matrix = player.getBoneTransform('rightHand')
    if (!matrix) return
    
    // Set position from the hand matrix
    rifle.position.setFromMatrixPosition(matrix)
    
    // Apply position offsets
    rifle.position.x += POSITION_OFFSET.x
    rifle.position.y += POSITION_OFFSET.y
    rifle.position.z += POSITION_OFFSET.z
    
    // Set rotation directly from the hand matrix
    rifle.quaternion.setFromRotationMatrix(matrix)
    
  } catch (err) {
    console.log('[RIFLE SCRIPT] Error in lateUpdate:', err)
  }
})


