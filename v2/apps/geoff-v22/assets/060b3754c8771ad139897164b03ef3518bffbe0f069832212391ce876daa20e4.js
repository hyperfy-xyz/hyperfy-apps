// Camera Anchor System - Click to teleport camera to this location

app.configure([
	{
		key: 'anchorName',
		type: 'text',
		label: 'Camera Anchor Name',
		initial: 'Camera Point'
	},
	{
		key: 'transitionSpeed',
		type: 'number',
		label: 'Camera Transition Speed',
		initial: 1.5,
		min: 0.5,
		max: 5.0,
		dp: 1
	},
	{
		key: 'cameraHeight',
		type: 'number',
		label: 'Camera Height Offset (Y)',
		initial: 1.6,
		min: -5.0,
		max: 5.0,
		dp: 1
	},
	{
		key: 'cameraOffsetX',
		type: 'number',
		label: 'Camera X Offset',
		initial: 0.0,
		min: -10.0,
		max: 10.0,
		dp: 1
	},
	{
		key: 'cameraOffsetZ',
		type: 'number',
		label: 'Camera Z Offset',
		initial: 0.0,
		min: -10.0,
		max: 10.0,
		dp: 1
	},
	{
		key: 'shotType',
		type: 'dropdown',
		label: 'V-Tubing Shot Type',
		initial: 'medium',
		options: [
			{ value: 'closeup', label: 'Close-up Shot' },
			{ value: 'medium', label: 'Medium Shot' },
			{ value: 'wide', label: 'Wide Shot' },
			{ value: 'fullbody', label: 'Full Body Shot' },
			{ value: 'overhead', label: 'Overhead Shot' },
			{ value: 'lowangle', label: 'Low Angle (Heroic)' },
			{ value: 'highangle', label: 'High Angle (Cute)' },
			{ value: 'profile', label: 'Profile Shot' },
			{ value: 'custom', label: 'Custom Position' }
		]
	},
	{
		key: 'cameraAngle',
		type: 'dropdown',
		label: 'Camera Angle Style',
		initial: 'eye_level',
		options: [
			{ value: 'eye_level', label: 'Eye Level' },
			{ value: 'slight_high', label: 'Slightly Above (Flattering)' },
			{ value: 'dramatic_high', label: 'High Angle (Dramatic)' },
			{ value: 'slight_low', label: 'Slightly Below (Confident)' },
			{ value: 'dramatic_low', label: 'Low Angle (Powerful)' }
		]
	},
	{
		key: 'movementStyle',
		type: 'dropdown',
		label: 'Camera Movement Style',
		initial: 'smooth',
		options: [
			{ value: 'instant', label: 'Instant Cut' },
			{ value: 'smooth', label: 'Smooth Transition' },
			{ value: 'cinematic', label: 'Cinematic Ease' },
			{ value: 'bounce', label: 'Bouncy Animation' },
			{ value: 'zoom_in', label: 'Zoom In Effect' },
			{ value: 'spiral', label: 'Spiral Approach' }
		]
	},
	{
		key: 'lookDirection',
		type: 'dropdown',
		label: 'Manual Look Direction',
		initial: 'auto',
		options: [
			{ value: 'auto', label: 'Auto (Based on Shot Type)' },
			{ value: 'forward', label: 'Forward (Z-)' },
			{ value: 'back', label: 'Back (Z+)' },
			{ value: 'left', label: 'Left (X-)' },
			{ value: 'right', label: 'Right (X+)' },
			{ value: 'up', label: 'Up (Y+)' },
			{ value: 'down', label: 'Down (Y-)' }
		]
	},

	{
		key: 'visibleType',
		type: 'toggle',
		label: 'Anchor Visibility',
		trueLabel: 'Visible',
		falseLabel: 'Hidden',
		initial: true
	},
	{
		key: 'showDebug',
		type: 'toggle',
		label: 'Show Debug Messages',
		trueLabel: 'Yes',
		falseLabel: 'No',
		initial: false
	},
	{
		key: 'showReticle',
		type: 'toggle',
		label: 'Show Camera Reticle',
		trueLabel: 'Yes',
		falseLabel: 'No',
		initial: false
	},
	{
		key: 'enableTracking',
		type: 'toggle',
		label: 'Enable Player Tracking',
		trueLabel: 'Yes',
		falseLabel: 'No',
		initial: false
	},
	{
		key: 'trackingSpeed',
		type: 'number',
		label: 'Tracking Speed',
		initial: 2.0,
		min: 0.5,
		max: 10.0,
		dp: 1
	},
	{
		key: 'trackingSmooth',
		type: 'number',
		label: 'Tracking Smoothness',
		initial: 5.0,
		min: 1.0,
		max: 20.0,
		dp: 1
	},
	{
		key: 'trackingRange',
		type: 'number',
		label: 'Max Tracking Distance',
		initial: 50.0,
		min: 0.01,
		max: 100.0,
		dp: 1
	},
	{
		type: 'section',
		key: 'triggerSection',
		label: 'Trigger Activation'
	},
	{
		key: 'enableTriggerMode',
		type: 'toggle',
		label: 'Enable Trigger Mode',
		trueLabel: 'Yes',
		falseLabel: 'No',
		initial: false
	},
	{
		key: 'triggerSignal',
		type: 'text',
		label: 'Trigger Signal Name',
		initial: 'Trigger',
		placeholder: 'Signal to listen for'
	},
	{
		key: 'triggerAction',
		type: 'dropdown',
		label: 'Trigger Action',
		initial: 'enter_only',
		options: [
			{ value: 'enter_only', label: 'Activate on Enter Only' },
			{ value: 'enter_exit', label: 'Activate on Enter, Release on Exit' },
			{ value: 'toggle', label: 'Toggle Camera on Each Trigger' }
		]
	},
	{
		key: 'autoRelease',
		type: 'number',
		label: 'Auto Release Time (seconds)',
		initial: 0,
		min: 0,
		max: 60,
		dp: 1
	}
]);

