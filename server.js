require('dotenv').config();
const express = require('express');
const path = require('path');
const SpotifyWebApi = require('spotify-web-api-node');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Spotify API
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID || '69889249cd33426ab241d33713e55fad',
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI || 'http://127.0.0.1:3000/callback'
});

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

// Catch-all route for SPA - only for paths that don't start with /api
app.get('*', (req, res) => {
  // Don't interfere with static file serving
  if (req.path.includes('.')) {
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