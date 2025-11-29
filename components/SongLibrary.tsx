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
  completed: boolean;
  band_id: string | null;
  album_id: string | null;
  folder_id: string | null;
  user_id: string;
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
  onSelectSong: (song: Song, lyrics: LyricLine[]) => void;
  onNewSong: () => void;
  onViewMetrics?: (song: Song) => void;
  onLyricSync?: (song: Song, lyrics: LyricLine[]) => void;
}

export default function SongLibrary({ onSelectSong, onNewSong, onViewMetrics, onLyricSync }: Props) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredSong, setHoveredSong] = useState<string | null>(null);
  const [filterByCompleted, setFilterByCompleted] = useState<'all' | 'completed' | 'incomplete'>('all');
  const [filterByFolder, setFilterByFolder] = useState<string>('all');
  const [filterByTag, setFilterByTag] = useState<string>('all');
  const [filterByAlbum, setFilterByAlbum] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated_at' | 'title' | 'artist' | 'album'>('updated_at');
  const [showCreateModal, setShowCreateModal] = useState<'song' | 'tag' | 'folder' | 'album' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  // SoundCloud player state
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scWidget, setScWidget] = useState<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Initialize SoundCloud widget when URL changes
  useEffect(() => {
    if (!playingUrl || !iframeRef.current) return;

    // Wait for SC API to be available
    const initWidget = () => {
      if (!window.SC?.Widget || !iframeRef.current) return;

      try {
        const widget = window.SC.Widget(iframeRef.current);
        setScWidget(widget);

        const handleReady = () => {
          try {
            widget.play();
            setIsPlaying(true);
          } catch (err) {
            console.error('Error playing widget:', err);
          }
        };

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleFinish = () => {
          setIsPlaying(false);
          setPlayingSongId(null);
          setPlayingUrl(null);
        };

        widget.bind(window.SC.Widget.Events.READY, handleReady);
        widget.bind(window.SC.Widget.Events.PLAY, handlePlay);
        widget.bind(window.SC.Widget.Events.PAUSE, handlePause);
        widget.bind(window.SC.Widget.Events.FINISH, handleFinish);

        return () => {
          try {
            widget.unbind(window.SC.Widget.Events.READY);
            widget.unbind(window.SC.Widget.Events.PLAY);
            widget.unbind(window.SC.Widget.Events.PAUSE);
            widget.unbind(window.SC.Widget.Events.FINISH);
          } catch (err) {
            // Ignore cleanup errors
          }
        };
      } catch (err) {
        console.error('Error initializing SoundCloud widget:', err);
      }
    };

    // Check if SC is already loaded
    if (window.SC?.Widget) {
      const cleanup = initWidget();
      return cleanup;
    }

    // Wait for SC to load
    const checkSC = setInterval(() => {
      if (window.SC?.Widget) {
        clearInterval(checkSC);
        initWidget();
      }
    }, 100);

    return () => {
      clearInterval(checkSC);
    };
  }, [playingUrl]);

  const handlePlayReference = (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!song.soundcloud_url) return;

    if (playingSongId === song._id) {
      // Toggle play/pause for same song
      if (scWidget) {
        try {
          if (isPlaying) {
            scWidget.pause();
          } else {
            scWidget.play();
          }
        } catch (err) {
          console.error('Error toggling playback:', err);
        }
      }
    } else {
      // Play new song
      setPlayingSongId(song._id);
      setPlayingUrl(song.soundcloud_url);
    }
  };

  const stopPlayback = () => {
    try {
      if (scWidget) {
        scWidget.pause();
      }
    } catch (err) {
      // Ignore errors when stopping
    }
    setScWidget(null);
    setPlayingSongId(null);
    setPlayingUrl(null);
    setIsPlaying(false);
  };

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/songs');
      if (response.ok) {
        const data = await response.json();
        setSongs(data || []);
      } else {
        console.error('Error loading songs');
      }
    } catch (error) {
      console.error('Error loading songs:', error);
    }
    setLoading(false);
  };

  const handleSelectSong = async (song: Song) => {
    try {
      const response = await fetch(`/api/lyrics?songId=${song._id}`);
      if (response.ok) {
        const data = await response.json();
        onSelectSong(song, data || []);
      } else {
        console.error('Error loading lyrics');
      }
    } catch (error) {
      console.error('Error loading lyrics:', error);
    }
  };

  const handleLyricSync = async (song: Song) => {
    try {
      const response = await fetch(`/api/lyrics?songId=${song._id}`);
      if (response.ok) {
        const data = await response.json();
        onLyricSync?.(song, data || []);
      } else {
        console.error('Error loading lyrics');
      }
    } catch (error) {
      console.error('Error loading lyrics:', error);
    }
  };

  const handleDeleteSong = async (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this song?')) return;

    try {
      const response = await fetch(`/api/songs?id=${songId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSongs(songs.filter(s => s._id !== songId));
      } else {
        console.error('Error deleting song');
      }
    } catch (error) {
      console.error('Error deleting song:', error);
    }
  };

  const handleToggleCompleted = async (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const response = await fetch('/api/songs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: song._id, completed: !song.completed }),
      });

      if (response.ok) {
        setSongs(songs.map(s => s._id === song._id ? { ...s, completed: !s.completed } : s));
      } else {
        console.error('Error toggling completed status');
      }
    } catch (error) {
      console.error('Error toggling completed status:', error);
    }
  };

  const handleDuplicateSong = async (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      // First get the lyrics for this song
      const lyricsResponse = await fetch(`/api/lyrics?songId=${song._id}`);
      const lyrics = lyricsResponse.ok ? await lyricsResponse.json() : [];

      // Create the duplicated song
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${song.title} (Copy)`,
          artist: song.artist,
          album: song.album,
          folder: song.folder,
          tags: song.tags,
          soundcloud_url: song.soundcloud_url,
          instrumental_url: song.instrumental_url,
          completed: false,
          band_id: song.band_id,
          album_id: song.album_id,
          folder_id: song.folder_id,
        }),
      });

      if (response.ok) {
        const newSong = await response.json();

        // Copy the lyrics if there are any
        if (lyrics.length > 0) {
          await fetch('/api/lyrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              songId: newSong._id,
              lines: lyrics.map((line: LyricLine) => ({
                line_number: line.line_number,
                text: line.text,
                timestamp_ms: line.timestamp_ms,
              })),
            }),
          });
        }

        setSongs([newSong, ...songs]);
      } else {
        console.error('Error duplicating song');
      }
    } catch (error) {
      console.error('Error duplicating song:', error);
    }
  };

  const folders = Array.from(new Set(songs.map(song => song.folder).filter(Boolean))) as string[];
  const albums = Array.from(new Set(songs.map(song => song.album).filter(Boolean))) as string[];
  const allTags = Array.from(new Set(songs.flatMap(song => song.tags || []).filter(Boolean))) as string[];

  const filteredSongs = songs
    .filter(song => {
      const matchesSearch =
        song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (song.album && song.album.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (song.folder && song.folder.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (song.tags && song.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchesCompleted =
        filterByCompleted === 'all' ||
        (filterByCompleted === 'completed' && song.completed) ||
        (filterByCompleted === 'incomplete' && !song.completed);

      const matchesFolder =
        filterByFolder === 'all' ||
        song.folder === filterByFolder;

      const matchesTag =
        filterByTag === 'all' ||
        (song.tags && song.tags.includes(filterByTag));

      const matchesAlbum =
        filterByAlbum === 'all' ||
        song.album === filterByAlbum;

      return matchesSearch && matchesCompleted && matchesFolder && matchesTag && matchesAlbum;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'artist':
          return a.artist.localeCompare(b.artist);
        case 'album':
          return (a.album || '').localeCompare(b.album || '');
        case 'updated_at':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

  const handleCreateItem = async () => {
    if (!newItemName.trim()) return;

    if (showCreateModal === 'song') {
      onNewSong();
    }

    setShowCreateModal(null);
    setNewItemName('');
  };

  const hasActiveFilters = filterByCompleted !== 'all' || filterByFolder !== 'all' || filterByTag !== 'all' || filterByAlbum !== 'all';

  const clearFilters = () => {
    setFilterByCompleted('all');
    setFilterByFolder('all');
    setFilterByTag('all');
    setFilterByAlbum('all');
  };

  return (
    <>
      <Script
        src="https://w.soundcloud.com/player/api.js"
        strategy="lazyOnload"
      />

      {/* Hidden SoundCloud Player */}
      {playingUrl && (
        <div className="hidden">
          <iframe
            ref={iframeRef}
            key={playingUrl}
            width="0"
            height="0"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(playingUrl)}&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&visual=false`}
          />
        </div>
      )}

      {/* Mini Player Bar - shows when playing */}
      {playingSongId && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 bg-base-100 border border-base-300 shadow-xl rounded-full">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.008-.058-.048-.1-.084-.1zm1.09-1.39c-.054 0-.098.044-.105.1l-.21 3.544.21 3.35c.007.057.051.096.105.096.053 0 .096-.039.105-.096l.24-3.35-.24-3.544c-.009-.056-.052-.1-.105-.1zm1.143-.19c-.053 0-.1.044-.107.1l-.212 3.735.212 3.35c.007.055.054.097.107.097.052 0 .098-.042.107-.097l.24-3.35-.24-3.735c-.009-.056-.055-.1-.107-.1zm1.115.427c-.063 0-.107.047-.115.1l-.19 3.407.19 3.35c.008.054.052.097.115.097.062 0 .106-.043.115-.097l.215-3.35-.215-3.407c-.009-.053-.053-.1-.115-.1zm1.18-.48c-.062 0-.11.047-.117.1l-.172 3.888.172 3.35c.007.053.055.097.117.097.061 0 .108-.044.117-.097l.194-3.35-.194-3.888c-.009-.053-.056-.1-.117-.1zm1.18-.664c-.062 0-.11.047-.117.1l-.157 4.552.157 3.35c.007.053.055.097.117.097.061 0 .108-.044.117-.097l.178-3.35-.178-4.552c-.009-.053-.056-.1-.117-.1zm1.227-.87c-.069 0-.12.052-.127.11l-.136 5.422.136 3.35c.007.058.058.1.127.1.068 0 .118-.042.127-.1l.154-3.35-.154-5.422c-.009-.058-.059-.11-.127-.11zm1.2-.52c-.07 0-.12.052-.127.11l-.12 5.942.12 3.35c.007.058.057.1.127.1.069 0 .12-.042.127-.1l.135-3.35-.135-5.942c-.007-.058-.058-.11-.127-.11zm1.227-.39c-.077 0-.13.057-.137.12l-.103 6.332.103 3.35c.007.063.06.108.137.108s.128-.045.137-.108l.117-3.35-.117-6.332c-.009-.063-.06-.12-.137-.12zm1.227-.18c-.077 0-.13.057-.137.12l-.088 6.512.088 3.35c.007.063.06.108.137.108s.128-.045.137-.108l.1-3.35-.1-6.512c-.009-.063-.06-.12-.137-.12zm4.797-.142c-.246 0-.483.025-.715.069-.147-1.606-1.505-2.87-3.163-2.87-.391 0-.768.072-1.119.204-.126.047-.162.093-.162.185v8.4c0 .097.07.177.166.19l5.008.003c1.38 0 2.5-1.068 2.5-2.387 0-1.32-1.12-2.394-2.5-2.394z"/>
            </svg>
            <span className="text-sm font-medium text-base-content max-w-[200px] truncate">
              {songs.find(s => s._id === playingSongId)?.title || 'Playing...'}
            </span>
          </div>
          <button
            onClick={() => {
              if (!scWidget) return;
              try {
                if (isPlaying) {
                  scWidget.pause();
                } else {
                  scWidget.play();
                }
              } catch (err) {
                console.error('Error toggling playback:', err);
              }
            }}
            className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              {isPlaying ? (
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              ) : (
                <path d="M8 5v14l11-7z"/>
              )}
            </svg>
          </button>
          <button
            onClick={stopPlayback}
            className="p-2 hover:bg-base-200 rounded-full transition-colors"
            title="Stop"
          >
            <svg className="w-4 h-4 text-base-content/60" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z"/>
            </svg>
          </button>
        </div>
      )}

      <div className="p-4 md:p-6">
      <div className="space-y-3 mb-">
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 bg-base-900">
            <select
              value={filterByCompleted}
              onChange={e => setFilterByCompleted(e.target.value as any)}
              className="select select-bordered select-sm flex-1 min-w-[140px]"
            >
              <option value="all">All Songs</option>
              <option value="completed">Completed</option>
              <option value="incomplete">In Progress</option>
            </select>

            <select
              value={filterByFolder}
              onChange={e => setFilterByFolder(e.target.value)}
              className="select select-bordered select-sm flex-1 min-w-[140px]"
            >
              <option value="all">All Folders</option>
              {folders.map(folder => (
                <option key={folder} value={folder}>{folder}</option>
              ))}
            </select>

            <select
              value={filterByAlbum}
              onChange={e => setFilterByAlbum(e.target.value)}
              className="select select-bordered select-sm flex-1 min-w-[140px]"
            >
              <option value="all">All Albums</option>
              {albums.map(album => (
                <option key={album} value={album}>{album}</option>
              ))}
            </select>

            <select
              value={filterByTag}
              onChange={e => setFilterByTag(e.target.value)}
              className="select select-bordered select-sm flex-1 min-w-[140px]"
            >
              <option value="all">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="select select-bordered select-sm flex-1 min-w-[140px]"
            >
              <option value="updated_at">Sort by Updated</option>
              <option value="title">Sort by Title</option>
              <option value="artist">Sort by Artist</option>
              <option value="album">Sort by Album</option>
            </select>

            <button
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="btn btn-sm btn-ghost disabled:opacity-50"
              title="Clear Filters"
            >
              Clear
            </button>
          </div>
        )}

        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-ghost btn-square ${showFilters || hasActiveFilters ? 'text-primary' : 'text-base-content/50'}`}
            title="Toggle Filters"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
          </button>

          <button
            onClick={() => setReorderMode(!reorderMode)}
            className={`btn btn-ghost btn-square ${reorderMode ? 'text-primary' : 'text-base-content/50'}`}
            title="Reorder Mode"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
            </svg>
          </button>

          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search songs, artists, albums, folders, tags..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input input-bordered w-full pl-11"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-7 h-7 text-base-content/50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
            </svg>
          </div>

          <button
            onClick={onNewSong}
            className="btn btn-ghost btn-square text-primary"
            title="Add Song"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
            </svg>
          </button>

          <button
            onClick={() => setShowCreateModal('album')}
            className="btn btn-ghost btn-square text-info"
            title="Add Album"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </button>

          <button
            onClick={() => setShowCreateModal('folder')}
            className="btn btn-ghost btn-square text-warning"
            title="Add Folder"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </button>

          <button
            onClick={() => setShowCreateModal('tag')}
            className="btn btn-ghost btn-square text-success"
            title="Add Tag"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="w-full h-full flex flex-col justify-center items-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-base-content/60 text-sm md:text-base animate-pulse">Loading songs...</p>
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="p-4 gap-4 flex flex-col justify-between h-full w-full card card-bordered border-secondary opacity-70 hover:opacity-100 transition-opacity duration-300">
          <svg className="w-20 h-20 mx-auto mb-4 text-base-content/30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
          </svg>
          <p className="text-base-content/60 text-sm md:text-base">
            {searchTerm ? 'No songs found' : 'No songs yet. Create your first song!'}
          </p>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col justify-center items-center p-4">
          {filteredSongs.map(song => (
            <div
              key={song._id}
              onClick={() => handleSelectSong(song)}
              onMouseEnter={() => setHoveredSong(song._id)}
              onMouseLeave={() => setHoveredSong(null)}
              className="p-4 gap-4 flex flex-col justify-between h-full w-full card card-bordered border-secondary opacity-70 hover:opacity-100 transition-opacity duration-300"
            >
              <div className="cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-7 h-7 text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                    </svg>
                    <h3 className="text-base md:text-xl font-bold text-base-content truncate flex-1">
                      {song.title}
                    </h3>
                    {song.completed && (
                      <span className="badge badge-success badge-sm">
                        ✓ Complete
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      {reorderMode ? (
                        <button
                          className="btn btn-ghost btn-xs cursor-move"
                          title="Drag to Reorder"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                          </svg>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleSelectSong(song);
                            }}
                            className="btn btn-ghost btn-xs text-info"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleLyricSync(song);
                            }}
                            className="btn btn-ghost btn-xs text-secondary"
                            title="Lyric Sync"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                            </svg>
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onViewMetrics?.(song);
                            }}
                            className="btn btn-ghost btn-xs text-success"
                            title="View Metrics"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </button>
                          <button
                            onClick={e => handleToggleCompleted(song, e)}
                            className={`btn btn-ghost btn-xs ${song.completed ? 'text-warning' : 'text-success'}`}
                            title={song.completed ? 'Mark Incomplete' : 'Mark Complete'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              {song.completed ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              )}
                            </svg>
                          </button>
                          <button
                            onClick={e => handleDuplicateSong(song, e)}
                            className="btn btn-ghost btn-xs text-primary"
                            title="Duplicate Song"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                            </svg>
                          </button>
                          <button
                            onClick={e => handleDeleteSong(song._id, e)}
                            className="btn btn-ghost btn-xs text-error"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2 bg-base-900">
                    <svg className="w-5 h-5 text-base-content/50 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <p className="text-sm md:text-base text-base-content truncate flex-1">{song.artist}</p>
                    <div className="flex items-center gap-2 text-xs text-base-content/70 flex-wrap">
                      {song.album && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 border border-blue-200 whitespace-nowrap" style={{borderRadius: '4px'}}>
                          {song.album}
                        </span>
                      )}
                      {song.folder && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 border border-orange-200 whitespace-nowrap" style={{borderRadius: '4px'}}>
                          📁 {song.folder}
                        </span>
                      )}
                      {song.tags && song.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {song.tags.map(tag => (
                            <span key={tag} className="tag tag-outline tag-lg tag-primary">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs md:text-sm text-base-content/60 flex-wrap">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Updated: {new Date(song.updated_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* SoundCloud Reference indicator */}
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-md ${
                          song.soundcloud_url
                            ? 'bg-orange-100 text-orange-700 border border-orange-200'
                            : 'bg-base-200 text-base-content/40 border border-base-300'
                        }`}
                        title={song.soundcloud_url ? 'Reference track linked' : 'No reference track'}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.008-.058-.048-.1-.084-.1zm1.09-1.39c-.054 0-.098.044-.105.1l-.21 3.544.21 3.35c.007.057.051.096.105.096.053 0 .096-.039.105-.096l.24-3.35-.24-3.544c-.009-.056-.052-.1-.105-.1zm1.143-.19c-.053 0-.1.044-.107.1l-.212 3.735.212 3.35c.007.055.054.097.107.097.052 0 .098-.042.107-.097l.24-3.35-.24-3.735c-.009-.056-.055-.1-.107-.1zm1.115.427c-.063 0-.107.047-.115.1l-.19 3.407.19 3.35c.008.054.052.097.115.097.062 0 .106-.043.115-.097l.215-3.35-.215-3.407c-.009-.053-.053-.1-.115-.1zm1.18-.48c-.062 0-.11.047-.117.1l-.172 3.888.172 3.35c.007.053.055.097.117.097.061 0 .108-.044.117-.097l.194-3.35-.194-3.888c-.009-.053-.056-.1-.117-.1zm1.18-.664c-.062 0-.11.047-.117.1l-.157 4.552.157 3.35c.007.053.055.097.117.097.061 0 .108-.044.117-.097l.178-3.35-.178-4.552c-.009-.053-.056-.1-.117-.1zm1.227-.87c-.069 0-.12.052-.127.11l-.136 5.422.136 3.35c.007.058.058.1.127.1.068 0 .118-.042.127-.1l.154-3.35-.154-5.422c-.009-.058-.059-.11-.127-.11zm1.2-.52c-.07 0-.12.052-.127.11l-.12 5.942.12 3.35c.007.058.057.1.127.1.069 0 .12-.042.127-.1l.135-3.35-.135-5.942c-.007-.058-.058-.11-.127-.11zm1.227-.39c-.077 0-.13.057-.137.12l-.103 6.332.103 3.35c.007.063.06.108.137.108s.128-.045.137-.108l.117-3.35-.117-6.332c-.009-.063-.06-.12-.137-.12zm1.227-.18c-.077 0-.13.057-.137.12l-.088 6.512.088 3.35c.007.063.06.108.137.108s.128-.045.137-.108l.1-3.35-.1-6.512c-.009-.063-.06-.12-.137-.12zm4.797-.142c-.246 0-.483.025-.715.069-.147-1.606-1.505-2.87-3.163-2.87-.391 0-.768.072-1.119.204-.126.047-.162.093-.162.185v8.4c0 .097.07.177.166.19l5.008.003c1.38 0 2.5-1.068 2.5-2.387 0-1.32-1.12-2.394-2.5-2.394z"/>
                        </svg>
                        <span className="text-xs font-medium">Ref</span>
                        {song.soundcloud_url && (
                          <button
                            onClick={(e) => handlePlayReference(song, e)}
                            className={`p-0.5 rounded transition-colors ${
                              playingSongId === song._id && isPlaying
                                ? 'bg-orange-300 text-orange-900'
                                : 'hover:bg-orange-200'
                            }`}
                            title={playingSongId === song._id && isPlaying ? 'Pause' : 'Play reference'}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              {playingSongId === song._id && isPlaying ? (
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                              ) : (
                                <path d="M8 5v14l11-7z"/>
                              )}
                            </svg>
                          </button>
                        )}
                      </div>
                      {/* Instrumental indicator */}
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-md ${
                          song.instrumental_url
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : 'bg-base-200 text-base-content/40 border border-base-300'
                        }`}
                        title={song.instrumental_url ? 'Instrumental track linked' : 'No instrumental track'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        <span className="text-xs font-medium">Inst</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">
              Add New {showCreateModal.charAt(0).toUpperCase() + showCreateModal.slice(1)}
            </h3>
            <div className="py-4">
              <input
                type="text"
                placeholder={`Enter ${showCreateModal} name...`}
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                className="input input-bordered w-full"
                onKeyDown={e => e.key === 'Enter' && handleCreateItem()}
                autoFocus
              />
            </div>
            <div className="modal-action">
              <button
                onClick={() => setShowCreateModal(null)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateItem}
                className="btn btn-primary"
              >
                Create
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowCreateModal(null)}>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
