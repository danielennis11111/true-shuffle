// True Shuffle App.js
// Handles Spotify authentication, playlist fetching, and playback

// Global variables
let accessToken = null;
let refreshToken = null;
let player = null;
let deviceId = null;
let currentTrack = null;
let currentShuffleType = 'fisherYates';
let shuffledTracks = [];
let currentTrackIndex = 0;
let likedSongs = new Set();
let isTrackLiked = false;
let audioAnalysisData = null;
let playbackState = {
  isPlaying: false,
  currentTrack: null,
  progressMs: 0,
  durationMs: 0
};
let progressInterval = null;
let colorThief = null; // Initialize safely after DOM loads
let playlistCache = {
  likedFromTrueShuffle: null,
  heardOnTrueShuffle: null
};
let spotifyPlayer;
let isPlaying = false;
let selectedMood = null; // New: track selected mood
let selectedGenres = []; // New: track selected genres for mix mode
let currentTrackFeatures = null; // New: track audio features
let currentUserId = null; // Current logged-in user ID

// Mood configurations for audio features
const moodConfigs = {
  happy: {
    name: "Happy & Upbeat",
    icon: "fas fa-sun",
    color: "text-yellow-400",
    filters: {
      min_valence: 0.6,
      min_energy: 0.5,
      target_valence: 0.8,
      target_energy: 0.7
    }
  },
  chill: {
    name: "Chill & Relaxed",
    icon: "fas fa-leaf", 
    color: "text-green-400",
    filters: {
      max_energy: 0.6,
      min_acousticness: 0.3,
      target_valence: 0.5,
      target_energy: 0.3
    }
  },
  energetic: {
    name: "High Energy",
    icon: "fas fa-bolt",
    color: "text-yellow-400", 
    filters: {
      min_energy: 0.7,
      min_danceability: 0.6,
      min_tempo: 120,
      target_energy: 0.9,
      target_danceability: 0.8
    }
  },
  melancholic: {
    name: "Melancholic & Sad",
    icon: "fas fa-cloud-rain",
    color: "text-blue-400",
    filters: {
      max_valence: 0.4,
      max_energy: 0.5,
      target_valence: 0.2,
      target_energy: 0.3
    }
  },
  angry: {
    name: "Angry & Intense",
    icon: "fas fa-fire",
    color: "text-red-400",
    filters: {
      min_energy: 0.8,
      max_valence: 0.3,
      min_loudness: -8,
      target_energy: 0.9,
      target_valence: 0.1
    }
  },
  focus: {
    name: "Focus & Study",
    icon: "fas fa-brain",
    color: "text-purple-400",
    filters: {
      min_instrumentalness: 0.5,
      max_speechiness: 0.3,
      max_energy: 0.6,
      target_instrumentalness: 0.8,
      target_energy: 0.4
    }
  },
  party: {
    name: "Party & Dance",
    icon: "fas fa-party-horn",
    color: "text-pink-400",
    filters: {
      min_danceability: 0.7,
      min_energy: 0.6,
      min_tempo: 100,
      target_danceability: 0.9,
      target_energy: 0.8
    }
  }
};

// Get DOM elements - REVERTED TO ORIGINAL FOR WORKING CONTROLS
const loginButton = document.getElementById('login-btn');
const authLoginButton = document.getElementById('auth-login-button');
const logoutButton = document.getElementById('logout-btn');
const userProfileElement = document.getElementById('user-profile');
const userNameElement = document.getElementById('user-name');
const userImageElement = document.getElementById('user-image');
const mainContentElement = document.getElementById('main-content');
const authMessageElement = document.getElementById('auth-message');
const playPauseButton = document.getElementById('play-pause');
const likeButton = document.getElementById('like-button');
const prevTrackButton = document.getElementById('prev-track');
const nextTrackButton = document.getElementById('next-track');
const getNewTracksButton = document.getElementById('get-new-tracks');
const shuffleSelect = document.getElementById('shuffle-select');

// Progress bar and time elements
const progressBar = document.getElementById('progress-bar');
const currentTimeElement = document.getElementById('current-time');
const totalTimeElement = document.getElementById('total-time');

// New: Mood and analysis elements
const moodSelector = document.getElementById('mood-selector');
const genreSelector = document.getElementById('genre-selector');
let customizationSidebar = document.getElementById('customization-sidebar');

// DOM Elements that need to be initialized after DOMContentLoaded
let trackNameElement;
let artistNameElement;
let albumNameElement;
let vinylRecord;
let albumImageElement;
let albumCoverElement;

// Customization settings
let customSettings = {
  yearFrom: 1950,
  yearTo: 2024,
  popularity: 50,
  trackDurationMin: 30,
  trackDurationMax: 600,
  yearFilter: false,
  genreFilter: false,
  selectedGenres: ['pop', 'rock', 'hip-hop', 'electronic', 'jazz', 'classical'],
  moodFilter: false,
  selectedMood: null
};

// Safe ColorThief initialization - KEEP THIS FIX
function initializeColorThief() {
  try {
    if (typeof ColorThief !== 'undefined') {
      colorThief = new ColorThief();
      console.log('🎨 ✅ ColorThief initialized successfully');
      return true;
    } else {
      console.log('🎨 ⚠️ ColorThief library not available, using fallback colors');
      return false;
    }
  } catch (error) {
    console.log('🎨 ⚠️ ColorThief initialization failed, using fallback:', error.message);
    return false;
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 Document loaded, initializing True Shuffle 2.1...');
  
  // KEEP console error suppression - this was helpful
  const originalError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    
    // Suppress known non-critical errors that clutter the console
    if (message.includes('PlayLoad event failed') ||
        message.includes('cpapi.spotify.com') ||
        message.includes('robustness level') ||
        message.includes('CloudPlaybackClientError') ||
        message.includes('The AudioContext was not allowed to start') ||
        message.includes('autoplay policy') ||
        message.includes('Web Playback SDK Quick Start') ||
        message.includes('Network request failed') ||
        message.includes('GET https://api.spotify.com/v1/tracks/') && (message.includes('400 (Bad Request)') || message.includes('404 (Not Found)'))) {
      return; // Silently ignore these errors
    }
    
    // Show other errors normally
    originalError.apply(console, args);
  };
  
  initialize();
});

// Initialize the app - SIMPLIFIED VERSION
async function initialize() {
    console.log('🚀 Initializing True Shuffle 2.1...');
    
    try {
        // Show loading
        showLoading();
        
        // Initialize DOM elements first
        initializeDOMElements();
        
        // Initialize ColorThief safely - KEEP THIS FIX
        initializeColorThief();
        
        // Initialize enhanced settings system
        await initializeSettings();
        
        // Initialize monetization system
        if (typeof window.monetization !== 'undefined') {
            console.log('💰 Monetization system loaded');
            // Update usage display
            updateUsageDisplay();
        }
        
        // Set up event listeners
        setupEventListeners();
        
        // Check for authentication
        console.log('🔐 Checking authentication state...');
        
        // First check if we're returning from Spotify auth
        if (window.location.hash) {
            console.log('🔄 Processing auth callback...');
            handleAuthCallback();
            return; // Let the callback handle the rest
        }
        
        // Check for existing valid token
        const existingToken = localStorage.getItem('spotify_access_token');
        const tokenExpiry = localStorage.getItem('spotify_token_expires');
        
        if (existingToken && tokenExpiry) {
            const now = Date.now();
            const expiryTime = parseInt(tokenExpiry);
            
            if (now < expiryTime) {
                console.log('✅ Valid token found, auto-logging in...');
                accessToken = existingToken;
                refreshToken = localStorage.getItem('spotify_refresh_token');
                
                // Load user data and show profile
                await loadUserData();
            } else {
                console.log('⏰ Token expired, clearing auth...');
                clearAuthTokens();
                showAuthMessage();
            }
        } else {
            console.log('❌ No valid token found, showing auth...');
            showAuthMessage();
        }
        
        // Check if this is a first-time user
        if (isFirstTimeUser()) {
            console.log('👋 First-time user detected');
            // Don't show onboarding yet, wait until after auth
        }
        
        // Set up user data loading
        currentUserId = checkExistingAuth();
        if (currentUserId) {
            await loadUserData();
        }
        
        console.log('✅ App initialization complete');
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showAuthMessage();
    } finally {
        hideLoading();
    }
}

// Setup event listeners
function setupEventListeners() {
  try {
    console.log('🔗 Setting up event listeners...');
    
    // Login/logout buttons
    if (loginButton) {
      loginButton.addEventListener('click', redirectToSpotifyAuth);
      console.log('✅ Login button listener added');
    }
    
    if (authLoginButton) {
      authLoginButton.addEventListener('click', redirectToSpotifyAuth);
      console.log('✅ Auth login button listener added');
    }
    
    if (logoutButton) {
      logoutButton.addEventListener('click', logout);
      console.log('✅ Logout button listener added');
    }
    
    // Onboarding buttons
    const startOnboardingBtn = document.getElementById('start-onboarding');
    const skipOnboardingBtn = document.getElementById('skip-onboarding');
    
    if (startOnboardingBtn) {
      startOnboardingBtn.addEventListener('click', () => {
        console.log('🎯 Starting onboarding tour...');
        completeOnboarding();
        hideOnboardingModal();
        // Could add highlights or tooltips here in the future
      });
      console.log('✅ Start onboarding button listener added');
    }
    
    if (skipOnboardingBtn) {
      skipOnboardingBtn.addEventListener('click', () => {
        console.log('⏭️ Skipping onboarding...');
        completeOnboarding();
        hideOnboardingModal();
      });
      console.log('✅ Skip onboarding button listener added');
    }
    
    // Settings modal functionality
    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    const saveSettingsBtn = document.getElementById('save-settings');
    const resetSettingsBtn = document.getElementById('reset-settings');
    
    if (settingsButton) {
      settingsButton.addEventListener('click', () => {
        console.log('⚙️ Opening settings modal...');
        showSettingsModal();
      });
      console.log('✅ Settings button listener added');
    }
    
    if (closeSettingsBtn) {
      closeSettingsBtn.addEventListener('click', () => {
        console.log('❌ Closing settings modal...');
        hideSettingsModal();
      });
      console.log('✅ Close settings button listener added');
    }
    
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => {
        console.log('💾 Saving settings...');
        saveUserSettings();
      });
      console.log('✅ Save settings button listener added');
    }
    
    if (resetSettingsBtn) {
      resetSettingsBtn.addEventListener('click', () => {
        console.log('🔄 Resetting settings...');
        resetUserSettings();
      });
      console.log('✅ Reset settings button listener added');
    }

    // Settings modal overlay click to close
    if (settingsModal) {
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
          hideSettingsModal();
        }
      });
    }
    
    // Discovery buttons
    const discoverBtn = document.getElementById('discover-btn');
    const discoverMoreBtn = document.getElementById('discover-more-btn');
    const backToConfigBtn = document.getElementById('back-to-config-btn');
    
    if (discoverBtn) {
      discoverBtn.addEventListener('click', () => {
        console.log('🔄 Starting music discovery...');
        discoverMusic();
      });
      console.log('✅ Discover button listener added');
    }
    
    if (discoverMoreBtn) {
      discoverMoreBtn.addEventListener('click', () => {
        console.log('🔄 Discovering more music...');
        fetchRecommendations();
      });
      console.log('✅ Discover more button listener added');
    }
    
    if (backToConfigBtn) {
      backToConfigBtn.addEventListener('click', showRadioSection);
      console.log('✅ Back to config button listener added');
    }
    
    // Date filter toggle
    const dateFilterToggle = document.getElementById('dateFilterToggle');
    const dateRangeInputs = document.getElementById('dateRangeInputs');
    
    if (dateFilterToggle && dateRangeInputs) {
      dateFilterToggle.addEventListener('change', function() {
        if (this.checked) {
          dateRangeInputs.classList.remove('hidden');
        } else {
          dateRangeInputs.classList.add('hidden');
        }
      });
      console.log('✅ Date filter toggle listener added');
    }
    
    // Shuffle type selector
    const shuffleTypeSelect = document.getElementById('shuffle-type');
    if (shuffleTypeSelect) {
      shuffleTypeSelect.addEventListener('change', function() {
        const moodSelector = document.getElementById('mood-selector');
        const genreSelector = document.getElementById('genre-selector');
        
        // Hide all selectors first
        if (moodSelector) moodSelector.classList.add('hidden');
        if (genreSelector) genreSelector.classList.add('hidden');
        
        // Show relevant selector
        if (this.value === 'mood-based' && moodSelector) {
          moodSelector.classList.remove('hidden');
        } else if (this.value === 'genre-mix' && genreSelector) {
          genreSelector.classList.remove('hidden');
        }
        
        changeShuffleType(this.value);
      });
      console.log('✅ Shuffle type selector listener added');
      
      // Set initial shuffle description
      updateShuffleDescription(shuffleTypeSelect.value);
    }

    // Player controls
    if (playPauseButton) {
      playPauseButton.addEventListener('click', togglePlayPause);
      console.log('✅ Play/pause button listener added');
    }
    
    if (prevTrackButton) {
      prevTrackButton.addEventListener('click', playPreviousTrack);
      console.log('✅ Previous track button listener added');
    }
    
    if (nextTrackButton) {
      nextTrackButton.addEventListener('click', playNextTrack);
      console.log('✅ Next track button listener added');
    }

    if (likeButton) {
      likeButton.addEventListener('click', toggleLikeSong);
      console.log('✅ Like button listener added');
    }

    // Progress bar click
    const progressBarContainer = document.querySelector('.progress-bar');
    if (progressBarContainer) {
      progressBarContainer.addEventListener('click', function(e) {
        if (window.spotifyPlayer && currentTrack) {
          const rect = this.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const percentage = clickX / rect.width;
          const seekTime = percentage * currentTrack.duration_ms;
          
          window.spotifyPlayer.seek(seekTime).then(() => {
            console.log('Seeked to', seekTime);
          });
        }
      });
      console.log('✅ Progress bar click listener added');
    }

    // Mood and genre selection buttons (event delegation)
    document.addEventListener('click', function(e) {
      if (e.target.closest('.mood-btn')) {
        const moodBtn = e.target.closest('.mood-btn');
        const mood = moodBtn.dataset.mood;
        selectMood(mood);
      }
      
      if (e.target.closest('.genre-btn')) {
        const genreBtn = e.target.closest('.genre-btn');
        const genre = genreBtn.dataset.genre;
        toggleGenre(genre);
      }
    });

    console.log('✅ Event listeners setup complete');
    
  } catch (error) {
    console.error('❌ Error setting up event listeners:', error);
  }
}

// Change shuffle type
function changeShuffleType(type) {
  console.log(`🔄 Changing shuffle type to: ${type}`);
  currentShuffleType = type;
  
  // Clear current queue when changing shuffle type
  shuffledTracks = [];
  currentTrackIndex = 0;
  currentTrack = null;
  
  // Update the shuffle description
  updateShuffleDescription(type);
  
  console.log(`✅ Shuffle type changed to: ${getShuffleDisplayName(type)}`);
}

// Update shuffle description based on type
function updateShuffleDescription(type) {
  const shuffleDescription = document.getElementById('shuffle-description');
  if (!shuffleDescription) return;
  
  let description = '';
  
  switch(type) {
    case 'advanced-true-shuffle':
      description = '<p><strong>Advanced True Shuffle</strong> begins with a song you\'ve liked but haven\'t heard in a while, then builds a continuously growing pool of tracks for an improved, truly random experience. Includes crossfade between songs and avoids repeats.</p>';
      break;
    case 'true-shuffle-all':
      description = '<p><strong>True Shuffle All</strong> discovers tracks from the entire Spotify catalog using advanced randomization techniques for a diverse musical experience.</p>';
      break;
    case 'true-shuffle-library':
      description = '<p><strong>True Shuffle Library</strong> focuses on your saved songs, playlists and followed artists for a more personalized but still truly random experience.</p>';
      break;
    default:
      description = '<p>Select a shuffle mode to begin your musical journey.</p>';
  }
  
  shuffleDescription.innerHTML = description;
}

// Redirect to Spotify authorization page
function redirectToSpotifyAuth() {
  console.log('🔐 Redirecting to Spotify Auth...');
  
  try {
    // Show loading indicator
    showLoading();
    
    // Generate a random state string for security
    const state = generateRandomString(16);
    
    // Store state in localStorage for verification
    localStorage.setItem('spotify_auth_state', state);
    
    // Redirect to server's login endpoint which handles Spotify auth
    window.location.href = '/login';
  } catch (error) {
    console.error('❌ Error during auth redirect:', error);
    hideLoading();
    showNotification('Authentication error. Please try again.', 'error');
  }
}

// Handle Spotify auth callback
function handleAuthCallback() {
  showLoading();
  
  console.log('🔗 Handling auth callback...');
  console.log('🌐 Current URL hash:', window.location.hash);
  
  // Get tokens from hash fragment (server redirects with tokens in hash)
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  accessToken = hashParams.get('access_token');
  refreshToken = hashParams.get('refresh_token');
  const expiresIn = hashParams.get('expires_in');
  
  console.log('🔑 Hash params found:', {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    expiresIn: expiresIn
  });
  
  if (accessToken) {
    console.log('✅ Access token received, length:', accessToken.length);
    
    // Store tokens
    localStorage.setItem('spotify_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('spotify_refresh_token', refreshToken);
    }
    if (expiresIn) {
      localStorage.setItem('spotify_token_expires', Date.now() + (expiresIn * 1000));
    }
    
    // Remove hash fragment from URL to prevent token exposure
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Load user data
    loadUserData();
  } else {
    console.warn('⚠️  No access token found in URL hash');
    showAuthMessage();
    hideLoading();
  }
}

// Check if we have existing auth
function checkExistingAuth() {
  accessToken = localStorage.getItem('spotify_access_token');
  refreshToken = localStorage.getItem('spotify_refresh_token');
  const tokenExpires = localStorage.getItem('spotify_token_expires');
  
  if (accessToken && tokenExpires && Date.now() < parseInt(tokenExpires)) {
    // Token is valid
    loadUserData();
  } else if (refreshToken) {
    // Try to refresh the token
    refreshAccessToken();
  } else {
    // No valid auth
    showAuthMessage();
  }
}

// Load user data from Spotify API
async function loadUserData() {
  try {
    console.log('👤 Loading user data from Spotify...');
    
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const userData = await response.json();
    console.log('✅ User data loaded:', userData);

    // Set current user ID for settings system
    currentUserId = userData.id;
    window.currentUserId = userData.id;
    console.log('👤 Current user ID set:', currentUserId);

    // Get DOM elements
    const userImageElement = document.getElementById('user-image');
    const userNameElement = document.getElementById('user-name');
    const userPlanElement = document.getElementById('user-plan');
    const userDisplayElement = document.getElementById('user-display');
    const loginButton = document.getElementById('login-btn');
    const usageStatsDisplay = document.getElementById('usage-stats-mini');

    // Update user profile information
    if (userData.images && userData.images.length > 0 && userImageElement) {
      userImageElement.src = userData.images[0].url;
      userImageElement.alt = userData.display_name || userData.id;
      console.log('🖼️ User avatar loaded:', userData.images[0].url);
    } else if (userImageElement) {
      // Fallback to default avatar
      userImageElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMxZGIyNTQiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTIgMTRDOC42ODYyOSAxNCA2IDE2LjY4NjMgNiAyMFYyMkgxOFYyMEMxOCAxNi42ODYzIDE1LjMxMzcgMTQgMTIgMTRaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+';
      userImageElement.alt = 'User Avatar';
      console.log('🖼️ Using default avatar');
    }

    if (userNameElement) {
      userNameElement.textContent = userData.display_name || userData.id;
      console.log('👤 User name set:', userData.display_name || userData.id);
    }

    // Determine user plan (Spotify doesn't provide subscription info via public API)
    if (userPlanElement) {
      // Check if user has premium by trying to access premium features
      userPlanElement.textContent = userData.product === 'premium' ? 'Premium' : 'Free Plan';
      console.log('💳 User plan:', userData.product || 'free');
    } else if (userPlanElement) {
      userPlanElement.textContent = 'Free Plan';
    }
    
    // Show user profile and hide login button
    if (userDisplayElement) {
      userDisplayElement.classList.remove('hidden');
      userDisplayElement.style.display = 'flex';
      console.log('✅ User profile shown');
    }
    
    if (usageStatsDisplay) {
      usageStatsDisplay.classList.remove('hidden');
      console.log('✅ Usage stats shown');
    }
    
    if (loginButton) {
      loginButton.classList.add('hidden');
      console.log('✅ Login button hidden');
    }

    // Update main UI elements
    const authSection = document.getElementById('auth-section');
    const mainContentElement = document.getElementById('main-content');
    const authMessageElement = document.getElementById('auth-message');
    
    if (authSection) authSection.classList.add('hidden');
    
    // Show main content
    if (mainContentElement) {
      mainContentElement.classList.remove('hidden');
      console.log('✅ Main content shown');
    }
    
    if (authMessageElement) {
      authMessageElement.classList.add('hidden');
    }

    // Initialize Spotify Player now that we have a valid token
    console.log('🎵 Initializing Spotify Web Playback SDK...');
    initializeSpotifyPlayer();

    // Create our special playlists if they don't exist
    console.log('📝 Ensuring True Shuffle playlists exist...');
    await ensureTrueShufflePlaylists(userData.id);

    // Load user settings from server
    console.log('⚙️ Loading user settings from server...');
    try {
      const userSettings = await loadUserSettings();
      console.log('✅ User settings loaded:', userSettings);
      
      // Apply settings immediately
      applySettings(userSettings);
    } catch (error) {
      console.warn('⚠️ Could not load user settings:', error);
    }

    hideLoading();
    
    // Set up logout button listener
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
      logoutButton.addEventListener('click', logout);
      console.log('✅ Logout button listener added');
    }

  } catch (error) {
    console.error('❌ Error loading user data:', error);
    logout();
  }
}

// Ensure our True Shuffle playlists exist
async function ensureTrueShufflePlaylists(userId) {
  try {
    // Find existing playlists
    const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch playlists');
    }
    
    const data = await response.json();
    const playlists = data.items;
    
    // Look for our special playlists
    let likedPlaylist = playlists.find(p => p.name === 'Liked from True Shuffle');
    let heardPlaylist = playlists.find(p => p.name === 'Heard on True Shuffle');
    
    // Create liked playlist if it doesn't exist
    if (!likedPlaylist) {
      const createResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        method: 'POST',
                    headers: {
          'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
          name: 'Liked from True Shuffle',
          description: 'Songs I liked while using the True Shuffle app',
          public: false
        })
      });
      
      if (createResponse.ok) {
        likedPlaylist = await createResponse.json();
      }
    }
    
    // Create heard playlist if it doesn't exist
    if (!heardPlaylist) {
      const createResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Heard on True Shuffle',
          description: 'All songs I listened to using the True Shuffle app',
          public: false
        })
      });
      
      if (createResponse.ok) {
        heardPlaylist = await createResponse.json();
      }
    }
    
    // Store playlist references
    if (likedPlaylist) playlistCache.likedFromTrueShuffle = likedPlaylist;
    if (heardPlaylist) playlistCache.heardOnTrueShuffle = heardPlaylist;
    
  } catch (error) {
    console.error('Error ensuring playlists:', error);
  }
}

