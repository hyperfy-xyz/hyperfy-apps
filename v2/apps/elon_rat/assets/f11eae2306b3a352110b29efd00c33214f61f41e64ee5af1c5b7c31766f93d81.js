if (world.isClient) {
  // --- Pseudo-Random Number Generator (LCG) ---
  let pseudoSeed = 1;
  function pseudoRandom() {
    pseudoSeed = (pseudoSeed * 9301 + 49297) % 233280;
    return pseudoSeed / 233280;
  }

  // --- Configuration ---
  const scurrySpeed = 6;          // Max speed for quick bursts (meters per second)
  const walkSpeed = 2;           // Slower speed for cautious movement (meters per second)
  const turnSpeed = 15;          // Faster rotation speed (radians per second) for twitchy turns
  const minPause = 0.5;          // Min pause duration (seconds)
  const maxPause = 2;            // Max pause duration (seconds)
  const minScurry = 0.3;         // Min scurry duration (seconds)
  const maxScurry = 1.5;         // Max scurry duration (seconds)
  const wanderRadius = 3;        // Smaller radius for rat-like local exploration (meters)
  const heightVariation = 0;   // Slight elevation changes (meters) for climbing/dipping
  const targetThreshold = 0.1;   // Distance to consider target reached (meters)
  const rotationThreshold = 0.1; // Slightly looser rotation threshold (radians)

  // --- State Variables ---
  let state = "pausing";         // "pausing", "turning", "scurrying", or "walking"
  let timer = 0;                 // Timer for current state
  let basePos = app.position.clone(); // Base position for wandering
  let targetPos = null;          // Target position
  let targetQuat = null;         // Target rotation (Quaternion)
  let currentSpeed = 0;          // Dynamic speed based on state
  let pauseDuration = minPause + pseudoRandom() * (maxPause - minPause); // Initial pause

  // --- Update Loop ---
  app.on("update", delta => {
    timer += delta;

    if (state === "pausing") {
      // Slight random twitching while paused
      app.position.y = basePos.y + Math.sin(timer * 5) * 0.05 * heightVariation;

      if (timer >= pauseDuration) {
        // Choose a new target with slight height variation
        const angle = pseudoRandom() * Math.PI * 2;
        const distance = pseudoRandom() * wanderRadius;
        const newX = basePos.x + Math.cos(angle) * distance;
        const newZ = basePos.z + Math.sin(angle) * distance;
        const newY = basePos.y + (pseudoRandom() - 0.5) * heightVariation; // Small Y variation
        targetPos = new Vector3(newX, newY, newZ);

        // Calculate direction to target
        let dir = new Vector3().subVectors(targetPos, app.position);
        dir.y = 0; // Keep rotation on XZ plane
        if (dir.length() > 0) {
          dir.normalize();
          const angleToTarget = Math.atan2(dir.x, dir.z);
          targetQuat = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), angleToTarget);
        }

        timer = 0;
        state = "turning";
      }
    } else if (state === "turning") {
      if (targetQuat) {
        // Quick, twitchy rotation
        app.quaternion.slerp(targetQuat, Math.min(1, turnSpeed * delta));
        const angleDiff = app.quaternion.angleTo(targetQuat);
        if (angleDiff < rotationThreshold) {
          app.quaternion.copy(targetQuat);
          // Randomly choose between scurrying or walking
          currentSpeed = pseudoRandom() > 0.5 ? scurrySpeed : walkSpeed;
          state = pseudoRandom() > 0.5 ? "scurrying" : "walking";
        }
      }
    } else if (state === "scurrying" || state === "walking") {
      // Move toward target with dynamic speed
      let moveVec = new Vector3().subVectors(targetPos, app.position);
      let dist = moveVec.length();

      if (dist > targetThreshold) {
        moveVec.normalize();
        const speed = currentSpeed * delta;
        app.position.addScaledVector(moveVec, Math.min(speed, dist)); // Don't overshoot
      } else {
        // Arrived at target
        basePos.copy(targetPos);
        timer = 0;
        pauseDuration = minPause + pseudoRandom() * (maxPause - minPause);
        state = "pausing";
        targetPos = null;
        targetQuat = null;
      }

      // Add slight bobbing during movement
      app.position.y += Math.sin(timer * 10) * 0.05 * heightVariation;

      // Randomly stop moving to pause or switch between scurry/walk
      if (state === "scurrying" && timer > minScurry && pseudoRandom() < 0.1 * delta) {
        timer = 0;
        pauseDuration = minPause + pseudoRandom() * (maxPause - minPause);
        state = "pausing";
      } else if (state === "walking" && timer > minScurry && pseudoRandom() < 0.05 * delta) {
        timer = 0;
        currentSpeed = scurrySpeed;
        state = "scurrying";
      }
    }
  });
}