// Configure the app's customization fields
app.configure([
  // Section for Text
  {
    type: 'section',
    key: 'textSection',
    label: 'Action Trigger'
  },
  {
    type: 'text',
    key: 'showLabel',
    label: 'Show Label',
    placeholder: 'Enter show label',
    initial: 'Read'
  },
  {
    type: 'text',
    key: 'closeLabel',
    label: 'Close Label',
    placeholder: 'Enter close label',
    initial: 'Close'
  },

  // Section for UI Dimensions
  {
    type: 'section',
    key: 'uiDimensionsSection',
    label: 'UI Dimensions'
  },
  {
    type: 'range',
    key: 'uiWidth',
    label: 'UI Width',
    min: 100,
    max: 500,
    step: 1,
    initial: 200
  },
  {
    type: 'range',
    key: 'uiHeight',
    label: 'UI Height',
    min: 100,
    max: 500,
    step: 1,
    initial: 150
  },
 
  // Section for UI Image
  {
    type: 'section',
    key: 'uiImageSection',
    label: 'UI Image'
  },
  {
    type: 'text',
    key: 'imageSrc',
    label: 'Image Source URL',
    placeholder: 'Enter image URL',
    initial: 'https://via.placeholder.com/100'
  },
  {
    type: 'range',
    key: 'imageWidth',
    label: 'Image Width',
    min: 50,
    max: 200,
    step: 1,
    initial: 100
  },
  {
    type: 'range',
    key: 'imageHeight',
    label: 'Image Height',
    min: 50,
    max: 200,
    step: 1,
    initial: 100
  },
  {
    type: 'dropdown',
    key: 'imageFit',
    label: 'Image Fit',
    options: [
      { label: 'Contain', value: 'contain' },
      { label: 'Cover', value: 'cover' },
      { label: 'Fill', value: 'fill' },
      { label: 'None', value: 'none' },
      { label: 'Scale-down', value: 'scale-down' }
    ],
    initial: 'contain'
  },
  {
    type: 'range',
    key: 'imageAlpha',
    label: 'Image Background Alpha',
    min: 0,
    max: 1,
    step: 0.01,
    initial: 1
  }
]);

// Create the toggle action node
const toggleAction = app.create('action');
toggleAction.label = props.showLabel;
toggleAction.position.set(0, 0.9, 0);
toggleAction.distance = 1;
app.add(toggleAction);

// Variables to manage UI state
let currentUI = null;
let isUIVisible = false;

// Function to update UI based on configuration
function toggleUI() {
  if (isUIVisible) {
    if (currentUI) {
      app.remove(currentUI);
      currentUI = null;
      console.log('UI element removed.');
    }
    toggleAction.label = props.showLabel;
    isUIVisible = false;
  } else {
    // Create new UI
    const ui = app.create('ui');
    app.add(ui);

    ui.width = props.uiWidth;
    ui.height = props.uiHeight;
    
    ui.pivot = 'bottom-center';
    ui.lit = true;
    ui.borderRadius = 10;
    ui.padding = 20;

    // Get the position of the toggle action
    const actionPosition = toggleAction.position;
    const offset = [0, 0.3, 0];
    const uiPosition = {
      x: actionPosition.x + offset[0],
      y: actionPosition.y + offset[1],
      z: actionPosition.z + offset[2]
    };
    ui.position.set(uiPosition.x, uiPosition.y, uiPosition.z);

    // Create a view within the UI
    const view = app.create('uiview');
    view.padding = 20;
    view.borderRadius = 8;
    ui.add(view);

    // Create and add the UIImage
    const image = app.create('uiimage');
    image.src = props.imageSrc;
    image.width = props.imageWidth;
    image.height = props.imageHeight;
    image.objectFit = props.imageFit;
    image.backgroundColor = `rgba(255, 255, 255, ${props.imageAlpha})`; // Default white background with alpha
    view.add(image);

    // Track UI
    currentUI = ui;

    // Update labels and state
    toggleAction.label = props.closeLabel;
    isUIVisible = true;
    console.log('UI created and displayed.');
  }
}

// Set trigger function
toggleAction.onTrigger = toggleUI;