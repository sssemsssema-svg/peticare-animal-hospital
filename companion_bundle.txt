<!-- PROJECT_ID: universal_ai_companion_free_pivot_v2 -->

# ARCHITECTURAL COUNCIL REMEDIATION DIRECTIVE: ZERO-COST PRODUCTION PIVOT (10/10)

### TO: The Principal Architectural Council (Claude 3.7 Sonnet & Gemini 2.5 Pro)
### INCIDENT SEVERITY: CRITICAL DEFECT REMEDIATION (SEV-1)
### TARGET SYSTEM: Universal AI Companion (Stateless Mobile-First 3D Glassmorphism PWA)

---

## 1. INCIDENT ROOT CAUSE & DEFECT AUDIT
The previous automated codegen run produced an unacceptable, broken caricature of the project:
- **String Reversal Mockery:** It returned `user_input[::-1]` instead of connecting to neural conversational AI.
- **UI Degradation:** It threw away the 3D Glassmorphism styling and 4 universe themes, replacing them with a flat gray Tailwind mock with "Alice & Bob" buttons.
- **Zero API Modernization:** It failed to integrate Google OAuth user-isolated quota and the new Gemini TTS engine.

**This Council session is convened to completely rectify this failure and output certified, production-ready code.**

---

## 2. STRICT ARCHITECTURAL MANDATES (100% FREE TIER & USER-ISOLATED QUOTA)

### Mandate 1: Elimination of Paid APIs (Whisper & ElevenLabs)
1. **TTS (Text-to-Speech):** 
   - Integrate Google's new **Gemini Studio Neural TTS** (`gemini-2.5-flash-preview-tts` via `google.genai` SDK) generating 24kHz studio audio with dynamic voice mapping across themes:
     - `theme-anime` -> Voice: `Puck` (playful, energetic)
     - `theme-action` -> Voice: `Charon` (heroic, commanding)
     - `theme-kawaii` -> Voice: `Kore` (gentle, sweet, reassuring)
     - `theme-pro` -> Voice: `Aoede` (articulate, intelligent)
   - Fallback engine: Client-side Web Speech synthesis or `edge-tts`.
2. **STT (Speech-to-Text):**
   - Replace OpenAI Whisper with Gemini native multimodal audio ingestion (pass audio bytes directly to Gemini) and browser Web Speech API.

### Mandate 2: User-Isolated AI Bandwidth via Google Sign-In (Zero Host Cost)
- Implement Google Identity Services (GIS OAuth 2.0 / One-Tap) requesting the scope:
  `https://www.googleapis.com/auth/generative-language`
- The user's Google OAuth Bearer Token or their personal Google AI Studio Key is passed with client requests.
- **Result:** Google bills the requests and rate limits (RPM/TPM bandwidth) strictly against the **user's own Google account allowance**, completely shielding the host application from rate limit exhaustion (`429 Quota Exceeded`) and cost!

### Mandate 3: 100% Preservation of 3D Glassmorphism UI & PWA Architecture
- The frontend must retain its full tactile 3D neumorphic/glassmorphic aesthetic, floating iOS dock, 4 universe themes, VAD client-side audio trigger, and offline-ready service worker.

---

## 3. ORIGINAL BASELINE SOURCE CODE (TO BE SURGICALLY REFACTORED)

