// Define configurable app properties for customization
app.configure([
	{
		key: 'enterEmote',
		type: 'file',
		kind: 'emote',
		label: 'Enter Animation'
	},
	{
		key: 'engineSound',
		type: 'file',
		kind: 'audio',
		label: 'Engine Sound',
		value: 'sounds/helicopter-engine.mp3'
	},
	{
		key: 'engineVolume',
		type: 'number',
		label: 'Engine Volume (0-20)',
		value: 15.0,
		min: 0,
		max: 20,
		step: 0.5
	},
	{
		key: 'rotorSpeed',
		type: 'number',
		label: 'Rotor Speed Multiplier',
		value: 1.0,
		min: 0.1,
		max: 3.0,
		step: 0.1
	},
	{
		type: 'section',
		key: 'spawnSettings',
		label: 'SPAWN LOCATION'
	},
	{
		key: 'spawnX',
		type: 'number',
		label: 'Spawn Position X',
		value: 0,
		step: 1
	},
	{
		key: 'spawnY',
		type: 'number',
		label: 'Spawn Position Y (Height)',
		value: 2,
		step: 1
	},
	{
		key: 'spawnZ',
		type: 'number',
		label: 'Spawn Position Z',
		value: 0,
		step: 1
	},
	{
		key: 'rotationY',
		type: 'number',
		label: 'Facing Direction (degrees)',
		value: 0,
		min: 0,
		max: 360,
		step: 15
	}
])

// #region Get references to helicopter components
const rigidbody = app.get('Body')
const backdoor = app.get('BackDoor')
const doorlock = app.get('DoorLock')
const frontRotor = app.get('RotorF')
const backRotor = app.get('RotorB')
const frontWheels = app.get('WheelsF')
const backWheels = app.get('WheelsB')
const pilot = app.get('Pilot')
const pilot2 = app.get('CoPilot')
const seat1 = app.get('Seat1')
const seat2 = app.get('Seat2')
const seat3 = app.get('Seat3')
const seat4 = app.get('Seat4')
const seat5 = app.get('Seat5')
const seat6 = app.get('Seat6')
const seat7 = app.get('Seat7')
const seat8 = app.get('Seat8')
const seat9 = app.get('Seat9')
const seat10 = app.get('Seat10')
const seat11 = app.get('Seat11')
const seat12 = app.get('Seat12')
const seat13 = app.get('Seat13')
const seat14 = app.get('Seat14')
const seat15 = app.get('Seat15')
const seat16 = app.get('Seat16')
const seat17 = app.get('Seat17')
const seat18 = app.get('Seat18')
const seat19 = app.get('Seat19')
const seat20 = app.get('Seat20')
const seat21 = app.get('Seat21')
const seat22 = app.get('Seat22')
const seat23 = app.get('Seat23')
const seat24 = app.get('Seat24')
const seat25 = app.get('Seat25')
const seat26 = app.get('Seat26')
const seat27 = app.get('Seat27')
const seat28 = app.get('Seat28')
const seat29 = app.get('Seat29')
const seat30 = app.get('Seat30')
const seat31 = app.get('Seat31')
const seat32 = app.get('Seat32')
const seat33 = app.get('Seat33')
const seat34 = app.get('Seat34')
const seat35 = app.get('Seat35')
const seat36 = app.get('Seat36')
const seat37 = app.get('Seat37')
// #endregion

// Create a wrapper for our helicopter
const heliWrapper = app.create('anchor', { id: 'HelicopterWrapper' })

// Core helicopter mechanics configuration
const HELI_CONFIG = {
	// Movement parameters
	VERTICAL_SPEED: 7,      // Rate of ascent/descent
	FORWARD_SPEED: 15,      // Maximum forward speed
	STRAFE_SPEED: 5,        // Side movement speed
	TURN_SPEED: 0.8,        // Yaw rotation speed
	PITCH_SPEED: 0.5,       // Pitch rotation speed (forward/backward tilt)
	ROLL_SPEED: 0.5,        // Roll rotation speed (side tilt)
	MIN_ALTITUDE: 0.5,      // Minimum hover height above ground

	// Rotor configuration
	ROTOR_IDLE_SPEED: 0.2,  // Rotation speed when idle
	ROTOR_MAX_SPEED: 3.0,   // Maximum rotation speed when flying
	ROTOR_ACCEL: 0.5,       // How quickly rotors accelerate

	// Physics parameters
	GRAVITY: 9.8,           // Gravity force
	HOVER_DAMPING: 0.95,    // Stabilization in hover
	GROUND_EFFECT: 2.0,     // Extra lift near ground
	MOMENTUM: 0.8,          // Momentum preservation factor

	// Initial spawn configuration (will use config values with these as fallbacks)
	SPAWN_POSITION: new Vector3(
		typeof app.config.spawnX === 'number' ? app.config.spawnX : 0,
		typeof app.config.spawnY === 'number' ? app.config.spawnY : 2,
		typeof app.config.spawnZ === 'number' ? app.config.spawnZ : 0
	),
	SPAWN_ROTATION: new Vector3(
		0,
		typeof app.config.rotationY === 'number' ? (app.config.rotationY * Math.PI / 180) : 0,  // Convert from degrees to radians
		0
	),

	// Camera view configuration
	CAMERA_DAMPING: 0.05,   // Smoothing factor for camera movement
	CAMERA_ANGLES: [        // Predefined camera positions and look-ahead distances
		{ position: new Vector3(0, 5, 15), lookAhead: 10 },    // Default chase camera - zoomed out
		{ position: new Vector3(0, 3, -10), lookAhead: 15 },   // Cockpit view - behind HUD, facing forward
		{ position: new Vector3(0, 2, 0), lookAhead: 15 },     // Copilot view
		{ position: new Vector3(0, 1.5, -5), lookAhead: 5 },   // Cargo view - looking forward
		{ position: new Vector3(8, 4, 5), lookAhead: 8 },      // Side view - wider angle
		{ position: new Vector3(0, 15, 0), lookAhead: 0, isOrbiting: true } // Orbiting camera
	],

	// Orbiting camera settings
	ORBIT_DISTANCE: 20,     // Distance from helicopter
	ORBIT_HEIGHT: 8,        // Height relative to helicopter
	ORBIT_SPEED: 0.2        // Rotation speed in radians per second
}

