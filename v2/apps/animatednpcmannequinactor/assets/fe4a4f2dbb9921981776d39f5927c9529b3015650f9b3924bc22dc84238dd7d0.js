app.configure(() => {
    return [
        {
            key: 'emotes',
            type: 'section',
            label: 'Emotes',
        },
        {
            key: 'emote0',
            type: 'file',
            kind: 'emote',
            label: 'Idle',
        }
    ]
})


const vrm = app.get('avatar')

if (world.isServer) {
    // send initial state
    const state = {
        ready: true,
    }
    app.state = state
    app.send('state', state)
    // spawn controller
    const ctrl = app.create('controller')
    ctrl.position.copy(app.position)
    world.add(ctrl)
    ctrl.quaternion.copy(app.quaternion)
    ctrl.add(vrm)
    // read emotes
    const emoteUrls = {}

    // observe environment
    let changed = true
    let notifying = false
    const info = {
        world: {
            id: null, // todo
            name: null, // todo
            url: null, // todo
            context: config.context || 'You are in a virtual world powered by Hyperfy',
        },
        you: {
            id: app.instanceId,
            name: config.name,
        },
        emotes: Object.keys(emoteUrls),
        triggers: [],
        events: [],
    }

    async function notify() {
        if (!config.url) return
        changed = false
        notifying = true
        console.log('notifying...', info)
        let data
        try {
            const resp = await fetch(config.url, {
                headers: {
                    'Content-Type': 'application/json',
                },
                method: 'POST',
                body: JSON.stringify(info),
            })
            data = await resp.json()
        } catch (err) {
            console.error('notify failed')
        }
        notifying = false
        if (!data) return
        console.log(data)
        if (data.emote) {
            const url = emoteUrls[data.emote]
            app.send('emote', url)
        }
    }
}

// CLIENT
if (world.isClient) {
    const config = app.config
    const idleEmoteUrl = config.emote0?.url
    world.attach(vrm)
    let state = app.state
    if (state.ready) {
        init()
    } else {
        world.remove(vrm)
        app.on('state', _state => {
            state = _state
            init()
        })
    }

    function init() {
        world.add(vrm)
        vrm.setEmote(idleEmoteUrl)
    }
    const data = {}
    app.on('emote', url => {
        data.emote = { timer: 0 }
        vrm.setEmote(url)
    })
    app.on('update', delta => {

        if (data.emote) {
            data.emote.timer += delta
            if (data.emote.timer > EMOTE_TIME) {
                data.emote = null
                vrm.setEmote(idleEmoteUrl)
            }
        }

    })
}