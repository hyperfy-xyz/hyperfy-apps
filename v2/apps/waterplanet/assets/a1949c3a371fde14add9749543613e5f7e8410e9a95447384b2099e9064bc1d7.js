// === UI: Speed X & Y with extended range ===
app.configure([
  {
    key: 'targetSpeedX',
    type: 'number',
    label: 'Scroll Speed X',
    default: 0,
    min: -1000,
    max: 1000,
    step: 0.01
  },
  {
    key: 'targetSpeedY',
    type: 'number',
    label: 'Scroll Speed Y',
    default: 0.5,
    min: -1000,
    max: 1000,
    step: 0.01
  }
]);

// === Get mesh named "SAMPLE" ===
const mesh = app.get('Sphere001MeshLODO');
if (!mesh) {
  console.error('Could not find SAMPLE mesh');
  return;
}

// === UV offset state ===
const offset = { x: 0, y: 0 };

// === Speed scale for fine control ===
const speedScale = 0.01; // Adjust this as needed

// === Main update loop ===
app.on('update', delta => {
  const speedX = (props.targetSpeedX ?? 0) * speedScale;
  const speedY = (props.targetSpeedY ?? 0) * speedScale;

  offset.x = (offset.x + speedX * delta) % 1;
  offset.y = (offset.y + speedY * delta) % 1;

  mesh.material.textureX = offset.x;
  mesh.material.textureY = offset.y;
  mesh.material.textureScaleX = 1;
  mesh.material.textureScaleY = 1;
});
// …