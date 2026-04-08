'use client';
import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import { UserPublic } from '@chat-app/shared';

interface NewConversationModalProps {
  onClose: () => void;
}

export function NewConversationModal({ onClose }: NewConversationModalProps) {
  const { socket } = useSocket();
  const [mode, setMode] = useState<'dm' | 'group'>('dm');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserPublic[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserPublic[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!socket || query.trim().length === 0) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      socket.emit('users:search', { query: query.trim() }, (users: UserPublic[]) => {
        setResults(users);
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, socket]);

  function handleSelectUser(user: UserPublic) {
    if (mode === 'dm') {
      setLoading(true);
      socket?.emit('conversation:create_dm', { targetUserId: user.id });
      onClose();
    } else {
      if (!selectedUsers.find((u) => u.id === user.id)) {
        setSelectedUsers((prev) => [...prev, user]);
      }
      setQuery('');
    }
  }

  function handleRemoveUser(userId: string) {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  function handleCreateGroup() {
    if (!socket || selectedUsers.length === 0 || !groupName.trim()) return;
    setLoading(true);
    socket.emit('conversation:create_group', {
      name: groupName.trim(),
      memberIds: selectedUsers.map((u) => u.id),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">New Conversation</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => { setMode('dm'); setSelectedUsers([]); }}
            className={`flex-1 py-2.5 text-sm font-medium transition ${
              mode === 'dm'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Direct Message
          </button>
          <button
            onClick={() => setMode('group')}
            className={`flex-1 py-2.5 text-sm font-medium transition ${
              mode === 'group'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Group Chat
          </button>
        </div>

        <div className="p-4">
          {/* Group Name Input */}
          {mode === 'group' && (
            <input
              type="text"
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          )}

          {/* Selected Users (group mode) */}
          {mode === 'group' && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedUsers.map((user) => (
                <span
                  key={user.id}
                  className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full"
                >
                  {user.username}
                  <button
                    onClick={() => handleRemoveUser(user.id)}
                    className="hover:text-blue-900 leading-none"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search Input */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Search users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          {/* Search Results */}
          <div className="mt-2 max-h-52 overflow-y-auto">
            {results.length === 0 && query.trim().length > 0 && (
              <p className="text-center text-gray-400 text-sm py-4">No users found</p>
            )}
            {results
              .filter((u) => !selectedUsers.find((s) => s.id === u.id))
              .map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  disabled={loading}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg transition text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white font-semibold text-xs">
                    {user.username[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{user.username}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </button>
              ))}
          </div>

          {/* Create Group Button */}
          {mode === 'group' && (
            <button
              onClick={handleCreateGroup}
              disabled={loading || selectedUsers.length === 0 || !groupName.trim()}
              className="w-full mt-3 bg-blue-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Create Group ({selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
