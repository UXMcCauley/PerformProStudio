'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  onBack?: () => void;
  showBackButton?: boolean;
}

export default function Settings({ onBack, showBackButton = false }: Props) {
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<'personal' | 'bands' | 'theme'>('personal');
  const [name, setName] = useState('User Name');
  const [email, setEmail] = useState('user@example.com');
  const [bands, setBands] = useState<string[]>(['My Band']);
  const [newBand, setNewBand] = useState('');

  const handleAddBand = () => {
    if (newBand.trim() && !bands.includes(newBand.trim())) {
      setBands([...bands, newBand.trim()]);
      setNewBand('');
    }
  };

  const handleRemoveBand = (bandToRemove: string) => {
    setBands(bands.filter(band => band !== bandToRemove));
  };

  const handleLogout = () => {
    // Handle logout logic
    alert('Logout functionality will be implemented with authentication');
  };

  return (
    <div className="bg-base-100 shadow-lg border border-base-300 p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            className="p-2 text-base-content/70 hover:text-purple-600 hover:bg-purple-50 transition-all duration-200"
            title="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="w-1 h-8 bg-purple-600" />
        <h2 className="text-xl md:text-2xl font-bold text-base-content">Settings</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="md:col-span-1">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveSection('personal')}
              className={`w-full px-4 py-3 text-left transition-all duration-200 flex items-center gap-3 ${
                activeSection === 'personal'
                  ? 'bg-purple-50 text-purple-600 border-l-4 border-purple-600'
                  : 'text-base-content/70 hover:bg-base-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span className="font-medium">Personal Info</span>
            </button>

            <button
              onClick={() => setActiveSection('bands')}
              className={`w-full px-4 py-3 text-left transition-all duration-200 flex items-center gap-3 ${
                activeSection === 'bands'
                  ? 'bg-purple-50 text-purple-600 border-l-4 border-purple-600'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <span className="font-medium">Bands</span>
            </button>

            <button
              onClick={() => setActiveSection('theme')}
              className={`w-full px-4 py-3 text-left transition-all duration-200 flex items-center gap-3 ${
                activeSection === 'theme'
                  ? 'bg-purple-50 text-purple-600 border-l-4 border-purple-600'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
              </svg>
              <span className="font-medium">Theme</span>
            </button>
          </nav>

          <div className="mt-6 pt-6 border-t border-base-300">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-all duration-200 flex items-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-3">
          {activeSection === 'personal' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-base-content mb-4">Personal Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-base-content/70 mb-2">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-4 py-2 bg-base-100 border border-base-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-4 py-2 bg-base-100 border border-base-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>

                  <div className="pt-4">
                    <button className="px-6 py-2 bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-base-300">
                <h3 className="text-lg font-semibold text-base-content mb-2">Profile Avatar</h3>
                <p className="text-sm text-base-content/60 mb-4">Your avatar is generated from your initials</p>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    {name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'bands' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-base-content mb-4">Your Bands</h3>
                <p className="text-sm text-base-content/60 mb-4">
                  Manage your bands to organize your song library
                </p>

                <div className="space-y-3 mb-6">
                  {bands.map(band => (
                    <div
                      key={band}
                      className="flex items-center justify-between p-3 bg-base-200 border border-base-300 hover:bg-base-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                        </svg>
                        <span className="font-medium text-base-content">{band}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveBand(band)}
                        className="p-1 text-base-content/50 hover:text-red-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBand}
                    onChange={e => setNewBand(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddBand()}
                    placeholder="Add new band..."
                    className="flex-1 px-4 py-2 border border-slate-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                  <button
                    onClick={handleAddBand}
                    disabled={!newBand.trim()}
                    className="px-6 py-2 bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    Add Band
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'theme' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-base-content mb-4">Appearance</h3>
                <p className="text-sm text-base-content/60 mb-6">
                  Choose how the app looks and feels
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => setTheme('light')}
                    className={`w-full p-4 border-2 transition-all flex items-center gap-4 ${
                      theme === 'light'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-base-300 hover:border-purple-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      theme === 'light' ? 'border-purple-600' : 'border-base-300'
                    }`}>
                      {theme === 'light' && (
                        <div className="w-3 h-3 rounded-full bg-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-base-content/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                        </svg>
                        <span className="font-medium text-base-content">Light</span>
                      </div>
                      <p className="text-sm text-base-content/60 mt-1">Clean and bright interface</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setTheme('dark')}
                    className={`w-full p-4 border-2 transition-all flex items-center gap-4 ${
                      theme === 'dark'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      theme === 'dark' ? 'border-purple-600' : 'border-slate-300'
                    }`}>
                      {theme === 'dark' && (
                        <div className="w-3 h-3 rounded-full bg-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-base-content/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                        </svg>
                        <span className="font-medium text-base-content">Dark</span>
                      </div>
                      <p className="text-sm text-base-content/60 mt-1">Easy on the eyes in low light</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setTheme('auto')}
                    className={`w-full p-4 border-2 transition-all flex items-center gap-4 ${
                      theme === 'auto'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      theme === 'auto' ? 'border-purple-600' : 'border-slate-300'
                    }`}>
                      {theme === 'auto' && (
                        <div className="w-3 h-3 rounded-full bg-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-base-content/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                        </svg>
                        <span className="font-medium text-base-content">Auto</span>
                      </div>
                      <p className="text-sm text-base-content/60 mt-1">Matches your system preferences</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}