// Unified Music Search - Aggregates results from multiple sources
// Provides a single interface to search across Spotify, Deezer, MusicBrainz, and more

import {
  MusicArtist,
  MusicAlbum,
  MusicTrack,
  MusicSource,
  UnifiedSearchResult,
  MusicSearchOptions,
  ArtistDetails,
  AlbumDetails,
} from '@/types/music';

import { spotify } from './spotify';
import { deezer } from './deezer';
import { musicbrainz } from './musicbrainz';
import { genius } from './genius';

const DEFAULT_LIMIT = 10;

// Source priority for deduplication (higher index = higher priority)
const SOURCE_PRIORITY: MusicSource[] = ['musicbrainz', 'deezer', 'spotify', 'apple', 'tidal'];

/**
 * Get available music sources based on configuration
 */
export function getAvailableSources(): MusicSource[] {
  const sources: MusicSource[] = ['deezer', 'musicbrainz']; // Always available (no auth needed)

  if (spotify.isConfigured()) {
    sources.push('spotify');
  }

  return sources;
}

/**
 * Check which optional services are configured
 */
export function getServiceStatus(): Record<string, boolean> {
  return {
    spotify: spotify.isConfigured(),
    deezer: true, // Always available
    musicbrainz: true, // Always available
    genius: genius.isConfigured(),
  };
}

/**
 * Unified search across all configured sources
 */
export async function search(
  query: string,
  options: MusicSearchOptions = {}
): Promise<UnifiedSearchResult> {
  const {
    sources = getAvailableSources(),
    limit = DEFAULT_LIMIT,
    types = ['artist', 'album', 'track'],
  } = options;

  const searchPromises: Promise<{
    source: MusicSource;
    artists: MusicArtist[];
    albums: MusicAlbum[];
    tracks: MusicTrack[];
  }>[] = [];

  // Build search promises for each source
  for (const source of sources) {
    switch (source) {
      case 'spotify':
        if (spotify.isConfigured()) {
          searchPromises.push(
            spotify.search(query, limit).then(result => ({
              source: 'spotify' as const,
              ...result,
            }))
          );
        }
        break;

      case 'deezer':
        searchPromises.push(
          deezer.search(query, limit).then(result => ({
            source: 'deezer' as const,
            ...result,
          }))
        );
        break;

      case 'musicbrainz':
        // MusicBrainz searches are rate-limited, run them sequentially
        searchPromises.push(
          (async () => {
            const [artists, albums, tracks] = await Promise.all([
              types.includes('artist') ? musicbrainz.searchArtists(query, limit) : [],
              types.includes('album') ? musicbrainz.searchAlbums(query, limit) : [],
              types.includes('track') ? musicbrainz.searchTracks(query, limit) : [],
            ]);
            return { source: 'musicbrainz' as const, artists, albums, tracks };
          })()
        );
        break;
    }
  }

  // Execute all searches in parallel
  const results = await Promise.allSettled(searchPromises);

  // Aggregate results
  const allArtists: MusicArtist[] = [];
  const allAlbums: MusicAlbum[] = [];
  const allTracks: MusicTrack[] = [];
  const activeSources: MusicSource[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { source, artists, albums, tracks } = result.value;
      activeSources.push(source);
      allArtists.push(...artists);
      allAlbums.push(...albums);
      allTracks.push(...tracks);
    }
  }

  // Deduplicate and merge results
  return {
    artists: types.includes('artist') ? deduplicateArtists(allArtists).slice(0, limit) : [],
    albums: types.includes('album') ? deduplicateAlbums(allAlbums).slice(0, limit) : [],
    tracks: types.includes('track') ? deduplicateTracks(allTracks).slice(0, limit) : [],
    query,
    sources: activeSources,
  };
}

/**
 * Search only for artists
 */
export async function searchArtists(
  query: string,
  options: MusicSearchOptions = {}
): Promise<MusicArtist[]> {
  const result = await search(query, { ...options, types: ['artist'] });
  return result.artists;
}

/**
 * Search only for albums
 */
export async function searchAlbums(
  query: string,
  options: MusicSearchOptions = {}
): Promise<MusicAlbum[]> {
  const result = await search(query, { ...options, types: ['album'] });
  return result.albums;
}

/**
 * Search only for tracks
 */
export async function searchTracks(
  query: string,
  options: MusicSearchOptions = {}
): Promise<MusicTrack[]> {
  const result = await search(query, { ...options, types: ['track'] });
  return result.tracks;
}

