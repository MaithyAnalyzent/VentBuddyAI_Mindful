import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { Heart, Sparkle, Moon } from "@phosphor-icons/react";

export default function Mood() {
  const [score, setScore] = useState([7]);
  const [energy, setEnergy] = useState([6]);
  const [sleep, setSleep] = useState([7]);
  const [triggers, setTriggers] = useState("");
  const [note, setNote] = useState("");
  const [trends, setTrends] = useState({ items: [], avg_score: 0, avg_energy: 0, avg_sleep: 0 });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/mood/trends");
      setTrends(data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    setSaving(true);
    try {
      await api.post("/mood", {
        score: score[0],
        energy: energy[0],
        sleep_quality: sleep[0],
        triggers: triggers.split(",").map((t) => t.trim()).filter(Boolean),
        note,
      });
      setTriggers("");
      setNote("");
      await load();
    } catch {}
    setSaving(false);
  };

  const chartData = (trends.items || []).map((m) => ({
    date: new Date(m.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    mood: m.score,
    energy: m.energy,
    sleep: m.sleep_quality,
  }));

  return (
    <div className="space-y-8" data-testid="mood-page">
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">Mood</span>
        <h1 className="font-heading text-3xl sm:text-4xl font-medium text-ink-900 mt-2">How's today landing?</h1>
        <p className="text-ink-600 mt-2">Honest beats high. Logs build your pattern over time.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        <Stat label="Avg mood" value={trends.avg_score} icon={Heart} />
        <Stat label="Avg energy" value={trends.avg_energy} icon={Sparkle} />
        <Stat label="Avg sleep" value={trends.avg_sleep} icon={Moon} />
      </div>

      {/* Logger */}
      <div className="bento-card p-6 sm:p-8">
        <h2 className="font-heading text-xl font-medium text-ink-900">Log this moment</h2>
        <div className="mt-6 space-y-6">
          <SliderRow label="Mood" value={score} onChange={setScore} testId="mood-score" />
          <SliderRow label="Energy" value={energy} onChange={setEnergy} testId="mood-energy" />
          <SliderRow label="Sleep quality (last night)" value={sleep} onChange={setSleep} testId="mood-sleep" />

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-ink-600">Triggers (comma-separated)</Label>
            <Input value={triggers} onChange={(e) => setTriggers(e.target.value)}
              data-testid="mood-triggers"
              placeholder="work, sleep, family"
              className="h-11 rounded-xl bg-sand-50 border-border focus-visible:ring-sage-400" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-ink-600">Note (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)}
              data-testid="mood-note" rows={3}
              placeholder="A line or two — what's true right now?"
              className="rounded-xl bg-sand-50 border-border focus-visible:ring-sage-400" />
          </div>

          <Button onClick={submit} disabled={saving} data-testid="mood-save-button"
            className="bg-ink-900 text-sand-50 hover:bg-ink-900/90 h-11 px-6 rounded-full">
            {saving ? "Saving..." : "Save log"}
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div className="bento-card p-6">
        <h2 className="font-heading text-xl font-medium text-ink-900">Last 30 logs</h2>
        <div className="h-72 mt-6">
          {chartData.length === 0 ? (
            <div className="h-full grid place-items-center text-ink-600 text-sm">No logs yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="#E5E0D8" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#6B7B7B" fontSize={12} />
                <YAxis domain={[0, 10]} stroke="#6B7B7B" fontSize={12} />
                <Tooltip contentStyle={{ background: "#FDFBF7", border: "1px solid #E5E0D8", borderRadius: 12 }} />
                <Line type="monotone" dataKey="mood" stroke="#8A9A86" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="energy" stroke="#E8A87C" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="sleep" stroke="#748370" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, value, onChange, testId }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label className="text-xs font-semibold uppercase tracking-wider text-ink-600">{label}</Label>
        <span data-testid={`${testId}-value`} className="font-heading text-2xl text-ink-900">{value[0]}</span>
      </div>
      <Slider data-testid={testId} value={value} onValueChange={onChange} min={1} max={10} step={1} />
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="bento-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">{label}</span>
        <Icon weight="duotone" size={18} className="text-sage-400" />
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-heading text-3xl font-medium text-ink-900">{value || "—"}</span>
        <span className="text-sm text-ink-600">/10</span>
      </div>
    </div>
  );
}
