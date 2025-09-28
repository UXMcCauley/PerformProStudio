'use client';

import { useState, useEffect, useRef } from 'react';
import { Song, LyricLine, supabase } from '@/lib/supabase';

interface Props {
  song: Song | null;
  lyrics: LyricLine[];
  onBack?: () => void;
  showBackButton?: boolean;
}

export default function SimpleTeleprompter({ song, lyrics, onBack, showBackButton = false }: Props) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fontSize, setFontSize] = useState(48);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lineTakeCounts, setLineTakeCounts] = useState<Record<string, number>>({});
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [lineHeight, setLineHeight] = useState(1.5);
  const [scrollSpeed, setScrollSpeed] = useState(2); // lines per second
  const [showControls, setShowControls] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        previousLine();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        nextLine();
      } else if (e.code === 'Escape' && isFullscreen) {
        exitFullscreen();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        recordLineTake();
      }
    };

    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying && isFullscreen) {
          setShowControls(false);
        }
      }, 3000);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousemove', handleMouseMove);
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, isFullscreen, currentLineIndex]);

  const startPracticeSession = async () => {
    if (!song) return;

    const { data, error } = await supabase
      .from('practice_sessions')
      .insert({
        song_id: song.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting practice session:', error);
      return;
    }

    if (data) {
      setSessionId(data.id);
      sessionStartTimeRef.current = Date.now();
    }
  };

  const endPracticeSession = async () => {
    if (!sessionId) return;

    const duration = sessionStartTimeRef.current
      ? Math.floor((Date.now() - sessionStartTimeRef.current) / 1000)
      : 0;

    await supabase
      .from('practice_sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: duration,
      })
      .eq('id', sessionId);

    setSessionId(null);
    sessionStartTimeRef.current = null;
  };

  const recordLineTake = async () => {
    if (!sessionId || currentLineIndex < 0 || currentLineIndex >= lyrics.length) return;
    
    const currentLine = lyrics[currentLineIndex];
    const currentCount = lineTakeCounts[currentLine.id] || 0;
    const newCount = currentCount + 1;

    setLineTakeCounts(prev => ({ ...prev, [currentLine.id]: newCount }));

    await supabase.from('line_takes').insert({
      lyric_line_id: currentLine.id,
      session_id: sessionId,
      take_number: newCount,
    });
  };

  const togglePlayPause = () => {
    if (!isPlaying) {
      if (!sessionId) {
        startPracticeSession();
      }
      startAutoScroll();
    } else {
      stopAutoScroll();
    }
    setIsPlaying(!isPlaying);
  };

  const startAutoScroll = () => {
    if (scrollIntervalRef.current) return;

    scrollIntervalRef.current = setInterval(() => {
      setCurrentLineIndex(prev => {
        const nextIndex = prev + 1;
        if (nextIndex >= lyrics.length) {
          stopAutoScroll();
          setIsPlaying(false);
          endPracticeSession();
          return lyrics.length - 1;
        }
        return nextIndex;
      });
    }, 1000 / scrollSpeed);
  };

  const stopAutoScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const nextLine = () => {
    if (currentLineIndex < lyrics.length - 1) {
      setCurrentLineIndex(currentLineIndex + 1);
    }
  };

  const previousLine = () => {
    if (currentLineIndex > 0) {
      setCurrentLineIndex(currentLineIndex - 1);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const exitFullscreen = async () => {
    try {
      await document.exitFullscreen();
    } catch (error) {
      console.error('Exit fullscreen error:', error);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const getVisibleLines = () => {
    const start = Math.max(0, currentLineIndex - 2);
    const end = Math.min(lyrics.length, currentLineIndex + 3);
    return lyrics.slice(start, end).map((line, index) => ({
      ...line,
      globalIndex: start + index,
      isActive: start + index === currentLineIndex,
      isPrevious: start + index < currentLineIndex,
      isNext: start + index > currentLineIndex,
    }));
  };

  if (!song || lyrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-base-200" style={{borderRadius: '4px'}}>
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-base-content/50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
          </svg>
          <p className="text-base-content/70 text-lg">Select a song with lyrics to start practicing</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col`}
    >
      {/* Controls */}
      <div className={`${showControls || !isFullscreen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 ${isFullscreen ? 'absolute top-4 left-4 right-4 z-10' : 'p-4'}`}>
        <div className="flex items-center justify-between bg-base-100 shadow-md p-3">
          <div className="flex items-center gap-4">
            {showBackButton && onBack && !isFullscreen && (
              <button
                onClick={onBack}
                className="p-2 text-base-content/70 hover:text-primary transition-colors"
                title="Back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="w-1 h-6 bg-primary" />
            <h3 className="text-base-content font-semibold">{song.title} - {song.artist}</h3>
            {sessionId && (
              <span className="px-2 py-1 bg-error text-error-content text-sm font-semibold" style={{borderRadius: '4px'}}>
                Recording
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayPause}
              className="p-2 text-primary hover:text-primary-focus transition-colors"
              title="Space: Play/Pause"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 text-base-content/70 hover:text-primary transition-colors"
              title="F: Fullscreen"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Settings */}
        {!isFullscreen && (
          <div className="mt-4 flex flex-wrap gap-4 bg-base-200 p-3" style={{borderRadius: '4px'}}>
            <div className="flex items-center gap-2">
              <label className="text-base-content text-sm">Font Size:</label>
              <input
                type="range"
                min="24"
                max="72"
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-base-content text-sm w-8">{fontSize}</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-base-content text-sm">Speed:</label>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={scrollSpeed}
                onChange={e => setScrollSpeed(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-base-content text-sm w-12">{scrollSpeed}x</span>
            </div>

            <select
              value={textAlign}
              onChange={e => setTextAlign(e.target.value as any)}
              className="select select-bordered select-sm"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        )}
      </div>

      {/* Lyrics Display */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          {getVisibleLines().map((line) => (
            <div
              key={line.id}
              className={`transition-all duration-500 py-2 ${
                line.isActive 
                  ? 'text-white opacity-100 scale-105' 
                  : line.isPrevious 
                    ? 'text-gray-400 opacity-60' 
                    : 'text-gray-500 opacity-40'
              }`}
              style={{
                fontSize: `${fontSize}px`,
                lineHeight,
                textAlign,
              }}
            >
              <span className="inline-block">
                {line.text}
                {lineTakeCounts[line.id] > 0 && (
                  <span className="ml-2 px-2 py-1 bg-success text-success-content text-xs font-bold" style={{borderRadius: '4px'}}>
                    {lineTakeCounts[line.id]}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div className={`${showControls || !isFullscreen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 ${isFullscreen ? 'absolute bottom-4 left-4 right-4' : 'p-4'}`}>
        <div className="bg-base-200 p-3" style={{borderRadius: '4px'}}>
          <div className="flex items-center justify-between text-base-content text-sm mb-2">
            <span>Line {currentLineIndex + 1} of {lyrics.length}</span>
            <span>{Math.round((currentLineIndex / lyrics.length) * 100)}%</span>
          </div>
          <div className="w-full bg-base-300 h-2" style={{borderRadius: '4px'}}>
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${(currentLineIndex / lyrics.length) * 100}%`,
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      {!isFullscreen && (
        <div className="p-4 border-t border-base-300">
          <div className="text-base-content/60 text-sm grid grid-cols-2 md:grid-cols-3 gap-2">
            <div><kbd className="px-1 py-0.5 bg-base-200" style={{borderRadius: '2px'}}>Space</kbd> Play/Pause</div>
            <div><kbd className="px-1 py-0.5 bg-base-200" style={{borderRadius: '2px'}}>↑↓</kbd> Navigate</div>
            <div><kbd className="px-1 py-0.5 bg-base-200" style={{borderRadius: '2px'}}>F</kbd> Fullscreen</div>
          </div>
        </div>
      )}
    </div>
  );
}
