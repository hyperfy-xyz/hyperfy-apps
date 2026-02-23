let count = 0

const ui = app.create('ui', {
  position: [0, 1.5, 0],
  backgroundColor: 'white'
})
app.add(ui)

const text = app.create('uitext', {
  value: `Count: ${count}`
})
ui.add(text)

app.onPointerDown = () => {
  count++
  text.value = `Count: ${count}`
}

app.onPointerEnter = () => {
  app.scale.setScalar(1.1)
}

app.onPointerLeave = () => {
  app.scale.setScalar(1)
}