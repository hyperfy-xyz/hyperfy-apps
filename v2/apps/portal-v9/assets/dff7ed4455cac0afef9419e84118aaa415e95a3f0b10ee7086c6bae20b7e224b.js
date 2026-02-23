app.configure([
	{
		key: 'visibilitySection',
		type: 'section',
		label: 'Visual Config',
	},
	{
		key: 'uiVisibility',
		type: 'switch',
		label: 'UI Visibility',
		options: [
			{ label: 'Visible', value: 'visible' },
			{ label: 'Invisible', value: 'invisible' }
		],
		initial: 'visible',
		hint: 'Controls visibility of the UI container'
	},
	{
		key: 'aVisibility',
		type: 'switch',
		label: 'Portal Visibility',
		options: [
			{ label: 'Visible', value: 'visible' },
			{ label: 'Invisible', value: 'invisible' }
		],
		initial: 'visible'
	},
	{
		key: 'eVisibility',
		type: 'switch',
		label: 'PortalRim Visibility',
		options: [
			{ label: 'Visible', value: 'visible' },
			{ label: 'Invisible', value: 'invisible' }
		],
		initial: 'visible'
	},
	{
		key: 'portalConfigSection',
		type: 'section',
		label: 'Portal Config',
	},
	{
		key: 'portalName',
		type: 'text',
		label: 'Portal Name',
		initial: 'Portal',
		placeholder: 'Enter a name for this portal',
		hint: 'Name displayed above the portal'
	},
	{
		key: 'portalDest',
		type: 'text',
		label: 'Portal Destination',
		initial: 'Place Name',
		placeholder: 'Enter Destination',
		hint: 'Where it goes'
	},
	{
		key: 'rimSpeed',
		type: 'range',
		label: 'Scroll Speed',
		min: 0,
		max: 0.01,
		step: 0.001,
		initial: 0,
	},
	{
		key: 'rimEmissive',
		type: 'range',
		label: 'Emissive Intensity',
		min: 0,
		max: 5,
		step: 0.1,
		initial: 1.5,
	},
	{
		key: 'uiConfigSection',
		type: 'section',
		label: 'UI Config',
	},
	{
		key: 'uiWidth',
		type: 'number',
		label: 'UI Width',
		initial: 200,
		hint: 'Width of the UI container',
	},
	{
		key: 'uiHeight',
		type: 'number',
		label: 'UI Height',
		initial: 80,
		hint: 'Height of the UI container',
	},
	{
		key: 'uiYOffset',
		type: 'range',
		label: 'ui Y Offset',
		min: 0,
		max: 5,
		step: 0.1,
		initial: 1.5,
		hint: 'Y offset of the UI container',
	},
	{
		key: 'uiFontSize',
		type: 'number',
		label: 'UI Font Size',
		initial: 20,
		hint: 'Font size of the UI title',
	},
	{
		key: 'uiFontColor',
		type: 'text',
		label: 'UI Font Color',
		initial: 'white',
		placeholder: 'Enter color (e.g., white, #FFFFFF)',
		hint: 'Color of the UI title text'
	},
]);

// PortalMesh visibility
const aMesh = app.get('A');
const eMesh = app.get('E');

if (props.aVisibility === 'invisible') {
	aMesh.active = false;
}

if (props.eVisibility === 'invisible') {
	eMesh.active = false;
}

// Set emissive intensity for a chunk
function setEmissive(intensity) {
	if (eMesh.material) {
		// Make sure intensity is a valid number
		const validIntensity = typeof intensity === 'number' ? intensity : 1.5
		eMesh.material.emissiveIntensity = validIntensity
	}
}
setEmissive(props?.rimEmissive || 1.5)

// Scroll the texture of a chunk
function scrollTexture(amount) {
	if (eMesh.material) {
		// If textureY doesn't exist, initialize it to 0
		if (typeof eMesh.material.textureY === 'undefined') {
			eMesh.material.textureY = 0
		}
		// Make sure amount is a valid number
		const validAmount = typeof amount === 'number' ? amount : 0.1
		eMesh.material.textureY += validAmount
	}
}

app.on('update', delta => {
	scrollTexture(props?.rimSpeed || 0)
})

// ServerSide: Handle teleportation using world storage
if (world.isServer) {
	world.on(props.portalDest, (eventData) => {
		if (!eventData || !eventData.position) {
			console.error('Invalid data received for portal position event');
			return;
		}

		const { x, y, z } = eventData.position;
		const position = [x, y, z];

		app.send('position', position);
	});
}

// ClientSide: UI and trigger handling
if (world.isClient) {

		let position = null;
		app.on('position', arr => {
			position = new Vector3().fromArray(arr);
		});

		// Teleport on trigger enter
		const body = app.get('Portal');
		body.onTriggerEnter = e => {
			if (e.playerId && position) {
				const player = world.getPlayer(e.playerId);
				player.teleport(position, 3.14);
			}
		}

		// Create UI container
		const ui = app.create('ui');
		ui.width = props.uiWidth;
		ui.height = props.uiHeight;
		ui.billboard = 'y';
		ui.position.y = props.uiYOffset;
		ui.backgroundColor = 'transparent';

		if (props.uiVisibility === 'invisible') {
			ui.active = false;
		}

		// Create portal name label
		const label = app.create('uitext');
		label.value = props.portalName;
		label.fontSize = props.uiFontSize;
		label.color = props.uiFontColor;
		label.textAlign = 'center';

		ui.add(label);
		body.add(ui);

	}