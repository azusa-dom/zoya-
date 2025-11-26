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
      className="fixed z-50 flex items-center gap-2 bg-slate-900 text-white p-2 rounded-lg shadow-xl animate-in fade-in zoom-in duration-200"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -120%)' // Center horizontally, place above
      }}
    >
      <div className="flex items-center gap-1 border-r border-slate-700 pr-2 mr-1">
        <span className="text-xs font-medium text-slate-300 italic px-1 max-w-[150px] truncate">
          "{displayLabel}"
        </span>
      </div>

      <button
        onClick={onTTS}
        disabled={isTTSLoading}
        className="flex items-center gap-1 px-3 py-1.5 hover:bg-slate-700 rounded-md transition-colors text-sm font-medium"
      >
        {isTTSLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
        ) : (
          <Volume2 className={`w-4 h-4 ${isPlayingTTS ? 'text-blue-400 animate-pulse' : 'text-blue-400'}`} />
        )}
        <span>Listen</span>
      </button>

      <button
        onClick={onPractice}
        className="flex items-center gap-1 px-3 py-1.5 hover:bg-slate-700 rounded-md transition-colors text-sm font-medium"
      >
        <Mic className="w-4 h-4 text-green-400" />
        <span>Practice</span>
      </button>

      <button
        onClick={onClose}
        className="p-1 hover:bg-slate-700 rounded-full ml-1"
      >
        <X className="w-3 h-3 text-slate-400" />
      </button>
      
      {/* Triangle pointer */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900"></div>
    </div>
  );
};

