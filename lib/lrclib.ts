// LRCLIB - Free lyrics API with synced lyrics support
// https://lrclib.net/docs

const BASE_URL = 'https://lrclib.net/api';

export interface LrcLibLyrics {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  instrumental: boolean;
  plainLyrics?: string;
  syncedLyrics?: string; // LRC format with timestamps
}

export interface ParsedLyricLine {
  timestamp_ms: number;
  text: string;
}

/**
 * Search for lyrics by track and artist name
 */
export async function searchLyrics(
  trackName: string,
  artistName: string,
  albumName?: string,
  duration?: number
): Promise<LrcLibLyrics | null> {
  try {
    // Try exact match first with GET endpoint
    const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
    });

    if (albumName) params.append('album_name', albumName);
    if (duration) params.append('duration', String(Math.round(duration / 1000))); // Convert ms to seconds

    const response = await fetch(`${BASE_URL}/get?${params.toString()}`, {
      headers: {
        'User-Agent': 'IntelliPrompter/1.0',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data && !data.instrumental) {
        return data;
      }
    }

    // If exact match fails, try search endpoint
    const searchParams = new URLSearchParams({
      q: `${artistName} ${trackName}`,
    });

    const searchResponse = await fetch(`${BASE_URL}/search?${searchParams.toString()}`, {
      headers: {
        'User-Agent': 'IntelliPrompter/1.0',
      },
    });

    if (!searchResponse.ok) {
      return null;
    }

    const results: LrcLibLyrics[] = await searchResponse.json();

    // Find best match
    const normalizedTrack = trackName.toLowerCase().trim();
    const normalizedArtist = artistName.toLowerCase().trim();

    const bestMatch = results.find(r =>
      r.trackName.toLowerCase().includes(normalizedTrack) &&
      r.artistName.toLowerCase().includes(normalizedArtist) &&
      !r.instrumental
    ) || results.find(r => !r.instrumental);

    return bestMatch || null;
  } catch (error) {
    console.error('LRCLIB search error:', error);
    return null;
  }
}

/**
 * Parse LRC format synced lyrics into structured lines
 * LRC format: [mm:ss.xx]lyrics text
 */
export function parseSyncedLyrics(lrcContent: string): ParsedLyricLine[] {
  const lines: ParsedLyricLine[] = [];
  const lrcLines = lrcContent.split('\n');

  for (const line of lrcLines) {
    // Match timestamp pattern [mm:ss.xx] or [mm:ss]
    const match = line.match(/^\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)$/);

    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      const text = match[4].trim();

      // Skip empty lines or metadata tags
      if (text && !text.startsWith('[')) {
        lines.push({
          timestamp_ms: (minutes * 60 + seconds) * 1000 + milliseconds,
          text,
        });
      }
    }
  }

  // Sort by timestamp
  lines.sort((a, b) => a.timestamp_ms - b.timestamp_ms);

  return lines;
}

/**
 * Parse plain lyrics into lines (without timestamps)
 */
export function parsePlainLyrics(plainLyrics: string): string[] {
  return plainLyrics
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * Get lyrics with preference for synced version
 */
export async function getLyrics(
  trackName: string,
  artistName: string,
  albumName?: string,
  duration?: number
): Promise<{
  synced: ParsedLyricLine[] | null;
  plain: string[] | null;
  source: 'lrclib';
} | null> {
  const result = await searchLyrics(trackName, artistName, albumName, duration);

  if (!result) {
    return null;
  }

  return {
    synced: result.syncedLyrics ? parseSyncedLyrics(result.syncedLyrics) : null,
    plain: result.plainLyrics ? parsePlainLyrics(result.plainLyrics) : null,
    source: 'lrclib',
  };
}

export const lrclib = {
  searchLyrics,
  parseSyncedLyrics,
  parsePlainLyrics,
  getLyrics,
};
