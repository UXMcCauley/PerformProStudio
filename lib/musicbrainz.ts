// MusicBrainz API Client - Free, no auth required
// https://musicbrainz.org/doc/MusicBrainz_API

import { MusicArtist, MusicAlbum, MusicTrack, ArtistDetails } from '@/types/music';

const BASE_URL = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'IntelliPrompter/1.0.0 (https://intelliprompter.com)';

// Rate limiting: MusicBrainz requires max 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 seconds to be safe

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();

  return fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
    },
  });
}

interface MBSearchResponse<T> {
  created: string;
  count: number;
  offset: number;
  artists?: T[];
  'release-groups'?: T[];
  recordings?: T[];
}

interface MBArtist {
  id: string;
  name: string;
  'sort-name': string;
  type?: string;
  country?: string;
  disambiguation?: string;
  'life-span'?: {
    begin?: string;
    end?: string;
    ended?: boolean;
  };
  tags?: Array<{ name: string; count: number }>;
}

interface MBReleaseGroup {
  id: string;
  title: string;
  'primary-type'?: string;
  'secondary-types'?: string[];
  'first-release-date'?: string;
  'artist-credit'?: Array<{
    artist: MBArtist;
  }>;
}

interface MBRecording {
  id: string;
  title: string;
  length?: number;
  'artist-credit'?: Array<{
    artist: MBArtist;
  }>;
  releases?: Array<{
    id: string;
    title: string;
    'release-group'?: MBReleaseGroup;
  }>;
  isrcs?: string[];
}

export async function searchArtists(query: string, limit = 10): Promise<MusicArtist[]> {
  const url = `${BASE_URL}/artist?query=${encodeURIComponent(query)}&limit=${limit}&fmt=json`;

  try {
    const response = await rateLimitedFetch(url);
    if (!response.ok) throw new Error(`MusicBrainz API error: ${response.status}`);

    const data: MBSearchResponse<MBArtist> = await response.json();

    return (data.artists || []).map(artist => ({
      id: `musicbrainz:${artist.id}`,
      source: 'musicbrainz' as const,
      name: artist.name,
      genres: artist.tags?.slice(0, 5).map(t => t.name),
      externalUrls: {
        musicbrainz: `https://musicbrainz.org/artist/${artist.id}`,
      },
    }));
  } catch (error) {
    console.error('MusicBrainz artist search error:', error);
    return [];
  }
}

export async function searchAlbums(query: string, limit = 10): Promise<MusicAlbum[]> {
  const url = `${BASE_URL}/release-group?query=${encodeURIComponent(query)}&limit=${limit}&fmt=json`;

  try {
    const response = await rateLimitedFetch(url);
    if (!response.ok) throw new Error(`MusicBrainz API error: ${response.status}`);

    const data: MBSearchResponse<MBReleaseGroup> = await response.json();

    return (data['release-groups'] || []).map(rg => ({
      id: `musicbrainz:${rg.id}`,
      source: 'musicbrainz' as const,
      name: rg.title,
      artist: rg['artist-credit']?.[0]?.artist.name || 'Unknown Artist',
      artistId: rg['artist-credit']?.[0]?.artist.id ? `musicbrainz:${rg['artist-credit'][0].artist.id}` : undefined,
      releaseDate: rg['first-release-date'],
      type: mapReleaseType(rg['primary-type']),
      externalUrls: {
        musicbrainz: `https://musicbrainz.org/release-group/${rg.id}`,
      },
    }));
  } catch (error) {
    console.error('MusicBrainz album search error:', error);
    return [];
  }
}

export async function searchTracks(query: string, limit = 10): Promise<MusicTrack[]> {
  const url = `${BASE_URL}/recording?query=${encodeURIComponent(query)}&limit=${limit}&fmt=json`;

  try {
    const response = await rateLimitedFetch(url);
    if (!response.ok) throw new Error(`MusicBrainz API error: ${response.status}`);

    const data: MBSearchResponse<MBRecording> = await response.json();

    return (data.recordings || []).map(rec => ({
      id: `musicbrainz:${rec.id}`,
      source: 'musicbrainz' as const,
      name: rec.title,
      artist: rec['artist-credit']?.[0]?.artist.name || 'Unknown Artist',
      artistId: rec['artist-credit']?.[0]?.artist.id ? `musicbrainz:${rec['artist-credit'][0].artist.id}` : undefined,
      album: rec.releases?.[0]?.title,
      albumId: rec.releases?.[0]?.id ? `musicbrainz:${rec.releases[0].id}` : undefined,
      duration: rec.length,
      isrc: rec.isrcs?.[0],
      externalUrls: {
        musicbrainz: `https://musicbrainz.org/recording/${rec.id}`,
      },
    }));
  } catch (error) {
    console.error('MusicBrainz track search error:', error);
    return [];
  }
}

