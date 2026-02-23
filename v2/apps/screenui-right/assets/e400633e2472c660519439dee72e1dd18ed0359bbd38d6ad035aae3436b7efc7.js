app.configure([
  {
    type: 'section',
    key: 'bottom',          
    label: 'right',         
  },
  ...Array(9).fill().map((_, i) => ({
    key: `r${i+1}`,
    type: 'text',
    label: `r${i+1}`,
  }))
])

const r1 = app.create('ui', {
  width: 72.5,
  height: 580,
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
  flexDirection: 'column',
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
    console.log(`r${index}Pointerdown`)
    view.backgroundColor = 'blue'
  }
  view.onPointerUp = () => {
    console.log(`r${index}Pointerup`)
    view.backgroundColor = 'white'
  }
  
  // Create emoji text element
  const emoji = app.create('uitext', {
    value: props[`r${index}`],
    backgroundColor: 'teal',
    fontSize: 40,
    textAlign: 'center',
    color: 'white',
    padding: 1,
    cursor: 'pointer'
  })
  
  // Set emoji event handlers
  emoji.onPointerEnter = () => {
    console.log(`r${index}PointerEnter`)
    emoji.backgroundColor = 'red'
  }
  emoji.onPointerLeave = () => {
    console.log(`r${index}PointerLeave`)
    emoji.backgroundColor = 'black'
  }
  
  view.add(emoji)
  return view
}

// Create all views and add them to br1
for (let i = 1; i <= 9; i++) {
  r1.add(createView(i))
}

app.add(r1)