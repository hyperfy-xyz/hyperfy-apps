/**
 * Fireworks - Hyperfy App
 * Creates a screenspace UI button for triggering fireworks
 * 
 * @author Assistant
 * @license MIT
 */

// Initialize app state
if (!app.state.fireworks) {
    app.state.fireworks = []
  }
  
  // Create the main UI container
  const fireworksUI = app.create('ui', {
    width: 60,
    height: 40,
    res: 2,
    position: [1, 0, 0], // Top right corner
    offset: [-20, 80, 0], // 120px from right edge, 20px from top
    space: 'screen',
    pivot: 'top-right',
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    borderRadius: 10,
    borderColor: '#ffffff',
    borderWidth: 2,
    padding: 10,
    pointerEvents: true, // Enable pointer events
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  })
  
  // Create the "FIRE" text
const fireText = app.create('uitext', {
  value: 'FIRE',
  fontSize: 18,
  fontWeight: 'bold',
  color: '#ffffff',
  textAlign: 'center',
})

fireworksUI.add(fireText)

// Add UI to the app
app.add(fireworksUI)

// Fire function (client-side)
function fireFireworks() {
  console.log('FIRE button clicked!')
  
  if (world.isClient) {
    // Send fire command to server
    app.send('fire', {})
  }
}

// Mouse down effect
function onPointerDown() {
  fireworksUI.borderColor = '#000000' // Black border on mouse down
  fireFireworks()
}

// Mouse up effect
function onPointerUp() {
  fireworksUI.borderColor = '#ffffff' // White border on mouse up
}

// Hover effects
function onPointerEnter() {
  fireText.color = '#000000' // Black on hover
}

function onPointerLeave() {
  fireText.color = '#ffffff' // White when not hovering
}

// Add event handlers
fireworksUI.onPointerDown = onPointerDown
fireworksUI.onPointerUp = onPointerUp
fireworksUI.onPointerEnter = onPointerEnter
fireworksUI.onPointerLeave = onPointerLeave



if (world.isClient) {
  const items = new Set()
  const v1 = new Vector3()
  
  app.on('item', item => {
    console.log('Firework spawned!')
    item.trail = app.create('particles', {
      shape: ['sphere', 0.5, 1],
      direction: 1,
      rate: 0,
      color: 'orange',
      rateOverDistance: 10,
      life: '0~1',
      size: '0.1~0.5',
      alphaOverLife: '0,1|1,0',
      emissive: '10'
    })
    item.trail.position.fromArray(item.start)
    item.direction = new Vector3().fromArray(item.direction)
    item.travel = 0
    item.phase = 'rise'
    item.isFirst = item.isFirst !== false // Default to true for first firework
    items.add(item)
    world.add(item.trail)
  })
  
  app.on('update', delta => {
    for (const item of items) {
      if (item.phase === 'rise') {
        const distance = 100 * delta
        v1.copy(item.direction).multiplyScalar(distance)
        item.trail.position.add(v1)
        item.trail.rotation.y += 45 * DEG2RAD * delta
        item.travel += distance
        if (item.travel >= item.distance) {
          item.phase = 'hit'
          item.timer = 0
          item.explosion = app.create('particles', {
            shape: ['sphere', 0.5, 1],
            direction: 1,
            rate: 0,
            max: 200,
            bursts: [
              { time: 0, count: 200 }
            ],
            color: 'orange',
            size: '0.1~0.5',
            alphaOverLife: '0,1|1,0',
            emissive: '10',
            speed: '4~10',
            force: new Vector3(0, -20, 0)
          })
          item.explosion.position.copy(item.trail.position)
          world.add(item.explosion)
          
          // If this is the first firework, spawn a second one from the explosion point
          if (item.isFirst) {
            // Send command to server to spawn second firework
            app.send('spawnSecond', {
              position: [item.trail.position.x, item.trail.position.y, item.trail.position.z]
            })
          }
          // If this is a second firework that should trigger tertiary fireworks
          else if (!item.isFirst && item.willTriggerTertiary) {
            // Send command to server to spawn tertiary fireworks
            app.send('spawnTertiary', {
              position: [item.trail.position.x, item.trail.position.y, item.trail.position.z]
            })
          }
        }
      }
      if (item.phase === 'hit') {
        item.timer += delta
        if (item.timer > 3) {
          world.remove(item.trail)
          world.remove(item.explosion)
          items.delete(item)  
        }
      }
    }
  })
}

