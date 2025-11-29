// Deezer API Client - Free, no auth required for catalog search
// https://developers.deezer.com/

import { MusicArtist, MusicAlbum, MusicTrack, ArtistDetails, AlbumDetails } from '@/types/music';

const BASE_URL = 'https://api.deezer.com';

// Deezer uses CORS proxy for browser requests, but server-side is fine
async function deezerFetch(endpoint: string): Promise<Response> {
  const url = `${BASE_URL}${endpoint}`;
  return fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
}

interface DeezerArtist {
  id: number;
  name: string;
  picture?: string;
  picture_medium?: string;
  picture_big?: string;
  picture_xl?: string;
  nb_album?: number;
  nb_fan?: number;
  tracklist?: string;
}

interface DeezerAlbum {
  id: number;
  title: string;
  cover?: string;
  cover_medium?: string;
  cover_big?: string;
  cover_xl?: string;
  artist?: DeezerArtist;
  nb_tracks?: number;
  release_date?: string;
  record_type?: string;
  tracklist?: string;
}

interface DeezerTrack {
  id: number;
  title: string;
  duration: number;
  preview: string;
  artist: DeezerArtist;
  album?: DeezerAlbum;
  rank?: number;
  explicit_lyrics?: boolean;
  track_position?: number;
}

interface DeezerSearchResponse<T> {
  data: T[];
  total: number;
  next?: string;
}

export async function searchArtists(query: string, limit = 10): Promise<MusicArtist[]> {
  try {
    const response = await deezerFetch(`/search/artist?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (!response.ok) throw new Error(`Deezer API error: ${response.status}`);

    const data: DeezerSearchResponse<DeezerArtist> = await response.json();

    return data.data.map(artist => ({
      id: `deezer:${artist.id}`,
      source: 'deezer' as const,
      name: artist.name,
      image: artist.picture_medium || artist.picture,
      followers: artist.nb_fan,
      externalUrls: {
        deezer: `https://www.deezer.com/artist/${artist.id}`,
      },
    }));
  } catch (error) {
    console.error('Deezer artist search error:', error);
    return [];
  }
}

export async function searchAlbums(query: string, limit = 10): Promise<MusicAlbum[]> {
  try {
    const response = await deezerFetch(`/search/album?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (!response.ok) throw new Error(`Deezer API error: ${response.status}`);

    const data: DeezerSearchResponse<DeezerAlbum> = await response.json();

    return data.data.map(album => ({
      id: `deezer:${album.id}`,
      source: 'deezer' as const,
      name: album.title,
      artist: album.artist?.name || 'Unknown Artist',
      artistId: album.artist ? `deezer:${album.artist.id}` : undefined,
      image: album.cover_medium || album.cover,
      releaseDate: album.release_date,
      trackCount: album.nb_tracks,
      type: mapRecordType(album.record_type),
      externalUrls: {
        deezer: `https://www.deezer.com/album/${album.id}`,
      },
    }));
  } catch (error) {
    console.error('Deezer album search error:', error);
    return [];
  }
}

export async function searchTracks(query: string, limit = 10): Promise<MusicTrack[]> {
  try {
    const response = await deezerFetch(`/search/track?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (!response.ok) throw new Error(`Deezer API error: ${response.status}`);

    const data: DeezerSearchResponse<DeezerTrack> = await response.json();

    return data.data.map(track => ({
      id: `deezer:${track.id}`,
      source: 'deezer' as const,
      name: track.title,
      artist: track.artist.name,
      artistId: `deezer:${track.artist.id}`,
      album: track.album?.title,
      albumId: track.album ? `deezer:${track.album.id}` : undefined,
      image: track.album?.cover_medium || track.album?.cover,
      duration: track.duration * 1000, // Convert to ms
      previewUrl: track.preview,
      popularity: track.rank ? Math.round(track.rank / 10000) : undefined,
      trackNumber: track.track_position,
      explicit: track.explicit_lyrics,
      externalUrls: {
        deezer: `https://www.deezer.com/track/${track.id}`,
      },
    }));
  } catch (error) {
    console.error('Deezer track search error:', error);
    return [];
  }
}

export async function search(query: string, limit = 10): Promise<{
  artists: MusicArtist[];
  albums: MusicAlbum[];
  tracks: MusicTrack[];
}> {
  // Run all searches in parallel
  const [artists, albums, tracks] = await Promise.all([
    searchArtists(query, limit),
    searchAlbums(query, limit),
    searchTracks(query, limit),
  ]);

  return { artists, albums, tracks };
}