// Get configuration values
const anchorName = props.anchorName || 'Camera Point';
const transitionSpeed = props.transitionSpeed || 1.5;
const cameraHeight = props.cameraHeight || 1.6;
const cameraOffsetX = props.cameraOffsetX || 0.0;
const cameraOffsetZ = props.cameraOffsetZ || 0.0;
const shotType = props.shotType || 'medium';
const cameraAngle = props.cameraAngle || 'eye_level';
const movementStyle = props.movementStyle || 'smooth';
const lookDirection = props.lookDirection || 'auto';
const visibleType = props.visibleType !== false;
const showDebug = props.showDebug || false;
const showReticle = props.showReticle || false;
const enableTracking = props.enableTracking || false;
const trackingSpeed = props.trackingSpeed || 2.0;
const trackingSmooth = props.trackingSmooth || 5.0;
const trackingRange = props.trackingRange || 50.0;
const enableTriggerMode = props.enableTriggerMode || false;
const triggerSignal = props.triggerSignal || 'Trigger';
const triggerAction = props.triggerAction || 'enter_only';
const autoRelease = props.autoRelease || 0;

// Debug logging function
function debugLog(...args) {
	if (showDebug) {
		console.log(...args);
	}
}

debugLog('[CameraAnchor] Initializing camera anchor system');
debugLog('[CameraAnchor] Config:', { anchorName, transitionSpeed, cameraHeight, cameraOffsetX, cameraOffsetZ, shotType, cameraAngle, movementStyle, lookDirection, visibleType, showDebug, showReticle, enableTracking, trackingSpeed, trackingSmooth, trackingRange, enableTriggerMode, triggerSignal, triggerAction, autoRelease });

// State variables
let control = null;
let isTransitioning = false;
let transitionStartTime = 0;
let startPosition = new Vector3();
let startRotation = new Quaternion();
let targetPosition = new Vector3();
let targetRotation = new Quaternion();
let infoUI = null;
let posText = null;
let rotText = null;
let isTracking = false;
let currentTrackingRotation = new Quaternion();
let targetTrackingRotation = new Quaternion();
let autoReleaseTimer = null;
let autoReleaseStartTime = 0;
let isCameraActive = false;

