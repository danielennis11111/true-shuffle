/**
 * True Shuffle Algorithms
 * These algorithms provide genuinely random playlist shuffling
 */

/**
 * Fisher-Yates (Knuth) shuffle algorithm for true randomness
 * Time Complexity: O(n)
 * 
 * @param {Array} array - The array to shuffle
 * @returns {Array} A new shuffled array
 */
function fisherYatesShuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Use crypto random if available for better randomness
    let j;
    if (window.crypto && window.crypto.getRandomValues) {
      const randArray = new Uint32Array(1);
      window.crypto.getRandomValues(randArray);
      j = Math.floor((randArray[0] / (0xffffffff + 1)) * (i + 1));
    } else {
      j = Math.floor(Math.random() * (i + 1));
    }
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Shuffle that avoids recently played tracks
 * 
 * @param {Array} tracks - The array of tracks to shuffle
 * @param {Array} recentlyPlayed - Array of recently played track IDs
 * @returns {Array} A new shuffled array with recently played tracks at the end
 */
function noRepeatsFirstShuffle(tracks, recentlyPlayed) {
  // Split tracks into two groups: not recently played and recently played
  const notRecentlyPlayed = tracks.filter(track => !recentlyPlayed.includes(track.id));
  const recentlyPlayedTracks = tracks.filter(track => recentlyPlayed.includes(track.id));
  
  // Shuffle both groups independently
  const shuffledNotRecent = fisherYatesShuffle(notRecentlyPlayed);
  const shuffledRecent = fisherYatesShuffle(recentlyPlayedTracks);
  
  // Combine the two groups, with not recently played first
  return [...shuffledNotRecent, ...shuffledRecent];
}

/**
 * Genre-balanced shuffle that ensures diversity in genres
 * 
 * @param {Array} tracks - The array of tracks to shuffle, each with a genre property
 * @returns {Array} A new shuffled array with genres distributed evenly
 */
function genreBalancedShuffle(tracks) {
  // Group tracks by primary genre
  const genreGroups = {};
  tracks.forEach(track => {
    const primaryGenre = track.genre || 'unknown';
    if (!genreGroups[primaryGenre]) {
      genreGroups[primaryGenre] = [];
    }
    genreGroups[primaryGenre].push(track);
  });

  // Create a balanced sequence
  const result = [];
  const genres = Object.keys(genreGroups);
  
  // Shuffle each genre group
  for (const genre of genres) {
    genreGroups[genre] = fisherYatesShuffle(genreGroups[genre]);
  }
  
  // Take tracks from each genre in round-robin fashion
  let currentGenreIndex = 0;
  while (result.length < tracks.length) {
    const genre = genres[currentGenreIndex];
    if (genreGroups[genre].length > 0) {
      result.push(genreGroups[genre].shift());
    }
    currentGenreIndex = (currentGenreIndex + 1) % genres.length;
  }
  
  return result;
}

/**
 * Get a playlist from the user's Spotify account and shuffle it
 * 
 * @param {string} playlistId - Spotify playlist ID
 * @param {string} token - Spotify access token
 * @param {string} shuffleType - Type of shuffle algorithm to use
 * @returns {Promise<Array>} A promise that resolves to the shuffled tracks
 */
async function getAndShufflePlaylist(playlistId, token, shuffleType = 'fisherYates') {
  try {
    // Get playlist tracks from Spotify API
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch playlist: ${response.status}`);
    }
    
    const data = await response.json();
    const tracks = data.items.map(item => item.track);
    
    // Get recently played tracks
    const recentlyPlayedResponse = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    let recentlyPlayed = [];
    if (recentlyPlayedResponse.ok) {
      const recentData = await recentlyPlayedResponse.json();
      recentlyPlayed = recentData.items.map(item => item.track.id);
    }
    
    // Apply the selected shuffle algorithm
    let shuffledTracks;
    switch (shuffleType) {
      case 'noRepeats':
        shuffledTracks = noRepeatsFirstShuffle(tracks, recentlyPlayed);
        break;
      case 'genreBalanced':
        // Get track genres first
        const tracksWithGenres = await getTracksWithGenres(tracks, token);
        shuffledTracks = genreBalancedShuffle(tracksWithGenres);
        break;
      case 'fisherYates':
      default:
        shuffledTracks = fisherYatesShuffle(tracks);
        break;
    }
    
    return shuffledTracks;
  } catch (error) {
    console.error('Error shuffling playlist:', error);
    throw error;
  }
}

/**
 * Get genre information for a list of tracks
 * 
 * @param {Array} tracks - Array of Spotify track objects
 * @param {string} token - Spotify access token
 * @returns {Promise<Array>} Tracks with added genre information
 */
async function getTracksWithGenres(tracks, token) {
  // Extract unique artist IDs
  const artistIds = [...new Set(tracks.flatMap(track => 
    track.artists.map(artist => artist.id)
  ))];
  
  // Get artist data in batches (Spotify API limit is 50 per request)
  const batchSize = 50;
  const artistBatches = [];
  for (let i = 0; i < artistIds.length; i += batchSize) {
    artistBatches.push(artistIds.slice(i, i + batchSize));
  }
  
  // Fetch artist data for each batch
  const artistsData = [];
  for (const batch of artistBatches) {
    const response = await fetch(`https://api.spotify.com/v1/artists?ids=${batch.join(',')}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      artistsData.push(...data.artists);
    }
  }
  
  // Create a map of artist ID to genres
  const artistGenres = {};
  artistsData.forEach(artist => {
    artistGenres[artist.id] = artist.genres || [];
  });
  
  // Add genres to each track
  return tracks.map(track => {
    const trackGenres = track.artists
      .flatMap(artist => artistGenres[artist.id] || [])
      .filter((genre, index, self) => self.indexOf(genre) === index);
    
    return {
      ...track,
      genre: trackGenres[0] || 'unknown', // Use the first genre as primary
      genres: trackGenres
    };
  });
}

// Export the functions for use in other files
window.TrueShuffle = {
  fisherYatesShuffle,
  noRepeatsFirstShuffle,
  genreBalancedShuffle,
  getAndShufflePlaylist
}; 