import React, { useEffect } from 'react';
import { Mic, MicOff, X, MessageSquare, AlertCircle } from 'lucide-react';
import { useLiveSession } from '../hooks/useLiveSession';
import { AudioVisualizer } from './AudioVisualizer';
import { ConnectionStatus } from '../types';

interface LiveSessionOverlayProps {
  selectedText: string;
  onClose: () => void;
}

export const LiveSessionOverlay: React.FC<LiveSessionOverlayProps> = ({ selectedText, onClose }) => {
  const { connect, disconnect, status, volume } = useLiveSession();

  useEffect(() => {
    // Auto connect on mount
    connect(selectedText);
    return () => {
        // cleanup handled by hook unmount, but good to be explicit if overlay closes
    };
  }, [connect, selectedText]);

  const isConnected = status === ConnectionStatus.CONNECTED;
  const isError = status === ConnectionStatus.ERROR;
  const isConnecting = status === ConnectionStatus.CONNECTING;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 font-serif">
      <div className="bg-[#FDFBF7] w-full max-w-lg rounded-xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-white/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[#ccff00] rounded-sm border border-stone-200 shadow-sm">
               <MessageSquare className="w-5 h-5 text-stone-900" />
             </div>
             <div>
               <h2 className="text-stone-900 font-bold uppercase tracking-widest text-sm">Live Practice</h2>
               <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wide">Gemini 2.0 Flash</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center justify-center gap-8 min-h-[300px]">
          
          {/* Status Indicator */}
          <div className="flex flex-col items-center gap-6">
             {isConnecting && (
               <div className="relative">
                 <div className="w-20 h-20 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin"></div>
               </div>
             )}
             
             {isConnected && (
               <div className="relative">
                 <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center border border-stone-200 shadow-lg ring-4 ring-[#ccff00]/20">
                    <Mic className="w-10 h-10 text-stone-900" />
                 </div>
                 <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
                   <AudioVisualizer volume={volume} active={true} />
                 </div>
               </div>
             )}

             {isError && (
               <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
                 <AlertCircle className="w-10 h-10 text-red-400" />
               </div>
             )}
          </div>

          <div className="text-center space-y-4 max-w-sm">
             {isConnecting && <p className="text-xl text-stone-600 italic">Connecting to tutor...</p>}
             {isConnected && <p className="text-xl text-stone-900 font-medium">Listening...</p>}
             {isError && <p className="text-xl text-red-500 font-bold">Connection failed</p>}
             
             <div className="mt-6 p-5 bg-white rounded-sm border border-stone-200 shadow-sm text-left relative group">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#ccff00]"></div>
               <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mb-2 pl-2">Context</p>
               <p className="text-stone-800 text-lg leading-relaxed pl-2 font-serif italic">"{selectedText}"</p>
             </div>
          </div>

        </div>

        {/* Footer Controls */}
        <div className="p-6 border-t border-stone-100 bg-stone-50 flex justify-center">
            {isConnected ? (
                <button 
                  onClick={disconnect}
                  className="flex items-center gap-2 bg-white hover:bg-red-50 text-red-500 border border-red-200 px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest shadow-sm transition-all hover:shadow-md"
                >
                  <MicOff className="w-4 h-4" />
                  <span>End Session</span>
                </button>
            ) : (
                <button 
                  onClick={() => connect(selectedText)}
                  className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest shadow-md transition-all hover:shadow-lg"
                >
                  {isError ? "Retry Connection" : "Connect"}
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

