import { useState } from 'react';

interface MessageInputProps {
  onSend: (content: string) => void;
  onKeyDown: () => void;
  onBlur: () => void;
}

export function MessageInput({ onSend, onKeyDown, onBlur }: MessageInputProps) {
  const [value, setValue] = useState('');

  function submit() {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    onKeyDown();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border-t border-gray-200">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        placeholder="Write a message..."
        className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
      />
      <button
        onClick={submit}
        disabled={!value.trim()}
        className="bg-blue-500 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-blue-600 transition disabled:opacity-40 flex-shrink-0"
        aria-label="Send message"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
      </button>
    </div>
  );
}
