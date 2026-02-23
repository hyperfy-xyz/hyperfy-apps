app.configure([
  { type: 'section', key: 'radial', label: 'radial' },
  ...Array.from({ length: 2 }, (_, i) => ({ key: `rd${i + 1}`, type: 'text', label: `rd${i + 1}` }))
]);

const createRdView = (key, props) => {
  const rdView = app.create('uiview', {
    width: 55,
    height: 55,
    backgroundColor: 'goldenrod',
    borderRadius: 27.5,
    borderColor: 'white',
    borderWidth: 1,
    padding: 4.5,
    margin: 10,
  });

  rdView.onPointerEnter = () => {
    rdView.backgroundColor = 'darkgoldenrod';
  };
  rdView.onPointerLeave = () => {
    rdView.backgroundColor = 'goldenrod';
  };
  rdView.onPointerDown = () => {
    rdView.backgroundColor = 'gold';
  };
  rdView.onPointerUp = () => {
    rdView.backgroundColor = 'darkgoldenrod';
  };

  const rdEmoji = app.create('uitext', {
    value: props[key],
    backgroundColor: 'transparent',
    fontSize: 30,
    textAlign: 'center',
    color: 'white',
    padding: 5,
    cursor: 'pointer'
  });

  rdEmoji.onPointerEnter = () => {
    console.log(`${key}EmojiPointerEnter`);
    rdEmoji.backgroundColor = 'red';
  };
  rdEmoji.onPointerLeave = () => {
    console.log(`${key}EmojiPointerLeave`);
    rdEmoji.backgroundColor = 'black';
  };

  rdView.add(rdEmoji);
  return rdView;
};

const rd1 = app.create('ui', {
  width: 400,
  height: 200,
  res: 2,
  position: [1, 1, 0],
  offset: [-20, -20, 0],
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

  const rd2view = app.create('uiview', {
    width: 40,
    height: 20,
    backgroundColor: 'goldenrod',
    borderRadius: 10,
    borderColor: 'white',
    borderWidth: 1,
    padding: 2,
    margin: 2,
  });

   rd2view.onPointerEnter = () => {
    rd2view.backgroundColor = 'darkgoldenrod';
  };
  rd2view.onPointerLeave = () => {
    rd2view.backgroundColor = 'goldenrod';
  };
  rd2view.onPointerDown = () => {
    rd2view.backgroundColor = 'gold';
  };
  rd2view.onPointerUp = () => {
    rd2view.backgroundColor = 'goldenrod';
  };

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

const rdViews = ['rd1', 'rd2'].map(key => createRdView(key, props));

rdViews.forEach(rdView => rd1.add(rdView));

rd7.add(rd7view);
rd6.add(rd6view);
rd5.add(rd5view);
rd4.add(rd4view);
rd3.add(rd3view);
rd2.add(rd2view);
app.add(rd7);
app.add(rd6);
app.add(rd5);
app.add(rd4);
app.add(rd3);
app.add(rd2);
app.add(rd1);
