// =================================================================
// Audio Configuration
// =================================================================
app.configure([
  {
    key: 'sound',
    type: 'file',
    kind: 'audio',
    label: 'Sound'
  }
]);

if (world.isClient) {

  if (config.sound) {
    const audio = app.create('audio', {
      src: config.sound.url,
      loop: true // Enable looping for the audio
    });
    app.add(audio);
    audio.play();
  }

  // =================================================================
  // Movement and Behavior Configuration
  // =================================================================

  // Distance threshold (in meters) for switching to avoid mode.
  const safeDistance = 3;         
  // Extra distance for switching back to follow mode.
  const followMargin = 0.5;       
  // Movement speed (units per second) for following/avoiding.
  const moveSpeed = 1;            
  // Orbit (idle) speed when the player is stationary.
  const orbitSpeed = 1;           
  // Rotation interpolation speed (radians per second).
  const rotationSpeed = 2;        
  // If the player's movement is below this, consider them stationary.
  const playerMovementThreshold = 0.01; 
  
  // Track the current behavior mode. Start in "follow" mode.
  let currentMode = "follow";
  
  // Store the player's last position for movement detection.
  let lastPlayerPosition = null;
  
  // =================================================================
  // Update Loop
  // =================================================================
  app.on('update', delta => {
    const player = world.getPlayer();
    if (!player) return;
    
    // Initialize lastPlayerPosition if needed.
    if (!lastPlayerPosition) {
      lastPlayerPosition = player.position.clone();
    }
    
    // Calculate the distance between the player and the object.
    const distance = player.position.distanceTo(app.position);
    
    // Update mode based on distance with hysteresis.
    if (currentMode === "follow" && distance < safeDistance) {
      currentMode = "avoid";
    } else if (currentMode === "avoid" && distance > safeDistance + followMargin) {
      currentMode = "follow";
    }
    
    // Determine how much the player moved since the last frame.
    const playerMovement = new Vector3().subVectors(player.position, lastPlayerPosition);
    const playerSpeed = playerMovement.length();
    
    // Determine movement direction.
    const moveDirection = new Vector3();
    if (currentMode === "avoid") {
      // If the player is nearly stationary, orbit around the player horizontally.
      if (playerSpeed < playerMovementThreshold) {
        const dirFromPlayer = new Vector3().subVectors(app.position, player.position);
        dirFromPlayer.y = 0;  // Only orbit horizontally.
        if (dirFromPlayer.lengthSq() > 0) {
          const orbitDirection = new Vector3(-dirFromPlayer.z, 0, dirFromPlayer.x).normalize();
          moveDirection.copy(orbitDirection);
        }
      } else {
        // Otherwise, move directly away from the player in full 3D (including vertical differences).
        moveDirection.subVectors(app.position, player.position);
      }
    } else {
      // In follow mode, move toward the player in full 3D (including up/down).
      moveDirection.subVectors(player.position, app.position);
    }
    
    // Normalize and apply movement if a valid direction is computed.
    if (moveDirection.lengthSq() > 0) {
      moveDirection.normalize();
      const speed =
        (currentMode === "avoid" && playerSpeed < playerMovementThreshold)
          ? orbitSpeed
          : moveSpeed;
      app.position.addScaledVector(moveDirection, speed * delta);
    }
    
    // Always rotate to face the player (rotation is only on the horizontal plane).
    const faceDirection = new Vector3().subVectors(player.position, app.position);
    faceDirection.y = 0;
    if (faceDirection.lengthSq() > 0) {
      faceDirection.normalize();
      const targetAngle = Math.atan2(faceDirection.x, faceDirection.z);
      const targetQuat = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), targetAngle);
      app.quaternion.slerp(targetQuat, Math.min(1, rotationSpeed * delta));
    }
    
    // Update lastPlayerPosition for the next frame.
    lastPlayerPosition.copy(player.position);
  });
}
