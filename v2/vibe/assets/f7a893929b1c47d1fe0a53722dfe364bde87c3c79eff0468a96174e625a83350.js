// Orbital Cube Shooter by Claude
// Spawn orbiting cubes around the player and shoot them in the camera direction.
// Press O to toggle cube orbiting, left-click to shoot.

// This is free and unencumbered software released into the public domain.
//
// Anyone is free to copy, modify, publish, use, compile, sell, or
// distribute this software, either in source code form or as a compiled
// binary, for any purpose, commercial or non-commercial, and by any
// means.
//
// In jurisdictions that recognize copyright laws, the author or authors
// of this software dedicate any and all copyright interest in the
// software to the public domain. We make this dedication for the benefit
// of the public at large and to the detriment of our heirs and
// successors. We intend this dedication to be an overt act of
// relinquishment in perpetuity of all present and future rights to this
// software under copyright law.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
// OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.
//
// For more information, please refer to <https://unlicense.org/>

// Core configuration
const CONFIG = {
    // Cube settings
    NUM_CUBES: 20,
    CUBE_SCALE: 0.25,
    CUBE_COLOR: '#3498db',
    CUBE_GLOW: 1.5,
    
    // Orbit settings
    ORBIT_RADIUS: 3,
    ORBIT_HEIGHT: 1.5,
    ORBIT_SPEED: 0.5,
    ORBIT_VARIATION: 0.3,  // Random speed variation
    RISE_SPEED: 2,         // How fast cubes rise from ground
    
    // Shooting settings
    SHOOT_SPEED: 40,
    SHOOT_LIFETIME: 6,
    SHOOT_SPREAD: 0.2,     // Random spread when shooting
    
    // Physics settings
    GRAVITY: -9.8,
    AIR_RESISTANCE: 0.1
};

// Get the cube template
const cubeTemplate = app.get('Cube');
console.log("Cube template:", cubeTemplate);
if (!cubeTemplate) {
    console.error('Could not find Cube node');
    return;
}

// Hide the template
//cubeTemplate.visible = false;

