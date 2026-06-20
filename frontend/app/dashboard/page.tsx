"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import ReactPlayer from "react-player";
import { Upload, Link as LinkIcon, Sparkles, Download, Loader2, Home, Clock, BookOpen, Layers, BrainCircuit, FileSignature, X, ChevronLeft, ChevronRight, RotateCcw, MessageCircle, Send, Save, Trash2, PenTool, ImageOff, Moon, Sun, Maximize2, Minimize2, Volume2, Play, Pause, FastForward, Rewind } from "lucide-react";
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
type MindmapData = { nodes: MindmapNode[]; links: MindmapLink[] };
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

const wrapSvgText = (text: string, maxChars: number) => {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
};

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
    // Dense, minute symbols encompassing all sciences
    const chars = [
      // Math & Operators
      "∫", "∑", "∆", "π", "∞", "√", "∂", "∇", "∝", "∰", "+", "×", "÷", "=", "−", "±", "∓", "≈", "≠", "≡",
      // Physics & Greek
      "ℏ", "α", "β", "γ", "θ", "λ", "μ", "ξ", "ρ", "σ", "τ", "Φ", "Ψ", "Ω", "ω", "ε",
      // Chemistry & Biology
      "⌬", "⚗", "⚛", "🧬", "O₂", "H₂O", "CO₂", "CH₄", "NH₃"
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
      const response = await fetch(`${API_BASE}/cheatsheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      if (!response.ok) throw new Error("Failed to generate cheatsheet");
      const data = await response.json();
      setCheatsheet(data.cheatsheet);
      setActiveArtifact("cheatsheet");
      setIsArtifactConsoleOpen(true);
      await autosaveCurrentNote({ cheatsheet: data.cheatsheet });
    } catch (err) {
      console.error(err);
      alert("Failed to generate cheatsheet.");
    } finally {
      setIsGeneratingCheatsheet(false);
    }
  };

  const handleGenerateMindmap = async () => {
    if (!markdown) return;
    setIsGeneratingMindmap(true);
    try {
      const response = await fetch(`${API_BASE}/mindmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      if (!response.ok) throw new Error("Failed to generate mind map");
      const data = await response.json();
      setMindmap(data.mindmap);
      setActiveArtifact("mindmap");
      setIsArtifactConsoleOpen(true);
      await autosaveCurrentNote({ mindmap: data.mindmap });
    } catch (err) {
      console.error(err);
      alert("Failed to generate mind map.");
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
      const response = await fetch(`${API_BASE}/flashcards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      if (!response.ok) throw new Error("Failed to generate flashcards");
      const data = await response.json();
      setFlashcards(data.flashcards);
      setFlashcardIndex(0);
      setIsFlipped(false);
      setShowFlashcardExplanation(false);
      setActiveArtifact("flashcards");
      setIsArtifactConsoleOpen(true);
      await autosaveCurrentNote({ flashcards: data.flashcards });
    } catch (err) {
      console.error(err);
      alert("Failed to generate flashcards.");
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
      const response = await fetch(`${API_BASE}/podcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, language: podcastLanguage, scenario }),
      });
      if (!response.ok) throw new Error("Failed to generate podcast");
      const data = await response.json();
      
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
      console.error(err);
      alert("Failed to generate podcast.");
    } finally {
      setIsGeneratingPodcast(false);
    }
  };

  const resetWorkspace = () => {
    setIsPlaying(false);
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
              <div className={styles.flashcardText}>{flashcards[flashcardIndex].question}</div>
              <div className={styles.flipHint}><RotateCcw size={14} /> Click to flip</div>
            </div>
            <div className={styles.flashcardBack}>
              <div className={styles.flashcardLabel}>Answer</div>
              <div className={styles.flashcardText}>{flashcards[flashcardIndex].answer}</div>
              {isFlipped && flashcards[flashcardIndex].explanation && (
                <div className={styles.flashcardExplanation} style={{ opacity: showFlashcardExplanation ? 1 : 0 }}>
                  <strong>Explanation:</strong> {flashcards[flashcardIndex].explanation}
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

  const renderMindmapToCanvas = async () => {
    const svg = mindmapSvgRef.current;
    if (!svg) throw new Error("Mind map is not ready yet.");

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "1600");
    clone.setAttribute("height", "1000");
    const svgText = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    return await new Promise<HTMLCanvasElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1600;
        canvas.height = 1000;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Could not prepare export canvas."));
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not render mind map export."));
      };
      image.src = url;
    });
  };

  const exportMindmapAsPng = async () => {
    try {
      const canvas = await renderMindmapToCanvas();
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `${noteTitle || "notejam"}-mind-map.png`);
      }, "image/png");
    } catch (err) {
      console.error(err);
      alert("Could not export mind map image.");
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

    const allNodes = mindmap.nodes;
    const allIds = new Set(allNodes.map((node) => node.id));
    const validLinks = mindmap.links.filter((link) => (
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

    const root = [...allNodes].sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0))[0] || allNodes[0];
    const rootId = root.id;
    const nodesById = new Map(allNodes.map((node) => [node.id, node]));
    const adjacency = new Map<string, string[]>();
    allNodes.forEach((node) => adjacency.set(node.id, []));
    validLinks.forEach((link) => {
      const source = getMindmapNodeId(link.source);
      const target = getMindmapNodeId(link.target);
      adjacency.get(source)?.push(target);
      adjacency.get(target)?.push(source);
    });
    adjacency.forEach((neighbors, nodeId) => {
      adjacency.set(nodeId, [...new Set(neighbors)].sort((a, b) => (degree.get(b) || 0) - (degree.get(a) || 0)));
    });

    const children = new Map<string, string[]>();
    allNodes.forEach((node) => children.set(node.id, []));
    const queue = [rootId];
    const visited = new Set([rootId]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      (adjacency.get(current) || []).forEach((next) => {
        if (visited.has(next)) return;
        visited.add(next);
        children.get(current)?.push(next);
        queue.push(next);
      });
    }
    allNodes
      .filter((node) => !visited.has(node.id) && node.id !== rootId)
      .sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0))
      .forEach((node) => {
        children.get(rootId)?.push(node.id);
      });

    const sectionIds = (children.get(rootId) || []).slice(0, 7);
    const fallbackSections = [...allNodes]
      .filter((node) => node.id !== rootId && !sectionIds.includes(node.id))
      .sort((a, b) => (degree.get(b.id) || 0) - (degree.get(a.id) || 0))
      .slice(0, 7 - sectionIds.length)
      .map((node) => node.id);
    const finalSectionIds = [...sectionIds, ...fallbackSections].slice(0, 6);
    const palette = ["#1557c2", "#16803b", "#f97316", "#0f5cc5", "#7e22ce", "#ef233c"];
    const slots = [
      { x: 600, y: 30, w: 360, h: 230, cx: 780, cy: 260, color: palette[0], icon: "▣" },
      { x: 980, y: 60, w: 560, h: 300, cx: 980, cy: 210, color: palette[1], icon: "◎" },
      { x: 1040, y: 395, w: 500, h: 220, cx: 1040, cy: 505, color: palette[2], icon: "⚖" },
      { x: 965, y: 660, w: 520, h: 150, cx: 965, cy: 735, color: palette[3], icon: "↩" },
      { x: 55, y: 650, w: 620, h: 160, cx: 675, cy: 730, color: palette[4], icon: "⚙" },
      { x: 45, y: 350, w: 520, h: 230, cx: 565, cy: 465, color: palette[5], icon: "✦" },
      { x: 60, y: 70, w: 470, h: 210, cx: 530, cy: 175, color: palette[6], icon: "↻" }
    ];

    void slots;
    const infographicSlots = [
      { x: 575, y: 48, w: 450, h: 218, cx: 800, cy: 266, color: palette[0] },
      { x: 1035, y: 86, w: 500, h: 250, cx: 1035, cy: 212, color: palette[1] },
      { x: 1035, y: 390, w: 500, h: 220, cx: 1035, cy: 500, color: palette[2] },
      { x: 910, y: 664, w: 545, h: 166, cx: 910, cy: 748, color: palette[3] },
      { x: 145, y: 664, w: 545, h: 166, cx: 690, cy: 748, color: palette[4] },
      { x: 65, y: 350, w: 505, h: 245, cx: 570, cy: 472, color: palette[5] }
    ];

    const getBullets = (sectionId: string) => {
      const direct = (children.get(sectionId) || []).map((id) => nodesById.get(id)?.id).filter(Boolean) as string[];
      const related = (adjacency.get(sectionId) || [])
        .filter((id) => id !== rootId && id !== sectionId)
        .map((id) => nodesById.get(id)?.id)
        .filter(Boolean) as string[];
      return [...new Set([...direct, ...related])].slice(0, 4);
    };
    const shortTitle = (text: string) => text.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
    const clampText = (text: string, maxLength: number) => (
      text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}...` : text
    );
    const sections = finalSectionIds.map((id, index) => ({
      id,
      title: clampText(shortTitle(nodesById.get(id)?.id || id), 42),
      bullets: getBullets(id),
      slot: infographicSlots[index]
    }));

    const renderTextLines = (text: string, x: number, y: number, maxChars: number, lineHeight: number, className: string, maxLines = 3) => {
      const allLines = wrapSvgText(text, maxChars);
      const visibleLines = allLines.slice(0, maxLines).map((line, index) => (
        index === maxLines - 1 && allLines.length > maxLines ? clampText(line, Math.max(8, maxChars - 2)) : line
      ));
      return (
        <text x={x} y={y} className={className}>
          {visibleLines.map((line, lineIndex) => (
            <tspan key={`${line}-${lineIndex}`} x={x} dy={lineIndex === 0 ? 0 : lineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      );
    };

    const renderBulletList = (bullets: string[], slot: typeof infographicSlots[number]) => {
      const usableBullets = (bullets.length > 0 ? bullets : ["Key idea", "Main relationship", "Exam revision point"]).slice(0, 4);
      const maxChars = Math.max(24, Math.floor(slot.w / 16));
      const maxY = slot.y + slot.h - 24;
      let cursorY = slot.y + 96;
      const rendered: Array<ReturnType<typeof renderTextLines>> = [];

      usableBullets.forEach((bullet, bulletIndex) => {
        const lines = wrapSvgText(clampText(bullet, 76), maxChars).slice(0, 2);
        const blockHeight = lines.length * 22 + 12;
        if (cursorY + blockHeight > maxY) return;

        rendered.push(
          <g key={`${slot.x}-${bullet}-${bulletIndex}`}>
            <circle cx={slot.x + 42} cy={cursorY - 6} r="4.5" fill="#111827" />
            {lines.map((line, lineIndex) => (
              <text
                key={`${line}-${lineIndex}`}
                x={slot.x + 62}
                y={cursorY + lineIndex * 22}
                className="mindmapBulletText"
              >
                {line}
              </text>
            ))}
          </g>
        );
        cursorY += blockHeight;
      });

      return rendered;
    };

    const renderSection = (section: typeof sections[number], index: number) => {
      const { slot } = section;
      const headerHeight = 66;
      return (
        <g key={section.id}>
          <rect x={slot.x} y={slot.y} width={slot.w} height={slot.h} rx="24" fill="#fffdfa" stroke={slot.color} strokeWidth="3" />
          <rect x={slot.x + 30} y={slot.y - 18} width={slot.w - 44} height={headerHeight} rx="18" fill={slot.color} />
          <circle cx={slot.x + 36} cy={slot.y + 15} r="34" fill="#ffffff" stroke={slot.color} strokeWidth="5" />
          <text x={slot.x + 36} y={slot.y + 26} textAnchor="middle" className="mindmapIcon" fill={slot.color}>{index + 1}</text>
          {renderTextLines(`${index + 1}. ${section.title.toUpperCase()}`, slot.x + 84, slot.y + 8, Math.max(16, Math.floor((slot.w - 110) / 15)), 23, "mindmapHeaderText", 2)}
          {renderBulletList(section.bullets, slot)}
        </g>
      );
    };
    const flowSummary = sections.slice(0, 5).map((section) => section.title.split(" ")[0]).join("  >  ");

    return (
      <div className={`${styles.mindmapInfographicShell} ${isExpanded ? styles.mindmapInfographicExpanded : ""}`}>
        <div className={styles.mindmapExportBar}>
          <span>One-page polished mind map</span>
          <div>
            <button onClick={exportMindmapAsPng}><Download size={15} /> PNG</button>
            <button onClick={exportMindmapAsPdf}><Download size={15} /> PDF</button>
          </div>
        </div>
        <svg ref={mindmapSvgRef} className={styles.mindmapInfographic} viewBox="0 0 1600 1000" role="img" aria-label={`${root.id} mind map`}>
          <style>{`
            .mindmapHeaderText{font:900 25px Arial, sans-serif;fill:#fff;letter-spacing:.2px}
            .mindmapBulletText{font:800 19px Arial, sans-serif;fill:#111827}
            .mindmapIcon{font:900 30px Arial, sans-serif}
            .mindmapCenterTitle{font:900 34px Arial, sans-serif;fill:#fff;letter-spacing:.5px}
            .mindmapCenterSub{font:900 18px Arial, sans-serif;fill:#111827}
            .mindmapTiny{font:900 18px Arial, sans-serif;fill:#0f172a}
            .mindmapFlow{font:900 24px Arial, sans-serif;fill:#fff;letter-spacing:.5px}
          `}</style>
          <rect width="1600" height="1000" rx="0" fill="#ffffff" />
          <defs>
            <filter id="mindmapShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="12" stdDeviation="13" floodColor="#0f172a" floodOpacity="0.18" />
            </filter>
          </defs>

          {sections.map((section) => (
            <path
              key={`path-${section.id}`}
              d={`M 800 500 C ${(800 + section.slot.cx) / 2} 500, ${(800 + section.slot.cx) / 2} ${section.slot.cy}, ${section.slot.cx} ${section.slot.cy}`}
              fill="none"
              stroke={section.slot.color}
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.92"
            />
          ))}

          {sections.map(renderSection)}

          <circle cx="800" cy="500" r="142" fill="#071d3d" stroke="#dbeafe" strokeWidth="8" filter="url(#mindmapShadow)" />
          {wrapSvgText(root.id.toUpperCase(), 14).slice(0, 4).map((line, index, lines) => (
            <text key={line} x="800" y={454 + (index - (lines.length - 1) / 2) * 38} textAnchor="middle" className="mindmapCenterTitle">
              {line}
            </text>
          ))}
          <rect x="675" y="594" width="250" height="42" rx="20" fill="#fde047" />
          <text x="800" y="622" textAnchor="middle" className="mindmapCenterSub">ONE GLANCE REVISION</text>

          <g>
            <rect x="315" y="835" width="970" height="62" rx="31" fill="#071d3d" />
            <text x="800" y="875" textAnchor="middle" className="mindmapFlow">
              {sections.slice(0, 5).map((section) => section.title.split(" ")[0]).join("  →  ")}
            </text>
          </g>
          <g>
            <rect x="325" y="846" width="950" height="36" rx="18" fill="#071d3d" />
            <text x="800" y="873" textAnchor="middle" className="mindmapFlow">{flowSummary}</text>
          </g>
          <g>
            <rect x="80" y="910" width="1440" height="56" rx="26" fill="#fffefb" stroke="#0f5cc5" strokeWidth="3" />
            <text x="800" y="946" textAnchor="middle" className="mindmapTiny">
              Key idea: connect the big picture first, then revise each colored section.
            </text>
          </g>
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
        <ReactPlayer
          ref={playerRef}
          src={videoSrc}
          width="100%"
          height={isExpanded ? "62vh" : "220px"}
          controls={true}
          playing={isPlaying}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={(e) => console.log("Player Error (Ignored):", e)}
        />
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
          <button className={styles.consoleIconBtn} onClick={() => setIsArtifactConsoleOpen(false)}>
            <Minimize2 size={18} />
          </button>
        </div>

        {activeArtifact ? (
          <div className={styles.artifactViewer}>
            <div className={styles.artifactViewerControls}>
              <button className={styles.consoleIconBtn} onClick={() => setActiveArtifact(null)} aria-label="Back to artifact console">
                <ChevronLeft size={18} />
              </button>
              <button className={styles.consoleIconBtn} onClick={() => setIsArtifactConsoleOpen(false)} aria-label="Minimize panel">
                <Minimize2 size={18} />
              </button>
              <button className={styles.consoleIconBtn} onClick={() => setFullscreenArtifact(activeArtifact)} aria-label="Enlarge artifact">
                <Maximize2 size={18} />
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
                                setIsPlaying(true);
                                const player = playerRef.current;
                                if (player) {
                                  setTimeout(() => {
                                    player.currentTime = seconds;
                                  }, 100);
                                }
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
                  <div className={styles.flashcardText} style={isFlashcardMaximized ? { fontSize: '2rem' } : {}}>{flashcards[flashcardIndex].question}</div>
                  <div className={styles.flipHint}><RotateCcw size={14} /> Click to flip</div>
                </div>
                <div className={styles.flashcardBack} style={isFlashcardMaximized ? { display: 'flex', flexDirection: 'column', justifyContent: 'center' } : {}}>
                  <div className={styles.flashcardLabel}>Answer</div>
                  <div className={styles.flashcardText} style={isFlashcardMaximized ? { fontSize: '1.5rem' } : {}}>{flashcards[flashcardIndex].answer}</div>
                  
                  {isFlipped && flashcards[flashcardIndex].explanation && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.88)', borderRadius: '8px', fontSize: isFlashcardMaximized ? '1.1rem' : '0.95rem', color: '#000000', transition: 'opacity 0.3s', opacity: showFlashcardExplanation ? 1 : 0, pointerEvents: showFlashcardExplanation ? 'auto' : 'none' }}>
                      <strong>Explanation:</strong> {flashcards[flashcardIndex].explanation}
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
              <button className={styles.consoleIconBtn} onClick={() => setFullscreenArtifact(null)}>
                <Minimize2 size={20} />
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
