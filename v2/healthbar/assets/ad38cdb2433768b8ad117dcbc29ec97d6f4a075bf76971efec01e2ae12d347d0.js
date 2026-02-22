let name = ''
const maxHealth = 100
let health = 100

const b1 = app.create('ui', {
  width: 250,
  height: 85,
  res: 2,
  position: [0, 0, 1],
  offset: [15, 10, 0],
  space: 'screen',
  pivot: 'top-left',
  backgroundColor: '#07070750',
  borderRadius: 5,
  borderColor: '#4a4a4a',
  borderWidth: 2,
  padding: 7,
  pointerEvents: true,
  flexDirection: 'column',
  gap: 4,
  alignItems: 'center',
})

const nameContainer = app.create('uiview', {
  width: 236,
  alignItems: 'center',
  marginBottom: 2,
})

const playerNameText = app.create('uitext', {
  value: name,
  fontSize: 14,
  fontWeight: 'bold',
  color: 'white',
  textAlign: 'center',
  textShadow: '1px 1px 2px black',
})

nameContainer.add(playerNameText)

const healthRowContainer = app.create('uiview', {
  flexDirection: 'row',
  gap: 7,
  width: 236,
  alignItems: 'center',
})

const portrait = app.create('uiimage', {
  src: 'https://pbs.twimg.com/profile_images/1878776084432601089/Vd1fdzSf_400x400.png',
  width: 48,
  height: 48,
  objectFit: 'cover',
  borderRadius: 3,
  borderColor: '#666666',
  borderWidth: 1,
})

const healthBarBg = app.create('uiview', {
  width: 180,
  height: 25,
  backgroundColor: '#0a0a0a',
  borderRadius: 3,
  borderColor: '#2a2a2a',
  borderWidth: 1,
  position: 'relative'
})

// Set initial bar width to full width (using the 0-100 scale)
const healthBar = app.create('uiview', {
  width: health * (180/maxHealth),
  height: 25,
  backgroundColor: '#228b22',
  borderRadius: 3,
  borderWidth: 0,
})

const healthPercentText = app.create('uitext', {
  value: '100%',
  fontSize: 12,
  fontWeight: 'bold',
  color: 'white',
  textAlign: 'center',
  textShadow: '1px 1px 2px black',
  position: 'absolute',
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1,
})

healthBarBg.add(healthBar)
healthBarBg.add(healthPercentText)

healthRowContainer.add(portrait)
healthRowContainer.add(healthBarBg)

b1.add(nameContainer)
b1.add(healthRowContainer)

app.add(b1)

app.on('update', () => {
  const { health: newHealth, name } = world.getPlayer()
  playerNameText.value = name
  health = newHealth
  healthBar.width = health * (178/maxHealth)

  const healthPercent = health / maxHealth
  healthPercentText.value = Math.round(healthPercent * 100) + '%'
  
  if (healthPercent < 0.3) {
    healthBar.backgroundColor = '#ff1a1a'
  } else if (healthPercent < 0.6) {
    healthBar.backgroundColor = '#ffaa00'
  } else {
    healthBar.backgroundColor = '#228b22'
  }
})