// Fetch recommendations based on current shuffle style
async function fetchRecommendations() {
  console.log(`🔄 Fetching recommendations with style: ${currentShuffleType}`);
  
  try {
    showLoading();
    let tracks = [];
    
    // Check if we should use the advanced algorithm
    if (currentShuffleType === 'advanced-true-shuffle') {
      console.log('🚀 Using Advanced True Shuffle Algorithm...');
      tracks = await advancedTrueShuffleAlgorithm();
      
      // Enable crossfade for smoother transitions
      enableCrossfade();
      
    } else {
      // Use regular shuffle algorithms
      switch(currentShuffleType) {
        case 'true-shuffle-all':
          tracks = await fetchTrueShuffleAllSpotify();
          break;
        case 'true-shuffle-library':
          tracks = await fetchTrueShuffleMyLibrary();
          break;
        default:
          console.warn(`⚠️ Unknown shuffle type: ${currentShuffleType}, falling back to true-shuffle-all`);
          tracks = await fetchTrueShuffleAllSpotify();
      }
    }
    
    // Assign tracks to shuffledTracks and shuffle them
    if (tracks && tracks.length > 0) {
      console.log(`✅ Loaded ${tracks.length} tracks for ${getShuffleDisplayName(currentShuffleType)}`);
      
      // Use the appropriate shuffle algorithm based on settings
      if (currentShuffleType === 'advanced-true-shuffle') {
        // Advanced algorithm already handles the shuffling
        shuffledTracks = [...tracks];
      } else {
        // Apply cryptographic shuffle for better randomization
        shuffledTracks = cryptographicShuffle([...tracks]);
      }
      
      currentTrackIndex = 0;
      
      // Start playing the first track
      if (shuffledTracks.length > 0) {
        await playCurrentTrack();
      }
    } else {
      console.warn('⚠️ No tracks found, trying fallback...');
      // Try fallback to basic search
      tracks = await fetchTrueShuffleAllSpotify();
      if (tracks && tracks.length > 0) {
        shuffledTracks = cryptographicShuffle([...tracks]);
        currentTrackIndex = 0;
        await playCurrentTrack();
      } else {
        alert('Unable to load tracks. Please check your internet connection and try again.');
      }
    }
    
  } catch (error) {
    console.error('❌ Error in fetchRecommendations:', error);
    alert('Failed to load tracks. Please try again.');
  } finally {
    hideLoading();
  }
}

// Get date range from controls
function getDateRange() {
    const dateFilterToggle = document.getElementById('dateFilterToggle');
    const fromYear = document.getElementById('fromYear');
    const toYear = document.getElementById('toYear');
    
    if (dateFilterToggle?.checked && fromYear?.value && toYear?.value) {
        const from = parseInt(fromYear.value);
        const to = parseInt(toYear.value);
        
        if (from <= to && from >= 1900 && to <= 2024) {
            return { from, to };
        }
    }
    
    return null;
}

async function fetchTrulyRandomTracks() {
    console.log('🎲 Fetching TRULY random tracks using cryptographic randomization...');
    
    // Use default settings instead of getting from settingsManager
    console.log('🔧 Using default settings for track search');
    
    try {
        const allTracks = [];
        const usedTrackIds = new Set();
        const maxResults = 50;
        
        // Strategy 1: Pure Random Track ID Generation (Most Random)
        console.log('🎯 Strategy 1: Pure random track ID generation...');
        const randomIdTracks = await fetchRandomTracksByIds(customSettings, usedTrackIds, 15);
        allTracks.push(...randomIdTracks);
        randomIdTracks.forEach(track => usedTrackIds.add(track.id));
        
        // Strategy 2: Ultra-Random Search with Cryptographic Randomization
        console.log('🔀 Strategy 2: Ultra-random search exploration...');
        if (allTracks.length < maxResults) {
            const ultraRandomTracks = await fetchUltraRandomSearchTracks(customSettings, usedTrackIds, 20);
            allTracks.push(...ultraRandomTracks);
        }
        
        // Strategy 3: Random Playlist Deep Dive
        console.log('📋 Strategy 3: Random playlist exploration...');
        if (allTracks.length < maxResults) {
            const playlistTracks = await fetchRandomPlaylistTracks(customSettings, usedTrackIds, 15);
            allTracks.push(...playlistTracks);
        }
        
        // Filter and validate tracks
        const filteredTracks = filterTracksBySettings(allTracks, customSettings);
        
        // Apply cryptographic shuffle for maximum randomness
        const trulyRandomTracks = cryptographicShuffle(filteredTracks);
        
        console.log(`✅ Found ${trulyRandomTracks.length} TRULY random tracks`);
        
        // Log randomness verification
        if (trulyRandomTracks.length > 0) {
            const artists = trulyRandomTracks.map(t => t.artists[0].name);
            const uniqueArtists = new Set(artists);
            const genres = trulyRandomTracks.map(t => t.genres || ['unknown']).flat();
            const uniqueGenres = new Set(genres);
            
            console.log('🎲 Randomness Verification:', {
                totalTracks: trulyRandomTracks.length,
                uniqueArtists: uniqueArtists.size,
                uniqueGenres: uniqueGenres.size,
                artistDiversity: (uniqueArtists.size / trulyRandomTracks.length * 100).toFixed(1) + '%',
                sampleArtists: Array.from(uniqueArtists).slice(0, 5)
            });
        }
        
        return trulyRandomTracks.slice(0, maxResults);
        
    } catch (error) {
        console.error('❌ Error in fetchTrulyRandomTracks:', error);
        return [];
    }
}

// Strategy 1: DISABLED - Generate random Spotify track IDs (too inefficient and spammy)
async function fetchRandomTracksByIds(userSettings, usedTrackIds, maxTracks) {
    console.log('🚫 Random ID generation disabled (too inefficient - causes API spam)');
    return []; // Return empty array to skip this strategy
    
    // The original approach of generating random track IDs is disabled because:
    // 1. Spotify track IDs are not randomly distributed
    // 2. Success rate is extremely low (< 0.001%)
    // 3. It causes hundreds of 400/404 errors that clutter the console
    // 4. It wastes API quota and may trigger rate limiting
}

// Strategy 2: Ultra-random search with maximum entropy
async function fetchUltraRandomSearchTracks(userSettings, usedTrackIds, maxTracks) {
    console.log('🔀 Ultra-random search exploration...');
    
    const tracks = [];
    
    // Generate completely random search terms using various strategies
    const randomSearchStrategies = [
        // Random Unicode characters for international diversity
        () => {
            const unicodeRanges = [
                [0x0041, 0x005A], // A-Z
                [0x0061, 0x007A], // a-z
                [0x00C0, 0x00FF], // Latin Extended
                [0x0100, 0x017F], // Latin Extended-A
                [0x1E00, 0x1EFF], // Latin Extended Additional
            ];
            const range = unicodeRanges[Math.floor(cryptoRandom() * unicodeRanges.length)];
            const char = String.fromCharCode(range[0] + Math.floor(cryptoRandom() * (range[1] - range[0])));
            return char;
        },
        
        // Random 2-3 character combinations
        () => {
            const chars = 'abcdefghijklmnopqrstuvwxyz';
            let term = '';
            const length = 2 + Math.floor(cryptoRandom() * 2); // 2-3 chars
            for (let i = 0; i < length; i++) {
                term += chars[Math.floor(cryptoRandom() * chars.length)];
            }
            return term;
        },
        
        // Random numbers and years
        () => Math.floor(cryptoRandom() * 9999).toString(),
        
        // Random common words with entropy
        () => {
            const words = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'had', 'has', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];
            return words[Math.floor(cryptoRandom() * words.length)];
        }
    ];
    
    for (let attempt = 0; attempt < 10 && tracks.length < maxTracks; attempt++) {
        try {
            // Generate random search term
            const strategy = randomSearchStrategies[Math.floor(cryptoRandom() * randomSearchStrategies.length)];
            const searchTerm = strategy();
            
            // Use massive random offset for maximum entropy
            const randomOffset = Math.floor(cryptoRandom() * 2000); // 0-2000 random offset
            
            // Apply user settings to search if available
            let searchQuery = `"${searchTerm}"`;
            
            // Language filtering
            if (userSettings.languages && userSettings.languages.length > 0) {
                const markets = {
                    'en': ['US', 'GB', 'CA', 'AU', 'NZ'],
                    'es': ['ES', 'MX', 'AR', 'CO', 'CL'],
                    'fr': ['FR', 'CA', 'BE', 'CH'],
                    'de': ['DE', 'AT', 'CH'],
                    'it': ['IT', 'CH'],
                    'pt': ['BR', 'PT'],
                    'ru': ['RU'],
                    'ja': ['JP'],
                    'ko': ['KR']
                };
                
                const userLang = userSettings.languages[Math.floor(cryptoRandom() * userSettings.languages.length)];
                if (markets[userLang]) {
                    const marketList = markets[userLang];
                    const market = marketList[Math.floor(cryptoRandom() * marketList.length)];
                    searchQuery += ` market:${market}`;
                }
            }
            
            console.log(`🔍 Ultra-random search: "${searchQuery}" (offset: ${randomOffset})`);
            
            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=50&offset=${randomOffset}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                const validTracks = data.tracks.items
                    .filter(track => !usedTrackIds.has(track.id) && isValidTrack(track, userSettings));
                
                // Use cryptographic shuffle and take random subset
                const shuffledTracks = cryptographicShuffle(validTracks);
                const randomCount = Math.min(3, shuffledTracks.length);
                const selectedTracks = shuffledTracks.slice(0, randomCount);
                
                tracks.push(...selectedTracks);
                selectedTracks.forEach(track => usedTrackIds.add(track.id));
            }
            
            // Random delay to avoid patterns
            await new Promise(resolve => setTimeout(resolve, 50 + Math.floor(cryptoRandom() * 100)));
            
        } catch (error) {
            console.error('❌ Ultra-random search error:', error);
        }
    }
    
    console.log(`🔀 Ultra-random search found ${tracks.length} tracks`);
    return tracks;
}

// Strategy 3: Random playlist exploration for deep catalog access
async function fetchRandomPlaylistTracks(userSettings, usedTrackIds, maxTracks) {
    console.log('📋 Random playlist exploration...');
    
    const tracks = [];
    const playlistCategories = ['toplists', 'pop', 'mood', 'party', 'workout', 'chill', 'focus', 'rock', 'hiphop', 'electronic', 'jazz', 'classical', 'country', 'indie'];
    
    try {
        // Get random playlists from random categories
        for (let i = 0; i < 3 && tracks.length < maxTracks; i++) {
            const randomCategory = playlistCategories[Math.floor(cryptoRandom() * playlistCategories.length)];
            const randomOffset = Math.floor(cryptoRandom() * 500);
            
            try {
                // Get playlists from category
                const playlistResponse = await fetch(`https://api.spotify.com/v1/browse/categories/${randomCategory}/playlists?limit=20&offset=${randomOffset}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                
                if (playlistResponse.ok) {
                    const playlistData = await playlistResponse.json();
                    if (playlistData.playlists && playlistData.playlists.items.length > 0) {
                        // Pick random playlist
                        const randomPlaylist = playlistData.playlists.items[Math.floor(cryptoRandom() * playlistData.playlists.items.length)];
                        
                        // Get random tracks from this playlist
                        const trackOffset = Math.floor(cryptoRandom() * 100);
                        const trackResponse = await fetch(`https://api.spotify.com/v1/playlists/${randomPlaylist.id}/tracks?limit=50&offset=${trackOffset}`, {
                            headers: { 'Authorization': `Bearer ${accessToken}` }
                        });
                        
                        if (trackResponse.ok) {
                            const trackData = await trackResponse.json();
                            const playlistTracks = trackData.items
                                .map(item => item.track)
                                .filter(track => track && !usedTrackIds.has(track.id) && isValidTrack(track, userSettings));
                            
                            // Random selection from playlist
                            const shuffledPlaylistTracks = cryptographicShuffle(playlistTracks);
                            const selectedCount = Math.min(5, shuffledPlaylistTracks.length);
                            const selectedTracks = shuffledPlaylistTracks.slice(0, selectedCount);
                            
                            tracks.push(...selectedTracks);
                            selectedTracks.forEach(track => usedTrackIds.add(track.id));
                            
                            console.log(`📋 Found ${selectedTracks.length} tracks from random playlist: ${randomPlaylist.name}`);
                        }
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error('❌ Playlist exploration error:', error);
            }
        }
        
    } catch (error) {
        console.error('❌ Error in playlist exploration:', error);
    }
    
    console.log(`📋 Playlist exploration found ${tracks.length} tracks`);
    return tracks;
}

// Cryptographically secure random number generator
function cryptoRandom() {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] / 4294967296; // Convert to 0-1 range
}

// Fisher-Yates shuffle algorithm for unbiased array randomization
function fisherYatesShuffle(array) {
    if (!array || array.length <= 1) return array;
    
    const shuffled = [...array];
    
    // Start from the last element and swap with a random previous element
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // ES6 swap
    }
    
    return shuffled;
}

// Cryptographic Fisher-Yates shuffle for maximum randomness
function cryptographicShuffle(array) {
    if (!array || array.length <= 1) return array;
    
    const shuffled = [...array];
    
    for (let i = shuffled.length - 1; i > 0; i--) {
        // Use cryptographically secure random number
        const j = Math.floor(cryptoRandom() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
}

// Best Practice: Use Spotify's recommendation engine for true randomness
async function fetchRandomRecommendations(userSettings) {
    console.log('🎯 Fetching random recommendations...');
    
    try {
        // Generate random seed values for recommendation diversity
        const seedGenres = userSettings.genres.length > 0 ? 
            getRandomItems(userSettings.genres, Math.min(3, userSettings.genres.length)) :
            getRandomItems(['pop', 'rock', 'hip-hop', 'electronic', 'jazz', 'indie', 'alternative', 'folk'], 3);
        
        // Random audio feature targets for diversity
        const audioFeatures = {
            target_danceability: Math.random(),
            target_energy: Math.random(),
            target_valence: Math.random(),
            target_acousticness: Math.random(),
            target_instrumentalness: Math.random() * 0.7, // Favor songs with vocals
            target_popularity: userSettings.popularity || 70
        };
        
        // Build recommendation query
        const params = new URLSearchParams({
            seed_genres: seedGenres.join(','),
            limit: 50,
            market: 'US', // Can be made dynamic based on user location
            ...audioFeatures
        });
        
        console.log('🔍 Recommendation params:', params.toString());
        
        const response = await fetch(`https://api.spotify.com/v1/recommendations?${params}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`🎯 Found ${data.tracks.length} recommendation tracks`);
            return data.tracks;
        } else {
            console.warn(`⚠️ Recommendations failed: ${response.status}`);
            return [];
        }
        
    } catch (error) {
        console.error('❌ Error fetching recommendations:', error);
        return [];
    }
}

// Enhanced random search with better strategies
async function fetchRandomSearchResults(userSettings, usedTrackIds) {
    console.log('🔍 Fetching random search results...');
    
    const tracks = [];
    const searchStrategies = [
        // Random year searches
        () => `year:${1950 + Math.floor(Math.random() * (2024 - 1950))}`,
        
        // Random decade searches
        () => {
            const decades = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];
            return `decade:${getRandomItems(decades, 1)[0]}`;
        },
        
        // Random genre + year combinations
        () => {
            const allGenres = ['pop', 'rock', 'hip-hop', 'electronic', 'jazz', 'classical', 'country', 'reggae', 'blues', 'folk', 'indie', 'alternative', 'metal', 'punk', 'soul', 'funk'];
            const genre = getRandomItems(allGenres, 1)[0];
            const year = 1950 + Math.floor(Math.random() * (2024 - 1950));
            return `genre:${genre} year:${year}`;
        },
        
        // Random musical keys
        () => {
            const keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
            const modes = ['major', 'minor'];
            return `key:${getRandomItems(keys, 1)[0]} mode:${getRandomItems(modes, 1)[0]}`;
        },
        
        // Random tempo ranges
        () => {
            const tempos = ['slow', 'medium', 'fast', 'ballad', 'upbeat'];
            return `tempo:${getRandomItems(tempos, 1)[0]}`;
        }
    ];
    
    // Apply user language filter if specified
    let languageQuery = '';
    if (userSettings.languages && userSettings.languages.length > 0) {
        // Spotify doesn't have direct language filtering, so we'll use market-based filtering
        const languageMarkets = {
            'en': ['US', 'GB', 'CA', 'AU'],
            'es': ['ES', 'MX', 'AR', 'CO'],
            'fr': ['FR', 'CA', 'BE'],
            'de': ['DE', 'AT', 'CH'],
            'it': ['IT'],
            'pt': ['BR', 'PT'],
            'ja': ['JP'],
            'ko': ['KR']
        };
        
        const userLang = userSettings.languages[0];
        if (languageMarkets[userLang]) {
            const markets = languageMarkets[userLang];
            languageQuery = ` market:${getRandomItems(markets, 1)[0]}`;
        }
    }
    
    // Execute random searches
    for (let i = 0; i < 3 && tracks.length < 20; i++) {
        try {
            const strategy = getRandomItems(searchStrategies, 1)[0];
            let searchQuery = strategy() + languageQuery;
            
            // Apply user year filter if specified
            if (userSettings.yearFrom && userSettings.yearTo) {
                if (userSettings.yearFrom === userSettings.yearTo) {
                    searchQuery += ` year:${userSettings.yearFrom}`;
                } else {
                    searchQuery += ` year:${userSettings.yearFrom}-${userSettings.yearTo}`;
                }
            }
            
            // Random offset for diversity
            const randomOffset = Math.floor(Math.random() * 1000);
            
            console.log(`🔍 Random search: "${searchQuery}" (offset: ${randomOffset})`);
            
            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=50&offset=${randomOffset}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                const validTracks = data.tracks.items.filter(track => 
                    !usedTrackIds.has(track.id) && isValidTrack(track, userSettings)
                );
                
                // Shuffle results and add randomly
                const shuffledTracks = fisherYatesShuffle([...validTracks]);
                tracks.push(...shuffledTracks.slice(0, 7));
                shuffledTracks.slice(0, 7).forEach(track => usedTrackIds.add(track.id));
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.error('❌ Random search error:', error);
        }
    }
    
    return tracks;
}

// Random album exploration for discovery
async function fetchRandomAlbumTracks(userSettings, usedTrackIds) {
    console.log('💽 Fetching random album tracks...');
    
    const tracks = [];
    
    try {
        // Search for random albums
        const albumQueries = [
            `year:${1950 + Math.floor(Math.random() * (2024 - 1950))}`,
            'genre:' + getRandomItems(['pop', 'rock', 'electronic', 'jazz', 'indie'], 1)[0]
        ];
        
        for (const query of albumQueries) {
            try {
                const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=20&offset=${Math.floor(Math.random() * 500)}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const randomAlbums = getRandomItems(data.albums.items, 2);
                    
                    for (const album of randomAlbums) {
                        // Get random tracks from this album
                        const albumResponse = await fetch(`https://api.spotify.com/v1/albums/${album.id}/tracks?limit=50`, {
                            headers: { 'Authorization': `Bearer ${accessToken}` }
                        });
                        
                        if (albumResponse.ok) {
                            const albumData = await albumResponse.json();
                            const randomTracks = getRandomItems(albumData.items, 3)
                                .filter(track => !usedTrackIds.has(track.id))
                                .map(track => ({
                                    ...track,
                                    album: album, // Add album info
                                    popularity: album.popularity || 50
                                }));
                            
                            tracks.push(...randomTracks);
                            randomTracks.forEach(track => usedTrackIds.add(track.id));
                        }
                        
                        if (tracks.length >= 15) break;
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, 50));
                
            } catch (error) {
                console.error('❌ Album search error:', error);
            }
        }
        
    } catch (error) {
        console.error('❌ Error in album exploration:', error);
    }
    
    return tracks.slice(0, 15);
}

// Filter tracks by user settings
function filterTracksBySettings(tracks, userSettings) {
    return tracks.filter(track => {
        // Filter by popularity
        if (userSettings.popularity && track.popularity > userSettings.popularity) {
            return false;
        }
        
        // Filter by explicit content
        if (!userSettings.explicitContent && track.explicit) {
            return false;
        }
        
        // Filter by track duration
        if (userSettings.trackDurationMin && track.duration_ms < userSettings.trackDurationMin * 1000) {
            return false;
        }
        
        if (userSettings.trackDurationMax && track.duration_ms > userSettings.trackDurationMax * 1000) {
            return false;
        }
        
        // Basic quality filters
        const albumName = track.album.name.toLowerCase();
        const trackName = track.name.toLowerCase();
        
        if (albumName.includes('karaoke') || 
            albumName.includes('tribute') ||
            albumName.includes('cover') ||
            trackName.includes('karaoke') ||
            trackName.includes('cover version') ||
            trackName.includes('backing track')) {
            return false;
        }
        
        return true;
    });
}

// Check if track is valid based on settings
function isValidTrack(track, userSettings) {
    // Basic validation
    if (!track || !track.id || !track.name || !track.artists || track.artists.length === 0) {
        return false;
    }
    
    // Filter by popularity
    if (userSettings.popularity && track.popularity > userSettings.popularity) {
        return false;
    }
    
    // Filter by explicit content
    if (!userSettings.explicitContent && track.explicit) {
        return false;
    }
    
    return true;
}

// Utility function to get random items from array
function getRandomItems(array, count) {
    if (!array || array.length === 0) return [];
    if (count >= array.length) return [...array];
    
    const shuffled = fisherYatesShuffle([...array]);
    return shuffled.slice(0, count);
}

// Try fetching tracks by generating random Spotify track IDs
async function fetchRandomTrackIds(existingTracks) {
  console.log('🎲 Legacy random ID function - use fetchRandomTracksByIds instead');
  return [];
}

