app.configure([
  {
    type: 'text',
    key: 'text',
    label: 'Teleporter Text',
    placeholder: 'click to teleport',
    initial: 'click to teleport'
  },
  { type: 'text', key: 'name', label: 'Name', placeholder: 'game', initial: 'game' },
  { type: 'text', key: 'go_to', label: 'Go to', placeholder: 'lobby', initial: 'lobby' }
]);

if (world.isClient) {
  const playerId = world.getPlayer().id;
  app.traverse(node => { if (node.id === "Cube") node.active = false; });

  const ui = app.create('ui', {
    space: 'world',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    height: 50,
    billboard: 'y'
  });

  const uiView = app.create('uiview', {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    height: 50
  });

  const text = app.create('uitext', {
    value: props.text,
    textAlign: 'center',
    display: 'flex',
    color: 'white'
  });

  ui.position.set(0, 1, 0);
  uiView.add(text);
  ui.add(uiView);
  app.add(ui);

  ui.onPointerDown = () => app.send('teleport', playerId);
}

if (world.isServer) {
  app.on('teleport', playerId => app.emit(props.go_to, playerId));

  world.on(props.name, playerId => {
    const player = world.getPlayer(playerId);
    player.teleport(app.position);
  });
}