if (world.isClient) {
    // Client-side state
    const orbitingCubes = [];
    let orbitingActive = false;
    let lastToggleTime = 0;
    const TOGGLE_COOLDOWN = 0.5; // Cooldown for toggling orbit state
    
    // Set up controls
    const control = app.control();
    control.keyO.capture = true;

    const forward = new Vector3(0, 0, -1).applyQuaternion(control.camera.quaternion);
    
    // Toggle orbiting cubes with O key
    control.keyO.onPress = () => {
        const currentTime = Date.now() / 1000;
        if (currentTime - lastToggleTime < TOGGLE_COOLDOWN) return;
        lastToggleTime = currentTime;
        
        if (!orbitingActive) {
            // Start orbiting
            orbitingActive = true;
            const player = world.getPlayer();
            app.send('cubes:spawn_request', player.position.toArray());
        } else {
            // Stop orbiting and clean up
            orbitingActive = false;
            cleanupOrbitingCubes();
            app.send('cubes:cleanup');
        }
    };
    
    // Shoot cubes with left mouse click
    control.mouseLeft.onPress = () => {
        console.log("Mouse clicked, orbitingActive:", orbitingActive, "cubes:", orbitingCubes.length);
        if (orbitingActive && orbitingCubes.length > 0) {
            // Get camera forward direction
            const forward = new Vector3(0, 0, -1).applyQuaternion(control.camera.quaternion);
            console.log("Shooting in direction:", forward);
            
            // Get player position
            const player = world.getPlayer();
            
            // Send shoot command to server with player position
            app.send('cubes:shoot', [forward.toArray(), player.position.toArray()]);
            
            // Clean up local cubes
            cleanupOrbitingCubes();
            orbitingActive = false;
        }
    };
    
    // Clean up orbiting cubes
    function cleanupOrbitingCubes() {
        orbitingCubes.forEach(cube => {
            world.remove(cube.object);
        });
        orbitingCubes.length = 0;
    }
    
    // Handle cube spawning
    app.on('cubes:spawn', (data) => {
        console.log("Received cubes:spawn event", data);
        const [cubeDataArray] = data;
        
        // Clean up any existing cubes first
        cleanupOrbitingCubes();
        
        // Create new cubes
        cubeDataArray.forEach(cubeData => {
            const { id, position, scale, color } = cubeData;
            console.log("Creating cube", id, "at position", position);
            
            const cube = cubeTemplate.clone(true);
            cube.visible = true;
            cube.scale.set(scale, scale, scale);
            
            // Set initial position (underground)
            cube.position.set(
                position[0],
                position[1] - CONFIG.ORBIT_HEIGHT - 1, // Start below ground
                position[2]
            );
            
            // Set color and glow
            cube.color = color;
            cube.emissiveColor = color;
            cube.emissiveIntensity = CONFIG.CUBE_GLOW;
            
            // Add to scene and tracking array
            world.add(cube);
            
            // Create orbit data
            const orbitSpeed = CONFIG.ORBIT_SPEED * (1 + (num(0, CONFIG.ORBIT_VARIATION, 3) - CONFIG.ORBIT_VARIATION/2));
            const orbitPhase = num(0, Math.PI * 2, 3);
            const orbitHeight = CONFIG.ORBIT_HEIGHT * (0.8 + num(0, 0.4, 2));
            
            orbitingCubes.push({
                id,
                object: cube,
                orbitSpeed,
                orbitPhase,
                orbitHeight,
                rising: true,
                riseProgress: 0
            });
        });
        
        console.log("Created", orbitingCubes.length, "orbiting cubes");
    });
    
    // Handle shooting cubes
    app.on('cubes:shoot_started', (data) => {
        console.log("Received shoot_started event", data);
        const [cubeDataArray] = data;
        
        cubeDataArray.forEach(cubeData => {
            const { id, position, velocity, scale, color } = cubeData;
            console.log("Creating projectile cube", id, "at position", position, "with velocity", velocity);
            
            const cube = cubeTemplate.clone(true);
            cube.visible = true;
            cube.scale.set(scale, scale, scale);
            cube.position.set(position[0], position[1], position[2]);
            
            // Set color and glow
            cube.color = color;
            cube.emissiveColor = color;
            cube.emissiveIntensity = CONFIG.CUBE_GLOW;
            
            // Add to scene
            world.add(cube);
            
            // Create projectile data
            const projectile = {
                id,
                object: cube,
                velocity: new Vector3(velocity[0], velocity[1], velocity[2]),
                lifetime: 0
            };
            
            // Update projectile
            const updateProjectile = (delta) => {
                // Update position
                projectile.object.position.x += projectile.velocity.x * delta;
                projectile.object.position.y += projectile.velocity.y * delta;
                projectile.object.position.z += projectile.velocity.z * delta;
                
                // Apply gravity
                projectile.velocity.y += CONFIG.GRAVITY * delta;
                
                // Apply air resistance
                const speed = projectile.velocity.length();
                if (speed > 0) {
                    const drag = CONFIG.AIR_RESISTANCE * speed * speed;
                    projectile.velocity.x -= (drag * projectile.velocity.x / speed) * delta;
                    projectile.velocity.y -= (drag * projectile.velocity.y / speed) * delta;
                    projectile.velocity.z -= (drag * projectile.velocity.z / speed) * delta;
                }
                
                // Update lifetime
                projectile.lifetime += delta;
                if (projectile.lifetime >= CONFIG.SHOOT_LIFETIME) {
                    world.remove(projectile.object);
                    app.off('update', updateProjectile);
                }
            };
            
            app.on('update', updateProjectile);
        });
    });
    
    // Update orbiting cubes
    app.on('update', (delta) => {
        if (!orbitingActive) return;
        
        const player = world.getPlayer();
        if (!player) return;
        
        orbitingCubes.forEach(cube => {
            if (cube.rising) {
                // Handle rising animation
                cube.riseProgress += delta * CONFIG.RISE_SPEED;
                if (cube.riseProgress >= 1) {
                    cube.rising = false;
                    cube.riseProgress = 1;
                }
                
                // Calculate position during rise
                const progress = cube.riseProgress;
                const targetY = player.position.y + cube.orbitHeight;
                cube.object.position.y = player.position.y - CONFIG.ORBIT_HEIGHT - 1 + 
                                        (targetY - (player.position.y - CONFIG.ORBIT_HEIGHT - 1)) * progress;
            } else {
                // Regular orbiting
                const time = Date.now() / 1000;
                const angle = time * cube.orbitSpeed + cube.orbitPhase;
                
                // Calculate orbit position
                cube.object.position.x = player.position.x + Math.cos(angle) * CONFIG.ORBIT_RADIUS;
                cube.object.position.z = player.position.z + Math.sin(angle) * CONFIG.ORBIT_RADIUS;
                cube.object.position.y = player.position.y + cube.orbitHeight + Math.sin(angle * 0.5) * 0.2;
                
                // Make cubes rotate
                cube.object.rotation.x += delta * 0.5;
                cube.object.rotation.y += delta * 0.7;
                cube.object.rotation.z += delta * 0.3;
            }
        });
    });
}

