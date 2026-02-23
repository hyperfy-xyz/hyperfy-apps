// =================================================================
// Avatar Behavior System
// A sophisticated system for managing avatar animations and interactions
// based on player distance and API triggers
// =================================================================

// Timing Constants - Control duration of various animations and effects
const BUBBLE_TIME = 5    // How long speech bubbles remain visible (seconds)
const EMOTE_TIME = 2     // Duration of emote animations (seconds)
const LOOK_TIME = 5      // Duration of eye contact maintenance (seconds)

// Distance Thresholds - Define interaction zones (in meters)
// These determine when different animations and behaviors trigger
const VERY_FAR_DISTANCE = 10    // Beyond this: minimal interaction
const FAR_DISTANCE = 5          // Far zone: initial acknowledgment
const MEDIUM_DISTANCE = 2       // Medium zone: welcoming interactions
const CLOSE_DISTANCE = 0        // Close zone: direct conversation

// Utility Constants
const UP = new Vector3(0, 1, 0)  // Used for rotation calculations
const v1 = new Vector3()         // Reusable vector for calculations
const vrm = app.get('avatar')    // Reference to our avatar model

// =================================================================
// SERVER-SIDE LOGIC
// Handles API communication and event broadcasting
// =================================================================
if (world.isServer) {
  const config = app.config
  const state = { ready: true }
  app.state = state
  app.send('state', state)

  // Set up avatar controller and position
  const ctrl = app.create('controller')
  ctrl.position.copy(app.position)
  world.add(ctrl)
  ctrl.quaternion.copy(app.quaternion)
  ctrl.add(vrm)

  // Map emote names to their corresponding animation URLs
  const emoteUrls = {}
  for (let i = 1; i <= 4; i++) {
    const name = config[`emote${i}Name`]
    const url = config[`emote${i}`]?.url
    if (name && url) {
      emoteUrls[name] = url
    }
  }

  // State management for API communication
  let changed = true
  let notifying = false
  
  // Information package sent to the API
  const info = {
    world: {
      id: null,
      name: null,
      url: null,
      context: config.context || 'You are in a virtual world powered by Hyperfy'
    },
    you: {
      id: app.instanceId,
      name: config.name,
    },
    emotes: Object.keys(emoteUrls),
    triggers: [],
    events: [],
  }

  // Event Handlers for world interactions
  world.on('enter', player => {
    info.events.push({
      type: 'player-enter',
      playerId: player.id
    })
    changed = true
  })

  world.on('leave', player => {
    info.events.push({
      type: 'player-leave',
      playerId: player.id
    })
    changed = true
  })

  // Chat event handler with distance check
  world.on('chat', msg => {
    if (msg.fromId === app.instanceId) return
    if (msg.skipBehavior) return

    const player = world.getPlayer(msg.fromId)
    if (!player) return
    
    const distance = player.position.distanceTo(ctrl.position)
    if (distance <= MEDIUM_DISTANCE) {  // Only process chat within conversation range
      info.events.push({ type: 'chat', ...msg })
      changed = true
    }
  })

  // API Communication
  async function notify() {
    if (!config.url || notifying) return
    
    changed = false
    notifying = true
    try {
      const resp = await fetch(config.url, { 
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        body: JSON.stringify(info)
      })
      const data = await resp.json()
      
      // Process API responses
      if (data?.say) app.send('say', data.say)
      if (data?.emote) app.send('emote', emoteUrls[data.emote])
      if (data?.look) app.send('look', data.look)
    } catch (err) {
      console.error('notify failed:', err)
    }
    notifying = false
  }

  app.on('fixedUpdate', delta => {
    if (changed && !notifying) notify()
  })
}

