/*  
 * Hyperfy Screen Space Clock UI  
 *   
 * This app creates a configurable clock interface that displays on the screen overlay.  
 * Features:  
 * - Configurable positioning (bottom-center, bottom-left, bottom-right, etc.)  
 * - Customizable border color and width  
 * - Optional clock image display  
 * - Real-time timestamp updates  
 * - Responsive flexbox layout with centered alignment  
 * - Block visibility toggle  
 */  
  
// Configure app properties with user-friendly options  
app.configure([  
  {  
    key: 'uiPosition',  
    type: 'switch',  
    label: 'UI Position',  
    hint: 'Choose where to position the clock on screen',  
    options: [  
      { label: 'Bottom Center', value: 'bottom-center' },  
      { label: 'Bottom Left', value: 'bottom-left' },  
      { label: 'Bottom Right', value: 'bottom-right' },  
      { label: 'Top Center', value: 'top-center' },  
      { label: 'Top Right', value: 'top-right' },  
      { label: 'Center Right', value: 'center-right' }  
    ],  
    initial: 'bottom-center'  
  },  
  {  
    key: 'borderColor',  
    type: 'switch',  
    label: 'Border Color',  
    hint: 'Select the color for the clock border',  
    options: [  
      { label: 'White', value: 'rgba(255, 255, 255, 0.3)' },  
      { label: 'Blue', value: 'rgba(0, 150, 255, 0.5)' },  
      { label: 'Green', value: 'rgba(0, 255, 100, 0.5)' },  
      { label: 'Red', value: 'rgba(255, 50, 50, 0.5)' },  
      { label: 'Yellow', value: 'rgba(255, 255, 0, 0.5)' },  
      { label: 'Purple', value: 'rgba(150, 0, 255, 0.5)' }  
    ],  
    initial: 'rgba(255, 255, 255, 0.3)'  
  },  
  {  
    key: 'borderWidth',  
    type: 'switch',  
    label: 'Border Width',  
    hint: 'Adjust the thickness of the border',  
    options: [  
      { label: 'Thin', value: 1 },  
      { label: 'Medium', value: 2 },  
      { label: 'Thick', value: 3 },  
      { label: 'Extra Thick', value: 4 }  
    ],  
    initial: 2  
  },  
  {  
    key: 'uiImage',  
    type: 'file',  
    kind: 'texture',  
    label: 'Clock Image',  
    hint: 'Upload an optional clock icon or image'  
  },  
  {  
    type: 'toggle',  
    key: 'visibility',  
    label: 'Block Visibility',  
    trueLabel: 'Visible',  
    falseLabel: 'Hidden',  
    initial: 'visible'  
  }  
])  
  
// Handle block visibility  
const block = app.get('Block');  
  
// Set initial visibility based on toggle state  
block.active = props.visibility !== false;   
  
// Create the main UI container with screen space positioning  
const ui = app.create('ui', {  
  space: 'screen',              // Render on screen overlay, not in 3D world  
  width: 150,                   // Compact width for minimal footprint  
  height: 60,                   // Reduced height to fit content  
  pivot: props.uiPosition,      // Anchor point for positioning  
  backgroundColor: 'rgba(0, 0, 0, 0.8)',  // Semi-transparent dark background  
  borderRadius: 10,             // Rounded corners  
  borderWidth: props.borderWidth,         // User-configurable border thickness  
  borderColor: props.borderColor,         // User-configurable border color  
  padding: 8,                   // Internal spacing  
  pointerEvents: true,          // Enable mouse interaction  
  justifyContent: 'center',     // Center content horizontally  
  alignItems: 'center',         // Center content vertically  
  alignContent: 'center'        // Center wrapped content  
})  
  
// Create a centered container for the clock elements  
const contentView = app.create('uiview', {  
  flexDirection: 'row',         // Arrange image and text horizontally  
  justifyContent: 'center',     // Center horizontally within container  
  alignItems: 'center',         // Center vertically within container  
  alignContent: 'center',       // Center wrapped lines  
  gap: 8                        // Space between image and text  
})  
  
// Create optional clock image (only if user uploaded one)  
const uiImage = app.create('uiimage', {  
  src: props.uiImage?.url || null,  // Use uploaded image URL or null  
  width: 32,                    // Compact image size  
  height: 32,  
  objectFit: 'cover',           // Scale image to fit container  
  borderRadius: 4               // Slightly rounded image corners  
  // No backgroundColor - transparent background  
})  
  
// Create the time display text  
const timeText = app.create('uitext', {  
  value: world.getTimestamp('HH:mm:ss'),  // Format: 14:30:25  
  fontSize: 18,                 // Large, readable font  
  color: '#ffffff',             // White text for contrast  
  textAlign: 'center'           // Center-aligned text  
})  
  
// Build the UI hierarchy: UI -> contentView -> [image] + text  
ui.add(contentView)  
if (props.uiImage) {  
  contentView.add(uiImage)      // Add image first (left side)  
}  
contentView.add(timeText)       // Add time text (right side or alone)  
  
// Position the UI based on user's pivot selection  
const updatePosition = () => {  
  const position = props.uiPosition  
  ui.pivot = position           // Set the anchor point  
    
  // Calculate screen position and offset for each pivot option  
  // Position uses 0-1 ratios: 0,0 = top-left, 1,1 = bottom-right  
  switch(position) {  
    case 'bottom-center':  
      ui.position.set(0.5, 1, 0)     // Center horizontally, bottom vertically  
      ui.offset.set(0, -20, 0)       // Move up 20px from edge  
      break  
    case 'bottom-left':  
      ui.position.set(0, 1, 0)       // Left side, bottom  
      ui.offset.set(20, -20, 0)      // Move right and up from corner  
      break  
    case 'bottom-right':  
      ui.position.set(1, 1, 0)       // Right side, bottom  
      ui.offset.set(-20, -20, 0)     // Move left and up from corner  
      break  
    case 'top-center':  
      ui.position.set(0.5, 0, 0)     // Center horizontally, top  
      ui.offset.set(0, 20, 0)        // Move down 20px from edge  
      break  
    case 'top-right':  
      ui.position.set(1, 0, 0)       // Right side, top  
      ui.offset.set(-20, 20, 0)      // Move left and down from corner  
      break  
    case 'center-right':  
      ui.position.set(1, 0.5, 0)     // Right side, center vertically  
      ui.offset.set(-20, 0, 0)       // Move left from edge  
      break  
    default:  
      ui.position.set(0.5, 1, 0)     // Fallback to bottom-center  
      ui.offset.set(0, -20, 0)  
  }  
}  
  
// Apply initial positioning  
updatePosition()  
  
// Set up real-time clock updates using Hyperfy's update loop  
let lastTimeUpdate = 0  
app.on('update', (delta) => {  
  lastTimeUpdate += delta       // Accumulate time since last update  
  if (lastTimeUpdate >= 1) {    // Update every second  
    timeText.value = world.getTimestamp('HH:mm:ss')  // Refresh time display  
    lastTimeUpdate = 0          // Reset accumulator  
  }  
})  
  
// Add the UI to the world for rendering  
app.add(ui)