
app.remove(app.get('Block'))
const rng = prng(42); // seeded random for consistency

// Chicken dimensions (approx real size: ~0.4m tall)
const bodyHeight = 0.3;
const bodyWidth = 0.2;
const headSize = 0.1;
const beakSize = 0.05;
const legHeight = 0.15;
const legWidth = 0.03;

// Group for the whole chicken
const chicken = app.create('group', {
  position: [0, 0, 0],
  physics: 'kinematic' // Moves programmatically
});

// Body: yellow box
const body = app.create('prim', {
  type: 'box',
  size: [bodyWidth, bodyHeight, bodyWidth * 1.5],
  position: [0, legHeight + bodyHeight / 2, 0],
  color: 'yellow',
  physics: 'kinematic',
  mass: 0.5 // Light mass for faster settling
});
chicken.add(body);

// Head: yellow sphere
const head = app.create('prim', {
  type: 'sphere',
  size: [headSize],
  position: [0, legHeight + bodyHeight + headSize / 2, bodyWidth * 0.25], // Slightly forward
  color: 'yellow',
  physics: 'kinematic',
  mass: 0.3 // Light mass for faster settling
});
chicken.add(head);

// Beak: orange cone (cylinder approximation)
const beak = app.create('prim', {
  type: 'cylinder',
  size: [0, beakSize / 2, beakSize], // Cone shape
  position: [0, legHeight + bodyHeight + headSize / 2, bodyWidth * 0.25 + headSize + beakSize / 2],
  rotation: [90 * DEG2RAD, 0, 0], // Point forward
  color: 'orange',
  physics: 'kinematic',
  mass: 0.1 // Very light mass for faster settling
});
chicken.add(beak);

// Legs: two yellow cylinders
const legLeft = app.create('prim', {
  type: 'cylinder',
  size: [legWidth / 2, legWidth / 2, legHeight],
  position: [-bodyWidth / 4, legHeight / 2, 0],
  color: 'yellow',
  physics: 'kinematic',
  mass: 0.2 // Light mass for faster settling
});
chicken.add(legLeft);

const legRight = app.create('prim', {
  type: 'cylinder',
  size: [legWidth / 2, legWidth / 2, legHeight],
  position: [bodyWidth / 4, legHeight / 2, 0],
  color: 'yellow',
  physics: 'kinematic',
  mass: 0.2 // Light mass for faster settling
});
chicken.add(legRight);

// Top hat: black base with rainbow brim and top
const hat = app.create('group', {
  position: [0, legHeight + bodyHeight + headSize, bodyWidth * 0.25]
});

// Rainbow colors
const rainbowColors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];

// Hat brim: rainbow striped flat cylinder
const brimHeight = 0.02;
for (let i = 0; i < rainbowColors.length; i++) {
  const radius = 0.15 - (i * 0.01);
  const brim = app.create('prim', {
    type: 'cylinder',
    size: [radius, radius, brimHeight],
    position: [0, i * brimHeight, 0],
    color: rainbowColors[i],
    physics: 'kinematic',
    mass: 0.05 // Very light mass for faster settling
  });
  hat.add(brim);
}

// Hat top: black cylinder
const hatTop = app.create('prim', {
  type: 'cylinder',
  size: [0.1, 0.1, 0.2],
  position: [0, rainbowColors.length * brimHeight + 0.1, 0],
  color: 'black',
  physics: 'kinematic',
  mass: 0.15 // Light mass for faster settling
});
hat.add(hatTop);

chicken.add(hat);

// Add chicken to app (origin at ground)
app.add(chicken)

// Function to make chicken parts fall with physics
function makeChickenFall() {
  chickenParts.forEach(part => {
    if (part && part.physics === 'dynamic') {
      // Add random forces to make parts fall in different directions
      const randomX = (Math.random() - 0.5) * 8; // Random X force
      const randomZ = (Math.random() - 0.5) * 8; // Random Z force
      const randomY = Math.random() * 3; // Upward force for some parts
      
      // Apply random forces to make it look more realistic
      if (part.rigidBody && part.rigidBody.actor) {
        part.rigidBody.actor.addForce(
          new THREE.Vector3(randomX, randomY, randomZ),
          'impulse'
        );
        
        // Add high friction and damping to make parts settle quickly
        if (part.rigidBody.actor.setFriction) {
          part.rigidBody.actor.setFriction(0.8); // High friction
        }
        if (part.rigidBody.actor.setLinearDamping) {
          part.rigidBody.actor.setLinearDamping(0.9); // High linear damping
        }
        if (part.rigidBody.actor.setAngularDamping) {
          part.rigidBody.actor.setAngularDamping(0.95); // Very high angular damping
        }
      }
    }
  });
  

}

// Function to freeze the chicken in place initially
function freezeChicken() {
  chickenParts.forEach(part => {
    if (part && part.physics === 'dynamic') {
      // Temporarily set to kinematic to hold position
      part.physics = 'kinematic';
      // Force update the physics
      if (part.rigidBody) {
        part.rigidBody.type = 'kinematic';
      }
    }
  });

}

