// =================================================================
// Simple Timer Display Script
// Displays a timer starting at 0 in HH:MM:SS format as a compact, billboarded UI text label.
// =================================================================

// Ensure app exists
if (!app) {
  console.error('[TIMER DISPLAY] App not found');
  return;
}

// Create UI container
const ui = app.create('ui', {
  width: 150, // Compact width
  height: 30, // Compact height
  backgroundColor: 'rgba(0,15,30,0.9)', // Dark background
});
ui.billboard = 'y'; // Face camera on Y-axis
ui.position.set(0, 1.5, 0); // 1.5 units above app
ui.borderRadius = 8; // Subtle curve
ui.padding = 5; // Tight padding
ui.justifyContent = 'center';
ui.alignItems = 'center';

// Create UI text for timer
const timerText = app.create('uitext');
timerText.value = 'Time: 00:00:00'; // Initial value
timerText.fontSize = 16; // Small font
timerText.color = '#ffffff'; // White text
timerText.textAlign = 'center';

// Add text to UI container
ui.add(timerText);

// Add UI container to app
app.add(ui);

// Timer variable
let elapsedTime = 0;

// Function to format time in HH:MM:SS
function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Update loop: Update timer text
app.on('update', (dt) => {
  // Increment timer using delta time (dt, in seconds)
  elapsedTime += dt;
  timerText.value = `Time: ${formatTime(elapsedTime)}`;
});