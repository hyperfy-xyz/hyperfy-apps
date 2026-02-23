// Rotation configuration for each mesh
const rotationConfigs = {
    'earth2': {
        x: { speed: 0, direction: 1 },    
        y: { speed: 0.1, direction: 1 },    
        z: { speed: 0, direction: 1 }     
    },
    'Equator': {
        x: { speed: 0.2, direction: 1 },
        y: { speed: 0.2, direction: 1 },  
        z: { speed: 0.1, direction: 1 }
    },
    'LEYLINE002': {
        x: { speed: -0.1, direction: 1 },
        y: { speed: 0.4, direction: 1 },
        z: { speed: 0.2, direction: 1 }
    },
    'LEYLINE003': {
        x: { speed: 0, direction: 1 },
        y: { speed: 0.1, direction: 1 },
        z: { speed: -0.05, direction: 1 }
    },
    'LEYLINE001': {
        x: { speed: 0.1, direction: 1 },
        y: { speed: 0.3, direction: 1 },
        z: { speed: -0.1, direction: 1 }
    },
    'LEYLINE': {
        x: { speed: 0.05, direction: 1 },
        y: { speed: 0.25, direction: -1 },
        z: { speed: 0.15, direction: 1 }
    },
};

// Object to store mesh references
const meshes = {};

// Loop through each config key and retrieve the mesh from the app
for (const meshName in rotationConfigs) {
    const mesh = app.get(meshName);
    if (!mesh) {
        console.error(`Could not find mesh: ${meshName}`);
    } else {
        console.log(`Found mesh: ${meshName}`);
        meshes[meshName] = mesh;
    }
}

// Update rotation for each mesh every frame
app.on('update', delta => {
    for (const meshName in rotationConfigs) {
        const mesh = meshes[meshName];
        if (!mesh) continue;  // Skip if mesh wasn't found

        const config = rotationConfigs[meshName];

        // Update rotation on each axis based on speed, direction, and delta time
        mesh.rotation.x += config.x.speed * config.x.direction * delta;
        mesh.rotation.y += config.y.speed * config.y.direction * delta;
        mesh.rotation.z += config.z.speed * config.z.direction * delta;

        // Optionally normalize rotation values to stay within 0-360 degrees
        if (mesh.rotation.x >= 360 || mesh.rotation.x <= -360) {
            mesh.rotation.x = mesh.rotation.x % 360;
        }
        if (mesh.rotation.y >= 360 || mesh.rotation.y <= -360) {
            mesh.rotation.y = mesh.rotation.y % 360;
        }
        if (mesh.rotation.z >= 360 || mesh.rotation.z <= -360) {
            mesh.rotation.z = mesh.rotation.z % 360;
        }
    }
});
