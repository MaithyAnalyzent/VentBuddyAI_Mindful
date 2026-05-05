import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import VoiceMicButton from "@/components/VoiceMicButton";
import CrisisBanner from "@/components/CrisisBanner";
import { PaperPlaneTilt, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import axios from "axios";

export default function Chat() {
  const { user } = useAuth();
  const { sessionId: routeSessionId } = useParams();
  const navigate = useNavigate();

  const [sessionId, setSessionId] = useState(routeSessionId || null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [crisis, setCrisis] = useState(null);
  const audioRef = useRef(null);
  const scrollRef = useRef(null);

  // Load existing messages if session in url
  useEffect(() => {
    if (!routeSessionId) {
      setMessages([]);
      return;
    }
    setSessionId(routeSessionId);
    (async () => {
      try {
        const { data } = await api.get(`/chat/sessions/${routeSessionId}/messages`);
        setMessages(data);
      } catch {}
    })();
  }, [routeSessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const playAudio = (b64) => {
    if (!b64) return;
    const src = `data:audio/mp3;base64,${b64}`;
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(src);
    audioRef.current = audio;
    audio.play().catch(() => {});
  };

  const sendText = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText("");
    setSending(true);
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content, created_at: new Date().toISOString() }]);
    try {
      const { data } = await api.post("/chat/send", {
        text: content,
        mode: user?.mode || "professional",
        session_id: sessionId,
        voice_reply: voiceOn,
      });
      if (!sessionId) {
        setSessionId(data.session_id);
        navigate(`/chat/${data.session_id}`, { replace: true });
      }
      setMessages((m) => [
        ...m,
        { id: `ai-${Date.now()}`, role: "assistant", content: data.reply, emotion: data.emotion, created_at: new Date().toISOString() },
      ]);
      if (data.is_crisis) setCrisis(data.crisis_resources);
      else setCrisis(null);
      if (voiceOn && data.audio_b64) playAudio(data.audio_b64);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { id: `err-${Date.now()}`, role: "assistant", content: "I had trouble responding just now. Try again in a moment.", created_at: new Date().toISOString() },
      ]);
    } finally {
      setSending(false);
    }
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
      form.append("voice_reply", String(voiceOn));
      const { data } = await axios.post(`${API_BASE}/chat/voice`, form, {
        withCredentials: true,
      });
      if (!sessionId) {
        setSessionId(data.session_id);
        navigate(`/chat/${data.session_id}`, { replace: true });
      }
      setMessages((m) => [
        ...m,
        { id: `u-${Date.now()}`, role: "user", content: data.transcript, created_at: new Date().toISOString() },
        { id: `ai-${Date.now()}`, role: "assistant", content: data.reply, created_at: new Date().toISOString() },
      ]);
      if (data.is_crisis) setCrisis(data.crisis_resources);
      else setCrisis(null);
      if (voiceOn && data.audio_b64) playAudio(data.audio_b64);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { id: `err-${Date.now()}`, role: "assistant", content: "I couldn't catch that — try recording again.", created_at: new Date().toISOString() },
      ]);
    } finally {
      setSending(false);
    }
  };

  const isGenZ = user?.mode === "genz";

  return (
    <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-9rem)]" data-testid="chat-page">
      <div className="lg:col-span-12 flex flex-col bento-card overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-700">
              {isGenZ ? "Gen Z mode" : "Professional mode"}
            </span>
            <h2 className="font-heading text-xl font-medium text-ink-900">
              Mindful is here.
            </h2>
          </div>
          <button
            onClick={() => setVoiceOn((v) => !v)}
            data-testid="voice-toggle"
            className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-3 py-2 rounded-full border ${
              voiceOn ? "bg-sage-400 text-sand-50 border-sage-400" : "bg-sand-50 text-ink-600 border-border"
            }`}
          >
            {voiceOn ? <SpeakerHigh size={16} weight="duotone" /> : <SpeakerSlash size={16} weight="duotone" />}
            Voice {voiceOn ? "on" : "off"}
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-ink-600 py-12">
              <p className="text-sm uppercase tracking-[0.2em]">A safe space</p>
              <p className="font-heading text-2xl text-ink-900 mt-3 max-w-md mx-auto">
                {isGenZ ? "What's actually going on?" : "Tell me what's on your mind. I'm listening."}
              </p>
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              data-testid={`chat-msg-${m.role}`}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-sage-400 text-sand-50 rounded-br-md"
                    : "bg-sand-50 text-ink-900 border border-border rounded-bl-md"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-sand-50 border border-border px-4 py-3 rounded-2xl text-sm text-ink-600">
                <span className="animate-pulse">...</span>
              </div>
            </div>
          )}

          {crisis && <CrisisBanner resources={crisis} embedded />}
        </div>

        {/* Composer */}
        <div className="border-t border-border px-4 py-4 bg-sand-50/60">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Textarea
                data-testid="chat-text-input"
                placeholder={isGenZ ? "say anything..." : "Share what's on your heart..."}
                rows={2}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendText();
                  }
                }}
                className="resize-none min-h-[60px] rounded-xl bg-sand-50 border-border focus-visible:ring-sage-400"
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <Button
                onClick={sendText}
                disabled={sending || !text.trim()}
                data-testid="chat-send-button"
                className="h-11 w-11 p-0 rounded-full bg-ink-900 text-sand-50 hover:bg-ink-900/90"
              >
                <PaperPlaneTilt weight="fill" size={18} />
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center">
            <VoiceMicButton onRecorded={sendVoice} disabled={sending} />
          </div>
        </div>
      </div>
    </div>
  );
}
