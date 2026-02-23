// Import important dependencies at the top
// Configure the app with audio options
app.configure([
	{
		key: 'radiationAudio',
		type: 'file',
		kind: 'audio',
		label: 'Radiation Sound',
		description: 'Upload an MP3 file for the radiation cloud ambience'
	},
	{
		key: 'geigerAudio',
		type: 'file',
		kind: 'audio',
		label: 'Geiger Counter Sound',
		description: 'Upload an MP3 file for Geiger counter clicks (should be a short sound)'
	},
	{
		key: 'damageSfx',
		type: 'file',
		kind: 'audio',
		label: 'Radiation Damage SFX',
		description: 'Upload an MP3 file for radiation damage sound effect'
	},
	{
		key: 'warningSfx',
		type: 'file',
		kind: 'audio',
		label: 'Radiation Warning SFX',
		description: 'Upload an MP3 file for radiation zone entry warning'
	},
	{
		key: 'refDistance',
		type: 'number',
		label: 'Reference Distance',
		description: 'Distance at which the radiation sound is at full volume (in meters)',
		initial: 3,
		min: 0.5,
		max: 10,
		step: 0.5
	},
	{
		key: 'maxDistance',
		type: 'number',
		label: 'Maximum Distance',
		description: 'Distance at which the radiation sound becomes inaudible (in meters)',
		initial: 20,
		min: 5,
		max: 50,
		step: 1
	},
	{
		key: 'rolloffFactor',
		type: 'number',
		label: 'Rolloff Factor',
		description: 'How quickly the radiation sound fades with distance (higher = faster falloff)',
		initial: 1.5,
		min: 0.5,
		max: 5,
		step: 0.1
	},
	{
		key: 'distanceModel',
		type: 'switch',
		label: 'Distance Model',
		description: 'How radiation sound volume decreases with distance',
		options: [
			{ label: 'Linear', value: 'linear' },
			{ label: 'Inverse', value: 'inverse' },
			{ label: 'Exponential', value: 'exponential' }
		],
		initial: 'inverse'
	}
])

// Create our own particle template instead of looking for an existing one
let particleTemplate;
try {
	// Try to get the template first in case it exists
	particleTemplate = app.get('RadiationParticle');
	
	// If not found, create our own template
	if (!particleTemplate) {
		console.log('[CAMPFIRE] Creating custom radiation particle template');
		
		// Create a UI container instead of mesh
		particleTemplate = app.create('ui', {
			width: 12,
			height: 12,
			backgroundColor: 'rgba(0,0,0,0)', // Important: Transparent background
			padding: 0,
			billboard: 'full',  // Make particles face player
			id: 'RadiationParticleTemplate' // Set ID in constructor instead of directly
		});
		
		// Create text for the particle using radiation symbols
		// Using fewer symbols for better performance
		const radiationChars = ['☢', '☣']; // Just 2 main radiation symbols for better performance
		const text = app.create('uitext', {
			value: radiationChars[Math.floor(num(0, 1, 2) * radiationChars.length)],
			fontSize: 16,  // Size of text
			color: '#39ff14', // Bright green for radiation
			textAlign: 'center',
			verticalAlign: 'middle', // Center vertically too
			padding: 0,
			fontFamily: 'monospace',
			width: '100%',
			height: '100%'
		});
		
		// Add text to container
		particleTemplate.add(text);
		particleTemplate.text = text;
		particleTemplate.charSet = radiationChars;
		
		// No need to try setting ID or using app.set (not supported)
		// Just use the template directly
		
		// Log template creation
		console.log('[CAMPFIRE] Radiation particle template created with text symbol');
	}
	
	// Hide the template
	particleTemplate.visible = false;
} catch (error) {
	console.error('[CAMPFIRE] Error creating particle template:', error);
	
	// Create a fallback simple template - with text instead of background color
	particleTemplate = app.create('ui', {
		width: 10,
		height: 10,
		backgroundColor: 'rgba(0,0,0,0)', // Transparent
		padding: 0,
		billboard: 'full'
	});
	
	// Add fallback text
	const fallbackText = app.create('uitext', {
		value: '☢',
		fontSize: 8,
		color: '#39ff14', // Bright green for radiation
		textAlign: 'center',
		verticalAlign: 'middle',
		padding: 0,
		fontFamily: 'monospace',
		width: '100%',
		height: '100%'
	});
	
	particleTemplate.add(fallbackText);
	particleTemplate.text = fallbackText;
	particleTemplate.charSet = ['☢', '☣', '⚛'];
	particleTemplate.visible = false;
	
	console.log('[CAMPFIRE] Created fallback radiation particle template');
}

