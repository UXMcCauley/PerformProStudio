'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MusicArtist, MusicAlbum, MusicTrack, UnifiedSearchResult, MusicSource } from '@/types/music';

interface MusicSearchProps {
  onSelectTrack?: (track: MusicTrack) => void;
  onSelectArtist?: (artist: MusicArtist) => void;
  onSelectAlbum?: (album: MusicAlbum) => void;
  onImport?: (track: MusicTrack, lyricsUrl?: string) => void;
  showImportButton?: boolean;
  placeholder?: string;
  className?: string;
}

type SearchTab = 'all' | 'tracks' | 'artists' | 'albums';

interface ServiceStatus {
  spotify: boolean;
  deezer: boolean;
  musicbrainz: boolean;
  genius: boolean;
}

export default function MusicSearch({
  onSelectTrack,
  onSelectArtist,
  onSelectAlbum,
  onImport,
  showImportButton = true,
  placeholder = 'Search for artists, songs, or albums...',
  className = '',
}: MusicSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnifiedSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [services, setServices] = useState<ServiceStatus | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [trackDetails, setTrackDetails] = useState<{
    streamingLinks?: Record<string, string>;
    lyrics?: { url: string; writers: string[] };
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const types = activeTab === 'all' ? undefined : activeTab === 'tracks' ? 'track' : activeTab;
      const response = await fetch(
        `/api/music/search?q=${encodeURIComponent(searchQuery)}&limit=10${types ? `&types=${types}` : ''}`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.data);
      setServices(data.services);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  // Re-search when tab changes
  useEffect(() => {
    if (query.trim()) {
      handleSearch(query);
    }
  }, [activeTab, handleSearch, query]);

  // Fetch track details when a track is selected
  const handleTrackSelect = async (track: MusicTrack) => {
    setSelectedTrack(track);
    onSelectTrack?.(track);

    if (showImportButton) {
      setLoadingDetails(true);
      try {
        const response = await fetch(`/api/music/track?id=${encodeURIComponent(track.id)}`);
        if (response.ok) {
          const data = await response.json();
          setTrackDetails({
            streamingLinks: data.streamingLinks,
            lyrics: data.lyrics,
          });
        }
      } catch (err) {
        console.error('Failed to fetch track details:', err);
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  // Handle import
  const handleImport = () => {
    if (selectedTrack && onImport) {
      onImport(selectedTrack, trackDetails?.lyrics?.url);
    }
  };

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get source badge color
  const getSourceColor = (source: MusicSource): string => {
    switch (source) {
      case 'spotify': return 'bg-green-500';
      case 'deezer': return 'bg-purple-500';
      case 'musicbrainz': return 'bg-orange-500';
      case 'apple': return 'bg-pink-500';
      case 'tidal': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="input input-bordered w-full pl-10 pr-4"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 loading loading-spinner loading-sm" />
        )}
      </div>

      {/* Service Status Indicators */}
      {services && (
        <div className="flex gap-2 mt-2 text-xs">
          <span className="text-base-content/60">Sources:</span>
          {Object.entries(services).map(([service, active]) => (
            <span
              key={service}
              className={`badge badge-sm ${active ? 'badge-success' : 'badge-ghost'}`}
            >
              {service}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      {results && (
        <div className="tabs tabs-boxed mt-4 mb-2">
          <button
            className={`tab ${activeTab === 'all' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button
            className={`tab ${activeTab === 'tracks' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('tracks')}
          >
            Tracks ({results.tracks.length})
          </button>
          <button
            className={`tab ${activeTab === 'artists' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('artists')}
          >
            Artists ({results.artists.length})
          </button>
          <button
            className={`tab ${activeTab === 'albums' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('albums')}
          >
            Albums ({results.albums.length})
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-error mt-4">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="mt-4 space-y-4">
          {/* Tracks */}
          {(activeTab === 'all' || activeTab === 'tracks') && results.tracks.length > 0 && (
            <div>
              {activeTab === 'all' && <h3 className="font-semibold text-lg mb-2">Tracks</h3>}
              <div className="space-y-2">
                {results.tracks.map((track) => (
                  <div
                    key={track.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTrack?.id === track.id
                        ? 'bg-primary/20 border border-primary'
                        : 'bg-base-200 hover:bg-base-300'
                    }`}
                    onClick={() => handleTrackSelect(track)}
                  >
                    {/* Album Art */}
                    {track.image ? (
                      <img
                        src={track.image}
                        alt={track.album || track.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-base-300 flex items-center justify-center">
                        <svg className="w-6 h-6 text-base-content/30" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                      </div>
                    )}

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{track.name}</span>
                        {track.explicit && (
                          <span className="badge badge-xs">E</span>
                        )}
                      </div>
                      <div className="text-sm text-base-content/60 truncate">
                        {track.artist} {track.album && `• ${track.album}`}
                      </div>
                    </div>

                    {/* Duration & Source */}
                    <div className="flex items-center gap-2">
                      {track.duration && (
                        <span className="text-sm text-base-content/50">
                          {formatDuration(track.duration)}
                        </span>
                      )}
                      <span className={`w-2 h-2 rounded-full ${getSourceColor(track.source)}`} title={track.source} />
                    </div>

                    {/* Preview Button */}
                    {track.previewUrl && (
                      <button
                        className="btn btn-ghost btn-circle btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(track.previewUrl, '_blank');
                        }}
                        title="Preview"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Artists */}
          {(activeTab === 'all' || activeTab === 'artists') && results.artists.length > 0 && (
            <div>
              {activeTab === 'all' && <h3 className="font-semibold text-lg mb-2">Artists</h3>}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {results.artists.map((artist) => (
                  <div
                    key={artist.id}
                    className="flex flex-col items-center p-4 rounded-lg bg-base-200 hover:bg-base-300 cursor-pointer transition-colors"
                    onClick={() => onSelectArtist?.(artist)}
                  >
                    {artist.image ? (
                      <img
                        src={artist.image}
                        alt={artist.name}
                        className="w-20 h-20 rounded-full object-cover mb-2"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-base-300 flex items-center justify-center mb-2">
                        <svg className="w-10 h-10 text-base-content/30" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                    )}
                    <span className="font-medium text-center truncate w-full">{artist.name}</span>
                    {artist.genres && artist.genres.length > 0 && (
                      <span className="text-xs text-base-content/50 truncate w-full text-center">
                        {artist.genres.slice(0, 2).join(', ')}
                      </span>
                    )}
                    <span className={`mt-1 w-2 h-2 rounded-full ${getSourceColor(artist.source)}`} title={artist.source} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Albums */}
          {(activeTab === 'all' || activeTab === 'albums') && results.albums.length > 0 && (
            <div>
              {activeTab === 'all' && <h3 className="font-semibold text-lg mb-2">Albums</h3>}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {results.albums.map((album) => (
                  <div
                    key={album.id}
                    className="flex flex-col p-3 rounded-lg bg-base-200 hover:bg-base-300 cursor-pointer transition-colors"
                    onClick={() => onSelectAlbum?.(album)}
                  >
                    {album.image ? (
                      <img
                        src={album.image}
                        alt={album.name}
                        className="w-full aspect-square rounded object-cover mb-2"
                      />
                    ) : (
                      <div className="w-full aspect-square rounded bg-base-300 flex items-center justify-center mb-2">
                        <svg className="w-12 h-12 text-base-content/30" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
                        </svg>
                      </div>
                    )}
                    <span className="font-medium truncate">{album.name}</span>
                    <span className="text-sm text-base-content/60 truncate">{album.artist}</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-base-content/50">
                        {album.releaseDate?.substring(0, 4)} {album.type && `• ${album.type}`}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${getSourceColor(album.source)}`} title={album.source} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {results.tracks.length === 0 && results.artists.length === 0 && results.albums.length === 0 && (
            <div className="text-center py-8 text-base-content/50">
              No results found for &quot;{query}&quot;
            </div>
          )}
        </div>
      )}

      {/* Selected Track Details & Import */}
      {selectedTrack && showImportButton && (
        <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 p-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            {/* Track Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {selectedTrack.image && (
                <img
                  src={selectedTrack.image}
                  alt={selectedTrack.name}
                  className="w-14 h-14 rounded"
                />
              )}
              <div className="min-w-0">
                <div className="font-medium truncate">{selectedTrack.name}</div>
                <div className="text-sm text-base-content/60 truncate">{selectedTrack.artist}</div>
              </div>
            </div>

            {/* Streaming Links */}
            {trackDetails?.streamingLinks && (
              <div className="flex gap-2">
                {trackDetails.streamingLinks.spotify && (
                  <a
                    href={trackDetails.streamingLinks.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-circle btn-sm btn-ghost"
                    title="Open in Spotify"
                  >
                    <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  </a>
                )}
                {trackDetails.streamingLinks.deezer && (
                  <a
                    href={trackDetails.streamingLinks.deezer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-circle btn-sm btn-ghost"
                    title="Open in Deezer"
                  >
                    <svg className="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38H6.27zm12.54 0v3.027H24V8.38h-5.19zM6.27 12.566v3.027h5.189v-3.027H6.27zm6.27 0v3.027h5.19v-3.027h-5.19zm6.27 0v3.027H24v-3.027h-5.19zM0 16.752v3.027h5.19v-3.027H0zm6.27 0v3.027h5.189v-3.027H6.27zm6.27 0v3.027h5.19v-3.027h-5.19zm6.27 0v3.027H24v-3.027h-5.19z"/>
                    </svg>
                  </a>
                )}
              </div>
            )}

            {/* Lyrics Info */}
            {loadingDetails ? (
              <span className="loading loading-spinner loading-sm" />
            ) : trackDetails?.lyrics ? (
              <a
                href={trackDetails.lyrics.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline"
              >
                View Lyrics
              </a>
            ) : null}

            {/* Import Button */}
            <button
              className="btn btn-primary"
              onClick={handleImport}
            >
              Import Song
            </button>

            {/* Close Button */}
            <button
              className="btn btn-ghost btn-circle btn-sm"
              onClick={() => {
                setSelectedTrack(null);
                setTrackDetails(null);
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
