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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-2">
             <div className="p-2 bg-green-500/20 rounded-lg">
               <MessageSquare className="w-5 h-5 text-green-400" />
             </div>
             <div>
               <h2 className="text-white font-semibold">Live Practice</h2>
               <p className="text-xs text-slate-400">Gemini 2.0 Flash</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center justify-center gap-8 min-h-[300px]">
          
          {/* Status Indicator */}
          <div className="flex flex-col items-center gap-4">
             {isConnecting && (
               <div className="relative">
                 <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-8 h-8 bg-blue-500 rounded-full opacity-50 animate-pulse"></div>
                 </div>
               </div>
             )}
             
             {isConnected && (
               <div className="relative">
                 <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                    <Mic className="w-8 h-8 text-green-400" />
                 </div>
                 <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2">
                   <AudioVisualizer volume={volume} active={true} />
                 </div>
               </div>
             )}

             {isError && (
               <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30">
                 <AlertCircle className="w-10 h-10 text-red-400" />
               </div>
             )}
          </div>

          <div className="text-center space-y-2 max-w-sm">
             {isConnecting && <p className="text-lg text-blue-200">Connecting to tutor...</p>}
             {isConnected && <p className="text-lg text-green-200">Listening...</p>}
             {isError && <p className="text-lg text-red-200">Connection failed</p>}
             
             <div className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
               <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Context</p>
               <p className="text-slate-300 italic">"{selectedText}"</p>
             </div>
          </div>

        </div>

        {/* Footer Controls */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-center">
            {isConnected ? (
                <button 
                  onClick={disconnect}
                  className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-6 py-3 rounded-full font-medium transition-colors"
                >
                  <MicOff className="w-5 h-5" />
                  <span>End Session</span>
                </button>
            ) : (
                <button 
                  onClick={() => connect(selectedText)}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-full font-medium transition-colors"
                >
                  {isError ? "Retry Connection" : "Connect"}
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

