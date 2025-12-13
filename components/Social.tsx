'use client';

import { useState, useEffect } from 'react';
import UserSearchModal, { SearchUser } from './UserSearchModal';

interface Friend {
  _id: string;
  friend_id: string;
  friend_name: string;
  friend_email: string;
  since: string;
}

interface FriendRequest {
  _id: string;
  from_user_id: string;
  from_user_name: string;
  from_user_email: string;
  to_user_id: string;
  to_user_name: string;
  to_user_email: string;
  message?: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

interface BandInvite {
  _id: string;
  band_id: string;
  band_name: string;
  invited_by_id: string;
  invited_by_name: string;
  invited_by_email: string;
  role: 'admin' | 'member';
  message?: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

interface Props {
  onBack: () => void;
  showBackButton: boolean;
}

export default function Social({ onBack, showBackButton }: Props) {
  const [activeSection, setActiveSection] = useState<'friends' | 'requests' | 'invites'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [bandInvites, setBandInvites] = useState<BandInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [friendsRes, incomingRes, sentRes, invitesRes] = await Promise.all([
        fetch('/api/friends'),
        fetch('/api/friend-requests?type=incoming'),
        fetch('/api/friend-requests?type=sent'),
        fetch('/api/band-invites'),
      ]);

      if (!friendsRes.ok) throw new Error('Failed to load friends');
      if (!incomingRes.ok) throw new Error('Failed to load friend requests');
      if (!sentRes.ok) throw new Error('Failed to load sent requests');
      if (!invitesRes.ok) throw new Error('Failed to load band invites');

      const [friendsData, incomingData, sentData, invitesData] = await Promise.all([
        friendsRes.json(),
        incomingRes.json(),
        sentRes.json(),
        invitesRes.json(),
      ]);

      setFriends(friendsData);
      setIncomingRequests(incomingData);
      setSentRequests(sentData);
      setBandInvites(invitesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (user: SearchUser) => {
    setActionLoading(user._id);
    try {
      const res = await fetch('/api/friend-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: user._id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send request');
      }

      // Reload sent requests
      const sentRes = await fetch('/api/friend-requests?type=sent');
      if (sentRes.ok) {
        setSentRequests(await sentRes.json());
      }

      setShowAddFriend(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setActionLoading(null);
    }
  };

  // IDs to exclude from user search (already friends or pending requests)
  const excludeFromSearch = [
    ...friends.map(f => f.friend_id),
    ...sentRequests.map(r => r.to_user_id),
    ...incomingRequests.map(r => r.from_user_id),
  ];

  const respondToFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    setActionLoading(requestId);
    try {
      const res = await fetch('/api/friend-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });

      if (!res.ok) throw new Error('Failed to respond to request');

      // Reload data
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to respond');
    } finally {
      setActionLoading(null);
    }
  };

  const cancelFriendRequest = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`/api/friend-requests?id=${requestId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to cancel request');

      setSentRequests(prev => prev.filter(r => r._id !== requestId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setActionLoading(null);
    }
  };

  const removeFriend = async (friendshipId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;

    setActionLoading(friendshipId);
    try {
      const res = await fetch(`/api/friends?id=${friendshipId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to remove friend');

      setFriends(prev => prev.filter(f => f._id !== friendshipId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove friend');
    } finally {
      setActionLoading(null);
    }
  };

  const respondToBandInvite = async (inviteId: string, action: 'accept' | 'reject') => {
    setActionLoading(inviteId);
    try {
      const res = await fetch('/api/band-invites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action }),
      });

      if (!res.ok) throw new Error('Failed to respond to invite');

      setBandInvites(prev => prev.filter(i => i._id !== inviteId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to respond');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const pendingCount = incomingRequests.length + bandInvites.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {showBackButton && (
          <button onClick={onBack} className="btn btn-ghost btn-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h1 className="text-2xl font-bold">Social</h1>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
          <button onClick={loadData} className="btn btn-sm btn-ghost">Retry</button>
        </div>
      )}

      {/* Section Tabs */}
      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${activeSection === 'friends' ? 'tab-active' : ''}`}
          onClick={() => setActiveSection('friends')}
        >
          Friends ({friends.length})
        </button>
        <button
          className={`tab ${activeSection === 'requests' ? 'tab-active' : ''}`}
          onClick={() => setActiveSection('requests')}
        >
          Requests
          {incomingRequests.length > 0 && (
            <span className="badge badge-primary badge-sm ml-2">{incomingRequests.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeSection === 'invites' ? 'tab-active' : ''}`}
          onClick={() => setActiveSection('invites')}
        >
          Band Invites
          {bandInvites.length > 0 && (
            <span className="badge badge-secondary badge-sm ml-2">{bandInvites.length}</span>
          )}
        </button>
      </div>

      {/* Friends Section */}
      {activeSection === 'friends' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Your Friends</h2>
            <button
              onClick={() => setShowAddFriend(true)}
              className="btn btn-primary btn-sm"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Friend
            </button>
          </div>

          {friends.length === 0 ? (
            <div className="card bg-base-200">
              <div className="card-body items-center text-center py-12">
                <svg className="w-16 h-16 text-base-content/30 mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                <p className="text-base-content/60">No friends yet</p>
                <p className="text-sm text-base-content/40">Add friends to share bands and collaborate!</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {friends.map(friend => (
                <div key={friend._id} className="card bg-base-200">
                  <div className="card-body flex-row items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className="bg-primary text-primary-content rounded-full w-10">
                          <span>{friend.friend_name?.[0]?.toUpperCase() || friend.friend_email[0].toUpperCase()}</span>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium">{friend.friend_name || 'Unknown'}</p>
                        <p className="text-sm text-base-content/60">{friend.friend_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-base-content/50">Since {formatDate(friend.since)}</span>
                      <button
                        onClick={() => removeFriend(friend._id)}
                        disabled={actionLoading === friend._id}
                        className="btn btn-ghost btn-sm text-error"
                      >
                        {actionLoading === friend._id ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Friend Requests Section */}
      {activeSection === 'requests' && (
        <div className="space-y-6">
          {/* Incoming Requests */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Incoming Requests</h2>
            {incomingRequests.length === 0 ? (
              <div className="card bg-base-200">
                <div className="card-body py-6 text-center">
                  <p className="text-base-content/60">No pending friend requests</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {incomingRequests.map(request => (
                  <div key={request._id} className="card bg-base-200">
                    <div className="card-body py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className="bg-secondary text-secondary-content rounded-full w-10">
                              <span>{request.from_user_name?.[0]?.toUpperCase() || request.from_user_email[0].toUpperCase()}</span>
                            </div>
                          </div>
                          <div>
                            <p className="font-medium">{request.from_user_name || 'Unknown'}</p>
                            <p className="text-sm text-base-content/60">{request.from_user_email}</p>
                            {request.message && (
                              <p className="text-sm mt-1 italic">"{request.message}"</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => respondToFriendRequest(request._id, 'accept')}
                            disabled={actionLoading === request._id}
                            className="btn btn-success btn-sm"
                          >
                            {actionLoading === request._id ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : 'Accept'}
                          </button>
                          <button
                            onClick={() => respondToFriendRequest(request._id, 'reject')}
                            disabled={actionLoading === request._id}
                            className="btn btn-ghost btn-sm"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-base-content/50 mt-2">{formatDate(request.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sent Requests */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Sent Requests</h2>
            {sentRequests.length === 0 ? (
              <div className="card bg-base-200">
                <div className="card-body py-6 text-center">
                  <p className="text-base-content/60">No pending sent requests</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {sentRequests.map(request => (
                  <div key={request._id} className="card bg-base-200">
                    <div className="card-body flex-row items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                          <div className="bg-neutral text-neutral-content rounded-full w-10">
                            <span>{request.to_user_name?.[0]?.toUpperCase() || request.to_user_email[0].toUpperCase()}</span>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">{request.to_user_name || 'Unknown'}</p>
                          <p className="text-sm text-base-content/60">{request.to_user_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-warning badge-sm">Pending</span>
                        <button
                          onClick={() => cancelFriendRequest(request._id)}
                          disabled={actionLoading === request._id}
                          className="btn btn-ghost btn-sm text-error"
                        >
                          {actionLoading === request._id ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Band Invites Section */}
      {activeSection === 'invites' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Band Invitations</h2>
          {bandInvites.length === 0 ? (
            <div className="card bg-base-200">
              <div className="card-body items-center text-center py-12">
                <svg className="w-16 h-16 text-base-content/30 mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                <p className="text-base-content/60">No pending band invitations</p>
                <p className="text-sm text-base-content/40">When someone invites you to their band, it will appear here</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {bandInvites.map(invite => (
                <div key={invite._id} className="card bg-base-200">
                  <div className="card-body py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-lg">{invite.band_name}</p>
                          <span className={`badge badge-sm ${invite.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>
                            {invite.role}
                          </span>
                        </div>
                        <p className="text-sm text-base-content/60">
                          Invited by {invite.invited_by_name || invite.invited_by_email}
                        </p>
                        {invite.message && (
                          <p className="text-sm mt-2 italic">"{invite.message}"</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => respondToBandInvite(invite._id, 'accept')}
                          disabled={actionLoading === invite._id}
                          className="btn btn-success btn-sm"
                        >
                          {actionLoading === invite._id ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : 'Join'}
                        </button>
                        <button
                          onClick={() => respondToBandInvite(invite._id, 'reject')}
                          disabled={actionLoading === invite._id}
                          className="btn btn-ghost btn-sm"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-base-content/50 mt-2">{formatDate(invite.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Friend Modal */}
      <UserSearchModal
        isOpen={showAddFriend}
        onClose={() => setShowAddFriend(false)}
        onSelectUser={sendFriendRequest}
        title="Add Friend"
        placeholder="Search by name or email..."
        actionLabel="Add Friend"
        actionLoading={actionLoading}
        excludeUserIds={excludeFromSearch}
      />
    </div>
  );
}
