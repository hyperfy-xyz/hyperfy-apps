if (world.isClient) {
  let mode
  const setMode = fn => {
    mode?.()
    mode = fn()
  }

  function builderMode() {
    let control = app.control({
      onPress: code => {
        if (code === 'KeyF') {
          console.log("// start GameMode")
          setMode(gameMode)
        }
        // return true
      }
    })

    control.pointer.unlock()
    control._looking = false

    modeSet('building')

    return () => {
      control.release();
    }
  }

  function modeSet(modeName) {
    const msg = {
      id: uuid(),
      from: "SYSTEM",
      fromId: app.instanceId,
      body: `${modeName} mode`,
      createdAt: world.getTimestamp(),
    };
    world.chat(msg, false);
  }
  function gameMode() {
    let control = app.control({
      onPress: code => {
        if (code === 'KeyF') {
          setMode(builderMode)
        }
        // return true
      },
      onRelease: code => {
        if (code === 'MouseRight') {
          return true;
        }
      },
    })

    control.pointer.lock()
    control._looking = true

    modeSet('game')

    return () => {
      control.release();
    }
  }

  setMode(builderMode)
}