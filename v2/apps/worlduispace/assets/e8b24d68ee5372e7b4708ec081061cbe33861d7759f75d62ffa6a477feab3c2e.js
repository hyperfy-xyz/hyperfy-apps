app.configure([
  {
    key: 'screen',
    type: 'switch',
    label: 'Space',
    options: [
      { label: 'World', value: false },
      { label: 'Screen', value: true },
    ],
    initial: true,
  }
])

const ui = app.create('ui', {
  width: 100,
  height: 100,
  res: 2,

  ...(props.screen ? {
    position: [1, 0, 0],
    offset: [-20, 20, 0],
    space: 'screen',
    pivot: 'top-right',
  } : {
    position: [0, 2, 0],
    space: 'world',
    pivot: 'center',
  }),

  backgroundColor: 'white',
  borderRadius: 10,
  padding: 10,
  pointerEvents: true,
})
ui.onPointerDown = () => {
  console.log('down')
  ui.backgroundColor = 'blue'
}
ui.onPointerUp = () => {
  console.log('up')
  ui.backgroundColor = 'white'
}

const text = app.create('uitext', {
  value: 'Hello',
  backgroundColor:'black',
  color:'white',
  padding: 10,
  cursor: 'pointer'
})

text.onPointerEnter = () => {
  console.log('hi')
  text.backgroundColor = 'red'
}
text.onPointerLeave = () => {
  console.log('bye')
  text.backgroundColor = 'black'
}
ui.add(text)

const view = app.create('uiview', {
  backgroundColor: 'rgba(0,0,0,.5)',
  height:30
})
view.onPointerEnter = () => {
  view.backgroundColor ='red'
}
view.onPointerLeave = () => {
  view.backgroundColor ='rgba(0,0,0,.5)'
}
ui.add(view)


app.add(ui)

