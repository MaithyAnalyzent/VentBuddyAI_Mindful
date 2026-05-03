# VentBuddy AI

Standalone AI mental wellness companion with web chat, mood tracking, journaling, habits, breathing logs, voice input/output, and optional Telegram support.

## Architecture

- `backend/`: FastAPI, MongoDB Atlas/Motor, secure JWT cookies, direct OpenAI SDK, optional Telegram bot.
- `frontend/`: React/Vite single-page app.

## Backend Environment

Copy `backend/.env.example` to `backend/.env` for local development.

Required for production:

- `OPENAI_API_KEY`
- `OPENAI_CHAT_MODEL` optional, defaults to `gpt-4o-mini`
- `OPENAI_STT_MODEL` optional, defaults to `whisper-1`
- `OPENAI_TTS_MODEL` optional, defaults to `tts-1`
- `MONGODB_URI`
- `DB_NAME`
- `JWT_SECRET`
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `TELEGRAM_BOT_TOKEN` optional
- `TELEGRAM_BOT_NAME` optional

## Render Commands

Backend:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Frontend:

```bash
npm install && npm run build
```

Set the frontend publish directory to `dist`.
