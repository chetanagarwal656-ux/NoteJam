import { ExtractedSection, IconType } from "./types";

export const resolveSectionIcon = (section: ExtractedSection, index: number): IconType => {
  if (section.icon) {
    return section.icon;
  }

  const text = `${section.title || ""} ${section.cue || ""} ${section.kind || ""} ${(section.bullets || []).join(" ")}`.toLowerCase();

  if (/formula|math|equation|rule|axiom|theorem|law|calc/.test(text)) return "target";
  if (/process|step|method|algorithm|gear|system|setup|loop/.test(text)) return "gear";
  if (/code|computer|program|data|logic|digital|query|sql/.test(text)) return "code";
  if (/chart|finance|result|graph|rate|distribution|metric/.test(text)) return "chart";
  if (/book|definition|concept|study|note|lecture|theory/.test(text)) return "book";
  if (/atom|physics|science|chemistry|biology|nature|quantum/.test(text)) return "atom";
  if (/speech|question|scenario|what|why|how|discuss/.test(text)) return "speech";
  if (/box|example|sample|demo|instance|case/.test(text)) return "box";
  if (/warning|caution|risk|danger|pitfall|mistake|bug/.test(text)) return "warning";
  if (/check|verify|test|solution|done|success|rule/.test(text)) return "check";
  if (/dice|probability|random|sample|coin|chance/.test(text)) return "dice";

  const defaults: IconType[] = ["bulb", "book", "gear", "target", "box", "chart"];
  return defaults[index % defaults.length];
};

export interface IconPathData {
  viewBox: string;
  paths: Array<{
    d: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeLinecap?: "round" | "inherit" | "butt" | "square";
    strokeLinejoin?: "round" | "inherit" | "miter" | "bevel";
  }>;
}

export const ICON_DEFINITIONS: Record<IconType, IconPathData> = {
  bulb: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M9 18h6", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" },
      { d: "M10 22h4", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" },
      {
        d: "M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        fill: "none",
      },
    ],
  },
  gear: {
    viewBox: "0 0 24 24",
    paths: [
      {
        d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
        stroke: "currentColor",
        strokeWidth: 2,
        fill: "none",
      },
      {
        d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z",
        stroke: "currentColor",
        strokeWidth: 2,
        fill: "none",
      },
    ],
  },
  box: {
    viewBox: "0 0 24 24",
    paths: [
      {
        d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
        stroke: "currentColor",
        strokeWidth: 2,
        fill: "none",
      },
      { d: "M3.27 6.96 12 12.01l8.73-5.05", stroke: "currentColor", strokeWidth: 2, fill: "none" },
      { d: "M12 22.08V12", stroke: "currentColor", strokeWidth: 2, fill: "none" },
    ],
  },
  target: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", stroke: "currentColor", strokeWidth: 2, fill: "none" },
      { d: "M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z", stroke: "currentColor", strokeWidth: 2, fill: "none" },
      { d: "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", stroke: "currentColor", strokeWidth: 2, fill: "none" },
    ],
  },
  chart: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M3 3v18h18", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" },
      { d: "m19 9-5 5-4-4-3 3", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
    ],
  },
  formula: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M4 19h16", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" },
      { d: "m4 5 8 7-8 7", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
      { d: "M12 5h8", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" },
    ],
  },
  book: {
    viewBox: "0 0 24 24",
    paths: [
      {
        d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z",
        stroke: "currentColor",
        strokeWidth: 2,
        fill: "none",
      },
      { d: "M6 6h10", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" },
      { d: "M6 10h10", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" },
    ],
  },
  atom: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z", fill: "currentColor" },
      {
        d: "M20.2 20.2c2.4-2.4 2.4-6.3 0-8.7L11.5 2.8a6.16 6.16 0 0 0-8.7 8.7l8.7 8.7c2.4 2.4 6.3 2.4 8.7 0Z",
        stroke: "currentColor",
        strokeWidth: 1.5,
        fill: "none",
      },
    ],
  },
  code: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "m16 18 6-6-6-6", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
      { d: "m8 6-6 6 6 6", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
    ],
  },
  warning: {
    viewBox: "0 0 24 24",
    paths: [
      {
        d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z",
        stroke: "currentColor",
        strokeWidth: 2,
        fill: "none",
      },
      { d: "M12 9v4", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" },
      { d: "M12 17h.01", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" },
    ],
  },
  check: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14", stroke: "currentColor", strokeWidth: 2, fill: "none" },
      { d: "m9 11 3 3L22 4", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
    ],
  },
  dice: {
    viewBox: "0 0 24 24",
    paths: [
      { d: "M 4 4 H 20 V 20 H 4 Z", stroke: "currentColor", strokeWidth: 2, fill: "none" },
      { d: "M 8 8 h .01", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" },
      { d: "M 12 12 h .01", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" },
      { d: "M 16 16 h .01", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" },
    ],
  },
  speech: {
    viewBox: "0 0 24 24",
    paths: [
      {
        d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
        stroke: "currentColor",
        strokeWidth: 2,
        fill: "none",
      },
    ],
  },
};
