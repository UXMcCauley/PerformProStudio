'use client';

import { useState, useEffect, useCallback } from 'react';

export interface SearchUser {
  _id: string;
  name?: string;
  displayName?: string;
  email: string;
  avatar?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: SearchUser) => void;
  title?: string;
  placeholder?: string;
  actionLabel?: string;
  actionLoading?: string | null; // ID of user being acted upon
  excludeUserIds?: string[]; // Users to exclude from results
  multiSelect?: boolean;
  selectedUserIds?: string[];
}

export default function UserSearchModal({
  isOpen,
  onClose,
  onSelectUser,
  title = 'Search Users',
  placeholder = 'Search by name or email...',
  actionLabel = 'Select',
  actionLoading,
  excludeUserIds = [],
  multiSelect = false,
  selectedUserIds = [],
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        // Filter out excluded users
        const filtered = data.filter((user: SearchUser) => !excludeUserIds.includes(user._id));
        setSearchResults(filtered);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, [excludeUserIds]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    // Clear existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    // Set new debounced search
    const timeout = setTimeout(() => {
      searchUsers(value);
    }, 300);

    setDebounceTimeout(timeout);
  };

  const getDisplayName = (user: SearchUser): string => {
    return user.displayName || user.name || 'Unknown';
  };

  const getInitial = (user: SearchUser): string => {
    const name = getDisplayName(user);
    return name[0]?.toUpperCase() || user.email[0]?.toUpperCase() || '?';
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Input */}
        <div className="form-control mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder={placeholder}
              className="input input-bordered w-full pl-10"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              autoFocus
            />
            <svg
              className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            {loading && (
              <span className="loading loading-spinner loading-sm absolute right-3 top-1/2 -translate-y-1/2"></span>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="min-h-[200px] max-h-[400px] overflow-y-auto">
          {searchQuery.length < 2 ? (
            <div className="flex flex-col items-center justify-center py-12 text-base-content/50">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <p>Type at least 2 characters to search</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-base-content/50">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <p>No users found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((user) => {
                const isSelected = selectedUserIds.includes(user._id);
                const isLoading = actionLoading === user._id;

                return (
                  <div
                    key={user._id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      isSelected ? 'bg-primary/10 border border-primary' : 'bg-base-200 hover:bg-base-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-content">
                          {user.avatar ? (
                            <img src={user.avatar} alt="" className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <span className="text-sm font-medium">{getInitial(user)}</span>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-base-content truncate">{getDisplayName(user)}</p>
                        <p className="text-sm text-base-content/60 truncate">{user.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectUser(user)}
                      disabled={isLoading}
                      className={`btn btn-sm ${
                        isSelected ? 'btn-success' : 'btn-primary'
                      }`}
                    >
                      {isLoading ? (
                        <span className="loading loading-spinner loading-xs"></span>
                      ) : isSelected ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Selected
                        </>
                      ) : (
                        actionLabel
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-action">
          <button onClick={onClose} className="btn">Close</button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
