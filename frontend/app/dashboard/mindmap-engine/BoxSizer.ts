import { ExtractedSection, CardDimensions, ImportanceTier } from "./types";

export const wrapLines = (text: string, maxChars: number): string[] => {
  if (!text) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + " " + word).length <= maxChars) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
};

interface SizingSpec {
  width: number;
  maxBullets: number;
  titleChars: number;
  bulletChars: number;
  minHeight: number;
  maxHeight: number;
}

const SIZING_BY_IMPORTANCE: Record<ImportanceTier, SizingSpec> = {
  1: {
    width: 275,
    maxBullets: 3,
    titleChars: 24,
    bulletChars: 32,
    minHeight: 165,
    maxHeight: 245,
  },
  2: {
    width: 255,
    maxBullets: 3,
    titleChars: 22,
    bulletChars: 30,
    minHeight: 145,
    maxHeight: 215,
  },
  3: {
    width: 225,
    maxBullets: 2,
    titleChars: 18,
    bulletChars: 26,
    minHeight: 120,
    maxHeight: 165,
  },
};

export const calculateCardDimensions = (
  section: ExtractedSection,
  overrideImportance?: ImportanceTier
): CardDimensions => {
  const importance = overrideImportance || section.importance || 2;
  const spec = SIZING_BY_IMPORTANCE[importance] || SIZING_BY_IMPORTANCE[2];

  const titleText = (section.title || "Concept").trim();
  const rawTitleLines = wrapLines(titleText, spec.titleChars);
  const titleLines = rawTitleLines.slice(0, 2);

  const bulletList = (section.bullets || []).slice(0, spec.maxBullets);
  const wrappedBullets = bulletList.map((b) => wrapLines(b, spec.bulletChars).slice(0, 2));

  let totalBulletsHeight = 0;
  wrappedBullets.forEach((lines) => {
    totalBulletsHeight += lines.length * 17 + 8;
  });

  const headerClearance = 36; // Icon + Cue badge
  const titleHeight = titleLines.length * 20 + 8;
  const bottomPadding = 14;

  const computedHeight = headerClearance + titleHeight + totalBulletsHeight + bottomPadding;
  const height = Math.max(spec.minHeight, Math.min(spec.maxHeight, computedHeight));

  return {
    width: spec.width,
    height,
    titleLines,
    wrappedBullets,
  };
};
