/**
 * Spotify Authentication Module
 * 
 * This module handles authentication with the Spotify API
 * using the Authorization Code flow with PKCE.
 */

const crypto = require('crypto');
const config = require('./config');

class SpotifyAuth {
    constructor() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpirationTime = null;
    }

    // Initialize the auth flow
    init() {
        // Check if we have tokens in localStorage
        const storedToken = localStorage.getItem('spotify_access_token');
        const storedRefreshToken = localStorage.getItem('spotify_refresh_token');
        const storedExpirationTime = localStorage.getItem('spotify_token_expiration_time');

        if (storedToken && storedExpirationTime) {
            this.accessToken = storedToken;
            this.refreshToken = storedRefreshToken;
            this.tokenExpirationTime = parseInt(storedExpirationTime);

            // Check if token needs refresh
            if (Date.now() >= this.tokenExpirationTime) {
                this.refreshAccessToken();
            }
        }
    }

    // Get the authorization URL
    getAuthUrl() {
        const params = new URLSearchParams({
            client_id: config.clientId,
            response_type: 'token',
            redirect_uri: config.redirectUri,
            scope: config.scopes.join(' '),
            show_dialog: true
        });

        return `https://accounts.spotify.com/authorize?${params.toString()}`;
    }

    // Handle the callback from Spotify
    handleCallback() {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        if (params.has('access_token')) {
            this.accessToken = params.get('access_token');
            this.refreshToken = params.get('refresh_token');
            this.tokenExpirationTime = Date.now() + (parseInt(params.get('expires_in')) * 1000);

            // Store tokens in localStorage
            localStorage.setItem('spotify_access_token', this.accessToken);
            localStorage.setItem('spotify_refresh_token', this.refreshToken);
            localStorage.setItem('spotify_token_expiration_time', this.tokenExpirationTime.toString());

            // Remove hash from URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            return true;
        }

        return false;
    }

    // Refresh the access token
    async refreshAccessToken() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + btoa(config.clientId + ':' + config.clientSecret)
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken
                })
            });

            const data = await response.json();

            if (data.access_token) {
                this.accessToken = data.access_token;
                this.tokenExpirationTime = Date.now() + (data.expires_in * 1000);

                // Update localStorage
                localStorage.setItem('spotify_access_token', this.accessToken);
                localStorage.setItem('spotify_token_expiration_time', this.tokenExpirationTime.toString());

                return true;
            }
        } catch (error) {
            console.error('Error refreshing token:', error);
            this.logout();
        }

        return false;
    }

    // Get the current access token
    getAccessToken() {
        if (!this.accessToken) {
            return null;
        }

        // Check if token needs refresh
        if (Date.now() >= this.tokenExpirationTime) {
            this.refreshAccessToken();
        }

        return this.accessToken;
    }

    // Logout
    logout() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpirationTime = null;

        // Clear localStorage
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_refresh_token');
        localStorage.removeItem('spotify_token_expiration_time');
    }
}

module.exports = new SpotifyAuth(); 