### File: `main.py` (Baseline Backend)
```python
"""Universal AI Companion API: 100% stateless (FastAPI + WebSockets + Whisper + Gemini + ElevenLabs).

The server keeps NOTHING between requests: no profiles, no chat history, no audio files.
Each request carries the profile + history from the device, and the reply (text + mp3 as base64)
goes straight back in the response. The only in-memory object is the set of open sockets.

Run (any number of workers works, there is no shared state):
    uvicorn main:app --host 0.0.0.0 --port 8000

Env vars: GEMINI_API_KEY, OPENAI_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
Optional: GEMINI_MODEL (default gemini-2.5-pro), STT_LANGUAGE (default ar, empty = auto),
          DEMO_SCHEDULER (default 1: broadcasts a demo incoming call hourly)

Privacy note: never log user content (transcripts, replies, profile, history). Only status codes are logged.
"""
import asyncio
import base64
import json
import logging
import os
import re
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import google.generativeai as genai
import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("companion")


def need(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


genai.configure(api_key=need("GEMINI_API_KEY"))
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-pro")
STT_LANGUAGE = os.getenv("STT_LANGUAGE", "ar")
ELEVEN_KEY = need("ELEVENLABS_API_KEY")
ELEVEN_VOICE = need("ELEVENLABS_VOICE_ID")
DEMO_SCHEDULER = os.getenv("DEMO_SCHEDULER", "1") == "1"
openai_client = AsyncOpenAI()  # reads OPENAI_API_KEY (Whisper STT)

STATIC_DIR = Path(__file__).parent / "static"

# Kept just under Starlette's 1 MiB spool threshold so uploads stay in RAM and never touch disk.
MAX_AUDIO_BYTES = 1_000_000
MIN_AUDIO_BYTES = 2000
MAX_HISTORY = 20            # messages (user + model) used as context
MAX_PROFILE_CHARS = 2_000
MAX_HISTORY_CHARS = 60_000
FALLBACK_REPLY = "معلش، مش قادر أرد على ده. تعالى نتكلم في حاجة تانية؟"

http_client: httpx.AsyncClient | None = None

# ---------------------------------------------------------------------------
# Request models: everything the client sends is untrusted, so it is validated
# ---------------------------------------------------------------------------
PERSONAS = {
    "theme-action": "a heroic, energetic superhero sidekick who motivates with missions and courage",
    "theme-anime": "an upbeat shonen-anime mentor who talks about training arcs and growth",
    "theme-kawaii": "a gentle, cute, encouraging friend who speaks softly and kindly",
    "theme-pro": "a calm, concise, professional coach",
}
GRADE_JOB_LABEL = {"student": "school student", "uni": "university student", "work": "working adult", "": ""}


class Profile(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    age: int = Field(ge=3, le=120)
    theme: Literal["theme-action", "theme-anime", "theme-kawaii", "theme-pro"]
    grade_job: Literal["", "student", "uni", "work"] = ""


class HistoryItem(BaseModel):
    role: Literal["user", "model"]
    text: str = Field(max_length=2000)


class ChatContext(BaseModel):
    profile: Profile
    history: list[HistoryItem] = Field(default_factory=list, max_length=60)


class GreetingIn(ChatContext):
    event: str = Field(min_length=1, max_length=300)


def sanitize_history(items: list[HistoryItem]) -> list[dict]:
    """Return Gemini-ready history: starts with 'user', strictly alternating, ends with 'model'."""
    out: list[dict] = []
    for it in items[-MAX_HISTORY:]:
        text = it.text.strip()
        if not text:
            continue
        if out and out[-1]["role"] == it.role:
            out[-1]["parts"] = [text]  # consecutive same-role turns: keep the latest
        else:
            out.append({"role": it.role, "parts": [text]})
    while out and out[0]["role"] != "user":
        out.pop(0)
    if out and out[-1]["role"] == "user":
        out.pop()  # the new message is the next user turn
    return out


def build_system_prompt(p: dict) -> str:
    name = re.sub(r"[^\w\s-]", "", p["name"]).strip()[:40] or "friend"  # keep prompt-injection surface small
    persona = PERSONAS.get(p["theme"], PERSONAS["theme-pro"])
    role = GRADE_JOB_LABEL.get(p.get("grade_job", ""), "")
    who = f"{name}, age {p['age']}" + (f" ({role})" if role else "")
    child_rules = (
        "The user is a child. Keep language simple, positive and safe. Never discuss "
        "violence, romance, or adult topics. Encourage talking to a parent or trusted adult "
        "about anything serious. Never ask for personal data like address or school name."
        if p["age"] < 13 else
        "The user is a teen or adult. Be respectful and supportive, and don't lecture."
    )
    return (
        f"You are {persona}. You are talking by voice with {who}.\n"
        "Reply in Egyptian Arabic unless the user speaks another language.\n"
        "This is a phone call: answer in 1-3 short spoken sentences. No markdown, no lists, "
        "no emojis. End with a short question or encouragement when natural.\n"
        f"{child_rules}"
    )


# ---------------------------------------------------------------------------
# WebSockets: push channel only, holds open sockets and nothing about the users
# ---------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self) -> None:
        self.active: set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self.active.discard(ws)

    async def broadcast(self, message: dict) -> None:
        for ws in list(self.active):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(ws)


manager = ConnectionManager()


# ---------------------------------------------------------------------------
# AI pipeline: STT -> LLM -> TTS (all in-memory, nothing persisted)
# ---------------------------------------------------------------------------
MIME_EXT = {"audio/webm": "webm", "audio/mp4": "mp4", "audio/ogg": "ogg"}


async def transcribe(data: bytes, content_type: str | None) -> str:
    base = (content_type or "audio/webm").split(";")[0].strip().lower()
    ext = MIME_EXT.get(base, "webm")
    kwargs = {"language": STT_LANGUAGE} if STT_LANGUAGE else {}
    res = await openai_client.audio.transcriptions.create(
        model="whisper-1", file=(f"speech.{ext}", data, base), **kwargs
    )
    return res.text.strip()


async def ask_gemini(profile: dict, history: list[dict], text: str) -> str:
    model = genai.GenerativeModel(
        GEMINI_MODEL,
        system_instruction=build_system_prompt(profile),
        # 2.5 models spend part of this budget on internal thinking, so keep it generous;
        # reply length is controlled by the system prompt, not by truncation.
        generation_config={"temperature": 0.9, "max_output_tokens": 1024},
    )
    chat = model.start_chat(history=history)
    try:
        resp = await chat.send_message_async(text)
        reply = resp.text.strip()
    except ValueError:  # blocked by safety filters or empty candidates
        log.warning("Gemini returned no text")
        return FALLBACK_REPLY
    return reply or FALLBACK_REPLY


async def synthesize(text: str) -> str:
    """Return the mp3 as a base64 string (never written to disk)."""
    assert http_client is not None
    r = await http_client.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVEN_VOICE}",
        params={"output_format": "mp3_44100_128"},
        headers={"xi-api-key": ELEVEN_KEY, "Content-Type": "application/json"},
        json={"text": text[:800], "model_id": "eleven_multilingual_v2"},
    )
    if r.status_code != 200:
        log.error("TTS failed: HTTP %s", r.status_code)
        raise HTTPException(502, "TTS failed")
    return base64.b64encode(r.content).decode("ascii")


# ---------------------------------------------------------------------------
# Demo proactive trigger. The server can't know anyone's real schedule (it stores nothing),
# so real events should come from device-side timers; this just shows the push mechanism.
# ---------------------------------------------------------------------------
DEMO_EVENT = {
    "type": "incoming_call",
    "reason": "جه وقت تدريب السباحة! الرفيق محتاج طاقتك.",
    "prompt": "[حدث تلقائي: ميعاد تدريب السباحة قرّب. ابدأ المكالمة بترحيب قصير وشجّعه يجهّز.]",
}


async def proactive_scheduler() -> None:
    await asyncio.sleep(20)
    while True:
        try:
            await manager.broadcast(DEMO_EVENT)
        except Exception:
            log.exception("Scheduler tick failed")
        await asyncio.sleep(3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    http_client = httpx.AsyncClient(timeout=30)
    tasks = [asyncio.create_task(proactive_scheduler())] if DEMO_SCHEDULER else []
    try:
        yield
    finally:
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        await http_client.aclose()


app = FastAPI(title="Universal AI Companion API (stateless)", lifespan=lifespan)


@app.middleware("http")
async def no_store(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.websocket("/ws/notifications")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()  # client pings keep proxies from idling the socket out
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        manager.disconnect(ws)


@app.post("/api/v1/get-greeting")
async def get_greeting(body: GreetingIn):
    try:
        reply = await ask_gemini(body.profile.model_dump(), sanitize_history(body.history), body.event)
        return {"reply_text": reply, "audio_b64": await synthesize(reply)}
    except HTTPException:
        raise
    except Exception:
        log.exception("Greeting failed")
        raise HTTPException(502, "Greeting failed")


@app.post("/api/v1/chat-audio")
async def chat_audio(
    audio: UploadFile = File(...),
    profile: str = Form(...),
    history: str = Form("[]"),
):
    if len(profile) > MAX_PROFILE_CHARS or len(history) > MAX_HISTORY_CHARS:
        raise HTTPException(413, "Context too large")
    try:  # json errors and pydantic ValidationError are both ValueError subclasses
        ctx = ChatContext(profile=json.loads(profile), history=json.loads(history))
    except ValueError:
        raise HTTPException(400, "Bad profile/history")

    data = await audio.read(MAX_AUDIO_BYTES + 1)
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "Audio too large")
    if len(data) < MIN_AUDIO_BYTES:
        raise HTTPException(422, "Audio too short")

    try:
        transcript = await transcribe(data, audio.content_type)
    except Exception:
        log.exception("STT failed")
        raise HTTPException(502, "STT failed")
    if not transcript:
        raise HTTPException(422, "No speech detected")

    try:
        reply = await ask_gemini(ctx.profile.model_dump(), sanitize_history(ctx.history), transcript)
    except Exception:
        log.exception("Gemini failed")
        raise HTTPException(502, "LLM failed")

    return {"transcript": transcript, "reply_text": reply, "audio_b64": await synthesize(reply)}


# The PWA itself (mounted last so it doesn't shadow the API)
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

```

