# NoteJam

NoteJam converts lecture videos into detailed, lecture-grounded study notes with optional screenshots, handwritten-style formatting, flashcards, cheat sheets, mind maps, audio study modes, ELI5 explanations, and grounded chat.

## Project Structure

- `frontend/` - Next.js frontend
- `backend/` - FastAPI backend

## Local Development

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

## Deployment

Deploy the backend on Render with:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Backend environment variables:

```bash
GEMINI_API_KEY=your_gemini_api_key
PUBLIC_BASE_URL=https://your-render-backend.onrender.com
ALLOWED_ORIGINS=https://your-vercel-frontend.vercel.app,http://localhost:3000
```

Deploy the frontend on Vercel from the `frontend/` directory and set `NEXT_PUBLIC_API_URL` to the deployed backend URL.
