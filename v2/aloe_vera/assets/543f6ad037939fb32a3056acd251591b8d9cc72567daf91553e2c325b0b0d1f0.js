/**
 * Aloe Vera
 * Drag and Drop Generative Aloe Vera plants into your Hyperfy V2 world.
 * 
 * @author Gert-Jan Akerboom
 * https://x.com/GertJanAkerboom
 * @license MIT
 * Copyright (c) 2025 Gert-Jan Akerboom
 */

// Configure UI inputs for the clone parameters
app.configure(() => {
  return [
    {
      key: "clone_count",
      label: "Clone Count",
      type: "number",
      initial: 20,
      min: 1,
      max: 100,
      step: 1,
    },
    {
      key: "area_size_x",
      label: "Area Width (X meters)",
      type: "number",
      initial: 10,
      min: 1,
      max: 50,
      step: 1,
    },
    {
      key: "area_size_z",
      label: "Area Depth (Z meters)",
      type: "number",
      initial: 10,
      min: 1,
      max: 50,
      step: 1,
    },
    {
      key: "min_size",
      label: "Minimum Clone Size",
      type: "number",
      dp: 2,
      initial: 0.2,
      min: 0.1,
      max: 5,
      step: 0.1,
    },
    {
      key: "max_size",
      label: "Maximum Clone Size",
      type: "number",
      dp: 2,
      initial: 2,
      min: 0.1,
      max: 5,
      step: 0.1,
    }
  ];
});

// Get configuration values from the UI inputs
const cloneCount = app.config.clone_count;
const areaSizeX = app.config.area_size_x;
const areaSizeZ = app.config.area_size_z;
const minSize = app.config.min_size;
const maxSize = app.config.max_size;

// Get the original aloe vera model (named 'Cube' in the GLB)
const cube = app.get('Cube');

// Check if the model exists before proceeding
if (!cube) {
  console.error('Could not find Cube - make sure your GLB has a mesh named "Cube"');
  return;
}

// Create clones and distribute them randomly across the specified area
for (let i = 1; i <= cloneCount; i++) {
  // Clone the original model with all its children
  const clone = cube.clone(true);
  
  // Generate random positions within the specified area
  // X and Z coordinates are randomized, Y stays at ground level (0)
  clone.position.x = num(-areaSizeX, areaSizeX, 2);
  clone.position.z = num(-areaSizeZ, areaSizeZ, 2);
  clone.position.y = 0; // Keep all plants on the ground
  
  // Random rotation on Y axis (0 to 360 degrees) for natural variation
  clone.rotation.y = num(0, 360, 2);
  
  // Random uniform scale between min and max size for size variation
  const scale = num(minSize, maxSize, 2);
  clone.scale.set(scale, scale, scale);
  
  // Add the clone to the app so it appears in the world
  app.add(clone);
} 