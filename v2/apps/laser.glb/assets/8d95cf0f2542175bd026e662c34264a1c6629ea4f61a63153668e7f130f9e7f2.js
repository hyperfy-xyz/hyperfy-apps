const stand = app.get('Stand')
const laser = app.get('Laser')
const beam = app.get('Beam')
const tip = app.get('Tip')

world.attach(laser)
// world.add(laser)

console.log(laser.parent, laser.position.toArray())

const origin = new Vector3().copy(laser.position)
const direction = new Vector3(0, 0, -1).applyQuaternion(laser.quaternion)
const mask = null // world.createLayerMask('player')

const tipMinScale = 0.5
const tipMaxScale = 0.9
const tipCenterScale = (tipMinScale + tipMaxScale) / 2
const tipScaleAmplitude = (tipMaxScale - tipMinScale) / 2

let elapsed = 0
app.on('fixedUpdate', delta => {
    elapsed += delta
    const hit = world.raycast(origin, direction, Infinity, mask)
    if (hit) {
        beam.scale.z = hit.distance
        tip.position.z = -hit.distance
        tip.scale.setScalar(tipCenterScale + Math.sin(elapsed * Math.PI * 2) * tipScaleAmplitude)
    } else {
        beam.scale.z = 1000
        tip.position.z = -1000
    }    
})