// Initialize the app
if (world.isClient) {
  // Client-side initialization
}
  
  if (world.isServer) {
  // Handle fire command from clients
  app.on('fire', () => {
    console.log('Server received fire command!')
    
    // Create firework data
    const item = {}
    // Get the app's actual position in the world
    const appPosition = app.position
    item.start = [appPosition.x, appPosition.y, appPosition.z] // Start from app's actual position
    
    // Add slight random angle (0-15 degrees) to the upward direction
    const randomAngle = (Math.random() * 15) * (Math.PI / 180) // Convert degrees to radians
    const randomDirection = Math.random() * Math.PI * 2 // Random horizontal direction
    
    item.direction = [
      Math.sin(randomDirection) * Math.sin(randomAngle), // X component
      Math.cos(randomAngle), // Y component (mostly up, with slight variation)
      Math.cos(randomDirection) * Math.sin(randomAngle)  // Z component
    ]
    
    item.distance = Math.random() * 50 + 30 // Random height between 30-80 units
    item.isFirst = true // Mark as first firework
    
    // Send to all clients
    app.send('item', item)
  })
  
  // Handle second firework spawn
  app.on('spawnSecond', data => {
    console.log('Server spawning multiple second fireworks!')
    
    // Generate random number of fireworks (5-20)
    const numFireworks = Math.floor(Math.random() * 16) + 5 // 5 to 20
    
    // Determine how many will trigger tertiary fireworks (1-4)
    const numTertiaryTriggers = Math.floor(Math.random() * 4) + 1 // 1 to 4
    
    // Spawn multiple fireworks in random directions
    for (let i = 0; i < numFireworks; i++) {
      // Create random direction for each firework
      const angleX = (Math.random() - 0.5) * Math.PI // Random angle -90 to +90 degrees
      const angleY = Math.random() * Math.PI * 2 // Random angle 0 to 360 degrees
      
      const direction = [
        Math.sin(angleY) * Math.cos(angleX), // X component
        Math.sin(angleX), // Y component (up/down)
        Math.cos(angleY) * Math.cos(angleX)  // Z component
      ]
      
      // Create firework data
      const item = {}
      item.start = data.position // Start from explosion position
      item.direction = direction // Random direction
      item.distance = 30 // Go 30 units in random direction
      item.isFirst = false // Mark as second firework
      item.willTriggerTertiary = i < numTertiaryTriggers // Only first 1-4 will trigger tertiary
      
      // Send to all clients
      app.send('item', item)
    }
  })
  
  // Handle tertiary firework spawn
  app.on('spawnTertiary', data => {
    console.log('Server spawning tertiary fireworks!')
    
    // Always spawn exactly 3 tertiary fireworks
    const numFireworks = 3
    
    // Spawn multiple fireworks in random directions
    for (let i = 0; i < numFireworks; i++) {
      // Create random direction for each firework
      const angleX = (Math.random() - 0.5) * Math.PI // Random angle -90 to +90 degrees
      const angleY = Math.random() * Math.PI * 2 // Random angle 0 to 360 degrees
      
      const direction = [
        Math.sin(angleY) * Math.cos(angleX), // X component
        Math.sin(angleX), // Y component (up/down)
        Math.cos(angleY) * Math.cos(angleX)  // Z component
      ]
      
      // Create firework data
      const item = {}
      item.start = data.position // Start from explosion position
      item.direction = direction // Random direction
      item.distance = 15 // Shorter distance for tertiary fireworks
      item.isFirst = false // Mark as tertiary firework
      
      // Send to all clients
      app.send('item', item)
    }
  })
}
  
  // Cleanup function
  app.on('destroy', () => {
    // Cleanup code here if needed
  })
  