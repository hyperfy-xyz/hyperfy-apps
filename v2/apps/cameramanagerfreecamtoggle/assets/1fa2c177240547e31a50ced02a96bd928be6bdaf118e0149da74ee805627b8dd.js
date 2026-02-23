// CameraManagerFreecamSimpleTest.js - Ultra simple freecam toggle test
// Press C to toggle between freecam and default camera mode

if (world.isClient) {
  let control = app.control()
  let freecamActive = false

  if (control) {
    control.keyC.capture = true
  }

  app.on('update', () => {
    if (!control) return
    if (control.keyC.pressed) {
      freecamActive = !freecamActive
      if (freecamActive) {
        world.emit('camera:freecam', {})
      } else {
        world.emit('camera:reset', { transitionTime: 0.0 })
      }
    }
  })
} 