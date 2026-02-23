
/** ICON SETUP CODE
 * - if you change the model of this script, you can delete the snippet below
 */
const selected = "Wifi_01"
app.traverse(node => {
  if (node.parent?.id == '$root') {
    if (app.config.buttonType === node.id) return
    node.active = false
  }
})
/// END SNIPPET



function parseTemplate(template, values) {
  return template.replace(/\${(\w+)}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match;
  });
}

app.configure([
  {
    key: 'broadcastChat',
    type: 'switch',
    label: 'broadcast',
    options: [
      { label: 'on', value: true },
      { label: 'off', value: false },
    ],
  },
  {
    key: 'webhook',
    type: 'text',
    label: "Webhook URL"
  },
])

if (world.isServer) {
  // Function to send message to Discord webhook
  const hitDiscordWebhook = async (message) => {
    if (!app.config.webhook) {
      console.error("Error: Discord webhook URL is not provided!");
      return false;
    }

    try {
      const response = await fetch(app.config.webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message
        }),
      });

      if (!response.ok) {
        throw new Error(`Discord webhook error: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error(`Failed to send message to Discord: ${error.message}`);
      return false;
    }
  };

  if (app.config.broadcastChat) {
    // Validate webhook URL
    if (!app.config.webhook) {
      console.error("ERROR: Discord webhook URL is required when broadcast is enabled!");
    } else {
      // Chat handler
      world.on('chat', async msg => {
        const from = msg.from || 'Unknown';
        const body = msg.body || '';
        const fromId = msg.fromId || '';

        const template = msg.from === 'Anonymous' ?
          `[${msg.fromId}]: ${msg.body} ` :
          `[${from}]: ${body} `;

        const parsedMessage = parseTemplate(template, msg);
        console.log(parsedMessage);

        // Send to Discord
        await hitDiscordWebhook(parsedMessage);
      });

      // Enter event handler
      world.on('enter', async ({ playerId }) => {
        const player = world.getPlayer(playerId)
        const message = `**${player.name != 'Anonymous' ? player.name : player.id}** has entered the world`;
        console.log(message);
        await hitDiscordWebhook(message);
      });

      // Leave event handler
      world.on('leave', async ({ playerId }) => {
        const player = world.getPlayer(playerId)
        const message = `**${player.name != 'Anonymous' ? player.name : player.id}** has left the world`;
        console.log(message);
        await hitDiscordWebhook(message);
      });
    }
  }

  // Custom discord event handler
  world.on('discord', msg => {
    if (app.config.webhook) hitDiscordWebhook(msg);
  });
}





