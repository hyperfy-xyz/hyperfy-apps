app.configure(() => {
  return [
    {
      key: 'emote',
      type: 'file',
      kind: 'emote',
      label: 'Emote',
    },
    {
      key: 'hover',
      type: 'switch',
      label: 'Hover',
      options: [
        { label: 'No', value: false },
        { label: 'Yes', value: true },
      ],
      initial: false,
    },
    {
      key: 'rotate',
      type: 'switch',
      label: 'Rotate',
      options: [
        { label: 'No', value: false },
        { label: 'Yes', value: true },
      ],
      initial: false,
    },
    {
      key: 'avatars',
      type: 'switch',
      label: 'Avatar',
      options: [
        { label: '1', value: '1' },
        { label: '2', value: '2' },
        { label: '3', value: '3' },
        { label: '4', value: '4' },
      ]
    },
    {
      key: 'autoCycle',
      type: 'switch',
      label: 'Auto Cycle',
      options: [
        { label: 'No', value: false },
        { label: 'Yes', value: true },
      ],
      initial: true,
    },
    ...customAvatarFields('1'),
    ...customAvatarFields('2'),
    ...customAvatarFields('3'),
    ...customAvatarFields('4'),
    {
      key: 'clear',
      type: 'button',
      label: 'Clear Avatar',
      onClick: () => {
        app.send('avatar:clear')
      }
    }
  ];

  function customAvatarFields(n) {
    return [
      {
        key: `avatar${n}_name`,
        type: 'text',
        label: 'Name',
        when: [{ key: 'avatars', op: 'eq', value: n }]
      },
      {
        key: `avatar${n}`,
        type: 'file',
        label: 'Avatar',
        kind: 'avatar',
        when: [{ key: 'avatars', op: 'eq', value: n }]
      },
    ]
  }
})

let name = props[`avatar${props.avatars ?? '1'}_name`] //props.name
let src = props[`avatar${props.avatars ?? '1'}`]?.url || 'asset://avatar.vrm'
const emote = props.emote?.url
const hover = props.hover
const rotate = props.rotate
const autoCycle = props.autoCycle !== undefined ? props.autoCycle : true

if (world.isClient) {
  const nametag = app.create('nametag')
  nametag.label = name

  const avatar = app.create('avatar')
  avatar.src = src
  avatar.position.y = 0.5
  avatar.setEmote(emote)
  avatar.onLoad = () => {
    nametag.position.y = avatar.getHeight() + 0.15
    avatar.add(nametag)
  }
  app.add(avatar)

  let currentAvatarIndex = parseInt(props.avatars || '1')
  const availableAvatars = [1, 2, 3, 4].filter(num => props[`avatar${num}`]?.url)
  
  // If no custom avatars were defined, just use avatar 1
  if (availableAvatars.length === 0) {
    availableAvatars.push(1)
  }
  
  let timeSinceLastChange = 0
  const CYCLE_TIME = 5 // seconds

  if (rotate || hover || autoCycle) {
    const hoverHeight = 0.05
    const hoverSpeed = 2
    const initialY = avatar.position.y
    let time = 0
    app.on('update', delta => {
      if (rotate) {
        avatar.rotation.y -= 0.5 * delta
      }
      if (hover) {
        time += delta
        avatar.position.y = initialY + Math.sin(time * hoverSpeed) * hoverHeight
      }
      
      // Auto cycle avatars logic
      if (autoCycle && availableAvatars.length > 1) {
        timeSinceLastChange += delta
        
        if (timeSinceLastChange >= CYCLE_TIME) {
          timeSinceLastChange = 0
          
          // Find the next available avatar
          const currentIndex = availableAvatars.indexOf(currentAvatarIndex)
          const nextIndex = (currentIndex + 1) % availableAvatars.length
          currentAvatarIndex = availableAvatars[nextIndex]
          
          // Update the variables
          src = props[`avatar${currentAvatarIndex}`]?.url || 'asset://avatar.vrm'
          name = props[`avatar${currentAvatarIndex}_name`] || ''
          
          // Update the avatar and nametag
          avatar.src = src
          nametag.label = name
        }
      }
    })
  }

  const action = app.create('action')
  action.position.y += 0.7
  action.label = 'Equip'
  action.onTrigger = e => {
    if (!e.playerId) return
    const player = world.getPlayer(e.playerId)
    player.setSessionAvatar(src)
    app.send('setAvatar', src)
  }
  app.add(action)

  app.on('avatar', avatarSrc => {
    const player = world.getPlayer()
    player.setSessionAvatar(avatarSrc)
  })
  app.send('init')
}

if (world.isServer) {
  app.on('setAvatar', (avatarSrc, playerId) => {
    world.set(`${playerId}:avatar`, avatarSrc)
  })

  app.on('init', (_, pid) => {
    let avatar = world.get(`${pid}:avatar`)
    console.log(avatar)
    if (!avatar) {
      const randomAvatar = `avatar${num(1, 4)}`
      avatar = props[randomAvatar]?.url
      world.set(`${pid}:avatar`, avatar)
    }
    app.sendTo(pid, 'avatar', avatar)
  })

  app.on('avatar:clear', (_, pid) => {
    world.set(`${pid}:avatar`, undefined)
  })
}