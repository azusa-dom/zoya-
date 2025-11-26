import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionStatus } from '../types';
import { createPcmBlob, base64ToBytes, decodeAudioData, PCM_SAMPLE_RATE, PLAYBACK_SAMPLE_RATE, downsampleTo16k } from '../utils/audioUtils';

export type ChatMessage = {
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
};

export const useLiveSession = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [volume, setVolume] = useState(0);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  
  // ... (refs) ...
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Keep track of connection attempts to prevent loops
  const connectionAttemptRef = useRef(0);
  
    const disconnect = useCallback(async () => {
    // Flag to stop processing
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    
    // Cleanup audio sources
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    activeSourcesRef.current.clear();

    // Close session properly
    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (e) {
            console.debug("Error closing session", e);
        }
    }
    sessionPromiseRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputContextRef.current) {
      try { await inputContextRef.current.close(); } catch (e) {}
      inputContextRef.current = null;
    }
    if (outputContextRef.current) {
      try { await outputContextRef.current.close(); } catch (e) {}
      outputContextRef.current = null;
    }

    // Don't reset status if it's an error, so UI shows error state instead of reconnecting
    setStatus(prev => prev === ConnectionStatus.ERROR ? prev : ConnectionStatus.DISCONNECTED);
    setVolume(0);
    nextStartTimeRef.current = 0;
  }, []);

  const connect = useCallback(async (contextText: string) => {
    // Prevent rapid reconnections
    const now = Date.now();
    if (connectionAttemptRef.current > 0 && now - connectionAttemptRef.current < 2000) {
        console.log("Connection throttled");
        return;
    }
    connectionAttemptRef.current = now;

    if (status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING) return;
    
    setStatus(ConnectionStatus.CONNECTING);

    try {
      const GEMINI_API_KEY =
        (typeof import.meta !== "undefined" &&
          (import.meta as any).env &&
          ((import.meta as any).env.VITE_GEMINI_API_KEY ||
            (import.meta as any).env.VITE_API_KEY)) ||
        (typeof process !== "undefined" &&
          (process.env?.GEMINI_API_KEY || process.env?.API_KEY)) ||
        "";

      if (!GEMINI_API_KEY) {
          throw new Error("API Key not found");
      }

      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      
      // Setup Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      // Do NOT force sample rate for input, let it be system default to avoid errors/resampling issues at source
      inputContextRef.current = new AudioContextClass(); 
      outputContextRef.current = new AudioContextClass({ sampleRate: PLAYBACK_SAMPLE_RATE });
      
      // Ensure contexts are running (browser autoplay policy)
      if (inputContextRef.current.state === 'suspended') {
        await inputContextRef.current.resume();
      }
      if (outputContextRef.current.state === 'suspended') {
        await outputContextRef.current.resume();
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const systemInstruction = `
        You are a helpful and friendly English language tutor. 
        The user is practicing the following text: "${contextText}".
        Keep your responses concise and conversational.
      `;

      // Using gemini-2.0-flash-exp
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.0-flash-exp',
        config: {
          responseModalities: [Modality.AUDIO, Modality.TEXT], // Enable Text for transcript
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          systemInstruction: systemInstruction,
        },
        callbacks: {
          onopen: () => {
            console.log("Live session opened");
            setStatus(ConnectionStatus.CONNECTED);
            
            // Start Audio Streaming
            if (!inputContextRef.current || !streamRef.current) return;
            
            const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              // Safety check: if processor is null or session is gone, stop
              if (!processorRef.current || !sessionPromiseRef.current) return;

              const inputData = e.inputBuffer.getChannelData(0);
              
              // Simple volume calculation for visualizer
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i]*inputData[i];
              const rms = Math.sqrt(sum/inputData.length);
              setVolume(v => (v * 0.8) + (rms * 0.2)); // Smooth volume

              // Downsample to 16kHz before sending
              const currentSampleRate = inputContextRef.current?.sampleRate || 48000;
              const pcm16k = downsampleTo16k(inputData, currentSampleRate);
              const pcmBlob = createPcmBlob(pcm16k);
              
              sessionPromiseRef.current.then(session => {
                  // Double check session state logic if possible, or just catch errors silently
                  try {
                      session.sendRealtimeInput({ media: pcmBlob });
                  } catch (err) {
                      // Ignore send errors if closing
                  }
              }).catch(err => {
                  // Ignore promise rejections during close
              });
            };

            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const outputCtx = outputContextRef.current;
            if (!outputCtx) return;

            // Handle Text Output (AI Turn)
            const textContent = msg.serverContent?.modelTurn?.parts?.[0]?.text;
            if (textContent) {
               setChatHistory(prev => {
                   const lastMsg = prev[prev.length - 1];
                   // If last message was AI and very recent, maybe append? 
                   // But usually turns are distinct. Let's add new.
                   return [...prev, { role: 'ai', text: textContent, timestamp: Date.now() }];
               });
            }
            
            // Handle User Input Transcript (if available via serverContent.turnComplete or similar)
            // Note: Live API usually sends 'userContent' echo if configured, or we infer it.
            // Currently Live API might not echo user text in real-time audio mode easily without extra config.
            // For now we rely on AI responses.

            // Handle Audio Output
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              try {
                const audioBytes = base64ToBytes(base64Audio);
                const audioBuffer = await decodeAudioData(audioBytes, outputCtx, PLAYBACK_SAMPLE_RATE);
                
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputCtx.destination);
                
                source.onended = () => {
                  activeSourcesRef.current.delete(source);
                };
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                activeSourcesRef.current.add(source);

              } catch (e) {
                console.error("Audio decoding error", e);
              }
            }

            // Handle Interruption
            if (msg.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e){}
              });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            console.log("Session closed from server");
            // Do NOT call disconnect() here directly if it triggers state change that re-triggers connect
            // Just set status to disconnected or error
            setStatus(ConnectionStatus.DISCONNECTED);
            setVolume(0);
          },
          onerror: (err) => {
            console.error("Session error", err);
            setStatus(ConnectionStatus.ERROR);
            // Don't auto disconnect/reconnect, let user retry
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      setStatus(ConnectionStatus.ERROR);
      // Cleanup resources but keep Error status
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  }, [status]); // Removed disconnect from dependencies to avoid loop

  // Cleanup on unmount
  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  return { connect, disconnect, status, volume, chatHistory };
};

