import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DashboardLayout from "@/components/DashboardLayout";
import { useState, useCallback } from "react";
import { useAudioRecorder } from "@/_core/useAudioRecorder";

type DemoStage = "idle" | "recording" | "transcribing" | "testing" | "done" | "error";

// ponytail: cached audio URL for playback, no more than one at a time
let _audioUrl: string | null = null;
function playAudio(buf: ArrayBuffer) {
  if (_audioUrl) { URL.revokeObjectURL(_audioUrl); }
  const blob = new Blob([buf], { type: "audio/wav" });
  _audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(_audioUrl);
  audio.play().catch(() => {});
}

export default function VoiceDemo() {
  const { state: recState, start: startRec, stop: stopRec, reset: resetRec } = useAudioRecorder();
  const { data: agents = [] } = trpc.agents.list.useQuery();
  const [agentId, setAgentId] = useState<number | null>(null);
  const [inputLang, setInputLang] = useState("hi-IN");
  const [stage, setStage] = useState<DemoStage>("idle");
  const [transcript, setTranscript] = useState("");
  const [agentResponse, setAgentResponse] = useState("");
  const [judgeVerdict, setJudgeVerdict] = useState<{ passed: boolean; reasoning: string } | null>(null);
  const [error, setError] = useState("");

  const selectedAgent = agents.find(a => a.id === agentId);

  const doRecord = useCallback(() => {
    setStage("recording");
    setTranscript("");
    setAgentResponse("");
    setJudgeVerdict(null);
    setError("");
    startRec();
  }, [startRec]);

  const doStop = useCallback(async () => {
    setStage("transcribing");

    const blob = await stopRec();
    if (!blob) { setError("No audio recorded"); setStage("error"); return; }

    try {
      // ponytail: send raw webm directly — Sarvam supports it, avoids WAV conversion issues
      const res = await fetch(`/api/stt?lang=${inputLang}`, {
        method: "POST",
        headers: { "Content-Type": "audio/webm" },
        body: blob,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `STT failed: ${res.status}`);
      }
      const data = await res.json();
      const text = data.transcript || "";
      if (!text) throw new Error("Empty transcript");
      setTranscript(text);

      // now test the agent
      setStage("testing");
      if (!selectedAgent) { setError("No agent selected"); setStage("error"); return; }
      const agentRes = await fetch(selectedAgent.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      if (!agentRes.ok) throw new Error(`Agent returned ${agentRes.status}`);
      const agentData = await agentRes.json();
      const resp = agentData.response || agentData.text || JSON.stringify(agentData);
      setAgentResponse(resp);

      // judge
      const { evaluateHeuristic } = await import("@/_core/llm");
      const verdict = evaluateHeuristic(text, resp, "Jailbreak");
      setJudgeVerdict(verdict);
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setStage("error");
    }
  }, [stopRec, selectedAgent, inputLang]);

  const doPlayTTS = useCallback(async () => {
    if (!transcript) return;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript, language: inputLang }),
      });
      if (!res.ok) { setError("TTS failed — check SARVAM_API_KEY in .env"); return; }
      const buf = await res.arrayBuffer();
      playAudio(buf);
    } catch { setError("TTS failed"); }
  }, [transcript]);

  const doReset = useCallback(() => {
    resetRec();
    setStage("idle");
  }, [resetRec]);

  const stageLabel = (s: DemoStage) => {
    switch (s) {
      case "recording": return "[RECORDING] Press [STOP] when done";
      case "transcribing": return "[TRANSCRIBING] Audio via Sarvam STT";
      case "testing": return "[TESTING] Target agent + judging";
      case "done": return "[DONE] Complete";
      case "error": return "[FAILED] Error";
      default: return "Press [RECORD] to start";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <p className="font-mono text-sm tracking-[0.15em] text-[#6B6B6B]">&lt; VOICE DEMO /&gt;</p>
          <h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-0.04em]">VOICE ATTACK</h1>
          <p className="mt-2 font-mono text-sm tracking-[0.08em] text-[#6B6B6B]">
            SARVAM STT → AGENT → JUDGE PIPELINE, SPEAK A MULTILINGUAL ATTACK
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2 p-6 space-y-4 border-2 border-[#2A2A2A]">
            <div className="flex items-center gap-4 mb-4">
              <select
                className="flex-1 border border-[#2A2A2A] bg-[#0A0A0A] text-[#EAEAEA] px-3 py-2 font-mono text-sm tracking-[0.08em]"
                value={agentId ?? ""}
                onChange={e => setAgentId(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">-- TARGET AGENT --</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              
              <select
                className="w-[160px] border border-[#2A2A2A] bg-[#0A0A0A] text-[#EAEAEA] px-3 py-2 font-mono text-sm tracking-[0.08em]"
                value={inputLang}
                onChange={e => setInputLang(e.target.value)}
              >
                <option value="en-IN">ENGLISH</option>
                <option value="hi-IN">HINDI</option>
                <option value="bn-IN">BENGALI</option>
                <option value="ta-IN">TAMIL</option>
                <option value="te-IN">TELUGU</option>
              </select>

              {stage === "idle" || stage === "done" || stage === "error" ? (
                <Button onClick={doRecord} disabled={!agentId} className="bg-[#E61919] hover:bg-[#CC1414] text-[#EAEAEA] font-mono text-sm tracking-[0.08em] px-6">
                  {stage === "done" || stage === "error" ? "[RETRY]" : "[RECORD]"}
                </Button>
              ) : stage === "recording" ? (
                <Button onClick={doStop} className="bg-[#6B6B6B] hover:bg-[#555] text-[#EAEAEA] font-mono text-sm tracking-[0.08em] px-6">
                  [STOP]
                </Button>
              ) : (
                <Button disabled className="bg-[#2A2A2A] text-[#6B6B6B] font-mono text-sm tracking-[0.08em] px-6">
                  [WAIT]
                </Button>
              )}
            </div>

            <div data-divider className="bg-[#121212] p-3">
              <p className="telemetry-label text-[#6B6B6B]">STATUS</p>
              <p className="mt-1 font-mono text-sm text-[#EAEAEA]">{stageLabel(stage)}</p>
            </div>

            <div data-divider className="bg-[#121212] p-3 min-h-[60px]">
              <p className="telemetry-label text-[#6B6B6B]">TRANSCRIPT</p>
              <p className="mt-1 font-mono text-base text-[#EAEAEA] whitespace-pre-wrap">
                {transcript || <span className="text-[#6B6B6B] italic">Waiting for speech…</span>}
              </p>
            </div>

            <div data-divider className="bg-[#121212] p-3 min-h-[60px]">
              <p className="telemetry-label text-[#6B6B6B]">AGENT RESPONSE</p>
              <p className="mt-1 font-mono text-base text-[#EAEAEA] whitespace-pre-wrap leading-relaxed">
                {agentResponse || <span className="text-[#6B6B6B] italic">Waiting for response…</span>}
              </p>
            </div>

            {judgeVerdict && (
              <div data-divider className={`p-3 ${judgeVerdict.passed ? "border-[#4AF626]" : "border-[#E61919]"}`}>
                <p className="telemetry-label text-[#6B6B6B]">JUDGE VERDICT</p>
                <p className={`mt-1 font-display text-2xl font-black ${judgeVerdict.passed ? "text-[#4AF626]" : "text-[#E61919]"}`}>
                  {judgeVerdict.passed ? "PASSED" : "FAILED"}
                </p>
                <p className="mt-1 font-mono text-sm text-[#8E8E8E] italic">{judgeVerdict.reasoning}</p>
              </div>
            )}

            {error && (
              <div className="border border-[#6B6B6B]/30 bg-[#6B6B6B]/5 p-3">
                <p className="font-mono text-sm tracking-[0.1em] text-[#E61919]">ERROR</p>
                <p className="mt-1 font-mono text-sm text-[#E61919]">{error}</p>
              </div>
            )}
          </Card>

          <Card className="p-6 space-y-4 border-2 border-[#2A2A2A]">
            <p className="telemetry-label text-[#6B6B6B]">ACTIONS</p>

            <Button
              onClick={doPlayTTS}
              disabled={!transcript}
              className="w-full border border-[#2A2A2A] bg-transparent text-[#EAEAEA] hover:bg-[#1A1A1A] font-mono text-sm tracking-[0.08em]"
            >
              🔊 HEAR ATTACK
            </Button>

            <Button
              onClick={doReset}
              className="w-full border border-[#2A2A2A] bg-transparent text-[#6B6B6B] hover:bg-[#1A1A1A] font-mono text-sm tracking-[0.08em]"
            >
              ⟲ RESET
            </Button>

            <hr className="border-[#2A2A2A]" />

            <div className="font-mono text-sm text-[#6B6B6B] leading-relaxed">
              <p className="font-bold text-[#EAEAEA] mb-1">HOW THIS WORKS</p>
              <p>1. Speak a Hinglish attack prompt in your mic</p>
              <p>2. Audio is transcribed via Sarvam Saaras (STT)</p>
              <p>3. Transcript is sent to the target agent endpoint</p>
              <p>4. Agent response is evaluated by the heuristic judge</p>
              <p>5. Bulbul TTS reads the attack aloud (optional)</p>
              <p className="mt-2 text-[#E61919]">
                {selectedAgent ? `Target: ${selectedAgent.name}` : "No agent selected"}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
