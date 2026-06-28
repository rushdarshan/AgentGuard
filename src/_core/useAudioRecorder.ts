import { useState, useRef, useCallback } from "react";

const SAMPLE_RATE = 16000;

export type RecorderState = "idle" | "recording" | "processing" | "done" | "error";

export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    try {
      // ponytail: stop any existing recording before starting fresh
      if (mediaRef.current && mediaRef.current.state === "recording") {
        mediaRef.current.stop();
        streamRef.current?.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: SAMPLE_RATE, channelCount: 1 } });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch (err) { console.warn(err); 
      setState("error");
    }
  }, []);

  // ponytail: returns a Promise<Blob> that resolves when onstop fires
  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRef.current;
      if (!recorder || recorder.state !== "recording") { resolve(null); return; }
      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setState("done");
        resolve(blob);
      };
      recorder.stop();
    });
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setAudioBlob(null);
    chunksRef.current = [];
  }, []);

  return { state, audioBlob, start, stop, reset };
}
