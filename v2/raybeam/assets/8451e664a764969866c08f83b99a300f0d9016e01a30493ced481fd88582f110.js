const beam = app.get('Beam')
const up = new Vector3(0, 1, 0)
const dir = new Vector3()

beam.scale.set(0.3, 1000, 0.3)

const clone = beam.clone()

world.on('raybeam', ({ origin, direction }) => {
  show(origin, direction)
})

// show([0,0,0], [0,1,0])

function show(origin, direction) {
  clone.position.fromArray(origin)
  clone.quaternion.setFromUnitVectors(up, dir.fromArray(direction))
  clone.scale.set(0.01, 100, 0.01)
  world.add(clone)
}