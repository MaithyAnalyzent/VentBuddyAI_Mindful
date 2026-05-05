import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Trash, Plus, Leaf } from "@phosphor-icons/react";

export default function Habits() {
  const [habits, setHabits] = useState([]);
  const [name, setName] = useState("");
  const [target, setTarget] = useState(7);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/habits");
      setHabits(data);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    setAdding(true);
    try {
      await api.post("/habits", { name: name.trim(), target_per_week: Number(target) || 7, icon: "leaf" });
      setName("");
      await load();
    } catch {}
    setAdding(false);
  };

  const toggle = async (h) => {
    try {
      await api.post("/habits/log", { habit_id: h.id, completed: !h.completed_today });
      await load();
    } catch {}
  };

  const remove = async (id) => {
    try {
      await api.delete(`/habits/${id}`);
      await load();
    } catch {}
  };

  return (
    <div className="space-y-8" data-testid="habits-page">
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">Habits</span>
        <h1 className="font-heading text-3xl sm:text-4xl font-medium text-ink-900 mt-2">Tiny is enough.</h1>
        <p className="text-ink-600 mt-2">Showing up daily counts more than perfect streaks.</p>
      </div>

      <div className="bento-card p-6">
        <h2 className="font-heading text-xl font-medium text-ink-900">Add a habit</h2>
        <div className="mt-5 grid sm:grid-cols-[1fr,140px,auto] gap-3 items-end">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-ink-600">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              data-testid="habit-name-input"
              placeholder="Drink 8 glasses water"
              className="h-11 mt-1 rounded-xl bg-sand-50 border-border focus-visible:ring-sage-400" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-ink-600">Per week</Label>
            <Input type="number" min={1} max={7} value={target} onChange={(e) => setTarget(e.target.value)}
              data-testid="habit-target-input"
              className="h-11 mt-1 rounded-xl bg-sand-50 border-border focus-visible:ring-sage-400" />
          </div>
          <Button onClick={add} disabled={adding || !name.trim()} data-testid="habit-add-button"
            className="bg-ink-900 text-sand-50 hover:bg-ink-900/90 h-11 px-6 rounded-full">
            <Plus size={18} weight="bold" className="mr-1" /> Add
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {habits.length === 0 && (
          <div className="bento-card p-6 text-ink-600 text-sm sm:col-span-2">
            No habits yet. Try adding "Sleep before midnight" or "10 min walk".
          </div>
        )}
        {habits.map((h) => (
          <div key={h.id} className="bento-card p-5" data-testid={`habit-card-${h.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sage-100 grid place-items-center">
                  <Leaf weight="duotone" size={20} className="text-sage-700" />
                </div>
                <div>
                  <h3 className="font-heading text-lg text-ink-900 font-medium">{h.name}</h3>
                  <p className="text-xs text-ink-600 uppercase tracking-wider mt-1">
                    Target {h.target_per_week}/wk · Streak {h.streak || 0}
                  </p>
                </div>
              </div>
              <button data-testid={`habit-delete-${h.id}`} onClick={() => remove(h.id)} className="text-ink-600 hover:text-crisis">
                <Trash size={18} weight="duotone" />
              </button>
            </div>
            <Button
              onClick={() => toggle(h)}
              data-testid={`habit-toggle-${h.id}`}
              className={`w-full mt-4 h-10 rounded-xl ${
                h.completed_today
                  ? "bg-sage-400 text-sand-50 hover:bg-sage-500"
                  : "bg-sand-50 text-ink-900 hover:bg-sage-100 border border-border"
              }`}
            >
              {h.completed_today ? <><Check weight="bold" size={16} className="mr-2" /> Done today</> : "Mark done today"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