// Fetch tracks deliberately mixing different genres
async function fetchMixedGenreTracks() {
  console.log('🎨 Creating truly random genre-mixed playlist...');
  
  // Get settings from enhanced settings system
  let userSettings = {};
  try {
      const storedSettings = localStorage.getItem('trueShuffleSettings');
      if (storedSettings) {
          userSettings = JSON.parse(storedSettings);
      }
  } catch (error) {
      console.warn('Could not load user settings, using defaults');
  }
  
  // Use genres from settings, fallback to legacy selectedGenres
  const genresToUse = userSettings.genres || selectedGenres || [];
  
  if (genresToUse.length === 0) {
    showNotification('Please select 2-6 genres in settings before discovering music.', 'warning');
    return [];
  }
  
  if (genresToUse.length < 2) {
    showNotification('Please select at least 2 genres to create a mix.', 'warning');
    return [];
  }
  
  console.log(`🎨 Using ${genresToUse.length} selected genres:`, genresToUse);
  
  // Diverse genres with specific search strategies to avoid bias
  const genreConfigs = {
    'classical': { 
      searches: ['piano concerto', 'string quartet', 'symphony', 'baroque', 'chamber music'],
      avoidTerms: ['popular', 'best', 'greatest', 'hits']
    },
    'metal': { 
      searches: ['black metal', 'death metal', 'prog metal', 'thrash', 'melodic metal'],
      avoidTerms: ['mainstream', 'radio', 'chart']
    },
    'reggae': { 
      searches: ['roots reggae', 'dub reggae', 'dancehall', 'ska', 'reggae instrumental'],
      avoidTerms: ['compilation', 'greatest']
    },
    'electronic': { 
      searches: ['ambient electronic', 'experimental electronic', 'IDM', 'downtempo', 'glitch'],
      avoidTerms: ['festival', 'mainstream', 'commercial']
    },
    'jazz': { 
      searches: ['bebop', 'free jazz', 'jazz fusion', 'acid jazz', 'contemporary jazz'],
      avoidTerms: ['smooth jazz', 'dinner', 'background']
    },
    'folk': { 
      searches: ['indie folk', 'traditional folk', 'acoustic folk', 'world folk', 'folk rock'],
      avoidTerms: ['popular', 'radio friendly']
    },
    'hip hop': { 
      searches: ['underground hip hop', 'experimental hip hop', 'instrumental hip hop', 'boom bap', 'abstract hip hop'],
      avoidTerms: ['chart', 'mainstream', 'radio']
    },
    'world': { 
      searches: ['african music', 'latin jazz', 'indian classical', 'middle eastern', 'balkan'],
      avoidTerms: ['world music hits', 'compilation']
    },
    'rock': {
      searches: ['indie rock', 'alternative rock', 'post rock', 'psychedelic rock', 'math rock', 'garage rock'],
      avoidTerms: ['classic rock hits', 'radio rock']
    },
    'funk': {
      searches: ['funk rock', 'neo funk', 'psychedelic funk', 'jazz funk', 'afro funk'],
      avoidTerms: ['greatest funk', 'funk hits']
    },
    'blues': {
      searches: ['delta blues', 'electric blues', 'chicago blues', 'blues rock', 'acoustic blues'],
      avoidTerms: ['blues hits', 'best blues']
    },
    'pop': {
      searches: ['indie pop', 'art pop', 'experimental pop', 'dream pop', 'bedroom pop'],
      avoidTerms: ['top 40', 'chart pop', 'mainstream pop']
    }
  };
  
  const allTracks = [];
  const usedTrackIds = new Set();
  const maxPerGenre = Math.ceil(50 / genresToUse.length); // Distribute evenly
  
  for (const genreName of genresToUse) {
    const genreConfig = genreConfigs[genreName.toLowerCase()];
    if (!genreConfig) {
      console.warn(`⚠️ No configuration found for genre: ${genreName}`);
      continue;
    }
    
    console.log(`🎵 Fetching ${maxPerGenre} tracks for genre: ${genreName}`);
    
    // Get random search terms for this genre
    const shuffledSearches = [...genreConfig.searches].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < Math.min(3, shuffledSearches.length) && allTracks.length < 50; i++) {
      const searchTerm = shuffledSearches[i];
      
      try {
        // Build search query with year filter from settings
        let searchQuery = searchTerm;
        
        // Apply year filter from settings
        if (userSettings.yearFrom && userSettings.yearTo) {
            if (userSettings.yearFrom === userSettings.yearTo) {
                searchQuery += ` year:${userSettings.yearFrom}`;
            } else {
                searchQuery += ` year:${userSettings.yearFrom}-${userSettings.yearTo}`;
            }
            console.log(`📅 Applied year filter: ${userSettings.yearFrom}-${userSettings.yearTo}`);
        }
        
        const randomOffset = Math.floor(Math.random() * 300);
        
        console.log(`🔍 Genre search: "${searchQuery}" (offset: ${randomOffset})`);
        
        const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=50&offset=${randomOffset}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          const validTracks = data.tracks.items.filter(track => {
            // Apply popularity filter from settings
            const maxPopularity = userSettings.popularity || 85;
            if (track.popularity > maxPopularity) return false;
            
            if (usedTrackIds.has(track.id)) return false;
            
            // Filter out avoid terms
            const trackName = track.name.toLowerCase();
            const albumName = track.album.name.toLowerCase();
            const artistName = track.artists[0].name.toLowerCase();
            
            for (const avoidTerm of genreConfig.avoidTerms) {
              if (trackName.includes(avoidTerm) || 
                  albumName.includes(avoidTerm) || 
                  artistName.includes(avoidTerm)) {
                return false;
              }
            }
            
            return true;
          });
          
          // Add tracks from this genre
          let genreTrackCount = 0;
          for (const track of validTracks) {
            if (genreTrackCount >= maxPerGenre || allTracks.length >= 50) break;
            allTracks.push(track);
            usedTrackIds.add(track.id);
            genreTrackCount++;
          }
          
          console.log(`✅ Added ${genreTrackCount} tracks from ${genreName} search`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error searching genre ${genreName}:`, error);
      }
    }
  }
  
  console.log(`🎨 Genre mix complete: ${allTracks.length} tracks from ${genresToUse.length} genres`);
  return fisherYatesShuffle(allTracks);
}

// Fetch genre-balanced tracks (equal representation)
async function fetchGenreBalancedTracks() {
  console.log('⚖️ Creating truly random genre-balanced playlist...');
  
  // More specific genre searches to avoid algorithmic bias
  const genreSearches = {
    'electronic': ['techno', 'house', 'ambient', 'IDM', 'experimental electronic', 'breakbeat'],
    'rock': ['indie rock', 'alternative rock', 'post rock', 'psychedelic rock', 'math rock', 'garage rock'],
    'hip hop': ['underground hip hop', 'boom bap', 'experimental hip hop', 'instrumental hip hop', 'conscious rap'],
    'jazz': ['bebop', 'cool jazz', 'free jazz', 'fusion', 'modal jazz', 'hard bop'],
    'classical': ['baroque', 'romantic', 'contemporary classical', 'chamber music', 'solo piano', 'string quartet'],
    'folk': ['indie folk', 'traditional folk', 'acoustic', 'singer songwriter', 'americana', 'world folk'],
    'reggae': ['roots reggae', 'dub', 'ska', 'reggae rock', 'dancehall', 'lovers rock'],
    'world': ['latin', 'african', 'indian classical', 'celtic', 'middle eastern', 'balkan']
  };
  
  const tracks = [];
  const tracksPerGenre = 15;
  
  for (const [genre, searches] of Object.entries(genreSearches)) {
    try {
      // Pick random search term for this genre
      const searchTerm = searches[Math.floor(Math.random() * searches.length)];
      
      // High random offset and year filtering for true randomness
      const randomOffset = Math.floor(Math.random() * 600);
      const randomYear = Math.floor(Math.random() * 25) + 1995; // 1995-2020
      const useYearFilter = Math.random() > 0.6;
      
      const query = useYearFilter ? `${searchTerm} year:${randomYear}` : searchTerm;
      
      console.log(`⚖️ Balanced search: "${query}" offset ${randomOffset}`);
      
      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${tracksPerGenre}&offset=${randomOffset}&market=US`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
          // Apply strong anti-popularity filtering
          const balancedTracks = data.tracks.items.filter(track => {
            // Even stricter popularity filtering
            if (track.popularity > 65) return false;
            
            // Avoid mainstream indicators
            const trackName = track.name.toLowerCase();
            const albumName = track.album?.name?.toLowerCase() || '';
            const artistName = track.artists?.[0]?.name?.toLowerCase() || '';
            
            const avoidPatterns = ['hits', 'best', 'greatest', 'essential', 'top', 'chart', 'radio edit'];
            if (avoidPatterns.some(pattern => 
              trackName.includes(pattern) || 
              albumName.includes(pattern) || 
              artistName.includes(pattern)
            )) {
              return false;
            }
            
            return true;
          });
          
          console.log(`✅ Found ${balancedTracks.length} balanced ${genre} tracks (filtered from ${data.tracks.items.length})`);
          tracks.push(...balancedTracks);
        }
      }
    } catch (error) {
      console.log(`⚠️ Balanced search failed for ${genre}:`, error);
    }
  }
  
  // Shuffle to randomize genre order
  return fisherYatesShuffle(tracks);
}

// Fetch tracks that user likely hasn't heard (never played songs)
async function fetchNeverPlayedTracks() {
  console.log('🌟 Finding truly obscure never-played tracks...');
  
  // More sophisticated obscure search strategies
  const obscureStrategies = [
    // Genre-specific underground scenes
    { query: 'shoegaze', popularity: 30 },
    { query: 'post rock instrumental', popularity: 35 },
    { query: 'dark ambient', popularity: 25 },
    { query: 'math rock', popularity: 30 },
    { query: 'drone metal', popularity: 25 },
    { query: 'microsound', popularity: 20 },
    { query: 'lowercase sound', popularity: 15 },
    { query: 'concrete music', popularity: 20 },
    { query: 'field recording', popularity: 25 },
    { query: 'minimal techno', popularity: 30 },
    { query: 'free improvisation', popularity: 25 },
    { query: 'sound art', popularity: 20 },
    // Regional/cultural obscurities
    { query: 'bulgarian choir', popularity: 30 },
    { query: 'tuvan throat singing', popularity: 25 },
    { query: 'gamelan', popularity: 30 },
    { query: 'mbira', popularity: 25 },
    { query: 'hang drum', popularity: 35 },
    // Language-based to find non-English obscurities
    { query: 'japanese experimental', popularity: 30 },
    { query: 'icelandic post rock', popularity: 25 },
    { query: 'scandinavian folk', popularity: 35 },
    { query: 'balkan brass', popularity: 30 }
  ];
  
  const tracks = [];
  const strategiesUsed = Math.min(8, obscureStrategies.length);
  
  // Randomize which strategies to use
  const shuffledStrategies = fisherYatesShuffle([...obscureStrategies]).slice(0, strategiesUsed);
  
  for (const strategy of shuffledStrategies) {
    try {
      // Use very high offset to dig deep into obscure results
      const offset = Math.floor(Math.random() * 1000); // Very high to avoid popular results
      
      // Random year from a wider range to find forgotten gems
      const randomYear = Math.floor(Math.random() * 40) + 1980; // 1980-2020
      const useYearFilter = Math.random() > 0.4; // 60% chance of year filtering
      
      const query = useYearFilter ? `${strategy.query} year:${randomYear}` : strategy.query;
      
      console.log(`🌟 Obscure search: "${query}" offset ${offset}, max popularity: ${strategy.popularity}`);
      
      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=30&offset=${offset}&market=US`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
          // Very strict filtering for truly obscure tracks
          const obscureTracks = data.tracks.items.filter(track => {
            // Use strategy-specific popularity threshold
            if (track.popularity > strategy.popularity) return false;
            
            // Avoid any mainstream indicators
            const trackName = track.name.toLowerCase();
            const albumName = track.album?.name?.toLowerCase() || '';
            const artistName = track.artists?.[0]?.name?.toLowerCase() || '';
            
            // Reject if it has any mainstream indicators
            const mainstreamIndicators = [
              'hits', 'best', 'greatest', 'essential', 'collection', 'anthology',
              'radio', 'chart', 'top', 'popular', 'famous', 'classic', 'legendary'
            ];
            
            if (mainstreamIndicators.some(indicator => 
              trackName.includes(indicator) || 
              albumName.includes(indicator) || 
              artistName.includes(indicator)
            )) {
              return false;
            }
            
            // Avoid compilation albums and various artists
            if (albumName.includes('compilation') || 
                albumName.includes('various') || 
                albumName.includes('sampler') ||
                artistName.includes('various')) {
              return false;
            }
            
            // Prefer tracks from albums with fewer than 15 tracks (avoid compilations)
            if (track.album && track.album.total_tracks > 15) return false;
            
            return true;
          });
          
          console.log(`✅ Found ${obscureTracks.length} truly obscure tracks with "${strategy.query}" (filtered from ${data.tracks.items.length})`);
          tracks.push(...obscureTracks);
        }
      }
    } catch (error) {
      console.log(`⚠️ Obscure search failed for "${strategy.query}":`, error);
    }
  }
  
  // Extra shuffle for maximum randomness
  return fisherYatesShuffle(tracks);
}

// Fetch tracks avoiding recent plays (no repeats)
async function fetchNoRepeatTracks() {
  console.log('🚫 Finding tracks avoiding recent plays...');
  
  // Get recently played tracks first
  let recentTrackIds = [];
  try {
    const recentResponse = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (recentResponse.ok) {
      const recentData = await recentResponse.json();
      recentTrackIds = recentData.items.map(item => item.track.id);
      console.log(`📝 Found ${recentTrackIds.length} recently played tracks to avoid`);
    }
  } catch (error) {
    console.log('⚠️ Could not fetch recent tracks, proceeding without filtering');
  }
  
  // Now get random tracks and filter out recent ones
  const randomTracks = await fetchTrulyRandomTracks();
  const filteredTracks = randomTracks.filter(track => !recentTrackIds.includes(track.id));
  
  console.log(`✅ Filtered to ${filteredTracks.length} non-recent tracks`);
  return filteredTracks;
}

// Get shuffle display name based on type
function getShuffleDisplayName(type) {
  const names = {
    'true-shuffle-all': 'True Shuffle All of Spotify',
    'true-shuffle-library': 'True Shuffle My Library',
    'advanced-true-shuffle': 'Advanced True Shuffle (Personalized)'
  };
  return names[type] || 'Unknown';
}

// Initialize Spotify Web Playback SDK
function initializeSpotifyPlayer() {
  console.log('🎵 Initializing Spotify Web Playback SDK...');
  
  // Check if we have an access token
  if (!accessToken) {
    console.error('❌ Cannot initialize player: No access token available');
    return;
  }
  
  console.log('🔑 Access token available, proceeding with player initialization...');
  
  // Check if SDK is already loaded
  if (!window.Spotify) {
    console.log('⏳ Spotify SDK not yet loaded, waiting...');
    // Try again in 1 second
    setTimeout(initializeSpotifyPlayer, 1000);
    return;
  }
  
  window.onSpotifyWebPlaybackSDKReady = () => {
    console.log('🎵 Spotify Web Playback SDK is ready!');
    
    const player = new Spotify.Player({
      name: 'True Shuffle Player',
      getOAuthToken: async cb => { 
        try {
          console.log('🔑 Player requesting OAuth token...');
          
          // Check if current token is still valid
          const tokenExpires = localStorage.getItem('spotify_token_expires');
          if (accessToken && tokenExpires && Date.now() < parseInt(tokenExpires)) {
            console.log('🔑 Using existing access token for player');
            cb(accessToken);
            return;
          }
          
          // Try to refresh the token
          console.log('🔄 Access token expired, attempting refresh...');
          const refreshToken = localStorage.getItem('spotify_refresh_token');
          
          if (refreshToken) {
            const refreshed = await refreshAccessToken();
            if (refreshed && accessToken) {
              console.log('✅ Token refreshed for player');
              cb(accessToken);
              return;
            }
          }
          
          // If refresh fails, use current token anyway (better than nothing)
          console.warn('⚠️ Could not refresh token, using current token');
          cb(accessToken);
        } catch (error) {
          console.error('❌ Error in getOAuthToken:', error);
          cb(accessToken);
        }
      },
      volume: 0.8
    });

    // Error handling
    player.addListener('initialization_error', ({ message }) => {
      console.error('❌ Spotify Player initialization error:', message);
      showNotification('Player initialization failed: ' + message, 'error');
    });

    player.addListener('authentication_error', ({ message }) => {
      console.error('❌ Spotify Player authentication error:', message);
      showNotification('Authentication error: ' + message, 'error');
    });

    player.addListener('account_error', ({ message }) => {
      console.error('❌ Spotify Player account error:', message);
      showNotification('Account error: ' + message, 'error');
    });

    player.addListener('playback_error', ({ message }) => {
      // Suppress common non-critical errors
      if (!message.includes('Cannot perform operation; no list was loaded') && 
          !message.includes('PlayLoad event failed')) {
        console.error('❌ Spotify Player playback error:', message);
      }
    });

    // Ready
    player.addListener('ready', ({ device_id }) => {
      console.log('✅ Spotify Player ready with Device ID:', device_id);
      spotifyPlayer = player;
      deviceId = device_id;
      showNotification('Spotify Player connected successfully!', 'success');
    });

    // Not Ready
    player.addListener('not_ready', ({ device_id }) => {
      console.log('⚠️ Spotify Player not ready with Device ID:', device_id);
      showNotification('Spotify Player disconnected', 'warning');
    });

    // Track ended event (when track finishes playing)
    player.addListener('player_state_changed', (state) => {
      if (!state) return;
      
      console.log('🎵 Player state changed:', state);
      
      const currentTrackFromState = state.track_window.current_track;
      const isPaused = state.paused;
      const position = state.position;
      const duration = state.duration;
      
      // Update playback state
      playbackState.isPlaying = !isPaused;
      playbackState.currentTrack = currentTrackFromState;
      playbackState.progressMs = position;
      playbackState.durationMs = duration;
      
      // Update play/pause button UI
      updatePlayPauseButton(!isPaused);
      
      // Update progress bar and time display
      updateProgressBar(position, duration);
      
      // If we have a new track, update the now playing display
      if (currentTrackFromState && currentTrackFromState.id !== (currentTrack?.id)) {
        console.log('🔄 New track detected from player state');
        currentTrack = currentTrackFromState;
        updateNowPlaying(currentTrackFromState);
      }
      
      // AUTO-ADVANCE LOGIC: Check if track has ended
      if (window.previousPlayerState) {
        const prevState = window.previousPlayerState;
        
        // Method 1: Track completed naturally (was playing, now at position 0 and paused)
        if (isPaused && position === 0 && !prevState.paused && 
            prevState.position > (prevState.duration * 0.9)) {
          console.log('🏁 Track completed naturally, auto-advancing...');
          
          // Track usage for completed song
          trackShuffleUsage(currentShuffleType, 1);
          
          // Auto-advance after brief delay
          setTimeout(() => {
            playNextTrack();
          }, 300);
        }
        
        // Method 2: Position jumped from high to 0 (track skipped to next)
        else if (!isPaused && position === 0 && prevState.position > (prevState.duration * 0.8) && 
                 currentTrackFromState?.id !== prevState.track_id) {
          console.log('🔄 Track auto-advanced by Spotify, syncing queue...');
          
          // Find the new track in our queue and update index
          const trackInQueue = shuffledTracks.findIndex(track => track.id === currentTrackFromState.id);
          if (trackInQueue !== -1) {
            currentTrackIndex = trackInQueue;
            console.log(`🎯 Synced queue position to index ${currentTrackIndex}`);
          } else {
            // Track not in our queue, fetch more tracks
            console.log('🔄 Track not in queue, fetching new tracks...');
            fetchRecommendations();
          }
        }
      }
      
      // Store current state for next comparison
      window.previousPlayerState = {
        paused: state.paused,
        position: state.position,
        duration: state.duration,
        track_id: currentTrackFromState?.id
      };
      
      // Animate visualizer based on play state
      if (!isPaused) {
        startVisualizerAnimation();
      } else {
        stopVisualizerAnimation();
        // Reset background to default when music is paused
        resetBackgroundToDefault();
      }
    });

    // Playback status updates
    player.addListener('player_state_changed', state => {
      if (!state) return;
      
      console.log('🎵 Player state changed:', state);
      
      const currentTrackFromState = state.track_window.current_track;
      const isPaused = state.paused;
      const position = state.position;
      const duration = state.duration;
      
      // Update playback state
      playbackState.isPlaying = !isPaused;
      playbackState.currentTrack = currentTrackFromState;
      playbackState.progressMs = position;
      playbackState.durationMs = duration;
      
      // Update play/pause button UI
      updatePlayPauseButton(!isPaused);
      
      // Update progress bar and time display
      updateProgressBar(position, duration);
      
      // If we have a new track, update the now playing display
      if (currentTrackFromState && currentTrackFromState.id !== (currentTrack?.id)) {
        console.log('🔄 New track detected from player state');
        currentTrack = currentTrackFromState;
        updateNowPlaying(currentTrackFromState);
      }
      
      // Check if track has ended and automatically play next
      if (currentTrackFromState && !isPaused && position === 0 && state.track_window.previous_tracks.length > 0) {
        // Track has ended and moved to next track naturally
        console.log('🎵 Track ended naturally, syncing with queue...');
        
        // Find the track in our queue and update the index
        const trackInQueue = shuffledTracks.findIndex(track => track.id === currentTrackFromState.id);
        if (trackInQueue !== -1) {
          currentTrackIndex = trackInQueue;
          console.log(`🎯 Synced queue position to index ${currentTrackIndex}`);
        }
      }
      
      // Detect track completion by checking if position is near end and player stopped
      if (currentTrackFromState && duration > 0 && position >= duration - 1000 && isPaused) {
        console.log('🏁 Track completed, playing next track...');
        
        // Small delay to ensure Spotify has processed the track end
        setTimeout(() => {
          playNextTrack();
        }, 500);
      }
      
      // Alternative detection: if position is 0 and we're not at the beginning of a new manual track
      if (currentTrackFromState && position === 0 && !isPaused && 
          window.lastTrackPosition && window.lastTrackPosition > duration * 0.8) {
        console.log('🔄 Track transition detected, auto-advancing...');
        
        // Small delay to let Spotify process
        setTimeout(() => {
          playNextTrack();
        }, 100);
      }
      
      // Store position for next comparison
      window.lastTrackPosition = position;
      
      // Animate visualizer based on play state
      if (!isPaused) {
        startVisualizerAnimation();
      } else {
        stopVisualizerAnimation();
        // Reset background to default when music is paused
        resetBackgroundToDefault();
      }
    });
    
    // Connect to the player
    player.connect().then(success => {
      if (success) {
        console.log('✅ Spotify Player connected successfully');
      } else {
        console.error('❌ Failed to connect to Spotify Player');
        showNotification('Failed to connect to Spotify Player', 'error');
      }
    });
  };
  
  // If SDK is already ready, call the function immediately
  if (window.onSpotifyWebPlaybackSDKReady) {
    console.log('🎵 Calling SDK ready function immediately...');
    window.onSpotifyWebPlaybackSDKReady();
  }
}

// Toggle play/pause
function togglePlayPause() {
  if (spotifyPlayer) {
    spotifyPlayer.togglePlay().then(() => {
      console.log('🎵 Play/pause toggled successfully');
    }).catch(error => {
      console.error('❌ Error toggling play/pause:', error);
    });
  } else {
    console.warn('⚠️ Spotify player not initialized yet');
  }
}

// Play the previous track
function playPreviousTrack() {
  console.log('⏮️ Playing previous track...');
  
  if (shuffledTracks.length === 0) {
    console.log('📭 No tracks in queue');
    return;
  }
  
  // Move to previous track
  currentTrackIndex--;
  
  // If we go before the beginning, wrap to the end
  if (currentTrackIndex < 0) {
    currentTrackIndex = shuffledTracks.length - 1;
  }
  
  // Play the track
  currentTrack = shuffledTracks[currentTrackIndex];
  console.log('🎵 Previous track:', currentTrack.name, 'by', currentTrack.artists[0].name);
  
  // Play the track
  playCurrentTrack();
}

// Play the next track
function playNextTrack() {
  console.log('⏭️ Playing next track...');
  
  if (shuffledTracks.length === 0) {
    console.log('📭 No tracks in queue, fetching new tracks...');
    fetchRecommendations();
    return;
  }
  
  // Add current track to heard playlist if we're moving away from it
  if (currentTrack && currentTrack.id) {
    addTrackToHeardPlaylist(currentTrack.id);
  }
  
  // Move to next track
  currentTrackIndex++;
  
  // For advanced algorithm, we might need to grow the pool when getting low
  if (currentShuffleType === 'advanced-true-shuffle' && 
      currentTrackIndex >= shuffledTracks.length - 5) {
    console.log('⚠️ Track pool running low, continuing to grow in background...');
    // The growTrackPool function will continue to run in the background
    // and add more tracks to shuffledTracks as they're discovered
  }
  
  // If we've reached the end, get more tracks
  if (currentTrackIndex >= shuffledTracks.length) {
    console.log('📭 Reached end of queue, getting more tracks...');
    
    if (currentShuffleType === 'advanced-true-shuffle') {
      // For advanced shuffle, we just reset to the beginning of current tracks
      // while we wait for more tracks to be loaded in the background
      console.log('🔄 Temporarily cycling back to start of current pool while growing new tracks...');
      currentTrackIndex = 0;
    } else {
      // For other shuffle types, fetch a new set of tracks
      currentTrackIndex = 0; // Reset to start while we load new tracks
      fetchRecommendations();
      return;
    }
  }
  
  // Play the current track
  currentTrack = shuffledTracks[currentTrackIndex];
  console.log('🎵 Next track:', currentTrack.name, 'by', currentTrack.artists[0].name);
  
  // Play the track
  playCurrentTrack();
}

// Play the current track
async function playCurrentTrack() {
  if (!deviceId || shuffledTracks.length === 0 || currentTrackIndex < 0 || currentTrackIndex >= shuffledTracks.length) {
    return;
  }
  
  currentTrack = shuffledTracks[currentTrackIndex];
  
  try {
    // Play the track
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: 'PUT',
                headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: [currentTrack.uri]
      })
    });
    
    // Update now playing
    updateNowPlaying(currentTrack);
    
    // Add to heard playlist
    addTrackToHeardPlaylist(currentTrack.id);
    
    // Check if the track is liked
    checkIfTrackIsLiked(currentTrack.id);
    
    // Get audio analysis for visualization
    getAudioAnalysis(currentTrack.id);
  } catch (error) {
    console.error('Error playing track:', error);
  }
}

// Add track to Heard on True Shuffle playlist
async function addTrackToHeardPlaylist(trackId) {
  if (!playlistCache.heardOnTrueShuffle) return;
  
  try {
    await fetch(`https://api.spotify.com/v1/playlists/${playlistCache.heardOnTrueShuffle.id}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
        uris: [`spotify:track:${trackId}`],
        position: 0
      })
    });
  } catch (error) {
    console.error('Error adding track to heard playlist:', error);
  }
}

