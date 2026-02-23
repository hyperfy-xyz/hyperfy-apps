app.configure([
  {
    type: 'section',
    key: 'bottom',          
    label: 'bottom',         
  },
  ...Array(9).fill().map((_, i) => ({
    key: `br${i+1}`,
    type: 'text',
    label: `br${i+1}`,
  }))
])

const br1 = app.create('ui', {
  width: 580,
  height: 72.5,
  res: 2,
  position: [1, 1, 0],
  offset: [-15, -10, 0],
  space: 'screen',
  pivot: 'bottom-right',
  backgroundColor: 'darkslategrey',
  borderRadius: 2,
  borderColor: 'white',
  borderWidth: 1,
  padding: 5,
  pointerEvents: true,
  flexDirection: 'row',
  gap: 7,
})

// Helper function to create views
function createView(index) {
  const view = app.create('uiview', {
    width: 60,
    height: 60,
    backgroundColor: 'goldenrod',
    borderRadius: 2,
    borderColor: 'white',
    borderWidth: 1,
    padding: 5,
  })
  
  // Set event handlers
  view.onPointerEnter = () => {
    view.backgroundColor = 'red'
  }
  view.onPointerLeave = () => {
    view.backgroundColor = 'rgba(0,0,0,.5)'
  }
  view.onPointerDown = () => {
    console.log(`b${index}Pointerdown`)
    view.backgroundColor = 'blue'
  }
  view.onPointerUp = () => {
    console.log(`b${index}Pointerup`)
    view.backgroundColor = 'white'
  }
  
  // Create emoji text element
  const emoji = app.create('uitext', {
    value: props[`br${index}`],
    backgroundColor: 'teal',
    fontSize: 40,
    textAlign: 'center',
    color: 'white',
    padding: 1,
    cursor: 'pointer'
  })
  
  // Set emoji event handlers
  emoji.onPointerEnter = () => {
    console.log(`br${index}PointerEnter`)
    emoji.backgroundColor = 'red'
  }
  emoji.onPointerLeave = () => {
    console.log(`br${index}PointerLeave`)
    emoji.backgroundColor = 'black'
  }
  
  view.add(emoji)
  return view
}

// Create all views and add them to br1
for (let i = 1; i <= 9; i++) {
  br1.add(createView(i))
}

app.add(br1)