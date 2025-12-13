'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import SongImportModal from './SongImportModal';
import BandSettingsPanel from './BandSettingsPanel';

type GroupContentType = 'band' | 'production' | 'podcast' | 'organization';

type Band = {
  _id: string;
  user_id: string;
  name: string;
  content_type?: GroupContentType;
  role?: 'owner' | 'admin' | 'member';
  created_at: string;
  updated_at: string;
};

type TagConfig = {
  _id: string;
  user_id: string;
  tag_name: string;
  color: string;
  created_at: string;
  updated_at: string;
};

// Labels and icons for each content type group
const GROUP_TYPE_CONFIG: Record<GroupContentType, {
  label: string;
  pluralLabel: string;
  icon: string;
  description: string;
  itemLabel: string;
  itemPluralLabel: string;
  placeholder: string;
  gradient: string;
}> = {
  band: {
    label: 'Band',
    pluralLabel: 'Bands',
    icon: '🎵',
    description: 'Manage your bands and collaborate with other musicians',
    itemLabel: 'Album',
    itemPluralLabel: 'Albums',
    placeholder: 'Create new band...',
    gradient: 'from-purple-500 to-pink-500',
  },
  production: {
    label: 'Production',
    pluralLabel: 'Productions',
    icon: '🎭',
    description: 'Manage theater companies and production teams for scripts',
    itemLabel: 'Show/Play',
    itemPluralLabel: 'Shows/Plays',
    placeholder: 'Create new production team...',
    gradient: 'from-amber-500 to-orange-500',
  },
  podcast: {
    label: 'Podcast',
    pluralLabel: 'Podcasts',
    icon: '🎙️',
    description: 'Manage your podcast shows and seasons',
    itemLabel: 'Season',
    itemPluralLabel: 'Seasons',
    placeholder: 'Create new podcast show...',
    gradient: 'from-blue-500 to-cyan-500',
  },
  organization: {
    label: 'Organization',
    pluralLabel: 'Organizations',
    icon: '📢',
    description: 'Manage organizations for speeches and presentations',
    itemLabel: 'Event/Series',
    itemPluralLabel: 'Events/Series',
    placeholder: 'Create new organization...',
    gradient: 'from-green-500 to-emerald-500',
  },
};

type SectionType = 'personal' | 'bands' | 'productions' | 'podcasts' | 'organizations' | 'tags' | 'integrations' | 'theme';

interface Props {
  onBack?: () => void;
  showBackButton?: boolean;
}

