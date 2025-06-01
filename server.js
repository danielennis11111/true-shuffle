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
const USER_DATA_DIR = path.join(__dirname, 'user-data');

async function ensureDirectories() {
  try {
    await fs.access(SETTINGS_DIR);
  } catch {
    await fs.mkdir(SETTINGS_DIR, { recursive: true });
  }
  
  try {
    await fs.access(USER_DATA_DIR);
  } catch {
    await fs.mkdir(USER_DATA_DIR, { recursive: true });
  }
}
ensureDirectories();

// Enhanced default settings for production
const defaultSettings = {
  // Core Music Preferences
  genres: ['pop', 'rock', 'hip-hop', 'electronic', 'jazz', 'classical'],
  moods: ['happy', 'energetic', 'chill', 'focus'],
  languages: ['en'], // Language filtering
  yearFrom: 1950,
  yearTo: 2024,
  shuffleType: 'true-random',
  
  // Advanced Filters
  popularity: 70,
  explicitContent: true,
  trackDurationMin: 30,
  trackDurationMax: 600,
  
  // App Behavior
  autoAdvance: true,
  crossfade: false,
  volumeNormalization: false,
  
  // UI Preferences
  darkMode: true,
  compactMode: false,
  showLyrics: false,
  showQueue: true,
  
  // Privacy & Data
  saveListeningHistory: true,
  shareData: false,
  analyticsEnabled: true,
  
  // Legacy settings for backward compatibility
  autoPlaylist: true,
  backgroundEffects: true,
  skipShortTracks: false,
  enableNotifications: true,
  enableVisualization: true,
  maxQueueSize: 50,
  crossfadeEnabled: false,
  libraryRatio: 50
};

