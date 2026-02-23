if (world.isClient) {
  // --- Pseudo-Random Number Generator (LCG) ---
  let pseudoSeed = 1;
  function pseudoRandom() {
    pseudoSeed = (pseudoSeed * 9301 + 49297) % 233280;
    return pseudoSeed / 233280;
  }

  // --- Configuration ---
  const amplitude = 0;           // Bobbing amplitude (meters)
  const frequency = 0;           // Bobbing frequency (cycles per second)
  const minHoverDuration = 3;    // Minimum hover time (seconds)
  const maxHoverDuration = 5;    // Maximum hover time (seconds)
  const moveSpeed = 10;          // Movement speed (meters per second)
  const rotationSpeed = 10;      // Rotation speed (radians per second)
  const wanderRadius = 3;       // Maximum distance (meters) for a new target
  const targetThreshold = 0.1;   // Distance (meters) considered “arrived”
  const rotationThreshold = 0.05; // Radians threshold to consider rotation complete

  // --- State Variables ---
  let state = "hovering";        // "hovering", "rotating", or "moving"
  let timer = 0;                 // Timer for the current state
  let baseY = app.position.y;    // Base Y for bobbing
  let startPos = app.position.clone(); // Base position for wander targets
  let targetPos = null;          // Target position when moving
  let targetQuat = null;         // Target rotation (Quaternion) when rotating
  // Set an initial random hover duration:
  let hoverDuration = minHoverDuration + pseudoRandom() * (maxHoverDuration - minHoverDuration);

  // --- Update Loop ---
  app.on("update", delta => {
    timer += delta;

    if (state === "hovering") {
      // Bob up and down (if amplitude or frequency are set)
      app.position.y = baseY + Math.sin(timer * Math.PI * 2 * frequency) * amplitude;

      // After hovering for the random duration, choose a new random target.
      if (timer >= hoverDuration) {
        const angle = pseudoRandom() * Math.PI * 2;
        const distance = pseudoRandom() * wanderRadius;
        const newX = startPos.x + Math.cos(angle) * distance;
        const newZ = startPos.z + Math.sin(angle) * distance;
        targetPos = new Vector3(newX, startPos.y, newZ);

        // Determine the horizontal direction from current position to target.
        let dir = new Vector3().subVectors(targetPos, app.position);
        dir.y = 0;
        if (dir.length() > 0) {
          dir.normalize();
          const angleToTarget = Math.atan2(dir.x, dir.z);
          targetQuat = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), angleToTarget);
        }

        // Reset timer and pick a new random hover duration for next time.
        timer = 0;
        hoverDuration = minHoverDuration + pseudoRandom() * (maxHoverDuration - minHoverDuration);
        state = "rotating"; // Switch to rotating state before moving.
      }
    } else if (state === "rotating") {
      // Lock the Y position while rotating.
      app.position.y = baseY;

      if (targetQuat) {
        // Smoothly rotate towards the target direction.
        app.quaternion.slerp(targetQuat, Math.min(1, rotationSpeed * delta));

        // Check if the rotation is nearly complete.
        const angleDiff = app.quaternion.angleTo(targetQuat);
        if (angleDiff < rotationThreshold) {
          app.quaternion.copy(targetQuat); // Snap to target rotation.
          state = "moving";                // Now begin moving forward.
        }
      }
    } else if (state === "moving") {
      // Lock the Y position while moving.
      app.position.y = baseY;

      // Compute movement vector on the XZ plane.
      let currentXZ = new Vector3(app.position.x, 0, app.position.z);
      let targetXZ = new Vector3(targetPos.x, 0, targetPos.z);
      let moveVec = new Vector3().subVectors(targetXZ, currentXZ);
      let dist = moveVec.length();

      if (dist > targetThreshold) {
        moveVec.normalize();
        app.position.x += moveVec.x * moveSpeed * delta;
        app.position.z += moveVec.z * moveSpeed * delta;
      } else {
        // Arrived at target: update starting position and resume hovering.
        startPos.copy(targetPos);
        baseY = app.position.y;
        timer = 0;
        state = "hovering";
        targetPos = null;
        targetQuat = null;
      }
    }
  });
}