export async function getArtist(id: string | number): Promise<ArtistDetails | null> {
  const artistId = String(id).replace('deezer:', '');

  try {
    // Fetch artist info and top tracks in parallel
    const [artistResponse, topTracksResponse, albumsResponse] = await Promise.all([
      deezerFetch(`/artist/${artistId}`),
      deezerFetch(`/artist/${artistId}/top?limit=10`),
      deezerFetch(`/artist/${artistId}/albums?limit=50`),
    ]);

    if (!artistResponse.ok) throw new Error(`Deezer API error: ${artistResponse.status}`);

    const artist: DeezerArtist = await artistResponse.json();

    let topTracks: MusicTrack[] = [];
    if (topTracksResponse.ok) {
      const topData: DeezerSearchResponse<DeezerTrack> = await topTracksResponse.json();
      topTracks = topData.data.map(track => ({
        id: `deezer:${track.id}`,
        source: 'deezer' as const,
        name: track.title,
        artist: artist.name,
        artistId: `deezer:${artist.id}`,
        album: track.album?.title,
        albumId: track.album ? `deezer:${track.album.id}` : undefined,
        image: track.album?.cover_medium,
        duration: track.duration * 1000,
        previewUrl: track.preview,
        explicit: track.explicit_lyrics,
        externalUrls: {
          deezer: `https://www.deezer.com/track/${track.id}`,
        },
      }));
    }

    let albums: MusicAlbum[] = [];
    let singles: MusicAlbum[] = [];
    if (albumsResponse.ok) {
      const albumData: DeezerSearchResponse<DeezerAlbum> = await albumsResponse.json();
      const allReleases = albumData.data.map(album => ({
        id: `deezer:${album.id}`,
        source: 'deezer' as const,
        name: album.title,
        artist: artist.name,
        artistId: `deezer:${artist.id}`,
        image: album.cover_medium || album.cover,
        releaseDate: album.release_date,
        trackCount: album.nb_tracks,
        type: mapRecordType(album.record_type),
        externalUrls: {
          deezer: `https://www.deezer.com/album/${album.id}`,
        },
      }));

      albums = allReleases.filter(a => a.type === 'album');
      singles = allReleases.filter(a => a.type === 'single');
    }

    return {
      id: `deezer:${artist.id}`,
      source: 'deezer',
      name: artist.name,
      image: artist.picture_xl || artist.picture_big || artist.picture_medium,
      followers: artist.nb_fan,
      topTracks,
      albums,
      singles,
      externalUrls: {
        deezer: `https://www.deezer.com/artist/${artist.id}`,
      },
    };
  } catch (error) {
    console.error('Deezer get artist error:', error);
    return null;
  }
}

export async function getAlbum(id: string | number): Promise<AlbumDetails | null> {
  const albumId = String(id).replace('deezer:', '');

  try {
    const response = await deezerFetch(`/album/${albumId}`);
    if (!response.ok) throw new Error(`Deezer API error: ${response.status}`);

    const album: DeezerAlbum & {
      genres?: { data: Array<{ name: string }> };
      label?: string;
      tracks?: { data: DeezerTrack[] };
    } = await response.json();

    const tracks: MusicTrack[] = (album.tracks?.data || []).map(track => ({
      id: `deezer:${track.id}`,
      source: 'deezer' as const,
      name: track.title,
      artist: album.artist?.name || 'Unknown Artist',
      artistId: album.artist ? `deezer:${album.artist.id}` : undefined,
      album: album.title,
      albumId: `deezer:${album.id}`,
      image: album.cover_medium,
      duration: track.duration * 1000,
      previewUrl: track.preview,
      trackNumber: track.track_position,
      explicit: track.explicit_lyrics,
      externalUrls: {
        deezer: `https://www.deezer.com/track/${track.id}`,
      },
    }));

    return {
      id: `deezer:${album.id}`,
      source: 'deezer',
      name: album.title,
      artist: album.artist?.name || 'Unknown Artist',
      artistId: album.artist ? `deezer:${album.artist.id}` : undefined,
      image: album.cover_xl || album.cover_big || album.cover_medium,
      releaseDate: album.release_date,
      trackCount: album.nb_tracks,
      type: mapRecordType(album.record_type),
      tracks,
      label: album.label,
      genres: album.genres?.data.map(g => g.name),
      externalUrls: {
        deezer: `https://www.deezer.com/album/${album.id}`,
      },
    };
  } catch (error) {
    console.error('Deezer get album error:', error);
    return null;
  }
}

export async function getTrack(id: string | number): Promise<MusicTrack | null> {
  const trackId = String(id).replace('deezer:', '');

  try {
    const response = await deezerFetch(`/track/${trackId}`);
    if (!response.ok) throw new Error(`Deezer API error: ${response.status}`);

    const track: DeezerTrack & { isrc?: string } = await response.json();

    return {
      id: `deezer:${track.id}`,
      source: 'deezer',
      name: track.title,
      artist: track.artist.name,
      artistId: `deezer:${track.artist.id}`,
      album: track.album?.title,
      albumId: track.album ? `deezer:${track.album.id}` : undefined,
      image: track.album?.cover_medium,
      duration: track.duration * 1000,
      previewUrl: track.preview,
      isrc: track.isrc,
      trackNumber: track.track_position,
      explicit: track.explicit_lyrics,
      externalUrls: {
        deezer: `https://www.deezer.com/track/${track.id}`,
      },
    };
  } catch (error) {
    console.error('Deezer get track error:', error);
    return null;
  }
}

function mapRecordType(type?: string): 'album' | 'single' | 'ep' | 'compilation' {
  switch (type?.toLowerCase()) {
    case 'album': return 'album';
    case 'single': return 'single';
    case 'ep': return 'ep';
    case 'compile':
    case 'compilation': return 'compilation';
    default: return 'album';
  }
}

export const deezer = {
  search,
  searchArtists,
  searchAlbums,
  searchTracks,
  getArtist,
  getAlbum,
  getTrack,
};
