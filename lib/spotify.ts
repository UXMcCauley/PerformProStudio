// Spotify Web API Client
// https://developer.spotify.com/documentation/web-api

import { MusicArtist, MusicAlbum, MusicTrack, ArtistDetails, AlbumDetails } from '@/types/music';

const BASE_URL = 'https://api.spotify.com/v1';
const AUTH_URL = 'https://accounts.spotify.com/api/token';

// Token cache
let accessToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.');
  }

  // Return cached token if still valid
  if (accessToken && Date.now() < tokenExpiry - 60000) {
    return accessToken;
  }

  // Get new token using Client Credentials flow
  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Spotify auth error: ${response.status}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);

  return accessToken!;
}

async function spotifyFetch(endpoint: string): Promise<Response> {
  const token = await getAccessToken();

  return fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
}

// Check if Spotify is configured
export function isConfigured(): boolean {
  return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: Array<{ url: string; width: number; height: number }>;
  genres: string[];
  popularity: number;
  followers: { total: number };
  external_urls: { spotify: string };
}

interface SpotifyAlbum {
  id: string;
  name: string;
  images: Array<{ url: string; width: number; height: number }>;
  artists: SpotifyArtist[];
  release_date: string;
  total_tracks: number;
  album_type: string;
  external_urls: { spotify: string };
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  preview_url: string | null;
  popularity: number;
  track_number: number;
  explicit: boolean;
  external_ids?: { isrc?: string };
  external_urls: { spotify: string };
}

interface SpotifySearchResponse {
  artists?: { items: SpotifyArtist[]; total: number };
  albums?: { items: SpotifyAlbum[]; total: number };
  tracks?: { items: SpotifyTrack[]; total: number };
}

export async function searchArtists(query: string, limit = 10): Promise<MusicArtist[]> {
  if (!isConfigured()) return [];

  try {
    const response = await spotifyFetch(`/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`);
    if (!response.ok) throw new Error(`Spotify API error: ${response.status}`);

    const data: SpotifySearchResponse = await response.json();

    return (data.artists?.items || []).map(artist => ({
      id: `spotify:${artist.id}`,
      source: 'spotify' as const,
      name: artist.name,
      image: artist.images[0]?.url,
      genres: artist.genres.slice(0, 5),
      popularity: artist.popularity,
      followers: artist.followers.total,
      externalUrls: {
        spotify: artist.external_urls.spotify,
      },
    }));
  } catch (error) {
    console.error('Spotify artist search error:', error);
    return [];
  }
}

export async function searchAlbums(query: string, limit = 10): Promise<MusicAlbum[]> {
  if (!isConfigured()) return [];

  try {
    const response = await spotifyFetch(`/search?q=${encodeURIComponent(query)}&type=album&limit=${limit}`);
    if (!response.ok) throw new Error(`Spotify API error: ${response.status}`);

    const data: SpotifySearchResponse = await response.json();

    return (data.albums?.items || []).map(album => ({
      id: `spotify:${album.id}`,
      source: 'spotify' as const,
      name: album.name,
      artist: album.artists[0]?.name || 'Unknown Artist',
      artistId: album.artists[0] ? `spotify:${album.artists[0].id}` : undefined,
      image: album.images[0]?.url,
      releaseDate: album.release_date,
      trackCount: album.total_tracks,
      type: mapAlbumType(album.album_type),
      externalUrls: {
        spotify: album.external_urls.spotify,
      },
    }));
  } catch (error) {
    console.error('Spotify album search error:', error);
    return [];
  }
}

export async function searchTracks(query: string, limit = 10): Promise<MusicTrack[]> {
  if (!isConfigured()) return [];

  try {
    const response = await spotifyFetch(`/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`);
    if (!response.ok) throw new Error(`Spotify API error: ${response.status}`);

    const data: SpotifySearchResponse = await response.json();

    return (data.tracks?.items || []).map(track => ({
      id: `spotify:${track.id}`,
      source: 'spotify' as const,
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      artistId: track.artists[0] ? `spotify:${track.artists[0].id}` : undefined,
      album: track.album.name,
      albumId: `spotify:${track.album.id}`,
      image: track.album.images[0]?.url,
      duration: track.duration_ms,
      previewUrl: track.preview_url || undefined,
      isrc: track.external_ids?.isrc,
      popularity: track.popularity,
      trackNumber: track.track_number,
      explicit: track.explicit,
      externalUrls: {
        spotify: track.external_urls.spotify,
      },
    }));
  } catch (error) {
    console.error('Spotify track search error:', error);
    return [];
  }
}

