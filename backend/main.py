import os
import re
import uuid
import subprocess
import time
import json
from typing import Optional, Any
from fastapi import FastAPI, UploadFile, Form, HTTPException, Header, Depends
from pydantic import BaseModel
import threading
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from dotenv import load_dotenv
import sqlite3
from datetime import datetime
import jwt
from jwt import PyJWKClient
from supabase import create_client, Client

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
configured_db_path = os.getenv("NOTEJAM_DB_PATH")
DB_PATH = (
    configured_db_path
    if configured_db_path and os.path.isabs(configured_db_path)
    else os.path.join(BASE_DIR, configured_db_path or "notejam.db")
)
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMP_DIR = os.path.join(BASE_DIR, "temp")

# --- Supabase Setup ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()
supabase_client: Optional[Client] = (
    create_client(SUPABASE_URL, SUPABASE_KEY)
    if SUPABASE_URL and SUPABASE_KEY
    else None
)

if supabase_client:
    print("Using Supabase cloud database.")
else:
    print("Supabase credentials not found. Falling back to local SQLite database.")

# Initialize SQLite Database (fallback mode)
def init_sqlite_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#38bdf8',
            icon TEXT DEFAULT '📚',
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            title TEXT,
            video_url TEXT,
            markdown TEXT,
            cheatsheet TEXT,
            mindmap TEXT,
            flashcards TEXT,
            created_at TEXT
        )
    """)
    try:
        cursor.execute("ALTER TABLE notes ADD COLUMN ai_podcast_url TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE notes ADD COLUMN ai_debate_url TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE notes ADD COLUMN user_id TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE notes ADD COLUMN folder_id TEXT")
    except sqlite3.OperationalError:
        pass
    conn.commit()
    conn.close()

if not supabase_client:
    init_sqlite_db()

# --- Unified Database Helper Functions ---
def db_create_folder(folder_id: str, name: str, color: Optional[str], icon: Optional[str], user_id: str, created_at: str) -> dict:
    folder_color = color or "#38bdf8"
    folder_icon = icon or "📚"
    if supabase_client:
        row = {
            "id": folder_id,
            "name": name,
            "color": folder_color,
            "icon": folder_icon,
            "user_id": user_id,
            "created_at": created_at
        }
        supabase_client.table("folders").insert(row).execute()
        return {"id": folder_id, "name": name, "color": folder_color, "icon": folder_icon, "created_at": created_at, "note_count": 0}
    else:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO folders (id, name, color, icon, user_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (folder_id, name, folder_color, folder_icon, user_id, created_at))
        conn.commit()
        conn.close()
        return {"id": folder_id, "name": name, "color": folder_color, "icon": folder_icon, "created_at": created_at, "note_count": 0}

def db_get_folders(user_id: str) -> list[dict]:
    if supabase_client:
        folders_res = supabase_client.table("folders").select("*").eq("user_id", user_id).order("created_at", desc=False).execute()
        folders = folders_res.data or []
        notes_res = supabase_client.table("notes").select("folder_id").eq("user_id", user_id).execute()
        notes_data = notes_res.data or []
        counts: dict[str, int] = {}
        for n in notes_data:
            fid = n.get("folder_id")
            if fid:
                counts[fid] = counts.get(fid, 0) + 1
        for f in folders:
            f["note_count"] = counts.get(f["id"], 0)
        return folders
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM folders WHERE user_id = ? ORDER BY created_at ASC", (user_id,))
        folders = [dict(row) for row in cursor.fetchall()]
        cursor.execute("SELECT folder_id, COUNT(*) as count FROM notes WHERE user_id = ? AND folder_id IS NOT NULL GROUP BY folder_id", (user_id,))
        counts = {row["folder_id"]: row["count"] for row in cursor.fetchall()}
        conn.close()
        for f in folders:
            f["note_count"] = counts.get(f["id"], 0)
        return folders

def db_update_folder(folder_id: str, user_id: str, name: str, color: Optional[str] = None, icon: Optional[str] = None) -> dict:
    if supabase_client:
        row: dict[str, Any] = {"name": name}
        if color is not None: row["color"] = color
        if icon is not None: row["icon"] = icon
        supabase_client.table("folders").update(row).eq("id", folder_id).eq("user_id", user_id).execute()
        return {"message": "Folder updated"}
    else:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE folders 
            SET name = ?, color = COALESCE(?, color), icon = COALESCE(?, icon)
            WHERE id = ? AND user_id = ?
        """, (name, color, icon, folder_id, user_id))
        conn.commit()
        conn.close()
        return {"message": "Folder updated"}

def db_delete_folder(folder_id: str, user_id: str) -> dict:
    if supabase_client:
        supabase_client.table("notes").update({"folder_id": None}).eq("folder_id", folder_id).eq("user_id", user_id).execute()
        supabase_client.table("folders").delete().eq("id", folder_id).eq("user_id", user_id).execute()
        return {"message": "Folder deleted"}
    else:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE notes SET folder_id = NULL WHERE folder_id = ? AND user_id = ?", (folder_id, user_id))
        cursor.execute("DELETE FROM folders WHERE id = ? AND user_id = ?", (folder_id, user_id))
        conn.commit()
        conn.close()
        return {"message": "Folder deleted"}

def db_move_note_to_folder(note_id: str, user_id: str, folder_id: Optional[str]) -> dict:
    if supabase_client:
        supabase_client.table("notes").update({"folder_id": folder_id}).eq("id", note_id).eq("user_id", user_id).execute()
        return {"message": "Note moved successfully"}
    else:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE notes SET folder_id = ? WHERE id = ? AND user_id = ?", (folder_id, note_id, user_id))
        conn.commit()
        conn.close()
        return {"message": "Note moved successfully"}

