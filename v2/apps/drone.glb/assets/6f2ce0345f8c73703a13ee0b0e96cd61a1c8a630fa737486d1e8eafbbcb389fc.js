const UP = new Vector3(0,1,0)
const FORWARD = new Vector3(0,0,1)
const v1 = new Vector3()
const v2 = new Vector3()
const v3 = new Vector3()
const q1 = new Quaternion()
const euler = new Euler()
const body = app.get('RigidBody')
const frame = app.get('Frame')
const rotors = [
  app.get('RotorFL'),
  app.get('RotorFR'),
  app.get('RotorBR'),
  app.get('RotorBL'), 
]

// Physics constants
const THRUST_POWER = 35
const TILT_SPEED = 2.5
const MAX_TILT = 0.5
const DAMPING = 0.92
const ROTATION_DAMPING = 100
const GRAVITY = -12
const THROTTLE_SPEED = 1.5
const MIN_THROTTLE = 0.35
const MOVEMENT_FORCE = 12
const TILT_FORCE = 3
const STABILIZE_FORCE = 2.5
const TORQUE_FORCE = 3

// move body to world space
world.attach(body)

let mode
const setMode = fn => {
  mode?.()
  mode = fn()
}

// console.log('v', app.version)

if (world.isServer) {
  function idle() {
    body.type = 'dynamic'
    let elapsed = 0
    const update = delta => {
      elapsed += delta
      if (elapsed > 1/8) {
        elapsed = 0
        body.position.toArray(app.state.position)
        body.quaternion.toArray(app.state.quaternion)
        app.send('info', [
          null,
          app.state.position,
          app.state.quaternion,
        ])      
      }
    }
    const info = (data, networkId) => {
      app.state.flyer = data[0]
      app.state.position = data[1]
      app.state.quaternion = data[2]
      body.position.fromArray(data[1])
      body.quaternion.fromArray(data[2])
      app.send('info', data, networkId)
      setMode(flying)
    }
    app.on('update', update)
    app.on('info', info)
    return () => {
      app.off('update', update)
      app.off('info', info)
    }
  }
  function flying() {
    body.type = 'kinematic'
    const info = (data, networkId) => {
      app.state.flyer = data[0]
      app.state.position = data[1]
      app.state.quaternion = data[2]
      body.position.fromArray(data[1])
      body.quaternion.fromArray(data[2])
      app.send('info', data, networkId)
    }
    const release = () => {
      app.state.flyer = null
      setMode(idle)
    }
    const leave = player => {
      if (app.state.flyer === player.networkId) {
        app.state.flyer = null
        setMode(idle)
      }
    }
    app.on('info', info)
    app.on('release', release)
    world.on('leave', leave)
    return () => {
      app.off('info', info)
      app.off('release', release)
      world.off('leave', leave)
    }
  }
  app.state.flyer = null
  app.state.position = body.position.toArray()
  app.state.quaternion = body.quaternion.toArray()
  // console.log('send state', app.version)
  app.send('state', app.state)
  setMode(idle)
}

