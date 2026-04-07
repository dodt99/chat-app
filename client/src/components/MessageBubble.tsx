import { useState } from 'react';
import { MessagePayload } from '@chat-app/shared';

interface MessageBubbleProps {
  message: MessagePayload;
  isOwn: boolean;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
}

function MessageTicks({ message, isOwn }: { message: MessagePayload; isOwn: boolean }) {
  if (!isOwn) return null;
  const isRead = message.statuses.some((s) => s.status === 'read');
  const isDelivered = message.statuses.length > 0;
  if (isRead) return <span className="text-blue-400 text-xs ml-1">✓✓</span>;
  if (isDelivered) return <span className="text-gray-400 text-xs ml-1">✓✓</span>;
  return <span className="text-gray-300 text-xs ml-1">✓</span>;
}

export function MessageBubble({ message, isOwn, onEdit, onDelete }: MessageBubbleProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);

  if (message.deletedAt) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
        <span className="text-gray-400 text-sm italic px-3 py-1.5 bg-gray-100 rounded-2xl">
          This message was deleted
        </span>
      </div>
    );
  }

  function submitEdit() {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit(message.id, trimmed);
    }
    setEditing(false);
  }

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar for others */}
      {!isOwn && (
        <div className="w-7 h-7 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs mr-2 flex-shrink-0 self-end mb-1">
          {message.sender.username[0]?.toUpperCase()}
        </div>
      )}

      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-xs lg:max-w-md`}>
        {!isOwn && (
          <span className="text-xs text-gray-500 mb-0.5 ml-1">{message.sender.username}</span>
        )}

        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitEdit();
                if (e.key === 'Escape') setEditing(false);
              }}
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[200px]"
              autoFocus
            />
            <button onClick={submitEdit} className="text-blue-500 text-xs hover:text-blue-700">Save</button>
            <button onClick={() => setEditing(false)} className="text-gray-400 text-xs hover:text-gray-600">Cancel</button>
          </div>
        ) : (
          <div
            className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
              isOwn
                ? 'bg-blue-500 text-white rounded-br-sm'
                : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
            }`}
          >
            {message.content}
            {message.isEdited && (
              <span className={`text-xs ml-1 ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
                (edited)
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-0.5 mt-0.5 px-1">
          <span className="text-xs text-gray-400">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <MessageTicks message={message} isOwn={isOwn} />
        </div>
      </div>

      {/* Hover actions — own messages only */}
      {isOwn && showActions && !editing && (
        <div className="flex items-center gap-1 ml-2 self-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => { setEditContent(message.content); setEditing(true); }}
            className="text-xs text-gray-400 hover:text-blue-500 bg-white border border-gray-200 rounded px-1.5 py-0.5"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(message.id)}
            className="text-xs text-gray-400 hover:text-red-500 bg-white border border-gray-200 rounded px-1.5 py-0.5"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
