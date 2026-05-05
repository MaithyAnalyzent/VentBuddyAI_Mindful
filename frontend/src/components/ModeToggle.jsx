import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function ModeToggle() {
  const { user, updateMode } = useAuth();
  if (!user) return null;
  const mode = user.mode || "professional";
  return (
    <div className="hidden sm:inline-flex items-center bg-sand-50 border border-border rounded-full p-1">
      <button
        data-testid="mode-toggle-professional"
        onClick={() => mode !== "professional" && updateMode("professional")}
        className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full transition-all ${
          mode === "professional" ? "bg-sage-400 text-sand-50" : "text-ink-600"
        }`}
      >
        Pro
      </button>
      <button
        data-testid="mode-toggle-genz"
        onClick={() => mode !== "genz" && updateMode("genz")}
        className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full transition-all ${
          mode === "genz" ? "bg-terracotta-400 text-sand-50" : "text-ink-600"
        }`}
      >
        Gen Z
      </button>
    </div>
  );
}
