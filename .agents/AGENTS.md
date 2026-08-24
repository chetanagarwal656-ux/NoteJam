# NoteJam - AI Agent Project Rules and Context

<!-- Automatically loaded into future sessions via workspace customization root .agents/AGENTS.md -->

Refer to the complete, dense project context in [PROJECT_CONTEXT.md](file:///c:/Users/Chetan%20Agarwal/Downloads/Note_Jam/PROJECT_CONTEXT.md).

## Critical Architectural Guidelines & Rules for NoteJam

1. **Technology Stack**:
   - **Backend**: FastAPI (`backend/main.py`), Python 3.10+, `google-genai` (gemini-2.5-flash), `edge-tts`, Supabase PostgreSQL / SQLite fallback (`backend/notejam.db`).
   - **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5, Vanilla CSS Modules (`page.module.css`, `landing.module.css`), `framer-motion`, `lucide-react`, `rehype-katex`, `remark-math`, `mermaid`, Clerk Auth.
   - **No TailwindCSS**: Never add or use Tailwind CSS classes; use CSS modules and variables in `globals.css`.

2. **Database Specifications**:
   - Table: `notes` with columns (`id`, `title`, `video_url`, `markdown`, `cheatsheet`, `mindmap`, `flashcards`, `created_at`, `ai_podcast_url`, `ai_debate_url`, `user_id`).
   - Persistent cloud storage powered by Supabase (`supabase-py`) with fallback to local SQLite when credentials are not configured.
   - Smart AI Title Generation (Approach B) automatically saves generated notes on backend completion.
   - JSON fields (`cheatsheet`, `mindmap`, `flashcards`) serialized on write and parsed on read.

3. **Gemini & AI Processing Rules**:
   - Trailing Mermaid diagram in markdown must strictly follow `graph TD` and never include brackets `[]`, parentheses `()`, or quotes `"` in visible node labels.
   - Video processing uses `Part.from_uri()` for direct YouTube processing natively via Gemini infrastructure, eliminating server-side downloads or chunking.
   - Use `parse_json_response()` on all structured outputs.
   - Grounded Q&A must strictly answer from note markdown.

4. **Mind Map Vector Engine (`frontend/app/dashboard/mindmap-engine/`)**:
   - ViewBox: `1600x1000`.
   - Generates up to 8 post-it cards around a central concept circle using cubic Bézier arrows with looping curls.

5. **Speech Synthesis (`edge-tts`)**:
   - Dual speakers: Chetan (`hi-IN-MadhurNeural` / `en-IN-PrabhatNeural`) & Anamika (`hi-IN-SwaraNeural` / `en-IN-NeerjaNeural`).
   - Eliminate unnecessary commas in generated script to avoid robotic pauses.
