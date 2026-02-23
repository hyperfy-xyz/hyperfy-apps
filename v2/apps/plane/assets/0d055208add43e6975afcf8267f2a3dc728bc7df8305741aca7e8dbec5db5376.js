
app.remove(app.get('Block'))
const plane = app.create('group')

const fuselage = app.create('prim', {
  type: 'box',
  size: [0.5, 0.5, 3],
  color: 'white',
  position: [0, 0, 0],
  physics: 'kinematic'
})

const wing = app.create('prim', {
  type: 'box',
  size: [6, 0.1, 1],
  color: 'white',
  position: [0, 0, -0.5],
  physics: 'kinematic'
})

const tail = app.create('prim', {
  type: 'box',
  size: [0.1, 1, 0.5],
  color: 'white',
  position: [0, 0.5, 1.2],
  physics: 'kinematic'
})

const propeller = app.create('prim', {
  type: 'box',
  size: [0.05, 0.05, 0.3],
  color: 'gray',
  position: [0, 0, -1.6],
  physics: 'kinematic'
})

plane.add(fuselage)
plane.add(wing)
plane.add(tail)
plane.add(propeller)

plane.position.set(0, 5, 0)

let time = 0
const radius = 10
const height = 5
const speed = 0.5

app.on('update', delta => {
  time += delta * speed
  
  plane.position.x = Math.cos(time) * radius
  plane.position.z = Math.sin(time) * radius
  plane.position.y = height + Math.sin(time * 2) * 2
  
  plane.rotation.y = time + Math.PI / 2
  plane.rotation.z = Math.sin(time * 3) * 0.2
  
  propeller.rotation.z += delta * 20
})

app.add(plane)