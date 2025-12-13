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

type TabType = 'library' | 'editor' | 'teleprompter' | 'metrics' | 'shows' | 'social' | 'settings';

const TAB_CONFIG: Record<TabType, { icon: React.ReactNode; label: string; mobileLabel: string }> = {
  library: {
    label: 'Library',
    mobileLabel: 'Library',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  editor: {
    label: 'Editor',
    mobileLabel: 'Edit',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  teleprompter: {
    label: 'Teleprompter',
    mobileLabel: 'Perform',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-10-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  metrics: {
    label: 'Metrics',
    mobileLabel: 'Stats',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  shows: {
    label: 'Shows',
    mobileLabel: 'Shows',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  social: {
    label: 'Social',
    mobileLabel: 'Social',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  settings: {
    label: 'Settings',
    mobileLabel: 'Settings',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
};

// Primary tabs shown in bottom nav on mobile (most used by performers)
const MOBILE_PRIMARY_TABS: TabType[] = ['library', 'editor', 'teleprompter', 'shows', 'social'];

export default function Header({ activeTab, onTabChange, lyricsCount, pendingSocialCount = 0 }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
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
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTabClick = (tab: TabType) => {
    onTabChange(tab);
    setShowMobileMenu(false);
  };

  return (
    <>
      {/* Top Header - Simplified on mobile */}
      <header className="navbar fixed top-0 left-0 right-0 z-50 bg-base-100 border-b border-base-300 shadow-lg px-2 sm:px-4 py-1 sm:py-2 h-14 sm:h-16" role="banner">
        {/* Left: Logo */}
        <div className="navbar-start">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-lg">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary-content" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
              </svg>
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-success rounded-full animate-pulse shadow-sm"></div>
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-sm sm:text-base font-extrabold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent tracking-tight">
                PerformPro
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-base-content/60 tracking-widest uppercase">
                Studio
              </span>
            </div>
          </div>
        </div>

        {/* Center: Desktop Navigation (hidden on mobile) */}
        <div className="navbar-center hidden lg:flex">
          <nav className="flex items-center gap-1" role="navigation" aria-label="Main navigation">
            {(Object.keys(TAB_CONFIG) as TabType[]).map((tab) => {
              const config = TAB_CONFIG[tab];
              const isDisabled = tab === 'teleprompter' && lyricsCount === 0;
              const isActive = activeTab === tab;

              return (
                <button
                  key={tab}
                  onClick={() => handleTabClick(tab)}
                  disabled={isDisabled}
                  className={`btn btn-ghost btn-sm flex items-center gap-2 ${
                    isDisabled ? 'btn-disabled' : isActive ? 'btn-active text-primary' : ''
                  }`}
                  title={config.label}
                  aria-label={config.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {config.icon}
                  <span className="hidden xl:inline">{config.label}</span>
                  {tab === 'social' && pendingSocialCount > 0 && (
                    <span className="badge badge-primary badge-xs">{pendingSocialCount}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Theme & Profile */}
        <div className="navbar-end gap-1 sm:gap-2">
          {/* Theme Toggle */}
          <div className="relative hidden sm:block" ref={themeDropdownRef}>
            <button
              onClick={() => setShowThemeDropdown(!showThemeDropdown)}
              className="btn btn-ghost btn-circle btn-sm sm:btn-md"
              title="Change Theme"
              aria-label="Change theme"
              aria-expanded={showThemeDropdown}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>

            {showThemeDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-base-100 shadow-xl border border-base-300 rounded-box py-2 z-50 max-h-64 overflow-y-auto">
                {availableThemes.map((themeName) => (
                  <button
                    key={themeName}
                    onClick={() => {
                      setTheme(themeName);
                      setShowThemeDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-2 ${
                      theme === themeName ? 'text-primary font-semibold' : ''
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <span className="capitalize">{themeName}</span>
                    {theme === themeName && (
                      <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
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
              className="btn btn-ghost btn-circle btn-sm sm:btn-md avatar"
              onClick={() => setShowDropdown(!showDropdown)}
              aria-label="User menu"
              aria-expanded={showDropdown}
            >
              <div className="w-8 sm:w-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-semibold text-sm sm:text-base">
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            </button>

            {showDropdown && (
              <ul className="absolute right-0 mt-2 menu bg-base-100 rounded-box z-60 w-56 sm:w-64 p-2 shadow-xl border border-base-300">
                <li className="menu-title">
                  <span>
                    <div className="text-sm font-semibold text-base-content truncate">
                      {user?.name || 'User'}
                    </div>
                    <div className="text-xs text-base-content/60 truncate">{user?.email}</div>
                  </span>
                </li>

                {/* Mobile-only: Theme selector */}
                <li className="sm:hidden">
                  <details>
                    <summary className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Theme
                    </summary>
                    <ul className="max-h-40 overflow-y-auto">
                      {availableThemes.slice(0, 10).map((themeName) => (
                        <li key={themeName}>
                          <button
                            onClick={() => {
                              setTheme(themeName);
                            }}
                            className={theme === themeName ? 'active' : ''}
                          >
                            <span className="capitalize">{themeName}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>

                {/* Mobile-only: Metrics & Settings quick access */}
                <li className="lg:hidden">
                  <button
                    onClick={() => {
                      handleTabClick('metrics');
                      setShowDropdown(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    {TAB_CONFIG.metrics.icon}
                    Metrics
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => {
                      handleTabClick('settings');
                      setShowDropdown(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    {TAB_CONFIG.settings.icon}
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

      {/* Bottom Navigation - Mobile Only */}
      <nav className="btm-nav btm-nav-sm lg:hidden z-50 bg-base-100 border-t border-base-300 safe-area-inset-bottom" role="navigation" aria-label="Mobile navigation">
        {MOBILE_PRIMARY_TABS.map((tab) => {
          const config = TAB_CONFIG[tab];
          const isDisabled = tab === 'teleprompter' && lyricsCount === 0;
          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              disabled={isDisabled}
              className={`${isActive ? 'active text-primary' : ''} ${isDisabled ? 'disabled opacity-40' : ''}`}
              aria-label={config.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="relative">
                {config.icon}
                {tab === 'social' && pendingSocialCount > 0 && (
                  <span className="absolute -top-1 -right-1 badge badge-primary badge-xs min-w-4 h-4 p-0 flex items-center justify-center text-[10px]">
                    {pendingSocialCount > 9 ? '9+' : pendingSocialCount}
                  </span>
                )}
              </span>
              <span className="btm-nav-label text-[10px]">{config.mobileLabel}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
