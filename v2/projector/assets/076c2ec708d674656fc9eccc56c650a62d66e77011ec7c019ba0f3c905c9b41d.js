// Get the Display mesh
const display = app.get('Display');
if (!display) {
    console.error('Could not find Display mesh');
    return;
}

// Get the Volume mesh
const volume = app.get('Volume');
if (!volume) {
    console.error('Could not find Volume mesh');
    return;
}

// Configuration for frame jumping
// Assuming each frame is 640 pixels wide and the texture is 2560 pixels wide (4 frames)
const uvConfigs = {
    Display: {
        fps: 6,            // Frames per second
        frameWidth: 640,    // Pixel width of one frame
        textureWidth: 9600, // Total texture width in pixels
        currentFrame: 0,
        frameTime: 0,       // Accumulated time
        offset: { x: 0, y: 0 }
    },
    Volume: {
        fps: 6,            // Frames per second
        frameWidth: 640,    // Pixel width of one frame
        textureWidth: 9600, // Total texture width in pixels
        currentFrame: 0,
        frameTime: 0,       // Accumulated time
        offset: { x: 0, y: 0 }
    }
};

// Update UV jump every frame based on FPS
app.on('update', delta => {
    // Process each mesh ("Display" and "Volume")
    for (const key in uvConfigs) {
        const config = uvConfigs[key];
        // Accumulate time
        config.frameTime += delta;
        
        // If enough time has passed, jump to the next frame
        if (config.frameTime >= (1 / config.fps)) {
            config.frameTime -= (1 / config.fps);
            config.currentFrame++;
            // Calculate total number of frames available on the texture
            const totalFrames = Math.floor(config.textureWidth / config.frameWidth);
            config.currentFrame = config.currentFrame % totalFrames;
            
            // Set the UV offset (normalized value) based on the current frame
            config.offset.x = (config.frameWidth * config.currentFrame) / config.textureWidth;
        }
        
        // Get the mesh and apply the updated UV offset
        const mesh = app.get(key);
        if (mesh) {
            mesh.material.textureX = config.offset.x;
            mesh.material.textureY = config.offset.y; // remains unchanged
        }
    }
});
