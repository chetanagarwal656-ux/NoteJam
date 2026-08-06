export type SectionType = "post_it";

export type IconType = "bulb" | "gear" | "target" | "dice" | "book" | "code" | "chart" | "speech" | "atom";

export interface StickyColorTheme {
  bg: string;
  border: string;
  tape: string;
}

export interface SubNodeItem {
  label: string;
  detail?: string;
}

export interface LegacyMindmapBranch {
  title?: string;
  prompt?: string;
  bullets?: string[];
  icon?: string;
}

export interface LegacyMindmapNode {
  id?: string;
  label?: string;
}

export interface LegacyMindmapLink {
  source: string | LegacyMindmapNode;
  target: string | LegacyMindmapNode;
}

export interface MindmapSectionInput {
  title: string;
  cue?: string;
  kind?: string;
  type?: string;
  importance?: number;
  icon?: IconType | string;
  bullets?: string[];
  formulas?: string[];
  examples?: string[];
  subNodes?: SubNodeItem[];
}

export interface RawMindmapData {
  version?: string;
  title?: string;
  centralConcept?: string;
  centralTopic?: string;
  centralList?: string[];
  thesis?: string;
  sections?: MindmapSectionInput[];
  formulas?: { label: string; detail?: string }[];
  takeaways?: string[];
  centerSummary?: string[];
  branches?: LegacyMindmapBranch[];
  examples?: { label: string; detail?: string }[];
  nodes?: LegacyMindmapNode[];
  links?: LegacyMindmapLink[];
  stickyNotes?: { title?: string; content?: string; color?: string }[];
}

export interface ExtractedContent {
  title: string;
  centralConcept: string;
  centralList: string[];
  sections: MindmapSectionInput[];
}

export interface ArchitectSection extends MindmapSectionInput {
  id: string;
  importanceScore: number;
  resolvedType: SectionType;
  resolvedIcon: IconType;
  titleLines: string[];
  bulletLinesList: string[][];
  cardWidth: number;
  cardHeight: number;
  theme: StickyColorTheme;
}

export interface PositionedCard {
  id: string;
  section: ArchitectSection;
  cx: number;
  cy: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
  edgeSX: number;
  edgeSY: number;
  targetX: number;
  targetY: number;
}
