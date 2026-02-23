/**
 * Elevator Logic with Screen Space UI - Hyperfy V2
 * Creates a 36x36 pixel square UI in the top right corner
 * Only visible when player is within 10 meters of the app
 * 15 floors (0-15), 11 meters between floors
 * 
 * @author Akerboom
 * @license MIT
 */

// Distance threshold for UI visibility (3 meters)
const UI_VISIBILITY_DISTANCE = 3;

// Track if app is fully initialized
let appInitialized = false;
let playerReady = false;

// Track last player position to detect movement
let lastPlayerPosition = null;

// Get elevator mesh reference once at initialization
let elevatorMesh = null;

// Function to check distance and update UI visibility
function updateUIVisibility() {
  if (!world.isClient || !appInitialized || !playerReady) {
    return;
  }
  
  const player = world.getPlayer();
  if (!player || !player.position) {
    return;
  }
  
  let playerPos;
  try {
    playerPos = player.position;
  } catch (error) {
    return;
  }
  
  if (!playerPos || typeof playerPos.distanceTo !== 'function') {
    return;
  }
  
  let appPos;
  try {
    appPos = app.position;
  } catch (error) {
    return;
  }
  
  if (!appPos || typeof appPos.distanceTo !== 'function') {
    return;
  }
  
  try {
    // Calculate horizontal distance (X and Z axes only, ignoring Y)
    const horizontalDistance = Math.sqrt(
      Math.pow(playerPos.x - appPos.x, 2) + 
      Math.pow(playerPos.z - appPos.z, 2)
    );
    
    // Check if player has moved significantly (more than 0.5 meters)
    if (lastPlayerPosition && typeof lastPlayerPosition.distanceTo === 'function') {
      const movementDistance = playerPos.distanceTo(lastPlayerPosition);
      // Temporarily disable movement threshold for debugging
      // if (movementDistance < 0.5) return; // Skip update if player hasn't moved much
    }
    
    lastPlayerPosition = playerPos.clone();
    
    // Toggle UI visibility based on horizontal distance only
    const shouldShowUI = horizontalDistance <= UI_VISIBILITY_DISTANCE;
    if (elevatorUIs && elevatorUIs.length > 0) {
      elevatorUIs.forEach(ui => {
        if (ui && typeof ui.active !== 'undefined') {
          ui.active = shouldShowUI;
        }
      });
    }
  } catch (error) {
    // Silently handle any errors in distance calculation
  }
}

// Function to update the elevator position indicator based on elevator Y position
function updateElevatorPositionIndicator(elevatorY) {
  // Validate input
  if (typeof elevatorY !== 'number' || isNaN(elevatorY)) {
    return;
  }
  
  // Calculate which floor the elevator is closest to
  const currentFloor = Math.round(elevatorY / 11);
  
  // Clamp the floor to valid range (0-15)
  const clampedFloor = Math.max(0, Math.min(15, currentFloor));
  
  // Calculate which button index this corresponds to (floor 0 = index 15, floor 15 = index 0)
  const buttonIndex = 15 - clampedFloor;
  
  // Only update if the position has changed
  if (buttonIndex !== currentPositionButtonIndex) {
    // Reset previous position button border to white
    if (elevatorUIs[currentPositionButtonIndex]) {
      elevatorUIs[currentPositionButtonIndex].borderColor = '#ffffff';
    }
    
    // Set new position button border to red
    if (elevatorUIs[buttonIndex]) {
      elevatorUIs[buttonIndex].borderColor = '#ff0000';
    }
    
    currentPositionButtonIndex = buttonIndex;
  }
}

// Array to store all elevator UI squares
const elevatorUIs = [];

// Track the currently selected button
let selectedButtonIndex = 15; // Default to floor 0 (bottom button, index 15)

// Track the current elevator position button
let currentPositionButtonIndex = 15; // Default to floor 0 (bottom button, index 15)

// Animation variables
let isAnimating = false;
let animationStartY = 0;
let animationTargetY = 0;
let animationProgress = 0;
let currentAnimationDuration = 0;
const TIME_PER_FLOOR = 2.0; // Time in seconds to travel one floor