// Middleware to verify Spotify token and get user info
async function verifySpotifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No valid authorization token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Set the access token for this request
    spotifyApi.setAccessToken(token);
    
    // Verify token by getting user profile
    const userProfile = await spotifyApi.getMe();
    req.user = {
      id: userProfile.body.id,
      email: userProfile.body.email,
      name: userProfile.body.display_name,
      images: userProfile.body.images,
      country: userProfile.body.country,
      product: userProfile.body.product // 'premium' or 'free'
    };
    
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Get user subscription status (for monetization)
async function getUserSubscriptionStatus(userId) {
  try {
    const userDataFile = path.join(USER_DATA_DIR, `${userId}.json`);
    const userData = await fs.readFile(userDataFile, 'utf8');
    const user = JSON.parse(userData);
    return {
      plan: user.plan || 'free',
      trialEndsAt: user.trialEndsAt || null,
      subscriptionEndsAt: user.subscriptionEndsAt || null,
      isPremium: user.plan === 'premium' || user.plan === 'pro' || user.plan === 'basic'
    };
  } catch (error) {
    // New user - default to free with trial
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial
    
    const newUser = {
      userId,
      plan: 'free',
      trialEndsAt: trialEndDate.toISOString(),
      subscriptionEndsAt: null,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    
    // Save new user data
    const userDataFile = path.join(USER_DATA_DIR, `${userId}.json`);
    await fs.writeFile(userDataFile, JSON.stringify(newUser, null, 2));
    
    return {
      plan: 'free',
      trialEndsAt: newUser.trialEndsAt,
      subscriptionEndsAt: null,
      isPremium: false
    };
  }
}

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

// Get user profile and subscription info
app.get('/api/user/profile', verifySpotifyToken, async (req, res) => {
  try {
    const subscriptionStatus = await getUserSubscriptionStatus(req.user.id);
    
    res.json({
      ...req.user,
      subscription: subscriptionStatus
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Load user settings with authentication
app.get('/api/settings/:userId', verifySpotifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can access these settings
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied - can only access your own settings' });
    }
    
    const settingsFile = path.join(SETTINGS_DIR, `${userId}.json`);
    
    try {
      const settingsData = await fs.readFile(settingsFile, 'utf8');
      const savedSettings = JSON.parse(settingsData);
      
      // Merge with current defaults to ensure all new settings are available
      const settings = { ...defaultSettings, ...savedSettings.settings || savedSettings };
      
      console.log(`✅ Settings loaded for user: ${userId}`);
      res.json({
        settings,
        metadata: {
          lastUpdated: savedSettings.lastUpdated || null,
          version: savedSettings.version || '1.0'
        }
      });
    } catch (error) {
      // If file doesn't exist, return default settings
      console.log(`📝 Creating default settings for new user: ${userId}`);
      res.json({
        settings: defaultSettings,
        metadata: {
          lastUpdated: null,
          version: '2.1'
        }
      });
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// Save user settings with authentication and validation
app.post('/api/settings/:userId', verifySpotifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { settings } = req.body;
    
    // Verify user can modify these settings
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied - can only modify your own settings' });
    }
    
    if (!settings) {
      return res.status(400).json({ error: 'Settings data is required' });
    }
    
    // Get user subscription status
    const subscription = await getUserSubscriptionStatus(userId);
    
    // Validate settings based on subscription
    const validatedSettings = validateUserSettings(settings, subscription);
    
    // Prepare settings object for storage
    const settingsToSave = {
      settings: validatedSettings,
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: '2.1',
        userPlan: subscription.plan,
        updatedBy: req.user.email || req.user.id
      }
    };
    
    const settingsFile = path.join(SETTINGS_DIR, `${userId}.json`);
    await fs.writeFile(settingsFile, JSON.stringify(settingsToSave, null, 2));
    
    console.log(`✅ Settings saved for user: ${userId} (${subscription.plan} plan)`);
    res.json({ 
      success: true, 
      message: 'Settings saved successfully',
      settings: validatedSettings,
      subscription: subscription
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Validate settings based on user subscription
function validateUserSettings(settings, subscription) {
  const validated = { ...defaultSettings, ...settings };
  
  // Free tier limitations
  if (!subscription.isPremium) {
    // Limit number of genres for free users
    if (validated.genres && validated.genres.length > 6) {
      validated.genres = validated.genres.slice(0, 6);
    }
    
    // Limit number of languages for free users
    if (validated.languages && validated.languages.length > 2) {
      validated.languages = validated.languages.slice(0, 2);
    }
    
    // Disable premium features for free users
    validated.showLyrics = false;
    validated.volumeNormalization = false;
    validated.crossfade = false;
  }
  
  // Validate year range
  if (validated.yearFrom > validated.yearTo) {
    validated.yearFrom = defaultSettings.yearFrom;
    validated.yearTo = defaultSettings.yearTo;
  }
  
  // Validate numeric ranges
  validated.popularity = Math.max(0, Math.min(100, validated.popularity || defaultSettings.popularity));
  validated.trackDurationMin = Math.max(15, Math.min(300, validated.trackDurationMin || defaultSettings.trackDurationMin));
  validated.trackDurationMax = Math.max(120, Math.min(1800, validated.trackDurationMax || defaultSettings.trackDurationMax));
  
  return validated;
}

// Update user subscription status (for monetization)
app.post('/api/user/subscription', verifySpotifyToken, async (req, res) => {
  try {
    const { plan, subscriptionEndsAt } = req.body;
    const userId = req.user.id;
    
    const userDataFile = path.join(USER_DATA_DIR, `${userId}.json`);
    let userData = {};
    
    try {
      const existingData = await fs.readFile(userDataFile, 'utf8');
      userData = JSON.parse(existingData);
    } catch (error) {
      // New user data
      userData = {
        userId,
        createdAt: new Date().toISOString()
      };
    }
    
    // Update subscription
    userData.plan = plan;
    userData.subscriptionEndsAt = subscriptionEndsAt;
    userData.lastUpdated = new Date().toISOString();
    userData.lastActive = new Date().toISOString();
    
    await fs.writeFile(userDataFile, JSON.stringify(userData, null, 2));
    
    console.log(`✅ Subscription updated for user: ${userId} -> ${plan}`);
    res.json({ success: true, message: 'Subscription updated successfully' });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
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
  console.log(`📁 User settings stored in: ${SETTINGS_DIR}`);
  console.log(`👤 User data stored in: ${USER_DATA_DIR}`);
}); 