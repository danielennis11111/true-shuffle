import { config } from '../src/config.js';
import { SpotifyAuthService } from '../src/services/spotify-auth.js';
import { SpotifyPlayerService } from '../src/services/spotify-player.js';
import { SpotifyPlaylistService } from '../src/services/spotify-playlist.js';
import { TrueRandomShuffle } from '../src/algorithms/true-random.js';
import { GenreDiversityShuffle } from '../src/algorithms/genre-diversity.js';
import { UnplayedFirstShuffle } from '../src/algorithms/unplayed-first.js';
import { UnplayedOnlyShuffle } from '../src/algorithms/unplayed-only.js';
import { GenreBalanceShuffle } from '../src/algorithms/genre-balance.js';

// DOM Elements
const loginButton = document.getElementById('login-button');
const userProfile = document.getElementById('user-profile');
const nowPlayingSection = document.getElementById('now-playing-section');
const queueSection = document.getElementById('queue-section');

// Services
const authService = new SpotifyAuthService(config);
const playerService = new SpotifyPlayerService();
const playlistService = new SpotifyPlaylistService();

// Shuffle Algorithms
const shuffleAlgorithms = {
    'true-random': new TrueRandomShuffle(),
    'genre-diversity': new GenreDiversityShuffle(),
    'unplayed-first': new UnplayedFirstShuffle(),
    'unplayed-only': new UnplayedOnlyShuffle(),
    'genre-balance': new GenreBalanceShuffle()
};

// Check if we're on the login page
if (window.location.pathname === '/login.html' || window.location.pathname === '/') {
    // Handle login page logic
    const loginPageLoginButton = document.getElementById('login-button');
    if (loginPageLoginButton) {
        loginPageLoginButton.addEventListener('click', () => {
            window.location.href = authService.getAuthUrl();
        });
    }

    // Check for callback
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    if (params.has('access_token')) {
        // Store the token
        localStorage.setItem('spotify_token', params.get('access_token'));
        localStorage.setItem('spotify_token_expiration_time', 
            (Date.now() + (parseInt(params.get('expires_in')) * 1000)).toString());

        // Redirect to main app
        window.location.href = '/';
    }
} else {
    // Main app logic
    async function checkAuth() {
        const token = localStorage.getItem('spotify_token');
        if (!token) {
            window.location.href = '/';
            return;
        }

        try {
            // Initialize services with token
            await playerService.initialize(token);
            await playlistService.initialize(token);

            // Update UI
            loginButton.classList.add('hidden');
            userProfile.classList.remove('hidden');
            nowPlayingSection.classList.remove('hidden');
            queueSection.classList.remove('hidden');

            // Load user profile
            const profile = await authService.getUserProfile(token);
            userProfile.querySelector('.username').textContent = profile.display_name;
            userProfile.querySelector('.profile-img').src = profile.images[0]?.url || '';

            // Start player
            await playerService.start();
        } catch (error) {
            console.error('Authentication check failed:', error);
            localStorage.removeItem('spotify_token');
            window.location.href = '/';
        }
    }

    // Event Listeners
    loginButton.addEventListener('click', () => {
        window.location.href = authService.getAuthUrl();
    });

    // Initialize app
    checkAuth();
} 