export async function getArtistDetails(mbid: string): Promise<ArtistDetails | null> {
  // Remove prefix if present
  const id = mbid.replace('musicbrainz:', '');
  const url = `${BASE_URL}/artist/${id}?inc=release-groups+tags+url-rels&fmt=json`;

  try {
    const response = await rateLimitedFetch(url);
    if (!response.ok) throw new Error(`MusicBrainz API error: ${response.status}`);

    const artist: MBArtist & {
      'release-groups'?: MBReleaseGroup[];
      relations?: Array<{ type: string; url: { resource: string } }>;
    } = await response.json();

    const albums = (artist['release-groups'] || [])
      .filter(rg => rg['primary-type'] === 'Album')
      .map(rg => ({
        id: `musicbrainz:${rg.id}`,
        source: 'musicbrainz' as const,
        name: rg.title,
        artist: artist.name,
        artistId: `musicbrainz:${artist.id}`,
        releaseDate: rg['first-release-date'],
        type: 'album' as const,
      }));

    const singles = (artist['release-groups'] || [])
      .filter(rg => rg['primary-type'] === 'Single')
      .map(rg => ({
        id: `musicbrainz:${rg.id}`,
        source: 'musicbrainz' as const,
        name: rg.title,
        artist: artist.name,
        artistId: `musicbrainz:${artist.id}`,
        releaseDate: rg['first-release-date'],
        type: 'single' as const,
      }));

    // Extract external URLs from relations
    const externalUrls: Record<string, string> = {
      musicbrainz: `https://musicbrainz.org/artist/${artist.id}`,
    };

    artist.relations?.forEach(rel => {
      if (rel.url?.resource) {
        if (rel.url.resource.includes('spotify.com')) externalUrls.spotify = rel.url.resource;
        if (rel.url.resource.includes('deezer.com')) externalUrls.deezer = rel.url.resource;
        if (rel.url.resource.includes('music.apple.com')) externalUrls.apple = rel.url.resource;
        if (rel.url.resource.includes('tidal.com')) externalUrls.tidal = rel.url.resource;
      }
    });

    return {
      id: `musicbrainz:${artist.id}`,
      source: 'musicbrainz',
      name: artist.name,
      genres: artist.tags?.slice(0, 10).map(t => t.name),
      albums,
      singles,
      externalUrls,
    };
  } catch (error) {
    console.error('MusicBrainz artist details error:', error);
    return null;
  }
}

export async function getArtistAlbums(mbid: string): Promise<MusicAlbum[]> {
  const id = mbid.replace('musicbrainz:', '');
  const url = `${BASE_URL}/release-group?artist=${id}&type=album&limit=100&fmt=json`;

  try {
    const response = await rateLimitedFetch(url);
    if (!response.ok) throw new Error(`MusicBrainz API error: ${response.status}`);

    const data: MBSearchResponse<MBReleaseGroup> = await response.json();

    return (data['release-groups'] || []).map(rg => ({
      id: `musicbrainz:${rg.id}`,
      source: 'musicbrainz' as const,
      name: rg.title,
      artist: rg['artist-credit']?.[0]?.artist.name || 'Unknown Artist',
      artistId: `musicbrainz:${id}`,
      releaseDate: rg['first-release-date'],
      type: mapReleaseType(rg['primary-type']),
      externalUrls: {
        musicbrainz: `https://musicbrainz.org/release-group/${rg.id}`,
      },
    }));
  } catch (error) {
    console.error('MusicBrainz artist albums error:', error);
    return [];
  }
}

function mapReleaseType(type?: string): 'album' | 'single' | 'ep' | 'compilation' {
  switch (type?.toLowerCase()) {
    case 'album': return 'album';
    case 'single': return 'single';
    case 'ep': return 'ep';
    case 'compilation': return 'compilation';
    default: return 'album';
  }
}

export const musicbrainz = {
  searchArtists,
  searchAlbums,
  searchTracks,
  getArtistDetails,
  getArtistAlbums,
};
