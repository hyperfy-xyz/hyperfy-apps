app.configure([
    {
      key: 'image',
      type: 'file',
      kind: 'texture',
      label: 'Fire Image'
    },
    {
      key: 'smokeImage',
      type: 'file',
      kind: 'texture',
      label: 'Smoke Image'
    },
    {
      key: 'emberImage',
      type: 'file',
      kind: 'texture',
      label: 'Ember Image'  
    },
    {
      key: 'fireAudio',
      type: 'file',
      kind: 'audio',
      label: 'Fire Audio'
    },
    {
      key: 'volume',
      type: 'range',
      label: 'Volume',
      min: 0,
      max: 1,
      step: 0.1,
      default: 0.5
    },
    {
      key: 'audioDistance',
      type: 'range', 
      label: 'Audio Distance',
      min: 1,
      max: 50,
      step: 1,
      default: 10
    },
    {
      key: 'rolloffFactor',
      type: 'range',
      label: 'Audio Rolloff',
      min: 0.5,
      max: 5,
      step: 0.1,
      default: 1
    }
  ])
  
  
  // Fire particles
  const fireParticles = app.create('particles', {
    image: props.image?.url,
    shape: ['cone', 0.2, 1, 0],
    direction: 0.2,
    life: '2',
    rate: 50,
    alpha: '0.5',
    color: 'red',
    blending: 'additive',
    size: '1',
    rotate: '0~360',
    sizeOverLife: '0,0.5|0.3,1|1,0',
    rotateOverLife: '0,0|1,45',
    colorOverLife: '0,red|0.4,orange|0.8,black'
  })
  app.add(fireParticles)

  // Smoke particles - rises above the fire
  const smokeParticles = app.create('particles', {
    image: props.smokeImage?.url,
    shape: ['cone', 0.3, 2, 1],
    direction: 0.4,
    life: '4',
    rate: 25,
    alpha: '0.3',
    color: 'white',
    blending: 'normal',
    size: '0.8',
    rotate: '0~360',
    sizeOverLife: '0,0.3|0.2,1|1,2',
    rotateOverLife: '0,0|1,180',
    colorOverLife: '0,white|0.3,lightgray|1,gray',
    alphaOverLife: '0,0|0.2,0.3|0.8,0.2|1,0'
  })
  smokeParticles.position.set(0, 1.5, 0) // Position smoke above fire
  app.add(smokeParticles)

  // Ember particles - glowing sparks that float around
  const emberParticles = app.create('particles', {
    image: props.emberImage?.url,
    shape: ['cone', 0.4, 1.2, 0.5],
    direction: 0.8,
    life: '3~5',
    rate: 15,
    alpha: '0.8',
    color: 'orange',
    blending: 'additive',
    size: '0.1~0.3',
    rotate: '0~360',
    speed: '0.5~1.5',
    sizeOverLife: '0,1|0.7,1.2|1,0',
    rotateOverLife: '0,0|1,360',
    colorOverLife: '0,yellow|0.3,orange|0.7,red|1,black',
    alphaOverLife: '0,0.8|0.5,1|0.9,0.5|1,0'
  })
  emberParticles.position.set(0, 0.8, 0) // Position embers in the fire zone
  app.add(emberParticles)

  // Spatial audio for realistic fire sounds (client-side only)
  if (world.isClient && props.fireAudio?.url) {
    const fireAudio = app.create('audio', {
      src: props.fireAudio.url,
      volume: props.volume || 0.5,
      loop: true,
      spatial: true,
      refDistance: props.audioDistance || 10,
      maxDistance: (props.audioDistance || 10) * 3,
      rolloffFactor: props.rolloffFactor || 1,
      distanceModel: 'inverse'
    })
    fireAudio.position.set(0, 0.5, 0) // Position audio at fire base
    app.add(fireAudio)
    
    // Explicitly start playing the audio
    fireAudio.play()
  }
  
  
  
  
  
  // function spawn() {
  //   const particles = app.create('particles', {
  //     shape: ['box', 1, 50, 1, 1, 'volume', true],
  //     direction: 0,
  //     rate: 1000,
  //     // bursts: [
  //     //   { time: 0, count: 100 },
  //     //   { time: 0.5, count: 500 },
  //     //   { time: 1, count: 10000 },
  //     // ],
  //     duration: 5,
  //     // loop: false,
  //     max: 10000,
  //     space: 'world',
  //     life: '5',
  //     speed: '0.1',
  //     size: '1',
  //     rotate: '0~360',
  //     // color: 'blue',
  //     alpha: '1',
  //     // emissive: '10',
  //     lit: false,
  //     blending: 'normal'
  //   })
  //   particles.position.set(num(-100, 100, 2), 0, num(-100, 100, 2))
  //   world.add(particles)
  //   setTimeout(()=> {
  //     world.remove(particles)
  //   }, 3000)
  // }
  
  // let elapsed = 0
  // app.on('update', delta => {
  //   elapsed += delta
  //   if (elapsed > 0.1) {
  //     elapsed = 0
  //     spawn()
  //     spawn()
  //   }
  // })