// Configuration for the particle system
const CONFIG = {
	MAX_PARTICLES: 400,          // Reduced from 200 to 100 for better performance
	SPAWN_RATE: 20,              // Reduced from 40 to 20 particles per second
	LIFETIME: 2.5,               // Slightly shorter lifetime for better performance
	MIN_SPEED: 0.6,              // slower initial speed for floating effect
	MAX_SPEED: 1.2,
	MIN_SCALE: 0.05,             // smaller starting size
	MAX_SCALE: 0.2,              // larger max size for more visibility
	SPAWN_RADIUS: 15,           // wider area for the radiation cloud
	GRAVITY: -0.15,              // lighter negative gravity for slower rise
	BURST_INTERVAL: 0.1,         // Increased from 0.05 to 0.1 for fewer spawns
	PARTICLES_PER_BURST: 2,      // Reduced from 5 to 2 for better performance
	TURBULENCE: 0.8,             // Reduced from 0.4 to 0.3 for simpler movement
	
	// Damage settings
	DAMAGE_RADIUS: 15,          // Larger radius for radiation damage
	DAMAGE_INTERVAL: 1,          // Check for damage every second
	DAMAGE_AMOUNT: 15,            // Damage per tick
	BURN_DURATION: 10,           // Burning effect lasts 10 seconds after leaving fire
	BURN_REFRESH_INTERVAL: 5,    // Refresh burning effect every 5 seconds while in fire
	
	// Effect settings for fire (visual and gameplay)
	ENABLE_DAMAGE: true,         // Whether fire can damage players
	DAMAGE_LOCAL_PLAYER: true,   // Whether fire damages the local player
	DAMAGE_REMOTE_PLAYERS: true, // Whether fire damages other players
	
	// Audio configuration
	AUDIO_VOLUME: 0.7,  // Default volume for radiation sounds
	AUDIO_PANNING: 0.2, // Slight panning effect for unsettling feeling
	GEIGER_VOLUME: 0.5, // Default volume for Geiger counter
	GEIGER_MIN_INTERVAL: 0.1, // Minimum time between clicks (seconds)
	GEIGER_MAX_INTERVAL: 2.0, // Maximum time between clicks (seconds)
	GEIGER_RANGE: 15,    // Range at which Geiger counter starts clicking
	GEIGER_INTENSITY_SCALE: 5.0, // How quickly intensity increases with proximity
	DAMAGE_SFX_VOLUME: 0.8, // Volume for radiation damage sound effect
	WARNING_SFX_VOLUME: 0.9, // Volume for radiation warning sound
	WARNING_RANGE: 10,   // Range at which warning triggers (slightly before damage range)
}

console.log('[CAMPFIRE] Initializing campfire with damage radius:', CONFIG.DAMAGE_RADIUS)

