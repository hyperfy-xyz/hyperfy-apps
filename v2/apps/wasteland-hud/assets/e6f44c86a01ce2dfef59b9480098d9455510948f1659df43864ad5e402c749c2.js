// WastelandHUD.js - Fallout-style HUD components for Hyperfy

// Configure the app with audio options
app.configure([
  {
    key: 'textColor',
    type: 'color',
    label: 'HUD Text Color',
    initial: '#fcba03'
  }
])

// Create our own particle template instead of looking for an existing one
console.log('[WASTELAND-HUD] Initializing...')

// Configuration for the HUD
const CONFIG = {
  // Health & Radiation settings
  MAX_HEALTH: 100,
  MAX_RADIATION: 100,
  
  // UI Colors - Fallout style
  AMBER_COLOR: '#fcba03', // Fallout amber/gold color
  GREEN_COLOR: '#4caf50', // Healthy green
  YELLOW_COLOR: '#fcba03', // Warning yellow
  RED_COLOR: '#ff3333',   // Danger red
  RAD_GREEN: '#39ff14',   // Radiation green
  RAD_YELLOW: '#ffcc00',  // Low radiation
  RAD_ORANGE: '#ff9800',  // Medium radiation
  RAD_RED: '#ff5722',     // High radiation
}

if (world.isClient) {
  console.log('[WASTELAND-HUD] Initializing client-side HUD');
  
  // State tracking
  let radiationLevel = 0;
  let maxRadiationLevel = 100;
  let lastUpdateTime = 0;
  let capsAmount = 100; // Default starting caps
  let currentLocation = 'WASTELAND';
  let currentDirection = 'N';
  let lastLoggedRadLevel = 0; // Track last logged radiation level to reduce spam
  
  // Create health bar UI - Fallout style
  const healthBarContainer = app.create('ui', {
    width: 400,
    height: 40,
    res: 2,  // Higher resolution for sharper UI
    position: [0.5, 1, 1],  // Position at the bottom center
    offset: [0, -15, 0],  // Offset from the bottom edge
    space: 'screen',    // This makes it display on screen, not in world
    pivot: 'bottom-center',
    backgroundColor: 'rgba(0,0,0,0)', // Transparent background
    padding: 0,
    pointerEvents: false,
    flexDirection: 'column',
    gap: 4,
    alignItems: 'center',
  });
  
  // Create compact header for combined health/rad bar
  const healthHeaderContainer = app.create('uiview', {
    width: 400,
    height: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0)',
    marginBottom: 2,
  });
  
  // Left bracket
  const healthLeftBracket = app.create('uitext', {
    value: '[',
    fontSize: 14,
    color: CONFIG.AMBER_COLOR,
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    marginRight: 4,
  });
  
  // Create health symbol
  const healthSymbol = app.create('uitext', {
    value: '♥',
    fontSize: 14,
    color: CONFIG.RED_COLOR, // Red heart
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    marginRight: 4,
  });
  
  // Create health title
  const healthTitleText = app.create('uitext', {
    value: 'HP',
    fontSize: 12,
    fontWeight: 'bold',
    color: CONFIG.AMBER_COLOR,
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    marginRight: 12,
  });
  
  // Add percentage text
  const healthPercentText = app.create('uitext', {
    value: '100%',
    fontSize: 12,
    color: CONFIG.AMBER_COLOR,
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    marginRight: 4,
  });

  // Add radiation symbol to header
  const headerRadSymbol = app.create('uitext', {
    value: '☢',
    fontSize: 14,
    color: CONFIG.RAD_GREEN,
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    marginRight: 4,
  });
  
  // Add radiation percentage
  const headerRadPercentText = app.create('uitext', {
    value: '0%',
    fontSize: 12,
    color: CONFIG.AMBER_COLOR,
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    marginRight: 4,
  });
  
  // Right bracket
  const healthRightBracket = app.create('uitext', {
    value: ']',
    fontSize: 14,
    color: CONFIG.AMBER_COLOR,
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
  });
  
  // Add elements to header
  healthHeaderContainer.add(healthLeftBracket);
  healthHeaderContainer.add(healthSymbol);
  healthHeaderContainer.add(healthTitleText);
  healthHeaderContainer.add(healthPercentText);
  healthHeaderContainer.add(headerRadSymbol);
  healthHeaderContainer.add(headerRadPercentText);
  healthHeaderContainer.add(healthRightBracket);
  
  // Create combined health/rad bar background
  const healthBarBg = app.create('uiview', {
    width: 400,
    height: 20,
    backgroundColor: '#000000', // Solid black background
    borderColor: CONFIG.AMBER_COLOR,
    borderWidth: 1,
    borderRadius: 2,
    position: 'relative',
  });
  
  // Create the health bar (starts full)
  const healthBarFill = app.create('uiview', {
    width: 398, // Full width
    height: 18,
    backgroundColor: CONFIG.GREEN_COLOR,
    marginTop: 1,
    marginLeft: 1,
    borderRadius: 0,
  });
  
  // Create the radiation bar (starts empty, overlaid on health bar)
  const radBarFill = app.create('uiview', {
    width: 0, // Start at 0 width
    height: 18,
    backgroundColor: CONFIG.RAD_RED,
    marginTop: 1,
    position: 'absolute',
    right: 1, // Align to right side so it grows from right to left
    borderRadius: 0,
  });
  
  // Assemble the UI components
  healthBarBg.add(healthBarFill);
  healthBarBg.add(radBarFill);
  healthBarContainer.add(healthHeaderContainer);
  healthBarContainer.add(healthBarBg);
  
  // Add the combined health/rad bar to the app
  app.add(healthBarContainer);
  
  // Create compass UI - Fallout style
  const compassContainer = app.create('ui', {
    width: 400,
    height: 30,
    res: 2,  // Higher resolution for sharper UI
    position: [0.5, 0, 1],  // Position at the top center
    offset: [0, 15, 0],  // Offset from the top edge
    space: 'screen',    // This makes it display on screen, not in world
    pivot: 'top-center',
    backgroundColor: 'rgba(0,0,0,0)', // Transparent background
    padding: 0,
    pointerEvents: false,
    flexDirection: 'column',
    gap: 2,
    alignItems: 'center',
  });
  
  // Create compass bar
  const compassBarBg = app.create('uiview', {
    width: 400,
    height: 20,
    backgroundColor: '#000000', // Solid black background
    borderColor: CONFIG.AMBER_COLOR,
    borderWidth: 1,
    borderRadius: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  });
  
  // Create location container
  const locationContainer = app.create('uiview', {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0)',
    gap: 10,
  });
  
  // Create leading marker before location text
  const leadingMarker = app.create('uitext', {
    value: '▼',
    fontSize: 18, 
    color: '#fcba03',
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    marginRight: 10,
  });
  
  // Create location text
  const locationText = app.create('uitext', {
    value: currentLocation,
    fontSize: 14,
    fontWeight: 'bold',
    color: CONFIG.AMBER_COLOR,
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    marginRight: 5,
  });
  
  // Create direction text with cardinal direction
  const directionText = app.create('uitext', {
    value: currentDirection + '°',
    fontSize: 14,
    color: CONFIG.AMBER_COLOR,
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
  });
  
  // Create cardinal direction text
  const cardinalText = app.create('uitext', {
    value: 'N',
    fontSize: 14,
    fontWeight: 'bold',
    color: CONFIG.AMBER_COLOR,
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    marginLeft: 5,
  });
  
  // Create trailing marker after degree text
  const trailingMarker = app.create('uitext', {
    value: '▼',
    fontSize: 18,
    color: '#fcba03',
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    marginLeft: 10,
  });
  
  // Add elements to location container
  locationContainer.add(leadingMarker);
  locationContainer.add(locationText);
  locationContainer.add(directionText);
  locationContainer.add(cardinalText);
  locationContainer.add(trailingMarker);
  
  // Add location container to compass bar
  compassBarBg.add(locationContainer);
  
  // Add compass bar to compass container
  compassContainer.add(compassBarBg);
  
  // Add compass container to app
  app.add(compassContainer);
  
  // Create bottlecap counter UI - Fallout style
  const capsContainer = app.create('ui', {
    width: 120,
    height: 30,
    res: 2,  // Higher resolution for sharper UI
    position: [1, 0, 1],  // Position at the top right
    offset: [-15, 15, 0],  // Offset from the top right edge
    space: 'screen',    // This makes it display on screen, not in world
    pivot: 'top-right',
    backgroundColor: 'rgba(0,0,0,0.5)', // Semi-transparent background
    padding: 5,
    borderRadius: 5,
    pointerEvents: false,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 5,
  });
  
  // Create bottlecap icon - using a dollar sign
  const capsIcon = app.create('uitext', {
    value: '$', // Simple dollar sign
    fontSize: 18,
    color: CONFIG.AMBER_COLOR,
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
    marginRight: 2,
    fontWeight: 'bold',
  });
  
  // Create bottlecap amount text
  const capsText = app.create('uitext', {
    value: capsAmount.toString(),
    fontSize: 16,
    fontWeight: 'bold',
    color: CONFIG.AMBER_COLOR,
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
  });
  
  // Add elements to bottlecap container
  capsContainer.add(capsIcon);
  capsContainer.add(capsText);
  
  // Add bottlecap container to app
  app.add(capsContainer);
  
  // Function to update health bar based on player health
  function updateHealthBar() {
    const player = world.getPlayer();
    if (!player) return;
    
    // Get player health (assuming max health is 100)
    const maxHealth = CONFIG.MAX_HEALTH;
    let currentHealth = maxHealth; // Default to max if not available
    
    // Try different approaches to get player health
    if (typeof player.health === 'number') {
      currentHealth = player.health;
    } else if (player.state && typeof player.state.health === 'number') {
      currentHealth = player.state.health;
    } else if (player.components && player.components.health && 
               typeof player.components.health.value === 'number') {
      currentHealth = player.components.health.value;
    }
    
    // Ensure health is between 0-100
    currentHealth = Math.max(0, Math.min(maxHealth, currentHealth));
    
    // Calculate the effective max health (reduced by radiation)
    const effectiveMaxHealth = maxHealth - radiationLevel;
    const healthPercent = effectiveMaxHealth > 0 ? currentHealth / effectiveMaxHealth : 0;
    
    // Actual percentage is based on current health vs max possible (100)
    const actualHealthPercent = currentHealth / maxHealth;
    
    // Update health percentage text
    healthPercentText.value = Math.round(actualHealthPercent * 100) + '%';
    
    // Update health bar width - account for radiation bar
    // Calculate how much of the bar is actually available for health
    const availableWidth = 398 - (radiationLevel / CONFIG.MAX_RADIATION * 398);
    const newWidth = Math.max(0, Math.floor(healthPercent * availableWidth));
    healthBarFill.width = newWidth;
    
    // Update color based on health level - using Fallout's color scheme
    if (healthPercent > 0.66) {
      healthBarFill.backgroundColor = CONFIG.GREEN_COLOR;
      healthSymbol.color = CONFIG.GREEN_COLOR;
      healthSymbol.opacity = 1.0; // Full opacity when healthy
    } else if (healthPercent > 0.33) {
      healthBarFill.backgroundColor = CONFIG.YELLOW_COLOR;
      healthSymbol.color = CONFIG.YELLOW_COLOR;
      healthSymbol.opacity = 1.0;
    } else {
      healthBarFill.backgroundColor = CONFIG.RED_COLOR;
      healthSymbol.color = CONFIG.RED_COLOR;
      
      // Make heart symbol pulse when health is low
      const time = world.getTime();
      const pulseValue = Math.sin(time * 5) * 0.5 + 0.5; // Faster pulse when low health
      healthSymbol.opacity = 0.5 + pulseValue * 0.5;
    }
    
    // Force redraw by toggling a property
    healthBarFill.marginLeft = healthBarFill.marginLeft === 1 ? 1.001 : 1;
  }
  
  // Handle radiation update events - with reduced logging
  app.on('radiation:update', (data) => {
    if (data && typeof data.level === 'number') {
      radiationLevel = Math.max(0, Math.min(CONFIG.MAX_RADIATION, data.level));
      // Only log significant changes
      if (Math.abs(radiationLevel - lastLoggedRadLevel) > 5) {
        lastLoggedRadLevel = radiationLevel;
        console.log(`[WASTELAND-HUD] Radiation level: ${radiationLevel.toFixed(1)}`);
      }
      updateRadiationUI(true); // Suppress logging
    }
  });
  
  // Also listen for world radiation events in case they're being emitted differently
  world.on('radiation:update', (data) => {
    if (data && typeof data.level === 'number') {
      radiationLevel = Math.max(0, Math.min(CONFIG.MAX_RADIATION, data.level));
      updateRadiationUI(true); // Suppress logging
    }
  });
  
  // Listen for hyperfy:radiation events as well
  world.on('hyperfy:radiation', (data) => {
    if (data && typeof data.level === 'number') {
      radiationLevel = Math.max(0, Math.min(CONFIG.MAX_RADIATION, data.level));
      updateRadiationUI(true); // Suppress logging
    }
  });
  
  // Add a test command to manually set radiation level
  world.on('chat', (message) => {
    if (message && message.text && typeof message.text === 'string') {
      const text = message.text.trim();
      
      // Command to test radiation level
      if (text === '/radtest') {
        console.log('[WASTELAND-HUD] Manual radiation test requested');
        // Force radiation level to increase
        radiationLevel = Math.min(maxRadiationLevel, radiationLevel + 25);
        console.log(`[WASTELAND-HUD] Radiation level manually set to ${radiationLevel}`);
        updateRadiationUI();
      } else if (text.startsWith('/rad ')) {
        // Command to set specific radiation level
        const level = parseInt(text.substring(5), 10);
        if (!isNaN(level)) {
          radiationLevel = Math.max(0, Math.min(maxRadiationLevel, level));
          console.log(`[WASTELAND-HUD] Radiation level manually set to ${radiationLevel}`);
          updateRadiationUI();
        }
      }
    }
  });
  
  // IMPORTANT: Add a direct connection to the radiation values from the console logs
  // This is a workaround to capture the radiation values that are being logged
  const originalConsoleLog = console.log;
  console.log = function() {
    // Check if this is a radiation log message before logging anything else
    if (arguments.length > 0 && typeof arguments[0] === 'string') {
      const logMessage = arguments[0];
      
      // Only intercept specific radiation messages
      if (logMessage.includes('[RADIATION] Radiation increasing:')) {
        try {
          // Extract the radiation value from the log message
          const match = logMessage.match(/([0-9.]+)\/([0-9.]+)/);
          if (match && match.length >= 3) {
            const radValue = parseFloat(match[1]);
            if (!isNaN(radValue)) {
              // Only update if the value has changed significantly (avoid spam)
              if (Math.abs(radiationLevel - radValue) > 2) { // Increased threshold to reduce updates
                radiationLevel = radValue;
                // Don't log here to avoid feedback loop
                updateRadiationUI(true); // Pass true to suppress additional logging
              }
            }
          }
        } catch (e) {
          // Call original console.error without our interceptor to avoid loops
          originalConsoleLog.call(console, '[WASTELAND-HUD] Error parsing radiation log:', e);
        }
      }
    }
    
    // Only pass through to original console.log if it's not our own debug message
    // This prevents the feedback loop
    if (arguments.length > 0 && typeof arguments[0] === 'string') {
      const logMessage = arguments[0];
      // Filter out all our radiation bar width messages and most update messages
      if (!logMessage.includes('[WASTELAND-HUD] Setting radiation bar width') && 
          !logMessage.includes('[WASTELAND-HUD] Updated radiation level')) {
        originalConsoleLog.apply(console, arguments);
      }
    } else {
      originalConsoleLog.apply(console, arguments);
    }
  };
  
  // Update the radiation UI elements - Fix the function to ensure the bar is visible
  function updateRadiationUI(suppressLogging) {
    // Update UI based on radiation level
    const radiationPercent = radiationLevel / CONFIG.MAX_RADIATION;
    
    // Update radiation percentage text
    headerRadPercentText.value = Math.round(radiationPercent * 100) + '%';
    
    // Update radiation bar width - grows from right side
    const radWidth = Math.max(0, Math.floor(radiationPercent * 398));
    
    // Only log if not suppressed (to avoid feedback loops) and only log significant changes
    if (!suppressLogging && Math.abs(radWidth - radBarFill.width) > 10) {
      originalConsoleLog.call(console, `[WASTELAND-HUD] Radiation: ${Math.round(radiationPercent * 100)}%`);
    }
    
    // Ensure the radiation bar is visible and has the correct width
    radBarFill.width = radWidth;
    radBarFill.visible = true;
    
    // Update color based on radiation level - using Fallout's color scheme
    if (radiationPercent < 0.33) {
      radBarFill.backgroundColor = CONFIG.RAD_YELLOW;
      headerRadSymbol.color = CONFIG.RAD_YELLOW;
    } else if (radiationPercent < 0.66) {
      radBarFill.backgroundColor = CONFIG.RAD_ORANGE;
      headerRadSymbol.color = CONFIG.RAD_ORANGE;
    } else {
      radBarFill.backgroundColor = CONFIG.RAD_RED;
      headerRadSymbol.color = CONFIG.RAD_RED;
      
      // Make radiation symbol pulse when radiation is high
      const time = world.getTime();
      const pulseValue = (Math.sin(time * 5) * 0.5 + 0.5);
      headerRadSymbol.opacity = 0.5 + pulseValue * 0.5;
    }
    
    // Force a redraw by toggling a property
    radBarFill.marginTop = radBarFill.marginTop === 1 ? 1.001 : 1;
    
    // After updating radiation, update health to reflect reduced max health
    updateHealthBar();
  }
  
  // Update compass direction based on player rotation
  function updateCompass() {
    const player = world.getPlayer();
    if (!player) return;
    
    // Get player rotation and convert to degrees
    let rotation = 0;
    
    // Try different approaches to get player rotation
    if (player.rotation && typeof player.rotation.y === 'number') {
      rotation = player.rotation.y;
    } else if (player.quaternion) {
      // Convert quaternion to euler angles if needed
      // This is a simplified conversion that only cares about Y rotation
      const qx = player.quaternion.x || 0;
      const qy = player.quaternion.y || 0;
      const qz = player.quaternion.z || 0;
      const qw = player.quaternion.w || 1;
      
      // Extract yaw (y-axis rotation) from quaternion
      // This is a simplified version that works for our compass needs
      rotation = Math.atan2(2 * (qw * qy + qx * qz), 1 - 2 * (qy * qy + qz * qz));
    }
    
    // Convert to degrees and normalize to 0-360
    let degrees = (rotation * 180 / Math.PI) % 360;
    if (degrees < 0) degrees += 360;
    
    // Round to nearest degree
    degrees = Math.round(degrees);
    
    // Update direction text
    directionText.value = degrees + '°';
    
    // Determine cardinal direction
    let cardinal = 'N';
    if (degrees >= 22.5 && degrees < 67.5) {
      cardinal = 'NE';
    } else if (degrees >= 67.5 && degrees < 112.5) {
      cardinal = 'E';
    } else if (degrees >= 112.5 && degrees < 157.5) {
      cardinal = 'SE';
    } else if (degrees >= 157.5 && degrees < 202.5) {
      cardinal = 'S';
    } else if (degrees >= 202.5 && degrees < 247.5) {
      cardinal = 'SW';
    } else if (degrees >= 247.5 && degrees < 292.5) {
      cardinal = 'W';
    } else if (degrees >= 292.5 && degrees < 337.5) {
      cardinal = 'NW';
    }
    
    // Update cardinal direction text
    cardinalText.value = cardinal;
    
    // Store current direction
    currentDirection = degrees;
  }
  
  // Update bottlecap counter
  function updateCapsCounter() {
    capsText.value = capsAmount.toString();
  }
  
  // Handle damage events
  app.on('dmg', (data) => {
    // Check if the damage is to the local player
    const localPlayer = world.getPlayer();
    if (localPlayer && data.playerId === localPlayer.id) {
      // Immediately update health bar regardless of damage source
      updateHealthBar();
    }
  });
  
  // Handle location update events
  app.on('location:update', (data) => {
    if (data && data.name) {
      locationText.value = data.name;
      currentLocation = data.name;
    }
  });
  
  // Handle caps update events
  app.on('caps:update', (data) => {
    if (data && typeof data.amount === 'number') {
      capsAmount = data.amount;
      updateCapsCounter();
    }
  });
  
  // Main update loop
  app.on('update', (delta) => {
    try {
      // Force update health at regular intervals for reliability
      lastUpdateTime += delta;
      if (lastUpdateTime >= 0.5) { // Update twice per second
        lastUpdateTime = 0;
        updateHealthBar();
      }
      
      // Apply radiation decay when not directly receiving radiation updates
      if (radiationLevel > 0) {
        radiationLevel = Math.max(0, radiationLevel - (5 * delta)); // 5 points per second decay
        updateRadiationUI(true); // Suppress logging during decay
      }
      
      // Update compass direction every frame
      updateCompass();
      
    } catch (error) {
      console.error('[WASTELAND-HUD] Error in update:', error);
    }
  });
  
  // Initial update
  updateHealthBar();
  updateRadiationUI();
  updateCompass();
  updateCapsCounter();
  
  console.log('[WASTELAND-HUD] HUD initialized');
}