export default function Settings({ onBack, showBackButton = false }: Props) {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionType>('personal');
  const [name, setName] = useState('User Name');
  const [email, setEmail] = useState('user@example.com');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [allGroups, setAllGroups] = useState<Band[]>([]);
  const [tagConfigs, setTagConfigs] = useState<TagConfig[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('purple');
  const [showImportModal, setShowImportModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [hasPersonalChanges, setHasPersonalChanges] = useState(false);
  const [originalPersonalData, setOriginalPersonalData] = useState({ name: 'User Name', email: 'user@example.com', avatar: null as string | null });
  const [selectedBand, setSelectedBand] = useState<Band | null>(null);

  // Filter groups by content type
  const bands = allGroups.filter(g => !g.content_type || g.content_type === 'band');
  const productions = allGroups.filter(g => g.content_type === 'production');
  const podcasts = allGroups.filter(g => g.content_type === 'podcast');
  const organizations = allGroups.filter(g => g.content_type === 'organization');

  useEffect(() => {
    const hasChanges = name !== originalPersonalData.name || email !== originalPersonalData.email || avatar !== originalPersonalData.avatar;
    setHasPersonalChanges(hasChanges);
  }, [name, email, avatar, originalPersonalData]);

  const handleAddGroup = async (contentType: GroupContentType) => {
    if (!user?.id) {
      alert(`Please log in to add ${GROUP_TYPE_CONFIG[contentType].pluralLabel.toLowerCase()}`);
      return;
    }

    const existingGroups = contentType === 'band' ? bands :
                           contentType === 'production' ? productions :
                           contentType === 'podcast' ? podcasts : organizations;

    if (newGroupName.trim() && !existingGroups.some(g => g.name === newGroupName.trim())) {
      try {
        const response = await fetch('/api/bands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newGroupName.trim(), content_type: contentType }),
        });

        if (response.ok) {
          const newGroupData = await response.json();
          setAllGroups([...allGroups, newGroupData]);
          setNewGroupName('');
        } else {
          alert(`Error creating ${GROUP_TYPE_CONFIG[contentType].label.toLowerCase()}. Please try again.`);
        }
      } catch (error) {
        console.error(`Error creating ${contentType}:`, error);
        alert(`Error creating ${GROUP_TYPE_CONFIG[contentType].label.toLowerCase()}. Please try again.`);
      }
    }
  };

  const handleRemoveGroup = async (groupId: string, contentType: GroupContentType) => {
    if (!user?.id) {
      alert(`Please log in to remove ${GROUP_TYPE_CONFIG[contentType].pluralLabel.toLowerCase()}`);
      return;
    }

    try {
      const response = await fetch(`/api/bands?id=${groupId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAllGroups(allGroups.filter(g => g._id !== groupId));
      } else {
        console.error(`Error deleting ${contentType}`);
        alert(`Error deleting ${GROUP_TYPE_CONFIG[contentType].label.toLowerCase()}. Please try again.`);
      }
    } catch (error) {
      console.error(`Error deleting ${contentType}:`, error);
      alert(`Error deleting ${GROUP_TYPE_CONFIG[contentType].label.toLowerCase()}. Please try again.`);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      alert('Please upload a PNG or JPG image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
  };

  const handleCancelPersonal = () => {
    setName(originalPersonalData.name);
    setEmail(originalPersonalData.email);
    setAvatar(originalPersonalData.avatar);
  };

  const handleSavePersonal = async () => {
    if (!user?.id) {
      alert('Please log in to save settings');
      return;
    }

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, avatar }),
      });

      if (response.ok) {
        setOriginalPersonalData({ name, email, avatar });
        alert('Settings saved successfully!');
      } else {
        alert('Error saving settings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      if (user?.id) {
        try {
          // Load user settings
          const settingsResponse = await fetch('/api/settings');
          if (settingsResponse.ok) {
            const settings = await settingsResponse.json();
            if (settings && Object.keys(settings).length > 0) {
              const loadedName = settings.name || user.email || 'User Name';
              const loadedEmail = settings.email || user.email || 'user@example.com';
              const loadedAvatar = settings.avatar || null;
              setName(loadedName);
              setEmail(loadedEmail);
              setAvatar(loadedAvatar);
              setOriginalPersonalData({ name: loadedName, email: loadedEmail, avatar: loadedAvatar });
            }
          }

          // Load all groups (bands, productions, podcasts, organizations)
          const bandsResponse = await fetch('/api/bands');
          if (bandsResponse.ok) {
            const userGroups = await bandsResponse.json();
            setAllGroups(userGroups);
          }

          // Load tag configs
          const tagsResponse = await fetch('/api/tags');
          if (tagsResponse.ok) {
            const configs = await tagsResponse.json();
            setTagConfigs(configs);
          }
        } catch (error) {
          console.error('Error loading settings:', error);
        }
      }
    };
    loadSettings();
  }, [user]);

  const handleAddTagConfig = async () => {
    if (!user?.id) {
      alert('Please log in to add tag configs');
      return;
    }

    if (newTagName.trim() && !tagConfigs.some(tc => tc.tag_name === newTagName.trim())) {
      try {
        const response = await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag_name: newTagName.trim(), color: newTagColor }),
        });

        if (response.ok) {
          const config = await response.json();
          setTagConfigs([...tagConfigs, config]);
          setNewTagName('');
          setNewTagColor('purple');
        } else {
          alert('Error creating tag config. Please try again.');
        }
      } catch (error) {
        console.error('Error creating tag config:', error);
        alert('Error creating tag config. Please try again.');
      }
    }
  };

  const handleRemoveTagConfig = async (tagConfigId: string) => {
    if (!user?.id) {
      alert('Please log in to remove tag configs');
      return;
    }

    try {
      const response = await fetch(`/api/tags?id=${tagConfigId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTagConfigs(tagConfigs.filter(tc => tc._id !== tagConfigId));
      } else {
        console.error('Error deleting tag config');
        alert('Error deleting tag config. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting tag config:', error);
      alert('Error deleting tag config. Please try again.');
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="bg-base-100 shadow-lg border border-base-300 p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            className="p-2 text-base-content/70 hover:text-primary transition-all duration-200"
            title="Back"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
          <ul className="menu bg-base-200 rounded-box">
            <li>
              <a
                onClick={() => setActiveSection('personal')}
                className={activeSection === 'personal' ? 'active' : ''}
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                Personal Info
              </a>
            </li>
            <li className="menu-title">
              <span>Content Groups</span>
            </li>
            <li>
              <a
                onClick={() => setActiveSection('bands')}
                className={activeSection === 'bands' ? 'active' : ''}
              >
                <span className="text-lg">🎵</span>
                Bands
                {bands.length > 0 && <span className="badge badge-sm">{bands.length}</span>}
              </a>
            </li>
            <li>
              <a
                onClick={() => setActiveSection('productions')}
                className={activeSection === 'productions' ? 'active' : ''}
              >
                <span className="text-lg">🎭</span>
                Productions
                {productions.length > 0 && <span className="badge badge-sm">{productions.length}</span>}
              </a>
            </li>
            <li>
              <a
                onClick={() => setActiveSection('podcasts')}
                className={activeSection === 'podcasts' ? 'active' : ''}
              >
                <span className="text-lg">🎙️</span>
                Podcasts
                {podcasts.length > 0 && <span className="badge badge-sm">{podcasts.length}</span>}
              </a>
            </li>
            <li>
              <a
                onClick={() => setActiveSection('organizations')}
                className={activeSection === 'organizations' ? 'active' : ''}
              >
                <span className="text-lg">📢</span>
                Organizations
                {organizations.length > 0 && <span className="badge badge-sm">{organizations.length}</span>}
              </a>
            </li>
            <li className="menu-title">
              <span>Preferences</span>
            </li>
            <li>
              <a
                onClick={() => setActiveSection('tags')}
                className={activeSection === 'tags' ? 'active' : ''}
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                </svg>
                Tags
              </a>
            </li>
            <li>
              <a
                onClick={() => setActiveSection('integrations')}
                className={activeSection === 'integrations' ? 'active' : ''}
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                Integrations
              </a>
            </li>
            <li>
              <a
                onClick={() => setActiveSection('theme')}
                className={activeSection === 'theme' ? 'active' : ''}
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                </svg>
                Theme
              </a>
            </li>
            <li className="menu-title">
              <span>Account</span>
            </li>
            <li>
              <a onClick={handleLogout} className="text-error">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Logout
              </a>
            </li>
          </ul>
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
                      className="w-full px-4 py-2 bg-base-100 border border-base-300 focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-4 py-2 bg-base-100 border border-base-300 focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>

                  <div className="pt-4 flex gap-2">
                    {hasPersonalChanges && (
                      <button onClick={handleCancelPersonal} className="btn btn-ghost gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel
                      </button>
                    )}
                    <button onClick={handleSavePersonal} disabled={!hasPersonalChanges} className="btn btn-primary gap-2 disabled:opacity-50">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-base-300">
                <h3 className="text-lg font-semibold text-base-content mb-2">Profile Avatar</h3>
                <p className="text-sm text-base-content/60 mb-4">Upload a custom avatar (PNG/JPG, max 5MB)</p>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-lg overflow-hidden">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      name.split(' ').map(n => n[0]).join('').toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="btn btn-sm btn-primary">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      Upload
                      <input
                        type="file"
                        className="hidden"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleAvatarUpload}
                      />
                    </label>
                    {avatar && (
                      <button onClick={handleRemoveAvatar} className="btn btn-sm btn-ghost text-error">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Render group sections for each content type */}
          {(['bands', 'productions', 'podcasts', 'organizations'] as const).map(section => {
            const contentType: GroupContentType = section === 'bands' ? 'band' :
                                                   section === 'productions' ? 'production' :
                                                   section === 'podcasts' ? 'podcast' : 'organization';
            const config = GROUP_TYPE_CONFIG[contentType];
            const groupList = section === 'bands' ? bands :
                              section === 'productions' ? productions :
                              section === 'podcasts' ? podcasts : organizations;

            return activeSection === section && (
              <div key={section} className="space-y-6">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{config.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-base-content">Your {config.pluralLabel}</h3>
                      <p className="text-sm text-base-content/60">{config.description}</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {groupList.length === 0 ? (
                      <div className="text-center py-8 text-base-content/60 bg-base-200 rounded-lg">
                        <span className="text-4xl mb-2 block">{config.icon}</span>
                        <p>No {config.pluralLabel.toLowerCase()} yet. Create your first one below!</p>
                      </div>
                    ) : (
                      groupList.map(group => (
                        <div
                          key={group._id}
                          className="flex items-center justify-between p-3 bg-base-200 border border-base-300 rounded-lg transition-colors hover:bg-base-300/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 bg-gradient-to-br ${config.gradient} rounded-lg flex items-center justify-center text-white text-lg`}>
                              {config.icon}
                            </div>
                            <div>
                              <span className="font-medium text-base-content">{group.name}</span>
                              {group.role && (
                                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                                  group.role === 'owner' ? 'bg-amber-500 text-white' :
                                  group.role === 'admin' ? 'bg-purple-500 text-white' :
                                  'bg-base-300 text-base-content'
                                }`}>
                                  {group.role}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedBand(group)}
                              className="btn btn-ghost btn-sm"
                              title={`${config.label} settings`}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.929l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                            {group.role === 'owner' && (
                              <button
                                onClick={() => handleRemoveGroup(group._id, contentType)}
                                className="btn btn-ghost btn-sm text-error"
                                title={`Delete ${config.label.toLowerCase()}`}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddGroup(contentType)}
                      placeholder={config.placeholder}
                      className="flex-1 px-4 py-2 border border-base-300 rounded-lg focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                    <button
                      onClick={() => handleAddGroup(contentType)}
                      disabled={!newGroupName.trim()}
                      className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create {config.label}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {activeSection === 'tags' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-base-content mb-4">Tag Colors</h3>
                <p className="text-sm text-base-content/60 mb-4">
                  Customize the colors for your tags
                </p>

                <div className="space-y-3 mb-6">
                  {tagConfigs.length === 0 ? (
                    <div className="text-center py-8 text-base-content/60">
                      <p>No custom tag colors yet. Add one below!</p>
                    </div>
                  ) : (
                    tagConfigs.map(config => (
                      <div
                        key={config._id}
                        className="flex items-center justify-between p-3 bg-base-200 border border-base-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full bg-${config.color}-500`}></div>
                          <span className="font-medium text-base-content">{config.tag_name}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveTagConfig(config._id)}
                          className="p-1 text-base-content/50 hover:text-red-600 transition-colors"
                        >
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddTagConfig()}
                      placeholder="Tag name..."
                      className="flex-1 px-4 py-2 border border-base-300 focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                    <select
                      value={newTagColor}
                      onChange={e => setNewTagColor(e.target.value)}
                      className="select select-bordered"
                    >
                      <option value="red">Red</option>
                      <option value="orange">Orange</option>
                      <option value="amber">Amber</option>
                      <option value="yellow">Yellow</option>
                      <option value="lime">Lime</option>
                      <option value="green">Green</option>
                      <option value="emerald">Emerald</option>
                      <option value="teal">Teal</option>
                      <option value="cyan">Cyan</option>
                      <option value="sky">Sky</option>
                      <option value="blue">Blue</option>
                      <option value="indigo">Indigo</option>
                      <option value="violet">Violet</option>
                      <option value="purple">Purple</option>
                      <option value="fuchsia">Fuchsia</option>
                      <option value="pink">Pink</option>
                      <option value="rose">Rose</option>
                    </select>
                    <button
                      onClick={handleAddTagConfig}
                      disabled={!newTagName.trim()}
                      className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-base-content mb-4">Import Songs</h3>
                <p className="text-sm text-base-content/60 mb-6">
                  Import songs from your favorite music services by pasting a song URL
                </p>

                {/* Import from URL */}
                <div className="border border-base-300 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-base-content">Import from URL</h4>
                        <p className="text-sm text-base-content/60">
                          SoundCloud, Spotify, Deezer, YouTube
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="btn btn-sm btn-primary"
                    >
                      Import
                    </button>
                  </div>
                </div>

                {/* Supported Services Info */}
                <div className="bg-base-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-base-content mb-3">Supported Services</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M7 17.939h-1v-8.068c.308-.231.639-.429 1-.566v8.634zm3 0h1v-9.224c-.229.265-.443.548-.621.857l-.379-.184v8.551zm-2 0h1v-8.848c-.508-.079-.623-.05-1-.01v8.858zm-4 0h1v-7.02c-.312.458-.555.971-.692 1.535l-.308-.182v5.667zm-3-5.25c-.606.547-1 1.354-1 2.268 0 .914.394 1.721 1 2.268v-4.536zm18.879-.671c-.204-2.837-2.404-5.079-5.117-5.079-1.022 0-1.964.328-2.762.877v10.123h9.089c1.607 0 2.911-1.393 2.911-3.106 0-2.043-2.061-3.15-4.121-2.815z"/>
                        </svg>
                      </div>
                      <span className="text-sm text-base-content">SoundCloud</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                      </div>
                      <span className="text-sm text-base-content">Spotify</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-amber-500 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38h-5.19zm12.54 0v3.027H24V8.38h-5.19zM6.27 12.592v3.027h5.189v-3.027h-5.19zm6.27 0v3.027h5.19v-3.027h-5.19zm6.27 0v3.027H24v-3.027h-5.19zM0 16.81v3.029h5.19v-3.03H0zm6.27 0v3.029h5.189v-3.03h-5.19zm6.27 0v3.029h5.19v-3.03h-5.19zm6.27 0v3.029H24v-3.03h-5.19z"/>
                        </svg>
                      </div>
                      <span className="text-sm text-base-content">Deezer</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      </div>
                      <span className="text-sm text-base-content">YouTube</span>
                    </div>
                  </div>
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
                        ? 'border-primary bg-base-200'
                        : 'border-base-300 hover:border-primary/50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${
                      theme === 'light' ? 'border-primary' : 'border-base-300'
                    }`}>
                      {theme === 'light' && (
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <svg className="w-7 h-7 text-base-content/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                        ? 'border-primary bg-base-200'
                        : 'border-base-300 hover:border-primary/50'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${
                      theme === 'dark' ? 'border-primary' : 'border-base-300'
                    }`}>
                      {theme === 'dark' && (
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <svg className="w-7 h-7 text-base-content/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                        </svg>
                        <span className="font-medium text-base-content">Dark</span>
                      </div>
                      <p className="text-sm text-base-content/60 mt-1">Easy on the eyes in low light</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Song Import Modal */}
      <SongImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />

      {/* Band Settings Panel */}
      {selectedBand && (
        <BandSettingsPanel
          band={selectedBand}
          onClose={() => setSelectedBand(null)}
          onBandDeleted={() => {
            setAllGroups(allGroups.filter(g => g._id !== selectedBand._id));
            setSelectedBand(null);
          }}
        />
      )}
    </div>
  );
}
