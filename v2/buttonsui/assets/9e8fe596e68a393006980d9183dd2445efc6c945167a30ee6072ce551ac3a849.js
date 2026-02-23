/**  
 * Interactive UI Buttons Example with Hover Effects  
 *   
 * This app demonstrates how to create interactive UI buttons in Hyperfy using:  
 * - UIView elements as clickable button containers  
 * - onPointerDown, onPointerEnter, and onPointerLeave event handlers  
 * - Dynamic styling and hover effects  
 * - Button feedback with visual changes  
 * - Multiple button types and layouts  
 * - Props configuration organized with sections  
 * - Audio file configuration for sound effects  
 * - Responsive UI sizing based on button size  
 * - Cursor pointer for screen space UI  
 *   
 * Key concepts:  
 * - UIView elements can act as buttons with pointer event handlers  
 * - Hover effects enhance user experience  
 * - Visual feedback provides immediate response  
 * - State management tracks button interactions  
 * - 3D mesh visibility can be controlled through props  
 */  
  
// Configure app properties organized by sections  
app.configure([  
  {  
    type: 'section',  
    label: 'Appearance'  
  },  
  {  
    key: 'buttonTheme',  
    type: 'switch',  
    label: 'Button Theme',  
    hint: 'Choose the visual style for the buttons',  
    options: [  
      { label: 'Modern', value: 'modern' },  
      { label: 'Classic', value: 'classic' },  
      { label: 'Neon', value: 'neon' }  
    ],  
    initial: 'modern'  
  },  
  {  
    key: 'buttonSize',  
    type: 'range',  
    label: 'Button Size',  
    hint: 'Adjust the size of the buttons and UI container',  
    min: 0.5,  
    max: 2.0,  
    step: 0.1,  
    initial: 1.0  
  },  
  {  
    type: 'section',  
    label: 'Behavior'  
  },  
  {  
    key: 'enableSounds',  
    type: 'toggle',  
    label: 'Button Sounds',  
    hint: 'Play sound effects when buttons are clicked',  
    initial: true  
  },  
  {  
    key: 'clickSound',  
    type: 'file',  
    kind: 'audio',  
    label: 'Click Sound',  
    hint: 'Audio file to play when buttons are clicked'  
  },  
  {  
    key: 'showCounter',  
    type: 'toggle',  
    label: 'Show Click Counter',  
    hint: 'Display a counter showing total button clicks',  
    initial: true  
  },  
  {  
    type: 'section',  
    label: 'Layout'  
  },  
  {  
    key: 'useWorldSpace',  
    type: 'toggle',  
    label: 'World Space UI',  
    hint: 'Position UI in 3D world space instead of screen overlay',  
    initial: true  
  },  
  {  
    type: 'section',  
    label: '3D Objects'  
  },  
  {  
    type: 'toggle',  
    key: 'visibility',  
    label: 'Block Visibility',  
    hint: 'Control the visibility of the 3D block mesh in the scene',  
    trueLabel: 'Visible',  
    falseLabel: 'Hidden',  
    initial: 'visible'  
  }  
])  
  
// Handle block visibility  
const block = app.get('Block');  
  
// Set initial visibility based on toggle state  
block.active = props.visibility !== false;   
  
// Button state management  
let clickCount = 0  
let lastClickedButton = null  
  
