import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

const TECHNIQUES = {
  box: { name: "Box (4-4-4-4)", phases: [["Inhale", 4], ["Hold", 4], ["Exhale", 4], ["Hold", 4]] },
  "478": { name: "4-7-8 Calm", phases: [["Inhale", 4], ["Hold", 7], ["Exhale", 8]] },
  simple: { name: "4-in / 4-out", phases: [["Inhale", 4], ["Exhale", 4]] },
};

export default function Breathing() {
  const [tech, setTech] = useState("box");
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [secLeft, setSecLeft] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const phasesRef = useRef(TECHNIQUES.box.phases);
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);

  const phases = TECHNIQUES[tech].phases;

  useEffect(() => {
    phasesRef.current = phases;
    setPhaseIdx(0);
    setSecLeft(phases[0][1]);
  }, [tech, phases]);

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setSecLeft((s) => {
        if (s <= 1) {
          setPhaseIdx((p) => {
            const next = (p + 1) % phasesRef.current.length;
            setTimeout(() => setSecLeft(phasesRef.current[next][1]), 0);
            return next;
          });
          return phasesRef.current[(phaseIdx + 1) % phasesRef.current.length][1];
        }
        return s - 1;
      });
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line
  }, [running]);

  const start = () => {
    setElapsed(0);
    setPhaseIdx(0);
    setSecLeft(phases[0][1]);
    startedAtRef.current = Date.now();
    setRunning(true);
  };

  const stop = async () => {
    setRunning(false);
    clearInterval(timerRef.current);
    if (elapsed >= 5) {
      try { await api.post("/breathing/sessions", { technique: tech, duration_seconds: elapsed }); } catch {}
    }
  };

  const phaseLabel = phases[phaseIdx][0];

  return (
    <div className="space-y-8" data-testid="breathing-page">
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">Breathe</span>
        <h1 className="font-heading text-3xl sm:text-4xl font-medium text-ink-900 mt-2">Slow it down.</h1>
        <p className="text-ink-600 mt-2">Match the circle. Inhale as it grows, exhale as it shrinks.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(TECHNIQUES).map(([k, v]) => (
          <button
            key={k}
            data-testid={`breathing-technique-${k}`}
            onClick={() => !running && setTech(k)}
            disabled={running}
            className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
              tech === k ? "bg-sage-400 text-sand-50 border-sage-400" : "bg-sand-50 text-ink-900 border-border"
            } ${running ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {v.name}
          </button>
        ))}
      </div>

      <div className="bento-card p-10 grid place-items-center min-h-[420px]">
        <motion.div
          animate={{
            scale: phaseLabel === "Inhale" ? 1.4 : phaseLabel === "Exhale" ? 0.85 : 1.1,
          }}
          transition={{ duration: secLeft || 1, ease: "easeInOut" }}
          className="w-56 h-56 rounded-full bg-gradient-to-br from-sage-100 to-sage-400 grid place-items-center shadow-inner"
          data-testid="breathing-circle"
        >
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-sand-50/80">{phaseLabel}</p>
            <p className="font-heading text-6xl font-light text-sand-50 mt-2">{secLeft}</p>
          </div>
        </motion.div>

        <div className="mt-10 flex flex-col items-center gap-3">
          {!running ? (
            <Button onClick={start} data-testid="breathing-start"
              className="bg-ink-900 text-sand-50 hover:bg-ink-900/90 h-12 px-8 rounded-full">
              Begin
            </Button>
          ) : (
            <Button onClick={stop} data-testid="breathing-stop"
              variant="outline" className="border-border bg-sand-50 h-12 px-8 rounded-full">
              Finish ({Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")})
            </Button>
          )}
          <p className="text-xs text-ink-600 uppercase tracking-wider">{TECHNIQUES[tech].name}</p>
        </div>
      </div>
    </div>
  );
}