// Function to show messages
function showMessage(text, duration = 3) {
	try {
		debugLog('[CameraAnchor] Showing message:', text);

		// Create temporary message UI
		const messageUI = app.create('ui');
		messageUI.width = Math.max(text.length * 8 + 20, 150);
		messageUI.height = 30;
		messageUI.backgroundColor = 'rgba(0, 0, 0, 0.9)';
		messageUI.borderRadius = 5;
		messageUI.padding = 10;
		messageUI.position.set(0, 3, 0);
		messageUI.billboard = 'y';
		messageUI.space = 'world';

		const messageText = app.create('uitext');
		messageText.value = text;
		messageText.color = '#ffffff';
		messageText.fontSize = 14;
		messageText.textAlign = 'center';

		messageUI.add(messageText);
		app.add(messageUI);

		// Store message info for cleanup in update loop
		messageUI._startTime = Date.now() / 1000;
		messageUI._duration = duration;

	} catch (err) {
		console.error('[CameraAnchor] Error showing message:', err);
	}
}

// Function to get v-tubing shot preset
function getVTubingPreset(shotType, cameraAngle) {
	let preset = { x: 0, y: 1.6, z: 0, lookDir: 'forward' };

	// Base shot type positioning
	switch (shotType) {
		case 'closeup':
			preset = { x: 0, y: 1.7, z: 1.5, lookDir: 'back' };
			break;
		case 'medium':
			preset = { x: 0, y: 1.6, z: 2.5, lookDir: 'back' };
			break;
		case 'wide':
			preset = { x: 0, y: 1.8, z: 4.0, lookDir: 'back' };
			break;
		case 'fullbody':
			preset = { x: 0, y: 2.5, z: 5.0, lookDir: 'back' };
			break;
		case 'overhead':
			preset = { x: 0, y: 4.0, z: 0, lookDir: 'down' };
			break;
		case 'lowangle':
			preset = { x: 0, y: 0.8, z: 2.0, lookDir: 'back' };
			break;
		case 'highangle':
			preset = { x: 0, y: 2.5, z: 1.5, lookDir: 'back' };
			break;
		case 'profile':
			preset = { x: 2.5, y: 1.6, z: 0, lookDir: 'left' };
			break;
		case 'custom':
			// Use manual offsets
			preset = { x: cameraOffsetX, y: cameraHeight, z: cameraOffsetZ, lookDir: lookDirection };
			break;
	}

	// Adjust for camera angle style
	if (shotType !== 'custom') {
		switch (cameraAngle) {
			case 'slight_high':
				preset.y += 0.3;
				break;
			case 'dramatic_high':
				preset.y += 0.8;
				break;
			case 'slight_low':
				preset.y -= 0.2;
				break;
			case 'dramatic_low':
				preset.y -= 0.6;
				break;
		}
	}

	return preset;
}

// Function to create info display
function createInfoDisplay() {
	if (infoUI) {
		app.remove(infoUI);
	}

	debugLog('[CameraAnchor] Creating info display');

	// Create UI container
	infoUI = app.create('ui');
	infoUI.width = 250;
	infoUI.height = 100;
	infoUI.backgroundColor = 'rgba(0,15,30,0.9)';
	infoUI.borderRadius = 8;
	infoUI.padding = 5;
	infoUI.justifyContent = 'center';
	infoUI.gap = 7;
	infoUI.alignItems = 'center';
	infoUI.position.set(0, 1, 0);
	infoUI.billboard = 'y';
	infoUI.space = 'world';

	// Create position display text
	posText = app.create('uitext');
	posText.value = `X: 0.00\nY: 0.00\nZ: 0.00`;
	posText.fontSize = 16;
	posText.color = '#ffffff';
	posText.textAlign = 'left';

	// Create rotation display text
	rotText = app.create('uitext');
	rotText.value = `RX: 0.00, RY: 0.00, RZ: 0.00`;
	rotText.fontSize = 16;
	rotText.color = '#ffffff';
	rotText.textAlign = 'left';

	// Create title text
	const titleText = app.create('uitext');
	titleText.value = `Camera: ${anchorName}`;
	titleText.color = '#00ffff';
	titleText.textAlign = 'center';
	titleText.padding = 6;

	// Add text to UI container
	infoUI.add(titleText);
	infoUI.add(posText);
	infoUI.add(rotText);

	// Add UI to app
	app.add(infoUI);

	debugLog('[CameraAnchor] Info display created');
}



