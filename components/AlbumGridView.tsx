'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type UserAlbum = {
  _id: string;
  name: string;
  cover_art: string | null;
  display_order: number;
  song_count: number;
  user_id: string;
};

type Song = {
  _id: string;
  title: string;
  artist: string;
  album: string | null;
  folder: string | null;
  tags: string[];
  soundcloud_url: string | null;
  instrumental_url: string | null;
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

interface Props {
  onSelectAlbum?: (album: UserAlbum) => void;
  onSelectSong?: (song: Song, lyrics: LyricLine[]) => void;
  onBackToList?: () => void;
}

export default function AlbumGridView({ onSelectAlbum, onSelectSong, onBackToList }: Props) {
  const [albums, setAlbums] = useState<UserAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<UserAlbum | null>(null);
  const [albumSongs, setAlbumSongs] = useState<Song[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [uploadingArt, setUploadingArt] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingAlbumArt, setEditingAlbumArt] = useState<string | null>(null);

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    loadAlbums();
  }, []);

  const loadAlbums = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user-albums');
      if (response.ok) {
        const data = await response.json();
        setAlbums(data || []);
      }
    } catch (error) {
      console.error('Error loading albums:', error);
    }
    setLoading(false);
  };

  const loadAlbumSongs = async (albumName: string) => {
    setLoadingSongs(true);
    try {
      const response = await fetch(`/api/user-albums?albumName=${encodeURIComponent(albumName)}`);
      if (response.ok) {
        const data = await response.json();
        setAlbumSongs(data.songs || []);
      }
    } catch (error) {
      console.error('Error loading album songs:', error);
    }
    setLoadingSongs(false);
  };

  const handleAlbumClick = async (album: UserAlbum) => {
    if (reorderMode) return;
    setSelectedAlbum(album);
    await loadAlbumSongs(album.name);
    onSelectAlbum?.(album);
  };

  const handleSongClick = async (song: Song) => {
    try {
      const response = await fetch(`/api/lyrics?songId=${song._id}`);
      if (response.ok) {
        const lyrics = await response.json();
        onSelectSong?.(song, lyrics || []);
      }
    } catch (error) {
      console.error('Error loading lyrics:', error);
    }
  };

  const handleBackToAlbums = () => {
    setSelectedAlbum(null);
    setAlbumSongs([]);
  };

  const handleUploadArt = async (albumName: string, file: File) => {
    setUploadingArt(albumName);
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

      // Update the album with the new cover art
      const updateResponse = await fetch('/api/user-albums', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumName,
          cover_art: uploadData.url,
        }),
      });

      if (updateResponse.ok) {
        // Refresh albums
        await loadAlbums();
      }
    } catch (error) {
      console.error('Error uploading album art:', error);
      alert('Failed to upload album art');
    } finally {
      setUploadingArt(null);
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
    setShowExportMenu(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!reorderMode) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
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

    // Reorder locally first
    const newAlbums = [...albums];
    const [removed] = newAlbums.splice(draggedIndex, 1);
    newAlbums.splice(dropIndex, 0, removed);
    setAlbums(newAlbums);

    // Save to server
    try {
      await fetch('/api/user-albums', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumNames: newAlbums.map(a => a.name),
        }),
      });
    } catch (error) {
      console.error('Error saving album order:', error);
      // Reload on error to restore original order
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
        <p className="text-base-content/60 text-sm md:text-base animate-pulse mt-2">Loading albums...</p>
      </div>
    );
  }

  // Album detail view
  if (selectedAlbum) {
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
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleBackToAlbums}
            className="btn btn-ghost btn-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {/* Album cover and info */}
          <div className="flex items-center gap-4 flex-1">
            <div
              className="w-20 h-20 rounded-lg bg-base-200 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity relative group"
              onClick={() => {
                setEditingAlbumArt(selectedAlbum.name);
                fileInputRef.current?.click();
              }}
            >
              {selectedAlbum.cover_art ? (
                <img
                  src={selectedAlbum.cover_art}
                  alt={selectedAlbum.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-10 h-10 text-base-content/30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-base-content">{selectedAlbum.name}</h2>
              <p className="text-base-content/60">{albumSongs.length} songs</p>
            </div>
          </div>

          {/* Export button */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(showExportMenu === selectedAlbum.name ? null : selectedAlbum.name)}
              className="btn btn-ghost btn-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Export Album
            </button>
            {showExportMenu === selectedAlbum.name && (
              <div className="absolute right-0 mt-2 w-48 bg-base-100 rounded-lg shadow-xl border border-base-300 z-50">
                <button
                  onClick={() => handleExport(selectedAlbum.name, 'txt')}
                  className="w-full px-4 py-2 text-left hover:bg-base-200 rounded-t-lg"
                >
                  Export as .txt
                </button>
                <button
                  onClick={() => handleExport(selectedAlbum.name, 'lrc')}
                  className="w-full px-4 py-2 text-left hover:bg-base-200"
                >
                  Export as .lrc (with timestamps)
                </button>
                <button
                  onClick={() => handleExport(selectedAlbum.name, 'json')}
                  className="w-full px-4 py-2 text-left hover:bg-base-200 rounded-b-lg"
                >
                  Export as .json
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Songs list */}
        {loadingSongs ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : albumSongs.length === 0 ? (
          <div className="text-center py-8 text-base-content/60">
            No songs in this album
          </div>
        ) : (
          <div className="space-y-2">
            {albumSongs.map((song, index) => (
              <div
                key={song._id}
                onClick={() => handleSongClick(song)}
                className="p-4 bg-base-100 rounded-lg border border-base-300 hover:border-primary cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-base-content/40 w-6 text-center">{index + 1}</span>
                  <div className="flex-1">
                    <h3 className="font-medium text-base-content">{song.title}</h3>
                    <p className="text-sm text-base-content/60">{song.artist}</p>
                  </div>
                  {song.completed && (
                    <span className="badge badge-success badge-sm">Complete</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Album grid view
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {onBackToList && (
            <button
              onClick={onBackToList}
              className="btn btn-ghost btn-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Songs
            </button>
          )}
          <h2 className="text-xl md:text-2xl font-bold text-base-content">Albums</h2>
        </div>
        <button
          onClick={() => setReorderMode(!reorderMode)}
          className={`btn btn-ghost btn-sm ${reorderMode ? 'text-primary' : ''}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
          </svg>
          {reorderMode ? 'Done' : 'Reorder'}
        </button>
      </div>

      {albums.length === 0 ? (
        <div className="text-center py-12 text-base-content/60">
          <svg className="w-16 h-16 mx-auto mb-4 text-base-content/30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <p>No albums yet. Add songs to albums to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {albums.map((album, index) => (
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
                dragOverIndex === index ? 'scale-105 ring-2 ring-primary' : ''
              }`}
            >
              <div className="aspect-square rounded-lg bg-base-200 overflow-hidden relative mb-2 shadow-md group-hover:shadow-lg transition-shadow">
                {album.cover_art ? (
                  <img
                    src={album.cover_art}
                    alt={album.name}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-base-200 to-base-300">
                    <svg className="w-1/3 h-1/3 text-base-content/30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                    </svg>
                  </div>
                )}

                {/* Reorder handle */}
                {reorderMode && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                    </svg>
                  </div>
                )}
              </div>

              <h3 className="font-medium text-base-content text-sm md:text-base truncate">{album.name}</h3>
              <p className="text-xs text-base-content/60">{album.song_count} songs</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