// Theme configurations for different button styles  
const themes = {  
  modern: {  
    primary: {   
      bg: 'rgba(59, 130, 246, 0.9)',   
      border: '#3b82f6',   
      hover: 'rgba(37, 99, 235, 0.9)',  
      hoverBorder: '#1d4ed8'  
    },  
    secondary: {   
      bg: 'rgba(107, 114, 128, 0.9)',   
      border: '#6b7280',   
      hover: 'rgba(75, 85, 99, 0.9)',  
      hoverBorder: '#4b5563'  
    },  
    success: {   
      bg: 'rgba(34, 197, 94, 0.9)',   
      border: '#22c55e',   
      hover: 'rgba(21, 128, 61, 0.9)',  
      hoverBorder: '#16a34a'  
    },  
    danger: {   
      bg: 'rgba(239, 68, 68, 0.9)',   
      border: '#ef4444',   
      hover: 'rgba(220, 38, 38, 0.9)',  
      hoverBorder: '#dc2626'  
    }  
  },  
  classic: {  
    primary: {   
      bg: 'rgba(0, 0, 139, 0.9)',   
      border: '#00008b',   
      hover: 'rgba(0, 0, 205, 0.9)',  
      hoverBorder: '#0000cd'  
    },  
    secondary: {   
      bg: 'rgba(128, 128, 128, 0.9)',   
      border: '#808080',   
      hover: 'rgba(169, 169, 169, 0.9)',  
      hoverBorder: '#a9a9a9'  
    },  
    success: {   
      bg: 'rgba(0, 128, 0, 0.9)',   
      border: '#008000',   
      hover: 'rgba(34, 139, 34, 0.9)',  
      hoverBorder: '#228b22'  
    },  
    danger: {   
      bg: 'rgba(220, 20, 60, 0.9)',   
      border: '#dc143c',   
      hover: 'rgba(178, 34, 34, 0.9)',  
      hoverBorder: '#b22222'  
    }  
  },  
  neon: {  
    primary: {   
      bg: 'rgba(0, 255, 255, 0.2)',   
      border: '#00ffff',   
      hover: 'rgba(0, 255, 255, 0.4)',  
      hoverBorder: '#00cccc'  
    },  
    secondary: {   
      bg: 'rgba(255, 0, 255, 0.2)',   
      border: '#ff00ff',   
      hover: 'rgba(255, 0, 255, 0.4)',  
      hoverBorder: '#cc00cc'  
    },  
    success: {   
      bg: 'rgba(0, 255, 0, 0.2)',   
      border: '#00ff00',   
      hover: 'rgba(0, 255, 0, 0.4)',  
      hoverBorder: '#00cc00'  
    },  
    danger: {   
      bg: 'rgba(255, 0, 0, 0.2)',   
      border: '#ff0000',   
      hover: 'rgba(255, 0, 0, 0.4)',  
      hoverBorder: '#cc0000'  
    }  
  }  
}  
  
// Get current theme colors  
const currentTheme = themes[props.buttonTheme] || themes.modern  
  
// Calculate responsive UI dimensions based on button size  
const baseSize = props.buttonSize || 1.0  
const uiWidth = 500 * baseSize  
const uiHeight = 350 * baseSize  
  
// Create main UI container with responsive sizing  
const ui = app.create('ui', {  
  space: props.useWorldSpace ? 'world' : 'screen',  
  width: uiWidth,  
  height: uiHeight,  
  backgroundColor: 'rgba(0, 0, 0, 0.85)',  
  borderRadius: 20 * baseSize,  
  padding: 25 * baseSize,  
  billboard: props.useWorldSpace ? 'full' : 'none',  
  borderWidth: 2,  
  borderColor: 'rgba(255, 255, 255, 0.2)',  
    
  // Position based on space type  
  ...(props.useWorldSpace ? {  
    // World space positioning  
  } : {  
    position: [0.5, 0.5, 0],  // Center of screen  
    pivot: 'center'  
  })  
})  
  
// Set world position if using world space  
if (props.useWorldSpace) {  
  ui.position.set(0, 3, -2)  // Position in front of player  
}  
  
// Create header with title  
const header = app.create('uiview', {  
  flexDirection: 'column',  
  alignItems: 'center',  
  margin: [0, 0, 20 * baseSize, 0],  
})  
  
const title = app.create('uitext', {  
  value: 'Interactive UI Buttons',  
  fontSize: 24 * baseSize,  
  color: '#ffffff',  
  fontWeight: 'bold',  
  textAlign: 'center'  
})  
  
header.add(title)  
  
// Create click counter if enabled  
let counterText = null  
if (props.showCounter) {  
  counterText = app.create('uitext', {  
    value: `Clicks: ${clickCount}`,  
    fontSize: 16 * baseSize,  
    color: '#a0a0a0',  
    textAlign: 'center',  
    margin: [10 * baseSize, 0, 0, 0]  
  })  
  header.add(counterText)  
}  
  
// Function to update counter display  
function updateCounter() {  
  if (counterText) {  
    counterText.value = `Clicks: ${clickCount}`  
  }  
}  
  
// Function to play click sound (FIXED)  
function playClickSound() {  
  if (props.enableSounds && props.clickSound) {  
    // Create and play audio using the uploaded sound file  
    const audio = app.create('audio', {  
      src: props.clickSound.url,  
      volume: 0.5  
    })  
      
    // Add to app so it can be managed properly  
    app.add(audio)  
      
    // Play the audio  
    audio.play()  
      
    // Stop and remove audio after playing  
    setTimeout(() => {  
      audio.stop()  
      app.remove(audio)  // Use remove instead of destroy  
    }, 2000)  
  }  
}  
  
