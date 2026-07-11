import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type VoiceTestState = "idle" | "recording" | "processing" | "done";

export default function VoiceTestButton() {
  const [state, setState] = useState<VoiceTestState>("idle");
  const [inputLang, setInputLang] = useState("hi-IN");
  const [result, setResult] = useState<{ transcript: string; verdict: string; audioBase64?: string; language?: string } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const voiceTest = trpc.voiceTest.useMutation();

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleClick = async () => {
    if (state === "recording") {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (state === "done") {
      setState("idle");
      setResult(null);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          processAudio(base64);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setState("recording");
      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 30000);
    } catch (err) { console.warn(err); 
      toast.error("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const processAudio = async (audioBase64: string) => {
    setState("processing");
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const res = await voiceTest.mutateAsync({ audioBase64, language: inputLang });
      setResult(res);
      setState("done");
      const b64 = (res as { audioBase64?: string }).audioBase64;
      if (b64) {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => URL.revokeObjectURL(url);
        audio.play();
      }
    } catch (err) {
      toast.error(`Voice test failed: ${(err as Error).message}`);
      setState("idle");
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2">
        <select
          className="w-[120px] border border-[#2A2A2A] bg-[#0A0A0A] text-[#EAEAEA] px-3 py-2 font-mono text-xs tracking-[0.08em]"
          value={inputLang}
          onChange={e => setInputLang(e.target.value)}
          disabled={state === "processing" || state === "recording"}
        >
          <option value="en-IN">ENGLISH</option>
          <option value="hi-IN">HINDI</option>
          <option value="bn-IN">BENGALI</option>
          <option value="ta-IN">TAMIL</option>
          <option value="te-IN">TELUGU</option>
          <option value="mr-IN">MARATHI</option>
          <option value="kn-IN">KANNADA</option>
          <option value="ml-IN">MALAYALAM</option>
          <option value="pa-IN">PUNJABI</option>
          <option value="gu-IN">GUJARATI</option>
          <option value="od-IN">ODIA</option>
        </select>
      <Button
        size="lg"
        variant={state === "done" ? "default" : "outline"}
        className="gap-2"
        onClick={handleClick}
        disabled={state === "processing"}
      >
        {state === "idle" && "> VOICE TEST"}
        {state === "recording" && (
          <>
            <span className="inline-block h-2 w-2 animate-pulse rounded-none bg-[#E61919]" />
            LISTENING...
          </>
        )}
        {state === "processing" && (
          <>
            ANALYZING... <Loader2 className="h-5 w-5 animate-spin" />
          </>
        )}
        {state === "done" && "> TRY AGAIN"}
      </Button>
      </div>
      {state === "done" && result && (
        <div className="w-72 border border-[#2A2A2A] bg-[#121212] p-4 text-left">
          <p className="font-mono text-[10px] tracking-[0.1em] text-[#8A8A8A]">TRANSCRIPT</p>
          <p className="mt-1 font-mono text-base text-[#EAEAEA]">{result.transcript || "[No speech detected]"}</p>
          {result.language && (
            <p className="mt-2 font-mono text-[10px] tracking-[0.1em] text-[#8A8A8A]">LANGUAGE <span className="text-[#EAEAEA]">{result.language}</span></p>
          )}
          <p className="mt-3 font-mono text-[10px] tracking-[0.1em] text-[#8A8A8A]">VERDICT</p>
          <p
            className={`mt-1 font-display text-lg font-black uppercase ${result.verdict === "PASS" ? "text-[#4AF626]" : "text-[#E61919]"}`}
          >
            {result.verdict === "PASS" ? "PASS" : "FAIL"}
          </p>
        </div>
      )}
    </div>
  );
}
