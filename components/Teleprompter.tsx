'use client';

import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';

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
  song: Song | null;
  lyrics: LyricLine[];
  onLyricsChange?: (lyrics: LyricLine[]) => void;
  onSelectSong?: (song: Song, lyrics: LyricLine[]) => void;
}

declare global {
  interface Window {
    SC: any;
  }
}

// Helper to detect if URL is a SoundCloud URL
function isSoundCloudUrl(url: string): boolean {
  return url.includes('soundcloud.com');
}

// Helper to detect if URL is a direct audio file
function isDirectAudioUrl(url: string): boolean {
  return url.includes('blob.vercel-storage.com') ||
         url.endsWith('.mp3') ||
         url.endsWith('.wav') ||
         url.endsWith('.ogg') ||
         url.endsWith('.m4a') ||
         url.endsWith('.flac');
}

export default function Teleprompter({ song, lyrics, onLyricsChange, onSelectSong }: Props) {
  const [widget, setWidget] = useState<any>(null);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fontSize, setFontSize] = useState(48);
  const [syncMode, setSyncMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lineTakeCounts, setLineTakeCounts] = useState<Record<string, number>>({});
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [lineHeight, setLineHeight] = useState(1.5);
  const [autoScale, setAutoScale] = useState(true);
  const [syncLineIndex, setSyncLineIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Song selection state (for when no song is passed)
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [albumFilter, setAlbumFilter] = useState<string>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');

  // Audio source type
  const [audioType, setAudioType] = useState<'none' | 'soundcloud' | 'direct'>('none');
  const [audioReady, setAudioReady] = useState(false);

  // Color customization
  const defaultColors = {
    background: '#0f0a1e',
    activeText: '#ffffff',
    inactiveText: '#64748b',
  };
  const [bgColor, setBgColor] = useState(defaultColors.background);
  const [activeTextColor, setActiveTextColor] = useState(defaultColors.activeText);
  const [inactiveTextColor, setInactiveTextColor] = useState(defaultColors.inactiveText);
  const [showFullscreenControls, setShowFullscreenControls] = useState(false);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // AI realignment
  const [isRealigning, setIsRealigning] = useState(false);
  const [realignMessage, setRealignMessage] = useState<string | null>(null);

  // Loop mode for practice
  const [loopEnabled, setLoopEnabled] = useState(false);
  const loopEnabledRef = useRef(loopEnabled);

  // Recording mode for tracking practice metrics
  const [isRecording, setIsRecording] = useState(false);

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Section loop - loop between specific lines (session only, not persisted)
  const [sectionLoopStart, setSectionLoopStart] = useState<number | null>(null);
  const [sectionLoopEnd, setSectionLoopEnd] = useState<number | null>(null);
  const sectionLoopStartRef = useRef<number | null>(null);
  const sectionLoopEndRef = useRef<number | null>(null);

  // Timeline editor panel
  const [showTimelinePanel, setShowTimelinePanel] = useState(false);
  const [timelineCenterIndex, setTimelineCenterIndex] = useState<number>(0);
  const [timelineDraftTimestamps, setTimelineDraftTimestamps] = useState<Record<number, number>>({});
  const [draggingLineIndex, setDraggingLineIndex] = useState<number | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragStartTimestamp, setDragStartTimestamp] = useState<number>(0);
  const timelineLoopRef = useRef<boolean>(false);
  const timelinePanelRef = useRef<HTMLDivElement>(null);

  // Keep refs in sync with state
  useEffect(() => {
    loopEnabledRef.current = loopEnabled;
  }, [loopEnabled]);

  useEffect(() => {
    sectionLoopStartRef.current = sectionLoopStart;
    sectionLoopEndRef.current = sectionLoopEnd;
  }, [sectionLoopStart, sectionLoopEnd]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fullscreenControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const positionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sessionStartTimeRef = useRef<number | null>(null);

  // Load all songs for selection when no song is provided
  useEffect(() => {
    if (!song) {
      loadAllSongs();
    }
  }, [song]);

  const loadAllSongs = async () => {
    setLoadingSongs(true);
    try {
      const response = await fetch('/api/songs');
      if (response.ok) {
        const data = await response.json();
        setAllSongs(data);
      }
    } catch (error) {
      console.error('Error loading songs:', error);
    } finally {
      setLoadingSongs(false);
    }
  };

  const handleSongSelect = async (selectedSong: Song) => {
    // Load lyrics for the selected song
    try {
      const response = await fetch(`/api/lyrics?songId=${selectedSong._id}`);
      if (response.ok) {
        const lyricsData = await response.json();
        if (onSelectSong) {
          onSelectSong(selectedSong, lyricsData);
        }
      }
    } catch (error) {
      console.error('Error loading lyrics:', error);
    }
  };

  // Get unique albums and folders for filters
  const albums = [...new Set(allSongs.map(s => s.album).filter(Boolean))] as string[];
  const folders = [...new Set(allSongs.map(s => s.folder).filter(Boolean))] as string[];

  // Filter songs based on search and filters
  const filteredSongs = allSongs.filter(s => {
    const matchesSearch = searchTerm === '' ||
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.album?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesAlbum = albumFilter === 'all' || s.album === albumFilter;
    const matchesFolder = folderFilter === 'all' || s.folder === folderFilter;
    return matchesSearch && matchesAlbum && matchesFolder;
  });

  // Determine audio type when song changes
  useEffect(() => {
    const audioUrl = song?.instrumental_url || song?.soundcloud_url;
    if (!audioUrl) {
      setAudioType('none');
      setAudioReady(false);
    } else if (isSoundCloudUrl(audioUrl)) {
      setAudioType('soundcloud');
    } else if (isDirectAudioUrl(audioUrl)) {
      setAudioType('direct');
    } else {
      // Default to soundcloud for backward compatibility
      setAudioType('soundcloud');
    }
  }, [song?.instrumental_url, song?.soundcloud_url]);

  // Setup HTML5 audio when using direct audio
  useEffect(() => {
    if (audioType !== 'direct' || !audioRef.current) return;

    const audio = audioRef.current;
    const audioUrl = song?.instrumental_url || song?.soundcloud_url;
    if (!audioUrl) return;

    audio.src = audioUrl;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration * 1000); // Convert to ms
      setAudioReady(true);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      if (loopEnabledRef.current) {
        // Loop: restart from beginning
        audio.currentTime = 0;
        audio.play();
        setPosition(0);
        setCurrentLineIndex(-1);
      } else {
        setIsPlaying(false);
        setPosition(0);
        setCurrentLineIndex(-1);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioType, song?.instrumental_url, song?.soundcloud_url]);

  useEffect(() => {
    return () => {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
      }
      if (fullscreenControlsTimeoutRef.current) {
        clearTimeout(fullscreenControlsTimeoutRef.current);
      }
    };
  }, []);

  // Handle mouse movement for fullscreen controls visibility
  useEffect(() => {
    if (!isFullscreen) {
      setShowFullscreenControls(false);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const isInControlArea = e.clientX < 250 && e.clientY > window.innerHeight - 150;

      if (isInControlArea) {
        setShowFullscreenControls(true);
        if (fullscreenControlsTimeoutRef.current) {
          clearTimeout(fullscreenControlsTimeoutRef.current);
          fullscreenControlsTimeoutRef.current = null;
        }
      } else {
        if (!fullscreenControlsTimeoutRef.current) {
          fullscreenControlsTimeoutRef.current = setTimeout(() => {
            setShowFullscreenControls(false);
            fullscreenControlsTimeoutRef.current = null;
          }, 1500);
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (fullscreenControlsTimeoutRef.current) {
        clearTimeout(fullscreenControlsTimeoutRef.current);
      }
    };
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          if (isFullscreen) {
            exitFullscreen();
          }
          break;
        case ' ':
          // Spacebar - toggle play/pause
          e.preventDefault();
          if (isPlayerReady) {
            if (isPlaying) {
              handlePause();
            } else {
              handlePlay();
            }
          }
          break;
        case 'ArrowLeft':
          // Seek backward 5 seconds
          e.preventDefault();
          if (isPlayerReady) {
            getCurrentPosition((pos: number) => {
              seekTo(Math.max(0, pos - 5000));
            });
          }
          break;
        case 'ArrowRight':
          // Seek forward 5 seconds
          e.preventDefault();
          if (isPlayerReady) {
            getCurrentPosition((pos: number) => {
              seekTo(Math.min(duration, pos + 5000));
            });
          }
          break;
        case 'ArrowUp':
          // Increase font size
          e.preventDefault();
          if (!autoScale) {
            setFontSize(prev => Math.min(96, prev + 4));
          }
          break;
        case 'ArrowDown':
          // Decrease font size
          e.preventDefault();
          if (!autoScale) {
            setFontSize(prev => Math.max(24, prev - 4));
          }
          break;
        case '=':
        case '+':
          // Cmd+Shift+Plus: Increase font size
          if (e.metaKey && e.shiftKey) {
            e.preventDefault();
            setAutoScale(false);
            setFontSize(prev => Math.min(96, prev + 4));
          }
          break;
        case '-':
          // Cmd+Shift+Minus: Decrease font size
          if (e.metaKey && e.shiftKey) {
            e.preventDefault();
            setAutoScale(false);
            setFontSize(prev => Math.max(24, prev - 4));
          }
          break;
        case 'r':
        case 'R':
          // Reset to beginning
          e.preventDefault();
          handleReset();
          break;
        case 'f':
        case 'F':
          // Toggle fullscreen
          e.preventDefault();
          if (isFullscreen) {
            exitFullscreen();
          } else {
            enterFullscreen();
          }
          break;
        case 's':
        case 'S':
          // Toggle sync mode
          e.preventDefault();
          if (isPlayerReady) {
            setSyncMode(prev => !prev);
          }
          break;
        case 'l':
        case 'L':
          // Toggle loop mode
          e.preventDefault();
          if (isPlayerReady) {
            setLoopEnabled(prev => !prev);
          }
          break;
        case 'p':
        case 'P':
          // Toggle recording mode
          e.preventDefault();
          if (isPlayerReady) {
            toggleRecording();
          }
          break;
        case 'Enter':
          // In sync mode: sync current line and advance to next
          e.preventDefault();
          if (syncMode && isPlayerReady && syncLineIndex < lyrics.length) {
            getCurrentPosition((pos: number) => {
              lyrics[syncLineIndex].timestamp_ms = pos;
              console.log(`Synced line ${syncLineIndex} to ${pos}ms`);
              // Force re-render to show the timestamp update
              setLineTakeCounts(prev => ({ ...prev }));
              setSyncLineIndex(prev => Math.min(prev + 1, lyrics.length - 1));
            });
          }
          break;
        case 'Backspace':
          // In sync mode: go back to previous line
          e.preventDefault();
          if (syncMode && syncLineIndex > 0) {
            setSyncLineIndex(prev => prev - 1);
          }
          break;
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, isPlaying, widget, duration, autoScale, syncMode, syncLineIndex, lyrics]);

  // Auto-scroll to keep the active line centered
  useEffect(() => {
    const activeIndex = syncMode ? syncLineIndex : currentLineIndex;
    if (activeIndex < 0 || !lineRefs.current[activeIndex] || !lyricsContainerRef.current) return;

    const lineElement = lineRefs.current[activeIndex];
    const container = lyricsContainerRef.current;

    if (lineElement && container) {
      const containerRect = container.getBoundingClientRect();
      const lineRect = lineElement.getBoundingClientRect();

      // Calculate position to center the line in the container
      const scrollTop = lineElement.offsetTop - container.offsetTop - (containerRect.height / 2) + (lineRect.height / 2);

      container.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth'
      });
    }
  }, [currentLineIndex, syncLineIndex, syncMode]);

  const loadWidget = () => {
    if (audioType !== 'soundcloud') return;
    if (!iframeRef.current || !window.SC) return;

    const audioUrl = song?.instrumental_url || song?.soundcloud_url;
    if (!audioUrl) return;

    const newWidget = window.SC.Widget(iframeRef.current);
    setWidget(newWidget);

    newWidget.bind(window.SC.Widget.Events.READY, () => {
      newWidget.getDuration((d: number) => setDuration(d));
      setAudioReady(true);
    });

    newWidget.bind(window.SC.Widget.Events.PLAY, () => setIsPlaying(true));
    newWidget.bind(window.SC.Widget.Events.PAUSE, () => setIsPlaying(false));
    newWidget.bind(window.SC.Widget.Events.FINISH, () => {
      if (loopEnabledRef.current) {
        // Loop: restart from beginning
        newWidget.seekTo(0);
        newWidget.play();
        setPosition(0);
        setCurrentLineIndex(-1);
      } else {
        setIsPlaying(false);
        setPosition(0);
        setCurrentLineIndex(-1);
      }
    });
  };

  // Check if player is ready (either SoundCloud widget or HTML5 audio)
  const isPlayerReady = audioType === 'soundcloud' ? !!widget : audioType === 'direct' ? audioReady : false;

  const startPracticeSession = async () => {
    if (!song) return;

    try {
      const response = await fetch('/api/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'session',
          songId: song._id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error starting practice session:', response.status, errorData);
        // Don't block playback if practice session fails
        return;
      }

      const data = await response.json();
      if (data) {
        setSessionId(data._id);
        sessionStartTimeRef.current = Date.now();
      }
    } catch (error) {
      console.error('Error starting practice session:', error);
    }
  };

  const endPracticeSession = async () => {
    if (!sessionId) return;

    const duration = sessionStartTimeRef.current
      ? Math.floor((Date.now() - sessionStartTimeRef.current) / 1000)
      : 0;

    try {
      await fetch('/api/practice', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
        }),
      });
    } catch (error) {
      console.error('Error ending practice session:', error);
    }

    setSessionId(null);
    sessionStartTimeRef.current = null;
  };

  const recordLineTake = async (lineId: string, songId: string) => {
    const currentCount = lineTakeCounts[lineId] || 0;
    const newCount = currentCount + 1;

    setLineTakeCounts(prev => ({ ...prev, [lineId]: newCount }));

    try {
      await fetch('/api/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'take',
          songId,
          lyric_line_id: lineId,
          session_id: sessionId,
          take_number: newCount,
        }),
      });
    } catch (error) {
      console.error('Error recording line take:', error);
    }
  };

  const startPositionTracking = () => {
    if (positionIntervalRef.current) {
      clearInterval(positionIntervalRef.current);
    }

    positionIntervalRef.current = setInterval(() => {
      if (audioType === 'soundcloud' && widget) {
        widget.getPosition((pos: number) => {
          setPosition(pos);
          updateCurrentLine(pos);
        });
      } else if (audioType === 'direct' && audioRef.current) {
        const pos = audioRef.current.currentTime * 1000; // Convert to ms
        setPosition(pos);
        updateCurrentLine(pos);
      }
    }, 100);
  };

  const stopPositionTracking = () => {
    if (positionIntervalRef.current) {
      clearInterval(positionIntervalRef.current);
      positionIntervalRef.current = null;
    }
  };

  const updateCurrentLine = (pos: number) => {
    let newIndex = -1;
    for (let i = 0; i < lyrics.length; i++) {
      const timestamp = lyrics[i].timestamp_ms;
      if (timestamp !== null && pos >= timestamp) {
        newIndex = i;
      } else {
        break;
      }
    }

    if (newIndex !== currentLineIndex) {
      setCurrentLineIndex(newIndex);
    }

    // Check for section loop - if we've passed the end line, loop back to start
    if (loopEnabledRef.current && sectionLoopStartRef.current !== null && sectionLoopEndRef.current !== null) {
      const endLineIndex = sectionLoopEndRef.current;
      const startLineIndex = sectionLoopStartRef.current;

      // Get the timestamp of the line AFTER the end line (or use a threshold after end line)
      const endLineTimestamp = lyrics[endLineIndex]?.timestamp_ms;
      const nextLineTimestamp = lyrics[endLineIndex + 1]?.timestamp_ms;

      if (endLineTimestamp !== null) {
        // If there's a next line, loop when we reach it; otherwise loop ~2 seconds after end line starts
        const loopTriggerTime = nextLineTimestamp !== null ? nextLineTimestamp : endLineTimestamp + 2000;

        if (pos >= loopTriggerTime) {
          const startTimestamp = lyrics[startLineIndex]?.timestamp_ms;
          if (startTimestamp !== null) {
            seekTo(startTimestamp);
            setCurrentLineIndex(startLineIndex);
          }
        }
      }
    }
  };

  const handlePlay = async () => {
    if (audioType === 'soundcloud' && widget) {
      widget.play();
      startPositionTracking();
      if (isRecording && !sessionId) {
        await startPracticeSession();
      }
    } else if (audioType === 'direct' && audioRef.current) {
      audioRef.current.play();
      startPositionTracking();
      if (isRecording && !sessionId) {
        await startPracticeSession();
      }
    }
  };

  const handlePause = async () => {
    if (audioType === 'soundcloud' && widget) {
      widget.pause();
      stopPositionTracking();
      if (isRecording) {
        await endPracticeSession();
      }
    } else if (audioType === 'direct' && audioRef.current) {
      audioRef.current.pause();
      stopPositionTracking();
      if (isRecording) {
        await endPracticeSession();
      }
    }
  };

  // Toggle recording mode
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording - end any active session
      if (sessionId) {
        await endPracticeSession();
      }
      setIsRecording(false);
      setLineTakeCounts({}); // Clear takes for this session
    } else {
      // Start recording
      setIsRecording(true);
      setLineTakeCounts({}); // Start fresh
      // If already playing, start a session
      if (isPlaying && !sessionId) {
        await startPracticeSession();
      }
    }
  };

  const handleReset = () => {
    if (audioType === 'soundcloud' && widget) {
      widget.seekTo(0);
      setCurrentLineIndex(-1);
      setPosition(0);
    } else if (audioType === 'direct' && audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentLineIndex(-1);
      setPosition(0);
    }
  };

  // Go to section loop start and optionally play
  const handlePlayFromLoopStart = async (shouldPlay: boolean = true) => {
    if (sectionLoopStart === null) return;

    const startTimestamp = lyrics[sectionLoopStart]?.timestamp_ms;
    if (startTimestamp === null) return;

    seekTo(startTimestamp);
    setCurrentLineIndex(sectionLoopStart);
    setPosition(startTimestamp);

    if (shouldPlay && !isPlaying) {
      await handlePlay();
    }
  };

  // Reset to loop start if section loop is active, otherwise reset to beginning
  const handleSmartReset = () => {
    if (loopEnabled && sectionLoopStart !== null) {
      const startTimestamp = lyrics[sectionLoopStart]?.timestamp_ms;
      if (startTimestamp !== null) {
        seekTo(startTimestamp);
        setCurrentLineIndex(sectionLoopStart);
        setPosition(startTimestamp);
        return;
      }
    }
    handleReset();
  };

  const seekTo = (positionMs: number) => {
    if (audioType === 'soundcloud' && widget) {
      widget.seekTo(positionMs);
    } else if (audioType === 'direct' && audioRef.current) {
      audioRef.current.currentTime = positionMs / 1000;
    }
  };

  const getCurrentPosition = (callback: (pos: number) => void) => {
    if (audioType === 'soundcloud' && widget) {
      widget.getPosition(callback);
    } else if (audioType === 'direct' && audioRef.current) {
      callback(audioRef.current.currentTime * 1000);
    }
  };

  // Section loop functions
  const setSectionLoopMarker = (index: number, type: 'start' | 'end') => {
    if (type === 'start') {
      setSectionLoopStart(index);
      // If end is set and is before start, clear it
      if (sectionLoopEnd !== null && sectionLoopEnd < index) {
        setSectionLoopEnd(null);
      }
    } else {
      setSectionLoopEnd(index);
      // If start is set and is after end, clear it
      if (sectionLoopStart !== null && sectionLoopStart > index) {
        setSectionLoopStart(null);
      }
    }
  };

  const clearSectionLoop = () => {
    setSectionLoopStart(null);
    setSectionLoopEnd(null);
  };

  const isInSectionLoop = (index: number) => {
    if (sectionLoopStart === null || sectionLoopEnd === null) return false;
    return index >= sectionLoopStart && index <= sectionLoopEnd;
  };

  const handleSyncLine = (index: number) => {
    if (!syncMode || !isPlayerReady) return;

    getCurrentPosition((pos: number) => {
      lyrics[index].timestamp_ms = pos;
      console.log(`Synced line ${index} to ${pos}ms`);
    });
  };

  // Start playback from a sync line and begin stamping mode
  const startSyncFromLine = async (index: number) => {
    if (!isPlayerReady) return;

    // Set the sync line index to this line
    setSyncLineIndex(index);

    // If this line has a timestamp, seek to it
    const lineTimestamp = lyrics[index]?.timestamp_ms;
    if (lineTimestamp !== null && lineTimestamp !== undefined) {
      seekTo(lineTimestamp);
      setCurrentLineIndex(index);
      setPosition(lineTimestamp);
    } else {
      // No timestamp yet - use current position or start from 0
      setCurrentLineIndex(index);
    }

    // Start playing if not already
    if (!isPlaying) {
      await handlePlay();
    }
  };

  const adjustLineTimestamp = (index: number, deltaMs: number) => {
    if (index < 0 || index >= lyrics.length) return;
    const currentTs = lyrics[index].timestamp_ms;
    if (currentTs !== null) {
      lyrics[index].timestamp_ms = Math.max(0, currentTs + deltaMs);
      // Force re-render
      setLineTakeCounts(prev => ({ ...prev }));
    }
  };

  // Set line's timestamp to previous line's timestamp + 1 second
  const alignToPreviousLine = (index: number) => {
    if (index <= 0 || index >= lyrics.length) return;
    const prevLine = lyrics[index - 1];
    if (prevLine.timestamp_ms === null) return;

    // Copy previous line's timestamp and add 1 second
    const newTimestamp = prevLine.timestamp_ms + 1000;

    const updatedLyrics = lyrics.map((line, i) =>
      i === index ? { ...line, timestamp_ms: newTimestamp } : line
    );

    if (onLyricsChange) {
      onLyricsChange(updatedLyrics);
    }
  };

  const shiftAllTimestamps = (deltaMs: number) => {
    let hasChanges = false;
    for (let i = 0; i < lyrics.length; i++) {
      const currentTs = lyrics[i].timestamp_ms;
      if (currentTs !== null) {
        lyrics[i].timestamp_ms = Math.max(0, currentTs + deltaMs);
        hasChanges = true;
      }
    }
    if (hasChanges) {
      // Force re-render
      setLineTakeCounts(prev => ({ ...prev }));
    }
  };

  const handleLineTake = (line: LyricLine) => {
    if (!isRecording || !sessionId) return;
    recordLineTake(line._id, line.song_id);
  };

  const enterFullscreen = async () => {
    if (containerRef.current) {
      try {
        await containerRef.current.requestFullscreen();
      } catch (err) {
        console.error('Error entering fullscreen:', err);
      }
    }
  };

  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error('Error exiting fullscreen:', err);
      }
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  // Export lyrics as text file
  const exportLyricsAsText = () => {
    if (lyrics.length === 0) return;

    // Convert lyrics to plain text
    const textContent = lyrics.map(line => line.text).join('\n');

    // Create blob and download
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${song?.title || 'lyrics'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export lyrics with timestamps as LRC format
  const exportLyricsAsLRC = () => {
    if (lyrics.length === 0) return;

    // Convert to LRC format
    const lrcLines = lyrics.map(line => {
      if (line.timestamp_ms !== null) {
        const totalSeconds = line.timestamp_ms / 1000;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = (totalSeconds % 60).toFixed(2);
        return `[${String(minutes).padStart(2, '0')}:${seconds.padStart(5, '0')}]${line.text}`;
      }
      return line.text;
    });

    // Add metadata
    const metadata = [
      song?.title ? `[ti:${song.title}]` : '',
      song?.artist ? `[ar:${song.artist}]` : '',
      '[by:IntelliPrompter]',
      '',
    ].filter(Boolean).join('\n');

    const lrcContent = metadata + lrcLines.join('\n');

    // Create blob and download
    const blob = new Blob([lrcContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${song?.title || 'lyrics'}.lrc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export lyrics as subtitle files for lyric videos
  const exportAsSubtitles = async (format: 'srt' | 'vtt') => {
    if (!song || lyrics.length === 0) return;

    try {
      const response = await fetch(`/api/export/subtitles?songId=${song._id}&format=${format}`);
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to export subtitles');
        return;
      }

      const text = await response.text();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${song.title || 'lyrics'}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting subtitles:', error);
      alert('Failed to export subtitles');
    }
  };

  const handleSaveTimestamps = async () => {
    if (!song || lyrics.length === 0) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Save all lyrics with their timestamps
      const response = await fetch('/api/lyrics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId: song._id,
          lyrics: lyrics.map(line => ({
            _id: line._id,
            timestamp_ms: line.timestamp_ms,
          })),
        }),
      });

      if (response.ok) {
        setSaveMessage('Saved!');
        setTimeout(() => setSaveMessage(null), 2000);
      } else {
        setSaveMessage('Error saving');
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error saving timestamps:', error);
      setSaveMessage('Error saving');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const resetColors = () => {
    setBgColor(defaultColors.background);
    setActiveTextColor(defaultColors.activeText);
    setInactiveTextColor(defaultColors.inactiveText);
  };

  const toggleEditMode = () => {
    if (editMode) {
      // Exiting edit mode - cancel any pending edit
      setEditingLineIndex(null);
      setEditingText('');
    } else {
      // Entering edit mode - pause sync
      if (syncMode) {
        setSyncMode(false);
      }
      if (isPlaying) {
        handlePause();
      }
    }
    setEditMode(!editMode);
  };

  const startEditingLine = (index: number) => {
    if (!editMode) return;
    setEditingLineIndex(index);
    setEditingText(lyrics[index].text);
  };

  const cancelEdit = () => {
    setEditingLineIndex(null);
    setEditingText('');
  };

  const saveLineEdit = async () => {
    if (editingLineIndex === null || !song) return;

    const line = lyrics[editingLineIndex];

    // Check if this is a saved line (MongoDB ObjectId is 24 hex chars) or a temporary line (UUID)
    const isValidObjectId = /^[a-f\d]{24}$/i.test(line._id);

    if (isValidObjectId) {
      // Line exists in database, update via API
      try {
        const response = await fetch('/api/lyrics/line', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lineId: line._id,
            text: editingText,
          }),
        });

        if (!response.ok) {
          console.error('Failed to save line edit');
          return;
        }
      } catch (error) {
        console.error('Error saving line edit:', error);
        return;
      }
    }

    // Update local state (for both saved and unsaved lines)
    const updatedLyrics = [...lyrics];
    updatedLyrics[editingLineIndex] = { ...updatedLyrics[editingLineIndex], text: editingText };
    if (onLyricsChange) {
      onLyricsChange(updatedLyrics);
    }
    setEditingLineIndex(null);
    setEditingText('');
  };

  const addNewLine = async (afterIndex: number) => {
    if (!song) return;

    // Check if song is saved (MongoDB ObjectId is 24 hex chars)
    const isSongSaved = /^[a-f\d]{24}$/i.test(song._id);

    let newLine: LyricLine;

    if (isSongSaved) {
      // Song exists in database, use API
      try {
        const response = await fetch('/api/lyrics/line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            songId: song._id,
            afterIndex,
            text: '',
          }),
        });

        if (response.ok) {
          const { line } = await response.json();
          newLine = line;
        } else {
          console.error('Error adding new line');
          return;
        }
      } catch (error) {
        console.error('Error adding new line:', error);
        return;
      }
    } else {
      // Song not saved yet, work locally
      newLine = {
        _id: crypto.randomUUID(),
        song_id: song._id,
        line_number: afterIndex + 1,
        text: '',
        timestamp_ms: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    // Create updated lyrics array immutably
    const updatedLyrics = [
      ...lyrics.slice(0, afterIndex + 1),
      newLine,
      ...lyrics.slice(afterIndex + 1).map((line, i) => ({
        ...line,
        line_number: afterIndex + 2 + i,
      })),
    ];

    if (onLyricsChange) {
      onLyricsChange(updatedLyrics);
    }

    // Start editing the new line
    setEditingLineIndex(afterIndex + 1);
    setEditingText('');
  };

  const deleteLine = async (index: number) => {
    if (!song || lyrics.length <= 1) return; // Don't delete the last line

    const line = lyrics[index];

    // Check if this is saved data (MongoDB ObjectId is 24 hex chars)
    const isLineSaved = /^[a-f\d]{24}$/i.test(line._id);

    if (isLineSaved) {
      // Line exists in database, use API to delete
      try {
        const response = await fetch('/api/lyrics/line', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineId: line._id }),
        });

        if (!response.ok) {
          console.error('Failed to delete line');
          return;
        }
      } catch (error) {
        console.error('Error deleting line:', error);
        return;
      }
    }

    // Remove the line and update line numbers
    const updatedLyrics = lyrics
      .filter((_, i) => i !== index)
      .map((l, i) => ({ ...l, line_number: i }));

    if (onLyricsChange) {
      onLyricsChange(updatedLyrics);
    }

    // Clear editing state if we were editing this line
    if (editingLineIndex === index) {
      setEditingLineIndex(null);
      setEditingText('');
    } else if (editingLineIndex !== null && editingLineIndex > index) {
      // Adjust editing index if we deleted a line before it
      setEditingLineIndex(editingLineIndex - 1);
    }
  };

  // Merge current line's content to the end of the line above, then delete current line
  const mergeUp = async (index: number) => {
    if (index <= 0 || !song) return;

    const currentLine = lyrics[index];
    const prevLine = lyrics[index - 1];
    const mergedText = prevLine.text + ' ' + currentLine.text;

    // Check if lines are saved
    const isPrevLineSaved = /^[a-f\d]{24}$/i.test(prevLine._id);
    const isCurrentLineSaved = /^[a-f\d]{24}$/i.test(currentLine._id);

    if (isPrevLineSaved) {
      try {
        // Update the previous line with merged text
        await fetch('/api/lyrics/line', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineId: prevLine._id, text: mergedText }),
        });
      } catch (error) {
        console.error('Error updating line:', error);
        return;
      }
    }

    if (isCurrentLineSaved) {
      try {
        // Delete the current line
        await fetch('/api/lyrics/line', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineId: currentLine._id }),
        });
      } catch (error) {
        console.error('Error deleting line:', error);
        return;
      }
    }

    // Update local state: merge text into previous line, remove current line
    const updatedLyrics = lyrics
      .map((line, i) => i === index - 1 ? { ...line, text: mergedText } : line)
      .filter((_, i) => i !== index)
      .map((l, i) => ({ ...l, line_number: i }));

    if (onLyricsChange) {
      onLyricsChange(updatedLyrics);
    }

    // Clear editing state if needed
    if (editingLineIndex === index) {
      setEditingLineIndex(null);
      setEditingText('');
    } else if (editingLineIndex !== null && editingLineIndex > index) {
      setEditingLineIndex(editingLineIndex - 1);
    }
  };

  // Merge current line's content to the beginning of the line below, then delete current line
  const mergeDown = async (index: number) => {
    if (index >= lyrics.length - 1 || !song) return;

    const currentLine = lyrics[index];
    const nextLine = lyrics[index + 1];
    const mergedText = currentLine.text + ' ' + nextLine.text;

    // Check if lines are saved
    const isNextLineSaved = /^[a-f\d]{24}$/i.test(nextLine._id);
    const isCurrentLineSaved = /^[a-f\d]{24}$/i.test(currentLine._id);

    if (isNextLineSaved) {
      try {
        // Update the next line with merged text
        await fetch('/api/lyrics/line', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineId: nextLine._id, text: mergedText }),
        });
      } catch (error) {
        console.error('Error updating line:', error);
        return;
      }
    }

    if (isCurrentLineSaved) {
      try {
        // Delete the current line
        await fetch('/api/lyrics/line', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineId: currentLine._id }),
        });
      } catch (error) {
        console.error('Error deleting line:', error);
        return;
      }
    }

    // Update local state: merge text into next line, remove current line
    const updatedLyrics = lyrics
      .map((line, i) => i === index + 1 ? { ...line, text: mergedText } : line)
      .filter((_, i) => i !== index)
      .map((l, i) => ({ ...l, line_number: i }));

    if (onLyricsChange) {
      onLyricsChange(updatedLyrics);
    }

    // Clear editing state if needed
    if (editingLineIndex === index) {
      setEditingLineIndex(null);
      setEditingText('');
    } else if (editingLineIndex !== null && editingLineIndex > index) {
      setEditingLineIndex(editingLineIndex - 1);
    }
  };

  // Timeline Panel Functions
  const openTimelinePanel = (centerIndex: number) => {
    setTimelineCenterIndex(centerIndex);

    // Initialize draft timestamps from current lyrics
    const drafts: Record<number, number> = {};
    const startIdx = Math.max(0, centerIndex - 2);
    const endIdx = Math.min(lyrics.length - 1, centerIndex + 2);
    for (let i = startIdx; i <= endIdx; i++) {
      if (lyrics[i]?.timestamp_ms !== null) {
        drafts[i] = lyrics[i].timestamp_ms!;
      }
    }
    setTimelineDraftTimestamps(drafts);
    setShowTimelinePanel(true);
    timelineLoopRef.current = true;

    // Start looping the 5 lines
    startTimelineLoop(centerIndex);
  };

  const closeTimelinePanel = async (save: boolean) => {
    timelineLoopRef.current = false;
    handlePause();

    if (save && Object.keys(timelineDraftTimestamps).length > 0) {
      // Apply draft timestamps to lyrics
      const updatedLyrics = lyrics.map((line, idx) => {
        if (timelineDraftTimestamps[idx] !== undefined) {
          return { ...line, timestamp_ms: timelineDraftTimestamps[idx] };
        }
        return line;
      });

      // Save to database for saved songs
      const isSongSaved = song && /^[a-f\d]{24}$/i.test(song._id);
      if (isSongSaved) {
        for (const [idxStr, timestamp] of Object.entries(timelineDraftTimestamps)) {
          const idx = parseInt(idxStr);
          const line = lyrics[idx];
          if (line && /^[a-f\d]{24}$/i.test(line._id)) {
            try {
              await fetch('/api/lyrics/line', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lineId: line._id, timestamp_ms: timestamp }),
              });
            } catch (err) {
              console.error('Error saving timestamp:', err);
            }
          }
        }
      }

      if (onLyricsChange) {
        onLyricsChange(updatedLyrics);
      }
    }

    setShowTimelinePanel(false);
    setTimelineDraftTimestamps({});
    setDraggingLineIndex(null);
  };

  const startTimelineLoop = (centerIndex: number) => {
    if (!isPlayerReady) return;

    // Get the range of lines to loop (2 before to 2 after center)
    const startIdx = Math.max(0, centerIndex - 2);
    const endIdx = Math.min(lyrics.length - 1, centerIndex + 2);

    // Find the earliest and latest timestamps in the range
    let loopStartMs = Infinity;
    let loopEndMs = 0;

    for (let i = startIdx; i <= endIdx; i++) {
      const ts = timelineDraftTimestamps[i] ?? lyrics[i]?.timestamp_ms;
      if (ts !== null && ts !== undefined) {
        loopStartMs = Math.min(loopStartMs, ts);
        loopEndMs = Math.max(loopEndMs, ts);
      }
    }

    // Add 3 seconds after the last line for audio context
    loopEndMs += 3000;

    if (loopStartMs === Infinity) {
      // No timestamps, can't loop
      return;
    }

    // Seek to start and play
    seekTo(loopStartMs);
    handlePlay();

    // Set up loop checking
    const checkLoop = () => {
      if (!timelineLoopRef.current) return;

      getCurrentPosition((pos: number) => {
        if (pos >= loopEndMs) {
          seekTo(loopStartMs);
        }
        if (timelineLoopRef.current) {
          requestAnimationFrame(checkLoop);
        }
      });
    };
    requestAnimationFrame(checkLoop);
  };

  const handleTimelineDrag = (index: number, clientX: number) => {
    if (draggingLineIndex !== index) return;

    // Calculate time delta based on drag distance (100px = 1 second)
    const deltaX = clientX - dragStartX;
    const deltaMs = deltaX * 10; // 10ms per pixel
    const newTimestamp = Math.max(0, dragStartTimestamp + deltaMs);

    setTimelineDraftTimestamps(prev => ({
      ...prev,
      [index]: newTimestamp,
    }));
  };

  const startDragging = (index: number, clientX: number) => {
    const currentTs = timelineDraftTimestamps[index] ?? lyrics[index]?.timestamp_ms ?? 0;
    setDraggingLineIndex(index);
    setDragStartX(clientX);
    setDragStartTimestamp(currentTs);
  };

  const stopDragging = () => {
    setDraggingLineIndex(null);
  };

  // Get the 5 lines for the timeline panel
  const getTimelineLines = () => {
    const lines: Array<{ index: number; line: LyricLine; position: 'far-left' | 'left' | 'center' | 'right' | 'far-right' }> = [];
    const positions: Array<'far-left' | 'left' | 'center' | 'right' | 'far-right'> = ['far-left', 'left', 'center', 'right', 'far-right'];

    for (let offset = -2; offset <= 2; offset++) {
      const idx = timelineCenterIndex + offset;
      if (idx >= 0 && idx < lyrics.length) {
        lines.push({
          index: idx,
          line: lyrics[idx],
          position: positions[offset + 2],
        });
      }
    }
    return lines;
  };

  const splitLineAtCursor = async (cursorPosition: number) => {
    if (editingLineIndex === null || !song) return;

    const line = lyrics[editingLineIndex];
    const beforeCursor = editingText.slice(0, cursorPosition).trim();
    const afterCursor = editingText.slice(cursorPosition).trim();

    // Check if this is saved data (MongoDB ObjectId is 24 hex chars)
    const isLineSaved = /^[a-f\d]{24}$/i.test(line._id);
    const isSongSaved = /^[a-f\d]{24}$/i.test(song._id);

    let newLine: LyricLine;

    if (isLineSaved && isSongSaved) {
      // Both saved in database, use API
      try {
        // Update the current line with text before cursor
        const updateResponse = await fetch('/api/lyrics/line', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lineId: line._id,
            text: beforeCursor,
          }),
        });

        if (!updateResponse.ok) {
          console.error('Failed to update current line');
          return;
        }

        // Create a new line with text after cursor
        const createResponse = await fetch('/api/lyrics/line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            songId: song._id,
            afterIndex: editingLineIndex,
            text: afterCursor,
          }),
        });

        if (createResponse.ok) {
          const { line: createdLine } = await createResponse.json();
          newLine = createdLine;
        } else {
          console.error('Failed to create new line');
          return;
        }
      } catch (error) {
        console.error('Error splitting line:', error);
        return;
      }
    } else {
      // Not saved yet, work locally
      newLine = {
        _id: crypto.randomUUID(),
        song_id: song._id,
        line_number: editingLineIndex + 1,
        text: afterCursor,
        timestamp_ms: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    // Create updated lyrics array immutably
    const updatedLyrics = [
      ...lyrics.slice(0, editingLineIndex),
      { ...lyrics[editingLineIndex], text: beforeCursor },
      newLine,
      ...lyrics.slice(editingLineIndex + 1).map((l, i) => ({
        ...l,
        line_number: editingLineIndex + 2 + i,
      })),
    ];

    if (onLyricsChange) {
      onLyricsChange(updatedLyrics);
    }

    // Move to editing the new line
    setEditingLineIndex(editingLineIndex + 1);
    setEditingText(afterCursor);
  };

  // AI realignment - re-analyze audio to sync timestamps with edited lyrics
  const realignLyricsWithAudio = async () => {
    if (!song || lyrics.length === 0) return;

    const audioUrl = song.instrumental_url || song.soundcloud_url;
    if (!audioUrl) {
      setRealignMessage('No audio track available for analysis');
      setTimeout(() => setRealignMessage(null), 3000);
      return;
    }

    // SoundCloud URLs can't be directly analyzed - need direct audio URL
    if (isSoundCloudUrl(audioUrl)) {
      setRealignMessage('Realignment requires a direct audio file (MP3, WAV, etc.), not SoundCloud');
      setTimeout(() => setRealignMessage(null), 4000);
      return;
    }

    setIsRealigning(true);
    setRealignMessage('Analyzing audio and realigning timestamps...');

    // Helper to check if text is a section marker
    const isSectionMarker = (text: string) => /^\[.*\]$/.test(text.trim());

    // Helper to strip section markers from text
    const stripMarkers = (text: string) => text.replace(/\[.*?\]/g, '').trim();

    try {
      // Get current lyrics text (filter out pure section markers)
      const contentLines = lyrics.filter(line => {
        const text = line.text.trim();
        return text && !isSectionMarker(text);
      });
      const lyricsText = contentLines.map(line => stripMarkers(line.text)).join('\n');

      const response = await fetch('/api/analyze-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lyrics: lyricsText,
          audioUrl,
          songTitle: song.title,
          artistName: song.artist,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze audio');
      }

      const data = await response.json();
      const { timedLines, metadata } = data;

      // Match timed lines back to original lyrics by comparing cleaned text
      let timedLineIndex = 0;
      const updatedLyrics = lyrics.map((line) => {
        const cleanedText = stripMarkers(line.text).trim();

        // Skip section markers - they don't get timestamps
        if (isSectionMarker(line.text.trim()) || !cleanedText) {
          return line;
        }

        // Find matching timed line
        const timedLine = timedLines[timedLineIndex];
        if (timedLine && timedLineIndex < timedLines.length) {
          timedLineIndex++;
          return {
            ...line,
            timestamp_ms: timedLine.startMs,
          };
        }
        return line;
      });

      // Save timestamps to database for saved songs
      const isSongSaved = /^[a-f\d]{24}$/i.test(song._id);
      if (isSongSaved) {
        // Update each line's timestamp in the database
        for (const line of updatedLyrics) {
          const isLineSaved = /^[a-f\d]{24}$/i.test(line._id);
          if (isLineSaved && line.timestamp_ms !== null) {
            try {
              await fetch('/api/lyrics/line', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  lineId: line._id,
                  timestamp_ms: line.timestamp_ms,
                }),
              });
            } catch (err) {
              console.error('Error saving timestamp for line:', line._id, err);
            }
          }
        }
      }

      if (onLyricsChange) {
        onLyricsChange(updatedLyrics);
      }

      const confidence = Math.round((metadata.matchConfidence || 0) * 100);
      setRealignMessage(`Realigned ${timedLines.length} lines (${confidence}% confidence)`);
      setTimeout(() => setRealignMessage(null), 3000);
    } catch (error) {
      console.error('Error realigning lyrics:', error);
      setRealignMessage(error instanceof Error ? error.message : 'Failed to realign lyrics');
      setTimeout(() => setRealignMessage(null), 4000);
    } finally {
      setIsRealigning(false);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      startPositionTracking();
    } else {
      stopPositionTracking();
    }
  }, [isPlaying]);

  // If no song is selected, show song selection interface
  if (!song) {
    return (
      <div className="bg-base-100 shadow-lg border border-base-300 rounded-2xl p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-purple-600" />
          <h2 className="text-xl md:text-2xl font-bold text-base-content">Teleprompter</h2>
        </div>

        {/* Intro */}
        <div className="text-center mb-8">
          <svg className="w-16 h-16 text-purple-500 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
          </svg>
          <h3 className="text-2xl font-bold text-base-content mb-2">Select a Song to Practice</h3>
          <p className="text-base-content/60">Choose a song from your library to start the teleprompter</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4 max-w-4xl mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search songs, artists, albums..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-base-100 border border-base-300 text-base-content focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl"
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
              className="px-3 py-2 border border-base-300 bg-base-100 text-base-content text-sm focus:outline-hidden focus:border-purple-500 rounded-lg"
            >
              <option value="all">All Albums</option>
              {albums.map(album => (
                <option key={album} value={album}>{album}</option>
              ))}
            </select>

            <select
              value={folderFilter}
              onChange={e => setFolderFilter(e.target.value)}
              className="px-3 py-2 border border-base-300 bg-base-100 text-base-content text-sm focus:outline-hidden focus:border-purple-500 rounded-lg"
            >
              <option value="all">All Folders</option>
              {folders.map(folder => (
                <option key={folder} value={folder}>{folder}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Song Grid */}
        {loadingSongs ? (
          <div className="flex justify-center py-12">
            <svg className="w-8 h-8 text-purple-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-base-content/30 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
            </svg>
            <p className="text-base-content/60">
              {allSongs.length === 0 ? 'No songs in your library yet' : 'No songs match your search'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {filteredSongs.map(songItem => (
              <div
                key={songItem._id}
                onClick={() => handleSongSelect(songItem)}
                className="group border border-base-300 p-4 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 bg-base-100 hover:border-purple-300 cursor-pointer rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-base-content truncate group-hover:text-purple-700 transition-colors">
                      {songItem.title}
                    </h4>
                    <p className="text-sm text-base-content/70 truncate">{songItem.artist}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
                      {songItem.album && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">
                          {songItem.album}
                        </span>
                      )}
                      {(songItem.instrumental_url || songItem.soundcloud_url) && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg">
                          Has Audio
                        </span>
                      )}
                      {songItem.completed && (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg">
                          Complete
                        </span>
                      )}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://w.soundcloud.com/player/api.js"
        onLoad={loadWidget}
        strategy="lazyOnload"
      />

      <div
        ref={containerRef}
        className={`${
          isFullscreen
            ? 'fixed inset-0 z-50 flex flex-col p-10'
            : ''
        }`}
        style={isFullscreen ? { backgroundColor: bgColor } : undefined}
      >
        {!isFullscreen && audioType === 'none' && (
          <div className="mb-4 p-4 bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-xl">
            <p className="text-sm md:text-base text-amber-800">
              No audio track set. Add one in the editor to use the teleprompter with audio sync.
            </p>
          </div>
        )}

        {/* Hidden audio element for direct audio files */}
        {audioType === 'direct' && (
          <audio ref={audioRef} className="hidden" preload="metadata" />
        )}

        {/* SoundCloud iframe for SoundCloud URLs */}
        {audioType === 'soundcloud' && (song?.instrumental_url || song?.soundcloud_url) && (
          <div className="hidden">
            <iframe
              ref={iframeRef}
              width="0"
              height="0"
              scrolling="no"
              frameBorder="no"
              allow="autoplay"
              src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(
                song.instrumental_url || song.soundcloud_url || ''
              )}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`}
            />
          </div>
        )}

        <div className={`flex items-center gap-2 md:gap-3 ${isFullscreen ? 'p-4 justify-center' : 'p-3 md:p-4 rounded-xl mb-4 flex-wrap border border-slate-200/50'}`}>
          {!isFullscreen && (
            <>
              <button
                onClick={isPlaying ? handlePause : handlePlay}
                disabled={!isPlayerReady}
                className="group relative p-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                title={isPlaying ? 'Stop' : 'Play'}
              >
                <svg className={`w-7 h-7 md:w-6 md:h-6 transition-all duration-300 ${
                  !isPlayerReady ? 'text-slate-700' : 'text-slate-400 group-hover:text-green-500 group-hover:scale-110'
                }`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  {isPlaying ? (
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                  )}
                  {isPlaying && <rect x="14" y="4" width="4" height="16" rx="1" />}
                </svg>
              </button>
              <button
                onClick={handleSmartReset}
                disabled={!isPlayerReady}
                className="group p-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                title={loopEnabled && sectionLoopStart !== null ? 'Go to section start' : 'Restart from beginning'}
              >
                <svg className={`w-7 h-7 md:w-6 md:h-6 transition-all duration-300 ${
                  !isPlayerReady ? 'text-slate-700' : 'text-slate-400 group-hover:text-purple-400 group-hover:scale-110'
                }`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              {/* Play from section start button - shows when section loop is defined */}
              {sectionLoopStart !== null && sectionLoopEnd !== null && lyrics[sectionLoopStart]?.timestamp_ms !== null && (
                <button
                  onClick={() => handlePlayFromLoopStart(true)}
                  disabled={!isPlayerReady}
                  className="group p-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  title="Play from section start"
                >
                  <svg className={`w-7 h-7 md:w-6 md:h-6 transition-all duration-300 ${
                    !isPlayerReady ? 'text-slate-700' : 'text-orange-400 group-hover:text-orange-500 group-hover:scale-110'
                  }`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 8l6 4-6 4V8z" fill="currentColor" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setSyncMode(!syncMode)}
                disabled={!isPlayerReady || editMode}
                className="group p-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                title={syncMode ? 'Exit Sync Mode' : 'Sync Mode'}
              >
                <svg className={`w-7 h-7 md:w-6 md:h-6 transition-all duration-300 ${
                  !isPlayerReady || editMode ? 'text-slate-700' :
                  syncMode ? 'text-red-500 scale-110' : 'text-slate-400 group-hover:text-purple-400 group-hover:scale-110'
                }`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                </svg>
              </button>
              <button
                onClick={() => setLoopEnabled(!loopEnabled)}
                disabled={!isPlayerReady}
                className="group p-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                title={loopEnabled ? 'Disable Loop' : 'Enable Loop (repeat forever)'}
              >
                <svg className={`w-7 h-7 md:w-6 md:h-6 transition-all duration-300 ${
                  !isPlayerReady ? 'text-slate-700' :
                  loopEnabled ? 'text-green-500 scale-110' : 'text-slate-400 group-hover:text-green-500 group-hover:scale-110'
                }`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              {/* Record button for tracking practice metrics */}
              <button
                onClick={toggleRecording}
                disabled={!isPlayerReady}
                className="group p-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                title={isRecording ? 'Stop Recording Practice' : 'Record Practice (track takes & time)'}
              >
                <svg className={`w-7 h-7 md:w-6 md:h-6 transition-all duration-300 ${
                  !isPlayerReady ? 'text-slate-700' :
                  isRecording ? 'text-red-500 scale-110 animate-pulse' : 'text-slate-400 group-hover:text-red-500 group-hover:scale-110'
                }`} fill={isRecording ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  {isRecording && <circle cx="12" cy="12" r="4" fill="currentColor" />}
                </svg>
              </button>
              {/* Recording indicator */}
              {isRecording && (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-100 border border-red-300 rounded-lg">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs text-red-700 font-medium">Recording</span>
                </div>
              )}
              {/* Export button with dropdown */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={lyrics.length === 0}
                  className="group p-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  title="Export Lyrics"
                >
                  <svg className={`w-7 h-7 md:w-6 md:h-6 transition-all duration-300 ${
                    lyrics.length === 0 ? 'text-slate-700' : 'text-slate-400 group-hover:text-purple-400 group-hover:scale-110'
                  }`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[180px]">
                    <button
                      onClick={() => { exportLyricsAsText(); setShowExportMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 rounded-t-lg flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export as .txt
                    </button>
                    <button
                      onClick={() => { exportLyricsAsLRC(); setShowExportMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Export as .lrc (timed)
                    </button>
                    <div className="border-t border-slate-200 my-1" />
                    <div className="px-4 py-1 text-xs text-slate-500 font-medium">Lyric Video Subtitles</div>
                    <button
                      onClick={() => { exportAsSubtitles('srt'); setShowExportMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Export as .srt
                    </button>
                    <button
                      onClick={() => { exportAsSubtitles('vtt'); setShowExportMenu(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 rounded-b-lg flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Export as .vtt (WebVTT)
                    </button>
                  </div>
                )}
              </div>
              {/* Section loop indicator */}
              {(sectionLoopStart !== null || sectionLoopEnd !== null) && (
                <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 border border-orange-300 rounded-lg">
                  <span className="text-xs text-orange-700 font-medium">
                    Section: {sectionLoopStart !== null ? sectionLoopStart + 1 : '?'} - {sectionLoopEnd !== null ? sectionLoopEnd + 1 : '?'}
                  </span>
                  <button
                    onClick={clearSectionLoop}
                    className="p-0.5 text-orange-500 hover:text-orange-700 transition-colors"
                    title="Clear section loop"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              <button
                onClick={toggleEditMode}
                className="group p-3 transition-all duration-300"
                title={editMode ? 'Exit Edit Mode' : 'Edit Lyrics'}
              >
                <svg className={`w-7 h-7 md:w-6 md:h-6 transition-all duration-300 ${
                  editMode ? 'text-amber-500 scale-110' : 'text-slate-400 group-hover:text-amber-500 group-hover:scale-110'
                }`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
              <button
                onClick={enterFullscreen}
                className="group p-3 transition-all duration-300"
                title="Fullscreen"
              >
                <svg className="w-7 h-7 md:w-6 md:h-6 text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
              <div className="h-8 w-px bg-slate-300 mx-2" />
              <span className="text-xs md:text-sm text-slate-700 font-mono font-semibold px-3 py-1 bg-white/60 rounded-lg border border-slate-200">
                {formatTime(position)} / {formatTime(duration)}
              </span>
              <div className="h-8 w-px bg-slate-300 mx-2" />
              <div className="flex items-center gap-1 bg-white/60 rounded-lg p-1 border border-slate-200">
                <button
                  onClick={() => setTextAlign('left')}
                  className="group p-2 rounded-lg transition-all duration-300"
                  title="Align Left"
                >
                  <svg className={`w-5 h-5 transition-all duration-300 ${
                    textAlign === 'left' ? 'text-purple-400 scale-110' : 'text-slate-400 group-hover:text-purple-400 group-hover:scale-110'
                  }`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
                    <line x1="3" y1="12" x2="15" y2="12" strokeLinecap="round" />
                    <line x1="3" y1="18" x2="18" y2="18" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  onClick={() => setTextAlign('center')}
                  className="group p-2 rounded-lg transition-all duration-300"
                  title="Align Center"
                >
                  <svg className={`w-5 h-5 transition-all duration-300 ${
                    textAlign === 'center' ? 'text-purple-400 scale-110' : 'text-slate-400 group-hover:text-purple-400 group-hover:scale-110'
                  }`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
                    <line x1="6" y1="12" x2="18" y2="12" strokeLinecap="round" />
                    <line x1="4" y1="18" x2="20" y2="18" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  onClick={() => setTextAlign('right')}
                  className="group p-2 rounded-lg transition-all duration-300"
                  title="Align Right"
                >
                  <svg className={`w-5 h-5 transition-all duration-300 ${
                    textAlign === 'right' ? 'text-purple-400 scale-110' : 'text-slate-400 group-hover:text-purple-400 group-hover:scale-110'
                  }`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
                    <line x1="9" y1="12" x2="21" y2="12" strokeLinecap="round" />
                    <line x1="6" y1="18" x2="21" y2="18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <label className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-1 border border-slate-200 hover:bg-white/80 transition-colors cursor-pointer">
                <span className="text-xs md:text-sm font-semibold text-slate-700">Auto</span>
                <input
                  type="checkbox"
                  checked={autoScale}
                  onChange={e => setAutoScale(e.target.checked)}
                  className="w-5 h-5 accent-purple-600 cursor-pointer transition-transform hover:scale-110"
                />
              </label>
              {!autoScale && (
                <label className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-1 border border-slate-200">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <input
                    type="range"
                    min="24"
                    max="96"
                    value={fontSize}
                    onChange={e => setFontSize(Number(e.target.value))}
                    className="w-20 md:w-32 accent-purple-600 cursor-pointer"
                  />
                </label>
              )}
              <label className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-1 border border-slate-200">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={lineHeight}
                  onChange={e => setLineHeight(Number(e.target.value))}
                  className="w-20 md:w-32 accent-purple-600 cursor-pointer"
                />
              </label>
              <div className="h-8 w-px bg-slate-300 mx-1" />
              <label className="flex items-center gap-1.5 bg-white/60 rounded-lg px-2 py-1 border border-slate-200" title="Background Color">
                <span className="text-xs text-slate-600">BG</span>
                <input
                  type="color"
                  value={bgColor}
                  onChange={e => setBgColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0"
                />
              </label>
              <label className="flex items-center gap-1.5 bg-white/60 rounded-lg px-2 py-1 border border-slate-200" title="Active Line Color">
                <span className="text-xs text-slate-600">Active</span>
                <input
                  type="color"
                  value={activeTextColor}
                  onChange={e => setActiveTextColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0"
                />
              </label>
              <label className="flex items-center gap-1.5 bg-white/60 rounded-lg px-2 py-1 border border-slate-200" title="Inactive Line Color">
                <span className="text-xs text-slate-600">Inactive</span>
                <input
                  type="color"
                  value={inactiveTextColor}
                  onChange={e => setInactiveTextColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0"
                />
              </label>
              <button
                onClick={resetColors}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Reset Colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <div className="h-8 w-px bg-slate-300 mx-1" />
              <button
                onClick={handleSaveTimestamps}
                disabled={isSaving || !song}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors"
                title="Save Timestamps"
              >
                {isSaving ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {saveMessage || 'Save'}
              </button>
            </>
          )}
          {isFullscreen && (
            <div
              className={`fixed bottom-6 left-6 flex items-center gap-2 p-3 bg-black/40 backdrop-blur-md rounded-2xl z-50 border border-white/10 transition-all duration-500 ${
                showFullscreenControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
              }`}
              onMouseEnter={() => setShowFullscreenControls(true)}
            >
              <button
                onClick={isPlaying ? handlePause : handlePlay}
                disabled={!isPlayerReady}
                className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-xl transition-all duration-200 hover:scale-105"
                title={isPlaying ? 'Pause' : 'Play'}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  {isPlaying ? (
                    <>
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </>
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                  )}
                </svg>
              </button>
              <button
                onClick={handleSmartReset}
                disabled={!isPlayerReady}
                className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-xl transition-all duration-200 hover:scale-105"
                title={loopEnabled && sectionLoopStart !== null ? 'Go to section start' : 'Restart from beginning'}
                aria-label={loopEnabled && sectionLoopStart !== null ? 'Go to section start' : 'Restart from beginning'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              {/* Play from section start button in fullscreen */}
              {sectionLoopStart !== null && sectionLoopEnd !== null && lyrics[sectionLoopStart]?.timestamp_ms !== null && (
                <button
                  onClick={() => handlePlayFromLoopStart(true)}
                  disabled={!isPlayerReady}
                  className="p-3 bg-orange-500/50 hover:bg-orange-500/70 disabled:opacity-50 text-white rounded-xl transition-all duration-200 hover:scale-105"
                  title="Play from section start"
                  aria-label="Play from section start"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 8l6 4-6 4V8z" fill="currentColor" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setSyncMode(!syncMode)}
                disabled={!isPlayerReady || editMode}
                className={`p-3 ${syncMode ? 'bg-red-500/50 hover:bg-red-500/70' : 'bg-white/10 hover:bg-white/20'} disabled:opacity-50 text-white rounded-xl transition-all duration-200 hover:scale-105`}
                title={syncMode ? 'Exit Sync Mode' : 'Sync Mode'}
                aria-label={syncMode ? 'Exit Sync Mode' : 'Sync Mode'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                </svg>
              </button>
              <button
                onClick={() => setLoopEnabled(!loopEnabled)}
                disabled={!isPlayerReady}
                className={`p-3 ${loopEnabled ? 'bg-green-500/50 hover:bg-green-500/70' : 'bg-white/10 hover:bg-white/20'} disabled:opacity-50 text-white rounded-xl transition-all duration-200 hover:scale-105`}
                title={loopEnabled ? 'Disable Loop' : 'Enable Loop (repeat forever)'}
                aria-label={loopEnabled ? 'Disable Loop' : 'Enable Loop'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              {/* Record button in fullscreen */}
              <button
                onClick={toggleRecording}
                disabled={!isPlayerReady}
                className={`p-3 ${isRecording ? 'bg-red-500/50 hover:bg-red-500/70' : 'bg-white/10 hover:bg-white/20'} disabled:opacity-50 text-white rounded-xl transition-all duration-200 hover:scale-105`}
                title={isRecording ? 'Stop Recording' : 'Record Practice'}
                aria-label={isRecording ? 'Stop Recording' : 'Record Practice'}
              >
                <svg className={`w-6 h-6 ${isRecording ? 'animate-pulse' : ''}`} fill={isRecording ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  {isRecording && <circle cx="12" cy="12" r="4" fill="currentColor" />}
                </svg>
              </button>
              {/* Recording indicator in fullscreen */}
              {isRecording && (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-500/50 text-white rounded-xl">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-xs font-medium">REC</span>
                </div>
              )}
              {/* Section loop indicator in fullscreen */}
              {(sectionLoopStart !== null || sectionLoopEnd !== null) && (
                <button
                  onClick={clearSectionLoop}
                  className="flex items-center gap-1 px-2 py-1 bg-orange-500/50 hover:bg-orange-500/70 text-white rounded-xl transition-all duration-200"
                  title="Clear section loop"
                >
                  <span className="text-xs font-medium">
                    {sectionLoopStart !== null ? sectionLoopStart + 1 : '?'}-{sectionLoopEnd !== null ? sectionLoopEnd + 1 : '?'}
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button
                onClick={toggleEditMode}
                className={`p-3 ${editMode ? 'bg-amber-500/50 hover:bg-amber-500/70' : 'bg-white/10 hover:bg-white/20'} text-white rounded-xl transition-all duration-200 hover:scale-105`}
                title={editMode ? 'Exit Edit Mode' : 'Edit Lyrics'}
                aria-label={editMode ? 'Exit Edit Mode' : 'Edit Lyrics'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
              <div className="w-px h-8 bg-white/20 mx-1" />
              <button
                onClick={exitFullscreen}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 hover:scale-105"
                title="Exit Fullscreen"
                aria-label="Exit Fullscreen"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {!isFullscreen && syncMode && (
          <div className="mb-4 p-4 bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-blue-800 text-xs md:text-sm">
                <strong>🎯 Sync Mode:</strong> Press <kbd className="px-1.5 py-0.5 bg-blue-200 rounded text-xs font-mono">Enter</kbd> to sync line {syncLineIndex + 1} of {lyrics.length} and advance. <kbd className="px-1.5 py-0.5 bg-blue-200 rounded text-xs font-mono">Backspace</kbd> to go back.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-700 font-medium">Shift All:</span>
                <button
                  onClick={() => shiftAllTimestamps(-300)}
                  className="px-3 py-1 text-xs font-medium bg-blue-200 hover:bg-blue-300 text-blue-800 rounded-lg transition-colors"
                  title="Shift all timestamps 300ms earlier"
                >
                  -300ms
                </button>
                <button
                  onClick={() => shiftAllTimestamps(300)}
                  className="px-3 py-1 text-xs font-medium bg-blue-200 hover:bg-blue-300 text-blue-800 rounded-lg transition-colors"
                  title="Shift all timestamps 300ms later"
                >
                  +300ms
                </button>
              </div>
            </div>
          </div>
        )}

        {!isFullscreen && editMode && (
          <div className="mb-4 p-4 bg-linear-to-r from-amber-50 to-yellow-50 border border-amber-200/50 rounded-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <p className="text-amber-800 text-xs md:text-sm flex-1">
                <strong>Edit Mode:</strong> Click the pencil icon to edit a line, or the <span className="text-green-600">+</span> to add a new line after. Press <kbd className="px-1.5 py-0.5 bg-amber-200 rounded text-xs font-mono">Enter</kbd> to save, <kbd className="px-1.5 py-0.5 bg-amber-200 rounded text-xs font-mono">Shift+Enter</kbd> to split at cursor, or <kbd className="px-1.5 py-0.5 bg-amber-200 rounded text-xs font-mono">Esc</kbd> to cancel.
              </p>
              <button
                onClick={realignLyricsWithAudio}
                disabled={isRealigning || audioType === 'none'}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isRealigning
                    ? 'bg-purple-200 text-purple-600 cursor-wait'
                    : audioType === 'none'
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md'
                }`}
                title={audioType === 'none' ? 'No audio track available' : 'Re-analyze audio to realign timestamps with edited lyrics'}
              >
                {isRealigning ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Realign with Audio
                  </>
                )}
              </button>
            </div>
            {realignMessage && (
              <div className={`mt-3 p-2 rounded-lg text-sm ${
                realignMessage.includes('Failed') || realignMessage.includes('No audio') || realignMessage.includes('requires')
                  ? 'bg-red-100 text-red-700'
                  : realignMessage.includes('Analyzing')
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {realignMessage}
              </div>
            )}
          </div>
        )}

        {!isFullscreen && (
          <div className="mb-6 p-3 bg-slate-50 border border-slate-200/50 rounded-xl">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono">Space</kbd> Play/Pause</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono">←</kbd><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono ml-0.5">→</kbd> Seek ±5s</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono">R</kbd> Reset</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono">F</kbd> Fullscreen</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono">S</kbd> Sync Mode</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono">L</kbd> Loop</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono">P</kbd> Record</span>
              <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono">⌘⇧+</kbd>/<kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono ml-0.5">⌘⇧-</kbd> Font Size</span>
              {!autoScale && <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono">↑</kbd><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono ml-0.5">↓</kbd> Font Size</span>}
            </div>
          </div>
        )}

        <div
          ref={lyricsContainerRef}
          className={`rounded-2xl overflow-y-auto overflow-x-hidden scroll-smooth ${
          isFullscreen
            ? 'flex-1 px-6 md:px-12 lg:px-20'
            : 'p-4 md:p-8 min-h-[300px] md:min-h-[500px] max-h-[600px] border border-slate-800/50 shadow-inner'
        }`}
          style={{ backgroundColor: isFullscreen ? 'transparent' : bgColor }}>
          {lyrics.length === 0 ? (
            <div className="text-center text-slate-500 py-20">No lyrics to display</div>
          ) : (
            <div style={{ lineHeight }}>
              {lyrics.map((line, index) => {
                const isActive = index === currentLineIndex;
                const isPast = index < currentLineIndex;
                const isSyncTarget = syncMode && index === syncLineIndex;
                // Line is "done" if it's before the sync index OR if it's the current sync target and has a timestamp
                const isSyncDone = syncMode && (index < syncLineIndex || (index === syncLineIndex && line.timestamp_ms !== null && syncLineIndex === lyrics.length - 1));
                const hasTimestamp = line.timestamp_ms !== null;
                const takeCount = lineTakeCounts[line._id] || 0;

                // Section loop indicators
                const isLoopStart = sectionLoopStart === index;
                const isLoopEnd = sectionLoopEnd === index;
                const isInLoop = isInSectionLoop(index);

                const longestLine = lyrics.reduce((max, l) => l.text.length > max ? l.text.length : max, 0);
                const calculatedFontSize = autoScale
                  ? Math.min(96, Math.max(24, (isFullscreen ? window.innerWidth : 800) * 0.8 / longestLine))
                  : fontSize;

                // Spotlight mode: when left-aligned in fullscreen, active line flies to the right and scales up
                const isSpotlightMode = isFullscreen && textAlign === 'left' && isActive && !editMode && !syncMode;
                // Calculate spotlight font size - more conservative to allow multi-line wrapping
                const spotlightFontSize = autoScale
                  ? Math.min(96, Math.max(36, (window.innerWidth * 0.35) / Math.max(line.text.length * 0.4, 8)))
                  : Math.min(fontSize * 1.5, 96);

                return (
                  <div
                    key={line._id}
                    ref={el => { lineRefs.current[index] = el; }}
                    onClick={() => {
                      if (editMode) {
                        // Don't seek in edit mode
                        return;
                      }
                      if (syncMode) {
                        setSyncLineIndex(index);
                        handleSyncLine(index);
                      } else if (line.timestamp_ms !== null && isPlayerReady) {
                        // Seek to this line's timestamp
                        seekTo(line.timestamp_ms);
                        setCurrentLineIndex(index);
                        // Also record take if in a session
                        if (isActive && sessionId) {
                          handleLineTake(line);
                        }
                      } else if (isActive && sessionId) {
                        handleLineTake(line);
                      }
                    }}
                    className={`relative group ${
                      isSpotlightMode
                        ? 'transition-[margin,padding,font-size,opacity] duration-500 ease-in-out'
                        : 'transition-all duration-500 ease-out'
                    } ${
                      !editMode && (syncMode || line.timestamp_ms !== null) ? 'cursor-pointer hover:opacity-80' : ''
                    } ${
                      editMode && editingLineIndex !== index ? 'hover:bg-white/5 rounded-lg' : ''
                    } ${
                      isSpotlightMode
                        ? 'opacity-100 z-10'
                        : syncMode
                        ? isSyncTarget
                          ? 'opacity-100 scale-105'
                          : isSyncDone
                          ? 'opacity-60'
                          : 'opacity-40'
                        : isActive
                        ? 'opacity-100 scale-105 md:scale-110'
                        : isPast
                        ? 'opacity-30'
                        : 'opacity-50'
                    } ${
                      isInLoop && loopEnabled ? 'pl-4 border-l-4 border-orange-500/70' : ''
                    } ${
                      isLoopStart && loopEnabled ? 'border-t-2 border-t-orange-500/70 pt-1' : ''
                    } ${
                      isLoopEnd && loopEnabled ? 'border-b-2 border-b-orange-500/70 pb-1' : ''
                    }`}
                    style={{
                      fontSize: isSpotlightMode ? `${spotlightFontSize}px` : `${calculatedFontSize}px`,
                      fontWeight: isActive || isSyncTarget ? 'bold' : 'normal',
                      color: syncMode
                        ? isSyncTarget
                          ? '#22d3ee'
                          : isSyncDone
                          ? '#22c55e'
                          : inactiveTextColor
                        : isActive
                        ? activeTextColor
                        : inactiveTextColor,
                      textShadow: isSpotlightMode
                        ? `0 0 20px ${activeTextColor}60`
                        : isActive
                        ? `0 0 15px ${activeTextColor}50`
                        : isSyncTarget
                        ? '0 0 10px rgba(34, 211, 238, 0.4)'
                        : 'none',
                      textAlign: isSpotlightMode ? 'right' : textAlign,
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      // Spotlight: use margin to shift right, staying in viewport
                      marginLeft: isSpotlightMode ? '35%' : undefined,
                      marginRight: isSpotlightMode ? '3%' : undefined,
                      maxWidth: isSpotlightMode ? '62%' : undefined,
                      paddingTop: isSpotlightMode ? '0.4em' : undefined,
                      paddingBottom: isSpotlightMode ? '0.4em' : undefined,
                      background: isSpotlightMode
                        ? `linear-gradient(90deg, transparent 0%, ${bgColor}ee 20%, ${bgColor} 100%)`
                        : undefined,
                      borderRadius: isSpotlightMode ? '0.3em' : undefined,
                    }}
                  >
                    {/* Edit mode: show input when editing this line */}
                    {editMode && editingLineIndex === index ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.shiftKey) {
                              e.preventDefault();
                              const cursorPosition = (e.target as HTMLInputElement).selectionStart || 0;
                              splitLineAtCursor(cursorPosition);
                            } else if (e.key === 'Enter') {
                              saveLineEdit();
                            } else if (e.key === 'Escape') {
                              cancelEdit();
                            }
                          }}
                          className="flex-1 px-3 py-2 bg-slate-800 border border-amber-500/50 rounded-lg text-white text-base focus:outline-none focus:border-amber-400"
                          autoFocus
                        />
                        <button
                          onClick={saveLineEdit}
                          className="p-2 bg-green-500/30 hover:bg-green-500/50 rounded-lg transition-colors"
                          title="Save"
                        >
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <span className="flex-1">
                          {syncMode && isSyncTarget && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startSyncFromLine(index);
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 mr-2 bg-cyan-500/30 hover:bg-cyan-500/50 rounded-lg transition-colors animate-pulse"
                              title="Play from here and stamp lines with Enter"
                            >
                              <span className="text-cyan-300 text-lg">▶</span>
                            </button>
                          )}
                          {line.text}
                          {/* Sync mode timing */}
                          {syncMode && isSyncDone && (
                            <span className="inline-flex items-center ml-3 gap-1">
                              <span className="text-green-400 text-sm">✓</span>
                              <span className="text-xs text-slate-400 font-mono">
                                {((line.timestamp_ms || 0) / 1000).toFixed(1)}s
                              </span>
                            </span>
                          )}
                          {/* Show timestamp in normal view */}
                          {!isFullscreen && !syncMode && !editMode && hasTimestamp && (
                            <span className="inline-flex items-center ml-3 gap-1">
                              <span className="text-xs text-slate-400 font-mono">
                                {((line.timestamp_ms || 0) / 1000).toFixed(1)}s
                              </span>
                            </span>
                          )}
                          {!isFullscreen && !syncMode && !editMode && takeCount > 0 && (
                            <span className="ml-2 text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full border border-purple-400/30">
                              {takeCount}
                            </span>
                          )}
                        </span>

                        {/* Edit mode: hover actions on the right */}
                        {editMode && editingLineIndex !== index && (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 ml-4 shrink-0 bg-slate-900/90 backdrop-blur-sm rounded-lg px-2 py-1">
                            {/* Edit */}
                            <button
                              onClick={(e) => { e.stopPropagation(); startEditingLine(index); }}
                              className="inline-flex items-center justify-center w-7 h-7 bg-amber-500/40 hover:bg-amber-500/60 rounded-md transition-colors"
                              title="Edit"
                            >
                              <svg className="w-3.5 h-3.5 text-amber-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            {/* Add line */}
                            <button
                              onClick={(e) => { e.stopPropagation(); addNewLine(index); }}
                              className="inline-flex items-center justify-center w-7 h-7 bg-green-500/40 hover:bg-green-500/60 rounded-md transition-colors"
                              title="Add line after"
                            >
                              <svg className="w-3.5 h-3.5 text-green-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                            {/* Merge up */}
                            {index > 0 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); mergeUp(index); }}
                                className="inline-flex items-center justify-center w-7 h-7 bg-purple-500/40 hover:bg-purple-500/60 rounded-md transition-colors"
                                title="Merge with line above"
                              >
                                <svg className="w-3.5 h-3.5 text-purple-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                            )}
                            {/* Merge down */}
                            {index < lyrics.length - 1 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); mergeDown(index); }}
                                className="inline-flex items-center justify-center w-7 h-7 bg-purple-500/40 hover:bg-purple-500/60 rounded-md transition-colors"
                                title="Merge with line below"
                              >
                                <svg className="w-3.5 h-3.5 text-purple-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            )}
                            {/* Copy time from above (+1s) */}
                            {index > 0 && lyrics[index - 1]?.timestamp_ms !== null && (
                              <button
                                onClick={(e) => { e.stopPropagation(); alignToPreviousLine(index); }}
                                className="inline-flex items-center justify-center w-7 h-7 bg-blue-500/40 hover:bg-blue-500/60 rounded-md transition-colors"
                                title="Copy time from above (+1s)"
                              >
                                <svg className="w-3.5 h-3.5 text-blue-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            )}
                            {/* Time adjust if has timestamp */}
                            {hasTimestamp && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); adjustLineTimestamp(index, -100); }}
                                  className="inline-flex items-center justify-center w-6 h-7 bg-slate-600/60 hover:bg-slate-500/60 rounded-md transition-colors text-xs text-slate-200 font-bold"
                                  title="-100ms"
                                >
                                  -
                                </button>
                                <span className="text-xs text-slate-300 font-mono px-1">
                                  {((line.timestamp_ms || 0) / 1000).toFixed(1)}s
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); adjustLineTimestamp(index, 100); }}
                                  className="inline-flex items-center justify-center w-6 h-7 bg-slate-600/60 hover:bg-slate-500/60 rounded-md transition-colors text-xs text-slate-200 font-bold"
                                  title="+100ms"
                                >
                                  +
                                </button>
                                {/* Timeline editor */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); openTimelinePanel(index); }}
                                  className="inline-flex items-center justify-center w-7 h-7 bg-indigo-500/40 hover:bg-indigo-500/60 rounded-md transition-colors"
                                  title="Visual timeline editor"
                                >
                                  <svg className="w-3.5 h-3.5 text-indigo-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                  </svg>
                                </button>
                              </>
                            )}
                            {/* Loop markers */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setSectionLoopMarker(index, 'start'); }}
                              className={`inline-flex items-center justify-center w-6 h-7 rounded-md transition-colors ${
                                isLoopStart ? 'bg-orange-500/70' : 'bg-orange-500/40 hover:bg-orange-500/60'
                              }`}
                              title={isLoopStart ? 'Loop start' : 'Set loop start'}
                            >
                              <span className="text-xs text-orange-100 font-bold">[</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSectionLoopMarker(index, 'end'); }}
                              className={`inline-flex items-center justify-center w-6 h-7 rounded-md transition-colors ${
                                isLoopEnd ? 'bg-orange-500/70' : 'bg-orange-500/40 hover:bg-orange-500/60'
                              }`}
                              title={isLoopEnd ? 'Loop end' : 'Set loop end'}
                            >
                              <span className="text-xs text-orange-100 font-bold">]</span>
                            </button>
                            {/* Delete */}
                            {lyrics.length > 1 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteLine(index); }}
                                className="inline-flex items-center justify-center w-7 h-7 bg-red-500/40 hover:bg-red-500/60 rounded-md transition-colors"
                                title="Delete line"
                              >
                                <svg className="w-3.5 h-3.5 text-red-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Timeline Editor Panel */}
      {showTimelinePanel && (
        <div
          ref={timelinePanelRef}
          className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-indigo-500/30 shadow-2xl z-50 animate-in slide-in-from-bottom duration-300"
          onMouseMove={(e) => draggingLineIndex !== null && handleTimelineDrag(draggingLineIndex, e.clientX)}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-indigo-500 rounded-full" />
              <h3 className="text-lg font-semibold text-white">Timeline Editor</h3>
              <span className="text-sm text-slate-400">Drag lines left/right to adjust timing</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => closeTimelinePanel(false)}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => closeTimelinePanel(true)}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>

          {/* Timeline visualization */}
          <div className="px-6 py-6">
            {/* Time ruler */}
            <div className="relative h-8 mb-4 border-b border-slate-600/50">
              {getTimelineLines().map(({ index }) => {
                const ts = timelineDraftTimestamps[index] ?? lyrics[index]?.timestamp_ms ?? 0;
                const minTs = Math.min(...getTimelineLines().map(l => timelineDraftTimestamps[l.index] ?? lyrics[l.index]?.timestamp_ms ?? 0));
                const maxTs = Math.max(...getTimelineLines().map(l => timelineDraftTimestamps[l.index] ?? lyrics[l.index]?.timestamp_ms ?? 0)) + 1000;
                const range = maxTs - minTs || 1;
                const leftPercent = ((ts - minTs) / range) * 80 + 10; // 10-90% range
                return (
                  <div
                    key={index}
                    className="absolute top-0 h-full flex flex-col items-center"
                    style={{ left: `${leftPercent}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className={`h-4 w-0.5 ${index === timelineCenterIndex ? 'bg-indigo-400' : 'bg-slate-500'}`} />
                    <span className="text-xs text-slate-400 font-mono mt-1">
                      {(ts / 1000).toFixed(1)}s
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Draggable line cards */}
            <div className="flex items-stretch justify-center gap-4 min-h-[120px]">
              {getTimelineLines().map(({ index, line, position }) => {
                const ts = timelineDraftTimestamps[index] ?? line.timestamp_ms ?? 0;
                const isCenter = position === 'center';
                const isDragging = draggingLineIndex === index;

                return (
                  <div
                    key={index}
                    className={`relative flex-1 max-w-[280px] rounded-xl border-2 transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
                      isCenter
                        ? 'bg-indigo-900/50 border-indigo-400 shadow-lg shadow-indigo-500/20'
                        : 'bg-slate-800/50 border-slate-600 hover:border-slate-500'
                    } ${isDragging ? 'scale-105 shadow-xl' : ''}`}
                    onMouseDown={(e) => startDragging(index, e.clientX)}
                  >
                    {/* Position indicator */}
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-medium ${
                      isCenter ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {position === 'far-left' && '−2'}
                      {position === 'left' && '−1'}
                      {position === 'center' && 'Current'}
                      {position === 'right' && '+1'}
                      {position === 'far-right' && '+2'}
                    </div>

                    <div className="p-4">
                      {/* Timestamp */}
                      <div className={`text-center mb-2 font-mono text-lg ${isCenter ? 'text-indigo-300' : 'text-slate-400'}`}>
                        {(ts / 1000).toFixed(2)}s
                      </div>

                      {/* Line text */}
                      <p className={`text-center text-sm leading-relaxed ${isCenter ? 'text-white' : 'text-slate-300'}`}>
                        {line.text.length > 60 ? line.text.substring(0, 60) + '...' : line.text}
                      </p>

                      {/* Drag indicator */}
                      <div className="flex justify-center mt-3 gap-1">
                        <div className={`w-1 h-1 rounded-full ${isCenter ? 'bg-indigo-400' : 'bg-slate-500'}`} />
                        <div className={`w-1 h-1 rounded-full ${isCenter ? 'bg-indigo-400' : 'bg-slate-500'}`} />
                        <div className={`w-1 h-1 rounded-full ${isCenter ? 'bg-indigo-400' : 'bg-slate-500'}`} />
                      </div>
                    </div>

                    {/* Fine-tune buttons */}
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTimelineDraftTimestamps(prev => ({
                            ...prev,
                            [index]: Math.max(0, (prev[index] ?? line.timestamp_ms ?? 0) - 100),
                          }));
                        }}
                        className="px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded transition-colors"
                      >
                        −100ms
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTimelineDraftTimestamps(prev => ({
                            ...prev,
                            [index]: (prev[index] ?? line.timestamp_ms ?? 0) + 100,
                          }));
                        }}
                        className="px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded transition-colors"
                      >
                        +100ms
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Audio playback indicator */}
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Looping section • {isPlaying ? 'Playing' : 'Paused'}</span>
              <button
                onClick={() => isPlaying ? handlePause() : startTimelineLoop(timelineCenterIndex)}
                className="ml-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}