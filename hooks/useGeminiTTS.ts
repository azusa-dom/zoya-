import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { base64ToBytes, decodeAudioData, PLAYBACK_SAMPLE_RATE } from '../utils/audioUtils';

export const useGeminiTTS = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const stopAudio = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    // Stop any current playback
    stopAudio();
    setIsLoading(true);

    try {
      const GEMINI_API_KEY =
        (typeof import.meta !== "undefined" &&
          (import.meta as any).env &&
          ((import.meta as any).env.VITE_GEMINI_API_KEY ||
            (import.meta as any).env.VITE_API_KEY)) ||
        (typeof process !== "undefined" &&
          (process.env?.GEMINI_API_KEY || process.env?.API_KEY)) ||
        "";

      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // Clean, neutral voice
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (!base64Audio) {
        throw new Error("No audio data returned");
      }

      // Initialize audio context only when needed
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate: PLAYBACK_SAMPLE_RATE });
      audioContextRef.current = ctx;

      const audioBytes = base64ToBytes(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, ctx, PLAYBACK_SAMPLE_RATE);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setIsPlaying(false);
        // Don't close context immediately if we want to reuse, but for simple one-off:
        // ctx.close();
        // audioContextRef.current = null;
      };

      source.start();
      setIsPlaying(true);

    } catch (error) {
      console.error("TTS Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [stopAudio]);

  return { speak, stopAudio, isPlaying, isLoading };
};

