// Configure the app with textarea, position range controls, and visibility toggle  
app.configure([  
  {  
    key: 'url',  
    type: 'textarea',  
    label: 'URL',  
    placeholder: 'Enter URL here...',  
    initial: 'deepwiki.com/hyperfy-xyz/hyperfy'  
  },  
  {  
    key: 'uiPositionX',  
    type: 'range',  
    label: 'UI Position X',  
    min: -10,  
    max: 10,  
    step: 0.1,  
    initial: 0  
  },  
  {  
    key: 'uiPositionY',  
    type: 'range',  
    label: 'UI Position Y',  
    min: -5,  
    max: 5,  
    step: 0.1,  
    initial: 2.2  
  },  
  {  
    type: 'toggle',  
    key: 'visibility',  
    label: 'Block Visibility',  
    trueLabel: 'Visible',  
    falseLabel: 'Hidden',  
    initial: true  
  }  
])  
  
// Handle block visibility  
const block = app.get('Block')  
  
// Set initial visibility based on toggle state  
if (block) {  
  block.active = props.visibility !== false  
}  
  
// Create the world-space UI - sized to fit content  
const ui = app.create('ui', {  
  space: 'world',  
  width: 350,  
  height: 60,  
  size: 0.01,  
  backgroundColor: 'rgba(0, 0, 0, 0.8)',  
  borderRadius: 10,  
  borderWidth: 2,  
  borderColor: 'white',  
  padding: 10  
})  
  
// Set UI position based on props  
ui.position.set(props.uiPositionX || 0, props.uiPositionY || 2.2, 0)  
  
// Create a UIView container - with padding for proper spacing  
const container = app.create('uiview', {  
  flexDirection: 'column',  
  justifyContent: 'center',  
  alignItems: 'center',  
  padding: 10  
})  
  
// Create UIText to display the URL value  
const urlText = app.create('uitext', {  
  value: props.url || 'No URL set',  
  fontSize: 16,  
  color: 'white',  
  textAlign: 'center'  
})  
  
// Build the UI hierarchy - only UI nodes as children  
ui.add(container)  
container.add(urlText)  
  
// Create a separate action node (not as child of UI)  
const openAction = app.create('action', {  
  label: 'Open URL',  
  distance: 5,  
  duration: 0.5,  
  onTrigger: () => {  
    if (props.url && world.isClient) {  
      world.open(props.url, true) // true for new tab  
    }  
  }  
})  
  
// Position the action below the UI  
openAction.position.set(props.uiPositionX || 0, 1.7, 0)  
  
// Add both UI and action to the root app  
app.add(ui)  
app.add(openAction)