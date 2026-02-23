// At the top of the file, add configuration
app.configure(() => [
    {
        key: 'displayName',
        type: 'text',
        label: 'Display Name',
        value: app.name || 'ROBCO MONORAIL'
    },
    {
        key: 'speed',
        type: 'number',
        label: 'Monorail Speed (Units/Sec)',
        value: 5,
        min: 1,
        max: 20,  // Increased max speed
        step: 1
    },
    {
        key: 'travelDistance',
        type: 'number',
        label: 'Travel Distance (Units)',
        value: 100,
        min: 10,
        max: 1000,
        step: 10
    }
]);

const train = app.get('Train');
train.type = 'kinematic';

// Store original positions of train
const originX = train.position.x;
const originY = train.position.y;
const originZ = train.position.z;

let isActive = false;
let speed = app.config?.speed || 5;
let distance = app.config?.travelDistance || 100;
let pauseTime = 1.0;
let currentSpeed = 0;
let maxSpeed = 8; // Increased max speed
let acceleration = 12; // Increased acceleration
let deceleration = 15; // Increased deceleration
let dampening = 0.98; // New dampening factor
let pauseTimer = 0;
let direction = -1;
let frame = 0;
let lastPosition = { x: 0, y: 0, z: 0 }; // Track last position for interpolation
const circuitFrames = [
    `┌── MONORAIL CONTROL ──┐
│ ═══╦═══╗  ►▒░░░░   │
│    ║   ║═►░▒░░░    │
│ ═══╝   ║═►░░▒░░    │
│        ╚═►░░░▒░    │
└───────────────────┘`,
    `┌── MONORAIL CONTROL ──┐
│ ═══╦═══╗  ░►▒░░░   │
│    ║   ║══►▒░░░    │
│    ║   ║═►░▒░░░    │
│        ╚═►░░▒░░    │
└───────────────────┘`,
    `┌── MONORAIL CONTROL ──┐
│ ═══╦═══╗  ░░►▒░░   │
│    ║   ║══░►▒░░    │
│    ║   ║══►▒░░░    │
│        ╚═►░▒░░░    │
└───────────────────┘`,
    `┌── MONORAIL CONTROL ──┐
│ ═══╦═══╗  ░░░►▒░   │
│    ║   ║══░░►▒░    │
│    ║   ║══░►▒░░    │
│        ╚══►▒░░░    │
└───────────────────┘`,
    `┌── MONORAIL CONTROL ──┐
│ ═══╦═══╗  ░░░░►▒   │
│    ║   ║══░░░►▒    │
│    ║   ║══░░►▒░    │
│        ╚══░►▒░░    │
└───────────────────┘`,
    `┌── MONORAIL CONTROL ──┐
│ ═══╦═══╗  ░░░░░►   │
│    ║   ║══░░░░►    │
│    ║   ║══░░░►▒    │
│        ╚══░░►▒░    │
└───────────────────┘`
];

const hyperfyFrames = [
    `    HYPERFY⚡   SYSTEMS`,
    `    HYPERFy ⚡  SYSTEMs`,
    `    HYPERfY  ⚡ SYSTEmS`,
    `    HYPErFY   ⚡SYStEMS`,
    `    HYPeRFY  ⚡ SySTEMS`,
    `    HYpERFY ⚡  sYSTEMS`,
    `    HyPERFY⚡   SYSTEMS`,
    `    hYPERFY ⚡  SYSTEMS`,
    `    HYPERFY  ⚡ SYSTEMS`,
    `    HYPERFy   ⚡sYSTEMS`,
    `    HYPErFY  ⚡ SyStEMS`,
    `    HYPeRFY ⚡  SYstEMS`,
    `    HYpERFY⚡   SYStems`
];

// Store original positions
const originalPositions = [{
    x: originX,
    y: originY,
    z: originZ
}];

// Create UI panel - Fallout terminal style
const ui = app.create('ui', {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Dark semi-transparent background
    borderRadius: 2,
    padding: 15,
    display: 'none',
    border: '2px solid rgba(255, 187, 51, 0.3)', // Amber border glow
    interactive: true,
    pointerEvents: 'all' // Make sure clicks register
});

// Center the UI better
ui.position.set(-42.6, 29, -1.5);
ui.scale.set(0.65, 0.65, 1);

// Title with Fallout terminal styling
const titleText = app.create('uitext', {
    value: '╔══ DOGE INDUSTRIES ══╗\n  MONORAIL OS v1.0.0  \n╚═════════════════════╝',
    fontSize: 14,
    color: '#ffb347', // Fallout amber color
    textAlign: 'center',
    fontFamily: 'monospace',
    marginBottom: 20,
    whiteSpace: 'pre-line'
});
ui.add(titleText);

// Add this after the titleText but before the statusDisplay
const hyperfyLogo = app.create('uitext', {
    value: hyperfyFrames[0],
    color: '#ffb347',
    fontSize: 12,
    fontFamily: 'monospace',
    whiteSpace: 'pre',
    textAlign: 'center',
    marginBottom: 15
});

ui.add(hyperfyLogo);

