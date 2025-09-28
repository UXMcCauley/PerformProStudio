'use client';

interface Props {
  activeTab: 'library' | 'editor' | 'teleprompter' | 'metrics';
  onTabChange: (tab: 'library' | 'editor' | 'teleprompter' | 'metrics') => void;
  lyricsCount: number;
}

export default function Header({ activeTab, onTabChange, lyricsCount }: Props) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
            </svg>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Lyric Teleprompter
            </h1>
          </div>

          <nav className="flex items-center gap-6">
            <button
              onClick={() => onTabChange('library')}
              className="group flex flex-col items-center gap-1"
              title="Library"
            >
              <svg
                className={`w-6 h-6 transition-all duration-300 ${
                  activeTab === 'library'
                    ? 'text-purple-400 scale-110'
                    : 'text-slate-400 group-hover:text-purple-400 group-hover:scale-110'
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {activeTab === 'library' && (
                <div className="w-1 h-1 rounded-full bg-purple-400" />
              )}
            </button>

            <button
              onClick={() => onTabChange('editor')}
              className="group flex flex-col items-center gap-1"
              title="Editor"
            >
              <svg
                className={`w-6 h-6 transition-all duration-300 ${
                  activeTab === 'editor'
                    ? 'text-purple-400 scale-110'
                    : 'text-slate-400 group-hover:text-purple-400 group-hover:scale-110'
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {activeTab === 'editor' && (
                <div className="w-1 h-1 rounded-full bg-purple-400" />
              )}
            </button>

            <button
              onClick={() => onTabChange('teleprompter')}
              disabled={lyricsCount === 0}
              className="group flex flex-col items-center gap-1 disabled:cursor-not-allowed"
              title="Teleprompter"
            >
              <svg
                className={`w-6 h-6 transition-all duration-300 ${
                  lyricsCount === 0
                    ? 'text-slate-700'
                    : activeTab === 'teleprompter'
                    ? 'text-purple-400 scale-110'
                    : 'text-slate-400 group-hover:text-purple-400 group-hover:scale-110'
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-10-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {activeTab === 'teleprompter' && (
                <div className="w-1 h-1 rounded-full bg-purple-400" />
              )}
            </button>

            <button
              onClick={() => onTabChange('metrics')}
              className="group flex flex-col items-center gap-1"
              title="Metrics"
            >
              <svg
                className={`w-6 h-6 transition-all duration-300 ${
                  activeTab === 'metrics'
                    ? 'text-purple-400 scale-110'
                    : 'text-slate-400 group-hover:text-purple-400 group-hover:scale-110'
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {activeTab === 'metrics' && (
                <div className="w-1 h-1 rounded-full bg-purple-400" />
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}