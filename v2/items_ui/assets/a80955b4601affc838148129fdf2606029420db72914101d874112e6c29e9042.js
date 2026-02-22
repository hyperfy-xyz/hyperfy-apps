// Define the configuration Array dynamically
const configArray = [
  {
    type: 'section',
    key: 'bottom',
    label: 'bottom',
  },
  ...Array.from({ length: 20 }, (_, i) => ({
    key: `b${i + 1}`,
    type: 'text',
    label: `b${i + 1}`,
  })),
];

// Configure the app using the Array
app.configure(configArray);

// Create b1
const b1 = app.create('ui', {
  width: 180,
  height: 150,
  res: 2,
  position: [1, 1, 0],
  offset: [-30, -40, 0],
  space: 'screen',
  pivot: 'bottom-right',
  backgroundColor: 'darkslategrey',
  borderColor: 'white',
  borderWidth: 1,
  padding: 6,
  pointerEvents: true,
  flexDirection: 'row',
  justifyContent: 'center',
  flexWrap: 'wrap',
  alignItems: 'center',
  alignContent: 'center',
  gap: 7,
});

// Create and add b1view and b1Emoji as part of the loop
for (let i = 1; i <= 20; i++) {
  const childView = app.create('uiview', {
    width: 30,
    height: 30,
    backgroundColor: 'goldenrod',
    borderColor: 'white',
    borderWidth: 1,
    padding: 5,
  });

  b1.add(childView);

  childView.onPointerEnter = () => {
    childView.backgroundColor = 'red';
  };
  childView.onPointerLeave = () => {
    childView.backgroundColor = 'white';
  };
  childView.onPointerDown = () => {
    console.log(`b${i}PointerDown`);
    childView.backgroundColor = 'blue';
  };
  childView.onPointerUp = () => {
    console.log(`b${i}PointerUp`);
    childView.backgroundColor = 'white';
  };

  const childEmoji = app.create('uitext', {
    value: props[`b${i}`],
    backgroundColor: 'transparent',
    fontSize: 20,
    textAlign: 'center',
    color: 'white',
    padding: 1,
    cursor: 'pointer',
  });

  childView.add(childEmoji);

  childEmoji.onPointerEnter = () => {
    console.log(`b${i}PointerEnter`);
    childEmoji.backgroundColor = 'red';
  };
  childEmoji.onPointerLeave = () => {
    console.log(`b${i}PointerLeave`);
    childEmoji.backgroundColor = 'black';
  };
}

// Add b1 to the app
app.add(b1);