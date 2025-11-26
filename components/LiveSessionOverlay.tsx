import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, X, MessageSquare, AlertCircle, Download } from 'lucide-react';
import { useLiveSession } from '../hooks/useLiveSession';
import { AudioVisualizer } from './AudioVisualizer';
import { ConnectionStatus } from '../types';

interface LiveSessionOverlayProps {
  selectedText: string;
  onClose: () => void;
}

export const LiveSessionOverlay: React.FC<LiveSessionOverlayProps> = ({ selectedText, onClose }) => {
  const { connect, disconnect, status, volume, chatHistory } = useLiveSession();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto connect on mount
    connect(selectedText);
    return () => {
        // cleanup handled by hook unmount
    };
  }, [connect, selectedText]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSaveTranscript = () => {
    if (chatHistory.length === 0) return;
    
    const content = chatHistory.map(msg => `[${msg.role.toUpperCase()}] ${new Date(msg.timestamp).toLocaleTimeString()}: ${msg.text}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zoya_transcript_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isConnected = status === ConnectionStatus.CONNECTED;
  const isError = status === ConnectionStatus.ERROR;
  const isConnecting = status === ConnectionStatus.CONNECTING;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300 font-serif">
      <div className="bg-[#FDFBF7] w-full max-w-2xl rounded-xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 bg-white/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[#ccff00] rounded-sm border border-stone-200 shadow-sm">
               <MessageSquare className="w-5 h-5 text-stone-900" />
             </div>
             <div>
               <h2 className="text-stone-900 font-bold uppercase tracking-widest text-sm">Live Practice</h2>
               <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wide">Gemini 2.0 Flash</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            {chatHistory.length > 0 && (
                <button 
                    onClick={handleSaveTranscript}
                    className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-900 transition-colors"
                    title="Save Transcript"
                >
                    <Download className="w-5 h-5" />
                </button>
            )}
            <button 
                onClick={onClose}
                className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-900 transition-colors"
            >
                <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-stone-50/30">
            
            {/* Chat History / Empty State */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar" ref={scrollRef}>
                {/* Context Card */}
                <div className="mb-8 p-5 bg-white rounded-sm border border-stone-200 shadow-sm text-left relative group mx-auto max-w-lg">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#ccff00]"></div>
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mb-2 pl-2">Practice Context</p>
                    <p className="text-stone-800 text-lg leading-relaxed pl-2 font-serif italic">"{selectedText}"</p>
                </div>

                {/* Messages */}
                {chatHistory.length === 0 && isConnected && (
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                        <p className="text-stone-400 text-sm italic">Start speaking...</p>
                    </div>
                )}

                {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                                ? 'bg-stone-800 text-white rounded-tr-sm' 
                                : 'bg-white text-stone-800 border border-stone-200 rounded-tl-sm'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                
                {/* Bottom spacer */}
                <div className="h-24"></div>
            </div>

            {/* Visualizer Overlay (Bottom) */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#FDFBF7] via-[#FDFBF7]/90 to-transparent pt-20 pointer-events-none flex flex-col items-center justify-end">
                 {/* Connection States */}
                 <div className="flex flex-col items-center gap-4 mb-4 pointer-events-auto">
                    {isConnecting && (
                        <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-full shadow-sm border border-stone-200">
                            <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin"></div>
                            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Connecting...</span>
                        </div>
                    )}
                    
                    {isConnected && (
                        <div className="relative group">
                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border border-stone-200 shadow-lg ring-4 ring-[#ccff00]/20 transition-transform group-hover:scale-105">
                                <Mic className="w-6 h-6 text-stone-900" />
                            </div>
                            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-80">
                                <AudioVisualizer volume={volume} active={true} />
                            </div>
                        </div>
                    )}

                    {isError && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-full border border-red-100 text-red-500">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Connection Failed</span>
                        </div>
                    )}
                 </div>
            </div>
        </div>

        {/* Footer Controls */}
        <div className="p-5 border-t border-stone-100 bg-white flex justify-center z-20">
            {isConnected ? (
                <button 
                  onClick={disconnect}
                  className="flex items-center gap-2 bg-stone-100 hover:bg-red-50 text-stone-500 hover:text-red-500 border border-transparent hover:border-red-100 px-8 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all"
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