// =================================================================
// CLIENT-SIDE LOGIC
// Implements the behavior tree and animation system
// =================================================================
if (world.isClient) {
  // Behavior Tree Implementation
  // These classes form the foundation of our decision-making system
  class BehaviorNode {
    constructor(name) {
      this.name = name
    }
    tick(context) { }
  }

  class Selector extends BehaviorNode {
    constructor(name, children) {
      super(name)
      this.children = children
    }
    tick(context) {
      for (const child of this.children) {
        const status = child.tick(context)
        if (status === 'SUCCESS' || status === 'RUNNING') {
          return status
        }
      }
      return 'FAILURE'
    }
  }

  class Sequence extends BehaviorNode {
    constructor(name, children) {
      super(name)
      this.children = children
    }
    tick(context) {
      for (const child of this.children) {
        const status = child.tick(context)
        if (status !== 'SUCCESS') {
          return status
        }
      }
      return 'SUCCESS'
    }
  }

  class ConditionNode extends BehaviorNode {
    constructor(name, condition) {
      super(name)
      this.condition = condition
    }
    tick(context) {
      return this.condition(context) ? 'SUCCESS' : 'FAILURE'
    }
  }

  class ActionNode extends BehaviorNode {
    constructor(name, action) {
      super(name)
      this.action = action
    }
    tick(context) {
      return this.action(context)
    }
  }

  // Avatar State Management
  const config = app.config
  const idleEmoteUrl = config.idleEmote?.url  // Default idle animation
  const veryFarEmoteUrl = config.emote0?.url  // Animation for >10m interactions
  
  let currentZone = null
  let messageCounter = 0
  let pendingChat = null
  let isTalking = false  // Tracks when the avatar is speaking
  
  // Distance-based response messages
  const veryFarMessages = [
    "I can barely see you from here!",
    "You're too far away to talk!",
    "Come closer if you want to chat!",
    "I can see you in the distance!"
  ]

  const farMessages = [
    "Almost there, just a bit closer!",
    "I still can't quite hear you!",
    "A few more steps closer please!",
    "That's better, but come a little closer!"
  ]

  const mediumMessages = [
    "Welcome! Feel free to come closer for a chat.",
    "Hi there! Come a bit closer if you'd like to talk.",
    "Hello! Just a few more steps closer."
  ]

  const closeMessages = [
    "Ah, perfect! Now we can talk properly.",
    "Great! I can hear you clearly now.",
    "Wonderful! Let's have a proper conversation."
  ]

  // Utility Functions
  function getNextMessage(messages) {
    return messages[messageCounter++ % messages.length]
  }

  function sendChat(message, skipBehavior = false) {
    world.chat({
      id: uuid(),
      from: config.name + ' (agent)',
      fromId: app.instanceId,
      body: message,
      createdAt: world.getTimestamp(),
      skipBehavior
    }, true)
  }

  function showBubble(message) {
    data.say = { timer: 0 }
    bubble.active = true
    nametag.active = false
    bubbleText.value = message
  }

  // Avatar Initialization
  function init() {
    world.add(vrm)
    vrm.setEmote(idleEmoteUrl)
  }

  // UI Setup for speech bubbles and nametag
  world.attach(vrm)
  let state = app.state
  if (state.ready) {
    init()
  } else {
    world.remove(vrm)
    app.on('state', _state => {
      state = _state
      init()
    })
  }

  // Speech Bubble UI Components
  const bubble = app.create('ui')
  bubble.width = 300
  bubble.height = 512
  bubble.size = 0.005
  bubble.pivot = 'bottom-center'
  bubble.billboard = 'full'
  bubble.justifyContent = 'flex-end'
  bubble.alignItems = 'center'
  bubble.position.y = 2
  bubble.active = false
  
  const bubbleBox = app.create('uiview')
  bubbleBox.backgroundColor = 'rgba(0, 0, 0, 0.95)'
  bubbleBox.borderRadius = 20
  bubbleBox.padding = 20
  bubble.add(bubbleBox)
  
  const bubbleText = app.create('uitext')
  bubbleText.color = 'white'
  bubbleText.fontWeight = 100
  bubbleText.lineHeight = 1.4
  bubbleText.fontSize = 16
  bubbleText.value = '...'
  bubbleBox.add(bubbleText)
  vrm.add(bubble)

  // Nametag Setup
  const nametag = app.create('nametag')
  nametag.label = config.name
  nametag.position.y = 2
  vrm.add(nametag)

  // Avatar Rotation Logic
  function updateRotation(context) {
    if (context.player && context.playerDistance <= VERY_FAR_DISTANCE) {
      const direction = v1.copy(context.player.position).sub(vrm.position)
      direction.y = 0
      const angle = Math.atan2(direction.x, direction.z) + Math.PI
      vrm.quaternion.setFromAxisAngle(UP, angle)
    }
  }

  // Main Behavior Tree Definition
  const data = {}
  const behaviorTree = new Selector('root', [
    // API Chat Response Handler
    new Sequence('apiChatHandler', [
      new ConditionNode('hasPendingApiChat', () => 
        pendingChat && typeof pendingChat === 'object' && pendingChat.fromApi
      ),
      new ActionNode('handleApiChat', () => {
        showBubble(pendingChat.message)
        sendChat(pendingChat.message, true)
        
        // Use talking animation (emote4)
        if (config.emote4?.url) {
          isTalking = true
          vrm.setEmote(config.emote4.url)
        }
        pendingChat = null
        return 'SUCCESS'
      })
    ]),

    // Very Far Distance Behavior
    new Sequence('veryFarInteraction', [
      new ConditionNode('isVeryFar', context => 
        context.playerDistance > VERY_FAR_DISTANCE
      ),
      new ActionNode('veryFarBehavior', context => {
        if (currentZone !== 'veryFar') {
          currentZone = 'veryFar'
          if (veryFarEmoteUrl) {
            vrm.setEmote(veryFarEmoteUrl)
          }
          const message = getNextMessage(veryFarMessages)
          showBubble(message)
          sendChat(message, true)
        }
        return 'SUCCESS'
      })
    ]),

    // Far Distance Behavior
    new Sequence('farInteraction', [
      new ConditionNode('isFarDistance', context => 
        context.playerDistance <= VERY_FAR_DISTANCE && 
        context.playerDistance > FAR_DISTANCE
      ),
      new ActionNode('farDistance', context => {
        if (currentZone !== 'far') {
          currentZone = 'far'
          if (config.emote1?.url) {
            vrm.setEmote(config.emote1.url)
          }
          const message = getNextMessage(farMessages)
          showBubble(message)
          sendChat(message, true)
        }
        updateRotation(context)
        return 'SUCCESS'
      })
    ]),

    // Medium Distance Behavior
    new Sequence('mediumInteraction', [
      new ConditionNode('isMediumDistance', context => 
        context.playerDistance <= FAR_DISTANCE && 
        context.playerDistance > MEDIUM_DISTANCE
      ),
      new ActionNode('mediumDistance', context => {
        if (currentZone !== 'medium') {
          currentZone = 'medium'
          if (config.emote2?.url) {
            vrm.setEmote(config.emote2.url)
          }
          const message = getNextMessage(mediumMessages)
          showBubble(message)
          sendChat(message, true)
        }
        updateRotation(context)
        return 'SUCCESS'
      })
    ]),

    // Close Distance Behavior
    new Sequence('closeInteraction', [
      new ConditionNode('isClose', context => 
        context.playerDistance <= MEDIUM_DISTANCE
      ),
      new ActionNode('closeBehavior', context => {
        if (currentZone !== 'close') {
          currentZone = 'close'
          if (config.emote3?.url) {
            vrm.setEmote(config.emote3.url)
          }
          const message = getNextMessage(closeMessages)
          showBubble(message)
          sendChat(message, true)
        }
        updateRotation(context)
        return 'SUCCESS'
      })
    ]),

    // Default Idle Behavior
    new ActionNode('idle', context => {
      if (currentZone !== 'idle') {
        currentZone = 'idle'
        if (!isTalking) {
          vrm.setEmote(idleEmoteUrl)
        }
        bubble.active = false
        nametag.active = true
      }
      return 'SUCCESS'
    })
  ])

  // Event Handlers
  world.on('chat', msg => {
    if (msg.fromId !== app.instanceId && !msg.skipBehavior) {
      pendingChat = msg.body
    }
  })

  app.on('say', value => {
    pendingChat = { message: value, fromApi: true }
  })

  app.on('emote', url => {
    // Don't use timer for very far animation (let it loop)
    if (url === veryFarEmoteUrl) {
      vrm.setEmote(url)
      return
    }
    
    // Use timer for all other animations
    data.emote = { timer: 0 }
    vrm.setEmote(url)
  })

  // Main Update Loop
  app.on('update', delta => {
    const context = updateContext(delta)
    behaviorTree.tick(context)

    // Handle speech bubble timing
    if (data.say?.timer !== undefined) {
      data.say.timer += delta
      if (data.say.timer > BUBBLE_TIME) {
        data.say = null
        bubble.active = false
        nametag.active = true
      }
    }

  // Handle emote timing only for non-looping animations
    if (data.emote?.timer !== undefined) {
      data.emote.timer += delta
      if (data.emote.timer > EMOTE_TIME) {
        const wasOneShot = data.emote.oneShot
        data.emote = null
        isTalking = false
        
        // After a one-shot animation completes, return to idle
        if (wasOneShot) {
          vrm.setEmote(idleEmoteUrl)
        }
        // For very far zone, return to looping animation
        else if (currentZone === 'veryFar' && veryFarEmoteUrl) {
          vrm.setEmote(veryFarEmoteUrl)
        }
        // Default to idle
        else {
          vrm.setEmote(idleEmoteUrl)
        }
      }
    }
  })

  // Context update function for behavior tree
  function updateContext(delta) {
    const context = {
      delta,
      playerDistance: Infinity,
      player: null
    }

    const player = world.getPlayer()
    if (player) {
      context.player = player
      context.playerDistance = player.position.distanceTo(vrm.position)
    }

    return context
  }
}

