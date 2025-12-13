'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import SongLibrary from '@/components/SongLibrary';
import LyricEditor from '@/components/LyricEditor';
import SimpleTeleprompter from '@/components/SimpleTeleprompter';
import Teleprompter from '@/components/Teleprompter';
import SongMetrics from '@/components/SongMetrics';
import Settings from '@/components/Settings';
import Social from '@/components/Social';
import ShowsCalendar from '@/components/ShowsCalendar';

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

type TabType = 'library' | 'editor' | 'teleprompter' | 'metrics' | 'shows' | 'social' | 'settings';

// Content type metadata for UI
const CONTENT_TYPE_INFO: Record<ContentType, { label: string; icon: string; description: string; example: string }> = {
  lyrics: {
    label: 'Song Lyrics',
    icon: '🎵',
    description: 'For musicians memorizing songs',
    example: 'Cover songs, originals, karaoke',
  },
  script: {
    label: 'Script / Screenplay',
    icon: '🎭',
    description: 'For actors practicing lines with AI reading other parts',
    example: 'Theater, film, TV scripts',
  },
  podcast: {
    label: 'Podcast Notes',
    icon: '🎙️',
    description: 'Talking points and show structure',
    example: 'Episodes, interviews, segments',
  },
  speech: {
    label: 'Speech / Presentation',
    icon: '📢',
    description: 'For public speakers and presenters',
    example: 'Keynotes, TED talks, lectures',
  },
};

export default function Home() {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [previousTab, setPreviousTab] = useState<TabType>('library');
  const [pendingSocialCount, setPendingSocialCount] = useState(0);
  const [showContentTypeModal, setShowContentTypeModal] = useState(false);
  const [newContentType, setNewContentType] = useState<ContentType>('lyrics');

  // Fetch pending social count (friend requests + band invites)
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const [requestsRes, invitesRes] = await Promise.all([
          fetch('/api/friend-requests?type=incoming'),
          fetch('/api/band-invites'),
        ]);
        if (requestsRes.ok && invitesRes.ok) {
          const requests = await requestsRes.json();
          const invites = await invitesRes.json();
          setPendingSocialCount(requests.length + invites.length);
        }
      } catch (err) {
        console.error('Failed to fetch pending social count:', err);
      }
    };
    fetchPendingCount();
    // Refresh every 60 seconds
    const interval = setInterval(fetchPendingCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (tab: TabType) => {
    setPreviousTab(activeTab);
    setActiveTab(tab);
  };

  const handleBack = () => {
    setActiveTab(previousTab);
  };

  const handleSelectSong = (song: Song, songLyrics: LyricLine[]) => {
    setCurrentSong(song);
    setLyrics(songLyrics);
    setPreviousTab(activeTab);
    setActiveTab('editor');
  };

  const handleNewSong = () => {
    // Show content type selection modal
    setShowContentTypeModal(true);
  };

  const handleContentTypeSelect = (contentType: ContentType) => {
    setNewContentType(contentType);
    setShowContentTypeModal(false);
    setCurrentSong(null);
    setLyrics([]);
    setPreviousTab(activeTab);
    setActiveTab('editor');
  };

  const handleViewMetrics = (song: Song) => {
    setCurrentSong(song);
    setPreviousTab(activeTab);
    setActiveTab('metrics');
  };

  const handleLyricSync = (song: Song, songLyrics: LyricLine[]) => {
    setCurrentSong(song);
    setLyrics(songLyrics);
    setPreviousTab(activeTab);
    setActiveTab('teleprompter');
  };

  // For teleprompter direct song selection - stays on teleprompter
  const handleTeleprompterSelectSong = (song: Song, songLyrics: LyricLine[]) => {
    setCurrentSong(song);
    setLyrics(songLyrics);
    // Stay on teleprompter tab, don't change previousTab
  };

  return (
    <main>
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        lyricsCount={lyrics.length}
        pendingSocialCount={pendingSocialCount}
      />

      {/* Add padding for top header (h-14 mobile, h-16 desktop) and bottom nav on mobile */}
      <div className="mx-auto px-2 sm:px-4 pt-16 sm:pt-20 pb-20 lg:pb-8">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'library' && (
            <SongLibrary
              onSelectSong={handleSelectSong}
              onNewSong={handleNewSong}
              onViewMetrics={handleViewMetrics}
              onLyricSync={handleLyricSync}
              onViewShows={() => handleTabChange('shows')}
            />
          )}
          {activeTab === 'editor' && (
            <LyricEditor
              song={currentSong}
              lyrics={lyrics}
              onLyricsChange={setLyrics}
              onSongChange={setCurrentSong}
              onBack={handleBack}
              showBackButton={previousTab !== 'editor'}
              initialContentType={newContentType}
            />
          )}
          {activeTab === 'teleprompter' && (
            <Teleprompter
              song={currentSong}
              lyrics={lyrics}
              onLyricsChange={setLyrics}
              onSelectSong={handleTeleprompterSelectSong}
            />
          )}
           {activeTab === 'metrics' && (
             <SongMetrics
               song={currentSong}
               lyrics={lyrics}
               onBack={handleBack}
               showBackButton={previousTab !== 'metrics'}
               onSelectSong={handleSelectSong}
             />
           )}
          {activeTab === 'shows' && (
            <ShowsCalendar
              onBack={handleBack}
              showBackButton={previousTab !== 'shows'}
            />
          )}
          {activeTab === 'social' && (
            <Social
              onBack={handleBack}
              showBackButton={previousTab !== 'social'}
            />
          )}
          {activeTab === 'settings' && (
            <Settings
              onBack={handleBack}
              showBackButton={previousTab !== 'settings'}
            />
          )}
        </div>
      </div>

      {/* Content Type Selection Modal */}
      {showContentTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">What are you creating?</h2>
                <button
                  onClick={() => setShowContentTypeModal(false)}
                  className="btn btn-ghost btn-sm btn-circle"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(Object.keys(CONTENT_TYPE_INFO) as ContentType[]).map((type) => {
                  const info = CONTENT_TYPE_INFO[type];
                  return (
                    <button
                      key={type}
                      onClick={() => handleContentTypeSelect(type)}
                      className="card bg-base-200 hover:bg-base-300 transition-all duration-200 cursor-pointer text-left p-5 border-2 border-transparent hover:border-primary"
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-4xl">{info.icon}</span>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{info.label}</h3>
                          <p className="text-sm opacity-70 mt-1">{info.description}</p>
                          <p className="text-xs opacity-50 mt-2 italic">{info.example}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}