'use client';
import { useEffect, useState } from 'react';
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

  function removeMember(userId: string) {
    socket?.emit('conversation:member_remove', {
      conversationId: conversation.id,
      userId,
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h3 className="font-semibold text-gray-800 text-sm">{members.length} Members</h3>
      </div>
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
