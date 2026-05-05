import { useEffect, useRef, useState } from "react";
import { Microphone, Stop } from "@phosphor-icons/react";

export default function VoiceMicButton({ onRecorded, disabled }) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => () => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      try { mediaRef.current.stop(); } catch {}
    }
  }, []);

  const start = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported?.("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported?.("audio/mp4")
          ? "audio/mp4"
          : "";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || mimeType || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        if (blob.size > 0) onRecorded(blob);
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch (e) {
      setError("Microphone access denied.");
    }
  };

  const stop = () => {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    setRecording(false);
  };

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        data-testid="push-to-talk-button"
        disabled={disabled}
        onClick={recording ? stop : start}
        className={`relative w-20 h-20 rounded-full grid place-items-center transition-all ${
          recording
            ? "bg-terracotta-400 text-sand-50"
            : "bg-sage-400 text-sand-50 hover:bg-sage-500"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""} disabled:hover:bg-sage-400`}
      >
        {recording && (
          <>
            <span className="mic-ring animate-pulse-ring" />
            <span className="mic-ring animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
          </>
        )}
        {recording ? <Stop weight="fill" size={28} /> : <Microphone weight="fill" size={28} />}
      </button>
      <p className="text-xs text-ink-600 mt-3 uppercase tracking-[0.2em]">
        {recording ? "Listening" : "Hold space — tap to talk"}
      </p>
      {error && <p className="text-xs text-crisis mt-2">{error}</p>}
    </div>
  );
}
