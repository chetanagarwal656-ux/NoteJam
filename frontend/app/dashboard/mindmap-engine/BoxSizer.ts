import { MindmapSectionInput } from "./types";

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

export const calculateCardDimensions = (section: MindmapSectionInput) => {
  const titleText = (section.title || "").trim();
  const cardWidth = 270;

  const titleLines = wrapLines(titleText, 18);
  const bulletList = (section.bullets || []).slice(0, 4);
  const bulletLinesList = bulletList.map((b) => wrapLines(b, 22));

  let totalBulletsHeight = 0;
  bulletLinesList.forEach((lines) => {
    totalBulletsHeight += lines.length * 20 + 8;
  });

  const titleHeight = titleLines.length * 24 + 10;
  const cardHeight = Math.max(180, 45 + titleHeight + totalBulletsHeight + 25);

  return { cardWidth, cardHeight, titleLines, bulletLinesList };
};
