// Ensure app, position, and rotation exist
if (!app || !app.position || !app.rotation) {
  console.error('[POSITION DISPLAY] App, app.position, or app.rotation not found');
  return;
}

// Create UI container
const ui = app.create('ui', {
  width: 300,
  height: 100,
  backgroundColor: 'rgba(0,15,30,0.9)', 
  borderRadius: 8, 
  padding: 5,
  justifyContent: 'center',
  alignItems: 'center'
});
ui.billboard = 'y'; // Face camera on Y-axis
ui.position.set(0, 1.5, 0); // 1.5 units above app


// Create UI text for position and rotation
const positionText = app.create('uitext', {
  value: `X: 0.00, Y: 0.00, Z: 0.00\nRX: 0.00, RY: 0.00, RZ: 0.00`, // Initial value, multi-line
  fontSize: 16,
  color: '#ffffff',
  textAlign: 'center',

})

const instanceIdText = app.create('uitext', {
  value: `App ID: ${app.instanceId}`,
  color: '#cccccc',
  textAlign: 'center',
  padding: 6
})

// Add text to UI container
ui.add(instanceIdText);
ui.add(positionText);

// Add UI container to app
app.add(ui);

// Update loop: Update text with world coordinates and rotation and emit position
app.on('update', () => {
  if (app && app.position && app.rotation) {
    const pos = app.position;
    const rot = app.rotation;

    // Update position text
    positionText.value = `X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}\nRX: ${rot.x.toFixed(2)}, RY: ${rot.y.toFixed(2)}, RZ: ${rot.z.toFixed(2)}`;

    // Emit the app's position and instance ID
    app.emit('appPosition1', {
      id: app.instanceId,
      position: {
        x: pos.x,
        y: pos.y,
        z: pos.z,
      },
    });
  }
});

// Optional: Function to move and rotate the app (for testing)
function moveAndRotateApp(x, y, z, rx, ry, rz) {
  if (app && app.position && app.rotation) {
    app.position.set(x, y, z);
    app.rotation.set(rx, ry, rz); // Radians
  }
}

// Example usage:
// moveAndRotateApp(2, 1, -3, 0, Math.PI / 4, 0); // Move and rotate 45 degrees on Y