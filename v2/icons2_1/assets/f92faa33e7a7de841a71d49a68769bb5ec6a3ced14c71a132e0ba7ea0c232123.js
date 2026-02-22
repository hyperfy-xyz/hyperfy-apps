
console.log('init')
const selected = "YinYang_01"
const icons = []
app.traverse(node => {
  if (node.parent?.id == '$root') {
    icons.push(node.id)
    if (app.config.buttonType === node.id) return
    node.active = false
  }
})



app.configure([
  {
    key: 'buttonType',
    type: 'dropdown',
    label: 'Operation Mode',
    options: icons.map((iconId) => ({ label: iconId, value: iconId })),
    initial: selected
  },
])