// Toggle like status for current track
async function toggleLikeSong() {
  if (!currentTrack) return;
  
  try {
    if (isTrackLiked) {
      // Unlike track
      await fetch(`https://api.spotify.com/v1/me/tracks?ids=${currentTrack.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Remove from liked playlist
      if (playlistCache.likedFromTrueShuffle) {
        await fetch(`https://api.spotify.com/v1/playlists/${playlistCache.likedFromTrueShuffle.id}/tracks`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tracks: [{ uri: `spotify:track:${currentTrack.id}` }]
          })
        });
      }
      
      isTrackLiked = false;
      likedSongs.delete(currentTrack.id);
    } else {
      // Like track
      await fetch(`https://api.spotify.com/v1/me/tracks?ids=${currentTrack.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Add to liked playlist
      if (playlistCache.likedFromTrueShuffle) {
        await fetch(`https://api.spotify.com/v1/playlists/${playlistCache.likedFromTrueShuffle.id}/tracks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uris: [`spotify:track:${currentTrack.id}`]
          })
        });
      }
      
      isTrackLiked = true;
      likedSongs.add(currentTrack.id);
    }
    
    // Update like button
    updateLikeButton();
  } catch (error) {
    console.error('Error toggling like status:', error);
  }
}

// Check if the track is liked
async function checkIfTrackIsLiked(trackId) {
  try {
    // Check cache first
    if (likedSongs.has(trackId)) {
      isTrackLiked = true;
      updateLikeButton();
      return;
    }
    
    // Query Spotify API
    const response = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      isTrackLiked = data[0];
      
      // Update cache
      if (isTrackLiked) {
        likedSongs.add(trackId);
      } else {
        likedSongs.delete(trackId);
      }
      
      updateLikeButton();
    }
  } catch (error) {
    console.error('Error checking if track is liked:', error);
  }
}

// Update the like button
function updateLikeButton() {
  if (isTrackLiked) {
    likeButton.innerHTML = '<i class="fas fa-heart text-spotify-green"></i>';
  } else {
    likeButton.innerHTML = '<i class="far fa-heart"></i>';
  }
}

// Get audio analysis for visualizer (optional feature)
async function getAudioAnalysis(trackId) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/audio-analysis/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (response.ok) {
      const analysis = await response.json();
      return analysis;
    } else {
      // Audio analysis not available - this is OK, just use default visualizer
      console.log('🎵 Audio analysis not available for this track (using default visualizer)');
      return null;
    }
  } catch (error) {
    // Silently handle this - audio analysis is optional
    console.log('🎵 Audio analysis unavailable (using default visualizer)');
    return null;
  }
}

// Update now playing display
function updateNowPlaying(track) {
    console.log('🎵 Updating now playing UI for track:', track.name);
    
    // Set current track reference
    currentTrack = track;
    
    // Update track name and artist
    if (trackNameElement) {
        trackNameElement.textContent = track.name;
    }
    
    if (artistNameElement) {
        const artistNames = track.artists.map(artist => artist.name).join(', ');
        artistNameElement.textContent = artistNames;
    }
    
    // Update album name
    if (albumNameElement && track.album) {
        albumNameElement.textContent = track.album.name;
    }
    
    // Update album art (the album cover, not the vinyl disc)
    if (albumImageElement && track.album && track.album.images && track.album.images.length > 0) {
        const imageUrl = track.album.images[0].url;
        albumImageElement.src = imageUrl;
        albumImageElement.alt = `${track.album.name} album cover`;
        
        // Update background color based on album art
        updateBackgroundColor(albumImageElement);
        
        console.log('✅ Updated album art');
    } else {
        console.warn('⚠️ No album art available for track');
    }
    
    // Update track info in sidebar (if it exists)
    updateBasicTrackInfo(track);
    
    // Check if track is liked
    checkIfTrackIsLiked(track.id);
    
    // Start progress tracking
    startProgressTracking();
    
    console.log('✅ Now playing updated successfully');
}

// Update current track info in customization sidebar
function updateCurrentTrackInfo(track) {
  const trackInfoSection = document.getElementById('current-track-info');
  const trackDuration = document.getElementById('track-duration');
  const trackYear = document.getElementById('track-year');
  const trackPopularity = document.getElementById('track-popularity');
  
  if (trackInfoSection) {
    trackInfoSection.classList.remove('hidden');
  }
  
  if (track) {
    if (trackDuration) {
      trackDuration.textContent = formatTime(track.duration_ms);
    }
    
    if (trackYear && track.album && track.album.release_date) {
      const year = track.album.release_date.split('-')[0];
      trackYear.textContent = year;
    }
    
    if (trackPopularity) {
      trackPopularity.textContent = track.popularity || 'N/A';
    }
  }
}

// Dynamic background color system with animated gradients
let gradientAnimationId = null;
let currentColors = null;
let gradientPosition = 0;

// Update background color based on album art with advanced color extraction
function updateBackgroundColor(img) {
  console.log('🎨 ===== STARTING COLOR EXTRACTION =====');
  console.log('🎨 Image details:', {
    src: img.src,
    complete: img.complete,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    width: img.width,
    height: img.height
  });

  // Check if ColorThief is available
  if (!colorThief && !window.ColorThief) {
    console.log('🎨 ⚠️ ColorThief not available, using default background');
    setDefaultBackground();
    return;
  }
  
  console.log('🎨 ✅ ColorThief is available');
  
  // Wait for image to load completely
  if (!img.complete || img.naturalHeight === 0) {
    console.log('🎨 ⏳ Image not fully loaded, waiting...');
    img.onload = () => {
      console.log('🎨 ✅ Image loaded, retrying color extraction...');
      updateBackgroundColor(img);
    };
    img.onerror = () => {
      console.warn('🎨 ❌ Image failed to load, using default background');
      setDefaultBackground();
    };
    return;
  }
  
  console.log('🎨 ✅ Image is fully loaded, proceeding with extraction...');
  
  // Try multiple extraction methods
  tryColorExtractionMethods(img);
}

function tryColorExtractionMethods(img) {
  // Use the global colorThief instance or create a new one
  const thief = colorThief || (window.ColorThief ? new window.ColorThief() : null);
  
  if (!thief) {
    console.warn('🎨 ❌ No ColorThief instance available');
    setDefaultBackground();
    return;
  }
  
  // Method 1: Try ColorThief with the image directly
  console.log('🎨 🎯 METHOD 1: Direct ColorThief extraction...');
  try {
    const palette = thief.getPalette(img, 6, 2);
    console.log('🎨 Direct extraction result:', palette);
    
    if (palette && palette.length >= 2) {
      console.log('🎨 ✅ SUCCESS with direct method!');
      processExtractedColors(palette);
      return;
    }
  } catch (error) {
    console.warn('🎨 ❌ Direct method failed:', error.message);
  }
  
  // Method 2: Try with canvas (bypassing CORS)
  console.log('🎨 🎯 METHOD 2: Canvas-based extraction...');
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth || img.width || 300;
    canvas.height = img.naturalHeight || img.height || 300;
    
    console.log('🎨 Canvas size:', canvas.width, 'x', canvas.height);
    
    // Draw image to canvas
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    const palette = thief.getPalette(canvas, 6, 2);
    console.log('🎨 Canvas extraction result:', palette);
    
    if (palette && palette.length >= 2) {
      console.log('🎨 ✅ SUCCESS with canvas method!');
      processExtractedColors(palette);
      return;
    }
  } catch (error) {
    console.warn('🎨 ❌ Canvas method failed:', error.message);
  }
  
  // Method 3: Manual pixel sampling
  console.log('🎨 🎯 METHOD 3: Manual pixel sampling...');
  try {
    const colors = extractColorsManually(img);
    if (colors && colors.length > 0) {
      console.log('🎨 ✅ SUCCESS with manual method!');
      processExtractedColors(colors);
      return;
    }
  } catch (error) {
    console.warn('🎨 ❌ Manual method failed:', error.message);
  }
  
  // Method 4: Fallback with predefined colors
  console.log('🎨 🎯 METHOD 4: Using fallback colors...');
  extractColorsFromURL(img.src);
}

// Manual color extraction from canvas
function extractColorsManually(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Use smaller canvas for performance and to avoid CORS issues
  const maxSize = 50;
  canvas.width = maxSize;
  canvas.height = maxSize;
  
  console.log('🎨 Manual extraction canvas size:', canvas.width, 'x', canvas.height);
  
  // Draw the image to canvas
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  console.log('🎨 Got image data, length:', data.length);
  
  // Sample colors from the image
  const colorCounts = {};
  const sampleSize = 1; // Sample every pixel in our small canvas
  
  for (let i = 0; i < data.length; i += 4 * sampleSize) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    // Skip transparent or very light pixels
    if (a > 128 && (r < 240 || g < 240 || b < 240)) {
      // Group similar colors
      const colorKey = `${Math.floor(r/20)*20},${Math.floor(g/20)*20},${Math.floor(b/20)*20}`;
      colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
    }
  }
  
  // Get the most common colors
  const sortedColors = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([color]) => color.split(',').map(Number));
  
  console.log('🎨 Manual extraction found colors:', sortedColors);
  
  return sortedColors.length > 0 ? sortedColors : null;
}

// Fallback: Extract colors from URL using predefined palettes
function extractColorsFromURL(imageUrl) {
  console.log('🎨 Using URL-based color extraction fallback');
  
  // Predefined color palettes
  const predefinedColorPalettes = [
    [[231, 76, 60], [192, 57, 43], [241, 148, 138]],   // Red
    [[52, 152, 219], [41, 128, 185], [133, 193, 233]], // Blue
    [[46, 204, 113], [39, 174, 96], [125, 206, 160]],  // Green
    [[155, 89, 182], [142, 68, 173], [195, 155, 211]], // Purple
    [[230, 126, 34], [211, 84, 0], [243, 156, 18]],    // Orange
    [[241, 196, 15], [243, 156, 18], [254, 211, 48]],  // Yellow
    [[233, 30, 99], [173, 20, 87], [240, 98, 146]],    // Pink
    [[96, 125, 139], [69, 90, 100], [144, 164, 174]]   // Gray
  ];
  
  // Create a hash from the URL to get consistent colors for the same image
  let hash = 0;
  for (let i = 0; i < imageUrl.length; i++) {
    const char = imageUrl.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const colorIndex = Math.abs(hash) % predefinedColorPalettes.length;
  const palette = predefinedColorPalettes[colorIndex];
  
  console.log('🎨 ✅ Using predefined palette #', colorIndex, ':', palette);
  processExtractedColors(palette);
}

// Process extracted colors and start animation
function processExtractedColors(palette) {
  console.log('🎨 ===== PROCESSING EXTRACTED COLORS =====');
  console.log('🎨 Input palette:', palette);
  
  if (!palette || palette.length === 0) {
    console.warn('🎨 ❌ No colors to process, using default');
    setDefaultBackground();
    return;
  }
  
  // Extract and enhance colors
  const primaryColor = palette[0];
  const secondaryColor = palette[1] || adjustColor(primaryColor, 0.7, 1.3);
  const accentColor = palette[2] || adjustColor(primaryColor, 1.3, 0.7);
  
  console.log('🎨 Raw colors:', { primaryColor, secondaryColor, accentColor });
  
  // Enhance the colors for better visual impact
  const enhancedPrimary = enhanceColor(primaryColor);
  const enhancedSecondary = enhanceColor(secondaryColor);
  const enhancedAccent = enhanceColor(accentColor);
  
  // Store colors for animation
  currentColors = {
    primary: enhancedPrimary,
    secondary: enhancedSecondary,
    accent: enhancedAccent
  };
  
  console.log('🎨 ✅ FINAL COLORS FOR ANIMATION:', {
    primary: `rgb(${enhancedPrimary.join(', ')})`,
    secondary: `rgb(${enhancedSecondary.join(', ')})`,
    accent: `rgb(${enhancedAccent.join(', ')})`
  });
  
  // Start the animated gradient immediately
  startGradientAnimation();
}

// Adjust color by brightness/saturation factors
function adjustColor([r, g, b], brightnessFactor = 1, saturationFactor = 1) {
  // Convert to HSL, adjust, and convert back
  const [h, s, l] = rgbToHsl(r, g, b);
  const newS = Math.min(1, Math.max(0, s * saturationFactor));
  const newL = Math.min(1, Math.max(0, l * brightnessFactor));
  return hslToRgb(h, newS, newL);
}

// Enhance color saturation and vibrance for better visual impact
function enhanceColor([r, g, b], factor = 1.3) {
  // Convert to HSL for better color manipulation
  const [h, s, l] = rgbToHsl(r, g, b);
  
  // Enhance saturation and adjust lightness
  const enhancedS = Math.min(1, s * factor);
  const enhancedL = l < 0.5 ? Math.max(0.2, l * 1.2) : Math.min(0.8, l * 0.9);
  
  // Convert back to RGB
  return hslToRgb(h, enhancedS, enhancedL);
}

// RGB to HSL conversion
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

// HSL to RGB conversion
function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Start animated gradient that evolves with the music
function startGradientAnimation() {
  if (!currentColors) return;
  
  // Stop any existing animation
  if (gradientAnimationId) {
    cancelAnimationFrame(gradientAnimationId);
  }
  
  const background = document.getElementById('app-background');
  if (!background) return;
  
  const animate = () => {
    gradientPosition += 0.5; // Slow, smooth movement
    
    // Create time-based color variations
    const time = Date.now() * 0.001; // Convert to seconds
    const wave1 = Math.sin(time * 0.3) * 0.3 + 0.7; // Slow wave
    const wave2 = Math.cos(time * 0.2) * 0.2 + 0.8; // Different frequency
    
    // Calculate dynamic positions for gradient stops
    const pos1 = 20 + Math.sin(time * 0.1) * 20; // 0-40%
    const pos2 = 60 + Math.cos(time * 0.15) * 25; // 35-85%
    const pos3 = 80 + Math.sin(time * 0.08) * 15; // 65-95%
    
    // Create color variations with time
    const primary = currentColors.primary.map(c => Math.round(c * wave1));
    const secondary = currentColors.secondary.map(c => Math.round(c * wave2));
    const accent = currentColors.accent.map(c => Math.round(c * (wave1 + wave2) / 2));
    
    // Create complex animated gradient
    const gradient = `
      radial-gradient(ellipse at ${30 + Math.sin(time * 0.1) * 20}% ${40 + Math.cos(time * 0.08) * 30}%, 
        rgba(${primary.join(', ')}, 0.4) 0%, 
        rgba(${secondary.join(', ')}, 0.3) ${pos1}%, 
        rgba(${accent.join(', ')}, 0.2) ${pos2}%, 
        rgba(${primary.join(', ')}, 0.1) ${pos3}%, 
        rgba(18, 18, 18, 0.9) 100%),
      linear-gradient(${135 + Math.sin(time * 0.12) * 30}deg, 
        rgba(${secondary.join(', ')}, 0.3) 0%, 
        rgba(${primary.join(', ')}, 0.2) 50%, 
        rgba(${accent.join(', ')}, 0.25) 100%)`;
    
    background.style.background = gradient;
    
    gradientAnimationId = requestAnimationFrame(animate);
  };
  
  animate();
  
  console.log('🎨 Started animated gradient with colors:', {
    primary: `rgb(${currentColors.primary.join(', ')})`,
    secondary: `rgb(${currentColors.secondary.join(', ')})`,
    accent: `rgb(${currentColors.accent.join(', ')})`
  });
}

// Stop gradient animation
function stopGradientAnimation() {
  if (gradientAnimationId) {
    cancelAnimationFrame(gradientAnimationId);
    gradientAnimationId = null;
  }
  currentColors = null;
  gradientPosition = 0;
}

// Set default background when no music is playing
function setDefaultBackground() {
  stopGradientAnimation();
  
  const background = document.getElementById('app-background');
  if (background) {
    // Clean, minimal dark background when idle
    background.style.background = `
      linear-gradient(135deg, 
        rgba(18, 18, 18, 1) 0%, 
        rgba(25, 25, 25, 1) 50%, 
        rgba(18, 18, 18, 1) 100%)`;
  }
  
  console.log('🎨 Set default background (no music playing)');
}

// Call this when music stops
function resetBackgroundToDefault() {
  console.log('🎨 Resetting background to default');
  setDefaultBackground();
}

// Start progress tracking
function startProgressTracking() {
  stopProgressTracking();
  
  progressInterval = setInterval(() => {
    if (playbackState.isPlaying) {
      playbackState.progressMs += 1000;
      updateProgressBar(playbackState.progressMs, playbackState.durationMs);
    }
  }, 1000);
}

// Stop progress tracking
function stopProgressTracking() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

// Update the progress bar
function updateProgressBar(progress, duration) {
  const progressFill = document.getElementById('progress-fill');
  const currentTimeElement = document.getElementById('current-time');
  const totalTimeElement = document.getElementById('total-time');
  
  if (duration > 0) {
    const percentage = (progress / duration) * 100;
    
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }
    
    // Update time display
    if (currentTimeElement) {
      currentTimeElement.textContent = formatTime(progress);
    }
    if (totalTimeElement) {
      totalTimeElement.textContent = formatTime(duration);
    }
  } else {
    if (progressFill) {
      progressFill.style.width = '0%';
    }
    if (currentTimeElement) {
      currentTimeElement.textContent = '0:00';
    }
    if (totalTimeElement) {
      totalTimeElement.textContent = '0:00';
    }
  }
}

// Format time in MM:SS
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Update the play/pause button and record animation
function updatePlayPauseButton(isPlaying) {
  const button = document.getElementById('play-pause');
  const icon = button ? button.querySelector('i') : null;
  const record = document.querySelector('.record-disc');
  
  if (isPlaying) {
    if (icon) {
      icon.className = 'fas fa-pause';
    }
    // Start spinning the record
    if (record) {
      record.classList.add('spinning');
    }
    startVisualizerAnimation();
  } else {
    if (icon) {
      icon.className = 'fas fa-play';
    }
    // Stop spinning the record
    if (record) {
      record.classList.remove('spinning');
    }
    stopVisualizerAnimation();
  }
}

// Start visualizer animation
function startVisualizerAnimation() {
  const bars = document.querySelectorAll('.bar');
  
  bars.forEach(bar => {
    const height = 2 + Math.random() * 8;
    const animationDuration = (1 + Math.random() * 2).toFixed(1);
    bar.style.height = `${height}px`;
    bar.style.animation = `barAnimation ${animationDuration}s ease-in-out infinite`;
  });
  
  // Start animating bars based on audio analysis
  if (audioAnalysisData) {
    animateVisualizerWithAudioData();
  }
}

// Animate visualizer with audio analysis data
function animateVisualizerWithAudioData() {
  if (!audioAnalysisData || !audioAnalysisData.segments) return;
  
  const bars = document.querySelectorAll('.bar');
  const segments = audioAnalysisData.segments;
  
  // Use the audio analysis segments to animate the bars
  let segmentIndex = 0;
  
  // Clear previous interval if exists
  if (window.visualizerInterval) {
    clearInterval(window.visualizerInterval);
  }
  
  // Create interval for animation
  window.visualizerInterval = setInterval(() => {
    if (playbackState.isPlaying && segments[segmentIndex]) {
      const segment = segments[segmentIndex];
      const pitches = segment.pitches;
      
      // Use pitches to set bar heights
      bars.forEach((bar, i) => {
        const pitchIndex = i % pitches.length;
        const height = Math.max(2, Math.floor(pitches[pitchIndex] * 20));
        bar.style.height = `${height}px`;
      });
      
      // Move to next segment
      segmentIndex = (segmentIndex + 1) % segments.length;
    }
  }, 200);
}

