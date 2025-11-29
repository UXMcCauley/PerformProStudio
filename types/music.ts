// Unified music types for cross-platform search

export interface MusicArtist {
  id: string;
  source: MusicSource;
  name: string;
  image?: string;
  genres?: string[];
  popularity?: number;
  followers?: number;
  externalUrls?: Record<string, string>;
}

export interface MusicAlbum {
  id: string;
  source: MusicSource;
  name: string;
  artist: string;
  artistId?: string;
  image?: string;
  releaseDate?: string;
  trackCount?: number;
  type?: 'album' | 'single' | 'ep' | 'compilation';
  externalUrls?: Record<string, string>;
}

export interface MusicTrack {
  id: string;
  source: MusicSource;
  name: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  image?: string;
  duration?: number; // in ms
  previewUrl?: string;
  isrc?: string;
  popularity?: number;
  trackNumber?: number;
  explicit?: boolean;
  externalUrls?: Record<string, string>;
}

export interface MusicLyrics {
  id: string;
  source: LyricsSource;
  trackName: string;
  artistName: string;
  lyrics: string;
  syncedLyrics?: SyncedLyricLine[];
  copyright?: string;
  writers?: string[];
}

export interface SyncedLyricLine {
  time: number; // in ms
  text: string;
  endTime?: number;
}

export type MusicSource = 'spotify' | 'deezer' | 'musicbrainz' | 'apple' | 'tidal' | 'youtube';
export type LyricsSource = 'genius' | 'musixmatch' | 'user' | 'synced';

export interface UnifiedSearchResult {
  artists: MusicArtist[];
  albums: MusicAlbum[];
  tracks: MusicTrack[];
  query: string;
  sources: MusicSource[];
}

export interface ArtistDetails extends MusicArtist {
  bio?: string;
  topTracks?: MusicTrack[];
  albums?: MusicAlbum[];
  singles?: MusicAlbum[];
  relatedArtists?: MusicArtist[];
}

export interface AlbumDetails extends MusicAlbum {
  tracks?: MusicTrack[];
  copyrights?: string[];
  label?: string;
  genres?: string[];
}

// Search options
export interface MusicSearchOptions {
  sources?: MusicSource[];
  limit?: number;
  offset?: number;
  types?: ('artist' | 'album' | 'track')[];
}

// Streaming connection
export interface StreamingConnection {
  source: MusicSource;
  connected: boolean;
  userId?: string;
  displayName?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

// Import result when adding a song to library
export interface SongImportResult {
  success: boolean;
  songId?: string;
  track: MusicTrack;
  lyrics?: MusicLyrics;
  streamingUrls?: Record<MusicSource, string>;
  error?: string;
}

// Performance line - enhanced lyric line for teleprompter
export interface PerformanceLine {
  text: string;
  lineNumber: number;
  section?: string;
  sectionType?: 'verse' | 'chorus' | 'bridge' | 'pre-chorus' | 'outro' | 'intro' | 'hook' | 'ad-lib';
  timing?: {
    startMs: number;
    endMs: number;
    durationMs: number;
  };
  performance?: {
    breathBefore?: boolean;
    emphasis?: 'normal' | 'strong' | 'soft';
    dynamics?: 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff';
    vocalType?: 'lead' | 'harmony' | 'backing' | 'spoken' | 'ad-lib';
  };
  syllableCount?: number;
  isEmptyLine?: boolean;
}

// API response wrappers
export interface MusicAPIResponse<T> {
  data: T;
  source: MusicSource;
  cached?: boolean;
  timestamp: number;
}

export interface MusicAPIError {
  source: MusicSource;
  code: string;
  message: string;
  statusCode?: number;
}
