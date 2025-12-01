'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AudioUploader from './AudioUploader';

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

type Band = {
  _id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type Album = {
  _id: string;
  band_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type Folder = {
  _id: string;
  band_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type TagConfig = {
  _id: string;
  user_id: string;
  tag_name: string;
  color: string;
  created_at: string;
  updated_at: string;
};

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
  const [soundcloudUrl, setSoundcloudUrl] = useState<string>('');
  const [instrumentalUrl, setInstrumentalUrl] = useState<string>('');
  const [rawLyrics, setRawLyrics] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [smartProcessing, setSmartProcessing] = useState(false);
  const [showProcessSuggestion, setShowProcessSuggestion] = useState(false);
  const [processSuggestionReason, setProcessSuggestionReason] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<Folder[]>([]);
  const [availableAlbums, setAvailableAlbums] = useState<Album[]>([]);

  // Create modals
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('purple');
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);

  // Tag configs
  const [availableTagConfigs, setAvailableTagConfigs] = useState<TagConfig[]>([]);

  // Change tracking
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);
  const [originalLyricsText, setOriginalLyricsText] = useState<string>('');
  const [editedLineIndices, setEditedLineIndices] = useState<Set<number>>(new Set());

  // Collapsible lyric lines
  const [lyricsCollapsed, setLyricsCollapsed] = useState(false);

  // Drag and drop state
  const [draggedLine, setDraggedLine] = useState<LyricLine | null>(null);

  // Input mode: 'upload' (MP3) or 'paste' (manual text)
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');

  // Audio URL from upload
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);

  const defaultTags = ['confident', 'needs practice'];
  const tagColors = ['purple', 'blue', 'green', 'red', 'orange', 'pink', 'cyan', 'yellow'];

  // Load bands and tag configs on mount
  useEffect(() => {
    loadBands();
    loadTagConfigs();
  }, [user]);

  const loadBands = async () => {
    if (user?.id) {
      try {
        const response = await fetch('/api/bands');
        if (response.ok) {
          const bands = await response.json();
          setAvailableBands(bands);
        }
      } catch (error) {
        console.error('Error loading bands:', error);
      }
    }
  };

  const loadTagConfigs = async () => {
    if (user?.id) {
      try {
        const response = await fetch('/api/tags');
        if (response.ok) {
          const configs = await response.json();
          setAvailableTagConfigs(configs);
        }
      } catch (error) {
        console.error('Error loading tag configs:', error);
      }
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
    try {
      const [albumsRes, foldersRes] = await Promise.all([
        fetch(`/api/albums?bandId=${bandId}`),
        fetch(`/api/folders?bandId=${bandId}`)
      ]);

      if (albumsRes.ok) {
        const albums = await albumsRes.json();
        setAvailableAlbums(albums);
      }

      if (foldersRes.ok) {
        const folders = await foldersRes.json();
        setAvailableFolders(folders);
      }
    } catch (error) {
      console.error('Error loading band data:', error);
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim() || !selectedBandId) return;

    setCreatingAlbum(true);
    try {
      const response = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandId: selectedBandId,
          name: newAlbumName.trim()
        })
      });

      if (response.ok) {
        const newAlbum = await response.json();
        setAvailableAlbums(prev => [...prev, newAlbum]);
        setAlbum(newAlbum._id);
        setShowCreateAlbumModal(false);
        setNewAlbumName('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create album');
      }
    } catch (error) {
      console.error('Error creating album:', error);
      alert('Failed to create album');
    } finally {
      setCreatingAlbum(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !selectedBandId) return;

    setCreatingFolder(true);
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandId: selectedBandId,
          name: newFolderName.trim()
        })
      });

      if (response.ok) {
        const newFolder = await response.json();
        setAvailableFolders(prev => [...prev, newFolder]);
        setFolder(newFolder._id);
        setShowCreateFolderModal(false);
        setNewFolderName('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setCreatingTag(true);
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag_name: newTagName.trim(),
          color: newTagColor
        })
      });

      if (response.ok) {
        const newTag = await response.json();
        setAvailableTagConfigs(prev => [...prev, newTag]);
        // Also add the tag to the current song's tags
        if (!tags.includes(newTag.tag_name)) {
          setTags([...tags, newTag.tag_name]);
        }
        setShowCreateTagModal(false);
        setNewTagName('');
        setNewTagColor('purple');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create tag');
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      alert('Failed to create tag');
    } finally {
      setCreatingTag(false);
    }
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

    const lyricsText = lyrics.length > 0 ? lyrics.map(l => l.text).join('\n') : '';
    setRawLyrics(lyricsText);
    setOriginalLyricsText(lyricsText);
    setEditedLineIndices(new Set());
    setLyricsCollapsed(false);

    setHasChanges(false);
  }, [song?._id]); // Only reset when song ID changes, not on every lyrics update

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

    // Check lyrics changes - compare current lyrics text with original
    const currentLyricsText = lyrics.length > 0 ? lyrics.map(l => l.text).join('\n') : rawLyrics;
    const hasLyricChanges = currentLyricsText !== originalLyricsText;

    setHasChanges(hasFormChanges || hasLyricChanges);
  }, [title, selectedBandId, album, folder, completed, tags, soundcloudUrl, instrumentalUrl, rawLyrics, originalData, lyrics, originalLyricsText]);


  // Check if lyrics need processing when they change significantly
  const checkIfNeedsProcessing = async (text: string) => {
    if (!text || text.trim().length < 50) {
      setShowProcessSuggestion(false);
      return;
    }

    try {
      const response = await fetch('/api/lyrics/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics: text, mode: 'check' }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.needsProcessing) {
          setShowProcessSuggestion(true);
          setProcessSuggestionReason(data.reason || 'Lyrics may benefit from AI formatting');
        } else {
          setShowProcessSuggestion(false);
        }
      }
    } catch (error) {
      console.error('Error checking lyrics:', error);
    }
  };

  // Handle paste event for auto-detection
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    // Check after a short delay to allow the state to update
    setTimeout(() => {
      checkIfNeedsProcessing(pastedText);
    }, 100);
  };

  // Smart AI processing with enhanced analysis
  const handleSmartProcess = async () => {
    if (!rawLyrics.trim()) {
      alert('Please enter lyrics first');
      return;
    }

    setSmartProcessing(true);
    try {
      const response = await fetch('/api/lyrics/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lyrics: rawLyrics,
          mode: 'full',
          options: {
            maxLineLength: 60,
            addSectionMarkers: true,
            optimizeForTeleprompter: true,
          },
        }),
      });

      const data = await response.json();

      if (data.formattedLyrics) {
        setRawLyrics(data.formattedLyrics);
        setShowProcessSuggestion(false);

        // Show processing stats
        const stats = data.processed?.metadata;
        if (stats) {
          alert(`Lyrics processed!\n• ${stats.totalLines} lines\n• Average ${stats.averageLineLength} chars/line\n• Structure detected: ${stats.hasExistingStructure ? 'Yes' : 'Added'}`);
        } else {
          alert('Lyrics processed with AI!');
        }
      }
    } catch (error) {
      console.error('Error processing lyrics:', error);
      alert('Error processing lyrics');
    } finally {
      setSmartProcessing(false);
    }
  };

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
    if (!draggedLine || draggedLine._id === targetLine._id) return;

    const newLyrics = [...lyrics];
    const draggedIndex = newLyrics.findIndex(l => l._id === draggedLine._id);
    const targetIndex = newLyrics.findIndex(l => l._id === targetLine._id);

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
      _id: crypto.randomUUID(),
      song_id: song?._id || '',
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
      let songId = song?._id;

      const selectedBand = availableBands.find(b => b._id === selectedBandId);
      if (!selectedBand) {
        alert('Selected band not found');
        return;
      }

      const selectedFolder = availableFolders.find(f => f._id === folder);
      const selectedAlbum = availableAlbums.find(a => a._id === album);

      const songData = {
        title,
        artist: selectedBand.name,
        album: selectedAlbum?.name || null,
        folder: selectedFolder?.name || null,
        band_id: selectedBandId,
        album_id: album || null,
        folder_id: folder || null,
        completed,
        tags,
        soundcloud_url: soundcloudUrl || null,
        instrumental_url: instrumentalUrl || null,
      };

      if (song) {
        // Update existing song
        const updatePayload = { id: song._id, ...songData };
        console.log('Updating song with payload:', updatePayload);

        const response = await fetch('/api/songs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Update song error:', response.status, errorData);
          throw new Error(errorData.error || 'Failed to update song');
        }
      } else {
        // Create new song
        const response = await fetch('/api/songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(songData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Create song error:', response.status, errorData);
          throw new Error(errorData.error || 'Failed to create song');
        }

        const newSong = await response.json();
        songId = newSong._id;
        onSongChange(newSong);
      }

      // Save lyrics
      const lyricLines = lyrics.map((line, index) => ({
        line_number: index,
        text: line.text,
        timestamp_ms: line.timestamp_ms,
      }));

      const lyricsResponse = await fetch('/api/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, lines: lyricLines }),
      });

      if (!lyricsResponse.ok) throw new Error('Failed to save lyrics');

      // Update original data to reflect saved state
      setOriginalData({
        title,
        selectedBandId,
        album,
        folder,
        completed,
        tags,
        soundcloudUrl,
        instrumentalUrl
      });
      // Also update the original lyrics text to reflect saved state
      const savedLyricsText = lyrics.map(l => l.text).join('\n');
      setOriginalLyricsText(savedLyricsText);
      setEditedLineIndices(new Set());
      setHasChanges(false);

      alert('Song saved successfully!');
    } catch (error) {
      console.error('Error saving song:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error saving song';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const updateLyricLine = (index: number, newText: string) => {
    const updatedLyrics = [...lyrics];
    updatedLyrics[index] = { ...updatedLyrics[index], text: newText };
    onLyricsChange(updatedLyrics);

    // Track this line as edited
    setEditedLineIndices(prev => new Set(prev).add(index));
  };

  const deleteLyricLine = (index: number) => {
    const updatedLyrics = lyrics.filter((_, i) => i !== index);
    onLyricsChange(updatedLyrics);
  };

  const addLineAfter = (index: number) => {
    const newLine: LyricLine = {
      _id: crypto.randomUUID(),
      song_id: song?._id || '',
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

  // Handle lyrics from AudioUploader
  const handleAudioLyricsReady = (
    extractedLyrics: string,
    processedLyrics?: { lines: Array<{ text: string; lineNumber: number; section?: string }> },
    audioUrl?: string
  ) => {
    // Store the audio URL for potential playback
    if (audioUrl) {
      setUploadedAudioUrl(audioUrl);
      // Also set as instrumental URL if no soundcloud URL is set
      if (!soundcloudUrl) {
        setInstrumentalUrl(audioUrl);
      }
    }

    // Set the raw lyrics text
    setRawLyrics(extractedLyrics);

    // Convert to lyric lines
    const lines = extractedLyrics
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const newLyrics: LyricLine[] = lines.map((text, index) => ({
      _id: crypto.randomUUID(),
      song_id: song?._id || '',
      line_number: index,
      text,
      timestamp_ms: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    onLyricsChange(newLyrics);
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !tags.includes(tag.trim())) {
      setTags([...tags, tag.trim()]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
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
                    <option key={band._id} value={band._id}>{band.name}</option>
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
                <div className="flex gap-2">
                  <select
                    value={album}
                    onChange={e => setAlbum(e.target.value)}
                    className="select select-bordered flex-1"
                    disabled={!selectedBandId}
                  >
                    <option value="">No Album</option>
                    {availableAlbums.map(albumOption => (
                      <option key={albumOption._id} value={albumOption._id}>{albumOption.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCreateAlbumModal(true)}
                    disabled={!selectedBandId}
                    className="btn btn-square btn-ghost text-primary disabled:text-base-content/30"
                    title={selectedBandId ? 'Create New Album' : 'Select a band first'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
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
                <div className="flex gap-2">
                  <select
                    value={folder}
                    onChange={e => setFolder(e.target.value)}
                    className="select select-bordered flex-1"
                    disabled={!selectedBandId}
                  >
                    <option value="">No Folder</option>
                    {availableFolders.map(folderOption => (
                      <option key={folderOption._id} value={folderOption._id}>{folderOption.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCreateFolderModal(true)}
                    disabled={!selectedBandId}
                    className="btn btn-square btn-ghost text-primary disabled:text-base-content/30"
                    title={selectedBandId ? 'Create New Folder' : 'Select a band first'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
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
                  {/* Default Tags */}
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
                  {/* User-configured Tags */}
                  {availableTagConfigs.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {availableTagConfigs.map(config => {
                        const isSelected = tags.includes(config.tag_name);
                        const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
                          purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
                          blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
                          green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
                          red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
                          orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
                          pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
                          cyan: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
                          yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
                        };
                        const colors = colorClasses[config.color] || colorClasses.purple;
                        return (
                          <button
                            key={config._id}
                            type="button"
                            onClick={() => isSelected ? removeTag(config.tag_name) : addTag(config.tag_name)}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all duration-300 ${
                              isSelected
                                ? `${colors.bg} ${colors.text} ${colors.border} scale-105`
                                : 'bg-base-200 text-base-content border-base-300 hover:text-primary hover:border-primary'
                            }`}
                          >
                            {isSelected && '✓ '}{config.tag_name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {/* Add custom tags that aren't in defaults or configs */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags
                        .filter(tag =>
                          !defaultTags.includes(tag) &&
                          !availableTagConfigs.some(c => c.tag_name === tag)
                        )
                        .map(tag => (
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
                  {/* Create new tag button */}
                  <button
                    type="button"
                    onClick={() => setShowCreateTagModal(true)}
                    className="btn btn-sm btn-outline btn-primary gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Tag
                  </button>
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
          {/* Input Mode Toggle */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setInputMode('upload')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                inputMode === 'upload'
                  ? 'bg-purple-600 text-white'
                  : 'bg-base-200 text-base-content/70 hover:bg-base-300'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v11.25" />
              </svg>
              <span className="text-sm font-medium">Upload MP3</span>
            </button>
            <button
              onClick={() => setInputMode('paste')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                inputMode === 'paste'
                  ? 'bg-purple-600 text-white'
                  : 'bg-base-200 text-base-content/70 hover:bg-base-300'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium">Paste Lyrics</span>
            </button>
          </div>

          {/* MP3 Upload Mode */}
          {inputMode === 'upload' && (
            <div>
              <AudioUploader
                onLyricsReady={handleAudioLyricsReady}
                onCancel={() => setInputMode('paste')}
                songTitle={title}
                artistName={availableBands.find(b => b._id === selectedBandId)?.name}
              />
              <p className="text-xs text-base-content/50 text-center mt-4">
                Upload your song and AI will extract and format the lyrics automatically
              </p>
            </div>
          )}

          {/* Manual Paste Mode */}
          {inputMode === 'paste' && (
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
                onPaste={handlePaste}
                className="w-full h-48 md:h-64 px-3 md:px-4 py-2 bg-base-100 backdrop-blur-xs border border-base-300 rounded-xl focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-mono text-sm md:text-base transition-all duration-300"
                placeholder="Paste your lyrics here..."
              />
              {showProcessSuggestion && (
                <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-800">AI Processing Recommended</p>
                    <p className="text-xs text-purple-600">{processSuggestionReason}</p>
                  </div>
                  <button
                    onClick={handleSmartProcess}
                    disabled={smartProcessing}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {smartProcessing ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Smart Process
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowProcessSuggestion(false)}
                    className="p-1 text-purple-400 hover:text-purple-600 transition-colors"
                    title="Dismiss"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              <div className="flex gap-2 mt-4 items-center">
                <button
                  onClick={handleSmartProcess}
                  disabled={smartProcessing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    smartProcessing
                      ? 'bg-purple-100 text-purple-400'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                  title={smartProcessing ? 'Processing...' : 'Smart AI Process - Analyzes structure, adds sections, optimizes for teleprompter'}
                >
                  {smartProcessing ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  )}
                  <span className="text-sm font-medium">{smartProcessing ? 'Processing...' : 'Smart Process'}</span>
                </button>
                <div className="h-6 w-px bg-base-300" />
                <button
                  onClick={handleAIFormat}
                  disabled={aiLoading}
                  className={`p-2 transition-all duration-200 ${
                    aiLoading ? 'text-base-content/30' : 'text-base-content/70 hover:text-purple-600'
                  }`}
                  title={aiLoading ? 'Formatting...' : 'Quick AI Format'}
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
          )}
        </div>
      ) : (
        <div>
          <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-2">
            <button
              onClick={() => setLyricsCollapsed(!lyricsCollapsed)}
              className="flex items-center gap-2 text-xs md:text-sm font-semibold text-base-content hover:text-primary transition-colors"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${lyricsCollapsed ? '' : 'rotate-90'}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Lyric Lines ({lyrics.length})
              {editedLineIndices.size > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                  {editedLineIndices.size} edited
                </span>
              )}
            </button>
            <button
              onClick={() => {
                onLyricsChange([]);
                setEditedLineIndices(new Set());
              }}
              className="p-1 text-base-content/50 hover:text-red-600 transition-all duration-200"
              title="Reset & Re-import"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          {!lyricsCollapsed && (
            <div className="space-y-2">
              {lyrics.map((line, index) => (
                <div
                  key={line._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, line)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, line)}
                  className={`flex gap-1 md:gap-2 items-center group p-2 transition-all duration-200 cursor-grab active:cursor-grabbing ${
                    draggedLine?._id === line._id ? 'opacity-50' : ''
                  }`}
                  style={{borderRadius: '4px'}}
                >
                  {/* Drag handle */}
                  <div className="p-1 text-base-content/40 hover:text-base-content/60 cursor-grab">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                  </div>
                  <span
                    className={`font-mono text-xs md:text-sm w-6 md:w-8 px-2 py-1 border text-center transition-all duration-200 ${
                      editedLineIndices.has(index)
                        ? 'bg-amber-400 text-amber-900 border-amber-500 font-bold shadow-sm shadow-amber-300'
                        : 'bg-base-200 text-base-content/60 border-base-300'
                    }`}
                    style={{borderRadius: '4px'}}
                    title={editedLineIndices.has(index) ? 'This line has been edited' : ''}
                  >
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={line.text}
                    onChange={e => updateLyricLine(index, e.target.value)}
                    className={`flex-1 px-2 md:px-3 py-1 md:py-2 bg-base-100 border focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-xs md:text-base transition-all duration-300 ${
                      editedLineIndices.has(index) ? 'border-amber-300' : 'border-base-300'
                    }`}
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
          )}
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

      {/* Create Album Modal */}
      {showCreateAlbumModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Create New Album</h3>
            <div className="py-4">
              <input
                type="text"
                placeholder="Album name..."
                value={newAlbumName}
                onChange={e => setNewAlbumName(e.target.value)}
                className="input input-bordered w-full"
                onKeyDown={e => e.key === 'Enter' && handleCreateAlbum()}
                autoFocus
              />
            </div>
            <div className="modal-action">
              <button
                onClick={() => {
                  setShowCreateAlbumModal(false);
                  setNewAlbumName('');
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAlbum}
                disabled={creatingAlbum || !newAlbumName.trim()}
                className="btn btn-primary"
              >
                {creatingAlbum ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowCreateAlbumModal(false)} />
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Create New Folder</h3>
            <div className="py-4">
              <input
                type="text"
                placeholder="Folder name..."
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                className="input input-bordered w-full"
                onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                autoFocus
              />
            </div>
            <div className="modal-action">
              <button
                onClick={() => {
                  setShowCreateFolderModal(false);
                  setNewFolderName('');
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}
                className="btn btn-primary"
              >
                {creatingFolder ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowCreateFolderModal(false)} />
        </div>
      )}

      {/* Create Tag Modal */}
      {showCreateTagModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Create New Tag</h3>
            <div className="py-4 space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">Tag Name</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter tag name..."
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  className="input input-bordered w-full"
                  onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Tag Color</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {tagColors.map(color => {
                    const colorBg: Record<string, string> = {
                      purple: 'bg-purple-500',
                      blue: 'bg-blue-500',
                      green: 'bg-green-500',
                      red: 'bg-red-500',
                      orange: 'bg-orange-500',
                      pink: 'bg-pink-500',
                      cyan: 'bg-cyan-500',
                      yellow: 'bg-yellow-500',
                    };
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewTagColor(color)}
                        className={`w-8 h-8 rounded-full ${colorBg[color]} transition-all ${
                          newTagColor === color
                            ? 'ring-2 ring-offset-2 ring-primary scale-110'
                            : 'hover:scale-105'
                        }`}
                        title={color}
                      />
                    );
                  })}
                </div>
              </div>
              {/* Preview */}
              {newTagName.trim() && (
                <div>
                  <label className="label">
                    <span className="label-text">Preview</span>
                  </label>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-lg border bg-${newTagColor}-100 text-${newTagColor}-700 border-${newTagColor}-300`}>
                    {newTagName.trim()}
                  </span>
                </div>
              )}
            </div>
            <div className="modal-action">
              <button
                onClick={() => {
                  setShowCreateTagModal(false);
                  setNewTagName('');
                  setNewTagColor('purple');
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTag}
                disabled={creatingTag || !newTagName.trim()}
                className="btn btn-primary"
              >
                {creatingTag ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowCreateTagModal(false)} />
        </div>
      )}
    </div>
  );
}