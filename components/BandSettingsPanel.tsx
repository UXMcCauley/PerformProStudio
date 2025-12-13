'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import UserSearchModal, { SearchUser } from './UserSearchModal';

type BandMember = {
  _id: string;
  band_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  user: {
    _id: string;
    displayName: string;
    email: string;
    avatar?: string;
  };
};

type Band = {
  _id: string;
  name: string;
  role?: 'owner' | 'admin' | 'member';
};

interface Props {
  band: Band;
  onClose: () => void;
  onBandDeleted?: () => void;
}

export default function BandSettingsPanel({ band, onClose, onBandDeleted }: Props) {
  const { user } = useAuth();
  const [members, setMembers] = useState<BandMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'invite'>('members');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');

  const currentUserRole = band.role || members.find(m => m.user_id === user?.id)?.role;
  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';
  const isOwner = currentUserRole === 'owner';

  useEffect(() => {
    loadMembers();
  }, [band._id]);

  const loadMembers = async () => {
    try {
      const response = await fetch(`/api/band-members?bandId=${band._id}`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (targetUser: SearchUser) => {
    setInviting(targetUser._id);
    try {
      const response = await fetch('/api/band-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandId: band._id,
          toUserId: targetUser._id,
          role: inviteRole,
        }),
      });

      if (response.ok) {
        const displayName = targetUser.displayName || targetUser.name || targetUser.email;
        alert(`Invite sent to ${displayName}`);
        setShowUserSearch(false);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to send invite');
      }
    } catch (error) {
      console.error('Error sending invite:', error);
      alert('Failed to send invite');
    } finally {
      setInviting(null);
    }
  };

  // IDs to exclude from search (existing members)
  const excludeUserIds = members.map(m => m.user_id);

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    const member = members.find(m => m._id === memberId);
    if (!member) return;

    const isRemovingSelf = memberUserId === user?.id;
    const confirmMessage = isRemovingSelf
      ? 'Are you sure you want to leave this band?'
      : `Remove ${member.user.displayName} from the band?`;

    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/band-members?bandId=${band._id}&userId=${memberUserId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (isRemovingSelf) {
          onClose();
          onBandDeleted?.();
        } else {
          setMembers(prev => prev.filter(m => m._id !== memberId));
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const handleUpdateRole = async (memberId: string, memberUserId: string, newRole: 'admin' | 'member') => {
    try {
      const response = await fetch('/api/band-members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandId: band._id,
          userId: memberUserId,
          action: 'updateRole',
          newRole,
        }),
      });

      if (response.ok) {
        setMembers(prev =>
          prev.map(m => (m._id === memberId ? { ...m, role: newRole } : m))
        );
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role');
    }
  };

  const handleTransferOwnership = async (newOwnerId: string) => {
    const newOwner = members.find(m => m.user_id === newOwnerId);
    if (!newOwner) return;

    if (!confirm(`Transfer ownership to ${newOwner.user.displayName}? You will become an admin.`)) {
      return;
    }

    try {
      const response = await fetch('/api/band-members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandId: band._id,
          userId: newOwnerId,
          action: 'transferOwnership',
        }),
      });

      if (response.ok) {
        loadMembers(); // Reload to get updated roles
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to transfer ownership');
      }
    } catch (error) {
      console.error('Error transferring ownership:', error);
      alert('Failed to transfer ownership');
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-amber-500 text-white';
      case 'admin':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-base-300 text-base-content';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-base-content">{band.name}</h2>
              <p className="text-sm text-base-content/60">{members.length} member{members.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed m-4 mb-0">
          <button
            onClick={() => setActiveTab('members')}
            className={`tab ${activeTab === 'members' ? 'tab-active' : ''}`}
          >
            Members
          </button>
          {canManageMembers && (
            <button
              onClick={() => setActiveTab('invite')}
              className={`tab ${activeTab === 'invite' ? 'tab-active' : ''}`}
            >
              Invite
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : activeTab === 'members' ? (
            <div className="space-y-2">
              {members.map(member => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold overflow-hidden">
                      {member.user.avatar ? (
                        <img src={member.user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        member.user.displayName?.charAt(0).toUpperCase() || '?'
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-base-content">
                          {member.user.displayName}
                          {member.user_id === user?.id && (
                            <span className="text-base-content/50 ml-1">(you)</span>
                          )}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getRoleBadgeClass(member.role)}`}>
                          {member.role}
                        </span>
                      </div>
                      <p className="text-sm text-base-content/60">{member.user.email}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Role dropdown - only owner can change roles */}
                    {isOwner && member.role !== 'owner' && (
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member._id, member.user_id, e.target.value as 'admin' | 'member')}
                        className="select select-sm select-bordered"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                    )}

                    {/* Transfer ownership button */}
                    {isOwner && member.role !== 'owner' && (
                      <button
                        onClick={() => handleTransferOwnership(member.user_id)}
                        className="btn btn-ghost btn-sm text-amber-600"
                        title="Transfer ownership"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                      </button>
                    )}

                    {/* Remove button */}
                    {(isOwner || member.user_id === user?.id) && member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member._id, member.user_id)}
                        className="btn btn-ghost btn-sm text-error"
                        title={member.user_id === user?.id ? 'Leave band' : 'Remove member'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          {member.user_id === user?.id ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                          )}
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Invite Tab */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-base-content/70 mb-2">
                  Invite as
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="select select-bordered w-full"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                onClick={() => setShowUserSearch(true)}
                className="btn btn-primary w-full"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                Search Users to Invite
              </button>

              <div className="text-center py-8 text-base-content/60">
                <svg className="w-12 h-12 mx-auto mb-3 text-base-content/30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                <p>Search for users by name or email and invite them as {inviteRole}s</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-base-300 flex justify-end">
          <button onClick={onClose} className="btn btn-ghost">
            Close
          </button>
        </div>
      </div>

      {/* User Search Modal for Inviting */}
      <UserSearchModal
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onSelectUser={handleInvite}
        title={`Invite ${inviteRole === 'admin' ? 'Admin' : 'Member'}`}
        placeholder="Search by name or email..."
        actionLabel="Invite"
        actionLoading={inviting}
        excludeUserIds={excludeUserIds}
      />
    </div>
  );
}