def db_save_note(
    note_id: str,
    title: str,
    video_url: str,
    markdown: str,
    user_id: str,
    created_at: str,
    cheatsheet: Any = None,
    mindmap: Any = None,
    flashcards: Any = None,
    ai_podcast_url: Optional[str] = None,
    ai_debate_url: Optional[str] = None,
    folder_id: Optional[str] = None
) -> dict:
    if supabase_client:
        row = {
            "id": note_id,
            "title": title,
            "video_url": video_url or "",
            "markdown": markdown,
            "cheatsheet": json.dumps(cheatsheet) if cheatsheet else None,
            "mindmap": json.dumps(mindmap) if mindmap else None,
            "flashcards": json.dumps(flashcards) if flashcards else None,
            "created_at": created_at,
            "ai_podcast_url": ai_podcast_url,
            "ai_debate_url": ai_debate_url,
            "user_id": user_id,
            "folder_id": folder_id
        }
        supabase_client.table("notes").upsert(row).execute()
        return {"id": note_id, "message": "Note saved successfully"}
    else:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO notes (id, title, video_url, markdown, cheatsheet, mindmap, flashcards, created_at, ai_podcast_url, ai_debate_url, user_id, folder_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            note_id,
            title,
            video_url or "",
            markdown,
            json.dumps(cheatsheet) if cheatsheet else None,
            json.dumps(mindmap) if mindmap else None,
            json.dumps(flashcards) if flashcards else None,
            created_at,
            ai_podcast_url,
            ai_debate_url,
            user_id,
            folder_id
        ))
        conn.commit()
        conn.close()
        return {"id": note_id, "message": "Note saved successfully"}

