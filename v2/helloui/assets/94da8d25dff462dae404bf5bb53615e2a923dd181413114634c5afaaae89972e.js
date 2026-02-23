/**  
 * Hyperfy UI System Example  
 *   
 * This app demonstrates the core UI system in Hyperfy, showcasing:  
 * - Creating UI containers with world/screen space positioning  
 * - Using UIView for flexbox layout containers  
 * - Adding UIText and UIImage elements with styling  
 * - Configuring props with various field types including toggles  
 * - Applying borders, spacing, and responsive design  
 * - Dynamic positioning and space switching  
 * - Proper UI hierarchy (UI -> UIView -> UIText/UIImage)  
 * - Block visibility control using app.get() and node.active  
 *   
 * Key concepts:  
 * - Always use app.add() to attach UI to the world  
 * - UI elements must be children of a UI container  
 * - Props allow non-technical users to configure the app  
 * - Flexbox layout works similar to CSS  
 */  
  
// Configure app properties with hints for user guidance  
app.configure([  
  {  
    key: 'welcomeText',  
    type: 'text',  
    label: 'Welcome Message',  
    hint: 'The main text displayed in the UI header',  
    initial: 'Welcome to Hyperfy!'  
  },  
  {  
    key: 'showLogo',  
    type: 'toggle',  
    label: 'Show Logo',  
    hint: 'Toggle to display or hide the logo image next to the text',  
    initial: true  
  },  
  {  
    key: 'logoImage',  
    type: 'file',  
    kind: 'texture',  
    label: 'Logo Image',  
    hint: 'Upload an image file to use as the logo (jpg, png, webp supported)'  
  },  
  {  
    key: 'useScreenSpace',  
    type: 'toggle',  
    label: 'Use Screen Space',  
    hint: 'Switch between world space (3D positioned) and screen space (2D overlay)',  
    initial: false  
  },  
  {  
    key: 'showBorder',  
    type: 'toggle',  
    label: 'Show Border',  
    hint: 'Add a white border around the main UI container',  
    initial: true  
  },  
  {  
    key: 'showSpaceIndicator',  
    type: 'toggle',  
    label: 'Show Space Indicator',  
    hint: 'Display a small text showing current space mode (WORLD/SCREEN)',  
    initial: true  
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
  
// Create the main UI container with dynamic space and styling  
const ui = app.create('ui', {  
  space: props.useScreenSpace ? 'screen' : 'world',  // Switch between 3D world and 2D screen  
  width: 400,                                        // Canvas width in pixels  
  height: 150,                                       // Compact height for header-style UI  
  backgroundColor: 'rgba(0, 0, 0, 0.9)',            // Semi-transparent dark background  
  borderRadius: 15,                                  // Rounded corners  
  padding: 20,                                       // Internal spacing  
  billboard: 'full',                                 // Always face the camera  
    
  // Conditional border styling based on user preference  
  borderWidth: props.showBorder ? 2 : 0,  
  borderColor: props.showBorder ? '#ffffff' : null,  
    
  // Position handling differs between space types  
  ...(props.useScreenSpace ? {  
    position: [0.5, 0.2, 0],  // Screen space: ratios (center X, 20% from top Y)  
    pivot: 'center'           // Anchor point for screen positioning  
  } : {  
    // World space positioning set below with position.set()  
  })  
})  
  
// Set 3D world position when not in screen space  
if (!props.useScreenSpace) {  
  ui.position.set(0, 2, 0)  // Position 2 meters above ground in world space  
}  
  
// Create header container using flexbox layout  
const header = app.create('uiview', {  
  flexDirection: 'row',        // Arrange children horizontally  
  justifyContent: 'center',    // Center content horizontally  
  alignItems: 'center',        // Center content vertically  
  margin: [0, 0, 15, 0],       // Space below header using array format [top, right, bottom, left]  
  gap: 15,                     // Space between logo and text  
    
  // Container styling with subtle border  
  borderWidth: 1,  
  borderColor: 'rgba(255, 255, 255, 0.3)',  
  borderRadius: 8,  
  padding: 10,  
  backgroundColor: 'rgba(255, 255, 255, 0.05)'  
})  
  
// Add logo image if enabled and image is provided  
if (props.showLogo && props.logoImage) {  
  const logo = app.create('uiimage', {  
    src: props.logoImage.url,    // Use uploaded image URL  
    width: 35,                   // Compact size for header  
    height: 35,  
    objectFit: 'contain',        // Maintain aspect ratio  
      
    // Circular border styling for logo  
    borderWidth: 2,  
    borderColor: '#ffaa00',  
    borderRadius: 18,            // Half of width/height for circle  
    backgroundColor: 'rgba(255, 170, 0, 0.1)'  
  })  
  header.add(logo)  // Add logo first for left positioning  
}  
  
// Create main title text without background styling  
const title = app.create('uitext', {  
  value: props.welcomeText,      // Use configured welcome message  
  fontSize: 20,                  // Readable size for compact UI  
  color: '#ffffff',              // White text for contrast  
  fontWeight: 'bold',            // Emphasize importance  
  textAlign: 'center'            // Center text content  
  // Note: No background/border styling for clean look  
})  
  
// Add title to header container  
header.add(title)  
  
// Conditionally show space mode indicator  
if (props.showSpaceIndicator) {  
  const spaceIndicator = app.create('uitext', {  
    value: props.useScreenSpace ? 'SCREEN' : 'WORLD',  // Dynamic text based on mode  
    fontSize: 12,                                       // Small indicator text  
    color: props.useScreenSpace ? '#00ff88' : '#ff8800', // Green for screen, orange for world  
    fontWeight: 'bold',  
    textAlign: 'center',  
      
    // Styled indicator with matching border color  
    backgroundColor: 'rgba(0, 0, 0, 0.5)',  
    borderWidth: 1,  
    borderColor: props.useScreenSpace ? '#00ff88' : '#ff8800',  
    borderRadius: 3,  
    padding: 4  
  })  
  ui.add(spaceIndicator)  // Add indicator below header  
}  
  
// Build UI hierarchy: UI container -> header view -> content  
ui.add(header)  
  
// Always add UI to app to make it visible in the world  
app.add(ui)