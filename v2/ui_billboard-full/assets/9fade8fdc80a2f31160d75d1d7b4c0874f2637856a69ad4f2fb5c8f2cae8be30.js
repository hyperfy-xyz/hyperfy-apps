app.configure([
  { type: 'section', key: 'ui', label: 'UI' },
  {
    type: 'range',
    key: 'uiWidth',
    label: 'UI Width',
    min: 100,
    max: 1600,
    step: 1,
    initial: 300
  },
  {
    type: 'range',
    key: 'uiHeight',
    label: 'UI Height',
    min: 100,
    max: 900,
    step: 1,
    initial: 200
  },
  {
    type: 'range',
    key: 'uiRed',
    label: 'UI Background Red',
    min: 0,
    max: 255,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'uiGreen',
    label: 'UI Background Green',
    min: 0,
    max: 255,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'uiBlue',
    label: 'UI Background Blue',
    min: 0,
    max: 255,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'uiAlpha',
    label: 'UI Background Alpha',
    min: 0,
    max: 1,
    step: 0.01,
    initial: 1
  },
  {
    type: 'Dropdown',
    key: 'uiPivot',
    label: 'UI Pivot',
    options: [
      { label: 'Top-Left', value: 'top-left' },
      { label: 'Top-Center', value: 'top-center' },
      { label: 'Top-Right', value: 'top-right' },
      { label: 'Center-Left', value: 'center-left' },
      { label: 'Center', value: 'center' },
      { label: 'Center-Right', value: 'center-right' },
      { label: 'Bottom-Left', value: 'bottom-left' },
      { label: 'Bottom-Center', value: 'bottom-center' },
      { label: 'Bottom-Right', value: 'bottom-right' }
    ],
    initial: 'bottom-center'
  },
  {
    type: 'text',
    key: 'uiPosition',
    label: 'UI Position (x, y, z)',
    initial: '0, 2, 0'
  },
  {
    type: 'range',
    key: 'uiBorderWidth',
    label: 'UI Border Width',
    min: 0,
    max: 10,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'uiBorderRed',
    label: 'UI Border Red',
    min: 0,
    max: 255,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'uiBorderGreen',
    label: 'UI Border Green',
    min: 0,
    max: 255,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'uiBorderBlue',
    label: 'UI Border Blue',
    min: 0,
    max: 255,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'uiBorderAlpha',
    label: 'UI Border Alpha',
    min: 0,
    max: 1,
    step: 0.01,
    initial: 1
  },
  {
    type: 'range',
    key: 'uiBorderRadius',
    label: 'UI Border Radius',
    min: 0,
    max: 50,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'uiMargin',
    label: 'UI Margin',
    min: 0,
    max: 100,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'uiPadding',
    label: 'UI Padding',
    min: 0,
    max: 100,
    step: 1,
    initial: 0
  },
  { type: 'section', key: 'uitext', label: 'UIText' },
  {
    type: 'dropdown',
    key: 'textDisplay',
    label: 'Display',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Flex', value: 'flex' }
    ],
    initial: 'flex'
  },
  {
    type: 'range',
    key: 'textColorRed',
    label: 'Text Color Red',
    min: 0,
    max: 255,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'textColorGreen',
    label: 'Text Color Green',
    min: 0,
    max: 255,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'textColorBlue',
    label: 'Text Color Blue',
    min: 0,
    max: 255,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'textColorAlpha',
    label: 'Text Color Alpha',
    min: 0,
    max: 1,
    step: 0.01,
    initial: 1
  },
  {
    type: 'range',
    key: 'textBackgroundRed',
    label: 'Text Background Red',
    min: 0,
    max: 255,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'textBackgroundGreen',
    label: 'Text Background Green',
    min: 0,
    max: 255,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'textBackgroundBlue',
    label: 'Text Background Blue',
    min: 0,
    max: 255,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'textBackgroundAlpha',
    label: 'Text Background Alpha',
    min: 0,
    max: 1,
    step: 0.01,
    initial: 1
  },
  {
    type: 'range',
    key: 'textBorderRadius',
    label: 'Border Radius',
    min: 0,
    max: 50,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'textMargin',
    label: 'Margin',
    min: 0,
    max: 100,
    step: 1,
    initial: 0
  },
  {
    type: 'text',
    key: 'textValue',
    label: 'Text Value',
    initial: 'Sample Text'
  },
  {
    type: 'range',
    key: 'textFontSize',
    label: 'Font Size',
    min: 8,
    max: 100,
    step: 1,
    initial: 16
  },
  {
    type: 'range',
    key: 'textLineHeight',
    label: 'Line Height',
    min: 0.5,
    max: 3,
    step: 0.1,
    initial: 1.2
  },
  {
    type: 'dropdown',
    key: 'textTextAlign',
    label: 'Text Align',
    options: [
      { label: 'Left', value: 'left' },
      { label: 'Center', value: 'center' },
      { label: 'Right', value: 'right' }
    ],
    initial: 'left'
  },
  { type: 'section', key: 'uiview', label: 'UIView' },
  {
    type: 'dropdown',
    key: 'viewDisplay',
    label: 'Display',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Flex', value: 'flex' }
    ],
    initial: 'flex'
  },
  {
    type: 'range',
    key: 'viewWidth',
    label: 'Width',
    min: 100,
    max: 1600,
    step: 1,
    initial: 100
  },
  {
    type: 'range',
    key: 'viewHeight',
    label: 'Height',
    min: 100,
    max: 900,
    step: 1,
    initial: 100
  },
  {
    type: 'range',
    key: 'viewRed',
    label: 'Background Red',
    min: 0,
    max: 255,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'viewGreen',
    label: 'Background Green',
    min: 0,
    max: 255,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'viewBlue',
    label: 'Background Blue',
    min: 0,
    max: 255,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'viewAlpha',
    label: 'Background Alpha',
    min: 0,
    max: 1,
    step: 0.01,
    initial: 1
  },
  {
    type: 'range',
    key: 'viewBorderWidth',
    label: 'Border Width',
    min: 0,
    max: 10,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'viewBorderRed',
    label: 'Border Red',
    min: 0,
    max: 255,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'viewBorderGreen',
    label: 'Border Green',
    min: 0,
    max: 255,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'viewBorderBlue',
    label: 'Border Blue',
    min: 0,
    max: 255,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'viewBorderAlpha',
    label: 'Border Alpha',
    min: 0,
    max: 1,
    step: 0.01,
    initial: 1
  },
  {
    type: 'range',
    key: 'viewBorderRadius',
    label: 'Border Radius',
    min: 0,
    max: 50,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'viewMargin',
    label: 'Margin',
    min: 0,
    max: 100,
    step: 1,
    initial: 0
  },
  {
    type: 'range',
    key: 'viewPadding',
    label: 'Padding',
    min: 0,
    max: 100,
    step: 1,
    initial: 0
  },
  {
    type: 'dropdown',
    key: 'viewFlexDirection',
    label: 'Flex Direction',
    options: [
      { label: 'Column', value: 'column' },
      { label: 'Column Reverse', value: 'column-reverse' },
      { label: 'Row', value: 'row' },
      { label: 'Row Reverse', value: 'row-reverse' }
    ],
    initial: 'column'
  },
  {
    type: 'dropdown',
    key: 'viewJustifyContent',
    label: 'Justify Content',
    options: [
      { label: 'Flex Start', value: 'flex-start' },
      { label: 'Flex End', value: 'flex-end' },
      { label: 'Center', value: 'center' }
    ],
    initial: 'flex-start'
  },
  {
    type: 'dropdown',
    key: 'viewAlignItems',
    label: 'Align Items',
    options: [
      { label: 'Stretch', value: 'stretch' },
      { label: 'Flex Start', value: 'flex-start' },
      { label: 'Flex End', value: 'flex-end' },
      { label: 'Center', value: 'center' },
      { label: 'Baseline', value: 'baseline' }
    ],
    initial: 'stretch'
  },
  {
    type: 'dropdown',
    key: 'viewAlignContent',
    label: 'Align Content',
    options: [
      { label: 'Flex-start', value: 'flex-start' },
      { label: 'flex-end', value: 'flex-end' },
      { label: 'stretch', value: 'stretch' },
      { label: 'center', value: 'center' },
      { label: 'space-between', value: 'space-between' },
      { label: 'space-around', value: 'space-around' },
      { label: 'space-evenly', value: 'space-evenly' }
    ],
    initial: 'flex-start'
  }
]);

