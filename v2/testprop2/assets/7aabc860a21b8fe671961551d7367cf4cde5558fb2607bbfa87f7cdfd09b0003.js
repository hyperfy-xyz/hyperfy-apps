// Get the glass pane
const glassPane = app.get('Glass')
if (!glassPane) {
    console.error('Could not find Glass mesh')
    return
}

// Configuration for glass animation
const CONFIG = {
    SPEED_X: -0.2,  // Speed of UV movement on X axis
    SPEED_Y: 0.2,  // Speed of UV movement on Y axis
}

// Track UV offset
const uvOffset = {
    x: 0,
    y: 0
}

// Update UV animation each frame
app.on('update', (delta) => {
    // Update UV offsets based on time
    uvOffset.x = (uvOffset.x + CONFIG.SPEED_X * delta) % 1
    uvOffset.y = (uvOffset.y + CONFIG.SPEED_Y * delta) % 1

    // Apply UV offset to material
    glassPane.material.textureX = uvOffset.x
    glassPane.material.textureY = uvOffset.y
}) 