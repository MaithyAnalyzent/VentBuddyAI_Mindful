import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const rawApiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
const API_BASE = rawApiBase.replace(/\/+$/, "").endsWith("/api")
  ? rawApiBase.replace(/\/+$/, "")
  : `${rawApiBase.replace(/\/+$/, "")}/api`;

const tabs = [
  ["home", "⌂", "Home"],
  ["talk", "◌", "Talk"],
  ["mood", "♡", "Mood"],
  ["journal", "□", "Journal"],
  ["habits", "◇", "Habits"],
  ["breathe", "≋", "Breathe"],
  ["sleep", "☾", "Sleep"],
  ["therapist", "▤", "Therapist"],
];

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: options.body instanceof FormData ? {} : { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || `Request failed: ${response.status}`);
  }

  return response.json();
}

function playAudio(base64, fmt = "mp3") {
  if (!base64) return;
  const audio = new Audio(`data:audio/${fmt};base64,${base64}`);
  audio.play().catch(() => null);
}

function App() {
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState("landing");
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [activeTab, setActiveTab] = useState("home");
  const [mode, setMode] = useState("professional");
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [sessionQuery, setSessionQuery] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameText, setRenameText] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [moods, setMoods] = useState([]);
  const [moodForm, setMoodForm] = useState({ score: 6, energy: 5, sleep_quality: 6, note: "", triggers: "" });
  const [journalPrompts, setJournalPrompts] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [journal, setJournal] = useState("");
  const [habits, setHabits] = useState([]);
  const [habitName, setHabitName] = useState("");
  const [breathing, setBreathing] = useState({ active: false, seconds: 60, phase: "inhale" });
  const [therapist, setTherapist] = useState(null);
  const [telegram, setTelegram] = useState(null);
  const [checkin, setCheckin] = useState(null);
  const [feeling, setFeeling] = useState("");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const scrollRef = useRef(null);

  const firstName = (user?.name || "there").split(" ")[0];
  const moodAvg = average(moods, "score");
  const energyAvg = average(moods, "energy");
  const sleepAvg = average(moods, "sleep_quality");

  useEffect(() => {
    api("/auth/me").then(setUser).catch(() => null);
    api("/integrations/telegram").then(setTelegram).catch(() => null);
  }, []);

  useEffect(() => {
    if (!user) return;
    setMode(user.mode || "professional");
    refreshAll();
  }, [user]);

  useEffect(() => {
    if (activeTab === "therapist" && user) api("/therapist/summary").then(setTherapist).catch(() => null);
  }, [activeTab, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!breathing.active) return;
    const phases = ["inhale", "hold", "exhale", "rest"];
    const timer = setInterval(() => {
      setBreathing((current) => {
        const nextSeconds = Math.max(0, current.seconds - 1);
        const nextPhase = phases[(phases.indexOf(current.phase) + 1) % phases.length];
        if (nextSeconds === 0) {
          api("/breathing/sessions", {
            method: "POST",
            body: JSON.stringify({ technique: "box", duration_seconds: 60 }),
          }).catch(() => null);
          return { active: false, seconds: 60, phase: "inhale" };
        }
        return { ...current, seconds: nextSeconds, phase: nextSeconds % 4 === 0 ? nextPhase : current.phase };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [breathing.active]);

  async function refreshAll() {
    await Promise.all([loadSessions(), loadWellness()]);
  }

  async function loadSessions(q = sessionQuery) {
    const query = q ? `?q=${encodeURIComponent(q)}` : "";
    const data = await api(`/chat/sessions${query}`).catch(() => []);
    setSessions(data);
  }

  async function loadWellness() {
    const [trend, prompts, journals, habitList, todayCheckin] = await Promise.all([
      api("/mood/trends").catch(() => ({ items: [] })),
      api("/journal/prompts").catch(() => ({ prompts: [] })),
      api("/journal").catch(() => []),
      api("/habits").catch(() => []),
      api("/checkin/today").catch(() => null),
    ]);
    setMoods(trend.items || []);
    setJournalPrompts(prompts.prompts || []);
    setJournalEntries(journals || []);
    setHabits(habitList || []);
    setCheckin(todayCheckin);
  }

  async function submitAuth(event) {
    event.preventDefault();
    setError("");
    const payload = authMode === "register" ? authForm : { email: authForm.email, password: authForm.password };
    try {
      const nextUser = await api(`/auth/${authMode}`, { method: "POST", body: JSON.stringify(payload) });
      setUser(nextUser);
      setAuthView("app");
    } catch (err) {
      setError(err.message);
    }
  }

  async function switchMode(nextMode) {
    setMode(nextMode);
    await api("/user/mode", { method: "PATCH", body: JSON.stringify({ mode: nextMode }) }).catch(() => null);
  }

  function newChat() {
    setSessionId(null);
    setMessages([]);
    setActiveTab("talk");
  }

  async function openSession(id) {
    setSessionId(id);
    setActiveTab("talk");
    const data = await api(`/chat/sessions/${id}/messages`).catch(() => []);
    setMessages(data);
  }

  async function deleteSession(id) {
    await api(`/chat/sessions/${id}`, { method: "DELETE" }).catch(() => null);
    if (sessionId === id) newChat();
    loadSessions();
  }

  function startRename(session) {
    setRenamingId(session.id);
    setRenameText(session.title || "Untitled");
  }

  async function submitRename(id) {
    const title = renameText.trim();
    if (!title) {
      setRenamingId(null);
      return;
    }
    await api(`/chat/sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }).catch(() => null);
    setRenamingId(null);
    setRenameText("");
    loadSessions();
  }

  async function submitCheckin(value) {
    setFeeling(value);
    await api("/checkin/respond", {
      method: "POST",
      body: JSON.stringify({ feeling: value, note: "" }),
    }).catch(() => null);
    const today = await api("/checkin/today").catch(() => null);
    setCheckin(today);
  }

  async function sendMessage(event) {
    event?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setText("");
    setError("");
    setLoading(true);
    setMessages((items) => [...items, { role: "user", content: trimmed }]);
    try {
      const data = await api("/chat/send", {
        method: "POST",
        body: JSON.stringify({ text: trimmed, mode, session_id: sessionId, voice_reply: voiceReplies }),
      });
      setSessionId(data.session_id);
      setMessages((items) => [...items, assistantMessage(data)]);
      playAudio(data.audio_b64);
      loadSessions();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }

    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Microphone recording is not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported?.("audio/webm") ? "audio/webm" : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        await sendVoiceBlob(blob);
      };

      setRecording(true);
      recorder.start();
    } catch {
      setError("Please allow microphone access to talk with Mindful.");
    }
  }

  async function sendVoiceBlob(blob) {
    const form = new FormData();
    form.append("audio", blob, "voice.webm");
    form.append("mode", mode);
    form.append("voice_reply", String(voiceReplies));
    if (sessionId) form.append("session_id", sessionId);

    setLoading(true);
    try {
      const data = await api("/chat/voice", { method: "POST", body: form });
      setSessionId(data.session_id);
      setMessages((items) => [
        ...items,
        { role: "user", content: data.transcript },
        assistantMessage(data),
      ]);
      playAudio(data.audio_b64);
      loadSessions();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveMood(event) {
    event.preventDefault();
    await api("/mood", {
      method: "POST",
      body: JSON.stringify({
        score: Number(moodForm.score),
        energy: Number(moodForm.energy),
        sleep_quality: Number(moodForm.sleep_quality),
        triggers: moodForm.triggers.split(",").map((item) => item.trim()).filter(Boolean),
        note: moodForm.note,
      }),
    });
    setMoodForm({ score: 6, energy: 5, sleep_quality: 6, note: "", triggers: "" });
    loadWellness();
  }

  async function saveJournal(event) {
    event.preventDefault();
    if (!journal.trim()) return;
    await api("/journal", {
      method: "POST",
      body: JSON.stringify({ prompt: journalPrompts[0] || "", content: journal, mood_tag: "" }),
    });
    setJournal("");
    loadWellness();
  }

  async function addHabit(event) {
    event.preventDefault();
    if (!habitName.trim()) return;
    await api("/habits", {
      method: "POST",
      body: JSON.stringify({ name: habitName.trim(), icon: "leaf", target_per_week: 7 }),
    });
    setHabitName("");
    loadWellness();
  }

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => null);
    setUser(null);
    setMessages([]);
    setSessionId(null);
    setAuthView("landing");
  }

  if (!user && authView === "landing") {
    return <Landing onBegin={() => { setAuthView("auth"); setAuthMode("register"); }} onSignin={() => { setAuthView("auth"); setAuthMode("login"); }} />;
  }

  if (!user) {
    return (
      <main className="auth-page">
        <TopBrand minimal onSignin={() => setAuthView("landing")} />
        <section className="auth-card">
          <div>
            <p className="eyebrow">Private companion</p>
            <h1>Begin softly.</h1>
            <p className="muted">Sign in or create an account to keep your conversations, moods, habits, and reflections together.</p>
          </div>
          <form className="auth-form" onSubmit={submitAuth}>
            <div className="segmented wide">
              <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>Login</button>
              <button type="button" className={authMode === "register" ? "active" : ""} onClick={() => setAuthMode("register")}>Register</button>
            </div>
            {authMode === "register" && <input placeholder="Name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} required />}
            <input placeholder="Email" type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} required />
            <input placeholder="Password" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} required />
            {error && <p className="error">{error}</p>}
            <button className="dark-btn">{authMode === "login" ? "Login" : "Begin"}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="mindful-app">
      <header className="topbar">
        <Brand />
        <nav className="tabs-nav">
          {tabs.map(([id, icon, label]) => (
            <button key={id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <div className="segmented">
            <button className={mode === "professional" ? "active" : ""} onClick={() => switchMode("professional")}>PRO</button>
            <button className={mode === "genz" ? "active" : ""} onClick={() => switchMode("genz")}>GEN Z</button>
          </div>
          <button className="icon-text" onClick={logout}>⇥ {firstName}</button>
        </div>
      </header>

      {activeTab === "home" && (
        <Home
          firstName={firstName}
          moodAvg={moodAvg}
          energyAvg={energyAvg}
          sleepAvg={sleepAvg}
          logs={moods.length}
          setActiveTab={setActiveTab}
          newChat={newChat}
          checkin={checkin}
          feeling={feeling}
          submitCheckin={submitCheckin}
        />
      )}
      {activeTab === "talk" && (
        <Talk
          sessions={sessions}
          sessionQuery={sessionQuery}
          setSessionQuery={setSessionQuery}
          loadSessions={loadSessions}
          openSession={openSession}
          deleteSession={deleteSession}
          renamingId={renamingId}
          renameText={renameText}
          setRenameText={setRenameText}
          startRename={startRename}
          submitRename={submitRename}
          setRenamingId={setRenamingId}
          newChat={newChat}
          messages={messages}
          scrollRef={scrollRef}
          loading={loading}
          text={text}
          setText={setText}
          sendMessage={sendMessage}
          toggleRecording={toggleRecording}
          recording={recording}
          voiceReplies={voiceReplies}
          setVoiceReplies={setVoiceReplies}
          error={error}
          telegram={telegram}
        />
      )}
      {activeTab === "mood" && <Mood moodForm={moodForm} setMoodForm={setMoodForm} saveMood={saveMood} moods={moods} moodAvg={moodAvg} energyAvg={energyAvg} sleepAvg={sleepAvg} />}
      {activeTab === "journal" && <Journal prompts={journalPrompts} journal={journal} setJournal={setJournal} saveJournal={saveJournal} entries={journalEntries} />}
      {activeTab === "habits" && <Habits habitName={habitName} setHabitName={setHabitName} addHabit={addHabit} habits={habits} refresh={loadWellness} />}
      {activeTab === "breathe" && <Breathe breathing={breathing} setBreathing={setBreathing} />}
      {activeTab === "sleep" && <Sleep newChat={newChat} setText={setText} setActiveTab={setActiveTab} />}
      {activeTab === "therapist" && <Therapist summary={therapist} />}
    </main>
  );
}

function assistantMessage(data) {
  return {
    role: "assistant",
    content: data.reply,
    is_crisis: data.is_crisis,
    crisis_resources: data.crisis_resources,
  };
}

function average(items, key) {
  if (!items?.length) return 0;
  return Math.round((items.reduce((sum, item) => sum + Number(item[key] || 0), 0) / items.length) * 10) / 10;
}

function Brand() {
  return <div className="brand"><span>◇</span><strong>Mindful</strong></div>;
}

function TopBrand({ onSignin }) {
  return <header className="landing-top"><Brand /><button onClick={onSignin}>Sign in</button></header>;
}

function Landing({ onBegin, onSignin }) {
  return (
    <main className="landing">
      <TopBrand onSignin={onSignin} />
      <section className="hero">
        <div className="hero-copy">
          <p className="pill">Emotional support, anytime</p>
          <h1>A companion that listens <span>without rushing you.</span></h1>
          <p className="lead">Talk through stress, loneliness, burnout or a heavy night. Mindful is a warm, voice-first AI built to help you feel heard and steadier — with practical, gentle next steps.</p>
          <div className="hero-actions">
            <button className="dark-btn" onClick={onBegin}>Start your first conversation</button>
            <button className="soft-btn" onClick={onSignin}>I have an account</button>
          </div>
          <p className="fineprint">♡ Not a replacement for therapy. We surface crisis support when needed.</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="leaf-photo"></div>
          <div className="quote-card"><p className="eyebrow">Mindful evening</p><p>“That sounds heavy. Want to talk about what made today hardest, or sit quietly together for a minute?”</p></div>
        </div>
      </section>
      <section className="landing-section">
        <h2>Built for the moments that hit hardest</h2>
        <div className="feature-grid">
          {["Voice-first conversations", "Mood and sleep patterns", "Guided breathing", "Journaling prompts", "Tiny habits", "Sleep companion"].map((item) => <article className="feature-card" key={item}><span>◌</span><h3>{item}</h3><p>Gentle support that stays practical and human.</p></article>)}
        </div>
      </section>
    </main>
  );
}

function Home({ firstName, moodAvg, energyAvg, sleepAvg, logs, setActiveTab, newChat, checkin, feeling, submitCheckin }) {
  const prompt = checkin?.completed ? "You checked in today ✓" : checkin?.prompts?.[0] || "How are you feeling today?";
  return (
    <section className="page home-page">
      <div className="page-head split">
        <div>
          <p className="eyebrow">Good afternoon</p>
          <h1>Hey {firstName} — how’s your heart today?</h1>
          <p className="muted">Take a moment. Choose whatever feels right — even silence is a start.</p>
        </div>
        <button className="dark-pill" onClick={newChat}>◌ Talk to Mindful</button>
      </div>
      <article className="wide-card checkin-card">
        <div className="checkin-head">
          <div>
            <p className="eyebrow">Daily check-in</p>
            <h2>{prompt}</h2>
          </div>
          {checkin?.completed && <span className="logged-chip">Logged: {checkin.checkin?.feeling}</span>}
        </div>
        {!checkin?.completed && (
          <div className="chips">
            {["Heavy", "Anxious", "Numb", "Okay", "Hopeful", "Lighter"].map((label) => (
              <button className={feeling === label ? "selected" : ""} key={label} onClick={() => submitCheckin(label)}>{label}</button>
            ))}
          </div>
        )}
      </article>
      <div className="stats-grid">
        <Stat title="7-day mood" value={moodAvg} icon="♡" />
        <Stat title="7-day energy" value={energyAvg} icon="✧" />
        <Stat title="Sleep avg" value={sleepAvg} icon="☾" />
        <Stat title="Logs" value={logs} icon="▤" unit="" />
      </div>
      <div className="action-grid">
        {[
          ["◌", "Talk it out", "Voice or text. Pro or Gen Z mode.", "talk"],
          ["≋", "Breathe with me", "Box, 4-7-8, or guided rhythm.", "breathe"],
          ["□", "Write a little", "Soft prompts. No pressure.", "journal"],
          ["♡", "Log mood", "Score, sleep, triggers.", "mood"],
          ["◇", "Tiny habits", "Sleep, water, gratitude.", "habits"],
          ["☾", "Sleep mode", "For overthinking nights.", "sleep"],
        ].map(([icon, title, text, tab]) => <button className="action-card" key={title} onClick={() => setActiveTab(tab)}><span>{icon}</span><strong>{title}</strong><p>{text}</p></button>)}
      </div>
    </section>
  );
}

function Stat({ title, value, icon, unit = "/10" }) {
  return <article className="stat-card"><div><p className="eyebrow">{title}</p><strong>{value}</strong><span>{unit}</span></div><i>{icon}</i></article>;
}

function Talk(props) {
  return (
    <section className="talk-layout">
      <aside className="chat-history">
        <button className="dark-btn full" onClick={props.newChat}>+ New chat</button>
        <input placeholder="Search conversations" value={props.sessionQuery} onChange={(e) => { props.setSessionQuery(e.target.value); props.loadSessions(e.target.value); }} />
        <div className="session-list">
          {props.sessions.map((session) => (
            <article key={session.id} className="session-item">
              {props.renamingId === session.id ? (
                <div className="rename-row">
                  <input
                    autoFocus
                    value={props.renameText}
                    onChange={(e) => props.setRenameText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") props.submitRename(session.id);
                      if (e.key === "Escape") props.setRenamingId(null);
                    }}
                  />
                  <button onClick={() => props.submitRename(session.id)}>✓</button>
                  <button onClick={() => props.setRenamingId(null)}>×</button>
                </div>
              ) : (
                <>
                  <button onClick={() => props.openSession(session.id)}>
                    <strong>{session.channel === "telegram" ? "Telegram · " : ""}{session.title || "New conversation"}</strong>
                    <span>{session.last_message || session.last_emotion || "No messages yet"}</span>
                  </button>
                  <button className="rename" onClick={() => props.startRename(session)}>✎</button>
                  <button className="delete" onClick={() => props.deleteSession(session.id)}>×</button>
                </>
              )}
            </article>
          ))}
        </div>
        {props.telegram?.enabled && <a className="telegram-link" href={props.telegram.url} target="_blank" rel="noreferrer">Open Telegram</a>}
      </aside>
      <section className="talk-main">
        <div className="talk-header">
          <div><p className="eyebrow">Talk tab</p><h1>Say it however it comes out.</h1></div>
          <label className="toggle"><input type="checkbox" checked={props.voiceReplies} onChange={(e) => props.setVoiceReplies(e.target.checked)} /> Voice replies</label>
        </div>
        <div className="message-list" ref={props.scrollRef}>
          {!props.messages.length && <div className="empty-chat"><h2>I’m here. Start with one sentence, or press the mic and talk.</h2><p>No perfect wording needed.</p></div>}
          {props.messages.map((message, index) => (
            <article className={`bubble ${message.role}`} key={message.id || index}>
              <p>{message.content}</p>
              {message.crisis_resources && <div className="crisis-box"><strong>{message.crisis_resources.title}</strong><p>{message.crisis_resources.message}</p></div>}
            </article>
          ))}
          {props.loading && <article className="bubble assistant"><p>Let me sit with that for a second...</p></article>}
        </div>
        <form className="chat-composer" onSubmit={props.sendMessage}>
          <button type="button" className={props.recording ? "mic recording" : "mic"} onClick={props.toggleRecording}>{props.recording ? "■" : "●"}</button>
          <textarea placeholder="Talk to Mindful..." value={props.text} onChange={(e) => props.setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) props.sendMessage(e); }} />
          <button className="dark-btn">Send</button>
        </form>
        {props.error && <p className="error in-panel">{props.error}</p>}
      </section>
    </section>
  );
}

function Mood({ moodForm, setMoodForm, saveMood, moods, moodAvg, energyAvg, sleepAvg }) {
  return (
    <section className="page two-col-page">
      <div className="page-head"><p className="eyebrow">Mood</p><h1>Notice the pattern, not just the day.</h1></div>
      <form className="panel-form" onSubmit={saveMood}>
        <label>Mood score<input type="range" min="1" max="10" value={moodForm.score} onChange={(e) => setMoodForm({ ...moodForm, score: e.target.value })} /><b>{moodForm.score}/10</b></label>
        <label>Energy<input type="range" min="1" max="10" value={moodForm.energy} onChange={(e) => setMoodForm({ ...moodForm, energy: e.target.value })} /><b>{moodForm.energy}/10</b></label>
        <label>Sleep quality<input type="range" min="1" max="10" value={moodForm.sleep_quality} onChange={(e) => setMoodForm({ ...moodForm, sleep_quality: e.target.value })} /><b>{moodForm.sleep_quality}/10</b></label>
        <input placeholder="Triggers, comma separated" value={moodForm.triggers} onChange={(e) => setMoodForm({ ...moodForm, triggers: e.target.value })} />
        <textarea placeholder="A little context..." value={moodForm.note} onChange={(e) => setMoodForm({ ...moodForm, note: e.target.value })} />
        <button className="dark-btn">Save mood</button>
      </form>
      <div className="stacked">
        <Stat title="Mood avg" value={moodAvg} icon="♡" />
        <Stat title="Energy avg" value={energyAvg} icon="✧" />
        <Stat title="Sleep avg" value={sleepAvg} icon="☾" />
        <article className="wide-card"><p className="eyebrow">Logs</p><h2>{moods.length}</h2><p className="muted">Recent emotional check-ins saved.</p></article>
      </div>
    </section>
  );
}

function Journal({ prompts, journal, setJournal, saveJournal, entries }) {
  return (
    <section className="page two-col-page">
      <div className="page-head"><p className="eyebrow">Journal</p><h1>Write a little. No pressure.</h1></div>
      <form className="panel-form" onSubmit={saveJournal}>
        <p className="prompt">{prompts[0] || "What do I need right now that I haven’t asked for?"}</p>
        <textarea className="big-textarea" value={journal} onChange={(e) => setJournal(e.target.value)} placeholder="Start with one honest line..." />
        <button className="dark-btn">Save reflection</button>
      </form>
      <div className="stacked">{entries.slice(0, 5).map((entry) => <article className="wide-card" key={entry.id}><p className="eyebrow">{new Date(entry.created_at).toLocaleDateString()}</p><p>{entry.content}</p></article>)}</div>
    </section>
  );
}

function Habits({ habitName, setHabitName, addHabit, habits, refresh }) {
  async function toggle(habit) {
    await api("/habits/log", { method: "POST", body: JSON.stringify({ habit_id: habit.id, completed: !habit.completed_today }) });
    refresh();
  }
  return (
    <section className="page">
      <div className="page-head"><p className="eyebrow">Habits</p><h1>Tiny things count.</h1></div>
      <form className="inline-form" onSubmit={addHabit}><input placeholder="Hydration, sleep, walk..." value={habitName} onChange={(e) => setHabitName(e.target.value)} /><button className="dark-btn">Add habit</button></form>
      <div className="habit-grid">{habits.map((habit) => <article className="wide-card habit-card" key={habit.id}><div><h3>{habit.name}</h3><p className="muted">{habit.streak || 0} day streak</p></div><button className={habit.completed_today ? "dark-btn" : "soft-btn"} onClick={() => toggle(habit)}>{habit.completed_today ? "Done" : "Mark done"}</button></article>)}</div>
    </section>
  );
}

function Breathe({ breathing, setBreathing }) {
  return (
    <section className="page breathe-page">
      <p className="eyebrow">Breathe</p>
      <h1>Come back to now.</h1>
      <div className={breathing.active ? "breath-circle active" : "breath-circle"}><span>{breathing.phase}</span><strong>{breathing.seconds}</strong></div>
      <button className="dark-btn" onClick={() => setBreathing({ active: !breathing.active, seconds: 60, phase: "inhale" })}>{breathing.active ? "Stop" : "Start 60 seconds"}</button>
    </section>
  );
}

function Sleep({ newChat, setText, setActiveTab }) {
  function start(prompt) {
    newChat();
    setText(prompt);
    setActiveTab("talk");
  }
  return (
    <section className="page sleep-page">
      <p className="eyebrow">Sleep companion</p>
      <h1>For overthinking nights.</h1>
      <div className="action-grid">
        {["I can’t sleep and my thoughts won’t slow down.", "I feel lonely tonight.", "Help me wind down gently."].map((prompt) => <button className="action-card" key={prompt} onClick={() => start(prompt)}><span>☾</span><strong>{prompt}</strong><p>Start a soft late-night chat.</p></button>)}
      </div>
    </section>
  );
}

function Therapist({ summary }) {
  return (
    <section className="page">
      <p className="eyebrow">Therapist bridge</p>
      <h1>Bring the pattern, not the pressure.</h1>
      <article className="wide-card"><h2>Summary</h2><p>{summary?.summary || "Not enough data yet — chat, journal, or log moods to build your reflection."}</p></article>
      <div className="action-grid">{(summary?.reflection_topics || []).map((topic) => <article className="action-card" key={topic}><span>▤</span><strong>{topic}</strong></article>)}</div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
