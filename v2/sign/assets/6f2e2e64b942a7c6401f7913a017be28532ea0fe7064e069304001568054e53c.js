app.configure([
  {
    key: 'text',
    type: 'text',
    label: 'Text'
  }
])

const ui = app.create('ui', {
  width: 60,
  height: 70,
  position: [0.01, 0.9, 0.15],
  // backgroundColor: 'red',
  alignItems: 'center',
  justifyContent: 'center'
})
const text = app.create('uitext', {
  value: config.text,
  textAlign: 'center',
  fontSize: 11,
  color: 'white'
})
ui.add(text)
app.add(ui)

