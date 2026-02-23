app.configure([

  {
    key: 'attack1',
    type: 'file',
    kind: 'emote',
    label: 'Attack 1'
  },
  {
    key: 'attack2',
    type: 'file',
    kind: 'emote',
    label: 'Attack 2'
  }
])

const sword = app.get('Sword')
const collider = app.get('Sword_Collider')

const attacks = []
if (props.attack1) attacks.push(props.attack1.url)
if (props.attack2) attacks.push(props.attack2.url)
const getAttack = () => {
  const i = num(0, attacks.length-1)
  console.log(i)
  return attacks[i]
}
console.log(attacks)


sword.type = 'dynamic'

let control

const action = app.create('action', {
  label: 'Equip',
  onTrigger: e => {
    // equip
    action.active = false
    collider.active = false
    control = app.control()
  }
})

world.attach(sword)
sword.add(action)

app.on('update', delta => {
  if (control) {
    if (control.mouseLeft.pressed) {
      control.setEffect({
        // snare: 0.8,
        // duration: 0.3,
        // emote: getAttack(),
        
        snare: 0.8,
        // freeze: 0.8,
        duration: 0.3,
        emote: getAttack(),
        turn: true
      })
    }
    if (control?.keyQ.pressed) {
      // un-equip
      action.active = true
      collider.active = true
      control.release()
      control = null
    }
  }
})
app.on('lateUpdate', delta => {
  if (control) {
    const player = world.getPlayer()
    const matrix = player.getBoneTransform('rightHand')
    if (matrix) {
      sword.position.setFromMatrixPosition(matrix)
      sword.quaternion.setFromRotationMatrix(matrix)
    }
  }
})


