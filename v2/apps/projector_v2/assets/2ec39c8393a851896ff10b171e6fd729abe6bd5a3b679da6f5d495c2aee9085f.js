// Configure audio slots
app.configure([
	{
		key: 'clickSound',
		type: 'file',
		kind: 'audio',
		label: 'Click Sound'
	},
	{
		key: 'startSound',
		type: 'file',
		kind: 'audio',
		label: 'Start Sound'
	},
	{
		key: 'middleSound',
		type: 'file',
		kind: 'audio',
		label: 'Middle Sound'
	},
	{
		key: 'stopSound',
		type: 'file',
		kind: 'audio',
		label: 'Stop Sound'
	}
]);

// New configuration: set delay (in milliseconds) for triggering the middle sound after turning on.
const soundConfig = {
	middleSoundDelay: 4000  // 4000ms = 4 seconds delay
};

// Initialize state
app.state = {
	isOn: false
};

// Get references to objects
const projector = app.get('Projector');
if (!projector) {
	console.error('Could not find Projector object');
	return;
}

const volume = app.get('Volume');
if (!volume) {
	console.error('Could not find Volume mesh');
	return;
}

// Disable shadow casting on Volume mesh
volume.castShadow = false;

// Create audio instances (syntax modeled after the door example)
const clickSound = app.create('audio', {
	src: props.clickSound?.url,
	volume: 0.3,
	group: 'sfx',
	spatial: true
});

const startSound = app.create('audio', {
	src: props.startSound?.url,
	volume: 0.3,
	group: 'sfx',
	spatial: true
});

const middleSound = app.create('audio', {
	src: props.middleSound?.url,
	volume: 0.3,
	maxDistance: 10,
	refDistance: 1,
	rolloffFactor: 1,
	group: 'sfx',
	spatial: true,
	loop: true  // Let the audio node handle looping seamlessly.
});

const stopSound = app.create('audio', {
	src: props.stopSound?.url,
	volume: 0.6,
	group: 'sfx',
	spatial: true
});

// Anti-spam: enforce a 250ms delay between toggles
let lastToggleTime = 0;

// Variables for scheduling the middle sound via the update loop
let middleSoundScheduled = false;
let middleSoundElapsed = 0;

// Create an Action node attached to the Projector
const projectorAction = app.create('action', {
	label: 'Turn On',
	distance: 2.5,
	duration: 0,
	onTrigger: () => {
		const now = Date.now();
		if (now - lastToggleTime < 250) {
			console.log("Toggle ignored: within debounce time.");
			return; // Enforce 250ms debounce
		}
		lastToggleTime = now;
		
		// Toggle projector state
		app.state.isOn = !app.state.isOn;
		projectorAction.label = app.state.isOn ? 'Turn Off' : 'Turn On';
		console.log('Projector toggled:', app.state.isOn ? 'ON' : 'OFF');
		
		// Play click sound on every toggle
		if (clickSound) {
			clickSound.stop();
			clickSound.currentTime = 0;
			clickSound.play();
		}
		
		if (app.state.isOn) {
			// When turning ON: play the start sound immediately.
			if (startSound) {
				startSound.stop();
				startSound.currentTime = 0;
				startSound.play();
			}
			// Schedule the middle sound to start after 4000ms.
			middleSoundScheduled = true;
			middleSoundElapsed = 0;
		} else {
			// When turning OFF: cancel any scheduled middle sound.
			middleSoundScheduled = false;
			// Stop the middle sound immediately and play the stop sound.
			if (middleSound) {
				middleSound.stop();
			}
			if (stopSound) {
				stopSound.stop();
				stopSound.currentTime = 0;
				stopSound.play();
			}
		}
		
		// Enable the Volume mesh only when the projector is on.
		volume.active = app.state.isOn;
	}
});
projector.add(projectorAction);
projector.add(clickSound);
projector.add(startSound);
projector.add(middleSound);
projector.add(stopSound);

// UV configuration for animated meshes ("Display" and "Volume")
// Each frame is 640 pixels wide; full texture width is 10240 pixels.
// Frames 0–14 are animated; frame 15 is used for the off state.
const uvConfigs = {
	Display: {
		fps: 6,
		frameWidth: 640,
		textureWidth: 10240,
		playableFrames: 15,
		currentFrame: 0,
		frameTime: 0,
		offset: { x: 0, y: 0 }
	},
	Volume: {
		fps: 6,
		frameWidth: 640,
		textureWidth: 10240,
		playableFrames: 15,
		currentFrame: 0,
		frameTime: 0,
		offset: { x: 0, y: 0 }
	}
};

// Update loop: handles both UV animation and the scheduled middle sound trigger.
app.on('update', (dt) => {
	// Handle scheduling of the middle sound after 4000ms delay (when turning on)
	if (middleSoundScheduled) {
		middleSoundElapsed += dt;
		if (middleSoundElapsed >= soundConfig.middleSoundDelay / 1000) {
			console.log("Middle sound delay elapsed; triggering middle sound.");
			if (app.state.isOn && middleSound) {
				middleSound.stop();
				middleSound.currentTime = 0;
				middleSound.play();
			}
			// Once triggered, cancel the schedule.
			middleSoundScheduled = false;
		}
	}
	
	// Update UV offsets for animated meshes
	for (const key in uvConfigs) {
		const config = uvConfigs[key];
		
		if (app.state.isOn) {
			// Animate: loop through frames when on.
			config.frameTime += dt;
			if (config.frameTime >= (1 / config.fps)) {
				config.frameTime -= (1 / config.fps);
				config.currentFrame = (config.currentFrame + 1) % config.playableFrames;
			}
			config.offset.x = (config.frameWidth * config.currentFrame) / config.textureWidth;
		} else {
			// When off: set to final frame (index 15).
			config.currentFrame = config.playableFrames;
			config.offset.x = (config.frameWidth * config.playableFrames) / config.textureWidth;
		}
		
		const mesh = app.get(key);
		if (mesh && mesh.material) {
			mesh.material.textureX = config.offset.x;
			mesh.material.textureY = config.offset.y;
		}
		
		// Ensure the Volume mesh is active only when the projector is on.
		if (key === 'Volume') {
			mesh.active = app.state.isOn;
		}
	}
});
