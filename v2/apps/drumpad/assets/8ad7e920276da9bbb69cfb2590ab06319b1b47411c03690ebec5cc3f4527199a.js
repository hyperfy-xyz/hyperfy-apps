// Configuration
const shiftDistance = 0.05;   // how far to move the mesh down
const shiftSpeed = 1;         // units per second

const padConfigs = {};
const padParents = {};
const padMeshes = {};
const drumSounds = {};

// 🔊 Add all 16 sound config slots
const soundConfigs = [];
for (let i = 1; i <= 16; i++) {
  const key = `drumSound${i.toString().padStart(2, '0')}`;
  soundConfigs.push({
    key,
    type: 'file',
    kind: 'audio',
    label: `Drum Pad ${i} Sound`
  });
}
app.configure(soundConfigs);

// 🔄 Create and store audio instances
for (let i = 1; i <= 16; i++) {
  const key = `drumSound${i.toString().padStart(2, '0')}`;
  const soundProp = props[key]?.url;

  if (soundProp) {
    const audio = app.create('audio', {
      src: soundProp,
      volume: 0.6,
      group: 'sfx',
      spatial: true,
      loop: false
    });
    drumSounds[key] = audio;
  }
}

// Setup loop for all 16 pads
for (let i = 1; i <= 16; i++) {
  const padNumber = i.toString().padStart(2, '0');
  const rigidPadName = `Pad_${padNumber}001`;
  const meshName = `${rigidPadName}MeshLOD0`;
  const soundKey = `drumSound${padNumber}`;

  const padParent = app.get(rigidPadName);
  const padMesh = app.get(meshName);

  if (!padParent || !padMesh) {
    continue;
  }

  padParents[rigidPadName] = padParent;
  padMeshes[rigidPadName] = padMesh;

  // 🔊 Attach sound to pad
  if (drumSounds[soundKey]) {
    padParent.add(drumSounds[soundKey]);
  }

  // Store initial state
  padConfigs[rigidPadName] = {
    initialY: padMesh.position.y,
    targetY: padMesh.position.y,
    currentY: padMesh.position.y,
    shifting: false
  };

  // Capture ID safely in closure
  ((padId, soundKeyLocal) => {
    padParent.onContactStart = (e) => {
      const cfg = padConfigs[padId];
      cfg.targetY = cfg.initialY - shiftDistance;
      cfg.shifting = true;

      const sound = drumSounds[soundKeyLocal];
      if (sound?.src) {
        try {
          sound.stop();
          sound.currentTime = 0;
          sound.play();
        } catch (err) {
          // Handle sound error
        }
      }
    };

    padParent.onContactEnd = (e) => {
      const cfg = padConfigs[padId];
      cfg.targetY = cfg.initialY;
      cfg.shifting = true;
    };
  })(rigidPadName, soundKey);
}

// Update loop for smooth shifting
app.on('update', (delta) => {
  for (const padId in padConfigs) {
    const cfg = padConfigs[padId];
    const mesh = padMeshes[padId];
    if (!cfg.shifting || !mesh) continue;

    const diff = cfg.targetY - mesh.position.y;
    const step = shiftSpeed * delta;

    if (Math.abs(diff) <= step) {
      mesh.position.y = cfg.targetY;
      cfg.shifting = false;
    } else {
      mesh.position.y += Math.sign(diff) * step;
    }
  }
});