/**
 * Get detailed artist information from a specific source
 */
export async function getArtist(id: string): Promise<ArtistDetails | null> {
  const [source] = id.split(':') as [MusicSource, string];

  switch (source) {
    case 'spotify':
      return spotify.getArtist(id);
    case 'deezer':
      return deezer.getArtist(id);
    case 'musicbrainz':
      return musicbrainz.getArtistDetails(id);
    default:
      return null;
  }
}

/**
 * Get detailed album information from a specific source
 */
export async function getAlbum(id: string): Promise<AlbumDetails | null> {
  const [source] = id.split(':') as [MusicSource, string];

  switch (source) {
    case 'spotify':
      return spotify.getAlbum(id);
    case 'deezer':
      return deezer.getAlbum(id);
    default:
      return null;
  }
}

/**
 * Get track details from a specific source
 */
export async function getTrack(id: string): Promise<MusicTrack | null> {
  const [source] = id.split(':') as [MusicSource, string];

  switch (source) {
    case 'spotify':
      return spotify.getTrack(id);
    case 'deezer':
      return deezer.getTrack(id);
    default:
      return null;
  }
}

/**
 * Find lyrics info for a track using Genius
 */
export async function findLyrics(trackName: string, artistName: string) {
  if (!genius.isConfigured()) {
    return {
      available: false,
      reason: 'Genius API not configured',
    };
  }

  const info = await genius.getLyricsInfo(trackName, artistName);

  if (!info || !info.song) {
    return {
      available: false,
      reason: 'Song not found on Genius',
    };
  }

  return {
    available: true,
    song: info.song,
    lyricsUrl: info.lyricsUrl,
    writers: info.writers,
  };
}

/**
 * Cross-reference a track across multiple services
 * Useful for finding streaming links when you have a track from one source
 */
export async function crossReference(track: MusicTrack): Promise<{
  spotify?: MusicTrack;
  deezer?: MusicTrack;
  genius?: { url: string; writers: string[] };
}> {
  const query = `${track.name} ${track.artist}`;
  const results: {
    spotify?: MusicTrack;
    deezer?: MusicTrack;
    genius?: { url: string; writers: string[] };
  } = {};

  const promises: Promise<void>[] = [];

  // Search Spotify if not already from Spotify
  if (track.source !== 'spotify' && spotify.isConfigured()) {
    promises.push(
      spotify.searchTracks(query, 5).then(tracks => {
        const match = findBestMatch(track, tracks);
        if (match) results.spotify = match;
      })
    );
  }

  // Search Deezer if not already from Deezer
  if (track.source !== 'deezer') {
    promises.push(
      deezer.searchTracks(query, 5).then(tracks => {
        const match = findBestMatch(track, tracks);
        if (match) results.deezer = match;
      })
    );
  }

  // Find on Genius for lyrics
  if (genius.isConfigured()) {
    promises.push(
      genius.getLyricsInfo(track.name, track.artist).then(info => {
        if (info?.lyricsUrl) {
          results.genius = {
            url: info.lyricsUrl,
            writers: info.writers,
          };
        }
      })
    );
  }

  await Promise.allSettled(promises);

  return results;
}

// Deduplication helpers

function deduplicateArtists(artists: MusicArtist[]): MusicArtist[] {
  const seen = new Map<string, MusicArtist>();

  for (const artist of artists) {
    const key = normalizeForComparison(artist.name);
    const existing = seen.get(key);

    if (!existing || shouldReplace(existing.source, artist.source)) {
      // Merge external URLs if we're replacing
      if (existing) {
        artist.externalUrls = { ...existing.externalUrls, ...artist.externalUrls };
      }
      seen.set(key, artist);
    } else if (existing) {
      // Just add the external URL from this source
      existing.externalUrls = { ...existing.externalUrls, ...artist.externalUrls };
    }
  }

  return Array.from(seen.values());
}

function deduplicateAlbums(albums: MusicAlbum[]): MusicAlbum[] {
  const seen = new Map<string, MusicAlbum>();

  for (const album of albums) {
    const key = `${normalizeForComparison(album.artist)}:${normalizeForComparison(album.name)}`;
    const existing = seen.get(key);

    if (!existing || shouldReplace(existing.source, album.source)) {
      if (existing) {
        album.externalUrls = { ...existing.externalUrls, ...album.externalUrls };
      }
      seen.set(key, album);
    } else if (existing) {
      existing.externalUrls = { ...existing.externalUrls, ...album.externalUrls };
    }
  }

  return Array.from(seen.values());
}

