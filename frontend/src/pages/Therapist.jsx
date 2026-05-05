import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ClipboardText, Copy, Check } from "@phosphor-icons/react";

export default function Therapist() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/therapist/summary");
      setData(data);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const copyAll = () => {
    if (!data) return;
    const text = `Mindful Reflection Summary

${data.summary}

Mood logs: ${data.mood_count} | Journal entries: ${data.journal_count} | Sessions: ${data.session_count}
Average mood: ${data.avg_mood ?? "—"}/10
Average sleep: ${data.avg_sleep ?? "—"}/10

Top triggers: ${data.top_triggers?.map((t) => `${t.name} (${t.count})`).join(", ") || "—"}

Reflection topics for next session:
${data.reflection_topics?.map((t, i) => `  ${i + 1}. ${t}`).join("\n")}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8" data-testid="therapist-page">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">Therapist bridge</span>
          <h1 className="font-heading text-3xl sm:text-4xl font-medium text-ink-900 mt-2">Bring this to your next session.</h1>
          <p className="text-ink-600 mt-2 max-w-xl">A summary of your patterns. Share it with your therapist if you have one — or use it to reflect.</p>
        </div>
        <Button onClick={copyAll} data-testid="therapist-copy-button"
          className="bg-ink-900 text-sand-50 hover:bg-ink-900/90 h-11 px-5 rounded-full">
          {copied ? <Check size={18} className="mr-2" weight="bold" /> : <Copy size={18} className="mr-2" weight="duotone" />}
          {copied ? "Copied" : "Copy summary"}
        </Button>
      </div>

      <div className="bento-card p-8">
        <div className="flex items-start gap-3">
          <ClipboardText weight="duotone" size={28} className="text-sage-400 mt-1" />
          <p className="text-ink-900 leading-relaxed">{data?.summary || "Loading..."}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-5">
        <div className="bento-card p-5">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">Mood logs</span>
          <p className="font-heading text-3xl mt-2 text-ink-900">{data?.mood_count ?? "—"}</p>
        </div>
        <div className="bento-card p-5">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">Journals</span>
          <p className="font-heading text-3xl mt-2 text-ink-900">{data?.journal_count ?? "—"}</p>
        </div>
        <div className="bento-card p-5">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">Conversations</span>
          <p className="font-heading text-3xl mt-2 text-ink-900">{data?.session_count ?? "—"}</p>
        </div>
      </div>

      {data?.top_triggers?.length > 0 && (
        <div className="bento-card p-6">
          <h2 className="font-heading text-xl font-medium text-ink-900">Recurring triggers</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.top_triggers.map((t) => (
              <span key={t.name} className="px-3 py-1.5 rounded-full bg-terracotta-400/15 text-terracotta-500 text-sm font-medium">
                {t.name} · {t.count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bento-card p-6">
        <h2 className="font-heading text-xl font-medium text-ink-900">Reflection topics</h2>
        <ul className="mt-4 space-y-3">
          {data?.reflection_topics?.map((t, i) => (
            <li key={i} className="flex gap-3 text-ink-900">
              <span className="text-sage-700 font-heading text-lg">{i + 1}.</span>
              <span className="leading-relaxed">{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
