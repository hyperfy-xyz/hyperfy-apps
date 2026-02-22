// Configure UI inputs for the clone parameters
app.configure(() => {
  return [
    {
      key: "clone_count",
      label: "Number of Rocks",
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
      label: "Minimum Rock Size",
      type: "number",
      dp: 2,
      initial: 0.5,
      min: 0.1,
      max: 5,
      step: 0.1,
    },
    {
      key: "max_size",
      label: "Maximum Rock Size",
      type: "number",
      dp: 2,
      initial: 1.5,
      min: 0.2,
      max: 5,
      step: 0.1,
    }
  ];
});

// Get configuration values
const CLONE_COUNT = app.config.clone_count;
const AREA_SIZE_X = app.config.area_size_x;
const AREA_SIZE_Z = app.config.area_size_z;
const MIN_SIZE = app.config.min_size;
const MAX_SIZE = app.config.max_size;

// Helper vectors for calculations
const forward = new Vector3(0, 0, -1);
const v1 = new Vector3();
const q1 = new Quaternion();

// Get the original rock
const originalRock = app.get('Rock001');

if (!originalRock) {
  console.error('Could not find Rock001');
  return;
}

// Make original rock kinematic
originalRock.type = 'kinematic';

// Create a template for cloning
const src = originalRock.clone(true);

// Initialize state
const state = app.state;
state.holders = new Set();
state.ready = true;
  
  // Server-side logic
  if (world.isServer) {
  const holders = new Map();
  
  app.send('state', state);
  
  app.on('take', playerId => {
    if (state.holders.has(playerId)) return;
    const player = world.getPlayer(playerId);
    if (!player) return;
    
    state.holders.add(playerId);
    app.send('addHolder', playerId);
    
    const rock = src.clone(true);
    world.add(rock);
    holders.set(playerId, { player, rock });
  });
  
  app.on('drop', playerId => {
    if (!state.holders.has(playerId)) return;
    
    state.holders.delete(playerId);
    app.send('removeHolder', playerId);
    
    const holder = holders.get(playerId);
    world.remove(holder.rock);
    holders.delete(playerId);
  });
  
  app.on('lateUpdate', () => {
    holders.forEach(holder => {
      const matrix = holder.player.getBoneTransform('rightIndexProximal');
      if (matrix) {
        holder.rock.position.setFromMatrixPosition(matrix);
        holder.rock.quaternion.setFromRotationMatrix(matrix);
      }
    });
  });
  
  world.on('leave', e => {
    if (!state.holders.has(e.playerId)) return;
    state.holders.delete(e.playerId);
    const holder = holders.get(e.playerId);
    world.remove(holder.rock);
    holders.delete(e.playerId);
    app.send('removeHolder', e.playerId);
  });
}

// Create clones and distribute them randomly
console.log(`Creating ${CLONE_COUNT} rocks...`);

