/**
 * Neon Sign
 * Drag and Drop a Neon Sign into your Hyperfy V2 world.
 * 
 * @author Gert-Jan Akerboom
 * https://x.com/GertJanAkerboom
 * @license MIT
 * Copyright (c) 2025 Gert-Jan Akerboom
 */

// Define all supported characters and their corresponding mesh names
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const numbers = '0123456789';
const specialChars = {
  '@': 'at',
  '?': 'question',
  '&': 'ampersand',
  '#': 'hash',
  '!': 'exclamation',
  '/': 'slash',
  '(': 'parenthesisLeft',
  ')': 'parenthesisRight',
  '{': 'curlyLeft',
  '}': 'curlyRight',
  '[': 'bracketLeft',
  ']': 'bracketRight',
  '*': 'asterisk',
  '-': 'minus',
  '_': 'underscore',
  '"': 'quote',
  ':': 'colon',
  '=': 'equals'
};

// Create a mapping object to store all character meshes
const meshes = {};

// Load all letter meshes from the GLB file
letters.split('').forEach(letter => {
  meshes[letter] = app.get(letter);
});

// Load all number meshes from the GLB file
numbers.split('').forEach(num => {
  meshes[num] = app.get(num);
});

// Load all special character meshes from the GLB file
Object.entries(specialChars).forEach(([char, name]) => {
  const mesh = app.get(name);
  if (mesh) {
    meshes[char] = mesh;
  }
});

// Store references to cloned meshes for cleanup
let clonedMeshes = [];

// Function to display the specified text as a neon sign
function showLetters(text) {
  // Remove all previously created letter meshes from the scene
  clonedMeshes.forEach(clone => app.remove(clone));
  clonedMeshes = [];

  // Calculate total width of text including spaces for proper alignment
  let totalWidth = 0;
  let validLetters = 0;
  let spaceCount = 0;
  
  for (let i = 0; i < text.length; i++) {
    const letter = text[i];
    const processedLetter = /[a-zA-Z]/.test(letter) ? letter.toUpperCase() : letter;
    
    if (letter === ' ') {
      spaceCount++;
    } else {
      validLetters++;
      totalWidth += spaceCount * app.config.letter_spacing;
      spaceCount = 0;
      if (validLetters > 1) {
        totalWidth += app.config.letter_spacing;
      }
    }
  }

  // Apply scale to total width for proper sizing
  const scaledTotalWidth = totalWidth * app.config.scale;

  // Calculate starting position based on text alignment
  let startX = 0;
  if (app.config.alignment === 'center') {
    startX = -scaledTotalWidth / 2; // Center the text
  } else if (app.config.alignment === 'right') {
    startX = -scaledTotalWidth; // Right-align the text
  }

  // Create and position each letter in the text
  let currentX = startX;
  spaceCount = 0;
  
  for (let i = 0; i < text.length; i++) {
    const letter = text[i];
    const processedLetter = /[a-zA-Z]/.test(letter) ? letter.toUpperCase() : letter;
    
    if (letter === ' ') {
      spaceCount++;
      continue;
    }
    
    const mesh = meshes[processedLetter];
    if (mesh) {
      // Add spacing for any preceding spaces
      currentX += spaceCount * app.config.letter_spacing * app.config.scale;
      spaceCount = 0;
      
      // Clone the letter mesh and position it
      const clone = mesh.clone(true);
      clone.scale.set(app.config.scale, app.config.scale, app.config.scale);
      clone.position.set(
        currentX,
        app.config.height * app.config.scale,
        0
      );
      
      app.add(clone);
      clonedMeshes.push(clone);
      
      // Move to next letter position
      currentX += app.config.letter_spacing * app.config.scale;
    }
  }
}

// Configure UI inputs for the neon sign system
app.configure(() => {
  return [
    {
      key: "text_input",
      label: "Enter Text",
      type: "text",
      initial: "HELLO",
      placeholder: "Type your text here..."
    },
    {
      key: "letter_spacing",
      label: "Letter Spacing",
      type: "range",
      initial: 1.5,
      min: 0.1,
      max: 5,
      step: 0.1,
      dp: 1
    },
    {
      key: "scale",
      label: "Scale",
      type: "range",
      initial: 1,
      min: 0.1,
      max: 5,
      step: 0.1,
      dp: 1
    },
    {
      key: "height",
      label: "Height",
      type: "range",
      initial: 1,
      min: 1,
      max: 10,
      step: 0.1,
      dp: 1
    },
    {
      key: "emission_intensity",
      label: "Glow Intensity",
      type: "range",
      initial: 1,
      min: 0,
      max: 20,
      step: 0.1,
      dp: 1
    },
    {
      key: "uvcolor",
      label: "Color",
      type: "range",
      initial: 0.5,
      min: 0,
      max: 1,
      step: 0.01,
      dp: 2
    },
    {
      type: 'dropdown',
      key: 'alignment',
      label: 'Text Alignment',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' }
      ],
      initial: 'center',
    },
    {
      type: 'switch',
      key: 'visible',
      label: 'Show/Hide all characters',
      options: [
        { label: 'Show', value: 'true' },
        { label: 'Hide', value: 'false' }
      ],
      initial: 'true',
    },
  ];
});

// Initialize the neon sign on the client side
if (world.isClient) {
  showLetters(app.config.text_input);
}

// Apply material properties to all character meshes for neon effect
Object.values(meshes).forEach(mesh => {
  if (mesh) {
    mesh.material.emissiveIntensity = app.config.emission_intensity;
    mesh.material.textureY = app.config.uvcolor;
    mesh.active = app.config.visible === 'true';
  }
});