// Initialize server-side state
if (world.isServer) {
  console.log('Server: Initializing elevator state');
  
  // Get elevator mesh reference
  elevatorMesh = app.get('Elevator');
  if (!elevatorMesh) {
    console.error('Server: Could not find Elevator mesh');
  }
  
  app.state.elevator = {
    isAnimating: false,
    animationStartY: 0,
    animationTargetY: 0,
    animationProgress: 0,
    animationDuration: 0,
    currentFloor: 0
  };
  
  // Handle elevator requests from clients
  app.on('elevator:request', (data) => {
    console.log('Server: Received elevator request:', data);
    const { floor } = data;
    
    if (!elevatorMesh) {
      console.error('Server: Could not find Elevator mesh');
      return;
    }
    
    // Don't start new animation if already animating
    if (app.state.elevator.isAnimating) {
      console.log('Server: Elevator already animating, ignoring request');
      return;
    }
    
    // Calculate target Y position: each floor is 11 meters apart
    const targetY = floor * 11;
    const currentY = elevatorMesh.position.y;
    
    // Only animate if we're actually moving to a different floor
    if (Math.abs(targetY - currentY) < 0.1) {
      console.log('Server: Already at target floor, ignoring request');
      return;
    }
    
    // Start animation
    app.state.elevator.currentFloor = Math.round(currentY / 11);
    app.state.elevator.isAnimating = true;
    app.state.elevator.animationStartY = currentY;
    app.state.elevator.animationTargetY = targetY;
    app.state.elevator.animationProgress = 0;
    
    // Calculate animation duration based on number of floors traveled
    const floorsToTravel = Math.abs(floor - app.state.elevator.currentFloor);
    app.state.elevator.animationDuration = floorsToTravel * TIME_PER_FLOOR;
    
    console.log(`Server: Elevator animation started: from floor ${app.state.elevator.currentFloor} to floor ${floor} (${floorsToTravel} floors, ${app.state.elevator.animationDuration}s)`);
    
    // Notify all clients that animation has started
    app.send('elevator:start', {
      currentFloor: app.state.elevator.currentFloor,
      targetFloor: floor,
      startY: currentY,
      targetY: targetY,
      duration: app.state.elevator.animationDuration
    });
  });
}

// Create 16 elevator UI squares (36x36 pixels each) in a vertical stack
for (let i = 0; i < 16; i++) {
  const elevatorUI = app.create('ui', {
    width: 36,
    height: 36,
    res: 1,
    position: [1, 0, 0], // Top right corner
    offset: [-70, 60 + (i * 41), 0], // Stack vertically with 5px gap between squares
    space: 'screen',
    pivot: 'top-right',
    backgroundColor: 'rgba(74, 144, 226, 0.7)', // Semi-transparent blue color
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
    pointerEvents: true,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    cursor: 'pointer',
  });

  // Create text element for the floor number
  // Bottom square is 0, top square is 15
  const floorNumber = 15 - i;
  const floorText = app.create('uitext', {
    value: floorNumber.toString(),
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    backgroundColor: 'transparent',
    fontWeight: 'bold',
  });

  // Add the text to the UI square
  elevatorUI.add(floorText);
  
  // Store reference to the text element for color changes
  elevatorUI.floorText = floorText;

  // Add click behavior for the elevator UI
  elevatorUI.onPointerDown = () => {
    console.log(`Floor ${floorNumber} clicked!`);
    
    // Reset all buttons to semi-transparent and white text
    elevatorUIs.forEach((ui, index) => {
      if (index === selectedButtonIndex) {
        // Previously selected button goes back to semi-transparent
        ui.backgroundColor = 'rgba(74, 144, 226, 0.7)';
        // Reset text color to white
        if (ui.floorText) {
          ui.floorText.color = '#ffffff';
        }
      }
    });
    
    // Set this button as selected (opaque)
    selectedButtonIndex = i;
    elevatorUI.backgroundColor = 'rgba(74, 144, 226, 1.0)'; // Fully opaque blue
    // Change text color to black for better contrast on opaque background
    elevatorUI.floorText.color = '#000000';
    
    // Send elevator request to server (for networking)
    console.log(`Sending elevator request to server for floor: ${floorNumber}`);
    app.send('elevator:request', { floor: floorNumber });
    
    // Animation will be handled by server response
    console.log(`Request sent for floor ${floorNumber}, waiting for server response...`);
  };

  // Add hover effect
  elevatorUI.onPointerEnter = () => {
    // Only change color if this button is not currently selected
    if (selectedButtonIndex !== i) {
      elevatorUI.backgroundColor = 'rgba(53, 122, 189, 0.8)'; // Semi-transparent darker blue on hover
    }
  };

  elevatorUI.onPointerLeave = () => {
    // Only change color if this button is not currently selected
    if (selectedButtonIndex !== i) {
      elevatorUI.backgroundColor = 'rgba(74, 144, 226, 0.7)'; // Back to semi-transparent blue
    }
  };

  // Add the UI to the app
  app.add(elevatorUI);
  elevatorUIs.push(elevatorUI);
  
  // Set initial state for floor 0 (bottom button)
  if (i === 15) { // Floor 0 is at index 15
    elevatorUI.backgroundColor = 'rgba(74, 144, 226, 1.0)'; // Fully opaque blue
    elevatorUI.floorText.color = '#000000'; // Black text
    elevatorUI.borderColor = '#ff0000'; // Red border for elevator position indicator
  }
}

