// ponytail: silence-based VAD + Sarvam pipeline for voice demo.
// Adapted from Vobiz-Sarvam CallSession + sarvam-explorer audio patterns.

const SILENCE_THRESHOLD = 200;
const SILENCE_FRAMES = 40;
const MIN_SPEECH_FRAMES = 8;
const SAMPLE_RATE = 16000;

export interface SessionConfig {
  sarvamKey: string;
  targetAgentUrl: string;
  language?: string;
}

export interface UtteranceEvent {
  text: string;
  isAttack: boolean;
  timestamp: number;
}

type SessionState = "idle" | "listening" | "processing" | "speaking" | "attacked";

export class CallSession {
  private state: SessionState = "idle";
  private audioBuf: Float32Array[] = [];
  private silenceCount = 0;
  private speechCount = 0;
  private isSpeaking = false;
  private onUtterance: ((ev: UtteranceEvent) => void) | null = null;
  private onStateChange: ((s: SessionState) => void) | null = null;

  constructor(private config: SessionConfig) {}

  onUtteranceCb(cb: (ev: UtteranceEvent) => void) { this.onUtterance = cb; }
  onStateChangeCb(cb: (s: SessionState) => void) { this.onStateChange = cb; }

  private setState(s: SessionState) {
    this.state = s;
    this.onStateChange?.(s);
  }

  feedAudio(samples: Float32Array) {
    if (this.state === "processing" || this.state === "speaking") return;
    this.setState("listening");

    const rms = Math.sqrt(samples.reduce((s, v) => s + v * v, 0) / samples.length) * 1000;

    if (rms > SILENCE_THRESHOLD) {
      this.silenceCount = 0;
      this.speechCount++;
      this.audioBuf.push(samples);
    } else {
      this.silenceCount++;
      if (this.speechCount >= MIN_SPEECH_FRAMES && this.silenceCount >= SILENCE_FRAMES) {
        this.flush();
      }
    }
  }

  private async flush() {
    this.setState("processing");
    const audio = this.concatAudio();
    this.audioBuf = [];
    this.speechCount = 0;
    this.silenceCount = 0;

    try {
      const text = await this.stt(audio);
      if (!text) { this.setState("idle"); return; }

      const isAttack = await this.detectAttack(text);
      this.onUtterance?.({ text, isAttack, timestamp: Date.now() });

      if (isAttack) {
        this.setState("attacked");
        const jailbroken = await this.queryTargetAgent(text);
        const ttsAudio = await this.tts(jailbroken || "The agent failed to resist the attack.");
        await this.playAudio(ttsAudio);
      }
    } catch { /* log and reset */ }
    this.setState("idle");
  }

  private concatAudio(): Float32Array {
    const totalLen = this.audioBuf.reduce((s, b) => s + b.length, 0);
    const out = new Float32Array(totalLen);
    let off = 0;
    for (const b of this.audioBuf) { out.set(b, off); off += b.length; }
    return out;
  }

  private async stt(audio: Float32Array): Promise<string> {
    const wav = this.float32ToWav(audio);
    const form = new FormData();
    form.append("file", new Blob([wav], { type: "audio/wav" }), "audio.wav");
    form.append("model", "saaras:v3");
    form.append("language_code", this.config.language || "hi-IN");
    form.append("mode", "transcribe");
    const res = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST", headers: { "api-subscription-key": this.config.sarvamKey }, body: form,
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.transcript || data.text || "";
  }

  private async detectAttack(text: string): Promise<boolean> {
    // ponytail: simple heuristic — check for jailbreak/override keywords
    const keywords = ["ignore", "override", "forget", "system", "instruction", "jailbreak", "bypass", "sudo", "admin"];
    const lower = text.toLowerCase();
    return keywords.some(k => lower.includes(k));
  }

  private async queryTargetAgent(text: string): Promise<string> {
    try {
      const res = await fetch(this.config.targetAgentUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      if (!res.ok) return "";
      const data = await res.json();
      return data.response || data.text || JSON.stringify(data);
    } catch { return ""; }
  }

  private async tts(text: string): Promise<ArrayBuffer> {
    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: { "api-subscription-key": this.config.sarvamKey, "content-type": "application/json" },
      body: JSON.stringify({ input: text, target_language_code: "hi-IN", model: "bulbul:v3", speaker: "anand", speech_sample_rate: 8000 }),
    });
    if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
    return res.arrayBuffer();
  }

  private async playAudio(buf: ArrayBuffer) {
    this.setState("speaking");
    this.isSpeaking = true;
    const blob = new Blob([buf], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); this.isSpeaking = false; this.setState("idle"); };
    await audio.play();
  }

  // ponytail: barge-in — clear audio on new input during playback
  bargeIn() {
    if (this.isSpeaking) {
      this.isSpeaking = false;
      this.audioBuf = [];
      this.speechCount = 0;
      this.silenceCount = 0;
      // actual Audio element can't be interrupted from outside easily
      this.setState("listening");
    }
  }

  private float32ToWav(samples: Float32Array): ArrayBuffer {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = SAMPLE_RATE * numChannels * bitsPerSample / 8;
    const dataLen = samples.length * numChannels * bitsPerSample / 8;
    const buf = new ArrayBuffer(44 + dataLen);
    const v = new DataView(buf);
    const w = (off: number, str: string) => { for (let i = 0; i < str.length; i++) v.setUint8(off + i, str.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + dataLen, true); w(8, "WAVE");
    w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, numChannels, true); v.setUint32(24, SAMPLE_RATE, true);
    v.setUint32(28, byteRate, true); v.setUint16(32, numChannels * bitsPerSample / 8, true);
    v.setUint16(34, bitsPerSample, true); w(36, "data"); v.setUint32(40, dataLen, true);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buf;
  }
}
