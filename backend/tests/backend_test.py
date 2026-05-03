"""End-to-end backend API tests for VentBuddy AI.

Covers: health, auth (register/login/logout/me/refresh), user settings,
chat (text + crisis detection + sessions), mood, journal, habits,
breathing, daily check-in, therapist summary, crisis resources, and
unauthenticated 401 enforcement.

Auth is httpOnly-cookie based; we use a single requests.Session per test
class so cookies persist between calls.
"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("VITE_API_BASE_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@mindful.app"
ADMIN_PASSWORD = "Admin@123"


# -------- Fixtures --------
@pytest.fixture(scope="module")
def fresh_user_session():
    """Register a brand-new user and return an authenticated requests.Session."""
    s = requests.Session()
    email = f"test_{uuid.uuid4().hex[:10]}@example.com"
    payload = {"email": email, "password": "TestPass@123", "name": "Test User"}
    r = s.post(f"{API}/auth/register", json=payload, timeout=30)
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["email"] == email
    assert "id" in data
    assert "_id" not in data
    s._user = data
    s._email = email
    s._password = "TestPass@123"
    return s


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


# -------- Health --------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        assert "service" in data


# -------- Crisis resources (public) --------
class TestCrisisPublic:
    def test_resources(self):
        r = requests.get(f"{API}/crisis/resources", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "resources" in data and isinstance(data["resources"], list)
        assert len(data["resources"]) >= 3


# -------- Auth flow --------
class TestAuth:
    def test_admin_login(self, admin_session):
        r = admin_session.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == ADMIN_EMAIL
        assert "_id" not in u
        assert "password_hash" not in u

    def test_register_duplicate(self, fresh_user_session):
        r = requests.post(f"{API}/auth/register", json={
            "email": fresh_user_session._email,
            "password": "Whatever@1",
            "name": "Dup",
        }, timeout=15)
        assert r.status_code == 400

    def test_login_wrong_password(self, fresh_user_session):
        r = requests.post(f"{API}/auth/login", json={
            "email": fresh_user_session._email,
            "password": "WrongPass@1",
        }, timeout=15)
        assert r.status_code == 401

    def test_me_authenticated(self, fresh_user_session):
        r = fresh_user_session.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == fresh_user_session._email
        assert u["mode"] == "professional"
        assert "_id" not in u
        assert "password_hash" not in u

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_login_sets_cookies(self, fresh_user_session):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={
            "email": fresh_user_session._email,
            "password": fresh_user_session._password,
        }, timeout=15)
        assert r.status_code == 200
        cookie_names = {c.name for c in s.cookies}
        assert "access_token" in cookie_names
        assert "refresh_token" in cookie_names
        # confirm authenticated request works
        r2 = s.get(f"{API}/auth/me", timeout=15)
        assert r2.status_code == 200

    def test_logout_clears_cookies(self, fresh_user_session):
        # use a separate session so we don't break the module-scoped one
        s = requests.Session()
        s.post(f"{API}/auth/login", json={
            "email": fresh_user_session._email,
            "password": fresh_user_session._password,
        }, timeout=15)
        r = s.post(f"{API}/auth/logout", timeout=15)
        assert r.status_code == 200
        # After logout, /auth/me must reject (cookies cleared)
        s.cookies.clear()
        r2 = s.get(f"{API}/auth/me", timeout=15)
        assert r2.status_code == 401


# -------- User settings --------
class TestUserSettings:
    def test_update_mode_genz(self, fresh_user_session):
        r = fresh_user_session.patch(f"{API}/user/mode", json={"mode": "genz"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["mode"] == "genz"
        # verify persisted
        me = fresh_user_session.get(f"{API}/auth/me", timeout=15).json()
        assert me["mode"] == "genz"

    def test_update_mode_back_professional(self, fresh_user_session):
        r = fresh_user_session.patch(f"{API}/user/mode", json={"mode": "professional"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["mode"] == "professional"

    def test_update_voice(self, fresh_user_session):
        r = fresh_user_session.patch(f"{API}/user/voice", json={"voice": "alloy"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["voice"] == "alloy"
        me = fresh_user_session.get(f"{API}/auth/me", timeout=15).json()
        assert me["voice"] == "alloy"


# -------- Chat (uses real LLM) --------
class TestChat:
    SESSION_ID_HOLDER = {}

    def test_chat_send_text(self, fresh_user_session):
        r = fresh_user_session.post(f"{API}/chat/send", json={
            "text": "I had a stressful day at work and feel anxious.",
            "mode": "professional",
        }, timeout=90)
        assert r.status_code == 200, f"Chat failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("session_id")
        assert isinstance(data.get("reply"), str) and len(data["reply"]) > 0
        assert data.get("emotion") == "anxiety"
        assert data.get("is_crisis") is False
        assert data.get("crisis_resources") is None
        TestChat.SESSION_ID_HOLDER["sid"] = data["session_id"]

    def test_chat_crisis_detection(self, fresh_user_session):
        r = fresh_user_session.post(f"{API}/chat/send", json={
            "text": "I want to kill myself, I can't take this anymore.",
            "mode": "professional",
        }, timeout=90)
        assert r.status_code == 200
        data = r.json()
        assert data.get("is_crisis") is True
        assert data.get("crisis_resources") is not None
        assert "resources" in data["crisis_resources"]
        assert isinstance(data["reply"], str) and len(data["reply"]) > 0

    def test_list_sessions(self, fresh_user_session):
        r = fresh_user_session.get(f"{API}/chat/sessions", timeout=15)
        assert r.status_code == 200
        sessions = r.json()
        assert isinstance(sessions, list)
        assert len(sessions) >= 1
        # Verify no _id leakage
        for s in sessions:
            assert "_id" not in s
            assert "user_id" in s and "id" in s

    def test_get_messages(self, fresh_user_session):
        sid = TestChat.SESSION_ID_HOLDER.get("sid")
        assert sid, "previous test must have set session id"
        r = fresh_user_session.get(f"{API}/chat/sessions/{sid}/messages", timeout=15)
        assert r.status_code == 200
        msgs = r.json()
        assert isinstance(msgs, list)
        assert len(msgs) >= 2  # user + assistant
        roles = [m["role"] for m in msgs]
        assert "user" in roles and "assistant" in roles
        for m in msgs:
            assert "_id" not in m

    def test_delete_session(self, fresh_user_session):
        sid = TestChat.SESSION_ID_HOLDER.get("sid")
        assert sid
        r = fresh_user_session.delete(f"{API}/chat/sessions/{sid}", timeout=15)
        assert r.status_code == 200
        # confirm gone (messages list empty)
        r2 = fresh_user_session.get(f"{API}/chat/sessions/{sid}/messages", timeout=15)
        assert r2.status_code == 200
        assert r2.json() == []


# -------- Mood --------
class TestMood:
    def test_log_mood(self, fresh_user_session):
        payload = {"score": 7, "energy": 6, "sleep_quality": 8,
                   "triggers": ["work", "sleep"], "note": "TEST_ ok day"}
        r = fresh_user_session.post(f"{API}/mood", json=payload, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["score"] == 7
        assert d["energy"] == 6
        assert d["sleep_quality"] == 8
        assert d["triggers"] == ["work", "sleep"]
        assert "_id" not in d
        assert "id" in d

    def test_mood_trends(self, fresh_user_session):
        r = fresh_user_session.get(f"{API}/mood/trends", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "avg_score" in d and "avg_energy" in d and "avg_sleep" in d
        assert len(d["items"]) >= 1
        assert d["avg_score"] >= 1


# -------- Journal --------
class TestJournal:
    JOURNAL_ID = {}

    def test_prompts(self, fresh_user_session):
        r = fresh_user_session.get(f"{API}/journal/prompts", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "prompts" in d and isinstance(d["prompts"], list) and len(d["prompts"]) >= 3

    def test_create_journal(self, fresh_user_session):
        r = fresh_user_session.post(f"{API}/journal", json={
            "prompt": "What hurt today?",
            "content": "TEST_ Today felt heavy but I noticed small wins.",
            "mood_tag": "tender",
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["content"].startswith("TEST_")
        assert d["mood_tag"] == "tender"
        assert "_id" not in d
        TestJournal.JOURNAL_ID["id"] = d["id"]

    def test_list_journals(self, fresh_user_session):
        r = fresh_user_session.get(f"{API}/journal", timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 1
        assert any(j["id"] == TestJournal.JOURNAL_ID["id"] for j in items)
        for j in items:
            assert "_id" not in j

    def test_delete_journal(self, fresh_user_session):
        jid = TestJournal.JOURNAL_ID["id"]
        r = fresh_user_session.delete(f"{API}/journal/{jid}", timeout=15)
        assert r.status_code == 200
        items = fresh_user_session.get(f"{API}/journal", timeout=15).json()
        assert all(j["id"] != jid for j in items)


# -------- Habits --------
class TestHabits:
    HABIT_ID = {}

    def test_create_habit(self, fresh_user_session):
        r = fresh_user_session.post(f"{API}/habits", json={
            "name": "TEST_ Meditate",
            "icon": "leaf",
            "target_per_week": 5,
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["name"] == "TEST_ Meditate"
        assert d["target_per_week"] == 5
        assert "_id" not in d
        TestHabits.HABIT_ID["id"] = d["id"]

    def test_list_habits_completed_today_false(self, fresh_user_session):
        r = fresh_user_session.get(f"{API}/habits", timeout=15)
        assert r.status_code == 200
        habits = r.json()
        h = next(x for x in habits if x["id"] == TestHabits.HABIT_ID["id"])
        assert h["completed_today"] is False
        # New consecutive-day streak: a fresh habit with no logs should be 0
        assert h["streak"] == 0

    def test_log_habit_complete(self, fresh_user_session):
        r = fresh_user_session.post(f"{API}/habits/log", json={
            "habit_id": TestHabits.HABIT_ID["id"],
            "completed": True,
        }, timeout=15)
        assert r.status_code == 200
        assert r.json()["completed"] is True
        habits = fresh_user_session.get(f"{API}/habits", timeout=15).json()
        h = next(x for x in habits if x["id"] == TestHabits.HABIT_ID["id"])
        assert h["completed_today"] is True
        # New consecutive-day streak: after one log_today=True, streak should be exactly 1
        assert h["streak"] == 1

    def test_log_habit_same_day_idempotent_streak(self, fresh_user_session):
        # Two logs on same day must still count as streak=1
        r = fresh_user_session.post(f"{API}/habits/log", json={
            "habit_id": TestHabits.HABIT_ID["id"],
            "completed": True,
        }, timeout=15)
        assert r.status_code == 200
        habits = fresh_user_session.get(f"{API}/habits", timeout=15).json()
        h = next(x for x in habits if x["id"] == TestHabits.HABIT_ID["id"])
        assert h["streak"] == 1
        assert h["completed_today"] is True

    def test_log_habit_toggle_off(self, fresh_user_session):
        r = fresh_user_session.post(f"{API}/habits/log", json={
            "habit_id": TestHabits.HABIT_ID["id"],
            "completed": False,
        }, timeout=15)
        assert r.status_code == 200
        habits = fresh_user_session.get(f"{API}/habits", timeout=15).json()
        h = next(x for x in habits if x["id"] == TestHabits.HABIT_ID["id"])
        assert h["completed_today"] is False

    def test_delete_habit(self, fresh_user_session):
        hid = TestHabits.HABIT_ID["id"]
        r = fresh_user_session.delete(f"{API}/habits/{hid}", timeout=15)
        assert r.status_code == 200
        habits = fresh_user_session.get(f"{API}/habits", timeout=15).json()
        assert all(h["id"] != hid for h in habits)


# -------- Breathing --------
class TestBreathing:
    def test_log_breathing(self, fresh_user_session):
        r = fresh_user_session.post(f"{API}/breathing/sessions", json={
            "technique": "box", "duration_seconds": 120,
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["technique"] == "box"
        assert d["duration_seconds"] == 120
        assert "_id" not in d


# -------- Daily check-in --------
class TestCheckin:
    def test_today_initially(self, fresh_user_session):
        r = fresh_user_session.get(f"{API}/checkin/today", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "completed" in d and "prompts" in d
        assert isinstance(d["prompts"], list) and len(d["prompts"]) >= 3

    def test_respond(self, fresh_user_session):
        r = fresh_user_session.post(f"{API}/checkin/respond", json={
            "feeling": "tired", "note": "TEST_ slept badly",
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["feeling"] == "tired"
        assert "_id" not in d

    def test_today_after_idempotent(self, fresh_user_session):
        # second respond should upsert (no duplicate)
        r = fresh_user_session.post(f"{API}/checkin/respond", json={
            "feeling": "okay", "note": "TEST_ updated",
        }, timeout=15)
        assert r.status_code == 200
        r2 = fresh_user_session.get(f"{API}/checkin/today", timeout=15)
        d = r2.json()
        assert d["completed"] is True
        assert d["checkin"]["feeling"] == "okay"


# -------- Therapist summary --------
class TestTherapistSummary:
    def test_summary(self, fresh_user_session):
        r = fresh_user_session.get(f"{API}/therapist/summary", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ["summary", "avg_mood", "avg_sleep", "top_triggers",
                  "recurring_emotions", "reflection_topics"]:
            assert k in d, f"Missing key {k}"
        assert isinstance(d["reflection_topics"], list)
        assert len(d["reflection_topics"]) >= 1


# -------- Unauthenticated 401 enforcement --------
class TestUnauthEnforcement:
    AUTH_REQUIRED_ENDPOINTS = [
        ("GET", "/auth/me"),
        ("PATCH", "/user/mode"),
        ("PATCH", "/user/voice"),
        ("POST", "/chat/send"),
        ("GET", "/chat/sessions"),
        ("POST", "/mood"),
        ("GET", "/mood/trends"),
        ("GET", "/journal/prompts"),
        ("POST", "/journal"),
        ("GET", "/journal"),
        ("POST", "/habits"),
        ("GET", "/habits"),
        ("POST", "/habits/log"),
        ("POST", "/breathing/sessions"),
        ("GET", "/checkin/today"),
        ("POST", "/checkin/respond"),
        ("GET", "/therapist/summary"),
    ]

    @pytest.mark.parametrize("method,path", AUTH_REQUIRED_ENDPOINTS)
    def test_requires_auth(self, method, path):
        r = requests.request(method, f"{API}{path}", json={}, timeout=15)
        assert r.status_code == 401, (
            f"{method} {path} expected 401, got {r.status_code}: {r.text[:200]}"
        )


# -------- Iteration 2: Chat session titles, rename, search, channel --------
class TestChatSessionsV2:
    """New session lifecycle: title auto-generated from first message,
    PATCH rename, GET search via q, channel field, and ownership."""

    def _new_user(self):
        s = requests.Session()
        email = f"test_{uuid.uuid4().hex[:10]}@example.com"
        r = s.post(f"{API}/auth/register", json={
            "email": email, "password": "TestPass@123", "name": "V2 User",
        }, timeout=30)
        assert r.status_code == 200, r.text
        s._email = email
        return s

    def test_first_message_sets_auto_title(self):
        s = self._new_user()
        first_msg = "Today was a really really long day and I feel exhausted from work"
        r = s.post(f"{API}/chat/send", json={
            "text": first_msg, "mode": "professional",
        }, timeout=90)
        assert r.status_code == 200, r.text
        sid = r.json()["session_id"]

        # Find session in listing & verify title auto-generated
        sessions = s.get(f"{API}/chat/sessions", timeout=15).json()
        sess = next((x for x in sessions if x["id"] == sid), None)
        assert sess is not None
        assert sess.get("title"), f"title missing: {sess}"
        # auto_title takes first ~48 chars and adds ellipsis if longer
        assert sess["title"].startswith("Today was a really really")
        # channel should be web for web-created sessions
        assert sess.get("channel") == "web"
        # store for next tests
        TestChatSessionsV2.SID = sid
        TestChatSessionsV2.SESSION_TOKEN = s

    def test_rename_session_success(self):
        s = TestChatSessionsV2.SESSION_TOKEN
        sid = TestChatSessionsV2.SID
        r = s.patch(f"{API}/chat/sessions/{sid}",
                    json={"title": "TEST_ My Renamed Chat"}, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is True
        assert d.get("title") == "TEST_ My Renamed Chat"
        # verify persisted in listing
        sessions = s.get(f"{API}/chat/sessions", timeout=15).json()
        sess = next((x for x in sessions if x["id"] == sid), None)
        assert sess is not None and sess["title"] == "TEST_ My Renamed Chat"

    def test_rename_session_empty_title_400(self):
        s = TestChatSessionsV2.SESSION_TOKEN
        sid = TestChatSessionsV2.SID
        r = s.patch(f"{API}/chat/sessions/{sid}", json={"title": "   "}, timeout=15)
        assert r.status_code == 400

    def test_rename_session_not_found_404(self):
        s = TestChatSessionsV2.SESSION_TOKEN
        r = s.patch(f"{API}/chat/sessions/does-not-exist-{uuid.uuid4().hex}",
                    json={"title": "x"}, timeout=15)
        assert r.status_code == 404

    def test_rename_session_other_user_404(self):
        # User B creates a session, then User A tries to rename → 404 (ownership)
        owner = self._new_user()
        r = owner.post(f"{API}/chat/send", json={
            "text": "Owner only message about gardening", "mode": "professional",
        }, timeout=90)
        assert r.status_code == 200
        owner_sid = r.json()["session_id"]

        attacker = self._new_user()
        r2 = attacker.patch(f"{API}/chat/sessions/{owner_sid}",
                            json={"title": "hacked"}, timeout=15)
        assert r2.status_code == 404, f"expected 404 ownership, got {r2.status_code}: {r2.text}"

        # And attacker cannot delete either
        r3 = attacker.delete(f"{API}/chat/sessions/{owner_sid}", timeout=15)
        # delete returns 200 but should be a no-op; verify owner still has session
        owner_sessions = owner.get(f"{API}/chat/sessions", timeout=15).json()
        assert any(x["id"] == owner_sid for x in owner_sessions), \
            "Attacker delete should not have removed owner's session"

    def test_search_sessions_q_param(self):
        s = TestChatSessionsV2.SESSION_TOKEN
        # The session has been renamed to "TEST_ My Renamed Chat"
        r = s.get(f"{API}/chat/sessions", params={"q": "renamed"}, timeout=15)
        assert r.status_code == 200
        results = r.json()
        assert isinstance(results, list)
        ids = [x["id"] for x in results]
        assert TestChatSessionsV2.SID in ids, f"search did not return renamed session: {results}"
        # negative
        r2 = s.get(f"{API}/chat/sessions", params={"q": "zzznotexisting_xyz"}, timeout=15)
        assert r2.status_code == 200
        ids2 = [x["id"] for x in r2.json()]
        assert TestChatSessionsV2.SID not in ids2


# -------- Iteration 2: AI tone (humanized) --------
class TestAITone:
    BANNED_OPENERS = (
        "i'm sorry to hear",
        "i am sorry to hear",
        "it sounds like you",
        "that must be really hard",
    )

    def test_reply_does_not_use_robotic_openers(self, fresh_user_session):
        r = fresh_user_session.post(f"{API}/chat/send", json={
            "text": "I had a really rough day at work",
            "mode": "professional",
        }, timeout=90)
        assert r.status_code == 200, r.text
        reply = (r.json().get("reply") or "").strip().lower()
        assert reply, "empty reply"
        for opener in TestAITone.BANNED_OPENERS:
            assert not reply.startswith(opener), (
                f"Robotic opener detected: '{opener}'. Reply was: {reply[:200]}"
            )


# -------- Iteration 2: Telegram public info --------
class TestTelegramInfo:
    def test_telegram_info_public(self):
        # Endpoint is public (no auth)
        r = requests.get(f"{API}/integrations/telegram", timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("enabled") is True, f"Telegram not enabled: {d}"
        assert "name" in d
        if d.get("enabled"):
            assert d.get("username")
            assert d.get("url", "").startswith("https://t.me/")
