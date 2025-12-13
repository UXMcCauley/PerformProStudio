'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AudioUploader from './AudioUploader';

type ContentType = 'lyrics' | 'script' | 'podcast' | 'speech';

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
  content_type: ContentType;
  my_character_id: string | null;
  episode_number: number | null;
  duration_target_minutes: number | null;
  created_at: string;
  updated_at: string;
};

type LineType = 'lyric' | 'dialogue' | 'stage_direction' | 'talking_point' | 'question' | 'segment_header' | 'cue' | 'emphasis' | 'pause';

type CharacterRole = 'performer' | 'director' | 'narrator' | 'crew' | 'host' | 'guest';

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

type Character = {
  _id: string;
  song_id: string;
  name: string;
  color: string;
  voice_id: string | null;
  is_user: boolean;
  role: CharacterRole;
  display_order: number;
  created_at: string;
  updated_at: string;
};

type GroupContentType = 'band' | 'production' | 'podcast' | 'organization';

type Band = {
  _id: string;
  user_id: string;
  name: string;
  content_type?: GroupContentType;
  created_at: string;
  updated_at: string;
};

// Map song content type to group content type
const CONTENT_TYPE_TO_GROUP: Record<ContentType, GroupContentType> = {
  lyrics: 'band',
  script: 'production',
  podcast: 'podcast',
  speech: 'organization',
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

type TimedLine = {
  text: string;
  startMs: number;
  endMs: number;
};

interface Props {
  song: Song | null;
  lyrics: LyricLine[];
  onLyricsChange: (lyrics: LyricLine[]) => void;
  onSongChange: (song: Song | null) => void;
  onBack?: () => void;
  showBackButton?: boolean;
  initialContentType?: ContentType;
}

// Content type labels and field names
const CONTENT_TYPE_LABELS: Record<ContentType, {
  singular: string;
  plural: string;
  lineLabel: string;
  bandLabel: string;
  bandPlaceholder: string;
  bandHint: string;
  albumLabel: string;
  albumPlaceholder: string;
  folderLabel: string;
}> = {
  lyrics: {
    singular: 'Song',
    plural: 'Songs',
    lineLabel: 'Lyrics',
    bandLabel: 'Band',
    bandPlaceholder: 'Select a band',
    bandHint: 'Create a band in Settings first',
    albumLabel: 'Album',
    albumPlaceholder: 'No Album',
    folderLabel: 'Folder',
  },
  script: {
    singular: 'Script',
    plural: 'Scripts',
    lineLabel: 'Lines',
    bandLabel: 'Cast / Production Team',
    bandPlaceholder: 'Select a production team',
    bandHint: 'Create a production team in Settings first',
    albumLabel: 'Production',
    albumPlaceholder: 'No Production',
    folderLabel: 'Project',
  },
  podcast: {
    singular: 'Episode',
    plural: 'Episodes',
    lineLabel: 'Notes',
    bandLabel: 'Podcast Show',
    bandPlaceholder: 'Select a podcast show',
    bandHint: 'Create a podcast show in Settings first',
    albumLabel: 'Season',
    albumPlaceholder: 'No Season',
    folderLabel: 'Category',
  },
  speech: {
    singular: 'Speech',
    plural: 'Speeches',
    lineLabel: 'Content',
    bandLabel: 'Organization',
    bandPlaceholder: 'Select an organization',
    bandHint: 'Create an organization in Settings first',
    albumLabel: 'Event / Series',
    albumPlaceholder: 'No Event',
    folderLabel: 'Topic',
  },
};

// Role options for different content types
const ROLE_OPTIONS: Record<ContentType, { roles: CharacterRole[]; labels: Record<CharacterRole, string> }> = {
  lyrics: {
    roles: ['performer'],
    labels: { performer: 'Performer', director: 'Director', narrator: 'Narrator', crew: 'Crew', host: 'Host', guest: 'Guest' },
  },
  script: {
    roles: ['performer', 'director', 'narrator', 'crew'],
    labels: { performer: 'Actor', director: 'Director', narrator: 'Narrator', crew: 'Crew/Stage', host: 'Host', guest: 'Guest' },
  },
  podcast: {
    roles: ['host', 'guest', 'narrator'],
    labels: { performer: 'Speaker', director: 'Producer', narrator: 'Narrator', crew: 'Crew', host: 'Host', guest: 'Guest' },
  },
  speech: {
    roles: ['performer', 'narrator'],
    labels: { performer: 'Speaker', director: 'Coach', narrator: 'Narrator', crew: 'Support', host: 'Host', guest: 'Guest' },
  },
};

export default function LyricEditor({ song, lyrics, onLyricsChange, onSongChange, onBack, showBackButton = false, initialContentType = 'lyrics' }: Props) {
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

  // Audio URL from upload
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);

  // Audio file upload state (for "audio only" mode - no lyrics extraction)
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUploading, setAudioUploading] = useState(false);
  const [showLyricsExtractor, setShowLyricsExtractor] = useState(true);

  // URL Import state
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedTimedLines, setImportedTimedLines] = useState<Array<{ text: string; lineNumber: number; timestamp_ms: number }>>([]);

  // AI Analysis state
  const [analyzingLyrics, setAnalyzingLyrics] = useState(false);

  // Content type state
  const [contentType, setContentType] = useState<ContentType>(initialContentType);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [newCharacterRole, setNewCharacterRole] = useState<CharacterRole>('performer');
  const [myCharacterId, setMyCharacterId] = useState<string | null>(null);

  // Podcast/Speech specific
  const [episodeNumber, setEpisodeNumber] = useState<number | null>(null);
  const [durationTarget, setDurationTarget] = useState<number | null>(null);

  const defaultTags = ['confident', 'needs practice'];
  const tagColors = ['purple', 'blue', 'green', 'red', 'orange', 'pink', 'cyan', 'yellow'];

  // Load bands and tag configs on mount and when content type changes
  useEffect(() => {
    loadBands();
    loadTagConfigs();
  }, [user, contentType]);

  const loadBands = async () => {
    if (user?.id) {
      try {
        // Filter bands by the corresponding group content type
        const groupType = CONTENT_TYPE_TO_GROUP[contentType];
        const response = await fetch(`/api/bands?content_type=${groupType}`);
        if (response.ok) {
          const bands = await response.json();
          setAvailableBands(bands);
          // Clear selected band if it's not in the new list (e.g., content type changed)
          if (selectedBandId && !bands.some((b: Band) => b._id === selectedBandId)) {
            setSelectedBandId('');
            setAlbum('');
            setFolder('');
          }
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

  // Load characters when song changes
  const loadCharacters = async (songId: string) => {
    try {
      const response = await fetch(`/api/characters?songId=${songId}`);
      if (response.ok) {
        const chars = await response.json();
        setCharacters(chars);
      }
    } catch (error) {
      console.error('Error loading characters:', error);
    }
  };

  // Character management functions
  const handleSaveCharacter = async () => {
    if (!song || !newCharacterName.trim()) return;

    try {
      if (editingCharacter) {
        // Update existing character
        const response = await fetch('/api/characters', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingCharacter._id,
            name: newCharacterName.trim(),
            role: newCharacterRole,
          }),
        });

        if (response.ok) {
          const updated = await response.json();
          setCharacters(prev => prev.map(c => c._id === updated._id ? updated : c));
        }
      } else {
        // Create new character
        const response = await fetch('/api/characters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            song_id: song._id,
            name: newCharacterName.trim(),
            role: newCharacterRole,
          }),
        });

        if (response.ok) {
          const newChar = await response.json();
          setCharacters(prev => [...prev, newChar]);
        }
      }

      setShowCharacterModal(false);
      setEditingCharacter(null);
      setNewCharacterName('');
      setNewCharacterRole('performer');
    } catch (error) {
      console.error('Error saving character:', error);
      alert('Failed to save character');
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (!confirm('Delete this character? Lines assigned to them will become unassigned.')) return;

    try {
      const response = await fetch(`/api/characters?id=${characterId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCharacters(prev => prev.filter(c => c._id !== characterId));
        setShowCharacterModal(false);
        setEditingCharacter(null);
      }
    } catch (error) {
      console.error('Error deleting character:', error);
      alert('Failed to delete character');
    }
  };

  const handleSetUserCharacter = async (characterId: string) => {
    try {
      const response = await fetch('/api/characters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: characterId,
          is_user: true,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        // Update all characters - the one that is now "user" and clear is_user from others
        setCharacters(prev => prev.map(c => ({
          ...c,
          is_user: c._id === characterId,
        })));
        setMyCharacterId(characterId);
        setShowCharacterModal(false);
        setEditingCharacter(null);
      }
    } catch (error) {
      console.error('Error setting user character:', error);
      alert('Failed to set character');
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

      // Set content type fields
      setContentType(song.content_type || 'lyrics');
      setEpisodeNumber(song.episode_number || null);
      setDurationTarget(song.duration_target_minutes || null);
      setMyCharacterId(song.my_character_id || null);

      // Load characters for scripts
      if (song.content_type === 'script') {
        loadCharacters(song._id);
      } else {
        setCharacters([]);
      }
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

      // Reset content type fields for new item
      setContentType(initialContentType);
      setEpisodeNumber(null);
      setDurationTarget(null);
      setMyCharacterId(null);
      setCharacters([]);
    }

    const lyricsText = lyrics.length > 0 ? lyrics.map(l => l.text).join('\n') : '';
    setRawLyrics(lyricsText);
    setOriginalLyricsText(lyricsText);
    setEditedLineIndices(new Set());
    setLyricsCollapsed(false);

    setHasChanges(false);
  }, [song?._id, initialContentType]); // Only reset when song ID changes, not on every lyrics update

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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Format API error:', response.status, errorText);
        throw new Error(`Failed to format lyrics: ${response.status}`);
      }

      const data = await response.json();

      if (data.formattedLyrics) {
        setRawLyrics(data.formattedLyrics);
        alert('Lyrics formatted by AI!');
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error formatting lyrics:', error);
      alert(error instanceof Error ? error.message : 'Error formatting lyrics');
    } finally {
      setAiLoading(false);
    }
  };

  const handleBreakIntoLines = () => {

    const lines = rawLyrics
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // Create a map of imported timed lines for quick lookup
    const timedLinesMap = new Map<string, number>();
    importedTimedLines.forEach(tl => {
      timedLinesMap.set(tl.text.trim().toLowerCase(), tl.timestamp_ms);
    });

    const newLyrics: LyricLine[] = lines.map((text, index) => {
      // Try to find matching timestamp from imported synced lyrics
      const matchedTimestamp = timedLinesMap.get(text.trim().toLowerCase());
      // Also check by line number if text didn't match
      const lineByIndex = importedTimedLines.find(tl => tl.lineNumber === index + 1);

      return {
        _id: crypto.randomUUID(),
        song_id: song?._id || '',
        line_number: index,
        text,
        timestamp_ms: matchedTimestamp ?? lineByIndex?.timestamp_ms ?? null,
        character_id: null,
        line_type: 'lyric' as LineType,
        notes: null,
        duration_seconds: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    onLyricsChange(newLyrics);
    // Clear imported timed lines after use
    setImportedTimedLines([]);
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
        artist: contentType === 'lyrics' ? selectedBand.name : '',
        album: selectedAlbum?.name || null,
        folder: selectedFolder?.name || null,
        band_id: selectedBandId,
        album_id: album || null,
        folder_id: folder || null,
        completed,
        tags,
        soundcloud_url: soundcloudUrl || null,
        instrumental_url: instrumentalUrl || null,
        content_type: contentType,
        my_character_id: myCharacterId,
        episode_number: episodeNumber,
        duration_target_minutes: durationTarget,
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
        character_id: line.character_id || null,
        line_type: line.line_type || 'lyric',
        notes: line.notes || null,
        duration_seconds: line.duration_seconds || null,
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

  const updateLineType = (index: number, newType: LineType) => {
    const updatedLyrics = [...lyrics];
    updatedLyrics[index] = { ...updatedLyrics[index], line_type: newType };
    onLyricsChange(updatedLyrics);
    setEditedLineIndices(prev => new Set(prev).add(index));
  };

  const updateLineCharacter = (index: number, characterId: string | null) => {
    const updatedLyrics = [...lyrics];
    updatedLyrics[index] = { ...updatedLyrics[index], character_id: characterId };
    onLyricsChange(updatedLyrics);
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
      character_id: null,
      line_type: 'lyric' as LineType,
      notes: null,
      duration_seconds: null,
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

  // Handle URL import (SoundCloud, Spotify, etc.)
  const handleUrlImport = async () => {
    if (!importUrl.trim()) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const response = await fetch('/api/import/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setImportError(data.error || 'Failed to import from URL');
        return;
      }

      const track = data.track;

      // Auto-fill song metadata
      if (track.title && !title) {
        setTitle(track.title);
      }
      if (track.artist) {
        // Try to find matching band or use as title fallback
        const matchingBand = availableBands.find(
          b => b.name.toLowerCase() === track.artist.toLowerCase()
        );
        if (matchingBand) {
          setSelectedBandId(matchingBand._id);
        }
      }
      if (track.album && !album) {
        setAlbum(track.album);
      }

      // Set the URL based on service
      if (track.service === 'soundcloud') {
        setSoundcloudUrl(track.url);
      } else {
        // For Spotify, YouTube, etc., we can't play directly but store the URL
        // They might have an instrumental URL separately
        setSoundcloudUrl(track.url);
      }

      // Handle imported lyrics if available
      if (data.lyrics) {
        const { synced, plain } = data.lyrics;

        if (synced && synced.length > 0) {
          // Use synced lyrics with timestamps
          const formattedLyrics = synced
            .map((line: { text: string; timestamp_ms: number }) => line.text)
            .join('\n');
          setRawLyrics(formattedLyrics);

          // Store the synced timestamps for later use when breaking into lines
          const timedLines = synced.map((line: { text: string; timestamp_ms: number }, index: number) => ({
            text: line.text,
            lineNumber: index + 1,
            timestamp_ms: line.timestamp_ms,
          }));
          setImportedTimedLines(timedLines);
        } else if (plain && plain.length > 0) {
          // Use plain lyrics without timestamps
          setRawLyrics(plain.join('\n'));
        }
      }

      setImportUrl('');
      setImportError(null);
    } catch (error) {
      console.error('Error importing from URL:', error);
      setImportError('Failed to connect to import service');
    } finally {
      setIsImporting(false);
    }
  };

  // Handle lyrics from AudioUploader
  const handleAudioLyricsReady = (
    extractedLyrics: string,
    processedLyrics?: { lines: Array<{ text: string; lineNumber: number; section?: string }> },
    audioUrl?: string,
    _metadata?: { duration: number; confidence: number; language: string; estimatedTempo: number; wordCount: number },
    timedLines?: TimedLine[]
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

    // If we have timed lines with timestamps, use those directly
    if (timedLines && timedLines.length > 0) {
      const newLyrics: LyricLine[] = timedLines.map((timedLine, index) => ({
        _id: crypto.randomUUID(),
        song_id: song?._id || '',
        line_number: index,
        text: timedLine.text,
        timestamp_ms: timedLine.startMs,
        character_id: null,
        line_type: 'lyric' as LineType,
        notes: null,
        duration_seconds: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      onLyricsChange(newLyrics);
      return;
    }

    // Fallback: Convert to lyric lines without timestamps
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
      character_id: null,
      line_type: 'lyric' as LineType,
      notes: null,
      duration_seconds: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    onLyricsChange(newLyrics);
  };

  // Handle audio-only upload (no lyrics extraction)
  const handleAudioOnlyUpload = async (file: File) => {
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/ogg',
      'audio/flac',
      'audio/m4a',
      'audio/mp4',
      'audio/x-m4a',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Please upload an audio file (MP3, WAV, OGG, FLAC, or M4A)');
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      alert('File is too large. Maximum size is 50MB');
      return;
    }

    setAudioFile(file);
    setAudioUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadResult = await uploadResponse.json();
      setUploadedAudioUrl(uploadResult.url);
      if (!soundcloudUrl) {
        setInstrumentalUrl(uploadResult.url);
      }
    } catch (err) {
      console.error('Audio upload error:', err);
      alert(err instanceof Error ? err.message : 'Failed to upload audio');
      setAudioFile(null);
    } finally {
      setAudioUploading(false);
    }
  };

  // AI Analysis: Compare pasted lyrics against uploaded audio
  const handleAnalyzeLyrics = async () => {
    if (!rawLyrics.trim()) {
      alert('Please paste lyrics first');
      return;
    }

    if (!uploadedAudioUrl) {
      alert('Please upload an audio file first');
      return;
    }

    setAnalyzingLyrics(true);
    try {
      const response = await fetch('/api/analyze-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lyrics: rawLyrics,
          audioUrl: uploadedAudioUrl,
          songTitle: title,
          artistName: availableBands.find(b => b._id === selectedBandId)?.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();

      // If we got timed lines back, use them
      if (result.timedLines && result.timedLines.length > 0) {
        const newLyrics: LyricLine[] = result.timedLines.map((timedLine: { text: string; startMs: number }, index: number) => ({
          _id: crypto.randomUUID(),
          song_id: song?._id || '',
          line_number: index,
          text: timedLine.text,
          timestamp_ms: timedLine.startMs,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        onLyricsChange(newLyrics);

        if (result.corrections && result.corrections.length > 0) {
          alert(`Lyrics analyzed and timed!\n\nSuggested corrections:\n${result.corrections.slice(0, 5).map((c: { original: string; suggested: string }) => `• "${c.original}" → "${c.suggested}"`).join('\n')}${result.corrections.length > 5 ? `\n...and ${result.corrections.length - 5} more` : ''}`);
        } else {
          alert('Lyrics analyzed and timestamps added!');
        }
      } else if (result.formattedLyrics) {
        // Just use the formatted lyrics without timestamps
        setRawLyrics(result.formattedLyrics);
        alert('Lyrics analyzed and formatted!');
      }
    } catch (err) {
      console.error('Lyrics analysis error:', err);
      alert(err instanceof Error ? err.message : 'Failed to analyze lyrics');
    } finally {
      setAnalyzingLyrics(false);
    }
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
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            className="p-1.5 sm:p-2 text-base-content/70 hover:text-purple-600 transition-all duration-200"
            title="Back"
          >
            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="w-1 h-6 sm:h-8 bg-purple-600" />
        <div className="flex-1 min-w-0">
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
              className="text-lg sm:text-xl md:text-2xl font-bold text-base-content bg-transparent border-b-2 border-primary focus:outline-hidden w-full"
              placeholder={`${CONTENT_TYPE_LABELS[contentType].singular} title`}
              autoFocus
            />
          ) : (
            <h2
              onClick={() => setEditingTitle(true)}
              className="text-lg sm:text-xl md:text-2xl font-bold text-base-content cursor-pointer hover:text-primary transition-colors truncate"
              title="Click to edit"
            >
              {title || `New ${CONTENT_TYPE_LABELS[contentType].singular}`}
            </h2>
          )}
        </div>
      </div>

      {/* Content Details Collapse */}
      <div className="mb-4 md:mb-6">
        <div className="collapse collapse-arrow bg-base-200 border border-base-300">
          <input type="checkbox" defaultChecked />
          <div className="collapse-title text-md font-semibold">
            {CONTENT_TYPE_LABELS[contentType].singular} Details
          </div>
          <div className="collapse-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pt-2">
              <div>
                <label className="block text-xs md:text-sm font-semibold text-base-content mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  {CONTENT_TYPE_LABELS[contentType].bandLabel}
                </label>
                <select
                  value={selectedBandId}
                  onChange={e => setSelectedBandId(e.target.value)}
                  className="select select-bordered select-sm sm:select-md w-full"
                >
                  <option value="">{CONTENT_TYPE_LABELS[contentType].bandPlaceholder}</option>
                  {availableBands.map(band => (
                    <option key={band._id} value={band._id}>{band.name}</option>
                  ))}
                </select>
                {availableBands.length === 0 && (
                  <p className="text-xs text-base-content/60 mt-1">{CONTENT_TYPE_LABELS[contentType].bandHint}</p>
                )}
              </div>
              <div>
                <label className="block text-xs md:text-sm font-semibold text-base-content mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                  </svg>
                  {CONTENT_TYPE_LABELS[contentType].albumLabel}
                </label>
                <div className="flex gap-2">
                  <select
                    value={album}
                    onChange={e => setAlbum(e.target.value)}
                    className="select select-bordered select-sm sm:select-md flex-1"
                    disabled={!selectedBandId}
                  >
                    <option value="">{CONTENT_TYPE_LABELS[contentType].albumPlaceholder}</option>
                    {availableAlbums.map(albumOption => (
                      <option key={albumOption._id} value={albumOption._id}>{albumOption.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCreateAlbumModal(true)}
                    disabled={!selectedBandId}
                    className="btn btn-square btn-ghost text-primary disabled:text-base-content/30"
                    title={selectedBandId ? `Create New ${CONTENT_TYPE_LABELS[contentType].albumLabel}` : `Select a ${CONTENT_TYPE_LABELS[contentType].bandLabel.toLowerCase()} first`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                {!selectedBandId && (
                  <p className="text-xs text-base-content/60 mt-1">Select a {CONTENT_TYPE_LABELS[contentType].bandLabel.toLowerCase()} first</p>
                )}
              </div>
              <div>
                <label className="block text-xs md:text-sm font-semibold text-base-content mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25H11.69z" />
                  </svg>
                  {CONTENT_TYPE_LABELS[contentType].folderLabel}
                </label>
                <div className="flex gap-2">
                  <select
                    value={folder}
                    onChange={e => setFolder(e.target.value)}
                    className="select select-bordered select-sm sm:select-md flex-1"
                    disabled={!selectedBandId}
                  >
                    <option value="">No {CONTENT_TYPE_LABELS[contentType].folderLabel}</option>
                    {availableFolders.map(folderOption => (
                      <option key={folderOption._id} value={folderOption._id}>{folderOption.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCreateFolderModal(true)}
                    disabled={!selectedBandId}
                    className="btn btn-square btn-ghost text-primary disabled:text-base-content/30"
                    title={selectedBandId ? `Create New ${CONTENT_TYPE_LABELS[contentType].folderLabel}` : `Select a ${CONTENT_TYPE_LABELS[contentType].bandLabel.toLowerCase()} first`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                {!selectedBandId && (
                  <p className="text-xs text-base-content/60 mt-1">Select a {CONTENT_TYPE_LABELS[contentType].bandLabel.toLowerCase()} first</p>
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

      {/* Character Management for Scripts */}
      {contentType === 'script' && song && (
        <div className="mb-4 md:mb-6">
          <div className="collapse collapse-arrow bg-base-200 border border-base-300">
            <input type="checkbox" defaultChecked />
            <div className="collapse-title text-md font-semibold flex items-center gap-2">
              <span className="text-2xl">🎭</span>
              Characters
            </div>
            <div className="collapse-content">
              <div className="pt-2 space-y-3">
                {characters.length === 0 ? (
                  <p className="text-sm text-base-content/60">No characters defined yet. Add characters to assign lines to them.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {characters.map(char => (
                      <div
                        key={char._id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border-2"
                        style={{ borderColor: char.color, backgroundColor: `${char.color}15` }}
                      >
                        <span className="font-medium">{char.name}</span>
                        {ROLE_OPTIONS[contentType].roles.length > 1 && char.role && (
                          <span className="badge badge-sm badge-ghost">
                            {ROLE_OPTIONS[contentType].labels[char.role]}
                          </span>
                        )}
                        {char.is_user && (
                          <span className="badge badge-sm badge-primary">You</span>
                        )}
                        <button
                          onClick={() => {
                            setEditingCharacter(char);
                            setNewCharacterName(char.name);
                            setNewCharacterRole(char.role || 'performer');
                            setShowCharacterModal(true);
                          }}
                          className="btn btn-ghost btn-xs"
                        >
                          Edit
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => {
                    setEditingCharacter(null);
                    setNewCharacterName('');
                    setNewCharacterRole(ROLE_OPTIONS[contentType].roles[0] || 'performer');
                    setShowCharacterModal(true);
                  }}
                  className="btn btn-sm btn-outline btn-primary gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Character
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Podcast/Speech Settings */}
      {(contentType === 'podcast' || contentType === 'speech') && (
        <div className="mb-4 md:mb-6">
          <div className="collapse collapse-arrow bg-base-200 border border-base-300">
            <input type="checkbox" defaultChecked />
            <div className="collapse-title text-md font-semibold flex items-center gap-2">
              <span className="text-2xl">{contentType === 'podcast' ? '🎙️' : '📢'}</span>
              {contentType === 'podcast' ? 'Episode Settings' : 'Speech Settings'}
            </div>
            <div className="collapse-content">
              <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {contentType === 'podcast' && (
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-base-content mb-2">
                      Episode Number
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={episodeNumber || ''}
                      onChange={e => setEpisodeNumber(e.target.value ? parseInt(e.target.value) : null)}
                      className="input input-bordered w-full"
                      placeholder="e.g., 42"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-base-content mb-2">
                    Target Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={durationTarget || ''}
                    onChange={e => setDurationTarget(e.target.value ? parseInt(e.target.value) : null)}
                    className="input input-bordered w-full"
                    placeholder="e.g., 30"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {lyrics.length === 0 ? (
        <div className="space-y-6">
          {/* Toggle between Extract from MP3 and Paste Lyrics */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex rounded-xl border border-base-300 p-1 bg-base-200">
              <button
                onClick={() => setShowLyricsExtractor(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  showLyricsExtractor
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-base-content/70 hover:text-base-content'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                Extract from MP3
              </button>
              <button
                onClick={() => setShowLyricsExtractor(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  !showLyricsExtractor
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-base-content/70 hover:text-base-content'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Paste Lyrics
              </button>
            </div>
          </div>

          {/* Show AudioUploader if extracting lyrics from audio */}
          {showLyricsExtractor ? (
            <div className="border border-base-300 rounded-xl p-4 bg-base-100">
              <label className="block text-xs md:text-sm font-semibold text-base-content mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Extract Lyrics from Audio
              </label>
              <p className="text-sm text-base-content/60 mb-4">
                Upload an MP3 file and Deepgram AI will transcribe the vocals and extract lyrics with timestamps.
              </p>
              <AudioUploader
                onLyricsReady={handleAudioLyricsReady}
                onCancel={() => setShowLyricsExtractor(false)}
                songTitle={title}
                artistName={availableBands.find(b => b._id === selectedBandId)?.name}
              />

              {/* OR Divider */}
              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-base-300" />
                <span className="text-sm text-base-content/50 font-medium">OR</span>
                <div className="flex-1 h-px bg-base-300" />
              </div>

              {/* URL Import Section */}
              <div className="border border-base-300 rounded-xl p-4 bg-base-200/50">
                <label className="block text-xs md:text-sm font-semibold text-base-content mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Import from URL
                </label>
                <p className="text-sm text-base-content/60 mb-3">
                  Paste a SoundCloud, Spotify, YouTube, or Apple Music link to auto-fill song details.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
                    className="flex-1 px-3 py-2 bg-base-100 border border-base-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm"
                    placeholder="https://soundcloud.com/... or https://open.spotify.com/..."
                  />
                  <button
                    onClick={handleUrlImport}
                    disabled={isImporting || !importUrl.trim()}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                  >
                    {isImporting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                        </svg>
                        Importing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Import
                      </>
                    )}
                  </button>
                </div>
                {importError && (
                  <p className="mt-2 text-sm text-red-500">{importError}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">SoundCloud</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Spotify</span>
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">YouTube</span>
                  <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded-full">Apple Music</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Deezer</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Lyrics Paste Section */}
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

                {/* AI Processing Suggestion - with Smart Process button inside */}
                {showProcessSuggestion && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl">
                    <div className="flex items-center gap-3">
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
                  </div>
                )}

                {/* Audio Sync Section - Upload MP3 and Analyze */}
                {rawLyrics.trim() && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 p-2 bg-green-100 rounded-lg">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-800">Sync with Audio</p>
                          <p className="text-xs text-green-600">Upload MP3 to add timestamps and verify lyrics match the song</p>
                        </div>
                      </div>

                      {/* Uploaded audio info or upload button */}
                      {uploadedAudioUrl ? (
                        <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-green-800 text-sm truncate">
                              {audioFile?.name || 'Audio uploaded'}
                            </p>
                            <p className="text-xs text-green-600">
                              {audioFile ? `${(audioFile.size / 1024 / 1024).toFixed(1)} MB` : 'Ready for analysis'}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setUploadedAudioUrl(null);
                              setAudioFile(null);
                              setInstrumentalUrl('');
                            }}
                            className="btn btn-ghost btn-sm btn-circle text-green-600 hover:text-error"
                            title="Remove audio"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          {/* Analyze button - inside the green container */}
                          <button
                            onClick={handleAnalyzeLyrics}
                            disabled={analyzingLyrics}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                              analyzingLyrics
                                ? 'bg-green-200 text-green-500'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                            title="Analyze lyrics against audio to add timestamps"
                          >
                            {analyzingLyrics ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                            )}
                            <span className="text-sm font-medium">{analyzingLyrics ? 'Analyzing...' : 'Analyze'}</span>
                          </button>
                        </div>
                      ) : (
                        <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 ${
                          audioUploading
                            ? 'bg-green-200 text-green-500'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}>
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleAudioOnlyUpload(e.target.files[0])}
                            disabled={audioUploading}
                          />
                          {audioUploading ? (
                            <>
                              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                              </svg>
                              <span className="text-sm font-medium">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v11.25" />
                              </svg>
                              <span className="text-sm font-medium">Upload MP3</span>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {/* Text Processing Actions - grouped together */}
                <div className="mt-4 p-3 bg-base-200 rounded-xl">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-medium text-base-content/60 mr-2">Text Processing:</span>
                    <button
                      onClick={handleSmartProcess}
                      disabled={smartProcessing || !rawLyrics.trim()}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                        smartProcessing || !rawLyrics.trim()
                          ? 'bg-purple-100 text-purple-400'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                      title="Smart AI Process - Analyzes structure, adds sections, optimizes for teleprompter"
                    >
                      {smartProcessing ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      )}
                      <span>{smartProcessing ? 'Processing...' : 'Smart Process'}</span>
                    </button>
                    <button
                      onClick={handleAIFormat}
                      disabled={aiLoading || !rawLyrics.trim()}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                        aiLoading || !rawLyrics.trim()
                          ? 'bg-base-300 text-base-content/40'
                          : 'bg-base-100 text-base-content/70 hover:text-purple-600 border border-base-300'
                      }`}
                      title="Quick AI Format"
                    >
                      {aiLoading ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      )}
                      <span>Quick Format</span>
                    </button>
                    <button
                      onClick={handleBreakIntoLines}
                      disabled={!rawLyrics.trim()}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                        !rawLyrics.trim()
                          ? 'bg-base-300 text-base-content/40'
                          : 'bg-base-100 text-base-content/70 hover:text-purple-600 border border-base-300'
                      }`}
                      title="Break into Lines"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      <span>Break Lines</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div>
          {/* Upload Audio Section - collapsible when lyrics exist */}
          <div className="mb-4">
            <button
              onClick={() => setShowLyricsExtractor(!showLyricsExtractor)}
              className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors mb-2"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${showLyricsExtractor ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              Upload / Re-extract from Audio
            </button>
            {showLyricsExtractor && (
              <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/50">
                <p className="text-sm text-base-content/60 mb-3">
                  Upload an MP3 to extract new lyrics or re-sync timestamps with Deepgram AI.
                </p>
                <AudioUploader
                  onLyricsReady={handleAudioLyricsReady}
                  onCancel={() => setShowLyricsExtractor(false)}
                  songTitle={title}
                  artistName={availableBands.find(b => b._id === selectedBandId)?.name}
                />

                {/* OR Divider */}
                <div className="flex items-center gap-4 my-4">
                  <div className="flex-1 h-px bg-purple-200" />
                  <span className="text-sm text-purple-400 font-medium">OR</span>
                  <div className="flex-1 h-px bg-purple-200" />
                </div>

                {/* URL Import */}
                <div className="border border-orange-200 rounded-xl p-3 bg-orange-50/50">
                  <label className="block text-xs font-semibold text-base-content mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Import from URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
                      className="flex-1 px-3 py-2 bg-white border border-orange-200 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
                      placeholder="SoundCloud, Spotify, YouTube..."
                    />
                    <button
                      onClick={handleUrlImport}
                      disabled={isImporting || !importUrl.trim()}
                      className="px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg font-medium text-sm transition-colors"
                    >
                      {isImporting ? '...' : 'Import'}
                    </button>
                  </div>
                  {importError && (
                    <p className="mt-2 text-xs text-red-500">{importError}</p>
                  )}
                </div>
              </div>
            )}
          </div>

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
                    } ${
                      line.line_type === 'stage_direction' ? 'italic text-base-content/60' :
                      line.line_type === 'segment_header' ? 'font-bold text-primary' :
                      line.line_type === 'cue' ? 'text-warning' :
                      line.line_type === 'emphasis' ? 'font-semibold' :
                      line.line_type === 'pause' ? 'text-base-content/40 italic' : ''
                    }`}
                    style={{borderRadius: '4px'}}
                  />
                  {/* Line type selector for scripts/podcasts/speeches */}
                  {(contentType === 'script' || contentType === 'podcast' || contentType === 'speech') && (
                    <div className="dropdown dropdown-end">
                      <button tabIndex={0} className="btn btn-xs btn-ghost gap-1" title="Line type">
                        {line.line_type === 'dialogue' && <span>🗣️</span>}
                        {line.line_type === 'stage_direction' && <span>📋</span>}
                        {line.line_type === 'talking_point' && <span>💡</span>}
                        {line.line_type === 'question' && <span>❓</span>}
                        {line.line_type === 'segment_header' && <span>📌</span>}
                        {line.line_type === 'cue' && <span>🔔</span>}
                        {line.line_type === 'emphasis' && <span>⭐</span>}
                        {line.line_type === 'pause' && <span>⏸️</span>}
                        {(line.line_type === 'lyric' || !line.line_type) && <span>📝</span>}
                      </button>
                      <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow bg-base-100 rounded-box w-44">
                        {contentType === 'script' && (
                          <>
                            <li><button onClick={() => updateLineType(index, 'dialogue')}>🗣️ Dialogue</button></li>
                            <li><button onClick={() => updateLineType(index, 'stage_direction')}>📋 Stage Direction</button></li>
                          </>
                        )}
                        {contentType === 'podcast' && (
                          <>
                            <li><button onClick={() => updateLineType(index, 'talking_point')}>💡 Talking Point</button></li>
                            <li><button onClick={() => updateLineType(index, 'question')}>❓ Question</button></li>
                            <li><button onClick={() => updateLineType(index, 'segment_header')}>📌 Segment Header</button></li>
                          </>
                        )}
                        {contentType === 'speech' && (
                          <>
                            <li><button onClick={() => updateLineType(index, 'cue')}>🔔 Cue/Reminder</button></li>
                            <li><button onClick={() => updateLineType(index, 'emphasis')}>⭐ Emphasis</button></li>
                            <li><button onClick={() => updateLineType(index, 'pause')}>⏸️ Pause</button></li>
                          </>
                        )}
                        <li><button onClick={() => updateLineType(index, 'lyric')}>📝 Normal</button></li>
                      </ul>
                    </div>
                  )}
                  {/* Character selector for scripts */}
                  {contentType === 'script' && characters.length > 0 && (
                    <div className="dropdown dropdown-end">
                      <button tabIndex={0} className="btn btn-xs btn-ghost" style={{ color: characters.find(c => c._id === line.character_id)?.color || 'inherit' }}>
                        {characters.find(c => c._id === line.character_id)?.name || 'No character'}
                      </button>
                      <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow bg-base-100 rounded-box w-40">
                        <li><button onClick={() => updateLineCharacter(index, null)}>No character</button></li>
                        {characters.map(char => (
                          <li key={char._id}>
                            <button
                              onClick={() => updateLineCharacter(index, char._id)}
                              style={{ color: char.color }}
                            >
                              {char.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
            <h3 className="font-bold text-lg">Create New {CONTENT_TYPE_LABELS[contentType].albumLabel}</h3>
            <div className="py-4">
              <input
                type="text"
                placeholder={`${CONTENT_TYPE_LABELS[contentType].albumLabel} name...`}
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
            <h3 className="font-bold text-lg">Create New {CONTENT_TYPE_LABELS[contentType].folderLabel}</h3>
            <div className="py-4">
              <input
                type="text"
                placeholder={`${CONTENT_TYPE_LABELS[contentType].folderLabel} name...`}
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

      {/* Character Modal */}
      {showCharacterModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">
              {editingCharacter ? 'Edit Character' : 'Add Character'}
            </h3>
            <div className="py-4 space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">
                    {contentType === 'script' ? 'Character/Role Name' :
                     contentType === 'podcast' ? 'Person Name' :
                     'Character Name'}
                  </span>
                </label>
                <input
                  type="text"
                  placeholder={
                    contentType === 'script' ? 'e.g., Romeo, Director, Stage Manager...' :
                    contentType === 'podcast' ? 'e.g., John, Guest Expert...' :
                    'e.g., Romeo, Juliet...'
                  }
                  value={newCharacterName}
                  onChange={e => setNewCharacterName(e.target.value)}
                  className="input input-bordered w-full"
                  onKeyDown={e => e.key === 'Enter' && handleSaveCharacter()}
                  autoFocus
                />
              </div>

              {/* Role Selector - show when more than one role option */}
              {ROLE_OPTIONS[contentType].roles.length > 1 && (
                <div>
                  <label className="label">
                    <span className="label-text">Role Type</span>
                  </label>
                  <select
                    value={newCharacterRole}
                    onChange={e => setNewCharacterRole(e.target.value as CharacterRole)}
                    className="select select-bordered w-full"
                  >
                    {ROLE_OPTIONS[contentType].roles.map(role => (
                      <option key={role} value={role}>
                        {ROLE_OPTIONS[contentType].labels[role]}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-base-content/60 mt-1">
                    {contentType === 'script'
                      ? 'Actors speak lines, Directors give cues, Narrators read stage directions'
                      : contentType === 'podcast'
                      ? 'Hosts lead the conversation, Guests are interviewed'
                      : 'Select the role type for this person'}
                  </p>
                </div>
              )}

              {editingCharacter && (
                <>
                  <div className="divider">Role Assignment</div>
                  <div className="flex flex-col gap-2">
                    {editingCharacter.is_user ? (
                      <div className="alert alert-info">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>This is your character. The AI will read other characters lines for you.</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSetUserCharacter(editingCharacter._id)}
                        className="btn btn-outline btn-primary"
                      >
                        Set as My Character
                      </button>
                    )}
                  </div>

                  <div className="divider">Danger Zone</div>
                  <button
                    onClick={() => handleDeleteCharacter(editingCharacter._id)}
                    className="btn btn-error btn-outline w-full"
                  >
                    Delete Character
                  </button>
                </>
              )}
            </div>
            <div className="modal-action">
              <button
                onClick={() => {
                  setShowCharacterModal(false);
                  setEditingCharacter(null);
                  setNewCharacterName('');
                  setNewCharacterRole('performer');
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCharacter}
                disabled={!newCharacterName.trim()}
                className="btn btn-primary"
              >
                {editingCharacter ? 'Save' : 'Add Character'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => {
            setShowCharacterModal(false);
            setEditingCharacter(null);
            setNewCharacterName('');
            setNewCharacterRole('performer');
          }} />
        </div>
      )}
    </div>
  );
}