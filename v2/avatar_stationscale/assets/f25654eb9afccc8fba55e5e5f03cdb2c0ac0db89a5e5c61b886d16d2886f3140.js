app.configure([
    {
      key: 'name',
      type: 'text',
      label: 'Name'
    },
    {
      key: 'avatar',
      type: 'file',
      kind: 'avatar',
      label: 'Avatar'
    },
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
      key: 'scale',
      type: 'range',
      label: 'Size',
      min: 0.2,
      max: 5.0,
      step: 0.1,
      initial: 1.0,
      value: 1.0
    }
])
  
const name = props.name
const src = props.avatar?.url || 'asset://avatar.vrm'
const emote = props.emote?.url
const hover = props.hover
const rotate = props.rotate
const scale = props.scale || 1
  
const nametag = app.create('nametag')
nametag.label = name
  
const avatar = app.create('avatar')
avatar.src = src
avatar.position.y = 0.5
avatar.setEmote(emote)
avatar.scale.set(scale, scale, scale)
avatar.baseScale = scale
avatar.onLoad = () => {
  nametag.position.y = (avatar.getHeight() * scale) + 0.15
  avatar.add(nametag)
}
app.add(avatar)
  
if (rotate || hover) {
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
  })
}
  
const action = app.create('action')
action.position.y += 0.7
action.label = 'Equip'
action.onTrigger = e => {
  // First set the session avatar
  e.player.setSessionAvatar(src)
  
  // Create a function to modify the avatar once it's loaded
  const setAvatarHeight = () => {
    if (e.player.avatar) {
      // Get the base height
      const baseHeight = e.player.avatar.getHeight()
      if (baseHeight) {
        // Set the new height and scale
        e.player.avatar.height = baseHeight * scale
        e.player.avatar.scale.set(scale, scale, scale)
        e.player.avatar.baseScale = scale
      }
    }
  }
  
  // Try to set height over multiple frames
  let attempts = 0
  const updateHandler = delta => {
    setAvatarHeight()
    attempts++
    if (attempts >= 10) {
      app.off('update', updateHandler)
    }
  }
  
  app.on('update', updateHandler)
}
app.add(action)