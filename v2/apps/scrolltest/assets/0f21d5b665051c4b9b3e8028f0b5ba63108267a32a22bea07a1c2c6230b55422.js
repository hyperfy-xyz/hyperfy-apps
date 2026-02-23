let d, n
d = app.get('PlaneWifDiffuse')
n = app.get('PlaneWifNormal')

app.on('update', delta => {
	 d.material.textureX += 0.01 * delta
	 d.material.textureY += 0.01 * delta
	 n.material.textureY -= 0.3 * delta
	 n.material.textureX += 0.3 * delta
})