'use client';
import { useEffect, useState, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OnlineDot } from './OnlineDot';
import { ConversationSummary, UserPublic, MemberAddedPayload, MemberRemovedPayload } from '@chat-app/shared';

interface MembersPanelProps {
  conversation: ConversationSummary;
}

export function MembersPanel({ conversation }: MembersPanelProps) {
  const { socket } = useSocket();
  const { onlineStatus } = useOnlineStatus();
  const [members, setMembers] = useState<UserPublic[]>(conversation.members);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}') as { id: string };
    } catch {
      return { id: '' };
    }
  })();

  const isCreator = conversation.createdBy === currentUser.id;

  useEffect(() => {
    setMembers(conversation.members);
  }, [conversation.id]);

  useEffect(() => {
    if (!socket) return;

    function onMemberAdded({ conversationId, user }: MemberAddedPayload) {
      if (conversationId !== conversation.id) return;
      setMembers((prev) => (prev.find((m) => m.id === user.id) ? prev : [...prev, user]));
    }

    function onMemberRemoved({ conversationId, userId }: MemberRemovedPayload) {
      if (conversationId !== conversation.id) return;
      setMembers((prev) => prev.filter((m) => m.id !== userId));
    }

    socket.on('conversation:member_added', onMemberAdded);
    socket.on('conversation:member_removed', onMemberRemoved);

    return () => {
      socket.off('conversation:member_added', onMemberAdded);
      socket.off('conversation:member_removed', onMemberRemoved);
    };
  }, [socket, conversation.id]);

  const [showAddMember, setShowAddMember] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserPublic[]>([]);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAddMember) {
      addInputRef.current?.focus();
    } else {
      setAddQuery('');
      setSearchResults([]);
    }
  }, [showAddMember]);

  useEffect(() => {
    if (!socket || addQuery.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      socket.emit('users:search', { query: addQuery.trim() }, (users: UserPublic[]) => {
        // Filter out users already in the group
        setSearchResults(users.filter((u) => !members.find((m) => m.id === u.id)));
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [addQuery, socket, members]);

  function removeMember(userId: string) {
    socket?.emit('conversation:member_remove', {
      conversationId: conversation.id,
      userId,
    });
  }

  function addMember(userId: string) {
    socket?.emit('conversation:member_add', {
      conversationId: conversation.id,
      userId,
    });
    setAddQuery('');
    setSearchResults([]);
    setShowAddMember(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 text-sm">{members.length} Members</h3>
          {isCreator && (
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 transition text-sm leading-none"
              title="Add member"
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* Add member search */}
      {showAddMember && (
        <div className="p-3 border-b border-gray-200">
          <input
            ref={addInputRef}
            type="text"
            placeholder="Search users..."
            value={addQuery}
            onChange={(e) => setAddQuery(e.target.value)}
            className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="mt-1 max-h-40 overflow-y-auto">
            {searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => addMember(user.id)}
                className="w-full flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded-lg transition text-left"
              >
                <div className="w-6 h-6 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-semibold">
                  {user.username[0]?.toUpperCase()}
                </div>
                <span className="text-sm text-gray-800 truncate">{user.username}</span>
              </button>
            ))}
            {addQuery.trim().length > 0 && searchResults.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">No users found</p>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {members.map((member) => {
          const isOnline = onlineStatus.get(member.id) ?? false;
          const isAdmin = member.id === conversation.createdBy;

          return (
            <div key={member.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-semibold">
                  {member.username[0]?.toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5">
                  <OnlineDot isOnline={isOnline} />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {member.username}
                  {isAdmin && <span className="ml-1 text-xs text-blue-500 font-normal">(admin)</span>}
                </p>
                <p className="text-xs text-gray-400">{isOnline ? 'online' : 'offline'}</p>
              </div>
              {isCreator && member.id !== currentUser.id && (
                <button
                  onClick={() => removeMember(member.id)}
                  className="text-xs text-gray-400 hover:text-red-500 flex-shrink-0"
                  title="Remove from group"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
