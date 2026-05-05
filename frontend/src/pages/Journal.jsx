import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash, NotePencil } from "@phosphor-icons/react";

export default function Journal() {
  const [prompts, setPrompts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [active, setActive] = useState("");
  const [content, setContent] = useState("");
  const [tag, setTag] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [p, e] = await Promise.all([api.get("/journal/prompts"), api.get("/journal")]);
      setPrompts(p.data.prompts || []);
      setEntries(e.data || []);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await api.post("/journal", { prompt: active, content, mood_tag: tag });
      setContent("");
      setTag("");
      setActive("");
      await load();
    } catch {}
    setSaving(false);
  };

  const remove = async (id) => {
    try {
      await api.delete(`/journal/${id}`);
      await load();
    } catch {}
  };

  return (
    <div className="space-y-8" data-testid="journal-page">
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">Journal</span>
        <h1 className="font-heading text-3xl sm:text-4xl font-medium text-ink-900 mt-2">Write a little.</h1>
        <p className="text-ink-600 mt-2">Pick a prompt or skip — whatever comes out is enough.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">Prompts for today</h2>
          {prompts.map((p, i) => (
            <button
              key={i}
              data-testid={`journal-prompt-${i}`}
              onClick={() => setActive(p)}
              className={`w-full text-left text-sm rounded-2xl p-4 transition-colors ${
                active === p
                  ? "bg-sage-400 text-sand-50 border border-sage-400"
                  : "bg-sand-50 text-ink-900 border border-border hover:bg-sand-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 bento-card p-6 space-y-5">
          {active && (
            <div className="text-sm font-medium text-sage-700 bg-sage-100 p-3 rounded-xl">
              {active}
            </div>
          )}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            data-testid="journal-content-input"
            rows={10}
            placeholder="Start where you are..."
            className="rounded-xl bg-sand-50 border-border focus-visible:ring-sage-400 leading-relaxed"
          />
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-ink-600">Mood tag</Label>
              <Input value={tag} onChange={(e) => setTag(e.target.value)}
                data-testid="journal-tag-input"
                placeholder="reflective"
                className="h-10 mt-1 rounded-xl bg-sand-50 border-border focus-visible:ring-sage-400" />
            </div>
            <Button onClick={save} disabled={saving || !content.trim()} data-testid="journal-save-button"
              className="bg-ink-900 text-sand-50 hover:bg-ink-900/90 h-11 px-6 rounded-full self-end">
              {saving ? "Saving..." : "Save entry"}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-heading text-xl font-medium text-ink-900">Past entries</h2>
        {entries.length === 0 && (
          <div className="bento-card p-6 text-ink-600 text-sm">No entries yet.</div>
        )}
        {entries.map((e) => (
          <div key={e.id} className="bento-card p-6" data-testid={`journal-entry-${e.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">
                  {new Date(e.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </span>
                {e.prompt && <p className="text-sm text-sage-700 mt-1 italic">{e.prompt}</p>}
              </div>
              <button onClick={() => remove(e.id)} data-testid={`journal-delete-${e.id}`} className="text-ink-600 hover:text-crisis">
                <Trash size={18} weight="duotone" />
              </button>
            </div>
            <p className="mt-3 text-ink-900 whitespace-pre-wrap leading-relaxed">{e.content}</p>
            {e.mood_tag && (
              <span className="mt-3 inline-block text-xs uppercase tracking-wider bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full">
                {e.mood_tag}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
