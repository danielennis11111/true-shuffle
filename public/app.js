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
let colorThief = new ColorThief();
let playlistCache = {
  likedFromTrueShuffle: null,
  heardOnTrueShuffle: null
};
let spotifyPlayer;
let isPlaying = false;
let selectedMood = null; // New: track selected mood
let selectedGenres = []; // New: track selected genres for mix mode
let currentTrackFeatures = null; // New: track audio features

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

// Get DOM elements
const loginButton = document.getElementById('login-button');
const authLoginButton = document.getElementById('auth-login-button');
const logoutButton = document.getElementById('logout-button');
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
  yearFilter: false,
  yearFrom: 1990,
  yearTo: 2024,
  popularityFilter: true,
  maxPopularity: 75,
  searchOffset: 800
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 Document still loading, waiting for DOMContentLoaded...');
  
  // Suppress known non-critical Spotify SDK console errors
  const originalError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    
    // Suppress known non-critical errors
    if (message.includes('PlayLoad event failed') ||
        message.includes('cpapi.spotify.com') ||
        message.includes('robustness level') ||
        message.includes('CloudPlaybackClientError')) {
      return; // Silently ignore these errors
    }
    
    // Show other errors normally
    originalError.apply(console, args);
  };
  
  initialize();
});

// Initialize the application
function initialize() {
  console.log('🚀 Initializing True Shuffle app...');
  
  try {
    // Add event listeners
    console.log('📝 Setting up event listeners...');
    setupEventListeners();
    
    // Check if we have a hash with tokens
    if (window.location.hash) {
      console.log('🔗 Found hash in URL, handling auth callback...');
      handleAuthCallback();
    } else {
      console.log('🔍 No hash found, checking for existing authentication...');
      checkExistingAuth();
    }
    
    console.log('🎵 Initializing Spotify Web Playback SDK...');
    initializeSpotifyPlayer();
    
    // Initialize DOM elements once the page loads
    initializeDOMElements();
    
    // Setup customization controls
    setupCustomizationControls();
    
    // Check for first-time user and handle onboarding
    handleUserOnboarding();
    
    // Initialize settings system
    initializeSettings();
    
    console.log('✅ App initialization complete!');
  } catch (error) {
    console.error('❌ Error during initialization:', error);
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
      backToConfigBtn.addEventListener('click', showDiscoverySection);
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
    
    console.log('✅ All event listeners set up successfully');
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
  
  console.log(`✅ Shuffle type changed to: ${getShuffleDisplayName(type)}`);
}

// Redirect to Spotify authorization page
function redirectToSpotifyAuth() {
  console.log('🎵 Starting Spotify authentication flow...');
  
  try {
    showLoading();
    
    // Clear any existing tokens to prevent scope conflicts
    console.log('🧹 Clearing existing tokens...');
    clearAuthTokens();
    
    // Generate secure random state for CSRF protection
    const state = generateRandomString(16);
    localStorage.setItem('spotify_auth_state', state);
    
    // Define the required scopes for the application
    const scopes = [
      'user-read-private',
      'user-read-email', 
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'user-library-read',
      'user-library-modify',
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-public',
      'playlist-modify-private',
      'streaming',
      'user-read-recently-played',
      'user-top-read'
    ].join(' ');
    
    // Get client ID from environment or server
    const clientId = window.SPOTIFY_CLIENT_ID || 'ENVIRONMENT_VARIABLE_REQUIRED';
    
    if (clientId === 'ENVIRONMENT_VARIABLE_REQUIRED') {
      console.error('❌ Spotify Client ID not configured');
      hideLoading();
      alert('Spotify Client ID not configured. Please check environment variables.');
      return;
    }
    
    // Construct authorization URL
    const redirectUri = encodeURIComponent(`${window.location.origin}/`);
    const authUrl = `https://accounts.spotify.com/authorize?` +
      `response_type=token&` +
      `client_id=${clientId}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `redirect_uri=${redirectUri}&` +
      `state=${state}&` +
      `show_dialog=true`;
    
    console.log('🔗 Redirecting to Spotify authorization...');
    console.log('📋 Scopes requested:', scopes.split(' '));
    
    // Redirect to Spotify
    window.location.href = authUrl;
    
  } catch (error) {
    console.error('❌ Error during auth redirect:', error);
    hideLoading();
    alert('Authentication error. Please try again.');
  }
}

// Handle Spotify auth callback
function handleAuthCallback() {
  showLoading();
  
  console.log('🔗 Handling auth callback...');
  console.log('🌐 Current URL hash:', window.location.hash);
  
  // Get tokens from hash fragment
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
    localStorage.setItem('spotify_token_expires', Date.now() + (expiresIn * 1000));
    
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

// Load user data
async function loadUserData() {
  try {
    showLoading();
    
    console.log('👤 Loading user data...');
    console.log('🔑 Using access token:', accessToken ? accessToken.substring(0, 20) + '...' : 'None');
    
    // Fetch user profile
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('👤 User profile response status:', userResponse.status);
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('❌ Failed to fetch user profile:', errorText);
      
      if (userResponse.status === 401) {
        console.log('🔄 User profile request unauthorized, token may be invalid');
        logout();
        return;
      }
      
      throw new Error('Failed to fetch user profile');
    }
    
    const userData = await userResponse.json();
    console.log('✅ User data loaded:', userData.display_name || userData.id);
    
    // Update UI with user data
    userNameElement.textContent = userData.display_name || userData.id;
    if (userData.images && userData.images.length > 0) {
      userImageElement.src = userData.images[0].url;
    } else {
      userImageElement.src = 'https://via.placeholder.com/40?text=User';
    }
    
    // Show user profile
    userProfileElement.classList.remove('hidden');
    userProfileElement.classList.add('flex');
    loginButton.classList.add('hidden');
    
    // Show main content
    mainContentElement.classList.remove('hidden');
    authMessageElement.classList.add('hidden');
    
    // Create our special playlists if they don't exist
    console.log('📝 Ensuring True Shuffle playlists exist...');
    await ensureTrueShufflePlaylists(userData.id);
    
    // Start fetching recommendations
    console.log('🎵 Starting to fetch recommendations...');
    await fetchRecommendations();
    
    hideLoading();
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
    
    switch(currentShuffleType) {
      case 'true-random':
      case 'fisherYates':
        tracks = await fetchTrulyRandomTracks();
        break;
      case 'never-played':
      case 'neverPlayed':
        tracks = await fetchNeverPlayedTracks();
        break;
      case 'genre-mix':
      case 'mixGenres':
        tracks = await fetchMixedGenreTracks();
        break;
      case 'genre-balanced':
      case 'genreBalanced':
        tracks = await fetchGenreBalancedTracks();
        break;
      case 'no-repeats':
      case 'noRepeats':
        tracks = await fetchNoRepeatTracks();
        break;
      case 'mood-based':
      case 'moodBased':
        // Call fetchMoodBasedTracks to get more tracks for the current mood
        await fetchMoodBasedTracks();
        return;
      default:
        console.warn(`⚠️ Unknown shuffle type: ${currentShuffleType}, falling back to true-random`);
        tracks = await fetchTrulyRandomTracks();
    }
    
    // Assign tracks to shuffledTracks and shuffle them
    if (tracks && tracks.length > 0) {
      console.log(`✅ Loaded ${tracks.length} tracks for ${getShuffleDisplayName(currentShuffleType)}`);
      
      // Apply Fisher-Yates shuffle
      shuffledTracks = fisherYatesShuffle([...tracks]);
      currentTrackIndex = 0;
      
      // Start playing the first track
      if (shuffledTracks.length > 0) {
        await playCurrentTrack();
      }
    } else {
      console.warn('⚠️ No tracks found, trying fallback...');
      // Try fallback to basic search
      tracks = await fetchTrulyRandomTracks();
      if (tracks && tracks.length > 0) {
        shuffledTracks = fisherYatesShuffle([...tracks]);
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
    console.log('🎲 Fetching truly random tracks...');
    
    const dateRange = getDateRange();
    console.log('📅 Date range filter:', dateRange);
    
    try {
        const searchTerms = [
            // Single letters and characters  
            'a', 'e', 'o', 'i', 'u', 'n', 'r', 't', 'l', 's', 'h', 'y', 'x', 'z', 'q',
            
            // Abstract concepts
            'echo', 'void', 'flow', 'drift', 'pulse', 'wave', 'spark', 'glow', 'haze', 'mist',
            'tide', 'wind', 'fire', 'rain', 'snow', 'dawn', 'dusk', 'moon', 'star', 'sun',
            
            // Emotions and states
            'joy', 'hope', 'fear', 'love', 'pain', 'calm', 'rage', 'peace', 'wild', 'free',
            
            // Colors and textures
            'blue', 'gold', 'silver', 'amber', 'crimson', 'jade', 'coral', 'ivory', 'onyx',
            
            // Simple words from different languages
            'agua', 'luz', 'vida', 'amor', 'luna', 'sol', 'mar', 'fuego', 'nuit', 'jour',
            'bleu', 'rouge', 'noir', 'blanc', 'vert', 'jaune', 'rosa', 'casa', 'tiempo'
        ];
        
        const allTracks = [];
        const usedTrackIds = new Set();
        const maxResults = 56;
        
        // Shuffle search terms
        const shuffledTerms = [...searchTerms].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < Math.min(20, shuffledTerms.length) && allTracks.length < maxResults; i++) {
            const term = shuffledTerms[i];
            
            // Build search query with date filter if enabled
            let searchQuery = `"${term}"`;
            if (dateRange) {
                if (dateRange.from === dateRange.to) {
                    searchQuery += ` year:${dateRange.from}`;
                } else {
                    searchQuery += ` year:${dateRange.from}-${dateRange.to}`;
                }
            }
            
            try {
                // Use high random offset to avoid algorithmic bias
                const randomOffset = Math.floor(Math.random() * 800);
                
                console.log(`🔍 Searching for: "${searchQuery}" (offset: ${randomOffset})`);
                
                const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=50&offset=${randomOffset}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`📊 Search "${term}" returned ${data.tracks.items.length} tracks`);
                    
                    const validTracks = data.tracks.items.filter(track => {
                        // Anti-bias filtering
                        if (track.popularity > 85) return false; // Avoid overly popular tracks
                        if (usedTrackIds.has(track.id)) return false; // No duplicates
                        
                        // Avoid compilation albums and "hits" collections
                        const albumName = track.album.name.toLowerCase();
                        if (albumName.includes('hits') || 
                            albumName.includes('best of') || 
                            albumName.includes('greatest') ||
                            albumName.includes('collection') ||
                            albumName.includes('anthology')) {
                            return false;
                        }
                        
                        return true;
                    });
                    
                    for (const track of validTracks) {
                        if (allTracks.length >= maxResults) break;
                        allTracks.push(track);
                        usedTrackIds.add(track.id);
                    }
                } else {
                    console.warn(`⚠️ Search failed for "${term}":`, response.status);
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 50));
                
            } catch (error) {
                console.error(`❌ Error searching for "${term}":`, error);
            }
        }
        
        console.log(`✅ Found ${allTracks.length} unique tracks total`);
        return allTracks;
        
    } catch (error) {
        console.error('❌ Error in fetchTrulyRandomTracks:', error);
        return [];
    }
}

// Try fetching tracks by generating random Spotify track IDs
async function fetchRandomTrackIds(existingTracks) {
  console.log('🎲 Generating random Spotify track IDs...');
  
  // Spotify track IDs are base62 encoded, typically 22 characters
  const base62chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  for (let i = 0; i < 10; i++) {
    try {
      // Generate a random 22-character ID
      let randomId = '';
      for (let j = 0; j < 22; j++) {
        randomId += base62chars[Math.floor(Math.random() * base62chars.length)];
      }
      
      // Try to fetch this track
      const response = await fetch(`https://api.spotify.com/v1/tracks/${randomId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const track = await response.json();
        console.log(`🎲 Random ID hit! Found: ${track.name} by ${track.artists[0].name}`);
        existingTracks.push(track);
      } else {
        console.log(`🎲 Random ID ${randomId} doesn't exist (${response.status})`);
      }
    } catch (error) {
      console.log('🎲 Random ID attempt failed:', error);
    }
  }
}