if (world.isServer) {
    // Server-side state
    const orbitingCubes = [];
    let nextCubeId = 0;
    
    // Handle spawn request - now accepting player position from client
    app.on('cubes:spawn_request', (playerPosArray, sender) => {        
        // Use the position sent from client instead of trying to get player
        const playerPosition = {
            x: playerPosArray[0],
            y: playerPosArray[1],
            z: playerPosArray[2]
        };
                
        // Clean up any existing cubes
        cleanupOrbitingCubes();
        
        // Create new cubes
        const cubeDataArray = [];
        
        for (let i = 0; i < CONFIG.NUM_CUBES; i++) {
            const id = nextCubeId++;
            const angle = (i / CONFIG.NUM_CUBES) * Math.PI * 2;
            
            // Calculate initial position in orbit
            const position = [
                playerPosition.x + Math.cos(angle) * CONFIG.ORBIT_RADIUS,
                playerPosition.y + CONFIG.ORBIT_HEIGHT,
                playerPosition.z + Math.sin(angle) * CONFIG.ORBIT_RADIUS
            ];
            
            // Create cube data
            const cubeData = {
                id,
                position,
                scale: CONFIG.CUBE_SCALE,
                color: CONFIG.CUBE_COLOR
            };
            
            cubeDataArray.push(cubeData);
            orbitingCubes.push(cubeData);
        }
                
        // Send spawn event to all clients
        app.send('cubes:spawn', [cubeDataArray]);
    });
    
    // Handle shoot request
    app.on('cubes:shoot', (data, sender) => {
        console.log("Server received shoot request with direction:", data);
        const [forwardArray, playerPosArray] = data;
        
        if (orbitingCubes.length === 0) {
            console.log("No cubes to shoot");
            return;
        }
        
        const forward = new Vector3(forwardArray[0], forwardArray[1], forwardArray[2]);
        
        // Use the player position sent from client
        const playerPosition = {
            x: playerPosArray[0],
            y: playerPosArray[1],
            z: playerPosArray[2]
        };
        
        // Create projectile data for each cube
        const projectileDataArray = orbitingCubes.map((cube, index) => {
            // Calculate current position based on player position and orbit angle
            const angle = (index / orbitingCubes.length) * Math.PI * 2 + Date.now() / 1000 * CONFIG.ORBIT_SPEED;
            
            // Use updated positions based on player's current location
            const currentPosition = [
                playerPosition.x + Math.cos(angle) * CONFIG.ORBIT_RADIUS,
                playerPosition.y + CONFIG.ORBIT_HEIGHT,
                playerPosition.z + Math.sin(angle) * CONFIG.ORBIT_RADIUS
            ];
            
            // Add some random spread to the direction
            const spreadX = num(-CONFIG.SHOOT_SPREAD, CONFIG.SHOOT_SPREAD, 3);
            const spreadY = num(-CONFIG.SHOOT_SPREAD, CONFIG.SHOOT_SPREAD, 3);
            const spreadZ = num(-CONFIG.SHOOT_SPREAD, CONFIG.SHOOT_SPREAD, 3);
            
            const direction = new Vector3(
                forward.x + spreadX,
                forward.y + spreadY,
                forward.z + spreadZ
            ).normalize();
            
            // Calculate velocity
            const velocity = [
                direction.x * CONFIG.SHOOT_SPEED,
                direction.y * CONFIG.SHOOT_SPEED,
                direction.z * CONFIG.SHOOT_SPEED
            ];
            
            return {
                id: cube.id,
                position: currentPosition,
                velocity,
                scale: cube.scale,
                color: cube.color
            };
        });
        
        console.log("Server sending shoot event with", projectileDataArray.length, "projectiles");
        
        // Send shoot event to all clients
        app.send('cubes:shoot_started', [projectileDataArray]);
        
        // Clean up orbiting cubes
        cleanupOrbitingCubes();
    });
    
    // Handle cleanup request
    app.on('cubes:cleanup', () => {
        cleanupOrbitingCubes();
    });
    
    // Clean up orbiting cubes
    function cleanupOrbitingCubes() {
        orbitingCubes.length = 0;
    }
} 