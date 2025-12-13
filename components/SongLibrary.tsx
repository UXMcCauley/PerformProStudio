'use client';

import { useState, useEffect, useRef } from 'react';

type ContentType = 'lyrics' | 'script' | 'podcast' | 'speech';
type LineType = 'lyric' | 'dialogue' | 'stage_direction' | 'talking_point' | 'question' | 'segment_header' | 'cue' | 'emphasis' | 'pause';

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
  content_type: ContentType;
  my_character_id: string | null;
  episode_number: number | null;
  duration_target_minutes: number | null;
  created_at: string;
  updated_at: string;
};

type LyricLine = {
  _id: string;
  song_id: string;
  line_number: number;
  text: string;
  timestamp_ms: number | null;
  character_id: string | null;
  line_type: LineType;
  notes: string | null;
  duration_seconds: number | null;
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
  archived_at?: string | null;
};

type Show = {
  _id: string;
  band_id: string;
  band_name?: string;
  name: string;
  date: string;
  time: string | null;
  venue: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type Band = {
  _id: string;
  name: string;
};

interface Props {
  onSelectSong: (song: Song, lyrics: LyricLine[]) => void;
  onNewSong: () => void;
  onViewMetrics?: (song: Song) => void;
  onLyricSync?: (song: Song, lyrics: LyricLine[]) => void;
  onViewShows?: () => void;
}

export default function SongLibrary({ onSelectSong, onNewSong, onViewShows }: Props) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<UserAlbum[]>([]);
  const [upcomingShows, setUpcomingShows] = useState<Show[]>([]);
  const [albumArtMap, setAlbumArtMap] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Album filter - null means show all songs
  const [selectedAlbumName, setSelectedAlbumName] = useState<string | null>(null);

  // Drag state for songs -> albums
  const [draggingSongId, setDraggingSongId] = useState<string | null>(null);
  const [draggingAlbumName, setDraggingAlbumName] = useState<string | null>(null);
  const [dragOverAlbum, setDragOverAlbum] = useState<string | null>(null);
  const [dragOverTrash, setDragOverTrash] = useState(false);

  // Album art upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingAlbumArt, setEditingAlbumArt] = useState<string | null>(null);
  const [uploadingArt, setUploadingArt] = useState(false);

  // Album menu and modals
  const [showAlbumMenu, setShowAlbumMenu] = useState<string | null>(null);
  const [deleteModalAlbum, setDeleteModalAlbum] = useState<UserAlbum | null>(null);
  const [editDetailsAlbum, setEditDetailsAlbum] = useState<UserAlbum | null>(null);
  const [editAlbumName, setEditAlbumName] = useState('');
  const [archivedAlbums, setArchivedAlbums] = useState<UserAlbum[]>([]);
  const [showArchives, setShowArchives] = useState(false);
  const [permanentDeleteAlbum, setPermanentDeleteAlbum] = useState<UserAlbum | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sharing state
  const [bands, setBands] = useState<Band[]>([]);
  const [shareModalSong, setShareModalSong] = useState<Song | null>(null);
  const [songSharedBands, setSongSharedBands] = useState<string[]>([]);
  const [sharingLoading, setSharingLoading] = useState(false);

  // Shared songs view state
  type SharedSongItem = {
    _id: string;
    song_id: string;
    band_id: string;
    shared_at: string;
    shared_by: string;
    shared_by_name: string;
    song: {
      _id: string;
      title: string;
      artist: string;
      album: string | null;
      artwork_url: string | null;
      completed: boolean;
      tags: string[];
    } | null;
  };
  const [sharedSongs, setSharedSongs] = useState<SharedSongItem[]>([]);
  const [showSharedSongs, setShowSharedSongs] = useState(false);
  const [selectedSharedBand, setSelectedSharedBand] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAlbumMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadSongs(), loadAlbums(), loadUpcomingShows(), loadBands()]);
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

  const loadUpcomingShows = async () => {
    try {
      const response = await fetch('/api/shows?upcoming=true');
      if (response.ok) {
        const data = await response.json();
        setUpcomingShows(data || []);
      }
    } catch (error) {
      console.error('Error loading upcoming shows:', error);
    }
  };

  const loadBands = async () => {
    try {
      const response = await fetch('/api/bands');
      if (response.ok) {
        const data = await response.json();
        setBands(data || []);
      }
    } catch (error) {
      console.error('Error loading bands:', error);
    }
  };

  const loadSharedSongs = async (bandId?: string) => {
    if (!bandId && bands.length === 0) return;

    try {
      // If no band specified, load from the first band
      const targetBandId = bandId || bands[0]?._id;
      if (!targetBandId) return;

      const response = await fetch(`/api/shared-songs?bandId=${targetBandId}`);
      if (response.ok) {
        const data = await response.json();
        setSharedSongs(data || []);
        setSelectedSharedBand(targetBandId);
      }
    } catch (error) {
      console.error('Error loading shared songs:', error);
    }
  };

  const openShareModal = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();
    setShareModalSong(song);

    // Load bands this song is currently shared with
    try {
      const response = await fetch(`/api/shared-songs?songId=${song._id}`);
      if (response.ok) {
        const data = await response.json();
        setSongSharedBands(data.bandIds || []);
      }
    } catch (error) {
      console.error('Error loading shared bands:', error);
      setSongSharedBands([]);
    }
  };

  const handleShareToggle = async (bandId: string) => {
    if (!shareModalSong) return;

    setSharingLoading(true);
    const isCurrentlyShared = songSharedBands.includes(bandId);

    try {
      if (isCurrentlyShared) {
        // Unshare
        const response = await fetch(
          `/api/shared-songs?songId=${shareModalSong._id}&bandId=${bandId}`,
          { method: 'DELETE' }
        );
        if (response.ok) {
          setSongSharedBands(prev => prev.filter(id => id !== bandId));
        }
      } else {
        // Share
        const response = await fetch('/api/shared-songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songId: shareModalSong._id, bandId }),
        });
        if (response.ok) {
          setSongSharedBands(prev => [...prev, bandId]);
        }
      }
    } catch (error) {
      console.error('Error toggling share:', error);
    } finally {
      setSharingLoading(false);
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

  const handleDeleteSong = async (e: React.MouseEvent, song: Song) => {
    e.stopPropagation();

    if (!confirm(`Delete "${song.title}"? This will also delete all associated lyrics and cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/songs?id=${song._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSongs(prev => prev.filter(s => s._id !== song._id));
        // Refresh albums to update song counts
        loadAlbums();
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

  const loadArchivedAlbums = async () => {
    try {
      const response = await fetch('/api/user-albums?archived=true');
      if (response.ok) {
        const data = await response.json();
        setArchivedAlbums(data || []);
      }
    } catch (error) {
      console.error('Error loading archived albums:', error);
    }
  };

  const handleArchiveAlbum = async (album: UserAlbum) => {
    try {
      const response = await fetch(`/api/user-albums?albumName=${encodeURIComponent(album.name)}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setAlbums(prev => prev.filter(a => a._id !== album._id));
        setDeleteModalAlbum(null);
        if (selectedAlbumName === album.name) {
          setSelectedAlbumName(null);
        }
        if (showArchives) {
          await loadArchivedAlbums();
        }
      }
    } catch (error) {
      console.error('Error archiving album:', error);
    }
  };

  const handleRestoreAlbum = async (album: UserAlbum) => {
    try {
      const response = await fetch(`/api/user-albums?albumName=${encodeURIComponent(album.name)}&action=restore`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setArchivedAlbums(prev => prev.filter(a => a._id !== album._id));
        await loadAlbums();
      }
    } catch (error) {
      console.error('Error restoring album:', error);
    }
  };

  const handlePermanentDeleteAlbum = async (album: UserAlbum) => {
    try {
      const response = await fetch(`/api/user-albums?albumName=${encodeURIComponent(album.name)}&permanent=true`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setArchivedAlbums(prev => prev.filter(a => a._id !== album._id));
        setPermanentDeleteAlbum(null);
      }
    } catch (error) {
      console.error('Error permanently deleting album:', error);
    }
  };

  const handleUpdateAlbumDetails = async () => {
    if (!editDetailsAlbum || !editAlbumName.trim()) return;
    try {
      const response = await fetch('/api/user-albums', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumName: editDetailsAlbum.name,
          name: editAlbumName.trim(),
        }),
      });
      if (response.ok) {
        // Update selected album filter if it was renamed
        if (selectedAlbumName === editDetailsAlbum.name) {
          setSelectedAlbumName(editAlbumName.trim());
        }
        await loadAlbums();
        await loadSongs(); // Reload songs as album names changed
        setEditDetailsAlbum(null);
        setEditAlbumName('');
      }
    } catch (error) {
      console.error('Error updating album details:', error);
    }
  };

  // Drag song onto album
  const handleSongDragStart = (e: React.DragEvent, songId: string) => {
    setDraggingSongId(songId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', songId);
  };

  const handleSongDragEnd = () => {
    setDraggingSongId(null);
    setDragOverAlbum(null);
    setDragOverTrash(false);
  };

  // Drag album handlers
  const handleAlbumDragStart = (e: React.DragEvent, albumName: string) => {
    setDraggingAlbumName(albumName);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('album', albumName);
  };

  const handleAlbumDragEnd = () => {
    setDraggingAlbumName(null);
    setDragOverTrash(false);
  };

  const handleAlbumDragOver = (e: React.DragEvent, albumName: string) => {
    e.preventDefault();
    if (draggingSongId) {
      setDragOverAlbum(albumName);
    }
  };

  const handleAlbumDragLeave = () => {
    setDragOverAlbum(null);
  };

  const handleAlbumDrop = async (e: React.DragEvent, albumName: string) => {
    e.preventDefault();
    const songId = e.dataTransfer.getData('text/plain') || draggingSongId;

    if (!songId) {
      setDragOverAlbum(null);
      return;
    }

    // Update song's album
    try {
      const response = await fetch('/api/songs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: songId, album: albumName }),
      });

      if (response.ok) {
        // Update local state
        setSongs(prev => prev.map(s =>
          s._id === songId ? { ...s, album: albumName } : s
        ));
        // Refresh albums to update counts
        await loadAlbums();
      }
    } catch (error) {
      console.error('Error updating song album:', error);
    }

    setDraggingSongId(null);
    setDragOverAlbum(null);
  };

  // Handle dropping on "No Album" to remove from album
  const handleRemoveFromAlbum = async (e: React.DragEvent) => {
    e.preventDefault();
    const songId = e.dataTransfer.getData('text/plain') || draggingSongId;

    if (!songId) {
      setDragOverAlbum(null);
      return;
    }

    try {
      const response = await fetch('/api/songs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: songId, album: null }),
      });

      if (response.ok) {
        setSongs(prev => prev.map(s =>
          s._id === songId ? { ...s, album: null } : s
        ));
        await loadAlbums();
      }
    } catch (error) {
      console.error('Error removing song from album:', error);
    }

    setDraggingSongId(null);
    setDragOverAlbum(null);
  };

  // Handle dropping on trash bin
  const handleTrashDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const songId = e.dataTransfer.getData('text/plain');
    const albumName = e.dataTransfer.getData('album');

    if (songId && !albumName) {
      // Dropping a song - delete it
      const song = songs.find(s => s._id === songId);
      if (song && confirm(`Delete "${song.title}"? This will also delete all associated lyrics and cannot be undone.`)) {
        try {
          const response = await fetch(`/api/songs?id=${songId}`, {
            method: 'DELETE',
          });
          if (response.ok) {
            setSongs(prev => prev.filter(s => s._id !== songId));
            loadAlbums();
          }
        } catch (error) {
          console.error('Error deleting song:', error);
        }
      }
    } else if (albumName) {
      // Dropping an album - archive it
      const album = albums.find(a => a.name === albumName);
      if (album) {
        try {
          const response = await fetch(`/api/user-albums?albumName=${encodeURIComponent(albumName)}`, {
            method: 'DELETE',
          });
          if (response.ok) {
            setAlbums(prev => prev.filter(a => a.name !== albumName));
            if (selectedAlbumName === albumName) {
              setSelectedAlbumName(null);
            }
          }
        } catch (error) {
          console.error('Error archiving album:', error);
        }
      }
    }

    setDraggingSongId(null);
    setDraggingAlbumName(null);
    setDragOverTrash(false);
  };

  // Get artwork for a song
  const getSongArtwork = (song: Song): string | null => {
    if (song.artwork_url) return song.artwork_url;
    if (song.album) return albumArtMap.get(song.album) || null;
    return null;
  };

  // Filter songs based on search and selected album
  const filteredSongs = songs.filter(song => {
    // Album filter
    if (selectedAlbumName !== null && song.album !== selectedAlbumName) {
      return false;
    }
    // Search filter
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      song.title.toLowerCase().includes(search) ||
      song.artist.toLowerCase().includes(search) ||
      (song.album && song.album.toLowerCase().includes(search))
    );
  });

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center p-4">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        <p className="text-base-content/60 text-sm animate-pulse mt-2">Loading library...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      {/* Hidden file input for album art */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Delete Confirmation Modal */}
      {deleteModalAlbum && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-base-content mb-2">Delete Album</h3>
            <p className="text-base-content/70 mb-4">
              Are you sure you want to delete "{deleteModalAlbum.name}"? The album will be moved to archives where you can restore or permanently delete it.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteModalAlbum(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={() => handleArchiveAlbum(deleteModalAlbum)} className="btn btn-error">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {permanentDeleteAlbum && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-error mb-2">Permanently Delete Album</h3>
            <p className="text-base-content/70 mb-4">
              This action cannot be undone. "{permanentDeleteAlbum.name}" and all its songs will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setPermanentDeleteAlbum(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={() => handlePermanentDeleteAlbum(permanentDeleteAlbum)} className="btn btn-error">Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Album Details Modal */}
      {editDetailsAlbum && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-base-content mb-4">Edit Album Details</h3>
            <div className="form-control mb-4">
              <label className="label"><span className="label-text">Album Name</span></label>
              <input
                type="text"
                value={editAlbumName}
                onChange={(e) => setEditAlbumName(e.target.value)}
                className="input input-bordered w-full"
                placeholder="Enter album name"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setEditDetailsAlbum(null); setEditAlbumName(''); }} className="btn btn-ghost">Cancel</button>
              <button onClick={handleUpdateAlbumDetails} className="btn btn-primary" disabled={!editAlbumName.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Song Modal */}
      {shareModalSong && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-base-200 flex-shrink-0">
                {getSongArtwork(shareModalSong) ? (
                  <img src={getSongArtwork(shareModalSong)!} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <svg className="w-6 h-6 text-base-content/30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-base-content truncate">{shareModalSong.title}</h3>
                <p className="text-sm text-base-content/60 truncate">{shareModalSong.artist}</p>
              </div>
            </div>

            <p className="text-sm text-base-content/70 mb-4">
              Share this song with your bands. Band members will be able to view the song in their shared library.
            </p>

            {bands.length === 0 ? (
              <div className="text-center py-8 text-base-content/50">
                <svg className="w-12 h-12 mx-auto mb-2 text-base-content/30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                <p>No bands to share with</p>
                <p className="text-xs">Create or join a band first</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {bands.map(band => {
                  const isShared = songSharedBands.includes(band._id);
                  return (
                    <label
                      key={band._id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-base-200 transition-colors ${
                        isShared ? 'bg-secondary/10' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isShared}
                        onChange={() => handleShareToggle(band._id)}
                        disabled={sharingLoading}
                        className="checkbox checkbox-secondary"
                      />
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center text-white font-bold">
                        {band.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{band.name}</p>
                        {isShared && (
                          <p className="text-xs text-success">Shared</p>
                        )}
                      </div>
                      {sharingLoading && (
                        <span className="loading loading-spinner loading-sm"></span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShareModalSong(null);
                  setSongSharedBands([]);
                }}
                className="btn btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-base-content">Library</h1>
          <button onClick={onNewSong} className="btn btn-primary btn-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Song
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
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
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left: Songs Grid */}
        <div className="flex-1 overflow-y-auto">
          {filteredSongs.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-20 h-20 mx-auto mb-4 text-base-content/20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
              <p className="text-base-content/60 text-lg">
                {searchTerm ? 'No songs found' : selectedAlbumName ? 'No songs in this album' : 'No songs yet'}
              </p>
              {!searchTerm && !selectedAlbumName && (
                <button onClick={onNewSong} className="btn btn-primary mt-4">
                  Create your first song
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredSongs.map(song => (
                <div
                  key={song._id}
                  draggable
                  onDragStart={(e) => handleSongDragStart(e, song._id)}
                  onDragEnd={handleSongDragEnd}
                  onClick={() => handleSelectSong(song)}
                  className={`group cursor-pointer transition-all ${
                    draggingSongId === song._id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="aspect-square rounded-lg bg-base-200 overflow-hidden relative mb-2 shadow-md group-hover:shadow-xl transition-all group-hover:scale-[1.02]">
                    {getSongArtwork(song) ? (
                      <img src={getSongArtwork(song)!} alt={song.title} className="w-full h-full object-cover" draggable={false} />
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
                    {/* Action buttons */}
                    <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDeleteSong(e, song)}
                        className="w-7 h-7 bg-red-500/90 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg"
                        title="Delete song"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      {bands.length > 0 && (
                        <button
                          onClick={(e) => openShareModal(e, song)}
                          className="w-7 h-7 bg-secondary/90 hover:bg-secondary rounded-full flex items-center justify-center shadow-lg"
                          title="Share with band"
                        >
                          <svg className="w-4 h-4 text-secondary-content" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {/* Drag handle indicator */}
                    <div className="absolute bottom-2 left-2 w-6 h-6 bg-black/40 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
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
        </div>

        {/* Right: Shows & Albums Column */}
        <div className="w-72 flex-shrink-0 flex flex-col border-l border-base-300 pl-6">
          {/* Upcoming Shows Section */}
          {upcomingShows.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-base-content">Upcoming Shows</h2>
                {onViewShows && (
                  <button onClick={onViewShows} className="btn btn-ghost btn-xs text-primary">
                    View All
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {upcomingShows.slice(0, 5).map(show => {
                  const showDate = new Date(show.date + 'T00:00:00');
                  const formattedDate = showDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <div
                      key={show._id}
                      onClick={() => onViewShows?.()}
                      className="flex items-center gap-3 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-primary">{showDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
                        <span className="text-sm font-bold text-primary leading-none">{showDate.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate text-base-content">{show.name}</p>
                        <p className="text-xs text-base-content/60 truncate">
                          {show.band_name}{show.venue ? ` @ ${show.venue}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Shared Songs Section */}
          {bands.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-base-content">Shared Songs</h2>
                <button
                  onClick={() => {
                    if (!showSharedSongs) {
                      loadSharedSongs();
                    }
                    setShowSharedSongs(!showSharedSongs);
                  }}
                  className={`btn btn-ghost btn-xs ${showSharedSongs ? 'text-secondary' : ''}`}
                >
                  {showSharedSongs ? 'Hide' : 'View'}
                </button>
              </div>

              {showSharedSongs && (
                <div className="space-y-3">
                  {/* Band selector */}
                  {bands.length > 1 && (
                    <select
                      value={selectedSharedBand || ''}
                      onChange={(e) => loadSharedSongs(e.target.value)}
                      className="select select-bordered select-sm w-full"
                    >
                      {bands.map(band => (
                        <option key={band._id} value={band._id}>{band.name}</option>
                      ))}
                    </select>
                  )}

                  {sharedSongs.length === 0 ? (
                    <div className="text-center py-4 text-base-content/50 text-sm">
                      <p>No songs shared yet</p>
                      <p className="text-xs mt-1">Share songs using the button on each song card</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {sharedSongs.map(shared => (
                        shared.song && (
                          <div
                            key={shared._id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-secondary/10 hover:bg-secondary/20 cursor-pointer transition-colors"
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-base-300 flex-shrink-0">
                              {shared.song.artwork_url ? (
                                <img src={shared.song.artwork_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary/30 to-accent/30">
                                  <svg className="w-5 h-5 text-base-content/30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{shared.song.title}</p>
                              <p className="text-xs text-base-content/60 truncate">{shared.song.artist}</p>
                              <p className="text-xs text-secondary/70 truncate">
                                Shared by {shared.shared_by_name}
                              </p>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Albums Section */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-base-content">Albums</h2>
            <button
              onClick={() => {
                setShowArchives(!showArchives);
                if (!showArchives) {
                  loadArchivedAlbums();
                }
              }}
              className={`btn btn-ghost btn-xs ${showArchives ? 'text-primary' : ''}`}
              title={showArchives ? 'Show albums' : 'Show archives'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {showArchives ? (
              /* Archives View */
              archivedAlbums.length === 0 ? (
                <div className="text-center py-8 text-base-content/50 text-sm">
                  No archived albums
                </div>
              ) : (
                archivedAlbums.map(album => (
                  <div key={album._id} className="flex items-center gap-3 p-2 rounded-lg bg-base-200/50 opacity-60">
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-base-300">
                      {album.cover_art ? (
                        <img src={album.cover_art} alt={album.name} className="w-full h-full object-cover grayscale" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                          <svg className="w-6 h-6 text-white/50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-base-content/60">{album.name}</p>
                      <p className="text-xs text-base-content/40">{album.song_count} songs</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleRestoreAlbum(album)} className="btn btn-ghost btn-xs text-success" title="Restore">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      </button>
                      <button onClick={() => setPermanentDeleteAlbum(album)} className="btn btn-ghost btn-xs text-error" title="Delete permanently">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              /* Normal Albums View */
              <>
                {/* All Songs button */}
                <button
                  onClick={() => setSelectedAlbumName(null)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggingSongId) setDragOverAlbum('__all__');
                  }}
                  onDragLeave={handleAlbumDragLeave}
                  onDrop={handleRemoveFromAlbum}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all ${
                    selectedAlbumName === null
                      ? 'bg-primary/20 border-2 border-primary'
                      : 'hover:bg-base-200'
                  } ${dragOverAlbum === '__all__' ? 'ring-2 ring-primary scale-[1.02]' : ''}`}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-base-200 to-base-300 flex items-center justify-center">
                    <svg className="w-6 h-6 text-base-content/50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-sm truncate">All Songs</p>
                    <p className="text-xs text-base-content/60">{songs.length} songs</p>
                  </div>
                </button>

                {/* Album list */}
                {albums.map(album => (
                  <div
                    key={album._id}
                    draggable
                    onDragStart={(e) => handleAlbumDragStart(e, album.name)}
                    onDragEnd={handleAlbumDragEnd}
                    onClick={() => setSelectedAlbumName(album.name)}
                    onDragOver={(e) => handleAlbumDragOver(e, album.name)}
                    onDragLeave={handleAlbumDragLeave}
                    onDrop={(e) => handleAlbumDrop(e, album.name)}
                    className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                      selectedAlbumName === album.name
                        ? 'bg-primary/20 border-2 border-primary'
                        : 'hover:bg-base-200'
                    } ${dragOverAlbum === album.name ? 'ring-2 ring-primary scale-[1.02] bg-primary/10' : ''} ${
                      draggingAlbumName === album.name ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-base-300">
                      {album.cover_art ? (
                        <img src={album.cover_art} alt={album.name} className="w-full h-full object-cover" draggable={false} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                          <svg className="w-6 h-6 text-white/50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{album.name}</p>
                      <p className="text-xs text-base-content/60">{album.song_count} songs</p>
                    </div>

                    {/* Three-dots menu */}
                    <div ref={showAlbumMenu === album._id ? menuRef : null} className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAlbumMenu(showAlbumMenu === album._id ? null : album._id);
                        }}
                        className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-base-300 transition-opacity"
                      >
                        <svg className="w-4 h-4 text-base-content/70" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="6" r="1.5" />
                          <circle cx="12" cy="12" r="1.5" />
                          <circle cx="12" cy="18" r="1.5" />
                        </svg>
                      </button>
                      {showAlbumMenu === album._id && (
                        <div className="absolute right-0 mt-1 w-48 bg-base-100 rounded-lg shadow-xl border border-base-300 z-50">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditDetailsAlbum(album);
                              setEditAlbumName(album.name);
                              setShowAlbumMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-base-200 rounded-t-lg flex items-center gap-2 text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Album Details
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAlbumArt(album.name);
                              fileInputRef.current?.click();
                              setShowAlbumMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-base-200 flex items-center gap-2 text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Update Album Cover
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModalAlbum(album);
                              setShowAlbumMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-base-200 rounded-b-lg flex items-center gap-2 text-sm text-error"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete Album
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {albums.length === 0 && (
                  <div className="text-center py-8 text-base-content/50 text-sm">
                    <p>No albums yet</p>
                    <p className="text-xs mt-1">Drag songs here to create albums</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Trash bin drop target - fixed at bottom */}
          {!showArchives && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (draggingSongId || draggingAlbumName) {
                  setDragOverTrash(true);
                }
              }}
              onDragLeave={() => setDragOverTrash(false)}
              onDrop={handleTrashDrop}
              className={`mt-4 p-3 rounded-lg border-2 border-dashed transition-all flex items-center justify-center gap-2 ${
                dragOverTrash
                  ? 'border-error bg-error/20 scale-[1.02]'
                  : 'border-base-300 hover:border-base-content/30'
              } ${(draggingSongId || draggingAlbumName) ? 'opacity-100' : 'opacity-50'}`}
            >
              <svg className={`w-5 h-5 ${dragOverTrash ? 'text-error' : 'text-base-content/50'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className={`text-sm ${dragOverTrash ? 'text-error font-medium' : 'text-base-content/50'}`}>
                {draggingAlbumName ? 'Archive Album' : draggingSongId ? 'Delete Song' : 'Drop to Archive'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