// Stop visualizer animation
function stopVisualizerAnimation() {
  const bars = document.querySelectorAll('.bar');
  
  bars.forEach(bar => {
    bar.style.animation = 'none';
    bar.style.height = '2px';
  });
  
  // Clear visualizer interval
  if (window.visualizerInterval) {
    clearInterval(window.visualizerInterval);
    window.visualizerInterval = null;
  }
}

// Logout
function logout() {
    console.log('🔴 Logging out...');
    
    // Stop any ongoing background animations
    resetBackgroundToDefault();
    
    // Clear Spotify player
    if (spotifyPlayer) {
      spotifyPlayer.disconnect();
      spotifyPlayer = null;
    }
    
    // Clear tokens
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expires');
    localStorage.removeItem('spotify_auth_state');
    
    // Clear variables
    accessToken = null;
    refreshToken = null;
    currentTrack = null;
    currentUser = null;
    currentUserId = null;
    
    // Stop animations
    stopVisualizerAnimation();
    stopProgressTracking();
    if (window.backgroundInterval) {
      clearInterval(window.backgroundInterval);
    }
    
    // Get DOM elements
    const userProfileElement = document.getElementById('user-profile');
    const loginButton = document.getElementById('login-btn');
    const mainContentElement = document.getElementById('main-content');
    const authMessageElement = document.getElementById('auth-message');
    const authSection = document.getElementById('auth-section');
    const usageStatsDisplay = document.getElementById('usage-stats-mini');
    
    // Update UI - Hide user profile
    if (userProfileElement) {
      userProfileElement.classList.add('hidden');
      userProfileElement.style.display = 'none';
      console.log('🙈 User profile hidden');
    }
    
    // Show login button
    if (loginButton) {
      loginButton.classList.remove('hidden');
      console.log('👁️ Login button shown');
    }
    
    // Hide usage stats
    if (usageStatsDisplay) {
      usageStatsDisplay.classList.add('hidden');
    }
    
    // Hide main content and show auth section
    if (mainContentElement) {
      mainContentElement.classList.add('hidden');
      console.log('🙈 Main content hidden');
    }
    
    if (authSection) {
      authSection.classList.remove('hidden');
      console.log('👁️ Auth section shown');
    }
    
    if (authMessageElement) {
      authMessageElement.classList.remove('hidden');
      console.log('👁️ Auth message shown');
    }
    
    // Clear track data
    shuffledTracks = [];
    currentTrackIndex = 0;
    updateNowPlaying(null);
    
    // Reset any global settings
    window.selectedGenres = [];
    window.selectedMood = null;
    
    // Show notification
    showNotification('Successfully logged out', 'success');
    
    console.log('✅ Logout complete');
}

// Refresh access token
async function refreshAccessToken() {
  try {
    console.log('🔄 Attempting to refresh access token...');
    
    const currentRefreshToken = localStorage.getItem('spotify_refresh_token');
    if (!currentRefreshToken) {
      console.log('❌ No refresh token available, redirecting to login...');
      logout();
      return false;
    }
    
    // For simplicity, since we have Authorization Code flow, just re-login
    // In production, you'd want a proper refresh endpoint on the server
    console.log('ℹ️ Token refresh requires re-authentication with current setup');
    
    // Clear expired tokens
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_token_expires');
    
    // Redirect to login
    window.location.href = '/login';
    return false;
    
  } catch (error) {
    console.error('❌ Error refreshing token:', error);
    logout();
    return false;
  }
}

// Generate a random string for state parameter
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  
  return text;
}

// Show the auth message
function showAuthMessage() {
  const mainContentElement = document.getElementById('main-content');
  const authMessageElement = document.getElementById('auth-message');
  const loginButton = document.getElementById('login-btn');
  const userDisplayElement = document.getElementById('user-display');
  
  if (mainContentElement) mainContentElement.classList.add('hidden');
  if (authMessageElement) authMessageElement.classList.remove('hidden');
  if (loginButton) loginButton.classList.remove('hidden');
  if (userDisplayElement) userDisplayElement.classList.add('hidden');
}

// Show loading state
function showLoading() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.classList.remove('hidden');
  }
}

// Hide loading state
function hideLoading() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
  }
}

// Add CSS for visualizer animation
const style = document.createElement('style');
style.textContent = `
  @keyframes barAnimation {
    0%, 100% { height: 0.25rem; }
    50% { height: 2rem; }
  }
`;
document.head.appendChild(style);

// Clear invalid tokens and start fresh
function clearAuthTokens() {
  console.log('🧹 Clearing authentication tokens...');
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_expires');
  localStorage.removeItem('spotify_auth_state');
  accessToken = null;
  refreshToken = null;
  
  // Clear URL hash if present
  if (window.location.hash) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Make clearAuthTokens globally available for debugging
window.clearAuthTokens = clearAuthTokens;

// Track usage of shuffle feature
function trackShuffleUsage(shuffleType, count = 1) {
  console.log(`📊 Tracking usage of shuffle type: ${shuffleType}, count: ${count}`);
  
  try {
    // Get existing usage stats
    let usageStats = JSON.parse(localStorage.getItem('trueShuffleUsageStats') || '{}');
    
    // Initialize if not exists
    if (!usageStats.shuffleCount) {
      usageStats.shuffleCount = {};
    }
    
    // Increment count for this shuffle type
    if (!usageStats.shuffleCount[shuffleType]) {
      usageStats.shuffleCount[shuffleType] = 0;
    }
    usageStats.shuffleCount[shuffleType] += count;
    
    // Track total shuffles
    if (!usageStats.totalShuffles) {
      usageStats.totalShuffles = 0;
    }
    usageStats.totalShuffles += count;
    
    // Track last used
    usageStats.lastUsed = Date.now();
    
    // Save back to localStorage
    localStorage.setItem('trueShuffleUsageStats', JSON.stringify(usageStats));
    
    // Always allow to proceed in this implementation
    return true;
  } catch (error) {
    console.error('❌ Error tracking shuffle usage:', error);
    // Still allow to proceed even if tracking fails
    return true;
  }
}

function discoverMusic() {
  console.log('🎵 Starting radio mode...');
  
  // Check usage limits before proceeding
  const canProceed = trackShuffleUsage(currentShuffleType, 1);
  if (!canProceed) {
    console.log('⚠️ Usage limit reached, showing upgrade prompt');
    return; // Usage limit reached, upgrade prompt already shown
  }
  
  // Show the player section
  showPlayerSection();
  
  // Fetch new tracks based on current shuffle type
  fetchRecommendations();
}

function showPlayerSection() {
  console.log('🎵 Showing player section...');
  const radioSettings = document.getElementById('radio-settings');
  const playerSection = document.getElementById('player-section');
  
  if (radioSettings) {
    radioSettings.style.display = 'none';
    console.log('🙈 Hidden radio settings');
  }
  
  if (playerSection) {
    playerSection.classList.remove('hidden');
    playerSection.style.display = 'block';
    console.log('👁️ Showed player section');
  }
}

function showRadioSection() {
  console.log('🔍 Showing radio section...');
  const radioSettings = document.getElementById('radio-settings');
  const playerSection = document.getElementById('player-section');
  
  if (playerSection) {
    playerSection.classList.add('hidden');
    playerSection.style.display = 'none';
    console.log('🙈 Hidden player section');
  }
  
  if (radioSettings) {
    radioSettings.style.display = 'block';
    console.log('👁️ Showed radio settings');
  }
}

// Mood selection function
function selectMood(mood) {
  console.log(`🎭 Mood selected: ${mood}`);
  selectedMood = mood;
  
  // Update mood button UI
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  document.querySelector(`[data-mood="${mood}"]`).classList.add('active');
}

// Toggle genre selection for mix genres
function toggleGenre(genre) {
  console.log(`🎨 Toggling genre: ${genre}`);
  
  const index = selectedGenres.indexOf(genre);
  if (index > -1) {
    // Remove genre
    selectedGenres.splice(index, 1);
  } else {
    // Add genre (max 6)
    if (selectedGenres.length < 6) {
      selectedGenres.push(genre);
    } else {
      alert('Maximum 6 genres allowed. Deselect one first.');
      return;
    }
  }
  
  updateGenreSelectionDisplay();
  console.log(`🎨 Selected genres:`, selectedGenres);
}

// Update genre selection UI
function updateGenreSelectionDisplay() {
  const feedbackElement = document.getElementById('genre-selection-feedback');
  if (feedbackElement) {
    if (selectedGenres.length === 0) {
      feedbackElement.textContent = 'Please select 2-6 genres to mix';
      feedbackElement.style.color = '#b3b3b3';
    } else if (selectedGenres.length < 2) {
      feedbackElement.textContent = `${selectedGenres.length} selected - need at least 2`;
      feedbackElement.style.color = '#f87171';
    } else if (selectedGenres.length > 6) {
      feedbackElement.textContent = `${selectedGenres.length} selected - maximum 6`;
      feedbackElement.style.color = '#f87171';
    } else {
      feedbackElement.textContent = `${selectedGenres.length} genres selected - ready to mix!`;
      feedbackElement.style.color = '#1db954';
    }
  }
}

// Setup customization controls
function setupCustomizationControls() {
  // Year filter toggle
  const yearToggle = document.getElementById('year-filter-toggle');
  const yearControls = document.getElementById('year-range-controls');
  const yearFrom = document.getElementById('year-from');
  const yearTo = document.getElementById('year-to');
  const yearDisplay = document.getElementById('year-range-display');
  
  if (yearToggle && yearControls) {
    yearToggle.addEventListener('change', function() {
      customSettings.yearFilter = this.checked;
      if (this.checked) {
        yearControls.classList.remove('hidden');
      } else {
        yearControls.classList.add('hidden');
      }
      console.log('📅 Year filter toggled:', customSettings.yearFilter);
    });
  }
  
  // Year range inputs
  if (yearFrom && yearTo && yearDisplay) {
    function updateYearRange() {
      customSettings.yearFrom = parseInt(yearFrom.value);
      customSettings.yearTo = parseInt(yearTo.value);
      
      // Ensure from <= to
      if (customSettings.yearFrom > customSettings.yearTo) {
        customSettings.yearFrom = customSettings.yearTo;
        yearFrom.value = customSettings.yearFrom;
      }
      
      yearDisplay.textContent = `${customSettings.yearFrom}-${customSettings.yearTo}`;
      console.log('📅 Year range updated:', customSettings.yearFrom, '-', customSettings.yearTo);
    }
    
    yearFrom.addEventListener('input', updateYearRange);
    yearTo.addEventListener('input', updateYearRange);
  }
  
  // Popularity filter
  const popularityToggle = document.getElementById('popularity-filter-toggle');
  const popularityControls = document.getElementById('popularity-controls');
  const popularitySlider = document.getElementById('popularity-slider');
  const popularityValue = document.getElementById('popularity-value');
  
  if (popularityToggle && popularityControls) {
    popularityToggle.addEventListener('change', function() {
      customSettings.popularityFilter = this.checked;
      if (this.checked) {
        popularityControls.classList.remove('opacity-50');
      } else {
        popularityControls.classList.add('opacity-50');
      }
      console.log('⭐ Popularity filter toggled:', customSettings.popularityFilter);
    });
  }
  
  if (popularitySlider && popularityValue) {
    popularitySlider.addEventListener('input', function() {
      customSettings.maxPopularity = parseInt(this.value);
      popularityValue.textContent = customSettings.maxPopularity;
      console.log('⭐ Max popularity updated:', customSettings.maxPopularity);
    });
  }
  
  // Search randomness
  const offsetSlider = document.getElementById('offset-slider');
  const offsetValue = document.getElementById('offset-value');
  
  if (offsetSlider && offsetValue) {
    offsetSlider.addEventListener('input', function() {
      customSettings.searchOffset = parseInt(this.value);
      offsetValue.textContent = customSettings.searchOffset;
      console.log('🎲 Search offset updated:', customSettings.searchOffset);
    });
  }
  
  // Preset buttons
  const presetButtons = document.querySelectorAll('.preset-btn');
  presetButtons.forEach(button => {
    button.addEventListener('click', function() {
      const preset = this.getAttribute('data-preset');
      applyPreset(preset);
      
      // Update button states
      presetButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
    });
  });
  
  console.log('⚙️ Customization controls initialized');
}

// Apply preset configurations
function applyPreset(preset) {
  console.log(`🎛️ Applying preset: ${preset}`);
  
  const yearToggle = document.getElementById('year-filter-toggle');
  const yearControls = document.getElementById('year-range-controls');
  const yearFrom = document.getElementById('year-from');
  const yearTo = document.getElementById('year-to');
  const yearDisplay = document.getElementById('year-range-display');
  const popularitySlider = document.getElementById('popularity-slider');
  const popularityValue = document.getElementById('popularity-value');
  const offsetSlider = document.getElementById('offset-slider');
  const offsetValue = document.getElementById('offset-value');
  
  switch (preset) {
    case 'mainstream':
      // High popularity, recent years, low randomness
      customSettings = { ...customSettings, yearFilter: false, popularityFilter: true, maxPopularity: 90, searchOffset: 100 };
      if (yearToggle) yearToggle.checked = false;
      if (yearControls) yearControls.classList.add('hidden');
      break;
      
    case 'underground':
      // Low popularity, high randomness
      customSettings = { ...customSettings, yearFilter: false, popularityFilter: true, maxPopularity: 30, searchOffset: 1000 };
      if (yearToggle) yearToggle.checked = false;
      if (yearControls) yearControls.classList.add('hidden');
      break;
      
    case 'vintage':
      // 1960-1999, medium popularity
      customSettings = { ...customSettings, yearFilter: true, yearFrom: 1960, yearTo: 1999, popularityFilter: true, maxPopularity: 60, searchOffset: 600 };
      if (yearToggle) yearToggle.checked = true;
      if (yearControls) yearControls.classList.remove('hidden');
      if (yearFrom) yearFrom.value = 1960;
      if (yearTo) yearTo.value = 1999;
      if (yearDisplay) yearDisplay.textContent = '1960-1999';
      break;
      
    case 'modern':
      // 2010-2024, medium popularity
      customSettings = { ...customSettings, yearFilter: true, yearFrom: 2010, yearTo: 2024, popularityFilter: true, maxPopularity: 70, searchOffset: 400 };
      if (yearToggle) yearToggle.checked = true;
      if (yearControls) yearControls.classList.remove('hidden');
      if (yearFrom) yearFrom.value = 2010;
      if (yearTo) yearTo.value = 2024;
      if (yearDisplay) yearDisplay.textContent = '2010-2024';
      break;
  }
  
  // Update UI elements
  if (popularitySlider) popularitySlider.value = customSettings.maxPopularity;
  if (popularityValue) popularityValue.textContent = customSettings.maxPopularity;
  if (offsetSlider) offsetSlider.value = customSettings.searchOffset;
  if (offsetValue) offsetValue.textContent = customSettings.searchOffset;
  
  console.log('✅ Preset applied:', customSettings);
}

// Get search parameters based on custom settings
function getSearchParameters() {
  let yearQuery = '';
  if (customSettings.yearFilter) {
    if (customSettings.yearFrom === customSettings.yearTo) {
      yearQuery = ` year:${customSettings.yearFrom}`;
    } else {
      yearQuery = ` year:${customSettings.yearFrom}-${customSettings.yearTo}`;
    }
  }
  
  const randomOffset = Math.floor(Math.random() * customSettings.searchOffset);
  
  return {
    yearQuery,
    randomOffset,
    maxPopularity: customSettings.popularityFilter ? customSettings.maxPopularity : 100
  };
}

// Fetch mood-based tracks using search instead of recommendations
async function fetchMoodBasedTracks() {
  console.log('🎭 Fetching mood-based tracks...');
  
  // Use mood from settings, fallback to legacy selectedMood
  const moodToUse = (customSettings.moods && customSettings.moods.length > 0) ? 
                    customSettings.moods[0] : selectedMood;
  
  if (!moodToUse) {
    showNotification('Please select a mood in settings before discovering music.', 'warning');
    return [];
  }
  
  console.log('🎭 Using mood:', moodToUse);
  
  try {
    // Define search terms for each mood with better variety
    const moodSearchTerms = {
      happy: ['upbeat', 'joyful', 'cheerful', 'positive', 'bright', 'sunny', 'feel good', 'uplifting'],
      chill: ['chill', 'relaxing', 'ambient', 'calm', 'peaceful', 'mellow', 'downtempo', 'lounge'],
      energetic: ['energetic', 'pump up', 'workout', 'high energy', 'intense', 'power', 'driving', 'dynamic'],
      melancholic: ['sad', 'melancholy', 'emotional', 'heartbreak', 'moody', 'blues', 'introspective', 'contemplative'],
      focus: ['instrumental', 'study', 'focus', 'ambient', 'minimal', 'concentration', 'meditation', 'atmospheric'],
      party: ['party', 'dance', 'club', 'electronic', 'beat', 'pump', 'celebration', 'festival']
    };
    
    const searchTerms = moodSearchTerms[moodToUse] || ['music'];
    const allTracks = [];
    const usedTrackIds = new Set();
    
    // Use multiple search terms for better variety
    const shuffledTerms = [...searchTerms].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < Math.min(4, shuffledTerms.length) && allTracks.length < 50; i++) {
      const randomTerm = shuffledTerms[i];
      
      // Build search query with enhanced settings
      let searchQuery = randomTerm;
      
      // Apply year filter from settings
      if (customSettings.yearFrom && customSettings.yearTo) {
          if (customSettings.yearFrom === customSettings.yearTo) {
              searchQuery += ` year:${customSettings.yearFrom}`;
          } else {
              searchQuery += ` year:${customSettings.yearFrom}-${customSettings.yearTo}`;
          }
          console.log(`📅 Applied year filter: ${customSettings.yearFrom}-${customSettings.yearTo}`);
      }
      
      // Apply genre filter from settings if available
      if (customSettings.genres && customSettings.genres.length > 0) {
          const randomGenre = customSettings.genres[Math.floor(Math.random() * customSettings.genres.length)];
          searchQuery += ` genre:${randomGenre}`;
          console.log(`🎵 Applied genre filter: ${randomGenre}`);
      }
      
      const randomOffset = Math.floor(Math.random() * 500);
      
      console.log(`🔍 Searching for mood tracks: "${searchQuery}" (offset: ${randomOffset})`);
      
      try {
        const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=50&offset=${randomOffset}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`📊 Found ${data.tracks.items.length} mood tracks for "${randomTerm}"`);
          
          const validTracks = data.tracks.items.filter(track => {
            // Apply popularity filter from settings
            const maxPopularity = customSettings.popularity || 90;
            if (track.popularity > maxPopularity) return false;
            
            if (usedTrackIds.has(track.id)) return false;
            
            // Basic quality filters
            const albumName = track.album.name.toLowerCase();
            if (albumName.includes('karaoke') || 
                albumName.includes('tribute') ||
                albumName.includes('cover')) {
              return false;
            }
            
            return true;
          });
          
          for (const track of validTracks) {
            if (allTracks.length >= 50) break;
            allTracks.push(track);
            usedTrackIds.add(track.id);
          }
        } else {
          console.error('❌ Mood search failed:', response.status);
        }
      } catch (error) {
        console.error(`❌ Error searching for mood "${randomTerm}":`, error);
      }
      
      // Brief delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`🎭 Mood search complete: ${allTracks.length} tracks for ${moodToUse}`);
    
    // Apply Fisher-Yates shuffle and update global state
    if (allTracks.length > 0) {
      shuffledTracks = fisherYatesShuffle([...allTracks]);
      currentTrackIndex = 0;
      await playCurrentTrack();
    } else {
      showNotification('No tracks found for selected mood. Try different settings.', 'warning');
    }
    
    return allTracks;
    
  } catch (error) {
    console.error('❌ Error fetching mood-based tracks:', error);
    showNotification('Failed to fetch mood-based tracks', 'error');
    return [];
  }
}

