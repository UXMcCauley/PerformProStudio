// URL detection utility for music services

export type MusicServiceType = 'soundcloud' | 'spotify' | 'deezer' | 'youtube' | 'apple' | 'unknown';

export interface DetectedUrl {
  service: MusicServiceType;
  type: 'track' | 'album' | 'playlist' | 'artist' | 'unknown';
  id?: string;
  url: string;
}

// SoundCloud URL patterns
// https://soundcloud.com/artist/track-name
// https://soundcloud.com/artist/sets/playlist-name
function parseSoundCloudUrl(url: string): DetectedUrl | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname !== 'soundcloud.com' && urlObj.hostname !== 'www.soundcloud.com') {
      return null;
    }

    const pathSegments = urlObj.pathname.split('/').filter(Boolean);

    if (pathSegments.includes('sets')) {
      return { service: 'soundcloud', type: 'playlist', url };
    }

    if (pathSegments.length === 2) {
      return { service: 'soundcloud', type: 'track', url };
    }

    if (pathSegments.length === 1) {
      return { service: 'soundcloud', type: 'artist', url };
    }

    return { service: 'soundcloud', type: 'unknown', url };
  } catch {
    return null;
  }
}

// Spotify URL patterns
// https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6
// https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy
// https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
// https://open.spotify.com/artist/0OdUWJ0sBjDrqHygGUXeCF
function parseSpotifyUrl(url: string): DetectedUrl | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname !== 'open.spotify.com') {
      return null;
    }

    const pathSegments = urlObj.pathname.split('/').filter(Boolean);

    if (pathSegments.length >= 2) {
      const [type, id] = pathSegments;

      if (type === 'track') {
        return { service: 'spotify', type: 'track', id, url };
      }
      if (type === 'album') {
        return { service: 'spotify', type: 'album', id, url };
      }
      if (type === 'playlist') {
        return { service: 'spotify', type: 'playlist', id, url };
      }
      if (type === 'artist') {
        return { service: 'spotify', type: 'artist', id, url };
      }
    }

    return { service: 'spotify', type: 'unknown', url };
  } catch {
    return null;
  }
}

// Deezer URL patterns
// https://www.deezer.com/track/3135556
// https://www.deezer.com/album/302127
// https://www.deezer.com/playlist/53362031
// https://www.deezer.com/artist/27
function parseDeezerUrl(url: string): DetectedUrl | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname !== 'www.deezer.com' && urlObj.hostname !== 'deezer.com') {
      return null;
    }

    const pathSegments = urlObj.pathname.split('/').filter(Boolean);

    // Handle language prefix (e.g., /en/track/123)
    let typeIndex = 0;
    if (pathSegments.length >= 2 && pathSegments[0].length === 2) {
      typeIndex = 1;
    }

    if (pathSegments.length > typeIndex + 1) {
      const type = pathSegments[typeIndex];
      const id = pathSegments[typeIndex + 1];

      if (type === 'track') {
        return { service: 'deezer', type: 'track', id, url };
      }
      if (type === 'album') {
        return { service: 'deezer', type: 'album', id, url };
      }
      if (type === 'playlist') {
        return { service: 'deezer', type: 'playlist', id, url };
      }
      if (type === 'artist') {
        return { service: 'deezer', type: 'artist', id, url };
      }
    }

    return { service: 'deezer', type: 'unknown', url };
  } catch {
    return null;
  }
}

// YouTube URL patterns
// https://www.youtube.com/watch?v=dQw4w9WgXcQ
// https://youtu.be/dQw4w9WgXcQ
// https://music.youtube.com/watch?v=dQw4w9WgXcQ
function parseYouTubeUrl(url: string): DetectedUrl | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (
      hostname !== 'www.youtube.com' &&
      hostname !== 'youtube.com' &&
      hostname !== 'youtu.be' &&
      hostname !== 'music.youtube.com'
    ) {
      return null;
    }

    let videoId: string | null = null;

    if (hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1);
    } else {
      videoId = urlObj.searchParams.get('v');
    }

    if (videoId) {
      return { service: 'youtube', type: 'track', id: videoId, url };
    }

    // Check for playlist
    const playlistId = urlObj.searchParams.get('list');
    if (playlistId) {
      return { service: 'youtube', type: 'playlist', id: playlistId, url };
    }

    return { service: 'youtube', type: 'unknown', url };
  } catch {
    return null;
  }
}

// Apple Music URL patterns
// https://music.apple.com/us/album/album-name/123456789?i=123456789 (track with ?i= param)
// https://music.apple.com/us/album/album-name/123456789 (album)
// https://music.apple.com/us/playlist/playlist-name/pl.123456789
// https://music.apple.com/us/artist/artist-name/123456789
function parseAppleMusicUrl(url: string): DetectedUrl | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname !== 'music.apple.com') {
      return null;
    }

    const pathSegments = urlObj.pathname.split('/').filter(Boolean);

    // Skip country code (e.g., 'us')
    if (pathSegments.length >= 3) {
      const type = pathSegments[1];
      const id = pathSegments[pathSegments.length - 1];

      // Check if album URL has track ID param
      if (type === 'album' && urlObj.searchParams.get('i')) {
        return { service: 'apple', type: 'track', id: urlObj.searchParams.get('i')!, url };
      }

      if (type === 'album') {
        return { service: 'apple', type: 'album', id, url };
      }
      if (type === 'playlist') {
        return { service: 'apple', type: 'playlist', id, url };
      }
      if (type === 'artist') {
        return { service: 'apple', type: 'artist', id, url };
      }
    }

    return { service: 'apple', type: 'unknown', url };
  } catch {
    return null;
  }
}

// Main detection function
export function detectMusicUrl(url: string): DetectedUrl {
  // Try each parser
  const soundcloud = parseSoundCloudUrl(url);
  if (soundcloud) return soundcloud;

  const spotify = parseSpotifyUrl(url);
  if (spotify) return spotify;

  const deezer = parseDeezerUrl(url);
  if (deezer) return deezer;

  const youtube = parseYouTubeUrl(url);
  if (youtube) return youtube;

  const apple = parseAppleMusicUrl(url);
  if (apple) return apple;

  return { service: 'unknown', type: 'unknown', url };
}

// Helper to check if URL is valid
export function isValidMusicUrl(url: string): boolean {
  const detected = detectMusicUrl(url);
  return detected.service !== 'unknown';
}

// Helper to check if URL is a track
export function isTrackUrl(url: string): boolean {
  const detected = detectMusicUrl(url);
  return detected.type === 'track';
}

// Get service display name
export function getServiceDisplayName(service: MusicServiceType): string {
  const names: Record<MusicServiceType, string> = {
    soundcloud: 'SoundCloud',
    spotify: 'Spotify',
    deezer: 'Deezer',
    youtube: 'YouTube',
    apple: 'Apple Music',
    unknown: 'Unknown',
  };
  return names[service];
}

// Get service color (for UI)
export function getServiceColor(service: MusicServiceType): string {
  const colors: Record<MusicServiceType, string> = {
    soundcloud: '#ff5500',
    spotify: '#1db954',
    deezer: '#feaa2d',
    youtube: '#ff0000',
    apple: '#fa243c',
    unknown: '#6b7280',
  };
  return colors[service];
}
