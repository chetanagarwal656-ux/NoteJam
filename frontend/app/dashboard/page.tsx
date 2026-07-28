"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import ReactPlayer from "react-player";
import { Upload, Link as LinkIcon, Sparkles, Download, Loader2, Home, Clock, BookOpen, Layers, BrainCircuit, FileSignature, X, ChevronLeft, ChevronRight, RotateCcw, MessageCircle, Send, Save, Trash2, PenTool, ImageOff, Moon, Sun, Maximize2, Minimize2, Volume2, Play, Pause, FastForward, Rewind, PanelRightClose } from "lucide-react";
import ReactMarkdown from "react-markdown";
import mermaid from "mermaid";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import styles from "./page.module.css";
import { useAuth, useClerk, UserButton } from "@clerk/nextjs";

type Flashcard = { question: string; answer: string; explanation?: string };
type MindmapNode = { id: string; color?: string; group?: string | number };
type MindmapLink = { source: string | MindmapNode; target: string | MindmapNode };
type SketchMindmapBranch = { title: string; prompt?: string; bullets: string[]; icon?: string };
type SketchMindmapItem = { label: string; detail?: string };
type RevisionMindmapSection = {
  title: string;
  cue?: string;
  kind?: string;
  importance?: number;
  icon?: string;
  bullets?: string[];
  formulas?: string[];
  examples?: string[];
};
type RevisionMindmapFact = { label: string; detail?: string };
type MindmapData = {
  version?: string;
  title?: string;
  centralConcept?: string;
  thesis?: string;
  sections?: RevisionMindmapSection[];
  formulas?: RevisionMindmapFact[];
  takeaways?: string[];
  centerSummary?: string[];
  branches?: SketchMindmapBranch[];
  examples?: SketchMindmapItem[];
  results?: SketchMindmapItem[];
  flow?: string[];
  footer?: string;
  nodes?: MindmapNode[];
  links?: MindmapLink[];
};
type SavedNote = {
  id: string;
  title: string;
  created_at: string;
  markdown?: string;
  cheatsheet?: string[];
  mindmap?: MindmapData | null;
  flashcards?: Flashcard[] | null;
  video_url?: string | null;
  ai_podcast_url?: string | null;
  ai_debate_url?: string | null;
};
type ReactMarkdownCodeProps = {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  node?: unknown;
};
type ReactMarkdownAnchorProps = {
  href?: string;
  children?: React.ReactNode;
  node?: unknown;
};
type WorkspaceArtifact = "cheatsheet" | "mindmap" | "flashcards" | "audio" | "chat" | "source";
type AudioScenario = "podcast" | "debate";
type WorkspaceSnapshot = {
  currentView: "home" | "notebooks";
  currentNoteId: string | null;
  noteTitle: string;
  markdown: string | null;
  videoSrc: string | null;
  cheatsheet: string[];
  mindmap: MindmapData | null;
  flashcards: Flashcard[] | null;
  aiPodcastUrl: string | null;
  aiDebateUrl: string | null;
  activeArtifact: WorkspaceArtifact | null;
  isArtifactConsoleOpen: boolean;
  isHandwritten: boolean;
  hideScreenshots: boolean;
  noteTheme: "dark" | "light";
};

const WORKSPACE_STORAGE_KEY = "notejam-dashboard-workspace";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getMindmapNodeId = (node: string | MindmapNode) => (
  typeof node === "string" ? node : node.id
);

// Mermaid Component
const Mermaid = ({ chart, noteTheme, isHandwritten }: { chart: string; noteTheme: "dark" | "light"; isHandwritten: boolean }) => {
  const paperMode = noteTheme === "light" || isHandwritten;

  useEffect(() => {
    const mermaidTheme = paperMode
      ? {
          background: '#fbfdff',
          primaryColor: '#dbeafe',
          primaryTextColor: '#0f172a',
          primaryBorderColor: '#2563eb',
          secondaryColor: '#dcfce7',
          secondaryTextColor: '#052e16',
          secondaryBorderColor: '#16a34a',
          tertiaryColor: '#fef3c7',
          tertiaryTextColor: '#451a03',
          tertiaryBorderColor: '#f59e0b',
          lineColor: '#475569',
        }
      : {
          background: '#05080c',
          primaryColor: '#bbf7d0',
          primaryTextColor: '#052e16',
          primaryBorderColor: '#22c55e',
          secondaryColor: '#fecaca',
          secondaryTextColor: '#450a0a',
          secondaryBorderColor: '#ef4444',
          tertiaryColor: '#bfdbfe',
          tertiaryTextColor: '#172554',
          tertiaryBorderColor: '#3b82f6',
          lineColor: '#e5e7eb',
        };

    mermaid.initialize({ 
      startOnLoad: true, 
      theme: 'base',
      themeVariables: {
        ...mermaidTheme,
        fontFamily: 'inherit',
        fontSize: '16px'
      }
    });
    mermaid.contentLoaded();
  }, [chart, paperMode]);

  return (
    <div
      key={`${noteTheme}-${isHandwritten ? 'handwritten' : 'typed'}-${chart}`}
      className={`mermaid ${styles.mermaidDiagram} ${paperMode ? styles.mermaidPaper : styles.mermaidDark}`}
    >
      {chart}
    </div>
  );
};

const normalizeFlashcardMath = (text: string) => (
  text.replace(/\\\\([A-Za-z])/g, "\\$1")
);

const FlashcardRichText = ({ text }: { text: string }) => (
  <div className={styles.flashcardRichText}>
    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
      {normalizeFlashcardMath(text)}
    </ReactMarkdown>
  </div>
);

// Advanced Animated Title (Left-to-Right Diffusion)
const AnimatedTitle = ({ text, isAppMode = false }: { text: string, isAppMode?: boolean }) => {
  const chars = text.split("");
  
  return (
    <div className={`${styles.noteTitleContainer} ${isAppMode ? styles.appMode : ''}`}>
      {chars.map((char, index) => (
        <span 
          key={index} 
          className={styles.diffusedChar}
          style={{ animationDelay: `${index * 0.03}s` }}
        >
          {char}
        </span>
      ))}
    </div>
  );
};

// Professional, subtle ambient motion background
const LiveBackground = () => {
  const [symbols, setSymbols] = useState<{ id: number; char: string; left: string; top: string; delay: string; duration: string; size: string }[]>([]);

  useEffect(() => {
    // Dense, minute symbols encompassing study, math, physics, and chemistry.
    // Keep this ASCII-only so the ambient layer never renders broken glyph boxes.
    const chars = [
      "sum", "int", "sqrt", "dx", "dy", "lim", "log", "sin", "cos", "+", "-", "x", "=", "f(x)",
      "pi", "theta", "lambda", "alpha", "beta", "gamma", "delta", "omega", "mu", "sigma",
      "E=mc2", "F=ma", "v=u+at", "PV=nRT", "H2O", "CO2", "CH4", "NH3", "DNA", "ATP"
    ];
    const generatedSymbols = Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      char: chars[Math.floor(Math.random() * chars.length)],
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      // Extremely staggered delays
      delay: `${-Math.random() * 60}s`, 
      // Constant smooth motion
      duration: `${30 + Math.random() * 50}s`,
      // Slightly larger sizes so they are visible
      size: `${0.8 + Math.random() * 0.6}rem`
    }));
    const timer = window.setTimeout(() => setSymbols(generatedSymbols), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className={`${styles.liveBackgroundContainer} no-print`}>
      {symbols.map((sym) => (
        <div 
          key={sym.id} 
          className={styles.floatingSymbol}
          style={{
            left: sym.left,
            top: sym.top,
            animationDelay: sym.delay,
            animationDuration: sym.duration,
            fontSize: sym.size
          }}
        >
          {sym.char}
        </div>
      ))}
    </div>
  );
};

const GenerationLoadingStage = () => {
  return (
    <section className={styles.generationStage} aria-live="polite" aria-busy="true">
      <div className={styles.generationVideoShell}>
        <video
          className={styles.generationVideo}
          src="/videos/notejam-generating-loader.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        <div className={styles.generationVideoFade} />
      </div>
      <div className={styles.generationCopy}>
        <span>Building your notes</span>
        <h1>Turning your lecture into a clean study workspace.</h1>
        <p>Extracting key ideas, timestamps, examples, and revision structure. This usually takes a moment.</p>
      </div>
      <div className={styles.generationSteps} aria-hidden="true">
        <span>Source scan</span>
        <span>Concept map</span>
        <span>Study notes</span>
      </div>
    </section>
  );
};