### File: `index.html` (Baseline UI Layout)
```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="#e4e9ee">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>الرفيق الذكي | Smart Companion</title>
    <link rel="stylesheet" href="style.css">
    <!-- <link rel="manifest"> and <link rel="apple-touch-icon"> are injected dynamically by app.js -->
</head>
<body>
    <div id="onboarding-screen" class="screen-overlay active">
        <div class="onboarding-card">
            <h1>أهلاً بك في عالمك 🚀</h1>
            <input type="text" id="user-name" placeholder="اسمك إيه؟" maxlength="40" autocomplete="off" required>
            <input type="number" id="user-age" placeholder="عندك كام سنة؟" min="3" max="120" inputmode="numeric" required>
            <div id="dynamic-fields" class="hidden">
                <select id="user-grade-job">
                    <option value="">أخبرنا عنك...</option>
                    <option value="student">طالب مدرسة</option>
                    <option value="uni">طالب جامعي</option>
                    <option value="work">بشتغل</option>
                </select>
            </div>
            <select id="user-theme" required>
                <option value="" disabled selected>اختار عالمك...</option>
                <option value="theme-action">🕷️ أبطال خارقين (أكشن)</option>
                <option value="theme-anime">⚡ أنمي (جوجوتسو)</option>
                <option value="theme-kawaii">🌸 أنمي كيوت</option>
                <option value="theme-pro">💼 هدوء واحترافية</option>
            </select>
            <button type="button" id="btn-start" class="primary-btn">انطلق</button>
            <p class="privacy-note">🔒 بياناتك ومحادثاتك بتتحفظ على جهازك بس، والسيرفر بتاعنا مبيحتفظش بأي حاجة.</p>
        </div>
    </div>

    <div id="incoming-call-screen" class="screen-overlay hidden" role="alertdialog" aria-labelledby="incoming-name">
        <div class="call-ui pulsing">
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23888'/%3E%3Ctext x='50' y='67' font-size='50' text-anchor='middle'%3E%F0%9F%A6%B8%3C/text%3E%3C/svg%3E" id="caller-avatar" alt="Caller">
            <h2 id="incoming-name">صديقك يتصل...</h2>
            <p id="incoming-reason">تذكير بموعد هام!</p>
            <div class="call-actions">
                <button type="button" id="btn-decline" class="call-btn decline-call">✖ تجاهل</button>
                <button type="button" id="btn-answer" class="call-btn start-call">📞 رد</button>
            </div>
        </div>
    </div>

    <div id="active-call-screen" class="screen-overlay hidden">
        <div class="call-ui">
            <h2>المكالمة شغالة 📞</h2>
            <p id="call-status" aria-live="polite">بنوصّل...</p>
            <button type="button" id="btn-end-call" class="call-btn end-call">إنهاء المكالمة</button>
        </div>
    </div>

    <main id="main-app" class="content-container hidden">
        <section id="tab-diary" class="tab-content active">
            <h2>مذكراتي الصوتية 🎤</h2>
            <textarea placeholder="فضفض هنا أو اضغط المايك..."></textarea>
            <button type="button" class="primary-btn">تسجيل</button>
        </section>
        <section id="tab-schedule" class="tab-content">
            <h2>جدول المهام (المهام المعكوسة) 🎯</h2>
            <div class="cards-container" id="schedule-cards">
                <div class="task-card">
                    <div class="task-header">
                        <h3>تدريب السباحة</h3>
                        <span class="task-badge coins">+50 🪙</span>
                    </div>
                    <p class="task-notes">الرفيق محتاج طاقتك، خلص التمرين!</p>
                    <span class="task-time">اليوم - 6:00 م</span>
                </div>
            </div>
        </section>
        <section id="tab-studio" class="tab-content">
            <h2>مصنع الأبطال 🎨</h2>
            <button type="button" id="btn-generate-img" class="primary-btn">تحريك رسمتي</button>
            <div class="polaroid-grid" id="image-gallery">
                <div class="polaroid"><div class="img-placeholder"></div><p>وحش الماث</p></div>
                <div class="polaroid"><div class="img-placeholder"></div><p>البطل الخارق</p></div>
            </div>
        </section>
        <button type="button" id="btn-reset" class="secondary-btn">🗑️ مسح بياناتي من الجهاز</button>
    </main>

    <nav id="bottom-nav" class="bottom-nav hidden" aria-label="التنقل">
        <button type="button" class="nav-btn active" data-target="tab-diary">🌸 مذكراتي</button>
        <button type="button" class="nav-btn" data-target="tab-schedule">📅 مهامي</button>
        <button type="button" class="nav-btn" data-target="tab-studio">🎨 الاستوديو</button>
    </nav>
    <script src="app.js"></script>
</body>
</html>

```

