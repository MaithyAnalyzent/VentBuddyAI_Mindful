import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

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

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [mode, setMode] = useState("professional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [moods, setMoods] = useState([]);
  const [journalPrompts, setJournalPrompts] = useState([]);
  const [telegram, setTelegram] = useState(null);
  const [moodForm, setMoodForm] = useState({ score: 6, energy: 5, sleep_quality: 6, note: "" });
  const [journal, setJournal] = useState("");
  const [habitName, setHabitName] = useState("");
  const [habits, setHabits] = useState([]);
  const fileRef = useRef(null);

  const sortedMessages = useMemo(() => messages.filter(Boolean), [messages]);

  useEffect(() => {
    api("/auth/me").then(setUser).catch(() => null);
    api("/integrations/telegram").then(setTelegram).catch(() => null);
  }, []);

  useEffect(() => {
    if (!user) return;
    setMode(user.mode || "professional");
    refreshWellness();
  }, [user]);

  async function refreshWellness() {
    const [moodTrend, prompts, habitList] = await Promise.all([
      api("/mood/trends").catch(() => ({ items: [] })),
      api("/journal/prompts").catch(() => ({ prompts: [] })),
      api("/habits").catch(() => []),
    ]);
    setMoods(moodTrend.items || []);
    setJournalPrompts(prompts.prompts || []);
    setHabits(habitList || []);
  }

  async function submitAuth(event) {
    event.preventDefault();
    setError("");
    try {
      const payload = authMode === "register" ? authForm : { email: authForm.email, password: authForm.password };
      const nextUser = await api(`/auth/${authMode}`, { method: "POST", body: JSON.stringify(payload) });
      setUser(nextUser);
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError("");
    setText("");
    setMessages((items) => [...items, { role: "user", content: trimmed }]);

    try {
      const data = await api("/chat/send", {
        method: "POST",
        body: JSON.stringify({ text: trimmed, mode, session_id: sessionId }),
      });
      setSessionId(data.session_id);
      setMessages((items) => [
        ...items,
        { role: "assistant", content: data.reply, is_crisis: data.is_crisis, crisis_resources: data.crisis_resources },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendVoice() {
    const file = fileRef.current?.files?.[0];
    if (!file || loading) return;
    const form = new FormData();
    form.append("audio", file);
    form.append("mode", mode);
    if (sessionId) form.append("session_id", sessionId);

    setLoading(true);
    setError("");
    try {
      const data = await api("/chat/voice", { method: "POST", body: form });
      setSessionId(data.session_id);
      setMessages((items) => [
        ...items,
        { role: "user", content: data.transcript },
        { role: "assistant", content: data.reply, is_crisis: data.is_crisis, crisis_resources: data.crisis_resources },
      ]);
      fileRef.current.value = "";
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
      body: JSON.stringify({ ...moodForm, triggers: [], note: moodForm.note }),
    });
    setMoodForm({ score: 6, energy: 5, sleep_quality: 6, note: "" });
    refreshWellness();
  }

  async function saveJournal(event) {
    event.preventDefault();
    if (!journal.trim()) return;
    await api("/journal", {
      method: "POST",
      body: JSON.stringify({ prompt: journalPrompts[0] || "", content: journal, mood_tag: "" }),
    });
    setJournal("");
  }

  async function addHabit(event) {
    event.preventDefault();
    if (!habitName.trim()) return;
    await api("/habits", {
      method: "POST",
      body: JSON.stringify({ name: habitName.trim(), icon: "leaf", target_per_week: 7 }),
    });
    setHabitName("");
    refreshWellness();
  }

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    setMessages([]);
    setSessionId(null);
  }

  if (!user) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <div>
            <p className="eyebrow">VentBuddy AI</p>
            <h1>Private mental wellness support that listens first.</h1>
            <p className="lead">
              A compassionate companion for stress, loneliness, anxiety, burnout, confusion, and difficult emotional moments.
            </p>
          </div>
          <form onSubmit={submitAuth} className="auth-form">
            <div className="tabs">
              <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>
                Login
              </button>
              <button type="button" className={authMode === "register" ? "active" : ""} onClick={() => setAuthMode("register")}>
                Register
              </button>
            </div>
            {authMode === "register" && (
              <input value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} placeholder="Name" required />
            )}
            <input value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} placeholder="Email" type="email" required />
            <input value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} placeholder="Password" type="password" required />
            {error && <p className="error">{error}</p>}
            <button className="primary">{authMode === "login" ? "Login" : "Create account"}</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">VentBuddy AI</p>
          <h2>Welcome, {user.name}</h2>
          <p>Talk through what feels heavy, then choose one grounded next step.</p>
        </div>
        <label>
          Conversation mode
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="professional">Calm</option>
            <option value="genz">Casual</option>
          </select>
        </label>
        {telegram?.enabled && (
          <a className="telegram-link" href={telegram.url} target="_blank" rel="noreferrer">
            Continue on Telegram
          </a>
        )}
        <button className="ghost" onClick={() => { setSessionId(null); setMessages([]); }}>New conversation</button>
        <button className="ghost" onClick={logout}>Logout</button>
      </aside>

      <section className="chat-panel">
        <div className="messages">
          {sortedMessages.length === 0 && (
            <div className="empty-state">
              <h1>What’s been weighing on you?</h1>
              <p>You can vent, ask for perspective, or start with one messy sentence.</p>
            </div>
          )}
          {sortedMessages.map((message, index) => (
            <article key={index} className={`message ${message.role}`}>
              <p>{message.content}</p>
              {message.crisis_resources && (
                <div className="crisis">
                  <strong>{message.crisis_resources.title}</strong>
                  <p>{message.crisis_resources.message}</p>
                </div>
              )}
            </article>
          ))}
          {loading && <article className="message assistant"><p>Taking a moment with that...</p></article>}
        </div>
        <form className="composer" onSubmit={sendMessage}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Tell VentBuddy AI what’s on your mind..." />
          <button className="primary">Send</button>
        </form>
        <div className="voice-row">
          <input ref={fileRef} type="file" accept="audio/*" />
          <button className="ghost" onClick={sendVoice} type="button">Send voice</button>
        </div>
        {error && <p className="error">{error}</p>}
      </section>

      <aside className="wellness-panel">
        <section>
          <h3>Quick mood log</h3>
          <form onSubmit={saveMood} className="stack">
            <label>Mood <input type="number" min="1" max="10" value={moodForm.score} onChange={(e) => setMoodForm({ ...moodForm, score: Number(e.target.value) })} /></label>
            <label>Energy <input type="number" min="1" max="10" value={moodForm.energy} onChange={(e) => setMoodForm({ ...moodForm, energy: Number(e.target.value) })} /></label>
            <label>Sleep <input type="number" min="1" max="10" value={moodForm.sleep_quality} onChange={(e) => setMoodForm({ ...moodForm, sleep_quality: Number(e.target.value) })} /></label>
            <textarea value={moodForm.note} onChange={(e) => setMoodForm({ ...moodForm, note: e.target.value })} placeholder="A few words about today" />
            <button className="primary">Save mood</button>
          </form>
        </section>
        <section>
          <h3>Journal</h3>
          <p className="prompt">{journalPrompts[0] || "What do you need right now?"}</p>
          <form onSubmit={saveJournal} className="stack">
            <textarea value={journal} onChange={(e) => setJournal(e.target.value)} placeholder="Write one honest line..." />
            <button className="primary">Save reflection</button>
          </form>
        </section>
        <section>
          <h3>Habits</h3>
          <form onSubmit={addHabit} className="inline">
            <input value={habitName} onChange={(e) => setHabitName(e.target.value)} placeholder="Small habit" />
            <button className="primary">Add</button>
          </form>
          <ul className="habit-list">
            {habits.map((habit) => <li key={habit.id}>{habit.name}<span>{habit.streak || 0} day streak</span></li>)}
          </ul>
        </section>
        <section>
          <h3>Recent trend</h3>
          <p>{moods.length ? `${moods.length} mood logs recorded.` : "No mood logs yet."}</p>
        </section>
      </aside>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
