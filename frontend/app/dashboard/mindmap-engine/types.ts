export type StructureType = "hub" | "sequence" | "hierarchy" | "comparison" | "timeline";

export type SectionKind =
  | "definition"
  | "formula"
  | "process"
  | "example"
  | "application"
  | "warning"
  | "result";

export type IconType =
  | "bulb"
  | "gear"
  | "box"
  | "target"
  | "chart"
  | "formula"
  | "book"
  | "atom"
  | "code"
  | "warning"
  | "check"
  | "dice"
  | "speech";

export type ImportanceTier = 1 | 2 | 3;

export interface RawMindmapSection {
  title?: string;
  cue?: string;
  kind?: string;
  importance?: number;
  icon?: string;
  bullets?: string[];
  parentTitle?: string | null;
  compareGroup?: "A" | "B" | string | null;
  timeMarker?: string | null;
  formulas?: (string | { label?: string; detail?: string })[];
  examples?: (string | { label?: string; detail?: string })[];
  [key: string]: unknown;
}

export interface RawMindmapData {
  version?: string;
  title?: string;
  centralConcept?: string;
  coreConcept?: string;
  thesis?: string;
  structureType?: string;
  sections?: RawMindmapSection[];
  flow?: string[];
  formulas?: Array<{ label?: string; detail?: string; relatedSection?: string } | string>;
  examples?: Array<{ label?: string; detail?: string; relatedSection?: string } | string>;
  takeaways?: string[];
  compareGroupLabels?: { A?: string; B?: string };
  // Legacy v1 and earlier fallbacks
  stickyNotes?: Array<{ title?: string; body?: string; kind?: string }>;
  branches?: Array<{ title?: string; items?: string[] }>;
  nodes?: Array<{ label?: string; text?: string }>;
  subtopics?: Array<{ title?: string; details?: string[] }>;
  [key: string]: unknown;
}

export interface ExtractedSection {
  id: string;
  title: string;
  cue: string;
  kind: SectionKind;
  importance: ImportanceTier;
  icon: IconType;
  bullets: string[];
  parentTitle?: string | null;
  compareGroup?: "A" | "B" | null;
  timeMarker?: string | null;
}

export interface ExtractedFormula {
  label: string;
  detail: string;
  relatedSection?: string;
}

export interface ExtractedExample {
  label: string;
  detail: string;
  relatedSection?: string;
}

export interface ExtractedContent {
  version: string;
  title: string;
  centralConcept: string;
  thesis: string;
  structureType: StructureType;
  sections: ExtractedSection[];
  flow: string[];
  formulas: ExtractedFormula[];
  examples: ExtractedExample[];
  takeaways: string[];
  compareGroupLabels?: { A: string; B: string };
}

export interface CardTheme {
  name: string;
  bg: string;
  headerBg: string;
  border: string;
  accent: string;
  accentLight: string;
  text: string;
  badgeBg: string;
  badgeText: string;
  gradientId?: string;
}

export interface CardDimensions {
  width: number;
  height: number;
  titleLines: string[];
  wrappedBullets: string[][];
}

export interface PlannedNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  section: ExtractedSection;
  theme: CardTheme;
  role:
    | "primary"
    | "secondary"
    | "hub"
    | "step"
    | "column-a"
    | "column-b"
    | "timeline-top"
    | "timeline-bottom"
    | "tree-node";
  stepNumber?: number;
  timeMarker?: string;
  parentTitle?: string | null;
  anchoredFormulas?: ExtractedFormula[];
}

export interface PlannedConnector {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  pathData: string;
  style: "bezier" | "chevron" | "elbow" | "divider" | "axis";
  label?: string;
  color: string;
  strokeWidth: number;
  dashed?: boolean;
}

export interface PlannedLayout {
  structureType: StructureType;
  canvasWidth: number;
  canvasHeight: number;
  viewBox: string;
  centralHub?: {
    x: number;
    y: number;
    rx: number;
    ry: number;
    title: string;
    thesis: string;
    color: string;
  };
  nodes: PlannedNode[];
  connectors: PlannedConnector[];
  takeaways: string[];
  formulas: ExtractedFormula[];
  compareLabels?: { A: string; B: string };
  timelineAxis?: { y: number; startX: number; endX: number };
}

export type MindmapTheme = "infographic" | "revision";

export interface InfographicTerminal {
  x: number;
  y: number;
  color: string;
}

export interface InfographicBranch {
  id: string;
  section: ExtractedSection;
  theme: CardTheme;
  terminal: InfographicTerminal;
  discCenter: { x: number; y: number };
  discRadius: number;
  conduitPath: string;
  color: string;
  textAnchor: "start" | "middle" | "end";
  textAlign: "left" | "right" | "center";
  titlePos: { x: number; y: number };
  textLines: string[];
  textStartPos: { x: number; y: number };
}

export interface PlannedInfographicLayout {
  canvasWidth: number;
  canvasHeight: number;
  viewBox: string;
  centralDome: {
    cx: number;
    cy: number;
    r: number;
    title: string;
    thesis?: string;
  };
  branches: InfographicBranch[];
  takeaways: string[];
}