// Update track analysis in sidebar
async function updateTrackAnalysis(track) {
  if (!track || !track.id) {
    console.log('⚠️ No track provided for analysis');
    return;
  }
  
  try {
    console.log(`🔍 Analyzing track: ${track.name}`);
    
    // Fetch audio features for the current track
    const response = await fetch(`https://api.spotify.com/v1/audio-features/${track.id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`⚠️ Audio features not available for this track (Spotify API restrictions)`);
        // Show basic track info without audio features
        updateBasicTrackInfo(track);
        return;
      } else {
        console.warn(`⚠️ Failed to fetch audio features: ${response.status}`);
        return;
      }
    }
    
    const features = await response.json();
    currentTrackFeatures = features;
    
    console.log('✅ Audio features loaded:', features);
    
    // Update sidebar with audio features
    updateAudioFeatureBars(features);
    updateTrackDetails(track, features);
    updateMoodDisplay(features);
    
    // Show sidebar when track analysis is available
    if (customizationSidebar) {
      customizationSidebar.classList.remove('hidden');
      customizationSidebar.classList.add('lg:block');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing track:', error);
    // Fallback to basic track info
    updateBasicTrackInfo(track);
  }
}

// Update basic track info when audio features aren't available
function updateBasicTrackInfo(track) {
    const trackInfoDiv = document.getElementById('current-track-info');
    if (!trackInfoDiv || !track) return;

    const releaseYear = track.album?.release_date ? new Date(track.album.release_date).getFullYear() : 'Unknown';
    const duration = track.duration_ms ? formatTime(track.duration_ms) : 'Unknown';
    const popularity = track.popularity || 0;
    const albumName = track.album?.name || 'Unknown Album';
    const trackNumber = track.track_number || 0;
    const totalTracks = track.album?.total_tracks || 0;

    trackInfoDiv.innerHTML = `
        <div class="space-y-3">
            <div>
                <h4 class="font-semibold text-white mb-1">Album</h4>
                <p class="text-spotify-text text-sm">${albumName}</p>
            </div>
            <div>
                <h4 class="font-semibold text-white mb-1">Track</h4>
                <p class="text-spotify-text text-sm">${trackNumber} of ${totalTracks}</p>
            </div>
            <div>
                <h4 class="font-semibold text-white mb-1">Duration</h4>
                <p class="text-spotify-text">${duration}</p>
            </div>
            <div>
                <h4 class="font-semibold text-white mb-1">Release Year</h4>
                <p class="text-spotify-text">${releaseYear}</p>
            </div>
            <div>
                <h4 class="font-semibold text-white mb-1">Popularity</h4>
                <div class="flex items-center">
                    <div class="bg-spotify-light rounded-full h-2 flex-1 mr-2">
                        <div class="bg-spotify-green h-2 rounded-full" style="width: ${popularity}%"></div>
                    </div>
                    <span class="text-spotify-text text-sm">${popularity}/100</span>
                </div>
            </div>
        </div>
    `;
    
    console.log('✅ Updated basic track info in sidebar');
}

// Update audio feature bars in sidebar
function updateAudioFeatureBars(features) {
  const featureElements = [
    { key: 'energy', barId: 'energy-bar', valueId: 'energy-value' },
    { key: 'valence', barId: 'valence-bar', valueId: 'valence-value' },
    { key: 'danceability', barId: 'danceability-bar', valueId: 'danceability-value' },
    { key: 'acousticness', barId: 'acousticness-bar', valueId: 'acousticness-value' }
  ];
  
  featureElements.forEach(({ key, barId, valueId }) => {
    const value = features[key];
    const percentage = Math.round(value * 100);
    
    const bar = document.getElementById(barId);
    const valueElement = document.getElementById(valueId);
    
    if (bar && valueElement) {
      bar.style.width = `${percentage}%`;
      valueElement.textContent = `${percentage}%`;
    }
  });
}

// Update track details in sidebar
function updateTrackDetails(track, features) {
  const tempo = Math.round(features.tempo);
  const key = getKeyString(features.key, features.mode);
  const timeSignature = `${features.time_signature}/4`;
  const duration = formatTime(track.duration_ms);
  
  const elements = [
    { id: 'tempo-value', value: `${tempo} BPM` },
    { id: 'key-value', value: key },
    { id: 'time-signature-value', value: timeSignature },
    { id: 'duration-value', value: duration }
  ];
  
  elements.forEach(({ id, value }) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });
}

// Convert key number to string
function getKeyString(keyNumber, mode) {
  const keys = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const keyName = keys[keyNumber] || '?';
  const modeName = mode === 1 ? 'major' : 'minor';
  return `${keyName} ${modeName}`;
}

// Update mood display based on audio features
function updateMoodDisplay(features) {
  const moodDisplay = document.getElementById('mood-display');
  if (!moodDisplay) return;
  
  // Determine mood based on audio features
  let detectedMood = 'Unknown';
  
  if (features.valence > 0.7 && features.energy > 0.6) {
    detectedMood = '😊 Happy & Energetic';
  } else if (features.valence > 0.6) {
    detectedMood = '🙂 Positive & Upbeat';
  } else if (features.valence < 0.3 && features.energy < 0.4) {
    detectedMood = '😔 Melancholic & Sad';
  } else if (features.energy > 0.8) {
    detectedMood = '⚡ High Energy';
  } else if (features.acousticness > 0.6) {
    detectedMood = '🍃 Chill & Acoustic';
  } else if (features.danceability > 0.7) {
    detectedMood = '💃 Danceable';
  } else {
    detectedMood = '🎵 Balanced';
  }
  
  moodDisplay.textContent = detectedMood;
}

// Initialize DOM elements once the page loads
function initializeDOMElements() {
    // Get DOM elements that need to be available after DOMContentLoaded
    trackNameElement = document.getElementById('track-name');
    artistNameElement = document.getElementById('artist-name');
    albumNameElement = document.getElementById('album-name');
    vinylRecord = document.getElementById('vinyl-record');
    albumImageElement = document.getElementById('album-image');
    albumCoverElement = document.getElementById('album-cover');
}

// ============================================
// ONBOARDING SYSTEM
// ============================================

// Check if user is first-time and handle onboarding
function handleUserOnboarding() {
    console.log('🔍 Checking user onboarding status...');
    
    const hasSeenOnboarding = localStorage.getItem('trueShuffleOnboardingComplete');
    const isFirstTimeUser = !hasSeenOnboarding;
    
    console.log('👤 First-time user:', isFirstTimeUser);
    
    if (isFirstTimeUser) {
        console.log('🎯 Showing onboarding for first-time user');
        localStorage.setItem('trueShuffleFirstTimeUser', 'true');
        showOnboardingModal();
    } else {
        console.log('👋 Welcome back! Skipping onboarding for returning user');
        localStorage.setItem('trueShuffleFirstTimeUser', 'false');
    }
}

// Show onboarding modal
function showOnboardingModal() {
    const onboardingModal = document.getElementById('onboarding-modal');
    if (onboardingModal) {
        onboardingModal.classList.remove('hidden');
        console.log('✅ Onboarding modal shown');
    }
}

// Hide onboarding modal
function hideOnboardingModal() {
    const onboardingModal = document.getElementById('onboarding-modal');
    if (onboardingModal) {
        onboardingModal.classList.add('hidden');
        console.log('✅ Onboarding modal hidden');
    }
}

// Mark onboarding as complete
function completeOnboarding() {
    console.log('✅ Onboarding completed');
    localStorage.setItem('trueShuffleOnboardingComplete', 'true');
    localStorage.setItem('trueShuffleFirstTimeUser', 'false');
}

// Check if current user is first-time
function isFirstTimeUser() {
    return localStorage.getItem('trueShuffleFirstTimeUser') === 'true';
}

// ============================================
// SETTINGS MANAGEMENT SYSTEM
// ============================================

// User data storage
// currentUserId is already declared globally

// Enhanced default settings configuration for production
const defaultSettings = {
    // Core Music Preferences
    genres: [], // User selected genres
    moods: [],  // User selected moods
    languages: ['en'], // Language filtering (ISO codes)
    yearFrom: 1950, // Year range start
    yearTo: 2024,   // Year range end
    shuffleType: 'true-random', // Core shuffle algorithm
    
    // Audio & Discovery Settings
    popularity: 70, // 0-100, lower = more underground music
    explicitContent: true, // Allow explicit content
    trackDurationMin: 30, // Minimum track length in seconds
    trackDurationMax: 600, // Maximum track length in seconds (10 min)
    
    // Advanced Discovery
    repeatProtection: 'session', // 'none', 'session', 'persistent'
    genreDiversity: 0.7, // 0-1, higher = more genre mixing
    moodAdaptation: true, // Adapt to listening patterns
    
    // App Behavior
    autoAdvance: true, // Auto-play next track
    crossfade: false, // Crossfade between tracks
    volumeNormalization: false, // Normalize volume levels
    
    // UI Preferences  
    darkMode: true,
    compactMode: false,
    showLyrics: false,
    showQueue: true,
    
    // Privacy & Data
    saveListeningHistory: true,
    shareData: false,
    analyticsEnabled: true
};

// Production settings management class
class ProductionSettingsManager {
    constructor() {
        this.settings = { ...defaultSettings };
        this.isLoaded = false;
        this.saveDebounceTimer = null;
        this.validationErrors = [];
    }

    async init() {
        console.log('⚙️ Initializing Production Settings Manager...');
        
        try {
            await this.loadSettings();
            this.validateSettings();
            this.applySettings();
            this.setupAutoSave();
            this.isLoaded = true;
            
            console.log('✅ Settings Manager initialized successfully');
            return true;
  } catch (error) {
            console.error('❌ Settings Manager initialization failed:', error);
            this.settings = { ...defaultSettings };
            return false;
        }
    }

    async loadSettings() {
        console.log('📖 Loading user settings...');
        
        // Try multiple sources in order of preference
        const sources = [
            () => this.loadFromServer(),
            () => this.loadFromLocalStorage(),
            () => this.loadFromDefaults()
        ];

        for (const loadSource of sources) {
            try {
                const settings = await loadSource();
                if (settings && this.validateSettings(settings)) {
                    this.settings = { ...defaultSettings, ...settings };
                    console.log('✅ Settings loaded successfully');
                    return;
                }
            } catch (error) {
                console.warn('⚠️ Settings load source failed:', error);
                continue;
            }
        }

        throw new Error('All settings sources failed');
    }

    async loadFromServer() {
        if (!currentUserId || !accessToken) {
            console.log('⚠️ No user ID or access token available for server load');
    return null;
  }
        
        try {
            const response = await fetch(`/api/settings/${currentUserId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Settings loaded from server');
                return data.settings;
            } else if (response.status === 401) {
                console.warn('⚠️ Authentication failed - token may be expired');
                // Try to refresh token if available
                if (typeof refreshAccessToken === 'function') {
                    await refreshAccessToken();
                    // Retry once with new token
                    return this.loadFromServer();
                }
                return null;
            } else {
                console.warn('⚠️ Server load failed:', response.status, response.statusText);
                return null;
            }
        } catch (error) {
            console.warn('⚠️ Server load error:', error);
            return null;
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('trueShuffleSettings');
            if (saved && saved !== 'undefined' && saved !== 'null') {
                const data = JSON.parse(saved);
                // Handle both old format and new format
                const settings = data.settings || data;
                console.log('✅ Settings loaded from localStorage');
                return settings;
            }
        } catch (error) {
            console.warn('⚠️ localStorage load failed:', error);
        }
        return null;
    }

    loadFromDefaults() {
        console.log('🔧 Using default settings');
        return defaultSettings;
    }

    validateSettings(settings = this.settings) {
        this.validationErrors = [];

        // Validate year range
        if (settings.yearFrom > settings.yearTo) {
            this.validationErrors.push('Year range invalid: start year cannot be after end year');
            settings.yearFrom = defaultSettings.yearFrom;
            settings.yearTo = defaultSettings.yearTo;
        }

        // Validate arrays
        if (!Array.isArray(settings.genres)) {
            this.validationErrors.push('Genres must be an array');
            settings.genres = defaultSettings.genres;
        }

        if (!Array.isArray(settings.moods)) {
            this.validationErrors.push('Moods must be an array');
            settings.moods = defaultSettings.moods;
        }

        if (!Array.isArray(settings.languages)) {
            this.validationErrors.push('Languages must be an array');
            settings.languages = defaultSettings.languages;
        }

        // Validate numeric ranges
        if (settings.popularity < 0 || settings.popularity > 100) {
            this.validationErrors.push('Popularity must be between 0-100');
            settings.popularity = defaultSettings.popularity;
        }

        if (settings.genreDiversity < 0 || settings.genreDiversity > 1) {
            this.validationErrors.push('Genre diversity must be between 0-1');
            settings.genreDiversity = defaultSettings.genreDiversity;
        }

        // Validate language codes (basic ISO 639-1 check)
        const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'sv', 'no', 'da', 'nl', 'pl', 'tr'];
        settings.languages = settings.languages.filter(lang => validLanguages.includes(lang));
        if (settings.languages.length === 0) {
            settings.languages = ['en'];
        }

        if (this.validationErrors.length > 0) {
            console.warn('⚠️ Settings validation errors:', this.validationErrors);
            this.showNotification('Some settings were corrected due to invalid values', 'warning');
        }

        return this.validationErrors.length === 0;
    }

    async saveSettings() {
        console.log('💾 Saving settings...');
        
        // Update current user ID and access token from global variables
        const userId = window.currentUserId || currentUserId;
        const token = window.accessToken || accessToken;
        
        // Debug logging
        console.log('🔍 Save attempt with:', { 
            userId: userId ? 'present' : 'missing', 
            token: token ? 'present' : 'missing' 
        });
        
        // Validate before saving
        if (!this.validateSettings()) {
            console.error('❌ Cannot save invalid settings');
            return false;
        }

        try {
            // Try server first if logged in and have access token
            if (userId && token) {
                try {
                    // Set the current values for the server call
                    this.currentUserId = userId;
                    window.accessToken = token;
                    
                    const success = await this.saveToServer();
                    if (success) {
                        this.showNotification('Settings saved to your account', 'success');
                        this.applySettings();
                        this.triggerSettingsUpdatedEvent();
                        return true;
                    }
                } catch (error) {
                    console.warn('⚠️ Server save failed, falling back to localStorage:', error);
                    this.showNotification('Server save failed - saved locally instead', 'warning');
                }
            } else {
                console.log('⚠️ User not logged in or no token - saving locally only');
            }
            
            // Fallback to localStorage
            await this.saveToLocalStorage();
            this.showNotification('Settings saved locally', 'info');
            this.applySettings();
            this.triggerSettingsUpdatedEvent();
            return true;

        } catch (error) {
            console.error('❌ Save failed:', error);
            this.showNotification('Failed to save settings', 'error');
            return false;
        }
    }

    async saveToServer() {
        if (!this.currentUserId || !window.accessToken) {
            const error = `No user ID (${this.currentUserId ? 'present' : 'missing'}) or access token (${window.accessToken ? 'present' : 'missing'}) available`;
            console.error('❌ Save to server failed:', error);
            throw new Error(error);
        }

        console.log('🌐 Attempting to save to server for user:', this.currentUserId);

        const response = await fetch(`/api/settings/${this.currentUserId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${window.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                settings: this.settings
            })
        });

        console.log('📡 Server response status:', response.status, response.statusText);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Settings saved to server successfully');
            
            // Update local settings with validated server response
            if (result.settings) {
                this.settings = { ...this.settings, ...result.settings };
            }
            
            return true;
        } else if (response.status === 401) {
            console.warn('⚠️ Authentication failed during save - token may be expired');
            // Try to refresh token if available
            if (typeof refreshAccessToken === 'function') {
                console.log('🔄 Attempting to refresh access token...');
                await refreshAccessToken();
                // Retry once with new token
                return this.saveToServer();
            }
            throw new Error('Authentication failed');
        } else {
            let errorMessage;
            try {
                const error = await response.json();
                errorMessage = error.error || response.statusText;
            } catch (e) {
                errorMessage = response.statusText;
            }
            console.error('❌ Server save failed:', response.status, errorMessage);
            throw new Error(`Server save failed: ${errorMessage}`);
        }
    }

    async saveToLocalStorage() {
        const dataToSave = {
            settings: this.settings,
            timestamp: Date.now(),
            version: '2.1'
        };
        localStorage.setItem('trueShuffleSettings', JSON.stringify(dataToSave));
        console.log('✅ Settings saved to localStorage');
    }

    triggerSettingsUpdatedEvent() {
        // Trigger settings updated event
        window.dispatchEvent(new CustomEvent('settingsUpdated', { 
            detail: this.settings 
        }));
    }

    applySettings() {
        console.log('🔧 Applying settings to app...');

        // Apply to global variables for backward compatibility
        currentShuffleType = this.settings.shuffleType;
        selectedGenres = this.settings.genres;
        selectedMood = this.settings.moods[0] || null;
        
        // Apply to window for module access
        window.userSettings = this.settings;
        window.selectedGenres = this.settings.genres;
        window.selectedMood = this.settings.moods[0] || null;
        window.userYearFrom = this.settings.yearFrom;
        window.userYearTo = this.settings.yearTo;
        window.userLanguages = this.settings.languages;

        // Apply UI settings
        this.applyUISettings();
        
        // Update settings modal if open
        this.updateSettingsModal();

        console.log('✅ Settings applied successfully');
    }

    applyUISettings() {
        // Apply dark mode
        if (this.settings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        // Apply compact mode
        if (this.settings.compactMode) {
            document.body.classList.add('compact-mode');
        } else {
            document.body.classList.remove('compact-mode');
        }
    }

    updateSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (!modal || !modal.classList.contains('visible')) return;

        // Update all form elements with current settings
        loadSettingsIntoModal(this.settings);
    }

    collectCurrentSettings() {
        const settings = { ...this.settings };
        
        try {
            // Collect from UI elements
            const genreButtons = document.querySelectorAll('.settings-genre-btn.active');
            settings.genres = Array.from(genreButtons).map(btn => btn.dataset.genre);
            
            const moodOptions = document.querySelectorAll('.settings-mood-option.active');
            settings.moods = Array.from(moodOptions).map(option => option.dataset.mood);

            const languageSelect = document.getElementById('language-select');
            if (languageSelect) {
                settings.languages = Array.from(languageSelect.selectedOptions).map(option => option.value);
            }
            
            const yearFrom = document.getElementById('year-from');
            const yearTo = document.getElementById('year-to');
            if (yearFrom) settings.yearFrom = parseInt(yearFrom.value) || defaultSettings.yearFrom;
            if (yearTo) settings.yearTo = parseInt(yearTo.value) || defaultSettings.yearTo;
            
            const shuffleTypeSelect = document.getElementById('shuffle-type');
            if (shuffleTypeSelect) settings.shuffleType = shuffleTypeSelect.value;

            // Collect other settings
            const popularitySlider = document.getElementById('popularity-slider');
            if (popularitySlider) settings.popularity = parseInt(popularitySlider.value);

            const explicitCheckbox = document.getElementById('explicit-content');
            if (explicitCheckbox) settings.explicitContent = explicitCheckbox.checked;

            console.log('📊 Collected current settings:', settings);
            
        } catch (error) {
            console.error('❌ Error collecting settings:', error);
        }

        return settings;
    }

    setupAutoSave() {
        // Debounced auto-save when settings change
        const autoSave = () => {
            if (this.saveDebounceTimer) {
                clearTimeout(this.saveDebounceTimer);
            }
            this.saveDebounceTimer = setTimeout(() => {
                this.settings = this.collectCurrentSettings();
                this.saveSettings();
            }, 1000); // Save 1 second after last change
        };

        // Listen for form changes in settings modal
        document.addEventListener('change', (e) => {
            if (e.target.closest('#settings-modal')) {
                autoSave();
            }
        });

        // Listen for custom settings events
        window.addEventListener('settingsChanged', autoSave);
    }

    showNotification(message, type = 'info') {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Public API methods
    getSetting(key) {
        return this.settings[key];
    }

    setSetting(key, value) {
        this.settings[key] = value;
        this.validateSettings();
        this.applySettings();
    }

    getSettings() {
        return { ...this.settings };
    }

    resetToDefaults() {
        this.settings = { ...defaultSettings };
        this.applySettings();
        this.saveSettings();
        this.showNotification('Settings reset to defaults', 'info');
    }
}


// Show settings modal
function showSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        console.log('🔧 Opening settings modal...');
        
        // Load current settings into modal
        if (settingsManager && settingsManager.isLoaded) {
            console.log('📖 Loading settings from settingsManager:', settingsManager.getSettings());
            loadSettingsIntoModal(settingsManager.getSettings());
        } else {
            console.log('📖 Loading settings via legacy method...');
            // Fallback for legacy support
            loadUserSettings().then(currentSettings => {
                console.log('📖 Legacy settings loaded:', currentSettings);
                loadSettingsIntoModal(currentSettings);
            });
        }
        
        // Show modal
        settingsModal.classList.remove('hidden');
        settingsModal.classList.add('visible');
        
        // Setup modal interaction listeners
        setupSettingsModalListeners();
        
        console.log('✅ Settings modal shown');
    } else {
        console.error('❌ Settings modal element not found!');
    }
}

// Hide settings modal
function hideSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        settingsModal.classList.add('hidden');
        settingsModal.classList.remove('visible');
        console.log('✅ Settings modal hidden');
    }
}

// Load user settings - Updated to use ProductionSettingsManager
async function loadUserSettings() {
    if (settingsManager && settingsManager.isLoaded) {
        return settingsManager.getSettings();
    }
    
    // Legacy fallback
    console.log('📖 Loading user settings (legacy mode)...');
    
    try {
        const savedSettings = localStorage.getItem('trueShuffleSettings');
        if (savedSettings && savedSettings !== 'undefined' && savedSettings !== 'null') {
            const userSettings = JSON.parse(savedSettings);
            console.log('✅ User settings loaded from localStorage:', userSettings);
            return { ...defaultSettings, ...userSettings };
        }
    } catch (error) {
        console.error('❌ Error loading settings from localStorage:', error);
    }
    
    console.log('🔧 Using default settings');
    return defaultSettings;
}

// Save user settings - Updated to use ProductionSettingsManager
async function saveUserSettings() {
    if (settingsManager && settingsManager.isLoaded) {
        settingsManager.settings = settingsManager.collectCurrentSettings();
        return await settingsManager.saveSettings();
    }
    
    // Legacy fallback
    console.log('💾 Saving user settings (legacy mode)...');
    
    try {
        const settings = collectCurrentSettings();
        
        localStorage.setItem('trueShuffleSettings', JSON.stringify(settings));
        console.log('✅ Settings saved to localStorage:', settings);
        showNotification('Settings saved successfully!', 'success');
        
        applySettings(settings);
        return true;
        
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        showNotification('Failed to save settings', 'error');
        return false;
    }
}

// Collect current settings from UI - Enhanced for production
function collectCurrentSettings() {
    if (settingsManager && settingsManager.isLoaded) {
        return settingsManager.collectCurrentSettings();
    }
    
    // Legacy collection
    const settings = {};
    
    try {
        // Collect selected genres
        const genreButtons = document.querySelectorAll('.settings-genre-btn.active');
        settings.genres = Array.from(genreButtons).map(btn => btn.dataset.genre);
        
        // Collect selected moods
        const moodOptions = document.querySelectorAll('.settings-mood-option.active');
        settings.moods = Array.from(moodOptions).map(option => option.dataset.mood);
        
        // Collect languages
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            settings.languages = Array.from(languageSelect.selectedOptions).map(option => option.value);
        } else {
            settings.languages = ['en']; // Default to English
        }
        
        // Collect year range
        const yearFrom = document.getElementById('year-from');
        const yearTo = document.getElementById('year-to');
        settings.yearFrom = yearFrom ? parseInt(yearFrom.value) : 1950;
        settings.yearTo = yearTo ? parseInt(yearTo.value) : 2024;
        
        // Collect shuffle type
        const shuffleTypeSelect = document.getElementById('shuffle-type');
        settings.shuffleType = shuffleTypeSelect ? shuffleTypeSelect.value : 'true-random';
        
        // Collect popularity setting
        const popularitySlider = document.getElementById('popularity-slider');
        settings.popularity = popularitySlider ? parseInt(popularitySlider.value) : 70;
        
        // Collect explicit content setting
        const explicitCheckbox = document.getElementById('explicit-content');
        settings.explicitContent = explicitCheckbox ? explicitCheckbox.checked : true;
        
        console.log('📊 Collected settings:', settings);
        
    } catch (error) {
        console.error('❌ Error collecting settings:', error);
    }
    
    return settings;
}

// Initialize settings system - Updated for production
async function initializeSettings() {
    console.log('⚙️ Initializing settings system...');
    
    try {
        // Initialize production settings manager
        settingsManager = new ProductionSettingsManager();
        const success = await settingsManager.init();
        
        if (success) {
            console.log('✅ Production settings system initialized');
            return;
        }
    } catch (error) {
        console.error('❌ Production settings initialization failed:', error);
    }
    
    // Fallback to legacy settings
    console.log('⚠️ Using legacy settings system');
    const userSettings = await loadUserSettings();
    applySettings(userSettings);
    console.log('✅ Legacy settings system initialized');
}

// Apply settings to the app - Enhanced for production
function applySettings(settings) {
    console.log('⚙️ Applying settings:', settings);
    
    // Apply shuffle type
    if (settings.shuffleType) {
        currentShuffleType = settings.shuffleType;
        console.log('🔀 Shuffle type set to:', currentShuffleType);
    }
    
    // Store settings globally for track fetching functions
    if (settings.genres) {
        selectedGenres = settings.genres;
        window.selectedGenres = settings.genres;
        console.log('🎵 Genres set to:', settings.genres);
    }
    
    // Store mood globally for track fetching functions
    if (settings.moods && settings.moods.length > 0) {
        selectedMood = settings.moods[0]; // Use first selected mood
        window.selectedMood = settings.moods[0];
        console.log('🎭 Mood set to:', settings.moods[0]);
    }
    
    // Store year range globally
    if (settings.yearFrom && settings.yearTo) {
        window.userYearFrom = settings.yearFrom;
        window.userYearTo = settings.yearTo;
        console.log('📅 Year range set to:', settings.yearFrom, '-', settings.yearTo);
    }
    
    // Store language preferences globally
    if (settings.languages) {
        window.userLanguages = settings.languages;
        console.log('🌍 Languages set to:', settings.languages);
    }
    
    // Store other settings
    if (typeof settings.popularity !== 'undefined') {
        window.userPopularity = settings.popularity;
        console.log('⭐ Popularity threshold set to:', settings.popularity);
    }
    
    if (typeof settings.explicitContent !== 'undefined') {
        window.userExplicitContent = settings.explicitContent;
        console.log('🔞 Explicit content allowed:', settings.explicitContent);
    }
    
    console.log('✅ Core settings applied successfully');
}

// Load settings into the modal
function loadSettingsIntoModal(settings) {
    console.log('🔧 Loading settings into modal:', settings);
    
    try {
        // Load shuffle type
        const shuffleTypeSelect = document.getElementById('shuffle-type');
        if (shuffleTypeSelect && settings.shuffleType) {
            shuffleTypeSelect.value = settings.shuffleType;
        }
        
        // Load genre preferences
        if (settings.genres) {
            // First, clear all genre selections
            document.querySelectorAll('.settings-genre-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Then, activate selected genres
            settings.genres.forEach(genre => {
                const genreBtn = document.querySelector(`[data-genre="${genre}"]`);
                if (genreBtn) {
                    genreBtn.classList.add('active');
                }
            });
        }
        
        // Load mood preferences
        if (settings.moods) {
            // First, clear all mood selections
            document.querySelectorAll('.settings-mood-option').forEach(option => {
                option.classList.remove('active');
            });
            
            // Then, activate selected moods
            settings.moods.forEach(mood => {
                const moodOption = document.querySelector(`[data-mood="${mood}"]`);
                if (moodOption) {
                    moodOption.classList.add('active');
                }
            });
        }
        
        // Load language preferences
        const languageSelect = document.getElementById('language-select');
        if (languageSelect && settings.languages) {
            // Clear current selections
            Array.from(languageSelect.options).forEach(option => {
                option.selected = false;
            });
            
            // Select user languages
            settings.languages.forEach(lang => {
                const option = languageSelect.querySelector(`option[value="${lang}"]`);
                if (option) {
                    option.selected = true;
                }
            });
        }
        
        // Load year range
        const yearFrom = document.getElementById('year-from');
        const yearTo = document.getElementById('year-to');
        if (yearFrom && settings.yearFrom) {
            yearFrom.value = settings.yearFrom;
        }
        if (yearTo && settings.yearTo) {
            yearTo.value = settings.yearTo;
        }
        
        // Load popularity slider
        const popularitySlider = document.getElementById('popularity-slider');
        const popularityLabel = document.getElementById('popularity-label');
        if (popularitySlider && typeof settings.popularity !== 'undefined') {
            popularitySlider.value = settings.popularity;
            if (popularityLabel) {
                popularityLabel.textContent = `${settings.popularity}%`;
            }
        }
        
        // Load explicit content setting
        const explicitCheckbox = document.getElementById('explicit-content');
        if (explicitCheckbox && typeof settings.explicitContent !== 'undefined') {
            explicitCheckbox.checked = settings.explicitContent;
        }
        
        // Load track duration settings
        const minDurationSlider = document.getElementById('min-duration');
        const minDurationLabel = document.getElementById('min-duration-label');
        if (minDurationSlider && settings.trackDurationMin) {
            minDurationSlider.value = settings.trackDurationMin;
            if (minDurationLabel) {
                minDurationLabel.textContent = `${settings.trackDurationMin} seconds`;
            }
        }
        
        const maxDurationSlider = document.getElementById('max-duration');
        const maxDurationLabel = document.getElementById('max-duration-label');
        if (maxDurationSlider && settings.trackDurationMax) {
            maxDurationSlider.value = settings.trackDurationMax;
            if (maxDurationLabel) {
                const minutes = Math.floor(settings.trackDurationMax / 60);
                maxDurationLabel.textContent = `${minutes} minutes`;
            }
        }
        
        // Load UI preferences
        const darkModeCheckbox = document.getElementById('dark-mode');
        if (darkModeCheckbox && typeof settings.darkMode !== 'undefined') {
            darkModeCheckbox.checked = settings.darkMode;
        }
        
        const compactModeCheckbox = document.getElementById('compact-mode');
        if (compactModeCheckbox && typeof settings.compactMode !== 'undefined') {
            compactModeCheckbox.checked = settings.compactMode;
        }
        
        const showQueueCheckbox = document.getElementById('show-queue');
        if (showQueueCheckbox && typeof settings.showQueue !== 'undefined') {
            showQueueCheckbox.checked = settings.showQueue;
        }
        
        const showLyricsCheckbox = document.getElementById('show-lyrics');
        if (showLyricsCheckbox && typeof settings.showLyrics !== 'undefined') {
            showLyricsCheckbox.checked = settings.showLyrics;
        }
        
        // Load privacy settings
        const saveHistoryCheckbox = document.getElementById('save-history');
        if (saveHistoryCheckbox && typeof settings.saveListeningHistory !== 'undefined') {
            saveHistoryCheckbox.checked = settings.saveListeningHistory;
        }
        
        const analyticsCheckbox = document.getElementById('analytics-enabled');
        if (analyticsCheckbox && typeof settings.analyticsEnabled !== 'undefined') {
            analyticsCheckbox.checked = settings.analyticsEnabled;
        }
        
        const shareDataCheckbox = document.getElementById('share-data');
        if (shareDataCheckbox && typeof settings.shareData !== 'undefined') {
            shareDataCheckbox.checked = settings.shareData;
        }
        
        // Load other advanced settings
        const autoAdvanceCheckbox = document.getElementById('auto-playlist');
        if (autoAdvanceCheckbox && typeof settings.autoAdvance !== 'undefined') {
            autoAdvanceCheckbox.checked = settings.autoAdvance;
        }
        
        const backgroundEffectsCheckbox = document.getElementById('background-effects');
        if (backgroundEffectsCheckbox && typeof settings.backgroundEffects !== 'undefined') {
            backgroundEffectsCheckbox.checked = settings.backgroundEffects;
        }
        
        console.log('✅ Settings loaded into modal successfully');
        
    } catch (error) {
        console.error('❌ Error loading settings into modal:', error);
    }
}

// Setup settings modal interaction listeners
function setupSettingsModalListeners() {
    console.log('✅ Settings modal interaction listeners set up');
    
    // Shuffle type change handler
    const shuffleTypeSelect = document.getElementById('shuffle-type');
    if (shuffleTypeSelect) {
        shuffleTypeSelect.addEventListener('change', function() {
            console.log('🔀 Shuffle type changed to:', this.value);
            currentShuffleType = this.value;
        });
    }
}

// Reset user settings
function resetUserSettings() {
    console.log('🔄 Resetting user settings');
    
    try {
        // Reset to default settings
        localStorage.setItem('trueShuffleSettings', JSON.stringify(defaultSettings));
        
        // Load defaults into modal
        loadSettingsIntoModal(defaultSettings);
        
        // Apply default settings
        applySettings(defaultSettings);
        
        showNotification('Settings reset to defaults', 'success');
    } catch (error) {
        console.error('❌ Error resetting settings:', error);
        showNotification('Failed to reset settings', 'error');
    }
}

// Show help modal
function showHelpModal() {
    if (window.monetization) {
        window.monetization.showModal({
            title: '🎵 True Shuffle Help',
            content: `
                <div class="help-content">
                    <h3>Welcome to True Shuffle!</h3>
                    <p>Experience truly random music discovery with advanced algorithms.</p>
                    
                    <h4>🎲 Shuffle Modes:</h4>
                    <ul>
                        <li><strong>True Random:</strong> Mathematically perfect random selection</li>
                        <li><strong>Never Played:</strong> Only tracks you haven't heard</li>
                        <li><strong>Mood Based:</strong> Music that matches your current vibe</li>
                        <li><strong>Genre Mix:</strong> Blend your selected genres perfectly</li>
                        <li><strong>No Repeats:</strong> Avoid recently played tracks</li>
                    </ul>
                    
                    <h4>⚙️ Settings:</h4>
                    <p>Click the settings button (⚙️) to customize your experience:</p>
                    <ul>
                        <li>Genre and mood preferences</li>
                        <li>Year range filtering</li>
                        <li>Audio and UI settings</li>
                        <li>Premium features</li>
                    </ul>
                    
                    <h4>🎧 Tips:</h4>
                    <ul>
                        <li>Try different shuffle modes for varied experiences</li>
                        <li>Adjust discovery sensitivity in settings</li>
                        <li>Use genre filters for focused discovery</li>
                        <li>Enable auto-playlist to save discoveries</li>
                    </ul>
                </div>
            `,
            buttons: [
                { text: 'Got it!', action: () => window.monetization.closeModal(), primary: true }
            ],
            customClass: 'help-modal'
        });
    } else {
        alert('Help: Click the settings button (⚙️) to customize your experience. Try different shuffle modes for varied music discovery!');
    }
}

// Debug function to check and show user profile
window.debugShowProfile = function() {
  console.log('🔍 Debug: Checking user profile status...');
  
  const userProfileElement = document.getElementById('user-profile');
  const userImageElement = document.getElementById('user-image');
  const userNameElement = document.getElementById('user-name');
  const loginButton = document.getElementById('login-btn');
  
  console.log('User profile element:', userProfileElement);
  console.log('Access token exists:', !!accessToken);
  console.log('User profile classes:', userProfileElement?.classList.toString());
  console.log('User profile display:', userProfileElement?.style.display);
  console.log('User name:', userNameElement?.textContent);
  console.log('User image src:', userImageElement?.src);
  
  // Force show the profile if we have a token
  if (accessToken && userProfileElement) {
    console.log('✅ Forcing user profile to show...');
    userProfileElement.classList.remove('hidden');
    userProfileElement.style.display = 'flex';
    
    // Hide login button
    if (loginButton) {
      loginButton.classList.add('hidden');
    }
    
    // Load user data if not already loaded
    if (!userImageElement?.src || userImageElement.src === '' || userNameElement?.textContent === 'Loading...') {
      console.log('🔄 Loading user data...');
      loadUserData();
    }
    
    return true;
  } else {
    console.log('❌ Cannot show profile:');
    console.log('- Access token:', !!accessToken);
    console.log('- User profile element:', !!userProfileElement);
    return false;
  }
};

// Debug function to test settings functionality
window.debugTestSettings = function() {
  console.log('🔧 Testing settings functionality...');
  
  // Test applying settings
  const testSettings = {
    shuffleType: 'genre-balanced',
    genres: ['pop', 'rock', 'jazz'],
    moods: ['energetic'],
    backgroundEffects: false,
    enableVisualization: true,
    darkMode: true
  };
  
  console.log('Applying test settings:', testSettings);
  applySettings(testSettings);
  
  // Check if settings were applied
  console.log('Current shuffle type:', currentShuffleType);
  console.log('Body classes:', document.body.className);
  console.log('Selected genres:', window.selectedGenres);
  console.log('Selected mood:', window.selectedMood);
  
  return true;
};

// Debug function to force logout
window.debugLogout = function() {
  console.log('🔴 Debug: Forcing logout...');
  logout();
};

// Debug function to check authentication status
window.debugAuthStatus = function() {
  console.log('🔐 Current Authentication Status:');
  console.log('- Access Token:', !!accessToken);
  console.log('- Refresh Token:', !!refreshToken);
  console.log('- Token Expiry:', localStorage.getItem('spotify_token_expires'));
  console.log('- Current User ID:', currentUserId);
  console.log('- Current User:', currentUser);
  
  const now = Date.now();
  const expiry = localStorage.getItem('spotify_token_expires');
  if (expiry) {
    const timeLeft = parseInt(expiry) - now;
    console.log('- Time until expiry:', Math.round(timeLeft / 1000 / 60), 'minutes');
  }
  
  return {
    hasToken: !!accessToken,
    hasRefresh: !!refreshToken,
    userId: currentUserId,
    timeLeft: expiry ? Math.round((parseInt(expiry) - now) / 1000 / 60) : 0
  };
};

// Debug function to test auto-advance functionality
window.debugAutoAdvance = function() {
  console.log('🧪 Testing auto-advance functionality...');
  console.log('Current queue status:');
  console.log('- Queue length:', shuffledTracks.length);
  console.log('- Current index:', currentTrackIndex);
  console.log('- Current track:', currentTrack?.name);
  console.log('- Device ID:', deviceId);
  console.log('- Player ready:', !!spotifyPlayer);
  
  if (shuffledTracks.length > 0) {
    console.log('- Next track would be:', shuffledTracks[currentTrackIndex + 1]?.name || 'End of queue');
  }
  
  // Test manual advance
  if (shuffledTracks.length > 0) {
    console.log('🔄 Manually testing next track...');
    playNextTrack();
  } else {
    console.log('⚠️ No tracks in queue to test with');
  }
};

// Debug function to simulate track completion
window.debugTrackEnd = function() {
  console.log('🏁 Simulating track completion...');
  
  if (currentTrack) {
    console.log('Simulating completion of:', currentTrack.name);
    
    // Simulate the track completion logic
    setTimeout(() => {
      playNextTrack();
    }, 300);
  } else {
    console.log('⚠️ No current track to simulate completion for');
  }
};

// Debug function to test all settings functionality
window.debugTestAllSettings = function() {
  console.log('🧪 Testing ALL settings functionality...');
  
  // Test 1: Load current settings
  let userSettings = {};
  try {
      const storedSettings = localStorage.getItem('trueShuffleSettings');
      if (storedSettings) {
          userSettings = JSON.parse(storedSettings);
      }
  } catch (error) {
      console.warn('Could not load user settings');
  }
  
  console.log('📋 Current Settings:', userSettings);
  
  // Test 2: Apply test settings to verify they work
  const testSettings = {
    shuffleType: 'genre-mix',
    genres: ['rock', 'jazz', 'electronic'],
    moods: ['energetic'],
    yearFrom: 2000,
    yearTo: 2020,
    popularity: 70,
    backgroundEffects: true,
    enableVisualization: true,
    darkMode: true,
    volume: 80
  };
  
  console.log('🔬 Applying test settings:', testSettings);
  
  // Save test settings
  localStorage.setItem('trueShuffleSettings', JSON.stringify(testSettings));
  
  // Apply them to the app
  applySettings(testSettings);
  
  // Test 3: Verify settings were applied
  console.log('✅ Verifying settings application:');
  console.log('- Current shuffle type:', currentShuffleType);
  console.log('- Body classes:', document.body.className);
  console.log('- Selected genres:', window.selectedGenres || 'Not set');
  console.log('- Selected mood:', window.selectedMood || 'Not set');
  
  // Test 4: Test genre filter functionality
  console.log('🎵 Testing genre filter...');
  if (testSettings.genres && testSettings.genres.length > 0) {
    const randomGenre = testSettings.genres[Math.floor(Math.random() * testSettings.genres.length)];
    console.log(`- Would filter by genre: ${randomGenre}`);
  }
  
  // Test 5: Test year filter functionality
  console.log('📅 Testing year filter...');
  if (testSettings.yearFrom && testSettings.yearTo) {
    const yearQuery = testSettings.yearFrom === testSettings.yearTo ? 
      ` year:${testSettings.yearFrom}` : 
      ` year:${testSettings.yearFrom}-${testSettings.yearTo}`;
    console.log(`- Would filter by years: ${yearQuery}`);
  }
  
  // Test 6: Test popularity filter
  console.log('⭐ Testing popularity filter...');
  console.log(`- Would filter tracks with popularity > ${testSettings.popularity}`);
  
  // Test 7: Test a mock track search with settings
  console.log('🔍 Testing mock search with settings...');
  let mockSearchQuery = 'energetic';
  
  if (testSettings.yearFrom && testSettings.yearTo) {
    mockSearchQuery += ` year:${testSettings.yearFrom}-${testSettings.yearTo}`;
  }
  
  if (testSettings.genres && testSettings.genres.length > 0) {
    const randomGenre = testSettings.genres[0];
    mockSearchQuery += ` genre:${randomGenre}`;
  }
  
  console.log(`- Mock search query would be: "${mockSearchQuery}"`);
  
  // Test 8: Verify UI elements reflect settings
  console.log('🎨 Testing UI updates...');
  
  // Check genre buttons
  const genreButtons = document.querySelectorAll('.genre-btn, .settings-genre-btn');
  let activeGenres = [];
  genreButtons.forEach(btn => {
    if (btn.classList.contains('selected') || btn.classList.contains('active')) {
      activeGenres.push(btn.dataset.genre || btn.textContent);
    }
  });
  console.log('- Active genre buttons:', activeGenres);
  
  // Check mood buttons
  const moodButtons = document.querySelectorAll('.mood-btn, .settings-mood-option');
  let activeMoods = [];
  moodButtons.forEach(btn => {
    if (btn.classList.contains('active')) {
      activeMoods.push(btn.dataset.mood || btn.textContent);
    }
  });
  console.log('- Active mood buttons:', activeMoods);
  
  // Return summary
  const results = {
    settingsLoaded: !!Object.keys(userSettings).length,
    genresApplied: testSettings.genres.length > 0,
    moodsApplied: testSettings.moods.length > 0,
    yearsApplied: !!(testSettings.yearFrom && testSettings.yearTo),
    popularityApplied: !!testSettings.popularity,
    uiUpdated: document.body.className.includes('no-bg-effects') !== testSettings.backgroundEffects,
    mockSearchQuery: mockSearchQuery
  };
  
  console.log('📊 Test Results:', results);
  
  return results;
};

// Debug function to test specific setting category
window.debugTestGenreSettings = function() {
  console.log('🎸 Testing genre settings specifically...');
  
  const testGenres = ['rock', 'jazz', 'electronic'];
  
  // Set genres in settings
  const currentSettings = JSON.parse(localStorage.getItem('trueShuffleSettings') || '{}');
  currentSettings.genres = testGenres;
  localStorage.setItem('trueShuffleSettings', JSON.stringify(currentSettings));
  
  // Apply settings
  applySettings(currentSettings);
  
  // Test genre search
  console.log('Testing genre-specific search...');
  const randomGenre = testGenres[Math.floor(Math.random() * testGenres.length)];
  console.log(`Would search for genre: ${randomGenre}`);
  
  return { genres: testGenres, selectedGenre: randomGenre };
};

// Debug function to test specific mood settings
window.debugTestMoodSettings = function() {
  console.log('🎭 Testing mood settings specifically...');
  
  const testMoods = ['energetic'];
  
  // Set moods in settings
  const currentSettings = JSON.parse(localStorage.getItem('trueShuffleSettings') || '{}');
  currentSettings.moods = testMoods;
  localStorage.setItem('trueShuffleSettings', JSON.stringify(currentSettings));
  
  // Apply settings
  applySettings(currentSettings);
  
  // Test mood search terms
  const moodSearchTerms = {
    energetic: ['energetic', 'pump up', 'workout', 'high energy', 'intense', 'power']
  };
  
  const searchTerms = moodSearchTerms[testMoods[0]] || ['music'];
  console.log(`Would search for mood terms:`, searchTerms);
  
  return { moods: testMoods, searchTerms: searchTerms };
};

// Debug function to test year settings
window.debugTestYearSettings = function() {
  console.log('📅 Testing year settings specifically...');
  
  const testYearFrom = 2000;
  const testYearTo = 2020;
  
  // Set years in settings
  const currentSettings = JSON.parse(localStorage.getItem('trueShuffleSettings') || '{}');
  currentSettings.yearFrom = testYearFrom;
  currentSettings.yearTo = testYearTo;
  localStorage.setItem('trueShuffleSettings', JSON.stringify(currentSettings));
  
  // Apply settings
  applySettings(currentSettings);
  
  // Test year query
  const yearQuery = testYearFrom === testYearTo ? 
    ` year:${testYearFrom}` : 
    ` year:${testYearFrom}-${testYearTo}`;
  
  console.log(`Would apply year filter: ${yearQuery}`);
  
  return { yearFrom: testYearFrom, yearTo: testYearTo, query: yearQuery };
};

// Debug function to check what's happening with settings
window.debugSettingsFlow = function() {
  console.log('🔍 Debugging settings flow...');
  
  // Check what's saved in localStorage
  const savedSettings = localStorage.getItem('trueShuffleSettings');
  console.log('💾 Raw localStorage settings:', savedSettings);
  
  if (savedSettings) {
    try {
      const parsedSettings = JSON.parse(savedSettings);
      console.log('📋 Parsed settings:', parsedSettings);
    } catch (error) {
      console.error('❌ Error parsing settings:', error);
    }
  }
  
  // Check what loadUserSettings returns
  loadUserSettings().then(settings => {
    console.log('📖 loadUserSettings() returned:', settings);
    
    // Check what's actually applied
    console.log('🎯 Current global variables:');
    console.log('- currentShuffleType:', currentShuffleType);
    console.log('- selectedGenres:', selectedGenres);
    console.log('- selectedMood:', selectedMood);
    console.log('- window.selectedGenres:', window.selectedGenres);
    console.log('- window.selectedMood:', window.selectedMood);
    
    // Check body classes
    console.log('🎨 Body classes:', document.body.className);
    
    // Check if settings modal exists and what it shows
    const genreButtons = document.querySelectorAll('.settings-genre-btn.active');
    const moodButtons = document.querySelectorAll('.settings-mood-option.active');
    
    console.log('🎵 Active genre buttons in settings:', 
      Array.from(genreButtons).map(btn => btn.dataset.genre || btn.textContent));
    console.log('🎭 Active mood buttons in settings:', 
      Array.from(moodButtons).map(btn => btn.dataset.mood || btn.textContent));
  });
  
  return 'Debug complete - check console for results';
};

// Debug function to save and test settings
window.debugSaveTestSettings = function() {
  console.log('💾 Testing settings save/load cycle...');
  
  const testSettings = {
    genres: ['rock', 'jazz'],
    moods: ['energetic'],
    yearFrom: 2000,
    yearTo: 2020,
    popularity: 60,
    shuffleType: 'genre-mix'
  };
  
  console.log('🔬 Saving test settings:', testSettings);
  
  // Save directly to localStorage
  localStorage.setItem('trueShuffleSettings', JSON.stringify(testSettings));
  
  // Test immediate load
  const loaded = JSON.parse(localStorage.getItem('trueShuffleSettings'));
  console.log('📖 Immediately loaded:', loaded);
  
  // Apply settings
  console.log('🔄 Applying test settings...');
  applySettings(testSettings);
  
  // Check if they were applied
  console.log('✅ After applying:');
  console.log('- currentShuffleType:', currentShuffleType);
  console.log('- window.selectedGenres:', window.selectedGenres);
  console.log('- window.selectedMood:', window.selectedMood);
  
  return testSettings;
};

// Debug function to actually test track fetching with settings
window.debugTrackFetchWithSettings = async function() {
  console.log('🎵 Testing track fetching with settings...');
  
  // First set some test settings
  const testSettings = {
    genres: ['rock', 'jazz'],
    moods: ['energetic'],
    yearFrom: 2000,
    yearTo: 2020,
    popularity: 60
  };
  
  // Save and apply
  localStorage.setItem('trueShuffleSettings', JSON.stringify(testSettings));
  applySettings(testSettings);
  
  console.log('🔍 Testing fetchTrulyRandomTracks with settings...');
  
  // Call fetchTrulyRandomTracks and see what settings it actually uses
  try {
    const tracks = await fetchTrulyRandomTracks();
    console.log(`🎵 Fetched ${tracks.length} tracks`);
    if (tracks.length > 0) {
      console.log('Sample track:', tracks[0].name, 'by', tracks[0].artists[0].name);
    }
  } catch (error) {
    console.error('❌ Error fetching tracks:', error);
  }
  
  return 'Track fetch test complete';
};

console.log('🛠️ Settings debugging functions available:');
console.log('- debugSettingsFlow() - Check settings save/load process');
console.log('- debugSaveTestSettings() - Test saving and applying settings');
console.log('- debugTrackFetchWithSettings() - Test track fetching with settings');

// Simple test function to verify year settings work
window.testYearSettings = async function(yearFrom, yearTo) {
  console.log(`🧪 Testing year range: ${yearFrom} - ${yearTo}`);
  
  // Set the year settings
  const testSettings = {
    genres: [],
    moods: [],
    yearFrom: yearFrom,
    yearTo: yearTo,
    shuffleType: 'true-random'
  };
  
  // Save settings
  localStorage.setItem('trueShuffleSettings', JSON.stringify(testSettings));
  
  // Apply settings
  applySettings(testSettings);
  
  console.log('🔧 Settings saved and applied');
  console.log('- Year range:', window.userYearFrom, '-', window.userYearTo);
  
  // Test a single search to see if year filter is applied
  const testQuery = 'love';
  let searchQuery = `"${testQuery}"`;
  
  if (yearFrom && yearTo) {
    if (yearFrom === yearTo) {
      searchQuery += ` year:${yearFrom}`;
    } else {
      searchQuery += ` year:${yearFrom}-${yearTo}`;
    }
  }
  
  console.log(`🔍 Test search query: "${searchQuery}"`);
  
  try {
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10&offset=0`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`📊 Found ${data.tracks.items.length} tracks`);
      
      if (data.tracks.items.length > 0) {
        console.log('📋 Sample results:');
        data.tracks.items.slice(0, 5).forEach(track => {
          console.log(`- "${track.name}" by ${track.artists[0].name} (${track.album.release_date})`);
        });
      }
    } else {
      console.error('❌ Search failed:', response.status);
    }
  } catch (error) {
    console.error('❌ Error testing search:', error);
  }
  
  return `Year range ${yearFrom}-${yearTo} test complete`;
};