// Network synchronization settings
const MOVEMENT_CONFIG = {
	POSITION_LERP_ALPHA: 0.3,  // Position interpolation speed
	ROTATION_LERP_ALPHA: 0.4,  // Rotation interpolation speed
	PREDICTION_STEPS: 2,       // Client-side prediction steps
	UPDATE_RATE: 1 / 30          // Network update frequency (30 per second)
}

// Server-side game logic
if (world.isServer) {
	// Initialize comprehensive server-side state
	app.state = {
		doorOpen: false,          // Door state
		currentPilot: null,       // Who's currently piloting
		engineStarted: false,     // Engine state
		rotorSpeed: 0,            // Current rotor speed
		position: HELI_CONFIG.SPAWN_POSITION.toArray(), // Helicopter position
		rotation: {x: 0, y: HELI_CONFIG.SPAWN_ROTATION.y, z: 0}, // Helicopter rotation as object
		verticalSpeed: 0,         // Current vertical speed
		forwardSpeed: 0,          // Current forward speed
		strafeSpeed: 0,           // Current strafe speed
		lastUpdateTime: 0         // Time tracking for physics
	}
	
	// Handle player connection events
	app.on('request', playerId => {
		if (!app.state.currentPilot) {
			app.state.currentPilot = playerId
			app.send('playerId', playerId)
		} else {
			// Reject if someone else is already piloting
			app.send('pilotRejected', playerId)
		}
	})

	// Synchronize movement data
	app.on('move', (rotation, position, verticalSpeed, forwardSpeed, strafeSpeed, rotorSpeed, networkId) => {
		// Update server state
		app.state.rotation = rotation
		app.state.position = position
		app.state.verticalSpeed = verticalSpeed
		app.state.forwardSpeed = forwardSpeed 
		app.state.strafeSpeed = strafeSpeed
		app.state.rotorSpeed = rotorSpeed
		
		// Broadcast to all clients
		app.send('move', rotation, position, verticalSpeed, forwardSpeed, strafeSpeed, rotorSpeed, networkId)
	})
	
	// Handle player disconnection
	app.on('release', playerId => {
		if (app.state.currentPilot === playerId) {
			app.state.currentPilot = null
			
			// When pilot leaves, gradually stop the engine
			if (app.state.engineStarted) {
				// Set engine to shutting down state but don't turn it off immediately
				// Clients will handle the gradual shutdown animation
				app.send('engineShutdown')
			}
		}
		app.send('playerId', null)
	})
	
	// Handle cargo door toggles
	app.on('toggleDoor', (playerId) => {
		// Toggle door state on server
		app.state.doorOpen = !app.state.doorOpen
		
		// Broadcast door state to all clients
		app.send('doorState', app.state.doorOpen)
	})
	
	// Handle engine state changes
	app.on('engineState', (engineState, rotorSpeed, networkId) => {
		// Update server state
		app.state.engineStarted = engineState
		app.state.rotorSpeed = rotorSpeed
		
		// Broadcast to all clients
		app.send('engineState', engineState, rotorSpeed)
	})
	
	// Send comprehensive initial state to new clients
	app.on('playerJoin', (playerId) => {
		// Send complete helicopter state
		app.send(playerId, 'initState', {
			doorOpen: app.state.doorOpen,
			currentPilot: app.state.currentPilot,
			engineStarted: app.state.engineStarted,
			rotorSpeed: app.state.rotorSpeed,
			position: app.state.position,
			rotation: app.state.rotation, // Now consistently an object with x,y,z
			verticalSpeed: app.state.verticalSpeed,
			forwardSpeed: app.state.forwardSpeed,
			strafeSpeed: app.state.strafeSpeed
		})
	})
}

