'use client';

import { useState, useEffect } from 'react';

type Show = {
  _id: string;
  band_id: string;
  name: string;
  date: string;
  time: string | null;
  venue: string | null;
  notes: string | null;
};

type Song = {
  _id: string;
  title: string;
  artist: string;
  album: string | null;
  artwork_url: string | null;
};

type SetlistItem = {
  _id: string;
  show_id: string;
  type: 'song' | 'artifact';
  song_id: string | null;
  artifact_id: string | null;
  custom_title: string | null;
  custom_text: string | null;
  display_order: number;
};

type ArtifactTemplate = {
  _id: string;
  band_id: string;
  name: string;
  default_text: string;
  color: string | null;
};

interface Props {
  show: Show;
  onBack: () => void;
  onEditShow: () => void;
}

export default function SetlistEditor({ show, onBack, onEditShow }: Props) {
  const [setlistItems, setSetlistItems] = useState<SetlistItem[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [templates, setTemplates] = useState<ArtifactTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [songMap, setSongMap] = useState<Map<string, Song>>(new Map());

  // Drag state
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingSource, setDraggingSource] = useState<'setlist' | 'songs' | 'artifacts' | null>(null);

  // Edit artifact
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');

  // Custom artifact modal
  const [showCustomArtifact, setShowCustomArtifact] = useState(false);
  const [customArtifactTitle, setCustomArtifactTitle] = useState('');
  const [customArtifactText, setCustomArtifactText] = useState('');

  useEffect(() => {
    loadData();
  }, [show._id]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadSetlist(), loadSongs(), loadTemplates()]);
    setLoading(false);
  };

  const loadSetlist = async () => {
    try {
      const response = await fetch(`/api/setlist?showId=${show._id}`);
      if (response.ok) {
        const data = await response.json();
        setSetlistItems(data || []);
      }
    } catch (error) {
      console.error('Error loading setlist:', error);
    }
  };

  const loadSongs = async () => {
    try {
      const response = await fetch('/api/songs');
      if (response.ok) {
        const data = await response.json();
        setSongs(data || []);
        const map = new Map<string, Song>();
        for (const song of data || []) {
          map.set(song._id, song);
        }
        setSongMap(map);
      }
    } catch (error) {
      console.error('Error loading songs:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch(`/api/artifact-templates?bandId=${show.band_id}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const addSongToSetlist = async (songId: string) => {
    try {
      const response = await fetch('/api/setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          show_id: show._id,
          type: 'song',
          song_id: songId,
        }),
      });
      if (response.ok) {
        await loadSetlist();
      }
    } catch (error) {
      console.error('Error adding song:', error);
    }
  };

  const addArtifactToSetlist = async (template: ArtifactTemplate | null, customTitle?: string, customText?: string) => {
    try {
      const response = await fetch('/api/setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          show_id: show._id,
          type: 'artifact',
          artifact_id: template?._id || null,
          custom_title: customTitle || template?.name || 'Note',
          custom_text: customText || template?.default_text || '',
        }),
      });
      if (response.ok) {
        await loadSetlist();
      }
    } catch (error) {
      console.error('Error adding artifact:', error);
    }
  };

  const removeFromSetlist = async (itemId: string) => {
    try {
      const response = await fetch(`/api/setlist?id=${itemId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSetlistItems(prev => prev.filter(item => item._id !== itemId));
      }
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const updateArtifact = async (itemId: string, title: string, text: string) => {
    try {
      const response = await fetch('/api/setlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, custom_title: title, custom_text: text }),
      });
      if (response.ok) {
        setSetlistItems(prev => prev.map(item =>
          item._id === itemId ? { ...item, custom_title: title, custom_text: text } : item
        ));
      }
    } catch (error) {
      console.error('Error updating artifact:', error);
    }
  };

  const reorderSetlist = async (newItems: SetlistItem[]) => {
    const itemIds = newItems.map(item => item._id);
    try {
      const response = await fetch('/api/setlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showId: show._id, itemIds }),
      });
      if (!response.ok) {
        await loadSetlist();
      }
    } catch (error) {
      console.error('Error reordering setlist:', error);
      await loadSetlist();
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, itemId: string, source: 'setlist' | 'songs' | 'artifacts') => {
    setDraggingItemId(itemId);
    setDraggingSource(source);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.setData('source', source);
  };

  const handleDragEnd = () => {
    setDraggingItemId(null);
    setDragOverIndex(null);
    setDraggingSource(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    const source = e.dataTransfer.getData('source') || draggingSource;

    if (source === 'songs') {
      await addSongToSetlist(itemId);
    } else if (source === 'setlist' && itemId) {
      const currentIndex = setlistItems.findIndex(item => item._id === itemId);
      if (currentIndex !== -1 && currentIndex !== dropIndex) {
        const newItems = [...setlistItems];
        const [movedItem] = newItems.splice(currentIndex, 1);
        newItems.splice(dropIndex > currentIndex ? dropIndex - 1 : dropIndex, 0, movedItem);
        setSetlistItems(newItems);
        await reorderSetlist(newItems);
      }
    }

    setDraggingItemId(null);
    setDragOverIndex(null);
    setDraggingSource(null);
  };

  const handleDropOnSetlist = async (e: React.DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    const source = e.dataTransfer.getData('source') || draggingSource;

    if (source === 'songs') {
      await addSongToSetlist(itemId);
    }

    setDraggingItemId(null);
    setDragOverIndex(null);
    setDraggingSource(null);
  };

  const getTemplateForArtifact = (artifactId: string | null) => {
    if (!artifactId) return null;
    return templates.find(t => t._id === artifactId) || null;
  };

  const startEditing = (item: SetlistItem) => {
    setEditingItemId(item._id);
    setEditTitle(item.custom_title || getTemplateForArtifact(item.artifact_id)?.name || 'Note');
    setEditText(item.custom_text || '');
  };

  const saveEditing = () => {
    if (editingItemId) {
      updateArtifact(editingItemId, editTitle, editText);
      setEditingItemId(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center p-4">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        <p className="text-base-content/60 text-sm animate-pulse mt-2">Loading setlist...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="btn btn-ghost btn-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-base-content">{show.name}</h1>
            <p className="text-sm text-base-content/60">
              {new Date(show.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              {show.time && ` at ${show.time}`}
              {show.venue && ` - ${show.venue}`}
            </p>
          </div>
        </div>
        <button onClick={onEditShow} className="btn btn-ghost btn-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Show
        </button>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left: Setlist */}
        <div
          className="flex-1 flex flex-col min-h-0"
          onDragOver={(e) => {
            e.preventDefault();
            if (draggingSource === 'songs') {
              setDragOverIndex(setlistItems.length);
            }
          }}
          onDrop={handleDropOnSetlist}
        >
          <h2 className="text-lg font-semibold text-base-content mb-3">Setlist ({setlistItems.length} items)</h2>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {setlistItems.length === 0 ? (
              <div className={`text-center py-12 border-2 border-dashed rounded-lg ${
                draggingSource === 'songs' ? 'border-primary bg-primary/10' : 'border-base-300'
              }`}>
                <svg className="w-12 h-12 mx-auto mb-3 text-base-content/30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
                <p className="text-base-content/50 text-sm">Drag songs here to build your setlist</p>
              </div>
            ) : (
              setlistItems.map((item, index) => {
                const song = item.type === 'song' && item.song_id ? songMap.get(item.song_id) : null;
                const template = item.type === 'artifact' ? getTemplateForArtifact(item.artifact_id) : null;
                const isEditing = editingItemId === item._id;

                return (
                  <div
                    key={item._id}
                    draggable={!isEditing}
                    onDragStart={(e) => handleDragStart(e, item._id, 'setlist')}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`group flex items-center gap-3 p-3 rounded-lg bg-base-200 transition-all ${
                      !isEditing ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${draggingItemId === item._id ? 'opacity-50' : ''} ${
                      dragOverIndex === index ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    {/* Order number */}
                    <span className="text-sm font-bold text-base-content/40 w-6 text-center">{index + 1}</span>

                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-base-300">
                      {item.type === 'song' ? (
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    {item.type === 'song' && song ? (
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-base-content truncate">{song.title}</p>
                        <p className="text-xs text-base-content/60 truncate">{song.artist}</p>
                      </div>
                    ) : item.type === 'artifact' ? (
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="input input-bordered input-sm w-full"
                              placeholder="Title (e.g., Stage Banter, Crowd Work)"
                              autoFocus
                            />
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="textarea textarea-bordered textarea-sm w-full"
                              rows={2}
                              placeholder="Notes..."
                            />
                            <div className="flex gap-2">
                              <button onClick={saveEditing} className="btn btn-primary btn-xs">Save</button>
                              <button onClick={() => setEditingItemId(null)} className="btn btn-ghost btn-xs">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div onClick={() => startEditing(item)} className="cursor-pointer">
                            <p className="font-medium text-base-content truncate">
                              {item.custom_title || template?.name || 'Note'}
                            </p>
                            <p className="text-xs text-base-content/60 truncate">
                              {item.custom_text || 'Click to edit...'}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 text-base-content/50 italic">Unknown item</div>
                    )}

                    {/* Drag handle */}
                    {!isEditing && (
                      <div className="text-base-content/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                    )}

                    {/* Remove button */}
                    {!isEditing && (
                      <button
                        onClick={() => removeFromSetlist(item._id)}
                        className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 text-error"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Songs & Artifacts */}
        <div className="w-80 flex-shrink-0 flex flex-col border-l border-base-300 pl-6 min-h-0">
          {/* Songs */}
          <div className="flex-1 flex flex-col min-h-0 mb-6">
            <h2 className="text-lg font-semibold text-base-content mb-3">Songs</h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {songs.length === 0 ? (
                <p className="text-sm text-base-content/50 text-center py-4">No songs in library</p>
              ) : (
                songs.map(song => (
                  <div
                    key={song._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, song._id, 'songs')}
                    onDragEnd={handleDragEnd}
                    onClick={() => addSongToSetlist(song._id)}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-base-200 transition-all ${
                      draggingItemId === song._id && draggingSource === 'songs' ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-base-300 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {song.artwork_url ? (
                        <img src={song.artwork_url} alt="" className="w-full h-full object-cover" draggable={false} />
                      ) : (
                        <svg className="w-5 h-5 text-base-content/30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{song.title}</p>
                      <p className="text-xs text-base-content/60 truncate">{song.artist}</p>
                    </div>
                    <svg className="w-4 h-4 text-base-content/30" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Artifacts */}
          <div className="flex-shrink-0">
            <h2 className="text-lg font-semibold text-base-content mb-3">Artifacts</h2>
            <div className="space-y-2">
              {templates.map(template => (
                <button
                  key={template._id}
                  onClick={() => addArtifactToSetlist(template)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-base-300 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <span className="text-sm flex-1">{template.name}</span>
                  <svg className="w-4 h-4 text-base-content/30" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              ))}
              <button
                onClick={() => setShowCustomArtifact(true)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 transition-colors text-left border border-dashed border-base-300"
              >
                <div className="w-10 h-10 rounded-lg bg-base-200 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-base-content/50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-sm text-base-content/70 flex-1">Custom Note</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Artifact Modal */}
      {showCustomArtifact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-base-content mb-4">Add Custom Note</h3>
            <div className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text">Title</span></label>
                <input
                  type="text"
                  value={customArtifactTitle}
                  onChange={(e) => setCustomArtifactTitle(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="e.g., Stage Banter, Crowd Work, Announcement"
                  autoFocus
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Notes</span></label>
                <textarea
                  value={customArtifactText}
                  onChange={(e) => setCustomArtifactText(e.target.value)}
                  className="textarea textarea-bordered w-full"
                  rows={4}
                  placeholder="Enter your note, talking point, or reminder..."
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowCustomArtifact(false);
                  setCustomArtifactTitle('');
                  setCustomArtifactText('');
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  addArtifactToSetlist(null, customArtifactTitle.trim() || 'Note', customArtifactText.trim());
                  setShowCustomArtifact(false);
                  setCustomArtifactTitle('');
                  setCustomArtifactText('');
                }}
                className="btn btn-primary"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
