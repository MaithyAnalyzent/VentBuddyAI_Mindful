import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  ChatCircleDots, Heart, NotePencil, Leaf, Wind, Moon, ClipboardText, Sparkle,
  PaperPlaneTilt,
} from "@phosphor-icons/react";

export default function Dashboard() {
  const { user } = useAuth();
  const [checkin, setCheckin] = useState(null);
  const [feeling, setFeeling] = useState("");
  const [trends, setTrends] = useState(null);
  const [tg, setTg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/checkin/today");
        setCheckin(data);
      } catch {}
      try {
        const { data } = await api.get("/mood/trends");
        setTrends(data);
      } catch {}
      try {
        const { data } = await api.get("/integrations/telegram");
        setTg(data);
      } catch {}
    })();
  }, []);

  const submitCheckin = async (val) => {
    setFeeling(val);
    try {
      await api.post("/checkin/respond", { feeling: val, note: "" });
      const { data } = await api.get("/checkin/today");
      setCheckin(data);
    } catch {}
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return "Late night";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Late night";
  })();

  const moodPrompts = checkin?.prompts || [];
  const isGenZ = user?.mode === "genz";

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Hero greeting */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">{greeting}</span>
          <h1 className="font-heading text-4xl sm:text-5xl font-medium text-ink-900 mt-2">
            Hey {user?.name?.split(" ")[0] || "there"} — how's your heart today?
          </h1>
          <p className="text-ink-600 mt-3 max-w-xl leading-relaxed">
            {isGenZ
              ? "No pressure. Pick whatever fits the vibe."
              : "Take a moment. Choose whatever feels right — even silence is a start."}
          </p>
        </div>
        <Link to="/chat" data-testid="dashboard-talk-cta">
          <Button className="bg-ink-900 text-sand-50 hover:bg-ink-900/90 rounded-full px-6 h-12">
            <ChatCircleDots weight="duotone" size={20} className="mr-2" />
            Talk to Mindful
          </Button>
        </Link>
      </div>

      {/* Daily check-in */}
      <div className="bento-card p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-700">Daily check-in</span>
            <h2 className="font-heading text-2xl font-medium text-ink-900 mt-2">
              {checkin?.completed ? "You checked in today ✓" : moodPrompts[0] || "How are you feeling?"}
            </h2>
          </div>
          {checkin?.completed && (
            <span className="text-xs uppercase tracking-wider bg-sage-100 text-sage-700 px-3 py-1 rounded-full">
              Logged: {checkin.checkin?.feeling}
            </span>
          )}
        </div>

        {!checkin?.completed && (
          <div className="mt-5 flex flex-wrap gap-2">
            {["Heavy", "Anxious", "Numb", "Okay", "Hopeful", "Lighter"].map((f) => (
              <button
                key={f}
                data-testid={`checkin-feeling-${f.toLowerCase()}`}
                onClick={() => submitCheckin(f)}
                className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
                  feeling === f
                    ? "bg-sage-400 text-sand-50 border-sage-400"
                    : "bg-sand-50 text-ink-900 border-border hover:bg-sage-100"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <StatCard label="7-day mood" value={trends?.avg_score ?? "—"} suffix="/10" icon={Heart} />
        <StatCard label="7-day energy" value={trends?.avg_energy ?? "—"} suffix="/10" icon={Sparkle} />
        <StatCard label="Sleep avg" value={trends?.avg_sleep ?? "—"} suffix="/10" icon={Moon} />
        <StatCard label="Logs" value={trends?.items?.length ?? 0} icon={ClipboardText} />
      </div>

      {/* Quick actions grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ActionTile to="/chat" icon={ChatCircleDots} title="Talk it out" desc="Voice or text. Pro or Gen Z mode." testId="action-chat" />
        <ActionTile to="/breathing" icon={Wind} title="Breathe with me" desc="Box, 4-7-8, or guided rhythm." testId="action-breathing" />
        <ActionTile to="/journal" icon={NotePencil} title="Write a little" desc="Soft prompts. No pressure." testId="action-journal" />
        <ActionTile to="/mood" icon={Heart} title="Log mood" desc="Score, sleep, triggers." testId="action-mood" />
        <ActionTile to="/habits" icon={Leaf} title="Tiny habits" desc="Sleep, water, gratitude." testId="action-habits" />
        <ActionTile to="/sleep" icon={Moon} title="Sleep mode" desc="For overthinking nights." testId="action-sleep" />
      </div>

      {/* Telegram callout */}
      {tg?.enabled && (
        <div data-testid="telegram-callout" className="bento-card p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-gradient-to-br from-sand-50 to-sage-100/50">
          <div className="w-12 h-12 rounded-2xl bg-sage-400 grid place-items-center shrink-0">
            <PaperPlaneTilt weight="duotone" size={24} className="text-sand-50" />
          </div>
          <div className="flex-1">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-700">Available on Telegram</span>
            <h3 className="font-heading text-xl font-medium text-ink-900 mt-1">Chat with {tg.name} anytime</h3>
            <p className="text-sm text-ink-600 mt-1 leading-relaxed">
              Talk to Mindful inside Telegram — text or voice notes. Same warm companion, in your pocket.
            </p>
          </div>
          <a
            href={tg.url}
            target="_blank"
            rel="noreferrer"
            data-testid="telegram-open-button"
            className="inline-flex items-center gap-2 bg-ink-900 text-sand-50 hover:bg-ink-900/90 rounded-full px-5 h-11 font-medium text-sm shrink-0"
          >
            Open in Telegram
            <PaperPlaneTilt weight="fill" size={16} />
          </a>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, suffix, icon: Icon }) {
  return (
    <div className="bento-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">{label}</span>
        <Icon weight="duotone" size={18} className="text-sage-400" />
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-heading text-3xl font-medium text-ink-900">{value}</span>
        {suffix && <span className="text-sm text-ink-600">{suffix}</span>}
      </div>
    </div>
  );
}

function ActionTile({ to, icon: Icon, title, desc, testId }) {
  return (
    <Link to={to} data-testid={testId} className="bento-card p-6 group block">
      <div className="w-11 h-11 rounded-xl bg-sage-100 grid place-items-center group-hover:bg-sage-400 transition-colors">
        <Icon weight="duotone" size={22} className="text-sage-700 group-hover:text-sand-50" />
      </div>
      <h3 className="font-heading text-lg font-medium text-ink-900 mt-5">{title}</h3>
      <p className="text-sm text-ink-600 mt-1 leading-relaxed">{desc}</p>
    </Link>
  );
}
