'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  activeTab: 'library' | 'editor' | 'teleprompter' | 'metrics' | 'shows' | 'social' | 'settings';
  onTabChange: (tab: 'library' | 'editor' | 'teleprompter' | 'metrics' | 'shows' | 'social' | 'settings') => void;
  lyricsCount: number;
  pendingSocialCount?: number;
}

export default function Header({ activeTab, onTabChange, lyricsCount, pendingSocialCount = 0 }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, availableThemes } = useTheme();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setShowThemeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <header className="navbar fixed top-0 left-0 right-0 z-50 bg-base-100 border-b border-base-300 shadow-lg w-full mx-auto justify-right px-4 py-2" role="banner">
      <div className="navbar-start justify-right">
        <div className="flex items-center gap-2">
          {/* Logo Icon */}
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-primary-content" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
            </svg>
            {/* Decorative dot */}
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-pulse shadow-sm"></div>
          </div>
          {/* Logo Text */}
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-base font-extrabold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent tracking-tight">
              PerformPro
            </span>
            <span className="text-[10px] font-semibold text-base-content/60 tracking-widest uppercase">
              Studio
            </span>
          </div>
        </div>
      </div>

      <div className="navbar-center">
        <nav className="flex items-center gap-2" role="navigation" aria-label="Main navigation">
              <button
                onClick={() => onTabChange('library')}
                className={`btn btn-ghost btn-sm flex flex-col items-center gap-1 ${activeTab === 'library'
                    ? 'btn-active text-primary'
                    : ''
                  }`}
                title="Library"
                aria-label="Song Library"
                aria-current={activeTab === 'library' ? 'page' : undefined}
              >
                <svg
                  className="w-7 h-7"
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
                className={`btn btn-ghost btn-sm flex flex-col items-center gap-1 ${activeTab === 'editor'
                    ? 'btn-active text-primary'
                    : ''
                  }`}
                title="Editor"
                aria-label="Lyric Editor"
                aria-current={activeTab === 'editor' ? 'page' : undefined}
              >
                <svg
                  className="w-7 h-7"
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
                className={`btn btn-ghost btn-sm flex flex-col items-center gap-1 ${
                  lyricsCount === 0
                    ? 'btn-disabled'
                    : activeTab === 'teleprompter'
                      ? 'btn-active text-primary'
                      : ''
                  }`}
                title="Teleprompter"
                aria-label="Teleprompter"
                aria-current={activeTab === 'teleprompter' ? 'page' : undefined}
                aria-disabled={lyricsCount === 0}
              >
                <svg
                  className="w-7 h-7"
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
                className={`btn btn-ghost btn-sm flex flex-col items-center gap-1 ${activeTab === 'metrics'
                    ? 'btn-active text-primary'
                    : ''
                  }`}
                title="Metrics"
                aria-label="Practice Metrics"
                aria-current={activeTab === 'metrics' ? 'page' : undefined}
              >
                <svg
                  className="w-7 h-7"
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

              <button
                onClick={() => onTabChange('shows')}
                className={`btn btn-ghost btn-sm flex flex-col items-center gap-1 ${activeTab === 'shows'
                    ? 'btn-active text-primary'
                    : ''
                  }`}
                title="Shows"
                aria-label="Shows & Setlists"
                aria-current={activeTab === 'shows' ? 'page' : undefined}
              >
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                {activeTab === 'shows' && (
                  <div className="w-8 h-0.5 " />
                )}
              </button>

              <button
                onClick={() => onTabChange('social')}
                className={`btn btn-ghost btn-sm flex flex-col items-center gap-1 relative ${activeTab === 'social'
                    ? 'btn-active text-primary'
                    : ''
                  }`}
                title="Social"
                aria-label="Friends & Bands"
                aria-current={activeTab === 'social' ? 'page' : undefined}
              >
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                {pendingSocialCount > 0 && (
                  <span className="absolute -top-1 -right-1 badge badge-primary badge-xs">{pendingSocialCount}</span>
                )}
                {activeTab === 'social' && (
                  <div className="w-8 h-0.5 " />
                )}
              </button>
        </nav>
      </div>

      <div className="navbar-end gap-2">
        {/* Theme Toggle Dropdown */}
            <div className="relative" ref={themeDropdownRef}>
              <button
                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                className="btn btn-ghost btn-circle"
                title="Change Theme"
                aria-label="Change theme"
                aria-expanded={showThemeDropdown}
                aria-haspopup="listbox"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </button>

              {showThemeDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-base-100 shadow-xl border border-base-300 rounded-box py-2 z-50 max-h-64 overflow-y-auto" role="listbox" aria-label="Theme options">
                  {availableThemes.map((themeName) => (
                    <button
                      key={themeName}
                      onClick={() => {
                        setTheme(themeName);
                        setShowThemeDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors hover:text-primary flex items-center gap-2 ${
                        theme === themeName ? 'text-primary font-semibold' : ''
                      }`}
                      role="option"
                      aria-selected={theme === themeName}
                    >
                      <div className="w-3 h-3 rounded-full bg-primary" aria-hidden="true"></div>
                      <span className="capitalize">{themeName}</span>
                      {theme === themeName && (
                        <svg className="w-5 h-5 ml-auto" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

        {/* Profile Avatar Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            className="btn btn-ghost btn-circle avatar"
            onClick={() => setShowDropdown(!showDropdown)}
            aria-label="User menu"
            aria-expanded={showDropdown}
            aria-haspopup="menu"
          >
            <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-semibold" aria-hidden="true">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
          </button>

          {showDropdown && (
            <ul className="absolute right-0 mt-2 menu bg-base-100 rounded-box z-60 w-64 p-2 shadow-xl border border-base-300" role="menu" aria-label="User options">
              <li className="menu-title">
                <span>
                  <div className="text-sm font-semibold text-base-content">
                    {user?.name || 'User'}
                  </div>
                  <div className="text-xs text-base-content/60">{user?.email}</div>
                </span>
              </li>
              <li>
                <button
                  onClick={() => {
                    onTabChange('settings');
                    setShowDropdown(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
              </li>
              <div className="divider my-1"></div>
              <li>
                <button
                  onClick={async () => {
                    await signOut();
                    setShowDropdown(false);
                  }}
                  className="text-error flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  Logout
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </header>
  );
}