import React from 'react';
import { Volume2, Mic, Loader2, X } from 'lucide-react';

interface FloatingToolbarProps {
  position: { top: number; left: number } | null;
  onClose: () => void;
  onTTS: () => void;
  onPractice: () => void;
  isTTSLoading: boolean;
  isPlayingTTS: boolean;
  selectedText: string;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  position,
  onClose,
  onTTS,
  onPractice,
  isTTSLoading,
  isPlayingTTS,
  selectedText,
}) => {
  if (!position) return null;

  // Truncate text for display
  const displayLabel = selectedText.length > 20 ? selectedText.substring(0, 20) + '...' : selectedText;

  return (
    <div
      className="fixed z-50 flex items-center gap-1 bg-white text-stone-800 p-1.5 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-stone-200 animate-in fade-in zoom-in duration-200"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -130%)' // Center horizontally, place slightly higher
      }}
    >
      <div className="flex items-center gap-2 border-r border-stone-200 pr-3 mr-1 pl-2">
        <span className="text-xs font-bold text-stone-400 uppercase tracking-widest max-w-[120px] truncate">
          {displayLabel}
        </span>
      </div>

      <button
        onClick={onTTS}
        disabled={isTTSLoading}
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-stone-100 rounded-md transition-colors text-xs font-bold uppercase tracking-wider text-stone-600 hover:text-stone-900"
      >
        {isTTSLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-400" />
        ) : (
          <Volume2 className={`w-3.5 h-3.5 ${isPlayingTTS ? 'text-blue-500 animate-pulse' : 'text-stone-400 group-hover:text-stone-600'}`} />
        )}
        <span>Listen</span>
      </button>

      <button
        onClick={onPractice}
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-stone-100 rounded-md transition-colors text-xs font-bold uppercase tracking-wider text-stone-600 hover:text-stone-900"
      >
        <Mic className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600" />
        <span>Practice</span>
      </button>

      <div className="w-px h-4 bg-stone-200 mx-1"></div>

      <button
        onClick={onClose}
        className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-md transition-colors text-stone-300"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      
      {/* Triangle pointer with border */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-3 h-3 overflow-hidden pointer-events-none">
         <div className="w-2 h-2 bg-white border-r border-b border-stone-200 transform rotate-45 -translate-y-[5px] translate-x-[2px] shadow-sm"></div>
      </div>
    </div>
  );
};

