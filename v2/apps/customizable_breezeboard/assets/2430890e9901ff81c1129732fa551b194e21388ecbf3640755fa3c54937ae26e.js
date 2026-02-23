// Configure the app's customization fields
app.configure([


  // Section for UI Image
  {
    type: 'section',
    key: 'uiImageSection',
    label: 'UI Image'
  },
  {
    type: 'file',
    key: 'imageFile',
    label: 'Image File',
    kind: 'texture'
  },
]);

// Create and display the UI based on configuration
const breezey = app.get('$root');
breezey.scale.set(1.2, 1.2, 1.2);
const ui = app.create('ui');
app.add(ui);

ui.width = 1970;
ui.height = 965;
ui.backgroundColor = `rgba(255, 255, 255, 0`;

ui.pivot = 'bottom-center';
ui.lit = true;
ui.borderRadius = 10;
ui.padding = 20;

// Set the position of the UI
const uiPosition = { x: -.86, y: 1.32, z: -.15 };
ui.position.set(uiPosition.x, uiPosition.y, uiPosition.z);

// Create a view within the UI
const view = app.create('uiview');
view.padding = 20;
view.borderRadius = 8;
ui.add(view);

// Create and add the UIImage
const image = app.create('uiimage');
image.src = props.imageFile?.url.replace('asset://', '/assets/') || 'https://via.placeholder.com/100';
image.width = 2000;
image.height = 835;
image.objectFit = 'fill';
image.backgroundColor = `rgba(255, 255, 255, 100)`; // Default white background with alpha
view.add(image);

// Add event listener for image file input change
app.on('propsChange', (changes) => {
  if (changes.imageFile && image) {
    image.src = changes.imageFile.url || 'https://via.placeholder.com/100';
    console.log('Image updated to:', changes.imageFile.url);
  }
});