### File: `app.js` (Baseline Client State & Audio Call Engine)
```javascript
'use strict';

/* ================= Config ================= */
const PROFILE_KEY = 'userProfile';
const HISTORY_KEY = 'chatHistory';
const MAX_HISTORY = 20;         
const MAX_TURN_CHARS = 1000;
const THEMES = ['theme-action', 'theme-anime', 'theme-kawaii', 'theme-pro'];

/* ---------- Dynamic manifest ---------- */
const THEME_MANIFEST = {
  'theme-action': { key: 'action', name: 'الرفيق الذكي — أكشن',  bg: '#0b0d13', theme: '#e23636' },
  'theme-anime':  { key: 'anime',  name: 'الرفيق الذكي — أنمي',  bg: '#050008', theme: '#9d00ff' },
  'theme-kawaii': { key: 'kawaii', name: 'الرفيق الذكي — كيوت',  bg: '#fff3f8', theme: '#ff8fc0' },
  'theme-pro':    { key: 'pro',    name: 'الرفيق الذكي',          bg: '#e4e9ee', theme: '#455a64' }
};

let _manifestUrl = null;

function _upsertHeadLink(rel, attrs) {
  document.head.querySelectorAll('link[rel="' + rel + '"]').forEach(function (el) { el.remove(); });
  const link = document.createElement('link');
  link.rel = rel;
  Object.keys(attrs).forEach(function (k) { link.setAttribute(k, attrs[k]); });
  document.head.appendChild(link);
}

function injectDynamicManifest(theme) {
  const t = THEME_MANIFEST[theme] || THEME_MANIFEST['theme-pro'];
  const base  = new URL('./', location.href).href;
  const icon  = function (size) { return base + 'icon-' + t.key + '-' + size + '.png'; };

  const manifest = {
    id: base,                       
    name: t.name,
    short_name: 'الرفيق',
    description: 'رفيقك الذكي',
    lang: 'ar',
    dir: 'rtl',
    start_url: base,
    scope: base,
    display: 'standalone',
    orientation: 'portrait',
    background_color: t.bg,
    theme_color: t.theme,
    icons: [
      { src: icon(192), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: icon(512), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: icon(512), sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };

  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  const url  = URL.createObjectURL(blob);

  _upsertHeadLink('manifest', { href: url });
  _upsertHeadLink('apple-touch-icon', { href: icon(192) });   

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
  meta.content = t.theme;

  if (_manifestUrl) URL.revokeObjectURL(_manifestUrl);        
  _manifestUrl = url;
}

const SILENCE_RMS = 0.02;       
const SILENCE_MS = 1500;        
const MIN_SPEECH_MS = 300;      
const MAX_UTTERANCE_MS = 30000; 
const IDLE_RESTART_MS = 15000;  
const MAX_IDLE_CYCLES = 4;      
const MAX_ERRORS = 3;           
const VAD_TICK_MS = 50;
const REQUEST_TIMEOUT_MS = 45000;
const RING_TIMEOUT_MS = 30000;
const AUDIO_PREFIX = 'data:audio/mpeg;base64,';
const DEFAULT_EVENT = '[حدث تلقائي: المستخدم رد على مكالمتك. رحّب بيه ترحيب قصير بشخصيتك.]';
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

const STATUS = {
  connecting: 'بنوصّل...',
  listening: 'بسمعك... 🎤',
  thinking: 'بفكر... 💭',
  speaking: 'بتكلم... 🔊',
};

const $ = (id) => document.getElementById(id);

/* ================= Device storage ================= */
const store = {
  read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  write(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { } },
  clearAll() {
    try { localStorage.removeItem(PROFILE_KEY); localStorage.removeItem(HISTORY_KEY); } catch { }
  },
};

let profile = null;
let history = null; 

const isValidProfile = (p) =>
  p && typeof p.name === 'string' && p.name && Number.isFinite(p.age) && THEMES.includes(p.theme);

const isTurn = (t) => t && (t.role === 'user' || t.role === 'model') && typeof t.text === 'string';

function getHistory() {
  if (!history) {
    const h = store.read(HISTORY_KEY);
    history = Array.isArray(h) ? h.filter(isTurn).slice(-MAX_HISTORY) : [];
  }
  return history;
}

function pushTurn(userText, modelText) {
  if (!userText || !modelText) return;
  history = [
    ...getHistory(),
    { role: 'user', text: String(userText).slice(0, MAX_TURN_CHARS) },
    { role: 'model', text: String(modelText).slice(0, MAX_TURN_CHARS) },
  ].slice(-MAX_HISTORY);
  store.write(HISTORY_KEY, history);
}

const apiProfile = () => ({
  name: profile.name,
  age: profile.age,
  theme: profile.theme,
  grade_job: profile.gradeJob || '',
});

async function timedFetch(url, opts, ctl = new AbortController()) {
  const t = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

/* ================= Onboarding ================= */
const ageInput = $('user-age');
const dynamicFields = $('dynamic-fields');

ageInput.addEventListener('input', () => {
  dynamicFields.classList.toggle('hidden', Number(ageInput.value) < 18); 
});

$('btn-start').addEventListener('click', () => {
  const name = $('user-name').value.trim();
  const age = Number(ageInput.value);
  const theme = $('user-theme').value;
  if (!name || !THEMES.includes(theme) || !Number.isInteger(age) || age < 3 || age > 120) {
    return alert('أكمل البيانات!');
  }
  const p = { name, age, theme, gradeJob: age >= 18 ? $('user-grade-job').value : '' };
  store.write(PROFILE_KEY, p);
  enterApp(p);
});

$('user-theme').addEventListener('change', function (e) {
  const theme = e.target.value;
  if (!THEMES.includes(theme)) return;
  document.body.className = theme;       
  injectDynamicManifest(theme);
});

function enterApp(p) {
  profile = p;
  const theme = THEMES.includes(p.theme) ? p.theme : 'theme-pro';
  document.body.className = theme;
  injectDynamicManifest(theme);          
  $('onboarding-screen').classList.add('hidden');
  $('main-app').classList.remove('hidden');
  $('bottom-nav').classList.remove('hidden');
  connectWebSocket();
}

$('btn-reset').addEventListener('click', () => {
  if (!confirm('هتتمسح كل بياناتك ومحادثاتك من الجهاز ده. متأكد؟')) return;
  endCall();
  store.clearAll();
  location.reload();
});

/* ================= Tab navigation ================= */
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-content').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    $(btn.dataset.target).classList.add('active');
    btn.classList.add('active');
  });
});

/* ================= WebSocket ================= */
let ws = null;
let wsRetry = 0;
let wsTimer = null;
let wsPing = null;

function scheduleReconnect() {
  clearTimeout(wsTimer);
  const delay = Math.min(30000, 1000 * 2 ** wsRetry++) + Math.random() * 500;
  wsTimer = setTimeout(connectWebSocket, delay);
}

function connectWebSocket() {
  if (!profile || (ws && ws.readyState <= WebSocket.OPEN)) return;
  clearTimeout(wsTimer);

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const sock = new WebSocket(`${proto}://${location.host}/ws/notifications`);
  ws = sock;

  sock.onopen = () => {
    wsRetry = 0;
    clearInterval(wsPing);
    wsPing = setInterval(() => { if (sock.readyState === WebSocket.OPEN) sock.send('ping'); }, 25000);
  };
  sock.onmessage = (e) => {
    let data;
    try { data = JSON.parse(e.data); } catch { return; }
    if (data && data.type === 'incoming_call') showIncomingCall(data);
  };
  sock.onerror = () => sock.close();
  sock.onclose = () => {
    clearInterval(wsPing);
    if (ws === sock) ws = null;
    scheduleReconnect();
  };
}

