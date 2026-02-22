app.configure([
  {
    type: 'section',
    key: 'uiDimensionsSection',
    label: 'UI Dimensions'
  },
  {
    type: 'range',
    key: 'uiAlpha',
    label: 'UI Background Alpha',
    min: 0,
    max: 1,
    step: 0.01,
    initial: 0.5
  }
]);

let currentUI = null;
let isUIVisible = false;

const presetUIWidth = 300;
const presetUIHeight = 200;

function createUI() {
  if (currentUI) return;

  console.log('Creating UI...');

  const ui = app.create('ui');
  if (!ui) {
    console.error('Failed to create UI.');
    return;
  }

  app.add(ui);

  ui.width = presetUIWidth;
  ui.height = presetUIHeight;

  const alpha = props.uiAlpha !== undefined ? props.uiAlpha : 0.5;
  ui.backgroundColor = `rgba(0, 0, 0, ${alpha})`;

  ui.pivot = 'bottom-center';
  ui.lit = true;
  ui.borderRadius = 10;
  ui.padding = 20;
  ui.billboard = 'full';

  const uiPosition = {
    x: 0,
    y: 1.2,
    z: 0
  };
  ui.position.set(uiPosition.x, uiPosition.y, uiPosition.z);

  const view = app.create('uiview');
  if (!view) {
    console.error('Failed to create UI view.');
    return;
  }

  view.padding = 20;
  view.borderRadius = 8;
  ui.add(view);

  currentUI = ui;

  isUIVisible = true;
  console.log('UI created and displayed.');
}

function removeUI() {
  if (currentUI) {
    app.remove(currentUI);
    currentUI = null;
    console.log('UI element removed.');
  }
  isUIVisible = false;
}

const rigidBody = app.create('rigidbody');
rigidBody.type = 'static';
rigidBody.position.set(0, 0.5, 0);

const collider = app.create('collider');
collider.setSize(3, 3, 3);
collider.trigger = true;
rigidBody.add(collider);

app.add(rigidBody);

rigidBody.onTriggerEnter = (other) => {
  console.log('Trigger Enter:', other);
  createUI();
};

rigidBody.onTriggerLeave = (other) => {
  console.log('Trigger Leave:', other);
  removeUI();
};