'use client';

import { useState, useEffect } from 'react';
import { supabase, Song, LyricLine, Band, Album, Folder, getUserBands, getBandAlbums, getBandFolders, createAlbum, createFolder } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  song: Song | null;
  lyrics: LyricLine[];
  onLyricsChange: (lyrics: LyricLine[]) => void;
  onSongChange: (song: Song | null) => void;
  onBack?: () => void;
  showBackButton?: boolean;
}

export default function LyricEditor({ song, lyrics, onLyricsChange, onSongChange, onBack, showBackButton = false }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState<string>('');
  const [selectedBandId, setSelectedBandId] = useState<string>('');  const [availableBands, setAvailableBands] = useState<Band[]>([]);
  const [album, setAlbum] = useState<string>('');
  const [folder, setFolder] = useState<string>('');
  const [completed, setCompleted] = useState<boolean>(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState<string>('');
  const [soundcloudUrl, setSoundcloudUrl] = useState<string>('');
  const [instrumentalUrl, setInstrumentalUrl] = useState<string>('');
  const [rawLyrics, setRawLyrics] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<Folder[]>([]);
  const [availableAlbums, setAvailableAlbums] = useState<Album[]>([]);
  
  // Change tracking
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);
  
  // Drag and drop state
  const [draggedLine, setDraggedLine] = useState<LyricLine | null>(null);

  const defaultTags = ['confident', 'needs practice'];

  // Load bands on mount
  useEffect(() => {
    loadBands();
  }, [user]);

  const loadBands = async () => {
    if (user?.id) {
      const bands = await getUserBands(user.id);
      setAvailableBands(bands);
    }
  };

  // Load albums and folders when band changes
  useEffect(() => {
    if (selectedBandId) {
      loadBandData(selectedBandId);
    } else {
      setAvailableAlbums([]);
      setAvailableFolders([]);
    }
  }, [selectedBandId]);

  const loadBandData = async (bandId: string) => {
    const albums = await getBandAlbums(bandId);
    const folders = await getBandFolders(bandId);
    setAvailableAlbums(albums);
    setAvailableFolders(folders);
  };

  useEffect(() => {
    if (song) {
      const data = {
        title: song.title || '',
        selectedBandId: song.band_id || '',
        album: song.album_id || '',
        folder: song.folder_id || '',
        completed: song.completed || false,
        tags: song.tags || [],
        soundcloudUrl: song.soundcloud_url || '',
        instrumentalUrl: song.instrumental_url || ''
      };

      setTitle(data.title);
      setSelectedBandId(data.selectedBandId);
      setAlbum(data.album);
      setFolder(data.folder);
      setCompleted(data.completed);
      setTags(data.tags);
      setSoundcloudUrl(data.soundcloudUrl);
      setInstrumentalUrl(data.instrumentalUrl);
      setOriginalData(data);
    } else {
      const data = {
        title: '',
        selectedBandId: '',
        album: '',
        folder: '',
        completed: false,
        tags: [],
        soundcloudUrl: '',
        instrumentalUrl: ''
      };

      setTitle(data.title);
      setSelectedBandId(data.selectedBandId);
      setAlbum(data.album);
      setFolder(data.folder);
      setCompleted(data.completed);
      setTags(data.tags);
      setSoundcloudUrl(data.soundcloudUrl);
      setInstrumentalUrl(data.instrumentalUrl);
      setOriginalData(data);
    }

    if (lyrics.length > 0) {
      const lyricsText = lyrics.map(l => l.text).join('\n');
      setRawLyrics(lyricsText);
    } else {
      setRawLyrics('');
    }
    
    setHasChanges(false);
  }, [song, lyrics]);

  // Track changes
  useEffect(() => {
    if (!originalData) return;

    const currentData = {
      title,
      selectedBandId,
      album,
      folder,
      completed,
      tags,
      soundcloudUrl,
      instrumentalUrl
    };

    const hasFormChanges = JSON.stringify(currentData) !== JSON.stringify(originalData);
    const hasLyricChanges = rawLyrics !== (lyrics.length > 0 ? lyrics.map(l => l.text).join('\n') : '');

    setHasChanges(hasFormChanges || hasLyricChanges);
  }, [title, selectedBandId, album, folder, completed, tags, soundcloudUrl, instrumentalUrl, rawLyrics, originalData, lyrics]);


  // Drag and drop functions
  const handleDragStart = (e: React.DragEvent, line: LyricLine) => {
    setDraggedLine(line);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetLine: LyricLine) => {
    e.preventDefault();
    if (!draggedLine || draggedLine.id === targetLine.id) return;

    const newLyrics = [...lyrics];
    const draggedIndex = newLyrics.findIndex(l => l.id === draggedLine.id);
    const targetIndex = newLyrics.findIndex(l => l.id === targetLine.id);

    // Remove dragged item and insert at target position
    const [removed] = newLyrics.splice(draggedIndex, 1);
    newLyrics.splice(targetIndex, 0, removed);

    // Update line numbers
    const updatedLyrics = newLyrics.map((line, index) => ({
      ...line,
      line_number: index
    }));

    onLyricsChange(updatedLyrics);
    setRawLyrics(updatedLyrics.map(l => l.text).join('\n'));
    setDraggedLine(null);
  };

  // Cancel function
  const handleCancel = () => {
    if (!originalData) return;

    setTitle(originalData.title);
    setSelectedBandId(originalData.selectedBandId);
    setAlbum(originalData.album);
    setFolder(originalData.folder);
    setCompleted(originalData.completed);
    setTags(originalData.tags);
    setSoundcloudUrl(originalData.soundcloudUrl);
    setInstrumentalUrl(originalData.instrumentalUrl);

    if (lyrics.length > 0) {
      setRawLyrics(lyrics.map(l => l.text).join('\n'));
    } else {
      setRawLyrics('');
    }

    setHasChanges(false);
  };

  const handleAIFormat = async () => {
    if (!rawLyrics.trim()) {
      alert('Please enter lyrics first');
      return;
    }

    setAiLoading(true);
    try {
      
      const response = await fetch('/api/format-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics: rawLyrics }),
      });

      const data = await response.json();

      if (data.formattedLyrics) {
        setRawLyrics(data.formattedLyrics);
        alert('Lyrics formatted by AI!');
      }
    } catch (error) {
      console.error('Error formatting lyrics:', error);
      alert('Error formatting lyrics');
    } finally {
      setAiLoading(false);
    }
  };

  const handleBreakIntoLines = () => {
    
    const lines = rawLyrics
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const newLyrics: LyricLine[] = lines.map((text, index) => ({
      id: crypto.randomUUID(),
      song_id: song?.id || '',
      line_number: index,
      text,
      timestamp_ms: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    onLyricsChange(newLyrics);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a song title');
      return;
    }

    if (!selectedBandId) {
      alert('Please select a band before saving');
      return;
    }

    if (lyrics.length === 0) {
      alert('Please add and break lyrics into lines first');
      return;
    }

    if (!user?.id) {
      alert('Please log in to save songs');
      return;
    }

    setSaving(true);
    try {
      let songId = song?.id;

      const selectedBand = availableBands.find(b => b.id === selectedBandId);
      if (!selectedBand) {
        alert('Selected band not found');
        return;
      }

      if (song) {
        const { error } = await supabase
          .from('songs')
          .update({
            title,
            artist: selectedBand.name,
            album: album || null,
            folder: folder || null,
            band_id: selectedBandId,
            album_id: album || null,
            folder_id: folder || null,
            user_id: user.id,
            completed,
            tags,
            soundcloud_url: soundcloudUrl || null,
            instrumental_url: instrumentalUrl || null,
          })
          .eq('id', song.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('songs')
          .insert({
            title,
            artist: selectedBand.name,
            album: album || null,
            folder: folder || null,
            band_id: selectedBandId,
            album_id: album || null,
            folder_id: folder || null,
            user_id: user.id,
            completed,
            tags,
            soundcloud_url: soundcloudUrl || null,
            instrumental_url: instrumentalUrl || null,
          })
          .select()
          .single();

        if (error) throw error;
        songId = data.id;
        onSongChange(data);
      }

      await supabase.from('lyric_lines').delete().eq('song_id', songId);

      const lyricLines = lyrics.map((line, index) => ({
        song_id: songId,
        line_number: index,
        text: line.text,
        timestamp_ms: line.timestamp_ms,
      }));

      const { error: lyricsError } = await supabase.from('lyric_lines').insert(lyricLines);

      if (lyricsError) throw lyricsError;

      alert('Song saved successfully!');
    } catch (error) {
      console.error('Error saving song:', error);
      alert('Error saving song');
    } finally {
      setSaving(false);
    }
  };

  const updateLyricLine = (index: number, newText: string) => {
    const updatedLyrics = [...lyrics];
    updatedLyrics[index] = { ...updatedLyrics[index], text: newText };
    onLyricsChange(updatedLyrics);
  };

  const deleteLyricLine = (index: number) => {
    const updatedLyrics = lyrics.filter((_, i) => i !== index);
    onLyricsChange(updatedLyrics);
  };

  const addLineAfter = (index: number) => {
    const newLine: LyricLine = {
      id: crypto.randomUUID(),
      song_id: song?.id || '',
      line_number: index + 1,
      text: '',
      timestamp_ms: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedLyrics = [
      ...lyrics.slice(0, index + 1),
      newLine,
      ...lyrics.slice(index + 1),
    ];

    onLyricsChange(updatedLyrics);
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !tags.includes(tag.trim())) {
      setTags([...tags, tag.trim()]);
    }
    setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleNewTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(newTag);
    }
  };

  return (
    <div className="">
      <div  className="flex items-center gap-3 mb-6">
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            className="p-2 text-base-content/70 hover:text-purple-600 transition-all duration-200"
            title="Back"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="w-1 h-8 bg-purple-600" />
        <div className="flex-1">
          {editingTitle ? (
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => {
                if (e.key === 'Enter') setEditingTitle(false);
                if (e.key === 'Escape') {
                  setTitle(song?.title || '');
                  setEditingTitle(false);
                }
              }}
              className="text-xl md:text-2xl font-bold text-base-content bg-transparent border-b-2 border-primary focus:outline-hidden w-full"
              placeholder="Song title"
              autoFocus
            />
          ) : (
            <h2
              onClick={() => setEditingTitle(true)}
              className="text-xl md:text-2xl font-bold text-base-content cursor-pointer hover:text-primary transition-colors"
              title="Click to edit"
            >
              {title || 'New Song'}
            </h2>
          )}
        </div>
      </div>

      {/* Song Details Collapse */}
      <div className="mb-4 md:mb-6">
        <div className="collapse collapse-arrow bg-base-200 border border-base-300">
          <input type="checkbox" defaultChecked />
          <div className="collapse-title text-md font-semibold">
            Song Details
          </div>
          <div className="collapse-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pt-2">
              <div>
                <label className="block text-xs md:text-sm font-semibold text-base-content mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  Band
                </label>
                <select
                  value={selectedBandId}
                  onChange={e => setSelectedBandId(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="">Select a band</option>
                  {availableBands.map(band => (
                    <option key={band.id} value={band.id}>{band.name}</option>
                  ))}
                </select>
                {availableBands.length === 0 && (
                  <p className="text-xs text-base-content/60 mt-1">Create a band in Settings first</p>
                )}
              </div>
              <div>
                <label className="block text-xs md:text-sm font-semibold text-base-content mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                  </svg>
                  Album
                </label>
                <select
                  value={album}
                  onChange={e => setAlbum(e.target.value)}
                  className="select select-bordered w-full"
                  disabled={!selectedBandId}
                >
                  <option value="">No Album</option>
                  {availableAlbums.map(albumOption => (
                    <option key={albumOption.id} value={albumOption.id}>{albumOption.name}</option>
                  ))}
                </select>
                {!selectedBandId && (
                  <p className="text-xs text-base-content/60 mt-1">Select a band first</p>
                )}
              </div>
              <div>
                <label className="block text-xs md:text-sm font-semibold text-base-content mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25H11.69z" />
                  </svg>
                  Folder
                </label>
                <select
                  value={folder}
                  onChange={e => setFolder(e.target.value)}
                  className="select select-bordered w-full"
                  disabled={!selectedBandId}
                >
                  <option value="">No Folder</option>
                  {availableFolders.map(folderOption => (
                    <option key={folderOption.id} value={folderOption.id}>{folderOption.name}</option>
                  ))}
                </select>
                {!selectedBandId && (
                  <p className="text-xs text-base-content/60 mt-1">Select a band first</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs md:text-sm font-semibold text-base-content mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                  Tags
                </label>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {defaultTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => tags.includes(tag) ? removeTag(tag) : addTag(tag)}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all duration-300 ${
                          tags.includes(tag)
                            ? 'bg-purple-100 text-purple-700 border-purple-300 scale-105'
                            : 'bg-base-200 text-base-content border-base-300 hover:text-primary hover:border-primary'
                        }`}
                      >
                        {tags.includes(tag) && '✓ '}{tag}
                      </button>
                    ))}
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.filter(tag => !defaultTags.includes(tag)).map(tag => (
                        <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg border border-purple-300">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="group ml-1 p-0.5 rounded-sm transition-colors"
                          >
                            <svg className="w-3 h-3 text-purple-500 group-hover:text-purple-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyDown={handleNewTagKeyPress}
                      placeholder="Add custom tag..."
                      className="flex-1 px-3 py-2 bg-base-100 backdrop-blur-xs border border-base-300 rounded-xl focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => addTag(newTag)}
                      disabled={!newTag.trim() || tags.includes(newTag.trim())}
                      className="group px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      <svg className="w-5 h-5 text-base-content/50 group-hover:text-purple-400 group-hover:scale-110 transition-all duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs md:text-sm font-semibold text-base-content mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  SoundCloud Reference URL
                </label>
                <input
                  type="text"
                  value={soundcloudUrl}
                  onChange={e => setSoundcloudUrl(e.target.value)}
                  className="w-full px-3 md:px-4 py-2 bg-base-100 backdrop-blur-xs border border-base-300 rounded-xl focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm md:text-base transition-all duration-300"
                  placeholder="https://soundcloud.com/..."
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-semibold text-base-content mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  Instrumental URL
                </label>
                <input
                  type="text"
                  value={instrumentalUrl}
                  onChange={e => setInstrumentalUrl(e.target.value)}
                  className="w-full px-3 md:px-4 py-2 bg-base-100 backdrop-blur-xs border border-base-300 rounded-xl focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm md:text-base transition-all duration-300"
                  placeholder="https://soundcloud.com/..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {lyrics.length === 0 ? (
        <div>
          <label className="block text-xs md:text-sm font-semibold text-base-content mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Paste Lyrics
          </label>
          <textarea
            value={rawLyrics}
            onChange={e => setRawLyrics(e.target.value)}
            className="w-full h-48 md:h-64 px-3 md:px-4 py-2 bg-base-100 backdrop-blur-xs border border-base-300 rounded-xl focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-mono text-sm md:text-base transition-all duration-300"
            placeholder="Paste your lyrics here..."
          />
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAIFormat}
              disabled={aiLoading}
              className={`p-2 transition-all duration-200 ${
                aiLoading ? 'text-base-content/30' : 'text-base-content/70 hover:text-purple-600'
              }`}
              title={aiLoading ? 'Formatting...' : 'AI Format'}
            >
              {aiLoading ? (
                <svg className="w-7 h-7 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
            </button>
            <button
              onClick={handleBreakIntoLines}
              className="p-2 text-base-content/70 hover:text-purple-600 transition-all duration-200"
              title="Break into Lines"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-2">
            <label className="text-xs md:text-sm font-semibold text-base-content flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Lyric Lines ({lyrics.length})
            </label>
            <button
              onClick={() => {
                onLyricsChange([]);
              }}
              className="p-1 text-base-content/50 hover:text-red-600 transition-all duration-200"
              title="Reset & Re-import"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            {lyrics.map((line, index) => (
              <div
                key={line.id}
                draggable
                onDragStart={(e) => handleDragStart(e, line)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, line)}
                className={`flex gap-1 md:gap-2 items-center group p-2 transition-all duration-200 cursor-grab active:cursor-grabbing ${
                  draggedLine?.id === line.id ? 'opacity-50' : ''
                }`}
                style={{borderRadius: '4px'}}
              >
                {/* Drag handle */}
                <div className="p-1 text-base-content/40 hover:text-base-content/60 cursor-grab">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                </div>
                <span className="text-base-content/60 font-mono text-xs md:text-sm w-6 md:w-8 bg-base-200 px-2 py-1 border border-base-300" style={{borderRadius: '4px'}}>{index + 1}</span>
                <input
                  type="text"
                  value={line.text}
                  onChange={e => updateLyricLine(index, e.target.value)}
                  className="flex-1 px-2 md:px-3 py-1 md:py-2 bg-base-100 border border-base-300 focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs md:text-base transition-all duration-300"
                  style={{borderRadius: '4px'}}
                />
                <button
                  onClick={() => addLineAfter(index)}
                  className="p-1 text-base-content/50 hover:text-green-600 transition-all duration-200"
                  title="Add line after"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteLyricLine(index)}
                  className="p-1 text-base-content/50 hover:text-red-600 transition-all duration-200"
                  title="Delete line"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 md:mt-6 flex justify-end items-center gap-3">
        <button
          onClick={() => setCompleted(!completed)}
          className={`p-2 transition-all duration-200 ${
            completed
              ? 'text-green-600 hover:text-green-700'
              : 'text-base-content/70 hover:text-green-600'
          }`}
          title={completed ? 'Mark as Incomplete' : 'Mark as Completed'}
        >
          <span className="text-2xl">💯</span>
        </button>
        {hasChanges && (
          <button
            onClick={handleCancel}
            className="p-2 text-base-content/70 hover:text-red-600 transition-all duration-200"
            title="Cancel Changes"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`p-2 transition-all duration-200 ${
            saving || !hasChanges
              ? 'text-base-content/30'
              : 'text-purple-600 hover:text-purple-700'
          }`}
          title={saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes to Save'}
        >
          {saving ? (
            <svg className="w-7 h-7 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}