export async function search(query: string, limit = 10): Promise<{
  artists: MusicArtist[];
  albums: MusicAlbum[];
  tracks: MusicTrack[];
}> {
  if (!isConfigured()) {
    return { artists: [], albums: [], tracks: [] };
  }

  try {
    const response = await spotifyFetch(
      `/search?q=${encodeURIComponent(query)}&type=artist,album,track&limit=${limit}`
    );
    if (!response.ok) throw new Error(`Spotify API error: ${response.status}`);

    const data: SpotifySearchResponse = await response.json();

    return {
      artists: (data.artists?.items || []).map(artist => ({
        id: `spotify:${artist.id}`,
        source: 'spotify' as const,
        name: artist.name,
        image: artist.images[0]?.url,
        genres: artist.genres.slice(0, 5),
        popularity: artist.popularity,
        followers: artist.followers.total,
        externalUrls: { spotify: artist.external_urls.spotify },
      })),
      albums: (data.albums?.items || []).map(album => ({
        id: `spotify:${album.id}`,
        source: 'spotify' as const,
        name: album.name,
        artist: album.artists[0]?.name || 'Unknown Artist',
        artistId: album.artists[0] ? `spotify:${album.artists[0].id}` : undefined,
        image: album.images[0]?.url,
        releaseDate: album.release_date,
        trackCount: album.total_tracks,
        type: mapAlbumType(album.album_type),
        externalUrls: { spotify: album.external_urls.spotify },
      })),
      tracks: (data.tracks?.items || []).map(track => ({
        id: `spotify:${track.id}`,
        source: 'spotify' as const,
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        artistId: track.artists[0] ? `spotify:${track.artists[0].id}` : undefined,
        album: track.album.name,
        albumId: `spotify:${track.album.id}`,
        image: track.album.images[0]?.url,
        duration: track.duration_ms,
        previewUrl: track.preview_url || undefined,
        isrc: track.external_ids?.isrc,
        popularity: track.popularity,
        trackNumber: track.track_number,
        explicit: track.explicit,
        externalUrls: { spotify: track.external_urls.spotify },
      })),
    };
  } catch (error) {
    console.error('Spotify search error:', error);
    return { artists: [], albums: [], tracks: [] };
  }
}

export async function getArtist(id: string): Promise<ArtistDetails | null> {
  if (!isConfigured()) return null;

  const artistId = id.replace('spotify:', '');

  try {
    const [artistRes, topTracksRes, albumsRes] = await Promise.all([
      spotifyFetch(`/artists/${artistId}`),
      spotifyFetch(`/artists/${artistId}/top-tracks?market=US`),
      spotifyFetch(`/artists/${artistId}/albums?include_groups=album,single&limit=50`),
    ]);

    if (!artistRes.ok) throw new Error(`Spotify API error: ${artistRes.status}`);

    const artist: SpotifyArtist = await artistRes.json();

    let topTracks: MusicTrack[] = [];
    if (topTracksRes.ok) {
      const topData: { tracks: SpotifyTrack[] } = await topTracksRes.json();
      topTracks = topData.tracks.map(track => ({
        id: `spotify:${track.id}`,
        source: 'spotify' as const,
        name: track.name,
        artist: artist.name,
        artistId: `spotify:${artist.id}`,
        album: track.album.name,
        albumId: `spotify:${track.album.id}`,
        image: track.album.images[0]?.url,
        duration: track.duration_ms,
        previewUrl: track.preview_url || undefined,
        popularity: track.popularity,
        explicit: track.explicit,
        externalUrls: { spotify: track.external_urls.spotify },
      }));
    }

    let albums: MusicAlbum[] = [];
    let singles: MusicAlbum[] = [];
    if (albumsRes.ok) {
      const albumData: { items: SpotifyAlbum[] } = await albumsRes.json();
      const allReleases = albumData.items.map(album => ({
        id: `spotify:${album.id}`,
        source: 'spotify' as const,
        name: album.name,
        artist: artist.name,
        artistId: `spotify:${artist.id}`,
        image: album.images[0]?.url,
        releaseDate: album.release_date,
        trackCount: album.total_tracks,
        type: mapAlbumType(album.album_type),
        externalUrls: { spotify: album.external_urls.spotify },
      }));

      albums = allReleases.filter(a => a.type === 'album');
      singles = allReleases.filter(a => a.type === 'single');
    }

    return {
      id: `spotify:${artist.id}`,
      source: 'spotify',
      name: artist.name,
      image: artist.images[0]?.url,
      genres: artist.genres,
      popularity: artist.popularity,
      followers: artist.followers.total,
      topTracks,
      albums,
      singles,
      externalUrls: { spotify: artist.external_urls.spotify },
    };
  } catch (error) {
    console.error('Spotify get artist error:', error);
    return null;
  }
}

