'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Band = {
  _id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

interface ImportedTrack {
  title: string;
  artist: string;
  album?: string;
  image?: string;
  duration?: number;
  url: string;
  service: string;
  serviceDisplayName: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

type Step = 'url' | 'preview';

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  soundcloud: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M7 17.939h-1v-8.068c.308-.231.639-.429 1-.566v8.634zm3 0h1v-9.224c-.229.265-.443.548-.621.857l-.379-.184v8.551zm-2 0h1v-8.848c-.508-.079-.623-.05-1-.01v8.858zm-4 0h1v-7.02c-.312.458-.555.971-.692 1.535l-.308-.182v5.667zm-3-5.25c-.606.547-1 1.354-1 2.268 0 .914.394 1.721 1 2.268v-4.536zm18.879-.671c-.204-2.837-2.404-5.079-5.117-5.079-1.022 0-1.964.328-2.762.877v10.123h9.089c1.607 0 2.911-1.393 2.911-3.106 0-2.043-2.061-3.15-4.121-2.815z"/>
    </svg>
  ),
  spotify: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  ),
  deezer: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38h-5.19zm12.54 0v3.027H24V8.38h-5.19zM6.27 12.592v3.027h5.189v-3.027h-5.19zm6.27 0v3.027h5.19v-3.027h-5.19zm6.27 0v3.027H24v-3.027h-5.19zM0 16.81v3.029h5.19v-3.03H0zm6.27 0v3.029h5.189v-3.03h-5.19zm6.27 0v3.029h5.19v-3.03h-5.19zm6.27 0v3.029H24v-3.03h-5.19z"/>
    </svg>
  ),
  youtube: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  apple: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.401-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712H5.78V8.063h3.63L12 11.59l2.588-3.526h3.626v1.99h-2.88l-2.166 2.94-.004.003h.003c1.47 2.01 2.943 4.023 4.422 6.04l.114-.002h2.88v2.055H15.43l-3.43-4.67-3.432 4.67H5.78v-2.055h3.152l3.31-4.508-2.588-3.48H5.78v-1.99h5.192z"/>
    </svg>
  ),
};

const SERVICE_COLORS: Record<string, string> = {
  soundcloud: 'bg-orange-500',
  spotify: 'bg-green-500',
  deezer: 'bg-amber-500',
  youtube: 'bg-red-500',
  apple: 'bg-rose-500',
};

export default function SongImportModal({ isOpen, onClose, onImportSuccess }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('url');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [track, setTrack] = useState<ImportedTrack | null>(null);
  const [bands, setBands] = useState<Band[]>([]);
  const [selectedBand, setSelectedBand] = useState<string>('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadBands();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen]);

  const loadBands = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch('/api/bands');
      if (response.ok) {
        const userBands = await response.json();
        setBands(userBands);
      }
    } catch (error) {
      console.error('Error loading bands:', error);
    }
  };

  const handleFetchTrack = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/import/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to fetch track information');
        return;
      }

      setTrack(result.track);
      setStep('preview');
    } catch (err) {
      console.error('Error fetching track:', err);
      setError('Failed to fetch track information');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!user?.id || !selectedBand || !track) {
      setError('Please select a band before importing');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const band = bands.find(b => b._id === selectedBand);
      if (!band) {
        setError('Selected band not found');
        return;
      }

      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: track.title,
          artist: track.artist || band.name,
          album: track.album || null,
          band_id: selectedBand,
          soundcloud_url: track.url,
          completed: false,
        }),
      });

      if (!response.ok) {
        setError('Failed to import track');
        return;
      }

      onImportSuccess?.();
      handleReset();
      onClose();
    } catch (err) {
      console.error('Error importing track:', err);
      setError('Failed to import track');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep('url');
    setUrl('');
    setError(null);
    setTrack(null);
    setSelectedBand('');
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-base-100 border border-base-300 rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-base-300">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-base-content">Import Song</h2>
            <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {step === 'url' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-base-content mb-2">Paste Song URL</h3>
                <p className="text-sm text-base-content/60 mb-4">
                  Paste a link to a song from any of these services:
                </p>

                {/* Supported services */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 text-orange-500 rounded-full text-sm">
                    {SERVICE_ICONS.soundcloud}
                    <span>SoundCloud</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-full text-sm">
                    {SERVICE_ICONS.spotify}
                    <span>Spotify</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded-full text-sm">
                    {SERVICE_ICONS.deezer}
                    <span>Deezer</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-full text-sm">
                    {SERVICE_ICONS.youtube}
                    <span>YouTube</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={url}
                    onChange={e => {
                      setUrl(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleFetchTrack()}
                    placeholder="https://..."
                    className="w-full px-4 py-3 border border-base-300 rounded-lg focus:outline-none focus:border-purple-500 bg-base-100"
                    disabled={loading}
                  />

                  {error && (
                    <div className="text-sm text-error">{error}</div>
                  )}

                  <button
                    onClick={handleFetchTrack}
                    disabled={loading || !url.trim()}
                    className="btn btn-primary w-full"
                  >
                    {loading ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Fetching...
                      </>
                    ) : (
                      'Fetch Song Info'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && track && (
            <div className="space-y-6">
              {/* Track Preview */}
              <div className="border border-base-300 rounded-lg p-4">
                <div className="flex gap-4">
                  {track.image ? (
                    <img
                      src={track.image}
                      alt={track.title}
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-base-200 flex items-center justify-center flex-shrink-0">
                      <svg className="w-8 h-8 text-base-content/30" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-base-content truncate">{track.title}</h4>
                    <p className="text-sm text-base-content/60 truncate">{track.artist}</p>
                    {track.album && (
                      <p className="text-sm text-base-content/40 truncate">{track.album}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs text-white ${SERVICE_COLORS[track.service] || 'bg-gray-500'}`}>
                        {SERVICE_ICONS[track.service]}
                        <span>{track.serviceDisplayName}</span>
                      </div>
                      {track.duration && (
                        <span className="text-xs text-base-content/40">{formatDuration(track.duration)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Band Selector */}
              <div>
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
                    <option key={band._id} value={band._id}>{band.name}</option>
                  ))}
                </select>
                {bands.length === 0 && (
                  <p className="text-sm text-base-content/60 mt-2">
                    No bands found. Create a band in Settings first.
                  </p>
                )}
              </div>

              {error && (
                <div className="text-sm text-error">{error}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-base-300 flex justify-between">
          {step === 'preview' ? (
            <>
              <button onClick={handleReset} className="btn btn-ghost">
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !selectedBand}
                className="btn btn-primary"
              >
                {importing ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Importing...
                  </>
                ) : (
                  'Import Song'
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