// Create a collision area for the fire
if (world.isServer) {
	console.log('[CAMPFIRE] Setting up server-side fire collision detection')
	console.log('[CAMPFIRE] Campfire position:', app.position)
	
	// Create a direct test action that players can click to test fire damage
	const testFireAction = app.create('action')
	testFireAction.label = '🔥 TEST FIRE 🔥'
	testFireAction.distance = 10 // Make it easier to click from a distance
	testFireAction.position.set(0, 2, 0) // Position it above the fire
	
	testFireAction.onTrigger = (e) => {
		console.log('[CAMPFIRE] Fire test action triggered by:', e)
		if (e && e.playerId) {
			// Apply direct damage and burning effect to the player who triggered it
			console.log(`[CAMPFIRE] Applying direct test damage to ${e.playerId}`)
			
			const testPlayer = world.getPlayer(e.playerId)
			if (testPlayer && testPlayer.health > 0) {
				// Apply damage directly without going through the event system
				testPlayer.damage(CONFIG.DAMAGE_AMOUNT)
				
				// Apply burning effect
				if (testPlayer.health > 0) {
					console.log(`[CAMPFIRE] Applying direct test burn effect to ${e.playerId}`)
					
					// Apply burning effect with emote directly
					applyBurningEffect(testPlayer, CONFIG.BURN_DURATION)
					
					// Send damage notification
					app.send('dmg', { 
						playerId: e.playerId,
						amount: CONFIG.DAMAGE_AMOUNT,
						crit: false,
						sourceType: 'campfire-direct-test'
					})
				}
			}
		}
	}
	
	app.add(testFireAction)
	
	// Create trigger area - using both a trigger collider and direct position checking
	const fireArea = app.create('rigidbody', { type: 'static' })
	const collider = app.create('collider', { trigger: true })
	collider.type = 'sphere'
	collider.radius = CONFIG.DAMAGE_RADIUS
	fireArea.add(collider)
	app.add(fireArea)
	
	// Make sure it's positioned correctly at the campfire location
	fireArea.position.copy(app.position)
	fireArea.position.y += 0.5 // Move it up slightly to match player height better
	
	console.log('[CAMPFIRE] Fire collision area created with radius:', CONFIG.DAMAGE_RADIUS)
	console.log('[CAMPFIRE] Fire collision area position:', fireArea.position)
	
	// Track players in the fire and burning state
	const playersInFire = new Set()
	const playersBurningState = new Map() // Track burning state and timers
	let damageTimer = 0
	
	// Helper function to apply the burning effect to players
	function applyBurningEffect(player, duration) {
		if (!player || !player.id) {
			console.error('[CAMPFIRE] Invalid player reference in applyBurningEffect')
			return null
		}
		
		const playerId = player.id
		console.log(`[CAMPFIRE] Applying burning effect to ${playerId} for ${duration} seconds`)
		
		try {
			// Check if already burning
			const existingState = playersBurningState.get(playerId)
			const now = world.getTimestamp()
			
			// Either create a new burning state or refresh/extend existing one
			const burnState = existingState || {
				startTime: now,
				endTime: now + duration * 1000, // Convert to milliseconds
				lastTickTime: now,
				lastRefreshTime: now,
				effectApplied: false
			}
			
			// Update end time if extending duration
			if (existingState) {
				// Extend end time if new duration would make it burn longer
				const newEndTime = now + duration * 1000
				if (newEndTime > existingState.endTime) {
					burnState.endTime = newEndTime
				}
				burnState.lastRefreshTime = now
			}
			
			// Store state
			playersBurningState.set(playerId, burnState)
			
			// Calculate remaining time in seconds
			const remainingTime = (burnState.endTime - now) / 1000
			
			// Apply burning emote directly to the player - this is critical
			if (app.config.burning?.url && player && typeof player.applyEffect === 'function') {
				try {
					// Apply the emote with looping enabled
					player.applyEffect({
						emote: app.config.burning.url + '?l=1', // loop=true
						duration: remainingTime
					})
					burnState.effectApplied = true
				} catch (e) {
					console.error('[CAMPFIRE] Error applying burning emote:', e)
				}
			}
			
			// Apply visual effect only instead of emote to avoid animation conflicts
			// Let the playerEffectsCore handle the visual effects
			app.send('effect:applied', { 
				playerId, 
				type: 'burning', 
				duration: remainingTime 
			})
			
			// Also notify effect system for additional effects
			app.send('effect:burning', {
				playerId,
				duration: remainingTime
			})
			
			return burnState
		} catch (e) {
			console.error('[CAMPFIRE] Error in applyBurningEffect:', e)
			return null
		}
	}
	
	// DEBUG: Test command for manually triggering fire damage for a specific player
	app.on('command:burntest', (data) => {
		console.log('[CAMPFIRE] Test command received:', data)
		const { playerId } = data
		
		if (!playerId) {
			// If no player ID was provided, burn all players
			const players = world.getPlayers()
			console.log(`[CAMPFIRE] Testing burn on all ${players.length} players`)
			
			players.forEach(player => {
				console.log(`[CAMPFIRE] Testing burn on player: ${player.id}`)
				
				// Apply damage directly
				player.damage(CONFIG.DAMAGE_AMOUNT)
				
				// Apply burning effect directly
				applyBurningEffect(player, CONFIG.BURN_DURATION)
				
				// Send damage notification
				app.send('dmg', { 
					playerId: player.id,
					amount: CONFIG.DAMAGE_AMOUNT,
					crit: false,
					sourceType: 'campfire-test'
				})
			})
		} else {
			// Burn a specific player
			const player = world.getPlayer(playerId)
			if (player) {
				console.log(`[CAMPFIRE] Testing burn on specific player: ${playerId}`)
				
				// Apply damage directly
				if (player && player.health > 0) {
					try {
						player.damage(CONFIG.DAMAGE_AMOUNT)
					} catch (e) {
						console.error('[CAMPFIRE] Error applying damage:', e)
					}
				}
				
				// Apply burning effect
				if (player && player.id) {
					try {
						applyBurningEffect(player, CONFIG.BURN_DURATION)
					} catch (e) {
						console.error('[CAMPFIRE] Error applying burning effect:', e)
					}
				}
				
				// Send damage notification
				if (player) {
					world.emit('hyperfy:dmg', { 
						playerId, 
						amount: CONFIG.DAMAGE_AMOUNT, 
						crit: false
					})
				}
			} else {
				console.log(`[CAMPFIRE] Test failed - player ${playerId} not found`)
			}
		}
	})
	
	// Handle players entering the fire
	fireArea.onTriggerEnter = (other) => {
		console.log('[CAMPFIRE] Trigger entered by:', other)
		// Check if it's a player
		if (other && other.hasOwnProperty('networkId')) {
			const playerId = other.networkId
			if (!playersInFire.has(playerId)) {
				playersInFire.add(playerId)
				console.log(`[CAMPFIRE] Player ${playerId} entered the fire! Current players in fire:`, Array.from(playersInFire))
				
				// Immediately apply initial damage
				const player = world.getPlayer(playerId)
				if (player && player.health > 0) {
					console.log(`[CAMPFIRE] Applying initial damage to player ${playerId} with health ${player.health}`)
					
					// Apply damage directly - simplified like sword example
					if (player && player.health > 0) {
						try {
							player.damage(CONFIG.DAMAGE_AMOUNT)
						} catch (e) {
							console.error('[CAMPFIRE] Error applying damage:', e)
						}
					}
					
					// Apply burning effect
					if (player && player.id) {
						try {
							applyBurningEffect(player, CONFIG.BURN_DURATION)
						} catch (e) {
							console.error('[CAMPFIRE] Error applying burning effect:', e)
						}
					}
					
					// Send damage notification - simplified
					if (player) {
						world.emit('hyperfy:dmg', { 
							playerId, 
							amount: CONFIG.DAMAGE_AMOUNT, 
							crit: false
						})
					}
				}
			}
		}
	}
	
	// Handle players leaving the fire
	fireArea.onTriggerLeave = (other) => {
		console.log('[CAMPFIRE] Trigger left by:', other)
		if (other && other.hasOwnProperty('networkId')) {
			const playerId = other.networkId
			if (playersInFire.has(playerId)) {
				playersInFire.delete(playerId)
				console.log(`[CAMPFIRE] Player ${playerId} left the fire! Current players in fire:`, Array.from(playersInFire))
				
				// When player leaves fire, they should remain burning for BURN_DURATION
				const player = world.getPlayer(playerId)
				if (player && player.health > 0) {
					console.log(`[CAMPFIRE] Maintaining burn effect on player ${playerId} after leaving fire`)
					
					// Continue the burning effect, it will automatically expire based on the timer
					// No need to reapply if already burning
				}
			}
		}
	}
	
	// Apply damage over time to players in the fire and check for players who should be in the fire
	app.on('update', (delta) => {
		// Process fire damage on interval
		damageTimer += delta
		
		if (damageTimer >= CONFIG.DAMAGE_INTERVAL) {
			damageTimer = 0
			
			// IMPROVEMENT: Actively check for players in range instead of relying only on trigger events
			const players = world.getPlayers()
			const now = world.getTimestamp()
			
			// First check all players for proximity to fire
			players.forEach(player => {
				const playerId = player.id
				const distance = player.position.distanceTo(fireArea.position)
				const inRange = distance <= CONFIG.DAMAGE_RADIUS
				
				// If player is in range but not in our set, add them
				if (inRange && !playersInFire.has(playerId) && player.health > 0) {
					console.log(`[CAMPFIRE] Player ${playerId} detected in fire range but not tracked! Distance: ${distance.toFixed(2)}, adding to tracked players`)
					playersInFire.add(playerId)
					
					// Apply initial damage using direct damage
					if (player && player.health > 0) {
						console.log(`[CAMPFIRE] Applying direct initial damage of ${CONFIG.DAMAGE_AMOUNT} to player ${playerId}`)
						
						// Apply damage directly - simplified like sword example
						if (player && player.health > 0) {
							try {
								player.damage(CONFIG.DAMAGE_AMOUNT)
							} catch (e) {
								console.error('[CAMPFIRE] Error applying damage:', e)
							}
						}
						
						// Apply burning effect
						if (player && player.id) {
							try {
								applyBurningEffect(player, CONFIG.BURN_DURATION)
							} catch (e) {
								console.error('[CAMPFIRE] Error applying burning effect:', e)
							}
						}
						
						// Send damage notification - simplified
						if (player) {
							world.emit('hyperfy:dmg', { 
								playerId, 
								amount: CONFIG.DAMAGE_AMOUNT, 
								crit: false
							})
						}
					}
				}
				
				// If player is out of range but in our set, remove them
				if (!inRange && playersInFire.has(playerId)) {
					console.log(`[CAMPFIRE] Player ${playerId} no longer in fire range but still tracked! Distance: ${distance.toFixed(2)}, removing from tracked players`)
					playersInFire.delete(playerId)
					
					// When player leaves fire, they should remain burning for BURN_DURATION
					// The burning effect is already applied and will continue
				}
			})
			
			// Deal damage to each player in the fire
			if (playersInFire.size > 0) {
				console.log(`[CAMPFIRE] Damage tick. Players in fire:`, Array.from(playersInFire))
				
				playersInFire.forEach(playerId => {
					const player = world.getPlayer(playerId)
					if (player && player.health > 0) {
						console.log(`[CAMPFIRE] Applying direct damage tick of ${CONFIG.DAMAGE_AMOUNT} to player ${playerId}, health before: ${player.health}`)
						
						// Apply damage directly - simplify to match working example
						if (player && player.health > 0) {
							try {
								player.damage(CONFIG.DAMAGE_AMOUNT)
							} catch (e) {
								console.error('[CAMPFIRE] Error applying damage:', e)
							}
						}
						
						// Check if it's time to refresh the burning effect
						const burnState = playersBurningState.get(playerId)
						if (!burnState || (now - burnState.lastRefreshTime) >= CONFIG.BURN_REFRESH_INTERVAL * 1000) {
							// Refresh the burning effect while in fire
							if (player && player.id) {
								try {
									applyBurningEffect(player, CONFIG.BURN_DURATION)
								} catch (e) {
									console.error('[CAMPFIRE] Error applying burning effect:', e)
								}
							}
						}
						
						// Send damage notification - keep this simple like the sword example
						if (player) {
							world.emit('hyperfy:dmg', { 
								playerId, 
								amount: CONFIG.DAMAGE_AMOUNT, 
								crit: false
							})
						}
						
						console.log(`[CAMPFIRE] Player health after damage: ${player.health}`)
					} else {
						console.log(`[CAMPFIRE] Player ${playerId} not found or health is 0, removing from tracked players`)
						playersInFire.delete(playerId)
						playersBurningState.delete(playerId)
					}
				})
			}
			
			// Process burning effects for players not in fire (afterburn effects)
			playersBurningState.forEach((state, playerId) => {
				// Skip players already handled (in fire)
				if (playersInFire.has(playerId)) return
				
				const player = world.getPlayer(playerId)
				if (!player || player.health <= 0) {
					// Remove from tracking if player is gone or dead
					playersBurningState.delete(playerId)
					return
				}
				
				// Check if burn duration has expired
				if (now >= state.endTime) {
					console.log(`[CAMPFIRE] Burning effect expired for player ${playerId}`)
					playersBurningState.delete(playerId)
					return
				}
				
				// Calculate time since last damage tick
				const timeSinceLastTick = (now - state.lastTickTime) / 1000 // Convert to seconds
				
				// Apply burn damage on interval
				if (timeSinceLastTick >= CONFIG.DAMAGE_INTERVAL) {
					state.lastTickTime = now
					
					// Calculate damage based on time since last tick
					const damage = CONFIG.DAMAGE_AMOUNT * CONFIG.DAMAGE_INTERVAL
					
					console.log(`[CAMPFIRE] Applying burn damage to player ${playerId}: ${damage}`)
					
					// Apply damage - simplified to match sword example
					if (player && player.health > 0) {
						try {
							player.damage(damage)
						} catch (e) {
							console.error('[CAMPFIRE] Error applying damage:', e)
						}
					}
					
					// Send damage notification with burn effect type
					if (player) {
						world.emit('hyperfy:dmg', { 
							playerId, 
							amount: Math.round(damage), 
							crit: false,
							effectType: 'burning'
						})
					}
					
					// Update visuals without using emotes
					if (player) {
						app.send('effect:update', {
							playerId: playerId,
							type: 'burning',
							remainingTime: (state.endTime - now) / 1000
						})
					}
				}
			})
		}
	})
	
	// Debug helper for collision area
	console.log('[CAMPFIRE] Adding debug visualization');
	
	// Instead of trying to create a visual mesh, just log information
	// This is safer and won't crash the script if visualization fails
	console.log(`[CAMPFIRE] Fire area configured at: ${JSON.stringify(fireArea.position)}`);
	console.log(`[CAMPFIRE] With radius: ${CONFIG.DAMAGE_RADIUS}`);
	
	// Add an additional check to verify players in range
	app.on('update', (delta) => {
		// Only do this occasionally to avoid log spam
		const checkInterval = 30; // seconds - increased from 5 to 30 to reduce spam
		
		// Static variable to track time
		if (!app._lastCheckTime) app._lastCheckTime = 0;
		app._lastCheckTime += delta;
		
		if (app._lastCheckTime > checkInterval) {
			app._lastCheckTime = 0;
			
			// Check all players against fire position
			const players = world.getPlayers();
			if (players.length > 0) {
				console.log(`[CAMPFIRE] Checking ${players.length} players against fire position`);
				
				players.forEach(player => {
					const distance = player.position.distanceTo(fireArea.position);
					const inRange = distance <= CONFIG.DAMAGE_RADIUS;
					
					// Only log players that are close to the fire radius to reduce spam
					if (distance <= CONFIG.DAMAGE_RADIUS + 3) {
						console.log(`[CAMPFIRE] Player ${player.id} at distance ${distance.toFixed(2)}, in range: ${inRange}`);
						
						// Debug check: if player should be in range but not in our set
						if (inRange && !playersInFire.has(player.id)) {
							console.log(`[CAMPFIRE] WARNING: Player ${player.id} is in range but not tracked in playersInFire!`);
						}
						
						// Debug check: if player should not be in range but is in our set
						if (!inRange && playersInFire.has(player.id)) {
							console.log(`[CAMPFIRE] WARNING: Player ${player.id} is not in range but is tracked in playersInFire!`);
						}
						
						// Debug burning state
						const burnState = playersBurningState.get(player.id)
						if (burnState) {
							const now = world.getTimestamp()
							const remainingTime = (burnState.endTime - now) / 1000
							console.log(`[CAMPFIRE] Player ${player.id} burning status: ${remainingTime.toFixed(1)}s remaining`)
						}
					}
				});
			}
		}
	});
}

