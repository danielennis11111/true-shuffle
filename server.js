require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const SpotifyWebApi = require('spotify-web-api-node');

const app = express();
const PORT = process.env.PORT || 3000;

// Add JSON parsing middleware
app.use(express.json());

// Initialize Spotify API
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID || '69889249cd33426ab241d33713e55fad',
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI || 'http://127.0.0.1:3000/callback'
});

// Ensure user settings directory exists
const SETTINGS_DIR = path.join(__dirname, 'user-settings');
async function ensureSettingsDir() {
  try {
    await fs.access(SETTINGS_DIR);
  } catch {
    await fs.mkdir(SETTINGS_DIR, { recursive: true });
  }
}
ensureSettingsDir();

// Main route - serve our new app (MUST come before static middleware)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static files (but disable automatic index.html serving)
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Spotify login route
app.get('/login', (req, res) => {
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'user-read-recently-played',
    'user-top-read',
    'user-library-read',
    'user-library-modify',
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-private',
    'playlist-modify-public',
    'streaming'
  ];
  
  const authUrl = spotifyApi.createAuthorizeURL(scopes, 'state', true);
  res.redirect(authUrl);
});

// Spotify callback route
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('Authorization code is missing');
  }
  
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;
    
    // Redirect to the app with tokens in hash (client-side)
    res.redirect(`/#access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`);
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    res.status(500).send('Authentication failed');
  }
});

// Load user settings
app.get('/api/settings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const settingsFile = path.join(SETTINGS_DIR, `${userId}.json`);
    
    try {
      const settingsData = await fs.readFile(settingsFile, 'utf8');
      const settings = JSON.parse(settingsData);
      res.json(settings);
    } catch (error) {
      // If file doesn't exist, return default settings
      const defaultSettings = {
        genres: ['pop', 'rock', 'hip-hop', 'electronic', 'jazz', 'classical'],
        moods: ['happy', 'energetic', 'chill', 'focus'],
        popularity: 50,
        libraryRatio: 50,
        autoPlaylist: true,
        backgroundEffects: true,
        skipShortTracks: false,
        yearFrom: 1950,
        yearTo: 2024,
        shuffleType: 'true-random',
        enableNotifications: true,
        enableVisualization: true,
        maxQueueSize: 50,
        crossfadeEnabled: false
      };
      res.json(defaultSettings);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// Save user settings  
app.post('/api/settings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = req.body;
    
    // Add timestamp for tracking
    settings.lastUpdated = new Date().toISOString();
    
    const settingsFile = path.join(SETTINGS_DIR, `${userId}.json`);
    await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2));
    
    console.log(`✅ Settings saved for user: ${userId}`);
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Catch-all route for SPA - only for paths that don't start with /api
app.get('*', (req, res) => {
  // Don't interfere with static file serving or API routes
  if (req.path.includes('.') || req.path.startsWith('/api')) {
    return res.status(404).send('File not found');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ True Shuffle server is running!`);
  console.log(`🌐 Access the app at: http://127.0.0.1:${PORT}`);
  console.log(`⚠️  Important: Use 127.0.0.1 instead of localhost for Spotify authentication`);
}); 