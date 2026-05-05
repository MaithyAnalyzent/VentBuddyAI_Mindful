import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Wind, ChatCircleDots, Moon, NotePencil, Leaf, ArrowRight, ShieldCheck } from "@phosphor-icons/react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-sand-100">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-sand-100/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sage-400 grid place-items-center">
              <Leaf weight="duotone" size={18} className="text-sand-50" />
            </div>
            <span className="font-heading text-lg font-medium text-ink-900">Mindful</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" data-testid="login-link" className="text-sm font-medium text-ink-600 hover:text-ink-900">
              Sign in
            </Link>
            <Link to="/register" data-testid="get-started-btn">
              <Button className="bg-ink-900 text-sand-50 hover:bg-ink-900/90 rounded-full px-5">
                Begin <ArrowRight weight="bold" size={16} className="ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-sage-700 bg-sage-100 px-3 py-1 rounded-full">
              Emotional support, anytime
            </span>
            <h1 className="mt-6 font-heading text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-ink-900 leading-[1.05]">
              A companion that listens —<br />
              <span className="text-sage-500">without rushing you.</span>
            </h1>
            <p className="mt-6 text-lg text-ink-600 leading-relaxed max-w-xl">
              Talk through stress, loneliness, burnout or a heavy night. Mindful is a warm, voice-first AI built to
              help you feel heard and steadier — with practical, gentle next steps.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" data-testid="hero-start-btn">
                <Button size="lg" className="bg-ink-900 text-sand-50 hover:bg-ink-900/90 rounded-full px-7 h-12">
                  Start your first conversation
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="rounded-full px-7 h-12 border-border bg-sand-50">
                  I have an account
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-2 text-xs text-ink-600">
              <ShieldCheck weight="duotone" size={16} />
              Not a replacement for therapy. We surface crisis support when needed.
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative">
              <div
                className="aspect-[4/5] rounded-3xl bg-cover bg-center"
                style={{
                  backgroundImage: `url('https://images.pexels.com/photos/33050677/pexels-photo-33050677.jpeg')`,
                }}
              />
              <div className="absolute -bottom-6 -left-6 bento-card p-6 max-w-[260px] grain">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">Mindful, evening</p>
                <p className="mt-3 text-sm text-ink-900 leading-relaxed">
                  "That sounds heavy. Want to talk about what made today hardest, or sit quietly together for a minute?"
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="font-heading text-3xl font-medium text-ink-900">Built for the moments that hit hardest</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {[
            { icon: ChatCircleDots, title: "Voice & text chat", desc: "Push to talk, or type. Two modes — Pro and Gen Z — to match how you communicate." },
            { icon: Heart, title: "Mood tracking", desc: "Log how you actually feel. See patterns across sleep, energy and triggers." },
            { icon: NotePencil, title: "Guided journaling", desc: "Daily prompts that go deeper than 'how was your day'." },
            { icon: Wind, title: "Breath & calm", desc: "One tap, four-second inhale, four-second exhale. Built for panic moments." },
            { icon: Moon, title: "Sleep companion", desc: "Late-night dark mode for overthinking, loneliness and wind-down." },
            { icon: Leaf, title: "Habit builder", desc: "Tiny daily habits — sleep, hydration, gratitude — that compound." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bento-card p-6">
              <div className="w-10 h-10 rounded-xl bg-sage-100 grid place-items-center">
                <Icon weight="duotone" size={22} className="text-sage-700" />
              </div>
              <h3 className="font-heading text-lg font-medium mt-5 text-ink-900">{title}</h3>
              <p className="text-sm text-ink-600 mt-2 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-ink-600">
        Mindful is supportive companionship, not licensed therapy. In crisis, please reach a trained human.
      </footer>
    </div>
  );
}
