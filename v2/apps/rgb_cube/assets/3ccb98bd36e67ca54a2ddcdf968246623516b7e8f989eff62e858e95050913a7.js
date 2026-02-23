// Smooth texture scrolling for Hyperfy - clean version
// Texture scrolling effect for Hyperfy materials

// Create audio elements for reactivity
let audioReactive = false
let audioIntensity = 0
let audioNode = null
let lastReactivityState = false

// Configure controls for all effects
app.configure(() => [
  // TEXTURE SCROLLING CONTROLS
  {
    key: 'section1',
    type: 'section',
    label: 'Texture Scrolling'
  },
  {
    key: 'speedX',
    type: 'number',
    label: 'X Speed (÷10)',
    min: -20,
    max: 20,
    step: 1,
    initial: 2
  },
  {
    key: 'speedY',
    type: 'number',
    label: 'Y Speed (÷10)',
    min: -20,
    max: 20,
    step: 1,
    initial: 5
  },
  {
    key: 'reset',
    type: 'switch',
    label: 'Reset Texture',
    options: [
      { label: 'No', value: 0 },
      { label: 'Yes', value: 1 }
    ],
    initial: 0
  },
  
  // EMISSION GLOW CONTROLS
  {
    key: 'section2',
    type: 'section',
    label: 'Emission Glow'
  },
  {
    key: 'glowMode',
    type: 'switch',
    label: 'Glow Mode',
    options: [
      { label: 'Static', value: 'static' },
      { label: 'Pulse', value: 'pulse' },
      { label: 'Audio', value: 'audio' }
    ],
    initial: 'static'
  },
  {
    key: 'glowIntensity',
    type: 'number',
    label: 'Glow Intensity (÷10)',
    min: 0,
    max: 100,
    step: 1,
    initial: 10
  },
  {
    key: 'pulseMin',
    type: 'number',
    label: 'Pulse Min (÷10)',
    min: 0,
    max: 50,
    step: 1,
    initial: 5
  },
  {
    key: 'pulseMax',
    type: 'number',
    label: 'Pulse Max (÷10)',
    min: 1,
    max: 100,
    step: 1,
    initial: 20
  },
  {
    key: 'pulseSpeed',
    type: 'number',
    label: 'Pulse Speed (÷10)',
    min: 1,
    max: 50,
    step: 1,
    initial: 10
  },
  
  // AUDIO REACTIVITY CONTROLS
  {
    key: 'section3',
    type: 'section',
    label: 'Audio Reactivity'
  },
  {
    key: 'audioSource',
    type: 'file',
    kind: 'audio',
    label: 'Audio Source'
  },
  {
    key: 'audioReactive',
    type: 'switch',
    label: 'Audio Reactive',
    options: [
      { label: 'Off', value: 0 },
      { label: 'On', value: 1 }
    ],
    initial: 0
  },
  {
    key: 'audioVolume',
    type: 'number',
    label: 'Audio Volume (%)',
    min: 0,
    max: 100,
    step: 1,
    initial: 100
  },
  {
    key: 'audioScaleGlow',
    type: 'number',
    label: 'Audio Glow Scale (÷10)',
    min: 1,
    max: 100,
    step: 1,
    initial: 50    // Increased for more dramatic effect
  },
  {
    key: 'audioScaleSpeed',
    type: 'number',
    label: 'Audio Speed Scale (÷10)',
    min: 0,
    max: 100,
    step: 1,
    initial: 40    // Increased for more dramatic effect
  },
  
  // MISC CONTROLS
  {
    key: 'section4',
    type: 'section',
    label: 'Other Effects'
  },
  {
    key: 'rotate',
    type: 'switch',
    label: 'Rotation',
    options: [
      { label: 'Off', value: 0 },
      { label: 'On', value: 1 }
    ],
    initial: 0
  }
])

