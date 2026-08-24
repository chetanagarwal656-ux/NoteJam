"use client";

import { useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import {
  ArrowRight,
  AudioLines,
  Brain,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  FlaskConical,
  GraduationCap,
  Layers3,
  LibraryBig,
  Network,
  Play,
  QrCode,
  Quote,
  Sparkles,
  Star,
  Video,
  Wand2,
  Zap,
} from "lucide-react";
import styles from "./landing.module.css";

const navItems = [
  { label: "Solutions", href: "#solutions" },
  { label: "Features", href: "#features" },
  { label: "Demo", href: "#demo" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "About", href: "#about" },
];

const featurePanels = [
  {
    eyebrow: "AI Notes",
    title: "Notes that feel designed, not dumped.",
    copy: "Lecture structure, timestamps, equations, diagrams, screenshots, definitions, and handwritten review sheets arrive as one polished study document.",
    image: "/images/notes.png",
    icon: FileText,
    bullets: ["Handwritten mode", "Light and dark reading", "Dynamic diagrams"],
  },
  {
    eyebrow: "Flashcards",
    title: "Active recall built from the lecture itself.",
    copy: "NoteJam extracts the real concepts and turns them into cinematic 3D flashcards with explanations for every answer.",
    image: "/images/flashcards.png",
    icon: Layers3,
    bullets: ["3D flip deck", "Concept-first questions", "One-click review"],
  },
  {
    eyebrow: "Cheat Sheets",
    title: "The formulas and definitions that matter most.",
    copy: "A sticky console pulls out the critical 3 to 7 ideas: equations, laws, frameworks, and professor-specific emphasis.",
    image: "/images/cheatsheet.png",
    icon: LibraryBig,
    bullets: ["Formula cards", "Definitions", "Exam-ready density"],
  },
  {
    eyebrow: "Mind Maps",
    title: "A living map of how ideas connect.",
    copy: "Dense lectures become animated concept networks, perfect for seeing prerequisites, subtopics, and relationships at a glance.",
    image: "/mockup-cs.png",
    icon: Network,
    bullets: ["3D graph view", "Topic clusters", "Cross-video synthesis"],
  },
  {
    eyebrow: "Audio",
    title: "Podcast and debate mode for revision on the move.",
    copy: "Turn your lecture notes into a polished recap, then let two AI voices debate the topic so weak spots become memorable.",
    image: "/images/audio.png",
    icon: AudioLines,
    bullets: ["Podcast recap", "Audio debate", "Voice-first revision"],
  },
  {
    eyebrow: "Chat + ELI5",
    title: "Ask the lecture. Simplify any highlight.",
    copy: "The assistant answers only from your generated notes, and highlighted text can become a simple analogy-rich explanation.",
    image: "/mockup-biology.png",
    icon: Brain,
    bullets: ["Grounded Q&A", "Highlight ELI5", "No context switching"],
  },
];

const testimonials = [
  {
    name: "Anika S.",
    role: "Medical student",
    text: "I used to replay lectures for hours. NoteJam gives me the notes, the diagrams, and the exact timestamps in one pass.",
  },
  {
    name: "Rahul M.",
    role: "Engineering freshman",
    text: "The flashcards feel like they were made by a tutor who actually watched the lecture with me.",
  },
  {
    name: "Maya K.",
    role: "Biology teacher",
    text: "It is the first AI study tool I would trust in a classroom because the outputs stay attached to the source material.",
  },
  {
    name: "Dev P.",
    role: "JEE aspirant",
    text: "Cheat sheets plus Hindi notes made revision so much faster before tests.",
  },
  {
    name: "Elena R.",
    role: "Online learner",
    text: "The mind maps make long YouTube courses feel organized instead of endless.",
  },
];

const faqs = [
  {
    q: "Can NoteJam process YouTube playlists?",
    a: "Yes. The product direction supports a single YouTube lecture, local uploads, and full playlist synthesis into one master guide.",
  },
  {
    q: "Will notes include math and diagrams?",
    a: "Yes. The frontend is designed for Markdown, LaTeX math, Mermaid-style diagrams, screenshots, timestamps, and visual note modes.",
  },
  {
    q: "Can I save only the artifacts I created?",
    a: "Yes. Saved learning artifacts should only show the tools that exist for that note. The Update Artifact flow can add missing tools later.",
  },
  {
    q: "Does chat hallucinate outside my lecture?",
    a: "The intended RAG behavior is grounded Q&A: responses should be restricted to the generated notes and lecture context.",
  },
  {
    q: "Will there be a mobile app?",
    a: "The landing page includes a Get the App experience with Play Store, App Store, QR codes, and animated phone previews.",
  },
  {
    q: "Can I export to PDF?",
    a: "Yes. Export is part of the core workspace concept so students can keep a polished static version of the interactive canvas.",
  },
];

const workflowSteps = [
  {
    label: "Capture",
    title: "Paste lecture",
    text: "Drop in a YouTube lecture, playlist, PDF, or class recording.",
    icon: Video,
    artifact: "2h 14m source",
  },
  {
    label: "Generate",
    title: "Build study set",
    text: "AI creates structured notes, diagrams, timestamps, and key terms.",
    icon: Wand2,
    artifact: "Notes ready",
  },
  {
    label: "Practice",
    title: "Review actively",
    text: "Move into flashcards, cheat sheets, mind maps, and ELI5 explainers.",
    icon: Layers3,
    artifact: "42 cards",
  },
  {
    label: "Ask",
    title: "Question the lecture",
    text: "Chat stays grounded in the uploaded material and cites the source.",
    icon: BrainCircuit,
    artifact: "3 citations",
  },
  {
    label: "Revise",
    title: "Export or listen",
    text: "Save PDFs, mobile notes, and audio debates for the commute.",
    icon: AudioLines,
    artifact: "Exam mode",
  },
];

const educationProofs = [
  "Source-locked answers with citations",
  "Exam traps and definitions pulled out clearly",
  "Teacher-friendly exports for offline revision",
];

const revealContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.08,
    },
  },
};

const revealItem: Variants = {
  hidden: { opacity: 0, y: 26, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.72, ease: "easeOut" },
  },
};

