/**
 * Bio-Links
 * Drag and Drop a screenspace ui toggle for your Bio/links into your Hyperfy V2 world.
 * 
 * @author Gert-Jan Akerboom
 * https://x.com/GertJanAkerboom
 * @license MIT
 * Copyright (c) 2025 Gert-Jan Akerboom
 */

// Create the main toggle button (top right corner of screen)
const UItoggle = app.create('ui', {
  width: 50,
  height: 50,
  res: 1,
  position: [1, 0, 0],
  offset: [-15, 15, 0],
  space: 'screen',
  pivot: 'top-right',
  backgroundColor: 'rgba(0,0,0,0.85)',
  borderRadius: 12,
  borderWidth: 0,
  pointerEvents: true,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  cursor: 'pointer',
});

// Create the toggle button icon (arrow)
const UItoggleIcon = app.create('uitext', {
  value: '▲',
  fontSize: 35,
  color: '#fff',
  textAlign: 'center',
  backgroundColor: 'transparent',
  cursor: 'pointer',
});

UItoggle.add(UItoggleIcon);
app.add(UItoggle);

// Configure UI inputs for the bio links system
app.configure(() => {
  const buttonCount = app.config.button_count || 8;
  const configFields = [
    {
      key: 'button_count',
      label: 'Number of Buttons',
      type: 'number',
      min: 1,
      max: 14,
      step: 1,
      initial: 8,
    },
    {
      key: 'header_text',
      label: 'Header Text',
      type: 'text',
      initial: 'Download Section',
      placeholder: 'Enter header text to explain downloads',
    },
    {
      type: 'switch',
      key: 'visible',
      label: 'Cube Visible',
      options: [
        {
          label: 'Show',
          value: 'true',
        },
        {
          label: 'Hide',
          value: 'false',
        }
      ],
      initial: 'true',
    },
    {
      type: 'section',
      key: 'links',
      label: 'Links',
    }
  ];
  
  // Dynamically add text input fields and download link fields based on button count
  for (let i = 0; i < buttonCount; i++) {
    configFields.push({
      key: `button_text_${i + 1}`,
      label: `Button ${i + 1} Text`,
      type: 'text',
      initial: `link ${i + 1}`,
      placeholder: `Enter text for button ${i + 1}`,
    });
    configFields.push({
      key: `download_link_${i + 1}`,
      label: `Link ${i + 1}`,
      type: 'text',
      initial: '',
      placeholder: `Paste URL`,
    });
  }
  
  return configFields;
});

// Create header button (larger than regular buttons for emphasis)
const headerButton = app.create('ui', {
  width: 300,
  height: 70, // 1.5x the normal height (50 * 1.5)
  res: 1,
  position: [1, 0, 0],
  offset: [-15, 84, 0],
  space: 'screen',
  pivot: 'top-right',
  backgroundColor: 'rgba(0,0,0,0.85)',
  borderRadius: 12,
  borderWidth: 0,
  pointerEvents: true,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  cursor: 'pointer',
  active: false, // Start hidden
});

// Create header text element
const headerText = app.create('uitext', {
  value: app.config.header_text || 'Download Section',
  fontSize: 20,
  color: '#fff',
  textAlign: 'center',
  backgroundColor: 'transparent',
  cursor: 'pointer',
});

headerButton.add(headerText);
app.add(headerButton);

// Create download buttons, stacked vertically below the header
const infoUIButtons = [];
const buttonCount = app.config.button_count || 8;

for (let i = 0; i < buttonCount; i++) {
  // Calculate vertical position for each button (stacked with gaps)
  const yOffset = 165 + i * 55; // Start below header (90 + 75 + 10 gap)
  
  // Create individual button container
  const infoUI = app.create('ui', {
    width: 300,
    height: 50,
    res: 1,
    position: [1, 0, 0],
    offset: [-15, yOffset, 0],
    space: 'screen',
    pivot: 'top-right',
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 12,
    borderWidth: 0,
    pointerEvents: true,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    cursor: 'pointer',
    active: false, // Start hidden
  });
  
  // Create button text element
  const linkText = app.create('uitext', {
    value: app.config[`button_text_${i + 1}`] || `link ${i + 1}`,
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  });
  
  infoUI.add(linkText);
  app.add(infoUI);
  
  // Add hover behavior for visual feedback
  infoUI.onPointerEnter = () => {
    infoUI.backgroundColor = 'rgba(64,64,64,0.85)';
  };
  infoUI.onPointerLeave = () => {
    infoUI.backgroundColor = 'rgba(0,0,0,0.85)';
  };
  
  // Add click handler to open the configured URL
  infoUI.onPointerDown = () => {
    const downloadLink = app.config[`download_link_${i + 1}`];
    if (downloadLink && downloadLink.trim() !== '') {
      world.open(downloadLink, true); // Open URL in new tab
    } else {
      console.log(`No download link configured for button ${i + 1}`);
    }
  };
  
  infoUIButtons.push(infoUI);
}

// Add hover behavior to the toggle button
UItoggle.onPointerEnter = () => {
  UItoggle.backgroundColor = 'rgba(64,64,64,0.85)';
};
UItoggle.onPointerLeave = () => {
  UItoggle.backgroundColor = 'rgba(0,0,0,0.85)';
};

// Add click handler to toggle the entire UI on/off
UItoggle.onPointerDown = () => {
  // Toggle the arrow icon direction
  UItoggleIcon.value = UItoggleIcon.value === '▲' ? '▼' : '▲';
  
  // Toggle visibility of header and all buttons
  const newActive = !headerButton.active;
  headerButton.active = newActive;
  infoUIButtons.forEach(btn => btn.active = newActive);
};

// Get the original cube model and set its visibility based on config
const cube = app.get('Cube');
if (cube) {
  cube.active = app.config.visible === 'true';
}