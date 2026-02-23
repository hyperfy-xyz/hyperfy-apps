
const platform = app.get('Platform')

platform.position.copy(app.position)
world.add(platform)

const pos = new Vector3().copy(platform.position)
const qua = new Quaternion(0,0,0,1)

let dir = 'up'

app.on('fixedUpdate', delta => {
  if (dir === 'up') {
    pos.y += 2 * delta
    if (pos.y >= 10) dir = 'down'
  } else {
    pos.y -= 2 * delta
    if (pos.y <= 0) dir = 'up'
  }
  platform.setKinematicTarget(pos, qua)
})

