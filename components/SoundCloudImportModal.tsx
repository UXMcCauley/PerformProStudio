'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserBands, supabase, Band } from '@/lib/supabase';
import { SoundCloudTrackInfo, SoundCloudPlaylistInfo } from '@/lib/soundcloud';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'search' | 'preview' | 'import';

export default function SoundCloudImportModal({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [playlists, setPlaylists] = useState<SoundCloudPlaylistInfo[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SoundCloudPlaylistInfo | null>(null);
  const [tracks, setTracks] = useState<SoundCloudTrackInfo[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [bands, setBands] = useState<Band[]>([]);
  const [selectedBand, setSelectedBand] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (isOpen && user?.id) {
      loadBands();
    }
  }, [isOpen, user]);

  const loadBands = async () => {
    if (!user?.id) return;
    const userBands = await getUserBands(user.id);
    setBands(userBands);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter a search term');
      return;
    }

    setSearching(true);
    try {
      const response = await fetch('/api/soundcloud/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 20 }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Failed to search');
        return;
      }

      setPlaylists(result.playlists || []);
    } catch (error) {
      console.error('Error searching:', error);
      alert('Failed to search playlists');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPlaylist = async (playlist: SoundCloudPlaylistInfo) => {
    setSelectedPlaylist(playlist);
    setLoadingTracks(true);
    setStep('preview');

    try {
      const response = await fetch('/api/soundcloud/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId: playlist.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Failed to fetch tracks');
        setStep('search');
        return;
      }

      setTracks(result.tracks || []);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      alert('Failed to fetch tracks');
      setStep('search');
    } finally {
      setLoadingTracks(false);
    }
  };

  const handleUrlImport = async () => {
    if (!url.trim()) {
      alert('Please enter a SoundCloud URL');
      return;
    }

    setLoadingTracks(true);
    try {
      const response = await fetch('/api/soundcloud/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Failed to fetch track information');
        return;
      }

      if (result.type === 'track') {
        setTracks([result.data]);
        setSelectedPlaylist({
          title: result.data.title,
          url: result.data.url,
          track_count: 1,
        });
      } else if (result.type === 'playlist') {
        setTracks(result.data.tracks || []);
        setSelectedPlaylist({
          title: 'Imported Playlist',
          url: url,
          track_count: result.data.tracks?.length || 0,
        });
      }

      setStep('preview');
    } catch (error) {
      console.error('Error fetching track info:', error);
      alert('Failed to fetch track information');
    } finally {
      setLoadingTracks(false);
    }
  };

  const handleImport = async () => {
    if (!user?.id || !selectedBand) {
      alert('Please select a band before importing');
      return;
    }

    if (tracks.length === 0) {
      alert('No tracks to import');
      return;
    }

    setImporting(true);
    try {
      const band = bands.find(b => b.id === selectedBand);
      if (!band) {
        alert('Selected band not found');
        return;
      }

      for (const track of tracks) {
        await supabase.from('songs').insert({
          title: track.title,
          artist: track.artist || band.name,
          band_id: selectedBand,
          user_id: user.id,
          soundcloud_url: track.url || track.permalink_url,
          completed: false,
        });
      }

      alert(`Successfully imported ${tracks.length} track${tracks.length !== 1 ? 's' : ''}!`);
      handleReset();
      onClose();
    } catch (error) {
      console.error('Error importing tracks:', error);
      alert('Failed to import tracks');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep('search');
    setSearchQuery('');
    setPlaylists([]);
    setSelectedPlaylist(null);
    setTracks([]);
    setSelectedBand('');
    setUrl('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-base-100 border border-base-300 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-base-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-base-content">Import from SoundCloud</h2>
            <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-4">
            <div className={`badge ${step === 'search' ? 'badge-primary' : 'badge-ghost'}`}>1. Search</div>
            <div className="flex-1 border-t border-base-300"></div>
            <div className={`badge ${step === 'preview' ? 'badge-primary' : 'badge-ghost'}`}>2. Preview</div>
            <div className="flex-1 border-t border-base-300"></div>
            <div className={`badge ${step === 'import' ? 'badge-primary' : 'badge-ghost'}`}>3. Import</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {step === 'search' && (
            <div className="space-y-6">
              {/* Search Playlists */}
              <div>
                <h3 className="text-lg font-semibold text-base-content mb-2">Search Playlists</h3>
                <p className="text-sm text-base-content/60 mb-4">
                  Search for playlists by name or artist
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Search playlists..."
                    className="flex-1 px-4 py-2 border border-base-300 rounded-lg focus:outline-hidden focus:border-purple-500"
                    disabled={searching}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="btn btn-primary"
                  >
                    {searching ? <span className="loading loading-spinner loading-sm"></span> : 'Search'}
                  </button>
                </div>
              </div>

              {/* Select Playlist */}
              {playlists.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-base-content mb-2">Select Playlist</h3>
                  <p className="text-sm text-base-content/60 mb-4">
                    Choose a playlist to import
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {playlists.map((playlist) => (
                      <div
                        key={playlist.id}
                        onClick={() => handleSelectPlaylist(playlist)}
                        className="p-4 border border-base-300 rounded-lg cursor-pointer hover:bg-base-200 transition-colors"
                      >
                        <div className="flex gap-4">
                          {playlist.artwork_url && (
                            <img
                              src={playlist.artwork_url}
                              alt={playlist.title}
                              className="w-16 h-16 rounded object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-base-content">{playlist.title}</h4>
                            <p className="text-sm text-base-content/60">
                              by {playlist.user?.username || 'Unknown'} • {playlist.track_count} tracks
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="divider">OR</div>

              {/* Import by URL */}
              <div>
                <h3 className="text-lg font-semibold text-base-content mb-2">Import by URL</h3>
                <p className="text-sm text-base-content/60 mb-4">
                  Paste a direct SoundCloud track or playlist URL
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUrlImport()}
                    placeholder="https://soundcloud.com/..."
                    className="flex-1 px-4 py-2 border border-base-300 rounded-lg focus:outline-hidden focus:border-purple-500"
                    disabled={loadingTracks}
                  />
                  <button
                    onClick={handleUrlImport}
                    disabled={loadingTracks || !url.trim()}
                    className="btn btn-primary"
                  >
                    {loadingTracks ? <span className="loading loading-spinner loading-sm"></span> : 'Fetch'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div>
              {loadingTracks ? (
                <div className="text-center py-12">
                  <div className="loading loading-spinner loading-lg"></div>
                  <p className="mt-4 text-base-content/60">Loading tracks...</p>
                </div>
              ) : (
                <>
                  {selectedPlaylist && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-base-content mb-2">
                        {selectedPlaylist.title}
                      </h3>
                      <p className="text-sm text-base-content/60">
                        {tracks.length} track{tracks.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}

                  {/* Band Selector */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-base-content mb-2">
                      Import to Band:
                    </label>
                    <select
                      value={selectedBand}
                      onChange={e => setSelectedBand(e.target.value)}
                      className="select select-bordered w-full"
                    >
                      <option value="">Select a band</option>
                      {bands.map(band => (
                        <option key={band.id} value={band.id}>{band.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Track List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {tracks.map((track, index) => (
                      <div key={index} className="border border-base-300 rounded-lg p-3">
                        <div className="flex gap-3">
                          <span className="text-base-content/60 font-mono text-sm">{index + 1}</span>
                          <div className="flex-1">
                            <h4 className="font-semibold text-base-content text-sm">{track.title}</h4>
                            <p className="text-xs text-base-content/60">{track.artist}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-base-300 flex justify-between">
          {step === 'preview' ? (
            <>
              <button onClick={() => handleReset()} className="btn btn-ghost">
                Back to Search
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !selectedBand || tracks.length === 0}
                className="btn btn-primary"
              >
                {importing ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Importing...
                  </>
                ) : (
                  `Import ${tracks.length} Track${tracks.length !== 1 ? 's' : ''}`
                )}
              </button>
            </>
          ) : (
            <div className="flex-1 flex justify-end">
              <button onClick={onClose} className="btn btn-ghost">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}