'use client';

import { useState, useEffect } from 'react';
import { supabase, Song, LyricLine } from '@/lib/supabase';

interface Props {
  onSelectSong: (song: Song, lyrics: LyricLine[]) => void;
  onNewSong: () => void;
  onViewMetrics?: (song: Song) => void;
}

export default function SongLibrary({ onSelectSong, onNewSong, onViewMetrics }: Props) {
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
    // Add logic for creating tags, folders, albums in the future
    
    setShowCreateModal(null);
    setNewItemName('');
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded border border-slate-200/50 p-4 md:p-6" style={{borderRadius: '4px'}}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500" style={{borderRadius: '4px'}} />
        <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Song Library
        </h2>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search songs, artists, albums, folders, tags..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 focus:outline-none focus:border-purple-500 text-sm md:text-base transition-all duration-300 hover:border-slate-300 bg-white/60 backdrop-blur-sm"
              style={{borderRadius: '4px'}}
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
            </svg>
          </div>
          
          {/* Icon-only buttons */}
          <button
            onClick={onNewSong}
            className="p-3 text-slate-400 hover:text-purple-500 hover:bg-purple-50 transition-all duration-200 border-2 border-slate-200 hover:border-purple-300"
            style={{borderRadius: '4px'}}
            title="Add Song"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
            </svg>
          </button>
          
          <button
            onClick={() => setShowCreateModal('album')}
            className="p-3 text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all duration-200 border-2 border-slate-200 hover:border-blue-300"
            style={{borderRadius: '4px'}}
            title="Add Album"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </button>
          
          <button
            onClick={() => setShowCreateModal('folder')}
            className="p-3 text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-all duration-200 border-2 border-slate-200 hover:border-orange-300"
            style={{borderRadius: '4px'}}
            title="Add Folder"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </button>
          
          <button
            onClick={() => setShowCreateModal('tag')}
            className="p-3 text-slate-400 hover:text-green-500 hover:bg-green-50 transition-all duration-200 border-2 border-slate-200 hover:border-green-300"
            style={{borderRadius: '4px'}}
            title="Add Tag"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={filterByCompleted}
            onChange={e => setFilterByCompleted(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 bg-white/70 text-slate-900 text-sm focus:outline-none focus:border-purple-500"
            style={{borderRadius: '4px'}}
          >
            <option value="all">All Songs</option>
            <option value="completed">Completed</option>
            <option value="incomplete">In Progress</option>
          </select>

          <select
            value={filterByFolder}
            onChange={e => setFilterByFolder(e.target.value)}
            className="px-3 py-2 border border-slate-200 bg-white/70 text-slate-900 text-sm focus:outline-none focus:border-purple-500"
            style={{borderRadius: '4px'}}
          >
            <option value="all">All Folders</option>
            {folders.map(folder => (
              <option key={folder} value={folder}>{folder}</option>
            ))}
          </select>

          <select
            value={filterByAlbum}
            onChange={e => setFilterByAlbum(e.target.value)}
            className="px-3 py-2 border border-slate-200 bg-white/70 text-slate-900 text-sm focus:outline-none focus:border-purple-500"
            style={{borderRadius: '4px'}}
          >
            <option value="all">All Albums</option>
            {albums.map(album => (
              <option key={album} value={album}>{album}</option>
            ))}
          </select>

          <select
            value={filterByTag}
            onChange={e => setFilterByTag(e.target.value)}
            className="px-3 py-2 border border-slate-200 bg-white/70 text-slate-900 text-sm focus:outline-none focus:border-purple-500"
            style={{borderRadius: '4px'}}
          >
            <option value="all">All Tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 bg-white/70 text-slate-900 text-sm focus:outline-none focus:border-purple-500"
            style={{borderRadius: '4px'}}
          >
            <option value="updated_at">Sort by Updated</option>
            <option value="title">Sort by Title</option>
            <option value="artist">Sort by Artist</option>
            <option value="album">Sort by Album</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm md:text-base animate-pulse">Loading songs...</p>
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
          </svg>
          <p className="text-slate-500 text-sm md:text-base">
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
              className="group border-2 border-slate-200 p-4 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 bg-gradient-to-br from-white to-purple-50/20 cursor-pointer hover:border-purple-300"
              style={{borderRadius: '4px'}}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                    </svg>
                    <h3 className="text-base md:text-xl font-bold text-slate-900 truncate flex-1">
                      {song.title}
                    </h3>
                    {song.completed && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold border border-green-200" style={{borderRadius: '4px'}}>
                        ✓ Complete
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                        }}
                        className="group/move p-1 transition-all duration-300"
                        title="Move"
                      >
                        <svg className="w-4 h-4 text-slate-400 group-hover/move:text-purple-400 group-hover/move:scale-110 transition-all duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                        </svg>
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleSelectSong(song);
                        }}
                        className="group/edit p-1 transition-all duration-300"
                        title="Edit"
                      >
                        <svg className="w-4 h-4 text-slate-400 group-hover/edit:text-blue-500 group-hover/edit:scale-110 transition-all duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onViewMetrics?.(song);
                        }}
                        className="group/metrics p-1 transition-all duration-300"
                        title="View Metrics"
                      >
                        <svg className="w-4 h-4 text-slate-400 group-hover/metrics:text-green-500 group-hover/metrics:scale-110 transition-all duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </button>
                      <button
                        onClick={e => handleDeleteSong(song.id, e)}
                        className="group/delete p-1 transition-all duration-300"
                        title="Delete"
                      >
                        <svg className="w-4 h-4 text-slate-400 group-hover/delete:text-red-500 group-hover/delete:scale-110 transition-all duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <p className="text-sm md:text-base text-slate-700 truncate flex-1">{song.artist}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
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
                  <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(null)}>
          <div className="bg-white p-6 border border-slate-200 max-w-md w-full mx-4" style={{borderRadius: '4px'}} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-slate-900">
              Add New {showCreateModal.charAt(0).toUpperCase() + showCreateModal.slice(1)}
            </h3>
            <input
              type="text"
              placeholder={`Enter ${showCreateModal} name...`}
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 text-slate-900 focus:outline-none focus:border-purple-500 mb-4"
              style={{borderRadius: '4px'}}
              onKeyDown={e => e.key === 'Enter' && handleCreateItem()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCreateModal(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateItem}
                className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                style={{borderRadius: '4px'}}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}