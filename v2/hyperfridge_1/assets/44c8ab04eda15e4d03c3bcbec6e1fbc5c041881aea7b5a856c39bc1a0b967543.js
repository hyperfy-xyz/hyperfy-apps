const ROTATION_SPEED = 0.5 // Speed of logo rotation in radians per second
const DOOR_ANIMATION_SPEED = 2.0 // Speed of door animation

// Configure audio slots
app.configure([
	{
		key: 'doorSound',
		type: 'file',
		kind: 'audio',
		label: 'Door Sound Effect'
	},
	{
		key: 'fridgeHum',
		type: 'file',
		kind: 'audio',
		label: 'Fridge Ambient Hum'
	}
])

// Initialize state
app.state = {
	isOpen: false,
	currentRotation: 0,
	targetRotation: 0
}

// Get references to objects
const logo = app.get('$HYPER')
const door = app.get('HyperFridgeDoor')
console.log('Door ID:', door?.id)

// Create audio instances
const doorSound = app.create('audio', {
	src: props.doorSound?.url,
	volume: 0.6,
	group: 'sfx',
	spatial: true
})

const fridgeHum = app.create('audio', {
	src: props.fridgeHum?.url,
	volume: 0.2,
	maxDistance: 10,
	refDistance: 1,
	rolloffFactor: 1,
	group: 'sfx',
	spatial: true,
	loop: true
})

// Create a simple action for the door
const action = app.create('action')
action.label = 'Open'
action.position.set(1, 0, 0)
action.distance = 2

// Add the action and sounds to the door if we have it
if (door) {
	door.add(action)
	door.add(doorSound)
	door.add(fridgeHum)
	// Start the ambient hum
	if (fridgeHum) {
		fridgeHum.play()
	}
} else {
	console.log('Door not found, adding action to app')
	app.add(action)
}

// Simple toggle action
action.onTrigger = () => {
	console.log('Action triggered')
	app.state.isOpen = !app.state.isOpen
	app.state.targetRotation = app.state.isOpen ? -Math.PI * 0.5 : 0 // Negative for opposite direction
	console.log('New state:', app.state.isOpen ? 'open' : 'closed')
	action.label = app.state.isOpen ? 'Close' : 'Open'

	// Play door sound
	if (doorSound) {
		doorSound.stop() // Stop any currently playing sound
		doorSound.currentTime = 0 // Reset to start
		doorSound.play()
	}
}

// Rotate logo and animate door
app.on('update', (dt) => {
	// Logo rotation
	if (logo) {
		logo.rotation.y += ROTATION_SPEED * dt
	}

	// Smooth door animation
	if (door && app.state.currentRotation !== app.state.targetRotation) {
		const diff = app.state.targetRotation - app.state.currentRotation
		const step = Math.sign(diff) * Math.min(Math.abs(diff), dt * DOOR_ANIMATION_SPEED)
		app.state.currentRotation += step
		door.rotation.y = app.state.currentRotation
	}
})