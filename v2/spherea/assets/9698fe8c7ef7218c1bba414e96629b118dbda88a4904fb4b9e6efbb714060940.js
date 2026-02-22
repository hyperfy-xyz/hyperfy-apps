/*============================================================================
 * Spherea
 *============================================================================
 * Emits a signal when an object enters or leaves the trigger area.
 * - Only requires a 'Collider' object as the trigger volume.
 * - Emits the configured signal with value 1 on enter, 0 on leave.
 *============================================================================*/

app.configure([
	{
		key: 'signal',
		type: 'text',
		label: 'Signal Name',
		initial: 'Trigger'
	},
  {
    key: 'debugColor', 
    type: 'text', 
    label: 'Debug Color',
    initial: '#ffffff'
  },
  {
		key: 'showMesh',
		type: 'switch',
		label: 'Show Trigger Volume',
		options: [
			{ label: 'Hide', value: 'off' },
			{ label: 'Show', value: 'on' }
		],
		initial: 'on'
  },
])

const signal = props.signal;
const debugColor = props.debugColor
const showMesh = props.showMesh === 'on';

const rigidBody = app.get('AreaTrigger');
const collider = app.get('Collider');
const mesh = app.get('Sphere')

mesh.material.color = debugColor
mesh.material.unlinked = true

// Set mesh visibility if it exists
if (mesh) {
  mesh.active = showMesh;
}

app.keepActive = true

rigidBody.onTriggerEnter = () => {
	console.log('[SPHEREA] Trigger ENTER', world.isServer ? 'SERVER' : 'CLIENT');
	app.emit(signal, 1);
};

rigidBody.onTriggerLeave = () => {
	console.log('[SPHEREA] Trigger LEAVE', world.isServer ? 'SERVER' : 'CLIENT');
	app.emit(signal, 0);
}; 