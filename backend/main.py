import os
import re
import uuid
import subprocess
import time
from typing import Optional
from fastapi import FastAPI, UploadFile, Form, HTTPException, WebSocket, WebSocketDisconnect
import asyncio
from google.genai import types
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
import csv
import io
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from google import genai
import yt_dlp
from dotenv import load_dotenv
import sqlite3
from datetime import datetime

load_dotenv()

# Initialize Database
def init_db():
    conn = sqlite3.connect("notejam.db")
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
    conn.commit()
    conn.close()

init_db()

app = FastAPI(title="AI Lecture Notes Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static", exist_ok=True)
os.makedirs("temp", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

client = genai.Client(http_options={'timeout': 3600000}) 

import json

def get_public_base_url() -> str:
    return os.getenv("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/")

SYSTEM_PROMPT = """
You are Note Jam, an elite AI teaching assistant.
You will receive a video file representing a lecture or tutorial.
Your task is to convert this video into a beautifully structured, comprehensive, and highly readable set of Markdown notes.

Do not output a raw transcript. Analyze the video, extract the core concepts, and structure them logically.

CRITICAL INSTRUCTIONS FOR THE "markdown" FIELD:
- FORMATTING: Use **Bold** for keywords, *Italics* for definitions, and blockquotes for takeaways. Structure perfectly with #, ##, ###.
- MIND MAP: The VERY LAST thing in the markdown string MUST be a Mermaid.js diagram (wrapped in ```mermaid blocks) visualizing the hierarchy and connections of the core concepts taught in the lecture. It MUST be placed at the end of the document.
  * CRITICAL MERMAID RULES: Use `graph TD`. You MUST strictly follow the syntax `NodeID["Visible Label"]`. The NodeID must be contiguous alphanumeric characters only (NO SPACES). The visible label MUST be wrapped in double quotes to allow special characters!
  * CORRECT EXAMPLE: `A["Control Systems (Linear)"] --> B["PID Controllers"]`
  * INCORRECT EXAMPLE: `A[Control Systems] --> B(PID Controllers)` (Do not do this!)
- VISUALS: If a frame contains a diagram, graph, mathematical equation, or chemical structure, but the professor is physically blocking it or it is blurry, YOU MUST recreate it yourself using highly detailed Markdown Tables, LaTeX matrices, or structured text.
- MATH: Use LaTeX strictly. Inline: `$E = mc^2$`. Block: `$$...$$`.
- VIDEO SYNC: Heavily inject exact timestamp tags `[MM:SS]` throughout the text whenever you explain a new concept, so the user can click them to sync the video.
- FRAME EXTRACTION: YOU MUST extract at least 2 frames! When the teacher writes an important formula or draws a diagram, exactly insert: [EXTRACT_FRAME_AT_MM:SS] (e.g. [EXTRACT_FRAME_AT_01:23]). Do NOT skip this step!

LANGUAGE:
Translate and write BOTH the markdown notes and the `<cheatsheet>` entirely in the requested language: {language}.
Ensure the notes read like a premium study guide!
"""

import imageio_ffmpeg

def extract_frame(video_path: str, timestamp_str: str, output_filename: str):
    output_path = os.path.join("static", output_filename)
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
            if "429" in err_str or "503" in err_str or "quota" in err_str:
                if attempt < max_retries - 1:
                    print(f"API Rate limit/Overload hit. Retrying in 65 seconds... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(65)
                else:
                    raise Exception("You have hit the Google Gemini API rate limit or quota limit. Please wait a few minutes and try again.")
            elif "10054" in err_str or "connection" in err_str or "timeout" in err_str or "forcibly closed" in err_str:
                if attempt < max_retries - 1:
                    print(f"Network connection error ({err_str}). Retrying in 5 seconds... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(5)
                else:
                    raise Exception("Network connection to Gemini API failed repeatedly. Please check your internet connection and try again.")
            else:
                if attempt < max_retries - 1:
                    print(f"Unexpected error ({err_str}). Retrying in 3 seconds... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(3)
                else:
                    raise e
    raise Exception("Failed to generate content after retries.")

def robust_file_upload(video_path: str):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            print(f"Uploading video to Gemini (Attempt {attempt+1}/{max_retries})...")
            return client.files.upload(file=video_path)
        except Exception as e:
            err_str = str(e).lower()
            if attempt < max_retries - 1:
                print(f"Upload failed ({err_str}). Retrying in 5 seconds...")
                time.sleep(5)
            else:
                raise Exception("Failed to upload video to Gemini API after multiple attempts. The connection was forcibly closed.")

def process_video_and_generate_notes(video_path: str, language: str = "English") -> dict:
    uploaded_file = robust_file_upload(video_path)
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
    
    # Parse for [EXTRACT_FRAME_AT_MM:SS]
    pattern = r'\[EXTRACT_FRAME_AT_(\d{1,2}:\d{2}(?::\d{2})?)\]'
    matches = re.finditer(pattern, markdown_output)
    
    final_markdown = markdown_output
    
    for match in matches:
        timestamp = match.group(1)
        full_tag = match.group(0)
        
        frame_filename = f"frame_{uuid.uuid4().hex[:8]}.jpg"
        image_url = extract_frame(video_path, timestamp, frame_filename)
        
        if image_url:
            image_markdown = f"![Diagram at {timestamp}]({image_url})"
            final_markdown = final_markdown.replace(full_tag, image_markdown)
    
    try:
        client.files.delete(name=uploaded_file.name)
    except Exception as e:
        print(f"Failed to delete file from Gemini: {e}")
        
    return {"markdown": final_markdown}

@app.post("/process")
async def process_lecture(
    url: Optional[str] = Form(None),
    file: Optional[UploadFile] = None,
    language: str = Form("English")
):
    if not url and not file:
        raise HTTPException(status_code=400, detail="Must provide either a url or a file.")
        
    video_path = ""
    
    if file:
        video_path = os.path.join("temp", f"{uuid.uuid4()}_{file.filename}")
        with open(video_path, "wb") as buffer:
            buffer.write(await file.read())
    elif url:
        from typing import Any
        video_path = os.path.join("temp", f"{uuid.uuid4()}.mp4")
        ydl_opts: dict[str, Any] = {
            'format': 'worst[ext=mp4]', # Download lowest quality to avoid large files and dropped connections
            'outtmpl': video_path,
            'quiet': True,
            'nocheckcertificate': True,
            'retries': 10,
            'fragment_retries': 10,
            'socket_timeout': 30
        }
        print(f"Downloading from URL: {url}")
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except Exception as e:
            if os.path.exists(video_path):
                os.remove(video_path)
            raise HTTPException(status_code=400, detail=f"Failed to download video: {str(e)}")
            
    if not os.path.exists(video_path):
        raise HTTPException(status_code=500, detail="Failed to acquire video.")
        
    try:
        result = process_video_and_generate_notes(video_path, language)
        return result
    except Exception as e:
        print(f"Error processing video: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(video_path):
            os.remove(video_path)

class FlashcardRequest(BaseModel):
    markdown: str

@app.post("/flashcards")
def create_flashcards(req: FlashcardRequest):
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
        raw_text = raw_text.strip()
        if raw_text.startswith("```json"):
            import re
            raw_text = re.sub(r"^```json\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text)
        elif raw_text.startswith("```"):
            import re
            raw_text = re.sub(r"^```\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text)
            
        import json
        flashcards = json.loads(raw_text)
        
        return {"flashcards": flashcards}
    except Exception as e:
        print(f"Error generating flashcards: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class DocumentRequest(BaseModel):
    markdown: str

@app.post("/cheatsheet")
def create_cheatsheet(req: DocumentRequest):
    prompt = f"""
    Based on the following lecture notes, extract 3-7 critical formulas, equations, or short key definitions.
    Return ONLY a valid JSON array of strings. No markdown formatting outside the JSON array.
    Example: ["E=mc^2: Energy equals mass times the speed of light squared.", "Newton's First Law: An object at rest stays at rest."]
    
    Notes:
    {req.markdown}
    """
    try:
        raw_text = robust_gemini_call(contents=[prompt], is_json=True)
        import json
        raw_text = raw_text.strip()
        if raw_text.startswith("```json"):
            import re
            raw_text = re.sub(r"^```json\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text)
        elif raw_text.startswith("```"):
            import re
            raw_text = re.sub(r"^```\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text)
        return {"cheatsheet": json.loads(raw_text)}
    except Exception as e:
        print(f"Error generating cheatsheet: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/mindmap")
def create_mindmap(req: DocumentRequest):
    prompt = f"""
    Based on the following lecture notes, generate a 3D interactive mind map structure.
    Identify the core central concept, main branches, and sub-topics.
    Return ONLY a strictly valid JSON object with the following structure:
    {{
        "nodes": [
            {{"id": "Central Topic", "group": 1}},
            {{"id": "Subtopic A", "group": 2}}
        ],
        "links": [
            {{"source": "Central Topic", "target": "Subtopic A"}}
        ]
    }}
    Ensure all sources and targets in links exactly match the id of a node.
    Do not include any text or markdown outside the JSON object.
    
    Notes:
    {req.markdown}
    """
    try:
        raw_text = robust_gemini_call(contents=[prompt], is_json=True)
        import json
        raw_text = raw_text.strip()
        if raw_text.startswith("```json"):
            import re
            raw_text = re.sub(r"^```json\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text)
        elif raw_text.startswith("```"):
            import re
            raw_text = re.sub(r"^```\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text)
        return {"mindmap": json.loads(raw_text)}
    except Exception as e:
        print(f"Error generating mindmap: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class SimplifyRequest(BaseModel):
    text: str

@app.post("/simplify")
def simplify_text(req: SimplifyRequest):
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
def chat_lecture(req: ChatRequest):
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
async def generate_podcast(req: PodcastRequest):
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
DO NOT use commas (,) unless absolutely grammatically necessary. Commas force the AI TTS to take awkward, robotic pauses. 
Instead of writing: "Humayu, achha vo akbar ka pita", write it naturally like: "Achha Humayu jo akbar ka pita tha".
Make the flow continuous, expressive, and human-like. Add emotion and natural reactions (like "Wow", "Oh I see", "Mind blowing").

The script MUST be returned as a raw JSON array of objects, with NO markdown formatting, NO ```json blocks. Just the raw JSON array.
Example:
[
  {{"speaker": "Chetan", "text": "Hi Anamika aaj hum kis baare me baat karne wale hain"}},
  {{"speaker": "Anamika", "text": "Haan Chetan aaj ka topic sach me mind blowing hai"}},
  {{"speaker": "Chetan", "text": "Are waah mujhe detail me batao"}},
  {{"speaker": "Anamika", "text": "Bilkul! To shuru karte hain..."}}
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
            
        raw_text = raw_text.strip()
        if raw_text.startswith("```json"):
            import re
            raw_text = re.sub(r"^```json\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text)
        elif raw_text.startswith("```"):
            import re
            raw_text = re.sub(r"^```\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text)
            
        script = json.loads(raw_text)
        
        import edge_tts
        final_audio = b""
        
        for line in script:
            speaker = line.get("speaker", "Chetan")
            text = line.get("text", "")
            if not text: continue
            
            if req.language.lower() == "english":
                voice = "en-IN-PrabhatNeural" if "Chetan" in speaker else "en-IN-NeerjaNeural"
            else:
                voice = "hi-IN-MadhurNeural" if "Chetan" in speaker else "hi-IN-SwaraNeural"
                
            # Retry mechanism for Edge-TTS networking issues
            for tts_attempt in range(3):
                try:
                    communicate = edge_tts.Communicate(text, voice)
                    async for chunk in communicate.stream():
                        if chunk["type"] == "audio":
                            final_audio += chunk["data"]
                    break # Success, break out of retry loop
                except Exception as tts_err:
                    if tts_attempt < 2:
                        import asyncio
                        print(f"TTS connection error: {tts_err}. Retrying in 2 seconds...")
                        await asyncio.sleep(2)
                    else:
                        raise tts_err
            
        filename = f"podcast_{uuid.uuid4().hex[:8]}.mp3"
        filepath = os.path.join("static", filename)
        with open(filepath, "wb") as f:
            f.write(final_audio)
            
        return {"url": f"{get_public_base_url()}/api/audio/{filename}"}
        
    except Exception as e:
        print(f"Error generating podcast: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import FileResponse

@app.get("/api/audio/{filename}")
def get_audio(filename: str):
    filepath = os.path.join("static", filename)
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
def save_note(note: NoteData):
    note_id = uuid.uuid4().hex
    created_at = datetime.now().isoformat()
    
    conn = sqlite3.connect("notejam.db")
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO notes (id, title, video_url, markdown, cheatsheet, mindmap, flashcards, created_at, ai_podcast_url, ai_debate_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        note.ai_debate_url
    ))
    conn.commit()
    conn.close()
    
    return {"id": note_id, "message": "Note saved successfully"}

@app.get("/notes")
def get_notes():
    conn = sqlite3.connect("notejam.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, created_at, video_url FROM notes ORDER BY created_at DESC")
    notes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return {"notes": notes}

@app.get("/notes/{note_id}")
def get_note(note_id: str):
    conn = sqlite3.connect("notejam.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM notes WHERE id = ?", (note_id,))
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
def update_note(note_id: str, note: NoteData):
    conn = sqlite3.connect("notejam.db")
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE notes 
        SET title = ?, video_url = ?, markdown = ?, cheatsheet = ?, mindmap = ?, flashcards = ?, ai_podcast_url = ?, ai_debate_url = ?
        WHERE id = ?
    """, (
        note.title,
        note.video_url or "",
        note.markdown,
        json.dumps(note.cheatsheet) if note.cheatsheet else None,
        json.dumps(note.mindmap) if note.mindmap else None,
        json.dumps(note.flashcards) if note.flashcards else None,
        note.ai_podcast_url,
        note.ai_debate_url,
        note_id
    ))
    conn.commit()
    conn.close()
    return {"message": "Note updated"}

@app.delete("/notes/{note_id}")
def delete_note(note_id: str):
    conn = sqlite3.connect("notejam.db")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()
    return {"message": "Note deleted"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
