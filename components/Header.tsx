'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  activeTab: 'library' | 'editor' | 'teleprompter' | 'metrics' | 'settings';
  onTabChange: (tab: 'library' | 'editor' | 'teleprompter' | 'metrics' | 'settings') => void;
  lyricsCount: number;
}

export default function Header({ activeTab, onTabChange, lyricsCount }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 shadow-md backdrop-blur-sm`}>
      <div className={`container mx-auto px-4 py-4`}>
        <div className="flex items-center justify-between">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
          </svg>

          <div className="flex items-center gap-6">

            <nav className="flex items-center gap-4">
              <button
                onClick={() => onTabChange('library')}
                className={`flex flex-col items-center gap-1 px-3 py-2 transition-all duration-200 ${activeTab === 'library'
                    ? 'text-tertiary'
                    : 'text-base-content/10 hover:text-base-content/70'
                  }`}
                title="Library"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {activeTab === 'library' && (
                  <div className="w-8 h-0.5 " />
                )}
              </button>

              <button
                onClick={() => onTabChange('editor')}
                className={`flex flex-col items-center gap-1 px-3 py-2 transition-all duration-200 ${activeTab === 'editor'
                    ? 'text-tertiary'
                    : 'text-base-content/50 hover:text-base-content/70'
                  }`}
                title="Editor"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {activeTab === 'editor' && (
                  <div className="w-8 h-0.5 " />
                )}
              </button>

              <button
                onClick={() => onTabChange('teleprompter')}
                disabled={lyricsCount === 0}
                className={`flex flex-col items-center gap-1 px-3 py-2 transition-all duration-200 disabled:cursor-not-allowed ${lyricsCount === 0
                    ? 'text-base-content/50 opacity-50'
                    : activeTab === 'teleprompter'
                      ? 'text-tertiary'
                      : 'text-base-content/50 hover:text-base-content/70'
                  }`}
                title="Teleprompter"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-10-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {activeTab === 'teleprompter' && (
                  <div className="w-8 h-0.5 " />
                )}
              </button>

              <button
                onClick={() => onTabChange('metrics')}
                className={`flex flex-col items-center gap-1 px-3 py-2 transition-all duration-200 ${activeTab === 'metrics'
                    ? 'text-tertiary'
                    : 'text-base-content/40 hover:text-base-content/50'
                  }`}
                title="Metrics"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {activeTab === 'metrics' && (
                  <div className="w-8 h-0.5 " />
                )}
              </button>
            </nav>

            {/* Profile Avatar Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 p-1 transition-all duration-200 rounded-full"
                title="Profile"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                  U
                </div>
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-base-100 shadow-xl border border-base-300 py-2 z-50">
                  <div className="px-4 py-3 border-b border-base-300">
                    <p className="text-sm font-semibold text-base-content">User Name</p>
                    <p className="text-xs text-base-content/60">user@example.com</p>
                  </div>

                  <button
                    onClick={() => {
                      onTabChange('settings');
                      setShowDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-base-content transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </button>

                  <div className="border-t border-base-content/20 mt-2 pt-2">
                    <button
                      onClick={() => {
                        // Handle logout
                        setShowDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}