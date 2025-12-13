'use client';

import { useState, useEffect } from 'react';
import SetlistEditor from './SetlistEditor';

type Band = {
  _id: string;
  name: string;
};

type BandMember = {
  _id: string;
  user_id: string;
  role: string;
  user: {
    _id: string;
    displayName: string;
    email: string;
    avatar?: string;
  };
};

type PracticeInvite = {
  _id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  user_name: string;
  user_email: string;
  user_avatar?: string;
};

type Show = {
  _id: string;
  band_id: string;
  band_name?: string;
  name: string;
  date: string;
  time: string | null;
  venue: string | null;
  notes: string | null;
  event_type: 'show' | 'practice';
  created_by: string;
  created_at: string;
  updated_at: string;
};

interface Props {
  onBack: () => void;
  showBackButton: boolean;
}

export default function ShowsCalendar({ onBack, showBackButton }: Props) {
  const [bands, setBands] = useState<Band[]>([]);
  const [selectedBandId, setSelectedBandId] = useState<string | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formVenue, setFormVenue] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formEventType, setFormEventType] = useState<'show' | 'practice'>('show');
  const [formBandId, setFormBandId] = useState<string>('');

  // Duplicate modal state
  const [duplicateModal, setDuplicateModal] = useState(false);
  const [duplicateShow, setDuplicateShow] = useState<Show | null>(null);
  const [duplicateDate, setDuplicateDate] = useState('');
  const [duplicateWithSetlist, setDuplicateWithSetlist] = useState(true);

  // Member invite state (for practice events)
  const [bandMembers, setBandMembers] = useState<BandMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [practiceInvites, setPracticeInvites] = useState<PracticeInvite[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Recurring event state (for practices)
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState(4); // Default 4 weeks

  useEffect(() => {
    loadBands();
  }, []);

  useEffect(() => {
    if (selectedBandId) {
      loadShows();
    }
  }, [selectedBandId, currentDate]);

  const loadBands = async () => {
    try {
      const response = await fetch('/api/bands');
      if (response.ok) {
        const data = await response.json();
        setBands(data || []);
        // Default to "all" if there are bands
        if (data && data.length > 0) {
          setSelectedBandId('all');
        }
      }
    } catch (error) {
      console.error('Error loading bands:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadShows = async () => {
    if (!selectedBandId) return;
    try {
      const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const url = selectedBandId === 'all'
        ? `/api/shows?allBands=true&month=${month}`
        : `/api/shows?bandId=${selectedBandId}&month=${month}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setShows(data || []);
      }
    } catch (error) {
      console.error('Error loading shows:', error);
    }
  };

  const loadBandMembers = async (bandId: string) => {
    if (!bandId) return;
    setLoadingMembers(true);
    try {
      const response = await fetch(`/api/band-members?bandId=${bandId}`);
      if (response.ok) {
        const data = await response.json();
        setBandMembers(data || []);
      }
    } catch (error) {
      console.error('Error loading band members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadPracticeInvites = async (showId: string) => {
    try {
      const response = await fetch(`/api/practice-invites?showId=${showId}`);
      if (response.ok) {
        const data = await response.json();
        setPracticeInvites(data || []);
        // Pre-select already invited members
        setSelectedMembers(data.map((inv: PracticeInvite) => inv.to_user_id));
      }
    } catch (error) {
      console.error('Error loading practice invites:', error);
    }
  };

  const openCreateModal = (date: string) => {
    setEditingShow(null);
    setSelectedDate(date);
    setFormName('');
    setFormDate(date);
    setFormTime('');
    setFormVenue('');
    setFormNotes('');
    setFormEventType('show');
    // Default to first band if viewing "all", otherwise use selected band
    const bandId = selectedBandId === 'all' ? (bands[0]?._id || '') : selectedBandId || '';
    setFormBandId(bandId);
    setSelectedMembers([]);
    setBandMembers([]);
    setPracticeInvites([]);
    setIsRecurring(false);
    setRecurringWeeks(4);
    setShowModal(true);
  };

  const openEditModal = (show: Show) => {
    setEditingShow(show);
    setSelectedDate(show.date);
    setFormName(show.name);
    setFormDate(show.date);
    setFormTime(show.time || '');
    setFormVenue(show.venue || '');
    setFormNotes(show.notes || '');
    setFormEventType(show.event_type || 'show');
    setFormBandId(show.band_id);
    setSelectedMembers([]);
    setBandMembers([]);
    setPracticeInvites([]);
    setIsRecurring(false); // Can't make existing events recurring
    setRecurringWeeks(4);

    // Load members and existing invites for practice events
    if (show.event_type === 'practice') {
      loadBandMembers(show.band_id);
      loadPracticeInvites(show._id);
    }

    setShowModal(true);
  };

  // Load band members when switching to practice type or changing band
  useEffect(() => {
    if (showModal && formEventType === 'practice' && formBandId) {
      loadBandMembers(formBandId);
    }
  }, [showModal, formEventType, formBandId]);

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllMembers = () => {
    // Select all members except the current user (we filter that in backend anyway)
    setSelectedMembers(bandMembers.map(m => m.user_id));
  };

  // Helper to add days to a date string
  const addDays = (dateStr: string, days: number): string => {
    const date = new Date(dateStr + 'T00:00:00');
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const handleSaveShow = async () => {
    if (!formBandId || !formName.trim() || !formDate) return;

    try {
      if (editingShow) {
        // Update existing show
        const response = await fetch('/api/shows', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingShow._id,
            name: formName.trim(),
            date: formDate,
            time: formTime || null,
            venue: formVenue.trim() || null,
            notes: formNotes.trim() || null,
            event_type: formEventType,
          }),
        });
        if (response.ok) {
          // Send practice invites if this is a practice event
          if (formEventType === 'practice' && selectedMembers.length > 0) {
            await fetch('/api/practice-invites', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                showId: editingShow._id,
                bandId: formBandId,
                memberIds: selectedMembers,
              }),
            });
          }
          await loadShows();
          setShowModal(false);
        }
      } else {
        // Create new show(s) - handle recurring for practices
        const datesToCreate = [formDate];

        if (isRecurring && formEventType === 'practice' && recurringWeeks > 1) {
          // Add additional weeks
          for (let i = 1; i < recurringWeeks; i++) {
            datesToCreate.push(addDays(formDate, i * 7));
          }
        }

        // Create all the events
        for (const eventDate of datesToCreate) {
          const response = await fetch('/api/shows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              band_id: formBandId,
              name: formName.trim(),
              date: eventDate,
              time: formTime || null,
              venue: formVenue.trim() || null,
              notes: formNotes.trim() || null,
              event_type: formEventType,
            }),
          });
          if (response.ok) {
            const newShow = await response.json();
            // Send practice invites if this is a practice event
            if (formEventType === 'practice' && selectedMembers.length > 0) {
              await fetch('/api/practice-invites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  showId: newShow._id,
                  bandId: formBandId,
                  memberIds: selectedMembers,
                }),
              });
            }
          }
        }

        await loadShows();
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error saving show:', error);
    }
  };

  const handleDeleteShow = async (showId: string) => {
    if (!confirm('Are you sure you want to delete this show? This will also delete the setlist.')) {
      return;
    }

    try {
      const response = await fetch(`/api/shows?id=${showId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await loadShows();
        setShowModal(false);
        if (selectedShow?._id === showId) {
          setSelectedShow(null);
        }
      }
    } catch (error) {
      console.error('Error deleting show:', error);
    }
  };

  const openDuplicateModal = (show: Show) => {
    setDuplicateShow(show);
    setDuplicateDate('');
    setDuplicateWithSetlist(true);
    setDuplicateModal(true);
    setShowModal(false);
  };

  const handleDuplicateShow = async () => {
    if (!duplicateShow || !duplicateDate) return;

    try {
      // Create the new show (use the original show's band_id)
      const createResponse = await fetch('/api/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          band_id: duplicateShow.band_id,
          name: duplicateShow.name,
          date: duplicateDate,
          time: duplicateShow.time,
          venue: duplicateShow.venue,
          notes: duplicateShow.notes,
          event_type: duplicateShow.event_type || 'show',
        }),
      });

      if (createResponse.ok && duplicateWithSetlist) {
        const newShow = await createResponse.json();

        // Copy the setlist items
        const setlistResponse = await fetch(`/api/setlist?showId=${duplicateShow._id}`);
        if (setlistResponse.ok) {
          const setlistItems = await setlistResponse.json();

          // Create each setlist item for the new show
          for (const item of setlistItems) {
            await fetch('/api/setlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                show_id: newShow._id,
                type: item.type,
                song_id: item.song_id,
                artifact_id: item.artifact_id,
                custom_title: item.custom_title,
                custom_text: item.custom_text,
              }),
            });
          }
        }
      }

      await loadShows();
      setDuplicateModal(false);
      setDuplicateShow(null);
    } catch (error) {
      console.error('Error duplicating show:', error);
    }
  };

  // Calendar helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDateString = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getShowsForDate = (dateString: string) => {
    return shows.filter(show => show.date === dateString);
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date().toISOString().split('T')[0];

    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Day headers
    for (const dayName of dayNames) {
      days.push(
        <div key={`header-${dayName}`} className="text-center text-xs font-semibold text-base-content/60 py-2">
          {dayName}
        </div>
      );
    }

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="bg-base-200/30 min-h-[100px]" />);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatDateString(year, month, day);
      const dayShows = getShowsForDate(dateString);
      const isToday = dateString === today;

      days.push(
        <div
          key={day}
          onClick={() => openCreateModal(dateString)}
          className={`min-h-[100px] p-1 border border-base-300 cursor-pointer hover:bg-base-200/50 transition-colors ${
            isToday ? 'bg-primary/10 border-primary' : ''
          }`}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : 'text-base-content/70'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayShows.map(show => {
              const isPractice = show.event_type === 'practice';
              return (
                <div
                  key={show._id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedShow(show);
                  }}
                  className={`text-xs p-1 rounded truncate cursor-pointer ${
                    isPractice
                      ? 'bg-secondary/20 text-secondary hover:bg-secondary/30'
                      : 'bg-primary/20 text-primary hover:bg-primary/30'
                  }`}
                  title={`${show.name}${show.venue ? ` @ ${show.venue}` : ''}${show.band_name ? ` (${show.band_name})` : ''}`}
                >
                  {isPractice && <span className="mr-1">🎸</span>}
                  {show.time && <span className="font-medium">{show.time} </span>}
                  {show.name}
                  {selectedBandId === 'all' && show.band_name && (
                    <span className="opacity-60 ml-1">({show.band_name})</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return days;
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center p-4">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        <p className="text-base-content/60 text-sm animate-pulse mt-2">Loading shows...</p>
      </div>
    );
  }

  // If viewing a show's setlist
  if (selectedShow) {
    return (
      <SetlistEditor
        show={selectedShow}
        onBack={() => setSelectedShow(null)}
        onEditShow={() => openEditModal(selectedShow)}
      />
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <button onClick={onBack} className="btn btn-ghost btn-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-base-content">Shows</h1>
        </div>

        {/* Band selector */}
        {bands.length > 0 && (
          <select
            value={selectedBandId || ''}
            onChange={(e) => setSelectedBandId(e.target.value)}
            className="select select-bordered select-sm"
          >
            <option value="all">All Bands</option>
            {bands.map(band => (
              <option key={band._id} value={band._id}>{band.name}</option>
            ))}
          </select>
        )}
      </div>

      {bands.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-20 h-20 mx-auto mb-4 text-base-content/20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <p className="text-base-content/60 text-lg mb-4">No bands yet</p>
          <p className="text-base-content/40 text-sm">Create a band in the Social tab to start scheduling shows</p>
        </div>
      ) : (
        <>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigateMonth(-1)} className="btn btn-ghost btn-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-semibold text-base-content">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={() => navigateMonth(1)} className="btn btn-ghost btn-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0 border border-base-300 rounded-lg overflow-hidden bg-base-100">
            {renderCalendar()}
          </div>

          <p className="text-xs text-base-content/50 mt-4 text-center">
            Click on a date to create a show, or click on an existing show to edit its setlist
          </p>
        </>
      )}

      {/* Create/Edit Show Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-base-content mb-4">
              {editingShow
                ? `Edit ${editingShow.event_type === 'practice' ? 'Practice' : 'Show'}`
                : `New ${formEventType === 'practice' ? 'Practice' : 'Show'}`
              }
            </h3>

            <div className="space-y-4">
              {/* Event Type Toggle */}
              <div className="form-control">
                <label className="label"><span className="label-text">Event Type *</span></label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormEventType('show')}
                    className={`btn btn-sm flex-1 ${formEventType === 'show' ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Show/Gig
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormEventType('practice')}
                    className={`btn btn-sm flex-1 ${formEventType === 'practice' ? 'btn-secondary' : 'btn-ghost'}`}
                  >
                    <span className="mr-1">🎸</span>
                    Practice
                  </button>
                </div>
              </div>

              {/* Band Selector (only when creating or when viewing all) */}
              {(selectedBandId === 'all' || !editingShow) && bands.length > 1 && (
                <div className="form-control">
                  <label className="label"><span className="label-text">Band *</span></label>
                  <select
                    value={formBandId}
                    onChange={(e) => setFormBandId(e.target.value)}
                    className="select select-bordered w-full"
                    disabled={!!editingShow}
                  >
                    {bands.map(band => (
                      <option key={band._id} value={band._id}>{band.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-control">
                <label className="label"><span className="label-text">{formEventType === 'practice' ? 'Practice Name *' : 'Show Name *'}</span></label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder={formEventType === 'practice' ? 'e.g., Weekly Rehearsal' : 'e.g., Friday Night Live'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text">Date *</span></label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="input input-bordered w-full"
                  />
                </div>

                <div className="form-control">
                  <label className="label"><span className="label-text">Time</span></label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="input input-bordered w-full"
                  />
                </div>
              </div>

              {/* Recurring Practice Option (only for new practices) */}
              {formEventType === 'practice' && !editingShow && (
                <div className="form-control bg-secondary/10 rounded-lg p-3">
                  <label className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="checkbox checkbox-secondary"
                    />
                    <span className="label-text font-medium">Make this a recurring practice</span>
                  </label>
                  {isRecurring && (
                    <div className="mt-2 flex items-center gap-2 pl-10">
                      <span className="text-sm text-base-content/70">Repeat every</span>
                      <span className="text-sm font-medium">
                        {formDate ? new Date(formDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : 'week'}
                      </span>
                      <span className="text-sm text-base-content/70">for</span>
                      <select
                        value={recurringWeeks}
                        onChange={(e) => setRecurringWeeks(parseInt(e.target.value))}
                        className="select select-bordered select-sm w-20"
                      >
                        {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <span className="text-sm text-base-content/70">weeks</span>
                    </div>
                  )}
                  {isRecurring && recurringWeeks > 1 && (
                    <p className="text-xs text-base-content/50 mt-2 pl-10">
                      This will create {recurringWeeks} practices from {formDate ? new Date(formDate + 'T00:00:00').toLocaleDateString() : 'the selected date'}
                    </p>
                  )}
                </div>
              )}

              <div className="form-control">
                <label className="label"><span className="label-text">{formEventType === 'practice' ? 'Location' : 'Venue'}</span></label>
                <input
                  type="text"
                  value={formVenue}
                  onChange={(e) => setFormVenue(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder={formEventType === 'practice' ? "e.g., John's Garage" : 'e.g., The Blue Note'}
                />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text">Notes</span></label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  placeholder={formEventType === 'practice' ? 'Songs to work on, things to bring...' : 'Any additional notes...'}
                />
              </div>

              {/* Member Invites (Practice Only) */}
              {formEventType === 'practice' && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Invite Band Members</span>
                    {bandMembers.length > 1 && (
                      <button
                        type="button"
                        onClick={selectAllMembers}
                        className="link link-primary text-xs"
                      >
                        Select All
                      </button>
                    )}
                  </label>
                  {loadingMembers ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : bandMembers.length === 0 ? (
                    <p className="text-sm text-base-content/50 py-2">
                      No other band members to invite
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-base-300 rounded-lg p-2">
                      {bandMembers.map(member => {
                        const isSelected = selectedMembers.includes(member.user_id);
                        const existingInvite = practiceInvites.find(
                          inv => inv.to_user_id === member.user_id
                        );
                        return (
                          <label
                            key={member.user_id}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-base-200 ${
                              isSelected ? 'bg-secondary/10' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleMemberSelection(member.user_id)}
                              className="checkbox checkbox-secondary checkbox-sm"
                            />
                            <div className="avatar placeholder">
                              <div className="bg-neutral text-neutral-content rounded-full w-8">
                                {member.user?.avatar ? (
                                  <img src={member.user.avatar} alt="" />
                                ) : (
                                  <span className="text-sm">
                                    {member.user?.displayName?.[0]?.toUpperCase() ||
                                     member.user?.email?.[0]?.toUpperCase() || '?'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {member.user?.displayName || member.user?.email}
                              </p>
                              <p className="text-xs text-base-content/50 truncate">
                                {member.role}
                                {existingInvite && (
                                  <span className={`ml-2 ${
                                    existingInvite.status === 'accepted' ? 'text-success' :
                                    existingInvite.status === 'declined' ? 'text-error' :
                                    'text-warning'
                                  }`}>
                                    ({existingInvite.status})
                                  </span>
                                )}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {selectedMembers.length > 0 && (
                    <p className="text-xs text-base-content/50 mt-1">
                      {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} will be invited
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-between mt-6">
              <div className="flex gap-2">
                {editingShow && (
                  <>
                    <button
                      onClick={() => handleDeleteShow(editingShow._id)}
                      className="btn btn-error btn-sm"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => openDuplicateModal(editingShow)}
                      className="btn btn-ghost btn-sm"
                      title="Duplicate to another date"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Duplicate
                    </button>
                  </>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="btn btn-ghost">
                  Cancel
                </button>
                <button
                  onClick={handleSaveShow}
                  className="btn btn-primary"
                  disabled={!formName.trim() || !formDate}
                >
                  {editingShow ? 'Save' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Show Modal */}
      {duplicateModal && duplicateShow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-base-content mb-4">
              Duplicate Show
            </h3>

            <p className="text-base-content/70 mb-4">
              Create a copy of "{duplicateShow.name}" on a new date.
            </p>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text">New Date *</span></label>
                <input
                  type="date"
                  value={duplicateDate}
                  onChange={(e) => setDuplicateDate(e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    checked={duplicateWithSetlist}
                    onChange={(e) => setDuplicateWithSetlist(e.target.checked)}
                    className="checkbox checkbox-primary"
                  />
                  <span className="label-text">Copy setlist items</span>
                </label>
                <p className="text-xs text-base-content/50 ml-9">
                  Include all songs and artifacts from the original show
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setDuplicateModal(false);
                  setDuplicateShow(null);
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleDuplicateShow}
                className="btn btn-primary"
                disabled={!duplicateDate}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Duplicate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
