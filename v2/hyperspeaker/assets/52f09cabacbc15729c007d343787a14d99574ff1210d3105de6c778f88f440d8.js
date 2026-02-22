app.configure([
	{
		key: 'audio',
		type: 'file',
		kind: 'audio',
		label: 'Audio'
	},
	// {
	// 	key: 'volume',
	// 	type: 'switch',
	// 	label: 'Volume Level',
	// 	options: [
	// 		{ label: 'Low', value: 0.3 },
	// 		{ label: 'Medium', value: 0.6 },
	// 		{ label: 'High', value: 1.0 }
	// 	]
	// },
	// {
	// 	key: 'audioType',
	// 	type: 'switch',
	// 	label: 'Audio Type',
	// 	options: [
	// 		{ label: 'Music', value: 'music' },
	// 		{ label: 'Sound Effect', value: 'sfx' }
	// 	]
	// }
])

// console.log('Starting speaker setup...')

const audio = app.create('audio', {
	src: props.audio?.url,
	volume: props.volume || 0.6,
	group: props.audioType || 'music',
	spatial: true
})

// Log initial audio setup
// console.log('Audio created with initial volume:', audio.volume)

// Get reference to Mesh2 and its material for animation
const speaker = app.get('Mesh2')
const speakerMaterial = speaker?.material
// console.log('Speaker object:', speaker)
// console.log('Speaker material:', speakerMaterial.emissiveIntensity)

// More careful initialization of original position
let originalPosition = 0
try {
	originalPosition = speaker?.position?.z ?? 0
	// console.log('Original position:', originalPosition)
} catch (err) {
	console.warn('Error getting speaker position:', err)
}

const body = app.get('Body')
body.add(audio)

// Create an action for the speaker (not working yet)
// const action = app.create('action', {
// 	label: 'Show Controls',
// 	distance: 3,
// 	duration: 0.5,
// 	onTrigger: () => {
// 		ui.display = ui.display === 'none' ? 'flex' : 'none'
// 	}
// })
// body.add(action)

// Create UI with initial visibility
const ui = app.create('ui', {
	lit: true,
	doubleside: false,
	width: 170,
	height: 200,
	backgroundColor: 'rgba(0, 0, 0, 0.95)',
	borderRadius: 10,
	padding: 10,
	display: 'none'  // Start hidden until user interacts
})
ui.position.set(2, 0.1, 1.5)
body.add(ui)

// #region Playback controls view
const playView = app.create('uiview', {
	display: 'flex',
	padding: 20,
	flexDirection: 'row',
	justifyContent: 'center',
	alignItems: 'center',
	alignContent: 'stretch',
	width: 150,
	height: 100,
	padding: 4
})
const playBtn = app.create('uitext', {
	padding: 4,
	fontSize: 24,
	value: '▶️',
	color: 'white',
	onPointerDown: () => audio.play(),
	cursor: 'pointer'
})
const pauseBtn = app.create('uitext', {
	padding: 4,
	fontSize: 24,
	value: '⏸️',
	color: 'white',
	onPointerDown: () => audio.pause(),
	cursor: 'pointer'
})
const stopBtn = app.create('uitext', {
	padding: 4,
	fontSize: 24,
	textAlign: 'center',
	value: '🛑',
	color: 'white',
	onPointerDown: () => audio.stop(),
	cursor: 'pointer'
})
ui.add(playView)
playView.add(playBtn)
playView.add(pauseBtn)
playView.add(stopBtn)
// #endregion

// #region Timecode
const timeView = app.create('uiview', {
	display: 'flex',
	padding: 20,
	flexDirection: 'row',
	justifyContent: 'center',
	alignItems: 'center',
	alignContent: 'stretch',
	width: 150,
	height: 100,
	padding: 4
})
const time = app.create('uitext', {
	padding: 5,
	textAlign: 'center',
	value: '',
	color: 'white',
	onPointerDown: () => audio.stop(),
	fontSize: 32,
})

ui.add(timeView)
timeView.add(time)
// #endregion

// #region Status section
const statusView = app.create('uiview', {
	display: 'flex',
	flexDirection: 'row',
	justifyContent: 'center',
	alignItems: 'center',
	width: 150,
	height: 30,
	borderRadius: 5,
})

const statusText = app.create('uitext', {
	padding: 4,
	textAlign: 'center',
	value: 'Stopped',
	color: 'rgba(255, 255, 255, 0.7)',
	fontSize: 14
})

