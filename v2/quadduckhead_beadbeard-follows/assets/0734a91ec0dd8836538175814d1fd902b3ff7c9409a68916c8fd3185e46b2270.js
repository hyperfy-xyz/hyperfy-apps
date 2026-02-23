/* eslint-disable no-inner-declarations */
/* eslint-disable no-undef */

// -------------------------------------------------------------------
// CONFIGURATION
// -------------------------------------------------------------------
app.configure([
  {
    key: 'target',
    label: 'Player Follow Target',
    type: 'text'
  },
  {
    key: 'avoidance_distance',
    label: 'Avoidance Distance',
    type: 'text',
    initial: '4'
  },
  {
    key: 'follow_speed',
    label: 'Follow Speed',
    type: 'text',
    initial: '2.2'
  },
  {
    key: 'rotation_speed',
    label: 'Rotation Speed',
    type: 'text',
    initial: '2.2'
  }
]);

console.log(app)
console.log(world)


// -------------------------------------------------------------------
// CONSTANTS & GLOBALS
// -------------------------------------------------------------------
const SEND_RATE = 1 / 8;
const FOLLOW_SPEED = Number.parseFloat(props.follow_speed);
const AVOIDANCE_DISTANCE = Number.parseFloat(props.avoidance_distance);
const ROTATION_SPEED = Number.parseFloat(props.rotation_speed);  // Used to slerp toward the target
const _direction = new Vector3();
const _forward = new Vector3();
const _velocity = new Vector3();

let ownerId = null;

// -------------------------------------------------------------------
// HELPER: moveTowardsPos
// -------------------------------------------------------------------
function moveTowardsPos(currentPos, currentQuat, targetPos) {
  // Calculate horizontal direction: targetPos - currentPos
  _direction.copy(targetPos).sub(currentPos);
  _direction.y = 0; // ignore vertical

  const distance = _direction.length();

  // If within avoidance distance, no movement
  if (distance < AVOIDANCE_DISTANCE) {
    return _velocity.set(0, 0, 0);
  }

  // Find forward direction from currentQuat
  _forward.set(0, 0, 1).applyQuaternion(currentQuat).normalize();

  // Always move forward at FOLLOW_SPEED:
  _velocity.copy(_forward).multiplyScalar(FOLLOW_SPEED);

  return _velocity;
}

// -------------------------------------------------------------------
// CLIENT-SIDE LOGIC
// -------------------------------------------------------------------
if (world.isClient) {
  const local_player = world.getPlayer();
  let player = null;
  let player_id = null;

  // Wait for server state
  if (app.state.ready) {
    init(app.state);
  } else {
    app.on('state', init);
  }

  function init(state) {
    // Apply initial data from server
    app.position.fromArray(state.p);
    app.quaternion.fromArray(state.q);

    player_id = state.player_id;
    player = state.player;

    // If the server didn't store the actual player object, do a lookup:
    if (!player && player_id === local_player.id) {
      player = world.getPlayer();
    }

    // If *this* client is the target, request ownership
    if (player && player.id === local_player.id) {
      app.send('take', player.networkId);
    }

    // Setup interpolation for non-owners
    const npos = new LerpVector3(app.position, SEND_RATE);
    const nqua = new LerpQuaternion(app.quaternion, SEND_RATE);

    app.on('move', (e) => {
      if (ownerId === world.networkId) return;
      npos.pushArray(e.p);
      nqua.pushArray(e.q);
    });

    app.on('take', (newOwnerId) => {
      if (ownerId === newOwnerId) return;
      ownerId = newOwnerId;
      npos.snap();
      nqua.snap();
    });

    // For broadcasting movement updates
    let lastSent = 0;

    // Main update loop
    app.on('update', (delta) => {
      if (app.sleeping) return;


      // If I own the object, do chasing & rotation logic
      if (ownerId === world.networkId) {
        if (player) {
          const vel = moveTowardsPos(app.position, app.quaternion, player.position);

          app.position.addScaledVector(vel, delta);

          _direction.copy(player.position).sub(app.position);
          _direction.y = 0;

          if (_direction.lengthSq() > 0.0001) {
            _direction.normalize();
            const lookAtQuat = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), _direction);
            app.quaternion.slerp(lookAtQuat, ROTATION_SPEED * delta);
          }

          lastSent += delta;
          if (lastSent > SEND_RATE) {
            lastSent = 0;
            app.send('move', {
              p: app.position.toArray(),
              q: app.quaternion.toArray(),
              v: [vel.x, vel.y, vel.z]
            });
          }
        }
      } else {
        // If not the owner, just interpolate
        npos.update(delta);
        nqua.update(delta);
      }
    });
  }
}

// -------------------------------------------------------------------
// SERVER-SIDE LOGIC
// -------------------------------------------------------------------
if (world.isServer) {
  // Initialize our shared state
  app.state.ready = true;
  app.state.p = app.position.toArray();
  app.state.q = app.quaternion.toArray();
  app.state.v = [0, 0, 0];
  app.state.player = null;
  app.state.player_id = props.target; // Player ID from config

  app.send('state', app.state);

  // Ownership requests
  app.on('take', (newOwnerId) => {
    ownerId = newOwnerId;
    app.send('take', newOwnerId);
  });

  // Movement broadcasts from the owner
  app.on('move', (e) => {
    app.state.p = e.p;
    app.state.q = e.q;
    app.state.v = e.v;

    app.position.fromArray(e.p);
    app.quaternion.fromArray(e.q);

    app.send('move', e);
  });

  world.on('leave', (e) => {
    if (e.player.networkId === ownerId) {
      ownerId = null;
      app.send('take', null);
    }
  });

  // If nobody owns it, occasionally broadcast
  let lastSent = 0;
  app.on('update', (delta) => {
    if (!ownerId) {
      lastSent += delta;
      if (lastSent > SEND_RATE) {
        lastSent = 0;
        app.state.p = app.position.toArray();
        app.state.q = app.quaternion.toArray();
        app.state.v = [0, 0, 0];

        app.send('move', {
          p: app.state.p,
          q: app.state.q,
          v: app.state.v
        });
      }
    }
  });
}

