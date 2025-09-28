'use client';

import { useState, useEffect } from 'react';
import { supabase, Song, LyricLine } from '@/lib/supabase';

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

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading songs:', error);
    } else {
      setSongs(data || []);
    }
    setLoading(false);
  };

  const handleSelectSong = async (song: Song) => {
    const { data, error } = await supabase
      .from('lyric_lines')
      .select('*')
      .eq('song_id', song.id)
      .order('line_number', { ascending: true });

    if (error) {
      console.error('Error loading lyrics:', error);
      return;
    }

    onSelectSong(song, data || []);
  };

  const handleLyricSync = async (song: Song) => {
    const { data, error } = await supabase
      .from('lyric_lines')
      .select('*')
      .eq('song_id', song.id)
      .order('line_number', { ascending: true });

    if (error) {
      console.error('Error loading lyrics:', error);
      return;
    }

    onLyricSync?.(song, data || []);
  };

  const handleDeleteSong = async (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this song?')) return;

    const { error } = await supabase.from('songs').delete().eq('id', songId);

    if (error) {
      console.error('Error deleting song:', error);
    } else {
      setSongs(songs.filter(s => s.id !== songId));
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
    <div className="p-4 md:p-6">
      <div className="space-y-3 mb-6">
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2">
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
          </button>

          <button
            onClick={() => setReorderMode(!reorderMode)}
            className={`btn btn-ghost btn-square ${reorderMode ? 'text-primary' : 'text-base-content/50'}`}
            title="Reorder Mode"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
            </svg>
          </div>

          <button
            onClick={onNewSong}
            className="btn btn-ghost btn-square text-primary"
            title="Add Song"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
            </svg>
          </button>

          <button
            onClick={() => setShowCreateModal('album')}
            className="btn btn-ghost btn-square text-info"
            title="Add Album"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </button>

          <button
            onClick={() => setShowCreateModal('folder')}
            className="btn btn-ghost btn-square text-warning"
            title="Add Folder"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </button>

          <button
            onClick={() => setShowCreateModal('tag')}
            className="btn btn-ghost btn-square text-success"
            title="Add Tag"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-base-content/60 text-sm md:text-base animate-pulse">Loading songs...</p>
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-20 h-20 mx-auto mb-4 text-base-content/30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
          </svg>
          <p className="text-base-content/60 text-sm md:text-base">
            {searchTerm ? 'No songs found' : 'No songs yet. Create your first song!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:gap-4">
          {filteredSongs.map(song => (
            <div
              key={song.id}
              onClick={() => handleSelectSong(song)}
              onMouseEnter={() => setHoveredSong(song.id)}
              onMouseLeave={() => setHoveredSong(null)}
              className="card card-bordered bg-base-100 cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-300 p-4"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                          </svg>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleSelectSong(song);
                            }}
                            className="btn btn-ghost btn-xs text-info"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </button>
                          <button
                            onClick={e => handleDeleteSong(song.id, e)}
                            className="btn btn-ghost btn-xs text-error"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-base-content/50 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                            <span key={tag} className="px-2 py-1 bg-purple-100 text-purple-700 border border-purple-200 text-xs whitespace-nowrap" style={{borderRadius: '4px'}}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs md:text-sm text-base-content/60">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Updated: {new Date(song.updated_at).toLocaleDateString()}
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
  );
}