// Initialize the main UI component
const ui = app.create('ui');
ui.width = props.uiWidth;
ui.height = props.uiHeight;
ui.backgroundColor = `rgba(${props.uiRed}, ${props.uiGreen}, ${props.uiBlue}, ${props.uiAlpha})`;
ui.pivot = props.uiPivot;
ui.lit = true;
ui.billboard = 'full';
const [x, y, z] = props.uiPosition.split(', ').map(Number);
ui.position.set(x, y, z);
ui.borderRadius = props.uiBorderRadius;
ui.padding = props.uiPadding;
ui.borderWidth = props.uiBorderWidth;
ui.borderColor = `rgba(${props.uiBorderRed}, ${props.uiBorderGreen}, ${props.uiBorderBlue}, ${props.uiBorderAlpha})`;

app.add(ui);

// Create the Nested View
const view = app.create('uiview');
view.display = props.viewDisplay;
view.width = props.viewWidth;
view.height = props.viewHeight;
view.backgroundColor = `rgba(${props.viewRed}, ${props.viewGreen}, ${props.viewBlue}, ${props.viewAlpha})`;
view.borderWidth = props.viewBorderWidth;
view.borderColor = `rgba(${props.viewBorderRed}, ${props.viewBorderGreen}, ${props.viewBorderBlue}, ${props.viewBorderAlpha})`;
view.borderRadius = props.viewBorderRadius;
view.margin = props.viewMargin;
view.padding = props.viewPadding;
view.flexDirection = props.viewFlexDirection;
view.justifyContent = props.viewJustifyContent;
view.alignItems = props.viewAlignItems;
view.alignContent = props.viewAlignContent;

ui.add(view);

// Create the text component
const text = app.create('uitext');
text.display = props.textDisplay;
text.color = `rgba(${props.textColorRed}, ${props.textColorGreen}, ${props.textColorBlue}, ${props.textColorAlpha})`;
text.backgroundColor = `rgba(${props.textBackgroundRed}, ${props.textBackgroundGreen}, ${props.textBackgroundBlue}, ${props.textBackgroundAlpha})`;
text.borderRadius = props.textBorderRadius;
text.margin = props.textMargin;
text.value = props.textValue;
text.fontSize = props.textFontSize;
text.lineHeight = props.textLineHeight;
text.textAlign = props.textTextAlign;

view.add(text);
app.add(ui);