// Client-side game logic
if (world.isClient) {
	const player = world.getPlayer()

	// Make sure we have all required components
	if (!rigidbody || !frontRotor || !backRotor) {
		console.error('ERROR: Missing critical helicopter components!')
		console.error('Required: Body, RotorF, RotorB')
		console.error('Available components:')
		app.traverse(node => {
			if (node.isObject3D) {
				console.log(`- ID: ${node.id}, Name: ${node.name}`)
			}
		})
	} else {
		console.log('All required helicopter components found!')

		// Create a wrapper and move our helicopter into it
		heliWrapper.add(rigidbody)

		// Fix model orientation - rotate 180 degrees so pilot faces forward
		// rigidbody.rotation.y = Math.PI // Rotate 180 degrees around Y axis
		console.log('Applied 180-degree rotation to fix helicopter orientation')

		// Move helicopter to world space for independent movement
		world.add(heliWrapper)
		app.remove(heliWrapper)

		// Set initial spawn position and rotation
		heliWrapper.position.copy(HELI_CONFIG.SPAWN_POSITION)
		heliWrapper.rotation.x = HELI_CONFIG.SPAWN_ROTATION.x
		heliWrapper.rotation.y = HELI_CONFIG.SPAWN_ROTATION.y
		heliWrapper.rotation.z = HELI_CONFIG.SPAWN_ROTATION.z

		// Set up pilot anchor point
		const cockpit = app.create('anchor', { id: 'cockpit' })
		// Position the pilot anchor exactly at the pilot seat from our model
		if (pilot) {
			// Set anchor to match the pilot seat position 
			cockpit.position.copy(pilot.position)
			cockpit.rotation.copy(pilot.rotation + new Quaternion(0, 180, 0, 1))
			console.log('Positioned pilot at actual pilot seat position:', pilot.position)
		} else {
			// Fallback values if pilot seat reference is missing
			cockpit.position.y = 2
			cockpit.position.z = 1.5
			console.log('Pilot seat reference not found, using default position')
		}
		heliWrapper.add(cockpit)

		// Create flight HUD display
		const flightHUD = app.create('anchor', { id: 'flightHUD' })
		flightHUD.position.y = 1.5  // Position above eye level
		flightHUD.position.z = -.75 // Position in front of pilot
		cockpit.add(flightHUD)

		// Create HUD UI container
		const hudUI = app.create('ui')
		hudUI.width = 250
		hudUI.height = 120
		hudUI.billboard = 'y'  // Only rotate around Y axis for stable reading
		hudUI.size = 0.001     // Scale to appropriate size
		hudUI.backgroundColor = 'rgba(0, 0, 0, 0.)'  // Fallout green tint with transparency
		hudUI.borderRadius = 10
		hudUI.padding = 10
		flightHUD.add(hudUI)

		// Create altitude text
		const altitudeText = app.create('uitext')
		altitudeText.value = 'ALT: 0 FT'
		altitudeText.color = '#00ff00'  // Brotherhood green
		altitudeText.fontSize = 20
		altitudeText.textAlign = 'left'
		altitudeText.position.x = 10
		altitudeText.position.y = 20
		hudUI.add(altitudeText)

		// Create heading text
		const headingText = app.create('uitext')
		headingText.value = 'HDG: NORTH'
		headingText.color = '#00ff00'  // Brotherhood green
		headingText.fontSize = 20
		headingText.textAlign = 'left'
		headingText.position.x = 10
		headingText.position.y = 50
		hudUI.add(headingText)

		// Create rotor speed indicator
		const rotorText = app.create('uitext')
		rotorText.value = 'ROTOR: IDLE'
		rotorText.color = '#00ff00'  // Brotherhood green
		rotorText.fontSize = 20
		rotorText.textAlign = 'left'
		rotorText.position.x = 10
		rotorText.position.y = 80
		hudUI.add(rotorText)

		// Create interaction trigger for entering helicopter
		const action = app.create('action')
		action.position.y = 2
		action.label = '[ PILOT CHINOOK ]'
		cockpit.add(action)

		// Create interaction trigger for cargo door
		const doorAction = app.create('action')
	
		doorAction.label = '[ OPEN CARGO DOOR ]'  // Initially the door is closed
		doorlock.add(doorAction)

		// Handle cargo door interaction
		doorAction.onTrigger = () => {
			// Add debug message to confirm the trigger is working
			const debugText = app.create('uitext')
			debugText.value = 'ATTEMPTING DOOR OPERATION...'
			debugText.color = '#ffff00'
			debugText.fontSize = 24
			debugText.textAlign = 'center'
			hudUI.add(debugText)
			
			// Remove debug message after 2 seconds
			setTimeout(() => {
				hudUI.remove(debugText)
			}, 2000)
			
			// Send door toggle request to server
			app.send('toggleDoor', player.networkId)
			
			// The actual door animation will happen when server confirms
		}

		// Set up audio for helicopter engine
		const engineSound = app.create('audio')
		engineSound.src = app.config.engineSound?.url || 'sounds/helicopter-engine.mp3'
		engineSound.loop = true
		engineSound.spatial = true
		engineSound.volume = Math.min(Math.max(app.config.engineVolume || 15, 0), 20) * 0.35 // Scale to 0-7.0 range
		heliWrapper.add(engineSound)

		// Initialize flight control variables
		let control
		let isFlying = false
		let verticalSpeed = 0
		let forwardSpeed = 0
		let strafeSpeed = 0
		let targetAltitude = 0
		let engineStarted = false
		let engineShuttingDown = false
		let rotorSpeed = 0
		let lastUpdateTime = 0
		let lastSentState = null
		let currentCameraPosition = new Vector3()
		let currentCameraAngle = 0
		let orbitAngle = 0
		let doorOpen = false
		let doorAnimating = false
		let isPilot = false // Track if this client is the pilot

		// Handle helicopter entry request
		action.onTrigger = () => {
			action.active = false
			app.send('request', player.networkId)
		}

		// Function to update engine state
		function updateEngineState(newState, broadcast = true) {
			// Update local engine state
			engineStarted = newState
			
			// Update HUD
			if (rotorText) {
				if (engineStarted) {
					if (rotorSpeed < 0.3) {
						rotorText.value = 'ROTOR: IDLE'
						rotorText.color = '#ffff00' // Yellow for idle
					}
				} else {
					rotorText.value = 'ENGINE OFF'
					rotorText.color = '#ff0000' // Red for off
				}
			}
			
			// Play/pause engine sound
			if (engineStarted) {
				engineSound.play()
			} else if (rotorSpeed < 0.1) {
				engineSound.pause()
			}
			
			// Send to server if this is the pilot
			if (broadcast && isPilot) {
				app.send('engineState', engineStarted, rotorSpeed, player.networkId)
			}
		}

		// Function to handle the cargo door opening/closing
		function toggleCargoDoor(newDoorState) {
			// Use the backdoor reference we already have from app.get()
			if (!backdoor || doorAnimating) {
				// Show error message if door not found
				const errorText = app.create('uitext')
				errorText.value = backdoor ? 'DOOR BUSY' : 'DOOR NOT FOUND'
				errorText.color = '#ff0000'
				errorText.fontSize = 24
				errorText.textAlign = 'center'
				hudUI.add(errorText)
				
				// Log all available objects for debugging
				console.log('Available components:')
				console.log('BackDoor reference:', backdoor)
				
				// Remove error message after 3 seconds
				setTimeout(() => {
					hudUI.remove(errorText)
				}, 3000)
				return
			}
			
			doorAnimating = true
			const targetRotation = newDoorState ? -Math.PI / 2 : 0 // 90 degrees down when open
			const startRotation = backdoor.rotation.x
			const animationDuration = 1.5 // seconds
			let animationTime = 0
			
			// Create a temporary animation function
			const animateDoor = (delta) => {
				animationTime += delta
				const progress = Math.min(animationTime / animationDuration, 1)
				
				// Use easing for smoother animation
				const easedProgress = progress < 0.5
					? 2 * progress * progress
					: 1 - Math.pow(-2 * progress + 2, 2) / 2 // easeInOutQuad
				
				// Update door rotation
				backdoor.rotation.x = startRotation + (targetRotation - startRotation) * easedProgress
				
				if (progress >= 1) {
					// Animation complete
					doorOpen = newDoorState
					doorAnimating = false
					
					// Display door status message
					const doorStatus = app.create('uitext')
					doorStatus.value = doorOpen ? 'CARGO DOOR: OPEN' : 'CARGO DOOR: CLOSED'
					doorStatus.color = doorOpen ? '#ff9900' : '#00ff00'
					doorStatus.fontSize = 24
					doorStatus.textAlign = 'center'
					hudUI.add(doorStatus)
					
					// Update door action label
					if (doorAction) {
						doorAction.label = doorOpen ? '[ CLOSE CARGO DOOR ]' : '[ OPEN CARGO DOOR ]'
					}
					
					// Remove status message after 2 seconds
					setTimeout(() => {
						hudUI.remove(doorStatus)
					}, 2000)
					
					// Remove this animation function
					app.off('update', animateDoor)
				}
			}
			
			// Add the animation function to the update loop
			app.on('update', animateDoor)
		}

		// Handle door state updates from server
		app.on('doorState', (newDoorState) => {
			// Only animate if state actually changed
			if (newDoorState !== doorOpen && !doorAnimating) {
				toggleCargoDoor(newDoorState)
			}
		})

		// Handle engine state updates from server
		app.on('engineState', (newEngineState, newRotorSpeed) => {
			// Don't update if we're the pilot - we're the source of truth for our own actions
			if (!isPilot) {
				engineStarted = newEngineState
				
				// Update rotor speed gradually in update loop
				// This target value will be approached gradually
				if (rotorSpeed !== newRotorSpeed) {
					// If engine is shutting down but rotors still spinning
					if (!newEngineState && newRotorSpeed > 0) {
						engineShuttingDown = true
					}
				}
			}
		})

		// Handle engine shutdown event
		app.on('engineShutdown', () => {
			engineShuttingDown = true
			
			if (isPilot) {
				// Turn off engine but keep rotors spinning for a while
				updateEngineState(false, false) // Don't broadcast to avoid loops
			}
		})

		// Handle pilot rejection
		app.on('pilotRejected', (playerId) => {
			if (playerId === player.networkId) {
				// Show message that helicopter is already being piloted
				const rejectionText = app.create('uitext')
				rejectionText.value = 'HELICOPTER ALREADY IN USE'
				rejectionText.color = '#ff0000'
				rejectionText.fontSize = 24
				rejectionText.textAlign = 'center'
				
				// Create UI container for message if needed
				const messageUI = app.create('ui')
				messageUI.width = 300
				messageUI.height = 50
				messageUI.backgroundColor = 'rgba(0, 0, 0, 0.7)'
				messageUI.borderRadius = 5
				messageUI.padding = 10
				messageUI.billboard = 'full'
				messageUI.position.y = 2
				
				messageUI.add(rejectionText)
				heliWrapper.add(messageUI)
				
				// Allow the action to be triggered again
				action.active = true
				
				// Remove message after 3 seconds
				setTimeout(() => {
					heliWrapper.remove(messageUI)
				}, 3000)
			}
		})

		// Handle comprehensive initial state
		app.on('initState', (state) => {
			// Apply all state properties from server
			doorOpen = state.doorOpen
			engineStarted = state.engineStarted
			rotorSpeed = state.rotorSpeed
			verticalSpeed = state.verticalSpeed
			forwardSpeed = state.forwardSpeed
			strafeSpeed = state.strafeSpeed
			
			// Update helicopter position and rotation
			if (!isPilot) { // Only update position for non-pilots
				heliWrapper.position.set(state.position[0], state.position[1], state.position[2])
				// Make sure rotation exists and has proper format
				if (state.rotation && typeof state.rotation === 'object') {
					if (state.rotation.x !== undefined) heliWrapper.rotation.x = state.rotation.x;
					if (state.rotation.y !== undefined) heliWrapper.rotation.y = state.rotation.y;
					if (state.rotation.z !== undefined) heliWrapper.rotation.z = state.rotation.z;
				}
			}
			
			// Update door visual state without animation
			if (backdoor) {
				if (doorOpen) {
					backdoor.rotation.x = -Math.PI / 2 // Set door open
				} else {
					backdoor.rotation.x = 0 // Ensure door is closed
				}
				
				// Update door action label
				if (doorAction) {
					doorAction.label = doorOpen ? '[ CLOSE CARGO DOOR ]' : '[ OPEN CARGO DOOR ]'
				}
			}
			
			// Update engine sound
			if (engineStarted) {
				engineSound.play()
			}
		})

		// Function to handle entry into helicopter
		function enterHelicopter() {
			if (control) return
			isPilot = true
			control = app.control()

			// Get current player
			const player = world.getPlayer()

			// Apply pilot effect to player
			player.applyEffect({
				anchor: cockpit,
				emote: app.config.enterEmote?.url,
				cancellable: false
			})

			// Capture input controls
			control.mouseLeft.capture = true
			control.keyW.capture = true
			control.keyS.capture = true
			control.keyA.capture = true
			control.keyD.capture = true
			control.keyQ.capture = true
			control.keyE.capture = true
			control.space.capture = true
			control.shiftLeft.capture = true
			control.keyC.capture = true
			control.camera.write = true

			// Initialize camera position
			currentCameraPosition = heliWrapper.position.clone().add(
				new Vector3(0, 5, 15).applyQuaternion(heliWrapper.quaternion)
			)
			control.camera.position.copy(currentCameraPosition)

			// Start engine sound at idle
			engineSound.play()

			// Set up update loop
			app.on('update', updateHelicopter)
		}

		// Function to handle exit from helicopter
		function exitHelicopter() {
			if (!control) return
			
			try {
				// Remove the update loop first to prevent further calls
				app.off('update', updateHelicopter)
				
				// Get current player reference
				const player = world.getPlayer()
				if (!player) {
					console.error('Player not found during exit')
					return
				}
				
				// Release control
				if (control) {
					control.release()
				}
				
				// Clear all references
				control = null
				
				// Reset state
				verticalSpeed = 0
				forwardSpeed = 0
				strafeSpeed = 0
				
				// Apply landing effect
				try {
					const groundPos = new Vector3(
						heliWrapper.position.x,
						heliWrapper.position.y - 2,
						heliWrapper.position.z
					)
					
					player.applyEffect({
						position: groundPos.toArray(),
						duration: 0.1,
						cancellable: false
					})
				} catch (err) {
					console.error('Effect error:', err)
				}
				
				// Set flag immediately
				isPilot = false
				
				// Release on server
				app.send('release', player.networkId)
				
				// Reset action after delay
				setTimeout(() => {
					try {
						if (player && player.applyEffect) {
							player.applyEffect(null)
						}
						
						if (action) {
							action.active = true
						}
					} catch (err) {
						console.error('Timeout error:', err)
					}
				}, 2000)
			} catch (error) {
				console.error('Critical exit error:', error)
				// Last resort cleanup
				control = null
				isPilot = false
			}
		}

		// Main helicopter update loop - completely rewritten to be more defensive
		function updateHelicopter(delta) {
			try {
				// Check if we have a valid control object
				const hasValidControl = control && typeof control === 'object'
				
				// ROTOR ANIMATION - Always update rotors regardless of pilot status
				if (frontRotor) {
					frontRotor.rotation.y += rotorSpeed * (app.config.rotorSpeed || 1.0) * delta * 15
				}
				
				if (backRotor) {
					backRotor.rotation.y += rotorSpeed * (app.config.rotorSpeed || 1.0) * delta * 20
				}
				
				// Handle pilot controls only if we're the pilot and have valid control
				if (isPilot && hasValidControl) {
					// ENGINE START - Using safe property access
					if (control.shiftLeft && control.shiftLeft.pressed && !engineStarted) {
						updateEngineState(true)
						rotorSpeed = HELI_CONFIG.ROTOR_IDLE_SPEED
					}
					
					// HANDLE EXIT REQUEST - Using safe property access
					if (control.keyQ && control.keyQ.pressed) {
						exitHelicopter()
						return // Exit early to avoid further processing
					}
					
					// FLIGHT CONTROLS - Only if engine is started
					if (engineStarted) {
						// VERTICAL MOVEMENT - Using safe property access
						if (control.space && control.space.down) {
							verticalSpeed = Math.min(verticalSpeed + HELI_CONFIG.VERTICAL_SPEED * delta, HELI_CONFIG.VERTICAL_SPEED)
							rotorSpeed = Math.min(rotorSpeed + HELI_CONFIG.ROTOR_ACCEL * delta, HELI_CONFIG.ROTOR_MAX_SPEED)
						} else if (control.shiftLeft && control.shiftLeft.down) {
							verticalSpeed = Math.max(verticalSpeed - HELI_CONFIG.VERTICAL_SPEED * delta, -HELI_CONFIG.VERTICAL_SPEED)
							rotorSpeed = Math.min(rotorSpeed + HELI_CONFIG.ROTOR_ACCEL * delta, HELI_CONFIG.ROTOR_MAX_SPEED)
						} else {
							// Dampened hover
							verticalSpeed *= HELI_CONFIG.HOVER_DAMPING
							rotorSpeed = Math.max(HELI_CONFIG.ROTOR_IDLE_SPEED, rotorSpeed - (HELI_CONFIG.ROTOR_ACCEL * 0.5 * delta))
						}
						
						// FORWARD/BACKWARD - Using safe property access
						if (control.keyW && control.keyW.down) {
							forwardSpeed = Math.min(forwardSpeed + HELI_CONFIG.FORWARD_SPEED * delta, HELI_CONFIG.FORWARD_SPEED)
							rotorSpeed = Math.min(rotorSpeed + HELI_CONFIG.ROTOR_ACCEL * 0.5 * delta, HELI_CONFIG.ROTOR_MAX_SPEED)
							heliWrapper.rotation.x = Math.max(heliWrapper.rotation.x - HELI_CONFIG.PITCH_SPEED * delta, -0.3)
						} else if (control.keyS && control.keyS.down) {
							forwardSpeed = Math.max(forwardSpeed - HELI_CONFIG.FORWARD_SPEED * delta, -HELI_CONFIG.FORWARD_SPEED * 0.7)
							rotorSpeed = Math.min(rotorSpeed + HELI_CONFIG.ROTOR_ACCEL * 0.3 * delta, HELI_CONFIG.ROTOR_MAX_SPEED * 0.9)
							heliWrapper.rotation.x = Math.min(heliWrapper.rotation.x + HELI_CONFIG.PITCH_SPEED * delta, 0.2)
						} else {
							// Auto-level and reduce speed
							forwardSpeed *= HELI_CONFIG.MOMENTUM
							heliWrapper.rotation.x *= 0.95
						}
						
						// LEFT/RIGHT STRAFE - Using safe property access
						if (control.keyA && control.keyA.down) {
							strafeSpeed = Math.min(strafeSpeed - HELI_CONFIG.STRAFE_SPEED * delta, HELI_CONFIG.STRAFE_SPEED)
							heliWrapper.rotation.z = Math.min(heliWrapper.rotation.z + HELI_CONFIG.ROLL_SPEED * delta, 0.2)
						} else if (control.keyD && control.keyD.down) {
							strafeSpeed = Math.max(strafeSpeed + HELI_CONFIG.STRAFE_SPEED * delta, -HELI_CONFIG.STRAFE_SPEED)
							heliWrapper.rotation.z = Math.max(heliWrapper.rotation.z - HELI_CONFIG.ROLL_SPEED * delta, -0.2)
						} else {
							// Auto-level and reduce speed
							strafeSpeed *= HELI_CONFIG.MOMENTUM
							heliWrapper.rotation.z *= 0.95
						}
						
						// YAW ROTATION - Using safe property access
						if (control.pointer && control.pointer.delta) {
							heliWrapper.rotation.y += -control.pointer.delta.x * HELI_CONFIG.TURN_SPEED * delta * 0.3
						}
						
						// CAMERA SWITCHING - Using safe property access
						if (control.keyC && control.keyC.pressed) {
							currentCameraAngle = (currentCameraAngle + 1) % HELI_CONFIG.CAMERA_ANGLES.length
						}
						
						// Update camera position and orientation - only if we have control
						if (control && control.camera) {
							updateCameraPosition(delta)
						}
					} else {
						// Engine not started hint
						if (rotorText) {
							rotorText.value = 'PRESS SHIFT TO START ENGINE'
							rotorText.color = '#ffff00'
						}
					}
				} else if (engineShuttingDown) {
					// No pilot but engine shutting down
					rotorSpeed = Math.max(0, rotorSpeed - HELI_CONFIG.ROTOR_ACCEL * 0.3 * delta)
					
					if (rotorSpeed < 0.05) {
						rotorSpeed = 0
						engineShuttingDown = false
						if (engineSound) {
							engineSound.pause()
						}
					}
				} else {
					// No pilot - reduce speed gradually
					rotorSpeed = Math.max(0, rotorSpeed - HELI_CONFIG.ROTOR_ACCEL * 0.3 * delta)
					heliWrapper.rotation.x *= 0.98
					heliWrapper.rotation.z *= 0.98
				}
				
				// PHYSICS - Apply ground effect
				const isNearGround = checkIfNearGround()
				if (isNearGround && verticalSpeed < 0) {
					verticalSpeed *= 0.8
					if (heliWrapper.position.y < 2) {
						verticalSpeed += HELI_CONFIG.GROUND_EFFECT * delta
					}
				}
				
				// MOVEMENT - Apply position changes
				applyMovement(delta)
				
				// HUD UPDATE
				updateHUD()
				
				// NETWORK SYNC
				syncNetworkState()
				
				// SOUND
				if (engineSound) {
					const baseVolume = Math.min(Math.max(app.config.engineVolume || 15, 0), 20) * 0.35
					engineSound.volume = baseVolume * (0.5 + (rotorSpeed / HELI_CONFIG.ROTOR_MAX_SPEED) * 0.5)
				}
			} catch (error) {
				console.error('Update error:', error)
			}
		}

		// Helper function to check if near ground
		function checkIfNearGround() {
			try {
				const origin = heliWrapper.position.clone()
				const direction = new Vector3(0, -1, 0)
				const hit = world.raycast(origin, direction, 10)
				return hit && hit.distance < 5
			} catch (error) {
				return false
			}
		}

		// Helper function to apply movement
		function applyMovement(delta) {
			try {
				// Calculate movement vectors
				const forward = new Vector3(0, 0, -1).applyQuaternion(heliWrapper.quaternion)
				const right = new Vector3(1, 0, 0).applyQuaternion(heliWrapper.quaternion)
				
				// Apply vertical movement
				heliWrapper.position.y += verticalSpeed * delta
				
				// Floor check
				if (heliWrapper.position.y < HELI_CONFIG.MIN_ALTITUDE) {
					heliWrapper.position.y = HELI_CONFIG.MIN_ALTITUDE
					verticalSpeed = Math.max(0, verticalSpeed)
				}
				
				// Apply forward/backward movement
				heliWrapper.position.addScaledVector(forward, forwardSpeed * delta)
				
				// Apply left/right strafe movement
				heliWrapper.position.addScaledVector(right, strafeSpeed * delta)
			} catch (error) {
				console.error('Movement error:', error)
			}
		}

		// Helper function to update camera position
		function updateCameraPosition(delta) {
			try {
				if (!control || !control.camera) return
				
				const cameraPreset = HELI_CONFIG.CAMERA_ANGLES[currentCameraAngle]
				let targetPosition
				
				// Handle different camera types
				if (cameraPreset.isOrbiting) {
					orbitAngle += HELI_CONFIG.ORBIT_SPEED * delta
					const orbitX = Math.cos(orbitAngle) * HELI_CONFIG.ORBIT_DISTANCE
					const orbitZ = Math.sin(orbitAngle) * HELI_CONFIG.ORBIT_DISTANCE
					const orbitPosition = new Vector3(orbitX, HELI_CONFIG.ORBIT_HEIGHT, orbitZ)
					targetPosition = heliWrapper.position.clone().add(orbitPosition)
				} else {
					targetPosition = heliWrapper.position.clone().add(
						cameraPreset.position.clone().applyQuaternion(heliWrapper.quaternion)
					)
				}
				
				// Apply smoothing
				currentCameraPosition.lerp(targetPosition, HELI_CONFIG.CAMERA_DAMPING)
				control.camera.position.copy(currentCameraPosition)
				
				// Look direction
				const lookAtPosition = cameraPreset.isOrbiting ?
					heliWrapper.position.clone() :
					heliWrapper.position.clone().add(
						new Vector3(0, 0, -1)
							.applyQuaternion(heliWrapper.quaternion)
							.multiplyScalar(cameraPreset.lookAhead)
					)
				
				const lookDirection = lookAtPosition.clone().sub(currentCameraPosition).normalize()
				control.camera.quaternion.setFromRotationMatrix(
					new Matrix4().lookAt(
						new Vector3(0, 0, 0),
						lookDirection,
						new Vector3(0, 1, 0)
					)
				)
			} catch (error) {
				console.error('Camera error:', error)
			}
		}

		// Helper function to update HUD
		function updateHUD() {
			try {
				if (altitudeText && headingText && rotorText) {
					// Altitude display
					const altitudeFeet = Math.round(heliWrapper.position.y * 3.28084)
					altitudeText.value = `ALT: ${altitudeFeet} FT`
					
					// Heading display
					const headingDegrees = Math.round((((-heliWrapper.rotation.y) * (180 / Math.PI)) % 360 + 360) % 360)
					const cardinalDirection = degreesToCardinal(headingDegrees)
					headingText.value = `HDG: ${cardinalDirection} ${headingDegrees.toString().padStart(3, '0')}°`
					
					// Rotor speed display
					if (rotorSpeed < 0.3) {
						rotorText.value = 'ROTOR: IDLE'
						rotorText.color = '#ffff00'
					} else if (rotorSpeed < 1.0) {
						rotorText.value = 'ROTOR: LOW'
						rotorText.color = '#00ff00'
					} else if (rotorSpeed < 2.0) {
						rotorText.value = 'ROTOR: MEDIUM'
						rotorText.color = '#00ffff'
					} else {
						rotorText.value = 'ROTOR: MAX'
						rotorText.color = '#ff0000'
					}
				}
			} catch (error) {
				console.error('HUD error:', error)
			}
		}

		// Helper function to sync network state
		function syncNetworkState() {
			try {
				const now = Date.now() / 1000
				if (now - lastUpdateTime >= MOVEMENT_CONFIG.UPDATE_RATE) {
					const currentState = {
						rotation: { x: heliWrapper.rotation.x, y: heliWrapper.rotation.y, z: heliWrapper.rotation.z },
						position: heliWrapper.position.toArray(),
						verticalSpeed,
						forwardSpeed,
						strafeSpeed,
						rotorSpeed
					}
					
					// Only send on meaningful changes
					if (!lastSentState ||
						Math.abs(currentState.verticalSpeed - lastSentState.verticalSpeed) > 0.1 ||
						Math.abs(currentState.forwardSpeed - lastSentState.forwardSpeed) > 0.1 ||
						Math.abs(currentState.strafeSpeed - lastSentState.strafeSpeed) > 0.1 ||
						Math.abs(currentState.rotorSpeed - lastSentState.rotorSpeed) > 0.1 ||
						!vectorsEqual(currentState.position, lastSentState.position, 0.1) ||
						!vectorsEqual(currentState.rotation, lastSentState.rotation, 0.01)) {
						
						const player = world.getPlayer()
						if (player && player.networkId) {
							app.send('move',
								currentState.rotation,
								currentState.position,
								currentState.verticalSpeed,
								currentState.forwardSpeed,
								currentState.strafeSpeed,
								currentState.rotorSpeed,
								player.networkId
							)
							
							lastSentState = currentState
						}
					}
					
					lastUpdateTime = now
				}
			} catch (error) {
				console.error('Network sync error:', error)
			}
		}

		// Handle network events
		app.on('playerId', playerId => {
			action.active = !playerId
			if (playerId === player.networkId) {
				enterHelicopter()
			}
		})

		// Synchronize other players' movement
		app.on('move', (rotation, position, inVerticalSpeed, inForwardSpeed, inStrafeSpeed, inRotorSpeed, networkId) => {
			if (networkId === player.networkId) return

			// Convert rotation to proper format if needed
			let normalizedRotation = rotation;
			if (Array.isArray(rotation)) {
				normalizedRotation = { x: rotation[0], y: rotation[1], z: rotation[2] };
			}
			
			// Update helicopter position and orientation
			heliWrapper.position.lerp(new Vector3(position[0], position[1], position[2]), MOVEMENT_CONFIG.POSITION_LERP_ALPHA)
			
			// Safely access rotation properties with fallbacks
			if (normalizedRotation) {
				if (normalizedRotation.x !== undefined) {
					heliWrapper.rotation.x = lerpAngle(heliWrapper.rotation.x, normalizedRotation.x, MOVEMENT_CONFIG.ROTATION_LERP_ALPHA)
				}
				if (normalizedRotation.y !== undefined) {
					heliWrapper.rotation.y = lerpAngle(heliWrapper.rotation.y, normalizedRotation.y, MOVEMENT_CONFIG.ROTATION_LERP_ALPHA)
				}
				if (normalizedRotation.z !== undefined) {
					heliWrapper.rotation.z = lerpAngle(heliWrapper.rotation.z, normalizedRotation.z, MOVEMENT_CONFIG.ROTATION_LERP_ALPHA)
				}
			}

			// Update speed values
			verticalSpeed = inVerticalSpeed
			forwardSpeed = inForwardSpeed
			strafeSpeed = inStrafeSpeed
			rotorSpeed = inRotorSpeed

			// Update rotor animations based on received speed
			if (frontRotor) {
				frontRotor.rotation.y += rotorSpeed * (app.config.rotorSpeed || 1.0) * 0.16
			}

			if (backRotor) {
				backRotor.rotation.y += rotorSpeed * (app.config.rotorSpeed || 1.0) * 0.2
			}
		})
	}
}