function StudyWorkflowSection() {
  return (
    <section className={styles.studyWorkflow} id="workflow">
      <motion.div
        className={styles.workflowIntro}
        variants={revealContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-120px" }}
      >
        <motion.span variants={revealItem}>Product workflow</motion.span>
        <motion.h2 variants={revealItem}>From lecture input to revision loop.</motion.h2>
        <motion.p variants={revealItem}>
          NoteJam should feel like a study operating system: every section leads
          to the next action students actually take before class, exams, and
          revision sessions.
        </motion.p>
      </motion.div>

      <motion.div
        className={styles.workflowCanvas}
        variants={revealContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-120px" }}
      >
        <div className={styles.workflowRail}>
          <i />
        </div>
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;

          return (
            <motion.article
              className={styles.workflowStep}
              key={step.title}
              variants={revealItem}
              style={{ "--delay": `${index * 0.18}s` } as CSSProperties}
            >
              <div className={styles.workflowOrb}>
                <Icon size={20} />
              </div>
              <span>0{index + 1} / {step.label}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              <em>{step.artifact}</em>
            </motion.article>
          );
        })}
      </motion.div>
    </section>
  );
}

function EducationProofSection() {
  return (
    <section className={styles.educationProof}>
      <motion.div
        className={styles.educationCopy}
        variants={revealContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-120px" }}
      >
        <motion.span variants={revealItem}>Built for learning</motion.span>
        <motion.h2 variants={revealItem}>Looks magical, behaves like a serious study tool.</motion.h2>
        <motion.p variants={revealItem}>
          The visual system needs one calmer academic moment: paper texture,
          source proof, exam language, and classroom context so the product feels
          trustworthy, not just flashy.
        </motion.p>
        <motion.div className={styles.educationChecks} variants={revealItem}>
          {educationProofs.map((proof) => (
            <span key={proof}>
              <Check size={15} />
              {proof}
            </span>
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        className={styles.educationDesk}
        initial={{ opacity: 0, y: 50, rotateX: 8 }}
        whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
        viewport={{ once: true, margin: "-120px" }}
        transition={{ duration: 0.85, ease: "easeOut" }}
      >
        <div className={styles.paperSheet}>
          <div className={styles.paperHeader}>
            <span>Exam Review</span>
            <b>Photosynthesis: Light Reactions</b>
          </div>
          <div className={styles.paperLines}>
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className={styles.sourcePins}>
            <span>12:44 chlorophyll absorbs light</span>
            <span>18:02 ATP synthase example</span>
          </div>
          <div className={styles.examCallout}>
            <strong>Common trap</strong>
            <p>Oxygen is released from water splitting, not from carbon dioxide.</p>
          </div>
          <div className={styles.learningObjective}>
            <GraduationCap size={18} />
            Explain how the proton gradient stores energy.
          </div>
        </div>
        <div className={styles.teacherCard}>
          <span>Teacher view</span>
          <strong>Ready for class review</strong>
          <p>Objectives, citations, quiz prompts, and export controls stay visible.</p>
        </div>
      </motion.div>
    </section>
  );
}

const featureNoteDeck = [
  {
    label: "Premium notes",
    title: "Classical Mechanics",
    theme: "glass",
    subject: "Physics",
    lines: ["Projectile motion summary", "v_peak = 0 at max height", "Timestamp: 14:22"],
    visual: "arc",
  },
  {
    label: "Handwritten",
    title: "Mystery Writing",
    theme: "paper",
    subject: "Literature",
    lines: ["Observe tiny details", "Work backwards from motive", "Clues stay fair"],
    visual: "photo",
  },
  {
    label: "Math proof",
    title: "Eigen Spaces",
    theme: "math",
    subject: "Algebra",
    lines: ["Av = lambda v", "A = P D P^-1", "Stable if |lambda| < 1"],
    visual: "matrix",
  },
  {
    label: "Visual biology",
    title: "Cell Respiration",
    theme: "bio",
    subject: "Biology",
    lines: ["Glycolysis", "Krebs cycle", "ATP synthase"],
    visual: "cells",
  },
  {
    label: "Exam review",
    title: "JEE Quick Sheet",
    theme: "revision",
    subject: "Revision",
    lines: ["Formula bank", "Common traps", "Solved example"],
    visual: "checks",
  },
  {
    label: "Lecture timestamps",
    title: "Operating Systems",
    theme: "timeline",
    subject: "CS",
    lines: ["[08:12] Process states", "[19:44] Scheduling", "[33:01] Deadlock"],
    visual: "timeline",
  },
  {
    label: "Cornell layout",
    title: "Demand Curves",
    theme: "cornell",
    subject: "Economics",
    lines: ["Cue: elasticity", "Notes: price sensitivity", "Summary: slope is not elasticity"],
    visual: "checks",
  },
  {
    label: "Data notes",
    title: "Gradient Descent",
    theme: "data",
    subject: "Machine Learning",
    lines: ["Loss surface", "Learning rate controls steps", "Watch for local minima"],
    visual: "matrix",
  },
  {
    label: "History timeline",
    title: "Industrial Revolution",
    theme: "history",
    subject: "History",
    lines: ["1760 textile shift", "Steam power scales production", "Urban labor changes society"],
    visual: "timeline",
  },
  {
    label: "Formula sheet",
    title: "Probability Rules",
    theme: "formula",
    subject: "Statistics",
    lines: ["P(A or B) = P(A)+P(B)-P(A and B)", "Bayes theorem", "Independence trap"],
    visual: "matrix",
  },
];

type FeatureNote = (typeof featureNoteDeck)[number];

function NoteJamLogoMark({ className = "" }: { className?: string }) {
  return (
    <Image
      className={className}
      src="/brand/notejam-logo-mark-transparent.png"
      alt="NoteJam"
      width={310}
      height={300}
      priority
    />
  );
}

const flashcardDeck = [
  {
    topic: "Cell Biology",
    count: "12/50",
    question: "What is the function of the ribosome within a cell?",
    answer: "It builds proteins by translating mRNA into amino-acid chains.",
    label: "Ribosome",
    progress: 45,
    x: 0,
    y: -34,
    rotate: -5,
    scale: 1,
  },
  {
    topic: "Physics",
    count: "08/40",
    question: "Why does velocity become zero at peak height?",
    answer: "Gravity slows the vertical component until it momentarily stops.",
    label: "Projectile Motion",
    progress: 62,
    x: -104,
    y: 24,
    rotate: -14,
    scale: 0.94,
  },
  {
    topic: "Linear Algebra",
    count: "21/60",
    question: "What does an eigenvector preserve under transformation?",
    answer: "Its direction. Only its length is scaled by the eigenvalue.",
    label: "Eigenvectors",
    progress: 31,
    x: 106,
    y: 34,
    rotate: 13,
    scale: 0.94,
  },
  {
    topic: "World History",
    count: "04/35",
    question: "What makes a revolution structurally unstable?",
    answer: "A gap between institutions, public trust, and economic pressure.",
    label: "Revolutions",
    progress: 72,
    x: -36,
    y: 88,
    rotate: 3,
    scale: 0.9,
  },
];

type FlashcardPreview = (typeof flashcardDeck)[number];

const cheatSheetItems = [
  {
    tag: "Formula",
    title: "F = ma",
    detail: "Net force controls acceleration.",
  },
  {
    tag: "Definition",
    title: "Eigenvector",
    detail: "Direction preserved by a matrix.",
  },
  {
    tag: "Trap",
    title: "v_peak = 0",
    detail: "Only vertical velocity is zero.",
  },
  {
    tag: "Example",
    title: "ATP Synthase",
    detail: "Proton gradient creates ATP.",
  },
];

function FloatingArtifact({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={`${styles.floatCard} ${className}`}
      animate={{ y: [0, -14, 0], rotate: [0, 1.4, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

function ProductCollage() {
  return (
    <div className={styles.collageStage} aria-label="NoteJam product preview">
      <div className={styles.browserChrome}>
        <span />
        <span />
        <span />
      </div>
      <div className={styles.collageGrid}>
        <div className={styles.videoPanel}>
          <div className={styles.videoTop}>
            <Video size={18} />
            MIT Linear Algebra
          </div>
          <div className={styles.playDisc}>
            <Play size={24} fill="currentColor" />
          </div>
          <div className={styles.videoTimeline}>
            <span />
          </div>
        </div>
        <div className={styles.notesPanel}>
          <div className={styles.panelKicker}>Master Study Guide</div>
          <h3>Eigenvectors and Stability</h3>
          <p>
            A matrix transforms space by stretching along special directions. Those
            directions are eigenvectors, and the stretch factor is the eigenvalue.
          </p>
          <div className={styles.equation}>Av = lambda v</div>
          <div className={styles.highlightRow}>
            <button>[12:42]</button>
            <button>[18:09]</button>
            <button>[31:17]</button>
          </div>
        </div>
        <div className={styles.consolePanel}>
          <div className={styles.panelKicker}>Workspace Console</div>
          {["Notes", "Flashcards", "Mind Map", "Cheat Sheet", "Audio"].map((item) => (
            <div className={styles.consoleItem} key={item}>
              <Check size={14} />
              {item}
            </div>
          ))}
        </div>
      </div>

      <FloatingArtifact className={styles.artifactOne}>
        <Sparkles size={18} />
        <span>ELI5 ready</span>
      </FloatingArtifact>
      <FloatingArtifact className={styles.artifactTwo}>
        <AudioLines size={18} />
        <span>Debate mode</span>
      </FloatingArtifact>
      <FloatingArtifact className={styles.artifactThree}>
        <Network size={18} />
        <span>3D map</span>
      </FloatingArtifact>
    </div>
  );
}

function MiniMindMap() {
  const scannerRows = [
    "lecture transcript / 18:09 / cellular respiration overview",
    "ATP yield depends on glycolysis, Krebs cycle, electron transport",
    "common exam trap: NADH vs FADH2 entry points",
    "analogy: mitochondria behaves like a tiny power station",
  ];
  const mindMapNodes = [
    { label: "Core Idea", type: "concept", x: 50, y: 48, depth: 1 },
    { label: "Prerequisite", type: "before", x: 22, y: 25, depth: 0.72 },
    { label: "Formula", type: "math", x: 75, y: 22, depth: 0.84 },
    { label: "Example", type: "apply", x: 82, y: 63, depth: 0.62 },
    { label: "Exam Trap", type: "alert", x: 58, y: 80, depth: 0.78 },
    { label: "ELI5", type: "simple", x: 25, y: 68, depth: 0.58 },
  ];
  const mindMapLinks = [
    [50, 48, 22, 25],
    [50, 48, 75, 22],
    [50, 48, 82, 63],
    [50, 48, 58, 80],
    [50, 48, 25, 68],
    [22, 25, 75, 22],
    [25, 68, 58, 80],
  ];

  return (
    <div className={styles.mindMapVisual}>
      <div className={styles.scanDocument} aria-hidden="true">
        <div className={styles.scanHeader}>
          <span />
          <span />
          <span />
        </div>
        {scannerRows.map((row, index) => (
          <p key={row} style={{ "--i": index } as CSSProperties}>
            {row}
          </p>
        ))}
        <div className={styles.scanBeam} />
      </div>

      <div className={styles.extractLayer} aria-hidden="true">
        {mindMapNodes.slice(1).map((node, index) => (
          <span key={`${node.label}-extract`} style={{ "--i": index } as CSSProperties}>
            {node.label}
          </span>
        ))}
      </div>

      <div className={styles.cosmicMap}>
        <i className={styles.cosmicOrbit} />
        <i className={styles.cosmicOrbit} />
        <svg className={styles.cosmicLinks} viewBox="0 0 100 100" aria-hidden="true">
          {mindMapLinks.map(([x1, y1, x2, y2], index) => (
            <line
              key={`${x1}-${y1}-${x2}-${y2}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              style={{ "--i": index } as CSSProperties}
            />
          ))}
        </svg>
        {mindMapNodes.map((node, index) => (
          <span
            className={`${styles.cosmicNode} ${index === 0 ? styles.cosmicCore : ""}`}
            key={node.label}
            style={{ "--x": `${node.x}%`, "--y": `${node.y}%`, "--depth": node.depth, "--i": index } as CSSProperties}
          >
            {index === 0 ? <BrainCircuit size={22} /> : <Network size={14} />}
            <b>{node.label}</b>
            <small>{node.type}</small>
          </span>
        ))}
        <div className={styles.learningPath} aria-hidden="true">
          <span>learning path</span>
        </div>
      </div>
    </div>
  );
}

function FeatureAudioDebate() {
  const debateCards = [
    { side: "recap", title: "Claim", text: "The core idea is conservation of energy." },
    { side: "counter", title: "Counter", text: "But the professor's example breaks the intuition." },
    { side: "recap", title: "Analogy", text: "Think of the system like a moving budget." },
    { side: "counter", title: "Exam trap", text: "Do not confuse work done by vs. on the system." },
  ];
  const chapters = ["Recap", "Debate", "Analogy", "Quiz"];

  return (
    <div className={styles.audioDebateVisual} aria-label="Animated AI audio debate preview">
      <div className={styles.audioDebateGlow} />
      <div className={styles.audioNoteSource}>
        <FileText size={16} />
        <div>
          <span>Lecture notes</span>
          <b>Energy, work, theorem</b>
        </div>
      </div>

      <div className={`${styles.voicePod} ${styles.voicePodLeft}`}>
        <div className={styles.voiceOrb}>
          <AudioLines size={26} />
        </div>
        <span>Anamika</span>
        <small>recap voice</small>
        <div className={styles.voiceWave}>
          {Array.from({ length: 13 }).map((_, index) => (
            <i key={index} style={{ "--i": index } as CSSProperties} />
          ))}
        </div>
      </div>

      <div className={`${styles.voicePod} ${styles.voicePodRight}`}>
        <div className={styles.voiceOrb}>
          <BrainCircuit size={26} />
        </div>
        <span>Rohan</span>
        <small>debate voice</small>
        <div className={styles.voiceWave}>
          {Array.from({ length: 13 }).map((_, index) => (
            <i key={index} style={{ "--i": index } as CSSProperties} />
          ))}
        </div>
      </div>

      <div className={styles.debatePulseField} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      <div className={styles.debateCardsLayer}>
        {debateCards.map((card, index) => (
          <article
            className={`${styles.debateCard} ${card.side === "counter" ? styles.debateCardCounter : ""}`}
            key={card.title}
            style={{ "--i": index } as CSSProperties}
          >
            <span>{card.title}</span>
            <p>{card.text}</p>
          </article>
        ))}
      </div>

      <div className={styles.audioPlayerPreview}>
        <div className={styles.audioPlayerTop}>
          <Sparkles size={15} />
          <span>AI debate ready</span>
          <b>04:18</b>
        </div>
        <div className={styles.audioTimeline}>
          <i />
          {chapters.map((chapter, index) => (
            <span key={chapter} style={{ "--i": index } as CSSProperties}>
              {chapter}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureChatEli5() {
  const conceptChips = ["matrix", "direction", "stretch", "same line"];
  const sourceSnippets = [
    { label: "14:22", text: "Av = lambda v means direction is preserved." },
    { label: "18:09", text: "Eigenvectors reveal stable transformation paths." },
    { label: "31:17", text: "Use the stretched-arrow analogy for intuition." },
  ];

  return (
    <div className={styles.chatEli5Visual} aria-label="Animated grounded chat and ELI5 preview">
      <div className={styles.chatEli5Glow} />

      <section className={styles.conceptPanel}>
        <div className={styles.panelChrome}>
          <span />
          <span />
          <span />
          <b>Lecture note</b>
        </div>
        <div className={styles.conceptBody}>
          <small>Linear Algebra</small>
          <h4>Eigenvectors and transformations</h4>
          <p>
            A matrix can stretch, shrink, or rotate space. An eigenvector is a
            special direction that stays on its own line after transformation.
          </p>
          <mark>Av = lambda v means the vector keeps its direction.</mark>
        </div>
        <div className={styles.deconstructionLayer} aria-hidden="true">
          {conceptChips.map((chip, index) => (
            <span key={chip} style={{ "--i": index } as CSSProperties}>
              {chip}
            </span>
          ))}
        </div>
      </section>

      <div className={styles.translationCore} aria-hidden="true">
        <Sparkles size={22} />
        <i />
        <i />
      </div>

      <section className={styles.eli5Card}>
        <div className={styles.eli5Header}>
          <CircleHelp size={16} />
          ELI5
        </div>
        <p>
          Imagine an arrow drawn on stretchy rubber. Most arrows turn, but an
          eigenvector arrow only gets longer or shorter.
        </p>
        <div className={styles.analogySketch} aria-hidden="true">
          <i />
          <span />
          <b />
        </div>
      </section>

      <section className={styles.groundedChat}>
        <div className={styles.chatQuestion}>
          <span>Student</span>
          Why is this useful?
        </div>
        <div className={styles.chatAnswer}>
          <span>NoteJam</span>
          It shows the natural directions of a transformation, so complicated
          motion becomes easier to predict.
        </div>
        <div className={styles.sourceThreads} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className={styles.sourceDock}>
          {sourceSnippets.map((source, index) => (
            <article key={source.label} style={{ "--i": index } as CSSProperties}>
              <b>{source.label}</b>
              <span>{source.text}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function FeatureNoteMiniVisual({ visual }: { visual: FeatureNote["visual"] }) {
  if (visual === "arc") {
    return (
      <div className={styles.deckArc}>
        <i />
        <b />
        <span />
      </div>
    );
  }

  if (visual === "matrix") {
    return (
      <div className={styles.deckMatrix}>
        <span>[ 4 -1 ]</span>
        <span>[ 2  3 ]</span>
      </div>
    );
  }

  if (visual === "cells") {
    return (
      <div className={styles.deckCells}>
        {Array.from({ length: 7 }).map((_, index) => (
          <i key={index} />
        ))}
      </div>
    );
  }

  if (visual === "checks") {
    return (
      <div className={styles.deckChecks}>
        {[78, 62, 88].map((width) => (
          <span key={width} style={{ width: `${width}%` }} />
        ))}
      </div>
    );
  }

  if (visual === "timeline") {
    return (
      <div className={styles.deckTimeline}>
        {[0, 1, 2].map((item) => (
          <span key={item} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.deckPhoto}>
      <span />
      <span />
    </div>
  );
}

function FeatureNotesCascade() {
  return (
    <div className={styles.featureNotesCascade} aria-label="Animated NoteJam note formats">
      <div className={styles.cascadeGlow} />
      <div className={styles.cascadeSource}>
        <Video size={16} />
        Lecture.mp4
        <span>Generating notes</span>
      </div>
      <div className={styles.cascadeTrack}>
        {featureNoteDeck.map((note, index) => (
          <article
            className={`${styles.cascadeNote} ${styles[`cascade_${note.theme}`]}`}
            key={note.title}
            style={
              {
                "--note-index": index,
                "--note-delay": `${index * -1.24}s`,
                "--note-lane": `${((index % 5) - 2) * 72}px`,
                "--note-rotate": `${[-7, 4, -3, 6, -5][index % 5]}deg`,
                "--note-mid-rotate": `${[-20, 16, -12, 22, -17][index % 5]}deg`,
                "--note-exit-rotate": `${[14, -10, 18, -16, 12][index % 5]}deg`,
                "--note-depth": `${0.82 + (index % 4) * 0.06}`,
                zIndex: featureNoteDeck.length - index,
              } as CSSProperties
            }
          >
            <div className={styles.cascadeChrome}>
              <span />
              <span />
              <span />
              <b>{note.label}</b>
            </div>
            <div className={styles.cascadeBody}>
              <small>{note.subject}</small>
              <h4>{note.title}</h4>
              <ul>
                {note.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <FeatureNoteMiniVisual visual={note.visual} />
            </div>
          </article>
        ))}
      </div>
      <div className={styles.cascadeCaption}>
        <span>10 note styles</span>
        <span>Lecture-aware</span>
        <span>AI polished</span>
      </div>
    </div>
  );
}

function FlashcardSketch({ topic }: { topic: FlashcardPreview["topic"] }) {
  if (topic === "Cell Biology") {
    return (
      <div className={styles.flashSketchCell}>
        <span />
        <i />
        <b />
      </div>
    );
  }

  if (topic === "Physics") {
    return (
      <div className={styles.flashSketchArc}>
        <span />
        <i />
      </div>
    );
  }

  if (topic === "Linear Algebra") {
    return (
      <div className={styles.flashSketchMatrix}>
        <span>[ 1 0 ]</span>
        <span>[ 2 3 ]</span>
      </div>
    );
  }

  return (
    <div className={styles.flashSketchTimeline}>
      <span />
      <span />
      <span />
    </div>
  );
}

function FeatureFlashcardDeck() {
  const deckRef = useRef<HTMLDivElement | null>(null);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    deckRef.current?.style.setProperty("--tilt-x", `${(-y * 7).toFixed(2)}deg`);
    deckRef.current?.style.setProperty("--tilt-y", `${(x * 9).toFixed(2)}deg`);
  }

  function resetTilt() {
    deckRef.current?.style.setProperty("--tilt-x", "0deg");
    deckRef.current?.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <div className={styles.flashDeckShell}>
      <div className={styles.flashDeckAura} />
      <motion.div
        ref={deckRef}
        className={styles.flashDeckStage}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
        initial="stacked"
        whileInView="spread"
        viewport={{ once: false, amount: 0.48 }}
      >
        {flashcardDeck.map((card, index) => (
          <motion.article
            className={styles.flashPreviewCard}
            key={card.label}
            variants={{
              stacked: {
                x: 0,
                y: 24 + index * 9,
                rotate: index % 2 ? 2 : -2,
                scale: 0.92 - index * 0.035,
              },
              spread: {
                x: card.x,
                y: card.y,
                rotate: card.rotate,
                scale: card.scale,
              },
            }}
            transition={{ duration: 0.85, delay: index * 0.08, ease: "easeOut" }}
            style={{ zIndex: 40 - index }}
          >
            <div className={`${styles.flashCardInner} ${index === 0 ? styles.flashCardInnerActive : ""}`}>
              <div className={styles.flashCardFace}>
                <div className={styles.flashCardTop}>
                  <span>{card.topic}</span>
                  <small>{card.count}</small>
                </div>
                <div className={styles.flashQuestionRow}>
                  <h4>{card.question}</h4>
                  <FlashcardSketch topic={card.topic} />
                </div>
                <div className={styles.flashMetaRow}>
                  <span>Tap to reveal answer</span>
                  <b>{card.progress}%</b>
                </div>
                <div className={styles.flashProgress}>
                  <i style={{ width: `${card.progress}%` }} />
                </div>
                <div className={styles.flashActions}>
                  <button aria-label="Needs review">
                    <Zap size={14} />
                  </button>
                  <button aria-label="Know this">
                    <Check size={14} />
                  </button>
                </div>
              </div>
              <div className={`${styles.flashCardFace} ${styles.flashCardBack}`}>
                <span>Answer</span>
                <h4>{card.label}</h4>
                <p>{card.answer}</p>
                <div className={styles.flashBackBadge}>Active recall</div>
              </div>
            </div>
          </motion.article>
        ))}
      </motion.div>
      <div className={styles.flashDeckStatus}>
        <span>Auto flip</span>
        <span>Fan spread</span>
        <span>Mouse tilt</span>
      </div>
    </div>
  );
}

function FeatureCheatSheetExtractor() {
  return (
    <div className={styles.cheatExtractor} aria-label="AI cheat sheet extraction animation">
      <div className={styles.cheatBeam} />
      <div className={styles.cheatSourceDoc}>
        <div className={styles.cheatDocHeader}>
          <span>Lecture Notes.md</span>
          <b>Messy source</b>
        </div>
        <div className={styles.cheatTextBlock}>
          <p>Newton&apos;s second law describes how net force changes motion.</p>
          <p>For matrices, some directions remain stable under transformation.</p>
          <p>At the top of projectile motion, vertical velocity becomes zero.</p>
        </div>
        <div className={styles.cheatFormulaLine}>F = ma</div>
        <div className={styles.cheatTextRows}>
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className={styles.cheatScanLine} />
      </div>

      <div className={styles.cheatTransitLayer}>
        {cheatSheetItems.map((item, index) => (
          <div
            className={styles.cheatExtractChip}
            key={item.title}
            style={{ "--chip-delay": `${index * 0.42}s` } as CSSProperties}
          >
            <span>{item.tag}</span>
            <b>{item.title}</b>
          </div>
        ))}
      </div>

      <aside className={styles.cheatSidebar}>
        <div className={styles.cheatSidebarTop}>
          <span>Cheat Sheet</span>
          <b>4 key ideas</b>
        </div>
        <div className={styles.cheatPriorityMeter}>
          <i />
        </div>
        <div className={styles.cheatCards}>
          {cheatSheetItems.map((item, index) => (
            <article
              className={styles.cheatCard}
              key={item.title}
              style={{ "--card-delay": `${0.35 + index * 0.28}s` } as CSSProperties}
            >
              <small>0{index + 1} / {item.tag}</small>
              <h4>{item.title}</h4>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
}

function PhonePreview() {
  const carouselScreens = [
    {
      label: "AI Notes",
      title: "Cell Respiration",
      meta: "6 sources - ready",
      icon: FileText,
      type: "notes",
    },
    {
      label: "Flashcards",
      title: "ATP Review",
      meta: "24 cards - 68%",
      icon: Layers3,
      type: "cards",
    },
    {
      label: "Mind Map",
      title: "Energy Pathways",
      meta: "9 concepts - linked",
      icon: Network,
      type: "map",
    },
    {
      label: "Audio Debate",
      title: "Podcast Recap",
      meta: "04:18 - debate",
      icon: AudioLines,
      type: "audio",
    },
    {
      label: "Chat + ELI5",
      title: "Ask the Lecture",
      meta: "3 sources cited",
      icon: Brain,
      type: "chat",
    },
  ];

  return (
    <div className={styles.phoneShowcase}>
      <div className={styles.phoneHalo} />
      <div className={styles.phoneShell}>
        <div className={styles.phoneNotch} />
        <div className={styles.phoneScreen}>
          <div className={styles.mobileStatus}>
            <span>9:30</span>
            <b>5G</b>
          </div>
          <div className={styles.phoneHeader}>
            <span className={styles.mobileBrandMark}>
              <Sparkles size={14} />
            </span>
            NoteJam
            <i />
          </div>

          <div className={styles.phoneCarousel}>
            {carouselScreens.map((screen, index) => (
              <article
                className={`${styles.phoneSlide} ${styles[`phoneSlide_${screen.type}`]}`}
                key={screen.label}
                style={{ "--i": index } as CSSProperties}
              >
                <div className={styles.phoneSlideTop}>
                  <screen.icon size={18} />
                  <span>{screen.label}</span>
                </div>
                <h3>{screen.title}</h3>
                <small>{screen.meta}</small>
                <PhoneSlideVisual type={screen.type} />
              </article>
            ))}
          </div>

          <div className={styles.phoneDock}>
            {carouselScreens.map((screen, index) => (
              <span key={screen.label} style={{ "--i": index } as CSSProperties} />
            ))}
          </div>
        </div>
      </div>
      <div className={styles.phoneFloatArtifacts} aria-hidden="true">
        {["Notes", "Cards", "Map", "Audio"].map((item, index) => (
          <span key={item} style={{ "--i": index } as CSSProperties}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function PhoneSlideVisual({ type }: { type: string }) {
  if (type === "notes") {
    return (
      <div className={styles.mobileNotesPreview}>
        <i />
        <i />
        <i />
        <b>ATP synthase</b>
      </div>
    );
  }

  if (type === "cards") {
    return (
      <div className={styles.mobileCardPreview}>
        <span>What is ATP?</span>
        <b>Tap to flip</b>
      </div>
    );
  }

  if (type === "map") {
    return (
      <div className={styles.mobileMapPreview}>
        {[0, 1, 2, 3, 4].map((item) => (
          <span key={item} />
        ))}
      </div>
    );
  }

  if (type === "audio") {
    return (
      <div className={styles.mobileAudioPreview}>
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i} style={{ "--i": i } as CSSProperties} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.mobileChatPreview}>
      <p>Explain this simply.</p>
      <b>Like arrows on stretchy rubber.</b>
    </div>
  );
}

function StoreDownloadPanel() {
  const stores = [
    { label: "Google Play", icon: Play, meta: "Android" },
    { label: "App Store", icon: Star, meta: "iPhone" },
  ];

  return (
    <div className={styles.downloadPanel}>
      <div className={styles.storeButtons}>
        {stores.map((store) => (
          <button key={store.label}>
            <store.icon size={18} fill="currentColor" />
            <span>
              <small>{store.meta === "Android" ? "Get it on" : "Download on the"}</small>
              {store.label}
            </span>
          </button>
        ))}
      </div>
      <div className={styles.qrGrid}>
        {stores.map((store, index) => (
          <article key={`${store.label}-qr`} style={{ "--i": index } as CSSProperties}>
            <div>
              <QrCode size={88} />
              <i />
            </div>
            <span>{store.meta}</span>
          </article>
        ))}
      </div>
      <p>Scan to open NoteJam on your phone.</p>
    </div>
  );
}

export default function LandingPage() {
  const { isSignedIn } = useAuth();
  const [appModalOpen, setAppModalOpen] = useState(false);

  const handleAnchorClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("#")) return;

    const target = document.querySelector<HTMLElement>(href);
    if (!target) return;

    event.preventDefault();

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const navOffset = 92;
    const targetY = Math.max(
      0,
      Math.min(
        target.getBoundingClientRect().top + window.scrollY - navOffset,
        document.documentElement.scrollHeight - window.innerHeight
      )
    );

    window.history.pushState(null, "", href);

    if (prefersReducedMotion) {
      window.scrollTo(0, targetY);
      return;
    }

    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  return (
    <main className={styles.page}>
      <div className={styles.ambientBackdrop} aria-hidden="true">
        <video
          className={styles.ambientBackdropVideo}
          src="/videos/glossy-grid-background.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        <div className={styles.ambientBackdropVeil} />
      </div>

      <motion.div
        className={styles.siteFrame}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, delay: 0.1 }}
      >
        <header className={styles.navbar}>
          <Link className={styles.brand} href="/">
            <NoteJamLogoMark className={styles.brandLogo} />
            NoteJam
          </Link>
          <nav className={styles.navLinks}>
            {navItems.map((item) => (
              <Link href={item.href} key={item.href} onClick={(event) => handleAnchorClick(event, item.href)}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={styles.navActions}>
            <button className={styles.textButton} onClick={() => setAppModalOpen(true)}>
              Get the App
            </button>
            {isSignedIn ? (
              <>
                <Link className={styles.ghostButton} href="/dashboard">
                  Open App
                </Link>
                <UserButton />
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button className={styles.ghostButton}>Sign in</button>
                </SignInButton>
                <Link className={styles.navCta} href="/dashboard">
                  Start free trial
                </Link>
              </>
            )}
          </div>
        </header>

        <section className={styles.hero} id="home">
          <div className={styles.heroTexture} />
          <motion.div
            className={styles.heroCopy}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
          >
            <div className={styles.eyebrow}>
              <Zap size={15} />
              AI study platform for serious learners
            </div>
            <h1>
              Turn lectures into living study workspaces.
            </h1>
            <p>
              NoteJam converts YouTube lectures, playlists, and videos into
              premium notes, flashcards, mind maps, cheat sheets, audio debates,
              and grounded lecture chat.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/dashboard">
                Start generating
                <ArrowRight size={18} />
              </Link>
            </div>
          </motion.div>

          <motion.div
            className={styles.heroVisual}
            initial={{ opacity: 0, scale: 0.96, y: 35 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }}
          >
            <ProductCollage />
          </motion.div>
        </section>

        <motion.section
          className={styles.metricsStrip}
          variants={revealContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          {[
            ["Playlist", "multi-video synthesis"],
            ["LaTeX", "math-ready notes"],
            ["RAG", "lecture-only answers"],
            ["PDF", "polished export"],
          ].map(([value, label]) => (
            <motion.div key={value} variants={revealItem}>
              <strong>{value}</strong>
              <span>{label}</span>
            </motion.div>
          ))}
        </motion.section>

        <StudyWorkflowSection />

        <section className={styles.solution} id="solutions">
          <motion.div
            className={styles.sectionIntro}
            variants={revealContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-120px" }}
          >
            <motion.span variants={revealItem}>Solutions</motion.span>
            <motion.h2 variants={revealItem}>Built for the way real learning happens.</motion.h2>
            <motion.p variants={revealItem}>
              NoteJam should speak to students, teachers, and self-learners with
              practical outcomes: clearer review, trusted source context, and
              study material that survives beyond one flashy demo.
            </motion.p>
          </motion.div>
          <motion.div
            className={styles.solutionFlow}
            variants={revealContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-120px" }}
          >
            {[
              { icon: GraduationCap, title: "For exam revision", text: "Condense long lectures into notes, traps, formulas, and active recall sets." },
              { icon: LibraryBig, title: "For classrooms", text: "Keep every answer attached to the source so teachers can trust the output." },
              { icon: Sparkles, title: "For self-learners", text: "Turn scattered online learning into a repeatable study workspace." },
            ].map((step, index) => (
              <motion.div
                className={styles.solutionCard}
                key={step.title}
                variants={revealItem}
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
              >
                <div className={styles.stepNumber}>0{index + 1}</div>
                <step.icon size={28} />
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        <EducationProofSection />

        <section className={styles.features} id="features">
          <motion.div
            className={styles.sectionIntro}
            variants={revealContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-120px" }}
          >
            <motion.span variants={revealItem}>Features</motion.span>
            <motion.h2 variants={revealItem}>Every artifact feels visual, alive, and useful.</motion.h2>
          </motion.div>
          <div className={styles.featureStack}>
            {featurePanels.map((feature, index) => (
              <motion.article
                className={styles.featurePanel}
                key={feature.title}
                initial={{ opacity: 0, y: 56, rotateX: 8, filter: "blur(14px)" }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-120px" }}
                transition={{ duration: 0.8, delay: index * 0.04, ease: "easeOut" }}
              >
                <div className={styles.featureCopy}>
                  <div className={styles.featureIcon}>
                    <feature.icon size={22} />
                  </div>
                  <span>{feature.eyebrow}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.copy}</p>
                  <div className={styles.featureBullets}>
                    {feature.bullets.map((bullet) => (
                      <em key={bullet}>
                        <Check size={14} />
                        {bullet}
                      </em>
                    ))}
                  </div>
                </div>
                <div className={styles.featureVisual}>
                  {index === 0 ? (
                    <FeatureNotesCascade />
                  ) : index === 1 ? (
                    <FeatureFlashcardDeck />
                  ) : index === 2 ? (
                    <FeatureCheatSheetExtractor />
                  ) : index === 3 ? (
                    <MiniMindMap />
                  ) : index === 4 ? (
                    <FeatureAudioDebate />
                  ) : index === 5 ? (
                    <FeatureChatEli5 />
                  ) : (
                    <Image
                      src={feature.image}
                      alt={`${feature.eyebrow} preview`}
                      width={900}
                      height={620}
                    />
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section className={styles.demo} id="demo">
          <motion.div
            className={styles.demoCopy}
            variants={revealContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-120px" }}
          >
            <motion.span variants={revealItem}>Demo</motion.span>
            <motion.h2 variants={revealItem}>Watch the workspace assemble itself.</motion.h2>
            <motion.p variants={revealItem}>
              The demo section previews the exact first-run experience: paste a
              lecture, choose language, generate artifacts, then save the complete
              study workspace.
            </motion.p>
            <motion.div variants={revealItem}>
            <Link className={styles.primaryButton} href="/dashboard">
              Try for free
              <ChevronRight size={18} />
            </Link>
            </motion.div>
          </motion.div>
          <motion.div
            className={styles.demoMachine}
            initial={{ opacity: 0, y: 70, rotate: -2, scale: 0.92 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            <div className={styles.demoInput}>
              <Video size={20} />
              youtube.com/watch?v=lecture
              <button>Generate</button>
            </div>
            <div className={styles.demoOutput}>
              <div className={styles.demoNotebook}>
                <strong>Master Notes</strong>
                <span />
                <span />
                <span />
                <div>F = ma</div>
              </div>
              <div className={styles.demoFlash}>
                <span>Flashcard</span>
                What causes acceleration?
              </div>
              <div className={styles.demoConsole}>
                <b>Console</b>
                <p>Cheat sheet ready</p>
                <p>Audio debate ready</p>
              </div>
            </div>
          </motion.div>
        </section>

        <section className={styles.testimonials} id="testimonials">
          <motion.div
            className={styles.sectionIntro}
            variants={revealContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-120px" }}
          >
            <motion.span variants={revealItem}>Testimonials</motion.span>
            <motion.h2 variants={revealItem}>Words of appreciation, always in motion.</motion.h2>
          </motion.div>
          <div className={styles.marqueeWrap}>
            <motion.div
              className={styles.marquee}
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            >
              {[...testimonials, ...testimonials].map((item, index) => (
                <article className={styles.testimonialCard} key={`${item.name}-${index}`}>
                  <Quote size={22} />
                  <p>{item.text}</p>
                  <div>
                    <span>{item.name}</span>
                    <small>{item.role}</small>
                  </div>
                </article>
              ))}
            </motion.div>
          </div>
        </section>

        <section className={styles.pricing} id="pricing">
          <motion.div
            className={styles.sectionIntro}
            variants={revealContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-120px" }}
          >
            <motion.span variants={revealItem}>Pricing</motion.span>
            <motion.h2 variants={revealItem}>Start free. Upgrade when NoteJam becomes your study base.</motion.h2>
          </motion.div>
          <motion.div
            className={styles.priceGrid}
            variants={revealContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-120px" }}
          >
            {[
              {
                name: "Free",
                price: "$0",
                perks: ["3 artifacts", "Short lecture processing", "Basic notes and export"],
              },
              {
                name: "Student Pro",
                price: "$12",
                featured: true,
                perks: ["Unlimited saved artifacts", "Flashcards, mind maps, audio", "Playlist synthesis"],
              },
              {
                name: "Teacher Studio",
                price: "$29",
                perks: ["Batch workspaces", "Class-ready exports", "Priority generation"],
              },
            ].map((plan) => (
              <motion.article className={`${styles.priceCard} ${plan.featured ? styles.priceFeatured : ""}`} key={plan.name} variants={revealItem}>
                {plan.featured && <div className={styles.popular}>Best value</div>}
                <h3>{plan.name}</h3>
                <div className={styles.price}>{plan.price}<span>/mo</span></div>
                {plan.perks.map((perk) => (
                  <p key={perk}>
                    <Check size={15} />
                    {perk}
                  </p>
                ))}
                <Link href="/dashboard">Choose plan</Link>
              </motion.article>
            ))}
          </motion.div>
        </section>

        <section className={styles.appSection} id="app">
          <motion.div
            className={styles.appDownloadCopy}
            variants={revealContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-120px" }}
          >
            <motion.span variants={revealItem}>Get the app</motion.span>
            <motion.h2 variants={revealItem}>
              Download <strong>NoteJam</strong>
            </motion.h2>
            <motion.p variants={revealItem}>
              Carry your generated notes, flashcards, mind maps, audio debates,
              and lecture chat in one mobile study workspace.
            </motion.p>
            <motion.div variants={revealItem}>
              <StoreDownloadPanel />
            </motion.div>
          </motion.div>
          <motion.div
            className={styles.appPhoneStage}
            initial={{ opacity: 0, y: 70, rotate: 6 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.85, ease: "easeOut" }}
          >
            <PhonePreview />
          </motion.div>
        </section>

        <section className={styles.faq} id="faq">
          <motion.div
            className={styles.sectionIntro}
            variants={revealContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-120px" }}
          >
            <motion.span variants={revealItem}>FAQ</motion.span>
            <motion.h2 variants={revealItem}>Questions students and teachers will ask first.</motion.h2>
          </motion.div>
          <motion.div
            className={styles.faqGrid}
            variants={revealContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-120px" }}
          >
            {faqs.map((faq) => (
              <motion.article key={faq.q} variants={revealItem}>
                <CircleHelp size={19} />
                <h3>{faq.q}</h3>
                <p>{faq.a}</p>
              </motion.article>
            ))}
          </motion.div>
        </section>

        <footer className={styles.footer} id="about">
          <div>
            <Link className={styles.brand} href="/">
              <NoteJamLogoMark className={styles.brandLogo} />
              NoteJam
            </Link>
            <p>Elite AI study workspaces for lectures, playlists, and exams.</p>
          </div>
          <div className={styles.footerLinks}>
            <Link href="#features" onClick={(event) => handleAnchorClick(event, "#features")}>Features</Link>
            <Link href="#pricing" onClick={(event) => handleAnchorClick(event, "#pricing")}>Pricing</Link>
            <Link href="#faq" onClick={(event) => handleAnchorClick(event, "#faq")}>FAQ</Link>
            <Link href="/dashboard">Open App</Link>
          </div>
        </footer>
      </motion.div>

      {/* Floating Mobile Bottom CTA */}
      <div className={styles.mobileStickyCta}>
        <span>
          <Sparkles size={16} color="#38bdf8" /> NoteJam AI
        </span>
        <Link className={styles.mobileStickyCtaBtn} href="/dashboard">
          Start studying free <ArrowRight size={14} />
        </Link>
      </div>

      <AnimatePresence>
        {appModalOpen && (
          <motion.div
            className={styles.modalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAppModalOpen(false)}
          >
            <motion.div
              className={styles.appModal}
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.modalCopy}>
                <span>Mobile companion</span>
                <h2>Take NoteJam with you.</h2>
                <p>
                  Scan the QR or tap a store button from your phone. The final
                  mobile frontend can reuse this same visual system.
                </p>
                <div className={styles.storeButtons}>
                  <button>
                    <Star size={17} fill="currentColor" />
                    App Store
                  </button>
                  <button>
                    <FlaskConical size={17} />
                    Play Store
                  </button>
                </div>
                <div className={styles.qrRow}>
                  <div>
                    <QrCode size={76} />
                  </div>
                  <small>Scan for mobile preview</small>
                </div>
              </div>
              <PhonePreview />
              <button className={styles.modalClose} onClick={() => setAppModalOpen(false)}>
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
