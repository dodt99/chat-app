'use client';
import { useEffect, useRef } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { useTyping } from '@/hooks/useTyping';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { OnlineDot } from './OnlineDot';
import { ConversationSummary } from '@chat-app/shared';

interface ChatWindowProps {
  conversation: ConversationSummary;
}

export function ChatWindow({ conversation }: ChatWindowProps) {
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}') as { id: string };
    } catch {
      return { id: '' };
    }
  })();

  const { messages, sendMessage, editMessage, deleteMessage } = useMessages(conversation.id);
  const { typingUsers, onKeyDown, onBlur } = useTyping(conversation.id);
  const { onlineStatus } = useOnlineStatus();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typingUsers.length]);

  function getHeaderTitle(): string {
    if (conversation.type === 'group') return conversation.name ?? 'Group';
    const other = conversation.members.find((m) => m.id !== currentUser.id);
    return other?.username ?? 'Unknown';
  }

  const otherUserId =
    conversation.type === 'dm'
      ? conversation.members.find((m) => m.id !== currentUser.id)?.id ?? null
      : null;

  const isOtherOnline = otherUserId ? (onlineStatus.get(otherUserId) ?? false) : false;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-blue-400 flex items-center justify-center text-white font-semibold text-sm">
            {getHeaderTitle()[0]?.toUpperCase() ?? '?'}
          </div>
          {conversation.type === 'dm' && (
            <span className="absolute -bottom-0.5 -right-0.5">
              <OnlineDot isOnline={isOtherOnline} />
            </span>
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-sm">{getHeaderTitle()}</p>
          <p className="text-xs text-gray-500">
            {conversation.type === 'dm'
              ? isOtherOnline ? 'online' : 'offline'
              : `${conversation.members.length} members`}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-8">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender.id === currentUser.id}
            onEdit={editMessage}
            onDelete={deleteMessage}
          />
        ))}
        <TypingIndicator typingUsers={typingUsers} />
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={sendMessage} onKeyDown={onKeyDown} onBlur={onBlur} />
    </div>
  );
}