// Function to update visibility
function updateVisibility() {
	debugLog('[CameraAnchor] Updating visibility to:', visibleType);

	// Show or hide the entire app
	app.active = visibleType;

	// Also update UI visibility
	if (infoUI) {
		infoUI.active = visibleType;
	}
}

// Function to calculate camera target
function calculateCameraTarget() {
	debugLog('[CameraAnchor] Calculating target - shotType:', shotType, 'cameraAngle:', cameraAngle, 'movementStyle:', movementStyle);

	// Get preset or use custom values
	let preset;
	if (shotType === 'custom') {
		preset = { x: cameraOffsetX, y: cameraHeight, z: cameraOffsetZ, lookDir: lookDirection };
	} else {
		preset = getVTubingPreset(shotType, cameraAngle);
	}

	// Set target position at app location with preset/custom offsets
	targetPosition.copy(app.position);
	targetPosition.x += preset.x;
	targetPosition.y += preset.y;
	targetPosition.z += preset.z;

	debugLog('[CameraAnchor] Target position:', targetPosition);

	// Calculate look direction (auto or manual)
	let direction = new Vector3();
	const finalLookDirection = lookDirection === 'auto' ? preset.lookDir : lookDirection;

	switch (finalLookDirection) {
		case 'forward':
			direction.set(0, 0, -1);
			break;
		case 'back':
			direction.set(0, 0, 1);
			break;
		case 'left':
			direction.set(-1, 0, 0);
			break;
		case 'right':
			direction.set(1, 0, 0);
			break;
		case 'up':
			direction.set(0, 1, 0);
			break;
		case 'down':
			direction.set(0, -1, 0);
			break;
	}

	// Apply app's rotation to the direction
	direction.applyQuaternion(app.quaternion);

	// Calculate target rotation to look in that direction
	const lookAtMatrix = new Matrix4();
	lookAtMatrix.lookAt(
		targetPosition,
		targetPosition.clone().add(direction),
		new Vector3(0, 1, 0)
	);

	targetRotation.setFromRotationMatrix(lookAtMatrix);

	debugLog('[CameraAnchor] Camera target calculated for', shotType, 'shot');
}

// Function to start transition
function startTransition() {
	isTransitioning = true;
	transitionStartTime = Date.now() / 1000;

	// Store starting position and rotation
	startPosition.copy(control.camera.position);
	startRotation.copy(control.camera.quaternion);

	debugLog('[CameraAnchor] Transition started');
	debugLog('From:', startPosition);
	debugLog('To:', targetPosition);
}

// Function to apply movement style easing
function applyMovementEasing(progress, style) {
	switch (style) {
		case 'instant':
			return progress >= 1 ? 1 : 0;
		case 'smooth':
			return progress < 0.5
				? 2 * progress * progress
				: 1 - Math.pow(-2 * progress + 2, 2) / 2;
		case 'cinematic':
			return progress * progress * (3 - 2 * progress); // Smoothstep
		case 'bounce':
			if (progress < 0.5) {
				return 2 * progress * progress;
			} else {
				return 1 - Math.pow(-2 * progress + 2, 4) / 2;
			}
		case 'zoom_in':
			return Math.pow(progress, 0.5); // Ease out
		case 'spiral':
			return 1 - Math.cos(progress * Math.PI * 0.5); // Sine ease
		default:
			return progress;
	}
}

// Function to update transition
function updateTransition(delta) {
	if (!isTransitioning) return;

	const currentTime = Date.now() / 1000;
	const elapsed = currentTime - transitionStartTime;

	// Adjust duration based on movement style
	let baseDuration = 1.0 / transitionSpeed;
	if (movementStyle === 'instant') {
		baseDuration = 0.1; // Very fast for instant cuts
	} else if (movementStyle === 'cinematic') {
		baseDuration *= 1.5; // Slower for cinematic feel
	}

	const progress = Math.min(elapsed / baseDuration, 1);
	const eased = applyMovementEasing(progress, movementStyle);

	// Interpolate position and rotation
	control.camera.position.lerpVectors(startPosition, targetPosition, eased);
	control.camera.quaternion.slerpQuaternions(startRotation, targetRotation, eased);

	if (progress >= 1) {
		isTransitioning = false;
		debugLog('[CameraAnchor] Transition complete with', movementStyle, 'style');

		// Initialize tracking rotation if tracking is enabled
		if (enableTracking && control) {
			currentTrackingRotation.copy(control.camera.quaternion);
			debugLog('[CameraAnchor] Tracking initialized');
		}
	}
}