function deduplicateTracks(tracks: MusicTrack[]): MusicTrack[] {
  const seen = new Map<string, MusicTrack>();

  // First pass: group by ISRC if available (most reliable)
  const byIsrc = new Map<string, MusicTrack[]>();
  const withoutIsrc: MusicTrack[] = [];

  for (const track of tracks) {
    if (track.isrc) {
      const existing = byIsrc.get(track.isrc) || [];
      existing.push(track);
      byIsrc.set(track.isrc, existing);
    } else {
      withoutIsrc.push(track);
    }
  }

  // Merge tracks with same ISRC
  for (const [isrc, isrcTracks] of byIsrc) {
    const merged = mergeTrackVersions(isrcTracks);
    const key = `isrc:${isrc}`;
    seen.set(key, merged);
  }

  // Second pass: deduplicate by name/artist for tracks without ISRC
  for (const track of withoutIsrc) {
    const key = `${normalizeForComparison(track.artist)}:${normalizeForComparison(track.name)}`;

    // Check if we already have this track via ISRC
    let foundViaIsrc = false;
    for (const [, existing] of seen) {
      if (
        normalizeForComparison(existing.name) === normalizeForComparison(track.name) &&
        normalizeForComparison(existing.artist).includes(normalizeForComparison(track.artist.split(',')[0]))
      ) {
        existing.externalUrls = { ...existing.externalUrls, ...track.externalUrls };
        foundViaIsrc = true;
        break;
      }
    }

    if (!foundViaIsrc) {
      const existing = seen.get(key);
      if (!existing || shouldReplace(existing.source, track.source)) {
        if (existing) {
          track.externalUrls = { ...existing.externalUrls, ...track.externalUrls };
        }
        seen.set(key, track);
      } else if (existing) {
        existing.externalUrls = { ...existing.externalUrls, ...track.externalUrls };
      }
    }
  }

  return Array.from(seen.values());
}

function mergeTrackVersions(tracks: MusicTrack[]): MusicTrack {
  // Sort by source priority and pick the best one
  const sorted = [...tracks].sort(
    (a, b) => SOURCE_PRIORITY.indexOf(b.source) - SOURCE_PRIORITY.indexOf(a.source)
  );

  const best = sorted[0];

  // Merge all external URLs
  for (const track of sorted.slice(1)) {
    best.externalUrls = { ...best.externalUrls, ...track.externalUrls };
    // Keep preview URL if we don't have one
    if (!best.previewUrl && track.previewUrl) {
      best.previewUrl = track.previewUrl;
    }
  }

  return best;
}

function shouldReplace(existingSource: MusicSource, newSource: MusicSource): boolean {
  return SOURCE_PRIORITY.indexOf(newSource) > SOURCE_PRIORITY.indexOf(existingSource);
}

function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findBestMatch(target: MusicTrack, candidates: MusicTrack[]): MusicTrack | null {
  // If we have ISRC, look for exact match
  if (target.isrc) {
    const isrcMatch = candidates.find(c => c.isrc === target.isrc);
    if (isrcMatch) return isrcMatch;
  }

  // Otherwise, find by normalized name/artist
  const targetName = normalizeForComparison(target.name);
  const targetArtist = normalizeForComparison(target.artist.split(',')[0]);

  for (const candidate of candidates) {
    const candidateName = normalizeForComparison(candidate.name);
    const candidateArtist = normalizeForComparison(candidate.artist.split(',')[0]);

    if (candidateName === targetName && candidateArtist === targetArtist) {
      return candidate;
    }
  }

  // Fuzzy match: check if names are contained
  for (const candidate of candidates) {
    const candidateName = normalizeForComparison(candidate.name);
    const candidateArtist = normalizeForComparison(candidate.artist.split(',')[0]);

    if (
      (candidateName.includes(targetName) || targetName.includes(candidateName)) &&
      (candidateArtist.includes(targetArtist) || targetArtist.includes(candidateArtist))
    ) {
      return candidate;
    }
  }

  return null;
}

export const musicSearch = {
  getAvailableSources,
  getServiceStatus,
  search,
  searchArtists,
  searchAlbums,
  searchTracks,
  getArtist,
  getAlbum,
  getTrack,
  findLyrics,
  crossReference,
};