// Fetch tracks deliberately mixing different genres
async function fetchMixedGenreTracks() {
  console.log('🎨 Creating truly random genre-mixed playlist...');
  
  // Check if user has selected genres
  if (selectedGenres.length === 0) {
    alert('Please select 2-6 genres to mix before discovering music.');
    return [];
  }
  
  if (selectedGenres.length < 2) {
    alert('Please select at least 2 genres to create a mix.');
    return [];
  }
  
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
    'punk': {
      searches: ['post punk', 'hardcore punk', 'pop punk', 'punk rock', 'garage punk'],
      avoidTerms: ['punk hits', 'classic punk']
    }
  };

  const tracks = [];
  
  console.log(`🎨 Using ${selectedGenres.length} selected genres:`, selectedGenres);
  
  for (const genreName of selectedGenres) {
    const genreConfig = genreConfigs[genreName];
    if (!genreConfig) {
      console.warn(`⚠️ No configuration found for genre: ${genreName}`);
      continue;
    }
    
    try {
      // Pick a random search term for this genre
      const searchTerm = genreConfig.searches[Math.floor(Math.random() * genreConfig.searches.length)];
      
      // Use high random offset to avoid popular tracks
      const randomOffset = Math.floor(Math.random() * 800); // Much higher range
      
      // Add year filter to avoid only recent popular tracks
      const randomYear = Math.floor(Math.random() * 30) + 1990; // 1990-2020
      const yearQuery = Math.random() > 0.5 ? ` year:${randomYear}` : '';
      
      const fullQuery = `${searchTerm}${yearQuery}`;
      
      console.log(`🔍 Searching for "${fullQuery}" with offset ${randomOffset}`);
      
      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(fullQuery)}&type=track&limit=25&offset=${randomOffset}&market=US`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
          // Apply anti-bias filtering
          const filteredTracks = data.tracks.items.filter(track => {
            // Avoid extremely popular tracks (likely algorithmic favorites)
            if (track.popularity > 75) return false;
            
            // Avoid tracks with "hits", "best of", "greatest" in name
            const trackName = track.name.toLowerCase();
            const albumName = track.album?.name?.toLowerCase() || '';
            const avoidPatterns = ['hits', 'best of', 'greatest', 'collection', 'essential', 'ultimate'];
            
            if (avoidPatterns.some(pattern => trackName.includes(pattern) || albumName.includes(pattern))) {
              return false;
            }
            
            // Avoid compilation albums
            if (albumName.includes('compilation') || albumName.includes('various artists')) {
              return false;
            }
            
            return true;
          });
          
          console.log(`✅ Found ${filteredTracks.length} diverse ${genreName} tracks (filtered from ${data.tracks.items.length})`);
          tracks.push(...filteredTracks);
        }
      }
    } catch (error) {
      console.log(`⚠️ Genre search failed for ${genreName}:`, error);
    }
  }

  console.log(`🎨 Total mixed tracks found: ${tracks.length}`);
  
  // Additional randomness: shuffle the final track list
  return fisherYatesShuffle(tracks);
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
    fisherYates: 'True Random',
    neverPlayed: 'Never Played Songs',
    mixGenres: 'Mix Genres',
    genreBalanced: 'Genre Balanced',
    noRepeats: 'No Repeats',
    moodBased: 'Mood Based'
  };
  return names[type] || 'Unknown';
}

// Initialize Spotify Web Playback SDK
function initializeSpotifyPlayer() {
  console.log('🎵 Initializing Spotify Web Playback SDK...');
  
  window.onSpotifyWebPlaybackSDKReady = () => {
    const player = new Spotify.Player({
      name: 'True Shuffle Player',
      getOAuthToken: cb => { cb(accessToken); },
      volume: 0.8
    });

    // Error handling
    player.addListener('initialization_error', ({ message }) => {
      console.error('❌ Spotify Player initialization error:', message);
    });

    player.addListener('authentication_error', ({ message }) => {
      console.error('❌ Spotify Player authentication error:', message);
    });

    player.addListener('account_error', ({ message }) => {
      console.error('❌ Spotify Player account error:', message);
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
    });

    // Not Ready
    player.addListener('not_ready', ({ device_id }) => {
      console.log('⚠️ Spotify Player not ready with Device ID:', device_id);
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
      
      // Animate visualizer based on play state
      if (!isPaused) {
        startVisualizerAnimation();
      } else {
        stopVisualizerAnimation();
      }
    });
    
    // Connect to the player
    player.connect().then(success => {
      if (success) {
        console.log('✅ Spotify Player connected successfully');
      } else {
        console.error('❌ Failed to connect to Spotify Player');
      }
    });
  };
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
  
  // Move to next track
  currentTrackIndex++;
  
  // If we've reached the end, get more tracks
  if (currentTrackIndex >= shuffledTracks.length) {
    console.log('📭 Reached end of queue, getting more tracks...');
    currentTrackIndex = 0; // Reset to start while we load new tracks
    fetchRecommendations();
    return;
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

// Update background color based on album art
function updateBackgroundColor(img) {
  try {
    if (!window.ColorThief) {
      console.log('🎨 ColorThief not available, using default colors');
      return;
    }
    
    const colorThief = new ColorThief();
    
    // Create a canvas to handle CORS properly
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    
    // Draw image to canvas
    ctx.drawImage(img, 0, 0);
    
    // Get the dominant color
    const dominantColor = colorThief.getColor(canvas);
    
    if (dominantColor) {
      const [r, g, b] = dominantColor;
      
      // Create gradient with the dominant color for our cream background
      const gradient = `linear-gradient(135deg, 
        rgba(${r}, ${g}, ${b}, 0.1) 0%, 
        rgba(244, 241, 232, 0.9) 50%, 
        rgba(232, 224, 211, 1) 100%)`;
      
      const background = document.getElementById('app-background');
      if (background) {
        background.style.background = gradient;
      }
      
      console.log('🎨 Background updated with dominant color:', `rgb(${r}, ${g}, ${b})`);
    }
  } catch (error) {
    console.log('🎨 Color extraction failed, using default gradient');
    
    // Fallback to default cream gradient
    const defaultGradient = 'linear-gradient(135deg, #f4f1e8 0%, #e8e0d3 100%)';
    const background = document.getElementById('app-background');
    if (background) {
      background.style.background = defaultGradient;
    }
  }
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
  // Clear tokens
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_expires');
  localStorage.removeItem('spotify_auth_state');
  
  // Clear variables
  accessToken = null;
  refreshToken = null;
  currentTrack = null;
  
  // Disconnect player
  if (spotifyPlayer) {
    spotifyPlayer.disconnect();
    spotifyPlayer = null;
  }
  
  // Stop animations
  stopVisualizerAnimation();
  stopProgressTracking();
  if (window.backgroundInterval) {
    clearInterval(window.backgroundInterval);
  }
  
  // Update UI
  userProfileElement.classList.add('hidden');
  userProfileElement.classList.remove('flex');
  loginButton.classList.remove('hidden');
  
  mainContentElement.classList.add('hidden');
  authMessageElement.classList.remove('hidden');
  
  // Clear track data
  shuffledTracks = [];
  currentTrackIndex = 0;
  updateNowPlaying(null);
}

// Refresh access token
async function refreshAccessToken() {
  // In a production environment, token refresh should be handled by the server
  // for security reasons. This is a simplified example.
  console.log('Token expired, redirecting to login...');
  logout();
  showAuthMessage();
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
  mainContentElement.classList.add('hidden');
  authMessageElement.classList.remove('hidden');
  loginButton.classList.add('hidden');
  userProfileElement.classList.add('hidden');
  userProfileElement.classList.remove('flex');
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

// Discovery flow functions
function discoverMusic() {
  console.log('🎵 Starting music discovery process...');
  
  // Show the player section
  showPlayerSection();
  
  // Fetch new tracks based on current shuffle type
  fetchRecommendations();
}

function showPlayerSection() {
  console.log('🎵 Showing player section...');
  const discoverySettings = document.getElementById('discovery-settings');
  const playerSection = document.getElementById('player-section');
  
  if (discoverySettings) {
    discoverySettings.style.display = 'none';
    console.log('🙈 Hidden discovery settings');
  }
  
  if (playerSection) {
    playerSection.classList.remove('hidden');
    playerSection.style.display = 'block';
    console.log('👁️ Showed player section');
  }
}

function showDiscoverySection() {
  console.log('🔍 Showing discovery section...');
  const discoverySettings = document.getElementById('discovery-settings');
  const playerSection = document.getElementById('player-section');
  
  if (playerSection) {
    playerSection.classList.add('hidden');
    playerSection.style.display = 'none';
    console.log('🙈 Hidden player section');
  }
  
  if (discoverySettings) {
    discoverySettings.style.display = 'block';
    console.log('👁️ Showed discovery settings');
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
  
  if (!selectedMood) {
    console.error('❌ No mood selected');
    return [];
  }
  
  const dateRange = getDateRange();
  console.log('📅 Date range filter:', dateRange);
  
  try {
    const mood = moodConfigs[selectedMood];
    console.log(`🎯 Using mood config for ${mood.name}`);
    
    // Define search terms for each mood
    const moodSearchTerms = {
      happy: ['upbeat', 'joyful', 'cheerful', 'positive', 'bright', 'sunny'],
      chill: ['chill', 'relaxing', 'ambient', 'calm', 'peaceful', 'mellow'],
      energetic: ['energetic', 'pump up', 'workout', 'high energy', 'intense', 'power'],
      melancholic: ['sad', 'melancholy', 'emotional', 'heartbreak', 'moody', 'blues'],
      focus: ['instrumental', 'study', 'focus', 'ambient', 'minimal', 'concentration'],
      party: ['party', 'dance', 'club', 'electronic', 'beat', 'pump']
    };
    
    const searchTerms = moodSearchTerms[selectedMood] || ['music'];
    const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    
    // Build search query with date filter if enabled
    let searchQuery = randomTerm;
    if (dateRange) {
      if (dateRange.from === dateRange.to) {
        searchQuery += ` year:${dateRange.from}`;
      } else {
        searchQuery += ` year:${dateRange.from}-${dateRange.to}`;
      }
    }
    
    const randomOffset = Math.floor(Math.random() * 500);
    
    console.log(`🔍 Searching for mood tracks: "${searchQuery}" (offset: ${randomOffset})`);
    
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=50&offset=${randomOffset}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`📊 Found ${data.tracks.items.length} mood tracks`);
      return data.tracks.items || [];
    } else {
      console.error('❌ Mood search failed:', response.status);
      return [];
    }
    
  } catch (error) {
    console.error('❌ Error fetching mood-based tracks:', error);
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

// Default settings configuration
const defaultSettings = {
    genres: ['pop', 'rock', 'hip-hop', 'electronic', 'jazz', 'classical', 'folk', 'country', 'r-n-b', 'reggae', 'metal', 'indie'],
    moods: ['happy', 'energetic', 'angry', 'melancholic', 'chill', 'focus', 'party'],
    popularity: 50,
    libraryRatio: 50,
    autoPlaylist: true,
    backgroundEffects: true,
    skipShortTracks: false,
    yearFrom: 1950,
    yearTo: 2024
};

// Show settings modal
function showSettingsModal() {
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        // Load current settings into modal
        const currentSettings = loadUserSettings();
        loadSettingsIntoModal(currentSettings);
        
        // Show modal
        settingsModal.classList.remove('hidden');
        settingsModal.classList.add('visible');
        
        // Setup modal interaction listeners
        setupSettingsModalListeners();
        
        console.log('✅ Settings modal shown');
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

// Load user settings from localStorage
function loadUserSettings() {
    console.log('📖 Loading user settings...');
    
    try {
        const savedSettings = localStorage.getItem('trueShuffleSettings');
        if (savedSettings) {
            const userSettings = JSON.parse(savedSettings);
            console.log('✅ User settings loaded:', userSettings);
            return { ...defaultSettings, ...userSettings };
        }
    } catch (error) {
        console.error('❌ Error loading settings:', error);
    }
    
    console.log('🔧 Using default settings');
    return defaultSettings;
}

// Save user settings to localStorage
function saveUserSettings() {
    console.log('💾 Saving user settings...');
    
    try {
        const settings = collectCurrentSettings();
        localStorage.setItem('trueShuffleSettings', JSON.stringify(settings));
        console.log('✅ Settings saved successfully:', settings);
        
        // Apply settings immediately
        applySettings(settings);
        
        // Show success notification
        showNotification('Settings saved successfully!', 'success');
        
        // Close modal
        hideSettingsModal();
        
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        showNotification('Failed to save settings', 'error');
    }
}

// Collect current settings from the modal
function collectCurrentSettings() {
    const settings = {};
    
    // Collect selected genres
    const genreButtons = document.querySelectorAll('.settings-genre-btn.active');
    settings.genres = Array.from(genreButtons).map(btn => btn.dataset.genre);
    
    // Collect selected moods
    const moodOptions = document.querySelectorAll('.settings-mood-option.active');
    settings.moods = Array.from(moodOptions).map(option => option.dataset.mood);
    
    // Collect slider values
    const popularitySlider = document.getElementById('settings-popularity');
    const librarySlider = document.getElementById('settings-library-ratio');
    settings.popularity = popularitySlider ? parseInt(popularitySlider.value) : 50;
    settings.libraryRatio = librarySlider ? parseInt(librarySlider.value) : 50;
    
    // Collect toggle states
    const autoPlaylistToggle = document.getElementById('auto-playlist');
    const backgroundToggle = document.getElementById('background-effects');
    const skipShortToggle = document.getElementById('skip-short-tracks');
    settings.autoPlaylist = autoPlaylistToggle ? autoPlaylistToggle.checked : true;
    settings.backgroundEffects = backgroundToggle ? backgroundToggle.checked : true;
    settings.skipShortTracks = skipShortToggle ? skipShortToggle.checked : false;
    
    // Collect year range
    const yearFrom = document.getElementById('year-from');
    const yearTo = document.getElementById('year-to');
    settings.yearFrom = yearFrom ? parseInt(yearFrom.value) : 1950;
}

// Show notification
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info-circle';
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${icon}"></i>
            <div class="notification-text">${message}</div>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('visible'), 100);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('visible');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize settings on app load
function initializeSettings() {
    console.log('⚙️ Initializing settings system...');
    
    const userSettings = loadUserSettings();
    applySettings(userSettings);
    
    console.log('✅ Settings system initialized');
}

// Apply settings to the app
function applySettings(settings) {
    // Implement your settings application logic here
    console.log('⚙️ Applying settings:', settings);
}

// Load settings into the modal
function loadSettingsIntoModal(settings) {
    // Implement your settings loading logic here
    console.log('🔧 Loading settings into modal:', settings);
}

// Setup settings modal interaction listeners
function setupSettingsModalListeners() {
    // Implement your settings modal interaction logic here
    console.log('✅ Settings modal interaction listeners set up');
}

// Reset user settings
function resetUserSettings() {
    // Implement your reset settings logic here
    console.log('🔄 Resetting user settings');
}