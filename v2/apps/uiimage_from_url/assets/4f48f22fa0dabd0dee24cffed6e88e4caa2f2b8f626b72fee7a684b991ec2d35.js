app.configure([
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
    label: 'UIHeight',
    min: 100,
    max: 500,
    step: 1,
    initial: 150
  },
  {
    type: 'section',
    key: 'uiPositionSection',
    label: 'UI Position'
  },
  {
    type: 'text',
    key: 'uiX',
    label: 'X Position',
    placeholder: 'Enter X position',
    initial: '0'
  },
  {
    type: 'text',
    key: 'uiY',
    label: 'Y Position',
    placeholder: 'Enter Y position',
    initial: '0'
  },
  {
    type: 'text',
    key: 'uiZ',
    label: 'Z Position',
    placeholder: 'Enter Z position',
    initial: '0'
  },
  {
    type: 'section',
    key: 'uiImageSection',
    label: 'UIImage'
  },
  {
    type: 'text',
    key: 'imageSrc',
    label: 'ImageSourceURL',
    placeholder: 'Enter image URL',
    initial: 'https://via.placeholder.com/100'
  },
  {
    type: 'range',
    key: 'imageWidth',
    label: 'ImageWidth',
    min: 50,
    max: 200,
    step: 1,
    initial: 100
  },
  {
    type: 'range',
    key: 'imageHeight',
    label: 'ImageHeight',
    min: 50,
    max: 200,
    step: 1,
    initial: 100
  },
  {
    type: 'dropdown',
    key: 'imageFit',
    label: 'ImageFit',
    options: [
      { label: 'Contain', value: 'contain' },
      { label: 'Cover', value: 'cover' },
      { label: 'Fill', value: 'fill' },
      { label: 'None', value: 'none' },
      { label: 'ScaleDown', value: 'scale-down' }
    ],
    initial: 'contain'
  },
]);

const ui = app.create('ui');
app.add(ui);

ui.width = props.uiWidth;
ui.height = props.uiHeight;
ui.pivot = 'bottom-center';
ui.lit = true;
ui.borderRadius = 10;
ui.padding = 20;

// Set the position
ui.position.set(props.uiX, props.uiY, props.uiZ);

const view = app.create('uiview');
view.padding = 20;
view.borderRadius = 8;
ui.add(view);

const image = app.create('uiimage');
image.src = props.imageSrc;
image.width = props.imageWidth;
image.height = props.imageHeight;
image.objectFit = props.imageFit;
view.add(image);