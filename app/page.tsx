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

type TabType = 'library' | 'editor' | 'teleprompter' | 'metrics' | 'social' | 'settings';

export default function Home() {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [previousTab, setPreviousTab] = useState<TabType>('library');
  const [pendingSocialCount, setPendingSocialCount] = useState(0);

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

      <div className="mx-auto px-2 md:px-4 pt-24 pb-8">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'library' && (
            <SongLibrary
              onSelectSong={handleSelectSong}
              onNewSong={handleNewSong}
              onViewMetrics={handleViewMetrics}
              onLyricSync={handleLyricSync}
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
    </main>
  );
}