// Helper function to convert degrees to cardinal directions
function degreesToCardinal(degrees) {
	// Define direction names
	const directions = [
		"NORTH", "NNE", "NE", "ENE",
		"EAST", "ESE", "SE", "SSE",
		"SOUTH", "SSW", "SW", "WSW",
		"WEST", "WNW", "NW", "NNW"
	]

	// Each direction covers 22.5 degrees
	const index = Math.round(degrees / 22.5) % 16
	return directions[index]
}

// Compares two vectors (either arrays or objects) for approximate equality within a threshold
function vectorsEqual(a, b, threshold) {
	if (Array.isArray(a)) {
		return Math.abs(a[0] - b[0]) < threshold &&
			Math.abs(a[1] - b[1]) < threshold &&
			Math.abs(a[2] - b[2]) < threshold
	}
	return Math.abs(a.x - b.x) < threshold &&
		Math.abs(a.y - b.y) < threshold &&
		Math.abs(a.z - b.z) < threshold
}

// Interpolates between two angles in radians, taking the shortest path around the circle
function lerpAngle(start, end, alpha) {
	start = ((start + Math.PI) % (2 * Math.PI)) - Math.PI
	end = ((end + Math.PI) % (2 * Math.PI)) - Math.PI

	let delta = end - start
	if (delta > Math.PI) delta -= 2 * Math.PI
	if (delta < -Math.PI) delta += 2 * Math.PI

	return start + delta * alpha
}