// Status Display with circuit animation
const statusDisplay = app.create('uitext', {
    value: circuitFrames[0],
    color: '#ffb347',
    fontSize: 12,
    fontFamily: 'monospace',
    whiteSpace: 'pre',
    textAlign: 'center',
    marginBottom: 15
});

ui.add(statusDisplay);

// Controls container with terminal styling
const controlsView = app.create('uiview', {
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
    backgroundColor: 'rgba(255, 179, 71, 0.05)', // Very subtle amber tint
    padding: 15,
    borderRadius: 2,
    border: '1px solid rgba(255, 179, 71, 0.1)', // Subtle amber border
    interactive: true,
    pointerEvents: 'all'
});

// Power button with terminal styling
const powerBtn = app.create('uitext', {
    value: '> POWER: [OFFLINE]',
    color: 'red',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    borderRadius: 2,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 16,
    interactive: true,
    pointerEvents: 'all',
    raycastPriority: 3,
    triggerShape: {
        type: 'box',
        size: { x: 2.8, y: 0.4, z: 0.1 },
        offset: { x: 0, y: -0.8, z: 0 }
    },
    onPointerEnter: () => {
        powerBtn.backgroundColor = 'rgba(255, 179, 71, 0.2)';
    },
    onPointerLeave: () => {
        powerBtn.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    },
    onPointerDown: () => {
        isActive = !isActive;
        powerBtn.value = `> POWER: [${isActive ? 'ONLINE' : 'OFFLINE'}]`;
        powerBtn.color = isActive ? '#ffb347' : 'red';
        if (!world.isServer) {
            app.send('requestPowerChange');
        }
    }
});

// Direction container
const directionContainer = app.create('uiview', {
    display: 'flex',
    gap: 10,
    marginTop: 5,
    interactive: true,
    pointerEvents: 'all'
});

// Forward button
const forwardBtn = app.create('uitext', {
    value: '> FORWARD [OFF]',
    color: '#ffb347',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    borderRadius: 2,
    cursor: 'pointer',
    width: '50%',
    fontFamily: 'monospace',
    fontSize: 16,
    interactive: true,
    pointerEvents: 'all',
    raycastPriority: 3,
    triggerShape: {
        type: 'box',
        size: { x: 1.3, y: 0.4, z: 0.1 },
        offset: { x: -0.7, y: -1.4, z: 0 }
    },
    onPointerEnter: () => {
        forwardBtn.backgroundColor = 'rgba(255, 179, 71, 0.2)';
    },
    onPointerLeave: () => {
        forwardBtn.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    },
    onPointerDown: () => {
        if (direction !== 1) {
            direction = 1;
            forwardBtn.value = '> FORWARD [ON]';
            reverseBtn.value = '> REVERSE [OFF]';
            if (!world.isServer) {
                app.send('requestDirectionChange', { direction: 1 });
            }
        }
    }
});

// Reverse button
const reverseBtn = app.create('uitext', {
    value: '> REVERSE [ON]',
    color: '#ffb347', // Fallout amber
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    borderRadius: 2,
    cursor: 'pointer',
    width: '50%',
    fontFamily: 'monospace',
    fontSize: 16,
    interactive: true,
    pointerEvents: 'all',
    raycastPriority: 3,
    triggerShape: {
        type: 'box',
        size: { x: 1.3, y: 0.4, z: 0.1 },
        offset: { x: 0.7, y: -1.4, z: 0 }
    },
    onPointerEnter: () => {
        reverseBtn.backgroundColor = 'rgba(255, 179, 71, 0.2)';
    },
    onPointerLeave: () => {
        reverseBtn.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    },
    onPointerDown: () => {
        if (direction !== -1) {
            direction = -1;
            reverseBtn.value = '> REVERSE [ON]';
            forwardBtn.value = '> FORWARD [OFF]';
            if (!world.isServer) {
                app.send('requestDirectionChange', { direction: -1 });
            }
        }
    }
});

directionContainer.add(forwardBtn);
directionContainer.add(reverseBtn);

// Remove all speed-related UI elements and just add power and direction to the UI
controlsView.add(powerBtn);
controlsView.add(directionContainer);
ui.add(controlsView);

// Add UI to the train
train.add(ui);

// Toggle UI visibility on interact but keep it interactive
app.on('interact', (event) => {
    if (event.target === train) {
        ui.display = ui.display === 'none' ? 'flex' : 'none';
        // Ensure UI stays interactive when visible
        if (ui.display === 'flex') {
            ui.interactive = true;
            powerBtn.interactive = true;
            forwardBtn.interactive = true;
            reverseBtn.interactive = true;
        }
    }
});

// Network state handling
let lastSent = 0;
const SEND_RATE = 1/60;

// Add server-side initialization
if (world.isServer) {
    app.state.ready = true;
    app.state.trainPos = {
        p: [train.position.x, train.position.y, train.position.z],
        isActive: isActive,
        direction: direction
    };
}

// Initialize from server state if client
if (world.isClient) {
    if (app.state.ready) {
        initFromState(app.state);
    } else {
        app.on('state', initFromState);
    }
}

