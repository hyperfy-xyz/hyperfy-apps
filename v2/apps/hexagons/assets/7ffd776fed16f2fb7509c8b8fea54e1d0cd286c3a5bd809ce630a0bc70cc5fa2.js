const RADIUS = 1.4
const platform = app.get('Body')
app.remove(platform)

// Calculate the proper offsets for hexagonal tiling
const WIDTH = RADIUS * 2
const HEIGHT = WIDTH * Math.sqrt(3) / 2

const SIZE = 10

for (let row = 0; row < SIZE; row++) {
    const offset = row % 2 === 0 ? 0 : WIDTH / 2
    for (let col = 0; col < SIZE; col++) {
        const p = platform.clone(true)
        p.position.set(
            col * WIDTH + offset,
            0,
            row * HEIGHT
        )
        app.add(p)
    }
}