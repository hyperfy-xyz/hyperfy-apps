app.configure([
  { type: 'section', key: 'radial', label: 'radial' },
  ...Array.from({ length: 4 }, (_, i) => ({ key: `rd${i + 1}`, type: 'text', label: `rd${i + 1}` }))
]);

const createRdView = (key, props) => {
  const rdView = app.create('uiview', {
    width: 60,
    height: 60,
    backgroundColor: 'goldenrod',
    borderRadius: 30,
    borderColor: 'white',
    borderWidth: 1,
    padding: 5,
  });

  rdView.onPointerEnter = () => {
    rdView.backgroundColor = 'red';
  };
  rdView.onPointerLeave = () => {
    rdView.backgroundColor = 'rgba(0,0,0,.5)';
  };
  rdView.onPointerDown = () => {
    console.log(`${key}Pointerdown`);
    rdView.backgroundColor = 'blue';
  };
  rdView.onPointerUp = () => {
    console.log(`${key}Pointerup`);
    rdView.backgroundColor = 'white';
  };

  const rdEmoji = app.create('uitext', {
    value: props[key],
    backgroundColor: 'transparent',
    fontSize: 30,
    textAlign: 'center',
    color: 'white',
    padding: 8,
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
  width: 200,
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
  padding: 10,
  pointerEvents: true,
  flexDirection: 'row',
  justifyContent: 'center',
  flexWrap: 'wrap',
  alignItems: 'center',
  alignContent: 'center',
  gap: 7,
});


const rdViews = ['rd1', 'rd2', 'rd3', 'rd4'].map(key => createRdView(key, props));

rdViews.forEach(rdView => rd1.add(rdView));

app.add(rd1);