// --- APP WORKSPACE COMPONENT ---
const NoteApp = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const clerk = useClerk();
  
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [cheatsheet, setCheatsheet] = useState<string[]>([]);
  const [isGeneratingCheatsheet, setIsGeneratingCheatsheet] = useState(false);
  const [language, setLanguage] = useState("English");
  const [error, setError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSourcePinned, setIsSourcePinned] = useState(false);
  const [pendingSeekSeconds, setPendingSeekSeconds] = useState<number | null>(null);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[] | null>(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const [mindmap, setMindmap] = useState<MindmapData | null>(null);
  const [isGeneratingMindmap, setIsGeneratingMindmap] = useState(false);
  const mindmapSvgRef = useRef<SVGSVGElement | null>(null);

  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const [isFlashcardMaximized, setIsFlashcardMaximized] = useState(false);
  const [showFlashcardExplanation, setShowFlashcardExplanation] = useState(false);
  
  // ELI5 State
  const [selectionPos, setSelectionPos] = useState<{x: number, y: number} | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [eli5Explanation, setEli5Explanation] = useState<string | null>(null);
  const [isEli5Loading, setIsEli5Loading] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  


  // Notebooks State
  const [currentView, setCurrentView] = useState<"home" | "notebooks">("home");
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [isHandwritten, setIsHandwritten] = useState(false);
  const [hideScreenshots, setHideScreenshots] = useState(false);
  const [noteTheme, setNoteTheme] = useState<"dark" | "light">("dark");
  const [isArtifactConsoleOpen, setIsArtifactConsoleOpen] = useState(true);
  const [activeArtifact, setActiveArtifact] = useState<WorkspaceArtifact | null>(null);
  const [fullscreenArtifact, setFullscreenArtifact] = useState<WorkspaceArtifact | null>(null);
  const [aiPodcastUrl, setAiPodcastUrl] = useState<string | null>(null);
  const [aiDebateUrl, setAiDebateUrl] = useState<string | null>(null);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [podcastLanguage, setPodcastLanguage] = useState("hindi");
  const [podcastScenario, setPodcastScenario] = useState<AudioScenario>("podcast");
  const skipFirstWorkspacePersist = useRef(true);
  const didRestoreWorkspace = useRef(false);

  const playerRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (pendingSeekSeconds === null) return;

    const timer = window.setTimeout(() => {
      if (playerRef.current) {
        playerRef.current.currentTime = pendingSeekSeconds;
        setPendingSeekSeconds(null);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [pendingSeekSeconds, isSourcePinned, activeArtifact]);

  const fetchNotes = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return; // Do not fetch if auth is not ready or not signed in
    try {
      const res = await fetch(`${API_BASE}/notes`);
      const data = await res.json();
      setSavedNotes(data.notes || []);
    } catch (e) {
      console.error(e);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (currentView === "notebooks") {
      const timer = window.setTimeout(() => {
        if (!isLoaded) return;
        if (!isSignedIn) {
          clerk.openSignIn();
          setCurrentView("home");
        } else {
          void fetchNotes();
        }
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [currentView, isLoaded, isSignedIn, clerk, fetchNotes]);

  const saveCurrentNote = async () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      clerk.openSignIn();
      return;
    }
    
    if (!markdown) return;
    const title = prompt("Enter a title for this note:", noteTitle || "Untitled Note");
    if (!title) return;
    
    setIsSaving(true);
    try {
      const isUpdate = !!currentNoteId;
      const url = isUpdate ? `${API_BASE}/notes/${currentNoteId}` : `${API_BASE}/notes`;
      const method = isUpdate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          video_url: videoSrc,
          markdown,
          cheatsheet: cheatsheet.length > 0 ? cheatsheet : null,
          mindmap,
          flashcards,
          ai_podcast_url: aiPodcastUrl,
          ai_debate_url: aiDebateUrl
        })
      });
      const data = await res.json();
      if (!isUpdate) {
        setCurrentNoteId(data.id);
      }
      setNoteTitle(title);
      setSaveMessage("Saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (e) {
      console.error(e);
      alert("Failed to save note.");
    } finally {
      setIsSaving(false);
    }
  };

  const loadNote = useCallback(async (id: string, targetView: "home" | "notebooks" = "notebooks") => {
    try {
      const res = await fetch(`${API_BASE}/notes/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setMarkdown(data.markdown);
      setCheatsheet(data.cheatsheet || []);
      setMindmap(data.mindmap || null);
      setFlashcards(data.flashcards || null);
      setVideoSrc(data.video_url || null);
      setAiPodcastUrl(data.ai_podcast_url || null);
      setAiDebateUrl(data.ai_debate_url || null);
      setNoteTitle(data.title);
      setCurrentNoteId(data.id);
      setActiveArtifact(null);
      setIsArtifactConsoleOpen(true);
      setFullscreenArtifact(null);
      setCurrentView(targetView);
    } catch (e) {
      console.error(e);
      alert("Failed to load note.");
    }
  }, []);

  useEffect(() => {
    if (didRestoreWorkspace.current) return;
    didRestoreWorkspace.current = true;

    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
        if (!raw) return;
        const snapshot = JSON.parse(raw) as Partial<WorkspaceSnapshot>;

        setMarkdown(snapshot.markdown ?? null);
        setCheatsheet(snapshot.cheatsheet || []);
        setMindmap(snapshot.mindmap ?? null);
        setFlashcards(snapshot.flashcards ?? null);
        setVideoSrc(snapshot.videoSrc ?? null);
        setAiPodcastUrl(snapshot.aiPodcastUrl ?? null);
        setAiDebateUrl(snapshot.aiDebateUrl ?? null);
        setNoteTitle(snapshot.noteTitle || "");
        setCurrentNoteId(snapshot.currentNoteId ?? null);
        setCurrentView(snapshot.currentView || "home");
        setActiveArtifact(snapshot.activeArtifact ?? null);
        setIsArtifactConsoleOpen(snapshot.isArtifactConsoleOpen ?? true);
        setIsHandwritten(snapshot.isHandwritten || false);
        setHideScreenshots(snapshot.hideScreenshots || false);
        setNoteTheme(snapshot.noteTheme || "dark");

        if (snapshot.currentNoteId && !snapshot.markdown) {
          void loadNote(snapshot.currentNoteId, snapshot.currentView || "notebooks");
        }
      } catch {
        window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadNote]);

  const deleteNote = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      await fetch(`${API_BASE}/notes/${id}`, { method: "DELETE" });
      setSavedNotes(prev => prev.filter(n => n.id !== id));
      if (currentNoteId === id) {
        setMarkdown(null);
        setCurrentNoteId(null);
        setNoteTitle("");
        setActiveArtifact(null);
        setFullscreenArtifact(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (skipFirstWorkspacePersist.current) {
      skipFirstWorkspacePersist.current = false;
      return;
    }

    const snapshot: WorkspaceSnapshot = {
      currentView,
      currentNoteId,
      noteTitle,
      markdown,
      videoSrc,
      cheatsheet,
      mindmap,
      flashcards,
      aiPodcastUrl,
      aiDebateUrl,
      activeArtifact,
      isArtifactConsoleOpen,
      isHandwritten,
      hideScreenshots,
      noteTheme
    };
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(snapshot));
  }, [
    currentView,
    currentNoteId,
    noteTitle,
    markdown,
    videoSrc,
    cheatsheet,
    mindmap,
    flashcards,
    aiPodcastUrl,
    aiDebateUrl,
    activeArtifact,
    isArtifactConsoleOpen,
    isHandwritten,
    hideScreenshots,
    noteTheme
  ]);

  const handleProcess = async () => {
    if (!url && !file) {
      setError("Please provide a video URL or upload a file first.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setProcessingMessage("Preparing your lecture...");
    
    try {
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
        setVideoSrc(URL.createObjectURL(file));
      } else if (url) {
        formData.append("url", url);
        setVideoSrc(url);
      }
      formData.append("language", language);

      const response = await fetch(`${API_BASE}/process`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to process video");
      }

      let data = await response.json();
      if (data.job_id) {
        data = await pollProcessJob(data.job_id, data.message);
      }
      const parsedMarkdown = data.markdown.replace(/(?<!\]\()\[(\d{1,2}:\d{2}(?::\d{2})?)\](?!\()/g, '[$1](#$1)');
      setMarkdown(parsedMarkdown);
      setCheatsheet([]);
      setMindmap(null);
      setFlashcards(null);
      setCurrentNoteId(null);
      setNoteTitle("");
      setActiveArtifact(null);
      setFullscreenArtifact(null);
      setIsArtifactConsoleOpen(true);
      setCurrentView("home");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message === "Failed to fetch" ? "Could not reach the notes engine. Please restart the backend and try again." : message);
    } finally {
      setIsLoading(false);
      setProcessingMessage(null);
    }
  };

  const pollProcessJob = async (jobId: string, firstMessage?: string) => {
    setProcessingMessage(firstMessage || "Preparing your lecture...");

    for (let attempt = 0; attempt < 720; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 5000));
      const response = await fetch(`${API_BASE}/process/${jobId}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Could not check note generation progress.");
      }

      const data = await response.json();
      setProcessingMessage(data.message || "Generating your notes...");

      if (data.status === "complete") {
        return data.result;
      }

      if (data.status === "failed") {
        throw new Error(data.message || "Note generation failed.");
      }
    }

    throw new Error("Note generation is taking too long. Please try again with a shorter lecture.");
  };

  const confirmExport = () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      clerk.openSignIn();
      return;
    }
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const responseMessage = async (response: Response, fallback: string) => {
    try {
      const data = await response.json();
      return data?.detail || data?.message || fallback;
    } catch {
      return fallback;
    }
  };

  const postJsonWithRetry = async <T,>(endpoint: string, body: unknown, fallbackMessage: string): Promise<T> => {
    let lastError = new Error(fallbackMessage);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          return await response.json() as T;
        }

        lastError = new Error(await responseMessage(response, fallbackMessage));
        const retryable = response.status === 429 || response.status >= 500;
        if (!retryable || attempt === 1) break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(fallbackMessage);
        if (attempt === 1) break;
      }

      await wait(900);
    }

    throw lastError;
  };

  const autosaveCurrentNote = async (patch: Partial<Pick<WorkspaceSnapshot, "cheatsheet" | "mindmap" | "flashcards" | "aiPodcastUrl" | "aiDebateUrl">>) => {
    if (!currentNoteId || !markdown) return;

    try {
      await fetch(`${API_BASE}/notes/${currentNoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: noteTitle || "Untitled Note",
          video_url: videoSrc,
          markdown,
          cheatsheet: patch.cheatsheet !== undefined ? (patch.cheatsheet.length > 0 ? patch.cheatsheet : null) : (cheatsheet.length > 0 ? cheatsheet : null),
          mindmap: patch.mindmap !== undefined ? patch.mindmap : mindmap,
          flashcards: patch.flashcards !== undefined ? patch.flashcards : flashcards,
          ai_podcast_url: patch.aiPodcastUrl !== undefined ? patch.aiPodcastUrl : aiPodcastUrl,
          ai_debate_url: patch.aiDebateUrl !== undefined ? patch.aiDebateUrl : aiDebateUrl
        })
      });
      setSaveMessage("Saved automatically");
      setTimeout(() => setSaveMessage(""), 2500);
      void fetchNotes();
    } catch (e) {
      console.error("Failed to autosave artifact", e);
      setSaveMessage("Autosave failed");
      setTimeout(() => setSaveMessage(""), 2500);
    }
  };

  const handleGenerateCheatsheet = async () => {
    if (!markdown) return;
    setIsGeneratingCheatsheet(true);
    try {
      const data = await postJsonWithRetry<{ cheatsheet: string[] }>("/cheatsheet", { markdown }, "Failed to generate cheatsheet");
      setCheatsheet(data.cheatsheet);
      setActiveArtifact("cheatsheet");
      setIsArtifactConsoleOpen(true);
      await autosaveCurrentNote({ cheatsheet: data.cheatsheet });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate cheatsheet.";
      setSaveMessage(message);
      setTimeout(() => setSaveMessage(""), 3500);
    } finally {
      setIsGeneratingCheatsheet(false);
    }
  };

  const handleGenerateMindmap = async () => {
    if (!markdown) return;
    setIsGeneratingMindmap(true);
    try {
      const data = await postJsonWithRetry<{ mindmap: MindmapData }>("/mindmap", { markdown }, "Failed to generate mind map");
      setMindmap(data.mindmap);
      setActiveArtifact("mindmap");
      setIsArtifactConsoleOpen(true);
      await autosaveCurrentNote({ mindmap: data.mindmap });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate mind map.";
      setSaveMessage(message);
      setTimeout(() => setSaveMessage(""), 3500);
    } finally {
      setIsGeneratingMindmap(false);
    }
  };

  const handleExportFlashcards = async () => {
    if (!markdown) return;
    if (flashcards && flashcards.length > 0) {
      setFlashcardIndex(0);
      setIsFlipped(false);
      setShowFlashcardExplanation(false);
      setActiveArtifact("flashcards");
      setIsArtifactConsoleOpen(true);
      return;
    }
    
    setIsGeneratingFlashcards(true);
    try {
      const data = await postJsonWithRetry<{ flashcards: Flashcard[] }>("/flashcards", { markdown }, "Failed to generate flashcards");
      setFlashcards(data.flashcards);
      setFlashcardIndex(0);
      setIsFlipped(false);
      setShowFlashcardExplanation(false);
      setActiveArtifact("flashcards");
      setIsArtifactConsoleOpen(true);
      await autosaveCurrentNote({ flashcards: data.flashcards });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate flashcards.";
      setSaveMessage(message);
      setTimeout(() => setSaveMessage(""), 3500);
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionPos({ x: rect.left + rect.width / 2, y: rect.top + window.scrollY - 50 });
      setSelectedText(selection.toString().trim());
    } else {
      setSelectionPos(null);
    }
  };

  const handleEli5 = async () => {
    setIsEli5Loading(true);
    setEli5Explanation(null);
    setSelectionPos(null); // hide the floating button
    try {
      const res = await fetch(`${API_BASE}/simplify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedText })
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setEli5Explanation(data.explanation);
    } catch {
      alert("Failed to fetch ELI5 explanation.");
      setEli5Explanation(null);
    } finally {
      setIsEli5Loading(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !markdown) return;
    
    const newMessage = { role: "user", content: chatInput.trim() };
    const newHistory = [...chatMessages, newMessage];
    
    setChatMessages(newHistory);
    setChatInput("");
    setIsChatLoading(true);
    
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: markdown,
          question: newMessage.content,
          history: chatMessages 
        })
      });
      if (!res.ok) throw new Error("Failed to chat");
      const data = await res.json();
      setChatMessages([...newHistory, { role: "assistant", content: data.answer }]);
    } catch (err) {
      console.error(err);
      setChatMessages([...newHistory, { role: "assistant", content: "Sorry, I couldn't process your question." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Beautiful Audio Player State
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [activeAudioTitle, setActiveAudioTitle] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0); // 0 to 1
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [isStreamingAudio, setIsStreamingAudio] = useState(false);

  const openBeautifulPlayer = (url: string, title: string) => {
    setActiveAudioUrl(url);
    setActiveAudioTitle(title);
    setIsAudioPlaying(true);
    setAudioProgress(0);
    setAudioCurrentTime(0);
    setIsStreamingAudio(false);
  };

  const closeBeautifulPlayer = () => {
    setActiveAudioUrl(null);
    setIsAudioPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      setAudioCurrentTime(current);
      if (duration && duration !== Infinity) {
        setIsStreamingAudio(false);
        setAudioProgress(current / duration);
      } else {
        setIsStreamingAudio(true);
        // Fallback for streaming infinite duration: fake progress or just 0
        setAudioProgress(0);
      }
    }
  };

  const toggleAudioPlay = () => {
    if (audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsAudioPlaying(!isAudioPlaying);
    }
  };

  const skipAudio = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const handleGeneratePodcast = async (scenario: AudioScenario = podcastScenario) => {
    if (!markdown) return;
    setIsGeneratingPodcast(true);
    setPodcastScenario(scenario);
    try {
      const data = await postJsonWithRetry<{ url: string }>("/podcast", { markdown, language: podcastLanguage, scenario }, "Failed to generate podcast");
      
      if (scenario === "podcast") {
        setAiPodcastUrl(data.url);
        await autosaveCurrentNote({ aiPodcastUrl: data.url });
      } else {
        setAiDebateUrl(data.url);
        await autosaveCurrentNote({ aiDebateUrl: data.url });
      }
      setActiveArtifact("audio");
      setIsArtifactConsoleOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate podcast.";
      setSaveMessage(message);
      setTimeout(() => setSaveMessage(""), 3500);
    } finally {
      setIsGeneratingPodcast(false);
    }
  };

  const resetWorkspace = () => {
    setIsPlaying(false);
    setIsSourcePinned(false);
    setPendingSeekSeconds(null);
    setMarkdown(null);
    setCheatsheet([]);
    setMindmap(null);
    setFlashcards(null);
    setNoteTitle("");
    setCurrentNoteId(null);
    setVideoSrc(null);
    setAiPodcastUrl(null);
    setAiDebateUrl(null);
    setActiveArtifact(null);
    setFullscreenArtifact(null);
    setIsArtifactConsoleOpen(true);
    setCurrentView("home");
  };

  const closeCurrentNoteToLibrary = () => {
    setIsPlaying(false);
    setIsSourcePinned(false);
    setPendingSeekSeconds(null);
    setMarkdown(null);
    setCheatsheet([]);
    setMindmap(null);
    setFlashcards(null);
    setCurrentNoteId(null);
    setNoteTitle("");
    setVideoSrc(null);
    setAiPodcastUrl(null);
    setAiDebateUrl(null);
    setActiveArtifact(null);
    setFullscreenArtifact(null);
    setCurrentView("notebooks");
  };

  const openArtifact = (artifact: WorkspaceArtifact) => {
    setActiveArtifact(artifact);
    setIsArtifactConsoleOpen(true);
  };

  const renderFlashcardWorkspace = (isExpanded = false) => {
    if (!flashcards || flashcards.length === 0) {
      return (
        <div className={styles.emptyArtifactState}>
          <BrainCircuit size={32} />
          <p>Flashcards are not ready yet.</p>
          <button className={styles.artifactPrimaryBtn} onClick={handleExportFlashcards} disabled={isGeneratingFlashcards}>
            {isGeneratingFlashcards ? <Loader2 className={styles.loader} size={16} /> : <Sparkles size={16} />}
            Generate flashcards
          </button>
        </div>
      );
    }

    return (
      <div className={styles.inlineFlashcards}>
        <div className={styles.flashcardCounter}>Card {flashcardIndex + 1} of {flashcards.length}</div>
        <div
          className={`${styles.flashcardContainer} ${isFlipped ? styles.flipped : ""}`}
          style={isExpanded ? { height: 'min(58vh, 520px)' } : {}}
          onClick={() => {
            if (!isFlipped) {
              setIsFlipped(true);
            } else if (!showFlashcardExplanation && flashcards[flashcardIndex].explanation) {
              setShowFlashcardExplanation(true);
            } else {
              setIsFlipped(false);
              setShowFlashcardExplanation(false);
            }
          }}
        >
          <div className={styles.flashcardInner}>
            <div className={styles.flashcardFront}>
              <div className={styles.flashcardLabel}>Question</div>
              <div className={styles.flashcardText}>
                <FlashcardRichText text={flashcards[flashcardIndex].question} />
              </div>
              <div className={styles.flipHint}><RotateCcw size={14} /> Click to flip</div>
            </div>
            <div className={styles.flashcardBack}>
              <div className={styles.flashcardLabel}>Answer</div>
              <div className={styles.flashcardText}>
                <FlashcardRichText text={flashcards[flashcardIndex].answer} />
              </div>
              {isFlipped && flashcards[flashcardIndex].explanation && (
                <div className={styles.flashcardExplanation} style={{ opacity: showFlashcardExplanation ? 1 : 0 }}>
                  <strong>Explanation:</strong>
                  <FlashcardRichText text={flashcards[flashcardIndex].explanation || ""} />
                </div>
              )}
              <div className={styles.flipHint}>
                {!showFlashcardExplanation && flashcards[flashcardIndex].explanation ? <><Sparkles size={14} /> Click for explanation</> : <><RotateCcw size={14} /> Flip back</>}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.flashcardControls}>
          <button
            className={styles.flashcardNavBtn}
            disabled={flashcardIndex === 0}
            onClick={() => {
              setIsFlipped(false);
              setShowFlashcardExplanation(false);
              setFlashcardIndex(prev => prev - 1);
            }}
          >
            <ChevronLeft size={18} /> Previous
          </button>
          <button
            className={styles.flashcardNavBtn}
            disabled={flashcardIndex === flashcards.length - 1}
            onClick={() => {
              setIsFlipped(false);
              setShowFlashcardExplanation(false);
              setFlashcardIndex(prev => prev + 1);
            }}
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const serializeMindmapSvg = () => {
    const svg = mindmapSvgRef.current;
    if (!svg) throw new Error("Mind map is not ready yet.");

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "1600");
    clone.setAttribute("height", "1000");
    clone.setAttribute("viewBox", "0 0 1600 1000");

    const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    background.setAttribute("width", "1600");
    background.setAttribute("height", "1000");
    background.setAttribute("fill", "#fffefa");
    clone.insertBefore(background, clone.firstChild);

    return new XMLSerializer().serializeToString(clone);
  };

  const svgDataUrlToCanvas = async (svgUrl: string) => {
    return await new Promise<HTMLCanvasElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1600;
        canvas.height = 1000;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not prepare export canvas."));
          return;
        }
        ctx.fillStyle = "#fffefa";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      };
      image.onerror = () => reject(new Error("Could not render mind map export."));
      image.src = svgUrl;
    });
  };

  const renderMindmapToCanvas = async () => {
    const svgText = serializeMindmapSvg();
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
    return await svgDataUrlToCanvas(svgUrl);
  };

  const canvasToPngBlob = async (canvas: HTMLCanvasElement) => (
    await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not prepare PNG file."));
      }, "image/png");
    })
  );

  const exportMindmapAsPng = async () => {
    try {
      const canvas = await renderMindmapToCanvas();
      downloadBlob(await canvasToPngBlob(canvas), `${noteTitle || "notejam"}-mind-map.png`);
    } catch (err) {
      console.error(err);
      alert("Could not export mind map image.");
    }
  };

  const exportMindmapAsSvg = () => {
    try {
      downloadBlob(new Blob([serializeMindmapSvg()], { type: "image/svg+xml;charset=utf-8" }), `${noteTitle || "notejam"}-mind-map.svg`);
    } catch (err) {
      console.error(err);
      alert("Could not export mind map SVG.");
    }
  };
  const createPdfFromJpeg = (jpegBytes: Uint8Array) => {
    const parts: BlobPart[] = [];
    const offsets: number[] = [];
    let offset = 0;
    const add = (part: string | Uint8Array) => {
      parts.push(typeof part === "string" ? part : new Uint8Array(part) as BlobPart);
      offset += typeof part === "string" ? part.length : part.length;
    };
    const obj = (id: number, content: string) => {
      offsets[id] = offset;
      add(`${id} 0 obj\n${content}\nendobj\n`);
    };

    add("%PDF-1.4\n");
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
    obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    obj(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1600 1000] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>");
    const content = "q\n1600 0 0 1000 0 0 cm\n/Im0 Do\nQ";
    obj(4, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    offsets[5] = offset;
    add(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width 1600 /Height 1000 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
    add(jpegBytes);
    add("\nendstream\nendobj\n");

    const xrefOffset = offset;
    add("xref\n0 6\n0000000000 65535 f \n");
    for (let i = 1; i <= 5; i += 1) {
      add(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
    }
    add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
    return new Blob(parts, { type: "application/pdf" });
  };

  const exportMindmapAsPdf = async () => {
    try {
      const canvas = await renderMindmapToCanvas();
      const jpeg = canvas.toDataURL("image/jpeg", 0.95).split(",")[1];
      const bytes = Uint8Array.from(atob(jpeg), (char) => char.charCodeAt(0));
      downloadBlob(createPdfFromJpeg(bytes), `${noteTitle || "notejam"}-mind-map.pdf`);
    } catch (err) {
      console.error(err);
      alert("Could not export mind map PDF.");
    }
  };

  const renderConstellationMindmap = (isExpanded = false) => {
    if (!mindmap) {
      return (
        <div className={styles.emptyArtifactState}>
          <Sparkles size={32} />
          <p>Turn the note into a polished one-page study mind map.</p>
          <button className={styles.artifactPrimaryBtn} onClick={handleGenerateMindmap} disabled={isGeneratingMindmap}>
            {isGeneratingMindmap ? <Loader2 className={styles.loader} size={16} /> : <Sparkles size={16} />}
            Generate mind map
          </button>
        </div>
      );
    }

    type RevisionSheet = {
      title: string;
      centralConcept: string;
      thesis: string;
      sections: RevisionMindmapSection[];
      examples: RevisionMindmapFact[];
      formulas: RevisionMindmapFact[];
      takeaways: string[];
      flow: string[];
    };
    type PlannedSection = {
      id: string;
      title: string;
      cue: string;
      kind: string;
      icon: string;
      importance: number;
      bullets: string[];
      formulas: string[];
      examples: string[];
      x: number;
      y: number;
      w: number;
      h: number;
      rotate: number;
      shape: "note" | "bubble" | "tag" | "formula" | "ticket" | "torn";
      connector: { sx: number; sy: number; cx: number; cy: number; ex: number; ey: number };
      titleLines: string[];
      bulletLines: string[][];
      formulaLines: string[][];
      exampleLines: string[][];
    };

    const SVG_WIDTH = 1600;
    const PAPER_MARGIN = 64;
    const center = { x: 800, y: 458, w: 390, h: 238 };
    const placeholderPattern = /^(key idea|main relationship|exam revision point|review this core point|important concept|core concept|important point)$/i;
    const stopWords = new Set(["a", "an", "and", "are", "as", "by", "for", "from", "how", "in", "into", "is", "of", "on", "or", "the", "to", "with", "using", "solving"]);

    const clampText = (text: string, maxLength: number) => {
      const clean = String(text || "").trim();
      return clean.length > maxLength ? `${clean.slice(0, Math.max(0, maxLength - 1)).trim()}...` : clean;
    };
    const cleanText = (value: unknown, fallback = "") => (
      String(value || fallback)
        .replace(/[`*_#]/g, "")
        .replace(/\$+/g, "")
        .replace(/\\([A-Za-z]+)/g, "$1")
        .replace(/\s+/g, " ")
        .trim()
    );
    const hashText = (value: string) => [...value].reduce((hash, char) => ((hash * 31 + char.charCodeAt(0)) % 9973), 17);
    const jitter = (seed: string, amount: number, step = 0) => (((hashText(`${seed}-${step}`) % 200) / 100) - 1) * amount;
    const removeLongParenthetical = (text: string) => text.replace(/\s*\([^)]{20,}\)\s*/g, " ").replace(/\s+/g, " ").trim();
    const smartTitle = (text: string, max = 30) => {
      const cleaned = removeLongParenthetical(cleanText(text))
        .replace(/\s+and\s+/gi, " & ")
        .replace(/\s*[:;-]\s*$/g, "")
        .trim();
      return clampText(cleaned, max);
    };
    const centralTitle = (text: string) => {
      const cleaned = removeLongParenthetical(cleanText(text, "Study Map"))
        .replace(/\s+for\s+.+$/i, "")
        .replace(/\s+using\s+.+$/i, "")
        .replace(/\s+with\s+.+$/i, "")
        .replace(/\s*[:;-].+$/g, "")
        .trim();
      if (cleaned.length <= 26 && cleaned.split(" ").length <= 4) return cleaned;
      const words = cleaned.split(" ").filter(Boolean);
      const meaningful = words.filter((word) => !stopWords.has(word.toLowerCase()));
      const chosen = (meaningful.length >= 2 ? meaningful : words).slice(0, 3).join(" ").replace(/\.\.\.$/, "");
      return chosen || "Study Map";
    };
    const wrapLines = (text: string, maxChars: number, maxLines = 3) => {
      const words = cleanText(text).split(" ").filter(Boolean);
      const lines: string[] = [];
      let current = "";
      words.forEach((word) => {
        const safeWord = word.length > maxChars ? `${word.slice(0, maxChars - 1)}-` : word;
        const candidate = current ? `${current} ${safeWord}` : safeWord;
        if (candidate.length > maxChars && current) {
          lines.push(current);
          current = safeWord;
        } else {
          current = candidate;
        }
      });
      if (current) lines.push(current);
      if (lines.length > maxLines) {
        const kept = lines.slice(0, maxLines);
        kept[maxLines - 1] = clampText(kept[maxLines - 1], Math.max(8, maxChars - 2));
        return kept;
      }
      return lines.length > 0 ? lines : [""];
    };
    const cleanList = (items: unknown[] | undefined, maxItems: number, maxLength: number) => (
      (items || [])
        .map((item) => clampText(cleanText(item), maxLength))
        .filter((item) => item && !placeholderPattern.test(item))
        .slice(0, maxItems)
    );

    const ContentExtractor = (): RevisionSheet => {
      if (mindmap.sections && mindmap.sections.length > 0) {
        return {
          title: smartTitle(mindmap.title || mindmap.centralConcept || "Study Map", 44),
          centralConcept: centralTitle(mindmap.centralConcept || mindmap.title || "Study Map"),
          thesis: clampText(cleanText(mindmap.thesis || "Connect the core idea before revising details."), 84),
          sections: mindmap.sections,
          examples: (mindmap.examples || []).map((item) => ({ label: cleanText(item.label), detail: cleanText(item.detail) })),
          formulas: mindmap.formulas || mindmap.results || [],
          takeaways: mindmap.takeaways || (mindmap.footer ? [mindmap.footer] : []),
          flow: mindmap.flow || [],
        };
      }

      if (mindmap.branches && mindmap.branches.length > 0) {
        return {
          title: smartTitle(mindmap.title || "Study Map", 44),
          centralConcept: centralTitle(mindmap.title || "Study Map"),
          thesis: clampText(cleanText((mindmap.centerSummary || []).join("; ") || mindmap.footer || "One-page revision of the core lecture ideas."), 84),
          sections: mindmap.branches.map((branch, index) => ({
            title: branch.title,
            cue: branch.prompt || ["What is it?", "Why matter?", "How used?"][index % 3],
            kind: "definition",
            importance: 8 - index,
            icon: branch.icon,
            bullets: branch.bullets,
          })),
          examples: (mindmap.examples || []).map((item) => ({ label: cleanText(item.label), detail: cleanText(item.detail) })),
          formulas: mindmap.results || [],
          takeaways: mindmap.footer ? [mindmap.footer] : [],
          flow: mindmap.flow || [],
        };
      }

      const allNodes = mindmap.nodes || [];
      const allIds = new Set(allNodes.map((node) => node.id));
      const validLinks = (mindmap.links || []).filter((link) => (
        allIds.has(getMindmapNodeId(link.source)) && allIds.has(getMindmapNodeId(link.target))
      ));
      const degree = new Map<string, number>();
      allNodes.forEach((node) => degree.set(node.id, 0));
      validLinks.forEach((link) => {
        const source = getMindmapNodeId(link.source);
        const target = getMindmapNodeId(link.target);
        degree.set(source, (degree.get(source) || 0) + 1);
        degree.set(target, (degree.get(target) || 0) + 1);
      });
      const root = [...allNodes].sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0))[0] || { id: "Study Map" };
      const adjacency = new Map<string, string[]>();
      allNodes.forEach((node) => adjacency.set(node.id, []));
      validLinks.forEach((link) => {
        const source = getMindmapNodeId(link.source);
        const target = getMindmapNodeId(link.target);
        adjacency.get(source)?.push(target);
        adjacency.get(target)?.push(source);
      });
      const sections = (adjacency.get(root.id) || []).slice(0, 6).map((id, index) => ({
        title: id,
        cue: ["What is it?", "Why matter?", "How used?"][index % 3],
        kind: "definition",
        importance: 7 - index,
        icon: ["speech", "bulb", "gear", "formula", "target", "chart"][index % 6],
        bullets: (adjacency.get(id) || []).filter((item) => item !== root.id).slice(0, 3),
      }));
      return {
        title: smartTitle(root.id, 44),
        centralConcept: centralTitle(root.id),
        thesis: "A quick visual path through the most connected concepts.",
        sections,
        examples: [],
        formulas: [],
        takeaways: [],
        flow: sections.map((section) => smartTitle(section.title, 12)),
      };
    };

    const IconSelector = (section: RevisionMindmapSection, index: number) => {
      const text = `${section.title || ""} ${section.kind || ""} ${(section.bullets || []).join(" ")}`.toLowerCase();
      if (section.icon) return section.icon;
      if (/formula|equation|matrix|probability|law|rule|axiom/.test(text)) return "formula";
      if (/example|case|sample|coin|dice|experiment/.test(text)) return "dice";
      if (/process|step|algorithm|workflow|method/.test(text)) return "arrow";
      if (/warning|fail|error|risk|condition/.test(text)) return "target";
      if (/component|system|architecture|computer|code/.test(text)) return "code";
      return ["speech", "bulb", "gear", "book", "target", "chart"][index % 6];
    };

    const InformationArchitect = (sheet: RevisionSheet) => {
      const rawDensity = sheet.sections.reduce((score, section) => {
        const titleScore = cleanText(section.title).length > 24 ? 1 : 0;
        const bulletScore = (section.bullets || []).filter((bullet) => cleanText(bullet).length > 42).length;
        const formulaScore = (section.formulas || []).length * 1.4;
        return score + titleScore + bulletScore + formulaScore;
      }, 0);
      const visibleSectionCount = rawDensity > 7 ? 5 : 6;
      const sections = [...sheet.sections]
        .map((section, index) => {
          const kind = section.kind || "definition";
          const formulas = cleanList(section.formulas, kind === "formula" ? 2 : 1, 34);
          const examples = cleanList(section.examples, 1, 40);
          const bullets = cleanList(section.bullets, formulas.length > 0 ? 2 : 3, 48);
          const importance = Math.max(1, Math.min(10, Number(section.importance || 6) + (formulas.length ? 1 : 0)));
          return {
            ...section,
            title: smartTitle(section.title || `Topic ${index + 1}`, 28),
            cue: smartTitle(section.cue || ["What is it?", "Why?", "How?", "When?", "Watch for?", "Example?"][index % 6], 24),
            kind,
            importance,
            icon: IconSelector(section, index),
            bullets: bullets.length > 0 ? bullets : examples.slice(0, 1),
            formulas,
            examples,
          };
        })
        .filter((section) => section.title)
        .sort((a, b) => (b.importance || 5) - (a.importance || 5))
        .slice(0, visibleSectionCount);

      return {
        ...sheet,
        centralConcept: centralTitle(sheet.centralConcept || sheet.title),
        thesis: clampText(cleanText(sheet.thesis), 84),
        sections,
        examples: (sheet.examples || []).map((item) => ({ label: smartTitle(item.label, 22), detail: clampText(cleanText(item.detail), 34) })).filter((item) => item.label).slice(0, 3),
        formulas: (sheet.formulas || []).map((item) => ({ label: smartTitle(item.label, 22), detail: clampText(cleanText(item.detail), 34) })).filter((item) => item.label).slice(0, 3),
        takeaways: cleanList(sheet.takeaways, 2, 68),
        flow: cleanList(sheet.flow, 5, 16),
      };
    };

    const BoxSizer = (section: ReturnType<typeof InformationArchitect>["sections"][number], baseWidth: number) => {
      const titleWeight = Math.max(0, section.title.length - 18);
      const formulaWeight = (section.formulas || []).join(" ").length;
      const width = Math.max(320, Math.min(455, baseWidth + Math.min(62, titleWeight * 4 + formulaWeight * 0.55)));
      const titleChars = Math.max(15, Math.floor((width - 76) / 13.2));
      const bodyChars = Math.max(23, Math.floor((width - 88) / 9.4));
      const titleLines = wrapLines(section.title.toUpperCase(), titleChars, 2);
      const bulletLines = (section.bullets || []).slice(0, section.formulas?.length ? 2 : 3).map((bullet) => wrapLines(bullet, bodyChars, 2));
      const formulaLines = (section.formulas || []).slice(0, 2).map((formula) => wrapLines(formula, Math.floor((width - 118) / 8.8), 1));
      const exampleLines = (section.examples || []).slice(0, 1).map((example) => wrapLines(example, Math.floor((width - 118) / 8.8), 1));
      const bodyLineCount = bulletLines.reduce((sum, lines) => sum + lines.length, 0);
      const chipLineCount = formulaLines.length + exampleLines.length;
      const desiredHeight = 92 + titleLines.length * 25 + bodyLineCount * 24 + chipLineCount * 38;
      const height = Math.max(150, Math.min(242, desiredHeight));
      return { width, height, titleLines, bulletLines, formulaLines, exampleLines };
    };

    const LayoutPlanner = (sheet: ReturnType<typeof InformationArchitect>) => {
      const slotCatalog = [
        { x: 122, y: 120, w: 386, side: "left", shape: "torn" as const, rotate: -2.1 },
        { x: 1092, y: 130, w: 390, side: "right", shape: "bubble" as const, rotate: 1.35 },
        { x: 94, y: 438, w: 370, side: "left", shape: "formula" as const, rotate: 1.0 },
        { x: 1138, y: 426, w: 370, side: "right", shape: "note" as const, rotate: -1.15 },
        { x: 270, y: 690, w: 384, side: "left", shape: "ticket" as const, rotate: -0.85 },
        { x: 942, y: 684, w: 384, side: "right", shape: "tag" as const, rotate: 1.15 },
      ];
      const usedSlots = sheet.sections.length === 5
        ? [slotCatalog[0], slotCatalog[1], slotCatalog[2], slotCatalog[3], { ...slotCatalog[4], x: 606, y: 722, side: "center", w: 392, rotate: -0.3 }]
        : slotCatalog;

      return sheet.sections.map((section, index) => {
        const slot = usedSlots[index];
        const measured = BoxSizer(section, slot.w);
        const side = slot.side as "left" | "right" | "center";
        const x = Math.max(PAPER_MARGIN + 20, Math.min(SVG_WIDTH - PAPER_MARGIN - measured.width - 20, slot.x + jitter(section.title, side === "center" ? 8 : 14, 1)));
        const y = Math.max(98, Math.min(760, slot.y + jitter(section.title, 10, 2)));
        const sx = side === "left" ? center.x - center.w * 0.46 : side === "right" ? center.x + center.w * 0.46 : center.x;
        const sy = index < 2 ? center.y - center.h * 0.38 : index < 4 ? center.y + 8 : center.y + center.h * 0.43;
        const ex = side === "left" ? x + measured.width + 10 : side === "right" ? x - 10 : x + measured.width / 2;
        const ey = side === "center" ? y - 8 : y + measured.height * 0.46;
        const cxBias = side === "left" ? -70 : side === "right" ? 70 : 0;
        return {
          id: `${section.title}-${index}`,
          title: section.title,
          cue: section.cue || "Key idea",
          kind: section.kind || "definition",
          icon: section.icon || slot.shape,
          importance: section.importance || 5,
          bullets: section.bullets || [],
          formulas: section.formulas || [],
          examples: section.examples || [],
          x,
          y,
          w: measured.width,
          h: measured.height,
          rotate: slot.rotate + jitter(section.title, 0.35, 3),
          shape: section.kind === "formula" ? "formula" : slot.shape,
          connector: { sx, sy, cx: (sx + ex) / 2 + cxBias + jitter(section.title, 22, 4), cy: (sy + ey) / 2 + jitter(section.title, 28, 5), ex, ey },
          titleLines: measured.titleLines,
          bulletLines: measured.bulletLines,
          formulaLines: measured.formulaLines,
          exampleLines: measured.exampleLines,
        };
      });
    };
    const sheet = InformationArchitect(ContentExtractor());
    const plannedSections = LayoutPlanner(sheet);
    const centralLines = wrapLines(sheet.centralConcept.toUpperCase(), sheet.centralConcept.length > 18 ? 14 : 18, 2);
    const centralFontSize = centralLines.length > 1 ? (Math.max(...centralLines.map((line) => line.length)) > 14 ? 42 : 46) : 54;
    const centralBullets = [sheet.thesis, ...sheet.flow.slice(0, 3)].filter(Boolean).map((item) => clampText(cleanText(item), 36)).slice(0, 4);
    const supportItems = [...sheet.formulas.map((item) => ({ ...item, label: `Rule: ${item.label}` })), ...sheet.examples.map((item) => ({ ...item, label: `Ex: ${item.label}` }))].slice(0, 3);

    const renderTextLines = (lines: string[] | string, x: number, y: number, lineHeight: number, className: string, anchor: "start" | "middle" | "end" = "start", style?: React.CSSProperties) => {
      const safeLines = Array.isArray(lines) ? lines : wrapLines(lines, 32, 3);
      return (
        <text x={x} y={y} className={className} textAnchor={anchor} style={style}>
          {safeLines.map((line, lineIndex) => (
            <tspan key={`${line}-${lineIndex}`} x={x} dy={lineIndex === 0 ? 0 : lineHeight}>{line}</tspan>
          ))}
        </text>
      );
    };

    const SketchRenderer = {
      cardPath: (x: number, y: number, w: number, h: number, seed: string, shape: PlannedSection["shape"]) => {
        if (shape === "torn") {
          return `M ${x + 24} ${y + 8} C ${x + 118} ${y - 6 + jitter(seed, 5, 1)}, ${x + w - 118} ${y + 14}, ${x + w - 20} ${y + 4} L ${x + w - 8} ${y + h - 24} C ${x + w - 98} ${y + h + 6}, ${x + 112} ${y + h - 4}, ${x + 22} ${y + h + 2} L ${x + 6} ${y + 38} Q ${x + 12} ${y + 16}, ${x + 24} ${y + 8} Z`;
        }
        if (shape === "ticket") {
          return `M ${x + 28} ${y + 4} H ${x + w - 28} Q ${x + w - 4} ${y + 4}, ${x + w - 4} ${y + 30} Q ${x + w - 30} ${y + 43}, ${x + w - 4} ${y + 56} V ${y + h - 28} Q ${x + w - 8} ${y + h + 4}, ${x + w - 38} ${y + h - 2} H ${x + 34} Q ${x + 8} ${y + h + 4}, ${x + 4} ${y + h - 28} V ${y + 56} Q ${x + 30} ${y + 43}, ${x + 4} ${y + 30} Q ${x + 4} ${y + 4}, ${x + 28} ${y + 4} Z`;
        }
        if (shape === "formula") {
          return `M ${x + 18} ${y + 12} Q ${x + w * 0.5} ${y - 12}, ${x + w - 18} ${y + 16} L ${x + w - 8} ${y + h - 18} Q ${x + w * 0.5} ${y + h + 10}, ${x + 18} ${y + h - 8} L ${x + 8} ${y + 18} Z`;
        }
        if (shape === "bubble") {
          return `M ${x + 28} ${y + 14} C ${x + w * 0.28} ${y - 12 + jitter(seed, 4, 1)}, ${x + w * 0.72} ${y + 2}, ${x + w - 28} ${y + 16} Q ${x + w + 16} ${y + h * 0.45}, ${x + w - 24} ${y + h - 12} C ${x + w * 0.7} ${y + h + 12}, ${x + w * 0.34} ${y + h + 2}, ${x + 28} ${y + h - 10} Q ${x - 14} ${y + h * 0.5}, ${x + 28} ${y + 14} Z`;
        }
        if (shape === "tag") {
          return `M ${x + 18} ${y + 6} L ${x + w - 22} ${y + 12} Q ${x + w + 8} ${y + h * 0.5}, ${x + w - 18} ${y + h - 10} L ${x + 20} ${y + h - 4} Q ${x - 12} ${y + h * 0.52}, ${x + 18} ${y + 6} Z`;
        }
        return `M ${x + 18} ${y + 8} C ${x + w * 0.34} ${y - 8 + jitter(seed, 4, 1)}, ${x + w * 0.68} ${y + 4}, ${x + w - 14} ${y + 12} Q ${x + w + 10} ${y + h * 0.45}, ${x + w - 10} ${y + h - 16} C ${x + w * 0.66} ${y + h + 8}, ${x + w * 0.3} ${y + h - 2}, ${x + 16} ${y + h - 10} Q ${x - 10} ${y + h * 0.46}, ${x + 18} ${y + 8} Z`;
      },
      cloudPath: () => "M 604 362 C 574 294, 656 252, 718 286 C 758 215, 856 226, 890 284 C 962 252, 1044 308, 1008 382 C 1082 418, 1050 512, 976 520 C 992 592, 892 636, 830 582 C 780 644, 682 608, 692 536 C 612 552, 552 482, 580 420 C 558 394, 574 368, 604 362 Z",
      connector: (section: PlannedSection) => `M ${section.connector.sx} ${section.connector.sy} C ${section.connector.cx} ${section.connector.cy}, ${section.connector.cx} ${section.connector.cy}, ${section.connector.ex} ${section.connector.ey}`,
    };
    const renderIcon = (icon: string, x: number, y: number, scale = 1) => {
      const common = { fill: "none", stroke: "#17202e", strokeWidth: 4 * scale, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
      const sx = (n: number) => x + n * scale;
      const sy = (n: number) => y + n * scale;
      if (icon === "bulb") return <g><path {...common} d={`M ${sx(17)} ${sy(31)} C ${sx(8)} ${sy(12)}, ${sx(25)} ${sy(0)}, ${sx(40)} ${sy(13)} C ${sx(51)} ${sy(25)}, ${sx(38)} ${sy(36)}, ${sx(38)} ${sy(43)} L ${sx(18)} ${sy(43)} C ${sx(18)} ${sy(37)}, ${sx(19)} ${sy(34)}, ${sx(17)} ${sy(31)}`} /><path {...common} d={`M ${sx(20)} ${sy(51)} L ${sx(36)} ${sy(51)} M ${sx(23)} ${sy(59)} L ${sx(33)} ${sy(59)}`} /></g>;
      if (icon === "gear") return <g><circle {...common} cx={sx(28)} cy={sy(31)} r={15 * scale} /><path {...common} d={`M ${sx(28)} ${sy(7)} V ${sy(0)} M ${sx(28)} ${sy(62)} V ${sy(54)} M ${sx(5)} ${sy(31)} H ${sx(0)} M ${sx(57)} ${sy(31)} H ${sx(51)}`} /></g>;
      if (icon === "formula") return <text x={sx(4)} y={sy(43)} className="revisionIconText">fx</text>;
      if (icon === "target") return <g><circle {...common} cx={sx(29)} cy={sy(31)} r={24 * scale} /><circle {...common} cx={sx(29)} cy={sy(31)} r={11 * scale} /><path {...common} d={`M ${sx(29)} ${sy(31)} L ${sx(60)} ${sy(0)}`} /></g>;
      if (icon === "chart") return <g><path {...common} d={`M ${sx(6)} ${sy(55)} H ${sx(56)} M ${sx(15)} ${sy(49)} V ${sy(35)} M ${sx(30)} ${sy(49)} V ${sy(19)} M ${sx(45)} ${sy(49)} V ${sy(10)}`} /></g>;
      if (icon === "code") return <g><path {...common} d={`M ${sx(21)} ${sy(17)} L ${sx(8)} ${sy(31)} L ${sx(21)} ${sy(45)} M ${sx(39)} ${sy(17)} L ${sx(52)} ${sy(31)} L ${sx(39)} ${sy(45)}`} /></g>;
      if (icon === "dice") return <g><rect {...common} x={sx(8)} y={sy(10)} width={42 * scale} height={42 * scale} rx={7 * scale} /><circle cx={sx(21)} cy={sy(23)} r={3 * scale} fill="#17202e" /><circle cx={sx(37)} cy={sy(23)} r={3 * scale} fill="#17202e" /><circle cx={sx(29)} cy={sy(39)} r={3 * scale} fill="#17202e" /></g>;
      if (icon === "arrow") return <g><path {...common} d={`M ${sx(4)} ${sy(46)} C ${sx(22)} ${sy(8)}, ${sx(42)} ${sy(8)}, ${sx(56)} ${sy(18)} M ${sx(56)} ${sy(18)} L ${sx(45)} ${sy(20)} M ${sx(56)} ${sy(18)} L ${sx(50)} ${sy(30)}`} /></g>;
      return <g><path {...common} d={`M ${sx(7)} ${sy(14)} Q ${sx(30)} ${sy(0)}, ${sx(55)} ${sy(14)} V ${sy(38)} Q ${sx(55)} ${sy(51)}, ${sx(37)} ${sy(51)} L ${sx(21)} ${sy(61)} L ${sx(24)} ${sy(51)} Q ${sx(7)} ${sy(51)}, ${sx(7)} ${sy(38)} Z`} /></g>;
    };

    const renderSection = (section: PlannedSection) => {
      const titleBottom = section.y + 60 + (section.titleLines.length - 1) * 25;
      const bodyStart = titleBottom + 34;
      let cursorY = bodyStart;
      return (
        <g key={section.id}>
          <path className="revisionConnector" d={SketchRenderer.connector(section)} />
          <g transform={`rotate(${section.rotate} ${section.x + section.w / 2} ${section.y + section.h / 2})`}>
            <path className="revisionNoteFill" d={SketchRenderer.cardPath(section.x, section.y, section.w, section.h, section.id, section.shape)} />
            {renderIcon(section.icon, section.x + 16, section.y - 48, 0.72)}
            <text x={section.x + 72} y={section.y - 18} className="revisionCue">{section.cue}</text>
            {renderTextLines(section.titleLines, section.x + 30, section.y + 38, 25, "revisionSectionTitle")}
            <path className="revisionUnderline" d={`M ${section.x + 30} ${titleBottom} C ${section.x + 132} ${titleBottom - 5}, ${section.x + 254} ${titleBottom + 4}, ${section.x + section.w - 30} ${titleBottom - 1}`} />
            {section.bulletLines.map((lines, bulletIndex) => {
              const y = cursorY;
              cursorY += lines.length * 22 + 3;
              return (
                <g key={`${section.id}-bullet-${bulletIndex}`}>
                  <circle cx={section.x + 42} cy={y - 6} r="4" fill="#17202e" />
                  {renderTextLines(lines, section.x + 58, y, 21, "revisionBullet")}
                </g>
              );
            })}
            {[...section.formulaLines, ...section.exampleLines].slice(0, 2).map((lines, index) => {
              const y = Math.min(section.y + section.h - 34, Math.max(cursorY + 12 + index * 34, section.y + section.h - 74 + index * 34));
              return (
                <g key={`${section.id}-chip-${index}`}>
                  <path className="revisionMiniCard" d={SketchRenderer.cardPath(section.x + 38, y - 21, section.w - 76, 28, `${section.id}-chip-${index}`, "tag")} />
                  {renderTextLines(lines, section.x + section.w / 2, y, 17, "revisionMiniText", "middle")}
                </g>
              );
            })}
          </g>
        </g>
      );
    };

    return (
      <div className={`${styles.mindmapInfographicShell} ${isExpanded ? styles.mindmapInfographicExpanded : ""}`}>
        <div className={styles.mindmapExportBar}>
          <span>Vector revision sheet</span>
          <div>
            <button onClick={exportMindmapAsPng}><Download size={15} /> PNG</button>
            <button onClick={exportMindmapAsPdf}><Download size={15} /> PDF</button>
            <button onClick={exportMindmapAsSvg}><Download size={15} /> SVG</button>
          </div>
        </div>
        <svg ref={mindmapSvgRef} className={styles.mindmapInfographic} viewBox="0 0 1600 1000" role="img" aria-label={`${sheet.title} mind map`}>
          <style>{`
            .revisionPaper{fill:#fffdf7}
            .revisionGrid{stroke:#17202e;stroke-width:1;opacity:.04}
            .revisionInk{fill:none;stroke:#17202e;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}
            .revisionCloud{fill:#fffdf7;stroke:#17202e;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}
            .revisionConnector{fill:none;stroke:#17202e;stroke-width:3.8;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:10 12;opacity:.68}
            .revisionNoteFill{fill:rgba(255,255,255,.76);stroke:#17202e;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}
            .revisionTitle{font:900 48px "Comic Sans MS", "Trebuchet MS", Arial, sans-serif;fill:#17202e;letter-spacing:.8px}
            .revisionSubtitle{font:700 20px "Trebuchet MS", Arial, sans-serif;fill:#334155}
            .revisionCue{font:900 18px "Comic Sans MS", "Trebuchet MS", Arial, sans-serif;fill:#17202e}
            .revisionSectionTitle{font:900 26px "Trebuchet MS", Arial, sans-serif;fill:#17202e;letter-spacing:.2px}
            .revisionBullet{font:700 18px "Trebuchet MS", Arial, sans-serif;fill:#17202e}
            .revisionMiniText{font:800 15px "Trebuchet MS", Arial, sans-serif;fill:#17202e}
            .revisionSmall{font:800 17px "Trebuchet MS", Arial, sans-serif;fill:#17202e}
            .revisionTiny{font:800 14px "Trebuchet MS", Arial, sans-serif;fill:#17202e}
            .revisionIconText{font:900 34px "Comic Sans MS", "Trebuchet MS", Arial, sans-serif;fill:#17202e}
            .revisionUnderline{fill:none;stroke:#17202e;stroke-width:3.5;stroke-linecap:round}
            .revisionMiniCard{fill:#fffdf7;stroke:#17202e;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
            .revisionBottomRule{fill:#fffdf7;stroke:#17202e;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
            .revisionDoodle{fill:none;stroke:#17202e;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;opacity:.7}
            .revisionDoodleDot{fill:#17202e;opacity:.55}
          `}</style>
          <rect className="revisionPaper" width="1600" height="1000" />
          {Array.from({ length: 17 }).map((_, index) => <line key={`v-${index}`} className="revisionGrid" x1={index * 100} y1="0" x2={index * 100} y2="1000" />)}
          {Array.from({ length: 11 }).map((_, index) => <line key={`h-${index}`} className="revisionGrid" x1="0" y1={index * 100} x2="1600" y2={index * 100} />)}

          <g aria-hidden="true">
            <path className="revisionDoodle" d="M 92 236 C 124 218, 152 222, 174 246 M 116 264 C 136 278, 166 276, 190 258" />
            <path className="revisionDoodle" d="M 1420 760 C 1460 732, 1492 748, 1504 780 M 1418 794 L 1504 796" />
            <path className="revisionDoodle" d="M 760 118 L 780 88 L 798 118 L 768 106 L 792 106 Z" />
            <circle className="revisionDoodleDot" cx="1380" cy="246" r="5" />
            <circle className="revisionDoodleDot" cx="214" cy="794" r="4" />
            <circle className="revisionDoodleDot" cx="1310" cy="656" r="3.5" />
          </g>

          {plannedSections.map(renderSection)}

          <g>
            <path className="revisionCloud" d={SketchRenderer.cloudPath()} />
            <path className="revisionInk" opacity=".28" d="M 982 526 C 1038 546, 1025 605, 952 612" />
            {renderTextLines(centralLines, 800, centralLines.length > 1 ? 416 : 448, Math.round(centralFontSize * 0.92), "revisionTitle", "middle", { fontSize: centralFontSize })}
            <path className="revisionUnderline" d="M 648 520 C 728 508, 872 526, 952 514" />
            {centralBullets.slice(0, 3).map((item, index) => (
              <g key={`center-${item}-${index}`}>
                <circle cx="676" cy={558 + index * 28} r="4" fill="#17202e" />
                {renderTextLines(wrapLines(item, 34, 1), 694, 565 + index * 28, 18, "revisionSubtitle")}
              </g>
            ))}
          </g>

          {supportItems.length > 0 && (
            <g>
              <text x="800" y="844" textAnchor="middle" className="revisionCue">QUICK RECALL</text>
              <path className="revisionInk" d="M 500 860 C 640 845, 960 845, 1100 860" />
              {supportItems.map((item, index) => {
                const x = 372 + index * 286;
                return (
                  <g key={`${item.label}-${index}`}>
                    <path className="revisionMiniCard" d={SketchRenderer.cardPath(x, 882, 248, 70, item.label, "tag")} />
                    {renderTextLines(wrapLines(item.label, 20, 1), x + 124, 908, 18, "revisionSmall", "middle")}
                    {item.detail && renderTextLines(wrapLines(item.detail, 25, 1), x + 124, 934, 17, "revisionTiny", "middle")}
                  </g>
                );
              })}
            </g>
          )}

          {sheet.takeaways.length > 0 && (
            <g>
              <path className="revisionBottomRule" d="M 200 956 C 480 974, 1120 974, 1400 956" />
              {renderTextLines(wrapLines(sheet.takeaways[0], 86, 1), 800, 985, 18, "revisionSmall", "middle")}
            </g>
          )}
        </svg>
      </div>
    );
  };
  const renderArtifactBody = (artifact: WorkspaceArtifact, isExpanded = false) => {
    if (artifact === "cheatsheet") {
      return cheatsheet.length > 0 ? (
        <div className={styles.inlineCheatsheet}>
          {cheatsheet.map((item, idx) => (
            <div key={idx} className={styles.cheatsheetItem}>
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{item}</ReactMarkdown>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyArtifactState}>
          <FileSignature size={32} />
          <p>Create a tight exam-ready cheat sheet from this note.</p>
          <button className={styles.artifactPrimaryBtn} onClick={handleGenerateCheatsheet} disabled={isGeneratingCheatsheet}>
            {isGeneratingCheatsheet ? <Loader2 className={styles.loader} size={16} /> : <Sparkles size={16} />}
            Generate cheat sheet
          </button>
        </div>
      );
    }

    if (artifact === "mindmap") {
      return renderConstellationMindmap(isExpanded);
    }

    if (artifact === "flashcards") {
      return renderFlashcardWorkspace(isExpanded);
    }

    if (artifact === "audio") {
      return (
        <div className={styles.audioArtifact}>
          <label className={styles.artifactLabel}>Language</label>
          <select className={styles.artifactSelect} value={podcastLanguage} onChange={(e) => setPodcastLanguage(e.target.value)}>
            <option value="hindi">Hindi</option>
            <option value="english">English</option>
          </select>
          <div className={styles.audioModeGrid}>
            <button className={`${styles.audioModeCard} ${aiPodcastUrl ? styles.artifactReady : styles.artifactPending}`} onClick={() => aiPodcastUrl ? openBeautifulPlayer(aiPodcastUrl, "Deep Dive Podcast") : handleGeneratePodcast("podcast")} disabled={isGeneratingPodcast}>
              {isGeneratingPodcast && podcastScenario === 'podcast' ? <Loader2 className={styles.loader} size={18} /> : <Volume2 size={18} />}
              <span>Podcast</span>
              <small>{aiPodcastUrl ? "Play" : "Generate"}</small>
            </button>
            <button className={`${styles.audioModeCard} ${aiDebateUrl ? styles.artifactReady : styles.artifactPending}`} onClick={() => aiDebateUrl ? openBeautifulPlayer(aiDebateUrl, "AI Debate") : handleGeneratePodcast("debate")} disabled={isGeneratingPodcast}>
              {isGeneratingPodcast && podcastScenario === 'debate' ? <Loader2 className={styles.loader} size={18} /> : <Sparkles size={18} />}
              <span>Debate</span>
              <small>{aiDebateUrl ? "Play" : "Generate"}</small>
            </button>
          </div>
        </div>
      );
    }

    if (artifact === "chat") {
      return (
        <div className={styles.inlineChat}>
          <div className={styles.chatMessages}>
            {chatMessages.length === 0 ? (
              <div className={styles.emptyArtifactState}>
                <MessageCircle size={32} />
                <p>Ask anything about this lecture. Answers stay grounded in your note.</p>
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className={`${styles.chatMessage} ${styles[msg.role]}`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ))
            )}
            {isChatLoading && (
              <div className={`${styles.chatMessage} ${styles.assistant}`}>
                <Loader2 className={styles.loader} size={16} /> Thinking...
              </div>
            )}
          </div>
          <div className={styles.chatInputContainer}>
            <input
              type="text"
              className={styles.chatInput}
              placeholder="Ask this note..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendChat()}
            />
            <button className={styles.chatSubmitBtn} onClick={handleSendChat} disabled={isChatLoading || !chatInput.trim()}>
              <Send size={18} />
            </button>
          </div>
        </div>
      );
    }

    return videoSrc ? (
      <div className={styles.sourceVideoPanel}>
        {isSourcePinned && !isExpanded ? (
          <div className={styles.sourcePinnedNotice}>
            <Play size={18} />
            <span>Source video is pinned while you revise.</span>
            <button onClick={() => setIsSourcePinned(false)}>Show here</button>
          </div>
        ) : (
          <ReactPlayer
            ref={playerRef}
            src={videoSrc}
            width="100%"
            height={isExpanded ? "62vh" : "220px"}
            controls={true}
            playing={isPlaying}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => {
              // ReactPlayer can emit non-fatal provider errors for blocked embeds.
            }}
          />
        )}
      </div>
    ) : (
      <div className={styles.emptyArtifactState}>
        <Play size={32} />
        <p>No source video is attached to this note.</p>
      </div>
    );
  };

  const artifactTitle: Record<WorkspaceArtifact, string> = {
    cheatsheet: "Cheat Sheet",
    mindmap: "Mind Map",
    flashcards: "Flashcards",
    audio: "AI Audio",
    chat: "Ask This Note",
    source: "Source Video"
  };

  const artifactCards = [
    {
      id: "cheatsheet" as const,
      title: "Cheat Sheet",
      desc: "Condensed exam revision",
      icon: <FileSignature size={20} />,
      ready: cheatsheet.length > 0,
      loading: isGeneratingCheatsheet,
      action: () => cheatsheet.length > 0 ? openArtifact("cheatsheet") : handleGenerateCheatsheet(),
    },
    {
      id: "mindmap" as const,
      title: "Mind Map",
      desc: "3D concept connections",
      icon: <Sparkles size={20} />,
      ready: !!mindmap,
      loading: isGeneratingMindmap,
      action: () => mindmap ? openArtifact("mindmap") : handleGenerateMindmap(),
    },
    {
      id: "flashcards" as const,
      title: "Flashcards",
      desc: "Active recall cards",
      icon: <BrainCircuit size={20} />,
      ready: !!flashcards && flashcards.length > 0,
      loading: isGeneratingFlashcards,
      action: () => flashcards && flashcards.length > 0 ? openArtifact("flashcards") : handleExportFlashcards(),
    },
    {
      id: "audio" as const,
      title: "AI Audio",
      desc: "Podcast and debate mode",
      icon: <Volume2 size={20} />,
      ready: !!aiPodcastUrl || !!aiDebateUrl,
      loading: isGeneratingPodcast,
      action: () => openArtifact("audio"),
    },
  ];

  const renderArtifactConsole = () => {
    if (!isArtifactConsoleOpen) {
      return (
        <button className={`${styles.consoleReopenBtn} no-print`} onClick={() => setIsArtifactConsoleOpen(true)}>
          <Layers size={18} /> Artifacts
        </button>
      );
    }

    return (
      <aside className={`${styles.artifactConsole} no-print`}>
        <div className={styles.consoleHeader}>
          <div>
            <span>Workspace console</span>
            <h3>{activeArtifact ? artifactTitle[activeArtifact] : "Artifacts"}</h3>
          </div>
          <button className={styles.consoleActionBtn} onClick={() => setIsArtifactConsoleOpen(false)} aria-label="Hide workspace console">
            <PanelRightClose size={16} />
            <span>Hide</span>
          </button>
        </div>

        {activeArtifact ? (
          <div className={styles.artifactViewer}>
            <div className={styles.artifactViewerControls}>
              <button className={`${styles.consoleActionBtn} ${styles.consoleActionBtnPrimary}`} onClick={() => setActiveArtifact(null)} aria-label="Back to artifact console">
                <ChevronLeft size={18} />
                <span>Back</span>
              </button>
              <button className={`${styles.consoleActionBtn} ${styles.consoleActionBtnAccent}`} onClick={() => setFullscreenArtifact(activeArtifact)} aria-label="Open artifact in full view">
                <Maximize2 size={16} />
                <span>Full view</span>
              </button>
            </div>
            {renderArtifactBody(activeArtifact)}
          </div>
        ) : (
          <>
            <div className={styles.artifactGrid}>
              {artifactCards.map(card => (
                <button
                  key={card.id}
                  className={`${styles.artifactCard} ${card.ready ? styles.artifactReady : styles.artifactPending}`}
                  onClick={card.action}
                  disabled={card.loading}
                >
                  <span className={styles.artifactIcon}>{card.loading ? <Loader2 className={styles.loader} size={20} /> : card.icon}</span>
                  <span>
                    <strong>{card.title}</strong>
                    <small>{card.desc}</small>
                  </span>
                  <em>{card.loading ? "Working" : card.ready ? "View" : "Generate"}</em>
                </button>
              ))}
            </div>

            <div className={styles.noteFormatPanel}>
              <span>Note format</span>
              <button className={`${styles.formatToggle} ${isHandwritten ? styles.formatToggleActive : ""}`} onClick={() => setIsHandwritten(!isHandwritten)}>
                <PenTool size={16} /> Handwritten
              </button>
              <button className={`${styles.formatToggle} ${hideScreenshots ? styles.formatToggleActive : ""}`} onClick={() => setHideScreenshots(!hideScreenshots)}>
                <ImageOff size={16} /> {hideScreenshots ? "Images hidden" : "Images visible"}
              </button>
              <button className={styles.formatToggle} onClick={() => setNoteTheme(noteTheme === 'dark' ? 'light' : 'dark')}>
                {noteTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} {noteTheme === 'dark' ? "Dark notes" : "Light notes"}
              </button>
              <button className={styles.formatToggle} onClick={confirmExport}>
                <Download size={16} /> Export PDF
              </button>
            </div>

            <div className={styles.consoleUtilityGrid}>
              <button className={styles.utilityCard} onClick={() => openArtifact("chat")}>
                <MessageCircle size={18} />
                <span>Ask this note</span>
              </button>
              <button className={styles.utilityCard} onClick={() => openArtifact("source")} disabled={!videoSrc}>
                <Play size={18} />
                <span>Source video</span>
              </button>
            </div>
            {saveMessage && <div className={styles.consoleSaveMessage}>{saveMessage}</div>}
          </>
        )}
      </aside>
    );
  };

  return (
    <div className={styles.appLayout}>
      {/* Visual Sidebar */}
      <aside className={styles.sidebar}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div>
            <div className={styles.logo}>
              <Layers size={24} /> Note Jam
            </div>
            <nav className={styles.nav}>
              <div className={`${styles.navItem} ${currentView === 'home' ? styles.navItemActive : ''}`} onClick={() => resetWorkspace()}>
                <Home size={18} /> Generate Artifact
              </div>
              <div className={`${styles.navItem} ${currentView === 'notebooks' ? styles.navItemActive : ''}`} onClick={() => {
                setIsPlaying(false);
                if (currentView === 'notebooks' && markdown) {
                  closeCurrentNoteToLibrary();
                } else if (currentView === 'home') {
                  setMarkdown(null);
                  setCurrentNoteId(null);
                  setCurrentView('notebooks');
                } else {
                  setCurrentView('notebooks');
                }
              }}>
                <BookOpen size={18} /> Learning Artifacts
              </div>
            </nav>
          </div>
          
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', color: 'var(--fg)', fontSize: '0.9rem', fontWeight: 600 }}>
              {!isSignedIn ? (
                <>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={16} />
                  </div>
                  Guest Mode
                  <button onClick={() => clerk.openSignIn()} style={{ marginLeft: 'auto', background: '#ffffff', color: '#000000', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>Sign In</button>
                </>
              ) : (
                <div style={{ pointerEvents: 'auto', width: '100%', display: 'flex', alignItems: 'center' }}>
                  {/* The UserButton is fully interactive and handles Profile, Appearance, Settings */}
                  <UserButton showName={true} appearance={{ elements: { userButtonAvatarBox: { width: '32px', height: '32px' }, userButtonOuterIdentifier: { color: 'var(--fg)', fontWeight: 600 } } }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Document Canvas */}
      <main className={styles.mainCanvas}>
        <LiveBackground />
        
        <div className={styles.workspaceWrapper}>
          {(currentView === 'home' || (currentView === 'notebooks' && markdown)) ? (
            <>
              <div className={`${styles.noteEditor} ${markdown ? styles.noteWorkspaceEditor : ''}`}>
                {isLoading && !markdown ? (
                  <GenerationLoadingStage />
                ) : (
                  <>
                    {!markdown && (
                      <>
                        {/* Advanced Animated Note Header */}
                        <AnimatedTitle text={noteTitle || "Untitled Document"} isAppMode={true} />
              
                        <p className={styles.noteSubtitle} style={{ textAlign: "center" }}>
                          To extract knowledge into this document, paste a lecture link or upload a video below.
                        </p>
                      </>
                    )}

                    {/* Form Widget Block */}
                    {!markdown && (
                      <div className={styles.widgetBlock}>
                        <div className={styles.widgetHeader}>
                          <Sparkles size={16} /> Data Source
                        </div>
              
                        <div className={styles.inputGroup}>
                          <div className={styles.inputWrapper}>
                            <LinkIcon className={styles.inputIcon} size={18} />
                            <input 
                              type="text" 
                              className={styles.input} 
                              placeholder="https://youtube.com/watch?v=..."
                              value={url}
                              onChange={(e) => {
                                setUrl(e.target.value);
                                setFile(null);
                              }}
                              disabled={isLoading}
                            />
                          </div>
                        </div>

                        <div className={styles.divider}>OR</div>

                        <div 
                          className={styles.dropzone}
                          onClick={() => document.getElementById("file-upload")?.click()}
                        >
                          <Upload className={styles.dropzoneIcon} size={24} style={{ margin: '0 auto 0.5rem auto' }} />
                          <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                            {file ? file.name : "Click to browse or drag & drop"}
                          </p>
                          <input 
                            id="file-upload" 
                            type="file" 
                            accept="video/*" 
                            style={{ display: "none" }}
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                setFile(e.target.files[0]);
                                setUrl("");
                              }
                            }}
                            disabled={isLoading}
                          />
                        </div>
              
                        <div className={styles.inputGroup} style={{ marginTop: '1rem' }}>
                          <div className={styles.inputWrapper}>
                            <select 
                              className={styles.input} 
                              value={language}
                              onChange={(e) => setLanguage(e.target.value)}
                              disabled={isLoading}
                            >
                              <option value="English">English</option>
                              <option value="Spanish">Spanish</option>
                              <option value="French">French</option>
                              <option value="Hindi">Hindi</option>
                              <option value="Mandarin">Mandarin</option>
                            </select>
                          </div>
                        </div>

                        {processingMessage && !error && (
                          <p style={{ color: '#dffcf7', fontSize: '0.85rem', marginTop: '1.5rem', fontWeight: 700, textAlign: 'center' }}>
                            {processingMessage}
                          </p>
                        )}
                        {error && <p style={{ color: '#ffffff', fontSize: '0.85rem', marginTop: '1.5rem', fontWeight: 500, textAlign: 'center' }}>{error}</p>}

                        <button 
                          className={styles.button} 
                          onClick={handleProcess}
                          disabled={isLoading}
                        >
                          Synthesize Notes
                        </button>
                      </div>
                    )}
                  </>
                )}

          {/* Markdown Results Document */}
          {markdown && (
            <div className={styles.studyWorkspace}>
              <div className={styles.notesStage}>
                {currentView === 'home' && (
                  <div className={`${styles.workspaceTopActions} no-print`}>
                    <button className={styles.workspaceActionBtn} onClick={saveCurrentNote} disabled={isSaving}>
                      <Save size={16} /> {isSaving ? "Saving..." : currentNoteId ? "Save changes" : "Save note"}
                    </button>
                    <button className={styles.workspaceActionBtn} onClick={resetWorkspace}>
                      <RotateCcw size={16} /> Start over
                    </button>
                    {saveMessage && <span>{saveMessage}</span>}
                  </div>
                )}
                <div className={`${styles.markdown} ${noteTheme === 'light' ? styles.markdownLight : ''} ${isHandwritten ? styles.handwritten : ''} ${hideScreenshots ? styles.hideImages : ''}`} onMouseUp={handleMouseUp}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({ inline, className, children, ...props }: ReactMarkdownCodeProps) {
                        const match = /language-(\w+)/.exec(className || '')
                        if (!inline && match && match[1] === 'mermaid') {
                          return <Mermaid chart={String(children).replace(/\n$/, '')} noteTheme={noteTheme} isHandwritten={isHandwritten} />
                        }
                        return <code className={className} {...props}>{children}</code>
                      },
                      a({ href, children, ...props }: ReactMarkdownAnchorProps) {
                        if (href?.startsWith('#') && /\d{1,2}:\d{2}/.test(href)) {
                          const time = href.replace('#', '');
                          return (
                            <button 
                              className={styles.timestampBtn}
                              onClick={(e) => {
                                e.preventDefault();
                                const parts = time.split(':').map(Number);
                                let seconds = 0;
                                if (parts.length === 3) {
                                  seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                                } else {
                                  seconds = parts[0] * 60 + parts[1];
                                }
                                setIsSourcePinned(true);
                                setIsPlaying(true);
                                setPendingSeekSeconds(seconds);
                              }}
                            >
                              <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> 
                              {time}
                            </button>
                          );
                        }
                        return <a href={href} {...props}>{children}</a>;
                      }
                    }}
                  >
                    {markdown}
                  </ReactMarkdown>
                </div>
              </div>
              {renderArtifactConsole()}
            </div>
          )}
          </div>
          </>
          ) : (
              <div className={styles.notebooksContainer}>
                <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={24} color="var(--primary)" /> Learning Artifacts
              </h2>
              {savedNotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted)' }}>
                  <Layers size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                  <p>No saved notes yet. Start learning to build your library!</p>
                </div>
              ) : (
                <div className={styles.notesGrid}>
                  {savedNotes.map((note) => (
                    <div key={note.id} className={styles.noteCard} onClick={() => loadNote(note.id)}>
                      <div className={styles.noteCardHeader}>
                        <h3>{note.title}</h3>
                        <button 
                          className={styles.deleteBtn}
                          onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className={styles.noteDate}>{new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {markdown && videoSrc && isSourcePinned && !fullscreenArtifact && (
        <div className={`${styles.floatingPlayer} no-print`}>
          <button
            className={styles.floatingPlayerClose}
            onClick={() => {
              setIsSourcePinned(false);
              setIsPlaying(false);
              setPendingSeekSeconds(null);
            }}
            aria-label="Close source video"
          >
            <X size={16} />
          </button>
          <ReactPlayer
            ref={playerRef}
            src={videoSrc}
            width="100%"
            height="100%"
            controls={true}
            playing={isPlaying}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => {
              // ReactPlayer can emit non-fatal provider errors for blocked embeds.
            }}
          />
        </div>
      )}

      {/* --- BEAUTIFUL AUDIO PLAYER --- */}
      {activeAudioUrl && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(0, 0, 0, 0.96)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255, 255, 255, 0.16)', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 9999, color: 'white', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)' }}>
          <audio 
            ref={audioRef}
            src={activeAudioUrl} 
            autoPlay 
            onTimeUpdate={handleAudioTimeUpdate}
            onPlay={() => setIsAudioPlaying(true)}
            onPause={() => setIsAudioPlaying(false)}
            onEnded={() => setIsAudioPlaying(false)}
            style={{ display: 'none' }}
          />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ffffff', color: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(255,255,255,0.12)' }}>
                <Volume2 size={24} color="#000000" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {activeAudioTitle}
                  {isAudioPlaying && <Sparkles size={14} color="#ffffff" />}
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#a8a8a8' }}>AI Synthesized Audio</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <button onClick={() => skipAudio(-10)} style={{ background: 'transparent', border: 'none', color: '#d8d8d8', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                <Rewind size={24} />
                <span style={{ fontSize: '0.6rem' }}>10s</span>
              </button>
              
              <button onClick={toggleAudioPlay} style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'white', color: '#000000', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(255,255,255,0.2)', transition: 'transform 0.1s' }} onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'} onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                {isAudioPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" style={{ marginLeft: '4px' }} />}
              </button>
              
              <button onClick={() => skipAudio(10)} style={{ background: 'transparent', border: 'none', color: '#d8d8d8', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                <FastForward size={24} />
                <span style={{ fontSize: '0.6rem' }}>10s</span>
              </button>
            </div>

            <button onClick={closeBeautifulPlayer} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#d8d8d8', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#a8a8a8', fontVariantNumeric: 'tabular-nums' }}>
              {Math.floor(audioCurrentTime / 60)}:{(Math.floor(audioCurrentTime) % 60).toString().padStart(2, '0')}
            </span>
            <div 
              style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', cursor: 'pointer', position: 'relative' }}
              onClick={(e) => {
                if (audioRef.current && audioRef.current.duration !== Infinity) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const ratio = x / rect.width;
                  audioRef.current.currentTime = ratio * audioRef.current.duration;
                }
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${audioProgress * 100}%`, background: '#ffffff', borderRadius: '2px', transition: 'width 0.1s linear' }} />
              {/* Continuous animated glowing bar if duration is Infinity (streaming) */}
              {isStreamingAudio && isAudioPlaying && (
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.42), transparent)', borderRadius: '2px', animation: 'scanline 2s linear infinite' }} />
              )}
            </div>
          </div>
        </div>
      )}


      {/* --- FLASHCARDS OVERLAY --- */}
      {isFlashcardModalOpen && flashcards && flashcards.length > 0 && (
        <div className={styles.flashcardOverlay} onClick={() => setIsFlashcardModalOpen(false)}>
          <div 
            className={styles.flashcardModal} 
            onClick={(e) => e.stopPropagation()}
            style={isFlashcardMaximized ? { width: '95vw', height: '95vh', maxWidth: 'none', display: 'flex', flexDirection: 'column' } : {}}
          >
            <button className={styles.closeModalBtn} onClick={() => setIsFlashcardModalOpen(false)}>
              <X size={24} />
            </button>
            <button 
              className={styles.closeModalBtn} 
              onClick={() => setIsFlashcardMaximized(!isFlashcardMaximized)}
              style={{ right: '3.5rem' }}
            >
              {isFlashcardMaximized ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <h2 className={styles.flashcardTitle}>Interactive Flashcards</h2>
            <div className={styles.flashcardCounter}>
              Card {flashcardIndex + 1} of {flashcards.length}
            </div>

            <div 
              className={`${styles.flashcardContainer} ${isFlipped ? styles.flipped : ""}`}
              style={isFlashcardMaximized ? { flex: 1, minHeight: 0 } : {}}
              onClick={() => {
                if (!isFlipped) {
                  setIsFlipped(true);
                } else if (!showFlashcardExplanation && flashcards[flashcardIndex].explanation) {
                  setShowFlashcardExplanation(true);
                } else {
                  setIsFlipped(false);
                  setShowFlashcardExplanation(false);
                }
              }}
            >
              <div className={styles.flashcardInner}>
                <div className={styles.flashcardFront} style={isFlashcardMaximized ? { display: 'flex', flexDirection: 'column', justifyContent: 'center' } : {}}>
                  <div className={styles.flashcardLabel}>Question</div>
                  <div className={styles.flashcardText} style={isFlashcardMaximized ? { fontSize: '2rem' } : {}}>
                    <FlashcardRichText text={flashcards[flashcardIndex].question} />
                  </div>
                  <div className={styles.flipHint}><RotateCcw size={14} /> Click to flip</div>
                </div>
                <div className={styles.flashcardBack} style={isFlashcardMaximized ? { display: 'flex', flexDirection: 'column', justifyContent: 'center' } : {}}>
                  <div className={styles.flashcardLabel}>Answer</div>
                  <div className={styles.flashcardText} style={isFlashcardMaximized ? { fontSize: '1.5rem' } : {}}>
                    <FlashcardRichText text={flashcards[flashcardIndex].answer} />
                  </div>
                  
                  {isFlipped && flashcards[flashcardIndex].explanation && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.88)', borderRadius: '8px', fontSize: isFlashcardMaximized ? '1.1rem' : '0.95rem', color: '#000000', transition: 'opacity 0.3s', opacity: showFlashcardExplanation ? 1 : 0, pointerEvents: showFlashcardExplanation ? 'auto' : 'none' }}>
                      <strong>Explanation:</strong>
                      <FlashcardRichText text={flashcards[flashcardIndex].explanation || ""} />
                    </div>
                  )}

                  <div className={styles.flipHint}>
                    {!showFlashcardExplanation && flashcards[flashcardIndex].explanation ? <><Sparkles size={14} /> Click for explanation</> : <><RotateCcw size={14} /> Click to flip back</>}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.flashcardControls}>
              <button 
                className={styles.flashcardNavBtn}
                disabled={flashcardIndex === 0}
                onClick={() => {
                  setIsFlipped(false);
                  setShowFlashcardExplanation(false);
                  setTimeout(() => setFlashcardIndex(prev => prev - 1), 150);
                }}
              >
                <ChevronLeft size={20} /> Previous
              </button>
              <button 
                className={styles.flashcardNavBtn}
                disabled={flashcardIndex === flashcards.length - 1}
                onClick={() => {
                  setIsFlipped(false);
                  setShowFlashcardExplanation(false);
                  setTimeout(() => setFlashcardIndex(prev => prev + 1), 150);
                }}
              >
                Next <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ELI5 FLOATING BUTTON --- */}
      {selectionPos && (
        <button 
          className={`${styles.eli5Btn} no-print`} 
          style={{ left: selectionPos.x, top: selectionPos.y }}
          onClick={handleEli5}
        >
          <Sparkles size={14} /> ELI5
        </button>
      )}

      {/* --- ELI5 MODAL --- */}
      {(eli5Explanation || isEli5Loading) && (
        <div className={`${styles.flashcardOverlay} no-print`} onClick={() => { setEli5Explanation(null); setIsEli5Loading(false); }}>
          <div className={styles.flashcardModal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeModalBtn} onClick={() => { setEli5Explanation(null); setIsEli5Loading(false); }}>
              <X size={24} />
            </button>
            <h2 className={styles.flashcardTitle} style={{ color: '#ffffff' }}>
              <Sparkles size={20} style={{ display: 'inline', marginRight: '8px' }} />
              Explain Like I&apos;m 5
            </h2>
            <div className={styles.eli5Content}>
              {isEli5Loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Loader2 className={styles.loader} size={32} style={{ color: '#ffffff' }} />
                  <p style={{ marginTop: '1rem', color: '#a8a8a8' }}>Simplifying concept...</p>
                </div>
              ) : (
                <div className={styles.eli5MarkdownText}>
                  <ReactMarkdown>{eli5Explanation || ""}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {fullscreenArtifact && (
        <div className={`${styles.artifactFullscreenOverlay} no-print`} onClick={() => setFullscreenArtifact(null)}>
          <div className={styles.artifactFullscreenModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.fullscreenArtifactHeader}>
              <div>
                <span>Expanded artifact</span>
                <h2>{artifactTitle[fullscreenArtifact]}</h2>
              </div>
              <button className={styles.consoleActionBtn} onClick={() => setFullscreenArtifact(null)} aria-label="Close full view">
                <X size={16} />
                <span>Close</span>
              </button>
            </div>
            <div className={styles.fullscreenArtifactBody}>
              {renderArtifactBody(fullscreenArtifact, true)}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// --- MAIN PARENT COMPONENT ---
export default function HomeApp() {
  return <NoteApp />;
}