// Initialize the app
if (world.isClient) {
  console.log('Client: Initializing elevator');
  
  // Get elevator mesh reference
  elevatorMesh = app.get('Elevator');
  if (!elevatorMesh) {
    console.error('Client: Could not find Elevator mesh');
  }
  
  // Mark app as initialized
  appInitialized = true;
  
  // Check if player is already available
  const existingPlayer = world.getPlayer();
  if (existingPlayer && existingPlayer.position) {
    playerReady = true;
    // Initial UI visibility check
    updateUIVisibility();
  } else {
    // Wait for player to be ready
    world.on('player', (player) => {
      playerReady = true;
      // Initial UI visibility check
      updateUIVisibility();
    });
  }
  
  // Handle elevator start events from server
  app.on('elevator:start', (data) => {
    console.log('Client: Received elevator start from server:', data);
    
    // Update local animation state
    isAnimating = true;
    animationStartY = data.startY;
    animationTargetY = data.targetY;
    animationProgress = 0;
    currentAnimationDuration = data.duration;
    
    // Update UI to show target floor as selected
    const targetFloorIndex = 15 - data.targetFloor;
    selectedButtonIndex = targetFloorIndex;
    
    // Update button colors
    elevatorUIs.forEach((ui, index) => {
      if (index === targetFloorIndex) {
        ui.backgroundColor = 'rgba(74, 144, 226, 1.0)'; // Fully opaque blue
        ui.floorText.color = '#000000'; // Black text
      } else {
        ui.backgroundColor = 'rgba(74, 144, 226, 0.7)'; // Semi-transparent blue
        ui.floorText.color = '#ffffff'; // White text
      }
    });
    
            console.log(`Client: Server elevator animation started: floor ${data.currentFloor} to ${data.targetFloor}`);
      });
      
      // Handle elevator completion events from server
      app.on('elevator:complete', (data) => {
        console.log('Client: Received elevator completion from server:', data);
        
        // Reset local animation state
        isAnimating = false;
        animationProgress = 1.0;
        
        // Update UI to show current floor as selected
        const currentFloorIndex = 15 - data.floor;
        selectedButtonIndex = currentFloorIndex;
        
        // Update button colors
        elevatorUIs.forEach((ui, index) => {
          if (index === currentFloorIndex) {
            ui.backgroundColor = 'rgba(74, 144, 226, 1.0)'; // Fully opaque blue
            ui.floorText.color = '#000000'; // Black text
          } else {
            ui.backgroundColor = 'rgba(74, 144, 226, 0.7)'; // Semi-transparent blue
            ui.floorText.color = '#ffffff'; // White text
          }
        });
        
        // Update elevator position indicator to final position
        updateElevatorPositionIndicator(data.position);
        
        console.log(`Client: Elevator animation completed, UI updated for floor ${data.floor}`);
      });
}

// Update function to check distance when player moves and handle elevator animation
// This runs on both server and client
let lastCheckTime = 0;
const checkInterval = 0.1; // Check every 100ms

