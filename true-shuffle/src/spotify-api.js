/**
 * Spotify API Client
 * 
 * This module provides functions to interact with the Spotify Web API.
 */

const spotifyAuth = require('./spotify-auth');

class SpotifyAPI {
    constructor() {
        this.baseUrl = 'https://api.spotify.com/v1';
    }

    // Helper method to make API requests
    async makeRequest(endpoint, options = {}) {
        const token = spotifyAuth.getAccessToken();
        if (!token) {
            throw new Error('No access token available');
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`Spotify API error: ${response.statusText}`);
        }

        return response.json();
    }

    // Get current user
    async getCurrentUser() {
        return this.makeRequest('/me');
    }

    // Get user's playlists
    async getUserPlaylists() {
        return this.makeRequest('/me/playlists');
    }

    // Get saved tracks
    async getSavedTracks() {
        return this.makeRequest('/me/tracks');
    }

    // Get available genre seeds
    async getAvailableGenreSeeds() {
        return this.makeRequest('/recommendations/available-genre-seeds');
    }

    // Get recommendations
    async getRecommendations(seedTracks = [], seedArtists = [], seedGenres = [], limit = 20) {
        const params = new URLSearchParams({
            limit: limit.toString(),
            seed_tracks: seedTracks.join(','),
            seed_artists: seedArtists.join(','),
            seed_genres: seedGenres.join(',')
        });

        return this.makeRequest(`/recommendations?${params.toString()}`);
    }

    // Get current playback state
    async getCurrentPlaybackState() {
        return this.makeRequest('/me/player');
    }

    // Start playback
    async startPlayback(deviceId = null, contextUri = null, uris = null) {
        const body = {};
        if (contextUri) body.context_uri = contextUri;
        if (uris) body.uris = uris;

        const params = deviceId ? `?device_id=${deviceId}` : '';
        return this.makeRequest(`/me/player/play${params}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    // Pause playback
    async pausePlayback(deviceId = null) {
        const params = deviceId ? `?device_id=${deviceId}` : '';
        return this.makeRequest(`/me/player/pause${params}`, {
            method: 'PUT'
        });
    }

    // Skip to next track
    async skipToNext(deviceId = null) {
        const params = deviceId ? `?device_id=${deviceId}` : '';
        return this.makeRequest(`/me/player/next${params}`, {
            method: 'POST'
        });
    }

    // Skip to previous track
    async skipToPrevious(deviceId = null) {
        const params = deviceId ? `?device_id=${deviceId}` : '';
        return this.makeRequest(`/me/player/previous${params}`, {
            method: 'POST'
        });
    }

    // Get available devices
    async getAvailableDevices() {
        return this.makeRequest('/me/player/devices');
    }

    // Add tracks to playlist
    async addTracksToPlaylist(playlistId, uris) {
        return this.makeRequest(`/playlists/${playlistId}/tracks`, {
            method: 'POST',
            body: JSON.stringify({ uris })
        });
    }

    // Create playlist
    async createPlaylist(name, options = {}) {
        const user = await this.getCurrentUser();
        return this.makeRequest(`/users/${user.id}/playlists`, {
            method: 'POST',
            body: JSON.stringify({
                name,
                ...options
            })
        });
    }

    // Add tracks to saved tracks
    async addToMySavedTracks(ids) {
        return this.makeRequest('/me/tracks', {
            method: 'PUT',
            body: JSON.stringify({ ids })
        });
    }

    // Remove tracks from saved tracks
    async removeFromMySavedTracks(ids) {
        return this.makeRequest('/me/tracks', {
            method: 'DELETE',
            body: JSON.stringify({ ids })
        });
    }

    // Check if tracks are saved
    async containsMySavedTracks(ids) {
        const params = new URLSearchParams({ ids: ids.join(',') });
        return this.makeRequest(`/me/tracks/contains?${params.toString()}`);
    }
}

module.exports = new SpotifyAPI(); 