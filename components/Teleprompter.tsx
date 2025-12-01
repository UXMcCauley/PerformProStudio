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

export default function Teleprompter({ song, lyrics }: Props) {
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

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fullscreenControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const positionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sessionStartTimeRef = useRef<number | null>(null);

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
      setIsPlaying(false);
      setPosition(0);
      setCurrentLineIndex(-1);
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
        case 'Enter':
          // In sync mode: sync current line and advance to next
          e.preventDefault();
          if (syncMode && isPlayerReady && syncLineIndex < lyrics.length) {
            getCurrentPosition((pos: number) => {
              lyrics[syncLineIndex].timestamp_ms = pos;
              console.log(`Synced line ${syncLineIndex} to ${pos}ms`);
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
  };

  const handlePlay = async () => {
    if (audioType === 'soundcloud' && widget) {
      widget.play();
      startPositionTracking();
      if (!sessionId) {
        await startPracticeSession();
      }
    } else if (audioType === 'direct' && audioRef.current) {
      audioRef.current.play();
      startPositionTracking();
      if (!sessionId) {
        await startPracticeSession();
      }
    }
  };

  const handlePause = async () => {
    if (audioType === 'soundcloud' && widget) {
      widget.pause();
      stopPositionTracking();
      await endPracticeSession();
    } else if (audioType === 'direct' && audioRef.current) {
      audioRef.current.pause();
      stopPositionTracking();
      await endPracticeSession();
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

  const handleSyncLine = (index: number) => {
    if (!syncMode || !isPlayerReady) return;

    getCurrentPosition((pos: number) => {
      lyrics[index].timestamp_ms = pos;
      console.log(`Synced line ${index} to ${pos}ms`);
    });
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
    if (!sessionId) return;
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
    try {
      const response = await fetch('/api/lyrics/line', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineId: line._id,
          text: editingText,
        }),
      });

      if (response.ok) {
        // Update local state
        lyrics[editingLineIndex].text = editingText;
        setLineTakeCounts(prev => ({ ...prev })); // Force re-render
        setEditingLineIndex(null);
        setEditingText('');
      } else {
        console.error('Failed to save line edit');
      }
    } catch (error) {
      console.error('Error saving line edit:', error);
    }
  };

  const addNewLine = async (afterIndex: number) => {
    if (!song) return;

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
        const { line: newLine } = await response.json();
        // Insert the new line after the specified index
        lyrics.splice(afterIndex + 1, 0, newLine);
        // Update line numbers for all subsequent lines
        for (let i = afterIndex + 2; i < lyrics.length; i++) {
          lyrics[i].line_number = i;
        }
        setLineTakeCounts(prev => ({ ...prev })); // Force re-render
        // Start editing the new line
        setEditingLineIndex(afterIndex + 1);
        setEditingText('');
      }
    } catch (error) {
      console.error('Error adding new line:', error);
    }
  };

  const splitLineAtCursor = async (cursorPosition: number) => {
    if (editingLineIndex === null || !song) return;

    const line = lyrics[editingLineIndex];
    const beforeCursor = editingText.slice(0, cursorPosition).trim();
    const afterCursor = editingText.slice(cursorPosition).trim();

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
        const { line: newLine } = await createResponse.json();
        // Update current line text
        lyrics[editingLineIndex].text = beforeCursor;
        // Insert the new line
        lyrics.splice(editingLineIndex + 1, 0, newLine);
        // Update line numbers
        for (let i = editingLineIndex + 2; i < lyrics.length; i++) {
          lyrics[i].line_number = i;
        }
        setLineTakeCounts(prev => ({ ...prev })); // Force re-render
        // Move to editing the new line
        setEditingLineIndex(editingLineIndex + 1);
        setEditingText(afterCursor);
      }
    } catch (error) {
      console.error('Error splitting line:', error);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      startPositionTracking();
    } else {
      stopPositionTracking();
    }
  }, [isPlaying]);

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
                onClick={handleReset}
                disabled={!isPlayerReady}
                className="group p-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                title="Reset"
              >
                <svg className={`w-7 h-7 md:w-6 md:h-6 transition-all duration-500 ${
                  !isPlayerReady ? 'text-slate-700' : 'text-slate-400 group-hover:text-purple-400 group-hover:scale-110 group-hover:rotate-180'
                }`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
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
                onClick={handleReset}
                disabled={!isPlayerReady}
                className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-xl transition-all duration-200 hover:scale-105"
                title="Restart"
                aria-label="Restart"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
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
            <p className="text-amber-800 text-xs md:text-sm">
              <strong>✏️ Edit Mode:</strong> Click the pencil icon to edit a line, or the <span className="text-green-600">+</span> to add a new line after. Press <kbd className="px-1.5 py-0.5 bg-amber-200 rounded text-xs font-mono">Enter</kbd> to save, <kbd className="px-1.5 py-0.5 bg-amber-200 rounded text-xs font-mono">Shift+Enter</kbd> to split at cursor, or <kbd className="px-1.5 py-0.5 bg-amber-200 rounded text-xs font-mono">Esc</kbd> to cancel.
            </p>
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
              {!autoScale && <span><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono">↑</kbd><kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono ml-0.5">↓</kbd> Font Size</span>}
            </div>
          </div>
        )}

        <div
          ref={lyricsContainerRef}
          className={`rounded-2xl overflow-y-auto scroll-smooth ${
          isFullscreen
            ? 'flex-1'
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
                const isSyncDone = syncMode && index < syncLineIndex;
                const takeCount = lineTakeCounts[line._id] || 0;

                const longestLine = lyrics.reduce((max, l) => l.text.length > max ? l.text.length : max, 0);
                const calculatedFontSize = autoScale
                  ? Math.min(96, Math.max(24, (isFullscreen ? window.innerWidth : 800) * 0.8 / longestLine))
                  : fontSize;

                return (
                  <div
                    key={line._id}
                    ref={el => { lineRefs.current[index] = el; }}
                    onClick={() => {
                      if (syncMode) {
                        setSyncLineIndex(index);
                        handleSyncLine(index);
                      } else if (isActive && sessionId) {
                        handleLineTake(line);
                      }
                    }}
                    className={`transition-all duration-500 ease-out ${
                      syncMode || (isActive && sessionId) ? 'cursor-pointer hover:opacity-80' : ''
                    } ${
                      syncMode
                        ? isSyncTarget
                          ? 'opacity-100 scale-105'
                          : isSyncDone
                          ? 'opacity-60'
                          : 'opacity-40'
                        : isActive
                        ? 'opacity-100 scale-105 md:scale-110 animate-pulse'
                        : isPast
                        ? 'opacity-30'
                        : 'opacity-50'
                    }`}
                    style={{
                      fontSize: `${calculatedFontSize}px`,
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
                      textShadow: isActive
                        ? `0 0 30px ${activeTextColor}80, 0 0 60px ${activeTextColor}40`
                        : isSyncTarget
                        ? '0 0 20px rgba(34, 211, 238, 0.6)'
                        : 'none',
                      textAlign,
                      wordBreak: 'keep-all',
                      overflowWrap: 'normal',
                      transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
                    }}
                  >
                    {/* Edit mode: show edit and add icons */}
                    {editMode && editingLineIndex !== index && (
                      <span className="inline-flex items-center mr-2 gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); startEditingLine(index); }}
                          className="inline-flex items-center justify-center w-8 h-8 bg-amber-500/30 hover:bg-amber-500/50 rounded-lg transition-colors"
                          title="Edit this line"
                        >
                          <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); addNewLine(index); }}
                          className="inline-flex items-center justify-center w-8 h-8 bg-green-500/30 hover:bg-green-500/50 rounded-lg transition-colors"
                          title="Add new line after this"
                        >
                          <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </span>
                    )}

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
                      <>
                        {syncMode && isSyncTarget && <span className="text-cyan-400 mr-2">▶</span>}
                        {line.text}
                        {syncMode && isSyncDone && (
                          <span className="inline-flex items-center ml-3 gap-1">
                            <span className="text-green-400 text-sm">✓</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); adjustLineTimestamp(index, -100); }}
                              className="px-1.5 py-0.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                              title="Earlier (-100ms)"
                            >
                              -
                            </button>
                            <span className="text-xs text-slate-400 font-mono min-w-[50px] text-center">
                              {((line.timestamp_ms || 0) / 1000).toFixed(1)}s
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); adjustLineTimestamp(index, 100); }}
                              className="px-1.5 py-0.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                              title="Later (+100ms)"
                            >
                              +
                            </button>
                          </span>
                        )}
                        {!isFullscreen && !syncMode && !editMode && takeCount > 0 && (
                          <span className="ml-2 text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full border border-purple-400/30">
                            {takeCount}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}