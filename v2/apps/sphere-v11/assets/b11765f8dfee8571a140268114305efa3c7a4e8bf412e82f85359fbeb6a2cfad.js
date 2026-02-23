/*============================================================================
 * Sphere🔊 
 *============================================================================
 * - Upload an `.mp3` file for ambient sound
 * - Audio always plays
 * - Spatial audio settings control audibility by proximity
 * - Show/hide debug mesh via configuration
 *============================================================================*/

app.configure([
	{
		key: 'showMesh',
		type: 'switch',
		label: 'Visbility',
		hint:'',
		options: [
			{ value: 'visible', label: 'Visible' },
			{ value: 'invisible', label: 'Invisible' }
		],
		initial: 'Invisible'
	},
  // #region AUDIO
	{
		type: 'section',
		key: 'audioSection',
		label: 'Audio Settings'
	},
	{
		type: 'file',
		key: 'audio',
		kind: 'audio',
		label: 'Audio File'
	},
	{
		key: 'defaultVolume',
		type: 'switch',
		label: 'Default Volume',
		hint: '🔇🔈🔉🔊',
		options: [
			{ label: 'Low', value: 1 },
			{ label: 'Medium', value: 5 },
			{ label: 'High', value: 8 }
		],
		initial: 5
	},
	{
		key: 'isSpatial',
		type: 'switch',
		label: 'Audio Type',
		options: [
			{ label: 'Spatial (3D)', value: true },
			{ label: 'Global', value: false }
		],
		initial: true
	},
	{
		key: 'audioType',
		type: 'switch',
		label: 'Audio Type',
		options: [
			{ label: 'Music', value: 'music' },
			{ label: 'Sound Effect', value: 'sfx' }
		],
		initial: 'music'
	},
	{
		key: 'minDistance',
		type: 'number',
		label: 'Min Distance',
		initial: 5,
		min: 1,
		max: 50,
		hint: 'Distance where audio starts to fade (in meters)'
	},
	{
		key: 'maxDistance',
		type: 'number',
		label: 'Max Distance',
		initial: 20,
		min: 1,
		max: 100,
		hint: 'Distance where audio becomes inaudible (in meters)'
	},
	{
		key: 'rolloffFactor',
		type: 'switch',
		label: 'Falloff Rate',
		options: [
			{ label: 'Gradual', value: 0.5 },
			{ label: 'Medium', value: 1 },
			{ label: 'Steep', value: 2 }
		],
		initial: 2
	},
	{
		type: 'section',
		key: 'coneSection',
		label: 'Sound Cone Settings'
	},
	{
		type: 'number',
		key: 'coneInnerAngle',
		label: 'Cone Inner Angle',
		min: 0,
		max: 360,
		step: 1,
		initial: 360
	},
	{
		type: 'number',
		key: 'coneOuterAngle',
		label: 'Cone Outer Angle',
		min: 0,
		max: 360,
		step: 1,
		initial: 360
	},
	{
		type: 'range',
		key: 'coneOuterGain',
		label: 'Cone Outer Gain',
		min: 0,
		max: 1,
		step: 0.1,
		initial: 0
	},
	// #endregion
])

// Configuration values
const showMesh = props.showMesh === 'visible'

// Create or get mesh
const mesh = app.get('Sphere')
const rigidBody = app.get('AreaTrigger');
const collider = app.get('Collider');

// Configure mesh visibility
if (mesh) {
	mesh.active = showMesh
}

// Create and configure spatial audio

const audio = app.create('audio', {
	src: props.audio?.url,
	group: props.audioType || 'music',
	loop: props.loop || true,
	spatial: props.isSpatial || false,
	distanceModel: props.distanceModel || 'inverse',
	refDistance: props.refDistance || 1,
	maxDistance: props.maxDistance || 40,
	rolloffFactor: props.rolloffFactor || 1,
	coneInnerAngle: props.coneInnerAngle || 360,
	coneOuterAngle: props.coneOuterAngle || 360,
	coneOuterGain: props.coneOuterGain || 1
})

rigidBody.add(audio)



rigidBody.onTriggerEnter = () => {
	console.log('[SimpleTriggerArea] Trigger ENTER', world.isServer ? 'SERVER' : 'CLIENT');
	// app.emit(signal, 1);
	audio.play()
};

// Start audio playback
