// Client-side audio extraction: fetches the original 30s preview, decodes,
// extracts the user's trim window, and encodes to a WAV Blob suitable for
// sharing as a file via the Web Share API.
//
// Why WAV: no encoder library needed. Universally accepted by messaging apps
// (iMessage, WhatsApp, Telegram, Google Messages all render WAV inline with
// a tap-to-play UI). File size for a 5-15s clip is ~880KB-2.6MB, fine for
// MMS/RCS attachment limits.

export async function extractTrimmedAudio(
  proxyUrl: string,
  startMs: number,
  durationMs: number
): Promise<Blob> {
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Failed to fetch audio: ${res.status}`);
  const arrayBuf = await res.arrayBuffer();

  const AudioCtx = window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  const audioBuf = await ctx.decodeAudioData(arrayBuf);

  const sampleRate = audioBuf.sampleRate;
  const channels = audioBuf.numberOfChannels;
  const totalSamples = audioBuf.length;

  const startSample = Math.max(0, Math.floor((startMs / 1000) * sampleRate));
  const endSample = Math.min(
    totalSamples,
    Math.floor(((startMs + durationMs) / 1000) * sampleRate)
  );
  const length = endSample - startSample;

  if (length <= 0) throw new Error("Invalid trim range");

  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < channels; ch++) {
    const src = audioBuf.getChannelData(ch);
    channelData.push(src.slice(startSample, endSample));
  }

  // Close the context — we're done with it
  if (typeof ctx.close === "function") {
    ctx.close().catch(() => {});
  }

  return audioBufferToWav(channelData, sampleRate, channels, length);
}

function audioBufferToWav(
  channelData: Float32Array[],
  sampleRate: number,
  channels: number,
  length: number
): Blob {
  const bytesPerSample = 2; // 16-bit PCM
  const dataSize = length * channels * bytesPerSample;
  const fileSize = 44 + dataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  let offset = 0;

  function writeString(str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
    offset += str.length;
  }

  // RIFF header
  writeString("RIFF");
  view.setUint32(offset, fileSize - 8, true); offset += 4;
  writeString("WAVE");

  // fmt chunk
  writeString("fmt ");
  view.setUint32(offset, 16, true); offset += 4;                              // chunk size
  view.setUint16(offset, 1, true); offset += 2;                               // PCM
  view.setUint16(offset, channels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, sampleRate * channels * bytesPerSample, true); offset += 4; // byte rate
  view.setUint16(offset, channels * bytesPerSample, true); offset += 2;       // block align
  view.setUint16(offset, 16, true); offset += 2;                              // bits per sample

  // data chunk
  writeString("data");
  view.setUint32(offset, dataSize, true); offset += 4;

  // Interleave channel data and convert from float [-1, 1] to int16
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < channels; ch++) {
      let sample = channelData[ch][i];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

// Sanitize a string to be safe as a filename
export function safeFilename(name: string, fallback = "clip"): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9-_ ]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50)
    .trim();
  return cleaned || fallback;
}