if (world.isClient) {
  // create node for camera mount
  const mount = app.create('group')
  mount.position.y = 1
  body.add(mount)
  // create "Fly" interact action
  const action = app.create('action')
  action.label = 'Fly'
  action.position.y = 0.5
  action.onTrigger = () => setMode(fly)
  // fly mode
  function fly() {
    body.type = 'dynamic'
    body.remove(action)
    
    // Initialize physics state
    const velocity = new Vector3()
    const angularVel = new Vector3()
    let throttle = 0
    
    // Set up physics properties
    body.linearDamping = 0.95
    body.angularDamping = 0.95
    body.lockRotationX = false
    body.lockRotationY = false
    body.lockRotationZ = false
    
    const control = app.control({
      onPress: code => {
        if (code === 'KeyF') {  // Changed from R to F for exit
          app.send('release')
          setMode(observe)
        }
        return true
      }
    })
    control.camera.claim()

    function fixedUpdate(delta) {
      // Update throttle based on Space/Shift/C
      if (control.buttons.Space) {
        throttle = Math.min(throttle + delta * THROTTLE_SPEED, 1)
      } else if (control.buttons.ShiftLeft || control.buttons.KeyC) {
        throttle = Math.max(throttle - delta * THROTTLE_SPEED, MIN_THROTTLE)
      } else {
        // Gradually decrease throttle when no input
        throttle = Math.max(throttle - delta, MIN_THROTTLE)
      }
      
      // Calculate base thrust and vertical movement
      const thrust = THRUST_POWER * (throttle * throttle)
      let verticalMovement = 0
      
      // Handle vertical movement
      if (control.buttons.Space) {
        verticalMovement = 1  // Moving up
      } else if (control.buttons.KeyC) {
        verticalMovement = -1 // Moving down
        // Add extra downward force
        v3.set(0, -20, 0)
        body.addForce(v3)
      }
      
      // Forward/Backward movement and tilt (X-axis rotation)
      if (control.buttons.KeyW) {
        v2.copy(FORWARD).applyQuaternion(body.quaternion)
        v2.y = 0
        v2.normalize().multiplyScalar(-MOVEMENT_FORCE)
        body.addForce(v2)
        const pitchAxis = new Vector3(1, 0, 0).applyQuaternion(body.quaternion)
        body.addTorque(pitchAxis.multiplyScalar(-TORQUE_FORCE))
      }
      if (control.buttons.KeyS) {
        v2.copy(FORWARD).applyQuaternion(body.quaternion)
        v2.y = 0
        v2.normalize().multiplyScalar(MOVEMENT_FORCE)
        body.addForce(v2)
        const pitchAxis = new Vector3(1, 0, 0).applyQuaternion(body.quaternion)
        body.addTorque(pitchAxis.multiplyScalar(TORQUE_FORCE))
      }
      
      // Auto-stabilize pitch when not pitching
      if (!control.buttons.KeyW && !control.buttons.KeyS) {
        euler.setFromQuaternion(body.quaternion)
        if (Math.abs(euler.x) > 0.01) {
          const pitchAxis = new Vector3(1, 0, 0).applyQuaternion(body.quaternion)
          body.addTorque(pitchAxis.multiplyScalar(-euler.x * STABILIZE_FORCE))
        }
      }
      
      // Roll left/right (Z-axis rotation)
      if (control.buttons.KeyQ) {
        const rollAxis = new Vector3(0, 0, 1).applyQuaternion(body.quaternion)
        body.addTorque(rollAxis.multiplyScalar(TORQUE_FORCE))
      }
      if (control.buttons.KeyE) {
        const rollAxis = new Vector3(0, 0, 1).applyQuaternion(body.quaternion)
        body.addTorque(rollAxis.multiplyScalar(-TORQUE_FORCE))
      }
      
      // Auto-stabilize roll when not rolling
      if (!control.buttons.KeyQ && !control.buttons.KeyE) {
        euler.setFromQuaternion(body.quaternion)
        if (Math.abs(euler.z) > 0.01) {
          const rollAxis = new Vector3(0, 0, 1).applyQuaternion(body.quaternion)
          body.addTorque(rollAxis.multiplyScalar(-euler.z * STABILIZE_FORCE))
        }
      }
      
      // Yaw rotation (Y-axis rotation)
      if (control.buttons.KeyA) {
        body.addTorque(new Vector3(0, TORQUE_FORCE, 0))
      }
      if (control.buttons.KeyD) {
        body.addTorque(new Vector3(0, -TORQUE_FORCE, 0))
      }
      
      // Apply upward thrust and gravity
      v3.copy(UP).applyQuaternion(body.quaternion)
      v3.multiplyScalar(thrust)
      v3.y += GRAVITY
      body.addForce(v3)
      
      // Auto-stabilize rotation when no movement keys are pressed
      if (!control.buttons.KeyW && !control.buttons.KeyS && 
          !control.buttons.KeyA && !control.buttons.KeyD) {
        euler.setFromQuaternion(body.quaternion)
        body.quaternion.setFromEuler(new Euler(0, euler.y, 0))
      }
      
      // Check if landed (approximate ground check)
      const isLanded = body.position.y < 0.1 && Math.abs(velocity.y) < 0.1
      
      // Check if any movement input is active
      const isMoving = control.buttons.Space || control.buttons.KeyC || 
                      control.buttons.KeyW || control.buttons.KeyS ||
                      control.buttons.KeyA || control.buttons.KeyD ||
                      control.buttons.KeyQ || control.buttons.KeyE ||
                      Math.abs(velocity.x) > 0.1 ||
                      Math.abs(velocity.y) > 0.1 ||
                      Math.abs(velocity.z) > 0.1
      
      // Rotor animation based on vertical movement and movement state
      let rotorSpeed = 0
      if (!isLanded || isMoving) {
        // Base speed plus movement multiplier
        rotorSpeed = (20 + throttle * 80) * (verticalMovement >= 0 ? 1 : -0.5)
        if (verticalMovement > 0) {
          rotorSpeed *= 1.5  // Faster when moving up
        }
      }
      
      for (const rotor of rotors) {
        rotor.rotation.y += delta * rotorSpeed
      }
    }

    let elapsed = 0
    function update(delta) {
      mount.matrixWorld.decompose(
        control.camera.position, 
        control.camera.quaternion, 
        v1
      )
      control.camera.zoom = 2
      
      elapsed += delta
      if (elapsed > 1/8) {
        elapsed = 0
        body.position.toArray(app.state.position)
        body.quaternion.toArray(app.state.quaternion)
        app.send('info', [
          world.networkId, 
          app.state.position, 
          app.state.quaternion
        ])
      }
    }
    
    app.on('fixedUpdate', fixedUpdate)
    app.on('update', update)
    return () => {
      app.off('fixedUpdate', fixedUpdate)
      app.off('update', update)
      control.release()
    }
  }
  // observe mode
  function observe() {
    if (!app.state.flyer) body.add(action)
    body.type = 'kinematic'
    body.position.fromArray(app.state.position)
    body.quaternion.fromArray(app.state.quaternion)
    const netPos = new LerpVector3(body.position, 1/8)
    const netRot = new LerpQuaternion(body.quaternion, 1/8)
    const info = data => {
      if (app.state.flyer !== data[0]) {
        app.state.flyer = data[0]
        if (app.state.flyer) {
          body.remove(action)
        } else {
          body.add(action)
        }
      }
      app.state.position = data[1]
      app.state.quaternion = data[2]
      netPos.pushArray(data[1])
      netRot.pushArray(data[2])
    }
    const update = delta => {
      if (app.state.flyer) {
        for (const rotor of rotors) {
          rotor.rotation.y += delta * 40
        }
      }
      netPos.update(delta)
      netRot.update(delta)
    }
    app.on('info', info)
    app.on('update', update)
    return () => {
      app.off('info', info)
      app.off('update', update)
    }
  }
  // init
  if (app.state.position) {
    // console.log('init with state.position')
    setMode(observe)
  } else {
    // console.log('init without state.position') 
    world.remove(body)
    app.on('state', state => {
      // console.log('received state', app.version)
      app.state = state
      world.add(body)
      setMode(observe)
    })
  }
}