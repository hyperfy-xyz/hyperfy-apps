if (world.isClient) {
    // ASCII Art Frames for animation
    const asciiFrames = [
        `╔══════════════════════════╗
║  CCP CHICKEN MAINFRAME   ║
║     ACCESS TERMINAL      ║
╚══════════════════════════╝`,
        `╔══════════════════════════╗
║  CCP_CHICKEN_MAINFRAME   ║
║     ACCESS_TERMINAL      ║
╚══════════════════════════╝`,
        `╔══════════════════════════╗
║  CCP CHICKEN MAINFRAME   ║
║     ACCESS.TERMINAL      ║
╚══════════════════════════╝`
    ]

    // Constants for styling
    const COLORS = {
        primary: '#FF1A1A',      // CCP Red
        secondary: '#FFB347',    // Amber warning
        background: 'rgba(0, 0, 0, 0.25)',
        border: 'rgba(255, 26, 26, 0.3)',
        highlight: '#FF4D4D'
    }

    // UI Setup with enhanced styling
    const ui = app.create('ui')
    ui.width = 400
    ui.height = 250
    ui.backgroundColor = COLORS.background
    ui.border = `2px solid ${COLORS.border}`
    ui.position.set(0, 2.25, 0)
    ui.billboard = 'full'
    ui.justifyContent = 'center'
    ui.alignItems = 'center'
    ui.borderRadius = 20
    ui.padding = 20
    ui.gap = 15

    // ASCII Art Display
    const asciiArt = app.create('uitext')
    asciiArt.value = asciiFrames[0]
    asciiArt.color = COLORS.primary
    asciiArt.fontSize = 16
    asciiArt.fontFamily = 'monospace'
    asciiArt.textAlign = 'center'
    ui.add(asciiArt)

    // Main Warning Text
    const label = app.create('uitext')
    label.value = '[RESTRICTED AREA]\nMETAVERSE CREDIT SCORE CHECK REQUIRED'
    label.color = COLORS.primary
    label.fontSize = 24
    label.textAlign = 'center'
    label.marginTop = 15
    label.textShadow = '0 0 10px rgba(255, 26, 26, 0.7)'
    ui.add(label)

    // Status Display
    const statusText = app.create('uitext')
    statusText.value = 'STATUS: AWAITING VERIFICATION'
    statusText.color = COLORS.secondary
    statusText.fontSize = 18
    statusText.textAlign = 'center'
    statusText.marginTop = 10
    ui.add(statusText)

    // Credit Score Display
    const scoreDisplay = app.create('uitext')
    scoreDisplay.value = 'CURRENT SCORE: ---'
    scoreDisplay.color = COLORS.secondary
    scoreDisplay.fontSize = 20
    scoreDisplay.textAlign = 'center'
    scoreDisplay.marginTop = 10
    ui.add(scoreDisplay)

    // Interactive Button Panel
    const buttonPanel = app.create('uiview')
    buttonPanel.backgroundColor = 'rgba(0, 0, 0, 0.5)'
    buttonPanel.padding = 15
    buttonPanel.borderRadius = 10
    buttonPanel.marginTop = 20
    ui.add(buttonPanel)

    // Action button
    const action = app.create('action')
    action.label = '[ VERIFY CREDENTIALS ]'
    action.position.set(0, 0.75, 0)
    action.distance = 3

    let verificationStep = 0
    const verificationSteps = [
        { status: 'INITIATING SCAN...', score: '???' },
        { status: 'ACCESSING DATABASE...', score: '2??' },
        { status: 'VERIFYING IDENTITY...', score: '35?' },
        { status: 'CALCULATING SCORE...', score: '420' }
    ]

    action.onTrigger = () => {
        audio.play()
        verificationStep = (verificationStep + 1) % verificationSteps.length
        
        statusText.value = `STATUS: ${verificationSteps[verificationStep].status}`
        scoreDisplay.value = `CURRENT SCORE: ${verificationSteps[verificationStep].score}`
        
        if (verificationStep === verificationSteps.length - 1) {
            action.label = '[ ACCESS GRANTED ]'
            label.value = 'WELCOME TO THE METAVERSE\nCITIZEN #420'
            label.color = '#00FF00' // Success green
            statusText.color = '#00FF00'
            scoreDisplay.color = '#00FF00'
        }
    }

    // Animation state
    let frameIndex = 0
    let frameDelay = 0
    const FRAME_DELAY_MAX = 30 // Adjust for faster/slower animation

    // Listen for UI updates
    app.on('uitext:update', (text) => {
        label.value = text
    })

    app.on('action:update', (text) => {
        action.label = text
    })

    app.on('update', () => {
        try {
            frameCount++
            
            // Animate ASCII art
            frameDelay++
            if (frameDelay >= FRAME_DELAY_MAX) {
                frameDelay = 0
                frameIndex = (frameIndex + 1) % asciiFrames.length
                asciiArt.value = asciiFrames[frameIndex]
            }

            // Add subtle pulsing effect to the border when verifying
            if (verificationStep > 0 && verificationStep < verificationSteps.length - 1) {
                const pulseIntensity = (Math.sin(frameCount * 0.1) + 1) / 2
                const borderColor = `rgba(255, 26, 26, ${0.3 + pulseIntensity * 0.4})`
                ui.border = `2px solid ${borderColor}`
            }
        } catch (err) {
            console.error('Error in update loop:', err)
        }
    })

    app.add(action)
    app.add(ui)
}

app.configure([
    {
        key: 'audio',
        type: 'file',
        kind: 'audio',
        label: 'Audio'
    }
])

const audio = app.create('audio', {
    src: props.audio?.url,
    volume: props.volume || 2,
    group: props.audioType || 'music',
    spatial: true
})

app.add(audio)

let frameCount = 0

app.on('update', () => {
	try {
		frameCount++
	} catch (err) {
		console.error('Error in update loop:', err)
	}
})