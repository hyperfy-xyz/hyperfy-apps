/**
 * Grass and Flowers
 * Drag and Drop Grass and Flowers into your Hyperfy V2 world.
 * 
 * @author Gert-Jan Akerboom
 * https://x.com/GertJanAkerboom
 * @license MIT
 * Copyright (c) 2025 Gert-Jan Akerboom
 */

// Configure UI inputs for the grass and flower generation system
app.configure(() => {
  return [
    {
      key: "clone_count",
      label: "Clone Count",
      type: "number",
      initial: 20,
      min: 1,
      max: 10000,
      step: 1,
    },
    {
      key: "area_size_x",
      label: "Area Width (X meters)",
      type: "number",
      initial: 10,
      min: 1,
      max: 100,
      step: 1,
    },
    {
      key: "area_size_z",
      label: "Area Depth (Z meters)",
      type: "number",
      initial: 10,
      min: 1,
      max: 100,
      step: 1,
    },
    {
      key: "min_size",
      label: "Minimum Clone Size",
      type: "number",
      dp: 2,
      initial: 0.2,
      min: 0.01,
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
    },
    {
      key: "cluster_percentage",
      label: "Percentage of Grass in Clusters",
      type: "number",
      initial: 30,
      min: 0,
      max: 100,
      step: 1,
    },
    {
      key: "cluster_size",
      label: "Cluster Size (radius in meters)",
      type: "number",
      initial: 1,
      min: 0.1,
      max: 10,
      step: 0.1,
    },
    {
      key: "cluster_density",
      label: "Cluster Density (grass per m²)",
      type: "number",
      initial: 5,
      min: 1,
      max: 20,
      step: 1,
    }
  ];
});

// Get configuration values from UI inputs
const cloneCount = app.config.clone_count;
const areaSizeX = app.config.area_size_x;
const areaSizeZ = app.config.area_size_z;
const minSize = app.config.min_size;
const maxSize = app.config.max_size;
const clusterPercentage = app.config.cluster_percentage;
const clusterSize = app.config.cluster_size;
const clusterDensity = app.config.cluster_density;

// Helper function to generate random numbers with specified decimal places
function num(min, max, dp = 2) {
  return Number((Math.random() * (max - min) + min).toFixed(dp));
}

// Get all grass and flower models from the GLB file
const grassModels = [
  app.get('windy'),
  app.get('windy2'),
  app.get('windy3'),
  app.get('flower1'),
  app.get('flower2'),
  app.get('flower3')
];

// Check if all required models exist
if (!grassModels.every(model => model)) {
  console.error('Could not find all grass models - make sure your GLB has meshes named "windy", "windy2", "windy3", "flower1", "flower2", "flower3"');
  return;
}

// Helper function to get a random grass or flower model
function getRandomGrassModel() {
  return grassModels[Math.floor(Math.random() * grassModels.length)];
}

// Calculate distribution of vegetation between clusters and scattered pieces
const totalClusteredGrass = Math.floor(cloneCount * (clusterPercentage / 100));
const numberOfClusters = Math.floor(totalClusteredGrass / clusterDensity);
const remainingGrass = cloneCount - totalClusteredGrass;

// Create clustered vegetation patches
for (let i = 0; i < numberOfClusters; i++) {
  // Generate random cluster center position within the specified area
  const centerX = num(-areaSizeX, areaSizeX, 2);
  const centerZ = num(-areaSizeZ, areaSizeZ, 2);
  
  // Calculate how many grass pieces to place in this cluster
  const grassInCluster = Math.min(clusterDensity, totalClusteredGrass - (i * clusterDensity));
  
  // Create grass pieces within this cluster
  for (let j = 0; j < grassInCluster; j++) {
    const clone = getRandomGrassModel().clone(true);
    
    // Position within cluster radius using polar coordinates
    const angle = Math.random() * Math.PI * 2; // Random angle around the center
    const radius = Math.random() * clusterSize; // Random distance from center
    clone.position.x = centerX + Math.cos(angle) * radius;
    clone.position.z = centerZ + Math.sin(angle) * radius;
    clone.position.y = 0; // Keep all vegetation on ground level
    
    // Random rotation on Y axis for natural variation
    clone.rotation.y = num(0, 360, 2);
    
    // Random uniform scale between min and max size
    const scale = num(minSize, maxSize, 2);
    clone.scale.set(scale, scale, scale);
    
    app.add(clone);
  }
}

// Create remaining scattered vegetation pieces
for (let i = 0; i < remainingGrass; i++) {
  const clone = getRandomGrassModel().clone(true);
  
  // Generate random positions within the specified area
  clone.position.x = num(-areaSizeX, areaSizeX, 2);
  clone.position.z = num(-areaSizeZ, areaSizeZ, 2);
  clone.position.y = 0; // Keep all vegetation on ground level
  
  // Random rotation on Y axis for natural variation
  clone.rotation.y = num(0, 360, 2);
  
  // Random uniform scale between min and max size
  const scale = num(minSize, maxSize, 2);
  clone.scale.set(scale, scale, scale);
  
  app.add(clone);
}

// Hide the original grass models to avoid duplication
grassModels.forEach(model => {
  if (model) {
    model.active = false;
  }
});