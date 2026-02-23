// Get the cube model
const cube = app.get('Cube');

if (!cube) {
  console.error('Could not find Cube model');
  return;
}

// Store cloned cubes
let clonedCubes = [];

// Function to create the curve of cubes
function createCubeCurve() {
  // Remove existing cubes
  clonedCubes.forEach(clone => app.remove(clone));
  clonedCubes = [];

  // Get the size of a single cube to determine spacing
  const spacing = app.config.cube_size; // Cubes should touch each other

  // Calculate the angle needed for the current number of cubes
  const totalArcLength = (app.config.num_cubes - 1) * spacing;
  const arcAngle = totalArcLength / app.config.curve_radius;

  for (let i = 0; i < app.config.num_cubes; i++) {
      const cubeClone = cube.clone(true);
      // Calculate the angle for this cube along the arc
      const t = i / (app.config.num_cubes - 1); // 0 to 1
      const theta = t * arcAngle; // Start at 0 and go up to arcAngle
      // Position along the arc in the YZ plane
      const y = app.config.curve_radius * (1 - Math.cos(theta)); // This will start at 0 and go up
      const z = app.config.curve_radius * Math.sin(theta);
      cubeClone.position.set(0, y, z);
      // Calculate tangent (direction of the arc at this point)
      const dtheta = 0.0001; // Small delta for numerical derivative
      const y2 = app.config.curve_radius * (1 - Math.cos(theta + dtheta));
      const z2 = app.config.curve_radius * Math.sin(theta + dtheta);
      const tangent = { y: y2 - y, z: z2 - z };
      // Angle between (0,1,0) and tangent in YZ plane
      const angle = Math.atan2(tangent.z, tangent.y) - Math.PI / 2;
      cubeClone.rotation.set(angle + Math.PI / 2, 0, 0); // Add 90 degree rotation around X
      app.add(cubeClone);
      clonedCubes.push(cubeClone);
  }
}

// Configure the UI input
app.configure(() => {
  return [
    {
      key: "num_cubes",
      label: "Number of Meshes",
      type: "range",
      initial: 10,
      min: 1,
      max: 500,
      step: 1,
      dp: 0
    },
    {
      key: "curve_radius",
      label: "Curve Radius",
      type: "range",
      initial: 10,
      min: 1,
      max: 400,
      step: 0.1,
      dp: 1
    },
    {
      key: "cube_size",
      label: "Mesh Size (Y)",
      type: "number",
      initial: 4,
      min: 0.1,
      max: 20,
      step: 0.1,
      dp: 1
    }
  ];
});

// Listen for config changes
app.on('config', () => {
  createCubeCurve();
});

// Initial setup
if (world.isClient) {
  createCubeCurve();
}

// Hide the original cube model
cube.active = false;