// Function to unfreeze the chicken and make it fall
function unfreezeAndFall() {
  // Store the current position where the chicken fell
  chickenFallPosition = [chicken.position.x, chicken.position.y, chicken.position.z];
  
  chickenParts.forEach(part => {
    if (part) {
      // Change back to dynamic physics
      part.physics = 'dynamic';
      // Force update the physics
      if (part.rigidBody) {
        part.rigidBody.type = 'dynamic';
      }
    }
  });
  
  // Wait a frame then apply forces
  setTimeout(() => {
    makeChickenFall();
  }, 100);
}

// Function to restore chicken to original position and resume walking
function restoreChicken() {
  // Store original positions
  const originalPositions = [
    [0, legHeight + bodyHeight / 2, 0], // body
    [0, legHeight + bodyHeight + headSize / 2, bodyWidth * 0.25], // head
    [0, legHeight + bodyHeight + headSize / 2, bodyWidth * 0.25 + headSize + beakSize / 2], // beak
    [-bodyWidth / 4, legHeight / 2, 0], // legLeft
    [bodyWidth / 4, legHeight / 2, 0], // legRight
    [0, legHeight + bodyHeight + headSize, bodyWidth * 0.25], // hat group
    [0, rainbowColors.length * brimHeight + 0.1, 0] // hatTop
  ];

  // Add rainbow brim positions
  for (let i = 0; i < rainbowColors.length; i++) {
    originalPositions.push([0, i * brimHeight, 0]); // Each rainbow brim
  }

  chickenParts.forEach((part, index) => {
    if (part && originalPositions[index]) {
      // Reset position to original
      part.position.set(...originalPositions[index]);
      // Reset rotation to original
      part.rotation.set(0, 0, 0);
      // Freeze in place
      part.physics = 'kinematic';
      if (part.rigidBody) {
        part.rigidBody.type = 'kinematic';
      }
    }
  });
  
  // Reset chicken group position to where it fell, not origin
  chicken.position.set(chickenFallPosition[0], chickenFallPosition[1], chickenFallPosition[2]);
  chicken.rotation.set(0, 0, 0);
  

};

// Create a white circle cursor that appears when hovering over the chicken
const hoverCursor = app.create('ui', {
  width: 20,
  height: 20,
  position: [0.5, 0.5, 0],
  space: 'screen',
  pivot: 'center',
  backgroundColor: 'transparent',
  borderWidth: 2,
  borderColor: '#ffffff',
  borderRadius: 10,
  pointerEvents: false,
  active: false // Start hidden
});

app.add(hoverCursor);

// Add hover effects to all chicken parts
const chickenParts = [
  body, head, beak, legLeft, legRight, hat, hatTop
];

// Also add all the rainbow brim parts
for (let i = 0; i < rainbowColors.length; i++) {
  chickenParts.push(hat.children[i]);
}

// Freeze the chicken initially so it stays in place
freezeChicken();

// Track chicken state
let chickenFrozen = true;
let chickenFallPosition = [0, 0, 0]; // Store where chicken fell

// Add hover and click events to each part
chickenParts.forEach(part => {
  if (part) {
    part.onPointerEnter = () => {
      hoverCursor.active = true;
    };
    
    part.onPointerLeave = () => {
      hoverCursor.active = false;
    };
    
    part.onPointerDown = () => {
      // Toggle between frozen and falling states
      if (chickenFrozen) {
        // Currently frozen, make it fall
        unfreezeAndFall();
        chickenFrozen = false;
      } else {
        // Currently falling, restore to frozen position
        restoreChicken();
        chickenFrozen = true;
      }
    };
  }
});

// Animation variables
let direction = new Vector3(rng(-1, 1, 2), 0, rng(-1, 1, 2)).normalize();
let speed = 0.5; // m/s
let timeToChange = rng(1, 3, 2);
let elapsed = 0;
let walkTime = 0;

// Walking animation
app.on('update', delta => {
  // Only animate if chicken is frozen (not falling)
  if (chickenFrozen) {
    // Move forward
    const move = direction.clone().multiplyScalar(speed * delta);
    chicken.position.add(move);

    // Random direction change
    elapsed += delta;
    if (elapsed > timeToChange) {
      direction.set(rng(-1, 1, 2), 0, rng(-1, 1, 2)).normalize();
      timeToChange = rng(1, 3, 2);
      elapsed = 0;
    }

    // Simple leg swinging for walking animation
    walkTime += delta * 5; // Swing speed
    legLeft.rotation.x = Math.sin(walkTime) * 20 * DEG2RAD;
    legRight.rotation.x = Math.sin(walkTime + Math.PI) * 20 * DEG2RAD;

    // Face direction of movement
    chicken.rotation.y = Math.atan2(direction.x, direction.z);
  }
});