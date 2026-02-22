app.configure([
  { type: 'section', key: 'radial', label: 'weapons-radial' },
  { type: 'file', key: 'weapon1', label: 'weapon1', kind: 'texture'},
  { type: 'file', key: 'weapon2', label: 'weapon2', kind: 'texture'},
  { type: 'file', key: 'weapon3', label: 'weapon3', kind: 'texture'},
  { type: 'file', key: 'weapon4', label: 'weapon4', kind: 'texture'}
])


const rd1 = app.create('ui', {
  width: 200,
  height: 200,
  res: 2,
  position: [1, 1, 0],
  offset: [-27.5, -17.5, 0],
  space: 'screen',
  pivot: 'bottom-right',
  backgroundColor: 'darkslategrey',
  borderRadius: 100,
  borderColor: 'white',
  borderWidth: 1,
  padding: 20,
  pointerEvents: true,
  flexDirection: 'row',
  justifyContent: 'flex-start',
  alignItems: 'center',
  gap: 7,
});

const rd2 = app.create('ui', {
  width: 50,
  height: 50,
  res: 2,
  position: [1, 1, 0],
  offset: [-140, -95, 0],
  space: 'screen',
  pivot: 'bottom-right',
  backgroundColor: 'darkslategrey',
  padding: 2,
  pointerEvents: true,
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 2,
});

app.add(rd2);

  const rd2view = app.create('uiview', {
    width: 40,
    height: 40,
    backgroundColor: 'transparent',
    // borderRadius: 10,
    // borderColor: 'white',
    // borderWidth: 1,
    padding: 1,
    margin: 2,
  });
rd2.add(rd2view);

  const weapon1 = app.create('uiimage');
  weapon1.src= props.weapon1?.url.replace('asset://', '/assets/') 
  weapon1.width = 40;
  weapon1.height = 40;
  weapon1.objectFit = 'fill';
  weapon1.backgroundColor = `transparent`; 
  rd2view.add(weapon1);

  const rd3 = app.create('ui', {
  width: 50,
  height: 50,
  res: 2,
  position: [1, 1, 0],
  offset: [-65, -95, 0],
  space: 'screen',
  pivot: 'bottom-right',
  backgroundColor: 'darkslategrey',
  padding: 2,
  pointerEvents: true,
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 2,
});

  const rd3view = app.create('uiview', {
    width: 40,
    height: 20,
    backgroundColor: 'goldenrod',
    borderRadius: 10,
    borderColor: 'white',
    borderWidth: 1,
    padding: 2,
    margin: 2,
  });

  rd3view.onPointerEnter = () => {
    rd3view.backgroundColor = 'darkgoldenrod';
  };
  rd3view.onPointerLeave = () => {
    rd3view.backgroundColor = 'goldenrod';
  };
  rd3view.onPointerDown = () => {
    rd3view.backgroundColor = 'gold';
  };
  rd3view.onPointerUp = () => {
    rd3view.backgroundColor = 'goldenrod';
  };

  const rd4 = app.create('ui', {
  width: 50,
  height: 50,
  res: 2,
  position: [1, 1, 0],
  offset: [-102.5, -50, 0],
  space: 'screen',
  pivot: 'bottom-right',
  backgroundColor: 'darkslategrey',
  padding: 2,
  pointerEvents: true,
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 2,
});

  const rd4view = app.create('uiview', {
    width: 20,
    height: 40,
    backgroundColor: 'goldenrod',
    borderRadius: 10,
    borderColor: 'white',
    borderWidth: 1,
    padding: 2,
    margin: 2,
  });

  rd4view.onPointerEnter = () => {
    rd4view.backgroundColor = 'darkgoldenrod';
  };
  rd4view.onPointerLeave = () => {
    rd4view.backgroundColor = 'goldenrod';
  };
  rd4view.onPointerDown = () => {
    rd4view.backgroundColor = 'gold';
  };
  rd4view.onPointerUp = () => {
    rd4view.backgroundColor = 'goldenrod';
  };

  const rd5 = app.create('ui', {
  width: 50,
  height: 50,
  res: 2,
  position: [1, 1, 0],
  offset: [-102.5, -135, 0],
  space: 'screen',
  pivot: 'bottom-right',
  backgroundColor: 'darkslategrey',
  padding: 2,
  pointerEvents: true,
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 2,
});

  const rd5view = app.create('uiview', {
    width: 20,
    height: 40,
    backgroundColor: 'goldenrod',
    borderRadius: 10,
    borderColor: 'white',
    borderWidth: 1,
    padding: 2,
    margin: 2,
  });

  rd5view.onPointerEnter = () => {
    rd5view.backgroundColor = 'darkgoldenrod';
  };
  rd5view.onPointerLeave = () => {
    rd5view.backgroundColor = 'goldenrod';
  };
  rd5view.onPointerDown = () => {
    rd5view.backgroundColor = 'gold';
  };
  rd5view.onPointerUp = () => {
    rd5view.backgroundColor = 'goldenrod';
  };

  const rd6 = app.create('ui', {
  width: 60,
  height: 30,
  res: 2,
  position: [1, 1, 0],
  offset: [-97.5, -201, 0],
  space: 'screen',
  pivot: 'bottom-right',
  backgroundColor: 'transparent',
  padding: 2,
  pointerEvents: true,
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 2,
});

  const rd6view = app.create('uiview', {
    width: 45,
    height: 10,
    backgroundColor: 'darkorange',
    borderRadius: 5,
    borderColor: 'white',
    borderWidth: 1,
    padding: 2,
    margin: 2,
  });

  rd6view.onPointerEnter = () => {
    rd6view.backgroundColor = 'orange';
  };
  rd6view.onPointerLeave = () => {
    rd6view.backgroundColor = 'darkorange';
  };
  rd6view.onPointerDown = () => {
    rd6view.backgroundColor = 'orangered';
  };
  rd6view.onPointerUp = () => {
    rd6view.backgroundColor = 'darkorange';
  };

  const rd7 = app.create('ui', {
  width: 60,
  height: 30,
  res: 2,
  position: [1, 1, 0],
  offset: [-288.5, -201, 0],
  space: 'screen',
  pivot: 'bottom-right',
  backgroundColor: 'transparent',
  padding: 2,
  pointerEvents: true,
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 2,
});

  const rd7view = app.create('uiview', {
    width: 45,
    height: 10,
    backgroundColor: 'darkorange',
    borderRadius: 5,
    borderColor: 'white',
    borderWidth: 1,
    padding: 2,
    margin: 2,
  });

  rd7view.onPointerEnter = () => {
    rd7view.backgroundColor = 'orange';
  };
  rd7view.onPointerLeave = () => {
    rd7view.backgroundColor = 'darkorange';
  };
  rd7view.onPointerDown = () => {
    rd7view.backgroundColor = 'orangered';
  };
  rd7view.onPointerUp = () => {
    rd7view.backgroundColor = 'darkorange';
  };

// const rdViews = ['rd1', 'rd2'].map(key => createRdView(key, props));

// rdViews.forEach(rdView => rd1.add(rdView));

// rd7.add(rd7view);
// rd6.add(rd6view);
rd5.add(rd5view);
rd4.add(rd4view);
rd3.add(rd3view);
rd2.add(rd2view);
rd2view.add(weapon1);
app.add(rd7);
app.add(rd6);
app.add(rd5);
app.add(rd4);
app.add(rd3);
app.add(rd2);
app.add(rd1);
