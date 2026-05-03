"""Optional Telegram bot for VentBuddy AI."""
from __future__ import annotations

import io
import logging
import uuid
from datetime import datetime, timezone

from app.core.config import settings
from app.services.ai_service import (
    detect_crisis, detect_emotion, get_system_message,
    generate_chat_response, transcribe_audio, synthesize_speech_bytes,
    get_crisis_resources, auto_title,
)

log = logging.getLogger("vent_buddy")

WELCOME = (
    "Hey — I'm VentBuddy AI. I'm here to listen, no pressure.\n\n"
    "Send whatever's on your mind, messy or unfinished. Text is fine, voice notes are fine. "
    "I'll try to understand what's underneath it and help you find one steadier next step.\n\n"
    "Quick commands:\n"
    "• /new — start a fresh conversation\n"
    "• /mode pro — calm, grounded tone\n"
    "• /mode genz — casual, real-talk tone\n"
    "• /voice on — I'll reply with voice notes\n"
    "• /voice off — text only\n"
    "• /checkin — quick wellness prompt\n\n"
    "If you're in crisis or might hurt yourself, please reach a human you trust, emergency services, "
    "or a crisis line now. You don't have to hold that alone."
)


async def _ensure_tg_user(db, tg_user, chat_id: int):
    """Find or create a Mindful user record for this Telegram user."""
    existing = await db.users.find_one({"telegram_chat_id": chat_id})
    if existing:
        return existing
    user_id = str(uuid.uuid4())
    name = (tg_user.first_name or "").strip() or "Friend"
    if tg_user.last_name:
        name = f"{name} {tg_user.last_name}".strip()
    doc = {
        "id": user_id,
        "email": f"tg_{tg_user.id}@telegram.local",
        "name": name,
        "password_hash": "",
        "role": "telegram",
        "mode": "professional",
        "voice": "shimmer",
        "voice_reply": False,
        "telegram_chat_id": chat_id,
        "telegram_user_id": tg_user.id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await db.users.insert_one(doc)
    except Exception:
        log.exception("Failed to insert telegram user")
    return doc


async def _get_active_session(db, user_id: str) -> str:
    """Return the user's active Telegram session id, creating one if needed."""
    state = await db.tg_state.find_one({"user_id": user_id})
    if state and state.get("active_session_id"):
        return state["active_session_id"]
    new_sid = str(uuid.uuid4())
    await db.tg_state.update_one(
        {"user_id": user_id},
        {"$set": {"user_id": user_id, "active_session_id": new_sid}},
        upsert=True,
    )
    return new_sid


async def _set_active_session(db, user_id: str, session_id: str):
    await db.tg_state.update_one(
        {"user_id": user_id},
        {"$set": {"user_id": user_id, "active_session_id": session_id}},
        upsert=True,
    )


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def build_application(db, openai_api_key: str):
    from telegram import Update
    from telegram.ext import (
        Application, CommandHandler, MessageHandler, ContextTypes, filters,
    )

    token = settings.telegram_bot_token
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN not set")

    application = Application.builder().token(token).build()

    # ---- handlers ----
    async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        chat_id = update.effective_chat.id
        user = await _ensure_tg_user(db, update.effective_user, chat_id)
        await _set_active_session(db, user["id"], str(uuid.uuid4()))
        await ctx.bot.send_message(chat_id=chat_id, text=WELCOME)

    async def cmd_new(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        chat_id = update.effective_chat.id
        user = await _ensure_tg_user(db, update.effective_user, chat_id)
        new_sid = str(uuid.uuid4())
        await _set_active_session(db, user["id"], new_sid)
        msg = "fresh start. what's weighing on you?" if user.get("mode") == "genz" else "Starting fresh. What feels most important to talk through?"
        await ctx.bot.send_message(chat_id=chat_id, text=msg)

    async def cmd_mode(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        chat_id = update.effective_chat.id
        user = await _ensure_tg_user(db, update.effective_user, chat_id)
        args = ctx.args or []
        if not args:
            await ctx.bot.send_message(chat_id=chat_id, text=f"Current mode: *{user.get('mode', 'professional')}*\n\nUse `/mode pro` or `/mode genz` to switch.", parse_mode="Markdown")
            return
        choice = args[0].lower()
        if choice in ("pro", "professional"):
            mode = "professional"
        elif choice in ("genz", "gen-z", "gen_z", "z"):
            mode = "genz"
        else:
            await ctx.bot.send_message(chat_id=chat_id, text="Use `/mode pro` or `/mode genz`.", parse_mode="Markdown")
            return
        await db.users.update_one({"id": user["id"]}, {"$set": {"mode": mode}})
        confirm = "Switched to casual mode. Talk to me however." if mode == "genz" else "Switched to calm mode."
        await ctx.bot.send_message(chat_id=chat_id, text=confirm)

    async def cmd_voice(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        chat_id = update.effective_chat.id
        user = await _ensure_tg_user(db, update.effective_user, chat_id)
        args = ctx.args or []
        if not args:
            cur = "on" if user.get("voice_reply") else "off"
            await ctx.bot.send_message(chat_id=chat_id, text=f"Voice replies are *{cur}*.\nUse `/voice on` or `/voice off`.", parse_mode="Markdown")
            return
        val = args[0].lower() in ("on", "yes", "true", "1")
        await db.users.update_one({"id": user["id"]}, {"$set": {"voice_reply": val}})
        await ctx.bot.send_message(chat_id=chat_id, text=f"Voice replies turned {'on' if val else 'off'}.")

    async def cmd_checkin(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        chat_id = update.effective_chat.id
        user = await _ensure_tg_user(db, update.effective_user, chat_id)
        if user.get("mode") == "genz":
            text = "real check — how are you actually doing today? one word, one sentence, whatever."
        else:
            text = "A small check-in: how are you really doing today? Even one word is a place to start."
        await ctx.bot.send_message(chat_id=chat_id, text=text)

    async def cmd_help(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        await ctx.bot.send_message(chat_id=update.effective_chat.id, text=WELCOME)

    async def _process_user_text(chat_id: int, user: dict, text: str, ctx: ContextTypes.DEFAULT_TYPE):
        """Shared: store user msg, generate AI reply, store + send."""
        is_crisis = detect_crisis(text)
        emotion = detect_emotion(text)
        mode = user.get("mode", "professional")
        sid = await _get_active_session(db, user["id"])

        # store user message
        user_msg_id = str(uuid.uuid4())
        await db.messages.insert_one({
            "id": user_msg_id, "user_id": user["id"], "session_id": sid,
            "role": "user", "content": text, "emotion": emotion, "is_crisis": is_crisis,
            "mode": mode, "channel": "telegram", "created_at": _now_iso(),
        })

        # check if first user msg in session → set title
        existing = await db.sessions.find_one({"id": sid, "user_id": user["id"]})
        if not existing:
            await db.sessions.insert_one({
                "id": sid, "user_id": user["id"], "mode": mode,
                "title": auto_title(text), "channel": "telegram",
                "created_at": _now_iso(), "updated_at": _now_iso(),
            })

        # show typing
        try:
            await ctx.bot.send_chat_action(chat_id=chat_id, action="typing")
        except Exception:
            pass

        system = get_system_message(mode, emotion, is_crisis, channel="telegram")
        scoped = f"{user['id']}_{sid}_{mode}_tg"
        try:
            history = await db.messages.find(
                {"user_id": user["id"], "session_id": sid, "id": {"$ne": user_msg_id}, "role": {"$in": ["user", "assistant"]}},
                {"_id": 0, "role": 1, "content": 1},
            ).sort("created_at", -1).to_list(12)
            history.reverse()
            reply = await generate_chat_response(openai_api_key, scoped, system, text, history=history)
        except Exception:
            log.exception("LLM failed in tg")
            reply = "I'm here. Something on my end glitched for a moment — try sending that again?"

        await db.messages.insert_one({
            "id": str(uuid.uuid4()), "user_id": user["id"], "session_id": sid,
            "role": "assistant", "content": reply, "emotion": emotion, "is_crisis": is_crisis,
            "mode": mode, "channel": "telegram", "created_at": _now_iso(),
        })
        await db.sessions.update_one(
            {"id": sid, "user_id": user["id"]},
            {"$set": {"last_message": reply[:160], "last_emotion": emotion, "updated_at": _now_iso()}},
        )

        # Send text
        await ctx.bot.send_message(chat_id=chat_id, text=reply)

        # Crisis resources
        if is_crisis:
            res = get_crisis_resources()
            lines = [f"*{res['title']}*", "", res["message"], ""]
            for r in res["resources"]:
                lines.append(f"• {r['name']}: {r['contact']}")
            await ctx.bot.send_message(chat_id=chat_id, text="\n".join(lines), parse_mode="Markdown")

        # Voice reply
        if user.get("voice_reply"):
            try:
                audio = await synthesize_speech_bytes(openai_api_key, reply, voice=user.get("voice", "shimmer"), fmt="opus")
                await ctx.bot.send_voice(chat_id=chat_id, voice=io.BytesIO(audio))
            except Exception:
                log.exception("TTS reply failed")

    async def on_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        if not update.message or not update.message.text:
            return
        chat_id = update.effective_chat.id
        user = await _ensure_tg_user(db, update.effective_user, chat_id)
        await _process_user_text(chat_id, user, update.message.text, ctx)

    async def on_voice(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        msg = update.message
        if not msg or (not msg.voice and not msg.audio):
            return
        chat_id = update.effective_chat.id
        user = await _ensure_tg_user(db, update.effective_user, chat_id)
        try:
            await ctx.bot.send_chat_action(chat_id=chat_id, action="record_voice")
        except Exception:
            pass
        try:
            voice = msg.voice or msg.audio
            f = await ctx.bot.get_file(voice.file_id)
            buf = io.BytesIO()
            await f.download_to_memory(buf)
            audio_bytes = buf.getvalue()
            text = await transcribe_audio(openai_api_key, audio_bytes, "voice.ogg")
        except Exception:
            log.exception("Voice transcription failed")
            await ctx.bot.send_message(chat_id=chat_id, text="I couldn't catch that — could you try again?")
            return
        if not text or not text.strip():
            await ctx.bot.send_message(chat_id=chat_id, text="I couldn't make out the audio. Try sending again or type it out?")
            return
        # Echo transcript so user knows what we heard
        await ctx.bot.send_message(chat_id=chat_id, text=f"_(heard: {text})_", parse_mode="Markdown")
        await _process_user_text(chat_id, user, text, ctx)

    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("new", cmd_new))
    application.add_handler(CommandHandler("mode", cmd_mode))
    application.add_handler(CommandHandler("voice", cmd_voice))
    application.add_handler(CommandHandler("checkin", cmd_checkin))
    application.add_handler(CommandHandler("help", cmd_help))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))
    application.add_handler(MessageHandler(filters.VOICE | filters.AUDIO, on_voice))

    return application