// Simple pseudo-random function that doesn't use Math.random()
// Takes a seed and returns a value between 0 and 1
function pseudoRandom(seed) {
  // Simple deterministic hash function
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// Track if we need to reset and other effect variables
let needsReset = false
let pulseTime = 0
let prevAudioSrc = ''
let noiseValues = [0.3, 0.5, 0.7, 0.4, 0.6] // Fixed values instead of random
let noiseIndex = 0
let noiseClock = 0
let logCounter = 0

// Handle configuration changes
app.on('config', () => {
  // Handle texture reset request
  if (app.config.reset === 1) {
    needsReset = true
  }
  
  // Setup the audio based on the current config
  setupAudio()
  
  // Update audio reactive state
  audioReactive = app.config.audioReactive === 1
  
  // Log when audio reactivity state changes
  if (lastReactivityState !== audioReactive) {
    console.log(`Audio reactivity set to: ${audioReactive ? 'ON' : 'OFF'}`)
    lastReactivityState = audioReactive
  }
})

// Initial setup
if (world.isClient) {
  setupAudio()
}

// Function to set up audio for reactivity
function setupAudio() {
  // Clean up any existing audio
  if (audioNode) {
    audioNode.stop()
    app.remove(audioNode)
    audioNode = null
  }
  
  // Only proceed if audio source is configured
  if (!app.config.audioSource?.url) {
    console.log('No audio source provided')
    return
  }
  
  // Get the current audio URL and volume
  const audioSrc = app.config.audioSource.url
  const volume = (app.config.audioVolume || 100) / 100
  
  console.log('Setting up audio source:', audioSrc)
  console.log('Audio volume:', volume)
  
  // Create an audio node with all settings at once - exactly like campfire script
  audioNode = app.create('audio', {
    src: audioSrc,
    volume: volume,
    spatial: false,
    loop: true,
    group: 'music'
  })
  
  // Add the audio node to the scene
  app.add(audioNode)
  
  // Start playing the sound immediately
  audioNode.play()
  
  console.log('Audio setup complete')
}

// Helper to simulate audio reactivity
// This creates a more complex wave pattern to simulate real audio fluctuations
function getAudioReactiveValue(delta) {
  // Update noise values occasionally for variation
  noiseClock += delta
  if (noiseClock > 0.2) {
    noiseClock = 0
    noiseIndex = (noiseIndex + 1) % noiseValues.length
    // Use our deterministic pseudo-random function instead of Math.random()
    noiseValues[noiseIndex] = pseudoRandom(Date.now() * 0.001 + noiseIndex)
  }
  
  // Main base rhythm (slower component)
  const baseRhythm = (Math.sin(Date.now() / 800) + 1) / 2
  
  // Fast modulation (faster component)
  const fastModulation = (Math.sin(Date.now() / 200) + 1) / 2
  
  // Noise component for realism
  const noiseComponent = noiseValues[noiseIndex] * 0.3
  
  // Combine for final value (0-1 range)
  audioIntensity = baseRhythm * 0.6 + fastModulation * 0.3 + noiseComponent
  
  // Ensure value stays in 0-1 range
  audioIntensity = Math.max(0, Math.min(1, audioIntensity))
  
  return audioIntensity
}

// Update function with texture animation, glow effects, and audio reactivity
app.on('update', delta => {  
  // Get reference to target each frame
  const target = app.get('RGBBlock')
  
  // Update audio reactive value if enabled
  let audioValue = 0
  if (audioReactive) {
    audioValue = getAudioReactiveValue(delta)
  }
  
  // Apply effects if target exists
  if (target && target.material) {
    // Reset texture position if requested
    if (needsReset) {
      target.material.textureX = 0
      target.material.textureY = 0
      needsReset = false
    }
    
    // --- TEXTURE SCROLLING ---
    // Get base speed values
    let xSpeed = (app.config.speedX || 0) / 10
    let ySpeed = (app.config.speedY || 0) / 10
    
    // Apply audio reactivity to speed if enabled
    if (audioReactive) {
      const audioSpeedScale = (app.config.audioScaleSpeed || 0) / 10
      
      // Make speed changes more dramatic by squaring the audio value (more contrast)
      const scaledAudio = audioValue * audioValue * 1.5
      
      xSpeed += scaledAudio * audioSpeedScale
      ySpeed += scaledAudio * audioSpeedScale
    }
    
    // Apply texture scrolling
    if (xSpeed !== 0) {
      target.material.textureX -= xSpeed * delta
    }
    
    if (ySpeed !== 0) {
      target.material.textureY -= ySpeed * delta
    }
    
    // --- EMISSION GLOW ---
    // Handle emission glow effects based on mode
    const glowMode = app.config.glowMode || 'static'
    
    if (glowMode === 'static') {
      // Static glow - scale down by 10 for fine control
      const intensity = (app.config.glowIntensity || 10) / 10
      target.material.emissiveIntensity = intensity
    }
    else if (glowMode === 'pulse') {
      // Pulsing glow - scale down by 10 for fine control
      const minGlow = (app.config.pulseMin || 5) / 10
      const maxGlow = (app.config.pulseMax || 20) / 10
      const pulseSpeed = (app.config.pulseSpeed || 10) / 10
      
      // Update pulse time
      pulseTime += delta * pulseSpeed
      
      // Calculate glow using sine wave (0-1)
      const pulseValue = (Math.sin(pulseTime * Math.PI) + 1) / 2
      
      // Map to min-max range
      const currentGlow = minGlow + pulseValue * (maxGlow - minGlow)
      
      // Apply to material
      target.material.emissiveIntensity = currentGlow
    }
    else if (glowMode === 'audio') {
      // Audio reactive glow
      const minGlow = (app.config.pulseMin || 5) / 10
      const audioGlowScale = (app.config.audioScaleGlow || 30) / 10
      
      // Calculate audio-based glow intensity
      let audioGlow = minGlow
      
      if (audioReactive) {
        // Square the audio value for more dramatic changes in brightness
        const scaledAudio = audioValue * audioValue * 1.5
        audioGlow += scaledAudio * audioGlowScale
        
        // Log occasional debug info about glow changes
        logCounter++
        if (logCounter % 100 === 0) { // Log every 100 frames instead of using Math.random
          console.log(`Audio reactive glow: ${audioGlow.toFixed(2)} (raw audio: ${audioValue.toFixed(2)})`)
        }
      }
      
      // Apply to material
      target.material.emissiveIntensity = audioGlow
    }
    
    // --- ROTATION ---
    // Optional rotation for visual confirmation
    if (app.config.rotate === 1) {
      target.rotation.y += 0.5 * delta
    }
    
    // Force material update
    target.material.needsUpdate = true
  }
}) 