if (world.isServer) {
  world.on('raybeam', ({ origin, direction }) => {
    app.send('raybeam', {origin, direction})
  })
}

if (world.isClient) {
  const beam = app.get('Beam')
  const up = new Vector3(0, 1, 0)
  const dir = new Vector3()
  
  const activeBeams = new Map()
  
  beam.scale.set(0.3, 1000, 0.3)

  app.on('raybeam', ({origin, direction}) => {
    show(origin, direction)
  })

  function show(origin, direction) {
    const clone = beam.clone()
    
    clone.position.fromArray(origin)
    clone.quaternion.setFromUnitVectors(up, dir.fromArray(direction))
    clone.scale.set(0.01, 100, 0.01)
    
    world.add(clone)
    
    const lifetime = 0.1
    
    const beamId = uuid()
    
    activeBeams.set(beamId, {
      element: clone,
      creationTime: Date.now(),
      lifetime: lifetime * 1000
    })
  }
  
  app.on('update', () => {
    const currentTime = Date.now()
    const beamsToRemove = []
    
    for (const [id, beam] of activeBeams.entries()) {
      const elapsedTime = currentTime - beam.creationTime
      
      if (elapsedTime >= beam.lifetime) {
        beamsToRemove.push(id)
      }
    }
    
    for (const id of beamsToRemove) {
      const beam = activeBeams.get(id)
      world.remove(beam.element)
      activeBeams.delete(id)
    }
  })
}