// Function to handle click
function handleClick() {
	debugLog('[CameraAnchor] App clicked!');

	// If in trigger mode, disable manual clicking
	if (enableTriggerMode) {
		debugLog('[CameraAnchor] Trigger mode enabled - manual clicking disabled');
		showMessage('Trigger mode active - use trigger area to activate', 3);
		return;
	}

	if (isTransitioning) {
		debugLog('[CameraAnchor] Already transitioning, ignoring click');
		return;
	}

	debugLog('[CameraAnchor] Starting manual camera activation');
	activateCamera();
}



// Setup interaction
debugLog('[CameraAnchor] Setting up interaction on app');

// Make the app itself clickable
app.onPointerDown = handleClick;
app.cursor = 'pointer';

// Add hover feedback
app.onPointerEnter = () => {
	debugLog('[CameraAnchor] Pointer entered app');
};

app.onPointerLeave = () => {
	debugLog('[CameraAnchor] Pointer left app');
};

debugLog('[CameraAnchor] Interaction handlers set');

// Create info display
createInfoDisplay();

// Set up visibility handling
app.on('props:visibleType', updateVisibility);
updateVisibility();

// Set up trigger mode if enabled
if (enableTriggerMode) {
	debugLog('[CameraAnchor] Setting up trigger mode for signal:', triggerSignal);

	// Listen for both app.emit and world.emit signals
	app.on(triggerSignal, handleTriggerSignal);
	world.on(triggerSignal, handleTriggerSignal);

	debugLog('[CameraAnchor] Trigger listeners set up');

	// Disable manual clicking in trigger mode
	app.cursor = 'default';

	// Update hover message
	app.onPointerEnter = () => {
		debugLog('[CameraAnchor] Pointer entered app (trigger mode)');
	};
} else {
	debugLog('[CameraAnchor] Manual mode - click to activate');
}

// Function to update player tracking
function updatePlayerTracking(delta) {
	if (!control || !enableTracking || isTransitioning) return;

	// Get the player
	const player = world.getPlayer();
	if (!player) return;

	// Get player position
	const playerPos = player.position;
	const cameraPos = control.camera.position;

	// Calculate distance to player
	const distance = cameraPos.distanceTo(playerPos);

	// Only track if player is within range
	if (distance > trackingRange) {
		if (isTracking || isCameraActive) {
			debugLog('[CameraAnchor] Player out of range (', distance.toFixed(1), 'm), releasing camera control');
			releaseCameraControl();
		}
		return;
	}

	// Start tracking if not already
	if (!isTracking) {
		debugLog('[CameraAnchor] Player in range, starting tracking');
		isTracking = true;
		currentTrackingRotation.copy(control.camera.quaternion);
	}

	// Calculate direction from camera to player
	const direction = new Vector3();
	direction.subVectors(playerPos, cameraPos).normalize();

	// Create look-at matrix
	const lookAtMatrix = new Matrix4();
	lookAtMatrix.lookAt(
		cameraPos,
		playerPos,
		new Vector3(0, 1, 0)
	);

	// Set target rotation
	targetTrackingRotation.setFromRotationMatrix(lookAtMatrix);

	// Smoothly interpolate to target rotation
	const lerpSpeed = (trackingSpeed * delta) / trackingSmooth;
	currentTrackingRotation.slerp(targetTrackingRotation, lerpSpeed);

	// Apply rotation to camera
	control.camera.quaternion.copy(currentTrackingRotation);
}

// Function to activate camera (for both manual and trigger modes)
function activateCamera() {
	if (isCameraActive) {
		debugLog('[CameraAnchor] Camera already active, ignoring activation');
		return;
	}

	debugLog('[CameraAnchor] Activating camera via trigger');

	// Get camera control
	control = app.control();
	if (!control) {
		console.error('[CameraAnchor] Could not get camera control');
		showMessage('Error: Could not get camera control', 3);
		return;
	}

	// Enable camera write mode
	control.camera.write = true;
	isCameraActive = true;

	// Handle reticle visibility
	if (showReticle) {
		debugLog('[CameraAnchor] Reticle left visible (default)');
	} else {
		control.hideReticle();
		debugLog('[CameraAnchor] Reticle hidden');
	}

	// Calculate target position and rotation
	calculateCameraTarget();

	// Start transition
	startTransition();

	// Set up auto-release timer if configured
	if (autoRelease > 0) {
		autoReleaseStartTime = Date.now() / 1000;
		autoReleaseTimer = autoRelease; // Store duration instead of timer ID
		debugLog('[CameraAnchor] Auto-release set for', autoRelease, 'seconds');
	}

	// Notify user
	showMessage(`Camera activated: ${anchorName}`, 2);
}

