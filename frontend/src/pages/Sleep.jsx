import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { api, API_BASE } from "@/lib/api";
import VoiceMicButton from "@/components/VoiceMicButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Moon, PaperPlaneTilt } from "@phosphor-icons/react";

export default function Sleep() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    document.body.classList.add("sleep-mode");
    return () => document.body.classList.remove("sleep-mode");
  }, []);

  const playAudio = (b64) => {
    if (!b64) return;
    const audio = new Audio(`data:audio/mp3;base64,${b64}`);
    if (audioRef.current) audioRef.current.pause();
    audioRef.current = audio;
    audio.play().catch(() => {});
  };

  const send = async (override) => {
    const content = (override ?? text).trim();
    if (!content || sending) return;
    setText("");
    setSending(true);
    setMessages((m) => [...m, { role: "user", content, id: Date.now() }]);
    try {
      const { data } = await api.post("/chat/send", {
        text: `${content}\n\n(Context: this is the late-night sleep companion mode. Reply more softly, shorter, with grounding focus.)`,
        mode: user?.mode || "professional",
        session_id: sessionId,
        voice_reply: true,
      });
      if (!sessionId) setSessionId(data.session_id);
      setMessages((m) => [...m, { role: "assistant", content: data.reply, id: Date.now() + 1 }]);
      if (data.audio_b64) playAudio(data.audio_b64);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "I'm here. Let's just breathe slow for a moment.", id: Date.now() + 1 }]);
    }
    setSending(false);
  };

  const sendVoice = async (blob) => {
    if (sending) return;
    setSending(true);
    try {
      const form = new FormData();
      const ext = blob.type.includes("mp4") ? "m4a" : "webm";
      form.append("audio", blob, `voice.${ext}`);
      form.append("mode", user?.mode || "professional");
      if (sessionId) form.append("session_id", sessionId);
      form.append("voice_reply", "true");
      const { data } = await axios.post(`${API_BASE}/chat/voice`, form, { withCredentials: true });
      if (!sessionId) setSessionId(data.session_id);
      setMessages((m) => [
        ...m,
        { role: "user", content: data.transcript, id: Date.now() },
        { role: "assistant", content: data.reply, id: Date.now() + 1 },
      ]);
      if (data.audio_b64) playAudio(data.audio_b64);
    } catch {}
    setSending(false);
  };

  return (
    <div className="-mx-4 -my-8 sm:-mx-6 lg:-mx-8 min-h-[calc(100vh-4rem)] relative" data-testid="sleep-page"
      style={{
        backgroundImage: "linear-gradient(to bottom, rgba(11,19,30,0.85), rgba(11,19,30,0.95)), url('https://images.pexels.com/photos/20763740/pexels-photo-20763740.jpeg')",
        backgroundSize: "cover", backgroundPosition: "center",
      }}>
      <div className="max-w-3xl mx-auto px-6 py-12 text-sleep-text">
        <div className="flex items-center gap-3">
          <Moon weight="duotone" size={28} />
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-sleep-text/70">Sleep companion</span>
            <h1 className="font-heading text-3xl font-light mt-1">It's quiet now.</h1>
          </div>
        </div>
        <p className="text-sleep-text/80 mt-3 max-w-xl">
          Tell me what's keeping you up. I'll keep it short, soft, and grounding.
        </p>

        {/* Quick prompts */}
        <div className="mt-6 flex flex-wrap gap-2">
          {["I can't stop overthinking", "I feel alone tonight", "My chest feels tight", "Tomorrow scares me"].map((p) => (
            <button
              key={p}
              data-testid={`sleep-quick-${p.slice(0, 8)}`}
              onClick={() => send(p)}
              className="text-xs px-3 py-1.5 rounded-full border border-sleep-text/20 bg-sleep-card text-sleep-text/90 hover:bg-sleep-text/10"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="mt-8 space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-sleep-text/15 text-sleep-text rounded-br-md"
                  : "bg-sleep-card border border-sleep-text/10 text-sleep-text rounded-bl-md"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {sending && <div className="text-sleep-text/60 text-sm animate-pulse">Mindful is here...</div>}
        </div>

        {/* Composer */}
        <div className="mt-8 rounded-3xl bg-sleep-card border border-sleep-text/10 p-5">
          <div className="flex items-end gap-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              data-testid="sleep-text-input"
              rows={2}
              placeholder="What's on your mind?"
              className="resize-none rounded-xl bg-transparent border-sleep-text/20 text-sleep-text placeholder:text-sleep-text/40 focus-visible:ring-sage-400"
            />
            <Button
              data-testid="sleep-send-button"
              onClick={() => send()}
              disabled={sending || !text.trim()}
              className="h-11 w-11 p-0 rounded-full bg-sage-400 text-sand-50 hover:bg-sage-500"
            >
              <PaperPlaneTilt weight="fill" size={18} />
            </Button>
          </div>
          <div className="mt-5 flex justify-center">
            <VoiceMicButton onRecorded={sendVoice} disabled={sending} />
          </div>
        </div>
      </div>
    </div>
  );
}