def db_get_notes(user_id: str, folder_id: Optional[str] = None) -> list[dict]:
    if supabase_client:
        query = supabase_client.table("notes").select("id, title, created_at, video_url, folder_id").eq("user_id", user_id)
        if folder_id:
            query = query.eq("folder_id", folder_id)
        res = query.order("created_at", desc=True).execute()
        return res.data or []
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        if folder_id:
            cursor.execute("SELECT id, title, created_at, video_url, folder_id FROM notes WHERE user_id = ? AND folder_id = ? ORDER BY created_at DESC", (user_id, folder_id))
        else:
            cursor.execute("SELECT id, title, created_at, video_url, folder_id FROM notes WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
        notes = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return notes

def db_get_note(note_id: str, user_id: str) -> Optional[dict]:
    if supabase_client:
        res = supabase_client.table("notes").select("*").eq("id", note_id).eq("user_id", user_id).execute()
        if not res.data:
            return None
        data = res.data[0]
        for field in ["cheatsheet", "mindmap", "flashcards"]:
            if data.get(field) and isinstance(data[field], str):
                try:
                    data[field] = json.loads(data[field])
                except Exception:
                    pass
        return data
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM notes WHERE id = ? AND user_id = ?", (note_id, user_id))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        data = dict(row)
        if data.get("cheatsheet"):
            data["cheatsheet"] = json.loads(data["cheatsheet"])
        if data.get("mindmap"):
            data["mindmap"] = json.loads(data["mindmap"])
        if data.get("flashcards"):
            data["flashcards"] = json.loads(data["flashcards"])
        return data

def db_update_note(
    note_id: str,
    user_id: str,
    title: str,
    video_url: str,
    markdown: str,
    cheatsheet: Any = None,
    mindmap: Any = None,
    flashcards: Any = None,
    ai_podcast_url: Optional[str] = None,
    ai_debate_url: Optional[str] = None,
    folder_id: Optional[str] = None
) -> dict:
    if supabase_client:
        row = {
            "title": title,
            "video_url": video_url or "",
            "markdown": markdown,
            "cheatsheet": json.dumps(cheatsheet) if cheatsheet else None,
            "mindmap": json.dumps(mindmap) if mindmap else None,
            "flashcards": json.dumps(flashcards) if flashcards else None,
            "ai_podcast_url": ai_podcast_url,
            "ai_debate_url": ai_debate_url,
            "folder_id": folder_id
        }
        supabase_client.table("notes").update(row).eq("id", note_id).eq("user_id", user_id).execute()
        return {"message": "Note updated"}
    else:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE notes 
            SET title = ?, video_url = ?, markdown = ?, cheatsheet = ?, mindmap = ?, flashcards = ?, ai_podcast_url = ?, ai_debate_url = ?, folder_id = ?
            WHERE id = ? AND user_id = ?
        """, (
            title,
            video_url or "",
            markdown,
            json.dumps(cheatsheet) if cheatsheet else None,
            json.dumps(mindmap) if mindmap else None,
            json.dumps(flashcards) if flashcards else None,
            ai_podcast_url,
            ai_debate_url,
            folder_id,
            note_id,
            user_id
        ))
        conn.commit()
        conn.close()
        return {"message": "Note updated"}

def db_delete_note(note_id: str, user_id: str) -> dict:
    if supabase_client:
        supabase_client.table("notes").delete().eq("id", note_id).eq("user_id", user_id).execute()
        return {"message": "Note deleted"}
    else:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM notes WHERE id = ? AND user_id = ?", (note_id, user_id))
        conn.commit()
        conn.close()
        return {"message": "Note deleted"}


def get_allowed_origins() -> list[str]:
    raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return origins or ["*"]

app = FastAPI(title="AI Lecture Notes Generator API")

allowed_origins = get_allowed_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials="*" not in allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# --- Clerk JWT Authentication ---
CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL", "")
jwk_client = PyJWKClient(CLERK_JWKS_URL) if CLERK_JWKS_URL else None

def get_current_user_id(authorization: str = Header(None)) -> str:
    if not jwk_client:
        raise HTTPException(status_code=500, detail="Auth not configured")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.removeprefix("Bearer ")
    try:
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(token, signing_key.key, algorithms=["RS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no sub claim")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed")

def get_silence_bytes(duration_ms: int) -> bytes:
    filepath = os.path.join(STATIC_DIR, f"silence_{duration_ms}.mp3")
    if not os.path.exists(filepath):
        duration_sec = duration_ms / 1000.0
        subprocess.run([
            "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
            "-t", str(duration_sec), "-b:a", "48k", filepath
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if os.path.exists(filepath):
        with open(filepath, "rb") as f:
            return f.read()
    return b""

SILENCE_SENTENCE_END = get_silence_bytes(350)
SILENCE_SPEAKER_TURN = get_silence_bytes(550)
SILENCE_EXCLAMATION = get_silence_bytes(250)

# --- Multi-Engine AI Setup: Gemini Pool + Groq + OpenRouter + Transcript ---

def get_gemini_api_keys() -> list[str]:
    keys = []
    # 1. Check GEMINI_API_KEYS (comma-separated)
    raw_keys = os.getenv("GEMINI_API_KEYS", "")
    if raw_keys:
        for k in raw_keys.split(","):
            cleaned = k.strip()
            if cleaned and cleaned not in keys:
                keys.append(cleaned)
    # 2. Check GEMINI_API_KEY_1 through GEMINI_API_KEY_10
    for i in range(1, 11):
        k = os.getenv(f"GEMINI_API_KEY_{i}", "").strip()
        if k and k not in keys:
            keys.append(k)
    # 3. Check legacy GEMINI_API_KEY
    legacy = os.getenv("GEMINI_API_KEY", "").strip()
    if legacy and legacy not in keys:
        keys.append(legacy)
    return keys

gemini_keys = get_gemini_api_keys()
gemini_clients: list[genai.Client] = []
if gemini_keys:
    for k in gemini_keys:
        try:
            gemini_clients.append(genai.Client(api_key=k, http_options={'timeout': 300000}))
        except Exception as e:
            print(f"Error initializing Gemini client for key: {e}")

if not gemini_clients:
    gemini_clients = [genai.Client(http_options={'timeout': 300000})]

print(f"Initialized Gemini Key Pool with {len(gemini_clients)} active client(s).")

gemini_client_index = 0
gemini_pool_lock = threading.Lock()

def get_next_gemini_client() -> genai.Client:
    global gemini_client_index
    with gemini_pool_lock:
        client = gemini_clients[gemini_client_index % len(gemini_clients)]
        gemini_client_index = (gemini_client_index + 1) % len(gemini_clients)
        return client

# --- Groq & OpenRouter External LLMs ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()

groq_client = None
if GROQ_API_KEY:
    try:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_API_KEY)
        print("Groq client initialized successfully.")
    except Exception as e:
        print(f"Error initializing Groq client: {e}")

def call_groq_text(prompt: str, is_json: bool = False, model: str = "openai/gpt-oss-20b") -> str:
    if not groq_client:
        raise ValueError("Groq client not configured")
    messages = [{"role": "user", "content": prompt}]
    params: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": 0.2,
    }
    # NOTE: Do NOT set response_format={"type": "json_object"} here.
    # Groq's strict JSON validation rejects LaTeX backslashes (\mathbb, \cap, etc.)
    # before we can fix them. We parse JSON ourselves in parse_json_response().
    chat_completion = groq_client.chat.completions.create(**params)
    content = chat_completion.choices[0].message.content
    if not content:
        raise ValueError("Groq returned empty response")
    return content

def call_openrouter_text(prompt: str, is_json: bool = False, model: str = "openrouter/free") -> str:
    if not OPENROUTER_API_KEY:
        raise ValueError("OpenRouter API key not configured")
    import httpx
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://notejam.vercel.app",
        "X-Title": "NoteJam AI",
        "Content-Type": "application/json"
    }
    payload: dict[str, Any] = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2
    }
    # NOTE: Do NOT set response_format for OpenRouter either,
    # same LaTeX backslash issue as Groq.
    
    with httpx.Client(timeout=120.0) as client:
        resp = client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
        if resp.status_code != 200:
            print(f"OpenRouter primary model {model} returned {resp.status_code}. Retrying with llama-3-8b...")
            payload["model"] = "meta-llama/llama-3-8b-instruct:free"
            resp = client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        if not content:
            raise ValueError("OpenRouter returned empty response")
        return content

def get_public_base_url() -> str:
    return os.getenv("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/")

def _fix_latex_backslashes_for_json(text: str) -> str:
    """Fix unescaped LaTeX backslashes so json.loads won't crash.
    Scans character-by-character to properly double-escape backslashes
    that are LaTeX commands (not valid JSON escape sequences)."""
    result = []
    i = 0
    while i < len(text):
        if text[i] == '\\':
            # Check what follows the backslash
            if i + 1 < len(text):
                next_char = text[i + 1]
                if next_char == '\\':
                    # Already escaped (\\), keep both
                    result.append('\\\\')
                    i += 2
                    continue
                elif next_char == '"' or next_char == '/' :
                    # Valid JSON escapes: \" \/
                    result.append('\\')
                    result.append(next_char)
                    i += 2
                    continue
                elif next_char == 'u' and i + 5 < len(text) and all(c in '0123456789abcdefABCDEF' for c in text[i+2:i+6]):
                    # Valid JSON unicode escape: \uXXXX
                    result.append(text[i:i+6])
                    i += 6
                    continue
                elif next_char in 'bfnrt':
                    # Could be valid JSON escape (\b \f \n \r \t) OR LaTeX (\beta \frac \neq \right \theta \tau)
                    # Distinguish: if followed by more letters, it's LaTeX
                    if i + 2 < len(text) and text[i + 2].isalpha():
                        # LaTeX command like \frac, \beta, \right — double-escape
                        result.append('\\\\')
                        result.append(next_char)
                        i += 2
                        continue
                    else:
                        # Genuine JSON escape like \n or \t
                        result.append('\\')
                        result.append(next_char)
                        i += 2
                        continue
                else:
                    # Any other char after \ (like \m, \c, \l, \s, etc.) — LaTeX, double-escape
                    result.append('\\\\')
                    result.append(next_char)
                    i += 2
                    continue
            else:
                # Trailing backslash at end of string
                result.append('\\\\')
                i += 1
        else:
            result.append(text[i])
            i += 1
    return ''.join(result)

def parse_json_response(raw_text: str):
    cleaned = raw_text.strip()
    if cleaned.startswith("```json"):
        cleaned = re.sub(r"^```json\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    elif cleaned.startswith("```"):
        cleaned = re.sub(r"^```\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    # ALWAYS fix LaTeX backslashes first to prevent silent corruption
    # (e.g. \frac being parsed as form-feed + "rac" by json.loads)
    fixed = _fix_latex_backslashes_for_json(cleaned)
    try:
        return json.loads(fixed)
    except json.JSONDecodeError:
        pass

    # Fallback: extract outermost JSON structure, fix, and retry
    start_candidates = [idx for idx in (cleaned.find("{"), cleaned.find("[")) if idx != -1]
    if not start_candidates:
        raise json.JSONDecodeError("No JSON structure found", cleaned, 0)
    start = min(start_candidates)
    end = max(cleaned.rfind("}"), cleaned.rfind("]"))
    if end <= start:
        raise json.JSONDecodeError("No valid JSON structure found", cleaned, 0)
    substring = cleaned[start:end + 1]
    fixed_sub = _fix_latex_backslashes_for_json(substring)
    return json.loads(fixed_sub)

SYSTEM_PROMPT = """
You are Note Jam, an elite AI teaching assistant.
You will receive a lecture or tutorial video.
Your task is to convert this video into a beautifully structured, comprehensive, and highly readable set of Markdown notes.

Do not output a raw transcript. Analyze the video, extract the core concepts, and structure them logically.

CRITICAL INSTRUCTIONS FOR THE "markdown" FIELD:
- FORMATTING: Use **Bold** for keywords, *Italics* for definitions, and blockquotes for takeaways. Structure perfectly with #, ##, ###.
- MIND MAP: The VERY LAST thing in the markdown string MUST be a Mermaid.js diagram (wrapped in ```mermaid blocks) visualizing the hierarchy and connections of the core concepts taught in the lecture. It MUST be placed at the end of the document.
  * CRITICAL MERMAID RULES: Use `graph TD`. You MUST NOT use parentheses `()`, brackets `[]`, braces `{{}}`, or quotes `"` inside the visible node text. Keep node names extremely simple and alphanumeric only! (Example: `A[Control Systems] --> B[PID Controllers]`). Failure to follow this will break the renderer.
- VISUALS: You cannot output images. If the video contains important diagrams, graphs, flowcharts, tables, mathematical equations, chemical structures, circuit diagrams, or anything drawn on a whiteboard or slide, YOU MUST meticulously recreate them using Mermaid.js diagrams, highly detailed Markdown Tables, LaTeX matrices, or structured text. Do NOT skip any visual content — recreate everything the teacher writes or draws.
- MATH: YOU MUST USE LaTeX strictly for all math, variables, vectors, matrices, and superscripts. Inline: `$E = mc^2$`, `$R^n$`, `$A^T$`. Block: `$$...$$`. **CRITICAL: NEVER use markdown inline code backticks (like `R^n` or `A^T`) for math, vectors, or formulas. Always use dollar signs.**
- VIDEO SYNC: Heavily inject exact timestamp tags [MM:SS](#MM:SS) throughout the text whenever you explain a new concept, so the user can click them to sync the video.

LANGUAGE:
Translate and write the markdown notes entirely in the requested language: {language}.
Ensure the notes read like a premium study guide!
"""

MAX_PROCESS_JOBS = 200
PROCESS_JOBS: dict[str, dict] = {}
PROCESS_JOBS_LOCK = threading.Lock()

def update_process_job(job_id: str, **updates):
    with PROCESS_JOBS_LOCK:
        PROCESS_JOBS[job_id] = {
            **PROCESS_JOBS.get(job_id, {}),
            **updates,
            "updated_at": time.time()
        }
        if len(PROCESS_JOBS) > MAX_PROCESS_JOBS:
            removable_jobs = sorted(
                (
                    (job.get("updated_at", 0), old_job_id)
                    for old_job_id, job in PROCESS_JOBS.items()
                    if old_job_id != job_id and job.get("status") in {"complete", "failed"}
                )
            )
            for _, old_job_id in removable_jobs[:len(PROCESS_JOBS) - MAX_PROCESS_JOBS]:
                PROCESS_JOBS.pop(old_job_id, None)

class TokenLimitExceeded(Exception):
    pass

def is_token_limit_error(error: Exception) -> bool:
    err_str = str(error).lower()
    return (
        "input token count exceeds" in err_str
        or "maximum number of tokens allowed" in err_str
        or ("invalid_argument" in err_str and "token" in err_str)
    )

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash").strip()

def robust_gemini_call(contents, model=None, is_json=False):
    """Call Gemini with dynamic key rotation across all available clients in the pool."""
    active_model = model or GEMINI_MODEL
    num_clients = max(1, len(gemini_clients))
    max_attempts = max(4, num_clients * 2)
    last_error = None

    for attempt in range(max_attempts):
        client = get_next_gemini_client()
        try:
            kwargs = {'model': active_model, 'contents': contents}
            if is_json:
                kwargs['config'] = genai.types.GenerateContentConfig(response_mime_type="application/json")
            response = client.models.generate_content(**kwargs)
            if not response.text:
                raise ValueError("Model returned empty response.")
            return response.text
        except Exception as e:
            last_error = e
            err_str = str(e).lower()
            if is_token_limit_error(e):
                raise TokenLimitExceeded("This lecture is too long for direct video processing.") from e
            
            print(f"Gemini key attempt {attempt+1}/{max_attempts} ({active_model}) hit: {e}. Rotating to next key...")
            time.sleep(0.3)

    raise last_error or Exception("All Gemini API keys in pool were exhausted.")

def call_best_text_model(prompt: str, is_json: bool = False) -> str:
    """Universal text generation with automatic multi-provider fallback:
    1. Groq (Llama 3.3 70B) - Ultra-fast (1-2s), preserves 100% of Gemini video quota
    2. Gemini Dynamic Key Pool (4+ accounts) - High-intelligence fallback
    3. OpenRouter (DeepSeek / Llama) - Universal safety net
    """
    # 1. Primary: Try Groq (Llama 3.3 70B) for ultra-fast text inference
    if groq_client:
        try:
            return call_groq_text(prompt, is_json=is_json)
        except Exception as groq_err:
            print(f"Groq primary text call failed ({groq_err}). Falling back to Gemini Key Pool...")
    
    # 2. First Fallback: Try Gemini Key Pool
    try:
        return robust_gemini_call(contents=[prompt], is_json=is_json)
    except Exception as gemini_err:
        print(f"Gemini text pool fallback failed ({gemini_err}). Trying OpenRouter...")
    
    # 3. Second Fallback: Try OpenRouter (DeepSeek / Llama)
    if OPENROUTER_API_KEY:
        try:
            return call_openrouter_text(prompt, is_json=is_json)
        except Exception as openrouter_err:
            print(f"OpenRouter call failed ({openrouter_err})")
            
    raise Exception("All AI engines (Groq, Gemini pool, OpenRouter) are currently busy. Please try again in a few moments.")


def normalize_youtube_url(url: str) -> str:
    """Normalize any YouTube URL (live, shorts, embed, youtu.be, query params) 
    to the canonical https://www.youtube.com/watch?v=VIDEO_ID format that Gemini expects."""
    cleaned = url.strip()
    pattern = r'(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})'
    match = re.search(pattern, cleaned)
    if match:
        video_id = match.group(1)
        return f"https://www.youtube.com/watch?v={video_id}"
    return cleaned

def process_youtube_with_multi_tier(url: str, language: str, job_id: str) -> dict:
    canonical_url = normalize_youtube_url(url)
    
    # Gemini Native Video Engine across Key Pool (only tier)
    try:
        update_process_job(job_id, status="working", message="Analyzing video directly via Google Gemini...")
        print(f"Trying Gemini Native Video Engine for {canonical_url}")
        markdown_output = robust_gemini_call(
            contents=[
                genai.types.Part.from_uri(file_uri=canonical_url, mime_type="video/mp4"),
                SYSTEM_PROMPT.format(language=language)
            ],
            is_json=False
        )
        return {"markdown": markdown_output}
    except Exception as e:
        error_msg = str(e).lower()
        print(f"Gemini Video Engine failed: {e}")
        
        # Detect failure reason and show appropriate user-friendly message
        if "too long" in error_msg or "duration" in error_msg or "length" in error_msg or "deadline" in error_msg or "timeout" in error_msg:
            raise Exception(
                "This video is too long for direct URL processing. "
                "Please upload a shorter video or upload the video file directly."
            )
        elif "rate" in error_msg or "quota" in error_msg or "limit" in error_msg or "429" in error_msg or "resource" in error_msg or "exhausted" in error_msg:
            raise Exception(
                "Our servers are experiencing high traffic right now. "
                "Please try again in a few minutes, or upload the video file directly."
            )
        else:
            raise Exception(
                "Could not process this video. "
                "Please try again or upload the video file directly."
            )

def process_uploaded_file_and_generate_notes(media_path: str, language: str = "English") -> dict:
    """Process an uploaded video/audio file by uploading it to the Gemini File API."""
    print("Uploading media to Gemini...")
    client = get_next_gemini_client()
    uploaded_file = None
    try:
        uploaded_file = client.files.upload(file=media_path)
        assert uploaded_file is not None
        assert uploaded_file.name is not None
        assert uploaded_file.state is not None

        # Wait for the file to be processed
        while uploaded_file.state.name == "PROCESSING":
            print('Processing file in Gemini...', flush=True)
            time.sleep(10)
            uploaded_file = client.files.get(name=uploaded_file.name)

        if uploaded_file.state.name == "FAILED":
            raise ValueError("File processing in Gemini failed.")

        print("Generating notes...")
        markdown_output = robust_gemini_call(
            contents=[uploaded_file, SYSTEM_PROMPT.format(language=language)],
            is_json=False
        )

        return {"markdown": markdown_output}
    finally:
        if uploaded_file and uploaded_file.name:
            try:
                client.files.delete(name=uploaded_file.name)
            except Exception as e:
                print(f"Failed to delete file from Gemini: {e}")

def generate_ai_title(markdown_text: str) -> str:
    try:
        title_prompt = f"""
Read the following lecture notes and generate a short, punchy, professional 3-6 word title that captures the core subject.
Return strictly the title text ONLY. Do NOT use quotes, markdown formatting, prefixes, or punctuation at the end.

Notes:
{markdown_text[:3000]}
"""
        title = call_best_text_model(title_prompt, is_json=False)
        cleaned_title = title.strip().replace('"', '').replace("'", "").replace('#', '').strip()
        if not cleaned_title or len(cleaned_title) > 80:
            cleaned_title = "Untitled Lecture Note"
        return cleaned_title
    except Exception as e:
        print(f"Error generating AI title: {e}")
        return "Untitled Lecture Note"

def run_process_job(job_id: str, language: str, user_id: str, url: Optional[str] = None, video_path: str = ""):
    try:
        if url:
            result = process_youtube_with_multi_tier(url, language, job_id)
        elif video_path and os.path.exists(video_path):
            update_process_job(job_id, status="working", message="Uploading and analyzing your lecture video...")
            result = process_uploaded_file_and_generate_notes(video_path, language)
        else:
            raise ValueError("No valid video URL or file provided.")

        markdown_output = result.get("markdown", "")
        
        # Smart AI Title Generation & Auto-Save
        update_process_job(job_id, status="working", message="Generating smart title and saving notes...")
        ai_title = generate_ai_title(markdown_output)
        note_id = uuid.uuid4().hex
        created_at = datetime.now().isoformat()
        
        db_save_note(
            note_id=note_id,
            title=ai_title,
            video_url=url or "",
            markdown=markdown_output,
            user_id=user_id,
            created_at=created_at
        )

        result["note_id"] = note_id
        result["title"] = ai_title

        update_process_job(job_id, status="complete", message="Notes ready", result=result)
    except Exception as e:
        print(f"Error processing video job {job_id}: {e}")
        error_str = str(e).lower()
        # Pass through specific user-friendly error messages, use generic fallback for unexpected errors
        if any(keyword in error_str for keyword in ["too long", "upload", "high traffic", "try again", "rate limit", "shorter video"]):
            message = str(e)
        else:
            message = "NoteJam could not process this lecture. Please try another link or upload the video file directly."
        update_process_job(job_id, status="failed", message=message)
    finally:
        if video_path and os.path.exists(video_path):
            os.remove(video_path)

@app.post("/process")
async def process_lecture(
    url: Optional[str] = Form(None),
    file: Optional[UploadFile] = None,
    language: str = Form("English"),
    user_id: str = Depends(get_current_user_id)
):
    if not url and not file:
        raise HTTPException(status_code=400, detail="Must provide either a url or a file.")

    job_id = uuid.uuid4().hex
    video_path = ""
    update_process_job(job_id, status="queued", message="Preparing your lecture...")

    if file:
        safe_filename = os.path.basename(file.filename or "upload.mp4")
        video_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}_{safe_filename}")
        with open(video_path, "wb") as buffer:
            buffer.write(await file.read())

    worker = threading.Thread(
        target=run_process_job,
        kwargs={"job_id": job_id, "language": language, "user_id": user_id, "url": url, "video_path": video_path},
        daemon=True
    )
    worker.start()
    return {"job_id": job_id, "status": "queued", "message": "Preparing your lecture..."}

@app.get("/process/{job_id}")
def get_process_job(job_id: str, user_id: str = Depends(get_current_user_id)):
    with PROCESS_JOBS_LOCK:
        job = PROCESS_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Processing job not found.")
    return job

class FlashcardRequest(BaseModel):
    markdown: str

@app.post("/flashcards")
def create_flashcards(req: FlashcardRequest, user_id: str = Depends(get_current_user_id)):
    prompt = f"""
    Based on the following lecture notes, create a highly effective set of spaced-repetition flashcards.
    Depending on the depth and length of the notes, generate anywhere from 10 to 50 flashcards (10 being the minimum, 50 being the maximum).
    CRITICAL: For math, equations, vectors, or superscripts, YOU MUST use LaTeX with dollar signs (e.g. $R^n$, $A^T$, $E=mc^2$). Do NOT use raw carets (^) or backticks for math.
    CRITICAL JSON RULE: You MUST properly escape all backslashes in LaTeX for valid JSON. For example, write \\\\mathbb instead of \\mathbb, and \\\\cap instead of \\cap. Failure to double-escape backslashes will break the parser.

    Output a strictly valid JSON array of objects, where each object has exactly three keys: "question", "answer", and "explanation".
    The "explanation" should be a brief 1-2 sentence clarification of WHY the answer is correct, to help the student understand if they get confused.
    
    Notes:
    {req.markdown}
    """
    try:
        raw_text = robust_gemini_call(contents=[prompt], is_json=True)
        flashcards = parse_json_response(raw_text)
        return {"flashcards": flashcards}
    except Exception as e:
        print(f"Error generating flashcards: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class DocumentRequest(BaseModel):
    markdown: str

@app.post("/cheatsheet")
def create_cheatsheet(req: DocumentRequest, user_id: str = Depends(get_current_user_id)):
    prompt = f"""
    Based on the following lecture notes, extract 3-7 critical formulas, equations, or short key definitions.
    CRITICAL: For math, equations, vectors, or superscripts, YOU MUST use LaTeX with dollar signs (e.g. $R^n$, $A^T$, $E=mc^2$). Do NOT use raw carets (^) or backticks for math.
    CRITICAL JSON RULE: You MUST properly escape all backslashes in LaTeX for valid JSON. For example, write \\\\mathbb instead of \\mathbb, and \\\\cap instead of \\cap. Failure to double-escape backslashes will break the parser.
    Return ONLY a valid JSON array of strings. No markdown formatting outside the JSON array.
    Example: ["E=mc^2: Energy equals mass times the speed of light squared.", "Newton's First Law: An object at rest stays at rest."]
    
    Notes:
    {req.markdown}
    """
    try:
        raw_text = robust_gemini_call(contents=[prompt], is_json=True)
        return {"cheatsheet": parse_json_response(raw_text)}
    except Exception as e:
        print(f"Error generating cheatsheet: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/mindmap")
def create_mindmap(req: DocumentRequest, user_id: str = Depends(get_current_user_id)):
    prompt = f"""
    You are the lead content architect for NoteJam's content-adaptive vector revision sheet renderer.
    Your job is to analyze lecture notes, classify their intrinsic structural archetype, and extract a high-signal revision data model.
    Do NOT describe layout coordinates or SVG.

    First, classify the natural shape of this lecture's knowledge and set `structureType`:
    - "sequence": For processes, algorithms, protocols, step-by-step executions, or cause->effect chains.
    - "hierarchy": For taxonomies, classifications, system architectures, or types-and-subtypes trees.
    - "comparison": For lectures fundamentally contrasting two things ("X vs Y", "TCP vs UDP", pros/cons).
    - "timeline": For chronological evolutions or historical milestones.
    - "hub": For general conceptual or definitional topics revolving around one central theme (default/fallback).

    Return ONLY a strictly valid JSON object with this exact schema:
    {{
      "version": "revision-sheet-v2",
      "title": "2-6 word revision title",
      "centralConcept": "2-5 word central concept (<=28 chars)",
      "thesis": "one short sentence capturing the single big idea",
      "structureType": "hub|sequence|hierarchy|comparison|timeline",
      "sections": [
        {{
          "title": "short section heading (<=26 chars)",
          "cue": "tiny question/role cue (e.g. 'What is it?', 'How it Works', 'Core Rule')",
          "kind": "definition|formula|process|example|application|warning|result",
          "importance": 1,
          "icon": "bulb|gear|box|target|chart|formula|book|atom|code|warning|check",
          "bullets": [
            "complete standalone phrase (<=48 chars)",
            "complete standalone phrase (<=48 chars)"
          ],
          "parentTitle": null,
          "compareGroup": null,
          "timeMarker": null
        }}
      ],
      "flow": ["Exact Section Title A", "Exact Section Title B"],
      "formulas": [
        {{"label": "formula name", "detail": "concise equation or condition", "relatedSection": "optional section title"}}
      ],
      "examples": [
        {{"label": "example name", "detail": "short real-world detail", "relatedSection": "optional section title"}}
      ],
      "takeaways": [
        "concise exam takeaway bullet (<=60 chars)",
        "concise exam takeaway bullet (<=60 chars)"
      ],
      "compareGroupLabels": {{"A": "left entity name", "B": "right entity name"}}
    }}

    Strict Rules & Guidelines:
    1. Structure Rules:
       - When structureType is "sequence" or "timeline": `flow` MUST list section titles in exact execution/chronological order, and every entry must match a `sections[].title`. Use `timeMarker` (e.g. "Step 1", "Phase 2", "1983").
       - When structureType is "hierarchy": set `parentTitle` on subtopics to point to their parent `sections[].title`. Deep chains (root -> subcategory -> leaf) are encouraged.
       - When structureType is "comparison": every section must have `compareGroup` of "A" or "B", and `compareGroupLabels` must explicitly name A and B.
       - For "hub": generate 4 to 6 high-quality sections with clear priority.
    2. Section Count & Sizing:
       - Generate 5 to 7 sections total. Keep quality and brevity high.
       - Assign `importance` (1, 2, or 3). Tag 1-3 primary concepts as `importance: 1`, secondary details as `2`, and compact chips as `3`.
    3. Bullet Quality & Math:
       - Write each bullet as a complete, standalone revision phrase a student could read aloud.
       - NEVER truncate mid-thought or write fragmented labels like "Program Execution (Crucial)".
       - Maximum 48 characters per bullet. Summarize naturally to fit this limit. DO NOT abruptly truncate sentences.
       - CRITICAL: If the text contains math, equations, vectors, or superscripts, YOU MUST use inline LaTeX with dollar signs (e.g. $R^n$, $A^T$, $E=mc^2$). Do NOT use raw carets (^) or backticks for math.
       - CRITICAL JSON RULE: You MUST properly escape all backslashes in LaTeX for valid JSON. For example, write \\\\mathbb instead of \\mathbb, and \\\\cap instead of \\cap.
       - 2 to 3 bullets per section.
    4. Formulas, Examples & Takeaways:
       - Extract standalone formulas and practical examples into their dedicated arrays with `relatedSection` when taught in notes.
       - Include 2 to 4 high-yield `takeaways` for exam revision.
    5. Icons & Kinds:
       - Choose `kind` intentionally (`definition`, `formula`, `process`, `example`, `application`, `warning`, `result`).
       - Choose matching `icon` from the allowed set.

    Notes:
    {req.markdown}
    """
    try:
        raw_text = robust_gemini_call(contents=[prompt], is_json=True)
        data = parse_json_response(raw_text)
        data["version"] = "revision-sheet-v2"
        return {"mindmap": data}
    except Exception as e:
        print(f"Error generating mindmap: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class SimplifyRequest(BaseModel):
    text: str

@app.post("/simplify")
def simplify_text(req: SimplifyRequest, user_id: str = Depends(get_current_user_id)):
    prompt = f"""
    You are an expert, empathetic tutor. Your task is to take the following complex academic text 
    and explain it simply, as if you were talking to a beginner or a 5-year-old.
    Use an analogy if helpful. Keep it concise, engaging, and easy to digest.
    Do not use complex jargon.
    
    Text to simplify:
    "{req.text}"
    """
    try:
        raw_text = call_best_text_model(prompt=prompt, is_json=False)
        return {"explanation": raw_text.strip()}
    except Exception as e:
        print(f"Error simplifying text: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    markdown: str
    question: str
    history: list[ChatMessage]

@app.post("/chat")
def chat_lecture(req: ChatRequest, user_id: str = Depends(get_current_user_id)):
    history_text = ""
    for msg in req.history:
        role_name = "Student" if msg.role == "user" else "Assistant"
        history_text += f"{role_name}: {msg.content}\n"
        
    prompt = f"""
    You are an expert study assistant. You must answer the student's questions using ONLY the provided lecture notes.
    If the answer is not contained in the notes, say "I cannot answer this based on the lecture notes."
    Be helpful, direct, and conversational.
    
    Lecture Notes:
    {req.markdown}
    
    ---
    Conversation History:
    {history_text}
    
    Student's New Question:
    {req.question}
    """
    try:
        raw_text = call_best_text_model(prompt=prompt, is_json=False)
        return {"answer": raw_text.strip()}
    except Exception as e:
        print(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class PodcastRequest(BaseModel):
    markdown: str
    language: str = "hindi"
    scenario: str = "podcast"

@app.post("/podcast")
async def generate_podcast(req: PodcastRequest, user_id: str = Depends(get_current_user_id)):
    try:
        scenario_desc = ""
        if req.scenario == "podcast":
            scenario_desc = "A deep-dive AI Audio Podcast. Do NOT just summarize the notes. Focus on mind-blowing intuitions, underlying logic, out-of-the-box reasoning, and connecting dots between historical events or concepts."
        elif req.scenario == "debate":
            scenario_desc = "A fierce but friendly AI Audio Debate. Look at the topic from completely different angles. Discuss out-of-the-box reasoning, clear common misconceptions, and passionately defend different perspectives. DO NOT just read the notes. Make it sound like a real, heated intellectual discussion."
        else:
            scenario_desc = "A friendly and educational discussion."

        prompt = f"""
You are a master scriptwriter. Create a highly engaging, emotional, and natural educational audio script based on the following lecture notes.
Language: {req.language} (If Hindi, use natural conversational Hindi written in Devanagari script).
Scenario: {scenario_desc}

Host 1: Chetan (Curious, insightful, drives the conversation, asks great questions, shows emotion)
Host 2: Anamika (Knowledgeable Indian college girl, connects dots, provides deep intuitions, clears misconceptions, shows excitement)

CRITICAL INSTRUCTION FOR NATURAL SPEECH:
1. USE NATURAL PUNCTUATION. Use commas (,) for short pauses, periods (.) for strong boundaries, and question marks (?) for interrogative intonation.
2. INCLUDE REACTION LATENCY AND OVERLAP. Start responses with natural hesitation markers or micro-reactions (e.g., "Yeah...", "Wait-", "Right, but...", "uh...", "I mean...").
3. VARY THE SENTENCE LENGTH. Break down information-dense explanations into shorter, rhythmic phrases.

The script MUST be returned as a raw JSON array of objects, with NO markdown formatting, NO ```json blocks. Just the raw JSON array.
Each object must have:
- "speaker": "Chetan" or "Anamika"
- "text": The spoken text
- "emotion": A short string like "excited", "curious", "calm", "surprised", "emphatic"
- "is_question": true/false (true if the primary intent is asking a question)

Example:
[
  {{"speaker": "Chetan", "text": "Hi Anamika, aaj hum kis baare me baat karne wale hain?", "emotion": "curious", "is_question": true}},
  {{"speaker": "Anamika", "text": "Haan Chetan... aaj ka topic sach me mind blowing hai.", "emotion": "excited", "is_question": false}},
  {{"speaker": "Chetan", "text": "Are waah! Mujhe detail me batao.", "emotion": "surprised", "is_question": false}},
  {{"speaker": "Anamika", "text": "Bilkul! To shuru karte hain.", "emotion": "emphatic", "is_question": false}}
]

Lecture Notes:
{req.markdown}
"""
        raw_text = robust_gemini_call(contents=[prompt], is_json=True)
        if not raw_text:
            raise ValueError("Model failed to generate a response.")
            
        script = parse_json_response(raw_text)
        import edge_tts
        import asyncio
        import re
        final_audio = b""
        
        async def generate_chunk_audio(text_chunk, voice, pitch, rate, volume):
            audio_bytes = b""
            for tts_attempt in range(3):
                try:
                    communicate = edge_tts.Communicate(text_chunk, voice, pitch=pitch, rate=rate, volume=volume)
                    async for chunk in communicate.stream():
                        if chunk["type"] == "audio":
                            audio_bytes += chunk["data"]
                    return audio_bytes
                except Exception as tts_err:
                    if tts_attempt < 2:
                        await asyncio.sleep(2)
                    else:
                        raise tts_err
            return b""
        
        EMOTION_TO_PARAMS = {
            "excited":   {"rate": "+8%",  "pitch": "+8Hz",  "volume": "+0%"},
            "curious":   {"rate": "+2%",  "pitch": "+4Hz",  "volume": "+0%"},
            "calm":      {"rate": "-8%",  "pitch": "-2Hz",  "volume": "+0%"},
            "surprised": {"rate": "+10%", "pitch": "+12Hz", "volume": "+0%"},
            "emphatic":  {"rate": "+3%",  "pitch": "+2Hz",  "volume": "+10%"},
        }
        
        for line_idx, line in enumerate(script):
            speaker = line.get("speaker", "Chetan")
            text = line.get("text", "")
            emotion = line.get("emotion", "calm")
            is_question = line.get("is_question", False)
            if not text: continue
            
            if req.language.lower() == "english":
                voice = "en-IN-PrabhatNeural" if "Chetan" in speaker else "en-IN-NeerjaNeural"
            else:
                voice = "hi-IN-MadhurNeural" if "Chetan" in speaker else "hi-IN-SwaraNeural"
                
            raw_chunks = re.split(r'([.?!]+)', text)
            
            chunks = []
            for i in range(0, len(raw_chunks), 2):
                part = raw_chunks[i]
                punct = raw_chunks[i+1] if i+1 < len(raw_chunks) else ""
                combined = (part + punct).strip()
                if combined:
                    chunks.append((combined, punct))
            
            tasks = []
            for chunk_text, punct in chunks:
                params = EMOTION_TO_PARAMS.get(emotion, {"rate": "+0%", "pitch": "+0Hz", "volume": "+0%"})
                pitch = params["pitch"]
                rate = params["rate"]
                volume = params["volume"]
                
                if is_question or '?' in punct:
                    # Subtle baseline lift instead of +15Hz
                    pitch = "+4Hz"
                    
                tasks.append(generate_chunk_audio(chunk_text, voice, pitch, rate, volume))
                
            chunk_audios = await asyncio.gather(*tasks)
            
            for i, (chunk_text, punct) in enumerate(chunks):
                final_audio += chunk_audios[i]
                
                if '?' in punct:
                    final_audio += SILENCE_SENTENCE_END
                elif '!' in punct:
                    final_audio += SILENCE_EXCLAMATION
                elif '.' in punct:
                    final_audio += SILENCE_SENTENCE_END
                    
            if line_idx < len(script) - 1:
                final_audio += SILENCE_SPEAKER_TURN
            
        filename = f"podcast_{uuid.uuid4().hex[:8]}.mp3"
        filepath = os.path.join(STATIC_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(final_audio)
            
        return {"url": f"{get_public_base_url()}/api/audio/{filename}"}
        
    except Exception as e:
        print(f"Error generating podcast: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import FileResponse

@app.get("/api/audio/{filename}")
def get_audio(filename: str):
    safe_filename = os.path.basename(filename)
    filepath = os.path.join(STATIC_DIR, safe_filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Audio not found")
    media_type = "audio/mpeg"
    return FileResponse(filepath, media_type=media_type, headers={"Accept-Ranges": "none"})




class FolderData(BaseModel):
    name: str
    color: Optional[str] = "#38bdf8"
    icon: Optional[str] = "📚"

class MoveNoteRequest(BaseModel):
    folder_id: Optional[str] = None

class NoteData(BaseModel):
    title: str
    video_url: Optional[str] = None
    markdown: str
    cheatsheet: Optional[list] = None
    mindmap: Optional[dict] = None
    flashcards: Optional[list] = None
    ai_podcast_url: Optional[str] = None
    ai_debate_url: Optional[str] = None
    folder_id: Optional[str] = None

# --- Folder Management Endpoints ---
@app.get("/folders")
def get_folders(user_id: str = Depends(get_current_user_id)):
    folders = db_get_folders(user_id)
    return {"folders": folders}

@app.post("/folders")
def create_folder(folder: FolderData, user_id: str = Depends(get_current_user_id)):
    folder_id = uuid.uuid4().hex
    created_at = datetime.now().isoformat()
    return db_create_folder(
        folder_id=folder_id,
        name=folder.name.strip(),
        color=folder.color,
        icon=folder.icon,
        user_id=user_id,
        created_at=created_at
    )

@app.put("/folders/{folder_id}")
def update_folder(folder_id: str, folder: FolderData, user_id: str = Depends(get_current_user_id)):
    return db_update_folder(
        folder_id=folder_id,
        user_id=user_id,
        name=folder.name.strip(),
        color=folder.color,
        icon=folder.icon
    )

@app.delete("/folders/{folder_id}")
def delete_folder(folder_id: str, user_id: str = Depends(get_current_user_id)):
    return db_delete_folder(folder_id, user_id)

@app.put("/notes/{note_id}/folder")
def move_note_to_folder(note_id: str, req: MoveNoteRequest, user_id: str = Depends(get_current_user_id)):
    return db_move_note_to_folder(note_id, user_id, req.folder_id)

# --- Note Endpoints ---
@app.post("/notes")
def save_note(note: NoteData, user_id: str = Depends(get_current_user_id)):
    note_id = uuid.uuid4().hex
    created_at = datetime.now().isoformat()
    return db_save_note(
        note_id=note_id,
        title=note.title,
        video_url=note.video_url or "",
        markdown=note.markdown,
        user_id=user_id,
        created_at=created_at,
        cheatsheet=note.cheatsheet,
        mindmap=note.mindmap,
        flashcards=note.flashcards,
        ai_podcast_url=note.ai_podcast_url,
        ai_debate_url=note.ai_debate_url,
        folder_id=note.folder_id
    )

@app.get("/notes")
def get_notes(folder_id: Optional[str] = None, user_id: str = Depends(get_current_user_id)):
    notes = db_get_notes(user_id, folder_id=folder_id)
    return {"notes": notes}

@app.get("/notes/{note_id}")
def get_note(note_id: str, user_id: str = Depends(get_current_user_id)):
    note = db_get_note(note_id, user_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@app.put("/notes/{note_id}")
def update_note(note_id: str, note: NoteData, user_id: str = Depends(get_current_user_id)):
    return db_update_note(
        note_id=note_id,
        user_id=user_id,
        title=note.title,
        video_url=note.video_url or "",
        markdown=note.markdown,
        cheatsheet=note.cheatsheet,
        mindmap=note.mindmap,
        flashcards=note.flashcards,
        ai_podcast_url=note.ai_podcast_url,
        ai_debate_url=note.ai_debate_url,
        folder_id=note.folder_id
    )

@app.delete("/notes/{note_id}")
def delete_note(note_id: str, user_id: str = Depends(get_current_user_id)):
    return db_delete_note(note_id, user_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)




