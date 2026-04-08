'use client';
import { useEffect, useState } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OnlineDot } from './OnlineDot';
import { NewConversationModal } from './NewConversationModal';
import { ConversationSummary } from '@chat-app/shared';

interface SidebarProps {
  activeConversationId: string | null;
  onSelect: (conversation: ConversationSummary) => void;
}

export function Sidebar({ activeConversationId, onSelect }: SidebarProps) {
  const { socket } = useSocket();
  const { onlineStatus } = useOnlineStatus();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [search, setSearch] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}') as { id: string };
    } catch {
      return { id: '' };
    }
  })();

  useEffect(() => {
    if (!socket) return;

    // Load existing conversations on connect
    socket.emit('conversation:list', (convs: ConversationSummary[]) => {
      setConversations(convs);
    });

    function onConversationNew(conv: ConversationSummary) {
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === conv.id);
        return exists ? prev : [conv, ...prev];
      });
    }

    socket.on('conversation:new', onConversationNew);
    return () => {
      socket.off('conversation:new', onConversationNew);
    };
  }, [socket]);

  function getDisplayName(conv: ConversationSummary): string {
    if (conv.type === 'group') return conv.name ?? 'Group';
    const other = conv.members.find((m) => m.id !== currentUser.id);
    return other?.username ?? 'Unknown';
  }

  function getOtherUserId(conv: ConversationSummary): string | null {
    if (conv.type !== 'dm') return null;
    return conv.members.find((m) => m.id !== currentUser.id)?.id ?? null;
  }

  const filtered = conversations.filter((c) =>
    getDisplayName(c).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
          <button
            onClick={() => setShowNewConversation(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 transition text-lg leading-none"
            title="New conversation"
          >
            +
          </button>
        </div>
        <input
          type="text"
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-8 px-4">
            {search ? 'No conversations match your search' : 'No conversations yet'}
          </p>
        )}
        {filtered.map((conv) => {
          const otherId = getOtherUserId(conv);
          const isOnline = otherId ? (onlineStatus.get(otherId) ?? false) : false;
          const isActive = conv.id === activeConversationId;
          const displayName = getDisplayName(conv);

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left border-b border-gray-50 ${
                isActive ? 'bg-blue-50 border-r-2 border-r-blue-500' : ''
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center text-white font-semibold text-sm">
                  {displayName[0]?.toUpperCase() ?? '?'}
                </div>
                {conv.type === 'dm' && (
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <OnlineDot isOnline={isOnline} />
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate text-sm">{displayName}</p>
                <p className="text-xs text-gray-400 truncate">
                  {conv.lastMessage?.content || 'No messages yet'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {showNewConversation && (
        <NewConversationModal onClose={() => setShowNewConversation(false)} />
      )}
    </div>
  );
}
