'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import SongLibrary from '@/components/SongLibrary';
import LyricEditor from '@/components/LyricEditor';
import Teleprompter from '@/components/Teleprompter';
import SongMetrics from '@/components/SongMetrics';
import { Song, LyricLine } from '@/lib/supabase';

export default function Home() {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'editor' | 'teleprompter' | 'metrics'>('library');

  const handleSelectSong = (song: Song, songLyrics: LyricLine[]) => {
    setCurrentSong(song);
    setLyrics(songLyrics);
    setActiveTab('editor');
  };

  const handleNewSong = () => {
    setCurrentSong(null);
    setLyrics([]);
    setActiveTab('editor');
  };

  const handleViewMetrics = (song: Song) => {
    setCurrentSong(song);
    setActiveTab('metrics');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lyricsCount={lyrics.length}
      />

      <div className="container mx-auto px-2 md:px-4 pt-24 pb-8">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'library' && (
            <SongLibrary 
              onSelectSong={handleSelectSong} 
              onNewSong={handleNewSong} 
              onViewMetrics={handleViewMetrics}
            />
          )}
          {activeTab === 'editor' && (
            <LyricEditor
              song={currentSong}
              lyrics={lyrics}
              onLyricsChange={setLyrics}
              onSongChange={setCurrentSong}
            />
          )}
          {activeTab === 'teleprompter' && (
            <Teleprompter song={currentSong} lyrics={lyrics} />
          )}
          {activeTab === 'metrics' && (
            <SongMetrics song={currentSong} lyrics={lyrics} />
          )}
        </div>
      </div>
    </main>
  );
}