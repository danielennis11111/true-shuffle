/**
 * History Tracker
 * 
 * This module tracks playback history to prevent repeats across sessions.
 */

// Maximum number of tracks to keep in history
const MAX_HISTORY_SIZE = 100;

// Get history from local storage
function getHistory() {
    const historyJson = localStorage.getItem('playback_history');
    return historyJson ? JSON.parse(historyJson) : [];
}

// Save history to local storage
function saveHistory(history) {
    localStorage.setItem('playback_history', JSON.stringify(history));
}

// Add a track to history
function addToHistory(track) {
    const history = getHistory();
    
    // Add track to the beginning of the array
    history.unshift({
        id: track.id,
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        playedAt: new Date().toISOString()
    });
    
    // Limit history size
    if (history.length > MAX_HISTORY_SIZE) {
        history.pop();
    }
    
    saveHistory(history);
}

// Get recently played tracks
function getRecentlyPlayed(limit = 20) {
    const history = getHistory();
    return history.slice(0, limit);
}

// Get recently played track IDs
function getRecentlyPlayedIds(limit = 20) {
    const history = getHistory();
    return history.slice(0, limit).map(track => track.id);
}

// Check if a track was recently played
function wasRecentlyPlayed(trackId, limit = 20) {
    const recentIds = getRecentlyPlayedIds(limit);
    return recentIds.includes(trackId);
}

// Clear history
function clearHistory() {
    localStorage.removeItem('playback_history');
}

// Get history statistics
function getHistoryStats() {
    const history = getHistory();
    
    // Count tracks by artist
    const artistCounts = {};
    history.forEach(track => {
        const artist = track.artist;
        artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    });
    
    // Get most played artists
    const mostPlayedArtists = Object.entries(artistCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([artist, count]) => ({ artist, count }));
    
    // Calculate average time between repeats
    let totalTimeBetweenRepeats = 0;
    let repeatCount = 0;
    
    for (let i = 0; i < history.length; i++) {
        for (let j = i + 1; j < history.length; j++) {
            if (history[i].id === history[j].id) {
                const time1 = new Date(history[i].playedAt).getTime();
                const time2 = new Date(history[j].playedAt).getTime();
                totalTimeBetweenRepeats += time1 - time2;
                repeatCount++;
            }
        }
    }
    
    const avgTimeBetweenRepeats = repeatCount > 0 
        ? totalTimeBetweenRepeats / repeatCount 
        : 0;
    
    return {
        totalTracks: history.length,
        uniqueTracks: new Set(history.map(track => track.id)).size,
        mostPlayedArtists,
        avgTimeBetweenRepeats: Math.round(avgTimeBetweenRepeats / (1000 * 60 * 60)) // in hours
    };
}

module.exports = {
    addToHistory,
    getRecentlyPlayed,
    getRecentlyPlayedIds,
    wasRecentlyPlayed,
    clearHistory,
    getHistoryStats
}; 