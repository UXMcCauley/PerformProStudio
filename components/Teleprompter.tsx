'use client';

import { useState, useEffect, useRef } from 'react';
import { Song, LyricLine, supabase } from '@/lib/supabase';
import Script from 'next/script';

interface Props {
  song: Song | null;
  lyrics: LyricLine[];
}

declare global {
  interface Window {
    SC: any;
  }
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

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const positionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const loadWidget = () => {
    if (!song?.instrumental_url || !iframeRef.current || !window.SC) return;

    const newWidget = window.SC.Widget(iframeRef.current);
    setWidget(newWidget);

    newWidget.bind(window.SC.Widget.Events.READY, () => {
      newWidget.getDuration((d: number) => setDuration(d));
    });

    newWidget.bind(window.SC.Widget.Events.PLAY, () => setIsPlaying(true));
    newWidget.bind(window.SC.Widget.Events.PAUSE, () => setIsPlaying(false));
  };

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

  const recordLineTake = async (lineId: string) => {
    const currentCount = lineTakeCounts[lineId] || 0;
    const newCount = currentCount + 1;

    setLineTakeCounts(prev => ({ ...prev, [lineId]: newCount }));

    await supabase.from('line_takes').insert({
      lyric_line_id: lineId,
      session_id: sessionId,
      take_number: newCount,
    });
  };

  const startPositionTracking = () => {
    if (positionIntervalRef.current) {
      clearInterval(positionIntervalRef.current);
    }

    positionIntervalRef.current = setInterval(() => {
      if (widget) {
        widget.getPosition((pos: number) => {
          setPosition(pos);
          updateCurrentLine(pos);
        });
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
      if (lyrics[i].timestamp_ms !== null && pos >= lyrics[i].timestamp_ms) {
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
    if (widget) {
      widget.play();
      startPositionTracking();
      if (!sessionId) {
        await startPracticeSession();
      }
    }
  };

  const handlePause = async () => {
    if (widget) {
      widget.pause();
      stopPositionTracking();
      await endPracticeSession();
    }
  };

  const handleReset = () => {
    if (widget) {
      widget.seekTo(0);
      setCurrentLineIndex(-1);
      setPosition(0);
    }
  };

  const handleSyncLine = (index: number) => {
    if (!syncMode || !widget) return;

    widget.getPosition((pos: number) => {
      lyrics[index].timestamp_ms = pos;
      console.log(`Synced line ${index} to ${pos}ms`);
    });
  };

  const handleLineTake = (line: LyricLine) => {
    if (!sessionId) return;
    recordLineTake(line.id);
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
            ? 'fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex flex-col'
            : 'bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg shadow-purple-500/10 border border-slate-200/50 p-4 md:p-6'
        }`}
      >
        {!isFullscreen && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
              <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Teleprompter
              </h2>
            </div>
            {!song?.instrumental_url && (
              <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-xl">
                <p className="text-sm md:text-base text-amber-800">
                  No instrumental track set. Add one in the editor to use the teleprompter.
                </p>
              </div>
            )}
          </>
        )}

        {song?.instrumental_url && (
          <div className="hidden">
            <iframe
              ref={iframeRef}
              width="0"
              height="0"
              scrolling="no"
              frameBorder="no"
              allow="autoplay"
              src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(
                song.instrumental_url
              )}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`}
            />
          </div>
        )}

        <div className={`flex items-center gap-2 md:gap-3 ${isFullscreen ? 'p-4 justify-center' : 'bg-gradient-to-r from-slate-50 to-purple-50/50 p-3 md:p-4 rounded-xl mb-6 flex-wrap border border-slate-200/50'}`}>
          {!isFullscreen && (
            <>
              <button
                onClick={isPlaying ? handlePause : handlePlay}
                disabled={!widget}
                className="group relative p-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                title={isPlaying ? 'Stop' : 'Play'}
              >
                <svg className={`w-5 h-5 md:w-6 md:h-6 transition-all duration-300 ${
                  !widget ? 'text-slate-700' : 'text-slate-400 group-hover:text-green-500 group-hover:scale-110'
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
                disabled={!widget}
                className="group p-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                title="Reset"
              >
                <svg className={`w-5 h-5 md:w-6 md:h-6 transition-all duration-500 ${
                  !widget ? 'text-slate-700' : 'text-slate-400 group-hover:text-purple-400 group-hover:scale-110 group-hover:rotate-180'
                }`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setSyncMode(!syncMode)}
                disabled={!widget}
                className="group p-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                title={syncMode ? 'Exit Sync Mode' : 'Sync Mode'}
              >
                <svg className={`w-5 h-5 md:w-6 md:h-6 transition-all duration-300 ${
                  !widget ? 'text-slate-700' :
                  syncMode ? 'text-red-500 scale-110' : 'text-slate-400 group-hover:text-purple-400 group-hover:scale-110'
                }`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                </svg>
              </button>
              <button
                onClick={enterFullscreen}
                className="group p-3 transition-all duration-300"
                title="Fullscreen"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6 text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                  <svg className={`w-4 h-4 transition-all duration-300 ${
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
                  <svg className={`w-4 h-4 transition-all duration-300 ${
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
                  <svg className={`w-4 h-4 transition-all duration-300 ${
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
                  className="w-4 h-4 accent-purple-600 cursor-pointer transition-transform hover:scale-110"
                />
              </label>
              {!autoScale && (
                <label className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-1 border border-slate-200">
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
            </>
          )}
          {isFullscreen && (
            <button
              onClick={exitFullscreen}
              className="fixed top-6 right-6 p-4 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white rounded-2xl z-50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-white/20 active:scale-95 border border-white/20"
              title="Exit Fullscreen"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {!isFullscreen && syncMode && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-xl animate-pulse">
            <p className="text-blue-800 text-xs md:text-sm">
              <strong>🎯 Sync Mode:</strong> Play the track and click on each line when it should appear
            </p>
          </div>
        )}

        <div className={`rounded-2xl overflow-y-auto ${
          isFullscreen
            ? 'flex-1 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 md:p-8'
            : 'bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 md:p-8 min-h-[300px] md:min-h-[500px] max-h-[600px] border border-slate-800/50 shadow-inner'
        }`}>
          {lyrics.length === 0 ? (
            <div className="text-center text-slate-500 py-20">No lyrics to display</div>
          ) : (
            <div style={{ lineHeight }}>
              {lyrics.map((line, index) => {
                const isActive = index === currentLineIndex;
                const isPast = index < currentLineIndex;
                const isUpcoming = index > currentLineIndex;
                const takeCount = lineTakeCounts[line.id] || 0;

                const longestLine = lyrics.reduce((max, l) => l.text.length > max ? l.text.length : max, 0);
                const calculatedFontSize = autoScale
                  ? Math.min(96, Math.max(24, (isFullscreen ? window.innerWidth : 800) * 0.8 / longestLine))
                  : fontSize;

                return (
                  <div
                    key={line.id}
                    onClick={() => {
                      if (syncMode) {
                        handleSyncLine(index);
                      } else if (isActive && sessionId) {
                        handleLineTake(line);
                      }
                    }}
                    className={`transition-all duration-500 ease-out ${
                      syncMode || (isActive && sessionId) ? 'cursor-pointer hover:opacity-80' : ''
                    } ${
                      isActive
                        ? 'text-white opacity-100 scale-105 md:scale-110 animate-pulse'
                        : isPast
                        ? 'text-slate-600 opacity-30'
                        : 'text-slate-500 opacity-50'
                    }`}
                    style={{
                      fontSize: `${calculatedFontSize}px`,
                      fontWeight: isActive ? 'bold' : 'normal',
                      textShadow: isActive ? '0 0 30px rgba(168, 85, 247, 0.8), 0 0 60px rgba(168, 85, 247, 0.4)' : 'none',
                      textAlign,
                      wordBreak: 'keep-all',
                      overflowWrap: 'normal',
                      transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
                    }}
                  >
                    {line.text}
                    {!isFullscreen && takeCount > 0 && (
                      <span className="ml-2 text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-full border border-purple-400/30">
                        {takeCount}
                      </span>
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