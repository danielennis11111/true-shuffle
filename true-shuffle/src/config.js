// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Determine if we're in development mode
const isDevelopment = isBrowser 
    ? (window.location.hostname === '127.0.0.1' || window.location.hostname === '127.0.0.1')
    : process.env.NODE_ENV === 'development';

// Base configuration
const config = {
    clientId: '69889249cd33426ab241d33713e55fad',
    redirectUri: isDevelopment 
        ? 'http://127.0.0.1:3000/callback'
        : 'https://true-shuffle.surge.sh/#/callback',
    scopes: [
        'user-read-private',
        'user-read-email',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-currently-playing',
        'user-library-read',
        'user-library-modify',
        'playlist-read-private',
        'playlist-modify-private',
        'playlist-modify-public'
    ]
};

module.exports = config; 