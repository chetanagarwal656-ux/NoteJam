import os
import re
import uuid
import subprocess
import time
import json
from typing import Optional
from fastapi import FastAPI, UploadFile, Form, HTTPException, Header, Depends
from pydantic import BaseModel
import threading
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from google import genai
import yt_dlp
from dotenv import load_dotenv
import sqlite3
from datetime import datetime
import jwt
from jwt import PyJWKClient

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

def get_allowed_origins() -> list[str]:
    raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return origins or ["*"]

# Initialize Database
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
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
    conn.commit()
    conn.close()

init_db()

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

import subprocess

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

client = genai.Client(http_options={'timeout': 3600000}) 

def get_public_base_url() -> str:
    return os.getenv("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/")


def parse_json_response(raw_text: str):
    cleaned = raw_text.strip()
    if cleaned.startswith("```json"):
        cleaned = re.sub(r"^```json\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    elif cleaned.startswith("```"):
        cleaned = re.sub(r"^```\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    # Attempt to fix invalid JSON escapes (e.g. \- or \.) often produced by LLMs
    cleaned = re.sub(r'\\([^"\\/bfnrtu])', r'\1', cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start_candidates = [idx for idx in (cleaned.find("{"), cleaned.find("[")) if idx != -1]
        if not start_candidates:
            raise
        start = min(start_candidates)
        end = max(cleaned.rfind("}"), cleaned.rfind("]"))
        if end <= start:
            raise
        return json.loads(cleaned[start:end + 1])

SYSTEM_PROMPT = """
You are Note Jam, an elite AI teaching assistant.
You will receive a video file representing a lecture or tutorial.
Your task is to convert this video into a beautifully structured, comprehensive, and highly readable set of Markdown notes.

Do not output a raw transcript. Analyze the video, extract the core concepts, and structure them logically.

CRITICAL INSTRUCTIONS FOR THE "markdown" FIELD:
- FORMATTING: Use **Bold** for keywords, *Italics* for definitions, and blockquotes for takeaways. Structure perfectly with #, ##, ###.
- MIND MAP: The VERY LAST thing in the markdown string MUST be a Mermaid.js diagram (wrapped in ```mermaid blocks) visualizing the hierarchy and connections of the core concepts taught in the lecture. It MUST be placed at the end of the document.
  * CRITICAL MERMAID RULES: Use `graph TD`. You MUST NOT use parentheses `()`, brackets `[]`, braces `{{}}`, or quotes `"` inside the visible node text. Keep node names extremely simple and alphanumeric only! (Example: `A[Control Systems] --> B[PID Controllers]`). Failure to follow this will break the renderer.
- VISUALS: If a frame contains a diagram, graph, mathematical equation, or chemical structure, but the professor is physically blocking it or it is blurry, YOU MUST recreate it yourself using highly detailed Markdown Tables, LaTeX matrices, or structured text.
- MATH: Use LaTeX strictly. Inline: `$E = mc^2$`. Block: `$$...$$`.
- VIDEO SYNC: Heavily inject exact timestamp tags `[MM:SS]` throughout the text whenever you explain a new concept, so the user can click them to sync the video.
- FRAME EXTRACTION: YOU MUST extract at least 2 frames! When the teacher writes an important formula or draws a diagram, exactly insert: [EXTRACT_FRAME_AT_MM:SS] (e.g. [EXTRACT_FRAME_AT_01:23]). Do NOT skip this step!

LANGUAGE:
Translate and write BOTH the markdown notes and the `<cheatsheet>` entirely in the requested language: {language}.
Ensure the notes read like a premium study guide!
"""

AUDIO_SYSTEM_PROMPT = """
You are Note Jam, an elite AI teaching assistant.
You will receive the audio track of a lecture or tutorial.
Your task is to convert this lecture audio into beautifully structured, comprehensive, and highly readable Markdown notes.

The original video was too long to process visually, so focus on everything clearly taught or explained by the professor.
Do not hallucinate diagrams or board content that is not present in the audio.

CRITICAL INSTRUCTIONS:
- Do not output a raw transcript. Analyze the lecture and structure the concepts logically.
- Preserve all important definitions, examples, steps, formulas, comparisons, and professor explanations.
- Use **Bold** for keywords, *Italics* for definitions, and blockquotes for takeaways.
- Use #, ##, and ### headings to make the notes easy to revise.
- Use LaTeX for math. Inline: `$E = mc^2$`. Block: `$$...$$`.
- Add timestamp tags `[MM:SS]` when a new concept begins if timing can be inferred.
- The VERY LAST thing in the markdown string MUST be a Mermaid.js diagram wrapped in ```mermaid blocks.
- For Mermaid, use `graph TD` and keep visible node text simple and alphanumeric.

LANGUAGE:
Translate and write the markdown notes entirely in the requested language: {language}.
Ensure the notes read like a premium study guide!
"""

MERGE_CHUNK_NOTES_PROMPT = """
You are Note Jam, an elite AI teaching assistant.
You will receive notes generated from consecutive 25-minute video chunks of the same lecture.

Your task is to merge them into one polished, coherent, premium study guide.

CRITICAL INSTRUCTIONS:
- Preserve lecture-grounded details from every chunk.
- Remove duplicated explanations caused by chunk boundaries.
- Keep the original learning order of the lecture.
- Keep important timestamps when available.
- Keep image markdown links when they appear in the chunk notes.
- Do not invent content that is not present in the chunk notes.
- Use #, ##, and ### headings.
- Use **Bold** for key terms, *Italics* for definitions, blockquotes for takeaways, and LaTeX for formulas.
- The VERY LAST thing in the markdown string MUST be a Mermaid.js diagram wrapped in ```mermaid blocks.
- For Mermaid, use `graph TD` and keep visible node text simple and alphanumeric.

LANGUAGE:
Write the final notes entirely in the requested language: {language}.

Chunk notes:
{chunk_notes}
"""

import imageio_ffmpeg

CHUNK_SECONDS = 25 * 60
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

def extract_frame(video_path: str, timestamp_str: str, output_filename: str):
    output_path = os.path.join(STATIC_DIR, output_filename)
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    command = [
        ffmpeg_exe,
        "-ss", timestamp_str,
        "-i", video_path,
        "-vframes", "1",
        "-q:v", "2",
        output_path,
        "-y"
    ]
    try:
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return f"{get_public_base_url()}/static/{output_filename}"
    except subprocess.CalledProcessError as e:
        print(f"Error extracting frame at {timestamp_str}: {e.stderr.decode()}")
        return None
def robust_gemini_call(contents, model='gemini-2.5-flash', is_json=False):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            kwargs = {'model': model, 'contents': contents}
            if is_json:
                kwargs['config'] = genai.types.GenerateContentConfig(response_mime_type="application/json")
            response = client.models.generate_content(**kwargs)
            if not response.text:
                raise ValueError("Model returned empty response.")
            return response.text
        except Exception as e:
            err_str = str(e).lower()
            if is_token_limit_error(e):
                raise TokenLimitExceeded(
                    "This lecture is too long for visual processing. Retrying with an audio-only study-notes mode."
                ) from e
            if "429" in err_str or "503" in err_str or "quota" in err_str:
                if attempt < max_retries - 1:
                    print(f"API Rate limit/Overload hit. Retrying in 65 seconds... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(65)
                else:
                    raise Exception("You have hit the Google Gemini API rate limit or quota limit. Please wait a few minutes and try again.")
            else:
                raise e
    raise Exception("Failed to generate content after retries.")

def extract_audio_track(video_path: str) -> str:
    audio_path = os.path.join(TEMP_DIR, f"audio_{uuid.uuid4().hex[:8]}.mp3")
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    command = [
        ffmpeg_exe,
        "-i", video_path,
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        "-b:a", "48k",
        audio_path,
        "-y"
    ]
    subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return audio_path

def get_media_duration_seconds(media_path: str) -> float:
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    command = [ffmpeg_exe, "-i", media_path]
    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output = result.stderr.decode(errors="ignore")
    match = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", output)
    if not match:
        raise ValueError("Could not determine video duration for chunking.")
    hours, minutes, seconds = match.groups()
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)

def split_video_into_chunks(video_path: str, chunk_seconds: int = CHUNK_SECONDS) -> list[str]:
    duration = get_media_duration_seconds(video_path)
    chunk_paths: list[str] = []
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    total_chunks = max(1, int((duration + chunk_seconds - 1) // chunk_seconds))

    for index in range(total_chunks):
        start = index * chunk_seconds
        chunk_path = os.path.join(TEMP_DIR, f"chunk_{uuid.uuid4().hex[:8]}_{index + 1}.mp4")
        command = [
            ffmpeg_exe,
            "-ss", str(start),
            "-t", str(chunk_seconds),
            "-i", video_path,
            "-vf", "scale='min(854,iw)':-2",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "35",
            "-c:a", "aac",
            "-b:a", "64k",
            "-movflags", "+faststart",
            chunk_path,
            "-y"
        ]
        try:
            subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except subprocess.CalledProcessError:
            fallback_command = [
                ffmpeg_exe,
                "-ss", str(start),
                "-t", str(chunk_seconds),
                "-i", video_path,
                "-c", "copy",
                chunk_path,
                "-y"
            ]
            subprocess.run(fallback_command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        chunk_paths.append(chunk_path)

    return chunk_paths

def merge_chunk_notes(chunk_notes: list[str], language: str) -> str:
    combined_notes = "\n\n---\n\n".join(chunk_notes)
    return robust_gemini_call(
        contents=[MERGE_CHUNK_NOTES_PROMPT.format(language=language, chunk_notes=combined_notes)],
        is_json=False
    )

def process_chunked_video_and_generate_notes(video_path: str, language: str = "English") -> dict:
    print("Processing video in 25-minute chunks.")
    chunk_paths: list[str] = []
    audio_paths: list[str] = []
    try:
        chunk_paths = split_video_into_chunks(video_path)
        chunk_notes: list[str] = []

        for index, chunk_path in enumerate(chunk_paths):
            start_minute = index * 25
            end_minute = start_minute + 25
            chunk_label = f"Lecture chunk {index + 1} approximately {start_minute:02d}:00 to {end_minute:02d}:00"
            try:
                result = process_media_and_generate_notes(chunk_path, language, visual_mode=True)
            except TokenLimitExceeded:
                print(f"{chunk_label} exceeded visual token limit. Retrying this chunk as compressed audio.")
                audio_path = extract_audio_track(chunk_path)
                audio_paths.append(audio_path)
                result = process_media_and_generate_notes(audio_path, language, visual_mode=False)

            chunk_notes.append(f"## {chunk_label}\n\n{result['markdown']}")

        merged_notes = merge_chunk_notes(chunk_notes, language)
        return {
            "markdown": (
                "> NoteJam processed this lecture in 25-minute video chunks because the full video exceeded the AI visual context limit. "
                "Each chunk was analyzed separately and then merged into one revision-ready note.\n\n"
                + merged_notes
            )
        }
    finally:
        for path in [*chunk_paths, *audio_paths]:
            if path and os.path.exists(path):
                os.remove(path)

def process_media_and_generate_notes(media_path: str, language: str = "English", visual_mode: bool = True) -> dict:
    print("Uploading media to Gemini...")
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
        prompt = SYSTEM_PROMPT if visual_mode else AUDIO_SYSTEM_PROMPT
        markdown_output = robust_gemini_call(
            contents=[uploaded_file, prompt.format(language=language)],
            is_json=False
        )

        final_markdown = markdown_output

        if visual_mode:
            # Parse for [EXTRACT_FRAME_AT_MM:SS]
            pattern = r'\[EXTRACT_FRAME_AT_(\d{1,2}:\d{2}(?::\d{2})?)\]'
            matches = re.finditer(pattern, markdown_output)

            for match in matches:
                timestamp = match.group(1)
                full_tag = match.group(0)

                frame_filename = f"frame_{uuid.uuid4().hex[:8]}.jpg"
                image_url = extract_frame(media_path, timestamp, frame_filename)

                if image_url:
                    image_markdown = f"![Diagram at {timestamp}]({image_url})"
                    final_markdown = final_markdown.replace(full_tag, image_markdown)
        
        return {"markdown": final_markdown}
    finally:
        if uploaded_file and uploaded_file.name:
            try:
                client.files.delete(name=uploaded_file.name)
            except Exception as e:
                print(f"Failed to delete file from Gemini: {e}")

def process_video_and_generate_notes(video_path: str, language: str = "English") -> dict:
    try:
        return process_media_and_generate_notes(video_path, language, visual_mode=True)
    except TokenLimitExceeded:
        print("Video exceeded Gemini token limit. Falling back to 25-minute chunked video processing.")
        try:
            return process_chunked_video_and_generate_notes(video_path, language)
        except TokenLimitExceeded as e:
            raise HTTPException(
                status_code=413,
                detail="This lecture is too dense to process even in 25-minute chunks. Please try a shorter lecture segment or upload a trimmed part of the video."
            ) from e


def download_video_from_url(url: str) -> str:
    from typing import Any
    video_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}.mp4")
    ydl_opts: dict[str, Any] = {
        # Prefer small MP4 to keep upload size low; fall back to any MP4,
        # then any format yt-dlp can merge into MP4.
        'format': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best[ext=mp4]/best',
        'outtmpl': video_path,
        'quiet': True,
        'nocheckcertificate': True,
        'retries': 10,
        'fragment_retries': 10,
        'socket_timeout': 30,
        # iOS client talks to YouTube's mobile API endpoint which does NOT
        # issue "Sign in to confirm you're not a bot" challenges on
        # datacenter/server IPs.  tv_embedded is kept as secondary fallback.
        'extractor_args': {'youtube': {'player_client': ['ios', 'tv_embedded']}},
    }

    cookies_file = os.getenv("YTDLP_COOKIES_FILE", "").strip()
    if cookies_file:
        if not os.path.isabs(cookies_file):
            cookies_file = os.path.join(BASE_DIR, cookies_file)
        if os.path.isfile(cookies_file):
            ydl_opts['cookiefile'] = cookies_file

    print(f"Downloading from URL: {url}")
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as error:
        if os.path.exists(video_path):
            os.remove(video_path)
        error_message = str(error).lower()
        if (
            "confirm you're not a bot" in error_message
            or "http error 403" in error_message
            or "http error 429" in error_message
            or "sign in" in error_message
        ):
            raise ValueError(
                "YouTube blocked this download request. Add or refresh a signed-in "
                "YouTube cookies file using YTDLP_COOKIES_FILE in backend/.env, then retry."
            ) from error
        raise
    return video_path

def run_process_job(job_id: str, language: str, url: Optional[str] = None, video_path: str = ""):
    try:
        update_process_job(job_id, status="working", message="Downloading and preparing your lecture...")
        if url:
            video_path = download_video_from_url(url)

        if not video_path or not os.path.exists(video_path):
            raise ValueError("Failed to acquire video.")

        update_process_job(job_id, status="working", message="Analyzing lecture audio, visuals, timestamps, and board content...")
        result = process_video_and_generate_notes(video_path, language)
        update_process_job(job_id, status="complete", message="Notes ready", result=result)
    except HTTPException as e:
        update_process_job(job_id, status="failed", message=e.detail)
    except Exception as e:
        print(f"Error processing video job {job_id}: {e}")
        if is_token_limit_error(e):
            message = "This lecture is too dense to process even in 25-minute chunks. Please try a shorter lecture segment."
        elif str(e).startswith("YouTube blocked this download request") or str(e).startswith("YTDLP_COOKIES_FILE"):
            message = str(e)
        elif "Google Gemini API rate limit or quota limit" in str(e):
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
        kwargs={"job_id": job_id, "language": language, "url": url, "video_path": video_path},
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
    3. Bullet Quality:
       - Write each bullet as a complete, standalone revision phrase a student could read aloud.
       - NEVER truncate mid-thought or write fragmented labels like "Program Execution (Crucial)".
       - Maximum 48 characters per bullet, 2 to 3 bullets per section.
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
        raw_text = robust_gemini_call(contents=[prompt], is_json=False)
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
        raw_text = robust_gemini_call(contents=[prompt], is_json=False)
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
        # Retry mechanism for Gemini Rate Limits and 503s
        max_retries = 3
        raw_text = None
        for attempt in range(max_retries):
            try:
                raw_text = robust_gemini_call(contents=[prompt], is_json=True)
                break
            except Exception as e:
                error_str = str(e)
                if ("429" in error_str or "503" in error_str) and attempt < max_retries - 1:
                    import time
                    print(f"Gemini API issue ({'503' if '503' in error_str else '429'}). Waiting 10s...")
                    time.sleep(10)
                else:
                    print(f"Error calling Gemini: {e}")
                    raise ValueError("AI failed to output a valid JSON script. Please try again.")
                    
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




class NoteData(BaseModel):
    title: str
    video_url: Optional[str] = None
    markdown: str
    cheatsheet: Optional[list] = None
    mindmap: Optional[dict] = None
    flashcards: Optional[list] = None
    ai_podcast_url: Optional[str] = None
    ai_debate_url: Optional[str] = None

@app.post("/notes")
def save_note(note: NoteData, user_id: str = Depends(get_current_user_id)):
    note_id = uuid.uuid4().hex
    created_at = datetime.now().isoformat()
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO notes (id, title, video_url, markdown, cheatsheet, mindmap, flashcards, created_at, ai_podcast_url, ai_debate_url, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        note_id,
        note.title,
        note.video_url or "",
        note.markdown,
        json.dumps(note.cheatsheet) if note.cheatsheet else None,
        json.dumps(note.mindmap) if note.mindmap else None,
        json.dumps(note.flashcards) if note.flashcards else None,
        created_at,
        note.ai_podcast_url,
        note.ai_debate_url,
        user_id
    ))
    conn.commit()
    conn.close()
    
    return {"id": note_id, "message": "Note saved successfully"}

@app.get("/notes")
def get_notes(user_id: str = Depends(get_current_user_id)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, created_at, video_url FROM notes WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    notes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"notes": notes}

@app.get("/notes/{note_id}")
def get_note(note_id: str, user_id: str = Depends(get_current_user_id)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM notes WHERE id = ? AND user_id = ?", (note_id, user_id))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Note not found")
        
    data = dict(row)
    if data["cheatsheet"]: data["cheatsheet"] = json.loads(data["cheatsheet"])
    if data["mindmap"]: data["mindmap"] = json.loads(data["mindmap"])
    if data["flashcards"]: data["flashcards"] = json.loads(data["flashcards"])
    
    return data

@app.put("/notes/{note_id}")
def update_note(note_id: str, note: NoteData, user_id: str = Depends(get_current_user_id)):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE notes 
        SET title = ?, video_url = ?, markdown = ?, cheatsheet = ?, mindmap = ?, flashcards = ?, ai_podcast_url = ?, ai_debate_url = ?
        WHERE id = ? AND user_id = ?
    """, (
        note.title,
        note.video_url or "",
        note.markdown,
        json.dumps(note.cheatsheet) if note.cheatsheet else None,
        json.dumps(note.mindmap) if note.mindmap else None,
        json.dumps(note.flashcards) if note.flashcards else None,
        note.ai_podcast_url,
        note.ai_debate_url,
        note_id,
        user_id
    ))
    conn.commit()
    conn.close()
    return {"message": "Note updated"}

@app.delete("/notes/{note_id}")
def delete_note(note_id: str, user_id: str = Depends(get_current_user_id)):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notes WHERE id = ? AND user_id = ?", (note_id, user_id))
    conn.commit()
    conn.close()
    return {"message": "Note deleted"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