export async function getAlbum(id: string): Promise<AlbumDetails | null> {
  if (!isConfigured()) return null;

  const albumId = id.replace('spotify:', '');

  try {
    const response = await spotifyFetch(`/albums/${albumId}`);
    if (!response.ok) throw new Error(`Spotify API error: ${response.status}`);

    const album: SpotifyAlbum & {
      tracks: { items: SpotifyTrack[] };
      copyrights: Array<{ text: string }>;
      label: string;
      genres: string[];
    } = await response.json();

    const tracks: MusicTrack[] = album.tracks.items.map(track => ({
      id: `spotify:${track.id}`,
      source: 'spotify' as const,
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      artistId: track.artists[0] ? `spotify:${track.artists[0].id}` : undefined,
      album: album.name,
      albumId: `spotify:${album.id}`,
      image: album.images[0]?.url,
      duration: track.duration_ms,
      previewUrl: track.preview_url || undefined,
      trackNumber: track.track_number,
      explicit: track.explicit,
      externalUrls: { spotify: track.external_urls.spotify },
    }));

    return {
      id: `spotify:${album.id}`,
      source: 'spotify',
      name: album.name,
      artist: album.artists[0]?.name || 'Unknown Artist',
      artistId: album.artists[0] ? `spotify:${album.artists[0].id}` : undefined,
      image: album.images[0]?.url,
      releaseDate: album.release_date,
      trackCount: album.total_tracks,
      type: mapAlbumType(album.album_type),
      tracks,
      copyrights: album.copyrights.map(c => c.text),
      label: album.label,
      genres: album.genres,
      externalUrls: { spotify: album.external_urls.spotify },
    };
  } catch (error) {
    console.error('Spotify get album error:', error);
    return null;
  }
}

export async function getTrack(id: string): Promise<MusicTrack | null> {
  if (!isConfigured()) return null;

  const trackId = id.replace('spotify:', '');

  try {
    const response = await spotifyFetch(`/tracks/${trackId}`);
    if (!response.ok) throw new Error(`Spotify API error: ${response.status}`);

    const track: SpotifyTrack = await response.json();

    return {
      id: `spotify:${track.id}`,
      source: 'spotify',
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      artistId: track.artists[0] ? `spotify:${track.artists[0].id}` : undefined,
      album: track.album.name,
      albumId: `spotify:${track.album.id}`,
      image: track.album.images[0]?.url,
      duration: track.duration_ms,
      previewUrl: track.preview_url || undefined,
      isrc: track.external_ids?.isrc,
      popularity: track.popularity,
      trackNumber: track.track_number,
      explicit: track.explicit,
      externalUrls: { spotify: track.external_urls.spotify },
    };
  } catch (error) {
    console.error('Spotify get track error:', error);
    return null;
  }
}

export async function getAudioFeatures(trackId: string): Promise<{
  tempo: number;
  key: number;
  mode: number;
  timeSignature: number;
  danceability: number;
  energy: number;
  valence: number;
} | null> {
  if (!isConfigured()) return null;

  const id = trackId.replace('spotify:', '');

  try {
    const response = await spotifyFetch(`/audio-features/${id}`);
    if (!response.ok) return null;

    const features = await response.json();

    return {
      tempo: features.tempo,
      key: features.key,
      mode: features.mode,
      timeSignature: features.time_signature,
      danceability: features.danceability,
      energy: features.energy,
      valence: features.valence,
    };
  } catch {
    return null;
  }
}

function mapAlbumType(type: string): 'album' | 'single' | 'ep' | 'compilation' {
  switch (type.toLowerCase()) {
    case 'album': return 'album';
    case 'single': return 'single';
    case 'ep': return 'ep';
    case 'compilation': return 'compilation';
    default: return 'album';
  }
}

export const spotify = {
  isConfigured,
  search,
  searchArtists,
  searchAlbums,
  searchTracks,
  getArtist,
  getAlbum,
  getTrack,
  getAudioFeatures,
};