// =================================================================
// CONFIGURATION UI
// Define the avatar's customizable properties and animations
// =================================================================
app.configure(() => [
  // Basic Configuration
  { 
    key: 'name', 
    type: 'text', 
    label: 'Avatar Name',
    description: 'The name displayed above your avatar'
  },
  { 
    key: 'context', 
    type: 'textarea', 
    label: 'Avatar Context',
    description: 'Background information for the avatar\'s behavior'
  },
  { 
    key: 'url', 
    type: 'text', 
    label: 'API Endpoint URL',
    description: 'URL for the avatar\'s AI backend'
  },
  
  // Animation Configuration
  { 
    key: 'emotes', 
    type: 'section', 
    label: 'Animations' 
  },
  { 
    key: 'idleEmote', 
    type: 'file', 
    label: 'Default Idle Animation',
    description: 'Default animation when not interacting with players',
    kind: 'emote' 
  },
  { 
    key: 'emote0', 
    type: 'file', 
    label: 'Very Far Animation (>10m)',
    description: 'Animation played when players are beyond interaction range',
    kind: 'emote' 
  },
  {
    key: 'emote',
    type: 'switch',
    label: 'Configure Animations',
    description: 'Set up animations for different interaction distances',
    options: [1, 2, 3, 4].map(n => ({ label: n.toString(), value: n.toString() }))
  },
  
  // Distance-based and special animations configuration
  ...[
    ['1', 'Far Animation (5-10m)', 'Used when player is at far interaction distance'],
    ['2', 'Medium Animation (2-5m)', 'Used when player is at medium interaction distance'],
    ['3', 'Close Animation (0-2m)', 'Used when player is within conversation range'],
    ['4', 'Talking Animation', 'Used when the avatar is speaking or responding to chat']
  ].flatMap(([n, label, description]) => [
    {
      key: `emote${n}Name`,
      type: 'text',
      label: `${label} Name`,
      description: `Identifier for the ${label.toLowerCase()}`,
      when: [{ key: 'emote', op: 'eq', value: n }]
    },
    {
      key: `emote${n}`,
      type: 'file',
      label: label,
      description: description,
      kind: 'emote',
      when: [{ key: 'emote', op: 'eq', value: n }]
    }
  ])
])