for (let i = 1; i <= CLONE_COUNT; i++) {
  const clone = originalRock.clone(true);
  
  // Generate random positions within our area
  clone.position.x = num(-AREA_SIZE_X, AREA_SIZE_X, 2);
  clone.position.z = num(-AREA_SIZE_Z, AREA_SIZE_Z, 2);
  clone.position.y = 0.5;  // Slightly above ground
  
  // Random rotation on Y axis (0 to 360 degrees)
  clone.rotation.y = num(0, 360, 2);
  
  // Random uniform scale between min and max size
  const scale = num(MIN_SIZE, MAX_SIZE, 2);
  clone.scale.set(scale, scale, scale);
  
  // Add an action for pickup
  const action = app.create('action', {
    label: 'Take',
    onTrigger: () => {
      if (world.isClient) {
        action.active = false;
        const localPlayer = world.getPlayer();
        app.send('take', localPlayer.id);
      }
    }
  });
  
  clone.add(action);
  app.add(clone);
  }
  
  // Client-side logic
  if (world.isClient) {
  const localPlayer = world.getPlayer();
  const holders = new Map();
  let control;
  let ui = null;
  
  // Array of tweet variations
  const tweets = [
    {
      message: "Just found this amazing rock! Press Q to drop it ✨",
      stats: "💬 42    🔄 138    ❤️ 1.2K"
    },
    {
      message: "Look at this cool rock I picked up! Q to drop 🪨",
      stats: "💬 13    🔄 89    ❤️ 432"
    },
    {
      message: "Rock collecting in Hyperfy is my new hobby 🌟 (Q to drop)",
      stats: "💬 27    🔄 203    ❤️ 891"
    },
    {
      message: "Found another one for my collection! Q to let go ⭐",
      stats: "💬 8    🔄 56    ❤️ 344"
    },
    {
      message: "This rock looks perfect for my garden! Q to place 🌿",
      stats: "💬 19    🔄 167    ❤️ 723"
    },
    {
      message: "Adding this beauty to my rock collection! Q = drop ✨",
      stats: "💬 31    🔄 245    ❤️ 1.1K"
    },
    {
      message: "Check out this rare rock specimen! Press Q to release 💫",
      stats: "💬 64    🔄 312    ❤️ 1.5K"
    },
    {
      message: "Who needs diamonds when you have rocks like these? Q-drop 💎",
      stats: "💬 93    🔄 421    ❤️ 2.2K"
    },
    {
      message: "Living my best rock collector life! Q to let go 🌟",
      stats: "💬 25    🔄 178    ❤️ 834"
    },
    {
      message: "This rock has the perfect vibes ✨ (Q to drop)",
      stats: "💬 16    🔄 145    ❤️ 567"
    }
  ];
  
  function showUI() {
    if (!ui) {
      // Randomly select a tweet
      const tweet = tweets[Math.floor(num(0, tweets.length))];

      // Create main UI panel with just the essential elements
      ui = app.create('ui', {
        width: 280,
        height: 140,
        space: 'screen',
        position: [1, 0, 0],
        offset: [-10, 10, 0],
        pivot: 'top-right',
        backgroundColor: '#000000',
        borderRadius: 16,
        padding: 12,
        layout: 'vertical',
        gap: 8
      });

      // Profile picture
      const avatar = app.create('uiview', {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#1D9BF0'
      });

      // Name
      const name = app.create('uitext', {
        value: 'Rock Collector',
        fontSize: 15,
        color: 'white',
        fontWeight: 'bold'
      });

      // Handle
      const handle = app.create('uitext', {
        value: '@rockholder',
        fontSize: 13,
        color: '#71767B'
      });

      // Message with random tweet
      const message = app.create('uitext', {
        value: tweet.message,
        fontSize: 15,
        color: 'white'
      });

      // Stats with matching engagement numbers
      const stats = app.create('uitext', {
        value: tweet.stats,
        fontSize: 13,
        color: '#71767B'
      });

      // Add everything in order
      ui.add(avatar);
      ui.add(name);
      ui.add(handle);
      ui.add(message);
      ui.add(stats);
      app.add(ui);
    }
  }

  function hideUI() {
    if (ui) {
      app.remove(ui);
      ui = null;
    }
  }
  
  let state = app.state;
    if (state.ready) {
    init(state);
    } else {
    app.on('state', init);
    }
    
    function init(_state) {
    state = _state;
    
    for (const playerId of state.holders) {
      const player = world.getPlayer(playerId);
      const rock = src.clone(true);
      world.add(rock);
      holders.set(playerId, { player, rock });
      
      // Show UI if we're already holding a rock
      if (playerId === localPlayer.id) {
        showUI();
      }
    }
    
    app.on('addHolder', playerId => {
      state.holders.add(playerId);
      const player = world.getPlayer(playerId);
      const rock = src.clone(true);
      world.add(rock);
      holders.set(playerId, { player, rock });
      
        if (playerId === localPlayer.id) {
        showUI();
        control?.release();
        control = app.control();
      }
    });
    
    app.on('removeHolder', playerId => {
      state.holders.delete(playerId);
      const holder = holders.get(playerId);
      
        if (playerId === localPlayer.id) {
        hideUI();
        control?.release();
        control = null;
      }
      
      world.remove(holder.rock);
      holders.delete(playerId);
    });
    
    app.on('lateUpdate', () => {
      holders.forEach(holder => {
        const matrix = holder.player.getBoneTransform('rightIndexProximal');
        if (matrix) {
          holder.rock.position.setFromMatrixPosition(matrix);
          holder.rock.quaternion.setFromRotationMatrix(matrix);
        }
      });
      
      if (control?.keyQ.pressed) {
        app.send('drop', localPlayer.id);
      }
    });
    }
  }