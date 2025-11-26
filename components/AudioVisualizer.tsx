import React from 'react';

interface AudioVisualizerProps {
  volume: number; // 0 to 1 ideally, but might be small rms
  active: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ volume, active }) => {
  // Normalize volume roughly for display
  const normalizedVol = Math.min(1, volume * 5); 
  
  return (
    <div className="flex items-center justify-center gap-1.5 h-12 w-24">
      {[1, 2, 3, 4, 5].map((i) => {
        // Calculate height based on volume and sine wave for idle animation
        const isCenter = i === 3;
        const heightMultiplier = isCenter ? 1 : 0.6;
        let height = active 
          ? Math.max(4, normalizedVol * 40 * heightMultiplier * (0.8 + Math.random()*0.4)) 
          : 4;
        
        return (
          <div
            key={i}
            className={`w-1.5 rounded-full transition-all duration-75 ${active ? 'bg-[#ccff00]' : 'bg-stone-300'}`}
            style={{ 
              height: `${height}px`
            }}
          />
        );
      })}
    </div>
  );
};