// Test specific decades
window.test90sMusic = function() {
  return testYearSettings(1990, 1999);
};

window.test2000sMusic = function() {
  return testYearSettings(2000, 2009);
};

window.testModernMusic = function() {
  return testYearSettings(2020, 2024);
};

console.log('🛠️ Year testing functions available:');
console.log('- testYearSettings(yearFrom, yearTo) - Test specific year range');
console.log('- test90sMusic() - Test 1990s music');
console.log('- test2000sMusic() - Test 2000s music');
console.log('- testModernMusic() - Test 2020-2024 music');

// Debug function to test premium subscription (for testing)
window.debugUpgradeToPremium = async function() {
    if (!currentUserId || !accessToken) {
        console.error('❌ Must be logged in to upgrade to premium');
        return;
    }
    
    try {
        const subscriptionEndDate = new Date();
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1); // 1 year from now
        
        const response = await fetch('/api/user/subscription', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                plan: 'premium',
                subscriptionEndsAt: subscriptionEndDate.toISOString()
            })
        });
        
        if (response.ok) {
            console.log('✅ Successfully upgraded to premium for testing!');
            showNotification('Upgraded to Premium for testing! Settings will now save to your account.', 'success');
            
            // Reload user data to reflect subscription change
            if (typeof loadUserData === 'function') {
                await loadUserData();
            }
            
            return true;
        } else {
            console.error('❌ Failed to upgrade to premium:', await response.text());
            return false;
        }
    } catch (error) {
        console.error('❌ Error upgrading to premium:', error);
        return false;
    }
};

