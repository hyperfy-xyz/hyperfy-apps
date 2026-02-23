const block = app.get('BloomBlock');

const minIntensity = 5
const maxIntensity = 20
const pulseDuration = 0.5

let time = 0

app.on('update', delta => {
  time += delta
  const progress = (Math.sin(time * (Math.PI / pulseDuration)) + 1) / 2
  const intensity = minIntensity + progress * (maxIntensity - minIntensity)
  block.material.emissiveIntensity = intensity
});