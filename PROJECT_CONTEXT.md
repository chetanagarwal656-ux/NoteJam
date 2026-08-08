# NoteJam - AI Agent Project Context Document

> **Target Audience**: AI Coding Agent (Antigravity / Gemini / Claude)  
> **Purpose**: Information-dense reference containing architectural patterns, database schemas, API contracts, domain logic, and development guidelines for NoteJam.

---

## 1. Project Overview
**NoteJam** is an AI-powered study workspace and lecture intelligence platform. It converts long video lectures (YouTube URLs or direct video uploads) and audio tracks into structured, revision-ready Markdown study notes with embedded video timestamps, visual diagrams, automated frame/screenshot extraction, LaTeX formulas, spaced-repetition flashcards, cheat sheets, deterministic vector mind maps, dual-host conversational AI podcasts/debates (English and Hindi), ELI5 contextual tutoring, and grounded note Q&A chat.

---

## 2. Purpose and Goals
- **Eliminate Passive Rewatching**: Convert hours of dense lecture video/audio into active recall artifacts in seconds.
- **Strict Lecture Grounding**: Avoid AI hallucinations by strictly conditioning notes, summaries, mind maps, and grounded chat on lecture content.
- **Multimodal Visual & Audio Synthesis**: Extract physical whiteboard/slide frames via FFmpeg and synthesize conversational audio study materials via Edge-TTS.
- **Fast, High-Density Revision**: Provide multiple complementary study formats: Notes, 3D Flashcards, Mind Maps, Cheat Sheets, Audio Podcasts/Debates, and ELI5 Explanations.

---

## 3. Core Features
1. **Lecture Ingestion & Async Processing**:
   - Accepts YouTube/web URLs (downloaded via `yt-dlp`) or direct video uploads (MP4/WebM/etc.).
   - Background worker thread with pollable job status (`/process` -> `/process/{job_id}`).
   - Automatic 25-minute chunking with dynamic fallback to audio-only processing if visual context token limits are exceeded.
2. **Interactive Markdown Notes**:
   - Structured with headings (`#`, `##`, `###`), bold keywords, italic definitions, and blockquote takeaways.
   - Exact clickable timestamps `[MM:SS]` that seek the synced in-browser video player.
   - LaTeX mathematical equations ($...$ inline, $$...$$ block) rendered via `remark-math` and `rehype-katex`.
   - Trailing Mermaid.js hierarchy diagram (`graph TD`) dynamically themed for dark and light/paper modes.
   - Automated visual frame extraction using `[EXTRACT_FRAME_AT_MM:SS]` tags replaced with static image markdown links.
3. **Artifact Console (Collapsible Side Drawer)**:
   - **Spaced-Repetition Flashcards**: 10–50 flashcard deck with 3D flip animation, answer explanations, and full-screen view.
   - **Cheat Sheet**: Sticky console extracting 3–7 critical formulas, laws, and definitions.
   - **Custom Vector Mind Map Engine**: Deterministic SVG-based sketch/post-it layout with washi tape styling and curved Bézier arrows.
   - **Dual-Voice AI Audio Studio**: Multi-host conversational podcast or fierce intellectual debate generated in English or Hindi (Devanagari script) with custom audio playback controls.
   - **Grounded Chat**: In-drawer AI assistant answering questions strictly based on the generated lecture notes.