// Use Hyperfy's update event system
app.on('update', (delta) => {
  lastCheckTime += delta;
  if (lastCheckTime >= checkInterval) {
    if (world.isClient) {
      updateUIVisibility();
    }
    lastCheckTime = 0;
  }
  
  // Handle elevator animation (runs on both server and client)
  if (world.isServer) {
    // Server-side animation handling using app.state
    if (app.state.elevator && app.state.elevator.isAnimating) {
      app.state.elevator.animationProgress += delta / app.state.elevator.animationDuration;
      
      if (app.state.elevator.animationProgress >= 1.0) {
        // Animation complete
        app.state.elevator.animationProgress = 1.0;
        app.state.elevator.isAnimating = false;
        
        if (elevatorMesh) {
          elevatorMesh.position.y = app.state.elevator.animationTargetY;
          
          // Use setKinematicTarget for proper physics movement
          if (elevatorMesh.setKinematicTarget && typeof elevatorMesh.setKinematicTarget === 'function') {
            const pos = { x: elevatorMesh.position.x, y: app.state.elevator.animationTargetY, z: elevatorMesh.position.z };
            elevatorMesh.setKinematicTarget(pos, elevatorMesh.quaternion);
          }
        }
        
        console.log(`Server: Elevator animation completed: arrived at Y=${app.state.elevator.animationTargetY}`);
        
        // Reset server animation state
        app.state.elevator.currentFloor = Math.round(app.state.elevator.animationTargetY / 11);
        
        app.send('elevator:complete', {
          floor: Math.round(app.state.elevator.animationTargetY / 11),
          position: app.state.elevator.animationTargetY
        });
        
        console.log(`Server: Elevator animation completed, state reset. Current floor: ${app.state.elevator.currentFloor}`);
      } else {
        // Update elevator position during animation
        if (elevatorMesh) {
          // Use smooth easing function (ease-in-out)
          const easedProgress = app.state.elevator.animationProgress < 0.5 
            ? 2 * app.state.elevator.animationProgress * app.state.elevator.animationProgress 
            : 1 - Math.pow(-2 * app.state.elevator.animationProgress + 2, 2) / 2;
          
          const newY = app.state.elevator.animationStartY + (app.state.elevator.animationTargetY - app.state.elevator.animationStartY) * easedProgress;
          elevatorMesh.position.y = newY;
          
          // Use setKinematicTarget for proper physics movement
          if (elevatorMesh.setKinematicTarget && typeof elevatorMesh.setKinematicTarget === 'function') {
            const pos = { x: elevatorMesh.position.x, y: newY, z: elevatorMesh.position.z };
            elevatorMesh.setKinematicTarget(pos, elevatorMesh.quaternion);
          }
        }
      }
    }
  } else {
    // Client-side animation handling using local variables
    if (isAnimating) {
      animationProgress += delta / currentAnimationDuration;
      
      if (animationProgress >= 1.0) {
        // Animation complete
        animationProgress = 1.0;
        isAnimating = false;
        
        if (elevatorMesh) {
          elevatorMesh.position.y = animationTargetY;
          
          // Use setKinematicTarget for proper physics movement
          if (elevatorMesh.setKinematicTarget && typeof elevatorMesh.setKinematicTarget === 'function') {
            const pos = { x: elevatorMesh.position.x, y: animationTargetY, z: elevatorMesh.position.z };
            elevatorMesh.setKinematicTarget(pos, elevatorMesh.quaternion);
          }
        }
        
        console.log(`Client: Elevator animation completed: arrived at Y=${animationTargetY}`);
        
        // Update elevator position indicator to final position
        updateElevatorPositionIndicator(animationTargetY);
      } else {
        // Update elevator position during animation
        if (elevatorMesh) {
          // Use smooth easing function (ease-in-out)
          const easedProgress = animationProgress < 0.5 
            ? 2 * animationProgress * animationProgress 
            : 1 - Math.pow(-2 * animationProgress + 2, 2) / 2;
          
          const newY = animationStartY + (animationTargetY - animationStartY) * easedProgress;
          elevatorMesh.position.y = newY;
          
          // Update elevator position indicator based on current elevator position
          updateElevatorPositionIndicator(newY);
          
          // Use setKinematicTarget for proper physics movement
          if (elevatorMesh.setKinematicTarget && typeof elevatorMesh.setKinematicTarget === 'function') {
            const pos = { x: elevatorMesh.position.x, y: newY, z: elevatorMesh.position.z };
            elevatorMesh.setKinematicTarget(pos, elevatorMesh.quaternion);
          }
        }
      }
    } else {
      // Update elevator position indicator even when not animating (for initial position)
      if (elevatorMesh) {
        const currentY = elevatorMesh.position.y;
        updateElevatorPositionIndicator(currentY);
      }
    }
  }
});