// Function to release camera control
function releaseCameraControl() {
	if (control) {
		debugLog('[CameraAnchor] Releasing camera control');
		control.camera.write = false;
		control.release();
		control = null;
		isTracking = false;
		isCameraActive = false;

		// Clear auto-release timer
		autoReleaseTimer = null;
		autoReleaseStartTime = 0;

		showMessage('Camera control released', 2);
	}
}

// Function to handle trigger signals
function handleTriggerSignal(data) {
	debugLog('[CameraAnchor] Received trigger signal:', triggerSignal, 'data:', data);

	// Get current player for comparison
	const currentPlayer = world.getPlayer();
	if (!currentPlayer) {
		debugLog('[CameraAnchor] No current player found, ignoring trigger');
		return;
	}

	// Handle different signal types from spherearea
	if (typeof data === 'number') {
		// Standard spherearea signal (1 = enter, 0 = exit) - IGNORE these in multiplayer
		debugLog('[CameraAnchor] Ignoring general trigger signal - use player-specific signals only');
		return;
	} else if (data && data.playerId) {
		// Player-specific signal from spherearea - ONLY respond to our own player
		debugLog('[CameraAnchor] Player-specific trigger for player:', data.playerId, 'current player:', currentPlayer.id);

		if (currentPlayer.id === data.playerId) {
			debugLog('[CameraAnchor] Trigger is for current player - processing');

			// For player-specific triggers, we treat them as "enter" events
			if (triggerAction === 'enter_only' || triggerAction === 'enter_exit') {
				activateCamera();
			} else if (triggerAction === 'toggle') {
				if (isCameraActive) {
					releaseCameraControl();
				} else {
					activateCamera();
				}
			}
		} else {
			debugLog('[CameraAnchor] Trigger is for different player - ignoring');
		}
	} else {
		debugLog('[CameraAnchor] Unknown trigger data format:', data);
	}
}

// Update loop for transitions, tracking, and key checking
app.on('update', (delta) => {
	// Update transition if active
	if (isTransitioning) {
		updateTransition(delta);
	} else if (control) {
		// Update player tracking when not transitioning
		updatePlayerTracking(delta);
	}

	// Check for Q key press to release camera control
	if (control && control.keyQ && control.keyQ.pressed) {
		debugLog('[CameraAnchor] Q key pressed - releasing camera');
		releaseCameraControl();
	}

	// Update position and rotation display
	if (app && app.position && app.rotation && posText && rotText) {
		const pos = app.position;
		const rot = app.rotation;

		posText.value = `X: ${pos.x.toFixed(2)}\nY: ${pos.y.toFixed(2)}\nZ: ${pos.z.toFixed(2)}`;
		rotText.value = `RX: ${rot.x.toFixed(2)}, RY: ${rot.y.toFixed(2)}, RZ: ${rot.z.toFixed(2)}`;
	}

	// Handle auto-release timer
	if (autoReleaseTimer && autoReleaseStartTime > 0) {
		const elapsed = (Date.now() / 1000) - autoReleaseStartTime;
		if (elapsed >= autoReleaseTimer) {
			debugLog('[CameraAnchor] Auto-releasing camera after', autoReleaseTimer, 'seconds');
			releaseCameraControl();
		}
	}

	// Clean up expired message UIs
	const messagesToRemove = [];
	app.children.forEach(child => {
		if (child._startTime && child._duration) {
			const elapsed = (Date.now() / 1000) - child._startTime;
			if (elapsed >= child._duration) {
				messagesToRemove.push(child);
			}
		}
	});
	messagesToRemove.forEach(msg => app.remove(msg));
});

debugLog('[CameraAnchor] Camera anchor initialized successfully!'); 