ui.add(statusView)
statusView.add(statusText)
// #endregion

// #region Volume display 
const volView = app.create('uiview', {
	display: 'flex',
	flexDirection: 'column',
	padding: 5,
	justifyContent: 'center',
	alignItems: 'center',
	alignContent: 'stretch',
	width: 150,
	height: 70,
})

const volLabelView = app.create('uiview', {
	display: 'flex',
	flexDirection: 'row',
	justifyContent: 'center',
	alignItems: 'center',
	width: 150,
	height: 30,
})

const volumeLabel = app.create('uitext', {
	padding: 1,
	textAlign: 'left',
	value: 'Volume:',
	color: 'white',
	fontSize: 14
})

const volumeText = app.create('uitext', {
	padding: 1,
	textAlign: 'right',
	value: `${Math.round((audio?.getVolume?.() || audio?.volume || 0.6) * 100)}%`,
	color: 'white',
	fontSize: 14,
})
ui.add(volView)
volView.add(volLabelView)
volLabelView.add(volumeLabel)
volLabelView.add(volumeText)
// #endregion

// #region Volume buttons
const volumeDown = app.create('uitext', {
	padding: 10,
	textAlign: 'center',
	value: '🔉',
	color: 'white',
	fontSize: 20,
	backgroundColor: 'rgba(40, 40, 40, 0.6)',
	borderRadius: 5,
	onPointerDown: () => {
		const newVolume = Math.max(0, audio.volume - 0.2)
		audio.volume = newVolume
	},
	onPointerEnter: () => {
		volumeDown.color = 'purple'
		volumeDown.backgroundColor = 'rgba(60, 60, 60, 0.8)'
	},
	onPointerLeave: () => {
		volumeDown.color = 'white'
		volumeDown.backgroundColor = 'rgba(40, 40, 40, 0.6)'
	},
	cursor: 'pointer'
})

const volButtonsView = app.create('uiview', {
	display: 'flex',
	flexDirection: 'row',
	justifyContent: 'center',
	alignItems: 'center',
	width: 150,
	height: 40,
	marginTop: 4
})

const volumeUp = app.create('uitext', {
	padding: 10,
	textAlign: 'center',
	value: '🔊',
	color: 'white',
	fontSize: 20,
	backgroundColor: 'rgba(40, 40, 40, 0.6)',
	borderRadius: 5,
	onPointerDown: () => {
		const newVolume = Math.min(1, audio.volume + 0.2)
		audio.volume = newVolume
	},
	onPointerEnter: () => {
		volumeUp.color = 'purple'
		volumeUp.backgroundColor = 'rgba(60, 60, 60, 0.8)'
	},
	onPointerLeave: () => {
		volumeUp.color = 'white'
		volumeUp.backgroundColor = 'rgba(40, 40, 40, 0.6)'
	},
	cursor: 'pointer'
})

ui.add(volumeDown)
ui.add(volButtonsView)
ui.add(volumeUp)
// #endregion

let frameCount = 0

app.on('update', () => {
	try {
		frameCount++
		time.value = audio.currentTime.toFixed(2)
		time.color = audio.isPlaying ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)'

		// Update volume text
		volumeText.value = `${Math.round(audio.volume * 100)}%`

		// Update status text
		if (audio.isPlaying) {
			statusText.value = '▶️ Playing'
			statusText.color = 'rgba(100, 255, 100, 0.8)'  // Green for playing
		} else if (audio.currentTime > 0) {
			statusText.value = '⏸️ Paused'
			statusText.color = 'rgba(255, 255, 100, 0.8)'  // Yellow for paused
		} else {
			statusText.value = '⏹️ Stopped'
			statusText.color = 'rgba(255, 100, 100, 0.8)'  // Red for stopped
		}

		// Animate speaker mesh and material when audio is playing
		if (speaker && speaker.position && audio.isPlaying) {
			// Position animation
			speaker.position.z = originalPosition + Math.sin(frameCount * 0.3) * 0.1

			// Material emission animation
			if (speakerMaterial) {
				speakerMaterial.emissiveIntensity = 1 + Math.sin(frameCount * 0.1) * 0.5
			}
		} else if (speaker && speaker.position) {
			// Reset position and material when not playing
			speaker.position.z = originalPosition
			if (speakerMaterial) {
				speakerMaterial.emissiveIntensity = 1
			}
		}
	} catch (err) {
		console.error('Error in update loop:', err)
	}
})