if (world.isClient) {
	console.log('[CAMPFIRE] Initializing client-side particle system');
	
	// Particle pool tracking
	const particles = [];
	const inactiveIndices = [];
	let timeSinceLastBurst = 0;

	// Initialize particle pool
	try {
		console.log('[CAMPFIRE] Initializing particle pool');
		for (let i = 0; i < CONFIG.MAX_PARTICLES; i++) {
			try {
				const particle = particleTemplate.clone(true);
				if (!particle) {
					console.warn(`[CAMPFIRE] Failed to clone particle ${i}, skipping`);
					continue;
				}
				
				particle.visible = false;

				// Add metadata to particle
				particle.velocity = { x: 0, y: 0, z: 0 };  // Simple object instead of Vector3
				particle.velocity.set = function(x, y, z) {  // Add a set method
					this.x = x;
					this.y = y;
					this.z = z;
				};
				particle.lifetime = 0;
				particle.active = false;
				
				// Set random character for each particle
				const radiationChars = ['☢', '☣']; // Simplified character set
				if (particle.text) {
					particle.text.value = radiationChars[Math.floor(num(0, 1, 2) * radiationChars.length)];
					particle.charSet = radiationChars;
				}

				particles.push(particle);
				inactiveIndices.push(i);
				app.add(particle);
			} catch (particleError) {
				console.error(`[CAMPFIRE] Error creating particle ${i}:`, particleError);
			}
		}
		console.log(`[CAMPFIRE] Created ${particles.length} particles`);
	} catch (poolError) {
		console.error('[CAMPFIRE] Error initializing particle pool:', poolError);
	}

	const localPlayer = world.getPlayer()
	
	// DEBUG: Chat command listener for testing
	world.on('chat', (message) => {
		// Check if the message exists and is a string before trying string methods
		if (message && message.text && typeof message.text === 'string') {
			const text = message.text.trim();
			
			if (text === '/burntest') {
				console.log('[CAMPFIRE] Client burntest command detected')
				// Create a safety check here to ensure we have a valid player
				const player = world.getPlayer()
				if (player) {
					// Directly apply damage and effect to the local player without sending event
					console.log(`[CAMPFIRE] Applying direct test damage to ${player.id}`)
					
					// Apply damage directly
					if (player && player.health > 0) {
						try {
							player.damage(CONFIG.DAMAGE_AMOUNT)
						} catch (e) {
							console.error('[CAMPFIRE] Error applying damage:', e)
						}
					}
					
					// Send damage visual notification directly
					app.send('dmg', { 
						playerId: player.id, 
						amount: CONFIG.DAMAGE_AMOUNT, 
						crit: false,
						sourceType: 'campfire-direct'
					})
					
					// Apply burn effect
					if (player.health > 0) {
						// Apply effect directly through local event
						app.send('effect:burning', {
							playerId: player.id,
							duration: CONFIG.BURN_DURATION
						})
					}
				}
			} else if (text === '/burnall') {
				console.log('[CAMPFIRE] Client burnall command detected')
				app.send('command:burntest', {})
			} else if (text.startsWith('/checkcollider')) {
				console.log('[CAMPFIRE] Checking collider')
				const distance = localPlayer.position.distanceTo(app.position)
				console.log(`[CAMPFIRE] Player distance to fire center: ${distance.toFixed(2)}`)
				console.log(`[CAMPFIRE] Fire damage radius: ${CONFIG.DAMAGE_RADIUS}`)
				console.log(`[CAMPFIRE] Player should be damaged: ${distance <= CONFIG.DAMAGE_RADIUS}`)
				
				// Log app position and player position
				console.log(`[CAMPFIRE] App position:`, app.position)
				console.log(`[CAMPFIRE] Player position:`, localPlayer.position)
			}
		}
	})

	// Get an available particle from the pool
	function getParticle() {
		try {
			if (inactiveIndices.length === 0) return null;
			const index = inactiveIndices.pop();
			return particles[index];
		} catch (error) {
			console.error('[CAMPFIRE] Error getting particle:', error);
			return null;
		}
	}

	// Spawn a new particle
	function spawnParticle() {
		try {
			const particle = getParticle();
			if (!particle) return;

			// Random position within spawn radius (concentrated at base)
			const angle = num(0, 1, 2) * Math.PI * 2;
			// Ensure radius is positive
			const spawnRadius = Math.max(0.1, CONFIG.SPAWN_RADIUS);
			const radius = Math.pow(num(0, 1, 2), 0.5) * spawnRadius; // Square root for more concentration in center
			particle.position.set(
				Math.cos(angle) * radius,
				0,
				Math.sin(angle) * radius
			);

			// Velocity mostly upward with slight variation
			const speed = CONFIG.MIN_SPEED + num(0, 1, 2) * (CONFIG.MAX_SPEED - CONFIG.MIN_SPEED);
			const horizontalDirection = num(0, 1, 2) * Math.PI * 2;
			const horizontalStrength = 0.3; // More horizontal movement for radiation cloud
			
			// Set velocity 
			if (!particle.velocity) {
				particle.velocity = { x: 0, y: 0, z: 0 };  // Simple object instead of Vector3
				particle.velocity.set = function(x, y, z) {  // Add a set method
					this.x = x;
					this.y = y;
					this.z = z;
				};
			}
			particle.velocity.set(
				speed * horizontalStrength * Math.cos(horizontalDirection),
				speed * (0.7 + 0.3 * num(0, 1, 2)), // Mostly upward
				speed * horizontalStrength * Math.sin(horizontalDirection)
			);

			// Set initial scale
			const scale = CONFIG.MIN_SCALE + num(0, 1, 2) * (CONFIG.MAX_SCALE - CONFIG.MIN_SCALE);
			particle.scale.set(scale, scale, scale);
			particle.maxScale = scale;  // Store for later scaling

			// Reset lifetime
			particle.lifetime = 0;
			
			// Initialize text with random character if it exists
			if (particle.text) {
				// Force check if text reference is valid
				try {
					const charSet = particle.charSet || ['☢', '☣'];  // Simplified character set
					particle.text.value = charSet[Math.floor(num(0, 1, 2) * charSet.length)];
					particle.text.color = '#39ff14'; // Start with bright green
					particle.text.opacity = 0.5; // Start somewhat transparent
					
					// Make sure text is visible
					particle.backgroundColor = 'rgba(0,0,0,0)'; // Transparent
					
					// Only log 1% of the time to avoid console spam
					if (num(0, 1, 2) < 0.01) { 
						console.log(`[CAMPFIRE] Particle spawned with symbol: ${particle.text.value}`);
					}
				} catch (textError) {
					console.error('[CAMPFIRE] Error setting particle text:', textError);
					
					// Try to recreate text if it doesn't exist
					if (!particle.text.value) {
						try {
							console.log('[CAMPFIRE] Recreating text element for particle');
							const text = app.create('uitext', {
								value: '☢',
								fontSize: 8,
								color: '#39ff14',
								textAlign: 'center',
								verticalAlign: 'middle',
								padding: 0,
								fontFamily: 'monospace',
								width: '100%',
								height: '100%'
							});
							
							// Clear and re-add
							while (particle.children.length > 0) {
								particle.remove(particle.children[0]);
							}
							
							particle.add(text);
							particle.text = text;
							particle.charSet = ['☢', '☣'];  // Simplified character set
						} catch (recreateError) {
							console.error('[CAMPFIRE] Failed to recreate text:', recreateError);
						}
					}
				}
			} else {
				// If no text exists, try to create it
				try {
					console.log('[CAMPFIRE] Creating missing text element for particle');
					const text = app.create('uitext', {
						value: '☢',
						fontSize: 8,
						color: '#39ff14',
						textAlign: 'center',
						verticalAlign: 'middle',
						padding: 0,
						fontFamily: 'monospace',
						width: '100%',
						height: '100%'
					});
					
					particle.add(text);
					particle.text = text;
					particle.charSet = ['☢', '☣'];
				} catch (createError) {
					console.error('[CAMPFIRE] Failed to create text for particle:', createError);
				}
			}

			// Make particle visible and active
			particle.visible = true;
			particle.active = true;

		} catch (error) {
			console.error('[CAMPFIRE] Error spawning particle:', error);
		}
	}
	
	// Visualize fire damage radius
	console.log('[CAMPFIRE] Visualizing fire damage radius');

	// Output diagnostic information 
	console.log(`[CAMPFIRE] Damage radius: ${CONFIG.DAMAGE_RADIUS}`);
	console.log(`[CAMPFIRE] Fire position: ${JSON.stringify(app.position)}`);

	// Set up the update loop
	let lastBurst = 0

	// Track radiation level for player (0-100)
	let radiationLevel = 0
	let maxRadiationLevel = 100
	// How quickly radiation builds up when in radiation zone
	const RADIATION_BUILDUP_RATE = 10  // points per second
	// How quickly radiation dissipates when away from radiation
	const RADIATION_DECAY_RATE = 5    // points per second
	
	// Remove the UI components that are now managed by WastelandHUD.js
	// We don't need to create healthBarContainer, compassContainer, capsContainer here anymore
	// Instead, we'll use events to communicate with the HUD

	// Set up audio elements
	let radiationAudio = null
	let geigerAudio = null
	let damageSfx = null
	let warningSfx = null
	let nextGeigerTime = 0
	let lastPlayerDistance = 999
	let hasPlayedWarning = false
	let warningCooldown = 0
	
	// Helper function to calculate distance between player and radiation source
	function getPlayerDistance() {
		const player = world.getPlayer()
		if (!player) return 999
		
		const playerPos = player.position
		const cloudPos = app.position
		const dx = playerPos.x - cloudPos.x
		const dy = playerPos.y - cloudPos.y
		const dz = playerPos.z - cloudPos.z
		return Math.sqrt(dx*dx + dy*dy + dz*dz)
	}

	// Helper function for creating audio elements
	function createAudio(config, options) {
		if (!config) return null
		
		const audio = app.create('audio', {
			src: config.url,
			...options
		})
		
		app.add(audio)
		return audio
	}

	if (app.config.radiationAudio) {
		// Create radiation ambience audio
		radiationAudio = createAudio(app.config.radiationAudio, {
			volume: CONFIG.AUDIO_VOLUME,
			spatial: true,
			refDistance: app.config.refDistance || 3,
			maxDistance: app.config.maxDistance || 20,
			rolloffFactor: app.config.rolloffFactor || 1.5,
			distanceModel: app.config.distanceModel || 'inverse',
			loop: true,
			panning: CONFIG.AUDIO_PANNING * (num(0, 1, 2) > 0.5 ? 1 : -1)
		})
		
		// Start playing the radiation ambience
		if (radiationAudio) radiationAudio.play()
	}

	// Setup Geiger counter effect
	geigerAudio = app.config.geigerAudio ? createAudio(app.config.geigerAudio, {
		volume: CONFIG.GEIGER_VOLUME,
		spatial: false,
		loop: false
	}) : null

	// Setup damage sound effect
	damageSfx = app.config.damageSfx ? createAudio(app.config.damageSfx, {
		volume: CONFIG.DAMAGE_SFX_VOLUME,
		spatial: false,
		loop: false
	}) : null

	// Setup warning sound effect
	warningSfx = app.config.warningSfx ? createAudio(app.config.warningSfx, {
		volume: CONFIG.WARNING_SFX_VOLUME,
		spatial: false,
		loop: false
	}) : null

	// Set up audio event listener
	app.on('audio:play', (data) => {
		if (data.type === 'radiation-damage' && damageSfx) {
			damageSfx.stop();
			damageSfx.play();
			
			// Apply a random slight pitch variation for variety using num() instead of Math.random()
			const pitchVariation = 0.1 // 10% pitch variance
			const basePitch = 1.0
			const pitch = basePitch + (num(0, 1, 2) * pitchVariation - pitchVariation/2)
			
			console.log('[RADIATION] Playing radiation damage sound effect')
		}
	});

	// Add a function to update Geiger counter based on player proximity
	function updateGeigerCounter(delta) {
		if (!geigerAudio) return
		
		const now = world.getTime()
		if (now < nextGeigerTime) return
		
		const distance = getPlayerDistance()
		lastPlayerDistance = distance
		
		// Only click if within range
		if (distance <= CONFIG.GEIGER_RANGE) {
			// Calculate intensity based on proximity (closer = more intense)
			const proximityFactor = 1 - Math.min(1, distance / CONFIG.GEIGER_RANGE)
			const clickInterval = CONFIG.GEIGER_MAX_INTERVAL - 
				(proximityFactor * (CONFIG.GEIGER_MAX_INTERVAL - CONFIG.GEIGER_MIN_INTERVAL))
			
			// Add some randomness to the interval
			const randomFactor = 0.2 // 20% variance
			const intervalVariance = clickInterval * randomFactor
			const finalInterval = clickInterval + (num(0, 1, 2) * intervalVariance - intervalVariance/2)
			
			// Set volume based on proximity too
			geigerAudio.volume = CONFIG.GEIGER_VOLUME * (0.5 + proximityFactor * 0.5)
			
			// Play the Geiger click
			geigerAudio.stop()
			geigerAudio.play()
			
			// Set next click time
			nextGeigerTime = now + finalInterval
		} else {
			// Outside of range, set a longer interval for checking again
			nextGeigerTime = now + 1.0
		}
	}

	// Add function to check player proximity for warning
	function checkRadiationWarning(delta) {
		if (!warningSfx) return
		
		// Decrease warning cooldown
		if (warningCooldown > 0) {
			warningCooldown -= delta
			return
		}
		
		const distance = getPlayerDistance()
		
		// Check if player just entered warning range
		const inWarningRange = distance <= CONFIG.WARNING_RANGE
		
		// Play warning when first entering range or after cooldown
		if (inWarningRange && (!hasPlayedWarning || lastPlayerDistance > CONFIG.WARNING_RANGE)) {
			warningSfx.stop()
			warningSfx.play()
			hasPlayedWarning = true
			warningCooldown = 30 // 30 seconds cooldown before warning can play again
		}
		
		// Reset warning flag when player leaves the area
		if (!inWarningRange && distance > CONFIG.WARNING_RANGE + 5) {
			hasPlayedWarning = false
		}
		
		// Update last known distance
		lastPlayerDistance = distance
	}

	// Function to update radiation level based on proximity to radiation cloud
	function updateRadiationLevel(delta) {
		const player = world.getPlayer()
		if (!player) return
		
		const distance = getPlayerDistance()
		
		// Determine if in radiation zone
		const inRadiationZone = distance <= CONFIG.DAMAGE_RADIUS
		
		// Update radiation level
		if (inRadiationZone) {
			// Radiation builds up faster the closer you are to the center
			const proximityFactor = 1 - Math.min(1, distance / CONFIG.DAMAGE_RADIUS)
			const buildupRate = RADIATION_BUILDUP_RATE * (0.5 + proximityFactor * 2.0) 
			
			// Increase radiation level
			radiationLevel = Math.min(maxRadiationLevel, radiationLevel + buildupRate * delta)
			
			// Log when radiation level changes significantly
			if (Math.floor(radiationLevel) % 10 === 0 && radiationLevel > 1) {
				console.log(`[RADIATION] Radiation increasing: ${radiationLevel.toFixed(1)}/${maxRadiationLevel}`);
			}
		} else {
			// Radiation decreases when away from radiation
			radiationLevel = Math.max(0, radiationLevel - RADIATION_DECAY_RATE * delta)
		}
		
		// Send event to update the HUD with current radiation level
		app.send('radiation:update', { 
			level: radiationLevel,
			maxLevel: maxRadiationLevel,
			inZone: inRadiationZone
		});
	}
    
    // Add a test function to manually increase radiation
    world.on('chat', (message) => {
        // Check if the message exists and is a string before trying string methods
        if (message && message.text && typeof message.text === 'string') {
            const text = message.text.trim();
            
            if (text === '/radtest') {
                console.log('[RADIATION] Manual radiation test requested');
                // Force radiation level to increase
                radiationLevel = Math.min(maxRadiationLevel, radiationLevel + 25);
                
                // Send event to update the HUD
                app.send('radiation:update', { 
                    level: radiationLevel,
                    maxLevel: maxRadiationLevel
                });
                
                console.log(`[RADIATION] Radiation level manually set to ${radiationLevel}`);
            }
        }
    })

	// Listen for damage events to play sound effect
	app.on('dmg', (data) => {
		// Check if the damage is to the local player and from radiation
		const localPlayer = world.getPlayer()
		if (localPlayer && data.playerId === localPlayer.id) {
			// Play radiation damage sound if from radiation source
			if (data.sourceType === 'campfire-direct' || data.sourceType === 'campfire-damage') {
				if (damageSfx) {
					// Play radiation damage sound
					damageSfx.stop() // Stop any currently playing sound
					damageSfx.play()
					
					// Apply a random slight pitch variation for variety using num() instead of Math.random()
					const pitchVariation = 0.1 // 10% pitch variance
					const basePitch = 1.0
					const pitch = basePitch + (num(0, 1, 2) * pitchVariation - pitchVariation/2)
					
					console.log('[RADIATION] Playing radiation damage sound effect')
				}
			}
		}
	})

	// Main update loop
	app.on('update', (delta) => {
		try {
			// Spawn new particles in bursts
			lastBurst += delta
			if (lastBurst >= CONFIG.BURST_INTERVAL) {
				lastBurst = 0
				// Spawn multiple particles per burst
				for (let i = 0; i < CONFIG.PARTICLES_PER_BURST; i++) {
					spawnParticle()
				}
			}

			// Update active particles
			for (let i = 0; i < particles.length; i++) {
				const particle = particles[i]
				if (!particle.active) continue

				// Add some turbulence/flickering to simulate radiation cloud
				particle.velocity.x += (num(0, 1, 2) - 0.5) * CONFIG.TURBULENCE * delta
				particle.velocity.z += (num(0, 1, 2) - 0.5) * CONFIG.TURBULENCE * delta

				// Update position based on velocity
				particle.position.x += particle.velocity.x * delta
				particle.position.y += particle.velocity.y * delta
				particle.position.z += particle.velocity.z * delta

				// Apply "negative gravity" to make particles rise
				particle.velocity.y += CONFIG.GRAVITY * delta

				// Update lifetime and check for despawn
				particle.lifetime += delta
				const lifeRatio = particle.lifetime / CONFIG.LIFETIME

				if (particle.lifetime >= CONFIG.LIFETIME) {
					particle.visible = false
					particle.active = false
					inactiveIndices.push(i)
				} else {
					// Scale effect - grow slightly then shrink
					let scaleMultiplier = 1.0
					if (lifeRatio < 0.3) {
						// Grow in the first 30% of lifetime
						scaleMultiplier = 1.0 + lifeRatio * 1.5
					} else {
						// Shrink for the rest
						scaleMultiplier = 1.45 - (lifeRatio - 0.3) * 1.45 / 0.7
					}
						
					// Apply scale to the UI container
					const newScale = CONFIG.MIN_SCALE + (CONFIG.MAX_SCALE - CONFIG.MIN_SCALE) * scaleMultiplier
					particle.scale.set(newScale, newScale, newScale)
					
					// Opacity effect - fade in then fade out
					let opacity = 1.0
					if (lifeRatio < 0.1) {
						// Fade in quickly
						opacity = lifeRatio * 10
					} else if (lifeRatio > 0.7) {
						// Fade out in the last 30%
						opacity = 1.0 - ((lifeRatio - 0.7) / 0.3)
					}
					
					// Apply the opacity to the particle text
					if (particle.text) {
						particle.text.opacity = opacity
						
						// Only change characters and color less frequently to improve performance
						// Change character much less often (1% chance instead of 5%)
						if (num(0, 1, 2) < 0.01) {
							const charSet = particle.charSet || ['☢', '☣'];
							particle.text.value = charSet[Math.floor(num(0, 1, 2) * charSet.length)];
							
							// Update color at the same time as character change
							// Simplified color - just go from green to yellow without calculating every frame
							const stage = Math.floor(lifeRatio * 3); // 0, 1, or 2
							if (stage === 0) {
								particle.text.color = '#39ff14'; // Bright green
							} else if (stage === 1) {
								particle.text.color = '#a0ff14'; // Yellow-green
							} else {
								particle.text.color = '#ffff14'; // Yellow
							}
						}
					}
				}
			}

			// Update radiation level
			updateRadiationLevel(delta)
			
			// Update Geiger counter
			updateGeigerCounter(delta)
			
			// Check if warning needs to be played
			checkRadiationWarning(delta)
			
		} catch (error) {
			console.error('[CAMPFIRE] Error in update:', error);
		}
	})
	
	// Add initial location information
	app.send('location:update', { 
		name: 'TOXIC VALLEY',
		region: 'wasteland'
	});
	
	// Rest of client-side initialization
	// ... existing code ...
} 