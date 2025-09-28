'use client';

import { useState, useEffect } from 'react';
import { Song, LyricLine, PracticeSession, LineTake, supabase } from '@/lib/supabase';

interface Props {
  song: Song | null;
  lyrics: LyricLine[];
  onBack?: () => void;
  showBackButton?: boolean;
  onSelectSong?: (song: Song, lyrics: LyricLine[]) => void;
}

interface SessionWithData extends PracticeSession {
  totalTakes?: number;
}

export default function SongMetrics({ song, lyrics, onBack, showBackButton = false, onSelectSong }: Props) {
  const [sessions, setSessions] = useState<SessionWithData[]>([]);
  const [takesPerLine, setTakesPerLine] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [selectedSongId, setSelectedSongId] = useState<string>('');
  const [albumFilter, setAlbumFilter] = useState<string>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAllSongs();
    if (song) {
      setSelectedSongId(song.id);
      loadMetrics();
    }
  }, [song]);

  const handleSelectSong = async (selectedSong: Song) => {
    const { data, error } = await supabase
      .from('lyric_lines')
      .select('*')
      .eq('song_id', selectedSong.id)
      .order('line_number', { ascending: true });

    if (error) {
      console.error('Error loading lyrics:', error);
      return;
    }

    onSelectSong?.(selectedSong, data || []);
  };

  // Get filter options
  const albums = Array.from(new Set(allSongs.map(song => song.album).filter(Boolean))) as string[];
  const folders = Array.from(new Set(allSongs.map(song => song.folder).filter(Boolean))) as string[];

  // Filter songs based on current filters
  const filteredSongs = allSongs.filter(song => {
    const matchesSearch = 
      song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (song.album && song.album.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (song.folder && song.folder.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAlbum = albumFilter === 'all' || song.album === albumFilter;
    const matchesFolder = folderFilter === 'all' || song.folder === folderFilter;

    return matchesSearch && matchesAlbum && matchesFolder;
  });

  const loadAllSongs = async () => {
    const { data } = await supabase
      .from('songs')
      .select('*');
    if (data) {
      setAllSongs(data);
    }
  };

  const loadMetrics = async () => {
    if (!song) return;

    setLoading(true);

    const { data: sessionsData } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('song_id', song.id)
      .order('started_at', { ascending: false });

    if (sessionsData) {
      const sessionsWithTakes = await Promise.all(
        sessionsData.map(async session => {
          const { data: takes } = await supabase
            .from('line_takes')
            .select('*')
            .eq('session_id', session.id);

          return {
            ...session,
            totalTakes: takes?.length || 0,
          };
        })
      );

      setSessions(sessionsWithTakes);

      const completed = new Set(
        sessionsData
          .filter(s => s.completed)
          .map(s => new Date(s.started_at).toDateString())
      );
      setCompletedDates(completed);
    }

    const takeCounts: Record<string, number> = {};
    for (const line of lyrics) {
      const { data: takes } = await supabase
        .from('line_takes')
        .select('*')
        .eq('lyric_line_id', line.id);

      takeCounts[line.id] = takes?.length || 0;
    }
    setTakesPerLine(takeCounts);

    setLoading(false);
  };

  const toggleCompletedDate = async (date: Date) => {
    const dateStr = date.toDateString();
    const newCompleted = new Set(completedDates);

    if (completedDates.has(dateStr)) {
      newCompleted.delete(dateStr);
    } else {
      newCompleted.add(dateStr);
    }

    setCompletedDates(newCompleted);

    if (!song) return;

    const existingSession = sessions.find(
      s => new Date(s.started_at).toDateString() === dateStr
    );

    if (existingSession) {
      await supabase
        .from('practice_sessions')
        .update({ completed: !completedDates.has(dateStr) })
        .eq('id', existingSession.id);
    } else {
      await supabase.from('practice_sessions').insert({
        song_id: song.id,
        completed: true,
      });
    }

    loadMetrics();
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0m';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
  };

  const getTotalPracticeTime = () => {
    return sessions.reduce((total, session) => total + (session.duration_seconds || 0), 0);
  };

  const getTotalTakes = () => {
    return Object.values(takesPerLine).reduce((total, count) => total + count, 0);
  };

  const getCompletedSongsCount = () => {
    return allSongs.filter(song => song.completed).length;
  };

  const renderCalendar = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(currentYear, currentMonth, day));
    }

    const monthName = firstDay.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
      <div className="bg-base-100 backdrop-blur-sm border border-base-300 rounded-2xl p-4 md:p-6 shadow-lg shadow-purple-500/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
          <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{monthName}</h3>
        </div>
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs md:text-sm font-semibold text-base-content/70 p-1 md:p-2">
              {day}
            </div>
          ))}
          {days.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="p-1 md:p-2" />;
            }

            const isCompleted = completedDates.has(day.toDateString());
            const isToday = day.toDateString() === today.toDateString();

            return (
              <button
                key={index}
                onClick={() => toggleCompletedDate(day)}
                className={`p-1 md:p-2 text-xs md:text-sm rounded-xl transition-all duration-300 ${
                  isCompleted
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold shadow-lg shadow-green-500/50 scale-110'
                    : isToday
                    ? 'bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-800 font-semibold border-2 border-blue-300'
                    : 'bg-base-100 text-base-content hover:text-primary hover:scale-105 hover:shadow-md'
                }`}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-xl">
          <p className="text-xs md:text-sm text-blue-800 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Click a day to mark as completed practice session
          </p>
        </div>
      </div>
    );
  };

  if (!song) {
    return (
      <div className="bg-base-100 shadow-lg border border-base-300 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="p-2 text-base-content/70 hover:text-primary transition-all duration-200"
              title="Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="w-1 h-8 bg-purple-600" />
          <h2 className="text-xl md:text-2xl font-bold text-base-content">Song Metrics</h2>
        </div>

        {/* Song Selection Interface */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <svg className="w-16 h-16 text-purple-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <h3 className="text-2xl font-bold text-base-content mb-2">Select a Song</h3>
            <p className="text-base-content/60">Choose a song to view its practice metrics and analytics</p>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search songs, artists, albums..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-base-100 border border-base-300 text-base-content focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                style={{borderRadius: '4px'}}
              />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
              </svg>
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={albumFilter}
                onChange={e => setAlbumFilter(e.target.value)}
                className="px-3 py-2 border border-base-300 bg-base-100 text-base-content text-sm focus:outline-none focus:border-purple-500"
                style={{borderRadius: '4px'}}
              >
                <option value="all">All Albums</option>
                {albums.map(album => (
                  <option key={album} value={album}>{album}</option>
                ))}
              </select>

              <select
                value={folderFilter}
                onChange={e => setFolderFilter(e.target.value)}
                className="px-3 py-2 border border-base-300 bg-base-100 text-base-content text-sm focus:outline-none focus:border-purple-500"
                style={{borderRadius: '4px'}}
              >
                <option value="all">All Folders</option>
                {folders.map(folder => (
                  <option key={folder} value={folder}>{folder}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Song Grid */}
          {filteredSongs.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-base-content/30 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
              <p className="text-base-content/60">No songs found</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSongs.map(songItem => (
                <div
                  key={songItem.id}
                  onClick={() => handleSelectSong(songItem)}
                  className="group border border-base-300 p-4 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 bg-base-100 hover:border-purple-300 cursor-pointer"
                  style={{borderRadius: '4px'}}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 text-purple-600 transition-colors" style={{borderRadius: '4px'}}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base-content truncate group-hover:text-purple-700 transition-colors">
                        {songItem.title}
                      </h4>
                      <p className="text-sm text-base-content/70 truncate">{songItem.artist}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-base-content/60">
                        {songItem.album && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 border border-blue-200" style={{borderRadius: '4px'}}>
                            {songItem.album}
                          </span>
                        )}
                        {songItem.folder && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 border border-orange-200" style={{borderRadius: '4px'}}>
                            📁 {songItem.folder}
                          </span>
                        )}
                        {songItem.completed && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 border border-green-200" style={{borderRadius: '4px'}}>
                            ✓ Complete
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-base-100 backdrop-blur-sm rounded-2xl shadow-lg shadow-purple-500/10 border border-base-300 p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Song Metrics</h2>
        </div>
        <div className="text-center py-12">
          <svg className="w-8 h-8 text-purple-500 mx-auto mb-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-base-content/60">Loading metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-100 shadow-lg border border-base-300 p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            className="p-2 text-base-content/70 hover:text-primary transition-all duration-200"
            title="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="w-1 h-8 bg-purple-600" />
        <h2 className="text-xl md:text-2xl font-bold text-base-content">
          Metrics: {song.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="group bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200/50 rounded-2xl p-4 md:p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-gradient-to-b from-emerald-500 to-green-500 rounded-full" />
            <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
            {getCompletedSongsCount()}/{allSongs.length}
          </div>
          <div className="text-sm md:text-base text-emerald-600 mt-1 font-medium">Completed Songs</div>
        </div>
        <div className="group bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200/50 rounded-2xl p-4 md:p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
            <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {formatDuration(getTotalPracticeTime())}
          </div>
          <div className="text-sm md:text-base text-purple-600 mt-1 font-medium">Total Practice Time</div>
        </div>
        <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50 rounded-2xl p-4 md:p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full" />
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{sessions.length}</div>
          <div className="text-sm md:text-base text-blue-600 mt-1 font-medium">Practice Sessions</div>
        </div>
        <div className="group bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/50 rounded-2xl p-4 md:p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full" />
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{getTotalTakes()}</div>
          <div className="text-sm md:text-base text-green-600 mt-1 font-medium">Total Takes</div>
        </div>
      </div>

      <div className="mb-6 md:mb-8">{renderCalendar()}</div>

      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
          <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Takes Per Line</h3>
        </div>
        <div className="bg-base-100 backdrop-blur-sm border border-base-300 rounded-2xl p-4 shadow-lg shadow-purple-500/10">
          {lyrics.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-base-content/30 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-base-content/60">No lyrics added yet</p>
            </div>
          ) : (
            <>
              <div className="mb-6 h-64 md:h-80 relative">
                <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#9333ea', stopOpacity: 0.8 }} />
                      <stop offset="100%" style={{ stopColor: '#9333ea', stopOpacity: 0.2 }} />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width="800" height="300" fill="#f8fafc" />
                  <line x1="0" y1="250" x2="800" y2="250" stroke="#cbd5e1" strokeWidth="2" />
                  {lyrics.map((line, index) => {
                    const takes = takesPerLine[line.id] || 0;
                    const maxTakes = Math.max(...Object.values(takesPerLine), 1);
                    const barHeight = (takes / maxTakes) * 200;
                    const barWidth = 800 / lyrics.length;
                    const x = index * barWidth;
                    const y = 250 - barHeight;

                    return (
                      <g key={line.id}>
                        <rect
                          x={x + barWidth * 0.1}
                          y={y}
                          width={barWidth * 0.8}
                          height={barHeight}
                          fill="url(#gradient)"
                          stroke="#9333ea"
                          strokeWidth="1"
                        />
                        <text
                          x={x + barWidth / 2}
                          y={270}
                          textAnchor="middle"
                          fill="#475569"
                          fontSize="10"
                        >
                          {index + 1}
                        </text>
                        {takes > 0 && (
                          <text
                            x={x + barWidth / 2}
                            y={y - 5}
                            textAnchor="middle"
                            fill="#9333ea"
                            fontSize="12"
                            fontWeight="bold"
                          >
                            {takes}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lyrics.map(line => {
                  const takes = takesPerLine[line.id] || 0;
                  const maxTakes = Math.max(...Object.values(takesPerLine), 1);
                  const percentage = (takes / maxTakes) * 100;

                  return (
                    <div key={line.id} className="group flex flex-col md:flex-row md:items-center gap-2 p-3 bg-base-100 rounded-xl border border-base-300 hover:shadow-md transition-all duration-300">
                      <div className="flex-1 text-xs md:text-sm text-base-content truncate font-medium">
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-xs font-semibold mr-2">
                          {line.line_number + 1}
                        </span>
                        {line.text}
                      </div>
                      <div className="flex items-center gap-2 md:w-48">
                        <div className="flex-1 bg-base-300 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500 ease-out shadow-inner"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs md:text-sm font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-lg min-w-[2rem] text-center">
                          {takes}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
          <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Practice Time Trend</h3>
        </div>
        <div className="bg-base-100 backdrop-blur-sm border border-base-300 rounded-2xl p-4 shadow-lg shadow-purple-500/10">
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-base-content/30 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <p className="text-base-content/60">No practice sessions yet</p>
            </div>
          ) : (
            <div className="h-48 md:h-64 relative">
              <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="800" height="200" fill="#f8fafc" />
                <line x1="0" y1="180" x2="800" y2="180" stroke="#cbd5e1" strokeWidth="2" />
                {sessions.length > 1 && (() => {
                  const maxDuration = Math.max(...sessions.map(s => s.duration_seconds || 0), 1);
                  const points = sessions
                    .slice()
                    .reverse()
                    .map((session, index) => {
                      const x = (index / (sessions.length - 1)) * 780 + 10;
                      const duration = session.duration_seconds || 0;
                      const y = 180 - (duration / maxDuration) * 150;
                      return { x, y, duration };
                    });

                  const pathData = points
                    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
                    .join(' ');

                  const areaPath = `${pathData} L ${points[points.length - 1].x} 180 L ${points[0].x} 180 Z`;

                  return (
                    <>
                      <path
                        d={areaPath}
                        fill="url(#lineGradient)"
                        fillOpacity="0.2"
                      />
                      <path
                        d={pathData}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {points.map((point, index) => (
                        <g key={index}>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill="#8b5cf6"
                            stroke="white"
                            strokeWidth="2"
                          />
                          <text
                            x={point.x}
                            y={point.y - 10}
                            textAnchor="middle"
                            fill="#475569"
                            fontSize="10"
                            fontWeight="bold"
                          >
                            {formatDuration(point.duration)}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
          <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Practice History</h3>
        </div>
        <div className="bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-4 max-h-48 md:max-h-64 overflow-y-auto shadow-lg shadow-purple-500/10">
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-base-content/30 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <p className="text-base-content/60">No practice sessions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className="group flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 bg-base-100 rounded-xl border border-base-300 hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                    <div className="text-xs md:text-sm text-base-content font-medium">
                      {new Date(session.started_at).toLocaleDateString()} {new Date(session.started_at).toLocaleTimeString()}
                    </div>
                    {session.completed && (
                      <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-xl text-xs font-semibold border border-green-200/50">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs md:text-sm">
                    <span className="text-base-content/70 bg-base-200 px-2 py-1 rounded-lg font-medium">
                      <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatDuration(session.duration_seconds)}
                    </span>
                    <span className="text-base-content/70 bg-base-200 px-2 py-1 rounded-lg font-medium">
                      <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      {session.totalTakes || 0} takes
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}