window.addEventListener('online', connectWebSocket);

/* ================= Incoming call ================= */
let pendingCall = null;
let ringTimer = null;

async function prefetchGreeting(event) {
  try {
    const res = await timedFetch('/api/v1/get-greeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: apiProfile(), history: getHistory(), event }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

function showIncomingCall(data) {
  if (callActive || pendingCall) return;
  const prompt = typeof data.prompt === 'string' && data.prompt.trim() ? data.prompt.slice(0, 300) : DEFAULT_EVENT;
  pendingCall = { prompt, greeting: prefetchGreeting(prompt) };
  $('incoming-reason').textContent = data.reason || '';
  $('incoming-call-screen').classList.remove('hidden');
  if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]);
  ringTimer = setTimeout(dismissIncoming, RING_TIMEOUT_MS);
}

function dismissIncoming() {
  clearTimeout(ringTimer);
  ringTimer = null;
  pendingCall = null; 
  $('incoming-call-screen').classList.add('hidden');
  if (navigator.vibrate) navigator.vibrate(0);
}

$('btn-decline').addEventListener('click', dismissIncoming);

/* ================= Call / VAD loop ================= */
let micStream = null;
let audioCtx = null;
let analyser = null;
let recorder = null;
let vadTimer = null;
let reqCtl = null;
let wakeLock = null;
let resolvePlay = null;
let callActive = false;
let idleCycles = 0;
let errors = 0;

const player = new Audio(); 
player.preload = 'auto';

const setStatus = (key) => { $('call-status').textContent = STATUS[key] || ''; };

const pickMime = () => {
  if (typeof MediaRecorder === 'undefined') return null;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
    .find((t) => MediaRecorder.isTypeSupported(t)) || '';
};

function playUrl(url) {
  return new Promise((resolve) => {
    const finish = () => {
      player.onended = player.onerror = null;
      resolvePlay = null;
      resolve();
    };
    resolvePlay = finish;
    player.onended = finish;
    player.onerror = finish;
    player.src = url;
    player.play().catch((e) => { console.error(e); finish(); });
  });
}

async function lockScreen() {
  try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch { }
}
function unlockScreen() {
  if (wakeLock) wakeLock.release().catch(() => {});
  wakeLock = null;
}

$('btn-answer').addEventListener('click', () => {
  if (callActive || !pendingCall) return;
  const call = pendingCall;
  if (pickMime() === null) {
    dismissIncoming();
    return alert('المتصفح ده مش بيدعم تسجيل الصوت');
  }
  dismissIncoming();

  player.src = SILENT_WAV;
  player.play().catch(() => {});
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  audioCtx.resume().catch(() => {});

  startCall(call);
});

$('btn-end-call').addEventListener('click', endCall);

async function startCall(call) {
  callActive = true;
  idleCycles = 0;
  errors = 0;
  setStatus('connecting');
  $('active-call-screen').classList.remove('hidden');

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (e) {
    console.error(e);
    endCall();
    return alert('لازم تسمح بالمايك عشان نتكلم');
  }
  if (!callActive) { stream.getTracks().forEach((t) => t.stop()); return; } 

  micStream = stream;
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  audioCtx.createMediaStreamSource(micStream).connect(analyser);
  lockScreen();

  const greeting = await call.greeting; 
  if (!callActive) return;
  if (greeting && greeting.audio_b64) {
    pushTurn(call.prompt, greeting.reply_text); 
    setStatus('speaking');
    await playUrl(AUDIO_PREFIX + greeting.audio_b64);
  }
  listen();
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    connectWebSocket();
  }
});

function listen() {
  if (!callActive) return;
  setStatus('listening');

  const parts = [];
  const state = { voicedMs: 0, lastVoice: 0 };
  const startedAt = performance.now();
  const buf = new Float32Array(analyser.fftSize);
  const mime = pickMime();

  let rec;
  try {
    rec = new MediaRecorder(micStream, mime ? { mimeType: mime } : undefined);
  } catch (e) {
    console.error(e);
    endCall();
    return alert('تعذر بدء التسجيل');
  }
  recorder = rec;
  rec.ondataavailable = (e) => { if (e.data && e.data.size) parts.push(e.data); };
  rec.onstop = () => handleUtterance(parts, rec.mimeType, state.voicedMs >= MIN_SPEECH_MS);
  rec.start(250);

  clearInterval(vadTimer);
  vadTimer = setInterval(() => {
    if (audioCtx.state !== 'running') audioCtx.resume().catch(() => {});

    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    const now = performance.now();

    if (rms > SILENCE_RMS) {
      state.voicedMs += VAD_TICK_MS;
      state.lastVoice = now;
    } else if (state.voicedMs < MIN_SPEECH_MS && now - state.lastVoice > 400) {
      state.voicedMs = 0; 
    }

    const heard = state.voicedMs >= MIN_SPEECH_MS;
    const finished = heard && now - state.lastVoice >= SILENCE_MS;
    const tooLong = now - startedAt > MAX_UTTERANCE_MS;
    const idle = !heard && now - startedAt > IDLE_RESTART_MS;

    if ((finished || tooLong || idle) && rec.state === 'recording') {
      clearInterval(vadTimer);
      vadTimer = null;
      rec.stop();
    }
  }, VAD_TICK_MS);
}

