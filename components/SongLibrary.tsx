'use client';

import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    SC: any;
  }
}

type Song = {
  _id: string;
  title: string;
  artist: string;
  album: string | null;
  folder: string | null;
  tags: string[];
  soundcloud_url: string | null;
  instrumental_url: string | null;
  artwork_url: string | null;
  completed: boolean;
  band_id: string | null;
  album_id: string | null;
  folder_id: string | null;
  user_id: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

type LyricLine = {
  _id: string;
  song_id: string;
  line_number: number;
  text: string;
  timestamp_ms: number | null;
  created_at: string;
  updated_at: string;
};

type UserAlbum = {
  _id: string;
  name: string;
  cover_art: string | null;
  display_order: number;
  song_count: number;
  user_id: string;
};

interface Props {
  onSelectSong: (song: Song, lyrics: LyricLine[]) => void;
  onNewSong: () => void;
  onViewMetrics?: (song: Song) => void;
  onLyricSync?: (song: Song, lyrics: LyricLine[]) => void;
}

type ViewMode = 'all' | 'albums' | 'album-detail';

export default function SongLibrary({ onSelectSong, onNewSong, onViewMetrics, onLyricSync }: Props) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<UserAlbum[]>([]);
  const [albumArtMap, setAlbumArtMap] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedAlbum, setSelectedAlbum] = useState<UserAlbum | null>(null);
  const [albumSongs, setAlbumSongs] = useState<Song[]>([]);
  const [reorderMode, setReorderMode] = useState(false);

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Album art upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingAlbumArt, setEditingAlbumArt] = useState<string | null>(null);
  const [uploadingArt, setUploadingArt] = useState(false);

  // Export menu
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadSongs(), loadAlbums()]);
    setLoading(false);
  };

  const loadSongs = async () => {
    try {
      const response = await fetch('/api/songs');
      if (response.ok) {
        const data = await response.json();
        setSongs(data || []);
      }
    } catch (error) {
      console.error('Error loading songs:', error);
    }
  };

  const loadAlbums = async () => {
    try {
      const response = await fetch('/api/user-albums');
      if (response.ok) {
        const data = await response.json();
        setAlbums(data || []);
        const artMap = new Map<string, string | null>();
        for (const album of data || []) {
          if (album.name) {
            artMap.set(album.name, album.cover_art);
          }
        }
        setAlbumArtMap(artMap);
      }
    } catch (error) {
      console.error('Error loading albums:', error);
    }
  };

  const loadAlbumSongs = async (albumName: string) => {
    try {
      const response = await fetch(`/api/user-albums?albumName=${encodeURIComponent(albumName)}`);
      if (response.ok) {
        const data = await response.json();
        setAlbumSongs(data.songs || []);
      }
    } catch (error) {
      console.error('Error loading album songs:', error);
    }
  };

  const handleSelectSong = async (song: Song) => {
    try {
      const response = await fetch(`/api/lyrics?songId=${song._id}`);
      if (response.ok) {
        const data = await response.json();
        onSelectSong(song, data || []);
      }
    } catch (error) {
      console.error('Error loading lyrics:', error);
    }
  };

  const handleAlbumClick = async (album: UserAlbum) => {
    if (reorderMode) return;
    setSelectedAlbum(album);
    setViewMode('album-detail');
    await loadAlbumSongs(album.name);
  };

  const handleBackToAlbums = () => {
    setSelectedAlbum(null);
    setAlbumSongs([]);
    setViewMode('albums');
  };

  const handleDeleteSong = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation(); // Prevent song selection

    if (!confirm(`Delete "${song.title}"? This will also delete all associated lyrics and cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/songs?id=${song._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setSongs(prev => prev.filter(s => s._id !== song._id));
        setAlbumSongs(prev => prev.filter(s => s._id !== song._id));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete song');
      }
    } catch (error) {
      console.error('Error deleting song:', error);
      alert('Failed to delete song');
    }
  };

  const handleUploadArt = async (albumName: string, file: File) => {
    setUploadingArt(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('albumName', albumName);

      const uploadResponse = await fetch('/api/upload/album-art', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        alert(error.error || 'Failed to upload album art');
        return;
      }

      const uploadData = await uploadResponse.json();

      await fetch('/api/user-albums', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumName, cover_art: uploadData.url }),
      });

      await loadAlbums();
      if (selectedAlbum) {
        setSelectedAlbum({ ...selectedAlbum, cover_art: uploadData.url });
      }
    } catch (error) {
      console.error('Error uploading album art:', error);
      alert('Failed to upload album art');
    } finally {
      setUploadingArt(false);
      setEditingAlbumArt(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingAlbumArt) {
      handleUploadArt(editingAlbumArt, file);
    }
    e.target.value = '';
  };

  const handleExport = async (albumName: string, format: 'txt' | 'lrc' | 'json') => {
    try {
      const response = await fetch(`/api/export/album?albumName=${encodeURIComponent(albumName)}&format=${format}`);
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to export album');
        return;
      }

      if (format === 'json') {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${albumName}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const text = await response.text();
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${albumName}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting album:', error);
      alert('Failed to export album');
    }
    setShowExportMenu(false);
  };

  // Get artwork for a song (song's own artwork, or album artwork, or null)
  const getSongArtwork = (song: Song): string | null => {
    if (song.artwork_url) return song.artwork_url;
    if (song.album) return albumArtMap.get(song.album) || null;
    return null;
  };

  // Filter songs based on search
  const filteredSongs = songs.filter(song => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      song.title.toLowerCase().includes(search) ||
      song.artist.toLowerCase().includes(search) ||
      (song.album && song.album.toLowerCase().includes(search))
    );
  });

  // Filter albums based on search
  const filteredAlbums = albums.filter(album => {
    if (!searchTerm) return true;
    return album.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Drag handlers for albums
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!reorderMode) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!reorderMode || draggedIndex === null) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!reorderMode || draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newAlbums = [...albums];
    const [removed] = newAlbums.splice(draggedIndex, 1);
    newAlbums.splice(dropIndex, 0, removed);
    setAlbums(newAlbums);

    try {
      await fetch('/api/user-albums', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ albumNames: newAlbums.map(a => a.name) }),
      });
    } catch (error) {
      console.error('Error saving album order:', error);
      loadAlbums();
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center p-4">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        <p className="text-base-content/60 text-sm animate-pulse mt-2">Loading library...</p>
      </div>
    );
  }

  // Album detail view
  if (viewMode === 'album-detail' && selectedAlbum) {
    return (
      <div className="p-4 md:p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Header */}
        <div className="flex items-start gap-6 mb-8">
          <button
            onClick={handleBackToAlbums}
            className="btn btn-ghost btn-sm mt-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Album cover - clickable to change art */}
          <div
            className="w-32 h-32 md:w-48 md:h-48 rounded-xl bg-base-200 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative group shadow-xl"
            onClick={() => {
              setEditingAlbumArt(selectedAlbum.name);
              fileInputRef.current?.click();
            }}
          >
            {selectedAlbum.cover_art ? (
              <img src={selectedAlbum.cover_art} alt={selectedAlbum.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                <svg className="w-16 h-16 text-white/50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploadingArt ? (
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="text-center text-white">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm mt-1">Change Cover</span>
                </div>
              )}
            </div>
          </div>

          {/* Album info */}
          <div className="flex-1 pt-2">
            <p className="text-sm text-base-content/60 uppercase tracking-wider mb-1">Album</p>
            <h1 className="text-3xl md:text-4xl font-bold text-base-content mb-2">{selectedAlbum.name}</h1>
            <p className="text-base-content/60">{albumSongs.length} songs</p>

            {/* Action buttons */}
            <div className="flex gap-2 mt-4">
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="btn btn-outline btn-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Export
                </button>
                {showExportMenu && (
                  <div className="absolute left-0 mt-2 w-48 bg-base-100 rounded-lg shadow-xl border border-base-300 z-50">
                    <button onClick={() => handleExport(selectedAlbum.name, 'txt')} className="w-full px-4 py-2 text-left hover:bg-base-200 rounded-t-lg text-sm">
                      Export as .txt
                    </button>
                    <button onClick={() => handleExport(selectedAlbum.name, 'lrc')} className="w-full px-4 py-2 text-left hover:bg-base-200 text-sm">
                      Export as .lrc (timestamps)
                    </button>
                    <button onClick={() => handleExport(selectedAlbum.name, 'json')} className="w-full px-4 py-2 text-left hover:bg-base-200 rounded-b-lg text-sm">
                      Export as .json
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Songs grid */}
        {albumSongs.length === 0 ? (
          <div className="text-center py-12 text-base-content/60">No songs in this album</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {albumSongs.map((song, index) => (
              <div
                key={song._id}
                onClick={() => handleSelectSong(song)}
                className="group cursor-pointer"
              >
                <div className="aspect-square rounded-lg bg-base-200 overflow-hidden relative mb-2 shadow-md group-hover:shadow-xl transition-all group-hover:scale-[1.02]">
                  {getSongArtwork(song) ? (
                    <img src={getSongArtwork(song)!} alt={song.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-base-200 to-base-300">
                      <span className="text-4xl font-bold text-base-content/20">{index + 1}</span>
                    </div>
                  )}
                  {song.completed && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-success rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-success-content" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {/* Delete button - shows on hover */}
                  <button
                    onClick={(e) => handleDeleteSong(e, song)}
                    className="absolute top-2 left-2 w-7 h-7 bg-red-500/90 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    title="Delete song"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <h3 className="font-medium text-base-content text-sm truncate">{song.title}</h3>
                <p className="text-xs text-base-content/60 truncate">{song.artist}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Main library view
  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Title and controls */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-base-content">Library</h1>
          <div className="flex items-center gap-2">
            {viewMode === 'albums' && (
              <button
                onClick={() => setReorderMode(!reorderMode)}
                className={`btn btn-ghost btn-sm ${reorderMode ? 'text-primary' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                </svg>
                {reorderMode ? 'Done' : 'Reorder'}
              </button>
            )}
            <button onClick={onNewSong} className="btn btn-primary btn-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Song
            </button>
          </div>
        </div>

        {/* Search and view toggle */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search songs, artists, albums..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input input-bordered w-full pl-10"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
            </svg>
          </div>

          <div className="tabs tabs-boxed">
            <button
              onClick={() => { setViewMode('all'); setReorderMode(false); }}
              className={`tab ${viewMode === 'all' ? 'tab-active' : ''}`}
            >
              All Songs
            </button>
            <button
              onClick={() => { setViewMode('albums'); setReorderMode(false); }}
              className={`tab ${viewMode === 'albums' ? 'tab-active' : ''}`}
            >
              Albums
            </button>
          </div>
        </div>
      </div>

      {/* All Songs Grid */}
      {viewMode === 'all' && (
        <>
          {filteredSongs.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-20 h-20 mx-auto mb-4 text-base-content/20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
              <p className="text-base-content/60 text-lg">{searchTerm ? 'No songs found' : 'No songs yet'}</p>
              {!searchTerm && (
                <button onClick={onNewSong} className="btn btn-primary mt-4">
                  Create your first song
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredSongs.map(song => (
                <div
                  key={song._id}
                  onClick={() => handleSelectSong(song)}
                  className="group cursor-pointer"
                >
                  <div className="aspect-square rounded-lg bg-base-200 overflow-hidden relative mb-2 shadow-md group-hover:shadow-xl transition-all group-hover:scale-[1.02]">
                    {getSongArtwork(song) ? (
                      <img src={getSongArtwork(song)!} alt={song.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                        <svg className="w-1/3 h-1/3 text-base-content/30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                        </svg>
                      </div>
                    )}
                    {song.completed && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-success rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-success-content" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {/* Delete button - shows on hover */}
                    <button
                      onClick={(e) => handleDeleteSong(e, song)}
                      className="absolute top-2 left-2 w-7 h-7 bg-red-500/90 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      title="Delete song"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <h3 className="font-medium text-base-content text-sm truncate">{song.title}</h3>
                  <p className="text-xs text-base-content/60 truncate">{song.artist}</p>
                  {song.album && (
                    <p className="text-xs text-base-content/40 truncate">{song.album}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Albums Grid */}
      {viewMode === 'albums' && (
        <>
          {filteredAlbums.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-20 h-20 mx-auto mb-4 text-base-content/20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <p className="text-base-content/60 text-lg">{searchTerm ? 'No albums found' : 'No albums yet'}</p>
              <p className="text-base-content/40 text-sm mt-2">Add songs to albums to see them here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredAlbums.map((album, index) => (
                <div
                  key={album._id}
                  draggable={reorderMode}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleAlbumClick(album)}
                  className={`group cursor-pointer transition-all ${
                    reorderMode ? 'cursor-grab active:cursor-grabbing' : ''
                  } ${draggedIndex === index ? 'opacity-50' : ''} ${
                    dragOverIndex === index ? 'scale-105 ring-2 ring-primary rounded-lg' : ''
                  }`}
                >
                  <div className="aspect-square rounded-lg bg-base-200 overflow-hidden relative mb-2 shadow-md group-hover:shadow-xl transition-all group-hover:scale-[1.02]">
                    {album.cover_art ? (
                      <img src={album.cover_art} alt={album.name} className="w-full h-full object-cover" draggable={false} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                        <svg className="w-1/3 h-1/3 text-white/50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                        </svg>
                      </div>
                    )}
                    {reorderMode && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium text-base-content text-sm truncate">{album.name}</h3>
                  <p className="text-xs text-base-content/60">{album.song_count} songs</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