function initFromState(state) {
    if (state.trainPos) {
        train.position.set(
            state.trainPos.p[0],
            state.trainPos.p[1],
            state.trainPos.p[2]
        );
        isActive = state.trainPos.isActive;
        direction = state.trainPos.direction;
        
        // Update UI to match state
        powerBtn.value = `> POWER: [${isActive ? 'ONLINE' : 'OFFLINE'}]`;
        powerBtn.color = isActive ? '#ffb347' : 'red';
        
        // Update direction buttons
        forwardBtn.value = `> FORWARD [${direction === 1 ? 'ON' : 'OFF'}]`;
        reverseBtn.value = `> REVERSE [${direction === -1 ? 'ON' : 'OFF'}]`;
    }
}

// Modify the update function
app.on('update', (delta) => {
    if (ui.display !== 'none') {
        frame += delta;
        if (frame > 0.08) {
            frame = 0;
            statusDisplay.value = circuitFrames[Math.floor(Date.now() / 100) % circuitFrames.length];
            hyperfyLogo.value = hyperfyFrames[Math.floor(Date.now() / 100) % hyperfyFrames.length];
        }
    }

    if (!isActive) {
        currentSpeed = 0;
        return;
    }

    if (pauseTimer > 0) {
        pauseTimer -= delta;
        currentSpeed = 0;
        return;
    }

    // Simpler movement logic
    currentSpeed = speed * direction;

    try {
        const originalPos = originalPositions[0];
        let nextX = (train.position.x || originalPos.x) + (currentSpeed * delta);

        // Check boundaries
        if ((direction === 1 && nextX >= originalPos.x + distance) || 
            (direction === -1 && nextX <= originalPos.x)) {
            nextX = direction === 1 ? originalPos.x + distance : originalPos.x;
            direction *= -1;
            pauseTimer = pauseTime;
            
            // Update UI
            forwardBtn.value = `> FORWARD [${direction === 1 ? 'ON' : 'OFF'}]`;
            reverseBtn.value = `> REVERSE [${direction === -1 ? 'ON' : 'OFF'}]`;
            
            currentSpeed = 0;
        }

        // Update position
        train.position.set(
            nextX,
            train.position.y || originalPos.y,
            train.position.z || originalPos.z
        );

        // Network updates
        if (world.isServer) {
            lastSent += delta;
            if (lastSent > SEND_RATE) {
                lastSent = 0;
                const state = {
                    p: [train.position.x, train.position.y, train.position.z],
                    isActive: isActive,
                    direction: direction,
                    speed: currentSpeed,
                    t: Date.now()
                };
                app.state.trainPos = state;
                app.send('trainMove', state);
            }
        }
    } catch (err) {
        console.error('Error updating train position:', err);
    }

    if (ui.display === 'none') return;
});

// Modify network message handlers
app.on('trainMove', (state) => {
    if (!state || !Array.isArray(state.p)) return;
    
    if (world.isClient) {
        train.position.set(state.p[0], state.p[1], state.p[2]);
        
        // Update control states
        if (state.isActive !== undefined && state.isActive !== isActive) {
            isActive = state.isActive;
            powerBtn.value = `> POWER: [${isActive ? 'ONLINE' : 'OFFLINE'}]`;
            powerBtn.color = isActive ? '#ffb347' : 'red';
        }
        
        if (state.direction !== undefined && state.direction !== direction) {
            direction = state.direction;
            forwardBtn.value = `> FORWARD [${direction === 1 ? 'ON' : 'OFF'}]`;
            reverseBtn.value = `> REVERSE [${direction === -1 ? 'ON' : 'OFF'}]`;
        }
    }
});

// Server-side control handlers
if (world.isServer) {
    app.on('requestPowerChange', (data, clientId) => {
        isActive = !isActive;
        app.send('trainPowerState', { isActive });
    });

    app.on('requestDirectionChange', (data, clientId) => {
        direction *= -1;
        app.send('trainDirectionState', { direction });
    });
}

// Client-side state handlers
app.on('trainPowerState', (state) => {
    if (state.isActive !== undefined) {
        isActive = state.isActive;
        powerBtn.value = `> POWER: [${isActive ? 'ONLINE' : 'OFFLINE'}]`;
        powerBtn.color = isActive ? '#ffb347' : 'red';
    }
});

app.on('trainDirectionState', (state) => {
    if (state.direction !== undefined) {
        direction = state.direction;
        forwardBtn.value = `> FORWARD [${direction === 1 ? 'ON' : 'OFF'}]`;
        reverseBtn.value = `> REVERSE [${direction === -1 ? 'ON' : 'OFF'}]`;
    }
});

// Add configuration change handler
app.on('config', () => {
    speed = app.config?.speed || 5;
    distance = app.config?.travelDistance || 100;
});

// Add back the train interaction trigger
const interactionTrigger = {
    type: 'box',
    size: { x: 3, y: 2, z: 0.5 },
    offset: { x: 0, y: 1.5, z: 0 }
};

train.interactable = true;
train.triggerShape = interactionTrigger;
train.interactionText = 'Show Monorail Controls';
