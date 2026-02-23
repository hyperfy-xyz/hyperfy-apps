app.configure([
  {
    key: 'restricted',
    type: 'toggle',
    label: 'Permission',
    trueLabel: 'Admin',
    falseLabel: 'Everyone',
    initial: false,
  },
  {
    key: 'screensaver',
    type: 'file',
    kind: 'video',
    label: 'Screensaver Video',
    hint: 'Optional video that plays when no one is screen sharing.',
  }
]);

const screenId      = app.instanceId;
const restricted    = props.restricted;
const screensaverSrc = props.screensaver?.url;

// full‐screen UI pixel dimensions (adjust as needed)
const SS_WIDTH  = 1920;
const SS_HEIGHT = 1080;
let fullScreenUI = null;

if (world.isClient) {
  // --- replace the in-world “Screen” mesh with our video
  const screen = app.get('Screen');
  const video  = app.create('video', {
    screenId: screenId,
    linked:   true,
    aspect:   16 / 9,
    geometry: screen.geometry,
    fit:      'contain',
    color:    'black',
  });
  video.position.copy(screen.position);
  video.quaternion.copy(screen.quaternion);
  video.scale.copy(screen.scale);
  screen.parent.remove(screen);
  app.add(video);

  const player = world.getPlayer();
  const canUse = restricted ? player.admin : true;

  // fallback screensaver
  if (screensaverSrc) {
    video.src  = screensaverSrc;
    video.loop = true;
    video.play();
  }

  // --- in-world admin panel
  if (canUse) {
    const panel = app.create('ui', {
      width:  300,
      height: 120,
      size:   0.01,
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius:    8,
      padding:         8,
      flexDirection:  'column',
      justifyContent: 'space-around',
      alignItems:     'center'
    });
    panel.position.copy(screen.position);
    panel.position.y += screen.scale.y * 1.2;
    app.add(panel);

    const controls = app.create('uiview', {
      display:       'flex',
      flexDirection: 'row',
      justifyContent:'space-around',
      alignItems:    'center',
      width:         284,   // panel.width – padding*2 :contentReference[oaicite:1]{index=1}
      height:        40,
      gap:           8
    });

    const shareBtn = app.create('uitext', {
      value:    '📺 Share',
      fontSize: 18,
      cursor:   'pointer',
      onPointerDown: () => {
        if (screensaverSrc) video.pause();
        player.screenshare(screenId);
      }
    });
    const playBtn = app.create('uitext', {
      value:    '▶️', fontSize: 24, cursor: 'pointer',
      onPointerDown: () => video.play()
    });
    const pauseBtn = app.create('uitext', {
      value:    '⏸️', fontSize: 24, cursor: 'pointer',
      onPointerDown: () => video.pause()
    });

    controls.add(shareBtn);
    controls.add(playBtn);
    controls.add(pauseBtn);
    panel.add(controls);
  }

  // restore screensaver when sharing stops
  video.onPointerDown = () => {
    if (!player.screensharing && screensaverSrc && video.paused) video.play();
  };
  world.on('focus', () => {
    if (!player.screensharing && screensaverSrc && video.paused) video.play();
  });

  // --- “Fullscreen” action (E-tooltip) for everyone
  const fsAction = app.create('action', {
    label:    'Fullscreen',
    distance: 5,
    position: [0, 1, 0],
    onTrigger: openFullScreen
  });
  app.add(fsAction);

  function openFullScreen() {
    if (fullScreenUI) return;

    // screen-space container
    fullScreenUI = app.create('ui', {
      space:       'screen',
      pivot:       'top-left',
      position:    [0, 0, 0],
      width:       SS_WIDTH,
      height:      SS_HEIGHT,
      backgroundColor: 'black',
      pointerEvents:   true,
      flexDirection:   'column',
      justifyContent:  'flex-start',
      alignItems:      'center'
    });
    app.add(fullScreenUI);

    // header with close button
    const header = app.create('uiview', {
      width:          SS_WIDTH,  // must be a Number :contentReference[oaicite:2]{index=2}
      height:         50,
      flexDirection:  'row',
      justifyContent: 'flex-end',
      padding:        10
    });
    const closeBtn = app.create('uitext', {
      value:    '✖',
      fontSize: 24,
      cursor:   'pointer',
      onPointerDown: () => {
        fullScreenUI.parent.remove(fullScreenUI);
        fullScreenUI = null;
      }
    });
    header.add(closeBtn);
    fullScreenUI.add(header);

    // video frame as UIImage
    const videoImage = app.create('uiimage', {
      src:       video.src,
      width:     SS_WIDTH,       // must be a Number :contentReference[oaicite:3]{index=3}
      height:    SS_HEIGHT - 60, // leave room for header
      objectFit: 'contain'
    });
    fullScreenUI.add(videoImage);
    videoImage.loadImage(video.src);
  }
}
