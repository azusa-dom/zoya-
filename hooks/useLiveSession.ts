import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionStatus } from '../types';
import { createPcmBlob, base64ToBytes, decodeAudioData, PCM_SAMPLE_RATE, PLAYBACK_SAMPLE_RATE } from '../utils/audioUtils';

export const useLiveSession = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [volume, setVolume] = useState(0); // For visualization
  
  // Refs for audio handling
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const disconnect = useCallback(async () => {
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

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
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

    setStatus(ConnectionStatus.DISCONNECTED);
    setVolume(0);
    nextStartTimeRef.current = 0;
  }, []);

  const connect = useCallback(async (contextText: string) => {
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

      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      
      // Setup Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputContextRef.current = new AudioContextClass({ sampleRate: PCM_SAMPLE_RATE });
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
        
        1. Help the user pronounce words from this text correctly.
        2. Engage in a conversation using vocabulary from the text.
        3. If the user makes a mistake, gently correct them and ask them to try again.
        4. Keep your responses concise and conversational.
      `;

      // Use gemini-2.0-flash-exp for better region availability
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.0-flash-exp',
        config: {
          responseModalities: [Modality.AUDIO],
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
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Simple volume calculation for visualizer
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i]*inputData[i];
              const rms = Math.sqrt(sum/inputData.length);
              setVolume(v => (v * 0.8) + (rms * 0.2)); // Smooth volume

              const pcmBlob = createPcmBlob(inputData);
              
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
                }).catch(err => console.error("Send input error", err));
              }
            };

            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const outputCtx = outputContextRef.current;
            if (!outputCtx) return;

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
            disconnect();
          },
          onerror: (err) => {
            console.error("Session error", err);
            disconnect();
            setStatus(ConnectionStatus.ERROR);
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      setStatus(ConnectionStatus.ERROR);
      disconnect();
    }
  }, [disconnect, status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  return { connect, disconnect, status, volume };
};

