'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import SongLibrary from '@/components/SongLibrary';
import LyricEditor from '@/components/LyricEditor';
import SimpleTeleprompter from '@/components/SimpleTeleprompter';
import SongMetrics from '@/components/SongMetrics';
import Settings from '@/components/Settings';
import { Song, LyricLine } from '@/lib/supabase';

export default function Home() {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'editor' | 'teleprompter' | 'metrics' | 'settings'>('library');
  const [previousTab, setPreviousTab] = useState<'library' | 'editor' | 'teleprompter' | 'metrics' | 'settings'>('library');

  const handleTabChange = (tab: 'library' | 'editor' | 'teleprompter' | 'metrics' | 'settings') => {
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

  return (
    <main className="theme-root">
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange} 
        lyricsCount={lyrics.length}
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
            <SimpleTeleprompter
              song={currentSong}
              lyrics={lyrics}
              onBack={handleBack}
              showBackButton={previousTab !== 'teleprompter'}
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