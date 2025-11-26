import { Blob } from '@google/genai';

export const PCM_SAMPLE_RATE = 16000;
export const PLAYBACK_SAMPLE_RATE = 24000;

export function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = PLAYBACK_SAMPLE_RATE,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function createPcmBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values between -1 and 1
    const s = Math.max(-1, Math.min(1, data[i]));
    // Convert to 16-bit PCM
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return {
    data: bytesToBase64(new Uint8Array(int16.buffer)),
    mimeType: `audio/pcm;rate=${PCM_SAMPLE_RATE}`,
  };
}

/**
 * Downsamples audio data from sourceSampleRate to targetSampleRate
 */
export function downsampleTo16k(
    sourceData: Float32Array,
    sourceSampleRate: number
): Float32Array {
    if (sourceSampleRate === 16000) {
        return sourceData;
    }

    const ratio = sourceSampleRate / 16000;
    const newLength = Math.round(sourceData.length / ratio);
    const result = new Float32Array(newLength);
    
    for (let i = 0; i < newLength; i++) {
        const offset = Math.floor(i * ratio);
        // Simple nearest neighbor or basic averaging
        // For speech, just picking the sample is often 'good enough' for realtime
        // but let's do a tiny bit of safety boundary check
        if (offset < sourceData.length) {
            result[i] = sourceData[offset];
        }
    }
    return result;
}

