interface OnlineDotProps {
  isOnline: boolean;
}

export function OnlineDot({ isOnline }: OnlineDotProps) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${
        isOnline ? 'bg-green-500' : 'bg-gray-400'
      }`}
    />
  );
}
