# NoteJam - Mobile Experience & Workspace Refactor Context

> **Purpose**: This document captures the complete context, rationale, previous implementation attempts, known shortcomings, and future technical roadmap for the **Mobile-First Landing Page & Dashboard Study Workspace**. Any AI agent or developer in a future session should reference this document before refactoring the mobile UI.

---

## 1. Why Mobile-First is Essential for NoteJam

- **Target Audience**: High school and university students preparing for exams and revising lectures.
- **Problem**: Over 70% of student study time and YouTube lecture consumption happens on smartphones (iPhone/Android) during commutes, in bed, or between classes.
- **Goal**: NoteJam must deliver a buttery-smooth, native-app feel (like Apple Notes, Notion Mobile, or Linear) on screen widths from **360px to 430px**, rather than feeling like a cramped desktop site shrunk down onto a small screen.

---

## 2. What Was Attempted (Previous Implementation Summary)

In commit `e54e086`:
1. **Landing Page (`frontend/app/landing.module.css` & `page.tsx`)**:
   - Added media queries for `@media (max-width: 860px)` and `@media (max-width: 768px)`.
   - Added `.mobileStickyCta` (a floating bottom pill button).
   - Scaled hero typography using `clamp()`.
2. **Dashboard (`frontend/app/dashboard/page.module.css` & `page.tsx`)**:
   - Added a top mobile navigation header (`.mobileAppHeader`).
   - Added a 5-tab fixed bottom navigation bar (`.mobileArtifactBar`) for Cards, Mind Map, Formula, Audio, Chat.
   - Attempted to transform `.artifactConsole` into a slide-up bottom sheet via CSS overrides.
   - Reduced padding and font sizing for standard and handwritten modes.

---

## 3. Why the Previous Result Was Suboptimal (Root Causes)

1. **CSS Specificity Clashes & Override Clutter**:
   - `landing.module.css` is over 8,000 lines long with heavily nested, absolutely positioned desktop animations, mockups (`ProductCollage`, `featureNotesCascade`, `workflowCanvas`), and backdrop videos.
   - Trying to override complex desktop layouts purely with CSS media queries resulted in overlapping text, awkward spacing, broken alignment, and visual clutter on actual phone screens.
2. **Desktop-First Component Architecture**:
   - The study dashboard was fundamentally designed around a 2-column / 3-column desktop layout (Sidebar + Main Document Canvas + Right Sticky Console).
   - Cramming all desktop panels into one viewport via media queries made the UI feel heavy, claustrophobic, and disjointed on mobile.
3. **Touch Targets & Gestures**:
   - Complex interactive elements (mind map vector nodes, flashcard 3D flip triggers, timestamp pills, audio scrubbers) require dedicated mobile touch handling rather than desktop hover/click states.

---

## 4. Comprehensive Technical Roadmap for Future Mobile Refactor

When reopening the mobile overhaul in a future session, follow this step-by-step blueprint:

### A. Landing Page Mobile Architecture (`/`)
- **Dedicated Mobile Hero View**:
  - Replace the heavy multi-layered desktop collage with a clean, lightweight mobile card showcasing a single animated preview (e.g., a phone mockup with a switching tab for Notes, Flashcards, and Mind Map).
  - Simple, prominent URL input box with a 48px touch-friendly "Generate Notes" button.
- **Feature Showcase**:
  - Replace vertical 6-card desktop stack with an interactive horizontal swipeable carousel or tabbed accordion to eliminate scrolling fatigue.
- **Performance**:
  - Completely disable heavy desktop canvas particle loops and ambient background videos on mobile viewports (`display: none` or conditional React rendering based on screen size).

### B. Dashboard Study Workspace Architecture (`/dashboard`)
- **Segmented Mobile View (State-Based Navigation)**:
  - Instead of trying to render notes and the console on the same page, implement a clear mobile view switcher:
    - **Tab 1: 📝 Study Notes** (Full-screen, clean reading view with floating timestamp chips and zoomable font size controls).
    - **Tab 2: 🎯 Active Recall** (Full-screen dedicated Flashcards carousel with touch swipe gestures).
    - **Tab 3: 🗺️ Mind Map** (Interactive pinch-to-zoom SVG viewport).
    - **Tab 4: 🎙️ Audio & Debate** (Clean bottom-docked audio player with waveform and playback speed controls).
    - **Tab 5: 💬 Chat & ELI5** (Instant messaging UI with smooth keyboard-avoiding inputs).
- **Mobile Action Sheets (Modals)**:
  - Use clean, dedicated slide-up drawer components with explicit backdrop overlays for secondary actions (Format switcher, PDF export, Settings).

### C. Testing & Viewport Checklist
- **Small Mobile**: iPhone SE / Galaxy S8 (360px–375px width).
- **Standard Mobile**: iPhone 14/15/16, Pixel 8 (390px–412px width).
- **Tablet / Large Mobile**: iPad Mini / Galaxy Fold (768px width).
- **Verification**: Zero horizontal scrollbars (`overflow-x: hidden`), minimum 44px touch targets, smooth 60fps scrolling, no text clipping.