// Debug function to test settings saving
window.debugTestSettingsSave = async function() {
    if (!settingsManager || !settingsManager.isLoaded) {
        console.error('❌ Settings manager not loaded');
        return;
    }
    
    console.log('🧪 Testing settings save...');
    
    // Modify some settings
    settingsManager.setSetting('genres', ['rock', 'electronic', 'jazz']);
    settingsManager.setSetting('languages', ['en', 'es']);
    settingsManager.setSetting('popularity', 60);
    settingsManager.setSetting('explicitContent', false);
    
    const success = await settingsManager.saveSettings();
    
    if (success) {
        console.log('✅ Settings save test successful!');
        showNotification('Settings test successful! Check the console for details.', 'success');
    } else {
        console.log('❌ Settings save test failed!');
        showNotification('Settings test failed! Check the console for errors.', 'error');
    }
    
    return success;
};

// Debug function to check current subscription status
window.debugCheckSubscription = async function() {
    if (!currentUserId || !accessToken) {
        console.error('❌ Must be logged in to check subscription');
        return;
    }
    
    try {
        const response = await fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const userProfile = await response.json();
            console.log('👤 User Profile:', userProfile);
            console.log('📊 Subscription Status:', userProfile.subscription);
            showNotification(`Current plan: ${userProfile.subscription.plan}`, 'info');
            return userProfile;
        } else {
            console.error('❌ Failed to get user profile:', await response.text());
            return null;
        }
    } catch (error) {
        console.error('❌ Error checking subscription:', error);
        return null;
    }
};

console.log('🧪 Debug functions available:');
console.log('- debugUpgradeToPremium() - Upgrade to premium for testing');
console.log('- debugTestSettingsSave() - Test settings saving functionality');
console.log('- debugCheckSubscription() - Check current subscription status');

// Add showNotification function 
function showNotification(message, type = 'info', duration = 3000) {
  console.log(`${type.toUpperCase()}: ${message}`);
  
  const container = document.getElementById('notification-area');
  if (!container) return;
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  const icons = {
    'success': 'check-circle',
    'error': 'exclamation-triangle', 
    'warning': 'exclamation-circle',
    'info': 'info-circle'
  };
  
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-${icons[type] || 'info-circle'}"></i>
      <div class="notification-text">${message}</div>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  
  container.appendChild(notification);
  
  // Auto-remove after duration
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }
  }, duration);
}

// ... existing code ...

// Make sure onSpotifyWebPlaybackSDKReady is defined as a global function
window.onSpotifyWebPlaybackSDKReady = initializeSpotifyPlayer;

// ... existing code ...

// Fetch tracks for True Shuffle All of Spotify mode
async function fetchTrueShuffleAllSpotify() {
  console.log('🌐 Fetching tracks from all of Spotify using true randomization...');
  
  try {
    const allTracks = [];
    const usedTrackIds = new Set();
    const maxResults = 50;
    
    // Strategy 1: Ultra-Random Search with Cryptographic Randomization
    console.log('🔀 Strategy 1: Ultra-random search exploration...');
    const ultraRandomTracks = await fetchUltraRandomSearchTracks(customSettings, usedTrackIds, 20);
    allTracks.push(...ultraRandomTracks);
    ultraRandomTracks.forEach(track => usedTrackIds.add(track.id));
    
    // Strategy 2: Random Recommendations with Random Seeds
    console.log('🎯 Strategy 2: Random recommendations with diverse seeds...');
    const recommendationTracks = await fetchRandomRecommendations(customSettings);
    // Filter out any tracks that are already in our list
    const uniqueRecommendations = recommendationTracks.filter(track => !usedTrackIds.has(track.id));
    allTracks.push(...uniqueRecommendations);
    uniqueRecommendations.forEach(track => usedTrackIds.add(track.id));
    
    // Strategy 3: Random Playlist Deep Dive
    console.log('📋 Strategy 3: Random playlist exploration...');
    if (allTracks.length < maxResults) {
      const playlistTracks = await fetchRandomPlaylistTracks(customSettings, usedTrackIds, 15);
      allTracks.push(...playlistTracks);
      playlistTracks.forEach(track => usedTrackIds.add(track.id));
    }
    
    // Filter and validate tracks
    const filteredTracks = filterTracksBySettings(allTracks, customSettings);
    
    // Apply cryptographic shuffle for maximum randomness
    const trulyRandomTracks = cryptographicShuffle(filteredTracks);
    
    console.log(`✅ Found ${trulyRandomTracks.length} tracks from all of Spotify`);
    
    return trulyRandomTracks.slice(0, maxResults);
    
  } catch (error) {
    console.error('❌ Error in fetchTrueShuffleAllSpotify:', error);
    return [];
  }
}

// Fetch tracks for True Shuffle My Library mode
async function fetchTrueShuffleMyLibrary() {
  console.log('📚 Fetching tracks from your library with true randomization...');
  
  try {
    const allTracks = [];
    const usedTrackIds = new Set();
    const maxResults = 50;
    
    // Strategy 1: Get user's saved tracks (library)
    console.log('💿 Strategy 1: Fetching from saved tracks...');
    const savedTracks = await fetchUserSavedTracks();
    allTracks.push(...savedTracks);
    savedTracks.forEach(track => usedTrackIds.add(track.id));
    
    // Strategy 2: Get tracks from user's playlists
    console.log('📋 Strategy 2: Fetching from user playlists...');
    if (allTracks.length < maxResults) {
      const playlistTracks = await fetchUserPlaylistTracks(usedTrackIds, 20);
      allTracks.push(...playlistTracks);
      playlistTracks.forEach(track => usedTrackIds.add(track.id));
    }
    
    // Strategy 3: Get tracks from user's top tracks
    console.log('🔝 Strategy 3: Fetching from user top tracks...');
    if (allTracks.length < maxResults) {
      const topTracks = await fetchUserTopTracks(usedTrackIds);
      allTracks.push(...topTracks);
      topTracks.forEach(track => usedTrackIds.add(track.id));
    }
    
    // Filter and validate tracks
    const filteredTracks = filterTracksBySettings(allTracks, customSettings);
    
    // Apply Fisher-Yates shuffle for unbiased randomization
    const trulyRandomTracks = fisherYatesShuffle(filteredTracks);
    
    console.log(`✅ Found ${trulyRandomTracks.length} tracks from your library`);
    
    return trulyRandomTracks.slice(0, maxResults);
    
  } catch (error) {
    console.error('❌ Error in fetchTrueShuffleMyLibrary:', error);
    return [];
  }
}

// Fetch user's saved tracks
async function fetchUserSavedTracks() {
  console.log('💿 Fetching user saved tracks...');
  
  try {
    // Get a random offset to avoid always getting the same tracks
    const maxOffset = 500; // Assume user might have up to 500 saved tracks
    const randomOffset = Math.floor(Math.random() * maxOffset);
    const limit = 50;
    
    const response = await fetch(`https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${randomOffset}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Extract the track objects from the items (saved tracks are wrapped)
      const tracks = data.items.map(item => item.track).filter(track => track != null);
      
      console.log(`✅ Fetched ${tracks.length} saved tracks`);
      return tracks;
    } else {
      console.warn(`⚠️ Failed to fetch saved tracks: ${response.status}`);
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching saved tracks:', error);
    return [];
  }
}

// Fetch tracks from user's playlists
async function fetchUserPlaylistTracks(usedTrackIds, maxTracks) {
  console.log('📋 Fetching tracks from user playlists...');
  
  try {
    // First get user's playlists
    const playlistsResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!playlistsResponse.ok) {
      console.warn(`⚠️ Failed to fetch playlists: ${playlistsResponse.status}`);
      return [];
    }
    
    const playlistsData = await playlistsResponse.json();
    const playlists = playlistsData.items;
    
    if (!playlists || playlists.length === 0) {
      console.log('ℹ️ User has no playlists');
      return [];
    }
    
    // Randomly select up to 3 playlists
    const selectedPlaylists = getRandomItems(playlists, Math.min(3, playlists.length));
    
    // Fetch tracks from each selected playlist
    const allTracks = [];
    
    for (const playlist of selectedPlaylists) {
      try {
        // Get a random offset to avoid always getting the same tracks
        const randomOffset = Math.floor(Math.random() * Math.min(100, playlist.tracks.total));
        
        const tracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=20&offset=${randomOffset}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (tracksResponse.ok) {
          const tracksData = await tracksResponse.json();
          
          // Extract tracks, filter out nulls and duplicates
          const tracks = tracksData.items
            .map(item => item.track)
            .filter(track => track != null && !usedTrackIds.has(track.id));
            
          console.log(`✅ Fetched ${tracks.length} tracks from playlist "${playlist.name}"`);
          allTracks.push(...tracks);
          
          // If we have enough tracks, stop
          if (allTracks.length >= maxTracks) break;
        }
      } catch (error) {
        console.error(`❌ Error fetching tracks from playlist ${playlist.id}:`, error);
      }
    }
    
    return allTracks.slice(0, maxTracks);
    
  } catch (error) {
    console.error('❌ Error fetching user playlist tracks:', error);
    return [];
  }
}

// Fetch user's top tracks
async function fetchUserTopTracks(usedTrackIds) {
  console.log('🔝 Fetching user top tracks...');
  
  try {
    // Get top tracks from different time ranges for variety
    const timeRanges = ['short_term', 'medium_term', 'long_term'];
    const selectedTimeRange = getRandomItems(timeRanges, 1)[0];
    
    const response = await fetch(`https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=${selectedTimeRange}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Filter out tracks that are already in our list
      const tracks = data.items.filter(track => !usedTrackIds.has(track.id));
      
      console.log(`✅ Fetched ${tracks.length} top tracks (${selectedTimeRange})`);
      return tracks;
    } else {
      console.warn(`⚠️ Failed to fetch top tracks: ${response.status}`);
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching top tracks:', error);
    return [];
  }
}

// Cryptographic Fisher-Yates shuffle for maximum randomness
function cryptographicShuffle(array) {
    if (!array || array.length <= 1) return array;
    
    const shuffled = [...array];
    
    for (let i = shuffled.length - 1; i > 0; i--) {
        // Use cryptographically secure random number
        const j = Math.floor(cryptoRandom() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
}

// Advanced True Shuffle Algorithm with enhanced personalization and randomness
// Implements:
// 1. First song prioritization from liked songs not heard in a year
// 2. Growing song pool with various sources as the player runs
// 3. Truly random playback with automatic continuation
// 4. Avoiding repeats until the entire pool has been played
async function advancedTrueShuffleAlgorithm() {
    console.log('🎲 Starting Advanced True Shuffle Algorithm...');
    
    // Track IDs that have been recently heard (to avoid repeats)
    const heardTrackIds = new Set();
    
    // Load "Heard on True Shuffle" playlist tracks to avoid repeats
    try {
        const heardPlaylist = playlistCache.heardOnTrueShuffle;
        if (heardPlaylist && heardPlaylist.tracks && heardPlaylist.tracks.items) {
            console.log(`ℹ️ Found ${heardPlaylist.tracks.items.length} tracks in "Heard on True Shuffle" playlist`);
            heardPlaylist.tracks.items.forEach(item => {
                if (item.track && item.track.id) {
                    heardTrackIds.add(item.track.id);
                }
            });
        }
    } catch (error) {
        console.error('❌ Error loading heard tracks:', error);
    }
    
    // Step 1: Find the first song - a liked song not heard in at least a year
    let firstTrack = null;
    console.log('🔍 Finding first track - liked song not heard in a year...');
    
    try {
        // Get user's saved tracks (liked songs)
        const savedTracks = await fetchUserSavedTracks();
        
        if (savedTracks && savedTracks.length > 0) {
            console.log(`✅ Found ${savedTracks.length} liked songs`);
            
            // Get user's recently played tracks (up to 50 - Spotify API limit)
            const recentlyPlayedResponse = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            
            if (recentlyPlayedResponse.ok) {
                const recentlyPlayedData = await recentlyPlayedResponse.json();
                const recentlyPlayedIds = new Set();
                
                // Extract recently played track IDs and timestamps
                if (recentlyPlayedData.items && recentlyPlayedData.items.length > 0) {
                    recentlyPlayedData.items.forEach(item => {
                        if (item.track && item.track.id) {
                            recentlyPlayedIds.add(item.track.id);
                        }
                    });
                    console.log(`ℹ️ Found ${recentlyPlayedIds.size} recently played tracks`);
                }
                
                // Filter liked songs that haven't been played recently
                const notRecentlyPlayedTracks = savedTracks.filter(track => 
                    !recentlyPlayedIds.has(track.id) && !heardTrackIds.has(track.id)
                );
                
                if (notRecentlyPlayedTracks.length > 0) {
                    // Use cryptographically secure randomness for selection
                    const randomIndex = Math.floor(cryptoRandom() * notRecentlyPlayedTracks.length);
                    firstTrack = notRecentlyPlayedTracks[randomIndex];
                    console.log('✅ Selected first track:', firstTrack.name);
                } else {
                    console.log('⚠️ No liked songs that haven\'t been heard recently, using fallback');
                    // Fallback: random liked song
                    const randomIndex = Math.floor(cryptoRandom() * savedTracks.length);
                    firstTrack = savedTracks[randomIndex];
                }
            } else {
                console.warn('⚠️ Unable to fetch recently played tracks, using random liked song');
                // Fallback to random liked song
                const randomIndex = Math.floor(cryptoRandom() * savedTracks.length);
                firstTrack = savedTracks[randomIndex];
            }
        } else {
            console.warn('⚠️ No liked songs found, will use fallback for first track');
        }
    } catch (error) {
        console.error('❌ Error finding first track:', error);
    }
    
    // If we still don't have a first track, use true random track as fallback
    if (!firstTrack) {
        console.log('🔄 Using fallback method for first track...');
        
        try {
            const randomTracks = await fetchTrulyRandomTracks();
            if (randomTracks && randomTracks.length > 0) {
                firstTrack = randomTracks[0];
                console.log('✅ Selected random first track:', firstTrack.name);
            }
        } catch (error) {
            console.error('❌ Error in fallback first track selection:', error);
        }
    }
    
    // Step 2: Build initial track pool
    console.log('🔄 Building initial track pool...');
    let trackPool = [];
    
    // If we have a first track, add it to the beginning of our pool
    if (firstTrack) {
        trackPool.push(firstTrack);
        // Mark as heard to avoid repeats
        heardTrackIds.add(firstTrack.id);
    }
    
    // Start gathering tracks from various sources asynchronously
    // This will continue to run in the background while the first song plays
    setTimeout(async () => {
        await growTrackPool(trackPool, heardTrackIds);
    }, 100);
    
    // Return the track pool (which will start with just the first track)
    return trackPool;
}

// Helper function to continuously grow the track pool while songs are playing
async function growTrackPool(trackPool, heardTrackIds) {
    console.log('🌱 Starting to grow track pool in background...');
    
    // Sources to gather tracks from
    const trackSources = [
        { name: 'User Saved Tracks', fn: fetchUserSavedTracks },
        { name: 'User Playlists', fn: () => fetchUserPlaylistTracks(heardTrackIds, 50) },
        { name: 'User Top Tracks', fn: () => fetchUserTopTracks(heardTrackIds) },
        { name: 'Random Recommendations', fn: () => fetchRandomRecommendations({
            genres: ['pop', 'rock', 'hip-hop', 'electronic', 'jazz', 'indie'],
            popularity: 70
        }) },
        { name: 'Genre-balanced Tracks', fn: fetchGenreBalancedTracks },
        { name: 'Random Album Tracks', fn: () => fetchRandomAlbumTracks({}, heardTrackIds) }
    ];
    
    // Process each source with a delay between them to avoid API rate limits
    for (const source of trackSources) {
        try {
            console.log(`🔍 Fetching tracks from: ${source.name}...`);
            const tracks = await source.fn();
            
            if (tracks && tracks.length > 0) {
                // Filter out tracks we've already heard or are already in the pool
                const newTracks = tracks.filter(track => 
                    track.id && 
                    !heardTrackIds.has(track.id) && 
                    !trackPool.some(t => t.id === track.id)
                );
                
                if (newTracks.length > 0) {
                    console.log(`✅ Adding ${newTracks.length} tracks from ${source.name}`);
                    
                    // Shuffle the new tracks before adding them
                    const shuffledNewTracks = cryptographicShuffle(newTracks);
                    
                    // Add to pool
                    trackPool.push(...shuffledNewTracks);
                    
                    // Update UI if needed
                    console.log(`🎵 Track pool now has ${trackPool.length} tracks`);
                }
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 300));
            
        } catch (error) {
            console.error(`❌ Error fetching from ${source.name}:`, error);
        }
    }
    
    console.log('✅ Finished initial track pool growth, continuing in background...');
    
    // Continue growing the pool periodically
    setTimeout(async () => {
        await growTrackPool(trackPool, heardTrackIds);
    }, 60000); // Check for new tracks every minute
}

// Enable crossfade between tracks
function enableCrossfade() {
    console.log('🎵 Enabling crossfade between tracks...');
    
    // Check if we have a valid Spotify player
    if (!spotifyPlayer) {
        console.warn('⚠️ Cannot enable crossfade: Spotify player not initialized');
        return;
    }
    
    try {
        // Set up crossfade using Spotify API (requires premium)
        fetch('https://api.spotify.com/v1/me/player/crossfade', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                state: true,
                duration_ms: 2000 // 2-second crossfade
            })
        }).then(response => {
            if (response.ok) {
                console.log('✅ Crossfade enabled successfully');
            } else {
                console.warn(`⚠️ Failed to enable crossfade: ${response.status} ${response.statusText}`);
                // This likely failed because user doesn't have premium or the API doesn't support it
                // We'll implement our own crossfade later
            }
        }).catch(error => {
            console.error('❌ Error enabling crossfade:', error);
        });
    } catch (error) {
        console.error('❌ Error in enableCrossfade:', error);
    }
}

// Best Practice: Use Spotify's recommendation engine for true randomness