// Function to create a button with hover effects and onPointerDown handler  
function createButton(text, type, action) {  
  const theme = currentTheme[type] || currentTheme.primary  
    
  const button = app.create('uiview', {  
    width: 120 * baseSize,  
    height: 45 * baseSize,  
    backgroundColor: theme.bg,  
    borderWidth: 2,  
    borderColor: theme.border,  
    borderRadius: 8 * baseSize,  
    margin: [5 * baseSize, 5 * baseSize, 5 * baseSize, 5 * baseSize],  
    justifyContent: 'center',  
    alignItems: 'center'  
  })  
    
  const buttonText = app.create('uitext', {  
    value: text,  
    fontSize: 16 * baseSize,  
    color: '#ffffff',  
    fontWeight: 'bold',  
    textAlign: 'center'  
  })  
    
  button.add(buttonText)  
    
  // Add hover effect with onPointerEnter  
  button.onPointerEnter = () => {  
    button.backgroundColor = theme.hover  
    button.borderColor = theme.hoverBorder  
    button.borderWidth = 3  
      
    // Set cursor to pointer for screen space UI  
    if (!props.useWorldSpace && ui.canvas) {  
      ui.canvas.style.cursor = 'pointer'  
    }  
  }  
    
  // Remove hover effect with onPointerLeave  
  button.onPointerLeave = () => {  
    button.backgroundColor = theme.bg  
    button.borderColor = theme.border  
    button.borderWidth = 2  
      
    // Reset cursor for screen space UI  
    if (!props.useWorldSpace && ui.canvas) {  
      ui.canvas.style.cursor = 'default'  
    }  
  }  
    
  // Add click handler with onPointerDown  
  button.onPointerDown = () => {  
    // Increment click counter  
    clickCount++  
    lastClickedButton = text  
    updateCounter()  
      
    // Play click sound  
    playClickSound()  
      
    // Brief visual feedback for click  
    button.backgroundColor = theme.hoverBorder  
    setTimeout(() => {  
      button.backgroundColor = theme.hover  // Return to hover state  
    }, 100)  
      
    // Execute the button's specific action  
    if (action) {  
      action()  
    }  
      
    console.log(`Button "${text}" was clicked! Total clicks: ${clickCount}`)  
  }  
    
  return button  
}  
  
// Create button container with grid layout  
const buttonContainer = app.create('uiview', {  
  flexDirection: 'column',  
  gap: 10 * baseSize,  
  alignItems: 'center'  
})  
  
// Create first row of buttons  
const buttonRow1 = app.create('uiview', {  
  flexDirection: 'row',  
  gap: 10 * baseSize,  
  justifyContent: 'center'  
})  
  
// Create action buttons with different types and behaviors  
const primaryButton = createButton('Primary', 'primary', () => {  
  console.log('Primary action executed!')  
})  
  
const secondaryButton = createButton('Secondary', 'secondary', () => {  
  console.log('Secondary action executed!')  
})  
  
buttonRow1.add(primaryButton)  
buttonRow1.add(secondaryButton)  
  
// Create second row of buttons  
const buttonRow2 = app.create('uiview', {  
  flexDirection: 'row',  
  gap: 10 * baseSize,  
  justifyContent: 'center'  
})  
  
const successButton = createButton('Success', 'success', () => {  
  console.log('Success action executed!')  
})  
  
const dangerButton = createButton('Danger', 'danger', () => {  
  console.log('Danger action executed!')  
})  
  
buttonRow2.add(successButton)  
buttonRow2.add(dangerButton)  
  
// Create special action buttons  
const buttonRow3 = app.create('uiview', {  
  flexDirection: 'row',  
  gap: 10 * baseSize,  
  justifyContent: 'center',  
  margin: [10 * baseSize, 0, 0, 0]  
})  
  
const resetButton = createButton('Reset Counter', 'secondary', () => {  
  clickCount = 0  
  updateCounter()  
  console.log('Counter reset!')  
})  
  
buttonRow3.add(resetButton)  
  
// Add all button rows to container  
buttonContainer.add(buttonRow1)  
buttonContainer.add(buttonRow2)  
buttonContainer.add(buttonRow3)  
  
// Create footer with instructions  
const footer = app.create('uiview', {  
  margin: [20 * baseSize, 0, 0, 0],  
  alignItems: 'center'  
})  
  
const instructions = app.create('uitext', {  
  value: 'Hover and click buttons to see pointer events in action!',  
  fontSize: 14 * baseSize,  
  color: '#cccccc',  
  textAlign: 'center'  
})  
  
footer.add(instructions)  
  
// Assemble the complete UI hierarchy  
ui.add(header)  
ui.add(buttonContainer)  
ui.add(footer)  
  
// Always add UI to app to make it visible  
app.add(ui)  
  