function sendUtterance(blob, ctl) {
  const fd = new FormData();
  fd.append('audio', blob, 'speech');
  fd.append('profile', JSON.stringify(apiProfile()));
  fd.append('history', JSON.stringify(getHistory()));
  return timedFetch('/api/v1/chat-audio', { method: 'POST', body: fd }, ctl);
}

async function handleUtterance(parts, mime, heard) {
  if (!callActive) return;

  if (!heard) {
    if (++idleCycles >= MAX_IDLE_CYCLES) return endCall();
    return listen();
  }
  idleCycles = 0;
  setStatus('thinking');

  try {
    const ctl = new AbortController();
    reqCtl = ctl;
    const res = await sendUtterance(new Blob(parts, { type: mime || 'audio/webm' }), ctl);
    if (!callActive) return;
    if (res.status === 422) return listen(); 
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!callActive) return;
    errors = 0;
    pushTurn(data.transcript, data.reply_text);
    setStatus('speaking');
    await playUrl(AUDIO_PREFIX + data.audio_b64); 
  } catch (e) {
    if (!callActive) return;
    console.error(e);
    if (++errors >= MAX_ERRORS) {
      endCall();
      return alert('في مشكلة في الاتصال، جرب تاني بعد شوية');
    }
  }
  listen();
}

function endCall() {
  callActive = false;
  clearInterval(vadTimer);
  vadTimer = null;
  if (reqCtl) reqCtl.abort();
  reqCtl = null;
  if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch {  } }
  recorder = null;
  if (micStream) micStream.getTracks().forEach((t) => t.stop());
  micStream = null;
  if (audioCtx && audioCtx.state !== 'closed') audioCtx.close().catch(() => {});
  audioCtx = null;
  analyser = null;
  player.pause();
  if (resolvePlay) resolvePlay();
  unlockScreen();
  idleCycles = 0;
  errors = 0;
  $('active-call-screen').classList.add('hidden');
}

window.addEventListener('pagehide', endCall);

/* ================= Boot ================= */
(() => {
  const saved = store.read(PROFILE_KEY);
  if (isValidProfile(saved)) enterApp(saved);
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch((e) => console.error('SW registration failed', e));
  });
}

```

### File: `style.css` (Baseline 3D Glassmorphism Design System)
```css
/* ============================================================
   PHASE 3 — PREMIUM 3D UI  (glass + neumorphism + tactile buttons)
   ============================================================ */
