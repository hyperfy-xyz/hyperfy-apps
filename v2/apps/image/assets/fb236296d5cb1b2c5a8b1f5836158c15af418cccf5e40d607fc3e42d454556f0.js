app.configure([
  {
    key: 'placeholder',
    type: 'file',
    kind: 'image',
    label: 'Placeholder',
    hidden: true,
  },
  {
    key: 'image',
    type: 'file',
    kind: 'image',
    label: 'Image',
    hint: 'The image to display.'
  },
  {
    key: 'surface',
    type: 'section',
    label: 'Surface',
  },
  {
    key: 'width',
    type: 'number',
    label: 'Width',
    dp: 1,
    step: 0.1,
    bigStep: 1,
    initial: 0,
    hint: 'The width of the surface. If set to zero with a non-zero height, the width will automatically adjust to match the image aspect ratio.'
  },
  {
    key: 'height',
    type: 'number',
    label: 'Height',
    dp: 1,
    step: 0.1,
    bigStep: 1,
    initial: 1,
    hint: 'The height of the surface. If set to zero with a non-zero width, the height will automatically adjust to match the image aspect ratio.'
  },
  {
    key: 'fit',
    type: 'switch',
    label: 'Fit',
    options: [
      { label: 'Stretch', value: 'none' },
      { label: 'Cover', value: 'cover' },
      { label: 'Contain', value: 'contain' },
    ],
    initial: 'none',
    hint: 'How the image should be scaled to fit the surface dimensions. This has no effect if both width and height are set.'
  },
  {
    key: 'transparent',
    type: 'toggle',
    label: 'Transparent',
    hint: 'This should be used when using a (semi-)transparent image like a png.'
  },
  {
    key: 'lit',
    type: 'toggle',
    label: 'Lit',
    hint: 'Whether this surface is effected by world lighting.'
  },
  {
    key: 'shadows',
    type: 'toggle',
    label: 'Shadows',
    hint: 'Whether this surface casts and receives shadows.'
  },
])
app.keepActive = true

const src = props.image?.url || props.placeholder?.url
const width = props.width === 0 ? null : props.width
const height = props.height === 0 ? null : props.height
const fit = props.fit
const transparent = props.transparent
const lit = props.lit
const shadows = props.shadows

const surface = app.get('Surface')
app.remove(surface)

const image = app.create('image')
image.pivot = 'bottom-center'
image.src = src
image.width = width
image.height = height
image.fit = fit
image.color = transparent ? 'transparent' : 'black'
image.transparent = true
image.doubleside = true
image.lit = lit
image.castShadow = shadows
image.receiveShadow = shadows

image.position.copy(app.position)
world.add(image)


// billboard example
const control = app.control()
const q1 = new Quaternion()
const e1 = new Euler().reorder('YXZ')
const v1 = new Vector3()
const FORWARD = new Vector3(0, 0, -1)
app.on('update', () => {
  // option 1: match the camera Y rotation
  e1.setFromQuaternion(control.camera.quaternion)
  e1.x = 0
  e1.z = 0
  image.quaternion.setFromEuler(e1)

  // option 2: look at the camera
  // v1.subVectors(control.camera.position, image.position).normalize()
  // q1.setFromUnitVectors(FORWARD, v1)
  // e1.setFromQuaternion(q1)
  // e1.x = 0
  // e1.z = 0
  // q1.setFromEuler(e1)
  // image.quaternion.copy(q1)

})