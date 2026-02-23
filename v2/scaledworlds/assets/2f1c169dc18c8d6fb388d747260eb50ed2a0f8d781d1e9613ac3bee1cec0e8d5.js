props;
(function () {
    'use strict';

    var config_props = [
    	{
    		key: "teleport_x",
    		label: "x",
    		type: "number",
    		dp: 5,
    		initial: 0.7912
    	},
    	{
    		key: "teleport_y",
    		label: "y",
    		type: "number",
    		dp: 5,
    		initial: 1.015
    	},
    	{
    		key: "teleport_z",
    		label: "z",
    		type: "number",
    		dp: 5,
    		initial: 7.4012
    	},
    	{
    		key: "playerScale",
    		label: "z",
    		type: "number",
    		dp: 5,
    		initial: 0.3
    	}
    ];

    app.configure(config_props);
    let action = null;

    function shrinkPlayer(playerId, localPlayerId, x, y, z) {
        let player = world.getPlayer(playerId);
        if (!player) { return; }

        player.scaleAvatar(x, y, z);
        
        if (world.isServer) {
            app.send("shrinkPlayer", { playerId, x, y, z });
        }

        if (playerId === localPlayerId) {
            let pos = new Vector3().fromArray([props.teleport_x, props.teleport_y, props.teleport_z]);

            player.teleport(pos, 0);

            // this is where we will set unshrink action :)
            if (action != null) {
                app.remove(action);
                action = null;
            }
        }
    }

    if (world.isClient) {
        /** @type {PlayerProxy} Player */
        let player = world.getPlayer();

        action = app.create("action", {
            label: "Explore",
            distance: 4,
            onTrigger: () => {
                app.send("requestPlayerShrink", { playerId: player.id, x: props.playerScale, y: props.playerScale, z: props.playerScale});
            }
        });

        app.add(action);

        app.on("shrinkPlayer", (data) => {
            shrinkPlayer(data.playerId, player.id, data.x, data.y, data.z);
        });
    } 

    if (world.isServer) {
        
        app.on("requestPlayerShrink", (data) => {
            shrinkPlayer(data.playerId, null, data.x, data.y, data.z);
        });
    }

})();