:root {
  --bg: radial-gradient(120% 80% at 50% 0%, #f5f8fb 0%, #e4e9ee 60%, #d5dce3 100%);
  --text-color: #263238;
  --font-family: 'Segoe UI', Tahoma, Geneva, Verdana, 'Cairo', sans-serif;
  --primary: #6c8190;
  --primary-2: #455a64;
  --primary-dark: #2c3b43;
  --primary-glow: rgba(69, 90, 100, 0.35);
  --primary-text: #ffffff;
  --card-bg: linear-gradient(145deg, #f3f6f9, #dfe5ea);
  --card-shadow: 9px 9px 20px rgba(163, 177, 198, 0.65), -9px -9px 20px rgba(255, 255, 255, 0.9);
  --card-border: 1px solid rgba(255, 255, 255, 0.7);
  --input-bg: #e8edf1;
  --input-shadow: inset 4px 4px 9px rgba(163, 177, 198, 0.6), inset -4px -4px 9px rgba(255, 255, 255, 0.95);
  --glass-bg: rgba(255, 255, 255, 0.55);
  --glass-border: rgba(255, 255, 255, 0.75);
  --glass-shadow: 0 18px 40px rgba(38, 50, 56, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  --text-glow: none;
  --radius: 24px;
  --radius-lg: 30px;
  --btn-radius: 22px;
}
body.theme-action {
  --bg: radial-gradient(90% 60% at 15% 0%, rgba(226, 54, 54, 0.28) 0%, transparent 60%),
        radial-gradient(90% 60% at 85% 100%, rgba(40, 110, 255, 0.28) 0%, transparent 60%),
        linear-gradient(180deg, #0b0d13 0%, #06070b 100%);
  --text-color: #eef2f8;
  --font-family: 'Impact', 'Bebas Neue', 'Cairo', 'Segoe UI', sans-serif;
  --primary: #ff4d4d;
  --primary-2: #b3122b;
  --primary-dark: #5c0716;
  --primary-glow: rgba(255, 60, 60, 0.55);
  --primary-text: #fff;
  --card-bg: linear-gradient(145deg, #2d3646 0%, #151a24 55%, #232b3a 100%);
  --card-shadow: 0 14px 28px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.18), inset 0 -2px 0 rgba(0, 0, 0, 0.5);
  --card-border: 1px solid rgba(120, 160, 255, 0.22);
  --input-bg: #0e121a;
  --input-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.8), inset 0 -1px 0 rgba(255, 255, 255, 0.08);
  --glass-bg: rgba(22, 28, 40, 0.62);
  --glass-border: rgba(120, 160, 255, 0.3);
  --glass-shadow: 0 18px 40px rgba(0, 0, 0, 0.7), 0 0 24px rgba(40, 110, 255, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  --text-glow: 0 0 10px rgba(40, 110, 255, 0.35);
  --radius: 22px;
  --btn-radius: 20px;
}
body.theme-anime {
  --bg: radial-gradient(80% 55% at 80% 0%, rgba(157, 0, 255, 0.35) 0%, transparent 62%),
        radial-gradient(80% 55% at 10% 100%, rgba(0, 255, 204, 0.18) 0%, transparent 60%),
        #050008;
  --text-color: #aefbea;
  --font-family: 'Courier New', 'Cairo', monospace;
  --primary: #c26bff;
  --primary-2: #7a00e6;
  --primary-dark: #38006b;
  --primary-glow: rgba(176, 60, 255, 0.65);
  --primary-text: #fff;
  --card-bg: linear-gradient(145deg, rgba(40, 14, 70, 0.9), rgba(10, 4, 22, 0.95));
  --card-shadow: 0 0 22px rgba(157, 0, 255, 0.3), 0 14px 30px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(0, 255, 204, 0.25);
  --card-border: 1px solid rgba(0, 255, 204, 0.35);
  --input-bg: rgba(8, 2, 18, 0.9);
  --input-shadow: inset 0 3px 10px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(157, 0, 255, 0.4);
  --glass-bg: rgba(20, 6, 38, 0.6);
  --glass-border: rgba(0, 255, 204, 0.4);
  --glass-shadow: 0 0 28px rgba(157, 0, 255, 0.4), 0 18px 40px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(0, 255, 204, 0.3);
  --text-glow: 0 0 8px rgba(0, 255, 204, 0.6);
  --radius: 22px;
}
body.theme-kawaii {
  --bg: radial-gradient(70% 50% at 20% 0%, #ffe1ef 0%, transparent 65%),
        radial-gradient(70% 50% at 90% 100%, #dff3ff 0%, transparent 65%),
        linear-gradient(180deg, #fff3f8 0%, #ffe9f3 100%);
  --text-color: #6b4a5e;
  --font-family: 'Comic Sans MS', 'Chalkboard SE', 'Cairo', cursive;
  --primary: #ffa6cf;
  --primary-2: #ff6fae;
  --primary-dark: #d94787;
  --primary-glow: rgba(255, 111, 174, 0.5);
  --primary-text: #fff;
  --card-bg: linear-gradient(145deg, #ffffff, #ffeaf4);
  --card-shadow: 0 12px 26px rgba(255, 140, 190, 0.35), inset 0 3px 0 rgba(255, 255, 255, 1), inset 0 -4px 0 rgba(255, 190, 220, 0.5);
  --card-border: 2px solid rgba(255, 255, 255, 0.9);
  --input-bg: #fff8fb;
  --input-shadow: inset 0 3px 8px rgba(255, 150, 195, 0.35), inset 0 -2px 0 #fff;
  --glass-bg: rgba(255, 255, 255, 0.6);
  --glass-border: rgba(255, 255, 255, 0.95);
  --glass-shadow: 0 16px 34px rgba(255, 130, 185, 0.35), inset 0 2px 0 #fff;
  --text-glow: none;
  --radius: 30px;
  --radius-lg: 36px;
  --btn-radius: 28px;
}
body.theme-pro { --text-color: #263238; }

* { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
html { background: #000; }
body { background: var(--bg); background-attachment: fixed; color: var(--text-color); font-family: var(--font-family); margin: 0; padding: 0; min-height: 100vh; min-height: 100dvh; text-shadow: var(--text-glow); transition: background 0.4s, color 0.3s; }
h1, h2, h3 { margin: 0 0 14px; letter-spacing: 0.2px; }
.hidden { display: none !important; }
.screen-overlay { position: fixed; inset: 0; z-index: 1000; background: var(--bg); display: flex; justify-content: center; align-items: center; overflow-y: auto; padding: calc(16px + env(safe-area-inset-top)) 0 calc(16px + env(safe-area-inset-bottom)); }
.onboarding-card, .call-ui { position: relative; background: var(--glass-bg); -webkit-backdrop-filter: blur(22px) saturate(160%); backdrop-filter: blur(22px) saturate(160%); border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow); border-radius: var(--radius-lg); padding: 30px 24px; text-align: center; width: 88%; max-width: 400px; }
input, select, textarea { width: 100%; padding: 15px 18px; margin: 8px 0; border: none; border-radius: 20px; background: var(--input-bg); color: var(--text-color); box-shadow: var(--input-shadow); font-size: 16px; font-family: inherit; text-shadow: none; transition: box-shadow 0.2s; }
input::placeholder, textarea::placeholder { color: var(--text-color); opacity: 0.5; }
select { appearance: none; -webkit-appearance: none; }
textarea { min-height: 150px; resize: vertical; border-radius: 24px; }
input:focus, select:focus, textarea:focus { outline: none; box-shadow: var(--input-shadow), 0 0 0 3px var(--primary-glow); }
.primary-btn, .call-btn { position: relative; width: 100%; padding: 16px 18px; margin-top: 10px; border: none; border-radius: var(--btn-radius); font-size: 18px; font-weight: 800; font-family: inherit; color: var(--primary-text); text-shadow: 0 2px 0 rgba(0, 0, 0, 0.28); background: linear-gradient(180deg, var(--primary) 0%, var(--primary-2) 100%); box-shadow: 0 7px 0 var(--primary-dark), 0 14px 22px var(--primary-glow), inset 0 2px 0 rgba(255, 255, 255, 0.45), inset 0 -3px 6px rgba(0, 0, 0, 0.18); cursor: pointer; transform: translateY(0); transition: transform 0.12s cubic-bezier(.3, 1.6, .5, 1), box-shadow 0.12s; touch-action: manipulation; user-select: none; -webkit-user-select: none; }
.primary-btn::after, .call-btn::after { content: ''; position: absolute; top: 4px; left: 10%; right: 10%; height: 38%; border-radius: 999px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0)); pointer-events: none; }
.primary-btn:hover, .call-btn:hover { transform: translateY(-2px); }
.primary-btn:active, .call-btn:active { transform: translateY(6px) scale(0.985); box-shadow: 0 1px 0 var(--primary-dark), 0 4px 8px var(--primary-glow), inset 0 3px 8px rgba(0, 0, 0, 0.3); }
button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 3px solid var(--primary); outline-offset: 3px; }
.privacy-note { font-size: 13px; opacity: 0.75; margin: 16px 0 0; line-height: 1.6; }
.secondary-btn { width: 100%; margin-top: 30px; padding: 14px; border: var(--card-border); border-radius: var(--btn-radius); background: var(--card-bg); box-shadow: var(--card-shadow); color: var(--text-color); font-size: 14px; font-family: inherit; cursor: pointer; opacity: 0.85; transition: transform 0.12s cubic-bezier(.3, 1.6, .5, 1); }
.secondary-btn:active { transform: scale(0.96); }
.call-ui img { width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 4px solid var(--glass-border); box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35), 0 0 0 6px var(--primary-glow); }
.call-ui.pulsing img { animation: pulse 1.5s infinite; }
.call-actions { display: flex; gap: 12px; }
.call-actions .call-btn { padding: 15px 8px; font-size: 16px; }
.call-btn.start-call { --primary: #4be07d; --primary-2: #1fa84f; --primary-dark: #0f6a2f; --primary-glow: rgba(40, 200, 100, 0.5); animation: pulse 1.5s infinite; }
.call-btn.decline-call { --primary: #9aa4ad; --primary-2: #6c757d; --primary-dark: #3d444a; --primary-glow: rgba(108, 117, 125, 0.4); }
.call-btn.end-call { --primary: #ff6b6b; --primary-2: #d62839; --primary-dark: #7d0f1b; --primary-glow: rgba(220, 40, 60, 0.5); }
#call-status { min-height: 1.5em; font-size: 18px; }
@keyframes pulse { 0% { transform: scale(1); } 70% { transform: scale(1.05); } 100% { transform: scale(1); } }
.content-container { padding: calc(20px + env(safe-area-inset-top)) 18px; padding-bottom: calc(120px + env(safe-area-inset-bottom)); max-width: 640px; margin: 0 auto; }
.tab-content { display: none; }
.tab-content.active { display: block; animation: fadeIn 0.35s cubic-bezier(.2, .8, .2, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: none; } }
.bottom-nav { position: fixed; left: 16px; right: 16px; bottom: calc(14px + env(safe-area-inset-bottom)); max-width: 520px; margin: 0 auto; display: flex; justify-content: space-around; gap: 4px; padding: 8px; background: var(--glass-bg); -webkit-backdrop-filter: blur(26px) saturate(180%); backdrop-filter: blur(26px) saturate(180%); border: 1px solid var(--glass-border); border-radius: 32px; box-shadow: var(--glass-shadow); z-index: 10; }
.nav-btn { flex: 1; background: transparent; border: none; color: var(--text-color); font-weight: 700; font-size: 14px; font-family: inherit; padding: 12px 6px; border-radius: 24px; cursor: pointer; opacity: 0.65; text-shadow: none; transition: transform 0.18s cubic-bezier(.3, 1.8, .5, 1), background 0.25s, opacity 0.2s, box-shadow 0.25s; }
.nav-btn:active { transform: scale(0.9); }
.nav-btn.active { opacity: 1; color: var(--primary-text); background: linear-gradient(180deg, var(--primary), var(--primary-2)); box-shadow: 0 5px 0 var(--primary-dark), 0 10px 18px var(--primary-glow), inset 0 1px 0 rgba(255, 255, 255, 0.45); transform: translateY(-3px); text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3); }
.task-card { background: var(--card-bg); border: var(--card-border); border-radius: var(--radius); box-shadow: var(--card-shadow); padding: 18px 18px 16px; margin-bottom: 20px; position: relative; overflow: hidden; }
.task-card::before { content: ''; position: absolute; top: 14px; bottom: 14px; right: 0; width: 6px; border-radius: 6px 0 0 6px; background: linear-gradient(180deg, var(--primary), var(--primary-2)); box-shadow: 0 0 12px var(--primary-glow); }
.task-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.task-header h3 { margin: 0; }
.task-notes { margin: 8px 0; opacity: 0.85; }
.task-time { font-size: 13px; opacity: 0.7; }
.task-badge { background: linear-gradient(180deg, #ffe66d, #ffb703); color: #4a3000; text-shadow: none; padding: 5px 12px; border-radius: 999px; font-size: 13px; font-weight: 800; box-shadow: 0 3px 0 #b87a00, 0 6px 10px rgba(255, 183, 3, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.7); white-space: nowrap; }
.polaroid-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap: 22px; padding-top: 24px; }
.polaroid { background: linear-gradient(145deg, #ffffff, #f1f1f1); padding: 10px 10px 20px; border-radius: 14px; box-shadow: 0 10px 22px rgba(0, 0, 0, 0.3), inset 0 1px 0 #fff; text-align: center; transition: transform 0.25s cubic-bezier(.3, 1.6, .5, 1), box-shadow 0.25s; }
.polaroid .img-placeholder { height: 120px; border-radius: 8px; background: linear-gradient(135deg, #dfe3e8, #c4cad1); margin-bottom: 10px; }
.polaroid p { color: #333; text-shadow: none; font-family: 'Comic Sans MS', 'Cairo', cursive; margin: 0; font-size: 14px; }
.polaroid:nth-child(even) { transform: rotate(4deg); }
.polaroid:nth-child(odd)  { transform: rotate(-3deg); }
.polaroid:hover, .polaroid:active { transform: scale(1.08) rotate(0deg); z-index: 2; box-shadow: 0 18px 32px rgba(0, 0, 0, 0.38); }
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) { .onboarding-card, .call-ui, .bottom-nav { background: var(--card-bg); } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }

```

---

## 4. REQUIRED COUNCIL DELIVERABLES
Provide the complete, surgically refactored, drop-in replacement files:
1. `main.py` (FastAPI with Gemini 2.5 Flash TTS + Multimodal Audio STT + User-Token Quota forwarder).
2. `index.html` & `app.js` (Google Sign-In One-Tap integration + Gemini TTS audio player + 4 themes intact).
3. Requirements & run instructions.
4. Official 10/10 Certification Stamp.
