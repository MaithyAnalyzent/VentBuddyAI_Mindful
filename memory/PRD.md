# VentBuddy AI PRD

VentBuddy AI is a standalone mental wellness companion. It listens to users, detects emotional pain points, responds with empathy, offers practical guidance, and supports healthier coping habits across web and optional Telegram conversations.

## Core Capabilities

- Emotionally aware AI chat with calm and casual modes.
- Crisis keyword detection with immediate support resources.
- Direct OpenAI integration for chat, speech-to-text, and text-to-speech.
- Secure email/password authentication with JWT cookies.
- MongoDB-backed sessions, messages, mood logs, journals, habits, breathing sessions, and check-ins.
- Optional Telegram bot controlled by `TELEGRAM_BOT_TOKEN`.
- React/Vite frontend branded as VentBuddy AI.

## Production Targets

- Backend hosted on Render.
- Frontend hosted on Render static site.
- MongoDB Atlas for database.
- OpenAI for GPT, Whisper/STT, and TTS.

## Required Secrets

- `OPENAI_API_KEY`
- `MONGODB_URI`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- Optional `TELEGRAM_BOT_TOKEN`
