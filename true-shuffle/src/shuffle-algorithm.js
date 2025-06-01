/**
 * True Shuffle Algorithms
 * 
 * This file contains different implementations of shuffle algorithms
 * to provide genuinely random playlist shuffling.
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
    const j = Math.floor(Math.random() * (i + 1));
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
async function genreBalancedShuffle(tracks) {
  // Group tracks by primary genre
  const genreGroups = {};
  tracks.forEach(track => {
    const primaryGenre = track.genres?.[0] || 'unknown';
    if (!genreGroups[primaryGenre]) {
      genreGroups[primaryGenre] = [];
    }
    genreGroups[primaryGenre].push(track);
  });

  // Create a balanced sequence
  const result = [];
  const genres = Object.keys(genreGroups);
  
  while (result.length < tracks.length) {
    // Shuffle genres to ensure random genre order
    fisherYatesShuffle(genres);
    
    // Take one track from each genre
    for (const genre of genres) {
      if (genreGroups[genre].length > 0) {
        const randomIndex = Math.floor(Math.random() * genreGroups[genre].length);
        result.push(genreGroups[genre].splice(randomIndex, 1)[0]);
      }
    }
  }
  
  return result;
}

/**
 * Pseudo-random shuffle that creates a playlist that feels random to humans
 * but actually has some patterns to make it feel more "naturally random"
 * 
 * @param {Array} tracks - The array of tracks to shuffle
 * @returns {Array} A new shuffled array
 */
function humanRandomShuffle(tracks) {
  // First, do a regular Fisher-Yates shuffle
  const shuffled = fisherYatesShuffle(tracks);
  
  // Then apply some "human randomness" rules:
  
  // 1. Avoid consecutive tracks by the same artist
  for (let i = 0; i < shuffled.length - 1; i++) {
    if (shuffled[i].artist === shuffled[i + 1].artist) {
      // Find a track by a different artist to swap with
      for (let j = i + 2; j < shuffled.length; j++) {
        if (shuffled[j].artist !== shuffled[i].artist) {
          // Swap i+1 with j
          [shuffled[i + 1], shuffled[j]] = [shuffled[j], shuffled[i + 1]];
          break;
        }
      }
    }
  }
  
  // 2. Ensure some variety in tempo/energy (if those properties exist)
  // This would require additional track metadata
  
  return shuffled;
}

// Shuffle that prioritizes unplayed tracks
async function unplayedFirstShuffle(tracks) {
  // Sort tracks by play count (ascending)
  const sortedTracks = [...tracks].sort((a, b) => {
    const aPlays = a.play_count || 0;
    const bPlays = b.play_count || 0;
    return aPlays - bPlays;
  });

  // Group tracks by play count
  const unplayedTracks = sortedTracks.filter(track => !track.play_count || track.play_count === 0);
  const playedTracks = sortedTracks.filter(track => track.play_count && track.play_count > 0);

  // Shuffle each group
  const shuffledUnplayed = fisherYatesShuffle(unplayedTracks);
  const shuffledPlayed = fisherYatesShuffle(playedTracks);

  // Combine with unplayed tracks first
  return [...shuffledUnplayed, ...shuffledPlayed];
}

// Shuffle that ensures maximum genre diversity
async function genreDiversityShuffle(tracks) {
  // Get all unique genres
  const allGenres = new Set();
  tracks.forEach(track => {
    track.genres?.forEach(genre => allGenres.add(genre));
  });

  // Create a sequence that maximizes genre transitions
  const result = [];
  const remainingTracks = [...tracks];
  let lastGenre = null;

  while (remainingTracks.length > 0) {
    // Find tracks with different genres than the last played track
    const differentGenreTracks = remainingTracks.filter(track => {
      if (!lastGenre) return true;
      return !track.genres?.includes(lastGenre);
    });

    // If no different genre tracks found, use any remaining track
    const availableTracks = differentGenreTracks.length > 0 ? differentGenreTracks : remainingTracks;
    
    // Select a random track from available tracks
    const randomIndex = Math.floor(Math.random() * availableTracks.length);
    const selectedTrack = availableTracks[randomIndex];
    
    // Update last genre and add track to result
    lastGenre = selectedTrack.genres?.[0] || null;
    result.push(selectedTrack);
    
    // Remove selected track from remaining tracks
    remainingTracks.splice(remainingTracks.indexOf(selectedTrack), 1);
  }

  return result;
}

// Shuffle that only includes unplayed tracks
async function unplayedOnlyShuffle(tracks) {
  const unplayedTracks = tracks.filter(track => !track.play_count || track.play_count === 0);
  return fisherYatesShuffle(unplayedTracks);
}

// Export the shuffle functions
module.exports = {
  fisherYatesShuffle,
  noRepeatsFirstShuffle,
  genreBalancedShuffle,
  humanRandomShuffle,
  unplayedFirstShuffle,
  genreDiversityShuffle,
  unplayedOnlyShuffle
}; 