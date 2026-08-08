import {
  ExtractedContent,
  SectionKind,
  StructureType,
  CardTheme,
} from "./types";

export const HARMONIC_PALETTES: CardTheme[] = [
  {
    name: "indigo",
    bg: "#ffffff",
    headerBg: "#f5f3ff",
    border: "#c4b5fd",
    accent: "#6366f1",
    accentLight: "#ede9fe",
    text: "#0f172a",
    badgeBg: "#e0e7ff",
    badgeText: "#4338ca",
    gradientId: "grad-indigo",
  },
  {
    name: "emerald",
    bg: "#ffffff",
    headerBg: "#f0fdf4",
    border: "#86efac",
    accent: "#10b981",
    accentLight: "#dcfce7",
    text: "#0f172a",
    badgeBg: "#d1fae5",
    badgeText: "#065f46",
    gradientId: "grad-emerald",
  },
  {
    name: "amber",
    bg: "#ffffff",
    headerBg: "#fffbeb",
    border: "#fde68a",
    accent: "#f59e0b",
    accentLight: "#fef3c7",
    text: "#0f172a",
    badgeBg: "#fef3c7",
    badgeText: "#92400e",
    gradientId: "grad-amber",
  },
  {
    name: "rose",
    bg: "#ffffff",
    headerBg: "#fff1f2",
    border: "#fecdd3",
    accent: "#f43f5e",
    accentLight: "#ffe4e6",
    text: "#0f172a",
    badgeBg: "#ffe4e6",
    badgeText: "#9f1239",
    gradientId: "grad-rose",
  },
  {
    name: "cyan",
    bg: "#ffffff",
    headerBg: "#ecfeff",
    border: "#a5f3fc",
    accent: "#06b6d4",
    accentLight: "#cffafe",
    text: "#0f172a",
    badgeBg: "#cffafe",
    badgeText: "#155e75",
    gradientId: "grad-cyan",
  },
  {
    name: "purple",
    bg: "#ffffff",
    headerBg: "#faf5ff",
    border: "#e9d5ff",
    accent: "#a855f7",
    accentLight: "#f3e8ff",
    text: "#0f172a",
    badgeBg: "#f3e8ff",
    badgeText: "#6b21a8",
    gradientId: "grad-purple",
  },
  {
    name: "teal",
    bg: "#ffffff",
    headerBg: "#f0fdfa",
    border: "#99f6e4",
    accent: "#14b8a6",
    accentLight: "#ccfbf1",
    text: "#0f172a",
    badgeBg: "#ccfbf1",
    badgeText: "#115e59",
    gradientId: "grad-teal",
  },
];

export const KIND_THEMES: Record<SectionKind, CardTheme> = {
  definition: {
    name: "cyan",
    bg: "#ffffff",
    headerBg: "#f0f9ff",
    border: "#bae6fd",
    accent: "#0284c7",
    accentLight: "#e0f2fe",
    text: "#0f172a",
    badgeBg: "#e0f2fe",
    badgeText: "#0369a1",
    gradientId: "grad-cyan",
  },
  formula: {
    name: "purple",
    bg: "#ffffff",
    headerBg: "#f5f3ff",
    border: "#ddd6fe",
    accent: "#7c3aed",
    accentLight: "#ede9fe",
    text: "#0f172a",
    badgeBg: "#ede9fe",
    badgeText: "#5b21b6",
    gradientId: "grad-purple",
  },
  process: {
    name: "teal",
    bg: "#ffffff",
    headerBg: "#f0fdfa",
    border: "#99f6e4",
    accent: "#0d9488",
    accentLight: "#ccfbf1",
    text: "#0f172a",
    badgeBg: "#ccfbf1",
    badgeText: "#0f766e",
    gradientId: "grad-teal",
  },
  example: {
    name: "emerald",
    bg: "#ffffff",
    headerBg: "#f0fdf4",
    border: "#bbf7d0",
    accent: "#16a34a",
    accentLight: "#dcfce7",
    text: "#0f172a",
    badgeBg: "#dcfce7",
    badgeText: "#15803d",
    gradientId: "grad-emerald",
  },
  application: {
    name: "amber",
    bg: "#ffffff",
    headerBg: "#fffbeb",
    border: "#fde68a",
    accent: "#d97706",
    accentLight: "#fef3c7",
    text: "#0f172a",
    badgeBg: "#fef3c7",
    badgeText: "#92400e",
    gradientId: "grad-amber",
  },
  warning: {
    name: "rose",
    bg: "#ffffff",
    headerBg: "#fff1f2",
    border: "#fecdd3",
    accent: "#e11d48",
    accentLight: "#ffe4e6",
    text: "#0f172a",
    badgeBg: "#ffe4e6",
    badgeText: "#9f1239",
    gradientId: "grad-rose",
  },
  result: {
    name: "indigo",
    bg: "#ffffff",
    headerBg: "#f8fafc",
    border: "#cbd5e1",
    accent: "#475569",
    accentLight: "#f1f5f9",
    text: "#0f172a",
    badgeBg: "#e2e8f0",
    badgeText: "#1e293b",
    gradientId: "grad-indigo",
  },
};

export const getSectionTheme = (kind: SectionKind, index?: number): CardTheme => {
  // If an index is provided, use the harmonic palette rotation to guarantee vibrant variety across cards
  if (typeof index === "number") {
    const palette = HARMONIC_PALETTES[index % HARMONIC_PALETTES.length];
    const kindTheme = KIND_THEMES[kind];
    // If the kind has a specific role (like warning or formula), prioritize its intent while ensuring rich styling
    if (kind === "warning" || kind === "formula") {
      return kindTheme;
    }
    return {
      ...palette,
      name: palette.name || kindTheme.name,
    };
  }
  return KIND_THEMES[kind] || KIND_THEMES.definition;
};

export const validateStructureType = (content: ExtractedContent): StructureType => {
  const requested = content.structureType;
  const sections = content.sections || [];
  const titles = new Set(sections.map((s) => s.title.toLowerCase().trim()));

  if (requested === "sequence") {
    // Sequence requires either flow.length >= 3 or at least 3 sections with valid execution
    if (content.flow && content.flow.length >= 3) {
      const matchCount = content.flow.filter((f) => titles.has(f.toLowerCase().trim())).length;
      if (matchCount >= 2 || content.flow.length >= 3) {
        return "sequence";
      }
    }
    if (sections.length >= 3) {
      return "sequence";
    }
  }

  if (requested === "hierarchy") {
    // Hierarchy requires parentTitle linking to valid existing section
    const hasParents = sections.some(
      (s) => s.parentTitle && titles.has(s.parentTitle.toLowerCase().trim())
    );
    if (hasParents) {
      return "hierarchy";
    }
  }

  if (requested === "comparison") {
    // Comparison requires sections assigned to both 'A' and 'B'
    const hasA = sections.some((s) => s.compareGroup === "A");
    const hasB = sections.some((s) => s.compareGroup === "B");
    if (hasA && hasB) {
      return "comparison";
    }
    // If not tagged, but 4-8 sections, we can evenly divide if explicitly requested
    if (sections.length >= 4) {
      return "comparison";
    }
  }

  if (requested === "timeline") {
    // Timeline requires time markers or flow
    const hasMarkers = sections.filter((s) => Boolean(s.timeMarker)).length >= 2;
    if (hasMarkers || (content.flow && content.flow.length >= 3) || sections.length >= 3) {
      return "timeline";
    }
  }

  // Fallback / default
  return "hub";
};
