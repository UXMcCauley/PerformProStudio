// Genius API Client for lyrics fetching
// https://docs.genius.com/

import { MusicLyrics } from '@/types/music';

const BASE_URL = 'https://api.genius.com';

// Check if Genius is configured
export function isConfigured(): boolean {
  return !!process.env.GENIUS_ACCESS_TOKEN;
}

async function geniusFetch(endpoint: string): Promise<Response> {
  const token = process.env.GENIUS_ACCESS_TOKEN;

  if (!token) {
    throw new Error('Genius access token not configured. Set GENIUS_ACCESS_TOKEN.');
  }

  return fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
}

interface GeniusHit {
  type: string;
  result: {
    id: number;
    title: string;
    title_with_featured: string;
    url: string;
    path: string;
    primary_artist: {
      id: number;
      name: string;
      url: string;
      image_url: string;
    };
    song_art_image_url: string;
    lyrics_state: string;
  };
}

interface GeniusSong {
  id: number;
  title: string;
  title_with_featured: string;
  url: string;
  path: string;
  primary_artist: {
    id: number;
    name: string;
    url: string;
  };
  writer_artists: Array<{
    id: number;
    name: string;
  }>;
  song_art_image_url: string;
  apple_music_id?: string;
  spotify_uuid?: string;
}

export interface GeniusSearchResult {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  url: string;
  image?: string;
  lyricsAvailable: boolean;
}

export async function searchSongs(query: string, limit = 10): Promise<GeniusSearchResult[]> {
  if (!isConfigured()) return [];

  try {
    const response = await geniusFetch(`/search?q=${encodeURIComponent(query)}&per_page=${limit}`);
    if (!response.ok) throw new Error(`Genius API error: ${response.status}`);

    const data: { response: { hits: GeniusHit[] } } = await response.json();

    return data.response.hits
      .filter(hit => hit.type === 'song')
      .map(hit => ({
        id: `genius:${hit.result.id}`,
        title: hit.result.title,
        artist: hit.result.primary_artist.name,
        artistId: `genius:${hit.result.primary_artist.id}`,
        url: hit.result.url,
        image: hit.result.song_art_image_url,
        lyricsAvailable: hit.result.lyrics_state === 'complete',
      }));
  } catch (error) {
    console.error('Genius search error:', error);
    return [];
  }
}

export async function getSong(id: string | number): Promise<GeniusSong | null> {
  if (!isConfigured()) return null;

  const songId = String(id).replace('genius:', '');

  try {
    const response = await geniusFetch(`/songs/${songId}`);
    if (!response.ok) throw new Error(`Genius API error: ${response.status}`);

    const data: { response: { song: GeniusSong } } = await response.json();
    return data.response.song;
  } catch (error) {
    console.error('Genius get song error:', error);
    return null;
  }
}

/**
 * Fetch lyrics from Genius
 * Note: Genius API doesn't directly provide lyrics text - only the URL to the page
 * You need to scrape the page or use a third-party service
 * This function returns the song info with the URL where lyrics can be found
 */
export async function getLyricsInfo(trackName: string, artistName: string): Promise<{
  song: GeniusSearchResult | null;
  lyricsUrl: string | null;
  writers: string[];
} | null> {
  if (!isConfigured()) return null;

  try {
    // Search for the song
    const query = `${trackName} ${artistName}`;
    const results = await searchSongs(query, 5);

    if (results.length === 0) return null;

    // Find best match (simple string matching)
    const normalizedTrack = trackName.toLowerCase().trim();
    const normalizedArtist = artistName.toLowerCase().trim();

    const bestMatch = results.find(r =>
      r.title.toLowerCase().includes(normalizedTrack) ||
      normalizedTrack.includes(r.title.toLowerCase())
    ) || results[0];

    // Get full song details
    const song = await getSong(bestMatch.id);

    return {
      song: bestMatch,
      lyricsUrl: bestMatch.url,
      writers: song?.writer_artists?.map(w => w.name) || [],
    };
  } catch (error) {
    console.error('Genius lyrics lookup error:', error);
    return null;
  }
}

/**
 * Search for lyrics by ISRC (International Standard Recording Code)
 * More accurate matching than text search
 */
export async function searchByIsrc(isrc: string): Promise<GeniusSearchResult | null> {
  if (!isConfigured() || !isrc) return null;

  try {
    // Genius doesn't support ISRC directly, but we can search for it
    const results = await searchSongs(isrc, 1);
    return results[0] || null;
  } catch (error) {
    console.error('Genius ISRC search error:', error);
    return null;
  }
}

/**
 * Format lyrics info for display
 */
export function formatLyricsAttribution(song: GeniusSearchResult, writers: string[]): string {
  let attribution = `"${song.title}" by ${song.artist}`;

  if (writers.length > 0) {
    attribution += `\nWritten by: ${writers.join(', ')}`;
  }

  attribution += `\nSource: Genius (${song.url})`;

  return attribution;
}

/**
 * Create a MusicLyrics object from user-provided lyrics
 * This is the main flow since Genius API doesn't return lyrics text directly
 */
export function createUserLyrics(
  lyrics: string,
  trackName: string,
  artistName: string,
  geniusInfo?: { writers: string[]; url: string }
): MusicLyrics {
  return {
    id: `user:${Date.now()}`,
    source: 'user',
    trackName,
    artistName,
    lyrics,
    writers: geniusInfo?.writers,
    copyright: geniusInfo
      ? `Lyrics sourced from ${geniusInfo.url}`
      : 'User-provided lyrics',
  };
}

export const genius = {
  isConfigured,
  searchSongs,
  getSong,
  getLyricsInfo,
  searchByIsrc,
  formatLyricsAttribution,
  createUserLyrics,
};