4. **Contextual ELI5 (Explain Like I'm 5)**:
   - Floating action tooltip on text selection in the note body to simplify complex academic passages with intuitive analogies.
5. **Notebook Management & Persistence**:
   - Local database saving (`/notes`), listing, loading, updating, and deleting.
   - LocalStorage workspace snapshot caching (`notejam-dashboard-workspace`) for instant session resumption.
6. **Customizable Note Viewing**:
   - Handwritten typography toggle (using Google Font Kalam).
   - Screenshot hiding toggle.
   - Light (paper) vs. Dark theme toggle.
   - Print & PDF export optimization with dedicated print styles (`.no-print`, `.print-only`).
7. **User Authentication**:
   - Clerk authentication (`@clerk/nextjs`) integrated into landing page and dashboard navigation.

---

## 4. Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.10+) with `uvicorn[standard]`
- **AI / LLM SDK**: `google-genai` (official Google GenAI SDK, Client instantiated with `timeout: 3600000`)
- **Video / Audio Ingestion**: `yt-dlp` (YouTube / web media downloader)
- **Media Processing**: `imageio-ffmpeg` (bundled FFmpeg binary for frame capture, chunk splitting, duration detection, audio extraction)
- **Text-to-Speech (TTS)**: `edge-tts` (Microsoft Edge Neural TTS: `hi-IN-MadhurNeural`, `hi-IN-SwaraNeural`, `en-IN-PrabhatNeural`, `en-IN-NeerjaNeural`)
- **Database**: SQLite3 (single local file `notejam.db`) with raw SQL queries and JSON serialization
- **Config**: `python-dotenv`
- **File Uploads**: `python-multipart`

### Frontend
- **Framework**: Next.js 16.2.6 (App Router), React 19.2.4, TypeScript 5
- **Styling**: Vanilla CSS Modules (`landing.module.css`, `page.module.css`) + CSS Custom Properties in `globals.css` (No TailwindCSS)
- **Animation**: `framer-motion` (v12.39.0)
- **Icons**: `lucide-react` (v1.14.0)
- **Markdown & Math**: `react-markdown` (v10), `remark-math` (v6), `rehype-katex` (v7), `katex` (v0.16.45)
- **Diagrams**: `mermaid` (v11.15.0)
- **Media Player**: `react-player` (v3.4.0) + Native HTML5 `<video>` & `<audio>`
- **Auth**: `@clerk/nextjs` (v7.3.7)
- **Fonts**: Google Fonts `Kalam` (variable `--font-kalam`) and `Inter`

---

## 5. Repository Structure
```
Note_Jam/
├── .agents/
│   └── AGENTS.md                  # Permanent workspace context & rules for AI agents
├── backend/
│   ├── .env                       # Backend secrets and configuration (ignored by git)
│   ├── .env.example               # Template configuration for backend
│   ├── main.py                    # Complete FastAPI server, AI routes, background jobs, DB CRUD
│   ├── notejam.db                 # SQLite database file
│   ├── requirements.txt           # Python dependencies
│   ├── static/                    # Generated frame JPGs and podcast MP3s served at /static
│   ├── temp/                      # Temporary downloaded videos, audio files, and video chunks
│   └── venv/                      # Python virtual environment
├── frontend/
│   ├── .env.example               # Template frontend env vars
│   ├── .env.local                 # Local frontend env vars
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── components/        # Reserved for future modular dashboard components
│   │   │   ├── mindmap-engine/    # Custom deterministic vector mind map layout and renderer
│   │   │   │   ├── ArrowRouter.ts           # Curved Bézier arrow math with looping & curls
│   │   │   │   ├── BoxSizer.ts              # Word-wrapping and sticky note dimension calculations
│   │   │   │   ├── ContentExtractor.ts      # Normalizes AI mindmap schemas & backward compatibility
│   │   │   │   ├── IconSelector.ts          # Keyword-based thematic icon matching
│   │   │   │   ├── InformationArchitect.ts  # Palette assignment, sizing, priority sorting
│   │   │   │   ├── LayoutPlanner.ts         # 8-anchor elliptical 2D coordinate planner with rotation
│   │   │   │   ├── SketchRenderer.tsx       # SVG canvas, washi tape, shadows, text rendering
│   │   │   │   ├── index.tsx                # MindmapEngineView container component
│   │   │   │   └── types.ts                 # TypeScript type definitions for mind map engine
│   │   │   ├── page.module.css    # Comprehensive styles for the workspace dashboard
│   │   │   └── page.tsx           # Full workspace application (Notes, Flashcards, Chat, Audio, etc.)
│   │   ├── favicon.ico
│   │   ├── globals.css            # Dark mode tokens, reset, typography, KaTeX imports, print rules
│   │   ├── landing.module.css     # Landing page styles
│   │   ├── layout.tsx             # Root layout wrapping with ClerkProvider and Kalam font
│   │   └── page.tsx               # Marketing landing page with interactive previews
│   ├── eslint.config.mjs
│   ├── next.config.ts
│   ├── package.json
│   ├── public/                    # Static brand assets, mockups, loader videos, icons
│   └── tsconfig.json
├── .gitignore
├── PROJECT_CONTEXT.md             # This AI project context document
└── README.md                      # Project setup and deployment guide
```

---

## 6. Architecture

```
                               ┌──────────────────────────────────────────────┐
                               │           Next.js 16 (App Router)            │
                               │   - Landing Page (app/page.tsx)              │
                               │   - Dashboard Workspace (dashboard/page.tsx) │
                               │   - Vector MindMap Engine (mindmap-engine/)  │
                               │   - KaTeX / Mermaid / React-Markdown         │
                               └──────────────────────┬───────────────────────┘
                                                      │ HTTP REST (JSON / Multipart)
                                                      ▼
                               ┌──────────────────────────────────────────────┐
                               │             FastAPI Backend (main.py)        │
                               │   - Job Queue (In-Memory Threading)          │
                               │   - Static File Server (/static)             │
                               │   - SQLite DB Layer (notejam.db)             │
                               └───────┬──────────────┬───────────────┬───────┘
                                       │              │               │
                     ┌─────────────────┴────┐   ┌─────┴──────────┐   ┌┴────────────────────┐
                     ▼                      ▼   ▼                ▼   ▼                     ▼
              Google GenAI SDK               FFmpeg Binary           Edge-TTS           yt-dlp
             (gemini-2.5-flash)           (imageio-ffmpeg)        (Neural Audio)    (Video Downloader)
             - Structured Notes           - Frame Extraction      - Hindi/English   - YouTube / Web
             - Mind Map Schema            - 25m Video Chunking      Dual Hosts        Extraction
             - Spaced Flashcards          - Audio Track Demux       Chetan/Anamika
             - ELI5 Simplification
             - Grounded Q&A Chat
```

---

## 7. Data Flow
1. **Note Generation**:
   - User inputs URL or file -> `POST /process` creates `job_id` and spawns daemon `threading.Thread`.
   - Worker downloads video (if URL) to `backend/temp/` via `yt-dlp` (`worst[ext=mp4]`).
   - File is uploaded to Google Gemini File API.
   - Gemini generates comprehensive Markdown with `[EXTRACT_FRAME_AT_MM:SS]` tags and a trailing Mermaid diagram.
   - If visual processing exceeds token limit (`TokenLimitExceeded`), backend automatically slices video into 25-minute compressed chunks via FFmpeg (`split_video_into_chunks`), generates chunk notes, extracts audio fallback if needed, and merges via Gemini (`merge_chunk_notes`).
   - For every `[EXTRACT_FRAME_AT_MM:SS]`, FFmpeg extracts high-quality JPG to `backend/static/` and replaces tag with markdown image link.
   - Client polls `GET /process/{job_id}` until `status == "complete"`.
2. **Artifact Generation (On-Demand)**:
   - **Flashcards**: `POST /flashcards` sends notes to Gemini, returns 10–50 objects `{ question, answer, explanation }`.
   - **Cheat Sheet**: `POST /cheatsheet` returns 3–7 key definition/formula strings.
   - **Mind Map**: `POST /mindmap` returns `revision-sheet-v1` JSON structure.
   - **Audio Podcast / Debate**: `POST /podcast` generates a 2-person script (Chetan & Anamika), synthesizes each turn with Edge-TTS, combines into single MP3 in `backend/static/`, and returns streamable URL.
   - **ELI5**: `POST /simplify` explains selected text using simple analogies.
   - **Chat**: `POST /chat` answers student query strictly using provided note markdown and conversation history.
3. **Storage & Resumption**:
   - `POST /notes` / `PUT /notes/{id}` stores the complete note bundle in SQLite.
   - `GET /notes` retrieves summary list for notebook drawer.
   - `GET /notes/{id}` retrieves full record with parsed JSON sub-objects.

---

## 8. Important Modules

### Backend (`backend/main.py`)
- `init_db()`: Initializes table and ensures schema migrations (`ai_podcast_url`, `ai_debate_url`).
- `robust_gemini_call(contents, model='gemini-2.5-flash', is_json=False)`: Wraps Gemini calls with 3 retries, handles 429/503 rate limits with a 65-second sleep, and intercepts token limit errors.
- `split_video_into_chunks(video_path, chunk_seconds=1500)`: Uses FFmpeg with `libx264`, `-crf 35`, and `scale='min(854,iw)':-2` to produce lightweight 25-minute video chunks.
- `extract_frame(video_path, timestamp_str, output_filename)`: Runs FFmpeg seek `-ss` to extract a single frame `-vframes 1` at high quality `-q:v 2`.
- `parse_json_response(raw_text)`: Cleans markdown backticks (` ```json `) and extracts outermost balanced JSON object or array.
- `run_process_job(...)`: Background worker executing ingestion pipeline and updating in-memory `PROCESS_JOBS` dictionary.
- `generate_podcast(...)`: Builds dual-host script, streams audio chunks from `edge-tts.Communicate`, and writes combined MP3 to disk.

### Frontend Vector Mind Map Engine (`frontend/app/dashboard/mindmap-engine/`)
- `ContentExtractor.ts`: Normalizes diverse mind map formats (`revision-sheet-v1`, legacy sticky notes, branches, nodes) into a standard `ExtractedContent` interface.
- `InformationArchitect.ts`: Selects icons, assigns pastel color themes (`STICKY_PALETTE`), computes dynamic card heights.
- `BoxSizer.ts`: Word wraps titles (18 chars) and bullet points (22 chars), calculating precise pixel bounding boxes.
- `LayoutPlanner.ts`: Positions up to 8 post-it cards around a central ellipse (1600x1000 viewport) with slight rotational offsets (`-3.5°` to `+3.8°`).
- `ArrowRouter.ts`: Calculates cubic Bézier curves connecting the central circle to cards with dynamic curvature and arrowheads.
- `SketchRenderer.tsx`: Renders pure SVG with hand-drawn filter effects, washi tape rectangles, and text elements styled with `var(--font-kalam)`.

---

## 9. Important Business Logic
1. **Mermaid Diagram Placement & Formatting Rules**:
   - The Mermaid diagram **must** be the very last element in the markdown string.
   - Must use `graph TD`.
   - **Crucial**: Node names must be simple and alphanumeric. Parentheses `()`, brackets `[]`, braces `{}`, or quotes `"` must never be placed inside visible node text because they break the Mermaid parser.
2. **Natural Edge-TTS Speech Prompting**:
   - Prompt explicitly forbids unnecessary commas (`,`) in generated scripts because commas cause robotic, awkward pauses in Edge-TTS.
   - Uses Hindi Devanagari script for conversational Hindi.
   - Chetan uses `hi-IN-MadhurNeural` (or `en-IN-PrabhatNeural`).
   - Anamika uses `hi-IN-SwaraNeural` (or `en-IN-NeerjaNeural`).
3. **Chunking & Token Limits**:
   - Single long lectures that exceed visual context are automatically split into 25-minute slices. If an individual slice exceeds token limit, it is demuxed into an audio-only MP3 (`extract_audio_track`) and reprocessed before final merging.
4. **Strict Grounding in Chat**:
   - Chat endpoint prompt enforces answering *only* from the lecture notes. If unanswerable, it outputs: `"I cannot answer this based on the lecture notes."`

---

## 10. Database Overview

### Engine & Storage
- **Engine**: SQLite 3 (synchronous `sqlite3` driver)
- **Path**: `NOTEJAM_DB_PATH` environment variable, defaulting to `backend/notejam.db`.

### Schema: `notes` Table
| Column Name | Data Type | Nullable | Description / Structure |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY` | 32-character lowercase UUID hex (e.g. `uuid.uuid4().hex`) |
| `title` | `TEXT` | Yes | Human-readable lecture title |
| `video_url` | `TEXT` | Yes | Source YouTube / web URL (empty string for uploaded files) |
| `markdown` | `TEXT` | No | Full Markdown lecture notes with embedded images & Mermaid |
| `cheatsheet` | `TEXT` | Yes | JSON-serialized array of strings: `["Concept 1", "Formula 2"]` |
| `mindmap` | `TEXT` | Yes | JSON-serialized object matching `revision-sheet-v1` schema |
| `flashcards` | `TEXT` | Yes | JSON-serialized array of `{ question, answer, explanation }` |
| `created_at` | `TEXT` | No | ISO 8601 timestamp string (`datetime.now().isoformat()`) |
| `ai_podcast_url`| `TEXT` | Yes | Static URL to generated 2-host podcast MP3 |
| `ai_debate_url` | `TEXT` | Yes | Static URL to generated 2-host debate MP3 |

### Database Access Rules
- Connections are opened per function call (`sqlite3.connect(DB_PATH)`), `conn.commit()` is called, and `conn.close()` is guaranteed.
- `conn.row_factory = sqlite3.Row` is used for dictionary transformation.
- `json.dumps()` must be called before inserting/updating JSON fields (`cheatsheet`, `mindmap`, `flashcards`).
- `json.loads()` must be called when reading JSON fields in `/notes/{note_id}`.

---

## 11. API Structure

### Base URL
- Local: `http://localhost:8000`
- Configurable via `PUBLIC_BASE_URL` (backend) and `NEXT_PUBLIC_API_URL` (frontend).

### Endpoints
| Method | Route | Request Type / Body | Response Schema | Description |
|---|---|---|---|---|
| `POST` | `/process` | `multipart/form-data`: `url` (str, opt), `file` (UploadFile, opt), `language` (str, default "English") | `{"job_id": str, "status": "queued", "message": str}` | Starts async lecture processing worker |
| `GET` | `/process/{job_id}` | Path param: `job_id` | `{"status": "queued"\|"working"\|"complete"\|"failed", "message": str, "result": {"markdown": str}}` | Polls background processing job |
| `POST` | `/flashcards` | JSON: `{"markdown": str}` | `{"flashcards": [{"question": str, "answer": str, "explanation": str}]}` | Generates spaced repetition flashcard deck |
| `POST` | `/cheatsheet` | JSON: `{"markdown": str}` | `{"cheatsheet": [str]}` | Generates 3–7 key formulas/definitions |
| `POST` | `/mindmap` | JSON: `{"markdown": str}` | `{"mindmap": RawMindmapData}` | Generates structured revision-sheet mindmap data |
| `POST` | `/simplify` | JSON: `{"text": str}` | `{"explanation": str}` | ELI5 contextual tutor explanation |
| `POST` | `/chat` | JSON: `{"markdown": str, "question": str, "history": [{"role": str, "content": str}]}` | `{"answer": str}` | Grounded Q&A against note markdown |
| `POST` | `/podcast` | JSON: `{"markdown": str, "language": "hindi"\|"english", "scenario": "podcast"\|"debate"}` | `{"url": str}` | Generates Edge-TTS multi-host audio file |
| `GET` | `/api/audio/{filename}` | Path param: `filename` | Binary Audio Stream (`audio/mpeg`) | Streams synthesized MP3 file |
| `POST` | `/notes` | JSON: `NoteData` (`title`, `markdown`, `cheatsheet`, `mindmap`, `flashcards`, `video_url`, `ai_podcast_url`, `ai_debate_url`) | `{"id": str, "message": "Note saved successfully"}` | Saves new note to SQLite |
| `GET` | `/notes` | None | `{"notes": [{"id": str, "title": str, "created_at": str, "video_url": str}]}` | Lists all saved notebook summaries |
| `GET` | `/notes/{note_id}`| Path param: `note_id` | Full note object with parsed JSON sub-fields | Retrieves single note |
| `PUT` | `/notes/{note_id}`| Path param: `note_id`, JSON: `NoteData` | `{"message": "Note updated"}` | Updates existing note record |
| `DELETE`| `/notes/{note_id}`| Path param: `note_id` | `{"message": "Note deleted"}` | Deletes note record from SQLite |
| `GET` | `/static/{filename}`| Static file handler | Binary image/audio | Serves extracted JPGs and MP3s |

---

## 12. Coding Conventions

### Frontend (Next.js / React / TypeScript)
- Use **Vanilla CSS Modules** (`*.module.css`) and global CSS custom variables (`globals.css`). Do NOT introduce TailwindCSS.
- Use explicit TypeScript types and interfaces. Avoid `any`.
- Keep component state synchronized with `localStorage` when handling workspace changes.
- Wrap math expressions with `remarkMath` + `rehypeKatex` and double-slash normalization (`\\` -> `\`).
- Ensure Mermaid diagrams are re-initialized with `mermaid.initialize()` and `mermaid.contentLoaded()` inside `useEffect` with appropriate paper/dark theme configurations.
- Use `framer-motion` for smooth UI transitions (drawer slide-in, modal flip, character diffusion).

### Backend (FastAPI / Python)
- Keep route handler logic modular and cleanly typed with Pydantic `BaseModel`.
- Always wrap external API calls (Gemini, Edge-TTS, FFmpeg) with retry loops and structured exception handlers.
- Handle JSON cleaning via `parse_json_response()` to prevent model formatting quirks from breaking endpoints.
- Clean up temporary files in `finally:` blocks (`os.remove(path)`).

---

## 13. Naming Conventions
- **TypeScript**: `PascalCase` for components/types (`MindmapEngineView`, `SavedNote`), `camelCase` for variables, functions, and properties (`currentNoteId`, `fetchNotes`).
- **CSS**: `camelCase` for module classes (`.artifactConsole`, `.liveBackgroundContainer`), kebab-case for CSS variables (`--bg`, `--font-kalam`).
- **Python**: `snake_case` for functions, variables, and route helpers (`robust_gemini_call`, `split_video_into_chunks`), `PascalCase` for Pydantic models and exceptions (`NoteData`, `TokenLimitExceeded`).
- **Database**: `snake_case` for column names (`ai_podcast_url`, `created_at`, `video_url`).

---

## 14. Project-Specific Rules
1. **Do Not Overwrite SQLite Schema blindly**: Column additions should be wrapped in `try...except sqlite3.OperationalError` as demonstrated in `init_db()`.
2. **Never Return Raw Gemini Output without Parsing**: Always use `parse_json_response()` when `is_json=True`.
3. **Do Not Use Plain HTML Alerts/Prompts in React**: Use custom modal dialogs or styled status toasts.
4. **Mermaid Formatting Strictness**: Never allow visible node labels in Mermaid charts to contain parentheses, brackets, or quotes.
5. **No Tailwind Classes**: Tailwind is not configured in this project. Use CSS variables and CSS modules.

---

## 15. Commands for Development

### Backend
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```powershell
cd frontend
npm install
npm run dev
```

---

## 16. Build Commands
- **Frontend Build**:
  ```powershell
  cd frontend
  npm run build
  ```
- **Frontend Lint**:
  ```powershell
  cd frontend
  npm run lint
  ```

---

## 17. Testing Commands
- **Backend Test / Syntax Check**:
  ```powershell
  cd backend
  python -c "import main; print('Backend syntax valid')"
  ```
- **Automated Tests**: *Not currently configured with Pytest/Jest. All validation is currently manual and build-based.*

---

## 18. Deployment Commands
- **Backend (Render)**:
  - Build Command: `pip install -r requirements.txt`
  - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Frontend (Vercel)**:
  - Root directory: `frontend`
  - Framework preset: `Next.js`
  - Build Command: `npm run build`

---

## 19. Environment Variables

### Backend (`backend/.env`)
- `GEMINI_API_KEY`: Google Gemini API Key (**Required**)
- `PUBLIC_BASE_URL`: Publicly accessible URL for static asset serving (e.g. `http://localhost:8000` or Render URL)
- `ALLOWED_ORIGINS`: Comma-separated list of CORS origins (e.g. `http://localhost:3000,https://your-frontend.vercel.app`)
- `NOTEJAM_DB_PATH`: Relative or absolute path to SQLite file (default: `notejam.db`)

### Frontend (`frontend/.env.local`)
- `NEXT_PUBLIC_API_URL`: URL to backend (default: `http://localhost:8000`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk Auth Publishable Key
- `CLERK_SECRET_KEY`: Clerk Auth Secret Key

---

## 20. Security Considerations
- **CORS Configuration**: Controlled via `ALLOWED_ORIGINS` in FastAPI CORS middleware.
- **Path Traversal Protection**: Static and audio file retrievers use `os.path.basename()` on requested filenames.
- **YouTube Downloader Safety**: `yt-dlp` runs with sanitized output templates in `backend/temp/` and timeouts.
- **Database Queries**: Parameterized queries (`?` placeholder) are strictly used to eliminate SQL injection vulnerabilities.

---

## 21. Performance Considerations
- **Video Slicing**: FFmpeg encodes chunked videos using `veryfast` preset, `-crf 35`, and downscales to max width 854px to drastically reduce payload sizes and Gemini processing time.
- **Temporary File Purging**: All downloaded videos, sliced chunks, and intermediate audio tracks in `backend/temp/` are deleted in `finally:` blocks.
- **In-Memory Job Garbage Collection**: `PROCESS_JOBS` cleans up old completed/failed jobs when dictionary exceeds `MAX_PROCESS_JOBS` (200).
- **Client Cache**: LocalStorage snapshot prevents redundant re-fetches when navigating between pages.

---

## 22. External Integrations
1. **Google Gemini API** (`gemini-2.5-flash`): Core LLM for multimodal lecture analysis, frame timestamp targeting, flashcards, mind maps, and note grounded Q&A.
2. **Microsoft Edge Neural TTS (`edge-tts`)**: Dual-speaker neural audio generation for Indian English and Hindi.
3. **Clerk Auth**: Authentication and user management.
4. **YouTube (`yt-dlp`)**: Remote video stream extraction.

---

## 23. Important Dependencies
- `google-genai`: Official next-gen Gemini Python SDK
- `imageio-ffmpeg`: Zero-config standalone FFmpeg executable wrapper
- `edge-tts`: Asynchronous Python interface to Edge TTS services
- `@clerk/nextjs`: Auth provider for Next.js App Router
- `framer-motion`: Declarative React animations
- `rehype-katex` & `remark-math`: LaTeX parsing for scientific expressions
- `mermaid`: Client-side dynamic diagram rendering

---

## 24. Files That Should Not Be Modified Automatically
- `backend/notejam.db`: Production / user SQLite database data file.
- `backend/static/*`: Generated screenshot frames and audio podcasts referenced by existing user notes.
- `frontend/public/videos/notejam-generating-loader.mp4`: Pre-rendered video loader asset.
- `frontend/public/brand/*` & `frontend/public/images/*`: High-resolution marketing and demo assets.

---

## 25. Common Mistakes to Avoid
1. **Do NOT import Tailwind**: Do not add `@tailwind` or use utility classes like `flex`, `bg-blue-500`. All styling must use CSS modules or standard CSS.
2. **Do NOT change the Mindmap ViewBox without adjusting calculations**: The mind map engine is calibrated for a `1600x1000` SVG canvas (`LayoutPlanner.ts` and `SketchRenderer.tsx`).
3. **Do NOT execute raw SQL without stringifying JSON**: SQLite columns `cheatsheet`, `mindmap`, and `flashcards` must receive `json.dumps(...)`.
4. **Do NOT omit `is_json=True` in `robust_gemini_call` when expecting structured JSON**: Without `response_mime_type="application/json"`, Gemini may wrap responses in explanatory text.
5. **Do NOT forget FFmpeg cleanup**: Always use `try...finally` to ensure temp chunks are deleted.

---

## 26. Current Implementation Status
- **Backend**: Fully functional with video chunking fallback, frame extraction, flashcard generation, mindmap generation, chat, dual-speaker TTS podcast/debate generation, and SQLite CRUD.
- **Frontend**: High-fidelity landing page with Clerk integration, interactive workspace dashboard, video-timestamp sync, flashcard deck, deterministic vector mind map renderer, ELI5 contextual tutor tooltip, and print/PDF export.
- **Database**: SQLite initialized with single `notes` table supporting full study artifact bundles.

---

## 27. Future Roadmap
- Multi-user data isolation (filtering `notes` table by `user_id` from Clerk token).
- Cloud storage integration for static files (e.g. AWS S3 / Cloudflare R2 instead of local `backend/static/`).
- Export to Anki (`.apkg`) and Notion integration.
- Real-time SSE / WebSocket streaming for lecture processing updates.

---

## 28. Assumptions an AI Should Make While Coding
- **Python Version**: Python 3.10+ on Windows / Linux.
- **Node Version**: Node 18+ with Next.js 16 App Router.
- **Database**: Single SQLite database file; assume synchronous access with connection pooling per request.
- **Styling Preference**: High-aesthetic modern dark mode with glassmorphism, glowing borders, and handwritten Kalam font accents.

---

## 29. Additional Information for Efficient Work
- The frontend and backend run as separate processes during development (`localhost:3000` and `localhost:8000`).
- The vector mind map engine in `frontend/app/dashboard/mindmap-engine/` is completely standalone and deterministic; any modifications to card positioning, post-it themes, or arrow physics should be made within that folder.
